-- ============================================================================
-- Migration: pg_cron job for Minesweeper Reference Times Recalculation
-- Purpose: Move weekly recalculation from Vercel CRON to pg_cron (no timeout)
-- Date: 2026-01-04
-- ============================================================================
--
-- This job runs every Sunday at 01:30 UTC and recalculates the reference times
-- for Minesweeper based on the median completion times over the past 4 weeks.
--
-- Previously this was part of the daily_summaries_and_rewards Vercel CRON job,
-- but we're migrating it to pg_cron to:
-- 1. Reduce load on the Vercel job (avoid 10s timeout on free tier)
-- 2. Run directly in PostgreSQL (faster, no HTTP overhead)
-- 3. Better separation of concerns
--
-- ============================================================================

-- ============================================================================
-- PART 1: Create Wrapper Function with Monitoring
-- ============================================================================

CREATE OR REPLACE FUNCTION public.run_recalculate_minesweeper_ref_times()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run_id UUID;
    v_results RECORD;
    v_updated_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
    v_total_samples INTEGER := 0;
BEGIN
    -- Start job run tracking
    v_run_id := start_job_run('recalculate_minesweeper_ref_times', '{}'::jsonb);

    BEGIN
        -- Call the existing recalculation function and aggregate results
        FOR v_results IN SELECT * FROM recalculate_minesweeper_reference_times()
        LOOP
            IF v_results.updated THEN
                v_updated_count := v_updated_count + 1;
            ELSE
                v_skipped_count := v_skipped_count + 1;
            END IF;
            v_total_samples := v_total_samples + v_results.sample_count;
        END LOOP;

        -- Complete job run with success
        PERFORM complete_job_run(
            v_run_id,
            'success',
            NULL,
            jsonb_build_object(
                'updated_count', v_updated_count,
                'skipped_count', v_skipped_count,
                'total_samples', v_total_samples,
                'combinations_processed', v_updated_count + v_skipped_count
            )
        );

    EXCEPTION WHEN OTHERS THEN
        -- Complete job run with failure
        PERFORM complete_job_run(
            v_run_id,
            'failed',
            SQLERRM,
            jsonb_build_object(
                'updated_count', v_updated_count,
                'skipped_count', v_skipped_count
            )
        );
        RAISE;
    END;
END;
$$;

COMMENT ON FUNCTION public.run_recalculate_minesweeper_ref_times() IS
    'pg_cron wrapper for recalculate_minesweeper_reference_times() with monitoring.
     Runs every Sunday at 01:30 UTC.';

-- Grant execute to service_role for manual triggers from admin interface
GRANT EXECUTE ON FUNCTION public.run_recalculate_minesweeper_ref_times() TO service_role;

-- ============================================================================
-- PART 2: Schedule pg_cron Job (Sundays at 01:30 UTC)
-- ============================================================================

DO $$
BEGIN
    -- Check if pg_cron extension is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove existing job if any (ignore error if not exists)
        BEGIN
            PERFORM cron.unschedule('recalculate-minesweeper-ref-times');
        EXCEPTION WHEN OTHERS THEN
            -- Job doesn't exist, ignore
            NULL;
        END;

        -- Schedule new job: Sundays at 01:30 UTC
        -- 30 minutes after daily_summaries_and_rewards to avoid overlap
        PERFORM cron.schedule(
            'recalculate-minesweeper-ref-times',
            '30 1 * * 0',  -- 01:30 UTC every Sunday (day 0)
            'SELECT public.run_recalculate_minesweeper_ref_times()'
        );

        RAISE NOTICE 'pg_cron job recalculate-minesweeper-ref-times scheduled for Sundays at 01:30 UTC';
    ELSE
        RAISE NOTICE 'pg_cron extension not enabled - enable it in Supabase Dashboard > Database > Extensions';
    END IF;
END;
$$;
