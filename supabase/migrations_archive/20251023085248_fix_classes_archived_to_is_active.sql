-- Migration 106: Fix classes.archived references to is_active
-- Description: Replace references to non-existent 'archived' column with 'is_active' column

-- =====================================================
-- FUNCTION: get_student_teachers (FIXED)
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
    AND c.is_active = TRUE;
END;
$$;

COMMENT ON FUNCTION get_student_teachers IS 'Returns all teachers for a given student based on class membership';

-- =====================================================
-- FUNCTION: get_teacher_students (FIXED)
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
    AND c.is_active = TRUE;
END;
$$;

COMMENT ON FUNCTION get_teacher_students IS 'Returns all students for a given teacher based on class membership';

-- =====================================================
-- FUNCTION: get_students_in_class (FIXED)
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
    AND c.is_active = TRUE;
END;
$$;

COMMENT ON FUNCTION get_students_in_class IS 'Returns all students in a specific class';

-- =====================================================
-- FUNCTION: get_teacher_classes_for_messaging (FIXED)
-- =====================================================
CREATE OR REPLACE FUNCTION get_teacher_classes_for_messaging(p_teacher_id UUID)
RETURNS TABLE(
  class_id UUID,
  class_name TEXT,
  student_count INT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS class_id,
    c.name AS class_name,
    COUNT(cm.student_id)::INT AS student_count
  FROM classes c
  LEFT JOIN class_members cm ON cm.class_id = c.id
  WHERE c.teacher_id = p_teacher_id
    AND c.is_active = TRUE
  GROUP BY c.id, c.name
  ORDER BY c.name;
END;
$$;

COMMENT ON FUNCTION get_teacher_classes_for_messaging IS 'Returns teacher classes for group messaging with student counts';
