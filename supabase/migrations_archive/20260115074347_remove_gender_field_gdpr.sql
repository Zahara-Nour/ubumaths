-- Migration: Remove gender field for GDPR compliance
-- Date: 2026-01-15
-- Reason: The gender field was only used for avatar fallback selection.
--         Collecting gender data on minors without strong justification violates
--         the GDPR data minimization principle (Article 5(1)(c)).
--         Avatars now use role-based neutral images instead.

-- Remove gender column from profiles table
ALTER TABLE profiles DROP COLUMN IF EXISTS gender;

-- Remove gender column from pending_students table
ALTER TABLE pending_students DROP COLUMN IF EXISTS gender;

-- Add comment for documentation
COMMENT ON TABLE profiles IS 'User profiles - gender field removed 2026-01-15 for GDPR compliance (data minimization)';
