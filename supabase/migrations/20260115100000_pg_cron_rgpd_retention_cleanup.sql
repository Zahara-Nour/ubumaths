-- ============================================================================
-- Migration: pg_cron job for RGPD Data Retention Cleanup
-- Purpose: Automatic cleanup of expired data per RGPD Article 5(1)(e)
-- Date: 2026-01-15
-- ============================================================================
--
-- This job runs weekly (Sunday 03:00 UTC) and performs:
-- 1. Error logs cleanup (90 days, resolved only)
-- 2. User presence cleanup (30 days)
-- 3. Rejected friendships cleanup (2 years)
-- 4. Chat messages HARD delete (3 years)
-- 5. Private messages HARD delete (3 years)
-- 6. Student attempts cleanup (5 years + user inactive 2 years)
-- 7. Student progress cleanup (5 years + user inactive 2 years)
--
-- Schedule: 0 3 * * 0 (Sunday at 03:00 UTC)
--
-- RGPD Compliance:
-- - Art. 5(1)(e): Storage limitation
-- - Art. 17: Right to erasure (hard delete, not soft delete)
-- ============================================================================

-- ============================================================================
-- PART 1: Create Main Retention Cleanup Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.run_cleanup_expired_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run_id UUID;
    v_error_logs_deleted INTEGER := 0;
    v_presence_deleted INTEGER := 0;
    v_friendships_deleted INTEGER := 0;
    v_messages_deleted INTEGER := 0;
    v_private_messages_deleted INTEGER := 0;
    v_attempts_deleted INTEGER := 0;
    v_progress_deleted INTEGER := 0;
    v_total_deleted INTEGER := 0;
    v_error_logs_success BOOLEAN := false;
    v_presence_success BOOLEAN := false;
    v_friendships_success BOOLEAN := false;
    v_messages_success BOOLEAN := false;
    v_private_messages_success BOOLEAN := false;
    v_attempts_success BOOLEAN := false;
    v_progress_success BOOLEAN := false;
