-- Migration: Create game_achievements table
-- Description: Achievement definitions
-- Author: Claude Code
-- Date: 2025-10-15

CREATE TABLE game_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  slug TEXT NOT NULL UNIQUE,  -- e.g., "fire_master"
  name TEXT NOT NULL,  -- Display name
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('combat', 'progression', 'exploration', 'social')),

  -- Requirements
  requirement_type TEXT NOT NULL,  -- e.g., "monsters_defeated", "level_reached"
  requirement_value INTEGER NOT NULL,  -- e.g., 100 monsters
  element TEXT CHECK (element IN ('fire', 'water', 'earth', 'wind')),  -- Element-specific

  -- Rewards
  prestige_reward INTEGER NOT NULL DEFAULT 0,
  gidouilles_reward INTEGER NOT NULL DEFAULT 0,

  -- Visual
  icon_url TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_game_achievements_slug ON game_achievements(slug);
CREATE INDEX idx_game_achievements_category ON game_achievements(category);

-- Comments
COMMENT ON TABLE game_achievements IS 'Achievement definitions with requirements and rewards';
COMMENT ON COLUMN game_achievements.requirement_type IS 'Type of achievement condition (monsters_defeated, level_reached, etc.)';
