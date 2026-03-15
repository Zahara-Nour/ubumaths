-- ============================================================================
-- Migration: Add role to minesweeper_leaderboard view
-- ============================================================================
-- Teachers can appear on the leaderboard but should not count
-- for student ranking positions.
-- ============================================================================

DROP VIEW IF EXISTS public.minesweeper_leaderboard_public;
DROP VIEW IF EXISTS public.minesweeper_leaderboard;
CREATE VIEW public.minesweeper_leaderboard AS
WITH ranked_games AS (
    SELECT mg.student_id,
        mg.points_earned,
        row_number() OVER (PARTITION BY mg.student_id ORDER BY mg.points_earned DESC) AS game_rank
    FROM minesweeper_games mg
    WHERE mg.status = 'won' AND mg.student_id IS NOT NULL AND mg.points_earned > 0
), top10_stats AS (
    SELECT ranked_games.student_id,
        count(*) AS top_games_count,
        sum(ranked_games.points_earned) AS top_games_total,
        round(avg(ranked_games.points_earned), 1) AS avg_top_10
    FROM ranked_games
    WHERE ranked_games.game_rank <= 10
    GROUP BY ranked_games.student_id
), full_stats AS (
    SELECT t.student_id,
        p.firstname,
        p.lastname,
        p.role,
        t.avg_top_10,
        t.top_games_count,
        t.top_games_total,
        (SELECT count(*) FROM minesweeper_games mg
            WHERE mg.student_id = t.student_id AND mg.status = 'won') AS games_won,
        (SELECT count(*) FROM minesweeper_games mg
            WHERE mg.student_id = t.student_id AND mg.status IN ('won', 'lost')) AS games_played,
        (SELECT sum(mg.points_earned) FROM minesweeper_games mg
            WHERE mg.student_id = t.student_id AND mg.status = 'won') AS total_points,
        (SELECT sum(mg.gidouilles_awarded) FROM minesweeper_games mg
            WHERE mg.student_id = t.student_id AND mg.status = 'won') AS total_gidouilles,
        round(
            (SELECT count(*) FROM minesweeper_games mg
                WHERE mg.student_id = t.student_id AND mg.status = 'won')::numeric
            / NULLIF((SELECT count(*) FROM minesweeper_games mg
                WHERE mg.student_id = t.student_id AND mg.status IN ('won', 'lost')), 0)::numeric
            * 100, 1
        ) AS win_rate
    FROM top10_stats t
    JOIN profiles p ON t.student_id = p.id
)
SELECT student_id,
    firstname,
    lastname,
    role,
    avg_top_10,
    top_games_count,
    games_won,
    games_played,
    total_points,
    total_gidouilles,
    win_rate,
    row_number() OVER (ORDER BY avg_top_10 DESC, games_won DESC) AS rank
FROM full_stats
ORDER BY row_number() OVER (ORDER BY avg_top_10 DESC, games_won DESC);

-- Recreate the public view that depends on minesweeper_leaderboard
CREATE VIEW public.minesweeper_leaderboard_public AS
SELECT
    substring(md5(student_id::text) FROM 1 FOR 8) AS player_id,
    firstname,
    avg_top_10,
    top_games_count,
    games_won,
    win_rate,
    rank
FROM minesweeper_leaderboard
WHERE rank <= 100
ORDER BY rank;

-- Restore grants
GRANT SELECT ON public.minesweeper_leaderboard TO anon, authenticated;
GRANT SELECT ON public.minesweeper_leaderboard_public TO anon, authenticated;
