-- ============================================================================
-- Migration: Update Daily Challenge Functions for Dynamic Reference Times
-- Purpose: Use cycle-based reference times instead of hardcoded values
-- Date: 2026-01-01
-- ============================================================================
--
-- KEY CHANGES:
-- 1. calculate_daily_challenge_gidouilles() now uses Strategy D formula
-- 2. Uses dynamic reference times from minesweeper_reference_times
-- 3. Returns NUMERIC(10,2) instead of INTEGER
-- 4. Returns 0 if student has no grade (no cycle)
-- 5. Top 3 bonuses scaled: 1st: +5.0, 2nd: +3.0, 3rd: +2.0 (was 50/30/20)
--
-- ============================================================================

-- ============================================================================
-- PART 1: Update calculate_daily_challenge_gidouilles()
-- ============================================================================

DROP FUNCTION IF EXISTS public.calculate_daily_challenge_gidouilles(TEXT, INTEGER);

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
  -- STEP 3: Calculate time multiplier (same as regular game)
  -- ========================================================================
  -- Formula: time_mult = 1.3 - 0.5 * min(1, time/reference)
  v_time_ratio := p_time_seconds::NUMERIC / v_reference_time;
  v_time_mult := 1.3 - 0.5 * LEAST(1.0, v_time_ratio);
  v_time_mult := GREATEST(0.8, v_time_mult);

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
  'Calculates daily challenge gidouilles with Strategy D and dynamic reference times.
   No hint penalty (hints not allowed in daily challenges).
   No daily degressive (one attempt per day anyway).
   Students without grade get 0 gidouilles.';

GRANT EXECUTE ON FUNCTION public.calculate_daily_challenge_gidouilles(TEXT, INTEGER, UUID) TO authenticated;

-- ============================================================================
-- PART 2: Update record_daily_challenge_attempt()
-- ============================================================================

