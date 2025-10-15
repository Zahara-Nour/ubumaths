-- Migration: Create game_challenges table
-- Description: Math challenge definitions imported from JSON
-- Author: Claude Code
-- Date: 2025-10-15

CREATE TABLE game_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Challenge Metadata
  slug TEXT NOT NULL UNIQUE,  -- e.g., "water_tables_1_1"
  element TEXT NOT NULL CHECK (element IN ('fire', 'water', 'earth', 'wind', 'base')),
  category TEXT NOT NULL,  -- e.g., "tables", "fractions", "geometry"
  difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),

  -- Challenge Data (from original JSON)
  timer INTEGER NOT NULL,  -- Milliseconds
  challenge_type INTEGER NOT NULL,  -- Type identifier (1-10+)
  question TEXT NOT NULL,  -- Question template with {variables}

  view_config JSONB NOT NULL DEFAULT '{}'::jsonb,  -- View settings (graph, table, etc.)
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Variable definitions
  answer JSONB NOT NULL,  -- Answer structure
  hint TEXT,  -- Hint HTML
  show_answer JSONB,  -- Show answer logic (for geometry)

  -- Usage Stats
  times_attempted INTEGER NOT NULL DEFAULT 0,
  times_succeeded INTEGER NOT NULL DEFAULT 0,
  avg_time_taken FLOAT,  -- Average completion time in seconds

  -- Management
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),  -- For custom challenges

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_game_challenges_element ON game_challenges(element);
CREATE INDEX idx_game_challenges_category ON game_challenges(category);
CREATE INDEX idx_game_challenges_difficulty ON game_challenges(difficulty);
CREATE INDEX idx_game_challenges_slug ON game_challenges(slug);
CREATE INDEX idx_game_challenges_active ON game_challenges(is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE game_challenges IS 'Math challenge definitions imported from original Navadra JSON files';
COMMENT ON COLUMN game_challenges.variables IS 'Variable definitions using Math.js syntax';
COMMENT ON COLUMN game_challenges.answer IS 'Expected answer structure for validation';
