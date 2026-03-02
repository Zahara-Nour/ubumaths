-- Migrate activation_context from a separate column into the action JSONB field.
-- The context is a property of the action, not the template itself.

-- ========================================================================
-- 1. Copy activation_context into action.context for existing templates
-- ========================================================================

UPDATE vip_card_templates
SET action = action || jsonb_build_object('context', activation_context)
WHERE activation_context IS NOT NULL
  AND action IS NOT NULL;

-- ========================================================================
-- 2. Recreate use_vip_card RPC to read context from action JSONB
-- ========================================================================

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
  v_action_context TEXT;
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

  IF v_caller_id != p_student_id THEN
    IF NOT is_teacher_or_admin() THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'Unauthorized: Only the card owner or a teacher can use cards'
      );
    END IF;

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
          v_loop_uses_remaining := (v_loop_data->>'usesRemaining')::INTEGER;
          IF v_loop_uses_remaining IS NOT NULL AND v_loop_uses_remaining <= 0 THEN
            CONTINUE;
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
  -- GET TEMPLATE (for name, action->context, uses_total)
  -- ========================================================================

  SELECT id, name, action, uses_total INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  IF v_template IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card template not found: ' || v_card_id
    );
  END IF;

  -- ========================================================================
  -- VALIDATE ACTIVATION CONTEXT (read from action JSONB)
  -- ========================================================================

  v_action_context := v_template.action->>'context';

  IF v_action_context IS NOT NULL AND v_action_context != 'any' THEN
    IF p_context IS NULL OR p_context != v_action_context THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'This card requires context: ' || v_action_context
      );
    END IF;
  END IF;

  -- ========================================================================
  -- PROCESS CARD USE (unified single-use / multi-use logic)
  -- ========================================================================

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

  IF v_is_fully_consumed THEN
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

COMMENT ON FUNCTION public.use_vip_card(UUID, TEXT, TEXT, JSONB, TEXT) IS
'Unified RPC to mark a VIP card instance as used.
Supports both student self-use and teacher/admin use.
Handles single-use and multi-use cards uniformly.
Context check: verifies p_context matches action->>context (if set).
Game-specific validations are the responsibility of the calling RPC.
Lookup by instance_id (direct) or card_id (FIFO oldest unused).';

-- ========================================================================
-- 3. Drop the activation_context column
-- ========================================================================

ALTER TABLE vip_card_templates DROP COLUMN activation_context;
