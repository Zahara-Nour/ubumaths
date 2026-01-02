-- ============================================================================
-- Migration: Add UPDATE policy for tournament games
-- ============================================================================
-- Problem: Students cannot save grid_state during tournament games because
-- there's no UPDATE RLS policy on minesweeper_tournament_games table.
-- All updates were expected to go through RPC functions, but auto-save
-- needs direct UPDATE access for grid_state only.
--
-- Solution: Add restrictive UPDATE policy allowing students to update
-- only grid_state on their own in-progress games.

-- Create UPDATE policy for students to save game state
CREATE POLICY "Students can update own in-progress tournament games"
  ON public.minesweeper_tournament_games
  FOR UPDATE
  TO authenticated
  USING (
    -- Can only update own games
    student_id = auth.uid()
    -- Game must be in progress
    AND status = 'in_progress'
  )
  WITH CHECK (
    -- Can only update own games
    student_id = auth.uid()
    -- Status must remain in_progress (can't change status via direct update)
    AND status = 'in_progress'
    -- time_seconds must remain NULL (set by complete function)
    AND time_seconds IS NULL
    -- completed_at must remain NULL (set by complete function)
    AND completed_at IS NULL
  );

COMMENT ON POLICY "Students can update own in-progress tournament games" ON public.minesweeper_tournament_games IS
  'Allows students to update grid_state during auto-save while game is in progress. Prevents modification of time_seconds, completed_at, and status. Use complete_tournament_game() to finish games.';
