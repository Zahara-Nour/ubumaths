-- =====================================================================================
-- Update Leaderboard View to Use New Column Names
-- =====================================================================================
-- Description: Recreates view to use 'rank' instead of 'ranked_elo'
-- Created: 2025-11-20
-- Impact: Fixes view after column rename in 20251120000002
-- =====================================================================================

-- Drop existing view
DROP VIEW IF EXISTS public.minesweeper_multiplayer_leaderboard CASCADE;

-- Recreate view with updated column names
CREATE OR REPLACE VIEW public.minesweeper_multiplayer_leaderboard AS
SELECT
  s.student_id,
  p.firstname,
  p.lastname,
  p.avatar_url,
  s.rank,  -- Updated from ranked_elo
  s.ranked_wins,
  s.ranked_losses,
  s.ranked_win_streak,
  s.ranked_best_streak,
  s.total_gidouilles_earned,
  s.season,  -- Updated from current_season
  -- Calculate win rate percentage
  CASE
    WHEN s.ranked_wins + s.ranked_losses = 0 THEN 0
    ELSE ROUND((s.ranked_wins::NUMERIC / (s.ranked_wins + s.ranked_losses)) * 100, 1)
  END AS win_rate,
  -- Calculate total ranked matches
  s.ranked_wins + s.ranked_losses AS total_ranked_matches,
  -- Assign rank (1st, 2nd, 3rd, etc.)
  DENSE_RANK() OVER (
    PARTITION BY s.season
    ORDER BY s.rank DESC, s.ranked_wins DESC
  ) AS leaderboard_rank
FROM public.minesweeper_player_stats s
JOIN public.profiles p ON p.id = s.student_id
WHERE
  p.role = 'student'
  AND s.total_matches > 0 -- Only show players who have played at least one match
ORDER BY
  s.rank DESC,
  s.ranked_wins DESC;

-- Grant access
GRANT SELECT ON public.minesweeper_multiplayer_leaderboard TO authenticated;

-- Comments
COMMENT ON VIEW public.minesweeper_multiplayer_leaderboard IS
  'Ranked leaderboard with player stats, profiles, and calculated metrics. Uses updated column names (rank, season).';

-- =====================================================================================
-- MIGRATION SUMMARY
-- =====================================================================================
-- ✅ Recreated view to use 'rank' instead of 'ranked_elo'
-- ✅ Updated to use 'season' instead of 'current_season'
-- ✅ Renamed 'rank' output column to 'leaderboard_rank' to avoid confusion
--
-- NOTE: This must run AFTER:
--   - 20251120000000_fix_player_stats_primary_key.sql (renames current_season → season)
--   - 20251120000002_fix_player_stats_columns.sql (renames ranked_elo → rank)
-- =====================================================================================
