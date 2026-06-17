/**
 * Migration: Add game mode support to 2048 scores
 *
 * Changes:
 * - Add mode column to game_2048_scores table
 * - Add check constraint for valid modes
 * - Add composite index on (mode, score DESC) for leaderboards
 * - Update RLS policies to work with modes
 */

-- Add mode column with default 'classic' for backwards compatibility
ALTER TABLE public.game_2048_scores
ADD COLUMN mode text NOT NULL DEFAULT 'classic';

-- Add check constraint to ensure only valid modes
ALTER TABLE public.game_2048_scores
ADD CONSTRAINT game_2048_scores_mode_check
CHECK (mode IN ('classic', 'multiplication', 'equations', 'fractions'));

-- Add composite index for efficient leaderboard queries per mode
CREATE INDEX idx_game_2048_scores_mode_score
ON public.game_2048_scores (mode, best_score DESC);

-- Update existing composite unique constraint to include mode
-- This allows same user to have best scores for different modes
ALTER TABLE public.game_2048_scores
DROP CONSTRAINT IF EXISTS game_2048_scores_user_id_unique;

ALTER TABLE public.game_2048_scores
ADD CONSTRAINT game_2048_scores_user_mode_unique
UNIQUE (user_id, mode);

-- Add comment explaining the mode column
COMMENT ON COLUMN public.game_2048_scores.mode IS
'Game mode: classic (powers of 2), multiplication (times tables), equations (algebra), fractions (equivalent fractions)';
