-- ============================================================================
-- Migration: Integrate Minesweeper Hints with Shop System
-- Created: 2025-11-21
-- ============================================================================
-- This migration connects the Minesweeper hint system with the Shop inventory:
-- 1. Creates "Indice Demineur" shop item template
-- 2. Updates use_hint() to first consume items, then fallback to gidouilles
-- 3. Tracks hint source (items vs gidouilles) for penalty calculation
-- 4. When ALL hints come from items, NO 30% penalty is applied
--
-- Benefits of buying hint items:
-- - Same cost (10 gidouilles) but avoids the 30% reward penalty
-- - Can stock up during sales/discounts
-- - Tradeable with other students
-- ============================================================================

-- ============================================================================
-- PART 1: Add Column to Track Hint Sources
-- ============================================================================

-- Add column to track how many hints came from inventory items (vs gidouilles)
ALTER TABLE public.minesweeper_games
ADD COLUMN IF NOT EXISTS hints_from_items INTEGER NOT NULL DEFAULT 0;

-- Add CHECK constraint: hints_from_items cannot exceed hints_used
ALTER TABLE public.minesweeper_games
ADD CONSTRAINT check_hints_from_items_valid CHECK (
  hints_from_items >= 0 AND hints_from_items <= hints_used
);

COMMENT ON COLUMN public.minesweeper_games.hints_from_items IS
  'Number of hints that came from inventory items (vs gidouilles). Used to determine if 30% penalty should be applied. If hints_from_items = hints_used, no penalty.';

COMMENT ON CONSTRAINT check_hints_from_items_valid ON public.minesweeper_games IS
  'Ensures hints_from_items is non-negative and does not exceed total hints_used.';

-- ============================================================================
-- PART 2: Create "Indice Demineur" Shop Item Template
-- ============================================================================

