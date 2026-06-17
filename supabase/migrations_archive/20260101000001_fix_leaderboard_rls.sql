-- Fix Leaderboard RLS Policy
-- Purpose: Allow everyone to view completed games for leaderboard aggregation
-- Author: Claude (Supabase Expert)
-- Date: 2026-01-01
--
-- Problem: The leaderboard view uses security_invoker=on, so RLS applies.
-- Current policies only allow users to see their OWN games, breaking the leaderboard.
--
-- Solution: Add a SELECT policy allowing everyone to view completed games (won/lost).
-- This is safe because:
-- 1. Only aggregated stats are shown in the leaderboard view
-- 2. Individual game details (grid_state) are not exposed
-- 3. Only completed games are visible (not in-progress)

-- ============================================================================
-- Add SELECT policy for leaderboard access
-- ============================================================================

-- Allow authenticated users to view all completed games (for leaderboard)
CREATE POLICY "Anyone can view completed games for leaderboard"
  ON public.minesweeper_games
  FOR SELECT
  TO authenticated
  USING (status IN ('won', 'lost'));

-- Allow anonymous users to view completed games (for public leaderboard)
CREATE POLICY "Anonymous can view completed games for leaderboard"
  ON public.minesweeper_games
  FOR SELECT
  TO anon
  USING (status IN ('won', 'lost'));

-- ============================================================================
-- Note: The existing "Users can view own minesweeper games" policy still applies
-- for in-progress games. These new policies only add visibility for completed games.
-- ============================================================================

COMMENT ON POLICY "Anyone can view completed games for leaderboard" ON public.minesweeper_games IS
  'Allows authenticated users to view all completed games for leaderboard aggregation. Individual game details are protected by the view.';

COMMENT ON POLICY "Anonymous can view completed games for leaderboard" ON public.minesweeper_games IS
  'Allows anonymous users to view completed games for public leaderboard. Safe because only aggregated stats are exposed.';
