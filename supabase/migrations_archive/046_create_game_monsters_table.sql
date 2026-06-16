-- Migration: Create game_monsters table
-- Description: Monster instances for combat
-- Author: Claude Code
-- Date: 2025-10-15

CREATE TABLE game_monsters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Monster Definition
  name TEXT NOT NULL,  -- e.g., "Cobra", "Dragon de Feu"
  element TEXT NOT NULL CHECK (element IN ('fire', 'water', 'earth', 'wind')),
  level INTEGER NOT NULL,  -- 1-50
  category TEXT NOT NULL CHECK (category IN ('common', 'elite', 'legendary')),

  -- Monster Stats
  max_endurance INTEGER NOT NULL,  -- HP
  attack_coefficient FLOAT NOT NULL,  -- Damage multiplier

  -- Visual
  img_url TEXT NOT NULL,  -- Path to monster image
  img_head_url TEXT NOT NULL,  -- Path to monster head icon

  -- Spawn Info
  position TEXT,  -- Serialized position data (for map, future feature)
  spawned_by UUID REFERENCES profiles(id),  -- Teacher-spawned monsters
  spawned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Status
  is_dead BOOLEAN NOT NULL DEFAULT false,
  defeated_by UUID REFERENCES profiles(id),
  defeated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_game_monsters_element ON game_monsters(element);
CREATE INDEX idx_game_monsters_level ON game_monsters(level);
CREATE INDEX idx_game_monsters_category ON game_monsters(category);
CREATE INDEX idx_game_monsters_is_dead ON game_monsters(is_dead);

-- Comments
COMMENT ON TABLE game_monsters IS 'Monster instances for combat encounters';
COMMENT ON COLUMN game_monsters.attack_coefficient IS 'Multiplier for calculating monster damage';
COMMENT ON COLUMN game_monsters.spawned_by IS 'NULL for random spawns, set for teacher-spawned monsters';