INSERT INTO public.shop_item_templates (
  internal_name,
  display_name,
  description,
  category,
  item_type,
  rarity,
  base_price,
  discount_percentage,
  is_active,
  is_tradeable,
  max_owned_per_student,
  properties,
  icon_url,
  sort_order
) VALUES (
  'minesweeper_hint',                                -- internal_name (unique identifier)
  'Indice Démineur',                                 -- display_name (French)
  'Révèle une case sûre dans une partie de démineur. Évite la pénalité de 30% sur la récompense.',  -- description
  'consumable',                                      -- category
  'hint',                                            -- item_type
  'common',                                          -- rarity
  10,                                                -- base_price (same as current hint cost)
  0,                                                 -- discount_percentage (none by default)
  true,                                              -- is_active
  true,                                              -- is_tradeable
  99,                                                -- max_owned_per_student (can stock up)
  jsonb_build_object(
    'stackable', true,
    'game', 'minesweeper',
    'effect', 'reveal_safe_cell',
    'avoids_penalty', true,
    'uses', 1
  ),                                                 -- properties
  NULL,                                              -- icon_url (use default/emoji)
  10                                                 -- sort_order
) ON CONFLICT (internal_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  properties = EXCLUDED.properties,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- PART 3: Helper Function to Find and Consume Hint Item
-- ============================================================================

-- This function attempts to consume a minesweeper hint item from inventory
-- Returns the inventory_id if successful, NULL otherwise
CREATE OR REPLACE FUNCTION public.try_consume_minesweeper_hint_item(
  p_student_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id UUID;
  v_inventory_id UUID;
  v_quantity INTEGER;
BEGIN
  -- SECURITY: Defense in depth - verify caller is the student
  -- This check is redundant with use_hint() but protects against misuse if called directly
  IF p_student_id != auth.uid() THEN
    RETURN NULL;  -- Silently reject to avoid information leakage
  END IF;

  -- Get the minesweeper_hint template ID
  SELECT id INTO v_template_id
  FROM public.shop_item_templates
  WHERE internal_name = 'minesweeper_hint'
    AND is_active = true;

  IF v_template_id IS NULL THEN
    RETURN NULL;  -- Template not found or inactive
  END IF;

  -- Find an available item in inventory (not locked, has quantity)
  SELECT id, quantity INTO v_inventory_id, v_quantity
  FROM public.student_item_inventory
  WHERE student_id = p_student_id
    AND template_id = v_template_id
    AND NOT is_locked
    AND quantity > 0
  ORDER BY acquired_at ASC  -- Use oldest items first (FIFO)
  LIMIT 1
  FOR UPDATE;  -- Lock the row to prevent concurrent consumption

  IF v_inventory_id IS NULL THEN
    RETURN NULL;  -- No items available
  END IF;

  -- Consume one item
  IF v_quantity > 1 THEN
    -- Decrement quantity
    UPDATE public.student_item_inventory
    SET quantity = quantity - 1,
        last_used_at = NOW(),
        total_uses_count = total_uses_count + 1,
        updated_at = NOW()
    WHERE id = v_inventory_id;
  ELSE
    -- Last item - remove from inventory
    DELETE FROM public.student_item_inventory
    WHERE id = v_inventory_id;
  END IF;

  -- Log the usage
  INSERT INTO public.item_usage_log (
    student_id,
    inventory_id,
    template_id,
    usage_context,
    usage_data,
    effect_applied
  ) VALUES (
    p_student_id,
    v_inventory_id,
    v_template_id,
    'minesweeper',
    jsonb_build_object('action', 'hint_reveal'),
    jsonb_build_object(
      'type', 'hint',
      'avoids_penalty', true,
      'applied_at', NOW()
    )
  );

  RETURN v_inventory_id;
END;
$$;

COMMENT ON FUNCTION public.try_consume_minesweeper_hint_item IS
  'Attempts to consume a minesweeper hint item from student inventory. Returns inventory_id if consumed, NULL if no items available. Uses FIFO (oldest first).';

GRANT EXECUTE ON FUNCTION public.try_consume_minesweeper_hint_item TO authenticated;

-- ============================================================================
-- PART 4: Update use_hint() Function
-- ============================================================================
-- New behavior:
-- 1. First check if student has "Indice Demineur" item in inventory
-- 2. IF item exists: consume it, NO gidouilles cost, increment hints_from_items
-- 3. IF no item: fallback to current behavior (deduct 10 gidouilles)
-- 4. Return whether item was used or gidouilles were spent

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
  -- Cost per hint in gidouilles (configurable constant)
  v_hint_cost INTEGER := 10;
  v_current_gidouilles INTEGER;
  v_consumed_item_id UUID;
  v_used_item BOOLEAN := false;
BEGIN
  -- Step 1: Get game info and validate ownership WITH ROW LOCK
  SELECT student_id, hints_used, COALESCE(hints_from_items, 0)
  INTO v_student_id, v_hints_used, v_hints_from_items
  FROM public.minesweeper_games
  WHERE id = p_game_id
    AND status = 'in_progress'
    AND student_id = auth.uid() -- Must be authenticated and own the game
  FOR UPDATE; -- CRITICAL: Prevents concurrent hint usage (race condition protection)

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

    -- Step 4a: Increment hints_used AND hints_from_items
    UPDATE public.minesweeper_games
    SET hints_used = hints_used + 1,
        hints_from_items = hints_from_items + 1
    WHERE id = p_game_id;

    -- Return success response (item used)
    RETURN jsonb_build_object(
      'success', true,
      'hints_used', v_hints_used + 1,
      'hints_remaining', 3 - (v_hints_used + 1),
      'source', 'item',
      'item_consumed', true,
      'gidouilles_spent', 0,
      'penalty_notice', 'No penalty - hint from inventory item'
    );

  ELSE
    -- No items available - fallback to gidouilles

    -- Step 4b: Check student has enough gidouilles WITH ROW LOCK
    SELECT gidouilles INTO v_current_gidouilles
    FROM public.profiles
    WHERE id = v_student_id
    FOR UPDATE; -- CRITICAL: Prevents negative balance race condition

    IF v_current_gidouilles < v_hint_cost THEN
      RAISE EXCEPTION 'Insufficient gidouilles (cost: % gidouilles, you have: %). You can also buy "Indice Demineur" items from the shop.', v_hint_cost, v_current_gidouilles;
    END IF;

    -- Step 5: Deduct gidouilles from student
    UPDATE public.profiles
    SET gidouilles = gidouilles - v_hint_cost
    WHERE id = v_student_id;

    -- Step 6: Record in gidouilles_history for audit trail
    INSERT INTO public.gidouilles_history (
      student_id,
      delta,
      reason
    ) VALUES (
      v_student_id,
      -v_hint_cost, -- Negative delta for cost
      'Hint used in Minesweeper game (hint #' || (v_hints_used + 1) || '/3)'
    );

    -- Step 7: Increment hints_used counter only (not hints_from_items)
    UPDATE public.minesweeper_games
    SET hints_used = hints_used + 1
    WHERE id = p_game_id;

    -- Return success response (gidouilles spent)
    RETURN jsonb_build_object(
      'success', true,
      'hints_used', v_hints_used + 1,
      'hints_remaining', 3 - (v_hints_used + 1),
      'source', 'gidouilles',
      'item_consumed', false,
      'gidouilles_spent', v_hint_cost,
      'remaining_gidouilles', v_current_gidouilles - v_hint_cost,
      'penalty_notice', 'Using gidouilles hints applies 30% penalty to final reward. Buy "Indice Demineur" items to avoid this!'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_hint TO authenticated;

COMMENT ON FUNCTION public.use_hint IS
  'Use a hint in Minesweeper. First tries to consume an "Indice Demineur" item from inventory (no cost, no penalty). If no items, spends 10 gidouilles (30% penalty on reward). Returns source: "item" or "gidouilles".';

-- ============================================================================
-- PART 5: Update calculate_minesweeper_gidouilles() to Consider Hint Source
-- ============================================================================
-- If ALL hints came from items (hints_from_items = hints_used), no penalty

DROP FUNCTION IF EXISTS public.calculate_minesweeper_gidouilles(TEXT, INTEGER, UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.calculate_minesweeper_gidouilles(
  p_difficulty TEXT,
  p_time_seconds INTEGER,
  p_student_id UUID,
  p_hints_used INTEGER DEFAULT 0,
  p_hints_from_items INTEGER DEFAULT 0  -- NEW: Track item-based hints
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
  v_hint_penalty_multiplier NUMERIC;
  v_games_won_today INTEGER;
  v_degressive_multiplier NUMERIC;
  v_final_reward INTEGER;
  v_today_start TIMESTAMPTZ;
  v_apply_hint_penalty BOOLEAN;
BEGIN
  -- Base rewards by difficulty
  CASE p_difficulty
    WHEN 'beginner' THEN
      v_base_reward := 10;
      -- Time bonus: < 60 seconds = +50%, linear decrease to 0% at 180s
      IF p_time_seconds < 60 THEN
        v_time_bonus_percent := 0.5; -- 50%
      ELSIF p_time_seconds < 180 THEN
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

  -- MODIFIED: Apply hints penalty ONLY if some hints came from gidouilles (not items)
  -- If all hints came from items (p_hints_from_items = p_hints_used), no penalty!
  v_apply_hint_penalty := (p_hints_used > 0) AND (p_hints_from_items < p_hints_used);

  IF v_apply_hint_penalty THEN
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
  'Calculates gidouilles reward for winning a Minesweeper game. Base reward + up to 50% time bonus, then applies hints penalty (30% ONLY if hints were paid with gidouilles, NOT if from items), then daily degressive multiplier. Capped at 100 per game.';

GRANT EXECUTE ON FUNCTION public.calculate_minesweeper_gidouilles TO authenticated;

-- ============================================================================
-- PART 6: Update complete_minesweeper_game() to Pass hints_from_items
-- ============================================================================

DROP FUNCTION IF EXISTS public.complete_minesweeper_game(UUID, JSONB);

CREATE OR REPLACE FUNCTION public.complete_minesweeper_game(
  p_game_id UUID,
  p_grid_state JSONB
)
RETURNS TABLE(
  gidouilles_earned INTEGER,
  achievements JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_record RECORD;
  v_is_valid BOOLEAN;
  v_time_seconds INTEGER;
  v_gidouilles INTEGER;
  v_grid_size INTEGER;
  v_unlocked_achievements JSONB;
  v_hints_from_items INTEGER;
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

  -- Step 3: Validate grid_state size to prevent payload attacks
  v_grid_size := pg_column_size(p_grid_state);
  IF v_grid_size > 100000 THEN -- 100KB limit
    RAISE EXCEPTION 'Grid state too large: exceeds 100KB';
  END IF;

  -- Step 4: Calculate time_seconds (server-side to prevent manipulation)
  IF v_game_record.started_at IS NOT NULL THEN
    v_time_seconds := GREATEST(1, EXTRACT(EPOCH FROM (NOW() - v_game_record.started_at))::INTEGER);
  ELSE
    v_time_seconds := 1; -- Minimal time if started_at is somehow NULL
  END IF;

  -- Get hints_from_items (default to 0 if NULL for backward compatibility)
  v_hints_from_items := COALESCE(v_game_record.hints_from_items, 0);

  -- Step 5: Calculate gidouilles WITH hints_from_items for penalty calculation
  v_gidouilles := public.calculate_minesweeper_gidouilles(
    v_game_record.difficulty,              -- p_difficulty TEXT
    v_time_seconds,                        -- p_time_seconds INTEGER
    v_game_record.student_id,              -- p_student_id UUID
    COALESCE(v_game_record.hints_used, 0), -- p_hints_used INTEGER
    v_hints_from_items                     -- p_hints_from_items INTEGER (NEW!)
  );

  -- Step 6: Update game record with validated data
  UPDATE public.minesweeper_games
  SET
    status = 'won',
    completed_at = NOW(),
    time_seconds = v_time_seconds,
    gidouilles_awarded = v_gidouilles,
    grid_state = p_grid_state -- Store the validated grid
  WHERE id = p_game_id;

  -- Step 7: Award gidouilles to student
  UPDATE public.profiles
  SET gidouilles = COALESCE(gidouilles, 0) + v_gidouilles
  WHERE id = v_game_record.student_id;

  -- Step 8: Record transaction in gidouilles_history for audit trail
  INSERT INTO public.gidouilles_history (student_id, delta, reason)
  VALUES (
    v_game_record.student_id,
    v_gidouilles,
    'Minesweeper win: ' || v_game_record.difficulty || ' (' || v_time_seconds || 's)' ||
      CASE
        WHEN COALESCE(v_game_record.hints_used, 0) > 0 THEN
          ' - ' || v_game_record.hints_used || ' hint(s)' ||
          CASE
            WHEN v_hints_from_items = v_game_record.hints_used THEN ' (no penalty - items)'
            WHEN v_hints_from_items > 0 THEN ' (' || v_hints_from_items || ' from items)'
            ELSE ' (30% penalty)'
          END
        ELSE ''
      END
  );

  -- Step 9: Check and unlock achievements
  v_unlocked_achievements := public.check_and_unlock_achievements(p_game_id);

  -- Step 10: Return gidouilles_earned and achievements
  RETURN QUERY SELECT v_gidouilles, v_unlocked_achievements;
END;
$$;

COMMENT ON FUNCTION public.complete_minesweeper_game(UUID, JSONB) IS
  'Completes a Minesweeper game, validates win condition, calculates rewards (with item-based hint penalty exemption), and unlocks achievements. Returns gidouilles_earned and achievements array.';

GRANT EXECUTE ON FUNCTION public.complete_minesweeper_game TO authenticated;

-- ============================================================================
-- PART 7: Add Index for Item Lookups
-- ============================================================================

-- Index for fast lookup of minesweeper hint items in inventory
CREATE INDEX IF NOT EXISTS idx_inventory_minesweeper_hints
  ON public.student_item_inventory(student_id, template_id)
  WHERE NOT is_locked AND quantity > 0;

COMMENT ON INDEX idx_inventory_minesweeper_hints IS
  'Optimizes lookup of available hint items for use_hint() function.';

-- ============================================================================
-- PART 8: Verification Queries
-- ============================================================================

-- Test the new hint penalty logic
DO $$
DECLARE
  v_no_hints INTEGER;
  v_hints_gidouilles INTEGER;
  v_hints_items INTEGER;
  v_hints_mixed INTEGER;
BEGIN
  -- Test 1: No hints (should get full reward)
  v_no_hints := public.calculate_minesweeper_gidouilles('beginner', 120, gen_random_uuid(), 0, 0);

  -- Test 2: Hints from gidouilles (should get 30% penalty = 70% of reward)
  v_hints_gidouilles := public.calculate_minesweeper_gidouilles('beginner', 120, gen_random_uuid(), 2, 0);

  -- Test 3: ALL hints from items (should get full reward - no penalty!)
  v_hints_items := public.calculate_minesweeper_gidouilles('beginner', 120, gen_random_uuid(), 2, 2);

  -- Test 4: Mixed hints (1 from gidouilles, 1 from item - should get penalty)
  v_hints_mixed := public.calculate_minesweeper_gidouilles('beginner', 120, gen_random_uuid(), 2, 1);

  -- Log results
  RAISE NOTICE 'No hints reward: %', v_no_hints;
  RAISE NOTICE 'Gidouilles hints reward (30%% penalty): %', v_hints_gidouilles;
  RAISE NOTICE 'Item hints reward (no penalty): %', v_hints_items;
  RAISE NOTICE 'Mixed hints reward (30%% penalty): %', v_hints_mixed;

  -- Verify expectations
  IF v_hints_items = v_no_hints THEN
    RAISE NOTICE 'SUCCESS: Item hints correctly avoid penalty';
  ELSE
    RAISE WARNING 'UNEXPECTED: Item hints should equal no hints reward';
  END IF;

  IF v_hints_gidouilles < v_no_hints THEN
    RAISE NOTICE 'SUCCESS: Gidouilles hints correctly apply penalty';
  ELSE
    RAISE WARNING 'UNEXPECTED: Gidouilles hints should have penalty';
  END IF;
END;
$$;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
--
-- CHANGES MADE:
--
-- 1. NEW COLUMN: minesweeper_games.hints_from_items
--    - Tracks how many hints came from inventory items (vs gidouilles)
--    - CHECK constraint ensures hints_from_items <= hints_used
--
-- 2. NEW SHOP ITEM: "Indice Demineur" (minesweeper_hint)
--    - Category: consumable
--    - Price: 10 gidouilles (same as direct hint cost)
--    - Max owned: 99 (can stock up)
--    - Tradeable: yes
--    - Benefit: Avoids 30% penalty on rewards!
--
-- 3. NEW FUNCTION: try_consume_minesweeper_hint_item()
--    - Attempts to consume a minesweeper hint item from inventory
--    - Uses FIFO (oldest items first)
--    - Logs usage to item_usage_log
--    - Returns inventory_id if consumed, NULL if no items
--
-- 4. UPDATED FUNCTION: use_hint()
--    - First tries to consume an item from inventory
--    - If item found: consume it, no gidouilles cost, increment hints_from_items
--    - If no item: fallback to gidouilles (10 cost, 30% penalty warning)
--    - Returns "source": "item" or "gidouilles" for UI feedback
--
-- 5. UPDATED FUNCTION: calculate_minesweeper_gidouilles()
--    - Now accepts p_hints_from_items parameter
--    - Penalty logic: ONLY apply 30% penalty if some hints came from gidouilles
--    - If ALL hints came from items (hints_from_items = hints_used), NO penalty!
--
-- 6. UPDATED FUNCTION: complete_minesweeper_game()
--    - Passes hints_from_items to calculate_minesweeper_gidouilles()
--    - Enhanced audit log message shows hint source details
--
-- 7. NEW INDEX: idx_inventory_minesweeper_hints
--    - Optimizes item lookup in use_hint()
--
-- NEXT STEPS FOR DEVELOPER:
-- 1. Run: pnpm db:migrate
-- 2. Regenerate TypeScript types: src/lib/types/database.ts
-- 3. Update DATABASE_SCHEMA.md with new column and functions
-- 4. Update HintButton.svelte to show hint source in response
-- 5. Consider showing "You have X hint items" in UI
-- 6. Add shop item display in Shop component
-- 7. Test all scenarios:
--    - Use hint with item in inventory (no gidouilles cost, no penalty)
--    - Use hint without item (gidouilles cost, penalty warning)
--    - Win game with all item hints (full reward)
--    - Win game with mixed hints (30% penalty)
--    - Win game with all gidouilles hints (30% penalty)
--
-- ============================================================================
