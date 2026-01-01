-- ============================================================================
-- Migration: Update Riddle functions for Daily Limit System
-- Purpose: Integrate with daily_game_rewards for 1 gidouille/day limit
-- Date: 2026-01-01
-- ============================================================================
--
-- CHANGES:
-- 1. Modify submit_riddle_attempt() to use record_game_reward()
-- 2. Modify validate_riddle_attempt() to use record_game_reward()
-- 3. Returns now include theoretical_reward, actual_reward, week_best
--
-- FORMULA:
--   theoretical_reward = difficulty × multiplier (unchanged)
--   actual_reward = 1 if first win of day, 0 otherwise
--
-- ============================================================================

-- Drop and recreate submit_riddle_attempt with new signature
DROP FUNCTION IF EXISTS public.submit_riddle_attempt(UUID, UUID, JSONB, BOOLEAN);

CREATE OR REPLACE FUNCTION public.submit_riddle_attempt(
  p_riddle_id UUID,
  p_student_id UUID,
  p_submitted_answer JSONB,
  p_is_correct BOOLEAN DEFAULT NULL -- NULL for manual validation, true/false for auto
)
RETURNS TABLE(
  attempt_id UUID,
  theoretical_reward NUMERIC,
  actual_reward NUMERIC,
  is_first_win BOOLEAN,
  week_best_reward NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_number INTEGER;
  v_difficulty INTEGER;
  v_theoretical_gidouilles NUMERIC(10,2);
  v_actual_gidouilles NUMERIC(10,2);
  v_is_first_win BOOLEAN;
  v_week_best NUMERIC(10,2);
  v_attempt_id UUID;
  v_school_id UUID;
  v_daily_result RECORD;
BEGIN
  -- Security check: Caller must be the student
  IF auth.uid() != p_student_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only submit attempts for yourself';
  END IF;

  -- Get riddle difficulty
  SELECT difficulty INTO v_difficulty
  FROM riddles
  WHERE id = p_riddle_id;

  IF v_difficulty IS NULL THEN
    RAISE EXCEPTION 'Riddle not found';
  END IF;

  -- Get student's school_id
  SELECT DISTINCT c.school_id INTO v_school_id
  FROM class_members cm
  JOIN classes c ON c.id = cm.class_id
  WHERE cm.student_id = p_student_id
    AND cm.status = 'active'
  LIMIT 1;

  -- Get next attempt number
  v_attempt_number := public.get_next_riddle_attempt_number(p_riddle_id, p_student_id);

  -- Calculate theoretical gidouilles (only if correct)
  IF p_is_correct = true THEN
    v_theoretical_gidouilles := public.calculate_riddle_gidouilles(v_difficulty, v_attempt_number)::NUMERIC(10,2);
  ELSE
    v_theoretical_gidouilles := 0;
  END IF;

  -- Create attempt record first (to get the attempt_id for record_game_reward)
  INSERT INTO riddle_attempts (
    riddle_id,
    student_id,
    attempt_number,
    submitted_answer,
    is_correct,
    gidouilles_awarded,  -- Will be updated after record_game_reward
    validated_at
  ) VALUES (
    p_riddle_id,
    p_student_id,
    v_attempt_number,
    p_submitted_answer,
    p_is_correct,
    0,  -- Temporary, will update
    CASE WHEN p_is_correct IS NOT NULL THEN now() ELSE NULL END
  )
  RETURNING id INTO v_attempt_id;

  -- If correct and has school, use daily limit system
  IF p_is_correct = true AND v_theoretical_gidouilles > 0 AND v_school_id IS NOT NULL THEN
    SELECT * INTO v_daily_result
    FROM public.record_game_reward(
      p_student_id,
      'riddle',
      v_attempt_id,
      v_theoretical_gidouilles,
      v_school_id
    );

    v_actual_gidouilles := COALESCE(v_daily_result.actual_reward, 0);
    v_is_first_win := COALESCE(v_daily_result.is_first_win, FALSE);
    v_week_best := COALESCE(v_daily_result.week_best_reward, v_theoretical_gidouilles);

    -- Update attempt with actual reward
    UPDATE riddle_attempts
    SET gidouilles_awarded = v_actual_gidouilles::INTEGER
    WHERE id = v_attempt_id;
  ELSE
    v_actual_gidouilles := 0;
    v_is_first_win := FALSE;
    v_week_best := 0;
  END IF;

  -- Return results
  RETURN QUERY SELECT
    v_attempt_id,
    v_theoretical_gidouilles,
    v_actual_gidouilles,
    v_is_first_win,
    v_week_best;
END;
$$;

COMMENT ON FUNCTION public.submit_riddle_attempt IS
  'Submit a riddle attempt with daily limit system.

   NEW SYSTEM:
     - Students earn MAX 1 gidouille per day (across all games)
     - Theoretical reward is tracked for weekly bonus

   Returns:
     - attempt_id: UUID of the created attempt
     - theoretical_reward: What you would have earned without limit
     - actual_reward: What you actually earned (0 or 1)
     - is_first_win: Whether this was first win today
     - week_best_reward: Your best theoretical reward this week';

GRANT EXECUTE ON FUNCTION public.submit_riddle_attempt TO authenticated;

-- ============================================================================
-- Update validate_riddle_attempt for daily limit system
-- ============================================================================

DROP FUNCTION IF EXISTS public.validate_riddle_attempt(UUID, UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION public.validate_riddle_attempt(
  p_attempt_id UUID,
  p_teacher_id UUID,
  p_is_correct BOOLEAN
)
RETURNS TABLE(
  success BOOLEAN,
  theoretical_reward NUMERIC,
  actual_reward NUMERIC,
  is_first_win BOOLEAN,
  week_best_reward NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_riddle_id UUID;
  v_difficulty INTEGER;
  v_attempt_number INTEGER;
  v_theoretical_gidouilles NUMERIC(10,2);
  v_actual_gidouilles NUMERIC(10,2);
  v_is_first_win BOOLEAN;
  v_week_best NUMERIC(10,2);
  v_school_id UUID;
  v_daily_result RECORD;
BEGIN
  -- Get attempt details
  SELECT ra.student_id, ra.riddle_id, ra.attempt_number
  INTO v_student_id, v_riddle_id, v_attempt_number
  FROM riddle_attempts ra
  WHERE ra.id = p_attempt_id AND ra.is_correct IS NULL; -- Only validate pending attempts

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Attempt not found or already validated';
  END IF;

  -- Verify teacher has permission (owns a class with this student)
  IF NOT EXISTS (
    SELECT 1 FROM class_members cm
    JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = v_student_id AND c.teacher_id = p_teacher_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You do not teach this student';
  END IF;

  -- Get riddle difficulty
  SELECT difficulty INTO v_difficulty
  FROM riddles
  WHERE id = v_riddle_id;

  -- Get student's school_id
  SELECT DISTINCT c.school_id INTO v_school_id
  FROM class_members cm
  JOIN classes c ON c.id = cm.class_id
  WHERE cm.student_id = v_student_id
    AND cm.status = 'active'
  LIMIT 1;

  -- Calculate theoretical reward if correct
  IF p_is_correct THEN
    v_theoretical_gidouilles := public.calculate_riddle_gidouilles(v_difficulty, v_attempt_number)::NUMERIC(10,2);
  ELSE
    v_theoretical_gidouilles := 0;
  END IF;

  -- Update attempt
  UPDATE riddle_attempts
  SET
    is_correct = p_is_correct,
    validated_at = now(),
    validated_by = p_teacher_id
  WHERE id = p_attempt_id;

  -- If correct and has school, use daily limit system
  IF p_is_correct AND v_theoretical_gidouilles > 0 AND v_school_id IS NOT NULL THEN
    SELECT * INTO v_daily_result
    FROM public.record_game_reward(
      v_student_id,
      'riddle',
      p_attempt_id,
      v_theoretical_gidouilles,
      v_school_id
    );

    v_actual_gidouilles := COALESCE(v_daily_result.actual_reward, 0);
    v_is_first_win := COALESCE(v_daily_result.is_first_win, FALSE);
    v_week_best := COALESCE(v_daily_result.week_best_reward, v_theoretical_gidouilles);

    -- Update attempt with actual reward
    UPDATE riddle_attempts
    SET gidouilles_awarded = v_actual_gidouilles::INTEGER
    WHERE id = p_attempt_id;
  ELSE
    v_actual_gidouilles := 0;
    v_is_first_win := FALSE;
    v_week_best := 0;
  END IF;

  RETURN QUERY SELECT
    TRUE,
    v_theoretical_gidouilles,
    v_actual_gidouilles,
    v_is_first_win,
    v_week_best;
END;
$$;

COMMENT ON FUNCTION public.validate_riddle_attempt IS
  'Teacher validates a riddle attempt with daily limit system.

   Returns:
     - success: Always true if no exception
     - theoretical_reward: What student would have earned
     - actual_reward: What student actually earned (0 or 1)
     - is_first_win: Whether this was first win today
     - week_best_reward: Student best theoretical reward this week';

GRANT EXECUTE ON FUNCTION public.validate_riddle_attempt TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Complete: Riddles Daily Limit';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Updated functions:';
  RAISE NOTICE '  - submit_riddle_attempt(): Now returns theoretical + actual reward';
  RAISE NOTICE '  - validate_riddle_attempt(): Now uses record_game_reward()';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Update API endpoints to handle new return values';
  RAISE NOTICE '========================================';
END;
$$ LANGUAGE plpgsql;
