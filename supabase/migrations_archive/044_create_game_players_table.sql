-- Migration: Create game_players table
-- Description: Extends profiles with game-specific player data
-- Author: Claude Code
-- Date: 2025-10-15

CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- RPG Stats
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  prestige INTEGER NOT NULL DEFAULT 0,  -- Overall score/rank

  -- Element Affinities (Pyrs = in-game currency for each element)
  pyrs_fire INTEGER NOT NULL DEFAULT 0,
  pyrs_water INTEGER NOT NULL DEFAULT 0,
  pyrs_earth INTEGER NOT NULL DEFAULT 0,
  pyrs_wind INTEGER NOT NULL DEFAULT 0,

  -- Element Pyrs spent (for tracking)
  pyrs_fire_spent INTEGER NOT NULL DEFAULT 0,
  pyrs_water_spent INTEGER NOT NULL DEFAULT 0,
  pyrs_earth_spent INTEGER NOT NULL DEFAULT 0,
  pyrs_wind_spent INTEGER NOT NULL DEFAULT 0,

  -- Game Progress
  tutorial_stage TEXT NOT NULL DEFAULT 'cinematic_0',  -- Tutorial progression
  tutorial_completed_at TIMESTAMPTZ,
  total_combats INTEGER NOT NULL DEFAULT 0,
  combats_won INTEGER NOT NULL DEFAULT 0,
  combats_lost INTEGER NOT NULL DEFAULT 0,

  -- Settings
  help_bubbles_enabled BOOLEAN NOT NULL DEFAULT true,
  help_bubbles_seen TEXT[] NOT NULL DEFAULT '{}',  -- IDs of seen help tips
  music_settings JSONB NOT NULL DEFAULT '{"enabled": true, "volume": 0.7}'::jsonb,

  -- Timestamps
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_game_players_user_id ON game_players(user_id);
CREATE INDEX idx_game_players_level ON game_players(level DESC);
CREATE INDEX idx_game_players_prestige ON game_players(prestige DESC);

-- Comments
COMMENT ON TABLE game_players IS 'Player game profiles extending the base profiles table';
COMMENT ON COLUMN game_players.prestige IS 'Overall player score used for rankings';
COMMENT ON COLUMN game_players.tutorial_stage IS 'Current tutorial step (cinematic_0, index_1, combattre_2, etc.)';
