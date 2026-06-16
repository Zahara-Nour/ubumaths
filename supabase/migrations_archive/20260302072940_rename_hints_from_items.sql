-- ============================================================================
-- Migration: Rename hints_from_items → reduced_penalty_hints
-- Created: 2026-03-02
-- ============================================================================
--
-- CONTEXT:
-- The hints_from_items column tracked hints with reduced penalty (originally
-- from shop items, now from VIP cards). The items system was removed but the
-- column name still referenced "items". Renaming to reduced_penalty_hints
-- which accurately describes what it represents: hints where a reduced penalty
-- applies (5/11/17% vs 10/22/35%).
--
-- ============================================================================

-- ============================================================================
-- STEP 1: Rename column
-- ============================================================================

ALTER TABLE public.minesweeper_games
RENAME COLUMN hints_from_items TO reduced_penalty_hints;

-- ============================================================================
-- STEP 2: Rename constraint
-- ============================================================================

ALTER TABLE public.minesweeper_games
DROP CONSTRAINT IF EXISTS check_hints_from_items_valid;

ALTER TABLE public.minesweeper_games
ADD CONSTRAINT check_reduced_penalty_hints_valid CHECK (
  reduced_penalty_hints >= 0 AND reduced_penalty_hints <= hints_used
);

COMMENT ON COLUMN public.minesweeper_games.reduced_penalty_hints IS
  'Number of hints with reduced penalty (from VIP cards: 5/11/17% vs 10/22/35% for gidouilles hints).';

-- ============================================================================
-- STEP 3: Recreate use_hint() with renamed column/vars
-- ============================================================================

DROP FUNCTION IF EXISTS public.use_hint(UUID);

