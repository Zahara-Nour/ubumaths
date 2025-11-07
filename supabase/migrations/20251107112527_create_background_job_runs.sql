-- Migration: Background job execution tracking
-- Purpose: Track cron job executions for monitoring and debugging
-- Date: 2025-11-07

-- ============================================================================
-- BACKGROUND JOB RUNS TABLE
-- ============================================================================
-- Tracks execution of scheduled background jobs (cron, queue workers, etc.)
-- Used for: Job monitoring, failure alerting, performance analysis
CREATE TABLE IF NOT EXISTS public.background_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'timeout')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  execution_time_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Constraints
  CONSTRAINT valid_completion CHECK (
    (status = 'running' AND completed_at IS NULL) OR
    (status != 'running' AND completed_at IS NOT NULL)
  ),
  CONSTRAINT valid_execution_time CHECK (
    execution_time_ms IS NULL OR execution_time_ms >= 0
  )
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Efficient job history queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_job_runs_name_started
  ON public.background_job_runs(job_name, started_at DESC);

-- Filter by status (find failures)
CREATE INDEX IF NOT EXISTS idx_job_runs_status
  ON public.background_job_runs(status)
  WHERE status != 'success'; -- Partial index for failures only

-- Recent runs (last 7 days) for dashboard
CREATE INDEX IF NOT EXISTS idx_job_runs_recent
  ON public.background_job_runs(started_at DESC)
  WHERE started_at > now() - interval '7 days';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.background_job_runs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all job runs
CREATE POLICY "Admins can view job runs"
  ON public.background_job_runs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Service role can insert job runs (for cron jobs)
CREATE POLICY "Service role can insert job runs"
  ON public.background_job_runs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Service role can update job runs (mark as completed/failed)
CREATE POLICY "Service role can update job runs"
  ON public.background_job_runs
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- JOB STATUS VIEW
-- ============================================================================
-- Shows latest run status for each job type
CREATE OR REPLACE VIEW public.admin_job_status AS
SELECT DISTINCT ON (job_name)
  job_name,
  status,
  started_at,
  completed_at,
  error_message,
  execution_time_ms,
  metadata
FROM public.background_job_runs
ORDER BY job_name, started_at DESC;

GRANT SELECT ON public.admin_job_status TO authenticated;

COMMENT ON VIEW public.admin_job_status IS
  'Latest execution status for each background job type.';

-- ============================================================================
-- JOB FAILURE SUMMARY VIEW
-- ============================================================================
-- Aggregates job failures for monitoring
CREATE OR REPLACE VIEW public.admin_job_failures AS
SELECT
  job_name,
  COUNT(*) as failure_count,
  MAX(started_at) as last_failure,
  array_agg(DISTINCT error_message) FILTER (WHERE error_message IS NOT NULL) as error_messages
FROM public.background_job_runs
WHERE status IN ('failed', 'timeout')
  AND started_at > now() - interval '24 hours'
GROUP BY job_name
ORDER BY failure_count DESC;

GRANT SELECT ON public.admin_job_failures TO authenticated;

COMMENT ON VIEW public.admin_job_failures IS
  'Job failures in last 24h for alerting and debugging.';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Start a job run
CREATE OR REPLACE FUNCTION public.start_job_run(
  p_job_name TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id UUID;
BEGIN
  INSERT INTO public.background_job_runs (job_name, status, metadata)
  VALUES (p_job_name, 'running', p_metadata)
  RETURNING id INTO v_run_id;

  RETURN v_run_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_job_run(TEXT, JSONB) TO service_role;

-- Function: Complete a job run (success or failure)
CREATE OR REPLACE FUNCTION public.complete_job_run(
  p_run_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at TIMESTAMPTZ;
  v_execution_time INTEGER;
BEGIN
  -- Get start time
  SELECT started_at INTO v_started_at
  FROM public.background_job_runs
  WHERE id = p_run_id;

  -- Calculate execution time
  v_execution_time := EXTRACT(EPOCH FROM (now() - v_started_at)) * 1000;

  -- Update run
  UPDATE public.background_job_runs
  SET
    status = p_status,
    completed_at = now(),
    error_message = p_error_message,
    execution_time_ms = v_execution_time,
    metadata = COALESCE(p_metadata, metadata)
  WHERE id = p_run_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_job_run(UUID, TEXT, TEXT, JSONB) TO service_role;

-- Function: Cleanup old job runs (keep last 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_job_runs()
RETURNS TABLE(deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_deleted INTEGER;
BEGIN
  -- Delete runs older than 7 days
  DELETE FROM public.background_job_runs
  WHERE started_at < now() - interval '7 days';

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;

  RETURN QUERY SELECT rows_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_job_runs() TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.background_job_runs IS
  'Tracks execution of background jobs (cron, queue workers). Auto-cleanup after 7 days.';
COMMENT ON FUNCTION public.start_job_run(TEXT, JSONB) IS
  'Starts a new job run. Returns run_id for tracking.';
COMMENT ON FUNCTION public.complete_job_run(UUID, TEXT, TEXT, JSONB) IS
  'Completes a job run with status (success/failed/timeout).';
COMMENT ON FUNCTION public.cleanup_old_job_runs() IS
  'Removes job runs older than 7 days. Should be called by cron job.';
