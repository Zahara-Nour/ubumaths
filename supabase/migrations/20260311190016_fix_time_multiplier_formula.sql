-- ============================================================================
-- Migration: Fix time multiplier formula
-- Created: 2026-03-11
-- ============================================================================
-- Bug: Old formula (1.3 - 0.5 * ratio) gave mult < 1.0 even when finishing
-- under the reference time. e.g. 16m51s / 20m00s = 0.84 ratio → mult 0.88
--
-- New formula: max(0.7, 1.3 - 0.3 * ratio)
--   ratio = 0.0 (instant)         → mult = 1.30
--   ratio = 0.5 (half ref time)   → mult = 1.15
--   ratio = 1.0 (at ref time)     → mult = 1.00
--   ratio = 1.5 (50% over)        → mult = 0.85
--   ratio = 2.0 (double ref time) → mult = 0.70 (floor)
--
-- Updated in 3 functions:
--   1. complete_minesweeper_game()
--   2. calculate_minesweeper_gidouilles()
--   3. calculate_daily_challenge_gidouilles()
-- ============================================================================

-- ============================================================================
-- PART 1: complete_minesweeper_game()
-- ============================================================================

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
  v_reduced_penalty_hints INTEGER;

  v_student_grade TEXT;
  v_cycle TEXT;
  v_school_id UUID;

  v_base_reward NUMERIC(10,2);
  v_reference_time INTEGER;
  v_time_ratio NUMERIC;
  v_time_mult NUMERIC;
  v_hints_gidouilles INTEGER;
  v_hints_reduced INTEGER;
  v_hint_penalty NUMERIC;
  v_breakdown JSONB;

  v_theoretical_reward NUMERIC(10,2);
  v_actual_reward NUMERIC(10,2);
  v_is_first_win BOOLEAN;
  v_week_best_reward NUMERIC(10,2);
  v_daily_result RECORD;

  v_gidouilles_penalties NUMERIC[] := ARRAY[0.0, 0.10, 0.22, 0.35];
  v_reduced_penalties NUMERIC[] := ARRAY[0.0, 0.05, 0.11, 0.17];
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

  v_cycle := public.get_cycle_for_grade(v_student_grade);

  -- Get school_id for daily limit calculation (from ACTIVE membership)
  SELECT DISTINCT c.school_id INTO v_school_id
  FROM public.class_members cm
  JOIN public.classes c ON c.id = cm.class_id
  WHERE cm.student_id = v_game_record.student_id
    AND cm.status = 'active'
  LIMIT 1;

  -- Step 3: Validate grid_state represents a legitimate win
  v_is_valid := public.validate_minesweeper_win(p_grid_state, v_game_record.difficulty);

  IF NOT v_is_valid THEN
    RAISE EXCEPTION 'Invalid grid state: does not represent a valid win condition';
  END IF;

  -- Step 4: Validate grid_state size
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

  CASE v_game_record.difficulty
    WHEN 'beginner' THEN v_time_seconds := LEAST(v_time_seconds, 3600);
    WHEN 'intermediate' THEN v_time_seconds := LEAST(v_time_seconds, 7200);
    WHEN 'expert' THEN v_time_seconds := LEAST(v_time_seconds, 14400);
  END CASE;

  v_reduced_penalty_hints := COALESCE(v_game_record.reduced_penalty_hints, 0);

  -- Step 6a: Determine base reward
  CASE v_game_record.difficulty
    WHEN 'beginner' THEN v_base_reward := 1.0;
    WHEN 'intermediate' THEN v_base_reward := 3.0;
    WHEN 'expert' THEN v_base_reward := 6.0;
    ELSE v_base_reward := 0.0;
  END CASE;

  -- Step 6b: Get dynamic reference time
  IF v_cycle IS NOT NULL THEN
    BEGIN
      v_reference_time := public.get_minesweeper_reference_time(v_cycle, v_game_record.difficulty);
    EXCEPTION
      WHEN raise_exception THEN
        v_reference_time := CASE v_game_record.difficulty
          WHEN 'beginner' THEN 180
          WHEN 'intermediate' THEN 600
          WHEN 'expert' THEN 1200
        END;
    END;
  ELSE
    v_reference_time := CASE v_game_record.difficulty
      WHEN 'beginner' THEN 180
      WHEN 'intermediate' THEN 600
      WHEN 'expert' THEN 1200
    END;
  END IF;

  -- Step 6c: Calculate time multiplier
  -- Formula: 1.3 (instant) → 1.0 (at ref time) → 0.7 (double ref time, floor)
  v_time_ratio := v_time_seconds::NUMERIC / v_reference_time;
  v_time_mult := GREATEST(0.7, 1.3 - 0.3 * v_time_ratio);
  v_time_mult := ROUND(v_time_mult, 2);

  -- Step 6d: Calculate hint penalty
  v_hints_reduced := COALESCE(v_reduced_penalty_hints, 0);
  v_hints_gidouilles := COALESCE(v_game_record.hints_used, 0) - v_hints_reduced;
  v_hints_gidouilles := GREATEST(0, v_hints_gidouilles);
  v_hints_reduced := GREATEST(0, v_hints_reduced);

  v_hint_penalty := 0.0;
  IF v_hints_gidouilles > 0 THEN
    v_hint_penalty := v_hint_penalty + v_gidouilles_penalties[LEAST(v_hints_gidouilles, 3) + 1];
  END IF;
  IF v_hints_reduced > 0 THEN
    v_hint_penalty := v_hint_penalty + v_reduced_penalties[LEAST(v_hints_reduced, 3) + 1];
  END IF;
  v_hint_penalty := LEAST(0.50, v_hint_penalty);
  v_hint_penalty := ROUND(v_hint_penalty, 2);

  -- Calculate theoretical reward
  IF v_user_role = 'student' AND v_cycle IS NOT NULL THEN
    v_theoretical_reward := v_base_reward * v_time_mult * (1.0 - v_hint_penalty);
    v_theoretical_reward := GREATEST(0.30, v_theoretical_reward);
    v_theoretical_reward := LEAST(8.00, v_theoretical_reward);
    v_theoretical_reward := ROUND(v_theoretical_reward, 2);
  ELSE
    v_theoretical_reward := 0.0;
  END IF;

  -- Call record_game_reward to get actual reward
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
    v_actual_reward := 0;
    v_is_first_win := FALSE;
    v_week_best_reward := 0;
    v_gidouilles := 0;
  END IF;

  v_breakdown := jsonb_build_object(
    'cycle', v_cycle,
    'base_reward', v_base_reward,
    'reference_time', v_reference_time,
    'time_seconds', v_time_seconds,
    'time_mult', v_time_mult,
    'hints_used', COALESCE(v_game_record.hints_used, 0),
    'reduced_penalty_hints', v_reduced_penalty_hints,
    'hint_penalty', v_hint_penalty,
    'theoretical_reward', v_theoretical_reward,
    'actual_reward', v_actual_reward,
    'is_first_win_of_day', v_is_first_win,
    'week_best_reward', v_week_best_reward
  );

  -- Step 7: Calculate points
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
    gidouilles_awarded = v_actual_reward,
    points_earned = v_points,
    grid_state = p_grid_state
  WHERE id = p_game_id;

  -- Step 9: Check and unlock achievements
  v_unlocked_achievements := public.check_and_unlock_achievements(p_game_id);

  RETURN QUERY SELECT v_gidouilles, v_unlocked_achievements, v_points, v_breakdown;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_minesweeper_game TO authenticated;

