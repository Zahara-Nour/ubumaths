-- Migration: Create game_class_settings table
-- Description: Class-level game configuration for teachers
-- Author: Claude Code
-- Date: 2025-10-15

CREATE TABLE game_class_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,

  -- Difficulty Scaling
  base_difficulty INTEGER NOT NULL DEFAULT 3 CHECK (base_difficulty >= 1 AND base_difficulty <= 5),
  challenge_timer_multiplier FLOAT NOT NULL DEFAULT 1.0,  -- 1.0 = normal, 1.5 = 50% more time

  -- Features Enabled
  multiplayer_enabled BOOLEAN NOT NULL DEFAULT true,
  leaderboard_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Rewards Scaling
  xp_multiplier FLOAT NOT NULL DEFAULT 1.0,
  gidouilles_multiplier FLOAT NOT NULL DEFAULT 1.0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(class_id)
);

-- Indexes
CREATE INDEX idx_game_class_settings_class_id ON game_class_settings(class_id);

-- Comments
COMMENT ON TABLE game_class_settings IS 'Teacher-configurable game settings per class';
COMMENT ON COLUMN game_class_settings.challenge_timer_multiplier IS 'Multiplier for challenge time limits (1.0 = normal, 1.5 = 50% more time)';
