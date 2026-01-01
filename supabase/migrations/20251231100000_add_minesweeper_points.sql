-- Minesweeper Points System Migration
-- Purpose: Add point-based scoring system for global leaderboard
-- Author: Claude (Supabase Expert)
-- Date: 2025-12-31
--
-- Scoring Formula:
--   Points = floor(BasePoints × (1 + SpeedBonus) × HintPenalty × StreakBonus) + DailyBonus
--
--   BasePoints     = { beginner: 50, intermediate: 200, expert: 500 }
--   ReferenceTime  = { beginner: 120s, intermediate: 600s, expert: 1200s }
--   SpeedBonus     = max(0, 1 - time / ReferenceTime)         -- 0 to 1
--   HintPenalty    = 0.9 ^ hints_used                         -- -10% per hint
--   StreakBonus    = 1 + min(0.25, streak × 0.05)             -- +5% per win, max +25%
--   DailyBonus     = 20 if first win of the day, else 0

-- ============================================================================
-- PART 1: Add points_earned Column
-- ============================================================================

ALTER TABLE public.minesweeper_games
ADD COLUMN IF NOT EXISTS points_earned INTEGER NOT NULL DEFAULT 0;

-- Add constraint: points must be non-negative
ALTER TABLE public.minesweeper_games
ADD CONSTRAINT valid_points_earned CHECK (points_earned >= 0);

COMMENT ON COLUMN public.minesweeper_games.points_earned IS
  'Points earned for this game. Calculated based on difficulty, time, hints used, streak bonus, and daily bonus. Only awarded for won games.';

-- ============================================================================
-- PART 2: Create calculate_minesweeper_points Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_minesweeper_points(
  p_difficulty TEXT,
  p_time_seconds INTEGER,
  p_hints_used INTEGER,
  p_student_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_base_points INTEGER;
  v_reference_time INTEGER;
  v_speed_bonus NUMERIC;
  v_hint_penalty NUMERIC;
  v_streak INTEGER;
  v_streak_bonus NUMERIC;
  v_is_first_today BOOLEAN;
  v_daily_bonus INTEGER;
  v_total_points INTEGER;
BEGIN
  -- Set base points and reference time by difficulty
  CASE p_difficulty
    WHEN 'beginner' THEN
      v_base_points := 50;
      v_reference_time := 120;  -- 2 minutes
    WHEN 'intermediate' THEN
      v_base_points := 200;
      v_reference_time := 600;  -- 10 minutes
    WHEN 'expert' THEN
      v_base_points := 500;
      v_reference_time := 1200; -- 20 minutes
    ELSE
      RETURN 0; -- Unknown difficulty
  END CASE;

  -- Calculate speed bonus: max(0, 1 - time/refTime)
  v_speed_bonus := GREATEST(0, 1 - (p_time_seconds::NUMERIC / v_reference_time));

  -- Calculate hint penalty: 0.9 ^ hints_used (-10% per hint)
  v_hint_penalty := POWER(0.9, p_hints_used);

  -- Calculate streak (consecutive wins before this game)
  -- Count consecutive wins going backwards from most recent completed game
  WITH recent_games AS (
    SELECT
      status,
      ROW_NUMBER() OVER (ORDER BY completed_at DESC) AS rn
    FROM public.minesweeper_games
    WHERE student_id = p_student_id
      AND status IN ('won', 'lost')
      AND completed_at IS NOT NULL
    ORDER BY completed_at DESC
    LIMIT 10  -- Only look at last 10 games for performance
  ),
  streak_calc AS (
    SELECT
      COUNT(*) AS streak
    FROM recent_games
    WHERE status = 'won'
      AND rn <= (
        SELECT COALESCE(MIN(rn) - 1, 10)
        FROM recent_games
        WHERE status = 'lost'
      )
  )
  SELECT COALESCE(streak, 0) INTO v_streak FROM streak_calc;

  -- Streak bonus: +5% per consecutive win, max +25%
  v_streak_bonus := 1 + LEAST(0.25, v_streak * 0.05);

  -- Check if first win of the day
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.minesweeper_games
    WHERE student_id = p_student_id
      AND status = 'won'
      AND DATE(completed_at AT TIME ZONE 'UTC') = CURRENT_DATE
  ) INTO v_is_first_today;

  -- Daily bonus: 20 points for first win of the day
  v_daily_bonus := CASE WHEN v_is_first_today THEN 20 ELSE 0 END;

  -- Calculate total points
  v_total_points := FLOOR(
    v_base_points * (1 + v_speed_bonus) * v_hint_penalty * v_streak_bonus
  ) + v_daily_bonus;

  RETURN v_total_points;
END;
$$;

COMMENT ON FUNCTION public.calculate_minesweeper_points IS
  'Calculates points for a Minesweeper win based on difficulty, time, hints, streak, and daily bonus.';

-- ============================================================================
-- PART 3: Update complete_minesweeper_game Function to Calculate Points
-- ============================================================================

