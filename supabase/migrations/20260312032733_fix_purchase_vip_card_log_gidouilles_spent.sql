-- ============================================================================
-- Migration: Log gidouilles spent when purchasing VIP card
-- Created: 2026-03-12
-- ============================================================================
-- BUG: purchase_vip_card() deducts gidouilles from profiles directly but
--      never inserts into gidouilles_activity. This means the gidouilles
--      spending doesn't appear in the student's reward journal.
--
-- FIX: Add INSERT into gidouilles_activity after the gidouilles deduction.
--      The existing trigger will propagate to reward_events automatically.
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
  v_class_id UUID;
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

  -- Security: Validate balance is within safe range
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
  -- LOG GIDOUILLES SPENT
  -- ========================================================================
  -- This was missing: the gidouilles deduction was not logged, so it didn't
  -- appear in the student's reward journal.

  -- Get student's active class for audit trail visibility
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
    -v_template.base_price,
    'Achat carte VIP : ' || v_template.name,
    NULL
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
Logs "gained" to vip_cards_activity and gidouilles spent to gidouilles_activity.';
