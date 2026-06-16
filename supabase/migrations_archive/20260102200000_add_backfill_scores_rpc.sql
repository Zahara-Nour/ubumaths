-- ============================================================================
-- Migration: Add RPC function to backfill tournament scores
-- Created: 2026-01-02
-- Purpose: Allow backfilling scores for games won before 3BV scoring migration
-- ============================================================================

-- Function to backfill scores for a specific tournament
CREATE OR REPLACE FUNCTION public.backfill_tournament_scores(p_tournament_id UUID)
RETURNS TABLE(updated_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Update games that have status = 'won' but score IS NULL
  WITH updated AS (
    UPDATE minesweeper_tournament_games g
    SET
      grid_3bv = calculate_3bv(g.grid_state),
      score = calculate_tournament_score(
        calculate_3bv(g.grid_state),
        g.time_seconds,
        (SELECT public.get_cycle_for_grade(p.grade) FROM profiles p WHERE p.id = g.student_id),
        (SELECT t.difficulty FROM minesweeper_tournaments t WHERE t.id = g.tournament_id)
      )
    WHERE g.tournament_id = p_tournament_id
      AND g.status = 'won'
      AND g.score IS NULL
      AND g.grid_state IS NOT NULL
      AND g.time_seconds IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO v_count FROM updated;

  updated_count := v_count;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.backfill_tournament_scores IS
  'Backfills scores for tournament games that were won before 3BV scoring was implemented.
   Returns the count of games updated.';

GRANT EXECUTE ON FUNCTION public.backfill_tournament_scores TO authenticated;

-- ============================================================================
-- Function to redistribute rewards for a completed tournament
-- (for cases where finalization ran with empty standings)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.redistribute_tournament_rewards(p_tournament_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  rewards_distributed INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_standing RECORD;
  v_reward INTEGER;
  v_rewards_count INTEGER := 0;
BEGIN
  -- Get tournament
  SELECT * INTO v_tournament
  FROM public.minesweeper_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Only creator or admin can redistribute
  IF v_tournament.creator_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only tournament creator or admin can redistribute rewards';
    END IF;
  END IF;

  -- Check tournament is completed
  IF v_tournament.status != 'completed' THEN
    RAISE EXCEPTION 'Can only redistribute rewards for completed tournaments';
  END IF;

  -- Check if rewards were already distributed (check gidouilles_history)
  IF EXISTS (
    SELECT 1 FROM public.gidouilles_history
    WHERE reason LIKE 'Tournament ' || v_tournament.name || ' - Position #%'
  ) THEN
    RAISE EXCEPTION 'Rewards have already been distributed for this tournament';
  END IF;

  -- Distribute rewards to podium
  FOR v_standing IN
    SELECT s.student_id, s.position
    FROM public.minesweeper_tournament_standings s
    WHERE s.tournament_id = p_tournament_id
      AND s.position <= v_tournament.podium_places
    ORDER BY s.position
  LOOP
    -- Get reward amount for this position
    v_reward := (v_tournament.podium_rewards->>v_standing.position::TEXT)::INTEGER;

    IF v_reward IS NOT NULL AND v_reward > 0 THEN
      -- Award gidouilles
      UPDATE public.profiles
      SET gidouilles = COALESCE(gidouilles, 0) + v_reward
      WHERE id = v_standing.student_id;

      -- Record in history
      INSERT INTO public.gidouilles_history (student_id, delta, reason)
      VALUES (
        v_standing.student_id,
        v_reward,
        'Tournament ' || v_tournament.name || ' - Position #' || v_standing.position
      );

      v_rewards_count := v_rewards_count + 1;
    END IF;
  END LOOP;

  success := TRUE;
  rewards_distributed := v_rewards_count;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.redistribute_tournament_rewards IS
  'Redistributes rewards for a completed tournament where finalization ran but
   standings were empty (e.g., due to NULL scores before backfill).
   Only works if no rewards were previously distributed.';

GRANT EXECUTE ON FUNCTION public.redistribute_tournament_rewards TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Complete: Backfill Scores RPC';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW FUNCTIONS:';
  RAISE NOTICE '  - backfill_tournament_scores(tournament_id)';
  RAISE NOTICE '    Backfills NULL scores for pre-3BV games';
  RAISE NOTICE '';
  RAISE NOTICE '  - redistribute_tournament_rewards(tournament_id)';
  RAISE NOTICE '    Re-distributes rewards if they were missed';
  RAISE NOTICE '========================================';
END;
$$ LANGUAGE plpgsql;
