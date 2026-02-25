-- ============================================================================
-- Migration: Split approve_or_use_vip_card into two separate RPCs
-- ============================================================================
-- Created: 2026-02-25
--
-- PURPOSE:
-- --------
-- Replace the unified approve_or_use_vip_card(UUID, TEXT, TEXT, TEXT) with
-- two focused functions:
--
--   1. approve_vip_card(UUID, TEXT) — Teacher approves a student's activation request
--      - Sets activationApprovedAt/By only
--      - NO auto-consume (even for bonus cards)
--
--   2. use_vip_card(UUID, TEXT, TEXT) — Marks a card as used
--      - Sets usedAt, clears activation fields
--      - Lookup by instance_id or card_id (FIFO)
--
-- This separates responsibilities: approve != consume.
-- ============================================================================


-- ============================================================================
-- STEP 1: Create approve_vip_card()
-- ============================================================================
-- Teacher-only function to approve a student's VIP card activation request.
-- Sets approval timestamps but does NOT consume the card.

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
  -- ========================================================================
  -- AUTH CHECK: teacher/admin required
  -- ========================================================================

  v_teacher_id := auth.uid();

  IF NOT is_teacher_or_admin() THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Only teachers can approve VIP cards'
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

  -- Check if already used
  IF v_card_data->>'usedAt' IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card has already been used'
    );
  END IF;

  -- Check if already approved
  IF v_card_data->>'activationApprovedAt' IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card has already been approved'
    );
  END IF;

  v_card_id := v_card_data->>'cardId';

  -- ========================================================================
  -- GET TEMPLATE NAME
  -- ========================================================================

  SELECT id, name INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  IF v_template IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card template not found: ' || v_card_id
    );
  END IF;

  -- Format timestamp
  v_now_str := to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  -- ========================================================================
  -- SET APPROVAL TIMESTAMPS (no consume)
  -- ========================================================================

  v_vip_cards := jsonb_set(
    v_vip_cards,
    ARRAY[p_instance_id],
    v_card_data || jsonb_build_object(
      'activationApprovedAt', v_now_str,
      'activationApprovedBy', v_teacher_id::TEXT
    )
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
    'approved',
    jsonb_build_object(
      'approved_by', v_teacher_id::TEXT,
      'approved_at', v_now_str
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
    'cardName', v_template.name,
    'instanceId', p_instance_id,
    'cardId', v_card_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_vip_card(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.approve_vip_card(UUID, TEXT) IS
'Teacher-only RPC to approve a student VIP card activation request.
Sets activationApprovedAt/By on the JSONB instance. Does NOT consume the card.
Logs action=approved to vip_cards_activity.';


-- ============================================================================
-- STEP 2: Create use_vip_card()
-- ============================================================================
-- Marks a VIP card as used. Can be called by the student themselves
-- or by a teacher/admin.

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
  v_vip_cards JSONB;
  v_instance_id TEXT;
  v_card_data JSONB;
  v_card_id TEXT;
  v_template RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_now_str TEXT;
  -- Variables for FIFO search
  v_oldest_instance_id TEXT;
  v_oldest_date TIMESTAMPTZ;
  v_loop_key TEXT;
BEGIN
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
  -- AUTH CHECK
  -- ========================================================================

  IF auth.uid() != p_student_id AND NOT is_teacher_or_admin() THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Only the card owner or a teacher can consume cards'
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

  -- Check if already used
  IF v_card_data->>'usedAt' IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card has already been used'
    );
  END IF;

  v_card_id := v_card_data->>'cardId';

  -- ========================================================================
  -- GET TEMPLATE NAME
  -- ========================================================================

  SELECT id, name INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  IF v_template IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card template not found: ' || v_card_id
    );
  END IF;

  -- Format timestamp
  v_now_str := to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  -- ========================================================================
  -- CONSUME: set usedAt, clear activation fields
  -- ========================================================================

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
    'used',
    jsonb_build_object(
      'consumed_at', v_now_str
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
    'cardName', v_template.name,
    'instanceId', v_instance_id,
    'cardId', v_card_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_vip_card(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.use_vip_card(UUID, TEXT, TEXT) IS
'Marks a VIP card as used (consumed). Can be called by the card owner or a teacher/admin.
Lookup: provide p_instance_id for direct access, or p_card_id for FIFO (oldest unused).
Sets usedAt, clears activation fields, logs action=used to vip_cards_activity.';


-- ============================================================================
-- STEP 3: Drop the old unified RPC
-- ============================================================================

DROP FUNCTION IF EXISTS public.approve_or_use_vip_card(UUID, TEXT, TEXT, TEXT);


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'Migration completed: Split approve/consume VIP card RPCs';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'CHANGES:';
  RAISE NOTICE '  1. New RPC: approve_vip_card(UUID, TEXT)';
  RAISE NOTICE '     - Teacher approves activation request';
  RAISE NOTICE '     - Sets activationApprovedAt/By only';
  RAISE NOTICE '     - NO auto-consume (even for bonus cards)';
  RAISE NOTICE '  2. New RPC: use_vip_card(UUID, TEXT, TEXT)';
  RAISE NOTICE '     - Marks card as used, clears activation fields';
  RAISE NOTICE '     - Lookup by instance_id or card_id (FIFO)';
  RAISE NOTICE '  3. Dropped: approve_or_use_vip_card(UUID, TEXT, TEXT, TEXT)';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  - Run: pnpm db:migrate';
  RAISE NOTICE '  - Run: pnpm db:types';
  RAISE NOTICE '  - Update endpoints to call new RPCs';
  RAISE NOTICE '=========================================================';
END $$;
