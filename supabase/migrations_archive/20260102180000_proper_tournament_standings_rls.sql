-- ============================================================================
-- Migration: Proper Tournament Standings RLS
-- Created: 2026-01-02
-- Purpose: Add RLS policy so students can see names of tournament co-participants
-- ============================================================================
--
-- PROBLEM:
-- The minesweeper_tournament_standings view joins with profiles, but students
-- can only see their own profile. We need a policy that allows students to see
-- basic info (firstname, lastname) of other tournament participants.
--
-- SOLUTION:
-- Add an RLS policy on profiles using a SECURITY DEFINER helper function
-- to check if two users share a tournament. This avoids recursion while
-- keeping RLS intact.
-- ============================================================================

-- Step 1: Drop the hacky bypass function from previous migration
DROP FUNCTION IF EXISTS public.get_tournament_standings(UUID, INTEGER);

-- Step 2: Create helper function to check tournament co-participation
-- Uses SECURITY DEFINER to avoid RLS recursion when checking tournament_games
CREATE OR REPLACE FUNCTION public.shares_tournament(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- Check if current user and target user both participated in the same tournament
  SELECT EXISTS (
    SELECT 1
    FROM minesweeper_tournament_games g1
    JOIN minesweeper_tournament_games g2 ON g1.tournament_id = g2.tournament_id
    WHERE g1.student_id = auth.uid()
    AND g2.student_id = target_user_id
  );
$$;

COMMENT ON FUNCTION public.shares_tournament IS
  'Security definer helper to check if current user and target share a tournament.
   Used by profiles RLS to allow tournament participants to see each other.';

GRANT EXECUTE ON FUNCTION public.shares_tournament TO authenticated;

-- Step 3: Add RLS policy for tournament co-participants
CREATE POLICY "Users can view tournament co-participants profiles"
ON profiles FOR SELECT
TO authenticated
USING (shares_tournament(id));

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Complete: Proper Tournament Standings RLS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'CHANGES:';
  RAISE NOTICE '  - Dropped get_tournament_standings() bypass function';
  RAISE NOTICE '  - Added shares_tournament() helper function';
  RAISE NOTICE '  - Added RLS policy on profiles for tournament participants';
  RAISE NOTICE '';
  RAISE NOTICE 'Now students can see names of other tournament participants';
  RAISE NOTICE 'through proper RLS, not bypasses.';
  RAISE NOTICE '========================================';
END;
$$ LANGUAGE plpgsql;
