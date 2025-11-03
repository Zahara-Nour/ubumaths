-- Migration: Add VIP Card Action Functions
-- Created: 2025-11-03
--
-- This migration adds RPC functions for executing VIP card actions.
-- These functions are used when teachers approve activation requests.
--
-- FUNCTIONS CREATED:
-- ------------------
-- 1. award_vip_card_no_cost(student_id UUID, card_id TEXT DEFAULT NULL) RETURNS TEXT
--    - Awards a VIP card to a student WITHOUT deducting gidouilles
--    - Used for card actions (draw_cards)
--    - Returns the awarded card ID
--
-- 2. add_student_gidouilles(student_id UUID, amount INTEGER) RETURNS INTEGER
--    - Adds gidouilles to a student (can be positive or negative)
--    - Used for add_gidouilles action
--    - Returns new gidouilles balance
--
-- SECURITY:
--   - Both functions use SECURITY DEFINER
--   - Verify caller is teacher/admin
--   - Verify student is in teacher's classes

-- ============================================================================
-- FUNCTION 1: award_vip_card_no_cost
-- ============================================================================
-- Awards a VIP card to a student without deducting gidouilles.
-- Similar to award_random_vip_card but for card actions (no cost).
--
-- PARAMETERS:
--   p_student_id (UUID): The student's profile ID
--   p_card_id (TEXT): Optional specific card ID to award. If NULL, random card is selected.
--
-- RETURNS:
--   TEXT: The card ID that was awarded (e.g., "bonus", "captain", etc.)
--
-- SECURITY:
--   - SECURITY DEFINER: Runs with creator's permissions (bypasses RLS)
--   - Verifies caller is a teacher via is_teacher_or_admin()
--   - Verifies student is in one of the teacher's classes
--
-- ERRORS:
--   - 'Unauthorized: Only teachers can award VIP cards'
--   - 'Unauthorized: Student is not in your classes'
--   - 'Invalid card_id: Card not found'

CREATE OR REPLACE FUNCTION award_vip_card_no_cost(
  p_student_id UUID,
  p_card_id TEXT DEFAULT NULL
)
RETURNS TEXT
SECURITY DEFINER -- Run with function creator's permissions
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_teacher_id UUID;
  v_is_teacher BOOLEAN;
  v_student_in_class BOOLEAN;
  v_card_id TEXT;
  v_instance_id TEXT;
  v_new_card_instance JSONB;
  v_card_ids TEXT[] := ARRAY[
    'bonus', 'super-bonus', 'mega-bonus', 'coup-double',
    'choix', 'bougeotte', 'super-bougeotte', 'tranquilou', 'throne',
    'jeu', 'lalalalala',
    'fame',
    'help', 'memoire', 'mathemagie', 'alchimie', 'ecrabouilleur',
    'inventeur', 'batman', 'soldes', 'super-soldes', 'mega-soldes', 'fortune', 'Sheikh'
  ];
BEGIN
  -- Get the current user's ID (the teacher calling this function)
  v_teacher_id := auth.uid();

  -- Check if caller is a teacher or admin
  v_is_teacher := is_teacher_or_admin();

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Unauthorized: Only teachers can award VIP cards';
  END IF;

  -- Check if student is in one of the teacher's classes
  SELECT EXISTS (
    SELECT 1
    FROM class_members cm
    INNER JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = p_student_id
      AND c.teacher_id = v_teacher_id
  ) INTO v_student_in_class;

  IF NOT v_student_in_class THEN
    RAISE EXCEPTION 'Unauthorized: Student is not in your classes';
  END IF;

  -- Use provided card_id or select random one
  IF p_card_id IS NOT NULL THEN
    -- Validate that card_id exists
    IF NOT (p_card_id = ANY(v_card_ids)) THEN
      RAISE EXCEPTION 'Invalid card_id: Card not found';
    END IF;
    v_card_id := p_card_id;
  ELSE
    -- Select random VIP card
    v_card_id := v_card_ids[1 + floor(random() * array_length(v_card_ids, 1))::int];
  END IF;

  -- Generate unique instance ID
  v_instance_id := gen_random_uuid()::text;

  -- Create new card instance
  v_new_card_instance := jsonb_build_object(
    'cardId', v_card_id,
    'earnedAt', now(),
    'usedAt', null
  );

  -- Update student profile: add VIP card (no gidouilles deduction)
  UPDATE profiles
  SET
    vip_cards = COALESCE(vip_cards, '{}'::jsonb) || jsonb_build_object(v_instance_id, v_new_card_instance),
    updated_at = NOW()
  WHERE id = p_student_id;

  -- Return the awarded card ID
  RETURN v_card_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION award_vip_card_no_cost(UUID, TEXT) TO authenticated;

