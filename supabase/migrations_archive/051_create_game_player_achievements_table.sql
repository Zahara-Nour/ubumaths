-- Migration: Create game_player_achievements table
-- Description: Player achievement progress tracking
-- Author: Claude Code
-- Date: 2025-10-15

CREATE TABLE game_player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES game_achievements(id) ON DELETE CASCADE,

  progress INTEGER NOT NULL DEFAULT 0,  -- Current progress toward requirement
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, achievement_id)
);

-- Indexes
CREATE INDEX idx_game_player_achievements_user_id ON game_player_achievements(user_id);
CREATE INDEX idx_game_player_achievements_completed ON game_player_achievements(completed);

-- Comments
COMMENT ON TABLE game_player_achievements IS 'Player progress toward achievements';
COMMENT ON COLUMN game_player_achievements.progress IS 'Current progress value (e.g., 45 out of 100 monsters defeated)';
