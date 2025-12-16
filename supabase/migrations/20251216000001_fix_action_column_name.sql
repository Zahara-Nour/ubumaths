-- Migration: Fix column name in draw_multiple_vip_cards function
-- Description: Change vct.actions to vct.action (singular)
-- Created: 2025-12-16
--
-- FIX: The vip_card_templates table has column "action" (singular JSONB),
--      not "actions" (plural array). This migration corrects the typo.

-- ============================================================================
-- DROP OLD FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS public.draw_multiple_vip_cards(UUID, INT, TEXT, INT, UUID, TEXT, TEXT, TEXT[], BOOLEAN);

-- ============================================================================
-- CREATE FIXED FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.draw_multiple_vip_cards(
  p_student_id UUID,
  p_count INT,
  p_payment_method TEXT,
  p_gidouilles_cost INT DEFAULT NULL,
  p_vip_card_instance_id UUID DEFAULT NULL,
  -- Filter parameters
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
  -- 3. LOCK STUDENT PROFILE (PREVENT RACE CONDITIONS)
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
    RAISE NOTICE 'No active config found, using default probabilities: common=60%%, rare=25%%, epic=12%%, legendary=3%%';
  END IF;

  v_common_max := v_common_prob;
  v_rare_max := v_common_max + v_rare_prob;
  v_epic_max := v_rare_max + v_epic_prob;

  RAISE NOTICE 'Using rarity probabilities: common=%%%, rare=%%%, epic=%%%, legendary=%%%',
    v_common_prob, v_rare_prob, v_epic_prob, v_legendary_prob;

  IF p_min_rarity IS NOT NULL THEN
    v_min_rarity_level := CASE p_min_rarity
      WHEN 'common' THEN 1
      WHEN 'rare' THEN 2
      WHEN 'epic' THEN 3
      WHEN 'legendary' THEN 4
    END;
    RAISE NOTICE 'Applying min_rarity filter: % (level %)', p_min_rarity, v_min_rarity_level;
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

    RAISE NOTICE 'draw_multiple_vip_cards: student_id=%, payment=gidouilles, cost=%, cards=%',
      p_student_id, p_gidouilles_cost, p_count;

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

    v_vip_cards := jsonb_set(
      v_vip_cards,
      ARRAY[p_vip_card_instance_id::text, 'usedAt'],
      to_jsonb(NOW()::text)
    );

    RAISE NOTICE 'draw_multiple_vip_cards: student_id=%, payment=vip_card, instance_id=%, cards=%',
      p_student_id, p_vip_card_instance_id, p_count;

  END IF;

  IF p_force_rarity IS NOT NULL OR p_min_rarity IS NOT NULL OR p_exclude_card_ids IS NOT NULL OR p_only_cards_with_actions THEN
    RAISE NOTICE 'Filters: force_rarity=%, min_rarity=%, exclude_count=%, only_with_actions=%',
      COALESCE(p_force_rarity, 'null'),
      COALESCE(p_min_rarity, 'null'),
      COALESCE(array_length(p_exclude_card_ids, 1), 0),
      p_only_cards_with_actions;
  END IF;

  -- ========================================
  -- 6. DRAW RANDOM VIP CARDS
  -- ========================================

  RAISE NOTICE 'Checking teacher overrides for student %', p_student_id;

  FOR v_loop_counter IN 1..p_count LOOP

    -- STEP 1: Determine Rarity
    IF p_force_rarity IS NOT NULL THEN
      v_selected_rarity := p_force_rarity;
      RAISE NOTICE 'Draw %: forced rarity=%', v_loop_counter, v_selected_rarity;
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
        RAISE NOTICE 'Draw %: rolled % (level %), upgraded to min_rarity=%',
          v_loop_counter, v_roll, v_rolled_rarity_level, v_selected_rarity;
      ELSE
        RAISE NOTICE 'Draw %: rolled %, selected rarity=%', v_loop_counter, v_roll, v_selected_rarity;
      END IF;
    END IF;

    -- STEP 2: Collect Available Cards (with filters)
    -- FIX: Use vct.action (singular) not vct.actions
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
      -- FIX: vct.action is a single JSONB object, not an array
      AND (NOT p_only_cards_with_actions OR vct.action IS NOT NULL);

    RAISE NOTICE 'Available cards for rarity %: %', v_selected_rarity, v_available_card_ids;

    -- STEP 3: Fallback if No Available Cards
    IF v_available_card_ids IS NULL OR array_length(v_available_card_ids, 1) IS NULL THEN
      IF p_force_rarity IS NOT NULL THEN
        RAISE EXCEPTION 'No enabled VIP cards available for forced rarity ''%'' (all cards may be disabled by teacher overrides, excluded, or filtered out)',
          p_force_rarity;
      END IF;

      RAISE NOTICE 'No enabled cards for rarity=%, falling back to common', v_selected_rarity;

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
        -- FIX: vct.action is a single JSONB object, not an array
        AND (NOT p_only_cards_with_actions OR vct.action IS NOT NULL);

      RAISE NOTICE 'Available common cards after fallback: %', v_available_card_ids;

      IF v_available_card_ids IS NULL OR array_length(v_available_card_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'No enabled VIP cards available to draw (all cards disabled by teacher overrides, excluded, or filtered out)';
      END IF;
    END IF;

    -- STEP 4: Select Random Card
    v_card_id := v_available_card_ids[floor(random() * array_length(v_available_card_ids, 1) + 1)::int];

    RAISE NOTICE 'Drew card: % (from % available cards)', v_card_id, array_length(v_available_card_ids, 1);

    -- STEP 5: Create Card Instance
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.draw_multiple_vip_cards(UUID, INT, TEXT, INT, UUID, TEXT, TEXT, TEXT[], BOOLEAN) TO authenticated;

-- Update comment
COMMENT ON FUNCTION public.draw_multiple_vip_cards(UUID, INT, TEXT, INT, UUID, TEXT, TEXT, TEXT[], BOOLEAN) IS
'Draws multiple VIP cards for a student with rarity-weighted probabilities, teacher override filtering, and optional filters.

Parameters:
- p_student_id: Student UUID
- p_count: Number of cards to draw (1-10)
- p_payment_method: ''gidouilles'' or ''vip_card''
- p_gidouilles_cost: Cost in gidouilles (required for gidouilles payment)
- p_vip_card_instance_id: VIP card instance ID to consume (required for vip_card payment)
- p_force_rarity: Force all drawn cards to be of this rarity (overrides random roll)
- p_min_rarity: Guarantee minimum rarity (upgrades roll if below threshold)
- p_exclude_card_ids: Array of card IDs to exclude from draw pool
- p_only_cards_with_actions: Only draw cards that have an action defined

Rarity order: common (1) < rare (2) < epic (3) < legendary (4)';