COMMENT ON FUNCTION public.complete_minesweeper_game(UUID, JSONB) IS
  'Completes Minesweeper game. Time mult: 1.3→1.0→0.7 (floor at 2x ref time). Returns breakdown with reduced_penalty_hints.';

-- ============================================================================
-- PART 2: calculate_minesweeper_gidouilles()
-- ============================================================================

DROP FUNCTION IF EXISTS public.calculate_minesweeper_gidouilles(TEXT, INTEGER, UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.calculate_minesweeper_gidouilles(
  p_difficulty TEXT,
  p_time_seconds INTEGER,
  p_student_id UUID,
  p_hints_used INTEGER DEFAULT 0,
  p_reduced_penalty_hints INTEGER DEFAULT 0
)
RETURNS NUMERIC(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Student info
  v_student_grade TEXT;
  v_cycle TEXT;

  -- Base rewards (Strategy D: scaled by /10)
  v_base_reward NUMERIC(10,2);
  v_reference_time INTEGER;

  -- Time multiplier calculation
  v_time_ratio NUMERIC;
  v_time_mult NUMERIC;

  -- Hint penalty calculation
  v_hints_gidouilles INTEGER;  -- Hints paid with gidouilles
  v_hints_reduced INTEGER;     -- Hints with reduced penalty
  v_hint_penalty NUMERIC;

  -- Penalty rates (progressive)
  -- Gidouilles hints: 10%, 22%, 35% for 1, 2, 3 hints
  -- Reduced penalty hints: 5%, 11%, 17% for 1, 2, 3 hints
  v_gidouilles_penalties NUMERIC[] := ARRAY[0.10, 0.22, 0.35];
  v_reduced_penalties NUMERIC[] := ARRAY[0.05, 0.11, 0.17];

  -- Daily degressive
  v_games_won_today INTEGER;
  v_daily_mult NUMERIC;
  v_today_start TIMESTAMPTZ;

  -- Final calculation
  v_result NUMERIC(10,2);
BEGIN
  -- ========================================================================
  -- STEP 0: Get student's grade and cycle
  -- ========================================================================
  SELECT grade INTO v_student_grade
  FROM public.profiles
  WHERE id = p_student_id;

  -- Get cycle for this grade
  v_cycle := public.get_cycle_for_grade(v_student_grade);

  -- If no valid cycle (no grade or invalid grade), no gidouilles awarded
  -- This incentivizes students to set their grade level
  IF v_cycle IS NULL THEN
    RETURN 0.00;
  END IF;

  -- ========================================================================
  -- STEP 1: Determine base reward and get dynamic reference time
  -- ========================================================================
  CASE p_difficulty
    WHEN 'beginner' THEN
      v_base_reward := 1.0;
    WHEN 'intermediate' THEN
      v_base_reward := 3.0;
    WHEN 'expert' THEN
      v_base_reward := 6.0;
    ELSE
      RETURN 0.0;  -- Unknown difficulty
  END CASE;

  -- Get dynamic reference time for this cycle/difficulty
  -- This uses the median-based times recalculated weekly
  BEGIN
    v_reference_time := public.get_minesweeper_reference_time(v_cycle, p_difficulty);
  EXCEPTION
    WHEN raise_exception THEN
      -- Fallback to hardcoded values if something goes wrong
      v_reference_time := CASE p_difficulty
        WHEN 'beginner' THEN 180
        WHEN 'intermediate' THEN 600
        WHEN 'expert' THEN 1200
      END;
  END;

  -- ========================================================================
  -- STEP 2: Calculate time multiplier (continuous formula)
  -- ========================================================================
  -- Formula: 1.3 (instant) → 1.0 (at ref time) → 0.7 (double ref time, floor)
  v_time_ratio := p_time_seconds::NUMERIC / v_reference_time;
  v_time_mult := GREATEST(0.7, 1.3 - 0.3 * v_time_ratio);

  -- ========================================================================
  -- STEP 3: Calculate hint penalty (progressive, source-aware)
  -- ========================================================================
  -- Split hints by source
  v_hints_reduced := COALESCE(p_reduced_penalty_hints, 0);
  v_hints_gidouilles := COALESCE(p_hints_used, 0) - v_hints_reduced;

  -- Ensure non-negative
  v_hints_gidouilles := GREATEST(0, v_hints_gidouilles);
  v_hints_reduced := GREATEST(0, v_hints_reduced);

  -- Calculate penalty from each source
  v_hint_penalty := 0.0;

  -- Add penalty for gidouilles-based hints
  IF v_hints_gidouilles > 0 THEN
    v_hint_penalty := v_hint_penalty + v_gidouilles_penalties[LEAST(v_hints_gidouilles, 3)];
  END IF;

  -- Add penalty for reduced-penalty hints
  IF v_hints_reduced > 0 THEN
    v_hint_penalty := v_hint_penalty + v_reduced_penalties[LEAST(v_hints_reduced, 3)];
  END IF;

  -- Cap total penalty at 50% (0.50)
  v_hint_penalty := LEAST(0.50, v_hint_penalty);

  -- ========================================================================
  -- STEP 4: Daily degressive multiplier
  -- ========================================================================
  v_today_start := date_trunc('day', NOW() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris';

  SELECT COUNT(*) INTO v_games_won_today
  FROM public.minesweeper_games
  WHERE student_id = p_student_id
    AND status = 'won'
    AND completed_at >= v_today_start;

  -- Daily mult: 100% first win, -15% each subsequent, min 30%
  v_daily_mult := GREATEST(0.30, 1.0 - (v_games_won_today * 0.15));

  -- ========================================================================
  -- STEP 5: Final calculation
  -- ========================================================================
  v_result := v_base_reward * v_time_mult * (1.0 - v_hint_penalty) * v_daily_mult;

  -- Apply absolute bounds
  v_result := GREATEST(0.30, v_result);
  v_result := LEAST(8.00, v_result);
  v_result := ROUND(v_result, 2);

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.calculate_minesweeper_gidouilles(TEXT, INTEGER, UUID, INTEGER, INTEGER) IS
  'Calculates gidouilles with Strategy D. Time mult: 1.3→1.0→0.7 (floor at 2x ref time). Dynamic reference times.';

GRANT EXECUTE ON FUNCTION public.calculate_minesweeper_gidouilles(TEXT, INTEGER, UUID, INTEGER, INTEGER) TO authenticated;

-- ============================================================================
-- PART 3: calculate_daily_challenge_gidouilles()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_daily_challenge_gidouilles(
  p_difficulty TEXT,
  p_time_seconds INTEGER,
  p_student_id UUID
)
RETURNS NUMERIC(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Student info
  v_student_grade TEXT;
  v_cycle TEXT;

  -- Base rewards (Strategy D)
  v_base_reward NUMERIC(10,2);
  v_reference_time INTEGER;

  -- Time multiplier
  v_time_ratio NUMERIC;
  v_time_mult NUMERIC;

  -- Result
  v_result NUMERIC(10,2);
BEGIN
  -- ========================================================================
  -- STEP 1: Get student's grade and cycle
  -- ========================================================================
  SELECT grade INTO v_student_grade
  FROM public.profiles
  WHERE id = p_student_id;

  v_cycle := public.get_cycle_for_grade(v_student_grade);

  -- If no valid cycle, no gidouilles
  IF v_cycle IS NULL THEN
    RETURN 0.00;
  END IF;

  -- ========================================================================
  -- STEP 2: Determine base reward and get dynamic reference time
  -- ========================================================================
  CASE p_difficulty
    WHEN 'beginner' THEN
      v_base_reward := 1.0;
    WHEN 'intermediate' THEN
      v_base_reward := 3.0;
    WHEN 'expert' THEN
      v_base_reward := 6.0;
    ELSE
      RETURN 0.0;
  END CASE;

  -- Get dynamic reference time
  BEGIN
    v_reference_time := public.get_minesweeper_reference_time(v_cycle, p_difficulty);
  EXCEPTION
    WHEN raise_exception THEN
      v_reference_time := CASE p_difficulty
        WHEN 'beginner' THEN 180
        WHEN 'intermediate' THEN 600
        WHEN 'expert' THEN 1200
      END;
  END;

  -- ========================================================================
  -- STEP 3: Calculate time multiplier
  -- ========================================================================
  -- Formula: 1.3 (instant) → 1.0 (at ref time) → 0.7 (double ref time, floor)
  v_time_ratio := p_time_seconds::NUMERIC / v_reference_time;
  v_time_mult := GREATEST(0.7, 1.3 - 0.3 * v_time_ratio);

  -- ========================================================================
  -- STEP 4: Calculate final reward
  -- ========================================================================
  -- Daily challenge: No hint penalty, no daily degressive
  -- Just base * time_mult
  v_result := v_base_reward * v_time_mult;

  -- Apply bounds
  v_result := GREATEST(0.30, v_result);
  v_result := LEAST(8.00, v_result);
  v_result := ROUND(v_result, 2);

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.calculate_daily_challenge_gidouilles(TEXT, INTEGER, UUID) IS
  'Calculates daily challenge gidouilles with Strategy D. Time mult: 1.3→1.0→0.7 (floor at 2x ref time). Dynamic reference times.';

GRANT EXECUTE ON FUNCTION public.calculate_daily_challenge_gidouilles(TEXT, INTEGER, UUID) TO authenticated;
