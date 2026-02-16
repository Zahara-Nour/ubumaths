-- Migration: Allow students to view worksheet sections
-- ====================================================
--
-- Problem: Students can view worksheet_exercises (fixed in 20251212181000)
-- but NOT worksheet_sections because the RLS policy only allows:
-- creators, admins, and teachers in the same school.
--
-- Impact: Student worksheet view shows exercises in a flat list without
-- section grouping, and exercises appear in wrong visual order.
--
-- Solution: Update policy to use student_has_worksheet_access function
-- (same approach used for worksheets and worksheet_exercises)

-- ============================================================================
-- UPDATE WORKSHEET_SECTIONS RLS POLICY
-- ============================================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view worksheet sections" ON public.worksheet_sections;

-- Recreate with student access
CREATE POLICY "Users can view worksheet sections"
ON public.worksheet_sections
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM worksheets
        WHERE worksheets.id = worksheet_sections.worksheet_id
        AND (
            -- Creator can view
            worksheets.created_by = auth.uid()
            OR
            -- Admins can view all
            EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
            OR
            -- Teachers in same school can view published
            (worksheets.status = 'published' AND EXISTS (
                SELECT 1 FROM profiles p1, profiles p2
                WHERE p1.id = auth.uid()
                AND p2.id = worksheets.created_by
                AND p1.school_id = p2.school_id
                AND p1.school_id IS NOT NULL
                AND p1.role = 'teacher'
            ))
            OR
            -- Students with assignment access
            student_has_worksheet_access(worksheets.id)
        )
    )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Migration completed: Fix worksheet_sections student access';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Updated policy: "Users can view worksheet sections"';
    RAISE NOTICE 'Students can now view sections for assigned worksheets.';
    RAISE NOTICE '===============================================';
END $$;