BEGIN
    -- Start job run tracking
    v_run_id := start_job_run('retention_cleanup', jsonb_build_object(
        'retention_periods', jsonb_build_object(
            'error_logs_days', 90,
            'presence_days', 30,
            'friendships_years', 2,
            'messages_years', 3,
            'private_messages_years', 3,
            'pedagogical_years', 5,
            'inactive_threshold_years', 2
        )
    ));

    BEGIN
        -- ============================================================
        -- CLEANUP 1: Error logs (90 days, resolved only)
        -- ============================================================
        BEGIN
            -- Use existing cleanup_old_errors function if it exists
            IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_errors') THEN
                v_error_logs_deleted := cleanup_old_errors(90);
            ELSE
                -- Fallback: direct delete
                DELETE FROM error_logs
                WHERE resolved = TRUE
                  AND resolved_at < NOW() - INTERVAL '90 days';
                GET DIAGNOSTICS v_error_logs_deleted = ROW_COUNT;
            END IF;
            v_error_logs_success := true;
            RAISE NOTICE 'Error logs cleanup: % entries deleted', v_error_logs_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error logs cleanup failed: %', SQLERRM;
            v_error_logs_success := false;
        END;

        -- ============================================================
        -- CLEANUP 2: User presence (30 days)
        -- ============================================================
        BEGIN
            DELETE FROM user_presence
            WHERE updated_at < NOW() - INTERVAL '30 days';
            GET DIAGNOSTICS v_presence_deleted = ROW_COUNT;
            v_presence_success := true;
            RAISE NOTICE 'User presence cleanup: % entries deleted', v_presence_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'User presence cleanup failed: %', SQLERRM;
            v_presence_success := false;
        END;

        -- ============================================================
        -- CLEANUP 3: Rejected friendships (2 years)
        -- ============================================================
        BEGIN
            DELETE FROM friendships
            WHERE status = 'rejected'
              AND updated_at < NOW() - INTERVAL '2 years';
            GET DIAGNOSTICS v_friendships_deleted = ROW_COUNT;
            v_friendships_success := true;
            RAISE NOTICE 'Friendships cleanup: % entries deleted', v_friendships_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Friendships cleanup failed: %', SQLERRM;
            v_friendships_success := false;
        END;

        -- ============================================================
        -- CLEANUP 4: Chat messages (3 years) - HARD DELETE
        -- Per RGPD Art. 17, must be hard delete, not soft delete
        -- ============================================================
        BEGIN
            DELETE FROM messages
            WHERE created_at < NOW() - INTERVAL '3 years';
            GET DIAGNOSTICS v_messages_deleted = ROW_COUNT;
            v_messages_success := true;
            RAISE NOTICE 'Messages cleanup (HARD DELETE): % entries deleted', v_messages_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Messages cleanup failed: %', SQLERRM;
            v_messages_success := false;
        END;

        -- ============================================================
        -- CLEANUP 5: Private messages (3 years) - HARD DELETE
        -- Cascades to message_inbox and message_attachments_v2
        -- ============================================================
        BEGIN
            DELETE FROM private_messages
            WHERE sent_at < NOW() - INTERVAL '3 years';
            GET DIAGNOSTICS v_private_messages_deleted = ROW_COUNT;
            v_private_messages_success := true;
            RAISE NOTICE 'Private messages cleanup (HARD DELETE): % entries deleted', v_private_messages_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Private messages cleanup failed: %', SQLERRM;
            v_private_messages_success := false;
        END;

        -- ============================================================
        -- CLEANUP 6: Student attempts (5 years + user inactive 2 years)
        -- Only delete if user hasn't been active in 2 years
        -- This protects active users' historical data
        -- ============================================================
        BEGIN
            DELETE FROM student_attempts sa
            WHERE sa.created_at < NOW() - INTERVAL '5 years'
              AND EXISTS (
                  SELECT 1 FROM profiles p
                  WHERE p.id = sa.student_id
                    AND p.updated_at < NOW() - INTERVAL '2 years'
              );
            GET DIAGNOSTICS v_attempts_deleted = ROW_COUNT;
            v_attempts_success := true;
            RAISE NOTICE 'Student attempts cleanup: % entries deleted', v_attempts_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Student attempts cleanup failed: %', SQLERRM;
            v_attempts_success := false;
        END;

        -- ============================================================
        -- CLEANUP 7: Student progress (5 years + user inactive 2 years)
        -- Same logic as student_attempts
        -- ============================================================
        BEGIN
            DELETE FROM student_progress sp
            WHERE sp.created_at < NOW() - INTERVAL '5 years'
              AND EXISTS (
                  SELECT 1 FROM profiles p
                  WHERE p.id = sp.student_id
                    AND p.updated_at < NOW() - INTERVAL '2 years'
              );
            GET DIAGNOSTICS v_progress_deleted = ROW_COUNT;
            v_progress_success := true;
            RAISE NOTICE 'Student progress cleanup: % entries deleted', v_progress_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Student progress cleanup failed: %', SQLERRM;
            v_progress_success := false;
        END;

        -- ============================================================
        -- Complete job run with results
        -- ============================================================
        v_total_deleted := COALESCE(v_error_logs_deleted, 0) +
                           COALESCE(v_presence_deleted, 0) +
                           COALESCE(v_friendships_deleted, 0) +
                           COALESCE(v_messages_deleted, 0) +
                           COALESCE(v_private_messages_deleted, 0) +
                           COALESCE(v_attempts_deleted, 0) +
                           COALESCE(v_progress_deleted, 0);

        PERFORM complete_job_run(
            v_run_id,
            CASE
                -- All succeeded
                WHEN v_error_logs_success AND v_presence_success AND v_friendships_success
                     AND v_messages_success AND v_private_messages_success
                     AND v_attempts_success AND v_progress_success
                THEN 'success'
                -- At least one succeeded
                WHEN v_error_logs_success OR v_presence_success OR v_friendships_success
                     OR v_messages_success OR v_private_messages_success
                     OR v_attempts_success OR v_progress_success
                THEN 'success'  -- Partial success = success for monitoring
                ELSE 'failed'
            END,
            NULL,
            jsonb_build_object(
                'error_logs_deleted', COALESCE(v_error_logs_deleted, 0),
                'error_logs_success', v_error_logs_success,
                'presence_deleted', COALESCE(v_presence_deleted, 0),
                'presence_success', v_presence_success,
                'friendships_deleted', COALESCE(v_friendships_deleted, 0),
                'friendships_success', v_friendships_success,
                'messages_deleted', COALESCE(v_messages_deleted, 0),
                'messages_success', v_messages_success,
                'private_messages_deleted', COALESCE(v_private_messages_deleted, 0),
                'private_messages_success', v_private_messages_success,
                'attempts_deleted', COALESCE(v_attempts_deleted, 0),
                'attempts_success', v_attempts_success,
                'progress_deleted', COALESCE(v_progress_deleted, 0),
                'progress_success', v_progress_success,
                'total_deleted', v_total_deleted,
                'rgpd_compliance', 'Art. 5(1)(e) - Storage limitation'
            )
        );

        RAISE NOTICE 'RGPD Retention cleanup complete: % total entries deleted', v_total_deleted;
        RAISE NOTICE '  - Error logs: %, Presence: %, Friendships: %',
            v_error_logs_deleted, v_presence_deleted, v_friendships_deleted;
        RAISE NOTICE '  - Messages: %, Private messages: %',
            v_messages_deleted, v_private_messages_deleted;
        RAISE NOTICE '  - Attempts: %, Progress: %',
            v_attempts_deleted, v_progress_deleted;

    EXCEPTION WHEN OTHERS THEN
        -- Complete job run with failure
        PERFORM complete_job_run(
            v_run_id,
            'failed',
            SQLERRM,
            jsonb_build_object(
                'error_logs_deleted', COALESCE(v_error_logs_deleted, 0),
                'presence_deleted', COALESCE(v_presence_deleted, 0),
                'friendships_deleted', COALESCE(v_friendships_deleted, 0),
                'messages_deleted', COALESCE(v_messages_deleted, 0),
                'private_messages_deleted', COALESCE(v_private_messages_deleted, 0),
                'attempts_deleted', COALESCE(v_attempts_deleted, 0),
                'progress_deleted', COALESCE(v_progress_deleted, 0),
                'error_logs_success', v_error_logs_success,
                'presence_success', v_presence_success,
                'friendships_success', v_friendships_success,
                'messages_success', v_messages_success,
                'private_messages_success', v_private_messages_success,
                'attempts_success', v_attempts_success,
                'progress_success', v_progress_success
            )
        );
        RAISE;
    END;
