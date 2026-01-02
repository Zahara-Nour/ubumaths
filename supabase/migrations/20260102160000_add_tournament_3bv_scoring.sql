-- ============================================================================
-- Migration: Add 3BV-based scoring system for Minesweeper tournaments
-- ============================================================================
-- Replaces time-based ranking with 3BV/s (efficiency) scoring
-- Formula: score = clamp(floor(100 × actual_3bvs / reference_3bvs), 10, 300)
--
-- 3BV (Bechtel's Board Benchmark Value) = minimum clicks to solve a grid
-- 3BV/s = 3BV / time_seconds = efficiency metric
-- ============================================================================

-- ============================================================================
-- PART 1: Reference 3BV/s Table
-- ============================================================================

CREATE TABLE public.minesweeper_tournament_3bv_reference (
  cycle TEXT NOT NULL CHECK (cycle IN ('cycle_2', 'cycle_3', 'cycle_4', 'seconde', 'cycle_terminal')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'expert')),
  reference_3bvs NUMERIC(5,3) NOT NULL CHECK (reference_3bvs > 0),
  sample_count INTEGER NOT NULL DEFAULT 0 CHECK (sample_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cycle, difficulty)
);

COMMENT ON TABLE public.minesweeper_tournament_3bv_reference IS
  'Reference 3BV/s values for tournament scoring, by cycle and difficulty. Updated after each tournament.';

-- RLS
ALTER TABLE public.minesweeper_tournament_3bv_reference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read 3BV reference"
  ON public.minesweeper_tournament_3bv_reference
  FOR SELECT
  TO authenticated, anon
  USING (true);

GRANT SELECT ON public.minesweeper_tournament_3bv_reference TO authenticated, anon;

-- Seed initial values (estimates, will be refined with real data)
INSERT INTO public.minesweeper_tournament_3bv_reference (cycle, difficulty, reference_3bvs)
VALUES
  -- Cycle 2 (CP, CE1, CE2) - younger students, slower
  ('cycle_2', 'beginner', 0.150),
  ('cycle_2', 'intermediate', 0.100),
  ('cycle_2', 'expert', 0.080),
  -- Cycle 3 (CM1, CM2, 6ème)
  ('cycle_3', 'beginner', 0.250),
  ('cycle_3', 'intermediate', 0.150),
  ('cycle_3', 'expert', 0.120),
  -- Cycle 4 (5ème, 4ème, 3ème)
  ('cycle_4', 'beginner', 0.350),
  ('cycle_4', 'intermediate', 0.220),
  ('cycle_4', 'expert', 0.180),
  -- Seconde (2nde)
  ('seconde', 'beginner', 0.450),
  ('seconde', 'intermediate', 0.300),
  ('seconde', 'expert', 0.250),
  -- Cycle terminal (1ère, Terminale)
  ('cycle_terminal', 'beginner', 0.550),
  ('cycle_terminal', 'intermediate', 0.400),
  ('cycle_terminal', 'expert', 0.350);

-- ============================================================================
-- PART 2: Add columns to tournament_games
-- ============================================================================

ALTER TABLE public.minesweeper_tournament_games
ADD COLUMN IF NOT EXISTS grid_3bv INTEGER CHECK (grid_3bv IS NULL OR grid_3bv > 0),
ADD COLUMN IF NOT EXISTS score INTEGER CHECK (score IS NULL OR score >= 0);

COMMENT ON COLUMN public.minesweeper_tournament_games.grid_3bv IS
  '3BV (Bechtel Board Benchmark Value) of the grid - minimum clicks needed to solve';

COMMENT ON COLUMN public.minesweeper_tournament_games.score IS
  'Calculated score based on 3BV/s efficiency relative to cycle reference';

-- Index for standings queries
CREATE INDEX IF NOT EXISTS idx_tournament_games_score
  ON public.minesweeper_tournament_games(tournament_id, score DESC)
  WHERE status = 'won' AND score IS NOT NULL;

