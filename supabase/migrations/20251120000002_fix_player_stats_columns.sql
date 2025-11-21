-- =====================================================================================
-- Fix Column Names in minesweeper_player_stats
-- =====================================================================================
-- Description: Renames/adds columns to match what complete_multiplayer_match expects
-- Created: 2025-11-20
-- Impact: Fixes schema mismatch between table definition and function usage
-- =====================================================================================

-- Add missing columns that completion functions expect
-- Note: games_played should equal total_matches, but we keep both for clarity

-- Add games_played column (total games played this season)
ALTER TABLE public.minesweeper_player_stats
ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0 CHECK (games_played >= 0);

-- Add games_won column (total games won this season)
ALTER TABLE public.minesweeper_player_stats
ADD COLUMN IF NOT EXISTS games_won INTEGER DEFAULT 0 CHECK (games_won >= 0);

-- Add win_streak column (current consecutive wins)
ALTER TABLE public.minesweeper_player_stats
ADD COLUMN IF NOT EXISTS win_streak INTEGER DEFAULT 0 CHECK (win_streak >= 0);

-- Add best_win_streak column (best streak this season)
ALTER TABLE public.minesweeper_player_stats
ADD COLUMN IF NOT EXISTS best_win_streak INTEGER DEFAULT 0 CHECK (best_win_streak >= 0);

-- Rename ranked_elo to rank for consistency with completion function
-- This is the primary ELO rating column
ALTER TABLE public.minesweeper_player_stats
RENAME COLUMN ranked_elo TO rank;

-- Update existing data: initialize games_played from total_matches
UPDATE public.minesweeper_player_stats
SET
  games_played = COALESCE(total_matches, 0),
  games_won = COALESCE(ranked_wins, 0) + COALESCE(quick_wins, 0);

-- Comments
COMMENT ON COLUMN public.minesweeper_player_stats.rank IS
  'ELO rating (1000 = default, updated after each ranked match). Renamed from ranked_elo for consistency.';

COMMENT ON COLUMN public.minesweeper_player_stats.games_played IS
  'Total games played this season (ranked + quick). Should match total_matches.';

COMMENT ON COLUMN public.minesweeper_player_stats.games_won IS
  'Total games won this season (ranked + quick). Should match ranked_wins + quick_wins.';

COMMENT ON COLUMN public.minesweeper_player_stats.win_streak IS
  'Current consecutive wins (resets on loss). Updated by completion functions.';

COMMENT ON COLUMN public.minesweeper_player_stats.best_win_streak IS
  'Best consecutive win streak achieved this season.';

-- Update index to use new column name
DROP INDEX IF EXISTS public.idx_player_stats_ranked_elo;
CREATE INDEX IF NOT EXISTS idx_player_stats_rank
  ON public.minesweeper_player_stats(rank DESC)
  WHERE total_matches > 0;

-- Update season ranking index to use new column name
DROP INDEX IF EXISTS public.idx_player_stats_season_ranking;
CREATE INDEX IF NOT EXISTS idx_player_stats_season_ranking
  ON public.minesweeper_player_stats(season, rank DESC)
  WHERE ranked_wins + ranked_losses > 0;

-- =====================================================================================
-- MIGRATION SUMMARY
-- =====================================================================================
-- ✅ Renamed ranked_elo → rank (matches completion function expectations)
-- ✅ Added games_played column (total games this season)
-- ✅ Added games_won column (total wins this season)
-- ✅ Added win_streak column (current streak)
-- ✅ Added best_win_streak column (best streak this season)
-- ✅ Updated indexes to use new column name
-- ✅ Initialized new columns from existing data
--
-- NOTE: This must run AFTER 20251120000000_fix_player_stats_primary_key.sql
--       which renames current_season → season
-- =====================================================================================
