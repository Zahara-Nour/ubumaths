-- Migration: Allow students to view worksheet exercises
-- =====================================================
--
-- Problem: Students can see worksheets but NOT worksheet_exercises
-- because the policy uses the old logic without student access
--
-- Solution: Update policy to use student_has_worksheet_access function

-- ============================================================================
-- UPDATE WORKSHEET_EXERCISES RLS POLICY
-- ============================================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view worksheet exercises" ON public.worksheet_exercises;

-- Recreate with student access
CREATE POLICY "Users can view worksheet exercises"
ON public.worksheet_exercises
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM worksheets
        WHERE worksheets.id = worksheet_exercises.worksheet_id
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
    RAISE NOTICE 'Migration completed: Fix worksheet_exercises student access';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Updated policy: "Users can view worksheet exercises"';
    RAISE NOTICE 'Students can now view exercises for assigned worksheets.';
    RAISE NOTICE '===============================================';
END $$;
