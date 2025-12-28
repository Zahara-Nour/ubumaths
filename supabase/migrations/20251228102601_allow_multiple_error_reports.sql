-- ============================================================================
-- Migration: Allow multiple error reports per exercise
-- Description: Remove unique constraint on pending reports to allow students
--              to submit multiple reports per exercise (limit enforced in app)
-- Date: 2025-12-28
-- ============================================================================

-- ============================================================================
-- 1. DROP UNIQUE INDEX: Allow multiple pending reports per exercise
-- ============================================================================

-- Previously: Only one pending report per (assignment, exercise, student)
-- Now: Multiple reports allowed, limit of 10 total enforced at application level
DROP INDEX IF EXISTS public.idx_wer_unique_pending;

-- ============================================================================
-- 2. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_index_exists BOOLEAN;
BEGIN
  -- Verify the index was dropped
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'worksheet_error_reports'
      AND indexname = 'idx_wer_unique_pending'
  ) INTO v_index_exists;

  RAISE NOTICE '';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Migration: allow_multiple_error_reports';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Unique pending index dropped: %', NOT v_index_exists;
  RAISE NOTICE '';
  RAISE NOTICE 'Students can now submit multiple reports per exercise.';
  RAISE NOTICE 'Limit of 10 reports per exercise enforced at app level.';
  RAISE NOTICE '===============================================';

  IF v_index_exists THEN
    RAISE EXCEPTION 'Index idx_wer_unique_pending was not dropped!';
  END IF;
END $$;
