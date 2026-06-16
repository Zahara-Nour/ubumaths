-- Migration 102: Fix role type casting in get_allowed_recipients function
-- Description: Cast user_role enum to TEXT to match function signature

-- =====================================================
-- FUNCTION: Get allowed recipients for a user (TYPE CAST FIX)
-- =====================================================
CREATE OR REPLACE FUNCTION get_allowed_recipients(p_user_id UUID)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT,
  relationship TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Get user's role (fixed ambiguous column reference)
  SELECT profiles.role INTO v_user_role
  FROM profiles
  WHERE profiles.id = p_user_id;

  -- Students can message their teachers
  IF v_user_role = 'student' THEN
    RETURN QUERY
    SELECT
      p.id AS user_id,
      p.full_name,
      p.avatar_url,
      p.role::TEXT,
      'teacher'::TEXT AS relationship
    FROM get_student_teachers(p_user_id) gst
    JOIN profiles p ON p.id = gst.teacher_id
    ORDER BY p.full_name;

  -- Teachers can message their students
  ELSIF v_user_role = 'teacher' THEN
    RETURN QUERY
    SELECT
      p.id AS user_id,
      p.full_name,
      p.avatar_url,
      p.role::TEXT,
      'student'::TEXT AS relationship
    FROM get_teacher_students(p_user_id) gts
    JOIN profiles p ON p.id = gts.student_id
    ORDER BY p.full_name;

  -- Admins can message anyone
  ELSIF v_user_role = 'admin' THEN
    RETURN QUERY
    SELECT
      p.id AS user_id,
      p.full_name,
      p.avatar_url,
      p.role::TEXT,
      'any'::TEXT AS relationship
    FROM profiles p
    WHERE p.id != p_user_id
    ORDER BY p.full_name;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_allowed_recipients IS 'Returns list of users that the given user can send messages to';
