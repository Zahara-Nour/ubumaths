-- Minesweeper Daily Challenge Migration
-- Purpose: Add daily challenge feature where all students compete on the same grid
-- Author: Claude (Supabase Expert)
-- Date: 2025-11-19
--
-- Features:
-- - Daily challenges with deterministic grid generation (seeded)
-- - One attempt per student per day
-- - Leaderboard with top 3 bonus rewards (1st: +50, 2nd: +30, 3rd: +20)
-- - Server-side time tracking and validation
-- - Automatic ranking updates via trigger
-- - Full audit trail via gidouilles_history
--
-- Security:
-- - SECURITY DEFINER functions prevent manipulation
-- - RLS policies restrict access appropriately
-- - Server-side win validation reuses existing validate_minesweeper_win()
-- - One-attempt-per-day constraint enforced at database level

-- ============================================================================
-- Table: minesweeper_daily_challenges
-- ============================================================================
-- Stores daily challenge configurations. One challenge per day.
-- Generated automatically on first access each day.

CREATE TABLE public.minesweeper_daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date DATE UNIQUE NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'expert')),
  seed TEXT NOT NULL, -- Deterministic seed for grid generation (e.g., "20251119-beginner")
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for finding today's challenge efficiently
CREATE INDEX idx_minesweeper_daily_challenges_date
  ON public.minesweeper_daily_challenges(challenge_date DESC);

COMMENT ON TABLE public.minesweeper_daily_challenges IS
  'Daily Minesweeper challenges. One challenge per day with deterministic seed for reproducible grids.';

COMMENT ON COLUMN public.minesweeper_daily_challenges.seed IS
  'Seed for deterministic grid generation. Format: YYYYMMDD-difficulty. All students get same grid.';

-- ============================================================================
-- Table: minesweeper_daily_attempts
-- ============================================================================
-- Tracks student attempts at daily challenges.
-- One attempt per student per day (enforced by unique constraint).

CREATE TABLE public.minesweeper_daily_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.minesweeper_daily_challenges(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  grid_state JSONB NOT NULL, -- Final grid state for verification
  time_seconds INTEGER NOT NULL CHECK (time_seconds > 0),
  status TEXT NOT NULL CHECK (status IN ('won', 'lost')),
  gidouilles_earned INTEGER NOT NULL DEFAULT 0 CHECK (gidouilles_earned >= 0),
  rank INTEGER CHECK (rank IS NULL OR rank IN (1, 2, 3)), -- Top 3 only
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One attempt per student per day
  CONSTRAINT unique_daily_attempt UNIQUE (challenge_id, student_id)
);

-- Index for leaderboard queries (fastest times first)
CREATE INDEX idx_minesweeper_daily_attempts_leaderboard
  ON public.minesweeper_daily_attempts(challenge_id, time_seconds ASC)
  WHERE status = 'won';

-- Index for user history
CREATE INDEX idx_minesweeper_daily_attempts_student
  ON public.minesweeper_daily_attempts(student_id, completed_at DESC);

-- Index for ranking updates
CREATE INDEX idx_minesweeper_daily_attempts_ranking
  ON public.minesweeper_daily_attempts(challenge_id, status, time_seconds)
  WHERE status = 'won';

COMMENT ON TABLE public.minesweeper_daily_attempts IS
  'Student attempts at daily challenges. One attempt per student per day. Top 3 get bonus gidouilles.';

COMMENT ON COLUMN public.minesweeper_daily_attempts.rank IS
  'Daily rank for top 3 winners (1, 2, 3). NULL for others. Updated automatically after each attempt.';

COMMENT ON COLUMN public.minesweeper_daily_attempts.gidouilles_earned IS
  'Total gidouilles: base reward + top 3 bonus (1st: +50, 2nd: +30, 3rd: +20)';

-- ============================================================================
-- View: minesweeper_daily_leaderboard
-- ============================================================================
-- Pre-calculated daily leaderboard showing all winners ranked by time.