-- Drop existing function to change return type
DROP FUNCTION IF EXISTS public.complete_minesweeper_game(UUID, JSONB);

CREATE OR REPLACE FUNCTION public.complete_minesweeper_game(
  p_game_id UUID,
  p_grid_state JSONB
)
RETURNS TABLE(
  gidouilles_earned INTEGER,
  achievements JSONB,
  points_earned INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_record RECORD;
  v_time_seconds INTEGER;
  v_gidouilles INTEGER;
  v_points INTEGER;
  v_is_valid BOOLEAN;
  v_grid_size INTEGER;
  v_unlocked_achievements JSONB;
BEGIN
  -- Step 1: Get game and verify ownership
  SELECT * INTO v_game_record
  FROM public.minesweeper_games
  WHERE id = p_game_id
    AND student_id = auth.uid()
    AND status = 'in_progress';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found, not owned by you, or already completed';
  END IF;

  -- Step 2: Validate grid_state represents a legitimate win
  v_is_valid := public.validate_minesweeper_win(p_grid_state, v_game_record.difficulty);

  IF NOT v_is_valid THEN
    RAISE EXCEPTION 'Invalid grid state: does not represent a valid win condition';
  END IF;

  -- Step 3: Validate grid_state size to prevent payload attacks
  v_grid_size := pg_column_size(p_grid_state);
  IF v_grid_size > 100000 THEN -- 100KB limit
    RAISE EXCEPTION 'Grid state too large: exceeds 100KB';
  END IF;

  -- Step 4: Calculate time_seconds server-side and cap to constraint limits
  IF v_game_record.started_at IS NOT NULL THEN
    v_time_seconds := GREATEST(1, EXTRACT(EPOCH FROM (NOW() - v_game_record.started_at))::INTEGER);
  ELSE
    v_time_seconds := 1;
  END IF;

  -- Cap time to reasonable bounds per difficulty (constraint: reasonable_time_bounds)
  CASE v_game_record.difficulty
    WHEN 'beginner' THEN
      v_time_seconds := LEAST(v_time_seconds, 3600);  -- max 1 hour
    WHEN 'intermediate' THEN
      v_time_seconds := LEAST(v_time_seconds, 7200);  -- max 2 hours
    WHEN 'expert' THEN
      v_time_seconds := LEAST(v_time_seconds, 14400); -- max 4 hours
  END CASE;

  -- Step 5: Calculate gidouilles using the correct parameter order
  v_gidouilles := public.calculate_minesweeper_gidouilles(
    v_game_record.difficulty,              -- p_difficulty TEXT
    v_time_seconds,                        -- p_time_seconds INTEGER
    v_game_record.student_id,              -- p_student_id UUID
    COALESCE(v_game_record.hints_used, 0)  -- p_hints_used INTEGER
  );

  -- Step 6: Calculate points
  v_points := public.calculate_minesweeper_points(
    v_game_record.difficulty,
    v_time_seconds,
    COALESCE(v_game_record.hints_used, 0),
    v_game_record.student_id
  );

  -- Step 7: Update game record
  UPDATE public.minesweeper_games
  SET
    status = 'won',
    completed_at = NOW(),
    time_seconds = v_time_seconds,
    gidouilles_awarded = v_gidouilles,
    points_earned = v_points,
    grid_state = p_grid_state
  WHERE id = p_game_id;

  -- Step 8: Award gidouilles to student
  UPDATE public.profiles
  SET gidouilles = COALESCE(gidouilles, 0) + v_gidouilles
  WHERE id = v_game_record.student_id;

  -- Step 9: Record transaction in gidouilles_history
  INSERT INTO public.gidouilles_history (student_id, delta, reason)
  VALUES (
    v_game_record.student_id,
    v_gidouilles,
    'Minesweeper win: ' || v_game_record.difficulty || ' (' || v_time_seconds || 's) +' || v_points || ' pts'
  );

  -- Step 10: Check and unlock achievements
  v_unlocked_achievements := public.check_and_unlock_achievements(p_game_id);

  -- Step 11: Return gidouilles_earned, achievements, and points_earned
  RETURN QUERY SELECT v_gidouilles, v_unlocked_achievements, v_points;
END;
$$;

COMMENT ON FUNCTION public.complete_minesweeper_game IS
  'Completes a Minesweeper game, validates win condition, calculates rewards and points, and unlocks achievements. Returns gidouilles_earned, achievements array, and points_earned.';

-- ============================================================================
-- PART 4: Update Leaderboard View - Global Ranking by Total Points
-- ============================================================================

-- Drop dependent views first
DROP VIEW IF EXISTS public.minesweeper_leaderboard_public;
DROP VIEW IF EXISTS public.minesweeper_leaderboard;

-- Create new global leaderboard ranked by total points
CREATE VIEW public.minesweeper_leaderboard AS
WITH player_stats AS (
  SELECT
    mg.student_id,
    p.firstname,
    p.lastname,
    COUNT(*) FILTER (WHERE mg.status = 'won') AS games_won,
    COUNT(*) FILTER (WHERE mg.status IN ('won', 'lost')) AS games_played,
    SUM(mg.points_earned) AS total_points,
    SUM(mg.gidouilles_awarded) AS total_gidouilles,
    MIN(mg.time_seconds) FILTER (WHERE mg.status = 'won' AND mg.difficulty = 'beginner') AS best_time_beginner,
    MIN(mg.time_seconds) FILTER (WHERE mg.status = 'won' AND mg.difficulty = 'intermediate') AS best_time_intermediate,
    MIN(mg.time_seconds) FILTER (WHERE mg.status = 'won' AND mg.difficulty = 'expert') AS best_time_expert,
    ROUND(
      (COUNT(*) FILTER (WHERE mg.status = 'won')::NUMERIC /
       NULLIF(COUNT(*) FILTER (WHERE mg.status IN ('won', 'lost')), 0)::NUMERIC) * 100,
      1
    ) AS win_rate
  FROM public.minesweeper_games mg
  INNER JOIN public.profiles p ON mg.student_id = p.id
  WHERE mg.student_id IS NOT NULL
    AND mg.status IN ('won', 'lost')
  GROUP BY mg.student_id, p.firstname, p.lastname
  HAVING COUNT(*) FILTER (WHERE mg.status = 'won') > 0
)
SELECT
  student_id,
  firstname,
  lastname,
  games_won,
  games_played,
  total_points,
  total_gidouilles,
  best_time_beginner,
  best_time_intermediate,
  best_time_expert,
  win_rate,
  ROW_NUMBER() OVER (ORDER BY total_points DESC, games_won DESC) AS rank
FROM player_stats
ORDER BY rank;

-- RLS for leaderboard view
ALTER VIEW public.minesweeper_leaderboard SET (security_invoker = on);

-- Grant access
GRANT SELECT ON public.minesweeper_leaderboard TO authenticated;
GRANT SELECT ON public.minesweeper_leaderboard TO anon;

COMMENT ON VIEW public.minesweeper_leaderboard IS
  'Global leaderboard ranked by total points. Points are calculated based on difficulty, time, hints, streak, and daily bonuses.';

-- Create anonymized public leaderboard
CREATE VIEW public.minesweeper_leaderboard_public AS
SELECT
  substring(md5(student_id::text) from 1 for 8) AS player_id,
  firstname,
  total_points,
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
  'Anonymized global leaderboard (top 100). Shows total points and rank.';

-- ============================================================================
-- PART 5: Backfill Points for Existing Won Games
-- ============================================================================

-- Calculate and update points for all existing won games
-- Note: Streak and daily bonuses won't be accurate for historical games,
-- so we only apply base points + speed bonus + hint penalty

UPDATE public.minesweeper_games mg
SET points_earned = (
  SELECT FLOOR(
    CASE mg.difficulty
      WHEN 'beginner' THEN 50
      WHEN 'intermediate' THEN 200
      WHEN 'expert' THEN 500
      ELSE 0
    END
    * (1 + GREATEST(0, 1 - mg.time_seconds::NUMERIC /
      CASE mg.difficulty
        WHEN 'beginner' THEN 120
        WHEN 'intermediate' THEN 600
        WHEN 'expert' THEN 1200
        ELSE 1
      END))
    * POWER(0.9, COALESCE(mg.hints_used, 0))
  )
)
WHERE mg.status = 'won'
  AND mg.points_earned = 0
  AND mg.student_id IS NOT NULL;

-- ============================================================================
-- PART 6: Add Index for Points Queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_minesweeper_games_points
  ON public.minesweeper_games(student_id, points_earned DESC)
  WHERE status = 'won' AND student_id IS NOT NULL;

COMMENT ON INDEX idx_minesweeper_games_points IS
  'Optimizes leaderboard queries by total points.';

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
--
-- ✅ COLUMN ADDED:
--    - minesweeper_games.points_earned (INTEGER, NOT NULL, DEFAULT 0)
--
-- ✅ FUNCTIONS:
--    - calculate_minesweeper_points(): Calculates points based on formula
--    - complete_minesweeper_game(): Updated to return (gidouilles_earned, achievements, points_earned)
--
-- ✅ SCORING FORMULA:
--    Points = floor(BasePoints × (1 + SpeedBonus) × HintPenalty × StreakBonus) + DailyBonus
--
--    BasePoints: beginner=50, intermediate=200, expert=500
--    SpeedBonus: 0-100% based on time vs reference
--    HintPenalty: -10% per hint used (0.9^hints)
--    StreakBonus: +5% per consecutive win (max +25%)
--    DailyBonus: +20 for first win of the day
--
-- ✅ VIEW UPDATED:
--    - minesweeper_leaderboard: Now ranks globally by total_points
--    - No longer partitioned by difficulty
--    - Shows best times for each difficulty as reference
--
-- ✅ BACKFILL:
--    - Existing won games updated with calculated points
--    - Streak/daily bonuses not applied to historical games
--
-- ✅ INDEX:
--    - idx_minesweeper_games_points for leaderboard performance
