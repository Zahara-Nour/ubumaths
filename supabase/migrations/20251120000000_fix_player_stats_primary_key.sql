-- =====================================================================================
-- Fix Primary Key on minesweeper_player_stats
-- =====================================================================================
-- Description: Changes primary key from student_id to (student_id, season) to support
--              multiple seasons per student
-- Created: 2025-11-20
-- Severity: CRITICAL (CWE-20: Improper Input Validation)
-- Impact: Enables seasonal ranking system, prevents constraint violations
-- =====================================================================================

-- Step 1: Drop existing primary key constraint
ALTER TABLE public.minesweeper_player_stats
DROP CONSTRAINT minesweeper_player_stats_pkey;

-- Step 2: Ensure current_season is populated for all existing rows
UPDATE public.minesweeper_player_stats
SET current_season = TO_CHAR(NOW(), 'YYYY-MM')
WHERE current_season IS NULL;

-- Step 3: Make current_season NOT NULL (required for primary key)
ALTER TABLE public.minesweeper_player_stats
ALTER COLUMN current_season SET NOT NULL;

-- Step 4: Rename current_season to season for clarity
ALTER TABLE public.minesweeper_player_stats
RENAME COLUMN current_season TO season;

-- Step 5: Add composite primary key (student_id, season)
ALTER TABLE public.minesweeper_player_stats
ADD PRIMARY KEY (student_id, season);

-- Step 6: Update column comment to reflect new semantics
COMMENT ON COLUMN public.minesweeper_player_stats.season IS
  'Season identifier (YYYY-MM format). Part of primary key - allows multiple season records per student.';

COMMENT ON TABLE public.minesweeper_player_stats IS
  'Player statistics for multiplayer Minesweeper - tracks wins, losses, ELO, streaks per season. Primary key: (student_id, season)';

-- =====================================================================================
-- MIGRATION SUMMARY
-- =====================================================================================
-- ✅ Changed primary key from (student_id) to (student_id, season)
-- ✅ Renamed current_season to season for clarity
-- ✅ Made season NOT NULL (required for primary key)
-- ✅ Updated comments to reflect new schema
--
-- NOTE: The completion functions need to be updated to use:
--   ON CONFLICT (student_id, season) instead of ON CONFLICT (student_id)
-- This will be fixed in the next migration.
-- =====================================================================================
