-- Add avatar_url and class_ids array to profiles table
-- Migration: 010_add_classes_and_avatar_to_profiles

-- Add avatar_url column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add class_ids array column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS class_ids UUID[] DEFAULT '{}';

-- Add firstname column if not exists (from previous migration)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS firstname TEXT;

-- Add lastname column if not exists (from previous migration)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lastname TEXT;

-- Create index for array searches on class_ids (GIN index for array containment queries)
CREATE INDEX IF NOT EXISTS idx_profiles_class_ids ON profiles USING GIN (class_ids);

-- Create index for faster name searches
CREATE INDEX IF NOT EXISTS idx_profiles_firstname ON profiles (firstname);
CREATE INDEX IF NOT EXISTS idx_profiles_lastname ON profiles (lastname);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);

-- Update RLS policies for admin access to all profiles

-- Drop existing profile policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT role FROM profiles WHERE id = auth.uid()) -- Can't change own role
);

-- Policy: Admins can update any profile (including role, school, classes)
CREATE POLICY "Admins can update any profile"
ON profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Allow profile creation (for signup trigger)
CREATE POLICY "Allow profile creation"
ON profiles FOR INSERT
WITH CHECK (true);

-- Add comment explaining the class_ids field
COMMENT ON COLUMN profiles.class_ids IS 'Array of class UUIDs that this user belongs to (for students) or teaches (for teachers)';
COMMENT ON COLUMN profiles.avatar_url IS 'URL to user avatar image';
