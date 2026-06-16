-- ============================================================================
-- Migration: Fix RLS infinite recursion in tournament tables
-- ============================================================================
-- The original policies created a circular dependency:
-- - minesweeper_tournaments SELECT checks minesweeper_tournament_classes
-- - minesweeper_tournament_classes SELECT checks minesweeper_tournaments
-- This caused "infinite recursion detected in policy" errors.
--
-- Solution: Make child table policies check membership directly, not via parent.

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view tournament classes if can see tournament"
  ON public.minesweeper_tournament_classes;

DROP POLICY IF EXISTS "Users can view tournament games if can see tournament"
  ON public.minesweeper_tournament_games;

-- ============================================================================
-- New policy for minesweeper_tournament_classes
-- ============================================================================
-- Check membership directly without referencing parent tournament's RLS

CREATE POLICY "Users can view tournament classes"
  ON public.minesweeper_tournament_classes
  FOR SELECT
  TO authenticated
  USING (
    -- Admins see all
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Teachers see classes they own
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = minesweeper_tournament_classes.class_id
      AND c.teacher_id = auth.uid()
    )
    OR
    -- Students see classes they're members of
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = minesweeper_tournament_classes.class_id
      AND cm.student_id = auth.uid()
    )
  );

-- ============================================================================
-- New policy for minesweeper_tournament_games
-- ============================================================================
-- Check participation eligibility directly

CREATE POLICY "Users can view tournament games"
  ON public.minesweeper_tournament_games
  FOR SELECT
  TO authenticated
  USING (
    -- Admins see all
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Players can see their own games
    student_id = auth.uid()
    OR
    -- Teachers can see games from their tournaments
    EXISTS (
      SELECT 1 FROM public.minesweeper_tournaments t
      WHERE t.id = minesweeper_tournament_games.tournament_id
      AND t.creator_id = auth.uid()
    )
    OR
    -- Students can see games from tournaments they can participate in
    EXISTS (
      SELECT 1 FROM public.minesweeper_tournament_classes tc
      JOIN public.class_members cm ON cm.class_id = tc.class_id
      WHERE tc.tournament_id = minesweeper_tournament_games.tournament_id
      AND cm.student_id = auth.uid()
    )
  );

-- ============================================================================
-- Summary
-- ============================================================================
-- Fixed circular RLS dependency by:
-- 1. tournament_classes: check class ownership/membership directly
-- 2. tournament_games: check creator, own games, or class membership directly
-- Neither policy now references minesweeper_tournaments SELECT, breaking the cycle.
