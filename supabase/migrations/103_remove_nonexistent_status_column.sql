-- Migration 103: Remove nonexistent status column from permission functions
-- Description: class_members table doesn't have a status column, remove those checks

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
    AND c.archived = FALSE;
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
    AND c.archived = FALSE;
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
    AND c.archived = FALSE;
END;
$$;

COMMENT ON FUNCTION get_students_in_class IS 'Returns all students in a specific class';
