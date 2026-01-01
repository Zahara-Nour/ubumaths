-- ============================================================================
-- Migration: Create Minesweeper Reference Times Tables and Functions
-- Purpose: Dynamic reference times by pedagogical cycle for reward calculation
-- Date: 2026-01-01
-- ============================================================================
--
-- This migration implements dynamic reference times for the Minesweeper game:
-- - Reference times are segmented by French pedagogical cycle
-- - Times are recalculated weekly based on median player performance
-- - Bounds prevent manipulation (min/max limits)
-- - Fallback values used when not enough data
--
-- Cycles (official French system):
-- - cycle_2: CP, CE1, CE2 (ages 6-9)
-- - cycle_3: CM1, CM2, 6ème (ages 9-12) - Note: 6ème is in cycle 3!
-- - cycle_4: 5ème, 4ème, 3ème (ages 12-15)
-- - seconde: 2nde (ages 15-16)
-- - cycle_terminal: 1ère, Terminale (ages 16-18)
--
-- ============================================================================

-- ============================================================================
-- PART 1: Create Reference Times Table
-- ============================================================================

CREATE TABLE public.minesweeper_reference_times (
  cycle TEXT NOT NULL CHECK (cycle IN ('cycle_2', 'cycle_3', 'cycle_4', 'seconde', 'cycle_terminal')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'expert')),
  reference_time INTEGER NOT NULL CHECK (reference_time > 0),
  fallback_time INTEGER NOT NULL CHECK (fallback_time > 0),
  min_bound INTEGER NOT NULL CHECK (min_bound > 0),
  max_bound INTEGER NOT NULL CHECK (max_bound > min_bound),
  min_samples INTEGER NOT NULL DEFAULT 30 CHECK (min_samples > 0),
  sample_count INTEGER DEFAULT 0 CHECK (sample_count >= 0),
  calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (cycle, difficulty),
  CONSTRAINT valid_reference_bounds CHECK (reference_time BETWEEN min_bound AND max_bound),
  CONSTRAINT valid_fallback_bounds CHECK (fallback_time BETWEEN min_bound AND max_bound)
);

COMMENT ON TABLE public.minesweeper_reference_times IS
  'Dynamic reference times for Minesweeper reward calculation, segmented by pedagogical cycle.';

COMMENT ON COLUMN public.minesweeper_reference_times.cycle IS
  'French pedagogical cycle: cycle_2, cycle_3, cycle_4, seconde, cycle_terminal';

COMMENT ON COLUMN public.minesweeper_reference_times.reference_time IS
  'Current reference time in seconds (updated weekly if enough samples)';

COMMENT ON COLUMN public.minesweeper_reference_times.fallback_time IS
  'Default time used when sample_count < min_samples';

COMMENT ON COLUMN public.minesweeper_reference_times.min_bound IS
  'Minimum allowed reference time (security against manipulation)';

COMMENT ON COLUMN public.minesweeper_reference_times.max_bound IS
  'Maximum allowed reference time (security against manipulation)';

COMMENT ON COLUMN public.minesweeper_reference_times.min_samples IS
  'Minimum games required before using calculated reference_time instead of fallback';

-- ============================================================================
-- PART 2: Create History Table and Performance Index
-- ============================================================================

-- Partial index to optimize weekly recalculation queries on minesweeper_games
-- Covers the WHERE clause in recalculate_minesweeper_reference_times()
CREATE INDEX IF NOT EXISTS idx_minesweeper_games_recalc
  ON public.minesweeper_games(student_id, difficulty, completed_at)
  WHERE status = 'won' AND student_id IS NOT NULL;

CREATE TABLE public.minesweeper_reference_times_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  reference_time INTEGER NOT NULL,
  sample_count INTEGER NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ref_times_history_lookup
  ON public.minesweeper_reference_times_history(cycle, difficulty, created_at DESC);

COMMENT ON TABLE public.minesweeper_reference_times_history IS
  'History of reference time recalculations for analysis and potential rollback.';

-- ============================================================================
-- PART 3: RLS Policies
-- ============================================================================

ALTER TABLE public.minesweeper_reference_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minesweeper_reference_times_history ENABLE ROW LEVEL SECURITY;

-- Reference times: Anyone can read, only service_role can write (bypasses RLS)
CREATE POLICY "Anyone can read reference times"
  ON public.minesweeper_reference_times
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- History: Only admins can read
CREATE POLICY "Admins can read reference times history"
  ON public.minesweeper_reference_times_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Grant SELECT permissions
