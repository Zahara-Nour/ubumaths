-- Migration: Extend VIP Cards for Purchase and Consumable Support
-- Created: 2026-01-03
--
-- This migration extends the VIP card system to support:
-- 1. Card purchasing with gidouilles
-- 2. Multi-use consumable cards
--
-- CHANGES TO vip_card_templates:
-- - Add base_price: Price in gidouilles (based on rarity)
-- - Add is_purchasable: Whether card can be bought
-- - Add max_owned_per_student: Limit on active copies per student
-- - Add uses_total: Number of uses for consumable cards (null = single-use)
-- - Add 'consumable' to category check constraint
--
-- INSTANCE CHANGES (profiles.vip_cards JSONB):
-- - Add usesRemaining: Remaining uses for consumables
-- - Add purchasedAt: Timestamp when purchased
-- - Add acquiredFrom: 'draw' | 'purchase' | 'gift' | 'exchange'
--
-- NEW RPC FUNCTIONS:
-- - purchase_vip_card(): Buy a card with gidouilles
-- - use_consumable_card(): Decrement uses and mark as used when exhausted
--
-- RARITY PRICING:
-- - common: 20 gidouilles
-- - rare: 50 gidouilles
-- - epic: 150 gidouilles
-- - legendary: 500 gidouilles

-- ============================================================================
-- ALTER vip_card_templates TABLE
-- ============================================================================

-- Add new columns for purchase and consumable support
ALTER TABLE public.vip_card_templates
  ADD COLUMN IF NOT EXISTS base_price INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_purchasable BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS max_owned_per_student INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS uses_total INTEGER DEFAULT NULL;

-- Add check constraint for base_price
ALTER TABLE public.vip_card_templates
  ADD CONSTRAINT vip_card_templates_base_price_positive
  CHECK (base_price >= 0);

-- Add check constraint for max_owned_per_student
ALTER TABLE public.vip_card_templates
  ADD CONSTRAINT vip_card_templates_max_owned_positive
  CHECK (max_owned_per_student > 0 AND max_owned_per_student <= 100);

-- Add check constraint for uses_total
ALTER TABLE public.vip_card_templates
  ADD CONSTRAINT vip_card_templates_uses_total_positive
  CHECK (uses_total IS NULL OR uses_total > 0);

-- Update category check constraint to include 'consumable'
ALTER TABLE public.vip_card_templates
  DROP CONSTRAINT IF EXISTS vip_card_templates_category_check;

ALTER TABLE public.vip_card_templates
  ADD CONSTRAINT vip_card_templates_category_check
  CHECK (category IS NULL OR category IN ('bonus', 'privilege', 'social', 'power', 'consumable'));

-- Add column comments
COMMENT ON COLUMN public.vip_card_templates.base_price IS 'Price in gidouilles to purchase this card. Defaults based on rarity: common=20, rare=50, epic=150, legendary=500';
COMMENT ON COLUMN public.vip_card_templates.is_purchasable IS 'Whether this card can be purchased with gidouilles';
COMMENT ON COLUMN public.vip_card_templates.max_owned_per_student IS 'Maximum number of active (unused) copies a student can own';
COMMENT ON COLUMN public.vip_card_templates.uses_total IS 'For consumable cards: number of times card can be used. NULL = single-use (current behavior)';

-- ============================================================================
-- UPDATE EXISTING CARDS WITH RARITY-BASED PRICING
-- ============================================================================

-- Set base_price based on rarity for all existing cards
UPDATE public.vip_card_templates
SET base_price = CASE rarity
  WHEN 'common' THEN 20
  WHEN 'rare' THEN 50
  WHEN 'epic' THEN 150
  WHEN 'legendary' THEN 500
  ELSE 0
END
WHERE base_price = 0;

-- All existing cards are purchasable (except disabled ones will still be is_enabled=false)
-- is_purchasable defaults to TRUE, so no update needed

-- ============================================================================
-- CREATE INDEX FOR PURCHASE QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vip_card_templates_purchasable
  ON public.vip_card_templates (is_purchasable, is_enabled)
  WHERE is_purchasable = TRUE AND is_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_vip_card_templates_price
  ON public.vip_card_templates (base_price);

