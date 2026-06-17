-- Minesweeper Tournament System Migration
-- Purpose: Add tournament feature where teachers/admins create competitions for students
-- Author: Claude (Supabase Expert)
-- Date: 2026-01-02
--
-- Features:
-- - Teacher-created tournaments scoped to their classes
-- - Admin-created global tournaments for all students
-- - Multi-class association for tournament participation
-- - Top X games averaging for fair ranking
-- - Configurable podium rewards (gidouilles)
-- - Real-time leaderboard via materialized view
-- - Full audit trail via gidouilles_history
--
-- Security:
-- - SECURITY DEFINER functions prevent manipulation
-- - RLS policies restrict access appropriately
-- - Server-side win validation reuses existing validate_minesweeper_win()
-- - Tournament scope validation (teachers can only create for own classes)
-- - Admin-only global tournament creation

-- ============================================================================
-- Table: minesweeper_tournaments
-- ============================================================================
-- Stores tournament configurations. Teachers create for their classes,
-- admins can create global tournaments.

CREATE TABLE public.minesweeper_tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_role TEXT NOT NULL CHECK (creator_role IN ('teacher', 'admin')),
  scope TEXT NOT NULL CHECK (scope IN ('classes', 'global')),
  name TEXT NOT NULL CHECK (length(name) >= 3 AND length(name) <= 100),
  description TEXT CHECK (description IS NULL OR length(description) <= 1000),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'expert')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  top_x_games INTEGER NOT NULL DEFAULT 3 CHECK (top_x_games >= 1 AND top_x_games <= 20),
  podium_rewards JSONB NOT NULL DEFAULT '{"1": 10, "2": 5, "3": 3}'::JSONB,
  podium_places INTEGER NOT NULL DEFAULT 3 CHECK (podium_places >= 1 AND podium_places <= 10),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- End date must be after start date
  CONSTRAINT valid_date_range CHECK (end_date > start_date),

  -- Global tournaments require admin role
  CONSTRAINT global_requires_admin CHECK (
    scope = 'classes' OR (scope = 'global' AND creator_role = 'admin')
  )
);

-- Indexes for tournament queries
CREATE INDEX idx_minesweeper_tournaments_status
  ON public.minesweeper_tournaments(status);

CREATE INDEX idx_minesweeper_tournaments_dates
  ON public.minesweeper_tournaments(start_date, end_date)
  WHERE status IN ('scheduled', 'active');

CREATE INDEX idx_minesweeper_tournaments_creator
  ON public.minesweeper_tournaments(creator_id);

COMMENT ON TABLE public.minesweeper_tournaments IS
  'Minesweeper tournaments. Teachers create class-scoped, admins can create global. Top X games averaged for ranking.';

COMMENT ON COLUMN public.minesweeper_tournaments.top_x_games IS
  'Number of best games to average for ranking (1-20). Higher values reward consistency.';

COMMENT ON COLUMN public.minesweeper_tournaments.podium_rewards IS
  'JSON object mapping place (1,2,3...) to gidouilles reward. Default: {"1": 10, "2": 5, "3": 3}';

COMMENT ON COLUMN public.minesweeper_tournaments.podium_places IS
  'Number of podium places that receive rewards (1-10). Must have matching entries in podium_rewards.';

-- ============================================================================
-- Table: minesweeper_tournament_classes
-- ============================================================================
-- Multi-class association for class-scoped tournaments.
-- Empty for global tournaments.

CREATE TABLE public.minesweeper_tournament_classes (
  tournament_id UUID NOT NULL REFERENCES public.minesweeper_tournaments(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,

  PRIMARY KEY (tournament_id, class_id)
);

-- Index for finding tournaments by class
CREATE INDEX idx_minesweeper_tournament_classes_class
  ON public.minesweeper_tournament_classes(class_id);

COMMENT ON TABLE public.minesweeper_tournament_classes IS
  'Associates tournaments with participating classes. Empty for global tournaments (all classes participate).';

-- ============================================================================
-- Table: minesweeper_tournament_games
-- ============================================================================
-- Individual game records for tournament participation.
-- Each student can play multiple games, top X are averaged for ranking.

CREATE TABLE public.minesweeper_tournament_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.minesweeper_tournaments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL CHECK (game_number >= 1),
  seed TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'won', 'lost', 'abandoned')),
  time_seconds INTEGER CHECK (time_seconds IS NULL OR time_seconds > 0),
  grid_state JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Each student has unique game numbers per tournament
  CONSTRAINT unique_tournament_game UNIQUE (tournament_id, student_id, game_number),

  -- Seed format validation
  CONSTRAINT valid_seed_format CHECK (seed ~ '^tournament-[a-f0-9-]+-game-[0-9]+$'),

  -- Completed games must have time and completion timestamp
  CONSTRAINT completed_must_have_data CHECK (
    (status = 'in_progress' AND completed_at IS NULL) OR
    (status IN ('won', 'lost', 'abandoned') AND completed_at IS NOT NULL)
  ),

  -- Won games must have time_seconds
  CONSTRAINT won_must_have_time CHECK (
    status != 'won' OR time_seconds IS NOT NULL
  ),

  -- Grid state size limit (prevent DoS)
  CONSTRAINT grid_state_size_limit CHECK (
    grid_state IS NULL OR pg_column_size(grid_state) < 100000
  )
);