GRANT SELECT ON public.minesweeper_reference_times TO authenticated, anon;
GRANT SELECT ON public.minesweeper_reference_times_history TO authenticated;

-- ============================================================================
-- PART 4: Seed Initial Values
-- ============================================================================
-- Values based on difficulty and expected performance differences by cycle
-- Bounds are set to ±100% of fallback to allow natural variation while preventing manipulation

INSERT INTO public.minesweeper_reference_times
  (cycle, difficulty, reference_time, fallback_time, min_bound, max_bound, min_samples)
VALUES
  -- Cycle 2 (CP, CE1, CE2) - More time for younger students
  ('cycle_2', 'beginner', 240, 240, 120, 480, 30),
  ('cycle_2', 'intermediate', 900, 900, 450, 1800, 30),
  ('cycle_2', 'expert', 1800, 1800, 900, 3600, 30),

  -- Cycle 3 (CM1, CM2, 6ème) - Current default times (fallback)
  ('cycle_3', 'beginner', 180, 180, 90, 360, 30),
  ('cycle_3', 'intermediate', 600, 600, 300, 1200, 30),
  ('cycle_3', 'expert', 1200, 1200, 600, 2400, 30),

  -- Cycle 4 (5ème, 4ème, 3ème)
  ('cycle_4', 'beginner', 150, 150, 75, 300, 30),
  ('cycle_4', 'intermediate', 500, 500, 250, 1000, 30),
  ('cycle_4', 'expert', 1000, 1000, 500, 2000, 30),

  -- Seconde (2nde)
  ('seconde', 'beginner', 120, 120, 60, 240, 30),
  ('seconde', 'intermediate', 420, 420, 210, 840, 30),
  ('seconde', 'expert', 900, 900, 450, 1800, 30),

  -- Cycle terminal (1ère, Terminale)
  ('cycle_terminal', 'beginner', 100, 100, 50, 200, 30),
  ('cycle_terminal', 'intermediate', 360, 360, 180, 720, 30),
  ('cycle_terminal', 'expert', 780, 780, 390, 1560, 30);

-- ============================================================================
-- PART 5: Function get_cycle_for_grade()
-- ============================================================================
-- Pure function that maps a grade code to its pedagogical cycle
-- Returns NULL for invalid/unknown grades (no gidouilles awarded)

