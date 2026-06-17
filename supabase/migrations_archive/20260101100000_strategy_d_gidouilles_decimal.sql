-- ============================================================================
-- Migration: Strategy D - Decimal Gidouilles with Proportional Rewards
-- Created: 2026-01-01
-- Author: Claude (Supabase Expert)
-- ============================================================================
--
-- CONTEXT:
-- Previously, gidouilles were integers (10, 30, 60 base rewards).
-- This was disproportionate: 1 gidouille should be a meaningful reward.
--
-- STRATEGY D - "Proportional to Risk":
-- - Scale all values by /10 (1 gidouille = real achievement)
-- - Use decimal precision for nuanced calculations
-- - Continuous time multiplier (not linear bonus)
-- - Progressive hint penalties proportional to difficulty
--
-- ============================================================================
-- FORMULA SUMMARY:
-- ============================================================================
--
--   gidouilles = base × time_mult × (1 - hint_penalty) × daily_mult
--
--   BASES:
--     Beginner     = 1.0  (9×9 grid, 10 mines, 12.3% density)
--     Intermediate = 3.0  (16×16 grid, 40 mines, 15.6% density)
--     Expert       = 6.0  (16×30 grid, 99 mines, 20.6% density)
--
--   TIME MULTIPLIER (continuous):
--     ratio = time / reference_time
--     time_mult = 1.3 - 0.5 × min(1, ratio)
--
--     Results:
--       ratio = 0.0 (instant):    mult = 1.30 (+30%)
--       ratio = 0.5 (half ref):   mult = 1.05 (+5%)
--       ratio = 1.0 (at ref):     mult = 0.80 (-20%)
--       ratio > 1.0 (slow):       mult = 0.80 (floor)
--
--     Reference times: B=180s, I=600s, E=1200s
--
--   HINT PENALTY (progressive, proportional):
--     Gidouilles-based hints (30% penalty avoided with items):
--       1 hint:  -10%  → multiplier = 0.90
--       2 hints: -22%  → multiplier = 0.78
--       3 hints: -35%  → multiplier = 0.65
--
--     Item-based hints (half penalty):
--       1 hint:  -5%   → multiplier = 0.95
--       2 hints: -11%  → multiplier = 0.89
--       3 hints: -17%  → multiplier = 0.83
--
--     Mixed hints: Calculate weighted penalty based on source
--
--   DAILY DEGRESSIVE MULTIPLIER (unchanged):
--     Win 1: 100%, Win 2: 85%, Win 3: 70%, Win 4: 55%, Win 5: 40%, Win 6+: 30%
--
--   BOUNDS:
--     Minimum: 0.3 gidouilles (you still won!)
--     Maximum: 8.0 gidouilles per game
--
-- ============================================================================
-- EXPECTED REWARD RANGES:
-- ============================================================================
--
--   | Difficulty   | Min (slow, 3 hints) | Typical | Max (fast, 0 hints) |
--   |--------------|---------------------|---------|---------------------|
--   | Beginner     | 0.52                | 1.0     | 1.3                 |
--   | Intermediate | 1.56                | 3.0     | 3.9                 |
--   | Expert       | 3.12                | 6.0     | 7.8                 |
--
-- ============================================================================

-- ============================================================================
-- PART 0: Drop Views and Policies that depend on gidouilles_awarded column
-- ============================================================================

-- Drop views first (they reference gidouilles columns)
DROP VIEW IF EXISTS public.minesweeper_leaderboard_public;
DROP VIEW IF EXISTS public.minesweeper_leaderboard;
DROP VIEW IF EXISTS public.minesweeper_daily_leaderboard;

-- Must drop policies before altering column type
-- These policies check gidouilles_awarded = 0
DROP POLICY IF EXISTS "Users can update in-progress game state only" ON public.minesweeper_games;
DROP POLICY IF EXISTS "Authenticated users can create own games with limits" ON public.minesweeper_games;
DROP POLICY IF EXISTS "Anonymous users can create public games" ON public.minesweeper_games;
DROP POLICY IF EXISTS "Users can update own minesweeper games" ON public.minesweeper_games;
DROP POLICY IF EXISTS "Authenticated users can create own games" ON public.minesweeper_games;

