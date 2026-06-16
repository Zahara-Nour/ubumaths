-- ============================================================================
-- Enable Achievements in complete_minesweeper_game()
-- ============================================================================
-- Issue: Achievements tables exist but function returns wrong format
-- - Tables: minesweeper_achievements, minesweeper_student_achievements (correct)
-- - Old return: gidouilles_awarded (incorrect)
-- - New return: gidouilles_earned (matches code expectations)
-- ============================================================================

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.complete_minesweeper_game(UUID, JSONB);

CREATE OR REPLACE FUNCTION public.complete_minesweeper_game(
  p_game_id UUID,
  p_grid_state JSONB
)
RETURNS TABLE(
  gidouilles_earned INTEGER,
  achievements JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_record RECORD;
  v_is_valid BOOLEAN;
  v_time_seconds INTEGER;
  v_gidouilles INTEGER;
  v_grid_size INTEGER;
  v_unlocked_achievements JSONB;
BEGIN
  -- Step 1: Get game and verify ownership
  SELECT * INTO v_game_record
  FROM public.minesweeper_games
  WHERE id = p_game_id
    AND student_id = auth.uid() -- Must be authenticated and own the game
    AND status = 'in_progress'; -- Must be in progress

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found, not owned by you, or already completed';
  END IF;

  -- Step 2: Validate grid_state represents a legitimate win
  v_is_valid := public.validate_minesweeper_win(p_grid_state, v_game_record.difficulty);

  IF NOT v_is_valid THEN
    RAISE EXCEPTION 'Invalid grid state: does not represent a valid win condition';
  END IF;

  -- Step 3: Validate grid_state size to prevent payload attacks
  v_grid_size := pg_column_size(p_grid_state);
  IF v_grid_size > 100000 THEN -- 100KB limit
    RAISE EXCEPTION 'Grid state too large: exceeds 100KB';
  END IF;

  -- Step 4: Calculate time_seconds (server-side to prevent manipulation)
  IF v_game_record.started_at IS NOT NULL THEN
    v_time_seconds := GREATEST(1, EXTRACT(EPOCH FROM (NOW() - v_game_record.started_at))::INTEGER);
  ELSE
    v_time_seconds := 1; -- Minimal time if started_at is somehow NULL
  END IF;

  -- Step 5: Calculate gidouilles using the CORRECT parameter order
  v_gidouilles := public.calculate_minesweeper_gidouilles(
    v_game_record.difficulty,              -- p_difficulty TEXT
    v_time_seconds,                        -- p_time_seconds INTEGER
    v_game_record.student_id,              -- p_student_id UUID
    COALESCE(v_game_record.hints_used, 0)  -- p_hints_used INTEGER
  );

  -- Step 6: Update game record with validated data
  UPDATE public.minesweeper_games
  SET
    status = 'won',
    completed_at = NOW(),
    time_seconds = v_time_seconds,
    gidouilles_awarded = v_gidouilles,
    grid_state = p_grid_state -- Store the validated grid
  WHERE id = p_game_id;

  -- Step 7: Award gidouilles to student
  UPDATE public.profiles
  SET gidouilles = COALESCE(gidouilles, 0) + v_gidouilles
  WHERE id = v_game_record.student_id;

  -- Step 8: Record transaction in gidouilles_history for audit trail
  INSERT INTO public.gidouilles_history (student_id, amount, reason, reference_id)
  VALUES (
    v_game_record.student_id,
    v_gidouilles,
    'Minesweeper win: ' || v_game_record.difficulty || ' (' || v_time_seconds || 's)',
    p_game_id
  );

  -- Step 9: Check and unlock achievements (using correct table names)
  v_unlocked_achievements := public.check_and_unlock_achievements(p_game_id);

  -- Step 10: Return gidouilles_earned (not gidouilles_awarded) and achievements
  RETURN QUERY SELECT v_gidouilles, v_unlocked_achievements;
END;
$$;

COMMENT ON FUNCTION public.complete_minesweeper_game IS
  'Completes a Minesweeper game, validates win condition, calculates rewards, and unlocks achievements. Returns gidouilles_earned and achievements array.';

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- ✅ Fixed return type: gidouilles_earned (matches code expectations)
-- ✅ Re-enabled achievements using check_and_unlock_achievements()
-- ✅ Correct parameter order for calculate_minesweeper_gidouilles()
-- ✅ Achievement tables: minesweeper_achievements, minesweeper_student_achievements
