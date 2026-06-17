-- Add admin permissions for class management (INSERT, UPDATE, DELETE)
-- Migration: 030_add_admin_class_permissions
-- Allows admins to create, update, and delete classes for any teacher
-- Note: View policy already exists in migration 020

-- Policy: Admins can insert classes for any teacher
CREATE POLICY "admins_insert_classes"
ON classes FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Policy: Admins can update any class
CREATE POLICY "admins_update_classes"
ON classes FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Policy: Admins can delete any class
CREATE POLICY "admins_delete_classes"
ON classes FOR DELETE
TO authenticated
USING (is_admin());

COMMENT ON POLICY "admins_insert_classes" ON classes IS 'Allows admins to create classes for any teacher';
COMMENT ON POLICY "admins_update_classes" ON classes IS 'Allows admins to update any class';
COMMENT ON POLICY "admins_delete_classes" ON classes IS 'Allows admins to delete any class';
