-- ============================================================================
-- Migration: Daily and Weekly Reward Limits System
-- ============================================================================
-- Created: 2026-01-01
--
-- DESCRIPTION:
--   Implements a comprehensive reward system with daily and weekly limits:
--   - Students can earn MAX 1 gidouille per day (across all games)
--   - Weekly bonus = best theoretical reward of the week
--   - Theoretical reward = base × time_mult × (1 - hint_penalty) (WITHOUT daily_mult)
--
-- TABLES CREATED:
--   1. daily_game_rewards     - Tracks each game victory with rewards
--   2. weekly_best_rewards    - Stores weekly best theoretical scores
--
-- RPC FUNCTIONS CREATED:
--   1. record_game_reward()           - Called after each game victory (atomic)
--   2. award_weekly_best_bonuses()    - Called by cron job at week end
--   3. get_student_week_best()        - Utility to get current week's best
--
-- SECURITY MODEL:
--   - All functions use SECURITY DEFINER with explicit permission checks
--   - RLS policies prevent unauthorized access
--   - FOR UPDATE locks ensure atomicity
--
-- NOTES:
--   - Integrates with existing schools.timezone and schools.timetable->week_config
--   - Uses gidouilles_history for audit trail
--   - Designed for both Minesweeper and Riddles (extensible for other games)
-- ============================================================================

-- ============================================================================
-- TABLE 1: daily_game_rewards
-- ============================================================================
-- Tracks each game victory with theoretical and actual rewards.
--
-- BUSINESS RULES:
--   - One row per game victory (unique constraint on game_type + game_id)
--   - theoretical_reward = calculated without daily multiplier
--   - actual_reward = 1 if first win of day, 0 otherwise
--   - is_first_win_of_day = flag for reporting/analytics
--   - week_start = used for weekly aggregation

CREATE TABLE IF NOT EXISTS public.daily_game_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Student reference
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Game date (in school's timezone)
  game_date DATE NOT NULL,

  -- Game identification
  game_type TEXT NOT NULL CHECK (game_type IN ('minesweeper', 'riddle')),
  game_id UUID NOT NULL, -- References minesweeper_matches.id OR riddle_attempts.id

  -- Reward calculation
  theoretical_reward NUMERIC(10,2) NOT NULL CHECK (theoretical_reward >= 0),
  actual_reward NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (actual_reward >= 0),
  is_first_win_of_day BOOLEAN NOT NULL DEFAULT FALSE,

  -- Weekly grouping (for bonus calculation)
  week_start DATE NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_game_reward UNIQUE (student_id, game_type, game_id),
  CONSTRAINT chk_actual_reward_max_1 CHECK (actual_reward <= 1)
);

-- Comments for documentation
COMMENT ON TABLE public.daily_game_rewards IS
'Tracks each game victory with theoretical and actual gidouilles awarded. Enforces 1 gidouille/day limit.';

COMMENT ON COLUMN public.daily_game_rewards.game_date IS
'Date of the game in the school''s timezone (extracted from NOW() AT TIME ZONE timezone)';

COMMENT ON COLUMN public.daily_game_rewards.theoretical_reward IS
'Calculated reward without daily multiplier: base × time_mult × (1 - hint_penalty)';

COMMENT ON COLUMN public.daily_game_rewards.actual_reward IS
'Actual gidouilles awarded: 1 if first win of day, 0 otherwise';

COMMENT ON COLUMN public.daily_game_rewards.week_start IS
'First day of the school week (calculated from week_config.first_day)';

-- ============================================================================
-- TABLE 2: weekly_best_rewards
-- ============================================================================
-- Stores the best theoretical reward for each student per week.
-- Updated on each game victory, awarded by cron job at week end.

