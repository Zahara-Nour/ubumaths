-- =====================================================================================
-- Minesweeper Multiplayer Competitive System
-- =====================================================================================
-- Description: Comprehensive multiplayer system for competitive Minesweeper
-- Features:
--   - Real-time 1v1 matches with identical grids (using seeds)
--   - Matchmaking queue with ELO-based ranking
--   - Multiple match types: quick, challenge, ranked
--   - Live game state tracking for Supabase Realtime
--   - Player statistics and leaderboards
--   - Seasonal ranking system
-- =====================================================================================

-- =====================================================================================
-- TABLE 1: minesweeper_multiplayer_matches
-- =====================================================================================
-- Stores information about multiplayer matches between two players
-- Each match uses a seed to generate identical grids for fair competition

CREATE TABLE IF NOT EXISTS public.minesweeper_multiplayer_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Match configuration
  match_type TEXT NOT NULL CHECK (match_type IN ('quick', 'challenge', 'ranked')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'expert')),
  seed TEXT NOT NULL, -- Seed for deterministic grid generation (both players get same grid)

  -- Players
  player1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Match state
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'countdown', 'in_progress', 'completed', 'abandoned')),
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Player performance
  player1_time INTEGER CHECK (player1_time >= 0), -- Time in seconds (NULL if didn't finish)
  player2_time INTEGER CHECK (player2_time >= 0), -- Time in seconds (NULL if didn't finish)
  player1_gidouilles INTEGER DEFAULT 0 CHECK (player1_gidouilles >= 0),
  player2_gidouilles INTEGER DEFAULT 0 CHECK (player2_gidouilles >= 0),

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT different_players CHECK (player1_id != player2_id),
  CONSTRAINT valid_winner CHECK (winner_id IS NULL OR winner_id = player1_id OR winner_id = player2_id),
  CONSTRAINT completed_must_have_winner CHECK (status != 'completed' OR winner_id IS NOT NULL),
  CONSTRAINT completed_must_have_timestamp CHECK (status != 'completed' OR completed_at IS NOT NULL),
  CONSTRAINT started_must_have_timestamp CHECK (status IN ('waiting', 'countdown') OR started_at IS NOT NULL),
  CONSTRAINT timestamps_order CHECK (started_at IS NULL OR completed_at IS NULL OR started_at <= completed_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_multiplayer_matches_player1
  ON public.minesweeper_multiplayer_matches(player1_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_multiplayer_matches_player2
  ON public.minesweeper_multiplayer_matches(player2_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_multiplayer_matches_active_status
  ON public.minesweeper_multiplayer_matches(status)
  WHERE status IN ('waiting', 'countdown', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_multiplayer_matches_winner
  ON public.minesweeper_multiplayer_matches(winner_id, created_at DESC)
  WHERE winner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_multiplayer_matches_completed
  ON public.minesweeper_multiplayer_matches(completed_at DESC)
  WHERE status = 'completed';

-- Comments
COMMENT ON TABLE public.minesweeper_multiplayer_matches IS 'Stores multiplayer Minesweeper matches between two players';
COMMENT ON COLUMN public.minesweeper_multiplayer_matches.seed IS 'Random seed for deterministic grid generation - ensures both players get identical grid';
COMMENT ON COLUMN public.minesweeper_multiplayer_matches.match_type IS 'quick: casual play, challenge: direct friend challenge, ranked: competitive with ELO';
COMMENT ON COLUMN public.minesweeper_multiplayer_matches.status IS 'waiting: waiting for opponent, countdown: 3-2-1 countdown, in_progress: actively playing, completed: finished normally, abandoned: one player left';


-- =====================================================================================
-- TABLE 2: minesweeper_multiplayer_queue
-- =====================================================================================
-- Matchmaking queue for finding opponents with similar skill levels

CREATE TABLE IF NOT EXISTS public.minesweeper_multiplayer_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Player info
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Queue preferences
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'expert')),
  match_type TEXT NOT NULL DEFAULT 'quick' CHECK (match_type IN ('quick', 'ranked')),

  -- Matchmaking data
  rank INTEGER DEFAULT 1000 CHECK (rank >= 0 AND rank <= 3000), -- ELO/MMR for skill-based matchmaking

  -- Queue state
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),

  -- Prevent duplicate queue entries
  CONSTRAINT unique_active_queue_entry UNIQUE (student_id) DEFERRABLE INITIALLY DEFERRED,

  -- Matchmaking timeout (remove stale entries)
  CONSTRAINT reasonable_queue_time CHECK (joined_at >= NOW() - INTERVAL '1 hour')
);

-- Indexes for efficient matchmaking
CREATE INDEX IF NOT EXISTS idx_multiplayer_queue_matchmaking
  ON public.minesweeper_multiplayer_queue(difficulty, match_type, rank, joined_at)
  WHERE status = 'waiting';

CREATE INDEX IF NOT EXISTS idx_multiplayer_queue_student
  ON public.minesweeper_multiplayer_queue(student_id, status);

CREATE INDEX IF NOT EXISTS idx_multiplayer_queue_cleanup
  ON public.minesweeper_multiplayer_queue(joined_at)
  WHERE status = 'waiting';

-- Comments
COMMENT ON TABLE public.minesweeper_multiplayer_queue IS 'Matchmaking queue for finding opponents based on skill and preferences';
COMMENT ON COLUMN public.minesweeper_multiplayer_queue.rank IS 'ELO rating for skill-based matchmaking (1000 = default, higher = better)';
COMMENT ON CONSTRAINT unique_active_queue_entry ON public.minesweeper_multiplayer_queue IS 'Prevents a student from joining queue multiple times simultaneously';


-- =====================================================================================
-- TABLE 3: minesweeper_multiplayer_game_state
-- =====================================================================================
-- Real-time game state tracking for each player during a match
-- Used for live updates via Supabase Realtime

CREATE TABLE IF NOT EXISTS public.minesweeper_multiplayer_game_state (
  match_id UUID NOT NULL REFERENCES public.minesweeper_multiplayer_matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Live game metrics
  cells_revealed INTEGER DEFAULT 0 CHECK (cells_revealed >= 0),
  flags_used INTEGER DEFAULT 0 CHECK (flags_used >= 0),
  time_elapsed INTEGER DEFAULT 0 CHECK (time_elapsed >= 0), -- Seconds

  -- Last action for debugging and replay
  last_action JSONB, -- { type: 'reveal' | 'flag' | 'unflag', row: number, col: number, timestamp: ISO8601 }

  -- Timestamp
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Primary key (composite)
  PRIMARY KEY (match_id, player_id),

  -- Ensure player is part of the match
  CONSTRAINT player_in_match CHECK (
    player_id IN (
      SELECT player1_id FROM public.minesweeper_multiplayer_matches WHERE id = match_id
      UNION
      SELECT player2_id FROM public.minesweeper_multiplayer_matches WHERE id = match_id
    )
  )
);

-- Index for Realtime subscriptions
CREATE INDEX IF NOT EXISTS idx_multiplayer_game_state_match
  ON public.minesweeper_multiplayer_game_state(match_id);

CREATE INDEX IF NOT EXISTS idx_multiplayer_game_state_player
  ON public.minesweeper_multiplayer_game_state(player_id);

-- Comments
COMMENT ON TABLE public.minesweeper_multiplayer_game_state IS 'Real-time game state for live match updates via Supabase Realtime';
COMMENT ON COLUMN public.minesweeper_multiplayer_game_state.last_action IS 'JSONB object with last player action for debugging: {type, row, col, timestamp}';


-- =====================================================================================
-- TABLE 4: minesweeper_player_stats
-- =====================================================================================
-- Player statistics for matchmaking, leaderboards, and progression tracking

CREATE TABLE IF NOT EXISTS public.minesweeper_player_stats (
  student_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Ranked mode stats
  ranked_elo INTEGER DEFAULT 1000 CHECK (ranked_elo >= 0 AND ranked_elo <= 3000),
  ranked_wins INTEGER DEFAULT 0 CHECK (ranked_wins >= 0),
  ranked_losses INTEGER DEFAULT 0 CHECK (ranked_losses >= 0),
  ranked_win_streak INTEGER DEFAULT 0 CHECK (ranked_win_streak >= 0),
  ranked_best_streak INTEGER DEFAULT 0 CHECK (ranked_best_streak >= 0),

  -- Quick match stats
  quick_wins INTEGER DEFAULT 0 CHECK (quick_wins >= 0),
  quick_losses INTEGER DEFAULT 0 CHECK (quick_losses >= 0),

  -- Overall stats
  total_matches INTEGER DEFAULT 0 CHECK (total_matches >= 0),
  total_gidouilles_earned INTEGER DEFAULT 0 CHECK (total_gidouilles_earned >= 0),

  -- Season tracking
  current_season TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM'), -- Format: "2025-11"

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Consistency check
  CONSTRAINT total_matches_consistency CHECK (
    total_matches = ranked_wins + ranked_losses + quick_wins + quick_losses
  )
);

-- Indexes for leaderboards and rankings
CREATE INDEX IF NOT EXISTS idx_player_stats_ranked_elo
  ON public.minesweeper_player_stats(ranked_elo DESC)
  WHERE total_matches > 0;

CREATE INDEX IF NOT EXISTS idx_player_stats_season_ranking
  ON public.minesweeper_player_stats(current_season, ranked_elo DESC)
  WHERE ranked_wins + ranked_losses > 0;

CREATE INDEX IF NOT EXISTS idx_player_stats_win_streak
  ON public.minesweeper_player_stats(ranked_best_streak DESC)
  WHERE ranked_best_streak > 0;

-- Comments
COMMENT ON TABLE public.minesweeper_player_stats IS 'Player statistics for multiplayer Minesweeper - tracks wins, losses, ELO, streaks';
COMMENT ON COLUMN public.minesweeper_player_stats.ranked_elo IS 'ELO rating for ranked matches (1000 = default, updated after each ranked match)';
COMMENT ON COLUMN public.minesweeper_player_stats.current_season IS 'Current season identifier (YYYY-MM format) - reset stats each season';
COMMENT ON COLUMN public.minesweeper_player_stats.ranked_win_streak IS 'Current consecutive wins in ranked mode';
COMMENT ON COLUMN public.minesweeper_player_stats.ranked_best_streak IS 'Best consecutive win streak ever achieved';


-- =====================================================================================
-- VIEW: minesweeper_multiplayer_leaderboard
-- =====================================================================================
-- Pre-calculated leaderboard for ranked mode with player profiles

CREATE OR REPLACE VIEW public.minesweeper_multiplayer_leaderboard AS
SELECT
  s.student_id,
  p.firstname,
  p.lastname,
  p.avatar_url,
  s.ranked_elo,
  s.ranked_wins,
  s.ranked_losses,
  s.ranked_win_streak,
  s.ranked_best_streak,
  s.total_gidouilles_earned,
  s.current_season,
  -- Calculate win rate percentage
  CASE
    WHEN s.ranked_wins + s.ranked_losses = 0 THEN 0
    ELSE ROUND((s.ranked_wins::NUMERIC / (s.ranked_wins + s.ranked_losses)) * 100, 1)
  END AS win_rate,
  -- Calculate total ranked matches
  s.ranked_wins + s.ranked_losses AS total_ranked_matches,
  -- Assign rank (1st, 2nd, 3rd, etc.)
  DENSE_RANK() OVER (
    PARTITION BY s.current_season
    ORDER BY s.ranked_elo DESC, s.ranked_wins DESC
  ) AS rank
FROM public.minesweeper_player_stats s
JOIN public.profiles p ON p.id = s.student_id
WHERE
  p.role = 'student'
  AND s.total_matches > 0 -- Only show players who have played at least one match
ORDER BY
  s.ranked_elo DESC,
  s.ranked_wins DESC;

-- Comments
COMMENT ON VIEW public.minesweeper_multiplayer_leaderboard IS 'Ranked leaderboard with player stats, profiles, and calculated metrics';


-- =====================================================================================
-- TRIGGERS: Auto-update timestamps
-- =====================================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for minesweeper_player_stats
DROP TRIGGER IF EXISTS update_player_stats_updated_at ON public.minesweeper_player_stats;
CREATE TRIGGER update_player_stats_updated_at
  BEFORE UPDATE ON public.minesweeper_player_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for minesweeper_multiplayer_game_state
DROP TRIGGER IF EXISTS update_game_state_updated_at ON public.minesweeper_multiplayer_game_state;
CREATE TRIGGER update_game_state_updated_at
  BEFORE UPDATE ON public.minesweeper_multiplayer_game_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Automatically updates updated_at timestamp on row modification';


-- =====================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================
-- Security model: Fail-closed by default, explicit grants only
-- All tables use RLS, direct modifications prevented (functions only)

-- Enable RLS on all tables
ALTER TABLE public.minesweeper_multiplayer_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minesweeper_multiplayer_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minesweeper_multiplayer_game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minesweeper_player_stats ENABLE ROW LEVEL SECURITY;


-- =====================================================================================
-- RLS POLICIES: minesweeper_multiplayer_matches
-- =====================================================================================

-- SELECT: Players can see their own matches OR any completed match (for leaderboards/history)
CREATE POLICY select_own_or_completed_matches
  ON public.minesweeper_multiplayer_matches
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = player1_id
    OR auth.uid() = player2_id
    OR status = 'completed'
  );

-- INSERT: Prevented - only via SECURITY DEFINER functions
-- (No INSERT policy = implicit DENY)

-- UPDATE: Prevented - only via SECURITY DEFINER functions
-- (No UPDATE policy = implicit DENY)

-- DELETE: Prevented - preserve match history for statistics
-- (No DELETE policy = implicit DENY)

COMMENT ON POLICY select_own_or_completed_matches ON public.minesweeper_multiplayer_matches IS
  'Players can view their active matches and any completed match for leaderboards';


-- =====================================================================================
-- RLS POLICIES: minesweeper_multiplayer_queue
-- =====================================================================================

-- SELECT: Students can see their own queue entries only
CREATE POLICY select_own_queue_entry
  ON public.minesweeper_multiplayer_queue
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

-- INSERT: Students can insert their own queue entries (via function validation)
CREATE POLICY insert_own_queue_entry
  ON public.minesweeper_multiplayer_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

-- UPDATE: Only via SECURITY DEFINER functions (for matchmaking logic)
-- (No UPDATE policy = implicit DENY)

-- DELETE: Only via SECURITY DEFINER functions (cleanup/cancellation)
-- (No DELETE policy = implicit DENY)

COMMENT ON POLICY select_own_queue_entry ON public.minesweeper_multiplayer_queue IS
  'Students can only see their own queue status';
COMMENT ON POLICY insert_own_queue_entry ON public.minesweeper_multiplayer_queue IS
  'Students can join the queue (with uniqueness constraint enforcement)';


-- =====================================================================================
-- RLS POLICIES: minesweeper_multiplayer_game_state
-- =====================================================================================

-- SELECT: Players can see game state for matches they're participating in
CREATE POLICY select_match_game_state
  ON public.minesweeper_multiplayer_game_state
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.minesweeper_multiplayer_matches m
      WHERE m.id = match_id
        AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
    )
  );

