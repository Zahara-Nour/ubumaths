-- =============================================================================
-- Python submission server-side re-verification (Phase 1b)
-- =============================================================================
-- The Python verdict is computed CLIENT-SIDE (Pyodide in the student's browser),
-- so a student can forge `valid: true`. This adds the trusted-server re-check
-- verdict — replayed by service_role (Pyodide-in-Node), compared to the client
-- verdict, and readable by the TEACHER/ADMIN ONLY. Mastery is NEVER modified.
--
-- Design: a DEDICATED SIDE TABLE (public.python_submission_server_verdicts),
-- NOT extra columns on python_exercise_submissions. Rationale: masking columns
-- via REVOKE breaks PostgREST — a role without table-level SELECT gets
-- `42501 permission denied for table` on `select('*')`, and the submit endpoint
-- runs `.select('*', {count:'exact', head:true})` as the student on EVERY
-- submission. A side table with teacher-only RLS keeps python_exercise_submissions
-- completely untouched (no column, no grant change) while hiding the verdict from
-- students by the absence of any student SELECT policy (RLS → 0 rows, no error).
--
-- RGPD / safeguarding (minors): the verdict is a fraud-detection signal visible
-- to the teacher/admin only; a student must never learn whether a forged
-- submission was caught.
--
-- Fully additive / non-destructive. The re-check runs as service_role (bypasses
-- RLS) and writes here only. The pg_cron schedule is NOT created here (see §3),
-- same as every other background job in this project.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Side table holding the server verdict, keyed 1:1 to a submission
-- -----------------------------------------------------------------------------
-- One row per mastery-granting submission that is (re)checked. No 'skipped'
-- status: submissions out of scope (is_correct=false) simply get no row.
CREATE TABLE IF NOT EXISTS "public"."python_submission_server_verdicts" (
    "submission_id" uuid PRIMARY KEY
        REFERENCES "public"."python_exercise_submissions"("id") ON DELETE CASCADE,
    "verification_status" text NOT NULL DEFAULT 'pending',
    "server_is_correct" boolean,
    "server_validation_result" jsonb,
    "verified_at" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "python_submission_server_verdicts_status_check"
        CHECK (
            "verification_status" = ANY (
                ARRAY['pending', 'match', 'mismatch', 'indeterminate', 'error']
            )
        )
);

ALTER TABLE "public"."python_submission_server_verdicts" OWNER TO "postgres";

COMMENT ON TABLE "public"."python_submission_server_verdicts" IS
    'Trusted-server re-check verdict for mastery-granting Python submissions (1:1 with python_exercise_submissions). TEACHER/ADMIN visible only (RLS: no student policy) — RGPD/safeguarding: a minor must not learn whether their forged submission was caught. Written exclusively by the service_role re-check (recheck.ts). Never modifies mastery or the submission.';

COMMENT ON COLUMN "public"."python_submission_server_verdicts"."submission_id" IS
    'PK + FK -> python_exercise_submissions(id) ON DELETE CASCADE. 1:1: at most one verdict per submission.';

COMMENT ON COLUMN "public"."python_submission_server_verdicts"."verification_status" IS
    'State of the server re-check. pending = queued/awaiting replay; match = server agrees with the client verdict; mismatch = server DISAGREES (possible forged submission -> flag the teacher); indeterminate = non-deterministic code or exercise edited after submission (never treated as fraud); error = server execution failed (timeout/OOM/package). No "skipped": out-of-scope submissions get no row at all.';

COMMENT ON COLUMN "public"."python_submission_server_verdicts"."server_is_correct" IS
    'Verdict computed by replaying the submission on the trusted server. NULL while pending.';

COMMENT ON COLUMN "public"."python_submission_server_verdicts"."server_validation_result" IS
    'Full JSONB verdict from the server replay (same shape as python_exercise_submissions.validation_result), for the teacher diff panel. NULL while pending.';

COMMENT ON COLUMN "public"."python_submission_server_verdicts"."verified_at" IS
    'Timestamp of the terminal verdict (match/mismatch/indeterminate/error). NULL while pending.';

COMMENT ON COLUMN "public"."python_submission_server_verdicts"."created_at" IS
    'When the verdict row was created (submission queued for re-check). Used by the stale-pending sweep.';

-- Look up all verdicts for an exercise (teacher results page) efficiently.
CREATE INDEX IF NOT EXISTS "idx_pssv_created_at"
    ON "public"."python_submission_server_verdicts" USING "btree" ("created_at");

-- Partial index for the stale-pending sweep (only 'pending' rows matter).
CREATE INDEX IF NOT EXISTS "idx_pssv_pending"
    ON "public"."python_submission_server_verdicts" USING "btree" ("created_at")
    WHERE ("verification_status" = 'pending');


-- -----------------------------------------------------------------------------
-- 2. RLS — teacher/admin can SELECT; students have NO access; service_role writes
-- -----------------------------------------------------------------------------
-- This REPLACES the earlier column-masking approach. Because there is no student
-- SELECT policy, a student querying this table gets zero rows (never an error
-- that could leak existence). Only is_teacher_or_admin() (mono-teacher helper,
-- bypasses RLS internally) may read. There is deliberately NO write policy for
-- `authenticated`: verdicts are server-computed and immutable to humans; the
-- service_role bypasses RLS and is the sole writer.
ALTER TABLE "public"."python_submission_server_verdicts" ENABLE ROW LEVEL SECURITY;

-- Teacher/admin read the verdict directly (mono-prof -> sees all).
CREATE POLICY "Teachers read python server verdicts"
    ON "public"."python_submission_server_verdicts"
    FOR SELECT TO "authenticated"
    USING (public.is_teacher_or_admin());

-- Grants: table-level privilege still gated by RLS. anon/authenticated get the
-- blanket grant (matching the project convention on curriculum_* tables), but
-- with NO INSERT/UPDATE/DELETE policy the authenticated student/teacher cannot
-- write, and with only the SELECT policy above only teacher/admin can read.
-- service_role keeps full access and bypasses RLS entirely (the re-check writer).
GRANT ALL ON TABLE "public"."python_submission_server_verdicts" TO "anon";
GRANT ALL ON TABLE "public"."python_submission_server_verdicts" TO "authenticated";
GRANT ALL ON TABLE "public"."python_submission_server_verdicts" TO "service_role";


-- -----------------------------------------------------------------------------
-- 3. pg_cron sweep: flag stale 'pending' re-checks (COUNT-only, monitoring)
-- -----------------------------------------------------------------------------
-- Modelled exactly on cleanup_stuck_job_runs(): start_job_run(...) -> work ->
-- complete_job_run(...), SECURITY DEFINER, OWNER TO postgres, with a COMMENT.
-- It only COUNTS verdict rows still 'pending' after > 1 hour (a re-check that
-- never landed — waitUntil dropped, quota, worker down) and records the count in
-- the job-run metadata, surfaced by the existing admin cron monitoring
-- (admin_pg_cron_jobs view over background_job_runs). It modifies NOTHING: the
-- rows stay 'pending' and idempotently eligible for a later replay.
CREATE OR REPLACE FUNCTION "public"."run_flag_stale_python_rechecks"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_run_id UUID;
    v_stale_count INTEGER;
    v_stale_threshold INTERVAL := INTERVAL '1 hour';
BEGIN
    -- Start job run tracking
    v_run_id := start_job_run('flag_stale_python_rechecks', '{}'::jsonb);

    BEGIN
        -- Count verdict rows whose server re-check never completed.
        SELECT COUNT(*)
        INTO v_stale_count
        FROM python_submission_server_verdicts
        WHERE verification_status = 'pending'
          AND created_at < NOW() - v_stale_threshold;

        -- Complete job run with success; stash the count for monitoring.
        PERFORM complete_job_run(
            v_run_id,
            'success',
            NULL,
            jsonb_build_object(
                'stale_pending_rechecks', v_stale_count,
                'threshold_hours', 1
            )
        );

    EXCEPTION WHEN OTHERS THEN
        -- Complete job run with failure
        PERFORM complete_job_run(
            v_run_id,
            'failed',
            SQLERRM,
            jsonb_build_object('stale_pending_rechecks', COALESCE(v_stale_count, 0))
        );
        RAISE;
    END;
END;
$$;

ALTER FUNCTION "public"."run_flag_stale_python_rechecks"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."run_flag_stale_python_rechecks"() IS
    'pg_cron job that COUNTS python_submission_server_verdicts stuck in verification_status = pending for > 1 hour (re-check never landed) and records the count in background_job_runs metadata for admin monitoring. Modifies no row — they stay pending and idempotently eligible for a later replay.
     Intended cadence: hourly. Schedule OUT OF BAND (like every other job), e.g.:
       SELECT cron.schedule(''flag_stale_python_rechecks'', ''15 * * * *'', ''SELECT public.run_flag_stale_python_rechecks();'');';

-- Mirror the grants the baseline puts on cleanup_stuck_job_runs() so pg_cron
-- (which runs as postgres) and monitoring behave consistently.
GRANT ALL ON FUNCTION "public"."run_flag_stale_python_rechecks"() TO "anon";
GRANT ALL ON FUNCTION "public"."run_flag_stale_python_rechecks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_flag_stale_python_rechecks"() TO "service_role";
