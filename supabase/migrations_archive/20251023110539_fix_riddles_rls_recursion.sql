-- Migration 104: Fix infinite recursion in riddles RLS policies
-- Description: Replace direct role queries with SECURITY DEFINER helper functions
-- Issue: Policies using (SELECT role FROM profiles WHERE id = auth.uid()) cause infinite recursion
-- Solution: Use is_admin(), is_teacher_or_admin(), is_student() helper functions

-- ===========================================================================
-- RIDDLES TABLE POLICIES
-- ===========================================================================

-- Drop existing policies that have recursion issues
DROP POLICY IF EXISTS "Teachers can create riddles" ON public.riddles;
DROP POLICY IF EXISTS "Admins can manage all riddles" ON public.riddles;

-- Recreate with helper functions
CREATE POLICY "Teachers can create riddles"
  ON public.riddles
  FOR INSERT
  WITH CHECK (
    is_teacher_or_admin()
    AND created_by = auth.uid()
  );

CREATE POLICY "Admins can manage all riddles"
  ON public.riddles
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ===========================================================================
-- RIDDLE ASSIGNMENTS TABLE POLICIES
-- ===========================================================================

DROP POLICY IF EXISTS "Admins can manage all riddle assignments" ON public.riddle_assignments;

CREATE POLICY "Admins can manage all riddle assignments"
  ON public.riddle_assignments
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ===========================================================================
-- RIDDLE OF THE DAY TABLE POLICIES
-- ===========================================================================

DROP POLICY IF EXISTS "Teachers and admins can set riddle of the day" ON public.riddle_of_the_day;
DROP POLICY IF EXISTS "Teachers and admins can update riddle of the day" ON public.riddle_of_the_day;
DROP POLICY IF EXISTS "Admins can delete riddle of the day" ON public.riddle_of_the_day;

CREATE POLICY "Teachers and admins can set riddle of the day"
  ON public.riddle_of_the_day
  FOR INSERT
  WITH CHECK (
    is_teacher_or_admin()
    AND selected_by = auth.uid()
  );

CREATE POLICY "Teachers and admins can update riddle of the day"
  ON public.riddle_of_the_day
  FOR UPDATE
  USING (is_teacher_or_admin());

CREATE POLICY "Admins can delete riddle of the day"
  ON public.riddle_of_the_day
  FOR DELETE
  USING (is_admin());

-- ===========================================================================
-- RIDDLE ATTEMPTS TABLE POLICIES
-- ===========================================================================

DROP POLICY IF EXISTS "Students can create own attempts" ON public.riddle_attempts;
DROP POLICY IF EXISTS "Admins can manage all attempts" ON public.riddle_attempts;

CREATE POLICY "Students can create own attempts"
  ON public.riddle_attempts
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND is_student()
  );

CREATE POLICY "Admins can manage all attempts"
  ON public.riddle_attempts
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
