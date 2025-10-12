-- Add admin view policy for classes table
-- Migration: 020_add_admin_classes_policy
-- Fixes: Admins cannot see classes list in user management dashboard

-- Add policy for admins to view all classes
-- Uses is_admin() security definer function to avoid RLS recursion
CREATE POLICY "admins_view_all_classes"
ON classes FOR SELECT
TO authenticated
USING (is_admin());

COMMENT ON POLICY "admins_view_all_classes" ON classes IS 'Allows admins to view all classes using the is_admin() security definer function';
