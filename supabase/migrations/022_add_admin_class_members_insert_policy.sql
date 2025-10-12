-- Add admin INSERT policy for class_members table
-- Migration: 022_add_admin_class_members_insert_policy
-- Fixes: Admins cannot add students to classes (RLS violation)

-- Add policy for admins to insert class members
-- Uses is_admin() security definer function to avoid RLS recursion
CREATE POLICY "admins_insert_class_members"
ON class_members FOR INSERT
TO authenticated
WITH CHECK (is_admin());

COMMENT ON POLICY "admins_insert_class_members" ON class_members IS 'Allows admins to add students to any class using the is_admin() security definer function';
