-- ============================================================================
-- ADD p_metadata PARAMETER TO use_vip_card RPC
-- ============================================================================
--
-- PURPOSE:
-- --------
-- Allow callers to pass contextual metadata (action_type, cards_chosen, etc.)
-- that gets merged into the vip_cards_activity audit trail entry.
-- This enables choose/exchange endpoints to use the RPC atomically instead
-- of doing manual JSONB updates + separate audit inserts (non-atomic).
--
-- Also fixes naming inconsistency: 'consumed_at' → 'used_at' in metadata.
--
-- CHANGES:
--   1. New parameter: p_metadata JSONB DEFAULT NULL
--   2. Metadata merge: base metadata || caller metadata
--   3. Rename consumed_at → used_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.use_vip_card(
  p_student_id UUID,
  p_instance_id TEXT DEFAULT NULL,
  p_card_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
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
BEGIN
  IF p_instance_id IS NULL AND p_card_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Either p_instance_id or p_card_id must be provided'
    );
  END IF;

  v_caller_id := auth.uid();

  -- Auth: must be the student themselves, or a teacher/admin
  IF v_caller_id != p_student_id AND NOT is_teacher_or_admin() THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Only the card owner or a teacher can use cards'
    );
  END IF;

  -- If teacher/admin calling for a student, verify class relationship
  IF v_caller_id != p_student_id AND is_teacher_or_admin() THEN
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

  SELECT vip_cards INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

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
      BEGIN
        v_loop_data := v_vip_cards->v_loop_key;
        v_loop_card_id := v_loop_data->>'cardId';
        v_loop_used_at := v_loop_data->>'usedAt';

        IF v_loop_card_id = p_card_id AND v_loop_used_at IS NULL THEN
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

  SELECT id, name INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  IF v_template IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card template not found: ' || v_card_id
    );
  END IF;

  v_now_str := to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  v_vip_cards := jsonb_set(
    v_vip_cards,
    ARRAY[v_instance_id],
    (v_vip_cards->v_instance_id)
      - 'activationRequestedAt'
      - 'activationRequestedBy'
      - 'activationApprovedAt'
      - 'activationApprovedBy'
      || jsonb_build_object('usedAt', v_now_str)
  );

  -- Build audit metadata: base fields + caller-provided metadata
  v_audit_metadata := jsonb_build_object('used_at', v_now_str)
    || COALESCE(p_metadata, '{}'::JSONB);

  INSERT INTO public.vip_cards_activity (
    student_id, card_instance_id, card_template_id, action, metadata
  ) VALUES (
    p_student_id, v_instance_id, v_card_id, 'used',
    v_audit_metadata
  );

  UPDATE profiles
  SET vip_cards = v_vip_cards, updated_at = v_now
  WHERE id = p_student_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'cardName', v_template.name,
    'instanceId', v_instance_id,
    'cardId', v_card_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_vip_card(UUID, TEXT, TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION public.use_vip_card(UUID, TEXT, TEXT, JSONB) IS
'Marks a VIP card instance as used. Supports lookup by instance ID or by card template ID (FIFO).
Clears activation fields, logs to vip_cards_activity with action=used.
Optional p_metadata is merged into the audit trail entry for contextual info
(e.g. action_type, cards_chosen, exchange_mode).';


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'Migration completed: Add p_metadata to use_vip_card';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '  1. New param: p_metadata JSONB DEFAULT NULL';
  RAISE NOTICE '  2. Metadata merge: {used_at} || caller metadata';
  RAISE NOTICE '  3. Renamed consumed_at → used_at';
  RAISE NOTICE '=========================================================';
END $$;