-- ============================================================================
-- PART 3: Function calculate_3bv() - Flood-fill algorithm
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_3bv(p_grid_state JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  v_rows INTEGER;
  v_cols INTEGER;
  v_mines JSONB;
  v_adjacent_counts JSONB;
  v_total_cells INTEGER;
  v_mine_count INTEGER;
  v_safe_cells INTEGER;

  -- Arrays for grid processing (1-indexed for PostgreSQL)
  v_is_mine BOOLEAN[];
  v_adj_count INTEGER[];
  v_visited BOOLEAN[];

  v_openings INTEGER := 0;
  v_isolated INTEGER := 0;

  v_idx INTEGER;
  v_row INTEGER;
  v_col INTEGER;
  v_mine JSONB;
  v_key TEXT;
  v_count INTEGER;

  -- BFS queue for flood-fill
  v_queue INTEGER[];
  v_queue_start INTEGER;
  v_queue_end INTEGER;
  v_current INTEGER;
  v_curr_row INTEGER;
  v_curr_col INTEGER;
  v_neighbor_row INTEGER;
  v_neighbor_col INTEGER;
  v_neighbor_idx INTEGER;
  v_dr INTEGER;
  v_dc INTEGER;
BEGIN
  -- 1. Parse grid dimensions
  v_rows := (p_grid_state->>'rows')::INTEGER;
  v_cols := (p_grid_state->>'cols')::INTEGER;
  v_mines := p_grid_state->'mines';
  v_adjacent_counts := p_grid_state->'adjacentCounts';

  v_total_cells := v_rows * v_cols;
  v_mine_count := jsonb_array_length(v_mines);
  v_safe_cells := v_total_cells - v_mine_count;

  -- 2. Initialize arrays (1-indexed, size = total_cells)
  v_is_mine := ARRAY_FILL(FALSE, ARRAY[v_total_cells]);
  v_adj_count := ARRAY_FILL(0, ARRAY[v_total_cells]);
  v_visited := ARRAY_FILL(FALSE, ARRAY[v_total_cells]);

  -- 3. Mark mine positions
  FOR v_idx IN 0..jsonb_array_length(v_mines) - 1 LOOP
    v_mine := v_mines->v_idx;
    v_row := (v_mine->>0)::INTEGER;
    v_col := (v_mine->>1)::INTEGER;
    v_is_mine[v_row * v_cols + v_col + 1] := TRUE;
  END LOOP;

  -- 4. Build adjacent counts grid
  FOR v_row IN 0..v_rows - 1 LOOP
    FOR v_col IN 0..v_cols - 1 LOOP
      v_idx := v_row * v_cols + v_col + 1;
      IF NOT v_is_mine[v_idx] THEN
        v_key := v_row || ',' || v_col;
        v_count := COALESCE((v_adjacent_counts->>v_key)::INTEGER, 0);
        v_adj_count[v_idx] := v_count;
      END IF;
    END LOOP;
  END LOOP;

  -- 5. Count openings using BFS flood-fill from zeros
  FOR v_row IN 0..v_rows - 1 LOOP
    FOR v_col IN 0..v_cols - 1 LOOP
      v_idx := v_row * v_cols + v_col + 1;

      -- Skip if mine, already visited, or not a zero cell
      IF v_is_mine[v_idx] OR v_visited[v_idx] OR v_adj_count[v_idx] != 0 THEN
        CONTINUE;
      END IF;

      -- Found a new opening - count it
      v_openings := v_openings + 1;

      -- BFS flood-fill from this zero
      v_queue := ARRAY[v_idx];
      v_queue_start := 1;
      v_queue_end := 1;
      v_visited[v_idx] := TRUE;

      WHILE v_queue_start <= v_queue_end LOOP
        v_current := v_queue[v_queue_start];
        v_queue_start := v_queue_start + 1;

        v_curr_row := (v_current - 1) / v_cols;
        v_curr_col := (v_current - 1) % v_cols;

        -- Check all 8 neighbors
        FOR v_dr IN -1..1 LOOP
          FOR v_dc IN -1..1 LOOP
            IF v_dr = 0 AND v_dc = 0 THEN
              CONTINUE;
            END IF;

            v_neighbor_row := v_curr_row + v_dr;
            v_neighbor_col := v_curr_col + v_dc;

            -- Bounds check
            IF v_neighbor_row < 0 OR v_neighbor_row >= v_rows OR
               v_neighbor_col < 0 OR v_neighbor_col >= v_cols THEN
              CONTINUE;
            END IF;

            v_neighbor_idx := v_neighbor_row * v_cols + v_neighbor_col + 1;

            -- Skip if mine or already visited
            IF v_is_mine[v_neighbor_idx] OR v_visited[v_neighbor_idx] THEN
              CONTINUE;
            END IF;

            -- Mark as visited (revealed by this opening)
            v_visited[v_neighbor_idx] := TRUE;

            -- If this neighbor is also a zero, add to queue for further expansion
            IF v_adj_count[v_neighbor_idx] = 0 THEN
              v_queue_end := v_queue_end + 1;
              v_queue := v_queue || v_neighbor_idx;
            END IF;
          END LOOP;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;

  -- 6. Count isolated numbers (safe cells not visited by any opening)
  FOR v_idx IN 1..v_total_cells LOOP
    IF NOT v_is_mine[v_idx] AND NOT v_visited[v_idx] THEN
      v_isolated := v_isolated + 1;
    END IF;
  END LOOP;

  RETURN v_openings + v_isolated;
END;
$$;

COMMENT ON FUNCTION public.calculate_3bv IS
  'Calculates the 3BV (Bechtel Board Benchmark Value) for a Minesweeper grid.
   3BV = number of openings (zero regions) + number of isolated numbers (not revealed by openings).
   This represents the minimum number of clicks needed to solve the board.';

-- ============================================================================
-- PART 4: Function calculate_tournament_score()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_tournament_score(
  p_grid_3bv INTEGER,
  p_time_seconds INTEGER,
  p_cycle TEXT,
  p_difficulty TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
  v_actual_3bvs NUMERIC;
  v_reference_3bvs NUMERIC;
  v_raw_score NUMERIC;
BEGIN
  -- Calculate actual 3BV/s (efficiency)
  v_actual_3bvs := p_grid_3bv::NUMERIC / GREATEST(1, p_time_seconds);

  -- Get reference for this cycle/difficulty
  SELECT reference_3bvs INTO v_reference_3bvs
  FROM public.minesweeper_tournament_3bv_reference
  WHERE cycle = p_cycle AND difficulty = p_difficulty;

  -- Fallback if no reference found
  IF v_reference_3bvs IS NULL OR v_reference_3bvs <= 0 THEN
    v_reference_3bvs := 0.25;
  END IF;

  -- Calculate score: 100 × ratio, clamped [10, 300]
  v_raw_score := 100.0 * v_actual_3bvs / v_reference_3bvs;

  RETURN GREATEST(10, LEAST(300, FLOOR(v_raw_score)));
END;
$$;

COMMENT ON FUNCTION public.calculate_tournament_score IS
  'Calculates tournament score based on 3BV/s efficiency.
   Score 100 = performance equal to reference for the cycle.
   Score range: 10 (minimum) to 300 (3x reference, maximum).';

-- ============================================================================
-- PART 5: Update complete_tournament_game() RPC
-- ============================================================================

DROP FUNCTION IF EXISTS public.complete_tournament_game(UUID, TEXT, INTEGER, JSONB);

CREATE OR REPLACE FUNCTION public.complete_tournament_game(
  p_game_id UUID,
  p_status TEXT,
  p_time_seconds INTEGER,
  p_grid_state JSONB
)
RETURNS TABLE(
  success BOOLEAN,
  final_status TEXT,
  grid_3bv INTEGER,
  score INTEGER,
  actual_3bvs NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game RECORD;
  v_tournament RECORD;
  v_student_grade TEXT;
  v_cycle TEXT;
  v_grid_3bv INTEGER;
  v_score INTEGER;
  v_actual_3bvs NUMERIC;
BEGIN
  -- Step 1: Verify game exists and belongs to current user
  SELECT g.*, t.difficulty
  INTO v_game
  FROM public.minesweeper_tournament_games g
  JOIN public.minesweeper_tournaments t ON t.id = g.tournament_id
  WHERE g.id = p_game_id
    AND g.student_id = auth.uid()
    AND g.status = 'in_progress';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found, not owned by you, or already completed';
  END IF;

  -- Step 2: Validate status
  IF p_status NOT IN ('won', 'lost') THEN
    RAISE EXCEPTION 'Invalid status: must be won or lost';
  END IF;

  -- Step 3: For wins, calculate 3BV and score
  IF p_status = 'won' THEN
    -- Validate grid state represents a win
    IF NOT public.validate_minesweeper_win(p_grid_state, v_game.difficulty) THEN
      RAISE EXCEPTION 'Invalid grid state: does not represent a valid win';
    END IF;

    -- Calculate 3BV
    v_grid_3bv := public.calculate_3bv(p_grid_state);

    -- Get student's cycle
    SELECT grade INTO v_student_grade
    FROM public.profiles
    WHERE id = v_game.student_id;

    v_cycle := public.get_cycle_for_grade(v_student_grade);

    -- Calculate score (with fallback if no cycle)
    IF v_cycle IS NOT NULL THEN
      v_score := public.calculate_tournament_score(v_grid_3bv, p_time_seconds, v_cycle, v_game.difficulty);
    ELSE
      -- Fallback: use cycle_3 as default
      v_score := public.calculate_tournament_score(v_grid_3bv, p_time_seconds, 'cycle_3', v_game.difficulty);
    END IF;

    v_actual_3bvs := v_grid_3bv::NUMERIC / GREATEST(1, p_time_seconds);
  ELSE
    -- Lost game: no 3BV or score
    v_grid_3bv := NULL;
    v_score := NULL;
    v_actual_3bvs := NULL;
  END IF;

  -- Step 4: Update game record
  UPDATE public.minesweeper_tournament_games
  SET
    status = p_status,
    time_seconds = CASE WHEN p_status = 'won' THEN p_time_seconds ELSE NULL END,
    grid_state = p_grid_state,
    grid_3bv = v_grid_3bv,
    score = v_score,
    completed_at = NOW()
  WHERE id = p_game_id;

  -- Step 5: Return result
  success := TRUE;
  final_status := p_status;
  grid_3bv := v_grid_3bv;
  score := v_score;
  actual_3bvs := v_actual_3bvs;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.complete_tournament_game IS
  'Completes a tournament game. For wins, calculates 3BV and score based on efficiency.
   Returns success, final_status, grid_3bv, score, and actual_3bvs.';

GRANT EXECUTE ON FUNCTION public.complete_tournament_game TO authenticated;

-- ============================================================================
-- PART 6: Update standings view to use score instead of time
-- ============================================================================

DROP VIEW IF EXISTS public.minesweeper_tournament_standings;

CREATE VIEW public.minesweeper_tournament_standings AS
WITH ranked_games AS (
  SELECT
    g.tournament_id,
    g.student_id,
    g.score,
    g.grid_3bv,
    g.time_seconds,
    ROW_NUMBER() OVER (
      PARTITION BY g.tournament_id, g.student_id
      ORDER BY g.score DESC NULLS LAST  -- Best scores first
    ) AS rank_in_student
  FROM public.minesweeper_tournament_games g
  WHERE g.status = 'won'
),
top_games AS (
  SELECT
    rg.tournament_id,
    rg.student_id,
    rg.score,
    rg.grid_3bv,
    rg.time_seconds
  FROM ranked_games rg
  JOIN public.minesweeper_tournaments t ON t.id = rg.tournament_id
  WHERE rg.rank_in_student <= t.top_x_games
    AND rg.score IS NOT NULL
),
aggregated AS (
  SELECT
    tournament_id,
    student_id,
    COUNT(*) AS games_won,
    AVG(score) AS average_score,
    AVG(grid_3bv::NUMERIC / GREATEST(1, time_seconds)) AS average_3bvs
  FROM top_games
  GROUP BY tournament_id, student_id
)
SELECT
  a.tournament_id,
  a.student_id,
  p.firstname,
  p.lastname,
  a.games_won::INTEGER,
  ROUND(a.average_score, 1) AS average_score,
  ROUND(a.average_3bvs, 3) AS average_3bvs,
  ROW_NUMBER() OVER (
    PARTITION BY a.tournament_id
    ORDER BY a.average_score DESC  -- Highest score = best rank
  )::INTEGER AS position
FROM aggregated a
JOIN public.profiles p ON p.id = a.student_id;

COMMENT ON VIEW public.minesweeper_tournament_standings IS
  'Tournament standings ranked by average score (3BV-based efficiency).
   Shows average_score and average_3bvs for the top X games per student.';

-- RLS for view
ALTER VIEW public.minesweeper_tournament_standings SET (security_invoker = on);

GRANT SELECT ON public.minesweeper_tournament_standings TO authenticated;

-- ============================================================================
-- PART 7: Update finalize_tournament() to update 3BV references
-- ============================================================================

-- Drop existing function first (return type is changing)
DROP FUNCTION IF EXISTS public.finalize_tournament(UUID);

CREATE OR REPLACE FUNCTION public.finalize_tournament(p_tournament_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  rewards_distributed INTEGER,
  reference_updates INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_standing RECORD;
  v_reward INTEGER;
  v_rewards_count INTEGER := 0;
  v_reference_count INTEGER := 0;
BEGIN
  -- Step 1: Get and validate tournament
  SELECT * INTO v_tournament
  FROM public.minesweeper_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Only creator or admin can finalize
  IF v_tournament.creator_id != auth.uid() THEN
    -- Check if admin
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only tournament creator or admin can finalize';
    END IF;
  END IF;

  -- Check tournament is active or past end date
  IF v_tournament.status NOT IN ('active', 'scheduled') THEN
    RAISE EXCEPTION 'Tournament already finalized or cancelled';
  END IF;

  -- Step 2: Distribute rewards to podium
  FOR v_standing IN
    SELECT s.student_id, s.position
    FROM public.minesweeper_tournament_standings s
    WHERE s.tournament_id = p_tournament_id
      AND s.position <= v_tournament.podium_places
    ORDER BY s.position
  LOOP
    -- Get reward amount for this position
    v_reward := (v_tournament.podium_rewards->>v_standing.position::TEXT)::INTEGER;

    IF v_reward IS NOT NULL AND v_reward > 0 THEN
      -- Award gidouilles
      UPDATE public.profiles
      SET gidouilles = COALESCE(gidouilles, 0) + v_reward
      WHERE id = v_standing.student_id;

      -- Record in history
      INSERT INTO public.gidouilles_history (student_id, delta, reason)
      VALUES (
        v_standing.student_id,
        v_reward,
        'Tournament ' || v_tournament.name || ' - Position #' || v_standing.position
      );

      v_rewards_count := v_rewards_count + 1;
    END IF;
  END LOOP;

  -- Step 3: Update 3BV reference values with tournament data
  WITH tournament_stats AS (
    SELECT
      public.get_cycle_for_grade(p.grade) AS cycle,
      t.difficulty,
      AVG(g.grid_3bv::NUMERIC / GREATEST(1, g.time_seconds)) AS avg_3bvs,
      COUNT(*) AS new_samples
    FROM public.minesweeper_tournament_games g
    JOIN public.minesweeper_tournaments t ON t.id = g.tournament_id
    JOIN public.profiles p ON p.id = g.student_id
    WHERE g.tournament_id = p_tournament_id
      AND g.status = 'won'
      AND g.grid_3bv IS NOT NULL
      AND g.time_seconds IS NOT NULL
      AND public.get_cycle_for_grade(p.grade) IS NOT NULL
    GROUP BY public.get_cycle_for_grade(p.grade), t.difficulty
  ),
  updated AS (
    UPDATE public.minesweeper_tournament_3bv_reference ref
    SET
      reference_3bvs = CASE
        WHEN ref.sample_count + ts.new_samples > 0 THEN
          (ref.reference_3bvs * ref.sample_count + ts.avg_3bvs * ts.new_samples)
          / (ref.sample_count + ts.new_samples)
        ELSE ref.reference_3bvs
      END,
      sample_count = ref.sample_count + ts.new_samples,
      updated_at = NOW()
    FROM tournament_stats ts
    WHERE ref.cycle = ts.cycle AND ref.difficulty = ts.difficulty
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_reference_count FROM updated;

  -- Step 4: Mark tournament as completed
  UPDATE public.minesweeper_tournaments
  SET status = 'completed', updated_at = NOW()
  WHERE id = p_tournament_id;

  -- Return results
  success := TRUE;
  rewards_distributed := v_rewards_count;
  reference_updates := v_reference_count;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.finalize_tournament IS
  'Finalizes a tournament: distributes podium rewards and updates 3BV reference values.
   Returns success, rewards_distributed count, and reference_updates count.';

GRANT EXECUTE ON FUNCTION public.finalize_tournament TO authenticated;

-- ============================================================================
-- PART 8: Update get_tournament_details to include score info
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_tournament_details(UUID);

CREATE OR REPLACE FUNCTION public.get_tournament_details(p_tournament_id UUID)
RETURNS TABLE(
  id UUID,
  creator_id UUID,
  name TEXT,
  description TEXT,
  difficulty TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  top_x_games INTEGER,
  podium_rewards JSONB,
  podium_places INTEGER,
  status TEXT,
  participant_count BIGINT,
  games_played BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.creator_id,
    t.name,
    t.description,
    t.difficulty,
    t.start_date,
    t.end_date,
    t.top_x_games,
    t.podium_rewards,
    t.podium_places,
    t.status,
    (SELECT COUNT(DISTINCT g.student_id) FROM minesweeper_tournament_games g WHERE g.tournament_id = t.id)::BIGINT,
    (SELECT COUNT(*) FROM minesweeper_tournament_games g WHERE g.tournament_id = t.id)::BIGINT
  FROM public.minesweeper_tournaments t
  WHERE t.id = p_tournament_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tournament_details TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Complete: Tournament 3BV Scoring';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW TABLE:';
  RAISE NOTICE '  - minesweeper_tournament_3bv_reference';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW COLUMNS on minesweeper_tournament_games:';
  RAISE NOTICE '  - grid_3bv (INTEGER)';
  RAISE NOTICE '  - score (INTEGER)';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW/UPDATED FUNCTIONS:';
  RAISE NOTICE '  - calculate_3bv(grid_state) -> INTEGER';
  RAISE NOTICE '  - calculate_tournament_score(3bv, time, cycle, difficulty) -> INTEGER';
  RAISE NOTICE '  - complete_tournament_game() -> now returns grid_3bv, score, actual_3bvs';
  RAISE NOTICE '  - finalize_tournament() -> now updates 3BV references';
  RAISE NOTICE '';
  RAISE NOTICE 'UPDATED VIEW:';
  RAISE NOTICE '  - minesweeper_tournament_standings -> ranks by average_score DESC';
  RAISE NOTICE '';
  RAISE NOTICE 'SCORING FORMULA:';
  RAISE NOTICE '  score = clamp(floor(100 * actual_3bvs / reference_3bvs), 10, 300)';
  RAISE NOTICE '  - Score 100 = reference performance';
  RAISE NOTICE '  - Score 10 = minimum';
  RAISE NOTICE '  - Score 300 = 3x reference (maximum)';
  RAISE NOTICE '========================================';
END;
$$ LANGUAGE plpgsql;
