-- Migration: Fix circular dependency between riddles and riddle_assignments
-- Description: Break the infinite recursion loop by simplifying policies
-- Issue: riddles policies check riddle_assignments, which check riddles => infinite loop
-- Solution: Create security definer functions to break the chain

-- ===========================================================================
-- HELPER FUNCTION: Check if riddle is assigned to student
-- ===========================================================================
CREATE OR REPLACE FUNCTION is_riddle_assigned_to_student(
  p_riddle_id UUID,
  p_student_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if riddle is directly assigned to student or their class
  RETURN EXISTS (
    SELECT 1 FROM riddle_assignments ra
    WHERE ra.riddle_id = p_riddle_id
    AND (
      ra.student_id = p_student_id
      OR EXISTS (
        SELECT 1 FROM class_members cm
        WHERE cm.class_id = ra.class_id
        AND cm.student_id = p_student_id
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_riddle_assigned_to_student(UUID, UUID) TO authenticated;

-- ===========================================================================
-- HELPER FUNCTION: Check if riddle is riddle of the day
-- ===========================================================================
CREATE OR REPLACE FUNCTION is_riddle_of_the_day(p_riddle_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM riddle_of_the_day rotd
    WHERE rotd.riddle_id = p_riddle_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_riddle_of_the_day(UUID) TO authenticated;

-- ===========================================================================
-- HELPER FUNCTION: Check if teacher owns riddle
-- ===========================================================================
CREATE OR REPLACE FUNCTION teacher_owns_riddle(
  p_teacher_id UUID,
  p_riddle_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM riddles r
    WHERE r.id = p_riddle_id
    AND r.created_by = p_teacher_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION teacher_owns_riddle(UUID, UUID) TO authenticated;

-- ===========================================================================
-- RECREATE RIDDLES POLICIES WITHOUT CIRCULAR DEPENDENCIES
-- ===========================================================================

-- Drop the problematic student policy
DROP POLICY IF EXISTS "Students can view assigned riddles and riddle of the day" ON public.riddles;

-- Recreate using helper functions (no direct table references)
CREATE POLICY "Students can view assigned riddles and riddle of the day"
  ON public.riddles
  FOR SELECT
  USING (
    status = 'published'
    AND (
      is_riddle_of_the_day(id)
      OR is_riddle_assigned_to_student(id, auth.uid())
    )
  );

-- ===========================================================================
-- RECREATE RIDDLE_ASSIGNMENTS POLICIES WITHOUT CIRCULAR DEPENDENCIES
-- ===========================================================================

-- Drop policies that check riddles table
DROP POLICY IF EXISTS "Teachers can view assignments for their riddles" ON public.riddle_assignments;
DROP POLICY IF EXISTS "Teachers can create assignments for their riddles" ON public.riddle_assignments;
DROP POLICY IF EXISTS "Teachers can delete assignments for their riddles" ON public.riddle_assignments;

-- Recreate using simpler checks or helper functions
CREATE POLICY "Teachers can view assignments for their riddles"
  ON public.riddle_assignments
  FOR SELECT
  USING (
    assigned_by = auth.uid()
    OR teacher_owns_riddle(auth.uid(), riddle_id)
  );

CREATE POLICY "Teachers can create assignments for their riddles"
  ON public.riddle_assignments
  FOR INSERT
  WITH CHECK (
    assigned_by = auth.uid()
    AND teacher_owns_riddle(auth.uid(), riddle_id)
    AND (
      class_id IS NULL
      OR EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = class_id
        AND c.teacher_id = auth.uid()
      )
    )
    AND (
      student_id IS NULL
      OR EXISTS (
        SELECT 1 FROM class_members cm
        JOIN classes c ON c.id = cm.class_id
        WHERE cm.student_id = riddle_assignments.student_id
        AND c.teacher_id = auth.uid()
      )
    )
  );

CREATE POLICY "Teachers can delete assignments for their riddles"
  ON public.riddle_assignments
  FOR DELETE
  USING (
    assigned_by = auth.uid()
    OR teacher_owns_riddle(auth.uid(), riddle_id)
  );

-- Add comments
COMMENT ON FUNCTION is_riddle_assigned_to_student IS 'Security definer function to check riddle assignment without RLS recursion';
COMMENT ON FUNCTION is_riddle_of_the_day IS 'Security definer function to check riddle of the day without RLS recursion';
COMMENT ON FUNCTION teacher_owns_riddle IS 'Security definer function to check riddle ownership without RLS recursion';
