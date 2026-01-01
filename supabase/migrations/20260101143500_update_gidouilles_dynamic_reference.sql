-- ============================================================================
-- Migration: Update calculate_minesweeper_gidouilles() for Dynamic Reference Times
-- Purpose: Use cycle-based reference times instead of hardcoded values
-- Date: 2026-01-01
-- ============================================================================
--
-- KEY CHANGES:
-- 1. Get student's grade from profiles table
-- 2. Determine cycle using get_cycle_for_grade()
-- 3. If no grade/cycle: return 0 (no gidouilles awarded)
-- 4. Get dynamic reference_time from minesweeper_reference_times table
--
-- DECISION: Players without a grade defined get NO gidouilles
-- This incentivizes students to properly set their grade level.
--
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
  -- Formula: time_mult = 1.3 - 0.5 * min(1, time/reference)
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
  -- Formula: base * time_mult * (1 - hint_penalty) * daily_mult

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
   Hint penalty: Progressive (10/22/35% gidouilles, 5/11/17% items)
   Daily mult: 100% first win, -15% each, min 30%
   Bounds: 0.3 min, 8.0 max per game';

GRANT EXECUTE ON FUNCTION public.calculate_minesweeper_gidouilles(TEXT, INTEGER, UUID, INTEGER, INTEGER) TO authenticated;

-- ============================================================================
-- Verification: Test with mock data
-- ============================================================================

DO $$
DECLARE
  v_test_id UUID := gen_random_uuid();
  v_result NUMERIC(10,2);
BEGIN
  RAISE NOTICE '=== Dynamic Reference Times Verification ===';

  -- Since we don't have a real student with a grade, we test the edge cases
  -- The function should return 0 for NULL student_id (no profile found)
  v_result := public.calculate_minesweeper_gidouilles('beginner', 100, v_test_id, 0, 0);

  IF v_result = 0.00 THEN
    RAISE NOTICE 'OK: Unknown student returns 0 gidouilles (no grade)';
  ELSE
    RAISE WARNING 'FAIL: Unknown student should return 0, got %', v_result;
  END IF;

  RAISE NOTICE '=== Verification Complete ===';
END;
$$;