-- INSERT/UPDATE/DELETE: Only via SECURITY DEFINER functions
-- (No policies = implicit DENY)

COMMENT ON POLICY select_match_game_state ON public.minesweeper_multiplayer_game_state IS
  'Players can see real-time game state for their active matches';


-- =====================================================================================
-- RLS POLICIES: minesweeper_player_stats
-- =====================================================================================

-- SELECT: All authenticated users can see all stats (for leaderboards)
CREATE POLICY select_all_player_stats
  ON public.minesweeper_player_stats
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Auto-created via trigger when first match is played
-- Only via SECURITY DEFINER functions
-- (No INSERT policy = implicit DENY)

-- UPDATE: Only via SECURITY DEFINER functions (after match completion)
-- (No UPDATE policy = implicit DENY)

-- DELETE: Prevented - preserve historical stats
-- (No DELETE policy = implicit DENY)

COMMENT ON POLICY select_all_player_stats ON public.minesweeper_player_stats IS
  'All students can view stats for leaderboard and player comparisons';


-- =====================================================================================
-- GRANTS: Minimal permissions (functions will use SECURITY DEFINER)
-- =====================================================================================

-- Students can SELECT from all tables (enforced by RLS)
GRANT SELECT ON public.minesweeper_multiplayer_matches TO authenticated;
GRANT SELECT ON public.minesweeper_multiplayer_queue TO authenticated;
GRANT SELECT ON public.minesweeper_multiplayer_game_state TO authenticated;
GRANT SELECT ON public.minesweeper_player_stats TO authenticated;
GRANT SELECT ON public.minesweeper_multiplayer_leaderboard TO authenticated;

