-- Migration: Add RLS policies for user approval status
-- Purpose: Secure the status field so users cannot change their own status,
-- while allowing teachers and admins to manage user approvals.
--
-- This migration:
-- 1. Creates a helper function to get user's current status (for RLS policy)
-- 2. Drops and recreates "Users can update own profile" to prevent status changes
-- 3. Creates policy for teachers/admins to view pending users
-- 4. Creates policy for teachers/admins to update user status

-- =============================================================================
-- HELPER FUNCTION: Get user's current status
-- =============================================================================
-- Security definer function to avoid RLS recursion when checking status
-- Similar pattern to existing is_admin() and is_teacher_or_admin() functions

CREATE OR REPLACE FUNCTION public.get_user_status(user_id UUID)
RETURNS user_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status user_status;
BEGIN
  SELECT status INTO v_status
  FROM public.profiles
  WHERE id = user_id
  LIMIT 1;

  RETURN v_status;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_status(UUID) TO authenticated;

-- Add documentation
COMMENT ON FUNCTION public.get_user_status(UUID) IS 'Security definer function to get user status without triggering RLS recursion';

-- =============================================================================
-- UPDATE: Users can update own profile (prevent status AND role changes)
-- =============================================================================
-- Drop the existing policy and recreate with additional status protection
-- The existing policy only prevents role changes; we need to also prevent status changes

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  -- Prevent users from changing their own role
  AND role = (
    SELECT role FROM profiles WHERE id = auth.uid()
  )
  -- Prevent users from changing their own status
  AND status = get_user_status(auth.uid())
);

-- =============================================================================
-- SELECT: Teachers can view pending users for approval
-- =============================================================================
-- Allows teachers and admins to see profiles of pending users
-- so they can review and approve/reject them

CREATE POLICY "Teachers can view pending users for approval"
ON profiles FOR SELECT
TO authenticated
USING (
  -- Only applies to pending users
  status = 'pending'
  -- Only teachers and admins can view pending users
  AND is_teacher_or_admin()
);

-- =============================================================================
-- UPDATE: Teachers and admins can update user status
-- =============================================================================
-- Allows teachers and admins to update other users' profiles for status changes
-- This is separate from "Admins can update any profile" to give teachers
-- limited ability to approve/reject users

CREATE POLICY "Teachers and admins can update user status"
ON profiles FOR UPDATE
TO authenticated
USING (
  -- Can only update other users' profiles (not their own status)
  auth.uid() != id
  -- Only teachers and admins can update status
  AND is_teacher_or_admin()
)
WITH CHECK (
  -- Can only update other users' profiles
  auth.uid() != id
  -- Only teachers and admins can perform this update
  AND is_teacher_or_admin()
);

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

COMMENT ON POLICY "Users can update own profile" ON profiles IS
  'Users can update their own profile but cannot change their role or approval status';

COMMENT ON POLICY "Teachers can view pending users for approval" ON profiles IS
  'Teachers and admins can view profiles of users with pending status for approval workflow';

COMMENT ON POLICY "Teachers and admins can update user status" ON profiles IS
  'Teachers and admins can update other users profiles to approve/reject them';
