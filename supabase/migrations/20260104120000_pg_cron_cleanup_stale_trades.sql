-- =====================================================================
-- PG_CRON: CLEANUP STALE MARKETPLACE TRADES
-- =====================================================================
-- This migration creates a pg_cron job to automatically expire stale
-- friend trades that have been inactive for more than 30 minutes.
--
-- Purpose:
-- - Reduces Supabase Realtime quota usage by ensuring abandoned trades
--   are cleaned up, stopping unnecessary heartbeat messages
-- - Provides better UX by auto-cancelling forgotten trades
--
-- Prerequisites:
-- - pg_cron extension must be enabled in Supabase Dashboard:
--   Database > Extensions > Search "pg_cron" > Enable
--
-- Monitoring:
-- - Uses existing background_job_runs table for monitoring
-- - Job appears in Admin CRON dashboard alongside Vercel cron jobs
-- =====================================================================

-- =====================================================================
-- 1. CREATE INDEX FOR EFFICIENT STALE TRADE QUERIES
-- =====================================================================
-- Partial index on negotiating trades with updated_at for fast lookups

CREATE INDEX IF NOT EXISTS idx_marketplace_trades_stale_cleanup
ON public.marketplace_trades(updated_at)
WHERE status = 'negotiating';

COMMENT ON INDEX idx_marketplace_trades_stale_cleanup IS
  'Optimizes pg_cron cleanup job for finding stale negotiating trades';

-- =====================================================================
-- 2. CREATE CLEANUP FUNCTION WITH MONITORING WRAPPER
-- =====================================================================
-- This function wraps the cleanup logic with start_job_run/complete_job_run
-- so it appears in the Admin CRON monitoring dashboard.

CREATE OR REPLACE FUNCTION public.cleanup_stale_trades()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run_id UUID;
    v_cancelled_count INTEGER;
    v_stale_threshold INTERVAL := INTERVAL '30 minutes';
BEGIN
    -- Start job tracking (same as Vercel cron jobs)
    v_run_id := start_job_run('cleanup_stale_trades', '{}'::jsonb);

    BEGIN
        -- Cancel stale trades (negotiating status, no activity for 30+ minutes)
        UPDATE marketplace_trades
        SET
            status = 'cancelled',
            cancelled_at = NOW(),
            updated_at = NOW()
        WHERE status = 'negotiating'
          AND updated_at < NOW() - v_stale_threshold;

        GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;

        -- Log result
        IF v_cancelled_count > 0 THEN
            RAISE NOTICE '[cleanup_stale_trades] Cancelled % stale trades', v_cancelled_count;
        END IF;

        -- Complete job successfully
        PERFORM complete_job_run(
            v_run_id,
            'success',
            NULL,
            jsonb_build_object(
                'cancelled_count', v_cancelled_count,
                'threshold_minutes', 30
            )
        );

    EXCEPTION WHEN OTHERS THEN
        -- Complete job with failure
        PERFORM complete_job_run(
            v_run_id,
            'failed',
            SQLERRM,
            jsonb_build_object('cancelled_count', COALESCE(v_cancelled_count, 0))
        );
        -- Re-raise to ensure proper error handling
        RAISE;
    END;
END;
$$;

COMMENT ON FUNCTION public.cleanup_stale_trades IS
  'Cancels marketplace trades that have been inactive for 30+ minutes. '
  'Called by pg_cron every 10 minutes. Logs to background_job_runs for monitoring.';

-- Grant execute to service_role (for manual triggers from admin)
GRANT EXECUTE ON FUNCTION public.cleanup_stale_trades() TO service_role;

-- =====================================================================
-- 3. SCHEDULE PG_CRON JOB (REQUIRES EXTENSION TO BE ENABLED)
-- =====================================================================
-- Note: This section will fail if pg_cron is not enabled.
-- Enable it via: Supabase Dashboard > Database > Extensions > pg_cron

-- First, check if pg_cron extension exists and create job if so
DO $$
BEGIN
    -- Check if pg_cron extension is available
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        -- Remove existing job if any (idempotent)
        PERFORM cron.unschedule('cleanup-stale-trades');

        -- Schedule job to run every 10 minutes
        PERFORM cron.schedule(
            'cleanup-stale-trades',           -- job name
            '*/10 * * * *',                   -- every 10 minutes
            'SELECT public.cleanup_stale_trades()'
        );

        RAISE NOTICE '[pg_cron] Job cleanup-stale-trades scheduled successfully (every 10 minutes)';
    ELSE
        RAISE NOTICE '[pg_cron] Extension not enabled. Please enable pg_cron in Supabase Dashboard:';
        RAISE NOTICE '          Database > Extensions > Search "pg_cron" > Enable';
        RAISE NOTICE '          Then run: SELECT cron.schedule(''cleanup-stale-trades'', ''*/10 * * * *'', ''SELECT public.cleanup_stale_trades()'');';
    END IF;
EXCEPTION
    WHEN undefined_function THEN
        RAISE NOTICE '[pg_cron] Extension not available. Enable it in Supabase Dashboard first.';
    WHEN OTHERS THEN
        RAISE NOTICE '[pg_cron] Error scheduling job: %', SQLERRM;
END;
$$;

-- =====================================================================
-- 4. CREATE HELPER VIEW FOR PG_CRON JOB STATUS
-- =====================================================================
-- This view combines pg_cron job details with our background_job_runs

CREATE OR REPLACE VIEW public.admin_pg_cron_jobs AS
SELECT
    j.jobid,
    j.schedule,
    j.command,
    j.nodename,
    j.nodeport,
    j.database,
    j.username,
    j.active,
    -- Last run info from background_job_runs
    (
        SELECT jsonb_build_object(
            'status', bjr.status,
            'started_at', bjr.started_at,
            'execution_time_ms', bjr.execution_time_ms,
            'metadata', bjr.metadata
        )
        FROM background_job_runs bjr
        WHERE bjr.job_name = REPLACE(j.jobname, '-', '_')
        ORDER BY bjr.started_at DESC
        LIMIT 1
    ) AS last_run
FROM cron.job j
WHERE j.database = current_database();

COMMENT ON VIEW public.admin_pg_cron_jobs IS
  'Shows pg_cron jobs with their last run status from background_job_runs';

-- Handle case where pg_cron is not available
-- The view will simply fail silently if cron schema doesn't exist

-- =====================================================================
-- 5. DOCUMENTATION
-- =====================================================================
--
-- ACTIVATION STEPS:
-- 1. Go to Supabase Dashboard > Database > Extensions
-- 2. Search for "pg_cron" and enable it
-- 3. Re-run this migration or manually schedule the job:
--    SELECT cron.schedule(
--        'cleanup-stale-trades',
--        '*/10 * * * *',
--        'SELECT public.cleanup_stale_trades()'
--    );
--
-- MONITORING:
-- - View job status in Admin > CRON Monitoring page
-- - Job name: cleanup_stale_trades
-- - Check background_job_runs table for execution history
--
-- MANUAL TRIGGER:
-- SELECT public.cleanup_stale_trades();
--
-- VIEW SCHEDULED JOBS:
-- SELECT * FROM cron.job;
--
-- VIEW JOB HISTORY (pg_cron native):
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- DISABLE JOB:
-- SELECT cron.unschedule('cleanup-stale-trades');
--
-- =====================================================================
