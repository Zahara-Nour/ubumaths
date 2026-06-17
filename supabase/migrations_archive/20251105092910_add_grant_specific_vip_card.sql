-- Migration: Add grant_specific_vip_card RPC function
-- Description: Allows teachers to grant a specific VIP card to a student for free
-- Security: SECURITY DEFINER with teacher-student relationship validation
-- Created: 2025-11-05

CREATE OR REPLACE FUNCTION grant_specific_vip_card(
  p_student_id UUID,
  p_card_id TEXT,
  p_count INT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id UUID;
  v_is_teacher BOOLEAN;
  v_vip_cards JSONB;
  v_new_instance JSONB;
  v_new_instance_id UUID;
  v_earned_at TIMESTAMPTZ;
  v_result JSONB;
  v_cards JSONB[];
  i INT;
BEGIN
  -- Get the calling user ID
  v_teacher_id := auth.uid();

  -- Check if the user is a teacher or admin
  SELECT is_teacher_or_admin()
  INTO v_is_teacher;

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Only teachers and admins can grant VIP cards';
  END IF;

  -- Verify that the teacher owns this student (via class_members)
  IF NOT EXISTS (
    SELECT 1
    FROM class_members cm
    JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = p_student_id
      AND c.teacher_id = v_teacher_id
  ) THEN
    RAISE EXCEPTION 'You do not have permission to grant cards to this student';
  END IF;

  -- Validate card_id exists in vip_card_templates
  IF NOT EXISTS (SELECT 1 FROM vip_card_templates WHERE id = p_card_id) THEN
    RAISE EXCEPTION 'Invalid card ID: %', p_card_id;
  END IF;

  -- Validate count
  IF p_count < 1 OR p_count > 10 THEN
    RAISE EXCEPTION 'Count must be between 1 and 10';
  END IF;

  -- Lock the student's profile row to prevent race conditions
  SELECT vip_cards
  INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  -- Initialize empty array if vip_cards is null
  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

  -- Initialize result array
  v_cards := ARRAY[]::JSONB[];
  v_earned_at := NOW();

  -- Add the specified card p_count times
  FOR i IN 1..p_count LOOP
    v_new_instance_id := gen_random_uuid();

    v_new_instance := jsonb_build_object(
      'cardId', p_card_id,
      'earnedAt', v_earned_at,
      'usedAt', NULL
    );

    -- Add to vip_cards JSONB object
    v_vip_cards := v_vip_cards || jsonb_build_object(v_new_instance_id::TEXT, v_new_instance);

    -- Add to result array
    v_cards := v_cards || jsonb_build_object(
      'cardId', p_card_id,
      'instanceId', v_new_instance_id,
      'earnedAt', v_earned_at
    );
  END LOOP;

  -- Update the student's profile
  UPDATE profiles
  SET vip_cards = v_vip_cards
  WHERE id = p_student_id;

  -- Build result object
  v_result := jsonb_build_object('cards', to_jsonb(v_cards));

  RETURN v_result;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION grant_specific_vip_card(UUID, TEXT, INT) IS
'Allows teachers to grant a specific VIP card to a student for free. Validates teacher-student relationship and card existence.';
