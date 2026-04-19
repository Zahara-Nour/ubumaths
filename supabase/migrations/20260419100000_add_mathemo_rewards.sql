-- ============================================================================
-- Migration: Add Mathemo rewards system
-- Created: 2026-04-19
-- ============================================================================
-- CHANGES:
--   1. Add 'mathemo' to CHECK constraints on daily_game_rewards and weekly_best_rewards
--   2. Create mathemo_scores table
--   3. Create upsert_mathemo_score() RPC
--   4. Update record_game_reward() to accept 'mathemo'
--   5. Update award_weekly_best_bonuses() notification labels
--   6. Update generate_reward_event_description() with mathemo cases
--   7. Add 'mathemo' to achievements context CHECK + insert milestones
-- ============================================================================

-- ============================================================================
-- 1. Add 'mathemo' to CHECK constraints
-- ============================================================================

ALTER TABLE public.daily_game_rewards
  DROP CONSTRAINT IF EXISTS daily_game_rewards_game_type_check;

ALTER TABLE public.daily_game_rewards
  ADD CONSTRAINT daily_game_rewards_game_type_check
  CHECK (game_type IN ('minesweeper', 'riddle', '2048', 'mathemo'));

ALTER TABLE public.weekly_best_rewards
  DROP CONSTRAINT IF EXISTS weekly_best_rewards_best_reward_game_type_check;

ALTER TABLE public.weekly_best_rewards
  ADD CONSTRAINT weekly_best_rewards_best_reward_game_type_check
  CHECK (best_reward_game_type IN ('minesweeper', 'riddle', '2048', 'mathemo'));

-- ============================================================================
-- 2. Create mathemo_scores table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mathemo_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    games_played INTEGER NOT NULL DEFAULT 0 CHECK (games_played >= 0),
    games_won INTEGER NOT NULL DEFAULT 0 CHECK (games_won >= 0),
    best_word_length INTEGER NOT NULL DEFAULT 0 CHECK (best_word_length >= 0),
    first_try_count INTEGER NOT NULL DEFAULT 0 CHECK (first_try_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_mathemo_scores UNIQUE(user_id)
);

COMMENT ON TABLE public.mathemo_scores IS 'User scores and statistics for the Mathemo game';
COMMENT ON COLUMN public.mathemo_scores.games_played IS 'Total number of games completed';
COMMENT ON COLUMN public.mathemo_scores.games_won IS 'Total number of games won';
COMMENT ON COLUMN public.mathemo_scores.best_word_length IS 'Longest word successfully guessed';
COMMENT ON COLUMN public.mathemo_scores.first_try_count IS 'Number of times word was guessed on first attempt';

-- Indexes
CREATE INDEX idx_mathemo_scores_games_won ON public.mathemo_scores(games_won DESC);
CREATE INDEX idx_mathemo_scores_recent ON public.mathemo_scores(updated_at DESC);

-- RLS
ALTER TABLE public.mathemo_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view mathemo scores"
ON public.mathemo_scores
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Students can insert own mathemo scores"
ON public.mathemo_scores
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'student'
    )
);

CREATE POLICY "Students can update own mathemo scores"
ON public.mathemo_scores
FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'student'
    )
)
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'student'
    )
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_mathemo_scores_updated_at ON public.mathemo_scores;
CREATE TRIGGER trigger_update_mathemo_scores_updated_at
    BEFORE UPDATE ON public.mathemo_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

GRANT SELECT, INSERT, UPDATE ON public.mathemo_scores TO authenticated;

-- ============================================================================
-- 3. Create upsert_mathemo_score() RPC
-- ============================================================================

DROP FUNCTION IF EXISTS upsert_mathemo_score(uuid, integer, boolean, boolean);

