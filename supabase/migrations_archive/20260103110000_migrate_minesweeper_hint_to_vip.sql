-- ============================================================================
-- Migration: Migrate Minesweeper Hint Item to VIP Card
-- Created: 2026-01-03
-- Phase 4 of VIP Cards Unified System
-- ============================================================================
--
-- CONTEXT:
-- The "Indice Demineur" was a shop item. We're migrating it to a VIP card
-- as part of the unified VIP card system. This allows:
-- - Purchase via the VIP card shop
-- - Consistent handling with other VIP cards
-- - Future removal of the shop items system
--
-- MIGRATION STEPS:
-- 1. Create VIP card template "minesweeper-hint"
-- 2. Create helper function to consume VIP hint cards
-- 3. Update use_hint() to check VIP cards FIRST (then items as fallback)
-- 4. Migrate existing item inventory to VIP cards
--
-- ============================================================================

-- ============================================================================
-- PART 1: Create VIP Card Template "minesweeper-hint"
-- ============================================================================

INSERT INTO public.vip_card_templates (
  id,
  name,
  description,
  category,
  rarity,
  image_path,
  action,
  is_enabled,
  base_price,
  is_purchasable,
  max_owned_per_student,
  uses_total
) VALUES (
  'minesweeper-hint',
  'Indice Demineur',
  'Revele une case sure dans le Demineur sans penalite. Utilisable une fois par carte.',
  'consumable',
  'common',
  '/images/vip-cards/minesweeper-hint.webp',
  '{"type": "use_consumable", "context": "minesweeper", "effect": "reveal_safe_cell"}'::JSONB,
  true,
  1,  -- 1 gidouille (same as current hint cost)
  true,
  99, -- Can stock up many
  1   -- Single use per card (1 hint per card)
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  rarity = EXCLUDED.rarity,
  base_price = EXCLUDED.base_price,
  is_purchasable = EXCLUDED.is_purchasable,
  max_owned_per_student = EXCLUDED.max_owned_per_student,
  uses_total = EXCLUDED.uses_total;

-- ============================================================================
-- PART 2: Create Helper Function to Consume VIP Hint Card
-- ============================================================================

CREATE OR REPLACE FUNCTION public.try_consume_vip_hint_card(
  p_student_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vip_cards JSONB;
  v_instance_key TEXT;
  v_instance JSONB;
  v_consumed_instance_id UUID := NULL;
  v_now TIMESTAMPTZ := NOW();
  v_updated_cards JSONB;
BEGIN
  -- Verify caller is the student (security)
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  IF auth.uid() != p_student_id THEN
    RETURN NULL;
  END IF;

  -- Get student's VIP cards with row lock
  SELECT vip_cards INTO v_vip_cards
  FROM public.profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF v_vip_cards IS NULL THEN
    RETURN NULL;
  END IF;

  -- Find a minesweeper-hint card that hasn't been used
  -- Look for: cardId = 'minesweeper-hint' AND usedAt IS NULL
  -- Cards can have usesRemaining (for consumables) - we check either:
  --   1. usesRemaining > 0 (consumable with uses left)
  --   2. usesRemaining IS NULL AND usedAt IS NULL (single-use not consumed)

  FOR v_instance_key, v_instance IN SELECT * FROM jsonb_each(v_vip_cards)
  LOOP
    -- Check if this is a minesweeper-hint card that can be used
    IF v_instance->>'cardId' = 'minesweeper-hint'
       AND (v_instance->>'usedAt') IS NULL THEN

      -- Check usesRemaining for consumables
      IF v_instance->>'usesRemaining' IS NOT NULL THEN
        -- Consumable card - check if has uses left
        IF (v_instance->>'usesRemaining')::INTEGER > 0 THEN
          -- Decrement usesRemaining
          v_updated_cards := v_vip_cards;

          IF (v_instance->>'usesRemaining')::INTEGER = 1 THEN
            -- Last use - mark as used
            v_updated_cards := jsonb_set(
              v_updated_cards,
              ARRAY[v_instance_key, 'usesRemaining'],
              '0'::JSONB
            );
            v_updated_cards := jsonb_set(
              v_updated_cards,
              ARRAY[v_instance_key, 'usedAt'],
              to_jsonb(v_now)
            );
          ELSE
            -- More uses remaining
            v_updated_cards := jsonb_set(
              v_updated_cards,
              ARRAY[v_instance_key, 'usesRemaining'],
              to_jsonb((v_instance->>'usesRemaining')::INTEGER - 1)
            );
          END IF;

          -- Update the profile
          UPDATE public.profiles
          SET vip_cards = v_updated_cards
          WHERE id = p_student_id;

          -- Extract instance ID (the key is the instance ID)
          v_consumed_instance_id := v_instance_key::UUID;

          -- Log the usage
          INSERT INTO public.vip_cards_activity (
            student_id,
            card_id,
            instance_id,
            action,
            metadata
          ) VALUES (
            p_student_id,
            'minesweeper-hint',
            v_consumed_instance_id,
            'consumed',
            jsonb_build_object(
              'context', 'minesweeper',
              'effect', 'reveal_safe_cell',
              'uses_remaining', COALESCE((v_instance->>'usesRemaining')::INTEGER - 1, 0)
            )
          );

          RETURN v_consumed_instance_id;
        END IF;
      ELSE
        -- Single-use card (usesRemaining = null) - mark as used
        v_updated_cards := jsonb_set(
          v_vip_cards,
          ARRAY[v_instance_key, 'usedAt'],
          to_jsonb(v_now)
        );

        -- Update the profile
        UPDATE public.profiles
        SET vip_cards = v_updated_cards
        WHERE id = p_student_id;

        v_consumed_instance_id := v_instance_key::UUID;

        -- Log the usage
        INSERT INTO public.vip_cards_activity (
          student_id,
          card_id,
          instance_id,
          action,
          metadata
        ) VALUES (
          p_student_id,
          'minesweeper-hint',
          v_consumed_instance_id,
          'used',
          jsonb_build_object(
            'context', 'minesweeper',
            'effect', 'reveal_safe_cell'
          )
        );

        RETURN v_consumed_instance_id;
      END IF;
    END IF;
  END LOOP;

  -- No available hint card found
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.try_consume_vip_hint_card IS
  'Attempts to consume a minesweeper-hint VIP card from student profile.vip_cards. Returns instance_id if consumed, NULL if no cards available. Uses FIFO via JSONB iteration order.';

GRANT EXECUTE ON FUNCTION public.try_consume_vip_hint_card TO authenticated;

-- ============================================================================
-- PART 3: Update use_hint() to Check VIP Cards First
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
  v_current_balance NUMERIC(10,2);
  v_consumed_vip_card_id UUID;
  v_consumed_item_id UUID;
  v_used_vip_card BOOLEAN := false;
  v_used_item BOOLEAN := false;
  v_hints_from_items INTEGER;
  v_hint_cost NUMERIC(10,2) := 1.0;  -- Strategy D: 1 gidouille per hint
  v_penalty_notice TEXT;
BEGIN
  -- Step 1: Verify game ownership and get current state
  SELECT student_id, COALESCE(hints_used, 0), COALESCE(hints_from_items, 0)
  INTO v_student_id, v_hints_used, v_hints_from_items
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

  -- Step 3: Try to consume a VIP hint card FIRST (Phase 4 migration)
  v_consumed_vip_card_id := public.try_consume_vip_hint_card(v_student_id);

  IF v_consumed_vip_card_id IS NOT NULL THEN
    -- VIP card was consumed successfully - no gidouilles cost!
    v_used_vip_card := true;

    -- Update game hints counter (counts as item for penalty reduction)
    UPDATE public.minesweeper_games
    SET hints_used = v_hints_used + 1,
        hints_from_items = v_hints_from_items + 1
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

  -- Step 4: Try to consume a shop item as fallback (legacy - will be removed in Phase 7)
  v_consumed_item_id := public.try_consume_minesweeper_hint_item(v_student_id);

  IF v_consumed_item_id IS NOT NULL THEN
    -- Item was consumed successfully - no gidouilles cost!
    v_used_item := true;

    -- Update game hints counter
    UPDATE public.minesweeper_games
    SET hints_used = v_hints_used + 1,
        hints_from_items = v_hints_from_items + 1
    WHERE id = p_game_id;

    v_penalty_notice := 'Item utilise - penalite reduite (5/11/17%)';

    RETURN jsonb_build_object(
      'success', true,
      'hints_used', v_hints_used + 1,
      'hints_remaining', 2 - v_hints_used,
      'source', 'item',
      'item_consumed', true,
      'vip_card_consumed', false,
      'gidouilles_spent', 0,
      'penalty_notice', v_penalty_notice
    );
  END IF;

  -- Step 5: No VIP card or item available - use gidouilles
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

  -- Update game hints counter (NOT from items - full penalty applies)
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
  'Use a hint in Minesweeper. Priority: 1) VIP hint card, 2) Shop item (legacy), 3) Gidouilles (1.0 cost). VIP/Item hints get reduced penalty.';

GRANT EXECUTE ON FUNCTION public.use_hint TO authenticated;

-- ============================================================================
-- PART 4: Migrate Existing Item Inventory to VIP Cards
-- ============================================================================

-- This migrates any existing minesweeper_hint items from student_item_inventory
-- to VIP card instances in profiles.vip_cards

DO $$
DECLARE
  v_record RECORD;
  v_existing_cards JSONB;
  v_new_instance_id UUID;
  v_new_instance JSONB;
  v_quantity INTEGER;
  v_i INTEGER;
BEGIN
  -- Find all students with minesweeper_hint items
  FOR v_record IN
    SELECT
      sii.student_id,
      sii.quantity
    FROM public.student_item_inventory sii
    JOIN public.shop_item_templates sit ON sii.template_id = sit.id
    WHERE sit.internal_name = 'minesweeper_hint'
      AND sii.quantity > 0
      AND sii.is_locked = false
  LOOP
    -- Get current VIP cards
    SELECT COALESCE(vip_cards, '{}'::JSONB) INTO v_existing_cards
    FROM public.profiles
    WHERE id = v_record.student_id;

    -- Create one VIP card instance per item quantity
    v_quantity := v_record.quantity;

    FOR v_i IN 1..v_quantity LOOP
      v_new_instance_id := gen_random_uuid();

      v_new_instance := jsonb_build_object(
        'cardId', 'minesweeper-hint',
        'earnedAt', NOW(),
        'usedAt', NULL,
        'acquiredFrom', 'purchase',  -- Originally purchased as item
        'usesRemaining', 1
      );

      v_existing_cards := jsonb_set(
        v_existing_cards,
        ARRAY[v_new_instance_id::TEXT],
        v_new_instance
      );
    END LOOP;

    -- Update profile with new VIP cards
    UPDATE public.profiles
    SET vip_cards = v_existing_cards
    WHERE id = v_record.student_id;

    -- Log the migration
    INSERT INTO public.vip_cards_activity (
      student_id,
      card_id,
      instance_id,
      action,
      metadata
    ) VALUES (
      v_record.student_id,
      'minesweeper-hint',
      gen_random_uuid(),  -- Just for logging
      'earned',
      jsonb_build_object(
        'reason', 'migrated_from_shop_item',
        'quantity', v_quantity,
        'migration_date', NOW()
      )
    );

    -- Set item quantity to 0 (don't delete - preserve history)
    UPDATE public.student_item_inventory
    SET quantity = 0
    WHERE student_id = v_record.student_id
      AND template_id IN (
        SELECT id FROM public.shop_item_templates
        WHERE internal_name = 'minesweeper_hint'
      );

    RAISE NOTICE 'Migrated % minesweeper_hint items to VIP cards for student %',
                 v_quantity, v_record.student_id;
  END LOOP;
END $$;

-- ============================================================================
-- PART 5: Update Store to Check VIP Cards Count
-- ============================================================================

-- Create a helper function to count available VIP hint cards
CREATE OR REPLACE FUNCTION public.count_vip_hint_cards(
  p_student_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vip_cards JSONB;
  v_count INTEGER := 0;
  v_instance_key TEXT;
  v_instance JSONB;
BEGIN
  -- Verify caller is the student
  IF auth.uid() IS NULL OR auth.uid() != p_student_id THEN
    RETURN 0;
  END IF;

  SELECT vip_cards INTO v_vip_cards
  FROM public.profiles
  WHERE id = p_student_id;

  IF v_vip_cards IS NULL THEN
    RETURN 0;
  END IF;

  -- Count minesweeper-hint cards that are not fully used
  FOR v_instance_key, v_instance IN SELECT * FROM jsonb_each(v_vip_cards)
  LOOP
    IF v_instance->>'cardId' = 'minesweeper-hint'
       AND (v_instance->>'usedAt') IS NULL THEN

      IF v_instance->>'usesRemaining' IS NOT NULL THEN
        IF (v_instance->>'usesRemaining')::INTEGER > 0 THEN
          v_count := v_count + (v_instance->>'usesRemaining')::INTEGER;
        END IF;
      ELSE
        -- Single-use card not consumed
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.count_vip_hint_cards IS
  'Returns the number of available minesweeper-hint uses in student VIP cards. Counts usesRemaining for consumables.';

GRANT EXECUTE ON FUNCTION public.count_vip_hint_cards TO authenticated;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- 1. Created VIP card template "minesweeper-hint" (id: minesweeper-hint)
--    - Price: 1 gidouille (same as direct hint cost)
--    - Category: consumable
--    - uses_total: 1 (single use per card)
--    - draw_weight: 0 (cannot be drawn, only purchased)
--
-- 2. Created try_consume_vip_hint_card() function
--    - Searches profiles.vip_cards for minesweeper-hint cards
--    - Marks card as used (sets usedAt)
--    - Logs to vip_cards_activity
--
-- 3. Updated use_hint() function
--    - Now checks VIP cards FIRST
--    - Falls back to shop items (legacy, will be removed in Phase 7)
--    - Finally uses gidouilles if nothing else available
--    - Returns 'source': 'vip_card' | 'item' | 'gidouilles'
--
-- 4. Migrated existing shop items to VIP cards
--    - student_item_inventory entries converted to profiles.vip_cards
--    - Original item quantities set to 0 (history preserved)
--
-- 5. Created count_vip_hint_cards() helper for UI
-- ============================================================================