CREATE OR REPLACE FUNCTION public.use_hint(
  p_game_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_hints_used INTEGER;
  v_reduced_penalty_hints INTEGER;
  v_current_balance NUMERIC(10,2);
  v_hint_instance_id TEXT;
  v_consume_result JSONB;
  v_hint_cost NUMERIC(10,2) := 1.0;  -- Strategy D: 1 gidouille per hint
  v_penalty_notice TEXT;
  v_vip_cards JSONB;
BEGIN
  -- Step 1: Verify game ownership and get current state
  SELECT student_id, COALESCE(hints_used, 0), COALESCE(reduced_penalty_hints, 0)
  INTO v_student_id, v_hints_used, v_reduced_penalty_hints
  FROM public.minesweeper_games
  WHERE id = p_game_id
    AND student_id = auth.uid()
    AND status = 'in_progress'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found, not owned by you, or not in progress';
  END IF;

  -- Step 2: Check hint limit
  IF v_hints_used >= 3 THEN
    RAISE EXCEPTION 'Maximum hints reached (3 per game)';
  END IF;

  -- Step 3: Find an available minesweeper-hint VIP card instance
  SELECT vip_cards INTO v_vip_cards
  FROM public.profiles
  WHERE id = v_student_id;

  IF v_vip_cards IS NOT NULL THEN
    SELECT key INTO v_hint_instance_id
    FROM jsonb_each(v_vip_cards) AS cards(key, value)
    WHERE value->>'cardId' = 'minesweeper-hint'
      AND (value->>'usedAt') IS NULL
      AND (
        (value->>'usesRemaining') IS NULL
        OR (value->>'usesRemaining')::INTEGER > 0
      )
    ORDER BY (value->>'earnedAt')::TIMESTAMPTZ ASC  -- FIFO
    LIMIT 1;
  END IF;

  -- Step 4: If we found a card, consume it via use_consumable_card()
  IF v_hint_instance_id IS NOT NULL THEN
    v_consume_result := public.use_consumable_card(v_student_id, v_hint_instance_id, 'minesweeper');

    IF (v_consume_result->>'success')::BOOLEAN THEN
      -- VIP card consumed - update game hints counter
      UPDATE public.minesweeper_games
      SET hints_used = v_hints_used + 1,
          reduced_penalty_hints = v_reduced_penalty_hints + 1
      WHERE id = p_game_id;

      v_penalty_notice := 'Carte VIP utilisee - penalite reduite (5/11/17%)';

      RETURN jsonb_build_object(
        'success', true,
        'hints_used', v_hints_used + 1,
        'hints_remaining', 2 - v_hints_used,
        'source', 'vip_card',
        'item_consumed', false,
        'vip_card_consumed', true,
        'gidouilles_spent', 0,
        'penalty_notice', v_penalty_notice
      );
    END IF;
    -- If use_consumable_card failed (e.g., card consumed by a concurrent request
    -- between the unlocked read in Step 3 and the lock in use_consumable_card),
    -- fall through to gidouilles. Intentional graceful degradation.
  END IF;

  -- Step 5: No VIP card available - use gidouilles
  SELECT gidouilles INTO v_current_balance
  FROM public.profiles
  WHERE id = v_student_id
  FOR UPDATE;

  IF v_current_balance < v_hint_cost THEN
    RAISE EXCEPTION 'Insufficient gidouilles. Required: %, Available: %', v_hint_cost, v_current_balance;
  END IF;

  -- Deduct gidouilles
  UPDATE public.profiles
  SET gidouilles = gidouilles - v_hint_cost
  WHERE id = v_student_id;

  -- Record transaction
  INSERT INTO public.gidouilles_history (student_id, delta, reason, source_id)
  VALUES (v_student_id, -v_hint_cost, 'Indice Demineur', p_game_id);

  -- Update game hints counter (NOT reduced penalty - full penalty applies)
  UPDATE public.minesweeper_games
  SET hints_used = v_hints_used + 1
  WHERE id = p_game_id;

  v_penalty_notice := 'Gidouilles utilisees - penalite progressive (10/22/35%)';

  RETURN jsonb_build_object(
    'success', true,
    'hints_used', v_hints_used + 1,
    'hints_remaining', 2 - v_hints_used,
    'source', 'gidouilles',
    'item_consumed', false,
    'vip_card_consumed', false,
    'gidouilles_spent', v_hint_cost,
    'remaining_gidouilles', v_current_balance - v_hint_cost,
    'penalty_notice', v_penalty_notice
  );
END;
$$;

COMMENT ON FUNCTION public.use_hint IS
  'Use a hint in Minesweeper. Priority: 1) VIP hint card (via use_consumable_card with minesweeper context), 2) Gidouilles (1.0 cost). VIP hints get reduced penalty.';

GRANT EXECUTE ON FUNCTION public.use_hint TO authenticated;

-- ============================================================================
-- STEP 4: Recreate calculate_minesweeper_gidouilles() with renamed param
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
  v_time_ratio := p_time_seconds::NUMERIC / v_reference_time;
  v_time_mult := 1.3 - 0.5 * LEAST(1.0, v_time_ratio);
  v_time_mult := GREATEST(0.8, v_time_mult);

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
  -- STEP 4: Calculate daily degressive multiplier
  -- ========================================================================
  v_today_start := date_trunc('day', NOW());

  SELECT COUNT(*) INTO v_games_won_today
  FROM public.minesweeper_games
  WHERE student_id = p_student_id
    AND status = 'won'
    AND completed_at >= v_today_start;

  v_daily_mult := 1.0 - (v_games_won_today * 0.15);
  v_daily_mult := GREATEST(0.3, v_daily_mult);  -- Floor at 30%

  -- ========================================================================
  -- STEP 5: Calculate final reward
  -- ========================================================================
  v_result := v_base_reward * v_time_mult * (1.0 - v_hint_penalty) * v_daily_mult;

  -- Apply bounds
  v_result := GREATEST(0.30, v_result);  -- Minimum: 0.3 (you still won!)
  v_result := LEAST(8.00, v_result);     -- Maximum: 8.0 per game

  -- Round to 2 decimal places
  v_result := ROUND(v_result, 2);

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.calculate_minesweeper_gidouilles(TEXT, INTEGER, UUID, INTEGER, INTEGER) IS
  'Strategy D with dynamic reference times by pedagogical cycle.

   IMPORTANT: Players without a grade defined get NO gidouilles.
   This incentivizes students to set their grade level.

   Formula: base * time_mult * (1 - hint_penalty) * daily_mult

   Bases: Beginner=1.0, Intermediate=3.0, Expert=6.0
   Reference time: Dynamic, based on median of cycle peers (recalculated weekly)
   Time mult: 1.3 (fast) to 0.8 (at/beyond reference)
   Hint penalty: Progressive (10/22/35% gidouilles, 5/11/17% VIP cards)
   Daily mult: 100% first win, -15% each, min 30%
   Bounds: 0.3 min, 8.0 max per game';

GRANT EXECUTE ON FUNCTION public.calculate_minesweeper_gidouilles(TEXT, INTEGER, UUID, INTEGER, INTEGER) TO authenticated;

-- ============================================================================
-- STEP 5: Recreate complete_minesweeper_game() with renamed column reads
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
  v_time_ratio := v_time_seconds::NUMERIC / v_reference_time;
  v_time_mult := 1.3 - 0.5 * LEAST(1.0, v_time_ratio);
  v_time_mult := GREATEST(0.8, v_time_mult);
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
    v_hint_penalty := v_hint_penalty + v_item_penalties[LEAST(v_hints_reduced, 3) + 1];
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
  'Completes Minesweeper game. Uses ACTIVE class membership for school lookup. Returns breakdown with reduced_penalty_hints.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== Migration: Rename hints_from_items -> reduced_penalty_hints ===';
  RAISE NOTICE '1. Column renamed: hints_from_items -> reduced_penalty_hints';
  RAISE NOTICE '2. Constraint renamed: check_hints_from_items_valid -> check_reduced_penalty_hints_valid';
  RAISE NOTICE '3. Functions recreated: use_hint, calculate_minesweeper_gidouilles, complete_minesweeper_game';
  RAISE NOTICE '4. JSON key in breakdown: hints_from_items -> reduced_penalty_hints';
  RAISE NOTICE '=== Migration Complete ===';
END $$;