CREATE OR REPLACE FUNCTION public.get_cycle_for_grade(p_grade TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p_grade IN ('CP', 'CE1', 'CE2') THEN 'cycle_2'
    WHEN p_grade IN ('CM1', 'CM2', '6') THEN 'cycle_3'
    WHEN p_grade IN ('5', '4', '3') THEN 'cycle_4'
    WHEN p_grade = '2' THEN 'seconde'
    WHEN p_grade IN ('1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_STMG', 'T_STMG') THEN 'cycle_terminal'
    ELSE NULL
  END
$$;

COMMENT ON FUNCTION public.get_cycle_for_grade(TEXT) IS
  'Maps a grade code to its French pedagogical cycle. Returns NULL for invalid grades.';

GRANT EXECUTE ON FUNCTION public.get_cycle_for_grade(TEXT) TO authenticated, anon;

-- ============================================================================
-- PART 6: Function get_minesweeper_reference_time()
-- ============================================================================
-- Returns the appropriate reference time for a cycle/difficulty
-- Uses fallback if not enough samples collected yet
-- Raises exception for invalid cycle/difficulty (explicit error handling)

CREATE OR REPLACE FUNCTION public.get_minesweeper_reference_time(
  p_cycle TEXT,
  p_difficulty TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
  v_result INTEGER;
BEGIN
  SELECT CASE
    WHEN sample_count >= min_samples THEN reference_time
    ELSE fallback_time
  END
  INTO v_result
  FROM public.minesweeper_reference_times
  WHERE cycle = p_cycle AND difficulty = p_difficulty;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Invalid cycle (%) or difficulty (%) combination', p_cycle, p_difficulty;
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_minesweeper_reference_time(TEXT, TEXT) IS
  'Returns reference time for a cycle/difficulty. Uses fallback if not enough samples.
   Raises exception for invalid cycle/difficulty combination.';

GRANT EXECUTE ON FUNCTION public.get_minesweeper_reference_time(TEXT, TEXT) TO authenticated, anon;

-- ============================================================================
-- PART 7: Function recalculate_minesweeper_reference_times()
-- ============================================================================
-- Weekly recalculation function called by CRON
-- Calculates median time over 4 weeks, applies bounds, updates table, records history

CREATE OR REPLACE FUNCTION public.recalculate_minesweeper_reference_times()
RETURNS TABLE(
  cycle TEXT,
  difficulty TEXT,
  old_time INTEGER,
  new_time INTEGER,
  sample_count INTEGER,
  updated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
  v_median_time NUMERIC;
  v_count INTEGER;
  v_current_ref RECORD;
  v_new_time INTEGER;
  v_updated BOOLEAN;
BEGIN
  -- Calculate 4-week window ending yesterday
  v_week_end := CURRENT_DATE - INTERVAL '1 day';
  v_week_start := v_week_end - INTERVAL '4 weeks';

  -- Process each cycle/difficulty combination (single query, 15 rows)
  FOR v_current_ref IN
    SELECT * FROM public.minesweeper_reference_times
    ORDER BY
      CASE cycle
        WHEN 'cycle_2' THEN 1
        WHEN 'cycle_3' THEN 2
        WHEN 'cycle_4' THEN 3
        WHEN 'seconde' THEN 4
        WHEN 'cycle_terminal' THEN 5
      END,
      CASE difficulty
        WHEN 'beginner' THEN 1
        WHEN 'intermediate' THEN 2
        WHEN 'expert' THEN 3
      END
  LOOP

    -- Calculate median time for this cycle/difficulty
    -- Join minesweeper_games with profiles to get the student's grade and cycle
    SELECT
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY mg.time_seconds),
      COUNT(*)
    INTO v_median_time, v_count
    FROM public.minesweeper_games mg
    JOIN public.profiles p ON mg.student_id = p.id
    WHERE mg.status = 'won'
      AND mg.student_id IS NOT NULL
      AND mg.completed_at >= v_week_start
      AND mg.completed_at < v_week_end + INTERVAL '1 day'
      AND public.get_cycle_for_grade(p.grade) = v_current_ref.cycle
      AND mg.difficulty = v_current_ref.difficulty;

    v_updated := FALSE;

    -- Only update if enough samples
    IF v_count >= v_current_ref.min_samples AND v_median_time IS NOT NULL THEN
      -- Apply bounds
      v_new_time := GREATEST(
        v_current_ref.min_bound,
        LEAST(v_current_ref.max_bound, ROUND(v_median_time)::INTEGER)
      );

      -- Update reference time
      UPDATE public.minesweeper_reference_times
      SET
        reference_time = v_new_time,
        sample_count = v_count,
        calculated_at = NOW(),
        updated_at = NOW()
      WHERE minesweeper_reference_times.cycle = v_current_ref.cycle
        AND minesweeper_reference_times.difficulty = v_current_ref.difficulty;

      -- Record history
      INSERT INTO public.minesweeper_reference_times_history
        (cycle, difficulty, reference_time, sample_count, week_start, week_end)
      VALUES
        (v_current_ref.cycle, v_current_ref.difficulty, v_new_time, v_count, v_week_start, v_week_end);

      v_updated := TRUE;
    ELSE
      v_new_time := v_current_ref.reference_time;

      -- Update sample count even if not updating reference_time
      UPDATE public.minesweeper_reference_times
      SET
        sample_count = COALESCE(v_count, 0),
        updated_at = NOW()
      WHERE minesweeper_reference_times.cycle = v_current_ref.cycle
        AND minesweeper_reference_times.difficulty = v_current_ref.difficulty;
    END IF;

    -- Return result row
    cycle := v_current_ref.cycle;
    difficulty := v_current_ref.difficulty;
    old_time := v_current_ref.reference_time;
    new_time := v_new_time;
    sample_count := COALESCE(v_count, 0);
    updated := v_updated;
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.recalculate_minesweeper_reference_times() IS
  'Weekly recalculation of reference times using 4-week median by cycle.
   Only updates if sample_count >= min_samples. Applies min/max bounds.
   Called by CRON job on Sundays.';

-- Only service_role should call this function (via CRON)
GRANT EXECUTE ON FUNCTION public.recalculate_minesweeper_reference_times() TO service_role;
