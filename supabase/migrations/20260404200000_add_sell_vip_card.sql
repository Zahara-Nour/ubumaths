-- ============================================================================
-- Migration: Add VIP card sell-back feature
-- Created: 2026-04-04
-- ============================================================================
-- Allows students to sell unwanted VIP cards back to the system for gidouilles.
--
-- SELL PRICES (by rarity, ~20% of base rarity price):
--   common: 1g, rare: 3g, epic: 8g, legendary: 15g
--
-- GUARDS:
--   - Card must not be used (usedAt IS NULL)
--   - Card must not have pending activation request
--   - Card must not be locked in marketplace (listing or trade)
--   - 5 minute cooldown after acquisition (anti-misclick)
--   - Consumables with partial uses: prorated price (floor, min 1g)
-- ============================================================================

-- ============================================================================
-- STEP 1: Add sell_price column to vip_card_templates
-- ============================================================================

ALTER TABLE public.vip_card_templates
ADD COLUMN IF NOT EXISTS sell_price INTEGER;

COMMENT ON COLUMN public.vip_card_templates.sell_price IS
'Price in gidouilles when student sells the card back to the system. Based on rarity (~20% of base price).';

-- Populate sell_price by rarity
UPDATE public.vip_card_templates SET sell_price = 1 WHERE rarity = 'common';
UPDATE public.vip_card_templates SET sell_price = 3 WHERE rarity = 'rare';
UPDATE public.vip_card_templates SET sell_price = 8 WHERE rarity = 'epic';
UPDATE public.vip_card_templates SET sell_price = 15 WHERE rarity = 'legendary';

-- ============================================================================
-- STEP 2: Extend vip_cards_activity action constraint to include 'sold'
-- ============================================================================

ALTER TABLE public.vip_cards_activity
DROP CONSTRAINT IF EXISTS vip_cards_activity_action_check;

ALTER TABLE public.vip_cards_activity
ADD CONSTRAINT vip_cards_activity_action_check
CHECK (action IN ('gained', 'used', 'removed', 'traded', 'approved', 'rejected', 'requested', 'sold'));

