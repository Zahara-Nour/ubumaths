-- ============================================================================
-- Migration: Unify use_vip_card and use_consumable_card into single RPC
-- Created: 2026-03-02
-- ============================================================================
--
-- CONTEXT:
-- Two parallel systems existed for "using" a VIP card:
--   - use_vip_card(UUID, TEXT, TEXT, JSONB) — teacher/admin uses student's card
--   - use_consumable_card(UUID, TEXT, TEXT) — student uses their own card
--
-- use_vip_card didn't handle usesRemaining or activation_context.
-- use_consumable_card didn't support card_id FIFO lookup or teacher/admin auth.
--
-- SOLUTION:
-- Merge both into a single use_vip_card(UUID, TEXT, TEXT, JSONB, TEXT) that:
--   1. Supports both student self-use AND teacher/admin use
--   2. Handles usesRemaining + single-use uniformly (single-use = 1 use)
--   3. Validates activation_context when template requires it
--   4. Supports both instance_id direct lookup and card_id FIFO lookup
--   5. Merges audit trail metadata from both systems
--   6. Cleans activation fields (from old use_vip_card)
--
-- CALLERS UPDATED:
--   - use_hint() → calls use_vip_card instead of use_consumable_card
--   - use_minesweeper_undo() → calls use_vip_card instead of use_consumable_card
--
-- BACKWARDS COMPATIBILITY:
--   - Existing callers (choose, exchange, activate-add-gidouilles) pass
--     p_context = NULL (default), which skips context validation for cards
--     without activation_context. No changes needed.
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop old functions
-- ============================================================================

