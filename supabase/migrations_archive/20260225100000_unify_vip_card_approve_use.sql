-- ============================================================================
-- Migration: Unify VIP Card Approve & Use into Single RPC
-- ============================================================================
-- Created: 2026-02-25
--
-- PURPOSE:
-- --------
-- Replace the old use_vip_card(UUID, TEXT) RPC with a unified
-- approve_or_use_vip_card() that handles both teacher approval
-- and card consumption in a single function. This supports:
--
--   1. APPROVE mode: Teacher approves a student's activation request
--      - For bonus cards (no action): auto-consumes immediately
--      - For action cards (has action): sets approval timestamps only
--
--   2. CONSUME mode: Marks a card as used (clears activation fields)
--
-- CHANGES:
-- --------
-- 1. Add 'approved' to vip_cards_activity CHECK constraint
-- 2. Create approve_or_use_vip_card() RPC
-- 3. Update log_vip_cards_to_events trigger to skip 'approved' action
-- 4. Drop old use_vip_card(UUID, TEXT) RPC
--
-- ============================================================================


-- ============================================================================
-- STEP 1: Add 'approved' to vip_cards_activity CHECK constraint
-- ============================================================================
-- Current constraint allows: 'gained', 'used', 'removed', 'traded'
-- New constraint allows: 'gained', 'used', 'removed', 'traded', 'approved'

ALTER TABLE public.vip_cards_activity
DROP CONSTRAINT IF EXISTS vip_cards_activity_action_check;

ALTER TABLE public.vip_cards_activity
ADD CONSTRAINT vip_cards_activity_action_check
CHECK (action IN ('gained', 'used', 'removed', 'traded', 'approved'));

COMMENT ON COLUMN public.vip_cards_activity.action IS
'Action type: gained, used, removed, traded, or approved';


-- ============================================================================
-- STEP 2: Create approve_or_use_vip_card() RPC
-- ============================================================================
-- Unified function that handles both approval and consumption of VIP cards.
--
-- PARAMETERS:
--   p_student_id   - The student who owns the card
--   p_instance_id  - Specific instance UUID key in the JSONB (optional)
--   p_card_id      - Template ID; finds oldest unused instance (optional)
--   p_mode         - 'approve' or 'consume'
--
-- At least one of p_instance_id or p_card_id must be provided.
--
-- APPROVE MODE:
--   - Requires teacher auth (is_teacher_or_admin + student in class)
--   - For bonus cards (template.action IS NULL): auto-consumes
--   - For action cards (template.action IS NOT NULL): sets approval timestamps
--
-- CONSUME MODE:
--   - Sets usedAt, clears activation fields
--   - Auth: caller must be the student themselves or a teacher/admin
--
-- RETURNS JSONB: {success: bool, error?: string, autoConsumed?: bool,
--                 cardName?: string, instanceId?: string, cardId?: string}

