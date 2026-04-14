-- ============================================================================
-- Migration: Add 2048 gidouilles rewards + per-game daily cap
-- Created: 2026-04-14
-- ============================================================================
-- CHANGES:
--   1a. Add '2048' to CHECK constraints on daily_game_rewards and weekly_best_rewards
--   1b. Modify record_game_reward() to accept '2048' and make daily cap per-game
--   1c. Update partial index to include game_type
--   1d. Fix award_weekly_best_bonuses() notification text (generic, not "Demineur")
--   1e. Insert 2048 achievements into game_achievements
-- ============================================================================

-- ============================================================================
-- 1a. Add '2048' to CHECK constraints
-- ============================================================================

ALTER TABLE public.daily_game_rewards
  DROP CONSTRAINT IF EXISTS daily_game_rewards_game_type_check;

ALTER TABLE public.daily_game_rewards
  ADD CONSTRAINT daily_game_rewards_game_type_check
  CHECK (game_type IN ('minesweeper', 'riddle', '2048'));

ALTER TABLE public.weekly_best_rewards
  DROP CONSTRAINT IF EXISTS weekly_best_rewards_best_reward_game_type_check;

ALTER TABLE public.weekly_best_rewards
  ADD CONSTRAINT weekly_best_rewards_best_reward_game_type_check
  CHECK (best_reward_game_type IN ('minesweeper', 'riddle', '2048'));

