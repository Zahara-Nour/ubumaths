-- ============================================================================
-- Migration: Refactor VIP Cards Activity Logging Architecture
-- ============================================================================
-- Created: 2026-01-03
--
-- PROBLEM SOLVED:
-- ---------------
-- The previous architecture had TWO mechanisms inserting into vip_cards_activity:
--   1. RPC functions (purchase_vip_card, use_consumable_card) with INSERT statements
--   2. Trigger (log_vip_card_changes) that fires on profiles.vip_cards UPDATE
--
-- This caused duplicate key violations on idx_vip_cards_activity_dedup when both
-- tried to insert at the same millisecond.
--
-- Additionally, the trigger used jsonb_array_elements() but the RPC functions
-- store vip_cards as an OBJECT {"uuid": {...}}, not an ARRAY [{...}].
--
-- NEW ARCHITECTURE:
-- -----------------
-- Clear separation of responsibilities:
--
--   +------------------+------------------+--------------------------------+
--   | Action           | Logged by        | Rationale                      |
--   +------------------+------------------+--------------------------------+
--   | 'gained'         | RPC functions    | RPCs have context (price, etc) |
--   | 'used'           | RPC functions    | RPCs have context (use count)  |
--   | 'removed'        | Trigger ONLY     | Catches admin/manual deletions |
--   +------------------+------------------+--------------------------------+
--
-- CHANGES IN THIS MIGRATION:
-- --------------------------
-- 1. UPDATE award_vip_card_no_cost: Add activity logging for 'gained'
-- 2. UPDATE log_vip_card_changes trigger: Remove 'gained'/'used', keep 'removed' only
-- 3. FIX trigger: Use jsonb_each() for object format instead of jsonb_array_elements()
-- 4. UPDATE purchase_vip_card: Remove ON CONFLICT (no longer needed)
-- 5. UPDATE use_consumable_card: Remove ON CONFLICT (no longer needed)
--
-- ============================================================================


-- ============================================================================
-- STEP 1: UPDATE award_vip_card_no_cost
-- ============================================================================
-- This function awards a card via draw (not purchase). Previously it relied on
-- the trigger to log the 'gained' action, but now it must log explicitly.
-- This provides richer metadata (acquiredFrom = 'draw').

