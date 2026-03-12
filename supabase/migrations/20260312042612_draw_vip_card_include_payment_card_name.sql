-- ============================================================================
-- Migration: Include payment card name in draw_vip_card gained metadata
-- Created: 2026-03-12
-- ============================================================================
-- When drawing cards via a VIP card (e.g. "Soldes"), the journal shows:
--   "Carte VIP obtenue par tirage (carte VIP)"
-- Instead we want:
--   "Carte VIP obtenue par tirage (carte Soldes)"
--
-- FIX 1: draw_multiple_vip_cards() → add payment_card_name to gained metadata
-- FIX 2: log_vip_cards_to_events() → use payment_card_name in description
-- ============================================================================

-- =============================================
-- 1. Update draw_multiple_vip_cards()
-- =============================================

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
  v_payment_card_name TEXT;

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

  -- Acquisition source for JSONB instance + audit
  v_acquired_from TEXT;

  -- Class ID for audit trail
  v_class_id UUID;

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

  -- Compute acquiredFrom once based on payment method
  v_acquired_from := CASE p_payment_method
    WHEN 'gidouilles' THEN 'draw_gidouilles'
    WHEN 'vip_card' THEN 'draw_vip_card'
  END;

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

  -- Get student's active class for audit trail
  SELECT cm.class_id INTO v_class_id
  FROM class_members cm
  WHERE cm.student_id = p_student_id
    AND cm.status = 'active'
  LIMIT 1;

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

    -- Log gidouilles spent for audit trail
    IF p_gidouilles_cost > 0 THEN
      INSERT INTO gidouilles_activity (
        student_id,
        class_id,
        delta,
        reason,
        created_by
      ) VALUES (
        p_student_id,
        v_class_id,
        -p_gidouilles_cost,
        'Tirage de ' || p_count || ' carte' || CASE WHEN p_count > 1 THEN 's' ELSE '' END || ' VIP',
        NULL
      );
    END IF;

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

    -- Extract template ID and look up card name for audit trail
    v_payment_card_id := v_card_instance->>'cardId';

    SELECT name INTO v_payment_card_name
    FROM vip_card_templates
    WHERE id = v_payment_card_id;

    v_payment_card_name := COALESCE(v_payment_card_name, v_payment_card_id);

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
      'usedAt', null,
      'acquiredFrom', v_acquired_from
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

    -- Log 'gained' audit entry for each drawn card
    INSERT INTO public.vip_cards_activity (
      student_id, card_instance_id, card_template_id, action, metadata
    ) VALUES (
      p_student_id,
      v_instance_id::text,
      v_card_id,
      'gained',
      jsonb_build_object(
        'acquired_from', v_acquired_from,
        'rarity', v_selected_rarity,
        'payment_method', p_payment_method,
        'payment_card_name', v_payment_card_name
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
'Draws multiple VIP cards for a student with rarity-weighted probabilities.
Includes payment_card_name in gained metadata for precise journal descriptions.';

-- =============================================
-- 2. Update log_vip_cards_to_events() trigger
-- =============================================

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
    v_trade_id TEXT;
    v_partner_name TEXT;
    v_amount INT;
    v_payment_card_name TEXT;
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
    v_trade_id := LEFT(COALESCE(NEW.metadata->>'trade_id', ''), 8);
    v_payment_card_name := NEW.metadata->>'payment_card_name';

    -- Build contextual description based on action + metadata
    v_description := CASE
        -- GAINED descriptions
        WHEN NEW.action = 'gained' AND v_acquired_from = 'purchase' THEN
            'Carte VIP achetée'
        WHEN NEW.action = 'gained' AND v_acquired_from = 'draw_gidouilles' THEN
            'Carte VIP obtenue par tirage'
        WHEN NEW.action = 'gained' AND v_acquired_from = 'draw_vip_card' THEN
            'Carte VIP obtenue par tirage (carte ' || COALESCE(v_payment_card_name, 'VIP') || ')'
        WHEN NEW.action = 'gained' AND v_acquired_from = 'exchange' THEN
            'Carte VIP obtenue par échange'
        WHEN NEW.action = 'gained' AND v_acquired_from = 'choose' THEN
            'Carte VIP choisie'
        WHEN NEW.action = 'gained' AND v_acquired_from = 'teacher_award' THEN
            'Carte VIP offerte par le prof'
        WHEN NEW.action = 'gained' AND v_acquired_from = 'teacher_draw' THEN
            'Carte VIP tirée par le prof'
        WHEN NEW.action = 'gained' AND v_acquired_from = 'trade' THEN
            format('Carte reçue de %s (échange #%s)',
                COALESCE(NEW.metadata->>'received_from_name', 'un élève'),
                v_trade_id)
        WHEN NEW.action = 'gained' THEN
            'Carte VIP obtenue'

        -- USED descriptions
        WHEN NEW.action = 'used' AND v_action_type = 'draw_cards' THEN
            'Carte VIP utilisée pour tirer '
            || COALESCE((NEW.metadata->>'cards_drawn')::TEXT, '')
            || ' cartes'
        WHEN NEW.action = 'used' AND v_action_type = 'exchange_cards' THEN
            'Carte VIP utilisée pour échanger des cartes'
        WHEN NEW.action = 'used' AND v_action_type = 'remove_warnings' THEN
            'Carte VIP utilisée pour retirer '
            || COALESCE((NEW.metadata->>'warnings_removed')::TEXT, '')
            || ' avertissements'
        WHEN NEW.action = 'used' AND v_action_type = 'add_gidouilles' THEN
            'Carte VIP utilisée pour gagner '
            || COALESCE((NEW.metadata->>'gidouilles_amount')::TEXT, '')
            || ' gidouilles'
        WHEN NEW.action = 'used' AND v_action_type = 'choose_card' THEN
            'Carte VIP utilisée pour choisir des cartes'
        WHEN NEW.action = 'used' AND v_used_by = 'exchange' THEN
            'Carte VIP défaussée (échange)'
        WHEN NEW.action = 'used' THEN
            'Carte VIP utilisée'

        -- REMOVED description
        WHEN NEW.action = 'removed' THEN
            'Carte VIP retirée par le prof'

        -- TRADED
        WHEN NEW.action = 'traded' THEN
            format('Carte donnée à %s (échange #%s)',
                COALESCE(NEW.metadata->>'traded_to_name', 'un élève'),
                v_trade_id)

        -- Fallback
        ELSE 'Carte VIP'
    END;

    -- Get class_id from student's active membership
    SELECT cm.class_id INTO v_class_id
    FROM public.class_members cm
    WHERE cm.student_id = NEW.student_id
    AND cm.status = 'active'
    LIMIT 1;

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
Uses payment_card_name from metadata for draw_vip_card descriptions.';