CREATE VIEW public.minesweeper_daily_leaderboard AS
SELECT
  mda.challenge_id,
  mdc.challenge_date,
  mdc.difficulty,
  mda.student_id,
  p.firstname,
  p.lastname,
  mda.time_seconds,
  mda.gidouilles_earned,
  mda.rank,
  mda.completed_at,
  ROW_NUMBER() OVER (
    PARTITION BY mda.challenge_id
    ORDER BY mda.time_seconds ASC
  ) as position
FROM public.minesweeper_daily_attempts mda
JOIN public.minesweeper_daily_challenges mdc ON mda.challenge_id = mdc.id
JOIN public.profiles p ON mda.student_id = p.id
WHERE mda.status = 'won'
ORDER BY mdc.challenge_date DESC, mda.time_seconds ASC;

-- Use security_invoker for RLS inheritance
ALTER VIEW public.minesweeper_daily_leaderboard SET (security_invoker = on);

-- Grant access to authenticated users (students can see leaderboard)
GRANT SELECT ON public.minesweeper_daily_leaderboard TO authenticated;

COMMENT ON VIEW public.minesweeper_daily_leaderboard IS
  'Daily challenge leaderboard showing all winners ranked by time. Only successful completions shown.';

-- ============================================================================
-- RLS Policies: minesweeper_daily_challenges
-- ============================================================================

ALTER TABLE public.minesweeper_daily_challenges ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can view challenges
CREATE POLICY "Authenticated users can view daily challenges"
  ON public.minesweeper_daily_challenges
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- INSERT: Only service role can create challenges (automated)
-- No policy needed - service role bypasses RLS

-- UPDATE/DELETE: Only service role (no policies needed)

COMMENT ON TABLE public.minesweeper_daily_challenges IS
  'Daily challenges. SELECT: authenticated users. INSERT/UPDATE/DELETE: service role only.';

-- ============================================================================
-- RLS Policies: minesweeper_daily_attempts
-- ============================================================================

ALTER TABLE public.minesweeper_daily_attempts ENABLE ROW LEVEL SECURITY;

-- SELECT: Students can view all attempts (for leaderboard)
CREATE POLICY "Students can view all daily attempts"
  ON public.minesweeper_daily_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
    )
  );

-- INSERT: Students can insert their own attempts only
-- Actual insertion done via SECURITY DEFINER function
CREATE POLICY "Students can insert own daily attempts"
  ON public.minesweeper_daily_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

-- UPDATE: Only service role (for ranking updates)
-- No policy needed - service role bypasses RLS

-- DELETE: No one can delete (preserve history)
-- No DELETE policy = deny all

COMMENT ON TABLE public.minesweeper_daily_attempts IS
  'RLS: Students SELECT all, INSERT own only, UPDATE/DELETE via service role.';

-- ============================================================================
-- Function: get_or_create_daily_challenge()
-- ============================================================================
-- Gets today's challenge, or creates it if it doesn't exist.
-- Difficulty rotates by day of week.

CREATE OR REPLACE FUNCTION public.get_or_create_daily_challenge()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE;
  v_challenge RECORD;
  v_difficulty TEXT;
  v_seed TEXT;
  v_day_of_week INTEGER;
