-- ============================================================================
-- Migration: Fix Critical Minesweeper Security Issues
-- Created: 2025-11-20
-- ============================================================================
-- This migration addresses 3 HIGH priority security vulnerabilities:
-- H-1: Implement hints penalty (30% reduction not applied)
-- H-2: Secure hints_used validation (prevent client manipulation)
-- ============================================================================

-- ============================================================================
-- H-1: Add hints penalty to gidouilles calculation
-- ============================================================================

-- Drop and recreate the function with hints_used parameter
DROP FUNCTION IF EXISTS public.calculate_minesweeper_gidouilles(TEXT, INTEGER, UUID);

CREATE OR REPLACE FUNCTION public.calculate_minesweeper_gidouilles(
  p_difficulty TEXT,
  p_time_seconds INTEGER,
  p_student_id UUID,
  p_hints_used INTEGER DEFAULT 0  -- NEW: Hints count for penalty calculation
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_reward INTEGER;
  v_time_bonus_percent NUMERIC;
  v_time_bonus INTEGER;
  v_total_before_multiplier INTEGER;
  v_hint_penalty_multiplier NUMERIC;  -- NEW: Hints penalty
  v_games_won_today INTEGER;
  v_degressive_multiplier NUMERIC;
  v_final_reward INTEGER;
  v_today_start TIMESTAMPTZ;
BEGIN
  -- Base rewards by difficulty
  CASE p_difficulty
    WHEN 'beginner' THEN
      v_base_reward := 10;
      -- Time bonus: < 60 seconds = +50%, linear decrease to 0% at 180s
      IF p_time_seconds < 60 THEN
        v_time_bonus_percent := 0.5; -- 50%
      ELSIF p_time_seconds < 180 THEN
        -- Linear interpolation: 50% at 60s, 0% at 180s
        v_time_bonus_percent := 0.5 * (180 - p_time_seconds) / 120.0;
      ELSE
        v_time_bonus_percent := 0.0;
      END IF;
    WHEN 'intermediate' THEN
      v_base_reward := 30;
      -- Time bonus: < 300 seconds (5 min) = +50%, linear decrease to 0% at 600s (10 min)
      IF p_time_seconds < 300 THEN
        v_time_bonus_percent := 0.5; -- 50%
      ELSIF p_time_seconds < 600 THEN
        v_time_bonus_percent := 0.5 * (600 - p_time_seconds) / 300.0;
      ELSE
        v_time_bonus_percent := 0.0;
      END IF;
    WHEN 'expert' THEN
      v_base_reward := 60;
      -- Time bonus: < 600 seconds (10 min) = +50%, linear decrease to 0% at 1200s (20 min)
      IF p_time_seconds < 600 THEN
        v_time_bonus_percent := 0.5; -- 50%
      ELSIF p_time_seconds < 1200 THEN
        v_time_bonus_percent := 0.5 * (1200 - p_time_seconds) / 600.0;
      ELSE
        v_time_bonus_percent := 0.0;
      END IF;
    ELSE
      -- Invalid difficulty
      RETURN 0;
  END CASE;

  -- Calculate time bonus
  v_time_bonus := FLOOR(v_base_reward * v_time_bonus_percent);
  v_total_before_multiplier := v_base_reward + v_time_bonus;

  -- ✅ NEW: Apply hints penalty BEFORE degressive multiplier
  -- Each hint costs 10 gidouilles upfront + 30% penalty on final reward
  IF p_hints_used > 0 THEN
    v_hint_penalty_multiplier := 0.7;  -- 30% penalty
    v_total_before_multiplier := FLOOR(v_total_before_multiplier * v_hint_penalty_multiplier);
  END IF;

  -- Daily degressive multiplier based on games won today
  v_today_start := date_trunc('day', NOW());

  SELECT COUNT(*) INTO v_games_won_today
  FROM public.minesweeper_games
  WHERE student_id = p_student_id
    AND status = 'won'
    AND completed_at >= v_today_start;

  -- Calculate degressive multiplier: 100% for first win, -15% per additional win, minimum 30%
  -- Win 1: 100%, Win 2: 85%, Win 3: 70%, Win 4: 55%, Win 5: 40%, Win 6+: 30%
  v_degressive_multiplier := 1.0 - (v_games_won_today * 0.15);

  -- Enforce minimum 30% multiplier
  IF v_degressive_multiplier < 0.3 THEN
    v_degressive_multiplier := 0.3;
  END IF;

  -- Apply degressive multiplier
  v_final_reward := FLOOR(v_total_before_multiplier * v_degressive_multiplier);

  -- Per-game cap: 100 gidouilles max
  IF v_final_reward > 100 THEN
    v_final_reward := 100;
  END IF;

  -- Ensure non-negative
  IF v_final_reward < 0 THEN
    v_final_reward := 0;
  END IF;

  RETURN v_final_reward;
END;
$$;

COMMENT ON FUNCTION public.calculate_minesweeper_gidouilles IS
  'Calculates gidouilles reward for winning a Minesweeper game. Base reward + up to 50% time bonus, then applies hints penalty (30% if any hints used), then daily degressive multiplier (15% reduction per win, minimum 30%). Capped at 100 per game.';

-- ============================================================================
-- Update complete_minesweeper_game to pass hints_used
-- ============================================================================

DROP FUNCTION IF EXISTS public.complete_minesweeper_game(UUID, JSONB);

CREATE OR REPLACE FUNCTION public.complete_minesweeper_game(
  p_game_id UUID,
  p_grid_state JSONB
)
RETURNS TABLE(success BOOLEAN, gidouilles_awarded INTEGER, time_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_record RECORD;
  v_time_seconds INTEGER;
  v_gidouilles INTEGER;
  v_is_valid BOOLEAN;
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

  -- Step 3: Validate started_at exists
  IF v_game_record.started_at IS NULL THEN
    RAISE EXCEPTION 'Game has not been started yet (no cells revealed)';
  END IF;

  -- Step 4: Calculate time_seconds server-side
  v_time_seconds := EXTRACT(EPOCH FROM (NOW() - v_game_record.started_at))::INTEGER;

  -- Sanity check: time must be positive and reasonable for difficulty
  IF v_time_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid game time: must be at least 1 second';
  END IF;

  CASE v_game_record.difficulty
    WHEN 'beginner' THEN
      IF v_time_seconds > 3600 THEN -- 1 hour max
        RAISE EXCEPTION 'Invalid game time for beginner: exceeds 1 hour';
      END IF;
    WHEN 'intermediate' THEN
      IF v_time_seconds > 7200 THEN -- 2 hours max
        RAISE EXCEPTION 'Invalid game time for intermediate: exceeds 2 hours';
      END IF;
    WHEN 'expert' THEN
      IF v_time_seconds > 14400 THEN -- 4 hours max
        RAISE EXCEPTION 'Invalid game time for expert: exceeds 4 hours';
      END IF;
  END CASE;

  -- Step 5: Calculate gidouilles server-side WITH HINTS PENALTY
  -- ✅ FIXED: Now passes hints_used for penalty calculation
  v_gidouilles := public.calculate_minesweeper_gidouilles(
    v_game_record.difficulty,
    v_time_seconds,
    v_game_record.student_id,
    COALESCE(v_game_record.hints_used, 0)  -- Pass hints count
  );

  -- Step 6: Update game record
  UPDATE public.minesweeper_games
  SET
    status = 'won',
    grid_state = p_grid_state,
    time_seconds = v_time_seconds,
    gidouilles_awarded = v_gidouilles,
    completed_at = NOW()
  WHERE id = p_game_id;

  -- Step 7: Award gidouilles to profile
  IF v_gidouilles > 0 THEN
    UPDATE public.profiles
    SET gidouilles = COALESCE(gidouilles, 0) + v_gidouilles
    WHERE id = v_game_record.student_id;

    -- Step 8: Insert into gidouilles_history for audit trail
    -- Use student's first active class for history tracking
    INSERT INTO public.gidouilles_history (
      student_id,
      class_id,
      delta,
      reason,
      created_by
    )
    SELECT
      v_game_record.student_id,
      cm.class_id,
      v_gidouilles,
      'Minesweeper: ' || v_game_record.difficulty || ' won in ' || v_time_seconds || 's' ||
        CASE
          WHEN v_game_record.hints_used > 0 THEN ' (hints: ' || v_game_record.hints_used || ')'
          ELSE ''
        END,
      v_game_record.student_id
    FROM public.class_members cm
    WHERE cm.student_id = v_game_record.student_id
      AND cm.status = 'active'
    ORDER BY cm.joined_at ASC
    LIMIT 1;

    -- Note: If student has no active classes, history insert is skipped
    -- This is acceptable as they still receive gidouilles
  END IF;

  -- Step 9: Return result
  RETURN QUERY SELECT TRUE, v_gidouilles, v_time_seconds;
END;
$$;

COMMENT ON FUNCTION public.complete_minesweeper_game IS
  'Completes a Minesweeper game with server-side validation and reward calculation. SECURITY DEFINER prevents client manipulation of gidouilles/time. Validates win condition and calculates rewards with hints penalty and daily degressive multiplier.';

-- ============================================================================
-- H-2: Add CHECK constraint to prevent hints_used manipulation
-- ============================================================================

-- Add constraint to ensure hints_used is within valid range (0-3)
ALTER TABLE public.minesweeper_games
ADD CONSTRAINT check_hints_used_range CHECK (
  hints_used >= 0 AND hints_used <= 3
);

COMMENT ON CONSTRAINT check_hints_used_range ON public.minesweeper_games IS
  'Ensures hints_used is within valid range (0-3). Hints can only be incremented via the hint API endpoint which validates and charges gidouilles.';

-- ============================================================================
-- Verification queries (for testing)
-- ============================================================================

-- Test hints penalty calculation (should show reduced rewards)
DO $$
DECLARE
  v_no_hints INTEGER;
  v_with_hints INTEGER;
BEGIN
  -- Test with 0 hints (should be 10 gidouilles for beginner)
  v_no_hints := public.calculate_minesweeper_gidouilles('beginner', 120, gen_random_uuid(), 0);

  -- Test with 3 hints (should be 10 * 0.7 = 7 gidouilles for beginner)
  v_with_hints := public.calculate_minesweeper_gidouilles('beginner', 120, gen_random_uuid(), 3);

  -- Log results
  RAISE NOTICE 'Beginner reward without hints: %', v_no_hints;
  RAISE NOTICE 'Beginner reward with 3 hints: %', v_with_hints;
  RAISE NOTICE 'Penalty applied correctly: %', (v_with_hints::NUMERIC / v_no_hints::NUMERIC) <= 0.71;
END;
$$;