-- Queue table: Allow INSERT (RLS ensures own entries only)
GRANT INSERT ON public.minesweeper_multiplayer_queue TO authenticated;

-- All other operations (UPDATE, DELETE, INSERT on other tables) via SECURITY DEFINER functions
-- This ensures business logic validation and prevents direct data manipulation


-- =====================================================================================
-- HELPER FUNCTION: Initialize player stats on first match
-- =====================================================================================
-- Auto-creates stats entry when a player joins their first match

CREATE OR REPLACE FUNCTION public.ensure_player_stats_exist(p_student_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.minesweeper_player_stats (student_id)
  VALUES (p_student_id)
  ON CONFLICT (student_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.ensure_player_stats_exist IS
  'Creates player stats entry on first match participation (idempotent)';


-- =====================================================================================
-- CLEANUP FUNCTION: Remove stale queue entries
-- =====================================================================================
-- Automatically removes queue entries older than 1 hour or with matched/cancelled status

CREATE OR REPLACE FUNCTION public.cleanup_stale_queue_entries()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.minesweeper_multiplayer_queue
  WHERE
    -- Remove entries older than 1 hour
    joined_at < NOW() - INTERVAL '1 hour'
    -- OR remove matched/cancelled entries older than 5 minutes
    OR (status IN ('matched', 'cancelled') AND joined_at < NOW() - INTERVAL '5 minutes');
END;
$$;

COMMENT ON FUNCTION public.cleanup_stale_queue_entries IS
  'Removes old queue entries (>1 hour) and matched/cancelled entries (>5 minutes)';


-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
-- Next steps:
-- 1. Run: pnpm db:migrate
-- 2. Update: src/lib/types/database.ts (run Supabase type generation)
-- 3. Update: docs/architecture/database-schema.md (document new tables)
-- 4. Create SECURITY DEFINER functions for:
--    - join_multiplayer_queue()
--    - leave_multiplayer_queue()
--    - find_match() (matchmaking logic)
--    - start_match()
--    - update_game_state()
--    - complete_match()
--    - calculate_elo_change()
-- 5. Add Realtime subscriptions in frontend for:
--    - minesweeper_multiplayer_game_state (live opponent progress)
--    - minesweeper_multiplayer_matches (match status changes)
-- =====================================================================================
