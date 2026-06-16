-- Migration: Fix get_students_in_class_by_grade role type
-- The role column is an enum (user_role), need to cast it to text

CREATE OR REPLACE FUNCTION public.get_students_in_class_by_grade(target_class_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  firstname text,
  lastname text,
  avatar_url text,
  role text,
  friendship_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_grades text[];
  target_grade text;
BEGIN
  -- Get the grade of the target class
  SELECT c.grade INTO target_grade
  FROM classes c
  WHERE c.id = target_class_id;

  -- Get unique grades from user's classes
  SELECT ARRAY_AGG(DISTINCT c.grade)
  INTO user_grades
  FROM class_members cm
  JOIN classes c ON c.id = cm.class_id
  WHERE cm.student_id = auth.uid()
    AND cm.status = 'active'
    AND c.grade IS NOT NULL;

  -- Security check: only allow access if target class grade matches user's grades
  -- or if both have no grade (fallback for backward compatibility)
  IF target_grade IS NOT NULL AND (user_grades IS NULL OR NOT (target_grade = ANY(user_grades))) THEN
    -- Target class has a grade that doesn't match user's grades - return empty
    RETURN;
  END IF;

  -- If target has no grade, check if user is a member of that class
  IF target_grade IS NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM class_members cm
      WHERE cm.class_id = target_class_id
        AND cm.student_id = auth.uid()
        AND cm.status = 'active'
    ) THEN
      RETURN;
    END IF;
  END IF;

  -- Return students in the target class with their friendship status
  -- Cast role to text since it's an enum (user_role)
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.firstname,
    p.lastname,
    p.avatar_url,
    p.role::text AS role,
    f.status::text AS friendship_status
  FROM class_members cm
  JOIN profiles p ON p.id = cm.student_id
  LEFT JOIN friendships f ON (
    (f.requester_id = auth.uid() AND f.addressee_id = p.id)
    OR (f.addressee_id = auth.uid() AND f.requester_id = p.id)
  )
  WHERE cm.class_id = target_class_id
    AND cm.status = 'active'
    AND cm.student_id != auth.uid()
  ORDER BY p.full_name, p.lastname, p.firstname;
END;
$$;
