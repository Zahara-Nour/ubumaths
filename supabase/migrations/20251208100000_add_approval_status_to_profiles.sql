-- Migration: Add approval status to profiles
-- Purpose: Enable user approval workflow where new users can be pending approval
-- before gaining full access to the application.
--
-- This migration adds:
-- 1. user_status enum type with 'pending', 'approved', 'rejected' values
-- 2. status column to profiles (NOT NULL, DEFAULT 'approved' for backward compatibility)
-- 3. rejection_reason column for storing why a user was rejected
-- 4. status_changed_at timestamp for tracking when status was last modified
-- 5. status_changed_by foreign key to track who changed the status
-- 6. Indexes for efficient querying of pending users

-- Step 1: Create the user_status enum type
-- Using IF NOT EXISTS pattern via DO block for idempotency
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END
$$;

-- Step 2: Add status column with default 'approved'
-- Default ensures existing users remain approved and new users created through
-- normal flows work correctly. The application will explicitly set 'pending'
-- for users requiring approval.
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS status user_status NOT NULL DEFAULT 'approved';

-- Step 3: Add rejection_reason column
-- Nullable because only rejected users have a reason
-- TEXT type allows for detailed explanations
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Step 4: Add status_changed_at timestamp
-- Tracks when the status was last modified
-- Nullable because existing users never had a status change
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- Step 5: Add status_changed_by foreign key
-- References the profile of the user who changed the status
-- SET NULL on delete preserves the status even if the approver is deleted
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Step 6: Create index for status queries
-- Useful for filtering users by status (e.g., showing all pending users)
CREATE INDEX IF NOT EXISTS idx_profiles_status
ON profiles (status);

-- Step 7: Create partial index for pending users
-- Optimized for the approval workflow where we frequently query pending users
-- Ordered by created_at DESC to show newest pending users first
CREATE INDEX IF NOT EXISTS idx_profiles_pending
ON profiles (created_at DESC)
WHERE status = 'pending';

-- Step 8: Add helpful comments for documentation
COMMENT ON TYPE user_status IS 'User approval status: pending (awaiting approval), approved (can access app), rejected (access denied)';
COMMENT ON COLUMN profiles.status IS 'User approval status. Default is approved for backward compatibility. New users requiring approval should be set to pending.';
COMMENT ON COLUMN profiles.rejection_reason IS 'Explanation for why a user was rejected. Only populated when status is rejected.';
COMMENT ON COLUMN profiles.status_changed_at IS 'Timestamp of the last status change. NULL for users who never had their status modified.';
COMMENT ON COLUMN profiles.status_changed_by IS 'Profile ID of the user who last changed this status. NULL if status was never changed or if the approver was deleted.';
COMMENT ON INDEX idx_profiles_status IS 'Index for filtering profiles by approval status';
COMMENT ON INDEX idx_profiles_pending IS 'Partial index for efficiently querying pending users, ordered by newest first';
