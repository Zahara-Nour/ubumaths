-- ============================================================================
-- Migration: Cleanup Function Overloads
-- Created: 2025-11-21
-- ============================================================================
-- Removes duplicate function signatures caused by CREATE OR REPLACE with
-- different parameter lists. PostgreSQL treats different signatures as
-- different functions (overloading), not replacements.
--
-- This cleanup drops the 3-parameter version of complete_minesweeper_game
-- and keeps only the 2-parameter version (UUID, JSONB) which is used by
-- the codebase and handles achievements internally.
-- ============================================================================

-- Drop the 3-parameter overload (no longer needed - achievements handled internally)
DROP FUNCTION IF EXISTS public.complete_minesweeper_game(UUID, JSONB, JSONB);

-- Verify only the 2-parameter version remains by re-granting
-- (This will fail if the function doesn't exist, acting as a safety check)
GRANT EXECUTE ON FUNCTION public.complete_minesweeper_game(UUID, JSONB) TO authenticated;

-- ============================================================================
-- EXPLANATION:
-- The 3-parameter version was created in migration 20251121000001 with:
--   complete_minesweeper_game(p_game_id UUID, p_grid_state JSONB, p_achievements JSONB DEFAULT NULL)
--
-- But the codebase only calls with 2 parameters:
--   .rpc('complete_minesweeper_game', { p_game_id, p_grid_state })
--
-- The 2-parameter version (from 20251121090000) handles achievements internally
-- via check_and_unlock_achievements(), so the 3-parameter version is obsolete.
-- ============================================================================