-- ============================================================================
-- 1b. Modify record_game_reward() - accept '2048' + per-game daily cap
-- ============================================================================

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
  v_class_id UUID;
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

  -- Validate game_type (CHANGED: added '2048')
  IF p_game_type NOT IN ('minesweeper', 'riddle', '2048') THEN
    RAISE EXCEPTION 'Invalid game_type: must be minesweeper, riddle, or 2048, got %', p_game_type;
  END IF;

  -- Validate theoretical_reward
  IF p_theoretical_reward < 0 OR p_theoretical_reward > 1000 THEN
    RAISE EXCEPTION 'Invalid theoretical_reward: must be between 0 and 1000, got %', p_theoretical_reward;
  END IF;

  -- Get student's active class_id for audit trail visibility
  SELECT cm.class_id INTO v_class_id
  FROM class_members cm
  WHERE cm.student_id = p_student_id
    AND cm.status = 'active'
  LIMIT 1;

  -- Get school configuration
  SELECT timezone, COALESCE((timetable->'week_config'->>'first_day')::INTEGER, 1)
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

  -- ATOMIC CHECK: Is this the first win of the day FOR THIS GAME TYPE?
  -- CHANGED: Added game_type filter for per-game daily cap
  SELECT NOT EXISTS (
    SELECT 1
    FROM daily_game_rewards
    WHERE student_id = p_student_id
      AND game_date = v_game_date
      AND game_type = p_game_type
      AND is_first_win_of_day = TRUE
    FOR UPDATE
  ) INTO v_is_first_win;

  -- Calculate actual reward
  v_actual_reward := CASE WHEN v_is_first_win THEN 1 ELSE 0 END;

  -- Insert reward record
  INSERT INTO daily_game_rewards (
    student_id, game_date, game_type, game_id,
    theoretical_reward, actual_reward, is_first_win_of_day, week_start
  ) VALUES (
    p_student_id, v_game_date, p_game_type, p_game_id,
    p_theoretical_reward, v_actual_reward, v_is_first_win, v_week_start
  );

  -- Update weekly best rewards (UPSERT - global best across all game types)
  INSERT INTO weekly_best_rewards (
    student_id, week_start, week_end,
    best_theoretical_reward, best_reward_game_type, best_reward_game_id
  ) VALUES (
    p_student_id, v_week_start, v_week_end,
    p_theoretical_reward, p_game_type, p_game_id
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

    -- Log in activity with class_id for teacher visibility
    INSERT INTO gidouilles_activity (
      student_id, class_id, delta, reason, created_by
    ) VALUES (
      p_student_id, v_class_id, v_actual_reward::INTEGER,
      'daily_game_reward:' || p_game_type, NULL
    );
  END IF;

  -- Return results
  RETURN QUERY SELECT v_actual_reward, v_is_first_win, v_best_reward;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_game_reward TO authenticated;

COMMENT ON FUNCTION public.record_game_reward IS
'Records a game victory and awards gidouilles. Enforces 1 gidouille/day PER GAME TYPE. Includes class_id for teacher audit trail visibility.';

-- ============================================================================
-- 1c. Update partial index to include game_type
-- ============================================================================

DROP INDEX IF EXISTS idx_daily_game_rewards_first_win_check;

CREATE INDEX idx_daily_game_rewards_first_win_check
  ON public.daily_game_rewards(student_id, game_date, game_type, is_first_win_of_day)
  WHERE is_first_win_of_day = TRUE;

-- ============================================================================
-- 1d. Fix award_weekly_best_bonuses() notification text
-- ============================================================================

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
  v_class_id UUID;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF auth.uid() IS NOT NULL AND v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can award weekly bonuses';
  END IF;

  IF p_week_end <= p_week_start THEN
    RAISE EXCEPTION 'Invalid week boundaries: end (%) must be after start (%)', p_week_end, p_week_start;
  END IF;

  FOR v_record IN
    SELECT student_id, best_theoretical_reward
    FROM weekly_best_rewards
    WHERE week_start = p_week_start
      AND week_end = p_week_end
      AND bonus_awarded_at IS NULL
      AND best_theoretical_reward > 0
    FOR UPDATE
  LOOP
    -- Resolve class_id from class_members (first active class)
    SELECT cm.class_id INTO v_class_id
    FROM class_members cm
    WHERE cm.student_id = v_record.student_id
      AND cm.status = 'active'
    LIMIT 1;

    UPDATE profiles
    SET gidouilles = gidouilles + v_record.best_theoretical_reward
    WHERE id = v_record.student_id;

    INSERT INTO gidouilles_activity (
      student_id, class_id, delta, reason, created_by
    ) VALUES (
      v_record.student_id, v_class_id,
      v_record.best_theoretical_reward,
      'weekly_best_game_bonus', NULL
    );

    UPDATE weekly_best_rewards
    SET bonus_awarded = v_record.best_theoretical_reward,
        bonus_awarded_at = NOW(),
        updated_at = NOW()
    WHERE student_id = v_record.student_id
      AND week_start = p_week_start;

    -- CHANGED: Generic notification text (not "Demineur")
    INSERT INTO notifications (
      title, message, type, is_system,
      system_event_type, target_type, target_user_ids
    ) VALUES (
      'Recompense hebdomadaire Jeux',
      format(
        E'Recompense hebdomadaire pour tes jeux.\n\n' ||
        E'Tu as recu %s gidouille(s) pour ta meilleure performance ' ||
        E'de la semaine du %s au %s.\n\n' ||
        E'Continue comme ca !',
        ROUND(v_record.best_theoretical_reward, 2),
        TO_CHAR(p_week_start, 'DD/MM/YYYY'),
        TO_CHAR(p_week_end, 'DD/MM/YYYY')
      ),
      'info',
      true,
      'weekly_best_bonus',
      'users',
      ARRAY[v_record.student_id]
    );

    v_bonus_count := v_bonus_count + 1;
  END LOOP;

  RETURN v_bonus_count;
END;
$$;

-- ============================================================================
-- 1e. Insert 2048 achievements
-- ============================================================================

INSERT INTO game_achievements (slug, name, description, category, requirement_type, requirement_value, gidouilles_reward, icon_url)
VALUES
  ('2048_first_2048', 'Premiere tuile 2048', 'Atteindre la tuile 2048 pour la premiere fois', '2048', 'milestone', 2048, 5, '/achievements/2048.svg'),
  ('2048_first_4096', 'Premiere tuile 4096', 'Atteindre la tuile 4096 pour la premiere fois', '2048', 'milestone', 4096, 10, '/achievements/4096.svg'),
  ('2048_10_games', '10 parties', 'Jouer 10 parties de 2048', '2048', 'games_played', 10, 2, '/achievements/10games.svg'),
  ('2048_50_games', '50 parties', 'Jouer 50 parties de 2048', '2048', 'games_played', 50, 5, '/achievements/50games.svg'),
  ('2048_score_50k', 'Score 50 000', 'Atteindre un score de 50 000 points', '2048', 'best_score', 50000, 3, '/achievements/50k.svg')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration: 2048 Gidouilles + Per-Game Daily Cap';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Changes applied:';
  RAISE NOTICE '  1a. CHECK constraints updated to include 2048';
  RAISE NOTICE '  1b. record_game_reward() now accepts 2048 + per-game daily cap';
  RAISE NOTICE '  1c. Partial index updated with game_type column';
  RAISE NOTICE '  1d. award_weekly_best_bonuses() notification is now generic';
  RAISE NOTICE '  1e. 5 achievements for 2048 inserted';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'IMPACT: Daily cap is now PER GAME TYPE';
  RAISE NOTICE '  - Students can earn 1g/day from minesweeper + 1g/day from 2048 + 1g/day from riddles';
  RAISE NOTICE '========================================';
END;
$$;