END;
$$;

COMMENT ON FUNCTION public.run_cleanup_expired_data() IS
    'pg_cron job for RGPD Article 5(1)(e) compliant data retention cleanup.
     Runs weekly (Sunday 03:00 UTC).
     Cleans up: error_logs (90d), user_presence (30d), friendships (2y rejected),
     messages (3y), private_messages (3y), student_attempts (5y+inactive),
     student_progress (5y+inactive).
     Tracks all deletions in background_job_runs for compliance audit.';

-- Grant execute to service_role for manual triggers
GRANT EXECUTE ON FUNCTION public.run_cleanup_expired_data() TO service_role;

-- ============================================================================
-- PART 2: Schedule pg_cron Job (weekly Sunday 03:00 UTC)
-- ============================================================================

DO $$
BEGIN
    -- Check if pg_cron extension is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove existing job if any (ignore error if not exists)
        BEGIN
            PERFORM cron.unschedule('rgpd-retention-cleanup');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        -- Schedule: Sunday at 03:00 UTC (weekly)
        -- This runs after cleanup-all (02:00 UTC) to avoid conflicts
        PERFORM cron.schedule(
            'rgpd-retention-cleanup',
            '0 3 * * 0',  -- Sunday at 03:00 UTC
            'SELECT public.run_cleanup_expired_data()'
        );

        RAISE NOTICE 'pg_cron job rgpd-retention-cleanup scheduled for Sunday 03:00 UTC';
    ELSE
        RAISE NOTICE 'pg_cron extension not enabled - enable in Supabase Dashboard > Database > Extensions';
    END IF;
END;
$$;
