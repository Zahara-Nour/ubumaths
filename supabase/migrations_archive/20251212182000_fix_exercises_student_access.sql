-- Migration: Allow students to view exercises from assigned worksheets
-- ==================================================================
--
-- Problem: Students can't see exercises because the RLS policy only allows teachers
--
-- Solution: Add policy allowing students to view exercises that are part of
-- worksheets they have access to

-- ============================================================================
-- CREATE HELPER FUNCTION
-- ============================================================================

-- Function to check if student has access to an exercise via worksheet assignment
CREATE OR REPLACE FUNCTION public.student_has_exercise_access(p_exercise_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM worksheet_exercises we
        JOIN worksheet_assignments wa ON wa.worksheet_id = we.worksheet_id
        JOIN class_members cm ON cm.class_id = wa.class_id
        JOIN classes c ON c.id = cm.class_id
        WHERE we.exercise_id = p_exercise_id
        AND cm.student_id = auth.uid()
        AND wa.status = 'active'
        AND (wa.available_from IS NULL OR wa.available_from <= NOW())
        AND c.is_active = TRUE
    );
$$;

COMMENT ON FUNCTION public.student_has_exercise_access(UUID) IS
    'Check if current user (student) has access to an exercise via an assigned worksheet';
GRANT EXECUTE ON FUNCTION public.student_has_exercise_access(UUID) TO authenticated;

-- ============================================================================
-- ADD STUDENT ACCESS POLICY TO EXERCISES
-- ============================================================================

-- Add a new policy for students (don't drop the existing teacher policy)
CREATE POLICY "Students can view assigned exercises"
ON public.exercises
FOR SELECT
TO authenticated
USING (
    student_has_exercise_access(id)
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Migration completed: Fix exercises student access';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Created function: student_has_exercise_access(UUID)';
    RAISE NOTICE 'Created policy: "Students can view assigned exercises"';
    RAISE NOTICE '';
    RAISE NOTICE 'Students can now view exercises from assigned worksheets.';
    RAISE NOTICE '===============================================';
END $$;
