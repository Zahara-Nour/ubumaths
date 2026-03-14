-- Migration: Allow students to read school_years and academic_periods
-- Description: Students need to read school years and academic periods
--   to display their warnings on the student dashboard.
-- Author: Claude Code
-- Date: 2026-03-14

-- Students can read their school's years
CREATE POLICY "Students can read their school years"
  ON school_years
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.school_id = school_years.school_id
      AND profiles.role = 'student'
    )
  );

-- Check if academic_periods also needs a student policy
-- (students need to read periods to determine current period for warnings)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'academic_periods'
    AND policyname = 'Students can read their school periods'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Students can read their school periods"
        ON academic_periods
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM school_years sy
            JOIN profiles p ON p.school_id = sy.school_id
            WHERE sy.id = academic_periods.school_year_id
            AND p.id = auth.uid()
            AND p.role = 'student'
          )
        )
    $policy$;
  END IF;
END $$;
