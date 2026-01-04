-- ============================================================================
-- Migration: pg_cron job to cleanup stuck background jobs
-- Purpose: Automatically mark jobs stuck in 'running' status as 'timeout'
-- Date: 2026-01-04
-- ============================================================================
--
-- Jobs can get stuck in 'running' status if:
-- 1. Vercel CRON times out (10s on free tier)
-- 2. The process crashes before calling complete_job_run()
-- 3. Network issues prevent completion
--
-- This job runs every hour and marks any job running > 1 hour as 'timeout'.
--
-- ============================================================================

-- ============================================================================
-- PART 1: Create Cleanup Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_stuck_job_runs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run_id UUID;
    v_stuck_count INTEGER;
    v_stuck_threshold INTERVAL := INTERVAL '1 hour';
BEGIN
    -- Start job run tracking
    v_run_id := start_job_run('cleanup_stuck_job_runs', '{}'::jsonb);

    BEGIN
        -- Mark stuck jobs as timeout
        -- Use max INTEGER value for execution_time_ms to avoid overflow
        UPDATE background_job_runs
        SET
            status = 'timeout',
            completed_at = NOW(),
            execution_time_ms = 2147483647,  -- Max INT (job ran too long to measure)
            error_message = 'Auto-marked as timeout: job exceeded 1 hour runtime'
        WHERE status = 'running'
          AND started_at < NOW() - v_stuck_threshold;

        GET DIAGNOSTICS v_stuck_count = ROW_COUNT;

        -- Complete job run with success
        PERFORM complete_job_run(
            v_run_id,
            'success',
            NULL,
            jsonb_build_object(
                'stuck_jobs_marked', v_stuck_count,
                'threshold_hours', 1
            )
        );

    EXCEPTION WHEN OTHERS THEN
        -- Complete job run with failure
        PERFORM complete_job_run(
            v_run_id,
            'failed',
            SQLERRM,
            jsonb_build_object('stuck_jobs_marked', COALESCE(v_stuck_count, 0))
        );
        RAISE;
    END;
END;
$$;

COMMENT ON FUNCTION public.cleanup_stuck_job_runs() IS
    'pg_cron job that marks jobs stuck in running status > 1 hour as timeout.
     Runs every hour at minute 30.';

-- Grant execute to service_role for manual triggers
GRANT EXECUTE ON FUNCTION public.cleanup_stuck_job_runs() TO service_role;

-- ============================================================================
-- PART 2: Schedule pg_cron Job (Every hour at :30)
-- ============================================================================

DO $$
BEGIN
    -- Check if pg_cron extension is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove existing job if any (ignore error if not exists)
        BEGIN
            PERFORM cron.unschedule('cleanup-stuck-job-runs');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        -- Schedule: every hour at minute 30
        PERFORM cron.schedule(
            'cleanup-stuck-job-runs',
            '30 * * * *',  -- Every hour at :30
            'SELECT public.cleanup_stuck_job_runs()'
        );

        RAISE NOTICE 'pg_cron job cleanup-stuck-job-runs scheduled for every hour at :30';
    ELSE
        RAISE NOTICE 'pg_cron extension not enabled - enable in Supabase Dashboard';
    END IF;
END;
$$;
