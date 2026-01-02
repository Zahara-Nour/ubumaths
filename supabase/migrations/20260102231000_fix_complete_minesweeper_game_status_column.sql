-- ============================================================================
-- Hotfix: Remove invalid cm.status column reference in complete_minesweeper_game
-- The class_members table does not have a status column
-- This caused: "column cm.status does not exist" error when users won games
-- Date: 2026-01-02
-- ============================================================================

-- Drop the existing function first
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

  -- Student grade and cycle
  v_student_grade TEXT;
  v_cycle TEXT;

  -- School info for daily limit
  v_school_id UUID;

  -- Breakdown variables
  v_base_reward NUMERIC(10,2);
  v_reference_time INTEGER;
  v_time_ratio NUMERIC;
  v_time_mult NUMERIC;
  v_hints_gidouilles INTEGER;
  v_hints_items INTEGER;
  v_hint_penalty NUMERIC;
  v_breakdown JSONB;

  -- Daily limit variables
  v_theoretical_reward NUMERIC(10,2);
  v_actual_reward NUMERIC(10,2);
  v_is_first_win BOOLEAN;
  v_week_best_reward NUMERIC(10,2);
  v_daily_result RECORD;

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

  -- Step 2: Get user role and grade
  SELECT role, grade INTO v_user_role, v_student_grade
  FROM public.profiles
  WHERE id = v_game_record.student_id;

  -- Get cycle for this grade (may be NULL)
  v_cycle := public.get_cycle_for_grade(v_student_grade);

  -- Get school_id for daily limit calculation
  -- NOTE: class_members table does NOT have a status column
  SELECT DISTINCT c.school_id INTO v_school_id
  FROM public.class_members cm
  JOIN public.classes c ON c.id = cm.class_id
  WHERE cm.student_id = v_game_record.student_id
  LIMIT 1;

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
  -- BREAKDOWN CALCULATION (Strategy D with Dynamic Reference Times)
  -- ========================================================================

  -- Step 6a: Determine base reward
  CASE v_game_record.difficulty
    WHEN 'beginner' THEN
      v_base_reward := 1.0;
    WHEN 'intermediate' THEN
      v_base_reward := 3.0;
    WHEN 'expert' THEN
      v_base_reward := 6.0;
    ELSE
      v_base_reward := 0.0;
  END CASE;

  -- Step 6b: Get dynamic reference time (or fallback if no cycle)
  IF v_cycle IS NOT NULL THEN
    BEGIN
      v_reference_time := public.get_minesweeper_reference_time(v_cycle, v_game_record.difficulty);
    EXCEPTION
      WHEN raise_exception THEN
        -- Fallback to hardcoded values
        v_reference_time := CASE v_game_record.difficulty
          WHEN 'beginner' THEN 180
          WHEN 'intermediate' THEN 600
          WHEN 'expert' THEN 1200
        END;
    END;
  ELSE
    -- No cycle = use hardcoded fallback (but will get 0 gidouilles anyway)
    v_reference_time := CASE v_game_record.difficulty
      WHEN 'beginner' THEN 180
      WHEN 'intermediate' THEN 600
      WHEN 'expert' THEN 1200
    END;
  END IF;

  -- Step 6c: Calculate time multiplier
  v_time_ratio := v_time_seconds::NUMERIC / v_reference_time;
  v_time_mult := 1.3 - 0.5 * LEAST(1.0, v_time_ratio);
  v_time_mult := GREATEST(0.8, v_time_mult);
  v_time_mult := ROUND(v_time_mult, 2);

  -- Step 6d: Calculate hint penalty
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

  -- ========================================================================
  -- Calculate theoretical reward (WITHOUT daily_mult)
  -- ========================================================================
  IF v_user_role = 'student' AND v_cycle IS NOT NULL THEN
    v_theoretical_reward := v_base_reward * v_time_mult * (1.0 - v_hint_penalty);
    v_theoretical_reward := GREATEST(0.30, v_theoretical_reward);
    v_theoretical_reward := LEAST(8.00, v_theoretical_reward);
    v_theoretical_reward := ROUND(v_theoretical_reward, 2);
  ELSE
    v_theoretical_reward := 0.0;
  END IF;

  -- ========================================================================
  -- Call record_game_reward to get actual reward (0 or 1)
  -- ========================================================================
  IF v_user_role = 'student' AND v_theoretical_reward > 0 AND v_school_id IS NOT NULL THEN
    SELECT * INTO v_daily_result
    FROM public.record_game_reward(
      v_game_record.student_id,
      'minesweeper',
      p_game_id,
      v_theoretical_reward,
      v_school_id
    );

    v_actual_reward := COALESCE(v_daily_result.actual_reward, 0);
    v_is_first_win := COALESCE(v_daily_result.is_first_win, FALSE);
    v_week_best_reward := COALESCE(v_daily_result.week_best_reward, v_theoretical_reward);
    v_gidouilles := v_actual_reward;
  ELSE
    -- No school or not eligible: no reward
    v_actual_reward := 0;
    v_is_first_win := FALSE;
    v_week_best_reward := 0;
    v_gidouilles := 0;
  END IF;

  -- Build breakdown JSONB (updated with new fields)
  v_breakdown := jsonb_build_object(
    'cycle', v_cycle,
    'base_reward', v_base_reward,
    'reference_time', v_reference_time,
    'time_seconds', v_time_seconds,
    'time_mult', v_time_mult,
    'hints_used', COALESCE(v_game_record.hints_used, 0),
    'hints_from_items', v_hints_from_items,
    'hint_penalty', v_hint_penalty,
    -- Daily limit fields
    'theoretical_reward', v_theoretical_reward,
    'actual_reward', v_actual_reward,
    'is_first_win_of_day', v_is_first_win,
    'week_best_reward', v_week_best_reward
  );

  -- Step 7: Calculate points (unchanged, everyone earns points)
  v_points := public.calculate_minesweeper_points(
    v_game_record.difficulty,
    v_time_seconds,
    COALESCE(v_game_record.hints_used, 0),
    v_game_record.student_id
  );

  -- Step 8: Update game record (now stores actual_reward, not theoretical)
  UPDATE public.minesweeper_games
  SET
    status = 'won',
    completed_at = NOW(),
    time_seconds = v_time_seconds,
    gidouilles_awarded = v_actual_reward,
    points_earned = v_points,
    grid_state = p_grid_state
  WHERE id = p_game_id;

  -- NOTE: Gidouilles are awarded by record_game_reward(), not here anymore
  -- The history entry is also created by record_game_reward()

  -- Step 9: Check and unlock achievements
  v_unlocked_achievements := public.check_and_unlock_achievements(p_game_id);

  -- Step 10: Return results with updated breakdown
  RETURN QUERY SELECT v_gidouilles, v_unlocked_achievements, v_points, v_breakdown;
END;
$$;

COMMENT ON FUNCTION public.complete_minesweeper_game IS
  'Completes Minesweeper game with daily limit system.
   Fixed: Removed invalid cm.status column reference.';

GRANT EXECUTE ON FUNCTION public.complete_minesweeper_game TO authenticated;
