-- Minesweeper Hints System Migration
-- Purpose: Add hint system - spend gidouilles to reveal safe cells with 30% penalty
-- Author: Claude (Supabase Expert)
-- Date: 2025-11-19
--
-- Features:
-- - Students can spend 10 gidouilles per hint (max 3 hints per game)
-- - 30% penalty applied to final rewards if hints used
-- - Full audit trail via gidouilles_history
-- - Server-side validation prevents manipulation
-- - Leaderboard shows hints_used for transparency
--
-- Security:
-- - SECURITY DEFINER function prevents manipulation
-- - Validates game ownership and status
-- - Checks gidouilles balance before deducting
-- - Atomic operations (deduct gidouilles + increment counter)
--
-- Cost Structure:
-- - Hint cost: 10 gidouilles per hint
-- - Penalty: 30% reduction in final reward (0.7 multiplier)
-- - Example: Base 60 gidouilles → 42 gidouilles if hints used

-- ============================================================================
-- PART 1: Add Columns to minesweeper_games
-- ============================================================================

-- Add hints_used column (tracks number of hints used in game)
ALTER TABLE public.minesweeper_games
ADD COLUMN IF NOT EXISTS hints_used INTEGER NOT NULL DEFAULT 0;

-- Add hint_penalty_applied column (tracks if 30% penalty was applied)
ALTER TABLE public.minesweeper_games
ADD COLUMN IF NOT EXISTS hint_penalty_applied BOOLEAN NOT NULL DEFAULT false;

-- Add CHECK constraint: max 3 hints per game
ALTER TABLE public.minesweeper_games
ADD CONSTRAINT valid_hints_used CHECK (
  hints_used >= 0 AND hints_used <= 3
);

COMMENT ON COLUMN public.minesweeper_games.hints_used IS
  'Number of hints used in this game (max 3). Each hint costs 10 gidouilles and triggers 30% penalty on final reward.';

COMMENT ON COLUMN public.minesweeper_games.hint_penalty_applied IS
  'Whether 30% penalty was applied to final reward due to hint usage. Set by complete_minesweeper_game().';

COMMENT ON CONSTRAINT valid_hints_used ON public.minesweeper_games IS
  'Enforces maximum 3 hints per game.';

-- ============================================================================
-- PART 2: Update complete_minesweeper_game() Function - Add Hint Penalty
-- ============================================================================

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
  v_base_gidouilles INTEGER;
  v_final_gidouilles INTEGER;
  v_is_valid BOOLEAN;
  v_hint_penalty_applied BOOLEAN := false;
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

  -- Step 5: Calculate base gidouilles (before hint penalty)
  v_base_gidouilles := public.calculate_minesweeper_gidouilles(
    v_game_record.difficulty,
    v_time_seconds,
    v_game_record.student_id
  );

  -- Step 6: Apply 30% penalty if hints were used
  IF v_game_record.hints_used > 0 THEN
    v_final_gidouilles := FLOOR(v_base_gidouilles * 0.7); -- 30% reduction (70% of original)
    v_hint_penalty_applied := true;
  ELSE
    v_final_gidouilles := v_base_gidouilles;
    v_hint_penalty_applied := false;
  END IF;

  -- Step 7: Update game record
  UPDATE public.minesweeper_games
  SET
    status = 'won',
    grid_state = p_grid_state,
    time_seconds = v_time_seconds,
    gidouilles_awarded = v_final_gidouilles,
    hint_penalty_applied = v_hint_penalty_applied,
    completed_at = NOW()
  WHERE id = p_game_id;

  -- Step 8: Award gidouilles to profile
  IF v_final_gidouilles > 0 THEN
    UPDATE public.profiles
    SET gidouilles = COALESCE(gidouilles, 0) + v_final_gidouilles
    WHERE id = v_game_record.student_id;

    -- Step 9: Insert into gidouilles_history for audit trail
    -- Include note about hint penalty if applicable
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
      v_final_gidouilles,
      CASE
        WHEN v_hint_penalty_applied THEN
          'Minesweeper: ' || v_game_record.difficulty || ' won in ' || v_time_seconds || 's (' || v_game_record.hints_used || ' hints used, 30% penalty applied)'
        ELSE
          'Minesweeper: ' || v_game_record.difficulty || ' won in ' || v_time_seconds || 's'
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

  -- Step 10: Return result
  RETURN QUERY SELECT TRUE, v_final_gidouilles, v_time_seconds;
END;
$$;

COMMENT ON FUNCTION public.complete_minesweeper_game IS
  'Completes a Minesweeper game with server-side validation and reward calculation. Applies 30% penalty to rewards if hints were used. SECURITY DEFINER prevents client manipulation of gidouilles/time. Validates win condition and calculates rewards with daily degressive multiplier and optional hint penalty.';

