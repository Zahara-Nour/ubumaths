-- Allow students to view profiles of their classmates
-- Migration: 20251230100001_allow_students_view_classmate_profiles
--
-- Problem: Students can see class_members but not the profiles of those members.
-- Solution: Add a policy that allows students to view profiles of users
-- who are in the same class as them.

-- Create a function to check if two users are classmates
CREATE OR REPLACE FUNCTION public.are_classmates(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Check if the current user shares at least one class with the target user
  RETURN EXISTS (
    SELECT 1
    FROM public.class_members cm1
    INNER JOIN public.class_members cm2 ON cm1.class_id = cm2.class_id
    WHERE cm1.student_id = auth.uid()
      AND cm2.student_id = p_user_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.are_classmates(UUID) TO authenticated;

-- Policy: Students can view profiles of their classmates
CREATE POLICY "students_view_classmate_profiles"
ON profiles FOR SELECT
TO authenticated
USING (are_classmates(id));

COMMENT ON FUNCTION public.are_classmates(UUID) IS 'Security definer function to check if current user and target user share at least one class';
