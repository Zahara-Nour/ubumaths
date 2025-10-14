-- Migration: Add Remove VIP Card RPC Function
-- Created: 2025-10-14
--
-- This migration adds a secure RPC function for removing VIP cards from students.
-- Teachers can remove cards from their students (no gidouilles refund).
--
-- SECURITY MODEL:
-- ---------------
-- Teachers can remove VIP cards from their students through SECURITY DEFINER function
-- that verifies teacher-student relationships.
--
-- FUNCTION CREATED:
-- -----------------
-- remove_student_vip_card(student_id UUID, card_id TEXT) RETURNS BOOLEAN
--    - Removes one instance of a VIP card from a student
--    - No gidouilles refund
--    - Returns success/failure
--
-- ============================================================================
-- FUNCTION: remove_student_vip_card
-- ============================================================================
-- Removes one instance of a VIP card from a student's collection.
-- Finds and deletes the oldest unused instance of the specified card.
--
-- PARAMETERS:
--   p_student_id (UUID): The student's profile ID
--   p_card_id (TEXT): The card ID to remove (e.g., "bonus", "captain")
--
-- RETURNS:
--   BOOLEAN: TRUE if card was successfully removed, FALSE if no card found
--
-- SECURITY:
--   - SECURITY DEFINER: Runs with creator's permissions (bypasses RLS)
--   - Verifies caller is a teacher via is_teacher_or_admin()
--   - Verifies student is in one of the teacher's classes
--
-- BEHAVIOR:
--   - Finds the oldest unused instance of the specified card
--   - Removes it from the JSONB vip_cards object
--   - No gidouilles refund (card is simply deleted)
--   - Returns FALSE if no instance exists
--
-- ERRORS:
--   - 'Unauthorized: Only teachers can remove VIP cards'
--   - 'Unauthorized: Student is not in your classes'

CREATE OR REPLACE FUNCTION remove_student_vip_card(
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
  v_oldest_instance_id TEXT;
BEGIN
  -- Get the current user's ID (the teacher calling this function)
  v_teacher_id := auth.uid();

  -- Check if caller is a teacher or admin
  v_is_teacher := is_teacher_or_admin();

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Unauthorized: Only teachers can remove VIP cards';
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
          v_oldest_instance_id := v_instance_id;
        END IF;
      END IF;
    END;
  END LOOP;

  -- If we found an instance to remove, delete it from JSONB
  IF v_oldest_instance_id IS NOT NULL THEN
    -- Remove the instance from vip_cards JSONB
    v_vip_cards := v_vip_cards - v_oldest_instance_id;

    -- Update the database
    UPDATE profiles
    SET
      vip_cards = v_vip_cards,
      updated_at = NOW()
    WHERE id = p_student_id;

    RETURN TRUE;
  ELSE
    -- No matching card found
    RETURN FALSE;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION remove_student_vip_card(UUID, TEXT) TO authenticated;

-- Add function comment for documentation
COMMENT ON FUNCTION remove_student_vip_card(UUID, TEXT) IS
'Removes one instance of a VIP card from a student (no gidouilles refund). Only teachers who have the student in their classes can call this. Returns TRUE if successful, FALSE if no card found.';