-- ============================================================================
-- PART 3: Create use_hint() Function
-- ============================================================================

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
  v_hint_cost INTEGER := 10; -- Cost per hint in gidouilles (configurable constant)
  v_current_gidouilles INTEGER;
BEGIN
  -- Step 1: Get game info and validate ownership
  SELECT student_id, hints_used
  INTO v_student_id, v_hints_used
  FROM public.minesweeper_games
  WHERE id = p_game_id
    AND status = 'in_progress'
    AND student_id = auth.uid(); -- Must be authenticated and own the game

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found, not owned by you, or not in progress';
  END IF;

  -- Step 2: Check hint limit (max 3 hints per game)
  IF v_hints_used >= 3 THEN
    RAISE EXCEPTION 'Maximum hints reached (3 per game)';
  END IF;

  -- Step 3: Check student has enough gidouilles
  SELECT gidouilles INTO v_current_gidouilles
  FROM public.profiles
  WHERE id = v_student_id;

  IF v_current_gidouilles < v_hint_cost THEN
    RAISE EXCEPTION 'Insufficient gidouilles (cost: % gidouilles, you have: %)', v_hint_cost, v_current_gidouilles;
  END IF;

  -- Step 4: Deduct gidouilles from student
  UPDATE public.profiles
  SET gidouilles = gidouilles - v_hint_cost
  WHERE id = v_student_id;

  -- Step 5: Record in gidouilles_history for audit trail
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
    -v_hint_cost, -- Negative delta for cost
    'Hint used in Minesweeper game (hint #' || (v_hints_used + 1) || '/3)',
    v_student_id
  FROM public.class_members cm
  WHERE cm.student_id = v_student_id
    AND cm.status = 'active'
  ORDER BY cm.joined_at ASC
  LIMIT 1;

  -- Note: If student has no active classes, history insert is skipped
  -- This is acceptable as gidouilles are still deducted

  -- Step 6: Increment hints_used counter
  UPDATE public.minesweeper_games
  SET hints_used = hints_used + 1
  WHERE id = p_game_id;

  -- Step 7: Return success response with updated counts
  RETURN jsonb_build_object(
    'success', true,
    'hints_used', v_hints_used + 1,
    'hints_remaining', 3 - (v_hints_used + 1),
    'gidouilles_spent', v_hint_cost,
    'remaining_gidouilles', v_current_gidouilles - v_hint_cost,
    'penalty_notice', 'Using hints applies 30% penalty to final reward'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_hint TO authenticated;

COMMENT ON FUNCTION public.use_hint IS
  'Spend 10 gidouilles to use a hint (max 3 per game). Deducts gidouilles, records in history, increments counter. Using hints triggers 30% penalty on final reward. Client handles actual safe cell selection. SECURITY DEFINER prevents manipulation.';

-- ============================================================================
-- PART 4: Update minesweeper_leaderboard View - Add hints_used Column
-- ============================================================================

-- Drop and recreate the view with hints_used column for transparency
DROP VIEW IF EXISTS public.minesweeper_leaderboard;

CREATE VIEW public.minesweeper_leaderboard AS
WITH player_stats AS (
  SELECT
    mg.student_id,
    p.firstname,
    p.lastname,
    mg.difficulty,
    COUNT(*) FILTER (WHERE mg.status = 'won') AS games_won,
    COUNT(*) AS games_played,
    MIN(mg.time_seconds) FILTER (WHERE mg.status = 'won') AS best_time,
    -- Get hints_used for the game with best_time
    (
      SELECT hints_used
      FROM public.minesweeper_games mg2
      WHERE mg2.student_id = mg.student_id
        AND mg2.difficulty = mg.difficulty
        AND mg2.status = 'won'
        AND mg2.time_seconds = MIN(mg.time_seconds) FILTER (WHERE mg.status = 'won')
      LIMIT 1
    ) AS hints_used_best_time,
    SUM(mg.gidouilles_awarded) AS total_gidouilles,
    ROUND(
      (COUNT(*) FILTER (WHERE mg.status = 'won')::NUMERIC / COUNT(*)::NUMERIC) * 100,
      1
    ) AS win_rate
  FROM public.minesweeper_games mg
  INNER JOIN public.profiles p ON mg.student_id = p.id
  WHERE mg.student_id IS NOT NULL  -- Only authenticated users
    AND mg.status IN ('won', 'lost')  -- Only completed games
  GROUP BY mg.student_id, p.firstname, p.lastname, mg.difficulty
  HAVING COUNT(*) FILTER (WHERE mg.status = 'won') > 0  -- At least 1 win
)
SELECT
  student_id,
  firstname,
  lastname,
  difficulty,
  games_won,
  games_played,
  best_time,
  hints_used_best_time AS hints_used, -- Show hints used for their best time
  total_gidouilles,
  win_rate,
  ROW_NUMBER() OVER (
    PARTITION BY difficulty
    ORDER BY best_time ASC, games_won DESC
  ) AS rank
FROM player_stats
ORDER BY difficulty, rank;

-- RLS for leaderboard view (inherits from base tables)
ALTER VIEW public.minesweeper_leaderboard SET (security_invoker = on);

-- Grant access to view
GRANT SELECT ON public.minesweeper_leaderboard TO authenticated;

COMMENT ON VIEW public.minesweeper_leaderboard IS
  'Ranked leaderboard partitioned by difficulty. Includes hints_used for transparency - shows if player used hints in their best time. Only includes authenticated users with at least 1 win.';

-- ============================================================================
-- PART 5: Create Index for Hint-Related Queries
-- ============================================================================

-- Index for querying games by hints_used (analytics)
CREATE INDEX IF NOT EXISTS idx_minesweeper_games_hints_used
  ON public.minesweeper_games(hints_used, difficulty, status)
  WHERE hints_used > 0;

COMMENT ON INDEX idx_minesweeper_games_hints_used IS
  'Optimizes queries for analyzing hint usage patterns and effectiveness.';

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================

-- This migration adds a complete hint system for Minesweeper:
--
-- ✅ COLUMNS ADDED:
--    - minesweeper_games.hints_used (0-3, tracks hints used)
--    - minesweeper_games.hint_penalty_applied (boolean, tracks if penalty applied)
--
-- ✅ CONSTRAINTS:
--    - valid_hints_used: CHECK constraint enforces 0-3 hints per game
--
-- ✅ FUNCTIONS:
--    - use_hint(game_id): Spend 10 gidouilles to use hint (max 3 per game)
--      * Validates game ownership and in_progress status
--      * Checks hint limit and gidouilles balance
--      * Deducts gidouilles atomically
--      * Records in gidouilles_history for audit
--      * Increments hints_used counter
--      * Returns success with updated counts
--    - complete_minesweeper_game(): Modified to apply 30% penalty if hints used
--      * Calculates base gidouilles (before penalty)
--      * Applies 0.7 multiplier if hints_used > 0
--      * Sets hint_penalty_applied flag
--      * Records penalty in gidouilles_history reason
--
-- ✅ VIEW UPDATES:
--    - minesweeper_leaderboard: Added hints_used column for transparency
--      * Shows hints used in player's best time
--      * Allows users to see if top players used hints
--
-- ✅ INDEXES:
--    - idx_minesweeper_games_hints_used: Optimizes hint analytics queries
--
-- ✅ SECURITY:
--    - use_hint() is SECURITY DEFINER with full validation
--    - Validates auth.uid() matches student_id
--    - Validates game is in_progress
--    - Atomic deduction + increment (transaction safety)
--    - Full audit trail via gidouilles_history
--    - No new RLS policies needed (function handles all validation)
--
-- ✅ COST STRUCTURE:
--    - Hint cost: 10 gidouilles per hint
--    - Max hints: 3 per game
--    - Penalty: 30% reduction (0.7 multiplier) on final reward
--    - Example: 60 base gidouilles → 42 final gidouilles if hints used
--    - Penalty applies regardless of number of hints (1, 2, or 3)
--
-- ✅ CLIENT-SIDE IMPLEMENTATION:
--    - Client calls use_hint() function before revealing cell
--    - Client selects safe cell (random unrevealed non-mine cell)
--    - Client reveals cell in UI immediately (optimistic)
--    - If function fails, revert UI and show error
--    - Hint usage is tracked server-side, penalty applied on completion
--
-- ✅ ERROR HANDLING:
--    - Game not found / not owned / not in progress
--    - Maximum hints reached (3)
--    - Insufficient gidouilles
--    - All errors raised as exceptions with clear messages
--
-- NEXT STEPS FOR DEVELOPER:
-- 1. Run: pnpm db:migrate
-- 2. Update src/lib/types/database.ts (regenerate from Supabase)
-- 3. Update DATABASE_SCHEMA.md with new columns and use_hint() function
-- 4. Create API endpoint: POST /api/minesweeper/games/[gameId]/hint
--    - Validates with Zod (gameId UUID)
--    - Calls use_hint(gameId)
--    - Returns result or error
-- 5. Update frontend MinesweeperBoard component:
--    - Add "Use Hint" button (disabled if hints_used >= 3 or insufficient gidouilles)
--    - Show hints remaining (3 - hints_used)
--    - Show cost (10 gidouilles) and penalty warning (30% penalty)
--    - On click: call API, find random unrevealed safe cell, reveal it
--    - Update hints_used counter in UI
-- 6. Update GameStats component:
--    - Show hints_used in game stats
--    - Show "Penalty Applied: -30%" if hints_used > 0
-- 7. Update leaderboard UI:
--    - Display hints_used column
--    - Add visual indicator (icon/badge) for games with hints
-- 8. Consider adding analytics:
--    - Track hint usage rates by difficulty
--    - A/B test different hint costs
--    - Analyze correlation between hints and completion rates
