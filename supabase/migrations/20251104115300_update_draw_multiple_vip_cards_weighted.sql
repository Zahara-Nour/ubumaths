-- Migration: Update draw_multiple_vip_cards to Use Rarity-Weighted Selection
-- Created: 2025-11-04
--
-- This migration updates the draw_multiple_vip_cards() function to implement
-- rarity-weighted card drawing using the new vip_card_templates table and
-- vip_card_config table.
--
-- CHANGES:
-- --------
-- 1. Remove hardcoded v_card_ids array (uniform distribution)
-- 2. Read active probability config from vip_card_config table
-- 3. Implement weighted rarity selection (60% common, 25% rare, 12% epic, 3% legendary)
-- 4. Select random card from chosen rarity (only enabled cards)
-- 5. Fallback to common cards if no enabled cards in selected rarity
--
-- ALGORITHM:
-- ----------
-- Step 1: Roll 1-100
-- Step 2: Determine rarity based on cumulative probability ranges:
--   - 1-60:   common (60%)
--   - 61-85:  rare (25%)
--   - 86-97:  epic (12%)
--   - 98-100: legendary (3%)
-- Step 3: SELECT random enabled card from that rarity
-- Step 4: Fallback to common if rarity has no enabled cards
--
-- FUNCTION SIGNATURE (unchanged):
-- --------------------------------
-- draw_multiple_vip_cards(
--   p_student_id UUID,
--   p_count INT,
--   p_payment_method TEXT,
--   p_gidouilles_cost INT DEFAULT NULL,
--   p_vip_card_instance_id UUID DEFAULT NULL
-- ) RETURNS JSONB

-- ============================================================================
-- DROP AND RECREATE FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS public.draw_multiple_vip_cards(UUID, INT, TEXT, INT, UUID);

