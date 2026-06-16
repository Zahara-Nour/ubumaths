/**
 * Migration: Add google_classroom_course_id to get_teacher_classes_with_data RPC
 * ===============================================================================
 *
 * PURPOSE:
 * Add google_classroom_course_id to the return type of get_teacher_classes_with_data
 * so the teacher dashboard can display and update course associations.
 *
 * Created: 2026-01-13
 */

-- Drop existing function
DROP FUNCTION IF EXISTS get_teacher_classes_with_data(UUID, BOOLEAN);

-- Recreate function with google_classroom_course_id
CREATE OR REPLACE FUNCTION get_teacher_classes_with_data(
  p_teacher_id UUID,
  p_is_test_mode BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  teacher_id UUID,
  name TEXT,
  description TEXT,
  join_code TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  google_classroom_course_id UUID,
  student_count BIGINT,
  schedules JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.teacher_id,
    c.name,
    c.description,
    c.join_code,
    c.is_active,
    c.created_at,
    c.updated_at,
    c.google_classroom_course_id,
    -- Count students filtered by test mode
    COALESCE(
      COUNT(DISTINCT cm.student_id) FILTER (
        WHERE p.id IS NOT NULL
        AND p.is_test = p_is_test_mode
      ),
      0
    ) AS student_count,
    -- Aggregate schedules into JSONB array
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', cs.id,
          'class_id', cs.class_id,
          'teacher_id', cs.teacher_id,
          'day_of_week', cs.day_of_week,
          'start_time', cs.start_time,
          'end_time', cs.end_time,
          'subject', cs.subject,
          'room', cs.room,
          'notes', cs.notes
        )
        ORDER BY cs.day_of_week, cs.start_time
      ) FILTER (WHERE cs.id IS NOT NULL),
      '[]'::JSONB
    ) AS schedules
  FROM classes c
  LEFT JOIN class_members cm ON c.id = cm.class_id
  LEFT JOIN profiles p ON cm.student_id = p.id
  LEFT JOIN class_schedules cs ON c.id = cs.class_id
  WHERE c.teacher_id = p_teacher_id
    AND c.is_active = TRUE
  GROUP BY c.id, c.teacher_id, c.name, c.description, c.join_code,
           c.is_active, c.created_at, c.updated_at, c.google_classroom_course_id
  ORDER BY c.name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_teacher_classes_with_data(UUID, BOOLEAN) TO authenticated;

-- Update comment
COMMENT ON FUNCTION get_teacher_classes_with_data(UUID, BOOLEAN) IS
'Optimized function to fetch all teacher classes with student counts, schedules, and Google Classroom course association.
Supports test mode filtering for student counts.';
