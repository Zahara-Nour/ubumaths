-- ============================================================================
-- Migration: Add activation_context check to use_consumable_card
-- Created: 2026-03-02
-- ============================================================================
--
-- PROBLEM:
-- use_consumable_card() consumes any card without checking activation_context.
-- A malicious client could call it directly via RPC to waste a minesweeper-hint
-- card outside of an actual game.
--
-- SOLUTION:
-- 1. Add p_context parameter to use_consumable_card()
-- 2. If template has activation_context, require matching p_context
-- 3. For 'minesweeper' context, verify an in-progress game exists
-- 4. Update use_hint() to pass 'minesweeper' context
--
-- BACKWARDS COMPATIBILITY:
-- p_context defaults to NULL. Existing callers without context continue to
-- work for cards that have no activation_context. Cards WITH activation_context
-- will now be rejected unless the caller passes the correct context.
-- ============================================================================

-- ============================================================================
-- STEP 1: Recreate use_consumable_card with p_context parameter
-- ============================================================================

-- Drop old signature first (2 args), then create new one (3 args)
DROP FUNCTION IF EXISTS public.use_consumable_card(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.use_consumable_card(
  p_student_id UUID,
  p_instance_id TEXT,
  p_context TEXT DEFAULT NULL
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
  v_game_exists BOOLEAN;
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

  -- Get template for uses_total and activation_context
  SELECT uses_total, activation_context INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  -- ========================================================================
  -- VALIDATE ACTIVATION CONTEXT
  -- ========================================================================
  -- If the template requires an activation_context, the caller must provide
  -- the matching context string. This prevents direct RPC abuse.

  IF v_template.activation_context IS NOT NULL THEN
    -- Caller must provide a context
    IF p_context IS NULL OR p_context != v_template.activation_context THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'Invalid activation context. Expected: ' || v_template.activation_context
      );
    END IF;

    -- Context-specific validation
    IF v_template.activation_context = 'minesweeper' THEN
      SELECT EXISTS(
        SELECT 1 FROM minesweeper_games
        WHERE student_id = p_student_id
          AND status = 'in_progress'
      ) INTO v_game_exists;

      IF NOT v_game_exists THEN
        RETURN jsonb_build_object(
          'success', FALSE,
          'error', 'No minesweeper game in progress'
        );
      END IF;
    END IF;
    -- 'any' context: no additional validation needed
  END IF;

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
      'fullyConsumed', v_is_fully_consumed,
      'context', p_context
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

COMMENT ON FUNCTION public.use_consumable_card(UUID, TEXT, TEXT) IS
'Uses a VIP card (single-use or multi-use consumable).
If the template has an activation_context, the caller must provide matching p_context.
For minesweeper context, verifies an in-progress game exists.
Decrements usesRemaining and marks as usedAt when fully consumed.';

GRANT EXECUTE ON FUNCTION public.use_consumable_card(UUID, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- STEP 2: Update use_hint() to pass context to use_consumable_card
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
  v_current_balance NUMERIC(10,2);
  v_hint_instance_id TEXT;
  v_consume_result JSONB;
  v_hint_cost NUMERIC(10,2) := 1.0;  -- Strategy D: 1 gidouille per hint
  v_penalty_notice TEXT;
  v_vip_cards JSONB;
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
  'Use a hint in Minesweeper. Priority: 1) VIP hint card (via use_consumable_card with minesweeper context), 2) Gidouilles (1.0 cost). VIP hints get reduced penalty.';

GRANT EXECUTE ON FUNCTION public.use_hint TO authenticated;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- 1. use_consumable_card() now has p_context TEXT DEFAULT NULL parameter
--    - If template has activation_context, p_context must match
--    - For 'minesweeper': verifies an in-progress game exists
--    - For 'any': no additional check
--    - Cards without activation_context: no change (p_context ignored)
-- 2. use_hint() passes 'minesweeper' as context to use_consumable_card()
-- 3. Activity log now includes 'context' in metadata
-- ============================================================================