CREATE OR REPLACE FUNCTION public.draw_multiple_vip_cards(
  p_student_id UUID,
  p_count INT,
  p_payment_method TEXT,
  p_gidouilles_cost INT DEFAULT NULL,
  p_vip_card_instance_id UUID DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER -- Run with function creator's permissions (bypasses RLS)
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
  v_instance_id UUID;
  v_earned_at TIMESTAMPTZ;
  v_new_card_instance JSONB;
  v_loop_counter INT;

BEGIN
  -- ========================================
  -- 1. VALIDATE INPUT PARAMETERS
  -- ========================================

  -- Validate count range
  IF p_count < c_min_count OR p_count > c_max_count THEN
    RAISE EXCEPTION 'Invalid count: Must be between % and % (received: %)',
      c_min_count, c_max_count, p_count;
  END IF;

  -- Validate payment method
  IF p_payment_method NOT IN ('gidouilles', 'vip_card') THEN
    RAISE EXCEPTION 'Invalid payment_method: Must be ''gidouilles'' or ''vip_card'' (received: ''%'')',
      p_payment_method;
  END IF;

  -- ========================================
  -- 2. AUTHORIZATION
  -- ========================================

  v_caller_id := auth.uid();
  v_is_teacher := is_teacher_or_admin();

  -- Check if caller is authorized (teacher/admin OR the student themselves)
  IF v_is_teacher THEN
    -- Teacher/admin: verify student is in their classes
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
    -- Student drawing for themselves
    v_is_authorized := TRUE;
  ELSE
    -- Neither teacher nor the student
    RAISE EXCEPTION 'Unauthorized: You can only draw cards for yourself or your students';
  END IF;

  -- ========================================
  -- 3. LOCK STUDENT PROFILE (PREVENT RACE CONDITIONS)
  -- ========================================

  -- Use SELECT FOR UPDATE to prevent concurrent draws (double spend protection)
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

  -- Read active config from vip_card_config table
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

  -- Fallback to default probabilities if no active config found
  IF v_common_prob IS NULL THEN
    v_common_prob := 60;
    v_rare_prob := 25;
    v_epic_prob := 12;
    v_legendary_prob := 3;
    RAISE NOTICE 'No active config found, using default probabilities: common=60%%, rare=25%%, epic=12%%, legendary=3%%';
  END IF;

  -- Calculate cumulative probability ranges
  v_common_max := v_common_prob;                          -- 1-60
  v_rare_max := v_common_max + v_rare_prob;               -- 61-85
  v_epic_max := v_rare_max + v_epic_prob;                 -- 86-97
  -- legendary is anything above v_epic_max (98-100)

  RAISE NOTICE 'Using rarity probabilities: common=%%%, rare=%%%, epic=%%%, legendary=%%%',
    v_common_prob, v_rare_prob, v_epic_prob, v_legendary_prob;

  -- ========================================
  -- 5. PROCESS PAYMENT
  -- ========================================

  IF p_payment_method = 'gidouilles' THEN
    -- ------------------------------
    -- PAYMENT METHOD: GIDOUILLES
    -- ------------------------------

    -- Validate gidouilles_cost parameter
    IF p_gidouilles_cost IS NULL THEN
      RAISE EXCEPTION 'Missing parameter: gidouilles_cost is required for gidouilles payment';
    END IF;

    IF p_gidouilles_cost < 0 THEN
      RAISE EXCEPTION 'Invalid gidouilles_cost: Cannot be negative (received: %)', p_gidouilles_cost;
    END IF;

    -- Validate proportional cost (max 10 gidouilles per card)
    IF p_gidouilles_cost > (p_count * c_max_cost_per_card) THEN
      RAISE EXCEPTION 'Invalid gidouilles_cost: Maximum % gidouilles for % cards (received: %)',
        (p_count * c_max_cost_per_card), p_count, p_gidouilles_cost;
    END IF;

    -- CRITICAL: Students CANNOT draw free cards (cost = 0)
    IF p_gidouilles_cost = 0 AND NOT v_is_teacher THEN
      RAISE EXCEPTION 'Unauthorized: Students cannot draw free cards (cost must be > 0)';
    END IF;

    -- Check sufficient balance
    IF v_current_gidouilles < p_gidouilles_cost THEN
      RAISE EXCEPTION 'Insufficient gidouilles: Required %, available % (shortfall: %)',
        p_gidouilles_cost, v_current_gidouilles, (p_gidouilles_cost - v_current_gidouilles);
    END IF;

    -- Deduct gidouilles
    v_current_gidouilles := v_current_gidouilles - p_gidouilles_cost;

    -- Audit log
    RAISE NOTICE 'draw_multiple_vip_cards: student_id=%, payment=gidouilles, cost=%, cards=%',
      p_student_id, p_gidouilles_cost, p_count;

  ELSIF p_payment_method = 'vip_card' THEN
    -- ------------------------------
    -- PAYMENT METHOD: VIP CARD
    -- ------------------------------

    -- Validate vip_card_instance_id parameter
    IF p_vip_card_instance_id IS NULL THEN
      RAISE EXCEPTION 'Missing parameter: vip_card_instance_id is required for vip_card payment';
    END IF;

    -- Initialize vip_cards if null
    v_vip_cards := COALESCE(v_vip_cards, '{}'::jsonb);

    -- Get card instance
    v_card_instance := v_vip_cards->p_vip_card_instance_id::text;

    IF v_card_instance IS NULL THEN
      RAISE EXCEPTION 'VIP card not found: Instance ID % does not exist in student''s cards',
        p_vip_card_instance_id;
    END IF;

    -- Check if card is already used
    v_card_used_at := v_card_instance->>'usedAt';

    IF v_card_used_at IS NOT NULL THEN
      RAISE EXCEPTION 'VIP card already used: This card was used at %', v_card_used_at;
    END IF;

    -- TODO: Validate card has draw_cards action
    -- This should check the card's actions array to ensure it can draw cards
    -- For now, we trust that the frontend only sends valid draw_cards instances

    -- Mark card as used
    v_vip_cards := jsonb_set(
      v_vip_cards,
      ARRAY[p_vip_card_instance_id::text, 'usedAt'],
      to_jsonb(NOW()::text)
    );

    -- Audit log
    RAISE NOTICE 'draw_multiple_vip_cards: student_id=%, payment=vip_card, instance_id=%, cards=%',
      p_student_id, p_vip_card_instance_id, p_count;

  END IF;

  -- ========================================
  -- 6. DRAW RANDOM VIP CARDS (WEIGHTED BY RARITY)
  -- ========================================

  -- Loop to draw p_count cards
  FOR v_loop_counter IN 1..p_count LOOP

    -- ------------------------------------
    -- STEP 1: Weighted Rarity Selection
    -- ------------------------------------
    -- Roll 1-100 and determine rarity based on cumulative probabilities
    v_roll := floor(random() * 100 + 1)::int;

    IF v_roll <= v_common_max THEN
      v_selected_rarity := 'common';
    ELSIF v_roll <= v_rare_max THEN
      v_selected_rarity := 'rare';
    ELSIF v_roll <= v_epic_max THEN
      v_selected_rarity := 'epic';
    ELSE
      v_selected_rarity := 'legendary';
    END IF;

    RAISE NOTICE 'Draw %: rolled %, selected rarity=%', v_loop_counter, v_roll, v_selected_rarity;

    -- ------------------------------------
    -- STEP 2: Select Random Card from Chosen Rarity
    -- ------------------------------------
    -- Query vip_card_templates for a random enabled card of selected rarity
    SELECT id INTO v_card_id
    FROM vip_card_templates
    WHERE rarity = v_selected_rarity
      AND is_enabled = TRUE
    ORDER BY random()
    LIMIT 1;

    -- ------------------------------------
    -- STEP 3: Fallback if No Enabled Cards in Rarity
    -- ------------------------------------
    IF v_card_id IS NULL THEN
      RAISE NOTICE 'No enabled cards for rarity=%, falling back to common', v_selected_rarity;

      -- Fallback to common rarity
      SELECT id INTO v_card_id
      FROM vip_card_templates
      WHERE rarity = 'common'
        AND is_enabled = TRUE
      ORDER BY random()
      LIMIT 1;

      -- If still no cards, abort
      IF v_card_id IS NULL THEN
        RAISE EXCEPTION 'No enabled VIP cards available to draw (checked % and common)', v_selected_rarity;
      END IF;
    END IF;

    RAISE NOTICE 'Drew card: % (rarity=%)', v_card_id, v_selected_rarity;

    -- ------------------------------------
    -- STEP 4: Create Card Instance
    -- ------------------------------------

    -- Generate unique instance ID
    v_instance_id := gen_random_uuid();

    -- Capture earned timestamp
    v_earned_at := NOW();

    -- Create new card instance
    v_new_card_instance := jsonb_build_object(
      'cardId', v_card_id,
      'earnedAt', v_earned_at,
      'usedAt', null
    );

    -- Add to student's vip_cards JSONB
    v_vip_cards := COALESCE(v_vip_cards, '{}'::jsonb) || jsonb_build_object(
      v_instance_id::text,
      v_new_card_instance
    );

    -- Add to results array
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.draw_multiple_vip_cards(UUID, INT, TEXT, INT, UUID) TO authenticated;

-- Update function comment for documentation
COMMENT ON FUNCTION public.draw_multiple_vip_cards(UUID, INT, TEXT, INT, UUID) IS
'Draws multiple VIP cards for a student with rarity-weighted probabilities (default: 60% common, 25% rare, 12% epic, 3% legendary). Probabilities are configurable via vip_card_config table. Only enabled cards (is_enabled=TRUE) can be drawn. Supports two payment methods: ''gidouilles'' (with cost validation and race condition protection via SELECT FOR UPDATE) or ''vip_card'' (using an existing draw_cards card). Students cannot draw free cards (cost=0), only teachers can. Returns JSONB array of drawn cards with cardId, instanceId, and earnedAt.';
