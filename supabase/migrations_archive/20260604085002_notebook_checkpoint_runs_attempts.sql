-- Migration: Notebook Checkpoint Runs — attempt tracking + hint flag
-- Created: 2026-06-04
-- Description: Adds per-(notebook, user, cell) attempt counter, first/success
--              timestamps, and a hint-revealed flag so the teacher dashboard
--              can distinguish "got it first try" from "12 attempts after
--              revealing the hint". Backward compatible: existing rows keep
--              attempt_count = 1 (one known attempt — the last one recorded),
--              timestamps stay NULL until the next run.

ALTER TABLE python_notebook_checkpoint_runs
  ADD COLUMN IF NOT EXISTS attempt_count      INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS first_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS succeeded_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hint_revealed      BOOLEAN NOT NULL DEFAULT FALSE;

-- Sanity check: attempt_count must be non-negative.
-- A value of 0 is reserved for rows created by the hint-revealed flip when
-- the student clicked "Voir l'indice" before ever pressing Vérifier
-- (an edge case the UI normally blocks, but defended in SQL too).
ALTER TABLE python_notebook_checkpoint_runs
  ADD CONSTRAINT python_notebook_checkpoint_runs_attempt_count_nonnegative
  CHECK (attempt_count >= 0);

-- Comments for /api/schema introspection + readability.
COMMENT ON COLUMN python_notebook_checkpoint_runs.attempt_count IS
  'Total number of times the student clicked Vérifier on this checkpoint, across all sessions. Sticky: never decremented. The first run upserts to 1; subsequent runs increment by 1.';
COMMENT ON COLUMN python_notebook_checkpoint_runs.first_attempted_at IS
  'Timestamp of the very first Vérifier click. Set on initial INSERT and never modified afterwards (the UPSERT preserves it via COALESCE).';
COMMENT ON COLUMN python_notebook_checkpoint_runs.succeeded_at IS
  'Timestamp of the first time the checkpoint passed. NULL if never passed. Sticky-success: once set, never cleared even on later failed re-runs.';
COMMENT ON COLUMN python_notebook_checkpoint_runs.hint_revealed IS
  'Whether the student ever clicked "Voir l''indice". One-way transition false → true via PATCH /checkpoint-runs/[cell_id]/hint-revealed. Informs the dashboard that the student used the teacher''s hint.';

-- ============================================================================
-- ATOMIC UPSERT FUNCTION
-- ============================================================================
-- Supabase's PostgREST .upsert() can't express `attempt_count = attempt_count + 1`
-- in the conflict resolution clause — that arithmetic only lives on the SQL
-- side. We expose a SECURITY INVOKER function so RLS still applies (the caller's
-- session is used) but the increment + COALESCE timestamps happen atomically in
-- a single statement.
CREATE OR REPLACE FUNCTION upsert_checkpoint_run(
  p_notebook_id  UUID,
  p_cell_id      TEXT,
  p_status       TEXT,
  p_error_message TEXT
) RETURNS python_notebook_checkpoint_runs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_user UUID := auth.uid();
  v_result python_notebook_checkpoint_runs;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  INSERT INTO python_notebook_checkpoint_runs AS r (
    notebook_id, user_id, cell_id,
    status, error_message,
    ran_at,
    attempt_count, first_attempted_at, succeeded_at
  )
  VALUES (
    p_notebook_id, v_user, p_cell_id,
    p_status, p_error_message,
    v_now,
    1, v_now,
    CASE WHEN p_status = 'passed' THEN v_now ELSE NULL END
  )
  ON CONFLICT (notebook_id, user_id, cell_id) DO UPDATE SET
    status        = EXCLUDED.status,
    error_message = EXCLUDED.error_message,
    ran_at        = EXCLUDED.ran_at,
    -- Sticky counter: never decrements, +1 per Vérifier click.
    attempt_count = r.attempt_count + 1,
    -- Sticky timestamps: keep the original first/succeeded values.
    first_attempted_at = COALESCE(r.first_attempted_at, EXCLUDED.first_attempted_at),
    succeeded_at = COALESCE(
      r.succeeded_at,
      CASE WHEN EXCLUDED.status = 'passed' THEN EXCLUDED.ran_at ELSE NULL END
    )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION upsert_checkpoint_run IS
  'Atomic UPSERT that increments attempt_count by 1 on conflict, sets first_attempted_at on insert (preserved on conflict), and records succeeded_at on the first passing run (sticky). SECURITY INVOKER → RLS still applies.';

-- ============================================================================
-- HINT-REVEALED FLAG FLIP
-- ============================================================================
-- One-way transition from false to true. Exposed as a dedicated function so
-- the API can call it without race conditions, and we can be sure no caller
-- is able to flip the flag back to false (defense in depth — the PATCH
-- endpoint also enforces this).
CREATE OR REPLACE FUNCTION mark_checkpoint_hint_revealed(
  p_notebook_id UUID,
  p_cell_id     TEXT
) RETURNS python_notebook_checkpoint_runs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_result python_notebook_checkpoint_runs;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Only flip false → true. If the row doesn't exist yet (student clicked
  -- Voir l'indice before ever pressing Vérifier — should be impossible per
  -- the UI threshold but defend anyway), we create it with hint_revealed
  -- = true but no status / no ran_at — the next runCheckpoint will fill it.
  INSERT INTO python_notebook_checkpoint_runs AS r (
    notebook_id, user_id, cell_id, status, ran_at,
    attempt_count, first_attempted_at, hint_revealed
  )
  VALUES (
    p_notebook_id, v_user, p_cell_id, 'failed', NOW(),
    0, NULL, TRUE
  )
  ON CONFLICT (notebook_id, user_id, cell_id) DO UPDATE SET
    hint_revealed = TRUE
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION mark_checkpoint_hint_revealed IS
  'Idempotent flip of hint_revealed from false to true. If the row does not yet exist, creates it with attempt_count=0 (signalling "hint revealed before any attempt"). SECURITY INVOKER → RLS still applies.';