DROP FUNCTION IF EXISTS public.record_daily_challenge_attempt(UUID, INTEGER, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.record_daily_challenge_attempt(
  p_challenge_id UUID,
  p_time_seconds INTEGER,
  p_status TEXT,
  p_grid_state JSONB
)
RETURNS TABLE(success BOOLEAN, gidouilles_earned NUMERIC(10,2), attempt_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_challenge RECORD;
  v_is_valid BOOLEAN;
  v_gidouilles NUMERIC(10,2);
  v_attempt_id UUID;
  v_grid_size INTEGER;
  v_student_grade TEXT;
  v_cycle TEXT;
BEGIN
  -- Step 1: Get authenticated user
  v_student_id := auth.uid();

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to attempt daily challenge';
  END IF;

  -- Verify user is a student and get grade
  SELECT grade INTO v_student_grade
  FROM public.profiles
  WHERE id = v_student_id AND role = 'student';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only students can attempt daily challenges';
  END IF;

  -- Get cycle for grade info
  v_cycle := public.get_cycle_for_grade(v_student_grade);

  -- Step 2: Get challenge and validate it exists
  SELECT * INTO v_challenge
  FROM public.minesweeper_daily_challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  -- Step 3: Check if student already attempted this challenge
  IF EXISTS (
    SELECT 1 FROM public.minesweeper_daily_attempts
    WHERE challenge_id = p_challenge_id
      AND student_id = v_student_id
  ) THEN
    RAISE EXCEPTION 'Already attempted this daily challenge (one attempt per day)';
  END IF;

  -- Step 4: Validate status
  IF p_status NOT IN ('won', 'lost') THEN
    RAISE EXCEPTION 'Invalid status: must be won or lost';
  END IF;

  -- Step 5: Validate time_seconds
  IF p_time_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid time: must be at least 1 second';
  END IF;

  -- Difficulty-specific time limits
  CASE v_challenge.difficulty
    WHEN 'beginner' THEN
      IF p_time_seconds > 3600 THEN
        RAISE EXCEPTION 'Invalid time for beginner: exceeds 1 hour';
      END IF;
    WHEN 'intermediate' THEN
      IF p_time_seconds > 7200 THEN
        RAISE EXCEPTION 'Invalid time for intermediate: exceeds 2 hours';
      END IF;
    WHEN 'expert' THEN
      IF p_time_seconds > 14400 THEN
        RAISE EXCEPTION 'Invalid time for expert: exceeds 4 hours';
      END IF;
  END CASE;

  -- Step 6: Validate grid_state size
  v_grid_size := pg_column_size(p_grid_state);
  IF v_grid_size > 100000 THEN
    RAISE EXCEPTION 'Grid state too large: exceeds 100KB';
  END IF;

  -- Step 7: For wins, validate grid_state represents legitimate win
  IF p_status = 'won' THEN
    v_is_valid := public.validate_minesweeper_win(p_grid_state, v_challenge.difficulty);

    IF NOT v_is_valid THEN
      RAISE EXCEPTION 'Invalid grid state: does not represent a valid win condition';
    END IF;

    -- Calculate gidouilles (0 if no grade/cycle)
    v_gidouilles := public.calculate_daily_challenge_gidouilles(
      v_challenge.difficulty,
      p_time_seconds,
      v_student_id
    );
  ELSE
    -- No gidouilles for losses
    v_gidouilles := 0.00;
  END IF;

  -- Step 8: Insert attempt record
  INSERT INTO public.minesweeper_daily_attempts (
    challenge_id,
    student_id,
    grid_state,
    time_seconds,
    status,
    gidouilles_earned
  ) VALUES (
    p_challenge_id,
    v_student_id,
    p_grid_state,
    p_time_seconds,
    p_status,
    v_gidouilles
  )
  RETURNING id INTO v_attempt_id;

  -- Step 9: Award base gidouilles to profile
  IF v_gidouilles > 0 THEN
    UPDATE public.profiles
    SET gidouilles = COALESCE(gidouilles, 0) + v_gidouilles
    WHERE id = v_student_id;

    -- Step 10: Insert into gidouilles_history
    INSERT INTO public.gidouilles_history (
      student_id,
      class_id,
      delta,
      reason,
      created_by
    )
    SELECT
      v_student_id,
      cm.class_id,
      v_gidouilles,
      'Daily Challenge: ' || v_challenge.difficulty ||
        CASE WHEN v_cycle IS NOT NULL THEN ' [' || v_cycle || ']' ELSE '' END ||
        ' (' || TO_CHAR(v_challenge.challenge_date, 'YYYY-MM-DD') || ')',
      v_student_id
    FROM public.class_members cm
    WHERE cm.student_id = v_student_id
      AND cm.status = 'active'
    ORDER BY cm.joined_at ASC
    LIMIT 1;
  END IF;

  -- Step 11: Return result
  RETURN QUERY SELECT TRUE, v_gidouilles, v_attempt_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_daily_challenge_attempt TO authenticated;

COMMENT ON FUNCTION public.record_daily_challenge_attempt IS
  'Records daily challenge attempt with Strategy D rewards and dynamic reference times.
   Students without grade earn 0 gidouilles.';

-- ============================================================================
-- PART 3: Update update_daily_challenge_rankings() - Scale bonuses
-- ============================================================================

DROP FUNCTION IF EXISTS public.update_daily_challenge_rankings(UUID);

CREATE OR REPLACE FUNCTION public.update_daily_challenge_rankings(
  p_challenge_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_top_3 RECORD;
  v_old_rank INTEGER;
  v_old_gidouilles NUMERIC(10,2);
  v_new_gidouilles NUMERIC(10,2);
  v_bonus_delta NUMERIC(10,2);
  v_challenge RECORD;
BEGIN
  -- Get challenge info for history
  SELECT * INTO v_challenge
  FROM public.minesweeper_daily_challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  -- Step 1: Clear all existing ranks for this challenge
  UPDATE public.minesweeper_daily_attempts
  SET rank = NULL
  WHERE challenge_id = p_challenge_id;

  -- Step 2: Update top 3 with new ranks and bonuses
  -- NEW: Scaled bonuses: 1st: +5.0, 2nd: +3.0, 3rd: +2.0 (was 50/30/20)
  FOR v_top_3 IN (
    SELECT
      id,
      student_id,
      gidouilles_earned,
      ROW_NUMBER() OVER (ORDER BY time_seconds ASC) as new_rank
    FROM public.minesweeper_daily_attempts
    WHERE challenge_id = p_challenge_id
      AND status = 'won'
    ORDER BY time_seconds ASC
    LIMIT 3
  )
  LOOP
    -- Calculate bonus based on rank (scaled by /10)
    CASE v_top_3.new_rank
      WHEN 1 THEN v_bonus_delta := 5.0;  -- 1st place: +5.0 (was +50)
      WHEN 2 THEN v_bonus_delta := 3.0;  -- 2nd place: +3.0 (was +30)
      WHEN 3 THEN v_bonus_delta := 2.0;  -- 3rd place: +2.0 (was +20)
      ELSE v_bonus_delta := 0.0;
    END CASE;

    -- Calculate new total gidouilles (base already stored + bonus)
    v_new_gidouilles := v_top_3.gidouilles_earned + v_bonus_delta;

    -- Update attempt record with rank and new gidouilles total
    UPDATE public.minesweeper_daily_attempts
    SET
      rank = v_top_3.new_rank,
      gidouilles_earned = v_new_gidouilles
    WHERE id = v_top_3.id;

    -- Award bonus to profile
    IF v_bonus_delta > 0 THEN
      UPDATE public.profiles
      SET gidouilles = COALESCE(gidouilles, 0) + v_bonus_delta
      WHERE id = v_top_3.student_id;

      -- Insert bonus into gidouilles_history
      INSERT INTO public.gidouilles_history (
        student_id,
        class_id,
        delta,
        reason,
        created_by
      )
      SELECT
        v_top_3.student_id,
        cm.class_id,
        v_bonus_delta,
        'Daily Challenge Bonus: Rank #' || v_top_3.new_rank || ' (' || TO_CHAR(v_challenge.challenge_date, 'YYYY-MM-DD') || ')',
        v_top_3.student_id
      FROM public.class_members cm
      WHERE cm.student_id = v_top_3.student_id
        AND cm.status = 'active'
      ORDER BY cm.joined_at ASC
      LIMIT 1;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.update_daily_challenge_rankings IS
  'Updates top 3 rankings with scaled bonuses: 1st: +5.0, 2nd: +3.0, 3rd: +2.0 gidouilles.';