-- Add function comment for documentation
COMMENT ON FUNCTION award_vip_card_no_cost(UUID, TEXT) IS
'Awards a VIP card to a student without deducting gidouilles. Used for card actions. Only teachers who have the student in their classes can call this. Returns the card ID that was awarded.';


-- ============================================================================
-- FUNCTION 2: add_student_gidouilles
-- ============================================================================
-- Adds (or subtracts) gidouilles to a student balance.
--
-- PARAMETERS:
--   p_student_id (UUID): The student's profile ID
--   p_amount (INTEGER): Amount to add (can be negative to subtract)
--
-- RETURNS:
--   INTEGER: The new gidouilles balance
--
-- SECURITY:
--   - SECURITY DEFINER: Runs with creator's permissions (bypasses RLS)
--   - Verifies caller is a teacher via is_teacher_or_admin()
--   - Verifies student is in one of the teacher's classes
--   - Ensures balance doesn't go below 0
--
-- ERRORS:
--   - 'Unauthorized: Only teachers can modify gidouilles'
--   - 'Unauthorized: Student is not in your classes'
--   - 'Insufficient gidouilles: Cannot go below 0'

CREATE OR REPLACE FUNCTION add_student_gidouilles(
  p_student_id UUID,
  p_amount INTEGER
)
RETURNS INTEGER
SECURITY DEFINER -- Run with function creator's permissions
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_teacher_id UUID;
  v_is_teacher BOOLEAN;
  v_student_in_class BOOLEAN;
  v_current_gidouilles INTEGER;
  v_new_gidouilles INTEGER;
BEGIN
  -- Get the current user's ID (the teacher calling this function)
  v_teacher_id := auth.uid();

  -- Check if caller is a teacher or admin
  v_is_teacher := is_teacher_or_admin();

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Unauthorized: Only teachers can modify gidouilles';
  END IF;

  -- Check if student is in one of the teacher's classes
  SELECT EXISTS (
    SELECT 1
    FROM class_members cm
    INNER JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = p_student_id
      AND c.teacher_id = v_teacher_id
  ) INTO v_student_in_class;

  IF NOT v_student_in_class THEN
    RAISE EXCEPTION 'Unauthorized: Student is not in your classes';
  END IF;

  -- Get current gidouilles
  SELECT gidouilles INTO v_current_gidouilles
  FROM profiles
  WHERE id = p_student_id;

  -- Calculate new balance
  v_new_gidouilles := v_current_gidouilles + p_amount;

  -- Ensure balance doesn't go negative
  IF v_new_gidouilles < 0 THEN
    RAISE EXCEPTION 'Insufficient gidouilles: Cannot go below 0 (current: %, attempted change: %)', v_current_gidouilles, p_amount;
  END IF;

  -- Update gidouilles
  UPDATE profiles
  SET
    gidouilles = v_new_gidouilles,
    updated_at = NOW()
  WHERE id = p_student_id;

  -- Return new balance
  RETURN v_new_gidouilles;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_student_gidouilles(UUID, INTEGER) TO authenticated;

-- Add function comment for documentation
COMMENT ON FUNCTION add_student_gidouilles(UUID, INTEGER) IS
'Adds or subtracts gidouilles to/from a student balance. Only teachers who have the student in their classes can call this. Returns the new gidouilles balance. Ensures balance never goes negative.';
