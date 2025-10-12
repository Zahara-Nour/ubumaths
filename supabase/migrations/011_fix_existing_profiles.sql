-- Fix existing profiles that might be missing new fields
-- This migration ensures all existing profiles have the new columns populated

-- Set default empty array for class_ids if NULL
UPDATE profiles
SET class_ids = '{}'
WHERE class_ids IS NULL;

-- Ensure avatar_url can be NULL (already nullable, but explicit)
-- No action needed, column is already nullable

-- Add a comment for tracking
COMMENT ON COLUMN profiles.class_ids IS 'Array of class UUIDs - defaults to empty array';

-- Double-check RLS policies are correct
-- Drop and recreate the view policies to ensure they work correctly

-- Make sure users can view their own profile even with new fields
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Make sure admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Users can update their own profile (but not change role)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  -- Prevent users from changing their own role
  AND role = (SELECT role FROM profiles WHERE id = auth.uid())
);

-- Admins can update any profile
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile"
ON profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Allow profile creation (for signup trigger)
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
CREATE POLICY "Allow profile creation"
ON profiles FOR INSERT
WITH CHECK (true);

-- Add helpful comment
COMMENT ON TABLE profiles IS 'User profiles with role-based access control. Admins have full access, users can only modify their own profiles (except role).';
