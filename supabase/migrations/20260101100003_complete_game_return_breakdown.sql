-- ============================================================================
-- Migration: Add reward breakdown to complete_minesweeper_game response
-- Purpose: Return detailed breakdown for VictoryModal display
-- Date: 2026-01-01
-- ============================================================================
--
-- This migration modifies complete_minesweeper_game to return a breakdown JSONB
-- containing all the factors used in the Strategy D gidouilles calculation:
--
--   breakdown: {
--     base_reward: number,      -- 1.0 / 3.0 / 6.0
--     reference_time: number,   -- 180 / 600 / 1200
--     time_seconds: number,     -- actual completion time
--     time_mult: number,        -- 0.8 to 1.3
--     hints_used: number,       -- total hints
--     hints_from_items: number, -- hints from shop items
--     hint_penalty: number,     -- 0 to 0.50
--     wins_today: number,       -- wins before this one
--     daily_mult: number        -- 0.3 to 1.0
--   }
--
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.complete_minesweeper_game(UUID, JSONB);

CREATE OR REPLACE FUNCTION public.complete_minesweeper_game(
  p_game_id UUID,
  p_grid_state JSONB
)
RETURNS TABLE(
  gidouilles_earned NUMERIC(10,2),
  achievements JSONB,
  points_earned INTEGER,
  breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_record RECORD;
  v_user_role TEXT;
  v_time_seconds INTEGER;
  v_gidouilles NUMERIC(10,2);
  v_points INTEGER;
  v_is_valid BOOLEAN;
  v_grid_size INTEGER;
  v_unlocked_achievements JSONB;
  v_hints_from_items INTEGER;

  -- Breakdown variables
  v_base_reward NUMERIC(10,2);
  v_reference_time INTEGER;
  v_time_ratio NUMERIC;
  v_time_mult NUMERIC;
  v_hints_gidouilles INTEGER;
  v_hints_items INTEGER;
  v_hint_penalty NUMERIC;
  v_games_won_today INTEGER;
  v_daily_mult NUMERIC;
  v_today_start TIMESTAMPTZ;
  v_breakdown JSONB;

  -- Penalty rates
  v_gidouilles_penalties NUMERIC[] := ARRAY[0.0, 0.10, 0.22, 0.35];
  v_item_penalties NUMERIC[] := ARRAY[0.0, 0.05, 0.11, 0.17];
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

  -- Step 2: Get user role (only students earn gidouilles)
  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_game_record.student_id;

  -- Step 3: Validate grid_state represents a legitimate win
  v_is_valid := public.validate_minesweeper_win(p_grid_state, v_game_record.difficulty);

  IF NOT v_is_valid THEN
    RAISE EXCEPTION 'Invalid grid state: does not represent a valid win condition';
  END IF;

  -- Step 4: Validate grid_state size to prevent payload attacks
  v_grid_size := pg_column_size(p_grid_state);
  IF v_grid_size > 100000 THEN
    RAISE EXCEPTION 'Grid state too large: exceeds 100KB';
  END IF;

  -- Step 5: Calculate time_seconds server-side
  IF v_game_record.started_at IS NOT NULL THEN
    v_time_seconds := GREATEST(1, EXTRACT(EPOCH FROM (NOW() - v_game_record.started_at))::INTEGER);
  ELSE
    v_time_seconds := 1;
  END IF;

  -- Cap time to reasonable bounds per difficulty
  CASE v_game_record.difficulty
    WHEN 'beginner' THEN
      v_time_seconds := LEAST(v_time_seconds, 3600);
    WHEN 'intermediate' THEN
      v_time_seconds := LEAST(v_time_seconds, 7200);
    WHEN 'expert' THEN
      v_time_seconds := LEAST(v_time_seconds, 14400);
  END CASE;

  -- Get hints_from_items for penalty calculation
  v_hints_from_items := COALESCE(v_game_record.hints_from_items, 0);

  -- ========================================================================
  -- BREAKDOWN CALCULATION (Strategy D)
  -- ========================================================================

  -- Step 6a: Determine base reward and reference time
  CASE v_game_record.difficulty
    WHEN 'beginner' THEN
      v_base_reward := 1.0;
      v_reference_time := 180;
    WHEN 'intermediate' THEN
      v_base_reward := 3.0;
      v_reference_time := 600;
    WHEN 'expert' THEN
      v_base_reward := 6.0;
      v_reference_time := 1200;
    ELSE
      v_base_reward := 0.0;
      v_reference_time := 180;
  END CASE;

  -- Step 6b: Calculate time multiplier
  v_time_ratio := v_time_seconds::NUMERIC / v_reference_time;
  v_time_mult := 1.3 - 0.5 * LEAST(1.0, v_time_ratio);
  v_time_mult := GREATEST(0.8, v_time_mult);
  v_time_mult := ROUND(v_time_mult, 2);

  -- Step 6c: Calculate hint penalty
  v_hints_items := COALESCE(v_hints_from_items, 0);
  v_hints_gidouilles := COALESCE(v_game_record.hints_used, 0) - v_hints_items;
  v_hints_gidouilles := GREATEST(0, v_hints_gidouilles);
  v_hints_items := GREATEST(0, v_hints_items);

  v_hint_penalty := 0.0;
  IF v_hints_gidouilles > 0 THEN
    v_hint_penalty := v_hint_penalty + v_gidouilles_penalties[LEAST(v_hints_gidouilles, 3) + 1];
  END IF;
  IF v_hints_items > 0 THEN
    v_hint_penalty := v_hint_penalty + v_item_penalties[LEAST(v_hints_items, 3) + 1];
  END IF;
  v_hint_penalty := LEAST(0.50, v_hint_penalty);
  v_hint_penalty := ROUND(v_hint_penalty, 2);

  -- Step 6d: Calculate daily multiplier
  v_today_start := date_trunc('day', NOW());
  SELECT COUNT(*) INTO v_games_won_today
  FROM public.minesweeper_games
  WHERE student_id = v_game_record.student_id
    AND status = 'won'
    AND completed_at >= v_today_start;

  v_daily_mult := 1.0 - (v_games_won_today * 0.15);
  v_daily_mult := GREATEST(0.3, v_daily_mult);
  v_daily_mult := ROUND(v_daily_mult, 2);

  -- Step 6e: Calculate gidouilles (only for students)
  IF v_user_role = 'student' THEN
    v_gidouilles := v_base_reward * v_time_mult * (1.0 - v_hint_penalty) * v_daily_mult;
    v_gidouilles := GREATEST(0.30, v_gidouilles);
    v_gidouilles := LEAST(8.00, v_gidouilles);
    v_gidouilles := ROUND(v_gidouilles, 2);
  ELSE
    v_gidouilles := 0.0;
  END IF;

  -- Build breakdown JSONB
  v_breakdown := jsonb_build_object(
    'base_reward', v_base_reward,
    'reference_time', v_reference_time,
    'time_seconds', v_time_seconds,
    'time_mult', v_time_mult,
    'hints_used', COALESCE(v_game_record.hints_used, 0),
    'hints_from_items', v_hints_from_items,
    'hint_penalty', v_hint_penalty,
    'wins_today', v_games_won_today,
    'daily_mult', v_daily_mult
  );

  -- Step 7: Calculate points (unchanged, everyone earns points)
  v_points := public.calculate_minesweeper_points(
    v_game_record.difficulty,
    v_time_seconds,
    COALESCE(v_game_record.hints_used, 0),
    v_game_record.student_id
  );

  -- Step 8: Update game record
  UPDATE public.minesweeper_games
  SET
    status = 'won',
    completed_at = NOW(),
    time_seconds = v_time_seconds,
    gidouilles_awarded = v_gidouilles,
    points_earned = v_points,
    grid_state = p_grid_state
  WHERE id = p_game_id;

  -- Step 9: Award gidouilles to student
  IF v_user_role = 'student' AND v_gidouilles > 0 THEN
    UPDATE public.profiles
    SET gidouilles = COALESCE(gidouilles, 0) + v_gidouilles
    WHERE id = v_game_record.student_id;

    -- Step 10: Record transaction in gidouilles_history
    INSERT INTO public.gidouilles_history (student_id, delta, reason)
    VALUES (
      v_game_record.student_id,
      v_gidouilles,
      'Minesweeper: ' || v_game_record.difficulty ||
        ' (' || v_time_seconds || 's)' ||
        CASE
          WHEN COALESCE(v_game_record.hints_used, 0) > 0 THEN
            ' - ' || v_game_record.hints_used || ' hint(s)' ||
            CASE
              WHEN v_hints_from_items = v_game_record.hints_used THEN ' (items)'
              WHEN v_hints_from_items > 0 THEN ' (mixed)'
              ELSE ''
            END
          ELSE ''
        END ||
        ' +' || v_points || ' pts'
    );
  END IF;

  -- Step 11: Check and unlock achievements
  v_unlocked_achievements := public.check_and_unlock_achievements(p_game_id);

  -- Step 12: Return results with breakdown
  RETURN QUERY SELECT v_gidouilles, v_unlocked_achievements, v_points, v_breakdown;
END;
$$;

COMMENT ON FUNCTION public.complete_minesweeper_game IS
  'Completes Minesweeper game with Strategy D reward calculation.
   Returns decimal gidouilles (0.3-8.0), achievements, points, and full breakdown.
   Breakdown includes: base_reward, time_mult, hint_penalty, daily_mult for UI display.';

GRANT EXECUTE ON FUNCTION public.complete_minesweeper_game TO authenticated;
