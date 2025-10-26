/**
 * Migration: Update get_teacher_classes_with_data RPC for Test Mode
 * ===================================================================
 *
 * PURPOSE:
 * Update the teacher dashboard RPC function to support test mode filtering.
 * Student counts should respect teacher's test mode preference.
 *
 * CHANGES:
 * - Add p_is_test_mode parameter (default FALSE)
 * - Join with profiles table to get is_test field
 * - Filter student count by profiles.is_test = p_is_test_mode
 *
 * IMPACT:
 * - Dashboard now shows accurate student counts based on test mode
 * - Test mode ON: Only counts test students
 * - Test mode OFF: Only counts real students
 *
 * Created: 2025-10-26
 */

-- Drop existing function
DROP FUNCTION IF EXISTS get_teacher_classes_with_data(UUID);
DROP FUNCTION IF EXISTS get_teacher_classes_with_data(UUID, BOOLEAN);

-- Recreate function with test mode parameter
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
    -- Count students filtered by test mode
    -- Join with profiles to access is_test field
    COALESCE(
      COUNT(DISTINCT cm.student_id) FILTER (
        WHERE p.id IS NOT NULL
        AND p.is_test = p_is_test_mode
      ),
      0
    ) AS student_count,
    -- Aggregate schedules into JSONB array (unchanged)
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
  LEFT JOIN profiles p ON cm.student_id = p.id  -- Join to access is_test
  LEFT JOIN class_schedules cs ON c.id = cs.class_id
  WHERE c.teacher_id = p_teacher_id
    AND c.is_active = TRUE
  GROUP BY c.id, c.teacher_id, c.name, c.description, c.join_code,
           c.is_active, c.created_at, c.updated_at
  ORDER BY c.name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_teacher_classes_with_data(UUID, BOOLEAN) TO authenticated;

-- Update comment
COMMENT ON FUNCTION get_teacher_classes_with_data(UUID, BOOLEAN) IS
'Optimized function to fetch all teacher classes with student counts and schedules.
Supports test mode filtering: when p_is_test_mode = TRUE, only counts test students.
When p_is_test_mode = FALSE (default), only counts real students.
This ensures complete data isolation between test and production environments.';
