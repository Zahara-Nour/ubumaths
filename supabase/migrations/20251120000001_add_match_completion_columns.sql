-- =====================================================================================
-- Add Missing Columns to minesweeper_multiplayer_matches
-- =====================================================================================
-- Description: Adds columns needed by complete_multiplayer_match and abandon_multiplayer_match
-- Created: 2025-11-20
-- Impact: Enables proper tracking of match results, rewards, and ELO changes
-- =====================================================================================

-- Add duration_seconds column (time taken by winner)
ALTER TABLE public.minesweeper_multiplayer_matches
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER CHECK (duration_seconds > 0);

-- Add winner_reward column (gidouilles awarded to winner)
ALTER TABLE public.minesweeper_multiplayer_matches
ADD COLUMN IF NOT EXISTS winner_reward INTEGER DEFAULT 0 CHECK (winner_reward >= 0);

-- Add loser_reward column (gidouilles awarded to loser, if any)
ALTER TABLE public.minesweeper_multiplayer_matches
ADD COLUMN IF NOT EXISTS loser_reward INTEGER DEFAULT 0 CHECK (loser_reward >= 0);

-- Add elo_change column (ELO points gained by winner, lost by loser)
ALTER TABLE public.minesweeper_multiplayer_matches
ADD COLUMN IF NOT EXISTS elo_change INTEGER DEFAULT 0 CHECK (elo_change >= 0);

-- Comments
COMMENT ON COLUMN public.minesweeper_multiplayer_matches.duration_seconds IS
  'Time in seconds taken by the winner to complete the game';

COMMENT ON COLUMN public.minesweeper_multiplayer_matches.winner_reward IS
  'Gidouilles awarded to the winner (includes base reward + bonuses)';

COMMENT ON COLUMN public.minesweeper_multiplayer_matches.loser_reward IS
  'Gidouilles awarded to the loser (usually 0, except for consolation prizes)';

COMMENT ON COLUMN public.minesweeper_multiplayer_matches.elo_change IS
  'ELO rating points gained by winner and lost by loser (0 for non-ranked matches)';

-- =====================================================================================
-- MIGRATION SUMMARY
-- =====================================================================================
-- ✅ Added duration_seconds (winner's completion time)
-- ✅ Added winner_reward (gidouilles for winner)
-- ✅ Added loser_reward (gidouilles for loser, if any)
-- ✅ Added elo_change (ELO points exchanged)
--
-- These columns are required by:
-- - complete_multiplayer_match() function
-- - abandon_multiplayer_match() function
-- =====================================================================================
