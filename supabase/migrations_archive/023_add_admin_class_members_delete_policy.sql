-- Add admin DELETE policy for class_members table
-- Migration: 023_add_admin_class_members_delete_policy
-- Fixes: Admins cannot remove students from classes (RLS violation)

-- Add policy for admins to delete class members
-- Uses is_admin() security definer function to avoid RLS recursion
CREATE POLICY "admins_delete_class_members"
ON class_members FOR DELETE
TO authenticated
USING (is_admin());

COMMENT ON POLICY "admins_delete_class_members" ON class_members IS 'Allows admins to remove students from any class using the is_admin() security definer function';
