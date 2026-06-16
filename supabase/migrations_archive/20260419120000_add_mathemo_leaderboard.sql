-- ============================================================================
-- Migration: Add Mathemo leaderboard (total_score + rank function)
-- Created: 2026-04-19
-- ============================================================================

-- 1. Add total_score column to mathemo_scores
ALTER TABLE public.mathemo_scores
  ADD COLUMN IF NOT EXISTS total_score NUMERIC(10,2) NOT NULL DEFAULT 0
  CHECK (total_score >= 0);

COMMENT ON COLUMN public.mathemo_scores.total_score IS 'Cumulative score from all wins (sum of theoretical rewards × 100)';

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_mathemo_scores_leaderboard
  ON public.mathemo_scores(total_score DESC);

-- 2. Update upsert_mathemo_score() to accept and accumulate score
DROP FUNCTION IF EXISTS upsert_mathemo_score(uuid, integer, boolean, boolean);

CREATE OR REPLACE FUNCTION upsert_mathemo_score(
    p_user_id uuid,
    p_word_length integer,
    p_won boolean,
    p_found_first_try boolean,
    p_score numeric DEFAULT 0
)
RETURNS TABLE(
    games_played integer,
    games_won integer,
    best_word_length integer,
    first_try_count integer,
    total_score numeric,
    is_new_best_length boolean
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
DECLARE
    v_new_best integer;
BEGIN
    -- Security check: Verify caller is the user
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only update your own scores';
    END IF;

    INSERT INTO mathemo_scores (
        user_id,
        games_played,
        games_won,
        best_word_length,
        first_try_count,
        total_score
    )
    VALUES (
        p_user_id,
        1,
        CASE WHEN p_won THEN 1 ELSE 0 END,
        CASE WHEN p_won THEN p_word_length ELSE 0 END,
        CASE WHEN p_found_first_try THEN 1 ELSE 0 END,
        CASE WHEN p_won THEN p_score ELSE 0 END
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        games_played = mathemo_scores.games_played + 1,
        games_won = mathemo_scores.games_won + CASE WHEN p_won THEN 1 ELSE 0 END,
        best_word_length = CASE WHEN p_won
            THEN GREATEST(mathemo_scores.best_word_length, p_word_length)
            ELSE mathemo_scores.best_word_length
        END,
        first_try_count = mathemo_scores.first_try_count + CASE WHEN p_found_first_try THEN 1 ELSE 0 END,
        total_score = mathemo_scores.total_score + CASE WHEN p_won THEN p_score ELSE 0 END
    RETURNING
        mathemo_scores.games_played,
        mathemo_scores.games_won,
        mathemo_scores.best_word_length,
        mathemo_scores.first_try_count,
        mathemo_scores.total_score
    INTO games_played, games_won, v_new_best, first_try_count, total_score;

    best_word_length := v_new_best;
    is_new_best_length := (p_won AND p_word_length >= v_new_best);

    RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_mathemo_score(uuid, integer, boolean, boolean, numeric) TO authenticated;

COMMENT ON FUNCTION upsert_mathemo_score IS
'Atomically inserts or updates a Mathemo game score record. Accumulates total_score on wins.';

-- 3. Rank function for mathemo leaderboard
CREATE OR REPLACE FUNCTION get_mathemo_user_rank(p_user_id uuid)
RETURNS TABLE(user_rank bigint, total_players bigint, user_score numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH ranked AS (
        SELECT
            ms.user_id,
            ms.total_score,
            RANK() OVER (ORDER BY ms.total_score DESC) AS rank,
            COUNT(*) OVER () AS total
        FROM mathemo_scores ms
        WHERE ms.total_score > 0
    )
    SELECT
        r.rank AS user_rank,
        r.total AS total_players,
        r.total_score AS user_score
    FROM ranked r
    WHERE r.user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_mathemo_user_rank(uuid) TO authenticated;

COMMENT ON FUNCTION get_mathemo_user_rank IS
'Returns the rank, total players, and score for a user in the Mathemo leaderboard.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration: Mathemo Leaderboard';
    RAISE NOTICE '  1. total_score column added to mathemo_scores';
    RAISE NOTICE '  2. upsert_mathemo_score() updated with p_score parameter';
    RAISE NOTICE '  3. get_mathemo_user_rank() function created';
END;
$$;
