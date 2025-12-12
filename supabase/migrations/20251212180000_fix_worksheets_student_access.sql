-- Migration: Allow students to view assigned worksheets
-- ==================================================
--
-- Problem: Students can see worksheet_assignments but NOT the worksheets themselves
-- because the worksheets RLS policy only allows: creators, admins, teachers
--
-- Solution: Add condition allowing students to view worksheets they've been assigned

-- ============================================================================
-- 1. CREATE HELPER FUNCTION (SECURITY DEFINER to avoid RLS recursion)
-- ============================================================================

-- Function to check if student has access to a worksheet via assignment
CREATE OR REPLACE FUNCTION public.student_has_worksheet_access(p_worksheet_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM worksheet_assignments wa
        JOIN class_members cm ON cm.class_id = wa.class_id
        JOIN classes c ON c.id = cm.class_id
        WHERE wa.worksheet_id = p_worksheet_id
        AND cm.student_id = auth.uid()
        AND wa.status = 'active'
        AND (wa.available_from IS NULL OR wa.available_from <= NOW())
        AND c.is_active = TRUE
    );
$$;

COMMENT ON FUNCTION public.student_has_worksheet_access(UUID) IS
    'Check if current user (student) has access to a worksheet via an active assignment';
GRANT EXECUTE ON FUNCTION public.student_has_worksheet_access(UUID) TO authenticated;

-- ============================================================================
-- 2. UPDATE WORKSHEETS RLS POLICY
-- ============================================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view worksheets" ON public.worksheets;

-- Recreate with student access
CREATE POLICY "Users can view worksheets"
ON public.worksheets
FOR SELECT
TO authenticated
USING (
    -- Creator can always view
    created_by = auth.uid()
    OR
    -- Admins can view all
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- Teachers in same school can view published worksheets
    (status = 'published' AND EXISTS (
        SELECT 1 FROM public.profiles p1, public.profiles p2
        WHERE p1.id = auth.uid()
        AND p2.id = worksheets.created_by
        AND p1.school_id = p2.school_id
        AND p1.school_id IS NOT NULL
        AND p1.role = 'teacher'
    ))
    OR
    -- Students can view worksheets they've been assigned
    student_has_worksheet_access(id)
);

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Migration completed: Fix worksheets student access';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Created function: student_has_worksheet_access(UUID)';
    RAISE NOTICE 'Updated policy: "Users can view worksheets"';
    RAISE NOTICE '';
    RAISE NOTICE 'Students can now view worksheets they have been assigned to.';
    RAISE NOTICE '===============================================';
END $$;
