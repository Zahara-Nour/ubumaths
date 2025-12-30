-- Campus game leaderboard
-- Purpose: Store completed Campus game scores for authenticated users
-- Author: Claude
-- Date: 2024-12-30
--
-- Features:
-- - Public gameplay (no auth required, localStorage for persistence)
-- - Leaderboard entries for authenticated users only
-- - Score = roll_count * 100 + total_points_used (lower is better)

-- ============================================================================
-- Table: campus_games
-- ============================================================================
-- Stores completed Campus game scores. Only authenticated users can save scores.

CREATE TABLE public.campus_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  roll_count INTEGER NOT NULL CHECK (roll_count > 0 AND roll_count <= 1000),
  total_points_used INTEGER NOT NULL CHECK (total_points_used >= 0 AND total_points_used <= 10000),
  score INTEGER NOT NULL CHECK (score >= 0),
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure score is calculated correctly
  CONSTRAINT score_calculation CHECK (score = roll_count * 100 + total_points_used)
);

-- Add comment for documentation
COMMENT ON TABLE public.campus_games IS 'Stores completed Campus game scores for the leaderboard';
COMMENT ON COLUMN public.campus_games.roll_count IS 'Number of dice rolls used to complete the game';
COMMENT ON COLUMN public.campus_games.total_points_used IS 'Total points spent on token selections';
COMMENT ON COLUMN public.campus_games.score IS 'Final score: roll_count * 100 + total_points_used (lower is better)';

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- User's games lookup
CREATE INDEX idx_campus_games_student_id
  ON public.campus_games(student_id);

-- Leaderboard queries (best scores)
CREATE INDEX idx_campus_games_leaderboard
  ON public.campus_games(score ASC, completed_at DESC);

-- User's best score query
CREATE INDEX idx_campus_games_user_best
  ON public.campus_games(student_id, score ASC);

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

ALTER TABLE public.campus_games ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view all scores (public leaderboard)
CREATE POLICY "Anyone can view campus leaderboard"
  ON public.campus_games
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Users can only insert their own scores
CREATE POLICY "Users can insert own campus scores"
  ON public.campus_games
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

-- No UPDATE or DELETE - scores are permanent

-- ============================================================================
-- RPC Functions
-- ============================================================================

-- Function to submit a completed game score
CREATE OR REPLACE FUNCTION public.submit_campus_score(
  p_roll_count INTEGER,
  p_total_points_used INTEGER
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_score INTEGER;
  v_game_id UUID;
  v_rank INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate inputs
  IF p_roll_count <= 0 OR p_roll_count > 1000 THEN
    RAISE EXCEPTION 'Invalid roll count';
  END IF;
  IF p_total_points_used < 0 OR p_total_points_used > 10000 THEN
    RAISE EXCEPTION 'Invalid total points';
  END IF;

  -- Calculate score
  v_score := p_roll_count * 100 + p_total_points_used;

  -- Insert the score
  INSERT INTO public.campus_games (student_id, roll_count, total_points_used, score)
  VALUES (v_user_id, p_roll_count, p_total_points_used, v_score)
  RETURNING id INTO v_game_id;

  -- Get current rank
  SELECT COUNT(*) + 1 INTO v_rank
  FROM public.campus_games
  WHERE score < v_score;

  RETURN json_build_object(
    'success', true,
    'game_id', v_game_id,
    'score', v_score,
    'rank', v_rank
  );
END;
$$;

-- Function to get leaderboard
CREATE OR REPLACE FUNCTION public.get_campus_leaderboard(
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  -- Validate inputs
  IF p_limit <= 0 OR p_limit > 100 THEN
    p_limit := 10;
  END IF;
  IF p_offset < 0 THEN
    p_offset := 0;
  END IF;

  -- Get total count
  SELECT COUNT(*) INTO v_total FROM public.campus_games;

  RETURN json_build_object(
    'entries', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          cg.id,
          cg.student_id,
          p.display_name AS username,
          cg.roll_count,
          cg.total_points_used,
          cg.score,
          cg.completed_at,
          ROW_NUMBER() OVER (ORDER BY cg.score ASC, cg.completed_at ASC) AS rank
        FROM public.campus_games cg
        JOIN public.profiles p ON p.id = cg.student_id
        ORDER BY cg.score ASC, cg.completed_at ASC
        LIMIT p_limit
        OFFSET p_offset
      ) t
    ),
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;

-- Function to get user's best score and rank
CREATE OR REPLACE FUNCTION public.get_campus_user_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_best_score INTEGER;
  v_games_played INTEGER;
  v_best_rank INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('authenticated', false);
  END IF;

  -- Get user's best score and games played
  SELECT MIN(score), COUNT(*)
  INTO v_best_score, v_games_played
  FROM public.campus_games
  WHERE student_id = v_user_id;

  -- Get rank of best score
  IF v_best_score IS NOT NULL THEN
    SELECT COUNT(*) + 1 INTO v_best_rank
    FROM public.campus_games
    WHERE score < v_best_score;
  END IF;

  RETURN json_build_object(
    'authenticated', true,
    'best_score', v_best_score,
    'games_played', v_games_played,
    'best_rank', v_best_rank
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.submit_campus_score(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campus_leaderboard(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campus_user_stats() TO authenticated;
