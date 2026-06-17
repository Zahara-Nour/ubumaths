-- Migration: Add draw_multiple_vip_cards RPC Function
-- Created: 2025-11-04
--
-- This migration adds a secure RPC function for drawing multiple VIP cards
-- with comprehensive security protections against race conditions and abuse.
--
-- FUNCTION SIGNATURE:
-- -------------------
-- draw_multiple_vip_cards(
--   p_student_id UUID,
--   p_count INT,
--   p_payment_method TEXT,
--   p_gidouilles_cost INT DEFAULT NULL,
--   p_vip_card_instance_id UUID DEFAULT NULL
-- ) RETURNS JSONB
--
-- SECURITY MODEL:
-- ---------------
-- 1. SELECT FOR UPDATE on profiles to prevent race conditions (double spend)
-- 2. Students CANNOT draw free cards (cost = 0 rejected for students)
-- 3. Teachers CAN draw free cards (cost = 0 allowed for teachers/admins)
-- 4. Proportional validation: cost ≤ (count * 10) gidouilles per card max
-- 5. Authorization: teacher/admin OR auth.uid() = student
-- 6. If teacher draws for student: verify student in teacher's classes
-- 7. Count validation: 1-10 cards per draw
-- 8. Payment method validation: 'gidouilles' or 'vip_card'
--
-- PAYMENT METHODS:
-- ----------------
-- For 'gidouilles':
--   - Validates cost is not null and >= 0
--   - Validates cost <= (count * 10)
--   - If cost = 0: only allowed if is_teacher_or_admin()
--   - Checks balance >= cost with SELECT FOR UPDATE
--   - Deducts gidouilles
--
-- For 'vip_card':
--   - Validates vip_card_instance_id is not null
--   - Gets card instance with SELECT FOR UPDATE
--   - Validates card exists in student's vip_cards
--   - Validates card not already used (usedAt IS NULL)
--   - Marks card as used (sets usedAt = NOW())
--   - TODO: Validate card has draw_cards action (future improvement)
--
-- RETURN FORMAT:
-- --------------
-- {
--   "cards": [
--     {"cardId": "soldes", "instanceId": "uuid", "earnedAt": "timestamp"},
--     ...
--   ]
-- }

-- ============================================================================
-- FUNCTION: draw_multiple_vip_cards
-- ============================================================================

CREATE OR REPLACE FUNCTION draw_multiple_vip_cards(
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

  -- Card drawing variables
  v_card_ids TEXT[] := ARRAY[
    'bonus', 'super-bonus', 'mega-bonus', 'coup-double',
    'choix', 'bougeotte', 'super-bougeotte', 'tranquilou', 'throne',
    'candy', 'jeu', 'lalala',
    'captain', 'team', 'fame',
    'help', 'memoire', 'mathemagie', 'alchimie', 'ecrabouilleur',
    'inventeur', 'batman', 'soldes', 'mega-soldes', 'fortune', 'Sheikh'
  ];
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
  -- 4. PROCESS PAYMENT
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
  -- 5. DRAW RANDOM VIP CARDS
  -- ========================================

  -- Loop to draw p_count cards
  FOR v_loop_counter IN 1..p_count LOOP
    -- Select random VIP card (uniform distribution for now)
    -- TODO: Implement rarity-based weighting if needed
    v_card_id := v_card_ids[1 + floor(random() * array_length(v_card_ids, 1))::int];

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
  -- 6. UPDATE STUDENT PROFILE
  -- ========================================

  UPDATE profiles
  SET
    gidouilles = v_current_gidouilles,
    vip_cards = v_vip_cards,
    updated_at = NOW()
  WHERE id = p_student_id;

  -- ========================================
  -- 7. RETURN RESULTS
  -- ========================================

  RETURN jsonb_build_object(
    'cards', v_drawn_cards
  );

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION draw_multiple_vip_cards(UUID, INT, TEXT, INT, UUID) TO authenticated;

-- Add function comment for documentation
COMMENT ON FUNCTION draw_multiple_vip_cards(UUID, INT, TEXT, INT, UUID) IS
'Draws multiple VIP cards for a student with comprehensive security protections. Supports two payment methods: ''gidouilles'' (with cost validation and race condition protection via SELECT FOR UPDATE) or ''vip_card'' (using an existing draw_cards card). Students cannot draw free cards (cost=0), only teachers can. Returns JSONB array of drawn cards with cardId, instanceId, and earnedAt.';
