-- Minesweeper game tables and leaderboard
-- Purpose: Support public Minesweeper gameplay with premium features for authenticated students
-- Author: Claude (Supabase Expert)
-- Date: 2025-11-18
--
-- Features:
-- - Public gameplay (no auth required)
-- - Game saves for authenticated users only
-- - Gidouilles (currency) awards for authenticated users
-- - Statistics tracking and leaderboards
-- - Resume capability via JSONB grid state

-- ============================================================================
-- Table: minesweeper_games
-- ============================================================================
-- Stores Minesweeper game sessions. NULL student_id indicates public (anonymous) games.
-- Only authenticated users can save games and earn gidouilles.

CREATE TABLE public.minesweeper_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'expert')),
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'won', 'lost')),
  grid_state JSONB NOT NULL,  -- Complete game state for resuming (see below for structure)
  time_seconds INTEGER,  -- NULL for in_progress, required for completed games
  mines_count INTEGER NOT NULL CHECK (mines_count > 0),
  flags_used INTEGER DEFAULT 0 CHECK (flags_used >= 0),
  cells_revealed INTEGER DEFAULT 0 CHECK (cells_revealed >= 0),
  gidouilles_awarded INTEGER DEFAULT 0 CHECK (gidouilles_awarded >= 0 AND gidouilles_awarded <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,

  -- Consistency constraints
  CONSTRAINT in_progress_must_not_be_completed CHECK (
    (status = 'in_progress' AND completed_at IS NULL) OR
    (status IN ('won', 'lost') AND completed_at IS NOT NULL)
  ),
  CONSTRAINT completed_must_have_time CHECK (
    (status = 'in_progress' AND time_seconds IS NULL) OR
    (status IN ('won', 'lost') AND time_seconds IS NOT NULL AND time_seconds > 0)
  ),
  CONSTRAINT public_games_no_gidouilles CHECK (
    (student_id IS NULL AND gidouilles_awarded = 0) OR
    (student_id IS NOT NULL)
  )
);

-- grid_state JSONB structure:
-- {
--   "rows": 9,
--   "cols": 9,
--   "mines": [[0, 5], [2, 3], ...],           -- Array of [row, col] mine positions
--   "revealed": [[0, 0], [0, 1], ...],         -- Array of [row, col] revealed cells
--   "flagged": [[1, 2], ...],                  -- Array of [row, col] flagged cells
--   "adjacentCounts": {"0-0": 1, "0-1": 2, ...} -- Map of "row-col": count
-- }

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- User's games lookup
CREATE INDEX idx_minesweeper_games_student_id
  ON public.minesweeper_games(student_id)
  WHERE student_id IS NOT NULL;

-- User stats queries (games by difficulty and status)
CREATE INDEX idx_minesweeper_games_student_difficulty_status
  ON public.minesweeper_games(student_id, difficulty, status)
  WHERE student_id IS NOT NULL;

-- Leaderboard queries (best times by difficulty)
CREATE INDEX idx_minesweeper_games_leaderboard
  ON public.minesweeper_games(difficulty, time_seconds, completed_at)
  WHERE status = 'won' AND student_id IS NOT NULL;

-- Cleanup of old in-progress games (cron job optimization)
CREATE INDEX idx_minesweeper_games_cleanup
  ON public.minesweeper_games(created_at, status)
  WHERE status = 'in_progress';

-- Resume in-progress game query optimization
CREATE INDEX idx_minesweeper_games_resume
  ON public.minesweeper_games(student_id, created_at DESC)
  WHERE student_id IS NOT NULL AND status = 'in_progress';

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

ALTER TABLE public.minesweeper_games ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their own games
-- Note: We allow viewing public games (student_id IS NULL) for potential cleanup jobs
CREATE POLICY "Users can view own minesweeper games"
  ON public.minesweeper_games
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- INSERT: Anyone can create games
-- Authenticated users MUST set student_id = auth.uid()
-- Anonymous users MUST set student_id = NULL
CREATE POLICY "Authenticated users can create own games"
  ON public.minesweeper_games
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Anonymous users can create public games"
  ON public.minesweeper_games
  FOR INSERT
  TO anon
  WITH CHECK (student_id IS NULL AND gidouilles_awarded = 0);

-- UPDATE: Only authenticated users can update their own games
CREATE POLICY "Users can update own minesweeper games"
  ON public.minesweeper_games
  FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- DELETE: Only authenticated users can delete their own games
CREATE POLICY "Users can delete own minesweeper games"
  ON public.minesweeper_games
  FOR DELETE
  TO authenticated
  USING (student_id = auth.uid());

-- ============================================================================
-- View: minesweeper_leaderboard
-- ============================================================================
-- Provides ranked leaderboard data partitioned by difficulty level.
-- Only includes authenticated users with at least one win.

CREATE VIEW public.minesweeper_leaderboard AS
WITH player_stats AS (
  SELECT
    mg.student_id,
    p.first_name,
    p.last_name,
    mg.difficulty,
    COUNT(*) FILTER (WHERE mg.status = 'won') AS games_won,
    COUNT(*) AS games_played,
    MIN(mg.time_seconds) FILTER (WHERE mg.status = 'won') AS best_time,
    SUM(mg.gidouilles_awarded) AS total_gidouilles,
    ROUND(
      (COUNT(*) FILTER (WHERE mg.status = 'won')::NUMERIC / COUNT(*)::NUMERIC) * 100,
      1
    ) AS win_rate
  FROM public.minesweeper_games mg
  INNER JOIN public.profiles p ON mg.student_id = p.id
  WHERE mg.student_id IS NOT NULL  -- Only authenticated users
    AND mg.status IN ('won', 'lost')  -- Only completed games
  GROUP BY mg.student_id, p.first_name, p.last_name, mg.difficulty
  HAVING COUNT(*) FILTER (WHERE mg.status = 'won') > 0  -- At least 1 win
)
SELECT
  student_id,
  first_name,
  last_name,
  difficulty,
  games_won,
  games_played,
  best_time,
  total_gidouilles,
  win_rate,
  ROW_NUMBER() OVER (
    PARTITION BY difficulty
    ORDER BY best_time ASC, games_won DESC
  ) AS rank
FROM player_stats
ORDER BY difficulty, rank;

-- RLS for leaderboard view (inherits from base tables)
ALTER VIEW public.minesweeper_leaderboard SET (security_invoker = on);

-- Grant access to view
GRANT SELECT ON public.minesweeper_leaderboard TO authenticated;
GRANT SELECT ON public.minesweeper_leaderboard TO anon;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE public.minesweeper_games IS
  'Stores Minesweeper game sessions. Supports both public (student_id = NULL) and authenticated gameplay.';

COMMENT ON COLUMN public.minesweeper_games.student_id IS
  'NULL for public games, UUID for authenticated user games. Only authenticated users earn gidouilles.';

COMMENT ON COLUMN public.minesweeper_games.grid_state IS
  'JSONB storing complete game state: rows, cols, mines, revealed, flagged, adjacentCounts. Enables game resume.';

COMMENT ON COLUMN public.minesweeper_games.gidouilles_awarded IS
  'In-game currency awarded on win. Always 0 for public games (student_id = NULL).';

COMMENT ON VIEW public.minesweeper_leaderboard IS
  'Ranked leaderboard partitioned by difficulty. Only includes authenticated users with at least 1 win.';
