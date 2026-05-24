-- ============================================================================
-- Migration: Unblock student_achievements / achievement_progress inserts
-- ============================================================================
-- The universal achievements migration (20251121000000) shipped two policies
-- whose intent was "only SECURITY DEFINER functions can insert" but whose
-- implementation rejects ALL inserts unconditionally:
--
--   CREATE POLICY "System can insert student achievements"
--     ON public.student_achievements FOR INSERT
--     WITH CHECK (false);   -- ← blocks everyone, including the API endpoints
--
--   CREATE POLICY "System can manage achievement progress"
--     ON public.achievement_progress FOR INSERT
--     WITH CHECK (false);   -- ← same problem
--
-- That works for the SECURITY DEFINER RPCs (process_achievement_event etc.)
-- because their owner (`postgres`) has the BYPASSRLS attribute and never
-- evaluates the policy. But `/api/games/2048/scores` and
-- `/api/games/mathemo/scores` insert directly with the authenticated user's
-- client to award milestones, and those inserts are unconditionally rejected
-- with "new row violates row-level security policy for table
-- student_achievements" (visible repeatedly in postgres_logs).
--
-- The endpoints will be switched to the service-role client in the same PR;
-- this migration adds the matching policy so service_role inserts succeed.
-- Authenticated users still cannot insert (no policy applies to them, so
-- the default-deny on a table with RLS enabled kicks in).
--
-- We do NOT touch `minesweeper_student_achievements`: that table has no
-- INSERT policy at all (writes go exclusively through
-- check_and_unlock_achievements SECURITY DEFINER, which works fine).
-- ============================================================================

-- We use FOR ALL (rather than FOR INSERT) on both tables for symmetry with
-- the yesterday migration that fixed achievement_events the same way
-- (20260523220626_tighten_permissive_rls_policies.sql). Existing SELECT
-- policies for students/teachers remain in place and continue to apply.

-- ---------------------------------------------------------------------------
-- student_achievements
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert student achievements" ON public.student_achievements;

CREATE POLICY "Service role can manage student achievements"
    ON public.student_achievements
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- achievement_progress
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can manage achievement progress" ON public.achievement_progress;

CREATE POLICY "Service role can manage achievement progress"
    ON public.achievement_progress
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
