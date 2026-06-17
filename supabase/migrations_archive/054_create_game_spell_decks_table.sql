-- Migration: Create game_spell_decks table
-- Description: Player spell loadouts (10 spells per deck)
-- Author: Claude Code
-- Date: 2025-10-15

CREATE TABLE game_spell_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deck_name TEXT NOT NULL,  -- e.g., "Fire Focus", "Balanced"

  spell_ids UUID[] NOT NULL,  -- Array of 10 spell IDs

  is_active BOOLEAN NOT NULL DEFAULT false,  -- Current active deck

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT deck_size_limit CHECK (array_length(spell_ids, 1) = 10)
);

-- Indexes
CREATE INDEX idx_game_spell_decks_user_id ON game_spell_decks(user_id);
CREATE INDEX idx_game_spell_decks_active ON game_spell_decks(user_id, is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE game_spell_decks IS 'Player spell deck presets (10 spells each)';
COMMENT ON COLUMN game_spell_decks.is_active IS 'Only one deck can be active per player';
