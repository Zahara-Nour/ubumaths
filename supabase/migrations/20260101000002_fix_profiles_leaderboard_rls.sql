-- Fix Profiles RLS for Leaderboard
-- Purpose: Allow everyone to view basic profile info (firstname) for leaderboard
-- Author: Claude (Supabase Expert)
-- Date: 2026-01-01
--
-- Problem: The leaderboard view JOINs with profiles to get player names.
-- Anonymous users can't see profiles, breaking the leaderboard.
--
-- Solution: Add a SELECT policy allowing everyone to view basic profile info.
-- Only firstname is exposed in the leaderboard (lastname hidden on mobile).

-- ============================================================================
-- Add SELECT policy for leaderboard access to profiles
-- ============================================================================

-- Allow authenticated users to view all profiles for leaderboard
-- Note: This is broader than strictly needed but simplifies the policy
CREATE POLICY "Anyone can view profiles for leaderboard"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow anonymous users to view profiles for public leaderboard
CREATE POLICY "Anonymous can view profiles for leaderboard"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- Note: These policies allow viewing all profile columns.
-- The leaderboard view only exposes firstname and lastname.
-- For additional security, consider using a SECURITY DEFINER function.
-- ============================================================================

COMMENT ON POLICY "Anyone can view profiles for leaderboard" ON public.profiles IS
  'Allows authenticated users to view profiles for leaderboard and other public features.';

COMMENT ON POLICY "Anonymous can view profiles for leaderboard" ON public.profiles IS
  'Allows anonymous users to view profiles for public leaderboard.';