CREATE TABLE IF NOT EXISTS public.weekly_best_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Student reference
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Week period
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,

  -- Best reward tracking
  best_theoretical_reward NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (best_theoretical_reward >= 0),
  best_reward_game_type TEXT CHECK (best_reward_game_type IN ('minesweeper', 'riddle')),
  best_reward_game_id UUID,

  -- Bonus awarding
  bonus_awarded NUMERIC(10,2) CHECK (bonus_awarded >= 0),
  bonus_awarded_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_weekly_best UNIQUE (student_id, week_start),
  CONSTRAINT chk_week_end_after_start CHECK (week_end > week_start)
);

-- Comments for documentation
COMMENT ON TABLE public.weekly_best_rewards IS
'Tracks the best theoretical reward each student earned during a week. Bonus awarded at week end.';

COMMENT ON COLUMN public.weekly_best_rewards.best_theoretical_reward IS
'Highest theoretical reward earned this week (without daily multiplier)';

COMMENT ON COLUMN public.weekly_best_rewards.bonus_awarded IS
'Amount of bonus gidouilles awarded at week end (equals best_theoretical_reward)';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Daily game rewards indexes
CREATE INDEX idx_daily_game_rewards_student_date
  ON public.daily_game_rewards(student_id, game_date DESC);

CREATE INDEX idx_daily_game_rewards_week
  ON public.daily_game_rewards(student_id, week_start);

CREATE INDEX idx_daily_game_rewards_game
  ON public.daily_game_rewards(game_type, game_id);

-- Fast lookup for "first win of day" check
CREATE INDEX idx_daily_game_rewards_first_win_check
  ON public.daily_game_rewards(student_id, game_date, is_first_win_of_day)
  WHERE is_first_win_of_day = TRUE;

-- Weekly best rewards indexes
CREATE INDEX idx_weekly_best_rewards_student
  ON public.weekly_best_rewards(student_id);

CREATE INDEX idx_weekly_best_rewards_week
  ON public.weekly_best_rewards(week_start);

-- Fast lookup for unaward bonuses (for cron job)
CREATE INDEX idx_weekly_best_rewards_pending
  ON public.weekly_best_rewards(week_start, bonus_awarded_at)
  WHERE bonus_awarded_at IS NULL;

-- ============================================================================
-- HELPER FUNCTION: Calculate week boundaries
-- ============================================================================
-- Calculates week_start and week_end based on school's week_config.
--
-- PARAMETERS:
--   p_date        (DATE)      - Any date to find the week for
--   p_first_day   (INTEGER)   - First day of week (0=Sunday, 1=Monday, etc.)
--
-- RETURNS:
--   RECORD { week_start DATE, week_end DATE }
--
-- EXAMPLE:
--   For Israeli calendar (Sunday-Thursday):
--     first_day = 0 (Sunday)
--     Input: 2026-01-05 (Monday) → week_start = 2026-01-05 (previous Sunday)

CREATE OR REPLACE FUNCTION public.calculate_week_boundaries(
  p_date DATE,
  p_first_day INTEGER
)
RETURNS TABLE(week_start DATE, week_end DATE)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_dow INTEGER; -- Day of week (0=Sunday, 6=Saturday)
  v_days_since_week_start INTEGER;
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  -- Get day of week (0=Sunday, 6=Saturday)
  v_dow := EXTRACT(DOW FROM p_date)::INTEGER;

  -- Calculate days since week start
  v_days_since_week_start := (v_dow - p_first_day + 7) % 7;

  -- Calculate week boundaries
  v_week_start := p_date - v_days_since_week_start;
  v_week_end := v_week_start + 6;

  RETURN QUERY SELECT v_week_start, v_week_end;
END;
$$;

COMMENT ON FUNCTION public.calculate_week_boundaries IS
'Calculates week start and end dates based on school week configuration (e.g., Sunday-Thursday for Israeli schools)';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.calculate_week_boundaries TO authenticated;