DROP FUNCTION IF EXISTS public.use_consumable_card(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.use_vip_card(UUID, TEXT, TEXT, JSONB);

-- ============================================================================
-- STEP 2: Create unified use_vip_card
-- ============================================================================

CREATE OR REPLACE FUNCTION public.use_vip_card(
  p_student_id UUID,
  p_instance_id TEXT DEFAULT NULL,
  p_card_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_context TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_caller_id UUID;
  v_vip_cards JSONB;
  v_instance_id TEXT;
  v_card_data JSONB;
  v_card_id TEXT;
  v_template RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_now_str TEXT;
  v_oldest_instance_id TEXT;
  v_oldest_date TIMESTAMPTZ;
  v_loop_key TEXT;
  v_audit_metadata JSONB;
  v_uses_remaining INTEGER;
  v_is_fully_consumed BOOLEAN;
  v_use_number INTEGER;
  v_game_exists BOOLEAN;
BEGIN
  -- ========================================================================
  -- PARAMETER VALIDATION
  -- ========================================================================

  IF p_instance_id IS NULL AND p_card_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Either p_instance_id or p_card_id must be provided'
    );
  END IF;

  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Authentication required'
    );
  END IF;

  -- ========================================================================
  -- AUTHORIZATION
  -- ========================================================================
  -- Student: can use their own cards (caller == student)
  -- Teacher/admin: can use a student's card if in their class

  IF v_caller_id != p_student_id THEN
    IF NOT is_teacher_or_admin() THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'Unauthorized: Only the card owner or a teacher can use cards'
      );
    END IF;

    -- Teacher/admin must have class relationship with student
    IF NOT EXISTS (
      SELECT 1
      FROM class_members cm
      INNER JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = p_student_id
        AND c.teacher_id = v_caller_id
        AND cm.status = 'active'
    ) THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'Unauthorized: Student is not in your active classes'
      );
    END IF;
  END IF;

  -- ========================================================================
  -- GET AND LOCK STUDENT'S VIP CARDS
  -- ========================================================================

  SELECT vip_cards INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

  -- ========================================================================
  -- RESOLVE CARD INSTANCE (by instance_id or card_id FIFO)
  -- ========================================================================

  IF p_instance_id IS NOT NULL THEN
    v_instance_id := p_instance_id;
  ELSE
    -- FIFO lookup: find oldest unused instance matching card_id
    FOR v_loop_key IN
      SELECT key FROM jsonb_each(v_vip_cards)
    LOOP
      DECLARE
        v_loop_data JSONB;
        v_loop_card_id TEXT;
        v_loop_used_at TEXT;
        v_loop_earned_at TIMESTAMPTZ;
        v_loop_uses_remaining INTEGER;
      BEGIN
        v_loop_data := v_vip_cards->v_loop_key;
        v_loop_card_id := v_loop_data->>'cardId';
        v_loop_used_at := v_loop_data->>'usedAt';

        IF v_loop_card_id = p_card_id AND v_loop_used_at IS NULL THEN
          -- Also check usesRemaining > 0 (for multi-use cards)
          v_loop_uses_remaining := (v_loop_data->>'usesRemaining')::INTEGER;
          IF v_loop_uses_remaining IS NOT NULL AND v_loop_uses_remaining <= 0 THEN
            CONTINUE; -- Skip exhausted multi-use cards
          END IF;

          v_loop_earned_at := (v_loop_data->>'earnedAt')::TIMESTAMPTZ;

          IF v_oldest_date IS NULL OR v_loop_earned_at < v_oldest_date THEN
            v_oldest_date := v_loop_earned_at;
            v_oldest_instance_id := v_loop_key;
          END IF;
        END IF;
      END;
    END LOOP;

    IF v_oldest_instance_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'No unused instance found for card: ' || COALESCE(p_card_id, 'unknown')
      );
    END IF;

    v_instance_id := v_oldest_instance_id;
  END IF;

  -- ========================================================================
  -- VALIDATE CARD INSTANCE
  -- ========================================================================

  v_card_data := v_vip_cards->v_instance_id;

  IF v_card_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card instance not found: ' || v_instance_id
    );
  END IF;

  IF v_card_data->>'usedAt' IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card has already been used'
    );
  END IF;

  v_card_id := v_card_data->>'cardId';

  -- ========================================================================
  -- GET TEMPLATE (for name, activation_context, uses_total)
  -- ========================================================================

  SELECT id, name, activation_context, uses_total INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  IF v_template IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card template not found: ' || v_card_id
    );
  END IF;

  -- ========================================================================
  -- VALIDATE ACTIVATION CONTEXT
  -- ========================================================================
  -- If the template requires an activation_context, the caller must provide
  -- the matching context string. This prevents direct RPC abuse.

  IF v_template.activation_context IS NOT NULL THEN
    IF p_context IS NULL OR p_context != v_template.activation_context THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'This card cannot be used in the current context'
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
  END IF;

  -- ========================================================================
  -- PROCESS CARD USE (unified single-use / multi-use logic)
  -- ========================================================================
  -- Single-use cards have usesRemaining = NULL, treated as 1 remaining use.
  -- This unifies the logic: every card is "multi-use with N uses".

  v_uses_remaining := COALESCE((v_card_data->>'usesRemaining')::INTEGER, 1);

  IF v_uses_remaining <= 0 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card has no remaining uses'
    );
  END IF;

  v_use_number := COALESCE(v_template.uses_total, 1) - v_uses_remaining + 1;
  v_uses_remaining := v_uses_remaining - 1;
  v_is_fully_consumed := (v_uses_remaining = 0);

  v_now_str := to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  -- Update card instance data
  IF v_is_fully_consumed THEN
    -- Fully consumed: set usedAt, clear activation fields
    v_card_data := v_card_data
      - 'activationRequestedAt'
      - 'activationRequestedBy'
      - 'activationApprovedAt'
      - 'activationApprovedBy'
      || jsonb_build_object(
        'usedAt', v_now_str,
        'usesRemaining', 0
      );
  ELSE
    -- Partial use: update usesRemaining only
    v_card_data := v_card_data || jsonb_build_object(
      'usesRemaining', v_uses_remaining
    );
  END IF;

  v_vip_cards := jsonb_set(v_vip_cards, ARRAY[v_instance_id], v_card_data);

  -- ========================================================================
  -- UPDATE PROFILE
  -- ========================================================================

  UPDATE profiles
  SET vip_cards = v_vip_cards, updated_at = v_now
  WHERE id = p_student_id;

  -- ========================================================================
  -- AUDIT TRAIL
  -- ========================================================================
  -- Combine consumable metadata + caller-provided metadata

  v_audit_metadata := jsonb_build_object(
    'used_at', v_now_str,
    'usesRemaining', v_uses_remaining,
    'useNumber', v_use_number,
    'totalUses', COALESCE(v_template.uses_total, 1),
    'fullyConsumed', v_is_fully_consumed,
    'context', p_context
  ) || COALESCE(p_metadata, '{}'::JSONB);

  INSERT INTO public.vip_cards_activity (
    student_id, card_instance_id, card_template_id, action, metadata
  ) VALUES (
    p_student_id, v_instance_id, v_card_id, 'used',
    v_audit_metadata
  );

  -- ========================================================================
  -- RETURN UNIFIED RESULT
  -- ========================================================================

  RETURN jsonb_build_object(
    'success', TRUE,
    'cardName', v_template.name,
    'instanceId', v_instance_id,
    'cardId', v_card_id,
    'usesRemaining', v_uses_remaining,
    'isFullyConsumed', v_is_fully_consumed,
    'usedAt', CASE WHEN v_is_fully_consumed THEN v_now_str ELSE NULL END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_vip_card(UUID, TEXT, TEXT, JSONB, TEXT) TO authenticated;

COMMENT ON FUNCTION public.use_vip_card(UUID, TEXT, TEXT, JSONB, TEXT) IS
'Unified RPC to mark a VIP card instance as used.
Supports both student self-use and teacher/admin use.
Handles single-use and multi-use cards uniformly (single-use = 1 remaining use).
Validates activation_context when template requires it.
Lookup by instance_id (direct) or card_id (FIFO oldest unused).
Clears activation fields on full consumption.
Logs to vip_cards_activity with combined consumable + caller metadata.';

-- ============================================================================
-- STEP 3: Recreate use_hint() to call use_vip_card
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
  v_hint_cost NUMERIC(10,2) := 1.0;
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
    ORDER BY (value->>'earnedAt')::TIMESTAMPTZ ASC
    LIMIT 1;
  END IF;

  -- Step 4: If we found a card, consume it via use_vip_card()
  IF v_hint_instance_id IS NOT NULL THEN
    v_consume_result := public.use_vip_card(v_student_id, v_hint_instance_id, NULL, NULL, 'minesweeper');

    IF (v_consume_result->>'success')::BOOLEAN THEN
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
    -- If use_vip_card failed (e.g., concurrent request), fall through to gidouilles
  END IF;

  -- Step 5: No VIP card available - use gidouilles
  SELECT gidouilles INTO v_current_balance
  FROM public.profiles
  WHERE id = v_student_id
  FOR UPDATE;

  IF v_current_balance < v_hint_cost THEN
    RAISE EXCEPTION 'Insufficient gidouilles. Required: %, Available: %', v_hint_cost, v_current_balance;
  END IF;

  UPDATE public.profiles
  SET gidouilles = gidouilles - v_hint_cost
  WHERE id = v_student_id;

  INSERT INTO public.gidouilles_history (student_id, delta, reason, source_id)
  VALUES (v_student_id, -v_hint_cost, 'Indice Demineur', p_game_id);

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
  'Use a hint in Minesweeper. Priority: 1) VIP hint card (via use_vip_card with minesweeper context), 2) Gidouilles (1.0 cost). VIP hints get reduced penalty.';

GRANT EXECUTE ON FUNCTION public.use_hint TO authenticated;

-- ============================================================================
-- STEP 4: Recreate use_minesweeper_undo() to call use_vip_card
-- ============================================================================

DROP FUNCTION IF EXISTS public.use_minesweeper_undo(UUID, JSONB);

CREATE OR REPLACE FUNCTION public.use_minesweeper_undo(
  p_game_id UUID,
  p_grid_state JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_undo_used BOOLEAN;
  v_instance_id TEXT;
  v_consume_result JSONB;
  v_vip_cards JSONB;
BEGIN
  -- CONCURRENCY NOTE:
  -- Lock order: minesweeper_games (FOR UPDATE here) → profiles (FOR UPDATE inside
  -- use_vip_card). This consistent ordering prevents deadlocks.

  -- Step 1: Verify game ownership, status, and undo not yet used
  SELECT student_id, COALESCE(undo_used, false)
  INTO v_student_id, v_undo_used
  FROM public.minesweeper_games
  WHERE id = p_game_id
    AND student_id = auth.uid()
    AND status = 'in_progress'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Partie non trouvée, pas la vôtre, ou plus en cours'
    );
  END IF;

  IF v_undo_used THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Seconde Chance déjà utilisée dans cette partie'
    );
  END IF;

  -- Step 2: Find oldest unused minesweeper-undo VIP card instance (FIFO)
  SELECT vip_cards INTO v_vip_cards
  FROM public.profiles
  WHERE id = v_student_id;

  IF v_vip_cards IS NOT NULL THEN
    SELECT key INTO v_instance_id
    FROM jsonb_each(v_vip_cards) AS cards(key, value)
    WHERE value->>'cardId' = 'minesweeper-undo'
      AND (value->>'usedAt') IS NULL
      AND (
        (value->>'usesRemaining') IS NULL
        OR (value->>'usesRemaining')::INTEGER > 0
      )
    ORDER BY (value->>'earnedAt')::TIMESTAMPTZ ASC
    LIMIT 1;
  END IF;

  -- Step 3: No card available → fail (no gidouilles fallback)
  IF v_instance_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Aucune carte Seconde Chance disponible'
    );
  END IF;

  -- Step 4: Consume the card via use_vip_card()
  v_consume_result := public.use_vip_card(v_student_id, v_instance_id, NULL, NULL, 'minesweeper');

  IF NOT (v_consume_result->>'success')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', COALESCE(v_consume_result->>'error', 'Échec de la consommation de la carte Seconde Chance')
    );
  END IF;

  -- Step 5: Update game state
  UPDATE public.minesweeper_games
  SET undo_used = true,
      grid_state = p_grid_state,
      updated_at = NOW()
  WHERE id = p_game_id;

  RETURN jsonb_build_object(
    'success', true,
    'source', 'vip_card',
    'message', 'Seconde Chance utilisée avec succès'
  );
