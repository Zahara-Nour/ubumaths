-- Fix infinite recursion by making helper functions bypass RLS completely
-- Migration: 017_fix_rls_with_bypass
-- Solution: Set session_replication_role to bypass RLS when checking roles

-- Recreate is_admin() with RLS bypass
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Bypass RLS by directly querying with security definer privileges
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  RETURN user_role = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Recreate is_teacher_or_admin() with RLS bypass
CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Bypass RLS by directly querying with security definer privileges
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  RETURN user_role IN ('teacher', 'admin');
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Create a helper function to check if user is a student
CREATE OR REPLACE FUNCTION public.is_student()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Bypass RLS by directly querying with security definer privileges
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  RETURN user_role = 'student';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_student() TO authenticated;

-- Now fix the problematic "Teachers can view student profiles" policy
DROP POLICY IF EXISTS "Teachers can view student profiles in their classes" ON profiles;

-- Recreate it with a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.can_view_student_profile(student_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Teachers can view student profiles if the student is in one of their classes
  RETURN EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.class_members cm ON c.id = cm.class_id
    WHERE c.teacher_id = auth.uid()
    AND cm.student_id = student_profile_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_view_student_profile(UUID) TO authenticated;

-- Add the policy back using the helper function
CREATE POLICY "Teachers can view student profiles in their classes"
ON profiles FOR SELECT
TO authenticated
USING (
  role = 'student'
  AND can_view_student_profile(id)
);

-- Add helpful comments
COMMENT ON FUNCTION public.is_admin() IS 'Security definer function that bypasses RLS to check if user is admin';
COMMENT ON FUNCTION public.is_teacher_or_admin() IS 'Security definer function that bypasses RLS to check if user is teacher or admin';
COMMENT ON FUNCTION public.is_student() IS 'Security definer function that bypasses RLS to check if user is student';
COMMENT ON FUNCTION public.can_view_student_profile(UUID) IS 'Security definer function to check if teacher can view student profile without RLS recursion';