CREATE OR REPLACE FUNCTION upsert_mathemo_score(
    p_user_id uuid,
    p_word_length integer,
    p_won boolean,
    p_found_first_try boolean
)
RETURNS TABLE(
    games_played integer,
    games_won integer,
    best_word_length integer,
    first_try_count integer,
    is_new_best_length boolean
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
DECLARE
    v_old_best integer;
    v_new_best integer;
BEGIN
    -- Security check: Verify caller is the user
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only update your own scores';
    END IF;

    INSERT INTO mathemo_scores (
        user_id,
        games_played,
        games_won,
        best_word_length,
        first_try_count
    )
    VALUES (
        p_user_id,
        1,
        CASE WHEN p_won THEN 1 ELSE 0 END,
        CASE WHEN p_won THEN p_word_length ELSE 0 END,
        CASE WHEN p_found_first_try THEN 1 ELSE 0 END
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        games_played = mathemo_scores.games_played + 1,
        games_won = mathemo_scores.games_won + CASE WHEN p_won THEN 1 ELSE 0 END,
        best_word_length = CASE WHEN p_won
            THEN GREATEST(mathemo_scores.best_word_length, p_word_length)
            ELSE mathemo_scores.best_word_length
        END,
        first_try_count = mathemo_scores.first_try_count + CASE WHEN p_found_first_try THEN 1 ELSE 0 END
    RETURNING
        mathemo_scores.games_played,
        mathemo_scores.games_won,
        mathemo_scores.best_word_length,
        mathemo_scores.first_try_count
    INTO games_played, games_won, v_new_best, first_try_count;

    best_word_length := v_new_best;
    is_new_best_length := (p_won AND p_word_length >= v_new_best);

    RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_mathemo_score(uuid, integer, boolean, boolean) TO authenticated;

COMMENT ON FUNCTION upsert_mathemo_score IS
'Atomically inserts or updates a Mathemo game score record.
Returns games_played, games_won, best_word_length, first_try_count, and is_new_best_length flag.';

-- ============================================================================
-- 4. Update record_game_reward() to accept 'mathemo'
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

  -- Validate game_type (CHANGED: added 'mathemo')
  IF p_game_type NOT IN ('minesweeper', 'riddle', '2048', 'mathemo') THEN
    RAISE EXCEPTION 'Invalid game_type: must be minesweeper, riddle, 2048, or mathemo, got %', p_game_type;
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

  -- Update weekly best rewards (UPSERT - best PER GAME TYPE)
  INSERT INTO weekly_best_rewards (
    student_id, week_start, week_end,
    best_theoretical_reward, best_reward_game_type, best_reward_game_id
  ) VALUES (
    p_student_id, v_week_start, v_week_end,
    p_theoretical_reward, p_game_type, p_game_id
  )
  ON CONFLICT (student_id, week_start, best_reward_game_type)
  DO UPDATE SET
    best_theoretical_reward = GREATEST(
      weekly_best_rewards.best_theoretical_reward,
      EXCLUDED.best_theoretical_reward
    ),
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
'Records a game victory and awards gidouilles. Enforces 1 gidouille/day PER GAME TYPE. Tracks weekly best PER GAME TYPE. Includes class_id for teacher audit trail visibility.';

-- ============================================================================
-- 5. Update award_weekly_best_bonuses() notification labels
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
  -- Notification grouping
  v_notif_data JSONB := '{}'::JSONB;
  v_student_id UUID;
  v_game_entry RECORD;
  v_total_reward NUMERIC;
  v_game_label TEXT;
  v_message TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF auth.uid() IS NOT NULL AND v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can award weekly bonuses';
  END IF;

  IF p_week_end <= p_week_start THEN
    RAISE EXCEPTION 'Invalid week boundaries: end (%) must be after start (%)', p_week_end, p_week_start;
  END IF;

  FOR v_record IN
    SELECT student_id, best_reward_game_type, best_theoretical_reward
    FROM weekly_best_rewards
    WHERE week_start = p_week_start
      AND week_end = p_week_end
      AND bonus_awarded_at IS NULL
      AND best_theoretical_reward > 0
    ORDER BY student_id, best_reward_game_type
    FOR UPDATE
  LOOP
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
      'weekly_best_game_bonus:' || v_record.best_reward_game_type, NULL
    );

    UPDATE weekly_best_rewards
    SET bonus_awarded = v_record.best_theoretical_reward,
        bonus_awarded_at = NOW(),
        updated_at = NOW()
    WHERE student_id = v_record.student_id
      AND week_start = p_week_start
      AND best_reward_game_type = v_record.best_reward_game_type;

    IF NOT v_notif_data ? v_record.student_id::TEXT THEN
      v_notif_data := v_notif_data || jsonb_build_object(
        v_record.student_id::TEXT,
        jsonb_build_array(jsonb_build_object(
          'game', v_record.best_reward_game_type,
          'reward', v_record.best_theoretical_reward
        ))
      );
    ELSE
      v_notif_data := jsonb_set(
        v_notif_data,
        ARRAY[v_record.student_id::TEXT],
        (v_notif_data -> v_record.student_id::TEXT) || jsonb_build_array(jsonb_build_object(
          'game', v_record.best_reward_game_type,
          'reward', v_record.best_theoretical_reward
        ))
      );
    END IF;

    v_bonus_count := v_bonus_count + 1;
  END LOOP;

  FOR v_student_id IN
    SELECT key::UUID FROM jsonb_each(v_notif_data) AS kv(key, value)
  LOOP
    v_total_reward := 0;
    v_message := E'Récompenses hebdomadaires pour tes jeux :\n\n';

    FOR v_game_entry IN
      SELECT value FROM jsonb_array_elements(v_notif_data -> v_student_id::TEXT) AS value
    LOOP
      -- CHANGED: added 'mathemo' label
      v_game_label := CASE (v_game_entry.value ->> 'game')
        WHEN 'minesweeper' THEN 'Démineur'
        WHEN 'riddle' THEN 'Énigme'
        WHEN '2048' THEN '2048'
        WHEN 'mathemo' THEN 'Mathémo'
        ELSE (v_game_entry.value ->> 'game')
      END;
      v_message := v_message || format(
        E'  • %s : %s gidouille(s)\n',
        v_game_label,
        ROUND((v_game_entry.value ->> 'reward')::NUMERIC, 2)
      );
      v_total_reward := v_total_reward + (v_game_entry.value ->> 'reward')::NUMERIC;
    END LOOP;

    v_message := v_message || format(
      E'\nTotal : %s gidouille(s) pour la semaine du %s au %s.\nContinue comme ça !',
      ROUND(v_total_reward, 2),
      TO_CHAR(p_week_start, 'DD/MM/YYYY'),
      TO_CHAR(p_week_end, 'DD/MM/YYYY')
    );

    INSERT INTO notifications (
      title, message, type, is_system,
      system_event_type, target_type, target_user_ids
    ) VALUES (
      'Récompense hebdomadaire Jeux',
      v_message,
      'info',
      true,
      'weekly_best_bonus',
      'users',
      ARRAY[v_student_id]
    );
  END LOOP;

  RETURN v_bonus_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_weekly_best_bonuses TO authenticated;

COMMENT ON FUNCTION public.award_weekly_best_bonuses IS
'Awards weekly best game bonuses per game type. Each game type gets its own bonus. Sends one grouped notification per student.';

-- ============================================================================
-- 6. Update generate_reward_event_description() with mathemo cases
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_reward_event_description(
    p_source_table TEXT,
    p_reason TEXT,
    p_delta NUMERIC DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_source_table IN ('gidouilles_history', 'gidouilles_activity') THEN
        IF p_reason IS NULL OR p_reason = '' THEN
            IF p_delta IS NOT NULL AND p_delta > 0 THEN
                RETURN 'Gidouilles gagnées';
            ELSIF p_delta IS NOT NULL AND p_delta < 0 THEN
                RETURN 'Gidouilles dépensées';
            ELSE
                RETURN 'Modification de gidouilles';
            END IF;
        END IF;

        CASE p_reason
            WHEN 'weekly_no_warning' THEN RETURN 'Récompense hebdomadaire (0 avertissement)';
            WHEN 'weekly_best_game_bonus' THEN RETURN 'Récompense hebdomadaire pour les jeux';
            -- Per-game weekly bonus
            WHEN 'weekly_best_game_bonus:minesweeper' THEN RETURN 'Démineur : récompense hebdomadaire';
            WHEN 'weekly_best_game_bonus:riddle' THEN RETURN 'Énigme : récompense hebdomadaire';
            WHEN 'weekly_best_game_bonus:2048' THEN RETURN '2048 : récompense hebdomadaire';
            WHEN 'weekly_best_game_bonus:mathemo' THEN RETURN 'Mathémo : récompense hebdomadaire';
            -- Daily rewards
            WHEN 'minesweeper_victory' THEN RETURN 'Victoire au démineur';
            WHEN 'minesweeper_hint' THEN RETURN 'Indice démineur';
            WHEN 'daily_game_reward:minesweeper' THEN RETURN 'Démineur : récompense quotidienne';
            WHEN 'daily_game_reward:riddle' THEN RETURN 'Énigme : récompense quotidienne';
            WHEN 'daily_game_reward:2048' THEN RETURN '2048 : récompense quotidienne';
            WHEN 'daily_game_reward:mathemo' THEN RETURN 'Mathémo : récompense quotidienne';
            -- Other
            WHEN 'shop_purchase' THEN RETURN 'Achat en boutique';
            WHEN 'Modifié par professeur' THEN RETURN 'Modifié par professeur';
            ELSE RETURN p_reason;
        END CASE;
    END IF;

    IF p_source_table = 'bonus_history' THEN
        IF p_reason IS NULL OR p_reason = '' THEN
            IF p_delta IS NOT NULL AND p_delta > 0 THEN
                RETURN 'Bonus gagné';
            ELSIF p_delta IS NOT NULL AND p_delta < 0 THEN
                RETURN 'Bonus utilisé';
            ELSE
                RETURN 'Modification de bonus';
            END IF;
        END IF;
        RETURN p_reason;
    END IF;

    IF p_source_table = 'vip_cards_activity' THEN
        CASE p_reason
            WHEN 'drawn' THEN RETURN 'Carte VIP obtenue';
            WHEN 'used' THEN RETURN 'Carte VIP utilisée';
            WHEN 'traded' THEN RETURN 'Carte VIP échangée';
            WHEN 'gained' THEN RETURN 'Carte VIP reçue';
            ELSE RETURN COALESCE(p_reason, 'Activité carte VIP');
        END CASE;
    END IF;

    RETURN COALESCE(p_reason, 'Événement de récompense');
END;
$$;

-- ============================================================================
-- 7. Add 'mathemo' to achievements context CHECK + insert milestones
-- ============================================================================

ALTER TABLE public.achievements
  DROP CONSTRAINT IF EXISTS achievements_context_check;

ALTER TABLE public.achievements
  ADD CONSTRAINT achievements_context_check
  CHECK (context IN ('minesweeper', 'questions', 'assessments', 'srs', 'riddles', 'social', 'meta', 'system', '2048', 'mathemo'));

INSERT INTO achievements (id, context, category, name, description, icon, unlock_type, metadata)
VALUES
  ('mathemo_first_win', 'mathemo', 'milestone', 'Premiere victoire', 'Gagner une partie de Mathemo', '🎯', 'event_based', '{"gidouilles_reward": 2}'::jsonb),
  ('mathemo_10_games', 'mathemo', 'milestone', '10 parties', 'Jouer 10 parties de Mathemo', '🎮', 'progressive', '{"gidouilles_reward": 2}'::jsonb),
  ('mathemo_50_games', 'mathemo', 'milestone', '50 parties', 'Jouer 50 parties de Mathemo', '🎯', 'progressive', '{"gidouilles_reward": 5}'::jsonb),
  ('mathemo_long_word', 'mathemo', 'milestone', 'Mot de champion', 'Trouver un mot de 10 lettres ou plus', '📏', 'event_based', '{"gidouilles_reward": 3}'::jsonb),
  ('mathemo_first_try', 'mathemo', 'milestone', 'Premier essai', 'Trouver le mot au premier essai', '⚡', 'event_based', '{"gidouilles_reward": 5}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration: Mathemo Rewards System';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Changes applied:';
  RAISE NOTICE '  1. CHECK constraints updated to include mathemo';
  RAISE NOTICE '  2. mathemo_scores table created';
  RAISE NOTICE '  3. upsert_mathemo_score() RPC created';
  RAISE NOTICE '  4. record_game_reward() updated to accept mathemo';
  RAISE NOTICE '  5. award_weekly_best_bonuses() updated with Mathemo label';
  RAISE NOTICE '  6. generate_reward_event_description() updated';
  RAISE NOTICE '  7. 5 Mathemo achievements inserted';
  RAISE NOTICE '========================================';
END;
$$;
