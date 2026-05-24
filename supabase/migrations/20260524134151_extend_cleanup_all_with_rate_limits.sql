-- Migration: Extend run_cleanup_all() to purge expired rate_limits rows
-- Purpose: Without periodic cleanup, the rate_limits table grows by one row per
--          unique key forever (every authenticated user, every IP, ...). Even
--          though check_and_increment_rate_limit() now reuses expired rows
--          in-place (no more 23505 errors), keeping them around bloats the
--          table and its idx_rate_limits_key index.
--
-- The cleanup_expired_rate_limits() function already exists (from migration
-- 20251030000000_create_rate_limits_table.sql) but was never wired into a
-- schedule. This migration adds it to the existing daily run_cleanup_all() job
-- alongside cache and notifications cleanup. Daily granularity is sufficient:
-- rate-limit windows are 15min–1h, so an expired row only lingers for at most
-- one day before being purged.

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
    v_rate_limits_deleted INTEGER := 0;
    v_total_deleted INTEGER := 0;
    v_cache_success BOOLEAN := false;
    v_notifications_success BOOLEAN := false;
    v_rate_limits_success BOOLEAN := false;
BEGIN
    v_run_id := start_job_run('cleanup_all', '{}'::jsonb);

    BEGIN
        -- ============================================================
        -- CLEANUP 1: Expired cache entries
        -- ============================================================
        BEGIN
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
        -- CLEANUP 3: Expired rate_limits entries
        -- ============================================================
        BEGIN
            DELETE FROM rate_limits
            WHERE expires_at < NOW();

            GET DIAGNOSTICS v_rate_limits_deleted = ROW_COUNT;
            v_rate_limits_success := true;
            RAISE NOTICE 'Rate limits cleanup: % entries deleted', v_rate_limits_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Rate limits cleanup failed: %', SQLERRM;
            v_rate_limits_success := false;
        END;

        -- ============================================================
        -- Complete job run with results
        -- ============================================================
        v_total_deleted := v_cache_deleted + v_notifications_deleted + v_rate_limits_deleted;

        PERFORM complete_job_run(
            v_run_id,
            CASE
                WHEN v_cache_success AND v_notifications_success AND v_rate_limits_success THEN 'success'
                WHEN v_cache_success OR v_notifications_success OR v_rate_limits_success THEN 'success'  -- Partial success = success
                ELSE 'failed'
            END,
            NULL,
            jsonb_build_object(
                'cache_deleted', v_cache_deleted,
                'notifications_deleted', v_notifications_deleted,
                'rate_limits_deleted', v_rate_limits_deleted,
                'total_deleted', v_total_deleted,
                'cache_success', v_cache_success,
                'notifications_success', v_notifications_success,
                'rate_limits_success', v_rate_limits_success
            )
        );

        RAISE NOTICE 'Cleanup complete: % total entries deleted (cache: %, notifications: %, rate_limits: %)',
            v_total_deleted, v_cache_deleted, v_notifications_deleted, v_rate_limits_deleted;

    EXCEPTION WHEN OTHERS THEN
        PERFORM complete_job_run(
            v_run_id,
            'failed',
            SQLERRM,
            jsonb_build_object(
                'cache_deleted', v_cache_deleted,
                'notifications_deleted', v_notifications_deleted,
                'rate_limits_deleted', v_rate_limits_deleted,
                'cache_success', v_cache_success,
                'notifications_success', v_notifications_success,
                'rate_limits_success', v_rate_limits_success
            )
        );
        RAISE;
    END;
END;
$$;

COMMENT ON FUNCTION public.run_cleanup_all() IS
    'pg_cron job that performs all scheduled cleanup tasks.
     Runs daily at 02:00 UTC.
     Cleans up: expired cache entries, expired notifications, expired rate_limits entries.';