CREATE OR REPLACE FUNCTION public.award_vip_card_no_cost(
  p_student_id UUID,
  p_card_id TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_selected_card_id TEXT;
  v_instance_id UUID;
  v_vip_cards JSONB;
  v_now TIMESTAMPTZ := NOW();
  v_new_instance JSONB;
  v_template RECORD;
BEGIN
  -- ========================================================================
  -- CARD SELECTION
  -- ========================================================================
  -- If no card_id specified, draw random card with weighted rarity probabilities

  IF p_card_id IS NULL THEN
    -- Get active config probabilities from vip_card_config
    WITH config AS (
      SELECT common_probability, rare_probability, epic_probability, legendary_probability
      FROM vip_card_config
      WHERE is_active = TRUE
      LIMIT 1
    ),
    rarity_selection AS (
      SELECT
        CASE
          WHEN random() * 100 < (SELECT common_probability FROM config) THEN 'common'
          WHEN random() * 100 < (SELECT common_probability + rare_probability FROM config) THEN 'rare'
          WHEN random() * 100 < (SELECT common_probability + rare_probability + epic_probability FROM config) THEN 'epic'
          ELSE 'legendary'
        END AS selected_rarity
    )
    SELECT t.id INTO v_selected_card_id
    FROM vip_card_templates t, rarity_selection r
    WHERE t.is_enabled = TRUE
      AND t.rarity = r.selected_rarity
    ORDER BY random()
    LIMIT 1;

    -- Fallback: if no card found for selected rarity, pick any enabled card
    IF v_selected_card_id IS NULL THEN
      SELECT id INTO v_selected_card_id
      FROM vip_card_templates
      WHERE is_enabled = TRUE
      ORDER BY random()
      LIMIT 1;
    END IF;
  ELSE
    v_selected_card_id := p_card_id;
  END IF;

  IF v_selected_card_id IS NULL THEN
    RAISE EXCEPTION 'No VIP card available';
  END IF;

  -- ========================================================================
  -- GET TEMPLATE INFO
  -- ========================================================================

  SELECT uses_total INTO v_template
  FROM vip_card_templates
  WHERE id = v_selected_card_id;

  -- ========================================================================
  -- GET AND LOCK STUDENT'S VIP CARDS
  -- ========================================================================
  -- FOR UPDATE prevents race conditions when multiple awards happen simultaneously

  SELECT vip_cards INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  -- Initialize as empty object if null
  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

  -- ========================================================================
  -- CREATE NEW CARD INSTANCE
  -- ========================================================================
  -- Structure: {"<uuid>": {cardId, earnedAt, usedAt, acquiredFrom, usesRemaining}}

  v_instance_id := gen_random_uuid();
  v_new_instance := jsonb_build_object(
    'cardId', v_selected_card_id,
    'earnedAt', to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'usedAt', NULL,
    'acquiredFrom', 'draw',
    'usesRemaining', v_template.uses_total  -- NULL for single-use, integer for multi-use
  );

  -- Add new instance to collection
  v_vip_cards := v_vip_cards || jsonb_build_object(v_instance_id::TEXT, v_new_instance);

  -- ========================================================================
  -- UPDATE PROFILE
  -- ========================================================================

  UPDATE profiles
  SET
    vip_cards = v_vip_cards,
    updated_at = v_now
  WHERE id = p_student_id;

  -- ========================================================================
  -- LOG ACTIVITY (NEW - was previously handled by trigger)
  -- ========================================================================
  -- We now explicitly log 'gained' actions from RPC functions to ensure
  -- rich metadata and avoid duplicate inserts with the trigger.

  INSERT INTO vip_cards_activity (
    student_id,
    card_instance_id,
    card_template_id,
    action,
    metadata
  ) VALUES (
    p_student_id,
    v_instance_id::TEXT,
    v_selected_card_id,
    'gained',
    jsonb_build_object(
      'acquired_from', 'draw',
      'rarity', (SELECT rarity FROM vip_card_templates WHERE id = v_selected_card_id)
    )
  );

  RETURN v_selected_card_id;
END;
$$;

COMMENT ON FUNCTION public.award_vip_card_no_cost(UUID, TEXT) IS
'Awards a VIP card to a student via random draw (no cost).
Logs the "gained" action to vip_cards_activity with draw metadata.
If p_card_id is NULL, selects a random card based on rarity probabilities.';


-- ============================================================================
-- STEP 2: SIMPLIFY log_vip_card_changes TRIGGER
-- ============================================================================
-- The trigger now ONLY handles 'removed' actions.
-- 'gained' and 'used' are handled by their respective RPC functions.
--
-- This eliminates duplicate inserts and ensures each action is logged
-- with appropriate context by the code that knows the context.
--
-- IMPORTANT: Uses jsonb_each() instead of jsonb_array_elements() because
-- vip_cards is stored as an OBJECT {"uuid": {...}}, not an ARRAY [{...}].

CREATE OR REPLACE FUNCTION public.log_vip_card_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_cards JSONB;
    v_new_cards JSONB;
BEGIN
    -- Only process if vip_cards column actually changed
    IF OLD.vip_cards IS DISTINCT FROM NEW.vip_cards THEN
        -- Default to empty object (not array!) if null
        v_old_cards := COALESCE(OLD.vip_cards, '{}'::JSONB);
        v_new_cards := COALESCE(NEW.vip_cards, '{}'::JSONB);

        -- ====================================================================
        -- LOG REMOVED CARDS ONLY
        -- ====================================================================
        -- Cards present in OLD but not in NEW have been removed.
        -- This catches:
        --   - Admin removing cards via dashboard
        --   - Cards removed during exchanges
        --   - Any direct SQL modifications
        --
        -- We use jsonb_each() because vip_cards is an OBJECT:
        --   {"uuid1": {"cardId": "...", ...}, "uuid2": {...}}
        --
        -- NOT jsonb_array_elements() which expects an ARRAY:
        --   [{"id": "...", "cardId": "..."}, ...]

        INSERT INTO public.vip_cards_activity (
            student_id,
            card_instance_id,
            card_template_id,
            action,
            metadata
        )
        SELECT
            NEW.id,
            old_cards.instance_id,
            old_cards.card_data->>'cardId',
            'removed',
            jsonb_build_object(
                'removed_by', COALESCE(auth.uid()::TEXT, 'system'),
                'removed_at', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                'was_used', (old_cards.card_data->>'usedAt') IS NOT NULL
            )
        FROM jsonb_each(v_old_cards) AS old_cards(instance_id, card_data)
        WHERE NOT EXISTS (
            SELECT 1
            FROM jsonb_each(v_new_cards) AS new_cards(instance_id, card_data)
            WHERE new_cards.instance_id = old_cards.instance_id
        );

        -- ====================================================================
        -- NOTE: 'gained' and 'used' actions are NOT logged here anymore.
        -- They are handled by their respective RPC functions:
        --   - 'gained': purchase_vip_card(), award_vip_card_no_cost()
        --   - 'used': use_consumable_card(), use_vip_card()
        --
        -- This ensures:
        --   1. No duplicate inserts
        --   2. Rich metadata from the RPC that knows the context
        --   3. Clear separation of responsibilities
        -- ====================================================================
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.log_vip_card_changes() IS
'Trigger function that logs ONLY card removals to vip_cards_activity.
Gained and used actions are logged by their respective RPC functions.
Uses jsonb_each() for the object-based vip_cards structure.';


-- ============================================================================
-- STEP 3: UPDATE purchase_vip_card (remove ON CONFLICT)
-- ============================================================================
-- Since the trigger no longer logs 'gained' actions, we don't need ON CONFLICT.
-- The INSERT will always succeed (no duplicate from trigger).

CREATE OR REPLACE FUNCTION public.purchase_vip_card(
  p_student_id UUID,
  p_card_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template RECORD;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_current_owned INTEGER;
  v_instance_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_vip_cards JSONB;
  v_new_instance JSONB;
BEGIN
  -- ========================================================================
  -- SECURITY: Verify caller is the student
  -- ========================================================================
  -- Defense in depth: API endpoint should also verify, but we check here too

  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Authentication required'
    );
  END IF;

  IF auth.uid() != p_student_id THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Cannot purchase cards for other students'
    );
  END IF;

  -- ========================================================================
  -- GET AND VALIDATE CARD TEMPLATE
  -- ========================================================================

  SELECT id, name, rarity, base_price, is_purchasable, max_owned_per_student, is_enabled, uses_total
  INTO v_template
  FROM vip_card_templates
  WHERE id = p_card_id;

  IF v_template IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card not found: ' || p_card_id
    );
  END IF;

  IF NOT v_template.is_enabled THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card is disabled and cannot be purchased'
    );
  END IF;

  IF NOT v_template.is_purchasable THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card is not available for purchase'
    );
  END IF;

  -- ========================================================================
  -- GET AND LOCK STUDENT PROFILE
  -- ========================================================================
  -- FOR UPDATE prevents race conditions during concurrent purchases

  SELECT gidouilles, vip_cards INTO v_current_balance, v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Student not found'
    );
  END IF;

  -- ========================================================================
  -- VALIDATE BALANCE
  -- ========================================================================

  IF v_current_balance < v_template.base_price THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', format('Insufficient balance. Required: %s, Available: %s', v_template.base_price, v_current_balance)
    );
  END IF;

  -- ========================================================================
  -- CHECK OWNERSHIP LIMIT
  -- ========================================================================

  v_current_owned := count_student_active_cards(p_student_id, p_card_id);

  IF v_current_owned >= v_template.max_owned_per_student THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', format('Maximum ownership limit reached (%s/%s)', v_current_owned, v_template.max_owned_per_student),
      'currentOwned', v_current_owned,
      'maxOwned', v_template.max_owned_per_student
    );
  END IF;

  -- ========================================================================
  -- PERFORM PURCHASE
  -- ========================================================================

  v_instance_id := gen_random_uuid();
  v_new_balance := v_current_balance - v_template.base_price;

  -- Security: Validate balance is within safe range (prevent integer overflow)
  IF v_new_balance < 0 OR v_new_balance > 10000000 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Invalid balance calculation detected'
    );
  END IF;

  -- Create new instance with purchase metadata
  v_new_instance := jsonb_build_object(
    'cardId', p_card_id,
    'earnedAt', to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'usedAt', NULL,
    'purchasedAt', to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'acquiredFrom', 'purchase',
    'usesRemaining', v_template.uses_total
  );

  -- Initialize vip_cards if null
  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

  -- Add new instance
  v_vip_cards := v_vip_cards || jsonb_build_object(v_instance_id::TEXT, v_new_instance);

  -- ========================================================================
  -- UPDATE PROFILE
  -- ========================================================================

  UPDATE profiles
  SET
    gidouilles = v_new_balance,
    vip_cards = v_vip_cards,
    updated_at = v_now
  WHERE id = p_student_id;

  -- ========================================================================
  -- LOG ACTIVITY
  -- ========================================================================
  -- This is the ONLY place 'gained' via purchase is logged.
  -- The trigger no longer logs 'gained' actions, so no ON CONFLICT needed.

  INSERT INTO vip_cards_activity (
    student_id,
    card_instance_id,
    card_template_id,
    action,
    metadata
  ) VALUES (
    p_student_id,
    v_instance_id::TEXT,
    p_card_id,
    'gained',
    jsonb_build_object(
      'acquired_from', 'purchase',
      'price_paid', v_template.base_price,
      'old_balance', v_current_balance,
      'new_balance', v_new_balance,
      'rarity', v_template.rarity
    )
  );

  -- ========================================================================
  -- RETURN SUCCESS
  -- ========================================================================

  RETURN jsonb_build_object(
    'success', TRUE,
    'instance', jsonb_build_object(
      'instanceId', v_instance_id::TEXT,
      'cardId', p_card_id,
      'purchasedAt', to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'acquiredFrom', 'purchase',
      'usesRemaining', v_template.uses_total
    ),
    'oldBalance', v_current_balance,
    'newBalance', v_new_balance,
    'priceDeducted', v_template.base_price,
    'currentOwned', v_current_owned + 1,
    'maxOwned', v_template.max_owned_per_student
  );
