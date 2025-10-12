-- Fix class_members RLS to break recursion with classes table
-- Migration: 019_fix_class_members_rls
-- The problem: class_members policies query classes, classes policies query class_members = recursion!
-- Solution: Simplify class_members policies to avoid querying classes table

-- Drop ALL existing policies on class_members
DROP POLICY IF EXISTS "Users can view members of their classes" ON class_members;
DROP POLICY IF EXISTS "Students can join classes" ON class_members;
DROP POLICY IF EXISTS "Teachers can manage members in their classes" ON class_members;

-- Create simple, non-recursive policies

-- Policy 1: Users can view class_members records where they are the student
CREATE POLICY "view_own_memberships"
ON class_members FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Policy 2: Students can insert themselves into classes (join)
CREATE POLICY "students_can_join"
ON class_members FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

-- Policy 3: Students can leave classes (delete their own membership)
CREATE POLICY "students_can_leave"
ON class_members FOR DELETE
TO authenticated
USING (student_id = auth.uid());

-- For teachers to view/manage class members, we'll use a security definer function
-- that breaks the recursion by not triggering RLS on classes

CREATE OR REPLACE FUNCTION public.is_class_teacher(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_teacher_id UUID;
BEGIN
  -- Direct query without triggering policies
  SELECT teacher_id INTO v_teacher_id
  FROM public.classes
  WHERE id = p_class_id
  LIMIT 1;

  RETURN v_teacher_id = auth.uid();
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_class_teacher(UUID) TO authenticated;

-- Policy 4: Teachers can view members of their classes (using helper function)
CREATE POLICY "teachers_view_class_members"
ON class_members FOR SELECT
TO authenticated
USING (is_class_teacher(class_id));

-- Policy 5: Teachers can add students to their classes
CREATE POLICY "teachers_add_members"
ON class_members FOR INSERT
TO authenticated
WITH CHECK (is_class_teacher(class_id));

-- Policy 6: Teachers can remove students from their classes
CREATE POLICY "teachers_remove_members"
ON class_members FOR DELETE
TO authenticated
USING (is_class_teacher(class_id));

-- Policy 7: Teachers can update class memberships (if needed)
CREATE POLICY "teachers_update_members"
ON class_members FOR UPDATE
TO authenticated
USING (is_class_teacher(class_id))
WITH CHECK (is_class_teacher(class_id));

COMMENT ON FUNCTION public.is_class_teacher(UUID) IS 'Security definer function to check if user is teacher of a class without triggering RLS recursion';