-- Indexes for tournament game queries
CREATE INDEX idx_minesweeper_tournament_games_tournament
  ON public.minesweeper_tournament_games(tournament_id);

CREATE INDEX idx_minesweeper_tournament_games_standings
  ON public.minesweeper_tournament_games(tournament_id, status, time_seconds)
  WHERE status = 'won';

CREATE INDEX idx_minesweeper_tournament_games_player
  ON public.minesweeper_tournament_games(student_id, tournament_id);

CREATE INDEX idx_minesweeper_tournament_games_in_progress
  ON public.minesweeper_tournament_games(student_id, tournament_id)
  WHERE status = 'in_progress';

COMMENT ON TABLE public.minesweeper_tournament_games IS
  'Individual game records for tournament participation. Top X games (by time) are averaged for ranking.';

COMMENT ON COLUMN public.minesweeper_tournament_games.seed IS
  'Deterministic seed for grid generation. Format: tournament-{tournament_id}-game-{game_number}. Same seed = same grid.';

COMMENT ON COLUMN public.minesweeper_tournament_games.game_number IS
  'Sequential game number for this student in this tournament. Starts at 1.';

-- ============================================================================
-- Trigger: Auto-update updated_at on minesweeper_tournaments
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_minesweeper_tournaments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_minesweeper_tournaments_updated
  BEFORE UPDATE ON public.minesweeper_tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_minesweeper_tournaments_updated_at();

-- ============================================================================
-- View: minesweeper_tournament_standings
-- ============================================================================
-- Real-time leaderboard calculating average of top X games per student.

CREATE VIEW public.minesweeper_tournament_standings AS
WITH tournament_config AS (
  -- Get top_x_games config for each tournament
  SELECT id as tournament_id, top_x_games
  FROM public.minesweeper_tournaments
),
ranked_games AS (
  -- Rank each student's won games by time (fastest first)
  SELECT
    g.tournament_id,
    g.student_id,
    g.time_seconds,
    ROW_NUMBER() OVER (
      PARTITION BY g.tournament_id, g.student_id
      ORDER BY g.time_seconds ASC
    ) as game_rank
  FROM public.minesweeper_tournament_games g
  WHERE g.status = 'won'
),
top_games AS (
  -- Select only top X games per student per tournament
  SELECT
    rg.tournament_id,
    rg.student_id,
    rg.time_seconds,
    rg.game_rank
  FROM ranked_games rg
  JOIN tournament_config tc ON tc.tournament_id = rg.tournament_id
  WHERE rg.game_rank <= tc.top_x_games
),
student_stats AS (
  -- Calculate average time and games won for each student
  SELECT
    tg.tournament_id,
    tg.student_id,
    COUNT(*) as games_won,
    AVG(tg.time_seconds) as average_time
  FROM top_games tg
  GROUP BY tg.tournament_id, tg.student_id
),
final_standings AS (
  -- Add position ranking
  SELECT
    ss.tournament_id,
    ss.student_id,
    ss.games_won,
    ss.average_time,
    ROW_NUMBER() OVER (
      PARTITION BY ss.tournament_id
      ORDER BY ss.average_time ASC
    ) as position
  FROM student_stats ss
)
SELECT
  fs.tournament_id,
  fs.student_id,
  p.firstname,
  p.lastname,
  fs.games_won::INTEGER,
  ROUND(fs.average_time::NUMERIC, 2) as average_time,
  fs.position::INTEGER
FROM final_standings fs
JOIN public.profiles p ON p.id = fs.student_id
ORDER BY fs.tournament_id, fs.position;

-- Use security_invoker for RLS inheritance
ALTER VIEW public.minesweeper_tournament_standings SET (security_invoker = on);

-- Grant access to authenticated users
GRANT SELECT ON public.minesweeper_tournament_standings TO authenticated;

