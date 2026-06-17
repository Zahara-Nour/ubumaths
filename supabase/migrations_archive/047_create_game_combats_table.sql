-- Migration: Create game_combats table
-- Description: Combat instances with turn-by-turn flow
-- Author: Claude Code
-- Date: 2025-10-15

CREATE TABLE game_combats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Combat Participants
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  monster_id UUID NOT NULL REFERENCES game_monsters(id) ON DELETE CASCADE,
  invited_player_ids UUID[] NOT NULL DEFAULT '{}',  -- Multiplayer invites
  ready_player_ids UUID[] NOT NULL DEFAULT '{}',  -- Players who accepted

  -- Combat State
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'abandoned')),
  current_round INTEGER NOT NULL DEFAULT 1,
  current_turn INTEGER NOT NULL DEFAULT 1,

  -- Turn Order
  turn_order JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of player IDs in order

  -- Combat Snapshot (at start)
  player_snapshots JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Player stats at combat start
  monster_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Monster stats

  -- Combat Flow (turn-by-turn history)
  combat_flow JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of turn actions

  -- Combat Result
  outcome TEXT CHECK (outcome IN ('victory', 'defeat')),  -- null while active
  monster_endurance_remaining INTEGER,
  prestige_gained INTEGER,
  xp_gained INTEGER,
  pyrs_gained JSONB,  -- {fire: 10, water: 5, ...}

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_game_combats_organizer ON game_combats(organizer_id);
CREATE INDEX idx_game_combats_status ON game_combats(status);
CREATE INDEX idx_game_combats_started_at ON game_combats(started_at DESC);

-- Comments
COMMENT ON TABLE game_combats IS 'Combat instances with full turn-by-turn history';
COMMENT ON COLUMN game_combats.combat_flow IS 'JSONB array of turn actions with damage, spells, and challenge results';
COMMENT ON COLUMN game_combats.player_snapshots IS 'Player stats frozen at combat start';
