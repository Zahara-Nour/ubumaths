-- ============================================================================
-- Migration: Complete VIP Card Audit Trail
-- ============================================================================
-- Created: 2026-02-26
--
-- PURPOSE:
-- --------
-- Fix multiple audit trail gaps to ensure the student journal faithfully
-- traces all VIP card events:
--
--   Fix A: draw_multiple_vip_cards logs 'gained' for each drawn card
--   Fix D: New RPC request_vip_card_activation (atomic FOR UPDATE)
--   Fix E: Trigger dedup — skip 'removed' if RPC already logged it
--   Fix F: Enriched descriptions in log_vip_cards_to_events
--   Fix G: item_type -> reward_type column name bug in trigger INSERT
-- ============================================================================


-- ============================================================================
-- FIX A: Add 'gained' audit entries in draw_multiple_vip_cards
-- ============================================================================
-- The function draws cards and adds them to profiles.vip_cards, but never
-- inserted into vip_cards_activity. Now each drawn card gets a 'gained' entry.

DROP FUNCTION IF EXISTS public.draw_multiple_vip_cards(UUID, INT, TEXT, INT, UUID, TEXT, TEXT, TEXT[], BOOLEAN);

CREATE OR REPLACE FUNCTION public.draw_multiple_vip_cards(
  p_student_id UUID,
  p_count INT,
  p_payment_method TEXT,
  p_gidouilles_cost INT DEFAULT NULL,
  p_vip_card_instance_id UUID DEFAULT NULL,
  p_force_rarity TEXT DEFAULT NULL,
  p_min_rarity TEXT DEFAULT NULL,
  p_exclude_card_ids TEXT[] DEFAULT NULL,
  p_only_cards_with_actions BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  -- Constants
  c_max_cost_per_card CONSTANT INT := 10;
  c_min_count CONSTANT INT := 1;
  c_max_count CONSTANT INT := 10;

  -- Authorization variables
  v_caller_id UUID;
  v_is_teacher BOOLEAN;
  v_is_authorized BOOLEAN;
  v_student_in_class BOOLEAN;

  -- Student profile variables
  v_current_gidouilles INT;
  v_vip_cards JSONB;
  v_card_instance JSONB;
  v_card_used_at TEXT;
  v_payment_card_id TEXT;

  -- Card drawing variables (weighted by rarity)
  v_common_prob INTEGER;
  v_rare_prob INTEGER;
  v_epic_prob INTEGER;
  v_legendary_prob INTEGER;
  v_common_max INTEGER;
  v_rare_max INTEGER;
  v_epic_max INTEGER;
  v_roll INTEGER;
  v_selected_rarity TEXT;
  v_drawn_cards JSONB := '[]'::jsonb;
  v_card_id TEXT;
  v_available_card_ids TEXT[];
  v_instance_id UUID;
  v_earned_at TIMESTAMPTZ;
  v_new_card_instance JSONB;
  v_loop_counter INT;

  -- Filter variables
  v_min_rarity_level INT;
  v_rolled_rarity_level INT;

  -- Timestamp for audit
  v_now_str TEXT;

BEGIN
  -- ========================================
  -- 1. VALIDATE INPUT PARAMETERS
  -- ========================================

  IF p_count < c_min_count OR p_count > c_max_count THEN
    RAISE EXCEPTION 'Invalid count: Must be between % and % (received: %)',
      c_min_count, c_max_count, p_count;
  END IF;

  IF p_payment_method NOT IN ('gidouilles', 'vip_card') THEN
    RAISE EXCEPTION 'Invalid payment_method: Must be ''gidouilles'' or ''vip_card'' (received: ''%'')',
      p_payment_method;
  END IF;

  IF p_force_rarity IS NOT NULL AND p_force_rarity NOT IN ('common', 'rare', 'epic', 'legendary') THEN
    RAISE EXCEPTION 'Invalid force_rarity: Must be ''common'', ''rare'', ''epic'', or ''legendary'' (received: ''%'')',
      p_force_rarity;
  END IF;

  IF p_min_rarity IS NOT NULL AND p_min_rarity NOT IN ('common', 'rare', 'epic', 'legendary') THEN
    RAISE EXCEPTION 'Invalid min_rarity: Must be ''common'', ''rare'', ''epic'', or ''legendary'' (received: ''%'')',
      p_min_rarity;
  END IF;

  IF p_force_rarity IS NOT NULL AND p_min_rarity IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid filters: force_rarity and min_rarity are mutually exclusive';
  END IF;

  -- ========================================
  -- 2. AUTHORIZATION
  -- ========================================

  v_caller_id := auth.uid();
  v_is_teacher := is_teacher_or_admin();

  IF v_is_teacher THEN
    SELECT EXISTS (
      SELECT 1
      FROM class_members cm
      INNER JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = p_student_id
        AND c.teacher_id = v_caller_id
    ) INTO v_student_in_class;

    IF NOT v_student_in_class THEN
      RAISE EXCEPTION 'Unauthorized: Student is not in your classes';
    END IF;

    v_is_authorized := TRUE;
  ELSIF v_caller_id = p_student_id THEN
    v_is_authorized := TRUE;
  ELSE
    RAISE EXCEPTION 'Unauthorized: You can only draw cards for yourself or your students';
  END IF;

  -- ========================================
  -- 3. LOCK STUDENT PROFILE
  -- ========================================

  SELECT gidouilles, vip_cards
  INTO v_current_gidouilles, v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student profile not found';
  END IF;

  -- ========================================
  -- 4. LOAD RARITY PROBABILITIES FROM CONFIG
  -- ========================================

  SELECT
    common_probability,
    rare_probability,
    epic_probability,
    legendary_probability
  INTO
    v_common_prob, v_rare_prob, v_epic_prob, v_legendary_prob
  FROM vip_card_config
  WHERE is_active = TRUE
  LIMIT 1;

  IF v_common_prob IS NULL THEN
    v_common_prob := 60;
    v_rare_prob := 25;
    v_epic_prob := 12;
    v_legendary_prob := 3;
  END IF;

  v_common_max := v_common_prob;
  v_rare_max := v_common_max + v_rare_prob;
  v_epic_max := v_rare_max + v_epic_prob;

  IF p_min_rarity IS NOT NULL THEN
    v_min_rarity_level := CASE p_min_rarity
      WHEN 'common' THEN 1
      WHEN 'rare' THEN 2
      WHEN 'epic' THEN 3
      WHEN 'legendary' THEN 4
    END;
  END IF;

  -- ========================================
  -- 5. PROCESS PAYMENT
  -- ========================================

  IF p_payment_method = 'gidouilles' THEN
    IF p_gidouilles_cost IS NULL THEN
      RAISE EXCEPTION 'Missing parameter: gidouilles_cost is required for gidouilles payment';
    END IF;

    IF p_gidouilles_cost < 0 THEN
      RAISE EXCEPTION 'Invalid gidouilles_cost: Cannot be negative (received: %)', p_gidouilles_cost;
    END IF;

    IF p_gidouilles_cost > (p_count * c_max_cost_per_card) THEN
      RAISE EXCEPTION 'Invalid gidouilles_cost: Maximum % gidouilles for % cards (received: %)',
        (p_count * c_max_cost_per_card), p_count, p_gidouilles_cost;
    END IF;

    IF p_gidouilles_cost = 0 AND NOT v_is_teacher THEN
      RAISE EXCEPTION 'Unauthorized: Students cannot draw free cards (cost must be > 0)';
    END IF;

    IF v_current_gidouilles < p_gidouilles_cost THEN
      RAISE EXCEPTION 'Insufficient gidouilles: Required %, available % (shortfall: %)',
        p_gidouilles_cost, v_current_gidouilles, (p_gidouilles_cost - v_current_gidouilles);
    END IF;

    v_current_gidouilles := v_current_gidouilles - p_gidouilles_cost;

  ELSIF p_payment_method = 'vip_card' THEN
    IF p_vip_card_instance_id IS NULL THEN
      RAISE EXCEPTION 'Missing parameter: vip_card_instance_id is required for vip_card payment';
    END IF;

    v_vip_cards := COALESCE(v_vip_cards, '{}'::jsonb);
    v_card_instance := v_vip_cards->p_vip_card_instance_id::text;

    IF v_card_instance IS NULL THEN
      RAISE EXCEPTION 'VIP card not found: Instance ID % does not exist in student''s cards',
        p_vip_card_instance_id;
    END IF;

    v_card_used_at := v_card_instance->>'usedAt';

    IF v_card_used_at IS NOT NULL THEN
      RAISE EXCEPTION 'VIP card already used: This card was used at %', v_card_used_at;
    END IF;

    -- Extract template ID for audit trail
    v_payment_card_id := v_card_instance->>'cardId';

    -- Mark card as used
    v_now_str := to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    v_vip_cards := jsonb_set(
      v_vip_cards,
      ARRAY[p_vip_card_instance_id::text, 'usedAt'],
      to_jsonb(v_now_str)
    );

    -- AUDIT: Log VIP card payment atomically within this transaction
    INSERT INTO public.vip_cards_activity (
      student_id, card_instance_id, card_template_id, action, metadata
    ) VALUES (
      p_student_id,
      p_vip_card_instance_id::text,
      COALESCE(v_payment_card_id, 'unknown'),
      'used',
      jsonb_build_object(
        'used_at', v_now_str,
        'action_type', 'draw_cards',
        'cards_drawn', p_count,
        'filters', jsonb_build_object(
          'force_rarity', p_force_rarity,
          'min_rarity', p_min_rarity,
          'exclude_card_ids', to_jsonb(COALESCE(p_exclude_card_ids, ARRAY[]::TEXT[])),
          'only_cards_with_actions', p_only_cards_with_actions
        )
      )
    );

  END IF;

  -- ========================================
  -- 6. DRAW RANDOM VIP CARDS
  -- ========================================

  FOR v_loop_counter IN 1..p_count LOOP

    IF p_force_rarity IS NOT NULL THEN
      v_selected_rarity := p_force_rarity;
    ELSE
      v_roll := floor(random() * 100 + 1)::int;

      IF v_roll <= v_common_max THEN
        v_selected_rarity := 'common';
        v_rolled_rarity_level := 1;
      ELSIF v_roll <= v_rare_max THEN
        v_selected_rarity := 'rare';
        v_rolled_rarity_level := 2;
      ELSIF v_roll <= v_epic_max THEN
        v_selected_rarity := 'epic';
        v_rolled_rarity_level := 3;
      ELSE
        v_selected_rarity := 'legendary';
        v_rolled_rarity_level := 4;
      END IF;

      IF p_min_rarity IS NOT NULL AND v_rolled_rarity_level < v_min_rarity_level THEN
        v_selected_rarity := p_min_rarity;
      END IF;
    END IF;

    SELECT ARRAY_AGG(vct.id)
    INTO v_available_card_ids
    FROM vip_card_templates vct
    WHERE vct.rarity = v_selected_rarity
      AND vct.is_enabled = TRUE
      AND NOT EXISTS (
        SELECT 1
        FROM teacher_vip_card_overrides tvo
        WHERE tvo.card_id = vct.id
          AND tvo.is_enabled = FALSE
          AND tvo.teacher_id IN (
            SELECT DISTINCT c.teacher_id
            FROM class_members cm
            INNER JOIN classes c ON c.id = cm.class_id
            WHERE cm.student_id = p_student_id
          )
      )
      AND (p_exclude_card_ids IS NULL OR vct.id != ALL(p_exclude_card_ids))
      AND (NOT p_only_cards_with_actions OR vct.action IS NOT NULL);

    IF v_available_card_ids IS NULL OR array_length(v_available_card_ids, 1) IS NULL THEN
      IF p_force_rarity IS NOT NULL THEN
        RAISE EXCEPTION 'No enabled VIP cards available for forced rarity ''%'' (all cards may be disabled by teacher overrides, excluded, or filtered out)',
          p_force_rarity;
      END IF;

      SELECT ARRAY_AGG(vct.id)
      INTO v_available_card_ids
      FROM vip_card_templates vct
      WHERE vct.rarity = 'common'
        AND vct.is_enabled = TRUE
        AND NOT EXISTS (
          SELECT 1
          FROM teacher_vip_card_overrides tvo
          WHERE tvo.card_id = vct.id
            AND tvo.is_enabled = FALSE
            AND tvo.teacher_id IN (
              SELECT DISTINCT c.teacher_id
              FROM class_members cm
              INNER JOIN classes c ON c.id = cm.class_id
              WHERE cm.student_id = p_student_id
            )
        )
        AND (p_exclude_card_ids IS NULL OR vct.id != ALL(p_exclude_card_ids))
        AND (NOT p_only_cards_with_actions OR vct.action IS NOT NULL);

      IF v_available_card_ids IS NULL OR array_length(v_available_card_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'No enabled VIP cards available to draw (all cards disabled by teacher overrides, excluded, or filtered out)';
      END IF;
    END IF;

    v_card_id := v_available_card_ids[floor(random() * array_length(v_available_card_ids, 1) + 1)::int];

    v_instance_id := gen_random_uuid();
    v_earned_at := NOW();

    v_new_card_instance := jsonb_build_object(
      'cardId', v_card_id,
      'earnedAt', v_earned_at,
      'usedAt', null
    );

    v_vip_cards := COALESCE(v_vip_cards, '{}'::jsonb) || jsonb_build_object(
      v_instance_id::text,
      v_new_card_instance
    );

    v_drawn_cards := v_drawn_cards || jsonb_build_object(
      'cardId', v_card_id,
      'instanceId', v_instance_id,
      'earnedAt', v_earned_at
    );

    -- FIX A: Log 'gained' audit entry for each drawn card
    INSERT INTO public.vip_cards_activity (
      student_id, card_instance_id, card_template_id, action, metadata
    ) VALUES (
      p_student_id,
      v_instance_id::text,
      v_card_id,
      'gained',
      jsonb_build_object(
        'acquired_from', CASE p_payment_method
          WHEN 'gidouilles' THEN 'draw_gidouilles'
          WHEN 'vip_card' THEN 'draw_vip_card'
        END,
        'rarity', v_selected_rarity,
        'payment_method', p_payment_method
      )
    );

  END LOOP;

  -- ========================================
  -- 7. UPDATE STUDENT PROFILE
  -- ========================================

  UPDATE profiles
  SET
    gidouilles = v_current_gidouilles,
    vip_cards = v_vip_cards,
    updated_at = NOW()
  WHERE id = p_student_id;

  -- ========================================
  -- 8. RETURN RESULTS
  -- ========================================

  RETURN jsonb_build_object(
    'cards', v_drawn_cards
  );

END;
$$;

GRANT EXECUTE ON FUNCTION public.draw_multiple_vip_cards(UUID, INT, TEXT, INT, UUID, TEXT, TEXT, TEXT[], BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.draw_multiple_vip_cards(UUID, INT, TEXT, INT, UUID, TEXT, TEXT, TEXT[], BOOLEAN) IS
'Draws multiple VIP cards for a student with rarity-weighted probabilities, teacher override filtering, and optional filters.
Now logs gained audit entries for each drawn card and VIP card payment usage.';


-- ============================================================================
-- FIX D: New RPC request_vip_card_activation (atomic)
-- ============================================================================
-- Replaces the non-atomic UPDATE + INSERT pattern in the TypeScript endpoint.
-- Uses FOR UPDATE to prevent race conditions.

CREATE OR REPLACE FUNCTION public.request_vip_card_activation(
  p_student_id UUID,
  p_instance_id TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_vip_cards JSONB;
  v_card_data JSONB;
  v_card_id TEXT;
  v_template RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_now_str TEXT;
BEGIN
  -- ========================================================================
  -- 1. VERIFY CALLER IS THE STUDENT
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
      'error', 'You can only request activation for your own cards'
    );
  END IF;

  -- ========================================================================
  -- 2. LOCK AND FETCH STUDENT PROFILE
  -- ========================================================================

  SELECT vip_cards INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Student profile not found'
    );
  END IF;

  v_vip_cards := COALESCE(v_vip_cards, '{}'::JSONB);

  -- ========================================================================
  -- 3. VALIDATE CARD INSTANCE
  -- ========================================================================

  v_card_data := v_vip_cards->p_instance_id;

  IF v_card_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'VIP card instance not found'
    );
  END IF;

  IF v_card_data->>'usedAt' IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'This card has already been used'
    );
  END IF;

  IF v_card_data->>'activationRequestedAt' IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Activation request already pending'
    );
  END IF;

  v_card_id := v_card_data->>'cardId';

  -- ========================================================================
  -- 4. VERIFY CARD HAS AN ACTION
  -- ========================================================================

  SELECT id, name, action INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card definition not found'
    );
  END IF;

  IF v_template.action IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'This card does not have an activatable action'
    );
  END IF;

  -- ========================================================================
  -- 5. UPDATE INSTANCE WITH ACTIVATION REQUEST
  -- ========================================================================

  v_now_str := to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  v_vip_cards := jsonb_set(
    v_vip_cards,
    ARRAY[p_instance_id],
    v_card_data || jsonb_build_object(
      'activationRequestedAt', v_now_str,
      'activationRequestedBy', p_student_id::TEXT
    )
  );

  -- ========================================================================
  -- 6. UPDATE PROFILE
  -- ========================================================================

  UPDATE profiles
  SET vip_cards = v_vip_cards, updated_at = v_now
  WHERE id = p_student_id;

  -- ========================================================================
  -- 7. LOG AUDIT TRAIL
  -- ========================================================================

  INSERT INTO public.vip_cards_activity (
    student_id, card_instance_id, card_template_id, action, metadata
  ) VALUES (
    p_student_id,
    p_instance_id,
    v_card_id,
    'requested',
    jsonb_build_object(
      'requested_by', p_student_id::TEXT,
      'action_type', v_template.action->>'type'
    )
  );

  -- ========================================================================
  -- 8. RETURN SUCCESS
  -- ========================================================================

  RETURN jsonb_build_object(
    'success', TRUE,
    'cardName', v_template.name,
    'actionType', v_template.action->>'type'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_vip_card_activation(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.request_vip_card_activation(UUID, TEXT) IS
'Atomically requests activation of a VIP card with an action.
Uses FOR UPDATE to prevent race conditions. Logs requested action to vip_cards_activity.';


-- ============================================================================
-- FIX E: Dedup 'removed' in log_vip_card_changes trigger
-- ============================================================================
-- The remove_vip_card RPC inserts 'removed' into vip_cards_activity, then
-- updates profiles.vip_cards which fires this trigger and inserts ANOTHER
-- 'removed'. Add a NOT EXISTS check to skip if RPC already logged it.

CREATE OR REPLACE FUNCTION public.log_vip_card_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_cards JSONB;
    v_new_cards JSONB;
BEGIN
    -- Only process if vip_cards column actually changed
    IF OLD.vip_cards IS DISTINCT FROM NEW.vip_cards THEN
        -- Default to empty object (not array!) if null
        v_old_cards := COALESCE(OLD.vip_cards, '{}'::JSONB);
        v_new_cards := COALESCE(NEW.vip_cards, '{}'::JSONB);

        -- ====================================================================
        -- LOG REMOVED CARDS ONLY (with dedup check)
        -- ====================================================================
        -- Cards present in OLD but not in NEW have been removed.
        -- Skip if an RPC (remove_vip_card) already logged the removal
        -- within the last 5 seconds for this specific card instance.

        INSERT INTO public.vip_cards_activity (
            student_id,
            card_instance_id,
            card_template_id,
            action,
            metadata
        )
        SELECT
            NEW.id,
            old_cards.instance_id,
            old_cards.card_data->>'cardId',
            'removed',
            jsonb_build_object(
                'removed_by', COALESCE(auth.uid()::TEXT, 'system'),
                'removed_at', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                'was_used', (old_cards.card_data->>'usedAt') IS NOT NULL
            )
        FROM jsonb_each(v_old_cards) AS old_cards(instance_id, card_data)
        WHERE NOT EXISTS (
            SELECT 1
            FROM jsonb_each(v_new_cards) AS new_cards(instance_id, card_data)
            WHERE new_cards.instance_id = old_cards.instance_id
        )
        -- FIX E: Skip if RPC already logged a 'removed' in this same transaction.
        -- NOW() is stable within a transaction, so created_at >= NOW() matches
        -- only rows inserted in the current transaction.
        AND NOT EXISTS (
            SELECT 1
            FROM public.vip_cards_activity vca
            WHERE vca.student_id = NEW.id
              AND vca.card_instance_id = old_cards.instance_id
              AND vca.action = 'removed'
              AND vca.created_at >= NOW()
        );
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.log_vip_card_changes() IS
'Trigger function that logs ONLY card removals to vip_cards_activity.
Gained and used actions are logged by their respective RPC functions.
Includes dedup check to avoid double-logging when remove_vip_card RPC fires first.';


-- ============================================================================
-- FIX F + G: Enriched descriptions + fix item_type -> reward_type
-- ============================================================================
-- The log_vip_cards_to_events trigger:
--   F: Used generic descriptions ("Carte VIP obtenue") without context
--   G: Inserted into non-existent 'item_type' column instead of 'reward_type'

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
    v_acquired_from TEXT;
    v_action_type TEXT;
    v_used_by TEXT;
    v_amount INT;
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
    -- 'approved', 'rejected', and 'requested' are intermediate states: skip logging
    CASE NEW.action
        WHEN 'gained' THEN v_event_type := 'earned';
        WHEN 'used' THEN v_event_type := 'used';
        WHEN 'removed' THEN v_event_type := 'removed';
        WHEN 'traded' THEN v_event_type := 'traded';
        WHEN 'approved' THEN RETURN NEW;
        WHEN 'rejected' THEN RETURN NEW;
        WHEN 'requested' THEN RETURN NEW;
        ELSE v_event_type := 'earned';
    END CASE;

    -- Get card name from template
    SELECT name INTO v_card_name
    FROM public.vip_card_templates
    WHERE id = NEW.card_template_id;

    v_card_name := COALESCE(v_card_name, NEW.card_template_id);

    -- Extract metadata fields for contextual descriptions
    v_acquired_from := NEW.metadata->>'acquired_from';
    v_action_type := NEW.metadata->>'action_type';
    v_used_by := NEW.metadata->>'used_by';

    -- FIX F: Build contextual description based on action + metadata
    v_description := CASE
        -- GAINED descriptions
        WHEN NEW.action = 'gained' AND v_acquired_from = 'purchase' THEN
            'Carte VIP achetee : ' || v_card_name
            || COALESCE(' (-' || (NEW.metadata->>'price_paid') || ' gidouilles)', '')
        WHEN NEW.action = 'gained' AND v_acquired_from = 'draw_gidouilles' THEN
            'Carte VIP obtenue par tirage : ' || v_card_name
        WHEN NEW.action = 'gained' AND v_acquired_from = 'draw_vip_card' THEN
            'Carte VIP obtenue par tirage (carte VIP) : ' || v_card_name
        WHEN NEW.action = 'gained' AND v_acquired_from = 'exchange' THEN
            'Carte VIP obtenue par echange : ' || v_card_name
        WHEN NEW.action = 'gained' AND v_acquired_from = 'choose' THEN
            'Carte VIP choisie : ' || v_card_name
        WHEN NEW.action = 'gained' AND v_acquired_from = 'teacher_award' THEN
            'Carte VIP offerte par le prof : ' || v_card_name
        WHEN NEW.action = 'gained' AND v_acquired_from = 'teacher_draw' THEN
            'Carte VIP tiree par le prof : ' || v_card_name
        WHEN NEW.action = 'gained' AND v_acquired_from = 'trade' THEN
            'Carte VIP recue par echange entre eleves : ' || v_card_name
        WHEN NEW.action = 'gained' THEN
            'Carte VIP obtenue : ' || v_card_name

        -- USED descriptions
        WHEN NEW.action = 'used' AND v_action_type = 'draw_cards' THEN
            'Carte VIP utilisee pour tirer '
            || COALESCE((NEW.metadata->>'cards_drawn')::TEXT, '')
            || ' cartes : ' || v_card_name
        WHEN NEW.action = 'used' AND v_action_type = 'exchange_cards' THEN
            'Carte VIP utilisee pour echanger des cartes : ' || v_card_name
        WHEN NEW.action = 'used' AND v_action_type = 'remove_warnings' THEN
            'Carte VIP utilisee pour retirer '
            || COALESCE((NEW.metadata->>'warnings_removed')::TEXT, '')
            || ' avertissements : ' || v_card_name
        WHEN NEW.action = 'used' AND v_action_type = 'add_gidouilles' THEN
            'Carte VIP utilisee pour gagner '
            || COALESCE((NEW.metadata->>'gidouilles_amount')::TEXT, '')
            || ' gidouilles : ' || v_card_name
        WHEN NEW.action = 'used' AND v_action_type = 'choose_card' THEN
            'Carte VIP utilisee pour choisir des cartes : ' || v_card_name
        WHEN NEW.action = 'used' AND v_used_by = 'exchange' THEN
            'Carte VIP defaussee (echange) : ' || v_card_name
        WHEN NEW.action = 'used' THEN
            'Carte VIP utilisee : ' || v_card_name

        -- REMOVED description
        WHEN NEW.action = 'removed' THEN
            'Carte VIP retiree par le prof : ' || v_card_name

        -- TRADED description
        WHEN NEW.action = 'traded' THEN
            'Carte VIP echangee entre eleves : ' || v_card_name

        -- Fallback
        ELSE 'Carte VIP : ' || v_card_name
    END;

    -- Get class_id from student's active membership
    SELECT cm.class_id INTO v_class_id
    FROM public.class_members cm
    WHERE cm.student_id = NEW.student_id
    AND cm.status = 'active'
    LIMIT 1;

    -- FIX G: Use 'reward_type' column (not 'item_type' which does not exist)
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
        CASE
            WHEN (NEW.metadata->>'removed_by') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN (NEW.metadata->>'removed_by')::UUID
            ELSE NULL
        END,
        NEW.created_at
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.log_vip_cards_to_events() IS
'Trigger function that maps vip_cards_activity rows to reward_events.
Maps: gained->earned, used->used, removed->removed, traded->traded.
Skips: approved, rejected, requested (intermediate states).
Uses contextual descriptions based on metadata (acquired_from, action_type, etc.).
Inserts into reward_type column (fixed from item_type bug).';


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'Migration completed: Complete VIP Card Audit Trail';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '  Fix A: draw_multiple_vip_cards logs gained for each card';
  RAISE NOTICE '  Fix D: New RPC request_vip_card_activation (atomic)';
  RAISE NOTICE '  Fix E: Trigger dedup for removed (RPC vs trigger)';
  RAISE NOTICE '  Fix F: Enriched descriptions in reward_events';
  RAISE NOTICE '  Fix G: item_type -> reward_type column fix';
  RAISE NOTICE '=========================================================';
END $$;
