-- ============================================================================
-- Migration: pg_cron job for Cleanup All
-- Purpose: Consolidates all cleanup tasks into a single pg_cron job
-- Date: 2026-01-04
-- ============================================================================
--
-- This job runs daily at 02:00 UTC and performs:
-- 1. Clean up expired cache entries (server_cache table)
-- 2. Clean up expired notifications (hard delete)
--
-- Schedule: 0 2 * * * (daily at 02:00 UTC)
-- ============================================================================

-- ============================================================================
-- PART 1: Create Main Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.run_cleanup_all()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run_id UUID;
    v_cache_deleted INTEGER := 0;
    v_notifications_deleted INTEGER := 0;
    v_total_deleted INTEGER := 0;
    v_cache_success BOOLEAN := false;
    v_notifications_success BOOLEAN := false;
BEGIN
    -- Start job run tracking
    v_run_id := start_job_run('cleanup_all', '{}'::jsonb);

    BEGIN
        -- ============================================================
        -- CLEANUP 1: Expired cache entries
        -- ============================================================
        BEGIN
            -- cleanup_expired_cache() returns the count of deleted entries
            v_cache_deleted := cleanup_expired_cache();
            v_cache_success := true;
            RAISE NOTICE 'Cache cleanup: % entries deleted', v_cache_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Cache cleanup failed: %', SQLERRM;
            v_cache_success := false;
        END;

        -- ============================================================
        -- CLEANUP 2: Expired notifications (hard delete)
        -- ============================================================
        BEGIN
            DELETE FROM notifications
            WHERE expires_at < NOW();

            GET DIAGNOSTICS v_notifications_deleted = ROW_COUNT;
            v_notifications_success := true;
            RAISE NOTICE 'Notifications cleanup: % entries deleted', v_notifications_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Notifications cleanup failed: %', SQLERRM;
            v_notifications_success := false;
        END;

        -- ============================================================
        -- Complete job run with results
        -- ============================================================
        v_total_deleted := v_cache_deleted + v_notifications_deleted;

        PERFORM complete_job_run(
            v_run_id,
            CASE
                WHEN v_cache_success AND v_notifications_success THEN 'success'
                WHEN v_cache_success OR v_notifications_success THEN 'success'  -- Partial success = success
                ELSE 'failed'
            END,
            NULL,
            jsonb_build_object(
                'cache_deleted', v_cache_deleted,
                'notifications_deleted', v_notifications_deleted,
                'total_deleted', v_total_deleted,
                'cache_success', v_cache_success,
                'notifications_success', v_notifications_success
            )
        );

        RAISE NOTICE 'Cleanup complete: % total entries deleted (cache: %, notifications: %)',
            v_total_deleted, v_cache_deleted, v_notifications_deleted;

    EXCEPTION WHEN OTHERS THEN
        -- Complete job run with failure
        PERFORM complete_job_run(
            v_run_id,
            'failed',
            SQLERRM,
            jsonb_build_object(
                'cache_deleted', v_cache_deleted,
                'notifications_deleted', v_notifications_deleted,
                'cache_success', v_cache_success,
                'notifications_success', v_notifications_success
            )
        );
        RAISE;
    END;
END;
$$;

COMMENT ON FUNCTION public.run_cleanup_all() IS
    'pg_cron job that performs all scheduled cleanup tasks.
     Runs daily at 02:00 UTC.
     Cleans up: expired cache entries, expired notifications.';

-- Grant execute to service_role for manual triggers
GRANT EXECUTE ON FUNCTION public.run_cleanup_all() TO service_role;

-- ============================================================================
-- PART 2: Schedule pg_cron Job (daily at 02:00 UTC)
-- ============================================================================

DO $$
BEGIN
    -- Check if pg_cron extension is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove existing job if any (ignore error if not exists)
        BEGIN
            PERFORM cron.unschedule('cleanup-all');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        -- Schedule: daily at 02:00 UTC
        PERFORM cron.schedule(
            'cleanup-all',
            '0 2 * * *',
            'SELECT public.run_cleanup_all()'
        );

        RAISE NOTICE 'pg_cron job cleanup-all scheduled for daily at 02:00 UTC';
    ELSE
        RAISE NOTICE 'pg_cron extension not enabled - enable in Supabase Dashboard';
    END IF;
END;
$$;