END;
$$;

COMMENT ON FUNCTION public.purchase_vip_card(UUID, TEXT) IS
'Purchases a VIP card for a student using gidouilles.
Validates balance, ownership limits, and card availability.
Logs the "gained" action to vip_cards_activity with purchase metadata.';


-- ============================================================================
-- STEP 4: UPDATE use_consumable_card (remove ON CONFLICT)
-- ============================================================================
-- Since the trigger no longer logs 'used' actions, we don't need ON CONFLICT.

CREATE OR REPLACE FUNCTION public.use_consumable_card(
  p_student_id UUID,
  p_instance_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vip_cards JSONB;
  v_instance JSONB;
  v_card_id TEXT;
  v_uses_remaining INTEGER;
  v_template RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_is_fully_consumed BOOLEAN;
  v_use_number INTEGER;
BEGIN
  -- ========================================================================
  -- SECURITY: Verify caller is the student
  -- ========================================================================

  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Authentication required'
    );
  END IF;

  IF auth.uid() != p_student_id THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Cannot use another student''s card'
    );
  END IF;

  -- ========================================================================
  -- GET AND LOCK STUDENT'S VIP CARDS
  -- ========================================================================

  SELECT vip_cards INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF v_vip_cards IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Student not found'
    );
  END IF;

  -- ========================================================================
  -- VALIDATE CARD INSTANCE
  -- ========================================================================

  v_instance := v_vip_cards->p_instance_id;

  IF v_instance IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card instance not found'
    );
  END IF;

  -- Check if already fully used
  IF v_instance->>'usedAt' IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card has already been fully used'
    );
  END IF;

  v_card_id := v_instance->>'cardId';

  -- Get template for uses_total info
  SELECT uses_total INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  -- ========================================================================
  -- PROCESS CARD USE
  -- ========================================================================

  v_uses_remaining := (v_instance->>'usesRemaining')::INTEGER;

  -- Handle single-use cards (usesRemaining is null)
  IF v_uses_remaining IS NULL THEN
    -- Single-use card: mark as fully used
    v_instance := v_instance || jsonb_build_object(
      'usedAt', to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );
    v_is_fully_consumed := TRUE;
    v_use_number := 1;
  ELSE
    -- Multi-use consumable card: decrement uses
    IF v_uses_remaining <= 0 THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'Card has no remaining uses'
      );
    END IF;

    v_use_number := COALESCE(v_template.uses_total, 1) - v_uses_remaining + 1;
    v_uses_remaining := v_uses_remaining - 1;
    v_is_fully_consumed := (v_uses_remaining = 0);

    IF v_is_fully_consumed THEN
      v_instance := v_instance || jsonb_build_object(
        'usesRemaining', 0,
        'usedAt', to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      );
    ELSE
      v_instance := v_instance || jsonb_build_object(
        'usesRemaining', v_uses_remaining
      );
    END IF;
  END IF;

  -- ========================================================================
  -- UPDATE PROFILE
  -- ========================================================================

  v_vip_cards := jsonb_set(v_vip_cards, ARRAY[p_instance_id], v_instance);

  UPDATE profiles
  SET
    vip_cards = v_vip_cards,
    updated_at = v_now
  WHERE id = p_student_id;

  -- ========================================================================
  -- LOG ACTIVITY
  -- ========================================================================
  -- This is the ONLY place 'used' actions are logged.
  -- The trigger no longer logs 'used' actions, so no ON CONFLICT needed.

  INSERT INTO vip_cards_activity (
    student_id,
    card_instance_id,
    card_template_id,
    action,
    metadata
  ) VALUES (
    p_student_id,
    p_instance_id,
    v_card_id,
    'used',
    jsonb_build_object(
      'usesRemaining', v_uses_remaining,
      'useNumber', v_use_number,
      'totalUses', COALESCE(v_template.uses_total, 1),
      'fullyConsumed', v_is_fully_consumed
    )
  );

  -- ========================================================================
  -- RETURN SUCCESS
  -- ========================================================================

  RETURN jsonb_build_object(
    'success', TRUE,
    'usesRemaining', v_uses_remaining,
    'isFullyConsumed', v_is_fully_consumed,
    'usedAt', CASE WHEN v_is_fully_consumed THEN to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') ELSE NULL END,
    'activityMetadata', jsonb_build_object(
      'usesRemaining', v_uses_remaining,
      'useNumber', v_use_number,
      'totalUses', COALESCE(v_template.uses_total, 1),
      'fullyConsumed', v_is_fully_consumed
    )
  );