CREATE OR REPLACE FUNCTION public.approve_or_use_vip_card(
  p_student_id UUID,
  p_instance_id TEXT DEFAULT NULL,
  p_card_id TEXT DEFAULT NULL,
  p_mode TEXT DEFAULT 'approve'
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
  v_has_action BOOLEAN;
  v_auto_consumed BOOLEAN := FALSE;
  v_now TIMESTAMPTZ := NOW();
  v_now_str TEXT;
  -- Variables for FIFO search (when p_card_id provided without p_instance_id)
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

  IF p_mode NOT IN ('approve', 'consume') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'p_mode must be ''approve'' or ''consume'''
    );
  END IF;

  -- ========================================================================
  -- AUTH CHECK (approve mode: teacher/admin required)
  -- ========================================================================
  -- Teachers must be authenticated and the student must be in their class.
  -- Consume mode has its own ownership check below.

  IF p_mode = 'approve' THEN
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
  END IF;

  -- ========================================================================
  -- GET AND LOCK STUDENT PROFILE
  -- ========================================================================
  -- FOR UPDATE prevents race conditions during concurrent operations

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
  -- If p_instance_id is provided, use it directly.
  -- If p_card_id is provided (without p_instance_id), find the oldest
  -- unused instance via FIFO two-pass search.

  IF p_instance_id IS NOT NULL THEN
    v_instance_id := p_instance_id;
  ELSE
    -- Two-pass FIFO: find the oldest unused instance of the specified card
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
  -- FETCH CARD DATA FROM JSONB
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
  -- GET TEMPLATE FROM vip_card_templates
  -- ========================================================================
  -- We need to know if the card has an action (action IS NOT NULL)

  SELECT id, name, action
  INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  IF v_template IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card template not found: ' || v_card_id
    );
  END IF;

  v_has_action := (v_template.action IS NOT NULL);

  -- Format timestamp consistently with existing code
  v_now_str := to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  -- ========================================================================
  -- MODE: APPROVE
  -- ========================================================================

  IF p_mode = 'approve' THEN

    -- For action cards: reject if already approved (student must activate themselves)
    -- For bonus cards: allow re-entry to consume them even if already approved
    IF v_card_data->>'activationApprovedAt' IS NOT NULL AND v_has_action THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'Card has already been approved'
      );
    END IF;

    -- Set approval timestamps on the instance
    v_vip_cards := jsonb_set(
      v_vip_cards,
      ARRAY[v_instance_id],
      v_card_data || jsonb_build_object(
        'activationApprovedAt', v_now_str,
        'activationApprovedBy', v_teacher_id::TEXT
      )
    );

    IF NOT v_has_action THEN
      -- ----------------------------------------------------------------
      -- BONUS CARD (no action): auto-consume on approval
      -- ----------------------------------------------------------------
      -- Since bonus cards have no in-game action to perform, approval
      -- means they are immediately consumed.

      v_auto_consumed := TRUE;

      -- Also set usedAt since we are consuming
      v_vip_cards := jsonb_set(
        v_vip_cards,
        ARRAY[v_instance_id, 'usedAt'],
        to_jsonb(v_now_str)
      );

      -- Log to vip_cards_activity with action='used' (auto-consumed)
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
          'auto_consumed', TRUE,
          'approved_by', v_teacher_id::TEXT,
          'approved_at', v_now_str
        )
      );

    ELSE
      -- ----------------------------------------------------------------
      -- ACTION CARD (has action): approval only, not consumed yet
      -- ----------------------------------------------------------------
      -- The card has an in-game action (e.g., draw_cards, remove_warnings).
      -- Approval marks it as ready to use, but consumption happens later.

      -- Log to vip_cards_activity with action='approved'
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
        'approved',
        jsonb_build_object(
          'approved_by', v_teacher_id::TEXT,
          'approved_at', v_now_str
        )
      );
    END IF;

  -- ========================================================================
  -- MODE: CONSUME
  -- ========================================================================

  ELSIF p_mode = 'consume' THEN

    -- Defense in depth: verify caller is the card owner or a teacher/admin
    IF auth.uid() != p_student_id AND NOT is_teacher_or_admin() THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'Unauthorized: Only the card owner or a teacher can consume cards'
      );
    END IF;

    -- Set usedAt and clear all activation fields from the JSONB instance
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

    -- Log to vip_cards_activity with action='used'
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

  END IF;

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
    'autoConsumed', v_auto_consumed,
    'cardName', v_template.name,
    'instanceId', v_instance_id,
    'cardId', v_card_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.approve_or_use_vip_card(UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.approve_or_use_vip_card(UUID, TEXT, TEXT, TEXT) IS
'Unified RPC for approving and consuming VIP cards.

Mode "approve" (teacher only):
  - Bonus cards (no action): auto-consumed immediately, logs action=used with auto_consumed metadata.
  - Action cards (has action): sets approval timestamps only, logs action=approved.

Mode "consume" (student or teacher):
  - Auth: caller must be the student or a teacher/admin
  - Sets usedAt, clears activation fields, logs action=used.

Lookup: provide p_instance_id for direct access, or p_card_id for FIFO (oldest unused).
Returns JSONB with success, autoConsumed, cardName, instanceId, cardId.';


-- ============================================================================
-- STEP 3: Update log_vip_cards_to_events trigger
-- ============================================================================
-- Add handling for the new 'approved' action. Since 'approved' is an
-- intermediate state (not a final reward event), we skip it entirely
-- to avoid polluting the reward_events audit trail.

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
    -- 'approved' is an intermediate state: skip logging to reward_events
    CASE NEW.action
        WHEN 'gained' THEN v_event_type := 'earned';
        WHEN 'used' THEN v_event_type := 'used';
        WHEN 'removed' THEN v_event_type := 'removed';
        WHEN 'traded' THEN v_event_type := 'traded';
        WHEN 'approved' THEN RETURN NEW;  -- Skip: intermediate state, not a final event
        ELSE v_event_type := 'earned';    -- Default fallback
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
Skips: approved (intermediate state, not a final reward event).';


-- ============================================================================
-- STEP 4: Drop old use_vip_card RPC
-- ============================================================================
-- The old function is replaced by approve_or_use_vip_card with mode=consume.

DROP FUNCTION IF EXISTS public.use_vip_card(UUID, TEXT);


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'Migration completed: Unified VIP Card Approve & Use';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'CHANGES:';
  RAISE NOTICE '  1. CHECK constraint updated: added ''approved'' action';
  RAISE NOTICE '  2. New RPC: approve_or_use_vip_card(UUID, TEXT, TEXT, TEXT)';
  RAISE NOTICE '     - mode=approve: teacher approves card activation';
  RAISE NOTICE '       - bonus cards: auto-consumed immediately';
  RAISE NOTICE '       - action cards: approval only, consumed later';
  RAISE NOTICE '     - mode=consume: marks card as used, clears activation';
  RAISE NOTICE '  3. Trigger updated: log_vip_cards_to_events skips ''approved''';
  RAISE NOTICE '  4. Dropped: use_vip_card(UUID, TEXT)';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  - Run: pnpm db:migrate';
  RAISE NOTICE '  - Run: pnpm db:types (update database.ts)';
  RAISE NOTICE '  - Update callers of use_vip_card to use approve_or_use_vip_card';
  RAISE NOTICE '=========================================================';
END $$;