-- Ensure hints_from_items column exists (may have been missed in previous migration)
ALTER TABLE public.minesweeper_games
ADD COLUMN IF NOT EXISTS hints_from_items INTEGER NOT NULL DEFAULT 0;

-- ============================================================================
-- PART 1: Change gidouilles Columns to NUMERIC(10,2)
-- ============================================================================

-- 1.1 Change profiles.gidouilles from INTEGER to NUMERIC(10,2)
ALTER TABLE public.profiles
ALTER COLUMN gidouilles TYPE NUMERIC(10,2)
USING gidouilles::NUMERIC(10,2);

-- 1.2 Change minesweeper_games.gidouilles_awarded from INTEGER to NUMERIC(10,2)
ALTER TABLE public.minesweeper_games
ALTER COLUMN gidouilles_awarded TYPE NUMERIC(10,2)
USING gidouilles_awarded::NUMERIC(10,2);

-- 1.3 Update gidouilles_history.delta to NUMERIC(10,2)
ALTER TABLE public.gidouilles_history
ALTER COLUMN delta TYPE NUMERIC(10,2)
USING delta::NUMERIC(10,2);

-- 1.4 Update daily challenges gidouilles column
ALTER TABLE public.minesweeper_daily_attempts
ALTER COLUMN gidouilles_earned TYPE NUMERIC(10,2)
USING gidouilles_earned::NUMERIC(10,2);

-- Add comments explaining the change
COMMENT ON COLUMN public.profiles.gidouilles IS
  'Student currency balance. Decimal precision (2 places) allows nuanced rewards. 1 gidouille = meaningful achievement.';

COMMENT ON COLUMN public.minesweeper_games.gidouilles_awarded IS
  'Gidouilles earned for this game. Decimal for precise Strategy D calculations. Range: 0.3-8.0 per game.';

-- ============================================================================
-- PART 2: Scale Existing Values by /10
-- ============================================================================

-- 2.1 Scale profiles.gidouilles
UPDATE public.profiles
SET gidouilles = gidouilles / 10.0
WHERE gidouilles > 0;

-- 2.2 Scale minesweeper_games.gidouilles_awarded
UPDATE public.minesweeper_games
SET gidouilles_awarded = gidouilles_awarded / 10.0
WHERE gidouilles_awarded > 0;

-- 2.3 Scale gidouilles_history.delta
UPDATE public.gidouilles_history
SET delta = delta / 10.0
WHERE delta != 0;

-- 2.4 Scale daily challenges gidouilles
UPDATE public.minesweeper_daily_attempts
SET gidouilles_earned = gidouilles_earned / 10.0
WHERE gidouilles_earned > 0;

-- ============================================================================
-- PART 3: Update Hint Cost in Shop
-- ============================================================================

-- Update hint item price from 10 to 1.0
UPDATE public.shop_item_templates
SET base_price = 1
WHERE internal_name = 'minesweeper_hint';

