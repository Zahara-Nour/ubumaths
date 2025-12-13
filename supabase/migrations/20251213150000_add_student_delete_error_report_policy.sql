-- ============================================================================
-- Migration: Add DELETE policy for students on worksheet_error_reports
-- Description: Allow students to delete (cancel) their own PENDING error reports
-- Date: 2025-12-13
-- ============================================================================

-- ============================================================================
-- 1. ADD DELETE POLICY FOR STUDENTS
-- ============================================================================

-- Students can only delete their own pending reports
-- This allows them to cancel a report before a teacher reviews it
CREATE POLICY "Students can delete own pending reports"
  ON public.worksheet_error_reports
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = student_id
    AND status = 'pending'
  );

-- ============================================================================
-- 2. UPDATE GRANT PERMISSIONS
-- ============================================================================

-- Add DELETE permission for authenticated users
-- Note: RLS policies control who can actually delete what
GRANT DELETE ON public.worksheet_error_reports TO authenticated;

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_policy_exists BOOLEAN;
BEGIN
  -- Check policy exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'worksheet_error_reports'
      AND policyname = 'Students can delete own pending reports'
  ) INTO v_policy_exists;

  -- Output verification results
  RAISE NOTICE '';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Migration: add_student_delete_error_report_policy';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'DELETE policy created: %', v_policy_exists;
  RAISE NOTICE '';

  -- Validate
  IF NOT v_policy_exists THEN
    RAISE EXCEPTION 'DELETE policy was not created!';
  END IF;
END $$;
