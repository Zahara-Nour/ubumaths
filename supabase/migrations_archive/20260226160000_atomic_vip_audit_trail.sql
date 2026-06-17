-- ============================================================================
-- Migration: Atomic VIP Card Audit Trail
-- ============================================================================
-- Created: 2026-02-26
--
-- PURPOSE:
-- --------
-- Fix non-atomic audit trail patterns where VIP card operations and their
-- audit logging were done in separate database calls, risking orphaned
-- operations without audit entries if the second call failed.
--
-- CHANGES:
--   1. New RPC: discard_vip_cards - batch mark cards as used + audit (for exchange)
--   2. Updated RPC: draw_multiple_vip_cards - add audit entry when paying with VIP card
-- ============================================================================


-- ============================================================================
-- 1. NEW RPC: discard_vip_cards
-- ============================================================================
-- Used by the exchange endpoint to atomically mark discarded cards as used
-- and log audit entries for each, in a single transaction.

CREATE OR REPLACE FUNCTION public.discard_vip_cards(
  p_student_id UUID,
  p_instance_ids TEXT[],
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_vip_cards JSONB;
  v_now TIMESTAMPTZ := NOW();
  v_now_str TEXT;
  v_instance_id TEXT;
  v_card_data JSONB;
  v_card_id TEXT;
  v_discarded_count INT := 0;
BEGIN
  -- ========================================================================
  -- VALIDATE INPUT
  -- ========================================================================

  IF p_instance_ids IS NULL OR array_length(p_instance_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'No instance IDs provided'
    );
  END IF;

  IF array_length(p_instance_ids, 1) > 20 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Too many cards to discard (max 20)'
    );
  END IF;

  -- ========================================================================
  -- LOCK STUDENT PROFILE
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
  v_now_str := to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  -- ========================================================================
  -- MARK EACH CARD AS USED + LOG AUDIT
  -- ========================================================================

  FOREACH v_instance_id IN ARRAY p_instance_ids
  LOOP
    v_card_data := v_vip_cards->v_instance_id;

    -- Skip if instance not found
    IF v_card_data IS NULL THEN
      CONTINUE;
    END IF;

    -- Skip if already used
    IF v_card_data->>'usedAt' IS NOT NULL THEN
      CONTINUE;
    END IF;

    v_card_id := v_card_data->>'cardId';

    -- Set usedAt in JSONB
    v_vip_cards := jsonb_set(
      v_vip_cards,
      ARRAY[v_instance_id, 'usedAt'],
      to_jsonb(v_now_str)
    );

    -- Insert audit entry
    INSERT INTO public.vip_cards_activity (
      student_id, card_instance_id, card_template_id, action, metadata
    ) VALUES (
      p_student_id,
      v_instance_id,
      v_card_id,
      'used',
      jsonb_build_object('used_at', v_now_str) || COALESCE(p_metadata, '{}'::JSONB)
    );

    v_discarded_count := v_discarded_count + 1;
  END LOOP;

  -- ========================================================================
  -- UPDATE PROFILE
  -- ========================================================================

  UPDATE profiles
  SET vip_cards = v_vip_cards, updated_at = v_now
  WHERE id = p_student_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'discarded_count', v_discarded_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.discard_vip_cards(UUID, TEXT[], JSONB) TO authenticated;

COMMENT ON FUNCTION public.discard_vip_cards(UUID, TEXT[], JSONB) IS
'Atomically marks multiple VIP card instances as used and logs audit entries.
Used by exchange endpoints to ensure discard operations and their audit trail
are in the same transaction. p_metadata is merged into each audit entry.';


-- ============================================================================
-- 2. UPDATE draw_multiple_vip_cards: Add audit entry for VIP card payment
-- ============================================================================
-- When paying with a VIP card, the function marks the card as used in JSONB
-- but did not insert an audit entry. Now it does.
--
-- NOTE: We DROP the old signature and recreate with same params to ensure
-- the full function body is replaced.

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
Now includes atomic audit trail logging when paying with a VIP card.';


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'Migration completed: Atomic VIP Card Audit Trail';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '  1. New RPC: discard_vip_cards (batch mark used + audit)';
  RAISE NOTICE '  2. Updated: draw_multiple_vip_cards (VIP card payment audit)';
  RAISE NOTICE '=========================================================';
END $$;
