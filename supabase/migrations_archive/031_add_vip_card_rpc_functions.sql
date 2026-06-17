-- Migration: Add VIP Card RPC Functions
-- Created: 2025-10-13
--
-- This migration adds secure RPC functions for managing VIP cards in the reward system.
-- Students can earn VIP cards by spending 3 gidouilles.
--
-- SECURITY MODEL:
-- ---------------
-- Teachers can award VIP cards to their students through SECURITY DEFINER functions
-- that verify teacher-student relationships and enforce business rules.
--
-- FUNCTIONS CREATED:
-- ------------------
-- 1. award_random_vip_card(student_id UUID) RETURNS TEXT
--    - Awards a random VIP card to a student
--    - Deducts 3 gidouilles from student
--    - Returns the awarded card ID
--
-- 2. use_vip_card(student_id UUID, card_id TEXT) RETURNS BOOLEAN
--    - Marks a VIP card instance as used
--    - Returns success/failure
--
-- VIP CARD DATA STRUCTURE:
-- ------------------------
-- vip_cards JSONB column stores card instances:
-- {
--   "uuid-1": { "cardId": "bonus", "earnedAt": "2025-10-13T...", "usedAt": null },
--   "uuid-2": { "cardId": "captain", "earnedAt": "2025-10-13T...", "usedAt": "2025-10-14T..." }
-- }

-- ============================================================================
-- FUNCTION 1: award_random_vip_card
-- ============================================================================
-- Awards a random VIP card to a student by deducting 3 gidouilles.
--
-- PARAMETERS:
--   p_student_id (UUID): The student's profile ID
--
-- RETURNS:
--   TEXT: The card ID that was awarded (e.g., "bonus", "captain", etc.)
--
-- SECURITY:
--   - SECURITY DEFINER: Runs with creator's permissions (bypasses RLS)
--   - Verifies caller is a teacher via is_teacher_or_admin()
--   - Verifies student is in one of the teacher's classes
--   - Ensures student has at least 3 gidouilles
--
-- ERRORS:
--   - 'Unauthorized: Only teachers can award VIP cards'
--   - 'Unauthorized: Student is not in your classes'
--   - 'Insufficient gidouilles: Student needs at least 3 gidouilles'
--
-- CARD SELECTION:
--   - Randomly selects from 26 available VIP cards
--   - Uses weighted probability based on rarity (handled by application)
--   - For database, simple random selection from card pool

