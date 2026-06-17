-- Migration: Create game_spells table
-- Description: Player spell collection and levels
-- Author: Claude Code
-- Date: 2025-10-15

CREATE TABLE game_spells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  spell_num INTEGER NOT NULL,  -- Spell identifier (1-50+)
  level INTEGER NOT NULL DEFAULT 1,  -- Upgrade level (1-5)
  element TEXT NOT NULL CHECK (element IN ('fire', 'water', 'earth', 'wind')),

  -- Spell Stats (calculated based on level)
  power INTEGER NOT NULL,  -- Damage/healing amount
  type TEXT NOT NULL CHECK (type IN ('attack', 'heal', 'buff', 'debuff')),

  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_upgraded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, spell_num)
);

-- Indexes
CREATE INDEX idx_game_spells_user_id ON game_spells(user_id);
CREATE INDEX idx_game_spells_element ON game_spells(element);

-- Comments
COMMENT ON TABLE game_spells IS 'Player spell collection with upgrade levels';
COMMENT ON COLUMN game_spells.spell_num IS 'Unique spell identifier across all elements';
COMMENT ON COLUMN game_spells.power IS 'Damage or healing power calculated from level';
