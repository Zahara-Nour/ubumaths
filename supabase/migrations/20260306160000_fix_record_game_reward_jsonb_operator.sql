-- ============================================================================
-- Migration: Fix JSONB operator in record_game_reward()
-- Created: 2026-03-06
-- ============================================================================
-- BUG: Line `timetable->>'week_config'->>'first_day'` fails because
--      ->> returns TEXT, and TEXT ->> unknown is not a valid operator.
-- FIX: Use -> (returns JSONB) for intermediate extraction, then ->> for final text.
--      `timetable->'week_config'->>'first_day'`
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_game_reward(
  p_student_id UUID,
  p_game_type TEXT,
  p_game_id UUID,
  p_theoretical_reward NUMERIC,
  p_school_id UUID
)
RETURNS TABLE(
  actual_reward NUMERIC,
  is_first_win BOOLEAN,
  week_best_reward NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timezone TEXT;
  v_first_day INTEGER;
  v_game_date DATE;
  v_week_start DATE;
  v_week_end DATE;
  v_is_first_win BOOLEAN;
  v_actual_reward NUMERIC(10,2);
  v_best_reward NUMERIC(10,2);
  v_student_role TEXT;
BEGIN
  -- Security check: Verify caller is the student
  IF auth.uid() != p_student_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only record rewards for yourself';
  END IF;

  -- Verify caller is a student
  SELECT role INTO v_student_role FROM profiles WHERE id = p_student_id;
  IF v_student_role != 'student' THEN
    RAISE EXCEPTION 'Unauthorized: Only students can earn game rewards';
  END IF;

  -- Validate game_type
  IF p_game_type NOT IN ('minesweeper', 'riddle') THEN
    RAISE EXCEPTION 'Invalid game_type: must be minesweeper or riddle, got %', p_game_type;
  END IF;

  -- Validate theoretical_reward
  IF p_theoretical_reward < 0 OR p_theoretical_reward > 1000 THEN
    RAISE EXCEPTION 'Invalid theoretical_reward: must be between 0 and 1000, got %', p_theoretical_reward;
  END IF;

  -- Get school configuration
  -- FIX: Use -> (returns JSONB) for intermediate key, then ->> (returns TEXT) for leaf
  SELECT timezone, COALESCE((timetable->'week_config'->>'first_day')::INTEGER, 1)
  INTO v_timezone, v_first_day
  FROM schools
  WHERE id = p_school_id;

  IF v_timezone IS NULL THEN
    RAISE EXCEPTION 'School % not found', p_school_id;
  END IF;

  -- Calculate game date in school timezone
  v_game_date := (NOW() AT TIME ZONE v_timezone)::DATE;

  -- Calculate week boundaries
  SELECT w.week_start, w.week_end
  INTO v_week_start, v_week_end
  FROM calculate_week_boundaries(v_game_date, COALESCE(v_first_day, 1)) w;

  -- ATOMIC CHECK: Is this the first win of the day?
  -- Lock all rewards for this student on this date to prevent race conditions
  SELECT NOT EXISTS (
    SELECT 1
    FROM daily_game_rewards
    WHERE student_id = p_student_id
      AND game_date = v_game_date
      AND is_first_win_of_day = TRUE
    FOR UPDATE
  ) INTO v_is_first_win;

  -- Calculate actual reward
  v_actual_reward := CASE WHEN v_is_first_win THEN 1 ELSE 0 END;

  -- Insert reward record
  INSERT INTO daily_game_rewards (
    student_id,
    game_date,
    game_type,
    game_id,
    theoretical_reward,
    actual_reward,
    is_first_win_of_day,
    week_start
  ) VALUES (
    p_student_id,
    v_game_date,
    p_game_type,
    p_game_id,
    p_theoretical_reward,
    v_actual_reward,
    v_is_first_win,
    v_week_start
  );

  -- Update weekly best rewards (UPSERT)
  INSERT INTO weekly_best_rewards (
    student_id,
    week_start,
    week_end,
    best_theoretical_reward,
    best_reward_game_type,
    best_reward_game_id
  ) VALUES (
    p_student_id,
    v_week_start,
    v_week_end,
    p_theoretical_reward,
    p_game_type,
    p_game_id
  )
  ON CONFLICT (student_id, week_start)
  DO UPDATE SET
    best_theoretical_reward = GREATEST(
      weekly_best_rewards.best_theoretical_reward,
      EXCLUDED.best_theoretical_reward
    ),
    best_reward_game_type = CASE
      WHEN EXCLUDED.best_theoretical_reward > weekly_best_rewards.best_theoretical_reward
      THEN EXCLUDED.best_reward_game_type
      ELSE weekly_best_rewards.best_reward_game_type
    END,
    best_reward_game_id = CASE
      WHEN EXCLUDED.best_theoretical_reward > weekly_best_rewards.best_theoretical_reward
      THEN EXCLUDED.best_reward_game_id
      ELSE weekly_best_rewards.best_reward_game_id
    END,
    updated_at = NOW()
  RETURNING best_theoretical_reward INTO v_best_reward;

  -- Award gidouilles if first win
  IF v_is_first_win THEN
    -- Update profile
    UPDATE profiles
    SET gidouilles = gidouilles + v_actual_reward
    WHERE id = p_student_id;

    -- Log in history
    INSERT INTO gidouilles_activity (
      student_id,
      class_id,
      delta,
      reason,
      created_by
    ) VALUES (
      p_student_id,
      NULL, -- No specific class for game rewards
      v_actual_reward::INTEGER,
      'daily_game_reward:' || p_game_type,
      NULL -- System-generated
    );
  END IF;

  -- Return results
  RETURN QUERY SELECT v_actual_reward, v_is_first_win, v_best_reward;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_game_reward TO authenticated;

COMMENT ON FUNCTION public.record_game_reward IS
'Records a game victory and awards gidouilles. Enforces 1 gidouille/day limit. Atomically checks for first win.';
