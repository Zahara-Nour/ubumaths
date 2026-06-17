-- Migration: Add firstname and lastname fields to profiles table
-- This replaces the full_name field with separate firstname and lastname fields

-- Add new firstname and lastname columns
ALTER TABLE profiles
ADD COLUMN firstname TEXT,
ADD COLUMN lastname TEXT;

-- Migrate existing full_name data to firstname (if any exists)
-- You can manually split names later if needed
UPDATE profiles
SET firstname = full_name
WHERE full_name IS NOT NULL;

-- Optional: You can drop full_name if you want to completely replace it
-- Uncomment the line below if you want to remove the full_name column
-- ALTER TABLE profiles DROP COLUMN full_name;

-- Add comment
COMMENT ON COLUMN profiles.firstname IS 'User first name';
COMMENT ON COLUMN profiles.lastname IS 'User last name';
