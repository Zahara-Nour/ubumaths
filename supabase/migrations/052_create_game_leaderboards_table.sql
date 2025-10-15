-- Migration: Create game_leaderboards table
-- Description: Seasonal rankings
-- Author: Claude Code
-- Date: 2025-10-15

CREATE TABLE game_leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  season_identifier TEXT NOT NULL,  -- e.g., "2025-10" (year-month)
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Stats for the season
  prestige_earned INTEGER NOT NULL DEFAULT 0,
  combats_won INTEGER NOT NULL DEFAULT 0,
  challenges_completed INTEGER NOT NULL DEFAULT 0,

  -- Ranking
  rank INTEGER,  -- Calculated via SQL window function

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(season_identifier, user_id)
);

-- Indexes
CREATE INDEX idx_game_leaderboards_season ON game_leaderboards(season_identifier);
CREATE INDEX idx_game_leaderboards_prestige ON game_leaderboards(season_identifier, prestige_earned DESC);

-- Comments
COMMENT ON TABLE game_leaderboards IS 'Monthly leaderboard rankings with seasonal resets';
COMMENT ON COLUMN game_leaderboards.season_identifier IS 'Format: YYYY-MM for monthly seasons';
