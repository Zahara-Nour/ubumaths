-- Migration: Allow Students to Activate VIP Cards
-- Created: 2025-11-09
--
-- This migration modifies the award_vip_card_no_cost RPC function to allow
-- students to award cards to themselves when activating approved VIP cards.
--
-- CHANGES:
-- ---------
-- 1. award_vip_card_no_cost: Modified authorization logic to allow:
--    - Teachers awarding to their students (existing behavior)
--    - Students awarding to themselves (new behavior for VIP card activation)
--
-- SECURITY:
-- ---------
-- - Teachers can still only award to students in their classes
-- - Students can ONLY award to themselves (cannot award to other students)
-- - Endpoint authorization already verified VIP card approval before calling

-- ============================================================================
-- FUNCTION: award_vip_card_no_cost (UPDATED)
-- ============================================================================
-- Awards a VIP card to a student without deducting gidouilles.
-- Now supports both teacher AND student (self-activation) flows.
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
--   - Two authorization modes:
--     * Teacher mode: Verifies caller is teacher AND student is in their classes
--     * Student mode: Verifies caller is the student (self-activation)
--
-- ERRORS:
--   - 'Unauthorized: You can only award cards to yourself or your students'
--   - 'Unauthorized: Student is not in your classes' (teacher mode)
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
  v_caller_id UUID;
  v_is_teacher BOOLEAN;
  v_is_self_activation BOOLEAN;
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
  -- Get the current user's ID (the caller)
  v_caller_id := auth.uid();

  -- Check if caller is a teacher or admin
  v_is_teacher := is_teacher_or_admin();

  -- Check if this is self-activation (student awarding to themselves)
  v_is_self_activation := (v_caller_id = p_student_id);

  -- Authorization: Must be either a teacher OR self-activation
  IF NOT v_is_teacher AND NOT v_is_self_activation THEN
    RAISE EXCEPTION 'Unauthorized: You can only award cards to yourself or your students';
  END IF;

  -- If teacher mode: verify student is in one of their classes
  IF v_is_teacher AND NOT v_is_self_activation THEN
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
  END IF;

  -- If student self-activation: no additional checks needed
  -- (endpoint already verified VIP card approval)

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

-- Update function comment for documentation
COMMENT ON FUNCTION award_vip_card_no_cost(UUID, TEXT) IS
'Awards a VIP card to a student without deducting gidouilles. Supports two modes: (1) Teachers awarding to students in their classes, (2) Students self-activating approved VIP cards. Returns the card ID that was awarded.';
