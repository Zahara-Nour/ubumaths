-- Add admin view policy for class_members table
-- Migration: 021_add_admin_class_members_policy
-- Fixes: Admins cannot see class members when filtering by class

-- Add policy for admins to view all class members
-- Uses is_admin() security definer function to avoid RLS recursion
CREATE POLICY "admins_view_all_class_members"
ON class_members FOR SELECT
TO authenticated
USING (is_admin());

COMMENT ON POLICY "admins_view_all_class_members" ON class_members IS 'Allows admins to view all class memberships using the is_admin() security definer function';
