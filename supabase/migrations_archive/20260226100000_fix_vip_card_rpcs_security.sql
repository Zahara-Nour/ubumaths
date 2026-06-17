-- ============================================================================
-- Migration: Fix VIP card RPCs security
-- ============================================================================
-- Created: 2026-02-26
--
-- PURPOSE:
-- --------
-- 1. Add AND cm.status = 'active' to class_members checks in all 4 RPCs
--    (approve_vip_card, use_vip_card, remove_vip_card, reject_vip_card)
-- 2. Add teacher-student class relationship check to use_vip_card when
--    called by a teacher/admin (was missing — any teacher could use any
--    student's card)
--
-- Fixes:
--   M-2: RPCs accepted inactive class memberships (left/removed students)
--   M-3: use_vip_card had no class check for teacher callers (IDOR)
-- ============================================================================


-- ============================================================================
-- STEP 1: Update approve_vip_card — add cm.status = 'active'
-- ============================================================================

CREATE OR REPLACE FUNCTION public.approve_vip_card(
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
  v_teacher_id := auth.uid();

  IF NOT is_teacher_or_admin() THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Only teachers can approve VIP cards'
    );
  END IF;

  -- Verify student is in one of the teacher's ACTIVE classes
  IF NOT EXISTS (
    SELECT 1
    FROM class_members cm
    INNER JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = p_student_id
      AND c.teacher_id = v_teacher_id
      AND cm.status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Student is not in your active classes'
    );
  END IF;

  SELECT vip_cards INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

  v_card_data := v_vip_cards->p_instance_id;

  IF v_card_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card instance not found: ' || p_instance_id
    );
  END IF;

  IF v_card_data->>'usedAt' IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card has already been used'
    );
  END IF;

  IF v_card_data->>'activationApprovedAt' IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card has already been approved'
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
    ARRAY[p_instance_id],
    v_card_data || jsonb_build_object(
      'activationApprovedAt', v_now_str,
      'activationApprovedBy', v_teacher_id::TEXT
    )
  );

  INSERT INTO public.vip_cards_activity (
    student_id, card_instance_id, card_template_id, action, metadata
  ) VALUES (
    p_student_id, p_instance_id, v_card_id, 'approved',
    jsonb_build_object('approved_by', v_teacher_id::TEXT, 'approved_at', v_now_str)
  );

  UPDATE profiles
  SET vip_cards = v_vip_cards, updated_at = v_now
  WHERE id = p_student_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'cardName', v_template.name,
    'instanceId', p_instance_id,
    'cardId', v_card_id
  );
END;
$$;


-- ============================================================================
-- STEP 2: Update use_vip_card — add cm.status = 'active' + class check
-- ============================================================================

CREATE OR REPLACE FUNCTION public.use_vip_card(
  p_student_id UUID,
  p_instance_id TEXT DEFAULT NULL,
  p_card_id TEXT DEFAULT NULL
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

  INSERT INTO public.vip_cards_activity (
    student_id, card_instance_id, card_template_id, action, metadata
  ) VALUES (
    p_student_id, v_instance_id, v_card_id, 'used',
    jsonb_build_object('consumed_at', v_now_str)
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


-- ============================================================================
-- STEP 3: Update remove_vip_card — add cm.status = 'active'
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
  v_oldest_instance_id TEXT;
  v_oldest_date TIMESTAMPTZ;
  v_loop_key TEXT;
BEGIN
  v_teacher_id := auth.uid();

  IF NOT is_teacher_or_admin() THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Only teachers can remove VIP cards'
    );
  END IF;

  -- Verify student is in one of the teacher's ACTIVE classes
  IF NOT EXISTS (
    SELECT 1
    FROM class_members cm
    INNER JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = p_student_id
      AND c.teacher_id = v_teacher_id
      AND cm.status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Student is not in your active classes'
    );
  END IF;

  IF p_instance_id IS NULL AND p_card_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Either p_instance_id or p_card_id must be provided'
    );
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
      'error', 'Cannot remove a card that has already been used'
    );
  END IF;

  v_card_id := v_card_data->>'cardId';

  SELECT id, name INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  v_vip_cards := v_vip_cards - v_instance_id;

  INSERT INTO public.vip_cards_activity (
    student_id, card_instance_id, card_template_id, action, metadata
  ) VALUES (
    p_student_id, v_instance_id, v_card_id, 'removed',
    jsonb_build_object(
      'removed_by', v_teacher_id::TEXT,
      'removed_at', to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  );

  UPDATE profiles
  SET vip_cards = v_vip_cards, updated_at = v_now
  WHERE id = p_student_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'cardName', COALESCE(v_template.name, v_card_id),
    'instanceId', v_instance_id,
    'cardId', v_card_id
  );
END;
$$;


-- ============================================================================
-- STEP 4: Update reject_vip_card — add cm.status = 'active'
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
  v_teacher_id := auth.uid();

  IF NOT is_teacher_or_admin() THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Only teachers can reject VIP card activations'
    );
  END IF;

  -- Verify student is in one of the teacher's ACTIVE classes
  IF NOT EXISTS (
    SELECT 1
    FROM class_members cm
    INNER JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = p_student_id
      AND c.teacher_id = v_teacher_id
      AND cm.status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Student is not in your active classes'
    );
  END IF;

  SELECT vip_cards INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

  v_card_data := v_vip_cards->p_instance_id;

  IF v_card_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card instance not found: ' || p_instance_id
    );
  END IF;

  IF v_card_data->>'activationRequestedAt' IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'No pending activation request for this card'
    );
  END IF;

  v_card_id := v_card_data->>'cardId';

  SELECT id, name INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  v_now_str := to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  v_vip_cards := jsonb_set(
    v_vip_cards,
    ARRAY[p_instance_id],
    (v_vip_cards->p_instance_id)
      - 'activationRequestedAt'
      - 'activationRequestedBy'
      - 'activationApprovedAt'
      - 'activationApprovedBy'
  );

  INSERT INTO public.vip_cards_activity (
    student_id, card_instance_id, card_template_id, action, metadata
  ) VALUES (
    p_student_id, p_instance_id, v_card_id, 'rejected',
    jsonb_build_object('rejected_by', v_teacher_id::TEXT, 'rejected_at', v_now_str)
  );

  UPDATE profiles
  SET vip_cards = v_vip_cards, updated_at = v_now
  WHERE id = p_student_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'cardName', COALESCE(v_template.name, v_card_id),
    'instanceId', p_instance_id,
    'cardId', v_card_id
  );
END;
$$;


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'Migration completed: Fix VIP card RPCs security';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '  1. approve_vip_card: added cm.status = ''active''';
  RAISE NOTICE '  2. use_vip_card: added cm.status = ''active'' + class check for teachers';
  RAISE NOTICE '  3. remove_vip_card: added cm.status = ''active''';
  RAISE NOTICE '  4. reject_vip_card: added cm.status = ''active''';
  RAISE NOTICE '=========================================================';
END $$;
