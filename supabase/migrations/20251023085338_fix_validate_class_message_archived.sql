-- Migration 107: Fix validate_class_message_recipients archived reference
-- Description: Replace archived with is_active in validate_class_message_recipients

-- =====================================================
-- FUNCTION: validate_class_message_recipients (FIXED)
-- =====================================================
CREATE OR REPLACE FUNCTION validate_class_message_recipients(
  sender_uuid UUID,
  class_uuid UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  sender_role TEXT;
  class_teacher_id UUID;
BEGIN
  -- Get sender's role
  SELECT role INTO sender_role
  FROM profiles
  WHERE id = sender_uuid;

  -- Only teachers can send class messages
  IF sender_role != 'teacher' AND sender_role != 'admin' THEN
    RETURN FALSE;
  END IF;

  -- Check if sender is the teacher of this class
  SELECT teacher_id INTO class_teacher_id
  FROM classes
  WHERE id = class_uuid
    AND is_active = TRUE;

  IF class_teacher_id IS NULL THEN
    RETURN FALSE; -- Class doesn't exist or is inactive
  END IF;

  -- Teacher must be the owner of the class (or admin)
  IF sender_role = 'admin' OR sender_uuid = class_teacher_id THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION validate_class_message_recipients IS 'Validates that a teacher can send a group message to a specific class';