COMMENT ON VIEW public.minesweeper_tournament_standings IS
  'Real-time tournament leaderboard. Average of top X games per student, ranked by time. Only students with at least 1 win shown.';

-- ============================================================================
-- RLS Policies: minesweeper_tournaments
-- ============================================================================

ALTER TABLE public.minesweeper_tournaments ENABLE ROW LEVEL SECURITY;

-- SELECT: Complex visibility rules
-- - Admins see all tournaments
-- - Teachers see their own tournaments + tournaments for their classes
-- - Students see tournaments for their classes + global tournaments
CREATE POLICY "Users can view relevant tournaments"
  ON public.minesweeper_tournaments
  FOR SELECT
  TO authenticated
  USING (
    -- Admins see all
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Creator sees their own
    creator_id = auth.uid()
    OR
    -- Global tournaments visible to all authenticated users
    scope = 'global'
    OR
    -- Class-scoped tournaments visible to members of those classes
    (
      scope = 'classes' AND EXISTS (
        SELECT 1 FROM public.minesweeper_tournament_classes tc
        JOIN public.class_members cm ON cm.class_id = tc.class_id
        WHERE tc.tournament_id = minesweeper_tournaments.id
        AND cm.student_id = auth.uid()
      )
    )
    OR
    -- Teachers can see tournaments for classes they teach
    (
      scope = 'classes' AND EXISTS (
        SELECT 1 FROM public.minesweeper_tournament_classes tc
        JOIN public.classes c ON c.id = tc.class_id
        WHERE tc.tournament_id = minesweeper_tournaments.id
        AND c.teacher_id = auth.uid()
      )
    )
  );

-- INSERT: Only via RPC (create_tournament function)
-- No direct INSERT policy - must use SECURITY DEFINER function

-- UPDATE: Only creator or admin
CREATE POLICY "Creator or admin can update tournament"
  ON public.minesweeper_tournaments
  FOR UPDATE
  TO authenticated
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- DELETE: Only creator or admin (for cancelled tournaments)
CREATE POLICY "Creator or admin can delete tournament"
  ON public.minesweeper_tournaments
  FOR DELETE
  TO authenticated
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- RLS Policies: minesweeper_tournament_classes
-- ============================================================================

ALTER TABLE public.minesweeper_tournament_classes ENABLE ROW LEVEL SECURITY;

-- SELECT: If can see parent tournament
CREATE POLICY "Users can view tournament classes if can see tournament"
  ON public.minesweeper_tournament_classes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.minesweeper_tournaments t
      WHERE t.id = minesweeper_tournament_classes.tournament_id
      -- This will use the tournament's RLS policy
    )
  );

-- INSERT/DELETE: Only via RPC (managed by create_tournament function)
-- No direct INSERT/DELETE policies

-- ============================================================================
-- RLS Policies: minesweeper_tournament_games
-- ============================================================================

ALTER TABLE public.minesweeper_tournament_games ENABLE ROW LEVEL SECURITY;

-- SELECT: If can see parent tournament
CREATE POLICY "Users can view tournament games if can see tournament"
  ON public.minesweeper_tournament_games
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.minesweeper_tournaments t
      WHERE t.id = minesweeper_tournament_games.tournament_id
      -- This will use the tournament's RLS policy
    )
  );

-- INSERT/UPDATE: Only via RPC
-- No direct INSERT/UPDATE policies - must use SECURITY DEFINER functions

-- ============================================================================
-- Helper Function: Check if user can participate in tournament
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_participate_in_tournament(
  p_tournament_id UUID,
  p_student_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
BEGIN
  -- Get tournament
  SELECT * INTO v_tournament
  FROM public.minesweeper_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if tournament is active
  IF v_tournament.status != 'active' THEN
    RETURN FALSE;
  END IF;

  -- Check date range
  IF NOW() < v_tournament.start_date OR NOW() > v_tournament.end_date THEN
    RETURN FALSE;
  END IF;

  -- Verify student is actually a student
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_student_id AND role = 'student'
  ) THEN
    RETURN FALSE;
  END IF;

  -- Global tournaments: all students can participate
  IF v_tournament.scope = 'global' THEN
    RETURN TRUE;
  END IF;

  -- Class-scoped tournaments: check membership
  RETURN EXISTS (
    SELECT 1 FROM public.minesweeper_tournament_classes tc
    JOIN public.class_members cm ON cm.class_id = tc.class_id
    WHERE tc.tournament_id = p_tournament_id
    AND cm.student_id = p_student_id
  );
END;
$$;