-- ============================================================================
-- HELPER FUNCTION: Count student's active cards of a type
-- ============================================================================

CREATE OR REPLACE FUNCTION public.count_student_active_cards(
  p_student_id UUID,
  p_card_id TEXT,
  p_lock_row BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_vip_cards JSONB;
BEGIN
  -- Get student's VIP cards (with optional row lock for race condition prevention)
  IF p_lock_row THEN
    SELECT vip_cards INTO v_vip_cards
    FROM profiles
    WHERE id = p_student_id
    FOR UPDATE;
  ELSE
    SELECT vip_cards INTO v_vip_cards
    FROM profiles
    WHERE id = p_student_id;
  END IF;

  IF v_vip_cards IS NULL THEN
    RETURN 0;
  END IF;

  -- Count active (unused) instances of the specified card
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM jsonb_each(v_vip_cards) AS cards(instance_id, card_data)
  WHERE card_data->>'cardId' = p_card_id
    AND (card_data->>'usedAt') IS NULL;

  RETURN COALESCE(v_count, 0);
END;
$$;

COMMENT ON FUNCTION public.count_student_active_cards(UUID, TEXT, BOOLEAN) IS
'Counts the number of active (unused) VIP card instances of a specific type owned by a student. Set p_lock_row=TRUE to prevent race conditions during purchase.';

-- ============================================================================
-- RPC FUNCTION: purchase_vip_card
-- ============================================================================

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
  -- SECURITY: Verify caller is the student (defense in depth)
  -- The API endpoint should also verify this, but we check here too
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

  -- Get card template
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

  -- Check if card is enabled
  IF NOT v_template.is_enabled THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card is disabled and cannot be purchased'
    );
  END IF;

  -- Check if card is purchasable
  IF NOT v_template.is_purchasable THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card is not available for purchase'
    );
  END IF;

  -- Get student's current balance and VIP cards
  SELECT gidouilles, vip_cards INTO v_current_balance, v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE; -- Lock the row to prevent race conditions

  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Student not found'
    );
  END IF;

  -- Check balance
  IF v_current_balance < v_template.base_price THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', format('Insufficient balance. Required: %s, Available: %s', v_template.base_price, v_current_balance)
    );
  END IF;

  -- Count current active ownership
  v_current_owned := count_student_active_cards(p_student_id, p_card_id);

  IF v_current_owned >= v_template.max_owned_per_student THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', format('Maximum ownership limit reached (%s/%s)', v_current_owned, v_template.max_owned_per_student),
      'currentOwned', v_current_owned,
      'maxOwned', v_template.max_owned_per_student
    );
  END IF;

  -- All checks passed - perform purchase
  v_instance_id := gen_random_uuid();
  v_new_balance := v_current_balance - v_template.base_price;

  -- SECURITY: Validate balance is within safe range (prevent integer overflow)
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
    'usesRemaining', v_template.uses_total -- NULL for single-use, number for consumables
  );

  -- Initialize vip_cards if null
  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

  -- Add new instance
  v_vip_cards := v_vip_cards || jsonb_build_object(v_instance_id::TEXT, v_new_instance);

  -- Update profile with new balance and card
  UPDATE profiles
  SET
    gidouilles = v_new_balance,
    vip_cards = v_vip_cards,
    updated_at = v_now
  WHERE id = p_student_id;

  -- Log the purchase in activity table
  -- Note: The trigger only logs 'removed' actions, so no conflict possible here
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
'Purchases a VIP card for a student. Deducts gidouilles, respects ownership limits, and logs the transaction.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.purchase_vip_card(UUID, TEXT) TO authenticated;

