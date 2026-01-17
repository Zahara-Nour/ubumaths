-- ============================================================================
-- Fix get_teacher_classes_with_students: remove non-existent gender column
-- ============================================================================
-- The function was referencing p.gender which doesn't exist in profiles table.
-- This migration removes that reference.

CREATE OR REPLACE FUNCTION get_teacher_classes_with_students(
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
  students JSONB
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
    -- Aggregate students into JSONB array with all required fields
    -- Filter by is_test to match the requested mode
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', p.id,
          'firstname', p.firstname,
          'lastname', p.lastname,
          'full_name', p.full_name,
          'avatar_url', p.avatar_url,
          'gidouilles', p.gidouilles,
          'vip_cards', p.vip_cards,
          'role', p.role,
          'is_test', p.is_test
        )
        ORDER BY p.firstname NULLS LAST
      ) FILTER (WHERE p.id IS NOT NULL AND p.is_test = p_is_test_mode),
      '[]'::JSONB
    ) AS students
  FROM classes c
  LEFT JOIN class_members cm ON c.id = cm.class_id
  LEFT JOIN profiles p ON cm.student_id = p.id
  WHERE c.teacher_id = p_teacher_id
    AND c.is_active = TRUE
  GROUP BY c.id, c.teacher_id, c.name, c.description, c.join_code,
           c.is_active, c.created_at, c.updated_at
  ORDER BY c.name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_teacher_classes_with_students(UUID, BOOLEAN) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_teacher_classes_with_students(UUID, BOOLEAN) IS
'Optimized function to fetch all teacher classes with full student data filtered by test mode.
When p_is_test_mode = TRUE, returns only test students (is_test = TRUE).
When p_is_test_mode = FALSE, returns only real students (is_test = FALSE).
This ensures complete data isolation between test and production environments.';
