-- Migration: Fix RLS recursion in worksheet_assignments
-- =====================================================
--
-- Problem: Infinite recursion between worksheet_assignments and worksheet_assignment_students policies
--
-- - worksheet_assignments policy checks worksheet_assignment_students
-- - worksheet_assignment_students policy checks worksheet_assignments
--
-- Solution: Use SECURITY DEFINER functions to break the cycle

-- ============================================================================
-- 1. CREATE HELPER FUNCTIONS (SECURITY DEFINER bypasses RLS)
-- ============================================================================

-- Function to check if user is the creator of an assignment
CREATE OR REPLACE FUNCTION public.is_assignment_creator(p_assignment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM worksheet_assignments
        WHERE id = p_assignment_id
        AND created_by = auth.uid()
    );
$$;

COMMENT ON FUNCTION public.is_assignment_creator(UUID) IS 'Check if current user created the given assignment (SECURITY DEFINER to bypass RLS)';
GRANT EXECUTE ON FUNCTION public.is_assignment_creator(UUID) TO authenticated;

-- Function to check if student has individual assignment
CREATE OR REPLACE FUNCTION public.has_individual_assignment(p_assignment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM worksheet_assignment_students
        WHERE assignment_id = p_assignment_id
        AND student_id = auth.uid()
    );
$$;

COMMENT ON FUNCTION public.has_individual_assignment(UUID) IS 'Check if current user has an individual assignment (SECURITY DEFINER to bypass RLS)';
GRANT EXECUTE ON FUNCTION public.has_individual_assignment(UUID) TO authenticated;

-- ============================================================================
-- 2. FIX worksheet_assignment_students POLICIES
-- ============================================================================

-- Drop problematic policies
DROP POLICY IF EXISTS "Teachers can manage own individual assignments" ON public.worksheet_assignment_students;

-- Recreate without recursion (use SECURITY DEFINER function)
CREATE POLICY "Teachers can manage own individual assignments"
ON public.worksheet_assignment_students
FOR ALL
TO authenticated
USING (is_assignment_creator(assignment_id))
WITH CHECK (is_assignment_creator(assignment_id));

-- ============================================================================
-- 3. FIX worksheet_assignments POLICIES FOR STUDENTS
-- ============================================================================

-- Drop the problematic student policy
DROP POLICY IF EXISTS "Students can view their assignments" ON public.worksheet_assignments;

-- Recreate without recursion (use SECURITY DEFINER function)
CREATE POLICY "Students can view their assignments"
ON public.worksheet_assignments
FOR SELECT
TO authenticated
USING (
    -- Assignment status = 'active'
    status = 'active'
    -- Current time >= available_from (if set)
    AND (available_from IS NULL OR available_from <= NOW())
    AND (
        -- Class-based assignment
        EXISTS (
            SELECT 1 FROM class_members cm
            JOIN classes c ON c.id = cm.class_id
            WHERE cm.class_id = worksheet_assignments.class_id
            AND cm.student_id = auth.uid()
            AND c.is_active = TRUE
        )
        OR
        -- Individual assignment (use SECURITY DEFINER function to avoid recursion)
        has_individual_assignment(id)
    )
);

-- ============================================================================
-- 4. FIX worksheet_assignment_exercise_settings POLICIES
-- ============================================================================

-- Drop problematic policy
DROP POLICY IF EXISTS "Teachers can manage exercise settings for own assignments" ON public.worksheet_assignment_exercise_settings;

-- Recreate without recursion
CREATE POLICY "Teachers can manage exercise settings for own assignments"
ON public.worksheet_assignment_exercise_settings
FOR ALL
TO authenticated
USING (is_assignment_creator(assignment_id))
WITH CHECK (is_assignment_creator(assignment_id));

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Migration completed: Fix RLS recursion';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Created SECURITY DEFINER functions:';
    RAISE NOTICE '  - is_assignment_creator(UUID)';
    RAISE NOTICE '  - has_individual_assignment(UUID)';
    RAISE NOTICE '';
    RAISE NOTICE 'Fixed policies on:';
    RAISE NOTICE '  - worksheet_assignments';
    RAISE NOTICE '  - worksheet_assignment_students';
    RAISE NOTICE '  - worksheet_assignment_exercise_settings';
    RAISE NOTICE '';
    RAISE NOTICE '===============================================';
END $$;
