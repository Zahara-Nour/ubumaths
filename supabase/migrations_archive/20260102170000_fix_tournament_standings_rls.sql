-- ============================================================================
-- Migration: Fix Tournament Standings RLS
-- Created: 2026-01-02
-- Purpose: Allow students to see other participants' names in tournament standings
-- ============================================================================
--
-- PROBLEM:
-- The minesweeper_tournament_standings view uses security_invoker = on,
-- which means it runs with the caller's permissions. But students can only
-- see their own profile (auth.uid() = id), so the JOIN with profiles fails
-- for other participants, returning empty results.
--
-- SOLUTION:
-- Create a SECURITY DEFINER function to fetch tournament standings,
-- which bypasses RLS and returns only the necessary public info.
-- ============================================================================

-- Create a security definer function to get tournament standings
-- This function bypasses RLS to fetch standings with participant names
CREATE OR REPLACE FUNCTION public.get_tournament_standings(
  p_tournament_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  tournament_id UUID,
  student_id UUID,
  firstname TEXT,
  lastname TEXT,
  games_won INTEGER,
  average_score NUMERIC,
  average_3bvs NUMERIC,
  "position" INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify tournament exists and user has access
  -- (either participant, creator, teacher of a linked class, or admin)
  IF NOT EXISTS (
    SELECT 1 FROM minesweeper_tournaments t
    WHERE t.id = p_tournament_id
    AND (
      -- Is admin
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      -- Or is creator
      OR t.creator_id = auth.uid()
      -- Or is teacher of a linked class
      OR EXISTS (
        SELECT 1 FROM minesweeper_tournament_classes tc
        JOIN classes c ON c.id = tc.class_id
        WHERE tc.tournament_id = t.id AND c.teacher_id = auth.uid()
      )
      -- Or is student in a linked class
      OR EXISTS (
        SELECT 1 FROM minesweeper_tournament_classes tc
        JOIN class_members cm ON cm.class_id = tc.class_id
        WHERE tc.tournament_id = t.id AND cm.student_id = auth.uid()
      )
    )
  ) THEN
    RAISE EXCEPTION 'Tournament not found or access denied';
  END IF;

  -- Return standings from the view (which we can access as security definer)
  RETURN QUERY
  SELECT
    s.tournament_id,
    s.student_id,
    s.firstname,
    s.lastname,
    s.games_won,
    s.average_score,
    s.average_3bvs,
    s."position"
  FROM minesweeper_tournament_standings s
  WHERE s.tournament_id = p_tournament_id
  ORDER BY s."position" ASC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_tournament_standings IS
  'Security definer function to get tournament standings with participant names.
   Bypasses profiles RLS to show firstname/lastname of all participants.';

GRANT EXECUTE ON FUNCTION public.get_tournament_standings TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Complete: Fix Tournament Standings RLS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW FUNCTION:';
  RAISE NOTICE '  - get_tournament_standings(tournament_id, limit)';
  RAISE NOTICE '';
  RAISE NOTICE 'This function bypasses profiles RLS to allow students';
  RAISE NOTICE 'to see other participants names in tournament standings.';
  RAISE NOTICE '========================================';
END;
$$ LANGUAGE plpgsql;
