-- Allow students to view other members of their classes
-- Migration: 20251230100000_allow_students_view_classmates
--
-- Problem: Current RLS only allows students to see their own class_members records.
-- Students need to see other members of their classes to add them as friends.
--
-- Solution: Add a policy that allows students to view class_members records
-- for classes they are members of.

-- Create a security definer function to check if user is in the same class
-- This avoids infinite recursion by not triggering RLS
CREATE OR REPLACE FUNCTION public.is_classmate(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Check if the current user is a member of this class
  RETURN EXISTS (
    SELECT 1 FROM public.class_members
    WHERE class_id = p_class_id
      AND student_id = auth.uid()
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_classmate(UUID) TO authenticated;

-- Policy: Students can view other members of classes they belong to
CREATE POLICY "students_view_classmates"
ON class_members FOR SELECT
TO authenticated
USING (is_classmate(class_id));

COMMENT ON FUNCTION public.is_classmate(UUID) IS 'Security definer function to check if user is a member of a class without triggering RLS recursion';
