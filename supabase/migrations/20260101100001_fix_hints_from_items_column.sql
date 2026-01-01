-- ============================================================================
-- Migration: Fix missing hints_from_items column
-- Purpose: Ensure hints_from_items column exists for Strategy D
-- Date: 2026-01-01
-- ============================================================================

-- Add hints_from_items column if it doesn't exist
ALTER TABLE public.minesweeper_games
ADD COLUMN IF NOT EXISTS hints_from_items INTEGER NOT NULL DEFAULT 0;

-- Add constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_hints_from_items_valid'
  ) THEN
    ALTER TABLE public.minesweeper_games
    ADD CONSTRAINT check_hints_from_items_valid CHECK (
      hints_from_items >= 0 AND hints_from_items <= hints_used
    );
  END IF;
END $$;

COMMENT ON COLUMN public.minesweeper_games.hints_from_items IS
  'Number of hints from shop items (half penalty: 5/11/17% vs 10/22/35% for gidouilles hints).';
