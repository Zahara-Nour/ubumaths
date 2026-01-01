-- Minesweeper Leaderboard: Average of Top 10 Games
-- Purpose: Rank players by skill (avg of best 10 games) instead of total points
-- This prevents players who play more from having an unfair advantage
-- Author: Claude (Supabase Expert)
-- Date: 2026-01-01

-- ============================================================================
-- Drop existing views
-- ============================================================================

DROP VIEW IF EXISTS public.minesweeper_leaderboard_public;
DROP VIEW IF EXISTS public.minesweeper_leaderboard;

-- ============================================================================
-- Create new leaderboard ranked by average of top 10 games
-- ============================================================================

CREATE VIEW public.minesweeper_leaderboard AS
WITH ranked_games AS (
  -- Rank each player's games by points (best first)
  SELECT
    mg.student_id,
    mg.points_earned,
    ROW_NUMBER() OVER (
      PARTITION BY mg.student_id
      ORDER BY mg.points_earned DESC
    ) AS game_rank
  FROM public.minesweeper_games mg
  WHERE mg.status = 'won'
    AND mg.student_id IS NOT NULL
    AND mg.points_earned > 0
),
top10_stats AS (
  -- Calculate average of top 10 games per player
  SELECT
    student_id,
    COUNT(*) AS top_games_count,
    SUM(points_earned) AS top_games_total,
    ROUND(AVG(points_earned), 1) AS avg_top_10
  FROM ranked_games
  WHERE game_rank <= 10
  GROUP BY student_id
),
full_stats AS (
  -- Combine with full player stats
  SELECT
    t.student_id,
    p.firstname,
    p.lastname,
    t.avg_top_10,
    t.top_games_count,
    t.top_games_total,
    (SELECT COUNT(*) FROM public.minesweeper_games mg
     WHERE mg.student_id = t.student_id AND mg.status = 'won') AS games_won,
    (SELECT COUNT(*) FROM public.minesweeper_games mg
     WHERE mg.student_id = t.student_id AND mg.status IN ('won', 'lost')) AS games_played,
    (SELECT SUM(mg.points_earned) FROM public.minesweeper_games mg
     WHERE mg.student_id = t.student_id AND mg.status = 'won') AS total_points,
    (SELECT SUM(mg.gidouilles_awarded) FROM public.minesweeper_games mg
     WHERE mg.student_id = t.student_id AND mg.status = 'won') AS total_gidouilles,
    ROUND(
      (SELECT COUNT(*) FROM public.minesweeper_games mg
       WHERE mg.student_id = t.student_id AND mg.status = 'won')::NUMERIC /
      NULLIF((SELECT COUNT(*) FROM public.minesweeper_games mg
       WHERE mg.student_id = t.student_id AND mg.status IN ('won', 'lost')), 0)::NUMERIC * 100,
      1
    ) AS win_rate
  FROM top10_stats t
  INNER JOIN public.profiles p ON t.student_id = p.id
)
SELECT
  student_id,
  firstname,
  lastname,
  avg_top_10,
  top_games_count,
  games_won,
  games_played,
  total_points,
  total_gidouilles,
  win_rate,
  ROW_NUMBER() OVER (ORDER BY avg_top_10 DESC, games_won DESC) AS rank
FROM full_stats
ORDER BY rank;

-- RLS for leaderboard view
ALTER VIEW public.minesweeper_leaderboard SET (security_invoker = on);

-- Grant access
GRANT SELECT ON public.minesweeper_leaderboard TO authenticated;
GRANT SELECT ON public.minesweeper_leaderboard TO anon;

COMMENT ON VIEW public.minesweeper_leaderboard IS
  'Global leaderboard ranked by average of top 10 games. Fair ranking that rewards skill over play time.';

-- ============================================================================
-- Create anonymized public leaderboard
-- ============================================================================

CREATE VIEW public.minesweeper_leaderboard_public AS
SELECT
  substring(md5(student_id::text) from 1 for 8) AS player_id,
  firstname,
  avg_top_10,
  top_games_count,
  games_won,
  win_rate,
  rank
FROM public.minesweeper_leaderboard
WHERE rank <= 100
ORDER BY rank;

ALTER VIEW public.minesweeper_leaderboard_public SET (security_invoker = on);

GRANT SELECT ON public.minesweeper_leaderboard_public TO anon;
GRANT SELECT ON public.minesweeper_leaderboard_public TO authenticated;

COMMENT ON VIEW public.minesweeper_leaderboard_public IS
  'Anonymized global leaderboard (top 100). Ranked by average of top 10 games.';

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
--
-- RANKING CHANGE:
--   OLD: ORDER BY total_points DESC
--   NEW: ORDER BY avg_top_10 DESC, games_won DESC
--
-- NEW FIELDS:
--   - avg_top_10: Average points of player's 10 best games
--   - top_games_count: Number of games in top 10 (1-10)
--
-- BENEFITS:
--   - Players with < 10 games can still compete (provisional ranking)
--   - Skill matters more than play time
--   - Bad games don't hurt your ranking
--   - Encourages quality over quantity
