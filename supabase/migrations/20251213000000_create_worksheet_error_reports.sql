-- ============================================================================
-- Migration: Create worksheet_error_reports table
-- Description: Allow students to report content errors in worksheet exercises
-- Date: 2025-12-13
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLE: worksheet_error_reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.worksheet_error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context: which assignment, exercise, and student
  assignment_id UUID NOT NULL REFERENCES public.worksheet_assignments(id) ON DELETE CASCADE,
  worksheet_exercise_id UUID NOT NULL REFERENCES public.worksheet_exercises(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Report content
  description TEXT NOT NULL,
  -- Note: 10-1000 chars validation is done at application level with Zod

  -- Status workflow
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'fixed', 'rejected')),

  -- Teacher response
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  response TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. UNIQUE INDEX: Only one pending report per (assignment, exercise, student)
-- ============================================================================

-- Allows historical resolved/rejected reports, but only one active pending report
CREATE UNIQUE INDEX idx_wer_unique_pending
  ON public.worksheet_error_reports(assignment_id, worksheet_exercise_id, student_id)
  WHERE status = 'pending';

-- ============================================================================
-- 3. INDEXES: Performance optimization for common queries
-- ============================================================================

-- Index for filtering reports by assignment (teacher view)
CREATE INDEX idx_wer_assignment_id
  ON public.worksheet_error_reports(assignment_id);

-- Index for filtering reports by student (student view)
CREATE INDEX idx_wer_student_id
  ON public.worksheet_error_reports(student_id);

-- Index for filtering reports by exercise (exercise-level view)
CREATE INDEX idx_wer_worksheet_exercise_id
  ON public.worksheet_error_reports(worksheet_exercise_id);

-- Partial index for pending reports (common filter)
CREATE INDEX idx_wer_pending
  ON public.worksheet_error_reports(status)
  WHERE status = 'pending';

-- Composite index for exercise + status queries
CREATE INDEX idx_wer_exercise_status
  ON public.worksheet_error_reports(worksheet_exercise_id, status);

-- ============================================================================
-- 4. TRIGGER: Auto-update updated_at on UPDATE
-- ============================================================================

-- Reuse existing update_updated_at_column function if it exists
-- Otherwise create it
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for worksheet_error_reports
DROP TRIGGER IF EXISTS update_worksheet_error_reports_updated_at
  ON public.worksheet_error_reports;

CREATE TRIGGER update_worksheet_error_reports_updated_at
  BEFORE UPDATE ON public.worksheet_error_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. ENABLE RLS
-- ============================================================================

ALTER TABLE public.worksheet_error_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

-- 6.1 Students can INSERT reports for exercises they can access
-- Uses existing can_access_assignment() security definer function
CREATE POLICY "Students can create error reports"
  ON public.worksheet_error_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND can_access_assignment(assignment_id)
  );

-- 6.2 Students can SELECT their own reports
CREATE POLICY "Students can view own error reports"
  ON public.worksheet_error_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

-- 6.2b Students can UPDATE their own PENDING reports (to fix typos)
-- Note: Application layer restricts updatable fields to description only
CREATE POLICY "Students can update own pending reports"
  ON public.worksheet_error_reports
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = student_id
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = student_id
    AND status = 'pending'
  );

-- 6.3 Teachers can SELECT reports for worksheets they own
-- Join path: worksheet_error_reports -> worksheet_assignments -> worksheets -> created_by
CREATE POLICY "Teachers can view reports for own worksheets"
  ON public.worksheet_error_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.worksheet_assignments wa
      JOIN public.worksheets w ON w.id = wa.worksheet_id
      WHERE wa.id = worksheet_error_reports.assignment_id
        AND w.created_by = auth.uid()
    )
  );

-- 6.4 Teachers can UPDATE reports for worksheets they own
CREATE POLICY "Teachers can update reports for own worksheets"
  ON public.worksheet_error_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.worksheet_assignments wa
      JOIN public.worksheets w ON w.id = wa.worksheet_id
      WHERE wa.id = worksheet_error_reports.assignment_id
        AND w.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.worksheet_assignments wa
      JOIN public.worksheets w ON w.id = wa.worksheet_id
      WHERE wa.id = worksheet_error_reports.assignment_id
        AND w.created_by = auth.uid()
    )
  );

-- 6.5 Admins have full access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins have full access to error reports"
  ON public.worksheet_error_reports
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.worksheet_error_reports TO authenticated;

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE public.worksheet_error_reports IS
  'Student reports of content errors (typos, incorrect answers) in worksheet exercises. DELETE is intentionally disabled to maintain audit trail - resolved reports are preserved for quality tracking.';

COMMENT ON COLUMN public.worksheet_error_reports.assignment_id IS
  'The specific assignment context for this report';

COMMENT ON COLUMN public.worksheet_error_reports.worksheet_exercise_id IS
  'The exercise within the worksheet that contains the error';

COMMENT ON COLUMN public.worksheet_error_reports.student_id IS
  'The student who submitted the report';

COMMENT ON COLUMN public.worksheet_error_reports.description IS
  'Free-text description of the error (10-1000 chars, validated at app level)';

COMMENT ON COLUMN public.worksheet_error_reports.status IS
  'Workflow status: pending (awaiting review), fixed (error corrected), rejected (not an error)';

COMMENT ON COLUMN public.worksheet_error_reports.reviewed_by IS
  'The teacher/admin who reviewed this report';

COMMENT ON COLUMN public.worksheet_error_reports.reviewed_at IS
  'Timestamp when the report was reviewed';

COMMENT ON COLUMN public.worksheet_error_reports.response IS
  'Optional teacher response explaining the resolution';

COMMENT ON INDEX idx_wer_unique_pending IS
  'Ensures only one pending report per student per exercise per assignment';

-- ============================================================================
-- 9. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_rls_enabled BOOLEAN;
  v_policy_count INTEGER;
  v_index_count INTEGER;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'worksheet_error_reports'
  ) INTO v_table_exists;

  -- Check RLS is enabled
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'worksheet_error_reports'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  -- Count policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'worksheet_error_reports';

  -- Count indexes
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'worksheet_error_reports';

  -- Output verification results
  RAISE NOTICE '';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Migration: worksheet_error_reports';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Table created: %', v_table_exists;
  RAISE NOTICE 'RLS enabled: %', v_rls_enabled;
  RAISE NOTICE 'Policies created: % (expected: 6)', v_policy_count;
  RAISE NOTICE 'Indexes created: % (expected: 6 including PK)', v_index_count;
  RAISE NOTICE '';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Run: pnpm db:migrate';
  RAISE NOTICE '  2. Update: src/lib/types/database.ts';
  RAISE NOTICE '  3. Update: docs/architecture/database-schema.md';
  RAISE NOTICE '===============================================';

  -- Validate
  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'Table worksheet_error_reports was not created!';
  END IF;

  IF NOT v_rls_enabled THEN
    RAISE EXCEPTION 'RLS is not enabled on worksheet_error_reports!';
  END IF;

  IF v_policy_count < 6 THEN
    RAISE EXCEPTION 'Not all policies were created! Expected 6, got %', v_policy_count;
  END IF;
END $$;
