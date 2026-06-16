-- Extend run_cleanup_expired_data() to cover audit_logs, error_occurrences,
-- and background_job_runs which previously had no retention policy.
--
-- Also fixes error_logs purge: was "resolved = TRUE AND > 90 days" which
-- effectively never purged anything (unresolved errors accumulated forever).
-- Now: all error_logs > 30 days are deleted, resolved or not.
--
-- New retention policies:
--   error_logs              30 days  (was: resolved=TRUE + 90 days)
--   audit_logs              60 days  (was: never purged)
--   error_occurrences       30 days  (was: never purged)
--   background_job_runs      7 days  (was: never purged)
--
-- Existing policies unchanged:
--   user_presence           30 days
--   friendships rejected     2 years
--   messages                 3 years
--   private_messages         3 years
--   student_attempts         5 years (if user inactive 2 years)
--   student_progress         5 years (if user inactive 2 years)
--
-- Triggered by cron job 'rgpd-retention-cleanup' every Sunday at 03:00 UTC.

CREATE OR REPLACE FUNCTION public.run_cleanup_expired_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_run_id UUID;
    v_error_logs_deleted INTEGER := 0;
    v_presence_deleted INTEGER := 0;
    v_friendships_deleted INTEGER := 0;
    v_messages_deleted INTEGER := 0;
    v_private_messages_deleted INTEGER := 0;
    v_attempts_deleted INTEGER := 0;
    v_progress_deleted INTEGER := 0;
    v_audit_logs_deleted INTEGER := 0;
    v_error_occurrences_deleted INTEGER := 0;
    v_background_jobs_deleted INTEGER := 0;
    v_total_deleted INTEGER := 0;
    v_error_logs_success BOOLEAN := false;
    v_presence_success BOOLEAN := false;
    v_friendships_success BOOLEAN := false;
    v_messages_success BOOLEAN := false;
    v_private_messages_success BOOLEAN := false;
    v_attempts_success BOOLEAN := false;
    v_progress_success BOOLEAN := false;
    v_audit_logs_success BOOLEAN := false;
    v_error_occurrences_success BOOLEAN := false;
    v_background_jobs_success BOOLEAN := false;
BEGIN
    -- Start job run tracking
    v_run_id := start_job_run('retention_cleanup', jsonb_build_object(
        'retention_periods', jsonb_build_object(
            'error_logs_days', 30,
            'audit_logs_days', 60,
            'error_occurrences_days', 30,
            'background_job_runs_days', 7,
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
        -- CLEANUP 1: Error logs (30 days, ALL — resolved or not)
        -- Changed from "resolved=TRUE + 90 days" which never purged
        -- unresolved errors, leading to unbounded growth.
        -- ============================================================
        BEGIN
            DELETE FROM error_logs
            WHERE created_at < NOW() - INTERVAL '30 days';
            GET DIAGNOSTICS v_error_logs_deleted = ROW_COUNT;
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
        -- CLEANUP 8: Audit logs (60 days)
        -- TOAST-heavy table (JSONB before/after snapshots); previously
        -- had no retention and grew unbounded.
        -- ============================================================
        BEGIN
            DELETE FROM audit_logs
            WHERE created_at < NOW() - INTERVAL '60 days';
            GET DIAGNOSTICS v_audit_logs_deleted = ROW_COUNT;
            v_audit_logs_success := true;
            RAISE NOTICE 'Audit logs cleanup: % entries deleted', v_audit_logs_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Audit logs cleanup failed: %', SQLERRM;
            v_audit_logs_success := false;
        END;

        -- ============================================================
        -- CLEANUP 9: Error occurrences (30 days)
        -- Aggregated error counters; kept in sync with error_logs retention.
        -- ============================================================
        BEGIN
            DELETE FROM error_occurrences
            WHERE last_seen < NOW() - INTERVAL '30 days';
            GET DIAGNOSTICS v_error_occurrences_deleted = ROW_COUNT;
            v_error_occurrences_success := true;
            RAISE NOTICE 'Error occurrences cleanup: % entries deleted', v_error_occurrences_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error occurrences cleanup failed: %', SQLERRM;
            v_error_occurrences_success := false;
        END;

        -- ============================================================
        -- CLEANUP 10: Background job runs (7 days)
        -- Operational debug data; older runs have no value.
        -- ============================================================
        BEGIN
            DELETE FROM background_job_runs
            WHERE started_at < NOW() - INTERVAL '7 days';
            GET DIAGNOSTICS v_background_jobs_deleted = ROW_COUNT;
            v_background_jobs_success := true;
            RAISE NOTICE 'Background job runs cleanup: % entries deleted', v_background_jobs_deleted;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Background job runs cleanup failed: %', SQLERRM;
            v_background_jobs_success := false;
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
                           COALESCE(v_progress_deleted, 0) +
                           COALESCE(v_audit_logs_deleted, 0) +
                           COALESCE(v_error_occurrences_deleted, 0) +
                           COALESCE(v_background_jobs_deleted, 0);

        PERFORM complete_job_run(
            v_run_id,
            CASE
                WHEN v_error_logs_success AND v_presence_success AND v_friendships_success
                     AND v_messages_success AND v_private_messages_success
                     AND v_attempts_success AND v_progress_success
                     AND v_audit_logs_success AND v_error_occurrences_success
                     AND v_background_jobs_success
                THEN 'success'
                WHEN v_error_logs_success OR v_presence_success OR v_friendships_success
                     OR v_messages_success OR v_private_messages_success
                     OR v_attempts_success OR v_progress_success
                     OR v_audit_logs_success OR v_error_occurrences_success
                     OR v_background_jobs_success
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
                'audit_logs_deleted', COALESCE(v_audit_logs_deleted, 0),
                'audit_logs_success', v_audit_logs_success,
                'error_occurrences_deleted', COALESCE(v_error_occurrences_deleted, 0),
                'error_occurrences_success', v_error_occurrences_success,
                'background_jobs_deleted', COALESCE(v_background_jobs_deleted, 0),
                'background_jobs_success', v_background_jobs_success,
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
        RAISE NOTICE '  - Audit logs: %, Error occurrences: %, Background jobs: %',
            v_audit_logs_deleted, v_error_occurrences_deleted, v_background_jobs_deleted;

    EXCEPTION WHEN OTHERS THEN
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
                'audit_logs_deleted', COALESCE(v_audit_logs_deleted, 0),
                'error_occurrences_deleted', COALESCE(v_error_occurrences_deleted, 0),
                'background_jobs_deleted', COALESCE(v_background_jobs_deleted, 0),
                'error_logs_success', v_error_logs_success,
                'presence_success', v_presence_success,
                'friendships_success', v_friendships_success,
                'messages_success', v_messages_success,
                'private_messages_success', v_private_messages_success,
                'attempts_success', v_attempts_success,
                'progress_success', v_progress_success,
                'audit_logs_success', v_audit_logs_success,
                'error_occurrences_success', v_error_occurrences_success,
                'background_jobs_success', v_background_jobs_success
            )
        );
        RAISE;
    END;
END;
$function$;