-- ============================================================================
-- STEP 3: Create sell_vip_card RPC function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sell_vip_card(
  p_student_id UUID,
  p_card_instance_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vip_cards JSONB;
  v_card_instance JSONB;
  v_card_id TEXT;
  v_template RECORD;
  v_current_balance NUMERIC;
  v_sell_price INTEGER;
  v_new_balance NUMERIC;
  v_earned_at TIMESTAMPTZ;
  v_purchased_at TIMESTAMPTZ;
  v_acquired_at TIMESTAMPTZ;
  v_uses_remaining INTEGER;
  v_uses_total INTEGER;
  v_class_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_cooldown_seconds INTEGER := 300; -- 5 minutes
  v_seconds_remaining INTEGER;
  v_is_locked BOOLEAN;
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
      'error', 'Unauthorized: Cannot sell cards for other students'
    );
  END IF;

  -- ========================================================================
  -- GET AND LOCK STUDENT PROFILE
  -- ========================================================================

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

  -- Initialize vip_cards if null
  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

  -- ========================================================================
  -- VALIDATE CARD INSTANCE EXISTS
  -- ========================================================================

  v_card_instance := v_vip_cards -> p_card_instance_id;

  IF v_card_instance IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card instance not found'
    );
  END IF;

  v_card_id := v_card_instance ->> 'cardId';

  -- ========================================================================
  -- VALIDATE CARD NOT USED
  -- ========================================================================

  IF (v_card_instance ->> 'usedAt') IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Cannot sell a card that has already been used'
    );
  END IF;

  -- ========================================================================
  -- VALIDATE NO PENDING ACTIVATION REQUEST
  -- ========================================================================

  IF (v_card_instance ->> 'activationRequestedAt') IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Cannot sell a card with a pending activation request'
    );
  END IF;

  -- ========================================================================
  -- VALIDATE COOLDOWN (5 minutes after acquisition)
  -- ========================================================================

  v_earned_at := (v_card_instance ->> 'earnedAt')::TIMESTAMPTZ;
  v_purchased_at := (v_card_instance ->> 'purchasedAt')::TIMESTAMPTZ;
  -- Use the most recent acquisition timestamp for the cooldown window
  v_acquired_at := GREATEST(v_purchased_at, v_earned_at);

  IF v_acquired_at IS NULL THEN
    -- No acquisition timestamp: block sale as a safe default
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card has no acquisition timestamp; cannot verify cooldown',
      'secondsRemaining', v_cooldown_seconds
    );
  END IF;

  v_seconds_remaining := v_cooldown_seconds - EXTRACT(EPOCH FROM (v_now - v_acquired_at))::INTEGER;

  IF v_seconds_remaining > 0 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Cooldown active: please wait before selling this card',
      'secondsRemaining', v_seconds_remaining
    );
  END IF;

  -- ========================================================================
  -- VALIDATE NOT LOCKED IN MARKETPLACE
  -- ========================================================================

  SELECT EXISTS(
    SELECT 1 FROM marketplace_locked_cards
    WHERE card_instance_id = p_card_instance_id
      AND student_id = p_student_id
  ) INTO v_is_locked;

  IF v_is_locked THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Cannot sell a card that is listed or in a trade on the marketplace'
    );
  END IF;

  -- ========================================================================
  -- GET TEMPLATE AND CALCULATE SELL PRICE
  -- ========================================================================

  SELECT id, name, rarity, sell_price, uses_total
  INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  IF v_template IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card template not found: ' || v_card_id
    );
  END IF;

  IF v_template.sell_price IS NULL OR v_template.sell_price <= 0 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'This card cannot be sold'
    );
  END IF;

  -- Calculate sell price (prorated for partial consumables)
  v_sell_price := v_template.sell_price;
  v_uses_total := v_template.uses_total;

  IF v_uses_total IS NOT NULL AND v_uses_total > 0 THEN
    v_uses_remaining := COALESCE((v_card_instance ->> 'usesRemaining')::INTEGER, v_uses_total);

    IF v_uses_remaining < v_uses_total THEN
      -- Prorated price: floor(sell_price * uses_remaining / uses_total), minimum 1
      v_sell_price := GREATEST(1, FLOOR(v_sell_price::NUMERIC * v_uses_remaining / v_uses_total)::INTEGER);
    END IF;
  END IF;

  -- ========================================================================
  -- PERFORM SALE: Remove card and credit gidouilles
  -- ========================================================================

  v_new_balance := v_current_balance + v_sell_price;

  -- Remove card instance from JSONB
  v_vip_cards := v_vip_cards - p_card_instance_id;

  UPDATE profiles
  SET
    gidouilles = v_new_balance,
    vip_cards = v_vip_cards,
    updated_at = v_now
  WHERE id = p_student_id;

  -- ========================================================================
  -- LOG VIP CARD ACTIVITY
  -- ========================================================================

  INSERT INTO vip_cards_activity (
    student_id,
    card_instance_id,
    card_template_id,
    action,
    metadata
  ) VALUES (
    p_student_id,
    p_card_instance_id,
    v_card_id,
    'sold',
    jsonb_build_object(
      'sell_price', v_sell_price,
      'rarity', v_template.rarity,
      'uses_remaining', v_uses_remaining,
      'uses_total', v_uses_total,
      'old_balance', v_current_balance,
      'new_balance', v_new_balance
    )
  );

  -- ========================================================================
  -- LOG GIDOUILLES ACTIVITY
  -- ========================================================================

  SELECT cm.class_id INTO v_class_id
  FROM class_members cm
  WHERE cm.student_id = p_student_id
    AND cm.status = 'active'
  LIMIT 1;

  INSERT INTO gidouilles_activity (
    student_id,
    class_id,
    delta,
    reason,
    created_by
  ) VALUES (
    p_student_id,
    v_class_id,
    v_sell_price,
    'Vente carte VIP : ' || v_template.name,
    NULL
  );

  -- ========================================================================
  -- RETURN SUCCESS
  -- ========================================================================

  RETURN jsonb_build_object(
    'success', TRUE,
    'sellPrice', v_sell_price,
    'cardId', v_card_id,
    'cardName', v_template.name,
    'oldBalance', v_current_balance,
    'newBalance', v_new_balance
  );
END;
$$;

COMMENT ON FUNCTION public.sell_vip_card(UUID, TEXT) IS
'Sells a VIP card back to the system for gidouilles.
Validates ownership, usage state, cooldown, and marketplace locks.
Prorates price for partially-used consumables (floor, min 1g).
Logs to vip_cards_activity (sold) and gidouilles_activity.';
