-- Fix infinite recursion in classes RLS policies
-- Migration: 016_fix_classes_rls_recursion
-- Issue: Classes policies that check profiles.role cause infinite recursion
-- Solution: Use security definer functions to break the recursion chain

-- Helper function to check if current user is a teacher or admin
CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('teacher', 'admin')
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_teacher_or_admin() TO authenticated;

-- Drop existing problematic policies on classes table
DROP POLICY IF EXISTS "Teachers can view their own classes" ON classes;
DROP POLICY IF EXISTS "Students can view classes they are members of" ON classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON classes;
DROP POLICY IF EXISTS "Teachers can update their own classes" ON classes;
DROP POLICY IF EXISTS "Teachers can delete their own classes" ON classes;

-- Recreate classes policies without recursion

-- SELECT policies
-- Teachers can view their own classes
CREATE POLICY "Teachers can view their own classes"
ON classes FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

-- Students can view classes they are members of
CREATE POLICY "Students can view classes they are members of"
ON classes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM class_members
    WHERE class_id = classes.id
    AND student_id = auth.uid()
  )
);

-- Admins can view all classes
CREATE POLICY "Admins can view all classes"
ON classes FOR SELECT
TO authenticated
USING (is_admin());

-- INSERT policy
-- Teachers and admins can create classes (using helper function to avoid recursion)
CREATE POLICY "Teachers can create classes"
ON classes FOR INSERT
TO authenticated
WITH CHECK (
  teacher_id = auth.uid()
  AND is_teacher_or_admin()
);

-- UPDATE policy
-- Teachers can update their own classes
CREATE POLICY "Teachers can update their own classes"
ON classes FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid());

-- Admins can update any class
CREATE POLICY "Admins can update any class"
ON classes FOR UPDATE
TO authenticated
USING (is_admin());

-- DELETE policy
-- Teachers can delete their own classes
CREATE POLICY "Teachers can delete their own classes"
ON classes FOR DELETE
TO authenticated
USING (teacher_id = auth.uid());

-- Admins can delete any class
CREATE POLICY "Admins can delete any class"
ON classes FOR DELETE
TO authenticated
USING (is_admin());

-- Add comment for documentation
COMMENT ON FUNCTION public.is_teacher_or_admin() IS 'Security definer function to check if current user is teacher or admin without triggering RLS recursion';
