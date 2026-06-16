-- Completely simplify classes RLS to eliminate all recursion
-- Migration: 018_simplify_classes_rls
-- Strategy: Remove ALL policies that could cause recursion and use simple auth checks

-- Drop ALL existing policies on classes
DROP POLICY IF EXISTS "Teachers can view their own classes" ON classes;
DROP POLICY IF EXISTS "Students can view classes they are members of" ON classes;
DROP POLICY IF EXISTS "Admins can view all classes" ON classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON classes;
DROP POLICY IF EXISTS "Teachers can update their own classes" ON classes;
DROP POLICY IF EXISTS "Admins can update any class" ON classes;
DROP POLICY IF EXISTS "Teachers can delete their own classes" ON classes;
DROP POLICY IF EXISTS "Admins can delete any class" ON classes;

-- Temporarily disable RLS on classes to break any recursion
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Create SIMPLE policies that don't reference any other tables

-- Policy 1: Users can view classes where they are the teacher
CREATE POLICY "view_own_classes"
ON classes FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

-- Policy 2: Users can view classes where they are a member (via class_members - no recursion here)
CREATE POLICY "view_member_classes"
ON classes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM class_members
    WHERE class_id = classes.id
    AND student_id = auth.uid()
  )
);

-- Policy 3: Teachers can insert classes (simple check - if you're authenticated and set yourself as teacher)
CREATE POLICY "insert_own_classes"
ON classes FOR INSERT
TO authenticated
WITH CHECK (teacher_id = auth.uid());

-- Policy 4: Teachers can update their own classes
CREATE POLICY "update_own_classes"
ON classes FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- Policy 5: Teachers can delete their own classes
CREATE POLICY "delete_own_classes"
ON classes FOR DELETE
TO authenticated
USING (teacher_id = auth.uid());

-- Note: We removed admin-specific policies to avoid recursion.
-- Admins can use the service role key for unrestricted access if needed.

COMMENT ON TABLE classes IS 'Classes table with simplified RLS policies to avoid infinite recursion. Admin access via service role.';