-- ============================================================================
-- RPC FUNCTION 1: record_game_reward
-- ============================================================================
-- Called after each game victory (Minesweeper or Riddle).
-- Atomically checks if this is the first win of the day and awards accordingly.
--
-- PARAMETERS:
--   p_student_id          (UUID)         - Student who won
--   p_game_type           (TEXT)         - 'minesweeper' or 'riddle'
--   p_game_id             (UUID)         - Game ID (match or attempt)
--   p_theoretical_reward  (NUMERIC)      - Reward without daily multiplier
--   p_school_id           (UUID)         - School ID (for timezone/week_config)
--
-- RETURNS:
--   RECORD {
--     actual_reward         NUMERIC(10,2) - Gidouilles awarded (1 or 0)
--     is_first_win          BOOLEAN       - Was this first win of day?
--     week_best_reward      NUMERIC(10,2) - Current best reward this week
--   }
--
-- BUSINESS LOGIC:
--   1. Get school timezone and week_config
--   2. Calculate game_date and week boundaries
--   3. Lock student's rewards for this date (FOR UPDATE)
--   4. Check if first win of day
--   5. Award 1 gidouille if first win, 0 otherwise
--   6. Insert into daily_game_rewards
--   7. Update weekly_best_rewards (keep MAX)
--   8. Insert into gidouilles_history
--   9. Update profiles.gidouilles
--
-- SECURITY:
--   - SECURITY DEFINER: Runs with creator's permissions
--   - Only callable by authenticated students for their own games
--   - Uses FOR UPDATE lock to prevent race conditions