COMMENT ON FUNCTION public.can_participate_in_tournament IS
  'Checks if a student can participate in a tournament (active, in date range, member of participating class or global).';

-- ============================================================================
-- Function: create_tournament()
-- ============================================================================
-- Creates a tournament with validation.
-- Teachers can only create for their own classes.
-- Admins can create global or class-scoped tournaments.

CREATE OR REPLACE FUNCTION public.create_tournament(
  p_name TEXT,
  p_difficulty TEXT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_class_ids UUID[] DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_top_x_games INTEGER DEFAULT 3,
  p_podium_rewards JSONB DEFAULT '{"1": 10, "2": 5, "3": 3}'::JSONB,
  p_podium_places INTEGER DEFAULT 3
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_scope TEXT;
  v_class_id UUID;
  v_tournament_id UUID;
BEGIN
  -- Step 1: Get authenticated user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to create a tournament';
  END IF;

  -- Step 2: Get user role
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_user_role NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'Only teachers and admins can create tournaments';
  END IF;

  -- Step 3: Validate inputs
  IF p_name IS NULL OR length(trim(p_name)) < 3 THEN
    RAISE EXCEPTION 'Tournament name must be at least 3 characters';
  END IF;

  IF p_difficulty NOT IN ('beginner', 'intermediate', 'expert') THEN
    RAISE EXCEPTION 'Invalid difficulty: must be beginner, intermediate, or expert';
  END IF;

  IF p_end_date <= p_start_date THEN
    RAISE EXCEPTION 'End date must be after start date';
  END IF;

  IF p_top_x_games < 1 OR p_top_x_games > 20 THEN
    RAISE EXCEPTION 'top_x_games must be between 1 and 20';
  END IF;

  IF p_podium_places < 1 OR p_podium_places > 10 THEN
    RAISE EXCEPTION 'podium_places must be between 1 and 10';
  END IF;

  -- Step 4: Determine scope and validate class ownership
  IF p_class_ids IS NULL OR array_length(p_class_ids, 1) IS NULL THEN
    -- Global tournament (admin only)
    IF v_user_role != 'admin' THEN
      RAISE EXCEPTION 'Only admins can create global tournaments (no classes specified)';
    END IF;
    v_scope := 'global';
  ELSE
    -- Class-scoped tournament
    v_scope := 'classes';

    -- Verify teacher owns all classes OR user is admin
    IF v_user_role = 'teacher' THEN
      FOREACH v_class_id IN ARRAY p_class_ids
      LOOP
        IF NOT EXISTS (
          SELECT 1 FROM public.classes
          WHERE id = v_class_id AND teacher_id = v_user_id
        ) THEN
          RAISE EXCEPTION 'Teacher does not own class: %', v_class_id;
        END IF;
      END LOOP;
    ELSIF v_user_role = 'admin' THEN
      -- Admins can use any class, but verify classes exist
      FOREACH v_class_id IN ARRAY p_class_ids
      LOOP
        IF NOT EXISTS (
          SELECT 1 FROM public.classes WHERE id = v_class_id
        ) THEN
          RAISE EXCEPTION 'Class not found: %', v_class_id;
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- Step 5: Validate podium_rewards has entries for all places
  FOR i IN 1..p_podium_places
  LOOP
    IF NOT (p_podium_rewards ? i::TEXT) THEN
      RAISE EXCEPTION 'podium_rewards must have entry for place %', i;
    END IF;
    IF NOT ((p_podium_rewards->>i::TEXT)::INTEGER >= 0) THEN
      RAISE EXCEPTION 'podium_rewards for place % must be non-negative integer', i;
    END IF;
  END LOOP;

  -- Step 6: Create tournament
  INSERT INTO public.minesweeper_tournaments (
    creator_id,
    creator_role,
    scope,
    name,
    description,
    difficulty,
    start_date,
    end_date,
    top_x_games,
    podium_rewards,
    podium_places
  ) VALUES (
    v_user_id,
    v_user_role,
    v_scope,
    trim(p_name),
    p_description,
    p_difficulty,
    p_start_date,
    p_end_date,
    p_top_x_games,
    p_podium_rewards,
    p_podium_places
  )
  RETURNING id INTO v_tournament_id;

  -- Step 7: Create class associations (if class-scoped)
  IF v_scope = 'classes' THEN
    INSERT INTO public.minesweeper_tournament_classes (tournament_id, class_id)
    SELECT v_tournament_id, unnest(p_class_ids);
  END IF;

  RETURN v_tournament_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_tournament TO authenticated;

COMMENT ON FUNCTION public.create_tournament IS
  'Creates a Minesweeper tournament. Teachers can only create for their own classes. Admins can create global or class-scoped tournaments.';

-- ============================================================================
-- Function: start_tournament_game()
-- ============================================================================
-- Starts a new game for a student in a tournament.
-- Validates tournament is active and student can participate.

CREATE OR REPLACE FUNCTION public.start_tournament_game(
  p_tournament_id UUID
)
RETURNS TABLE(game_id UUID, seed TEXT, game_number INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_tournament RECORD;
  v_game_number INTEGER;
  v_seed TEXT;
  v_game_id UUID;
  v_in_progress_count INTEGER;
BEGIN
  -- Step 1: Get authenticated user
  v_student_id := auth.uid();

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to start a tournament game';
  END IF;

  -- Step 2: Get tournament
  SELECT * INTO v_tournament
  FROM public.minesweeper_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Step 3: Validate tournament is active
  IF v_tournament.status != 'active' THEN
    RAISE EXCEPTION 'Tournament is not active (status: %)', v_tournament.status;
  END IF;

  -- Step 4: Validate tournament is in date range
  IF NOW() < v_tournament.start_date THEN
    RAISE EXCEPTION 'Tournament has not started yet';
  END IF;

  IF NOW() > v_tournament.end_date THEN
    RAISE EXCEPTION 'Tournament has ended';
  END IF;

  -- Step 5: Verify student can participate
  IF NOT public.can_participate_in_tournament(p_tournament_id, v_student_id) THEN
    RAISE EXCEPTION 'You are not eligible to participate in this tournament';
  END IF;

  -- Step 6: Check for existing in-progress game
  SELECT COUNT(*) INTO v_in_progress_count
  FROM public.minesweeper_tournament_games
  WHERE tournament_id = p_tournament_id
    AND student_id = v_student_id
    AND status = 'in_progress';

  IF v_in_progress_count > 0 THEN
    RAISE EXCEPTION 'You already have a game in progress for this tournament';
  END IF;

  -- Step 7: Calculate next game number
  SELECT COALESCE(MAX(game_number), 0) + 1 INTO v_game_number
  FROM public.minesweeper_tournament_games
  WHERE tournament_id = p_tournament_id
    AND student_id = v_student_id;

  -- Step 8: Generate seed
  v_seed := 'tournament-' || p_tournament_id::TEXT || '-game-' || v_game_number::TEXT;

  -- Step 9: Create game record
  INSERT INTO public.minesweeper_tournament_games (
    tournament_id,
    student_id,
    game_number,
    seed,
    status
  ) VALUES (
    p_tournament_id,
    v_student_id,
    v_game_number,
    v_seed,
    'in_progress'
  )
  RETURNING id INTO v_game_id;

  -- Step 10: Return game info
  RETURN QUERY SELECT v_game_id, v_seed, v_game_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_tournament_game TO authenticated;

COMMENT ON FUNCTION public.start_tournament_game IS
  'Starts a new game in a tournament. Validates tournament is active and student can participate. Returns game_id, seed, and game_number.';

-- ============================================================================
-- Function: complete_tournament_game()
-- ============================================================================
-- Completes a tournament game with server-side validation.
-- For wins, validates grid state with existing validate_minesweeper_win().

CREATE OR REPLACE FUNCTION public.complete_tournament_game(
  p_game_id UUID,
  p_status TEXT,
  p_time_seconds INTEGER,
  p_grid_state JSONB
)
RETURNS TABLE(success BOOLEAN, final_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_game RECORD;
  v_tournament RECORD;
  v_is_valid BOOLEAN;
  v_grid_size INTEGER;
BEGIN
  -- Step 1: Get authenticated user
  v_student_id := auth.uid();

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to complete a game';
  END IF;

  -- Step 2: Get game and verify ownership
  SELECT * INTO v_game
  FROM public.minesweeper_tournament_games
  WHERE id = p_game_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  IF v_game.student_id != v_student_id THEN
    RAISE EXCEPTION 'This game does not belong to you';
  END IF;

  IF v_game.status != 'in_progress' THEN
    RAISE EXCEPTION 'Game is not in progress (status: %)', v_game.status;
  END IF;

  -- Step 3: Get tournament for difficulty
  SELECT * INTO v_tournament
  FROM public.minesweeper_tournaments
  WHERE id = v_game.tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Step 4: Validate status
  IF p_status NOT IN ('won', 'lost', 'abandoned') THEN
    RAISE EXCEPTION 'Invalid status: must be won, lost, or abandoned';
  END IF;

  -- Step 5: Validate time_seconds for wins
  IF p_status = 'won' THEN
    IF p_time_seconds IS NULL OR p_time_seconds < 1 THEN
      RAISE EXCEPTION 'Invalid time: must be at least 1 second for wins';
    END IF;

    -- Difficulty-specific time limits
    CASE v_tournament.difficulty
      WHEN 'beginner' THEN
        IF p_time_seconds > 3600 THEN
          RAISE EXCEPTION 'Invalid time for beginner: exceeds 1 hour';
        END IF;
      WHEN 'intermediate' THEN
        IF p_time_seconds > 7200 THEN
          RAISE EXCEPTION 'Invalid time for intermediate: exceeds 2 hours';
        END IF;
      WHEN 'expert' THEN
        IF p_time_seconds > 14400 THEN
          RAISE EXCEPTION 'Invalid time for expert: exceeds 4 hours';
        END IF;
    END CASE;
  END IF;

  -- Step 6: Validate grid_state size
  v_grid_size := pg_column_size(p_grid_state);
  IF v_grid_size > 100000 THEN
    RAISE EXCEPTION 'Grid state too large: exceeds 100KB';
  END IF;

  -- Step 7: For wins, validate grid_state represents legitimate win
  IF p_status = 'won' THEN
    v_is_valid := public.validate_minesweeper_win(p_grid_state, v_tournament.difficulty);

    IF NOT v_is_valid THEN
      RAISE EXCEPTION 'Invalid grid state: does not represent a valid win condition';
    END IF;
  END IF;

  -- Step 8: Update game record
  UPDATE public.minesweeper_tournament_games
  SET
    status = p_status,
    time_seconds = CASE WHEN p_status = 'won' THEN p_time_seconds ELSE NULL END,
    grid_state = p_grid_state,
    completed_at = NOW()
  WHERE id = p_game_id;

  -- Step 9: Return result
  RETURN QUERY SELECT TRUE, p_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_tournament_game TO authenticated;

COMMENT ON FUNCTION public.complete_tournament_game IS
  'Completes a tournament game with server-side validation. For wins, validates grid state. No gidouilles awarded until tournament finalization.';

-- ============================================================================
-- Function: finalize_tournament()
-- ============================================================================
-- Ends tournament and distributes rewards to podium finishers.
-- Can only be called by creator or admin after end_date.

CREATE OR REPLACE FUNCTION public.finalize_tournament(
  p_tournament_id UUID
)
RETURNS TABLE(
  place INTEGER,
  student_id UUID,
  firstname TEXT,
  lastname TEXT,
  average_time NUMERIC,
  gidouilles_awarded INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_tournament RECORD;
  v_winner RECORD;
  v_reward INTEGER;
BEGIN
  -- Step 1: Get authenticated user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to finalize a tournament';
  END IF;

  -- Step 2: Get tournament
  SELECT * INTO v_tournament
  FROM public.minesweeper_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Step 3: Verify caller is creator or admin
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_tournament.creator_id != v_user_id AND v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only the tournament creator or an admin can finalize';
  END IF;

  -- Step 4: Check tournament status
  IF v_tournament.status = 'completed' THEN
    RAISE EXCEPTION 'Tournament has already been finalized';
  END IF;

  IF v_tournament.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot finalize a cancelled tournament';
  END IF;

  -- Step 5: Check if tournament has ended (optional: allow early finalization by creator/admin)
  -- For now, we allow finalization even before end_date if creator/admin wants to

  -- Step 6: Get podium winners and distribute rewards
  FOR v_winner IN (
    SELECT
      s.position as place,
      s.student_id,
      s.firstname,
      s.lastname,
      s.average_time
    FROM public.minesweeper_tournament_standings s
    WHERE s.tournament_id = p_tournament_id
    AND s.position <= v_tournament.podium_places
    ORDER BY s.position
  )
  LOOP
    -- Get reward for this place
    v_reward := (v_tournament.podium_rewards->>v_winner.place::TEXT)::INTEGER;

    IF v_reward IS NULL OR v_reward < 0 THEN
      v_reward := 0;
    END IF;

    -- Award gidouilles to winner
    IF v_reward > 0 THEN
      UPDATE public.profiles
      SET gidouilles = COALESCE(gidouilles, 0) + v_reward
      WHERE id = v_winner.student_id;

      -- Log to gidouilles_history
      -- For class-scoped tournaments: use the tournament's class that student belongs to
      -- For global tournaments or if student has no class: use NULL
      INSERT INTO public.gidouilles_history (
        student_id,
        class_id,
        delta,
        reason,
        created_by
      )
      VALUES (
        v_winner.student_id,
        CASE
          WHEN v_tournament.scope = 'global' THEN NULL
          ELSE (
            -- Get the tournament class that the student belongs to
            SELECT tc.class_id
            FROM public.minesweeper_tournament_classes tc
            JOIN public.class_members cm ON cm.class_id = tc.class_id
            WHERE tc.tournament_id = v_tournament.id
              AND cm.student_id = v_winner.student_id
            ORDER BY cm.joined_at ASC
            LIMIT 1
          )
        END,
        v_reward,
        'Tournament: ' || v_tournament.name || ' - Place #' || v_winner.place,
        v_user_id
      );
    END IF;

    -- Return winner info
    RETURN QUERY SELECT
      v_winner.place,
      v_winner.student_id,
      v_winner.firstname,
      v_winner.lastname,
      v_winner.average_time,
      v_reward;
  END LOOP;

  -- Step 7: Update tournament status to completed
  UPDATE public.minesweeper_tournaments
  SET status = 'completed'
  WHERE id = p_tournament_id;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_tournament TO authenticated;

COMMENT ON FUNCTION public.finalize_tournament IS
  'Finalizes a tournament and distributes gidouilles rewards to podium winners. Only callable by creator or admin.';

-- ============================================================================
-- Function: auto_activate_scheduled_tournaments()
-- ============================================================================
-- Activates tournaments that have reached their start_date.
-- Should be called periodically (e.g., via cron or on-demand).

CREATE OR REPLACE FUNCTION public.auto_activate_scheduled_tournaments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activated_count INTEGER;
BEGIN
  UPDATE public.minesweeper_tournaments
  SET status = 'active'
  WHERE status = 'scheduled'
    AND start_date <= NOW()
    AND end_date > NOW();

  GET DIAGNOSTICS v_activated_count = ROW_COUNT;

  RETURN v_activated_count;
END;
$$;

COMMENT ON FUNCTION public.auto_activate_scheduled_tournaments IS
  'Activates scheduled tournaments that have reached their start_date. Call via cron or trigger. Returns count of activated tournaments.';

-- ============================================================================
-- Function: get_tournament_details()
-- ============================================================================
-- Gets full tournament details including classes and player stats.

CREATE OR REPLACE FUNCTION public.get_tournament_details(
  p_tournament_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tournament RECORD;
  v_classes JSONB;
  v_my_stats JSONB;
  v_top_players JSONB;
BEGIN
  v_user_id := auth.uid();

  -- Get tournament
  SELECT * INTO v_tournament
  FROM public.minesweeper_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Get participating classes
  SELECT jsonb_agg(jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'teacher_name', p.firstname || ' ' || p.lastname
  ))
  INTO v_classes
  FROM public.minesweeper_tournament_classes tc
  JOIN public.classes c ON c.id = tc.class_id
  JOIN public.profiles p ON p.id = c.teacher_id
  WHERE tc.tournament_id = p_tournament_id;

  -- Get current user's stats (if student)
  SELECT jsonb_build_object(
    'position', s.position,
    'games_won', s.games_won,
    'average_time', s.average_time,
    'total_games', (
      SELECT COUNT(*) FROM public.minesweeper_tournament_games
      WHERE tournament_id = p_tournament_id AND student_id = v_user_id
    )
  )
  INTO v_my_stats
  FROM public.minesweeper_tournament_standings s
  WHERE s.tournament_id = p_tournament_id
    AND s.student_id = v_user_id;

  -- Get top 10 players
  SELECT jsonb_agg(jsonb_build_object(
    'position', s.position,
    'firstname', s.firstname,
    'lastname', s.lastname,
    'games_won', s.games_won,
    'average_time', s.average_time
  ))
  INTO v_top_players
  FROM (
    SELECT * FROM public.minesweeper_tournament_standings
    WHERE tournament_id = p_tournament_id
    ORDER BY position
    LIMIT 10
  ) s;

  RETURN jsonb_build_object(
    'id', v_tournament.id,
    'name', v_tournament.name,
    'description', v_tournament.description,
    'difficulty', v_tournament.difficulty,
    'scope', v_tournament.scope,
    'status', v_tournament.status,
    'start_date', v_tournament.start_date,
    'end_date', v_tournament.end_date,
    'top_x_games', v_tournament.top_x_games,
    'podium_rewards', v_tournament.podium_rewards,
    'podium_places', v_tournament.podium_places,
    'classes', COALESCE(v_classes, '[]'::JSONB),
    'my_stats', v_my_stats,
    'top_players', COALESCE(v_top_players, '[]'::JSONB)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tournament_details TO authenticated;

COMMENT ON FUNCTION public.get_tournament_details IS
  'Gets full tournament details including participating classes, current user stats, and top 10 leaderboard.';

-- ============================================================================
-- Function: abandon_tournament_game()
-- ============================================================================
-- Allows a student to abandon an in-progress tournament game.

CREATE OR REPLACE FUNCTION public.abandon_tournament_game(
  p_game_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_game RECORD;
BEGIN
  v_student_id := auth.uid();

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  SELECT * INTO v_game
  FROM public.minesweeper_tournament_games
  WHERE id = p_game_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  IF v_game.student_id != v_student_id THEN
    RAISE EXCEPTION 'This game does not belong to you';
  END IF;

  IF v_game.status != 'in_progress' THEN
    RAISE EXCEPTION 'Game is not in progress';
  END IF;

  UPDATE public.minesweeper_tournament_games
  SET
    status = 'abandoned',
    completed_at = NOW()
  WHERE id = p_game_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.abandon_tournament_game TO authenticated;

COMMENT ON FUNCTION public.abandon_tournament_game IS
  'Allows a student to abandon an in-progress tournament game.';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.can_participate_in_tournament TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_activate_scheduled_tournaments TO authenticated;

-- ============================================================================
-- Validation Queries (for testing)
-- ============================================================================

-- Uncomment to test after migration:
-- SELECT public.create_tournament('Test Tournament', 'beginner', NOW(), NOW() + INTERVAL '1 week', ARRAY['class-uuid-here']::UUID[]);
-- SELECT * FROM public.minesweeper_tournaments ORDER BY created_at DESC LIMIT 5;
-- SELECT * FROM public.minesweeper_tournament_standings LIMIT 10;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================

-- This migration adds complete Minesweeper tournament functionality:
--
-- TABLES:
--    - minesweeper_tournaments: Tournament configurations
--    - minesweeper_tournament_classes: Multi-class associations
--    - minesweeper_tournament_games: Individual game records
--
-- VIEW:
--    - minesweeper_tournament_standings: Real-time leaderboard (top X games averaged)
--
-- FUNCTIONS:
--    - create_tournament(): Create with validation (teacher owns classes or admin)
--    - start_tournament_game(): Start game with participation check
--    - complete_tournament_game(): Complete with win validation
--    - finalize_tournament(): Distribute podium rewards
--    - abandon_tournament_game(): Abandon in-progress game
--    - get_tournament_details(): Get full tournament info
--    - can_participate_in_tournament(): Check participation eligibility
--    - auto_activate_scheduled_tournaments(): Activate on start_date
--
-- TRIGGER:
--    - trg_minesweeper_tournaments_updated: Auto-update updated_at
--
-- SECURITY:
--    - SECURITY DEFINER functions prevent manipulation
--    - RLS policies: visibility based on scope/membership
--    - Teachers can only create for their own classes
--    - Only admins can create global tournaments
--    - Win validation reuses existing validate_minesweeper_win()
--
-- REWARDS:
--    - Configurable podium_rewards JSON
--    - Configurable podium_places count
--    - Full audit trail via gidouilles_history
--    - Rewards distributed on finalization only
--
-- RANKING:
--    - Top X games averaged (configurable top_x_games)
--    - Rewards consistency over single lucky games
--    - Real-time standings via view
--
-- NEXT STEPS FOR DEVELOPER:
-- 1. Run: pnpm db:migrate
-- 2. Update src/lib/types/database.ts (regenerate from Supabase)
-- 3. Update DATABASE_SCHEMA.md with new tables/functions
-- 4. Create API endpoint: GET /api/minesweeper/tournaments
-- 5. Create API endpoint: POST /api/minesweeper/tournaments (create)
-- 6. Create API endpoint: GET /api/minesweeper/tournaments/[id] (details)
-- 7. Create API endpoint: POST /api/minesweeper/tournaments/[id]/start-game
-- 8. Create API endpoint: POST /api/minesweeper/tournaments/[id]/games/[gameId]/complete
-- 9. Create API endpoint: POST /api/minesweeper/tournaments/[id]/finalize
-- 10. Update frontend to show:
--     - Tournament list (active, upcoming, completed)
--     - Tournament creation form (teachers/admins)
--     - Tournament detail page with leaderboard
--     - Play tournament game interface
--     - Finalization controls for creator/admin
-- 11. Consider setting up cron job to call auto_activate_scheduled_tournaments() periodically