CREATE OR REPLACE FUNCTION award_random_vip_card(
  p_student_id UUID
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
  v_current_gidouilles INTEGER;
  v_new_gidouilles INTEGER;
  v_card_id TEXT;
  v_instance_id TEXT;
  v_new_card_instance JSONB;
  v_card_ids TEXT[] := ARRAY[
    'bonus', 'super-bonus', 'mega-bonus', 'coup-double',
    'choix', 'bougeotte', 'super-bougeotte', 'tranquilou', 'throne',
    'candy', 'jeu', 'lalala',
    'captain', 'team', 'fame',
    'help', 'memoire', 'mathemagie', 'alchimie', 'ecrabouilleur',
    'inventeur', 'batman', 'soldes', 'mega-soldes', 'fortune', 'Sheikh'
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

  -- Get current gidouilles count
  SELECT gidouilles INTO v_current_gidouilles
  FROM profiles
  WHERE id = p_student_id;

  -- Check if student has enough gidouilles (at least 3)
  IF v_current_gidouilles < 3 THEN
    RAISE EXCEPTION 'Insufficient gidouilles: Student needs at least 3 gidouilles (current: %)', v_current_gidouilles;
  END IF;

  -- Calculate new gidouilles value
  v_new_gidouilles := v_current_gidouilles - 3;

  -- Select random VIP card
  v_card_id := v_card_ids[1 + floor(random() * array_length(v_card_ids, 1))::int];

  -- Generate unique instance ID
  v_instance_id := gen_random_uuid()::text;

  -- Create new card instance
  v_new_card_instance := jsonb_build_object(
    'cardId', v_card_id,
    'earnedAt', now(),
    'usedAt', null
  );

  -- Update student profile: deduct gidouilles and add VIP card
  -- Use COALESCE to handle case where vip_cards might be null
  UPDATE profiles
  SET
    gidouilles = v_new_gidouilles,
    vip_cards = COALESCE(vip_cards, '{}'::jsonb) || jsonb_build_object(v_instance_id, v_new_card_instance),
    updated_at = NOW()
  WHERE id = p_student_id;

  -- Return the awarded card ID
  RETURN v_card_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION award_random_vip_card(UUID) TO authenticated;

-- Add function comment for documentation
COMMENT ON FUNCTION award_random_vip_card(UUID) IS
'Awards a random VIP card to a student by deducting 3 gidouilles. Only teachers who have the student in their classes can call this. Returns the card ID that was awarded.';


-- ============================================================================
-- FUNCTION 2: use_vip_card
-- ============================================================================
-- Marks a VIP card instance as used (consumed) by setting the usedAt timestamp.
--
-- PARAMETERS:
--   p_student_id (UUID): The student's profile ID
--   p_card_id (TEXT): The card ID to use (e.g., "bonus")
--
-- RETURNS:
--   BOOLEAN: TRUE if card was successfully used, FALSE if no unused card found
--
-- SECURITY:
--   - SECURITY DEFINER: Runs with creator's permissions (bypasses RLS)
--   - Verifies caller is a teacher via is_teacher_or_admin()
--   - Verifies student is in one of the teacher's classes
--
-- BEHAVIOR:
--   - Finds the oldest unused instance of the specified card
--   - Sets usedAt timestamp to current time
--   - Returns FALSE if no unused instance exists
--
-- ERRORS:
--   - 'Unauthorized: Only teachers can manage VIP cards'
--   - 'Unauthorized: Student is not in your classes'

CREATE OR REPLACE FUNCTION use_vip_card(
  p_student_id UUID,
  p_card_id TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER -- Run with function creator's permissions
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_teacher_id UUID;
  v_is_teacher BOOLEAN;
  v_student_in_class BOOLEAN;
  v_vip_cards JSONB;
  v_instance_id TEXT;
  v_oldest_date TIMESTAMPTZ;
  v_updated_cards JSONB;
  v_found BOOLEAN := FALSE;
BEGIN
  -- Get the current user's ID (the teacher calling this function)
  v_teacher_id := auth.uid();

  -- Check if caller is a teacher or admin
  v_is_teacher := is_teacher_or_admin();

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Unauthorized: Only teachers can manage VIP cards';
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

  -- Get student's VIP cards
  SELECT vip_cards INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id;

  -- If no cards, return FALSE
  IF v_vip_cards IS NULL OR v_vip_cards = '{}'::jsonb THEN
    RETURN FALSE;
  END IF;

  -- Find oldest unused instance of the specified card
  -- Loop through all card instances
  FOR v_instance_id IN
    SELECT key
    FROM jsonb_each(v_vip_cards)
  LOOP
    DECLARE
      v_card_data JSONB;
      v_card_id_check TEXT;
      v_used_at TEXT;
      v_earned_at TIMESTAMPTZ;
    BEGIN
      v_card_data := v_vip_cards->v_instance_id;
      v_card_id_check := v_card_data->>'cardId';
      v_used_at := v_card_data->>'usedAt';

      -- Check if this is the card we're looking for and it's unused
      IF v_card_id_check = p_card_id AND v_used_at IS NULL THEN
        v_earned_at := (v_card_data->>'earnedAt')::timestamptz;

        -- Track the oldest instance
        IF v_oldest_date IS NULL OR v_earned_at < v_oldest_date THEN
          v_oldest_date := v_earned_at;
          v_found := TRUE;

          -- Mark this instance as used
          v_vip_cards := jsonb_set(
            v_vip_cards,
            ARRAY[v_instance_id, 'usedAt'],
            to_jsonb(now()::text)
          );
        END IF;
      END IF;
    END;
  END LOOP;

  -- If we found and marked a card as used, update the database
  IF v_found THEN
    UPDATE profiles
    SET
      vip_cards = v_vip_cards,
      updated_at = NOW()
    WHERE id = p_student_id;

    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION use_vip_card(UUID, TEXT) TO authenticated;

-- Add function comment for documentation
COMMENT ON FUNCTION use_vip_card(UUID, TEXT) IS
'Marks a VIP card instance as used (consumed) by setting usedAt timestamp. Only teachers who have the student in their classes can call this. Returns TRUE if successful, FALSE if no unused card found.';