CREATE OR REPLACE FUNCTION public.record_game_reward(
  p_student_id UUID,
  p_game_type TEXT,
  p_game_id UUID,
  p_theoretical_reward NUMERIC,
  p_school_id UUID
)
RETURNS TABLE(
  actual_reward NUMERIC,
  is_first_win BOOLEAN,
  week_best_reward NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timezone TEXT;
  v_first_day INTEGER;
  v_game_date DATE;
  v_week_start DATE;
  v_week_end DATE;
  v_is_first_win BOOLEAN;
  v_actual_reward NUMERIC(10,2);
  v_best_reward NUMERIC(10,2);
  v_student_role TEXT;
BEGIN
  -- Security check: Verify caller is the student
  IF auth.uid() != p_student_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only record rewards for yourself';
  END IF;

  -- Verify caller is a student
  SELECT role INTO v_student_role FROM profiles WHERE id = p_student_id;
  IF v_student_role != 'student' THEN
    RAISE EXCEPTION 'Unauthorized: Only students can earn game rewards';
  END IF;

  -- Validate game_type
  IF p_game_type NOT IN ('minesweeper', 'riddle') THEN
    RAISE EXCEPTION 'Invalid game_type: must be minesweeper or riddle, got %', p_game_type;
  END IF;

  -- Validate theoretical_reward
  IF p_theoretical_reward < 0 OR p_theoretical_reward > 1000 THEN
    RAISE EXCEPTION 'Invalid theoretical_reward: must be between 0 and 1000, got %', p_theoretical_reward;
  END IF;

  -- Get school configuration
  SELECT timezone, COALESCE(timetable->>'week_config'->>'first_day', '1')::INTEGER
  INTO v_timezone, v_first_day
  FROM schools
  WHERE id = p_school_id;

  IF v_timezone IS NULL THEN
    RAISE EXCEPTION 'School % not found', p_school_id;
  END IF;

  -- Calculate game date in school timezone
  v_game_date := (NOW() AT TIME ZONE v_timezone)::DATE;

  -- Calculate week boundaries
  SELECT w.week_start, w.week_end
  INTO v_week_start, v_week_end
  FROM calculate_week_boundaries(v_game_date, COALESCE(v_first_day, 1)) w;

  -- ATOMIC CHECK: Is this the first win of the day?
  -- Lock all rewards for this student on this date to prevent race conditions
  SELECT NOT EXISTS (
    SELECT 1
    FROM daily_game_rewards
    WHERE student_id = p_student_id
      AND game_date = v_game_date
      AND is_first_win_of_day = TRUE
    FOR UPDATE
  ) INTO v_is_first_win;

  -- Calculate actual reward
  v_actual_reward := CASE WHEN v_is_first_win THEN 1 ELSE 0 END;

  -- Insert reward record
  INSERT INTO daily_game_rewards (
    student_id,
    game_date,
    game_type,
    game_id,
    theoretical_reward,
    actual_reward,
    is_first_win_of_day,
    week_start
  ) VALUES (
    p_student_id,
    v_game_date,
    p_game_type,
    p_game_id,
    p_theoretical_reward,
    v_actual_reward,
    v_is_first_win,
    v_week_start
  );

  -- Update weekly best rewards (UPSERT)
  INSERT INTO weekly_best_rewards (
    student_id,
    week_start,
    week_end,
    best_theoretical_reward,
    best_reward_game_type,
    best_reward_game_id
  ) VALUES (
    p_student_id,
    v_week_start,
    v_week_end,
    p_theoretical_reward,
    p_game_type,
    p_game_id
  )
  ON CONFLICT (student_id, week_start)
  DO UPDATE SET
    best_theoretical_reward = GREATEST(
      weekly_best_rewards.best_theoretical_reward,
      EXCLUDED.best_theoretical_reward
    ),
    best_reward_game_type = CASE
      WHEN EXCLUDED.best_theoretical_reward > weekly_best_rewards.best_theoretical_reward
      THEN EXCLUDED.best_reward_game_type
      ELSE weekly_best_rewards.best_reward_game_type
    END,
    best_reward_game_id = CASE
      WHEN EXCLUDED.best_theoretical_reward > weekly_best_rewards.best_theoretical_reward
      THEN EXCLUDED.best_reward_game_id
      ELSE weekly_best_rewards.best_reward_game_id
    END,
    updated_at = NOW()
  RETURNING best_theoretical_reward INTO v_best_reward;

  -- Award gidouilles if first win
  IF v_is_first_win THEN
    -- Update profile
    UPDATE profiles
    SET gidouilles = gidouilles + v_actual_reward
    WHERE id = p_student_id;

    -- Log in history
    INSERT INTO gidouilles_history (
      student_id,
      class_id,
      delta,
      reason,
      created_by
    ) VALUES (
      p_student_id,
      NULL, -- No specific class for game rewards
      v_actual_reward::INTEGER,
      'daily_game_reward:' || p_game_type,
      NULL -- System-generated
    );
  END IF;

  -- Return results
  RETURN QUERY SELECT v_actual_reward, v_is_first_win, v_best_reward;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.record_game_reward TO authenticated;

COMMENT ON FUNCTION public.record_game_reward IS
'Records a game victory and awards gidouilles. Enforces 1 gidouille/day limit. Atomically checks for first win.';

-- ============================================================================
-- RPC FUNCTION 2: award_weekly_best_bonuses
-- ============================================================================
-- Called by cron job at the end of each week.
-- Awards bonus = best theoretical reward of the week.
--
-- PARAMETERS:
--   p_week_start (DATE) - Start of week to award bonuses for
--   p_week_end   (DATE) - End of week
--
-- RETURNS:
--   INTEGER - Number of bonuses awarded
--
-- BUSINESS LOGIC:
--   1. Find all students with unaward bonuses for this week
--   2. For each student:
--      - Award bonus = best_theoretical_reward
--      - Update profile gidouilles
--      - Insert into gidouilles_history
--      - Mark bonus as awarded
--   3. Return count of bonuses awarded
--
-- SECURITY:
--   - SECURITY DEFINER: Runs with creator's permissions
--   - Only callable by service role or admins (checked explicitly)

CREATE OR REPLACE FUNCTION public.award_weekly_best_bonuses(
  p_week_start DATE,
  p_week_end DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_bonus_count INTEGER := 0;
  v_record RECORD;
BEGIN
  -- Security check: Only admins or service role can call this
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF auth.uid() IS NOT NULL AND v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can award weekly bonuses';
  END IF;

  -- Validate week boundaries
  IF p_week_end <= p_week_start THEN
    RAISE EXCEPTION 'Invalid week boundaries: end (%) must be after start (%)', p_week_end, p_week_start;
  END IF;

  -- Process each student with pending bonus
  FOR v_record IN
    SELECT
      student_id,
      best_theoretical_reward
    FROM weekly_best_rewards
    WHERE week_start = p_week_start
      AND week_end = p_week_end
      AND bonus_awarded_at IS NULL
      AND best_theoretical_reward > 0
    FOR UPDATE
  LOOP
    -- Update profile gidouilles
    UPDATE profiles
    SET gidouilles = gidouilles + v_record.best_theoretical_reward
    WHERE id = v_record.student_id;

    -- Log in history
    INSERT INTO gidouilles_history (
      student_id,
      class_id,
      delta,
      reason,
      created_by
    ) VALUES (
      v_record.student_id,
      NULL,
      v_record.best_theoretical_reward::INTEGER,
      'weekly_best_game_bonus',
      NULL -- System-generated
    );

    -- Mark bonus as awarded
    UPDATE weekly_best_rewards
    SET
      bonus_awarded = v_record.best_theoretical_reward,
      bonus_awarded_at = NOW(),
      updated_at = NOW()
    WHERE student_id = v_record.student_id
      AND week_start = p_week_start;

    v_bonus_count := v_bonus_count + 1;
  END LOOP;

  RETURN v_bonus_count;
END;
$$;

-- Grant execute to authenticated users (permission check inside function)
GRANT EXECUTE ON FUNCTION public.award_weekly_best_bonuses TO authenticated;

COMMENT ON FUNCTION public.award_weekly_best_bonuses IS
'Awards weekly bonuses to all students. Called by cron job. Only admins/service role can execute.';

-- ============================================================================
-- RPC FUNCTION 3: get_student_week_best
-- ============================================================================
-- Utility function to retrieve current week's best reward for a student.
--
-- PARAMETERS:
--   p_student_id (UUID) - Student to query
--   p_school_id  (UUID) - School (for timezone/week_config)
--
-- RETURNS:
--   RECORD {
--     best_theoretical_reward NUMERIC(10,2)
--     week_start              DATE
--     week_end                DATE
--   }
--
-- USAGE:
--   Used by frontend to display "your best this week" information

CREATE OR REPLACE FUNCTION public.get_student_week_best(
  p_student_id UUID,
  p_school_id UUID
)
RETURNS TABLE(
  best_theoretical_reward NUMERIC,
  week_start DATE,
  week_end DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timezone TEXT;
  v_first_day INTEGER;
  v_current_date DATE;
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  -- Security check: Students can only query themselves, teachers/admins can query their students
  IF auth.uid() != p_student_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    ) THEN
      RAISE EXCEPTION 'Unauthorized: You can only query your own data';
    END IF;
  END IF;

  -- Get school configuration
  SELECT timezone, COALESCE(timetable->>'week_config'->>'first_day', '1')::INTEGER
  INTO v_timezone, v_first_day
  FROM schools
  WHERE id = p_school_id;

  IF v_timezone IS NULL THEN
    RAISE EXCEPTION 'School % not found', p_school_id;
  END IF;

  -- Calculate current week boundaries
  v_current_date := (NOW() AT TIME ZONE v_timezone)::DATE;
  SELECT w.week_start, w.week_end
  INTO v_week_start, v_week_end
  FROM calculate_week_boundaries(v_current_date, COALESCE(v_first_day, 1)) w;

  -- Return best reward for current week
  RETURN QUERY
  SELECT
    COALESCE(wbr.best_theoretical_reward, 0::NUMERIC),
    v_week_start,
    v_week_end
  FROM weekly_best_rewards wbr
  WHERE wbr.student_id = p_student_id
    AND wbr.week_start = v_week_start
  UNION ALL
  SELECT 0::NUMERIC, v_week_start, v_week_end
  WHERE NOT EXISTS (
    SELECT 1 FROM weekly_best_rewards
    WHERE student_id = p_student_id AND week_start = v_week_start
  )
  LIMIT 1;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_student_week_best TO authenticated;

COMMENT ON FUNCTION public.get_student_week_best IS
'Returns the best theoretical reward earned by a student during the current week';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.daily_game_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_best_rewards ENABLE ROW LEVEL SECURITY;

-- ===== DAILY GAME REWARDS POLICIES =====

-- Students can view their own rewards
CREATE POLICY "Students can view own daily rewards"
  ON public.daily_game_rewards
  FOR SELECT
  USING (student_id = auth.uid());

-- Service role can insert rewards (via RPC function)
CREATE POLICY "Service role can insert daily rewards"
  ON public.daily_game_rewards
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Teachers can view their students' rewards
CREATE POLICY "Teachers can view student daily rewards"
  ON public.daily_game_rewards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = daily_game_rewards.student_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all daily rewards"
  ON public.daily_game_rewards
  FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ===== WEEKLY BEST REWARDS POLICIES =====

-- Students can view their own weekly best
CREATE POLICY "Students can view own weekly best"
  ON public.weekly_best_rewards
  FOR SELECT
  USING (student_id = auth.uid());

-- Service role can insert/update weekly best (via RPC function)
CREATE POLICY "Service role can manage weekly best"
  ON public.weekly_best_rewards
  FOR ALL
  WITH CHECK (student_id = auth.uid());

-- Teachers can view their students' weekly best
CREATE POLICY "Teachers can view student weekly best"
  ON public.weekly_best_rewards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = weekly_best_rewards.student_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all weekly best"
  ON public.weekly_best_rewards
  FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

-- Update updated_at on weekly_best_rewards
CREATE OR REPLACE FUNCTION public.update_weekly_best_rewards_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_weekly_best_rewards_timestamp
  BEFORE UPDATE ON public.weekly_best_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_weekly_best_rewards_timestamp();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant SELECT on tables to authenticated users (RLS controls access)
GRANT SELECT ON public.daily_game_rewards TO authenticated;
GRANT SELECT ON public.weekly_best_rewards TO authenticated;

-- INSERT/UPDATE/DELETE controlled by RLS policies
GRANT INSERT ON public.daily_game_rewards TO authenticated;
GRANT INSERT, UPDATE ON public.weekly_best_rewards TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_tables_count INTEGER;
  v_functions_count INTEGER;
  v_indexes_count INTEGER;
BEGIN
  -- Count created objects
  SELECT COUNT(*) INTO v_tables_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('daily_game_rewards', 'weekly_best_rewards');

  SELECT COUNT(*) INTO v_functions_count
  FROM pg_proc
  WHERE proname IN (
    'record_game_reward',
    'award_weekly_best_bonuses',
    'get_student_week_best',
    'calculate_week_boundaries'
  );

  SELECT COUNT(*) INTO v_indexes_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('daily_game_rewards', 'weekly_best_rewards');

  -- Report migration results
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Complete: Daily/Weekly Reward Limits';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created: % (expected: 2)', v_tables_count;
  RAISE NOTICE 'Functions created: % (expected: 4)', v_functions_count;
  RAISE NOTICE 'Indexes created: % (expected: 7)', v_indexes_count;
  RAISE NOTICE '========================================';

  -- Verify all objects created
  IF v_tables_count = 2 AND v_functions_count = 4 THEN
    RAISE NOTICE 'SUCCESS: All objects created successfully';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Run: pnpm db:migrate';
    RAISE NOTICE '2. Update: src/lib/types/database.ts';
    RAISE NOTICE '3. Update: docs/architecture/database-schema.md';
    RAISE NOTICE '';
    RAISE NOTICE 'USAGE:';
    RAISE NOTICE '- Call record_game_reward() after each Minesweeper/Riddle victory';
    RAISE NOTICE '- Schedule award_weekly_best_bonuses() in cron job at week end';
    RAISE NOTICE '- Use get_student_week_best() to display current week progress';
  ELSE
    RAISE WARNING 'INCOMPLETE: Some objects may not have been created';
  END IF;

  RAISE NOTICE '========================================';
END;
$$ LANGUAGE plpgsql;
