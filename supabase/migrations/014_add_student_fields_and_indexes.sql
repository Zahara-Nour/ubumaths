-- Add student-specific fields and performance indexes
-- Migration: 014_add_student_fields_and_indexes

-- Add new fields to profiles table for students
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gidouilles INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vip_cards JSONB DEFAULT '{}'::jsonb NOT NULL;

-- Add performance indexes for heavy user queries

-- Index for filtering users by school (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles (school_id);

-- Composite index for filtering by role and school (e.g., "all students in school X")
CREATE INDEX IF NOT EXISTS idx_profiles_role_school ON profiles (role, school_id);

-- Composite index for faster class membership checks
CREATE INDEX IF NOT EXISTS idx_class_members_composite ON class_members (student_id, class_id);

-- Add GIN index for JSONB vip_cards queries (if needed for searching cards)
CREATE INDEX IF NOT EXISTS idx_profiles_vip_cards ON profiles USING GIN (vip_cards);

-- Add comments explaining the new fields
COMMENT ON COLUMN profiles.grade IS 'Student grade level (e.g., "6ème", "5ème", "4ème", "3ème")';
COMMENT ON COLUMN profiles.gidouilles IS 'Student currency/points for rewards system';
COMMENT ON COLUMN profiles.vip_cards IS 'JSON object storing student VIP cards and their properties';
