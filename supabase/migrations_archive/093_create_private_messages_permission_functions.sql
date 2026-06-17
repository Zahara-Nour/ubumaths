-- Migration 093: Private Messages System - Permission Functions
-- Description: Functions to validate messaging permissions (student->teacher, teacher->student)

-- =====================================================
-- FUNCTION: get_student_teachers
-- Description: Get all teachers for a given student
-- Returns: Array of teacher profile UUIDs
-- =====================================================
CREATE OR REPLACE FUNCTION get_student_teachers(student_uuid UUID)
RETURNS TABLE(teacher_id UUID)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get all teachers from classes where the student is a member
  RETURN QUERY
  SELECT DISTINCT c.teacher_id
  FROM class_members cm
  JOIN classes c ON c.id = cm.class_id
  WHERE cm.student_id = student_uuid
    AND cm.status = 'active'
    AND c.archived = FALSE;
END;
$$;

COMMENT ON FUNCTION get_student_teachers IS 'Returns all teachers for a given student based on class membership';

-- =====================================================
-- FUNCTION: get_teacher_students
-- Description: Get all students for a given teacher
-- Returns: Array of student profile UUIDs
-- =====================================================
CREATE OR REPLACE FUNCTION get_teacher_students(teacher_uuid UUID)
RETURNS TABLE(student_id UUID)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get all students from classes taught by this teacher
  RETURN QUERY
  SELECT DISTINCT cm.student_id
  FROM class_members cm
  JOIN classes c ON c.id = cm.class_id
  WHERE c.teacher_id = teacher_uuid
    AND cm.status = 'active'
    AND c.archived = FALSE;
END;
$$;

COMMENT ON FUNCTION get_teacher_students IS 'Returns all students for a given teacher based on class membership';

-- =====================================================
-- FUNCTION: get_students_in_class
-- Description: Get all students in a specific class
-- Returns: Array of student profile UUIDs
-- =====================================================
CREATE OR REPLACE FUNCTION get_students_in_class(class_uuid UUID)
RETURNS TABLE(student_id UUID)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT cm.student_id
  FROM class_members cm
  JOIN classes c ON c.id = cm.class_id
  WHERE c.id = class_uuid
    AND cm.status = 'active'
    AND c.archived = FALSE;
END;
$$;

COMMENT ON FUNCTION get_students_in_class IS 'Returns all active students in a specific class';

-- =====================================================
-- FUNCTION: validate_message_recipients
-- Description: Validates that sender can message all recipients
-- Rules:
--   - Students can only message their teachers
--   - Teachers can only message their students
-- Returns: TRUE if valid, FALSE otherwise
-- =====================================================
CREATE OR REPLACE FUNCTION validate_message_recipients(
  sender_uuid UUID,
  recipient_uuids UUID[]
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  sender_role TEXT;
  recipient_uuid UUID;
  allowed_recipients UUID[];
BEGIN
  -- Get sender's role
  SELECT role INTO sender_role
  FROM profiles
  WHERE id = sender_uuid;

  IF sender_role IS NULL THEN
    RETURN FALSE; -- Sender doesn't exist
  END IF;

  -- Check if recipients array is empty
  IF array_length(recipient_uuids, 1) IS NULL OR array_length(recipient_uuids, 1) = 0 THEN
    RETURN FALSE; -- Must have at least one recipient
  END IF;

  -- STUDENTS can only message their TEACHERS
  IF sender_role = 'student' THEN
    -- Get all teacher IDs for this student
    SELECT array_agg(teacher_id)
    INTO allowed_recipients
    FROM get_student_teachers(sender_uuid);

    -- Check if all recipients are in the allowed list
    FOREACH recipient_uuid IN ARRAY recipient_uuids
    LOOP
      IF NOT (recipient_uuid = ANY(allowed_recipients)) THEN
        RETURN FALSE; -- This recipient is not one of student's teachers
      END IF;
    END LOOP;

    RETURN TRUE;
  END IF;

  -- TEACHERS can only message their STUDENTS
  IF sender_role = 'teacher' THEN
    -- Get all student IDs for this teacher
    SELECT array_agg(student_id)
    INTO allowed_recipients
    FROM get_teacher_students(sender_uuid);

    -- Check if all recipients are in the allowed list
    FOREACH recipient_uuid IN ARRAY recipient_uuids
    LOOP
      IF NOT (recipient_uuid = ANY(allowed_recipients)) THEN
        RETURN FALSE; -- This recipient is not one of teacher's students
      END IF;
    END LOOP;

    RETURN TRUE;
  END IF;

  -- ADMINS can message anyone (future-proof)
  IF sender_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Other roles cannot send messages
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION validate_message_recipients IS 'Validates messaging permissions: students can only message teachers, teachers can only message students';

-- =====================================================
-- FUNCTION: validate_class_message_recipients
-- Description: Validates that a teacher can send a group message to a class
-- Returns: TRUE if valid (teacher owns class), FALSE otherwise
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
    AND archived = FALSE;

  IF class_teacher_id IS NULL THEN
    RETURN FALSE; -- Class doesn't exist or is archived
  END IF;

  -- Teacher must be the owner of the class (or admin)
  IF sender_role = 'admin' OR sender_uuid = class_teacher_id THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION validate_class_message_recipients IS 'Validates that a teacher can send a group message to a specific class';

-- =====================================================
-- FUNCTION: can_moderate_message
-- Description: Check if a user can moderate a specific message
-- Teachers can moderate messages involving their students
-- Returns: TRUE if user can moderate, FALSE otherwise
-- =====================================================
CREATE OR REPLACE FUNCTION can_moderate_message(
  moderator_uuid UUID,
  message_uuid UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  moderator_role TEXT;
  message_sender_id UUID;
  message_recipient_ids UUID[];
  user_uuid UUID;
BEGIN
  -- Get moderator's role
  SELECT role INTO moderator_role
  FROM profiles
  WHERE id = moderator_uuid;

  -- Admins can moderate anything
  IF moderator_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Only teachers can moderate (besides admins)
  IF moderator_role != 'teacher' THEN
    RETURN FALSE;
  END IF;

  -- Get message sender and recipients
  SELECT sender_id INTO message_sender_id
  FROM private_messages
  WHERE id = message_uuid;

  IF message_sender_id IS NULL THEN
    RETURN FALSE; -- Message doesn't exist
  END IF;

  SELECT array_agg(recipient_id) INTO message_recipient_ids
  FROM message_inbox
  WHERE message_id = message_uuid;

  -- Teacher can moderate if either sender or any recipient is their student
  -- Check if sender is teacher's student
  IF EXISTS (
    SELECT 1
    FROM get_teacher_students(moderator_uuid)
    WHERE student_id = message_sender_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if any recipient is teacher's student
  FOREACH user_uuid IN ARRAY message_recipient_ids
  LOOP
    IF EXISTS (
      SELECT 1
      FROM get_teacher_students(moderator_uuid)
      WHERE student_id = user_uuid
    ) THEN
      RETURN TRUE;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION can_moderate_message IS 'Checks if a teacher can moderate a message (message involves their students)';
