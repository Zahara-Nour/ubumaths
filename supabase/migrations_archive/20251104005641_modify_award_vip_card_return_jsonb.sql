/**
 * Modify award_random_vip_card to return JSONB
 * ==============================================
 *
 * Changes the return type from TEXT (cardId only) to JSONB containing:
 * - cardId: The randomly selected card ID
 * - instanceId: The UUID of the created card instance
 * - earnedAt: The timestamp when the card was earned
 *
 * This allows the frontend to immediately update the cache without needing
 * to refresh data from the database.
 */

-- Drop existing function (required to change return type)
DROP FUNCTION IF EXISTS award_random_vip_card(UUID);

-- Recreate function with JSONB return type
CREATE FUNCTION award_random_vip_card(
  p_student_id UUID
)
RETURNS JSONB
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
  v_earned_at TIMESTAMPTZ;
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

  -- Capture earned timestamp
  v_earned_at := now();

  -- Create new card instance
  v_new_card_instance := jsonb_build_object(
    'cardId', v_card_id,
    'earnedAt', v_earned_at,
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

  -- Return complete card information as JSONB
  RETURN jsonb_build_object(
    'cardId', v_card_id,
    'instanceId', v_instance_id,
    'earnedAt', v_earned_at
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION award_random_vip_card(UUID) TO authenticated;

-- Update function comment for documentation
COMMENT ON FUNCTION award_random_vip_card(UUID) IS
'Awards a random VIP card to a student (costs 3 gidouilles). Returns JSONB with cardId, instanceId, and earnedAt. Only teachers who have the student in their classes can call this.';
