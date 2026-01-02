-- Remove Minesweeper Daily Challenge Feature
-- This migration removes all tables, views, functions, and triggers related to
-- the daily challenge feature that is no longer needed.
--
-- Date: 2026-01-02

-- ============================================================================
-- Step 1: Drop trigger first (depends on function)
-- ============================================================================

DROP TRIGGER IF EXISTS trg_daily_challenge_ranking_update ON public.minesweeper_daily_attempts;

-- ============================================================================
-- Step 2: Drop views (depends on tables)
-- ============================================================================

DROP VIEW IF EXISTS public.minesweeper_daily_leaderboard;

-- ============================================================================
-- Step 3: Drop functions
-- ============================================================================

DROP FUNCTION IF EXISTS public.trg_update_daily_rankings();
DROP FUNCTION IF EXISTS public.update_daily_challenge_rankings(UUID);
DROP FUNCTION IF EXISTS public.record_daily_challenge_attempt(UUID, INTEGER, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.calculate_daily_challenge_gidouilles(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.get_or_create_daily_challenge();

-- ============================================================================
-- Step 4: Drop tables (in correct order due to foreign keys)
-- ============================================================================

-- Drop attempts table first (has FK to challenges)
DROP TABLE IF EXISTS public.minesweeper_daily_attempts;

-- Drop challenges table
DROP TABLE IF EXISTS public.minesweeper_daily_challenges;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- Removed:
-- - Trigger: trg_daily_challenge_ranking_update
-- - View: minesweeper_daily_leaderboard
-- - Functions:
--   - trg_update_daily_rankings()
--   - update_daily_challenge_rankings(UUID)
--   - record_daily_challenge_attempt(UUID, INTEGER, TEXT, JSONB)
--   - calculate_daily_challenge_gidouilles(TEXT, INTEGER)
--   - get_or_create_daily_challenge()
-- - Tables:
--   - minesweeper_daily_attempts
--   - minesweeper_daily_challenges
--
-- Note: gidouilles_history entries for daily challenges are preserved
-- for audit trail purposes.
