-- ============================================================================
-- Migration: Add reject_vip_card RPC
-- ============================================================================
-- Created: 2026-02-25
--
-- PURPOSE:
-- --------
-- Replace the JS-side read-modify-write in /api/vip-cards/reject-activation
-- with an atomic RPC that uses FOR UPDATE locking and logs to vip_cards_activity.
--
-- Also adds 'rejected' to the vip_cards_activity CHECK constraint.
--
-- Fixes:
--   1. Race condition: concurrent reject/approve could cause lost updates
--   2. Missing audit trail: rejections were not logged to vip_cards_activity
-- ============================================================================


-- ============================================================================
-- STEP 1: Add 'rejected' to vip_cards_activity CHECK constraint
-- ============================================================================

ALTER TABLE public.vip_cards_activity
DROP CONSTRAINT IF EXISTS vip_cards_activity_action_check;

ALTER TABLE public.vip_cards_activity
ADD CONSTRAINT vip_cards_activity_action_check
CHECK (action IN ('gained', 'used', 'removed', 'traded', 'approved', 'rejected'));

COMMENT ON COLUMN public.vip_cards_activity.action IS
'Action type: gained, used, removed, traded, approved, or rejected';


-- ============================================================================
-- STEP 2: Update log_vip_cards_to_events to skip 'rejected'
-- ============================================================================
-- Like 'approved', 'rejected' is an intermediate state — not a final event.

CREATE OR REPLACE FUNCTION public.log_vip_cards_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_type public.reward_event_type;
    v_card_name TEXT;
    v_description TEXT;
    v_class_id UUID;
BEGIN
    -- Skip if already logged
    IF EXISTS (
        SELECT 1 FROM public.reward_events
        WHERE source_table = 'vip_cards_activity'
        AND source_id = NEW.id
    ) THEN
        RETURN NEW;
    END IF;

    -- Map action to event type
    -- 'approved' and 'rejected' are intermediate states: skip logging
    CASE NEW.action
        WHEN 'gained' THEN v_event_type := 'earned';
        WHEN 'used' THEN v_event_type := 'used';
        WHEN 'removed' THEN v_event_type := 'removed';
        WHEN 'traded' THEN v_event_type := 'traded';
        WHEN 'approved' THEN RETURN NEW;
        WHEN 'rejected' THEN RETURN NEW;
        ELSE v_event_type := 'earned';
    END CASE;

    -- Get card display name from template
    v_card_name := NEW.card_template_id;

    -- Get student's ACTIVE class for context
    SELECT class_id INTO v_class_id
    FROM public.class_members
    WHERE student_id = NEW.student_id
      AND status = 'active'
    ORDER BY joined_at DESC
    LIMIT 1;

    -- Generate description
    v_description := generate_reward_event_description(
        'vip_card'::public.reward_type,
        v_event_type,
        NULL,
        v_card_name,
        NEW.metadata
    );

    -- Insert into reward_events
    INSERT INTO public.reward_events (
        student_id,
        reward_type,
        event_type,
        item_name,
        description,
        metadata,
        source_table,
        source_id,
        class_id,
        created_by,
        created_at
    ) VALUES (
        NEW.student_id,
        'vip_card',
        v_event_type,
        v_card_name,
        v_description,
        COALESCE(NEW.metadata, '{}') || jsonb_build_object(
            'card_instance_id', NEW.card_instance_id,
            'card_template_id', NEW.card_template_id,
            'action', NEW.action
        ),
        'vip_cards_activity',
        NEW.id,
        v_class_id,
        NULLIF(NEW.metadata->>'removed_by', '')::UUID,
        NEW.created_at
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.log_vip_cards_to_events() IS
'Trigger function that maps vip_cards_activity rows to reward_events.
Maps: gained->earned, used->used, removed->removed, traded->traded.
Skips: approved, rejected (intermediate states, not final reward events).';


-- ============================================================================
-- STEP 3: Create reject_vip_card RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reject_vip_card(
  p_student_id UUID,
  p_instance_id TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_teacher_id UUID;
  v_vip_cards JSONB;
  v_card_data JSONB;
  v_card_id TEXT;
  v_template RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_now_str TEXT;
BEGIN
  -- ========================================================================
  -- AUTH CHECK: teacher/admin required
  -- ========================================================================

  v_teacher_id := auth.uid();

  IF NOT is_teacher_or_admin() THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Only teachers can reject VIP card activations'
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
  -- FETCH CARD DATA
  -- ========================================================================

  v_card_data := v_vip_cards->p_instance_id;

  IF v_card_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card instance not found: ' || p_instance_id
    );
  END IF;

  -- Verify pending activation request exists
  IF v_card_data->>'activationRequestedAt' IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'No pending activation request for this card'
    );
  END IF;

  v_card_id := v_card_data->>'cardId';

  -- ========================================================================
  -- GET TEMPLATE NAME
  -- ========================================================================

  SELECT id, name INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  -- Format timestamp
  v_now_str := to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  -- ========================================================================
  -- CLEAR ACTIVATION REQUEST FIELDS
  -- ========================================================================

  v_vip_cards := jsonb_set(
    v_vip_cards,
    ARRAY[p_instance_id],
    (v_vip_cards->p_instance_id)
      - 'activationRequestedAt'
      - 'activationRequestedBy'
      - 'activationApprovedAt'
      - 'activationApprovedBy'
  );

  -- Log to vip_cards_activity
  INSERT INTO public.vip_cards_activity (
    student_id,
    card_instance_id,
    card_template_id,
    action,
    metadata
  ) VALUES (
    p_student_id,
    p_instance_id,
    v_card_id,
    'rejected',
    jsonb_build_object(
      'rejected_by', v_teacher_id::TEXT,
      'rejected_at', v_now_str
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
    'instanceId', p_instance_id,
    'cardId', v_card_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_vip_card(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.reject_vip_card(UUID, TEXT) IS
'Teacher-only RPC to reject a student VIP card activation request.
Clears activationRequestedAt/By and activationApprovedAt/By fields.
Uses FOR UPDATE locking. Logs action=rejected to vip_cards_activity.';


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'Migration completed: Add reject_vip_card RPC';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '  1. CHECK constraint: added ''rejected'' action';
  RAISE NOTICE '  2. Trigger: log_vip_cards_to_events skips ''rejected''';
  RAISE NOTICE '  3. New RPC: reject_vip_card(UUID, TEXT)';
  RAISE NOTICE '     - Clears activation fields';
  RAISE NOTICE '     - FOR UPDATE locking';
  RAISE NOTICE '     - Logs action=rejected to vip_cards_activity';
  RAISE NOTICE '=========================================================';
END $$;
