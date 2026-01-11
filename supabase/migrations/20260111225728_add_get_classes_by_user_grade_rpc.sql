-- Migration: Add RPC function to get classes by user grade
-- This function bypasses RLS to allow students to see other classes of the same grade level
-- for the friend-adding feature

-- Create the function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.get_classes_by_user_grade()
RETURNS TABLE (id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_grades text[];
BEGIN
  -- Get unique grades from user's classes
  SELECT ARRAY_AGG(DISTINCT c.grade)
  INTO user_grades
  FROM class_members cm
  JOIN classes c ON c.id = cm.class_id
  WHERE cm.student_id = auth.uid()
    AND cm.status = 'active'
    AND c.grade IS NOT NULL;

  -- If no grades found, return user's own classes
  IF user_grades IS NULL OR array_length(user_grades, 1) IS NULL THEN
    RETURN QUERY
    SELECT c.id, c.name
    FROM class_members cm
    JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = auth.uid()
      AND cm.status = 'active'
    ORDER BY c.name;
    RETURN;
  END IF;

  -- Return all active classes with matching grades
  RETURN QUERY
  SELECT c.id, c.name
  FROM classes c
  WHERE c.is_active = true
    AND c.grade = ANY(user_grades)
  ORDER BY c.name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_classes_by_user_grade() TO authenticated;

COMMENT ON FUNCTION public.get_classes_by_user_grade() IS
  'Returns all active classes matching the current user''s grade level. Used for friend-adding feature.';