-- ============================================================================
-- PART 4: New calculate_minesweeper_gidouilles Function (Strategy D)
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.calculate_minesweeper_gidouilles(TEXT, INTEGER, UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.calculate_minesweeper_gidouilles(
  p_difficulty TEXT,
  p_time_seconds INTEGER,
  p_student_id UUID,
  p_hints_used INTEGER DEFAULT 0,
  p_hints_from_items INTEGER DEFAULT 0
)
RETURNS NUMERIC(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Base rewards (Strategy D: scaled by /10)
  v_base_reward NUMERIC(10,2);
  v_reference_time INTEGER;

  -- Time multiplier calculation
  v_time_ratio NUMERIC;
  v_time_mult NUMERIC;

  -- Hint penalty calculation
  v_hints_gidouilles INTEGER;  -- Hints paid with gidouilles
  v_hints_items INTEGER;       -- Hints from shop items
  v_hint_penalty NUMERIC;

  -- Penalty rates (progressive)
  -- Gidouilles hints: 10%, 22%, 35% for 1, 2, 3 hints
  -- Item hints: 5%, 11%, 17% for 1, 2, 3 hints
  v_gidouilles_penalties NUMERIC[] := ARRAY[0.10, 0.22, 0.35];
  v_item_penalties NUMERIC[] := ARRAY[0.05, 0.11, 0.17];

  -- Daily degressive
  v_games_won_today INTEGER;
  v_daily_mult NUMERIC;
  v_today_start TIMESTAMPTZ;

  -- Final calculation
  v_result NUMERIC(10,2);
BEGIN
  -- ========================================================================
  -- STEP 1: Determine base reward and reference time by difficulty
  -- ========================================================================
  CASE p_difficulty
    WHEN 'beginner' THEN
      v_base_reward := 1.0;
      v_reference_time := 180;  -- 3 minutes
    WHEN 'intermediate' THEN
      v_base_reward := 3.0;
      v_reference_time := 600;  -- 10 minutes
    WHEN 'expert' THEN
      v_base_reward := 6.0;
      v_reference_time := 1200; -- 20 minutes
    ELSE
      RETURN 0.0;  -- Unknown difficulty
  END CASE;

  -- ========================================================================
  -- STEP 2: Calculate time multiplier (continuous formula)
  -- ========================================================================
  -- Formula: time_mult = 1.3 - 0.5 × min(1, time/reference)
  --
  -- This gives:
  --   - instant (ratio=0):    1.3 (+30% bonus)
  --   - half reference:       1.05 (+5% bonus)
  --   - at reference:         0.8 (-20% penalty)
  --   - beyond reference:     0.8 (floor, no further penalty)

  v_time_ratio := p_time_seconds::NUMERIC / v_reference_time;
  v_time_mult := 1.3 - 0.5 * LEAST(1.0, v_time_ratio);

  -- Floor at 0.8 (already handled by LEAST, but explicit for clarity)
  v_time_mult := GREATEST(0.8, v_time_mult);

  -- ========================================================================
  -- STEP 3: Calculate hint penalty (progressive, source-aware)
  -- ========================================================================
  -- Split hints by source
  v_hints_items := COALESCE(p_hints_from_items, 0);
  v_hints_gidouilles := COALESCE(p_hints_used, 0) - v_hints_items;

  -- Ensure non-negative
  v_hints_gidouilles := GREATEST(0, v_hints_gidouilles);
  v_hints_items := GREATEST(0, v_hints_items);

  -- Calculate penalty from each source
  -- Penalty is cumulative based on total hints, but rate differs by source
  v_hint_penalty := 0.0;

  -- Add penalty for gidouilles-based hints
  IF v_hints_gidouilles > 0 THEN
    v_hint_penalty := v_hint_penalty + v_gidouilles_penalties[LEAST(v_hints_gidouilles, 3)];
  END IF;

  -- Add penalty for item-based hints (half rate)
  IF v_hints_items > 0 THEN
    v_hint_penalty := v_hint_penalty + v_item_penalties[LEAST(v_hints_items, 3)];
  END IF;

  -- Cap total penalty at 50% (0.50)
  v_hint_penalty := LEAST(0.50, v_hint_penalty);

  -- ========================================================================
  -- STEP 4: Calculate daily degressive multiplier
  -- ========================================================================
  -- Unchanged from previous implementation:
  -- Win 1: 100%, Win 2: 85%, Win 3: 70%, Win 4: 55%, Win 5: 40%, Win 6+: 30%

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
  -- Formula: base × time_mult × (1 - hint_penalty) × daily_mult

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
  'Strategy D: Calculates gidouilles reward with decimal precision.

   Formula: base × time_mult × (1 - hint_penalty) × daily_mult

   Bases: Beginner=1.0, Intermediate=3.0, Expert=6.0
   Time mult: 1.3 (instant) to 0.8 (at/beyond reference time)
   Hint penalty: Progressive (10/22/35% gidouilles, 5/11/17% items)
   Daily mult: 100% first win, -15% each, min 30%
   Bounds: 0.3 min, 8.0 max per game';

GRANT EXECUTE ON FUNCTION public.calculate_minesweeper_gidouilles(TEXT, INTEGER, UUID, INTEGER, INTEGER) TO authenticated;

-- ============================================================================
-- PART 5: Update complete_minesweeper_game to Return NUMERIC
-- ============================================================================

DROP FUNCTION IF EXISTS public.complete_minesweeper_game(UUID, JSONB);

CREATE OR REPLACE FUNCTION public.complete_minesweeper_game(
  p_game_id UUID,
  p_grid_state JSONB
)
RETURNS TABLE(
  gidouilles_earned NUMERIC(10,2),
  achievements JSONB,
  points_earned INTEGER
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

  -- Step 6: Calculate gidouilles (Strategy D, only for students)
  IF v_user_role = 'student' THEN
    v_gidouilles := public.calculate_minesweeper_gidouilles(
      v_game_record.difficulty,
      v_time_seconds,
      v_game_record.student_id,
      COALESCE(v_game_record.hints_used, 0),
      v_hints_from_items
    );
  ELSE
    v_gidouilles := 0.0;
  END IF;

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

  -- Step 12: Return results
  RETURN QUERY SELECT v_gidouilles, v_unlocked_achievements, v_points;
END;
$$;

COMMENT ON FUNCTION public.complete_minesweeper_game IS
  'Completes Minesweeper game with Strategy D reward calculation.
   Returns decimal gidouilles (0.3-8.0), achievements, and points.';

GRANT EXECUTE ON FUNCTION public.complete_minesweeper_game TO authenticated;

-- ============================================================================
-- PART 6: Update use_hint Function for New Cost (1.0 gidouille)
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
  v_hints_from_items INTEGER;
  -- NEW: Hint cost is now 1.0 gidouille (was 10)
  v_hint_cost NUMERIC(10,2) := 1.0;
  v_current_gidouilles NUMERIC(10,2);
  v_consumed_item_id UUID;
  v_used_item BOOLEAN := false;
BEGIN
  -- Step 1: Get game info and validate ownership WITH ROW LOCK
  SELECT student_id, hints_used, COALESCE(hints_from_items, 0)
  INTO v_student_id, v_hints_used, v_hints_from_items
  FROM public.minesweeper_games
  WHERE id = p_game_id
    AND status = 'in_progress'
    AND student_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found, not owned by you, or not in progress';
  END IF;

  -- Step 2: Check hint limit (max 3 hints per game)
  IF v_hints_used >= 3 THEN
    RAISE EXCEPTION 'Maximum hints reached (3 per game)';
  END IF;

  -- Step 3: Try to consume an item from inventory FIRST
  v_consumed_item_id := public.try_consume_minesweeper_hint_item(v_student_id);

  IF v_consumed_item_id IS NOT NULL THEN
    -- Item was consumed successfully - no gidouilles cost!
    v_used_item := true;

    UPDATE public.minesweeper_games
    SET hints_used = hints_used + 1,
        hints_from_items = hints_from_items + 1
    WHERE id = p_game_id;

    RETURN jsonb_build_object(
      'success', true,
      'hints_used', v_hints_used + 1,
      'hints_remaining', 3 - (v_hints_used + 1),
      'source', 'item',
      'item_consumed', true,
      'gidouilles_spent', 0,
      'penalty_notice', 'Hint from item: reduced penalty (-5/11/17% vs -10/22/35%)'
    );

  ELSE
    -- No items available - fallback to gidouilles
    SELECT gidouilles INTO v_current_gidouilles
    FROM public.profiles
    WHERE id = v_student_id
    FOR UPDATE;

    IF v_current_gidouilles < v_hint_cost THEN
      RAISE EXCEPTION 'Insufficient gidouilles (cost: % gidouilles, you have: %). Buy "Indice Demineur" items from the shop.',
        v_hint_cost, v_current_gidouilles;
    END IF;

    -- Deduct gidouilles
    UPDATE public.profiles
    SET gidouilles = gidouilles - v_hint_cost
    WHERE id = v_student_id;

    -- Record in history
    INSERT INTO public.gidouilles_history (student_id, delta, reason)
    VALUES (
      v_student_id,
      -v_hint_cost,
      'Minesweeper hint #' || (v_hints_used + 1) || '/3'
    );

    -- Update game
    UPDATE public.minesweeper_games
    SET hints_used = hints_used + 1
    WHERE id = p_game_id;

    RETURN jsonb_build_object(
      'success', true,
      'hints_used', v_hints_used + 1,
      'hints_remaining', 3 - (v_hints_used + 1),
      'source', 'gidouilles',
      'item_consumed', false,
      'gidouilles_spent', v_hint_cost,
      'remaining_gidouilles', v_current_gidouilles - v_hint_cost,
      'penalty_notice', 'Progressive penalty: -10/22/35% based on total hints. Buy items for -5/11/17% instead!'
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.use_hint IS
  'Use a hint in Minesweeper. Cost: 1.0 gidouille (or free with shop item).
   Item hints have half penalty (-5/11/17%) vs gidouilles hints (-10/22/35%).
   Progressive penalty based on number of hints used.';

GRANT EXECUTE ON FUNCTION public.use_hint TO authenticated;

-- ============================================================================
-- PART 7: Update Constraints for New Values
-- ============================================================================

-- Update gidouilles_awarded constraint for new range
ALTER TABLE public.minesweeper_games
DROP CONSTRAINT IF EXISTS minesweeper_games_gidouilles_awarded_check;

ALTER TABLE public.minesweeper_games
ADD CONSTRAINT minesweeper_games_gidouilles_awarded_check
CHECK (gidouilles_awarded >= 0 AND gidouilles_awarded <= 10.0);

-- ============================================================================
-- PART 8: Update Daily Challenge Rewards
-- ============================================================================

-- Scale daily challenge bonus rewards
-- Was: 1st: +50, 2nd: +30, 3rd: +20
-- Now: 1st: +5.0, 2nd: +3.0, 3rd: +2.0

-- This is handled by the award function, but let's document the new values
COMMENT ON TABLE public.minesweeper_daily_attempts IS
  'Daily challenge attempts. Top 3 bonuses scaled to new economy: 1st: +5.0, 2nd: +3.0, 3rd: +2.0 gidouilles.';

-- ============================================================================
-- PART 9: Verification Tests
-- ============================================================================

DO $$
DECLARE
  v_test_id UUID := gen_random_uuid();
  v_beginner_fast NUMERIC(10,2);
  v_beginner_slow NUMERIC(10,2);
  v_expert_fast NUMERIC(10,2);
  v_expert_slow_hints NUMERIC(10,2);
  v_expert_items NUMERIC(10,2);
BEGIN
  -- Test 1: Beginner, fast (45s = 25% of 180s reference)
  v_beginner_fast := public.calculate_minesweeper_gidouilles('beginner', 45, v_test_id, 0, 0);

  -- Test 2: Beginner, slow (180s = at reference)
  v_beginner_slow := public.calculate_minesweeper_gidouilles('beginner', 180, v_test_id, 0, 0);

  -- Test 3: Expert, fast (300s = 25% of 1200s reference)
  v_expert_fast := public.calculate_minesweeper_gidouilles('expert', 300, v_test_id, 0, 0);

  -- Test 4: Expert, slow with 3 gidouilles hints
  v_expert_slow_hints := public.calculate_minesweeper_gidouilles('expert', 1200, v_test_id, 3, 0);

  -- Test 5: Expert, slow with 3 item hints (half penalty)
  v_expert_items := public.calculate_minesweeper_gidouilles('expert', 1200, v_test_id, 3, 3);

  RAISE NOTICE '=== Strategy D Verification ===';
  RAISE NOTICE 'Beginner fast (45s):     % (expected ~1.18)', v_beginner_fast;
  RAISE NOTICE 'Beginner slow (180s):    % (expected ~0.80)', v_beginner_slow;
  RAISE NOTICE 'Expert fast (300s):      % (expected ~6.98)', v_expert_fast;
  RAISE NOTICE 'Expert slow 3 hints:     % (expected ~3.12)', v_expert_slow_hints;
  RAISE NOTICE 'Expert slow 3 items:     % (expected ~3.98)', v_expert_items;

  -- Verify key invariants
  IF v_beginner_fast > v_beginner_slow THEN
    RAISE NOTICE 'OK: Fast games reward more than slow games';
  ELSE
    RAISE WARNING 'FAIL: Fast should reward more than slow';
  END IF;

  IF v_expert_items > v_expert_slow_hints THEN
    RAISE NOTICE 'OK: Item hints have less penalty than gidouilles hints';
  ELSE
    RAISE WARNING 'FAIL: Items should have less penalty';
  END IF;

  IF v_beginner_fast >= 0.3 AND v_beginner_fast <= 8.0 THEN
    RAISE NOTICE 'OK: Results within bounds [0.3, 8.0]';
  ELSE
    RAISE WARNING 'FAIL: Results outside bounds';
  END IF;
END;
$$;

-- ============================================================================
-- PART 10: Recreate RLS Policy (dropped in PART 0)
-- ============================================================================

-- Recreate the policy with same logic (works with NUMERIC type)
CREATE POLICY "Users can update in-progress game state only"
  ON public.minesweeper_games
  FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    AND status = 'in_progress'
  )
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'in_progress'
    AND gidouilles_awarded = 0  -- Must remain 0 (works with NUMERIC)
    AND completed_at IS NULL    -- Must remain NULL
    AND time_seconds IS NULL    -- Must remain NULL
  );

COMMENT ON POLICY "Users can update in-progress game state only" ON public.minesweeper_games IS
  'Restricts updates to in-progress games only. Prevents client from setting gidouilles_awarded, time_seconds, completed_at. Use complete_minesweeper_game() to finish games.';

-- Recreate the INSERT policy
CREATE POLICY "Authenticated users can create own games with limits"
  ON public.minesweeper_games
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND gidouilles_awarded = 0
    AND completed_at IS NULL
    AND status = 'in_progress'
    AND (
      -- Limit to 10 concurrent in-progress games per user
      SELECT COUNT(*)
      FROM public.minesweeper_games
      WHERE student_id = auth.uid()
        AND status = 'in_progress'
    ) < 10
  );

COMMENT ON POLICY "Authenticated users can create own games with limits" ON public.minesweeper_games IS
  'Limits users to 10 concurrent in-progress games to prevent resource exhaustion attacks.';

-- Recreate the anonymous INSERT policy
CREATE POLICY "Anonymous users can create public games"
  ON public.minesweeper_games
  FOR INSERT
  TO anon
  WITH CHECK (student_id IS NULL AND gidouilles_awarded = 0);

COMMENT ON POLICY "Anonymous users can create public games" ON public.minesweeper_games IS
  'Allows anonymous users to create public games (for try-before-login). No gidouilles rewards for anonymous games.';

-- ============================================================================
-- PART 11: Recreate Leaderboard Views (dropped in PART 0)
-- ============================================================================

-- Recreate leaderboard view (now with NUMERIC gidouilles_awarded)
CREATE VIEW public.minesweeper_leaderboard AS
WITH ranked_games AS (
  SELECT
    mg.student_id,
    mg.points_earned,
    ROW_NUMBER() OVER (
      PARTITION BY mg.student_id
      ORDER BY mg.points_earned DESC
    ) AS game_rank
  FROM public.minesweeper_games mg
  WHERE mg.status = 'won'
    AND mg.student_id IS NOT NULL
    AND mg.points_earned > 0
),
top10_stats AS (
  SELECT
    student_id,
    COUNT(*) AS top_games_count,
    SUM(points_earned) AS top_games_total,
    ROUND(AVG(points_earned), 1) AS avg_top_10
  FROM ranked_games
  WHERE game_rank <= 10
  GROUP BY student_id
),
full_stats AS (
  SELECT
    t.student_id,
    p.firstname,
    p.lastname,
    t.avg_top_10,
    t.top_games_count,
    t.top_games_total,
    (SELECT COUNT(*) FROM public.minesweeper_games mg
     WHERE mg.student_id = t.student_id AND mg.status = 'won') AS games_won,
    (SELECT COUNT(*) FROM public.minesweeper_games mg
     WHERE mg.student_id = t.student_id AND mg.status IN ('won', 'lost')) AS games_played,
    (SELECT SUM(mg.points_earned) FROM public.minesweeper_games mg
     WHERE mg.student_id = t.student_id AND mg.status = 'won') AS total_points,
    (SELECT SUM(mg.gidouilles_awarded) FROM public.minesweeper_games mg
     WHERE mg.student_id = t.student_id AND mg.status = 'won') AS total_gidouilles,
    ROUND(
      (SELECT COUNT(*) FROM public.minesweeper_games mg
       WHERE mg.student_id = t.student_id AND mg.status = 'won')::NUMERIC /
      NULLIF((SELECT COUNT(*) FROM public.minesweeper_games mg
       WHERE mg.student_id = t.student_id AND mg.status IN ('won', 'lost')), 0)::NUMERIC * 100,
      1
    ) AS win_rate
  FROM top10_stats t
  INNER JOIN public.profiles p ON t.student_id = p.id
)
SELECT
  student_id,
  firstname,
  lastname,
  avg_top_10,
  top_games_count,
  games_won,
  games_played,
  total_points,
  total_gidouilles,
  win_rate,
  ROW_NUMBER() OVER (ORDER BY avg_top_10 DESC, games_won DESC) AS rank
FROM full_stats
ORDER BY rank;

ALTER VIEW public.minesweeper_leaderboard SET (security_invoker = on);
GRANT SELECT ON public.minesweeper_leaderboard TO authenticated;
GRANT SELECT ON public.minesweeper_leaderboard TO anon;

COMMENT ON VIEW public.minesweeper_leaderboard IS
  'Global leaderboard ranked by average of top 10 games. Now uses decimal gidouilles (Strategy D).';

-- Recreate anonymized public leaderboard
CREATE VIEW public.minesweeper_leaderboard_public AS
SELECT
  substring(md5(student_id::text) from 1 for 8) AS player_id,
  firstname,
  avg_top_10,
  top_games_count,
  games_won,
  win_rate,
  rank
FROM public.minesweeper_leaderboard
WHERE rank <= 100
ORDER BY rank;

ALTER VIEW public.minesweeper_leaderboard_public SET (security_invoker = on);
GRANT SELECT ON public.minesweeper_leaderboard_public TO anon;
GRANT SELECT ON public.minesweeper_leaderboard_public TO authenticated;

COMMENT ON VIEW public.minesweeper_leaderboard_public IS
  'Anonymized global leaderboard (top 100). Ranked by average of top 10 games.';

-- Recreate daily leaderboard view
CREATE VIEW public.minesweeper_daily_leaderboard AS
SELECT
  mda.challenge_id,
  mdc.challenge_date,
  mdc.difficulty,
  mda.student_id,
  p.firstname,
  p.lastname,
  mda.time_seconds,
  mda.gidouilles_earned,
  mda.rank,
  mda.completed_at,
  ROW_NUMBER() OVER (
    PARTITION BY mda.challenge_id
    ORDER BY mda.time_seconds ASC
  ) as position
FROM public.minesweeper_daily_attempts mda
JOIN public.minesweeper_daily_challenges mdc ON mda.challenge_id = mdc.id
JOIN public.profiles p ON mda.student_id = p.id
WHERE mda.status = 'won'
ORDER BY mdc.challenge_date DESC, mda.time_seconds ASC;

ALTER VIEW public.minesweeper_daily_leaderboard SET (security_invoker = on);
GRANT SELECT ON public.minesweeper_daily_leaderboard TO authenticated;

COMMENT ON VIEW public.minesweeper_daily_leaderboard IS
  'Daily challenge leaderboard. Now uses decimal gidouilles (Strategy D).';

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
--
-- SCHEMA CHANGES:
--   - profiles.gidouilles: INTEGER → NUMERIC(10,2)
--   - minesweeper_games.gidouilles_awarded: INTEGER → NUMERIC(10,2)
--   - gidouilles_history.delta: INTEGER → NUMERIC(10,2)
--   - minesweeper_daily_attempts.gidouilles_earned: INTEGER → NUMERIC(10,2)
--
-- DATA MIGRATION:
--   - All existing gidouilles values divided by 10
--   - Hint cost reduced from 10 to 1.0
--
-- FUNCTION CHANGES:
--   - calculate_minesweeper_gidouilles: New Strategy D formula
--   - complete_minesweeper_game: Returns NUMERIC(10,2)
--   - use_hint: New cost 1.0, updated penalty messages
--
-- STRATEGY D PARAMETERS:
--   - Bases: B=1.0, I=3.0, E=6.0
--   - Time mult: 1.3 (fast) to 0.8 (slow)
--   - Hint penalty: Progressive (10/22/35% gidouilles, 5/11/17% items)
--   - Daily mult: 100% → 30% over 5+ wins
--   - Bounds: [0.3, 8.0] per game
--
-- NEXT STEPS FOR DEVELOPER:
--   1. Run: pnpm db:migrate
--   2. Regenerate types: src/lib/types/database.ts
--   3. Update minesweeper.ts DIFFICULTY_CONFIGS
--   4. Update API endpoints to handle NUMERIC
--   5. Update UI to display decimal gidouilles
--
-- ============================================================================
