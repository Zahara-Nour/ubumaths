-- Add gender field to profiles table
-- Migration: 025_add_gender_to_profiles.sql

-- Add gender column to profiles table
ALTER TABLE profiles
ADD COLUMN gender TEXT CHECK (gender IN ('boy', 'girl'));

-- Update existing profiles to have a default gender (null is allowed for now)
-- Admins can update this later
COMMENT ON COLUMN profiles.gender IS 'Gender of the user: boy or girl (used for avatar fallbacks)';
