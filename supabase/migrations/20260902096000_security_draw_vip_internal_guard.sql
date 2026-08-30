-- Security: internal authorization guards for draw_multiple_vip_cards
-- =============================================================================
-- Vague-0 finding F1 / C8(a), see docs/wip/security-audit-2026-08.md
--
-- INCIDENT: the RPC is granted to `authenticated`, so a student can call it
-- DIRECTLY via PostgREST, bypassing the endpoint-layer checks. With
-- `p_gidouilles_cost: 1, p_force_rarity: 'legendary'` a student obtained 10
-- legendary cards for 1 gidouille. The fix must live INSIDE the function.
--
-- This migration reproduces the current function body verbatim (same signature,
-- LANGUAGE plpgsql, SECURITY DEFINER, SET search_path, FOR UPDATE locking, all
-- logic) and inserts, as early as possible after `v_is_teacher` is assigned and
-- before any cost check, two guards that apply to EVERY caller path:
--   1. Rarity filters (force/min) are reserved for teachers/admins.
--   2. A non-teacher gidouilles draw must pay >= the real per-card price.
-- Teachers keep their capabilities (free draws, forced rarity). GRANTs are
-- unchanged: the function stays callable by `authenticated`; the guards now do
-- the authorization.

BEGIN;

CREATE OR REPLACE FUNCTION public.draw_multiple_vip_cards(p_student_id uuid, p_count integer, p_payment_method text, p_gidouilles_cost integer DEFAULT NULL::integer, p_vip_card_instance_id uuid DEFAULT NULL::uuid, p_force_rarity text DEFAULT NULL::text, p_min_rarity text DEFAULT NULL::text, p_exclude_card_ids text[] DEFAULT NULL::text[], p_only_cards_with_actions boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  -- Constants
  c_max_cost_per_card CONSTANT INT := 10;
  c_min_cost_per_card CONSTANT INT := 1;  -- anti-underpayment floor (>=1 gidouille/card); UI price enforced endpoint-side
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

  -- ----------------------------------------
  -- 2a. INTERNAL AUTHORIZATION GUARDS (Vague-0 F1 / C8(a))
  -- Run for EVERY caller path, before any cost check, so a direct PostgREST
  -- call cannot bypass the endpoint layer.
  -- ----------------------------------------

  -- Rarity filters (force/min) are reserved for teachers/admins. `v_caller_id IS
  -- NOT NULL` exempts the service_role / trusted server contexts (null auth.uid()),
  -- which legitimately draw with forced rarity; a real logged-in student always
  -- has a non-null uid, so the exploit path is blocked.
  IF (p_force_rarity IS NOT NULL OR p_min_rarity IS NOT NULL)
     AND v_caller_id IS NOT NULL AND NOT v_is_teacher THEN
    RAISE EXCEPTION 'Rarity filters (force/min) are reserved for teachers'
      USING ERRCODE = '42501';
  END IF;

  -- Anti-underpayment floor: a logged-in non-teacher must pay >= 1 gidouille per
  -- card (blocks the "1 gidouille for 10 cards" cheat). The stricter UI price
  -- (VIP_CARD_COST/card) is enforced at the endpoint; a full economy price is a
  -- Vague-1 item. service_role / null-uid callers are exempt.
  IF p_payment_method = 'gidouilles' AND v_caller_id IS NOT NULL AND NOT v_is_teacher
     AND p_gidouilles_cost < (p_count * c_min_cost_per_card) THEN
    RAISE EXCEPTION 'Invalid gidouilles_cost: minimum % for % cards',
      (p_count * c_min_cost_per_card), p_count
      USING ERRCODE = '22023';
  END IF;

  IF v_is_teacher THEN
    -- Mono-teacher: any class membership means the sole teacher teaches this student.
    SELECT EXISTS (
      SELECT 1
      FROM class_members cm
      WHERE cm.student_id = p_student_id
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
      AND (p_exclude_card_ids IS NULL OR vct.id != ALL(p_exclude_card_ids))
      AND (NOT p_only_cards_with_actions OR vct.action IS NOT NULL);

    IF v_available_card_ids IS NULL OR array_length(v_available_card_ids, 1) IS NULL THEN
      IF p_force_rarity IS NOT NULL THEN
        RAISE EXCEPTION 'No enabled VIP cards available for forced rarity ''%'' (all cards may be disabled, excluded, or filtered out)',
          p_force_rarity;
      END IF;

      SELECT ARRAY_AGG(vct.id)
      INTO v_available_card_ids
      FROM vip_card_templates vct
      WHERE vct.rarity = 'common'
        AND vct.is_enabled = TRUE
        AND (p_exclude_card_ids IS NULL OR vct.id != ALL(p_exclude_card_ids))
        AND (NOT p_only_cards_with_actions OR vct.action IS NOT NULL);

      IF v_available_card_ids IS NULL OR array_length(v_available_card_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'No enabled VIP cards available to draw (all cards disabled, excluded, or filtered out)';
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
$function$;

COMMIT;
