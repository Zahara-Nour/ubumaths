-- ============================================================================
-- FIX: use_vip_card marking multiple cards instead of just the oldest
-- ============================================================================
-- BUG: The previous implementation marked each card as used WHILE searching
-- for the oldest one. So if a student had 2 Batman cards:
--   - Card A (Jan 1) and Card B (Jan 2)
-- The loop would:
--   1. Find Card B first → mark it (first found, no oldest_date yet)
--   2. Find Card A → it's older → mark it too!
-- Result: BOTH cards marked as used instead of just ONE.
--
-- FIX: First find the oldest instance, THEN mark only that one.
-- ============================================================================

CREATE OR REPLACE FUNCTION use_vip_card(
  p_student_id UUID,
  p_card_id TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_teacher_id UUID;
  v_is_teacher BOOLEAN;
  v_student_in_class BOOLEAN;
  v_vip_cards JSONB;
  v_instance_id TEXT;
  v_oldest_instance_id TEXT;  -- Track the oldest instance ID
  v_oldest_date TIMESTAMPTZ;
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

  -- ========================================================================
  -- PASS 1: Find the oldest unused instance of the specified card
  -- ========================================================================
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

        -- Track the oldest instance (DO NOT mark here!)
        IF v_oldest_date IS NULL OR v_earned_at < v_oldest_date THEN
          v_oldest_date := v_earned_at;
          v_oldest_instance_id := v_instance_id;
          v_found := TRUE;
        END IF;
      END IF;
    END;
  END LOOP;

  -- ========================================================================
  -- PASS 2: Mark only the oldest instance as used
  -- ========================================================================
  IF v_found THEN
    -- Mark the oldest instance as used
    v_vip_cards := jsonb_set(
      v_vip_cards,
      ARRAY[v_oldest_instance_id, 'usedAt'],
      to_jsonb(now()::text)
    );

    -- Update the database
    UPDATE profiles
    SET
      vip_cards = v_vip_cards,
      updated_at = NOW()
    WHERE id = p_student_id;

    -- Log the usage to activity table
    INSERT INTO public.vip_cards_activity (
      student_id,
      card_instance_id,
      card_template_id,
      action,
      metadata
    ) VALUES (
      p_student_id,
      v_oldest_instance_id,
      p_card_id,
      'used',
      jsonb_build_object(
        'used_by', v_teacher_id::TEXT,
        'used_at', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      )
    );

    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

COMMENT ON FUNCTION use_vip_card(UUID, TEXT) IS
'Marks a VIP card instance as used (consumed) by setting usedAt timestamp.
Only teachers who have the student in their classes can call this.
Uses FIFO: finds the oldest unused instance and marks only that one.
Returns TRUE if successful, FALSE if no unused card found.';
