-- ============================================================================
-- Migration: Backfill Tournament Scores
-- Created: 2026-01-02
-- Purpose: Calculate scores for games won before 3BV scoring migration
-- ============================================================================

DO $$
DECLARE
  v_updated INTEGER;
BEGIN
  -- Update games that have status = 'won' but score IS NULL
  UPDATE minesweeper_tournament_games g
  SET
    grid_3bv = calculate_3bv(g.grid_state),
    score = calculate_tournament_score(
      calculate_3bv(g.grid_state),
      g.time_seconds,
      (SELECT public.get_cycle_for_grade(p.grade) FROM profiles p WHERE p.id = g.student_id),
      (SELECT t.difficulty FROM minesweeper_tournaments t WHERE t.id = g.tournament_id)
    )
  WHERE g.status = 'won'
    AND g.score IS NULL
    AND g.grid_state IS NOT NULL
    AND g.time_seconds IS NOT NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Complete: Backfill Tournament Scores';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Updated % games with calculated scores', v_updated;
  RAISE NOTICE '========================================';
END;
$$ LANGUAGE plpgsql;