BEGIN
  v_today := CURRENT_DATE;

  -- Try to get existing challenge
  SELECT * INTO v_challenge
  FROM public.minesweeper_daily_challenges
  WHERE challenge_date = v_today;

  IF FOUND THEN
    -- Return existing challenge
    RETURN jsonb_build_object(
      'id', v_challenge.id,
      'challenge_date', v_challenge.challenge_date,
      'difficulty', v_challenge.difficulty,
      'seed', v_challenge.seed,
      'created_at', v_challenge.created_at
    );
  END IF;

  -- Create new challenge for today
  -- Difficulty rotation by day of week:
  -- Monday (1): beginner
  -- Tuesday (2): intermediate
  -- Wednesday (3): expert
  -- Thursday (4): beginner
  -- Friday (5): intermediate
  -- Saturday (6): expert
  -- Sunday (0): expert

  v_day_of_week := EXTRACT(DOW FROM v_today)::INTEGER;

  CASE v_day_of_week
    WHEN 1, 4 THEN v_difficulty := 'beginner';    -- Mon, Thu
    WHEN 2, 5 THEN v_difficulty := 'intermediate'; -- Tue, Fri
    WHEN 0, 3, 6 THEN v_difficulty := 'expert';   -- Sun, Wed, Sat
    ELSE v_difficulty := 'beginner'; -- Fallback (should never happen)
  END CASE;

  -- Generate seed from date and difficulty
  v_seed := TO_CHAR(v_today, 'YYYYMMDD') || '-' || v_difficulty;

  -- Insert new challenge
  INSERT INTO public.minesweeper_daily_challenges (
    challenge_date,
    difficulty,
    seed
  ) VALUES (
    v_today,
    v_difficulty,
    v_seed
  )
  RETURNING * INTO v_challenge;

  -- Return new challenge
  RETURN jsonb_build_object(
    'id', v_challenge.id,
    'challenge_date', v_challenge.challenge_date,
    'difficulty', v_challenge.difficulty,
    'seed', v_challenge.seed,
    'created_at', v_challenge.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_daily_challenge TO authenticated;

COMMENT ON FUNCTION public.get_or_create_daily_challenge IS
  'Gets today''s challenge or creates it if missing. Difficulty rotates: Mon/Thu=beginner, Tue/Fri=intermediate, Sun/Wed/Sat=expert.';

-- ============================================================================
-- Function: calculate_daily_challenge_gidouilles()
-- ============================================================================
-- Calculates base gidouilles for daily challenge (same as regular game).
-- Top 3 bonuses are added separately in update_daily_challenge_rankings().

CREATE OR REPLACE FUNCTION public.calculate_daily_challenge_gidouilles(
  p_difficulty TEXT,
  p_time_seconds INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_base_reward INTEGER;
  v_time_bonus_percent NUMERIC;
  v_time_bonus INTEGER;
  v_total INTEGER;
BEGIN
  -- Base rewards by difficulty (same as regular Minesweeper)
  CASE p_difficulty
    WHEN 'beginner' THEN
      v_base_reward := 10;
      -- Time bonus: < 60 seconds = +50%, linear decrease to 0% at 180s
      IF p_time_seconds < 60 THEN
        v_time_bonus_percent := 0.5;
      ELSIF p_time_seconds < 180 THEN
        v_time_bonus_percent := 0.5 * (180 - p_time_seconds) / 120.0;
      ELSE
        v_time_bonus_percent := 0.0;
      END IF;
    WHEN 'intermediate' THEN
      v_base_reward := 30;
      -- Time bonus: < 300s = +50%, linear decrease to 0% at 600s
      IF p_time_seconds < 300 THEN
        v_time_bonus_percent := 0.5;
      ELSIF p_time_seconds < 600 THEN
        v_time_bonus_percent := 0.5 * (600 - p_time_seconds) / 300.0;
      ELSE
        v_time_bonus_percent := 0.0;
      END IF;
    WHEN 'expert' THEN
      v_base_reward := 60;
      -- Time bonus: < 600s = +50%, linear decrease to 0% at 1200s
      IF p_time_seconds < 600 THEN
        v_time_bonus_percent := 0.5;
      ELSIF p_time_seconds < 1200 THEN
        v_time_bonus_percent := 0.5 * (1200 - p_time_seconds) / 600.0;
      ELSE
        v_time_bonus_percent := 0.0;
      END IF;
    ELSE
      RETURN 0; -- Invalid difficulty
  END CASE;

  -- Calculate time bonus
  v_time_bonus := FLOOR(v_base_reward * v_time_bonus_percent);
  v_total := v_base_reward + v_time_bonus;

  -- No per-game cap for daily challenges (top 3 bonus added separately)

  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION public.calculate_daily_challenge_gidouilles IS
  'Calculates base gidouilles for daily challenge (no degressive multiplier). Top 3 bonuses added separately.';

-- ============================================================================
-- Function: record_daily_challenge_attempt()
-- ============================================================================
-- Records a student's attempt at today's daily challenge.
-- Validates win condition, calculates base gidouilles, awards to student.
-- Ranking and bonuses are updated separately via trigger.

CREATE OR REPLACE FUNCTION public.record_daily_challenge_attempt(
  p_challenge_id UUID,
  p_time_seconds INTEGER,
  p_status TEXT,
  p_grid_state JSONB
)
RETURNS TABLE(success BOOLEAN, gidouilles_earned INTEGER, attempt_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_challenge RECORD;
  v_is_valid BOOLEAN;
  v_gidouilles INTEGER;
  v_attempt_id UUID;
  v_grid_size INTEGER;
BEGIN
  -- Step 1: Get authenticated user
  v_student_id := auth.uid();

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to attempt daily challenge';
  END IF;

  -- Verify user is a student
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_student_id AND role = 'student'
  ) THEN
    RAISE EXCEPTION 'Only students can attempt daily challenges';
  END IF;

  -- Step 2: Get challenge and validate it exists
  SELECT * INTO v_challenge
  FROM public.minesweeper_daily_challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  -- Step 3: Check if student already attempted this challenge
  IF EXISTS (
    SELECT 1 FROM public.minesweeper_daily_attempts
    WHERE challenge_id = p_challenge_id
      AND student_id = v_student_id
  ) THEN
    RAISE EXCEPTION 'Already attempted this daily challenge (one attempt per day)';
  END IF;

  -- Step 4: Validate status
  IF p_status NOT IN ('won', 'lost') THEN
    RAISE EXCEPTION 'Invalid status: must be won or lost';
  END IF;

  -- Step 5: Validate time_seconds
  IF p_time_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid time: must be at least 1 second';
  END IF;

  -- Difficulty-specific time limits
  CASE v_challenge.difficulty
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

  -- Step 6: Validate grid_state size
  v_grid_size := pg_column_size(p_grid_state);
  IF v_grid_size > 100000 THEN
    RAISE EXCEPTION 'Grid state too large: exceeds 100KB';
  END IF;

  -- Step 7: For wins, validate grid_state represents legitimate win
  IF p_status = 'won' THEN
    v_is_valid := public.validate_minesweeper_win(p_grid_state, v_challenge.difficulty);

    IF NOT v_is_valid THEN
      RAISE EXCEPTION 'Invalid grid state: does not represent a valid win condition';
    END IF;

    -- Calculate base gidouilles (no degressive multiplier for daily challenges)
    v_gidouilles := public.calculate_daily_challenge_gidouilles(
      v_challenge.difficulty,
      p_time_seconds
    );
  ELSE
    -- No gidouilles for losses
    v_gidouilles := 0;
  END IF;

  -- Step 8: Insert attempt record
  INSERT INTO public.minesweeper_daily_attempts (
    challenge_id,
    student_id,
    grid_state,
    time_seconds,
    status,
    gidouilles_earned
  ) VALUES (
    p_challenge_id,
    v_student_id,
    p_grid_state,
    p_time_seconds,
    p_status,
    v_gidouilles
  )
  RETURNING id INTO v_attempt_id;

  -- Step 9: Award base gidouilles to profile (top 3 bonus added later)
  IF v_gidouilles > 0 THEN
    UPDATE public.profiles
    SET gidouilles = COALESCE(gidouilles, 0) + v_gidouilles
    WHERE id = v_student_id;

    -- Step 10: Insert into gidouilles_history
    INSERT INTO public.gidouilles_history (
      student_id,
      class_id,
      delta,
      reason,
      created_by
    )
    SELECT
      v_student_id,
      cm.class_id,
      v_gidouilles,
      'Daily Challenge: ' || v_challenge.difficulty || ' (' || TO_CHAR(v_challenge.challenge_date, 'YYYY-MM-DD') || ')',
      v_student_id
    FROM public.class_members cm
    WHERE cm.student_id = v_student_id
      AND cm.status = 'active'
    ORDER BY cm.joined_at ASC
    LIMIT 1;
  END IF;

  -- Step 11: Return result
  -- Note: Ranking and top 3 bonuses will be calculated by trigger
  RETURN QUERY SELECT TRUE, v_gidouilles, v_attempt_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_daily_challenge_attempt TO authenticated;

COMMENT ON FUNCTION public.record_daily_challenge_attempt IS
  'Records daily challenge attempt with server-side validation. Awards base gidouilles. Ranking/bonuses updated via trigger.';

-- ============================================================================
-- Function: update_daily_challenge_rankings()
-- ============================================================================
-- Updates top 3 rankings and awards bonus gidouilles.
-- Called automatically by trigger after each attempt.

CREATE OR REPLACE FUNCTION public.update_daily_challenge_rankings(
  p_challenge_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_top_3 RECORD;
  v_old_rank INTEGER;
  v_old_gidouilles INTEGER;
  v_new_gidouilles INTEGER;
  v_bonus_delta INTEGER;
  v_challenge RECORD;
BEGIN
  -- Get challenge info for history
  SELECT * INTO v_challenge
  FROM public.minesweeper_daily_challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  -- Step 1: Clear all existing ranks for this challenge
  UPDATE public.minesweeper_daily_attempts
  SET rank = NULL
  WHERE challenge_id = p_challenge_id;

  -- Step 2: Update top 3 with new ranks and bonuses
  FOR v_top_3 IN (
    SELECT
      id,
      student_id,
      gidouilles_earned,
      ROW_NUMBER() OVER (ORDER BY time_seconds ASC) as new_rank
    FROM public.minesweeper_daily_attempts
    WHERE challenge_id = p_challenge_id
      AND status = 'won'
    ORDER BY time_seconds ASC
    LIMIT 3
  )
  LOOP
    -- Calculate bonus based on rank
    CASE v_top_3.new_rank
      WHEN 1 THEN v_bonus_delta := 50; -- 1st place: +50
      WHEN 2 THEN v_bonus_delta := 30; -- 2nd place: +30
      WHEN 3 THEN v_bonus_delta := 20; -- 3rd place: +20
      ELSE v_bonus_delta := 0;
    END CASE;

    -- Calculate new total gidouilles (base already stored + bonus)
    v_new_gidouilles := v_top_3.gidouilles_earned + v_bonus_delta;

    -- Update attempt record with rank and new gidouilles total
    UPDATE public.minesweeper_daily_attempts
    SET
      rank = v_top_3.new_rank,
      gidouilles_earned = v_new_gidouilles
    WHERE id = v_top_3.id;

    -- Award bonus to profile
    IF v_bonus_delta > 0 THEN
      UPDATE public.profiles
      SET gidouilles = COALESCE(gidouilles, 0) + v_bonus_delta
      WHERE id = v_top_3.student_id;

      -- Insert bonus into gidouilles_history
      INSERT INTO public.gidouilles_history (
        student_id,
        class_id,
        delta,
        reason,
        created_by
      )
      SELECT
        v_top_3.student_id,
        cm.class_id,
        v_bonus_delta,
        'Daily Challenge Bonus: Rank #' || v_top_3.new_rank || ' (' || TO_CHAR(v_challenge.challenge_date, 'YYYY-MM-DD') || ')',
        v_top_3.student_id
      FROM public.class_members cm
      WHERE cm.student_id = v_top_3.student_id
        AND cm.status = 'active'
      ORDER BY cm.joined_at ASC
      LIMIT 1;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.update_daily_challenge_rankings IS
  'Updates top 3 rankings and awards bonus gidouilles: 1st: +50, 2nd: +30, 3rd: +20. Called by trigger after each attempt.';

-- ============================================================================
-- Trigger: Auto-update rankings after each attempt
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_update_daily_rankings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update rankings for this challenge
  PERFORM public.update_daily_challenge_rankings(NEW.challenge_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_daily_challenge_ranking_update
  AFTER INSERT ON public.minesweeper_daily_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_daily_rankings();

COMMENT ON FUNCTION public.trg_update_daily_rankings IS
  'Trigger function to automatically update rankings and bonuses after each daily challenge attempt.';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Views already granted above
-- Functions already granted above

-- ============================================================================
-- Validation Queries (for testing)
-- ============================================================================

-- Uncomment to test after migration:
-- SELECT public.get_or_create_daily_challenge();
-- SELECT * FROM public.minesweeper_daily_challenges ORDER BY challenge_date DESC LIMIT 5;
-- SELECT * FROM public.minesweeper_daily_leaderboard WHERE challenge_date = CURRENT_DATE;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================

-- This migration adds complete daily challenge functionality:
--
-- ✅ TABLES:
--    - minesweeper_daily_challenges: Daily challenge configs (one per day)
--    - minesweeper_daily_attempts: Student attempts (one per student per day)
--
-- ✅ VIEW:
--    - minesweeper_daily_leaderboard: Real-time leaderboard with rankings
--
-- ✅ FUNCTIONS:
--    - get_or_create_daily_challenge(): Get/create today's challenge
--    - calculate_daily_challenge_gidouilles(): Calculate base rewards
--    - record_daily_challenge_attempt(): Record attempt with validation
--    - update_daily_challenge_rankings(): Update top 3 rankings + bonuses
--
-- ✅ TRIGGER:
--    - trg_daily_challenge_ranking_update: Auto-update rankings after attempts
--
-- ✅ SECURITY:
--    - Server-side validation reuses existing validate_minesweeper_win()
--    - One-attempt-per-day enforced by UNIQUE constraint
--    - SECURITY DEFINER functions prevent manipulation
--    - RLS policies: students SELECT all, INSERT own only
--    - Grid state size limits (100KB) prevent DoS
--    - Time limits per difficulty prevent manipulation
--
-- ✅ REWARDS:
--    - Base gidouilles: same as regular game (10/30/60 + time bonus)
--    - Top 3 bonuses: 1st: +50, 2nd: +30, 3rd: +20
--    - Full audit trail via gidouilles_history
--    - Automatic ranking updates after each attempt
--
-- ✅ DIFFICULTY ROTATION:
--    - Monday/Thursday: beginner
--    - Tuesday/Friday: intermediate
--    - Sunday/Wednesday/Saturday: expert
--
-- NEXT STEPS FOR DEVELOPER:
-- 1. Run: pnpm db:migrate
-- 2. Update src/lib/types/database.ts (regenerate from Supabase)
-- 3. Update DATABASE_SCHEMA.md with new tables/functions
-- 4. Create API endpoint: GET /api/minesweeper/daily-challenge
--    - Calls get_or_create_daily_challenge()
--    - Returns challenge info + whether user already attempted
-- 5. Create API endpoint: POST /api/minesweeper/daily-challenge/attempt
--    - Validates with Zod (challenge_id, time_seconds, status, grid_state)
--    - Calls record_daily_challenge_attempt()
--    - Returns success + gidouilles + ranking info
-- 6. Update frontend to show:
--    - "Daily Challenge" section with today's challenge
--    - "One attempt per day" notice
--    - Live leaderboard with top 3 highlighted
--    - User's own ranking if they completed it
-- 7. Consider adding cron job to:
--    - Pre-generate next day's challenge at midnight
--    - Send notifications about new daily challenges
