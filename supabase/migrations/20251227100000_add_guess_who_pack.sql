-- Add pack_id column to guess_who_games table
-- Migration: 20251227100000_add_guess_who_pack.sql

-- Add pack_id column with default 'naturals_medium' for backward compatibility
ALTER TABLE guess_who_games
ADD COLUMN pack_id TEXT NOT NULL DEFAULT 'naturals_medium';

-- Add constraint to validate pack_id values
ALTER TABLE guess_who_games
ADD CONSTRAINT valid_pack_id CHECK (
    pack_id IN ('naturals_easy', 'naturals_medium', 'naturals_hard', 'times_tables', 'primes_focus')
);

-- Create index for filtering games by pack
CREATE INDEX idx_guess_who_games_pack_id ON guess_who_games(pack_id);

-- Comment for documentation
COMMENT ON COLUMN guess_who_games.pack_id IS 'Game pack identifier: naturals_easy (CM1), naturals_medium (CM2), naturals_hard (6ème), times_tables, primes_focus';