END;
$$;

COMMENT ON FUNCTION public.use_consumable_card(UUID, TEXT) IS
'Uses a VIP card (single-use or multi-use consumable).
For multi-use cards, decrements usesRemaining.
Marks as usedAt when fully consumed.
Logs the "used" action to vip_cards_activity with use metadata.';


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'Migration completed: VIP Cards Activity Logging Refactored';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW ARCHITECTURE:';
  RAISE NOTICE '  - "gained" actions: Logged by RPC functions only';
  RAISE NOTICE '    - purchase_vip_card() -> with price metadata';
  RAISE NOTICE '    - award_vip_card_no_cost() -> with draw metadata';
  RAISE NOTICE '';
  RAISE NOTICE '  - "used" actions: Logged by RPC functions only';
  RAISE NOTICE '    - use_consumable_card() -> with use count metadata';
  RAISE NOTICE '';
  RAISE NOTICE '  - "removed" actions: Logged by trigger only';
  RAISE NOTICE '    - log_vip_card_changes() -> catches admin/manual removals';
  RAISE NOTICE '';
  RAISE NOTICE 'FIXES APPLIED:';
  RAISE NOTICE '  - No more duplicate inserts (trigger + RPC race condition)';
  RAISE NOTICE '  - Trigger now uses jsonb_each() for object format';
  RAISE NOTICE '  - Removed unnecessary ON CONFLICT clauses';
  RAISE NOTICE '=========================================================';
END $$;