-- ============================================================================
-- RPC FUNCTION: use_consumable_card
-- ============================================================================

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
  -- SECURITY: Verify caller is the student (defense in depth)
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

  -- Get student's VIP cards with row lock
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

  -- Get the specific instance
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

  -- Get current uses remaining (null for single-use)
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
    -- Consumable card: decrement uses
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

  -- Update the instance in vip_cards
  v_vip_cards := jsonb_set(v_vip_cards, ARRAY[p_instance_id], v_instance);

  -- Update profile
  UPDATE profiles
  SET
    vip_cards = v_vip_cards,
    updated_at = v_now
  WHERE id = p_student_id;

  -- Log the use in activity table
  -- Note: The trigger only logs 'removed' actions, so no conflict possible here
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
'Uses a consumable VIP card. Decrements usesRemaining and marks as usedAt when exhausted. Works for both single-use and multi-use cards.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.use_consumable_card(UUID, TEXT) TO authenticated;

-- ============================================================================
-- UPDATE award_vip_card_no_cost TO SET acquiredFrom AND usesRemaining
-- ============================================================================

-- We need to update the existing award function to include the new fields
-- This ensures backwards compatibility while supporting new features

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
  -- If no card_id specified, draw random card with weighted rarity
  IF p_card_id IS NULL THEN
    -- Get active config probabilities
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

    -- Fallback if no card found for selected rarity
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

  -- Get template for uses_total
  SELECT uses_total INTO v_template
  FROM vip_card_templates
  WHERE id = v_selected_card_id;

  -- Get student's current VIP cards
  SELECT vip_cards INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  -- Initialize if null
  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

  -- Create new instance with draw metadata
  v_instance_id := gen_random_uuid();
  v_new_instance := jsonb_build_object(
    'cardId', v_selected_card_id,
    'earnedAt', to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'usedAt', NULL,
    'acquiredFrom', 'draw',
    'usesRemaining', v_template.uses_total -- NULL for single-use, number for consumables
  );

  -- Add new instance
  v_vip_cards := v_vip_cards || jsonb_build_object(v_instance_id::TEXT, v_new_instance);

  -- Update profile
  UPDATE profiles
  SET
    vip_cards = v_vip_cards,
    updated_at = v_now
  WHERE id = p_student_id;

  -- Log the draw in activity table
  -- Note: The trigger only logs 'removed' actions, so no conflict possible here
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

-- ============================================================================
-- RLS POLICIES FOR NEW FUNCTIONS
-- ============================================================================

-- Students can only purchase cards for themselves
-- This is enforced in the function itself via p_student_id parameter
-- The RLS on profiles table ensures students can only see their own cards

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_common_price INTEGER;
  v_rare_price INTEGER;
  v_epic_price INTEGER;
  v_legendary_price INTEGER;
BEGIN
  -- Verify pricing was applied correctly
  SELECT base_price INTO v_common_price FROM vip_card_templates WHERE rarity = 'common' LIMIT 1;
  SELECT base_price INTO v_rare_price FROM vip_card_templates WHERE rarity = 'rare' LIMIT 1;
  SELECT base_price INTO v_epic_price FROM vip_card_templates WHERE rarity = 'epic' LIMIT 1;
  SELECT base_price INTO v_legendary_price FROM vip_card_templates WHERE rarity = 'legendary' LIMIT 1;

  IF v_common_price != 20 THEN
    RAISE EXCEPTION 'Common price mismatch: expected 20, got %', v_common_price;
  END IF;
  IF v_rare_price != 50 THEN
    RAISE EXCEPTION 'Rare price mismatch: expected 50, got %', v_rare_price;
  END IF;
  IF v_epic_price != 150 THEN
    RAISE EXCEPTION 'Epic price mismatch: expected 150, got %', v_epic_price;
  END IF;
  IF v_legendary_price != 500 THEN
    RAISE EXCEPTION 'Legendary price mismatch: expected 500, got %', v_legendary_price;
  END IF;

  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Rarity pricing verified: common=20, rare=50, epic=150, legendary=500';
  RAISE NOTICE 'New columns added: base_price, is_purchasable, max_owned_per_student, uses_total';
  RAISE NOTICE 'New functions created: purchase_vip_card, use_consumable_card, count_student_active_cards';
  RAISE NOTICE 'Updated function: award_vip_card_no_cost (now includes acquiredFrom and usesRemaining)';
END $$;
