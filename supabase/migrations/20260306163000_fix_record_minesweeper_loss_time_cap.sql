-- ============================================================================
-- Migration: Cap time_seconds in record_minesweeper_loss()
-- Created: 2026-03-06
-- ============================================================================
-- BUG: record_minesweeper_loss() does not cap time_seconds per difficulty.
--      If a game is resumed days later, the elapsed time exceeds the
--      reasonable_time_bounds CHECK constraint (3600/7200/14400).
-- FIX: Add the same CASE cap as complete_minesweeper_game().
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_minesweeper_loss(
  p_game_id UUID,
  p_grid_state JSONB
)
RETURNS TABLE(success BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_record RECORD;
  v_time_seconds INTEGER;
  v_grid_size INTEGER;
BEGIN
  -- Step 1: Get game and verify ownership
  SELECT * INTO v_game_record
  FROM public.minesweeper_games
  WHERE id = p_game_id
    AND student_id = auth.uid()
    AND status = 'in_progress';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found, not owned by you, or already completed';
  END IF;

  -- Step 2: Validate grid_state size
  v_grid_size := pg_column_size(p_grid_state);
  IF v_grid_size > 100000 THEN
    RAISE EXCEPTION 'Grid state too large: exceeds 100KB';
  END IF;

  -- Step 3: Calculate time_seconds server-side
  IF v_game_record.started_at IS NOT NULL THEN
    v_time_seconds := GREATEST(1, EXTRACT(EPOCH FROM (NOW() - v_game_record.started_at))::INTEGER);
  ELSE
    v_time_seconds := 1;
  END IF;

  -- Cap time to reasonable bounds per difficulty (matches CHECK constraint)
  CASE v_game_record.difficulty
    WHEN 'beginner' THEN v_time_seconds := LEAST(v_time_seconds, 3600);
    WHEN 'intermediate' THEN v_time_seconds := LEAST(v_time_seconds, 7200);
    WHEN 'expert' THEN v_time_seconds := LEAST(v_time_seconds, 14400);
  END CASE;

  -- Step 4: Update game record
  UPDATE public.minesweeper_games
  SET
    status = 'lost',
    grid_state = p_grid_state,
    time_seconds = v_time_seconds,
    gidouilles_awarded = 0,
    completed_at = NOW()
  WHERE id = p_game_id;

  RETURN QUERY SELECT TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_minesweeper_loss TO authenticated;

COMMENT ON FUNCTION public.record_minesweeper_loss IS
'Marks a Minesweeper game as lost. Caps time_seconds per difficulty to satisfy reasonable_time_bounds constraint.';
