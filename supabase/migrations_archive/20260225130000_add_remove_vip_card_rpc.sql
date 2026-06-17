-- ============================================================================
-- Migration: Add remove_vip_card RPC
-- ============================================================================
-- Created: 2026-02-25
--
-- PURPOSE:
-- --------
-- Replace the JS-side read-modify-write in /api/vip-cards/remove with an
-- atomic RPC that uses FOR UPDATE locking and logs to vip_cards_activity.
--
-- Fixes:
--   1. Race condition: concurrent removals could cause lost updates
--   2. Missing audit trail: removals were not logged to vip_cards_activity
-- ============================================================================


CREATE OR REPLACE FUNCTION public.remove_vip_card(
  p_student_id UUID,
  p_card_id TEXT DEFAULT NULL,
  p_instance_id TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_teacher_id UUID;
  v_vip_cards JSONB;
  v_instance_id TEXT;
  v_card_data JSONB;
  v_card_id TEXT;
  v_template RECORD;
  v_now TIMESTAMPTZ := NOW();
  -- Variables for FIFO search
  v_oldest_instance_id TEXT;
  v_oldest_date TIMESTAMPTZ;
  v_loop_key TEXT;
BEGIN
  -- ========================================================================
  -- AUTH CHECK: teacher/admin required
  -- ========================================================================

  v_teacher_id := auth.uid();

  IF NOT is_teacher_or_admin() THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Only teachers can remove VIP cards'
    );
  END IF;

  -- Verify student is in one of the teacher's classes
  IF NOT EXISTS (
    SELECT 1
    FROM class_members cm
    INNER JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = p_student_id
      AND c.teacher_id = v_teacher_id
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Student is not in your classes'
    );
  END IF;

  -- ========================================================================
  -- INPUT VALIDATION
  -- ========================================================================

  IF p_instance_id IS NULL AND p_card_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Either p_instance_id or p_card_id must be provided'
    );
  END IF;

  -- ========================================================================
  -- GET AND LOCK STUDENT PROFILE
  -- ========================================================================

  SELECT vip_cards INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

  -- ========================================================================
  -- CARD LOOKUP
  -- ========================================================================

  IF p_instance_id IS NOT NULL THEN
    v_instance_id := p_instance_id;
  ELSE
    -- FIFO: find the oldest unused instance of the specified card
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

  -- ========================================================================
  -- FETCH CARD DATA
  -- ========================================================================

  v_card_data := v_vip_cards->v_instance_id;

  IF v_card_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card instance not found: ' || v_instance_id
    );
  END IF;

  -- Check if already used (can only remove unused cards)
  IF v_card_data->>'usedAt' IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Cannot remove a card that has already been used'
    );
  END IF;

  v_card_id := v_card_data->>'cardId';

  -- ========================================================================
  -- GET TEMPLATE NAME
  -- ========================================================================

  SELECT id, name INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  -- ========================================================================
  -- REMOVE INSTANCE FROM JSONB
  -- ========================================================================

  v_vip_cards := v_vip_cards - v_instance_id;

  -- Log to vip_cards_activity
  INSERT INTO public.vip_cards_activity (
    student_id,
    card_instance_id,
    card_template_id,
    action,
    metadata
  ) VALUES (
    p_student_id,
    v_instance_id,
    v_card_id,
    'removed',
    jsonb_build_object(
      'removed_by', v_teacher_id::TEXT,
      'removed_at', to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  );

  -- ========================================================================
  -- UPDATE PROFILE
  -- ========================================================================

  UPDATE profiles
  SET
    vip_cards = v_vip_cards,
    updated_at = v_now
  WHERE id = p_student_id;

  -- ========================================================================
  -- RETURN SUCCESS
  -- ========================================================================

  RETURN jsonb_build_object(
    'success', TRUE,
    'cardName', COALESCE(v_template.name, v_card_id),
    'instanceId', v_instance_id,
    'cardId', v_card_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_vip_card(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.remove_vip_card(UUID, TEXT, TEXT) IS
'Teacher-only RPC to remove a VIP card instance from a student collection.
Lookup: provide p_instance_id for direct access, or p_card_id for FIFO (oldest unused).
Uses FOR UPDATE locking to prevent race conditions.
Logs action=removed to vip_cards_activity with removed_by metadata.';


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'Migration completed: Add remove_vip_card RPC';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '  - Atomic removal with FOR UPDATE locking';
  RAISE NOTICE '  - Audit trail: logs action=removed to vip_cards_activity';
  RAISE NOTICE '  - Lookup by instance_id or card_id (FIFO)';
  RAISE NOTICE '=========================================================';
END $$;