END;
$$;

COMMENT ON FUNCTION public.use_minesweeper_undo(UUID, JSONB) IS
  'Uses a "Seconde Chance" VIP card in a Minesweeper game. Consumes the card via use_vip_card() and marks the game as having used undo. No gidouilles fallback.';

GRANT EXECUTE ON FUNCTION public.use_minesweeper_undo(UUID, JSONB) TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_func_exists BOOLEAN;
  v_hint_exists BOOLEAN;
  v_undo_exists BOOLEAN;
  v_old_exists BOOLEAN;
BEGIN
  -- Verify new function exists
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'use_vip_card'
      AND pg_get_function_arguments(p.oid) LIKE '%text%text%jsonb%text%'
  ) INTO v_func_exists;

  -- Verify use_hint exists
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'use_hint'
  ) INTO v_hint_exists;

  -- Verify use_minesweeper_undo exists
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'use_minesweeper_undo'
  ) INTO v_undo_exists;

  -- Verify old function is gone
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'use_consumable_card'
  ) INTO v_old_exists;

  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'Migration: Unify use_vip_card and use_consumable_card';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '  use_vip_card(5 params):     %', CASE WHEN v_func_exists THEN 'OK' ELSE 'MISSING' END;
  RAISE NOTICE '  use_hint:                   %', CASE WHEN v_hint_exists THEN 'OK' ELSE 'MISSING' END;
  RAISE NOTICE '  use_minesweeper_undo:       %', CASE WHEN v_undo_exists THEN 'OK' ELSE 'MISSING' END;
  RAISE NOTICE '  use_consumable_card DROPPED: %', CASE WHEN NOT v_old_exists THEN 'OK' ELSE 'STILL EXISTS' END;
  RAISE NOTICE '=========================================================';

  IF NOT v_func_exists OR NOT v_hint_exists OR NOT v_undo_exists OR v_old_exists THEN
    RAISE EXCEPTION 'Migration verification failed!';
  END IF;
END $$;
