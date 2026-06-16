-- Migration: Fix minesweeper started_at not set on INSERT
-- Author: Claude Code
-- Date: 2026-04-02
-- Description:
--   The trigger trg_set_minesweeper_started_at was BEFORE UPDATE only.
--   createGameInDatabase() inserts the row with cells_revealed > 0 (after first click),
--   so the 0→>0 transition happens at INSERT time, not on a subsequent UPDATE.
--   Result: started_at stayed NULL → server returned GREATEST(1, ...) = 1 second always.
--
--   Fix: extend the trigger function and trigger to also handle BEFORE INSERT,
--   setting started_at when cells_revealed > 0 on the initial insert.

-- ============================================================================
-- Step 1: Replace trigger function to handle both INSERT and UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_minesweeper_started_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- On INSERT: set started_at if the game is already created with cells revealed
    -- (happens when createGameInDatabase() is called after first click)
    IF NEW.cells_revealed > 0 AND NEW.started_at IS NULL THEN
      NEW.started_at := NOW();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- On UPDATE: set started_at when transitioning from 0 cells revealed to >0 cells
    -- (original intended flow: insert with cells_revealed=0, then update on first click)
    IF OLD.cells_revealed = 0 AND NEW.cells_revealed > 0 AND NEW.started_at IS NULL THEN
      NEW.started_at := NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_minesweeper_started_at IS
  'Trigger function to automatically set started_at when first cell is revealed. '
  'Handles both INSERT (current flow: game created after first click) and UPDATE '
  '(original flow: 0→>0 transition). Prevents client manipulation of game start time.';

-- ============================================================================
-- Step 2: Recreate trigger to fire on both INSERT and UPDATE
-- ============================================================================

DROP TRIGGER IF EXISTS trg_set_minesweeper_started_at ON public.minesweeper_games;

CREATE TRIGGER trg_set_minesweeper_started_at
  BEFORE INSERT OR UPDATE ON public.minesweeper_games
  FOR EACH ROW
  EXECUTE FUNCTION public.set_minesweeper_started_at();
