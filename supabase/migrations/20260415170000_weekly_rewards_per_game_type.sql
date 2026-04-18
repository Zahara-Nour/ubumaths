-- ============================================================================
-- Migration: Weekly best rewards per game type
-- Date: 2026-04-15
-- Purpose: Change weekly_best_rewards from one global best per student per week
--          to one best per game type per student per week.
-- ============================================================================

-- ============================================================================
-- PART 1: Schema changes
-- ============================================================================

-- 1a. Ensure best_reward_game_type is NOT NULL (required for unique constraint)
UPDATE public.weekly_best_rewards
SET best_reward_game_type = 'minesweeper'
WHERE best_reward_game_type IS NULL;

ALTER TABLE public.weekly_best_rewards
  ALTER COLUMN best_reward_game_type SET NOT NULL;

-- 1b. Drop old unique constraint and create new per-game-type one
ALTER TABLE public.weekly_best_rewards
  DROP CONSTRAINT unique_weekly_best;

ALTER TABLE public.weekly_best_rewards
  ADD CONSTRAINT unique_weekly_best UNIQUE (student_id, week_start, best_reward_game_type);

-- ============================================================================
-- PART 2: Recreate record_game_reward() with per-game UPSERT
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

  -- Validate game_type
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
-- PART 3: Recreate award_weekly_best_bonuses() with per-game awards
--         and grouped notification per student
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

  -- Loop per-game rows (multiple rows per student possible)
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
    -- Resolve class_id from class_members (first active class)
    SELECT cm.class_id INTO v_class_id
    FROM class_members cm
    WHERE cm.student_id = v_record.student_id
      AND cm.status = 'active'
    LIMIT 1;

    -- Award gidouilles
    UPDATE profiles
    SET gidouilles = gidouilles + v_record.best_theoretical_reward
    WHERE id = v_record.student_id;

    -- Log per-game reason
    INSERT INTO gidouilles_activity (
      student_id, class_id, delta, reason, created_by
    ) VALUES (
      v_record.student_id, v_class_id,
      v_record.best_theoretical_reward,
      'weekly_best_game_bonus:' || v_record.best_reward_game_type, NULL
    );

    -- Mark this specific game row as awarded
    UPDATE weekly_best_rewards
    SET bonus_awarded = v_record.best_theoretical_reward,
        bonus_awarded_at = NOW(),
        updated_at = NOW()
    WHERE student_id = v_record.student_id
      AND week_start = p_week_start
      AND best_reward_game_type = v_record.best_reward_game_type;

    -- Accumulate notification data per student
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

  -- Send ONE grouped notification per student
  FOR v_student_id IN
    SELECT key::UUID FROM jsonb_each(v_notif_data) AS kv(key, value)
  LOOP
    v_total_reward := 0;
    v_message := E'Récompenses hebdomadaires pour tes jeux :\n\n';

    FOR v_game_entry IN
      SELECT value FROM jsonb_array_elements(v_notif_data -> v_student_id::TEXT) AS value
    LOOP
      v_game_label := CASE (v_game_entry.value ->> 'game')
        WHEN 'minesweeper' THEN 'Démineur'
        WHEN 'riddle' THEN 'Énigme'
        WHEN '2048' THEN '2048'
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

GRANT EXECUTE ON FUNCTION public.award_weekly_best_bonuses TO authenticated;

COMMENT ON FUNCTION public.award_weekly_best_bonuses IS
'Awards weekly best game bonuses per game type. Each game type gets its own bonus. Sends one grouped notification per student.';

-- ============================================================================
-- PART 4: Update generate_reward_event_description() with per-game weekly cases
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
    -- Handle gidouilles_activity (renamed from gidouilles_history)
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

        -- Translate common reasons
        CASE p_reason
            WHEN 'weekly_no_warning' THEN RETURN 'Récompense hebdomadaire (0 avertissement)';
            -- Legacy: old weekly bonus entries (global, before per-game tracking)
            WHEN 'weekly_best_game_bonus' THEN RETURN 'Récompense hebdomadaire pour les jeux';
            -- Per-game weekly bonus
            WHEN 'weekly_best_game_bonus:minesweeper' THEN RETURN 'Démineur : récompense hebdomadaire';
            WHEN 'weekly_best_game_bonus:riddle' THEN RETURN 'Énigme : récompense hebdomadaire';
            WHEN 'weekly_best_game_bonus:2048' THEN RETURN '2048 : récompense hebdomadaire';
            -- Daily rewards
            WHEN 'minesweeper_victory' THEN RETURN 'Victoire au démineur';
            WHEN 'minesweeper_hint' THEN RETURN 'Indice démineur';
            WHEN 'daily_game_reward:minesweeper' THEN RETURN 'Démineur : récompense quotidienne';
            WHEN 'daily_game_reward:riddle' THEN RETURN 'Énigme : récompense quotidienne';
            WHEN 'daily_game_reward:2048' THEN RETURN '2048 : récompense quotidienne';
            -- Other
            WHEN 'shop_purchase' THEN RETURN 'Achat en boutique';
            WHEN 'Modifié par professeur' THEN RETURN 'Modifié par professeur';
            ELSE RETURN p_reason;
        END CASE;
    END IF;

    -- Handle bonus_history
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

    -- Handle vip_cards_activity
    IF p_source_table = 'vip_cards_activity' THEN
        CASE p_reason
            WHEN 'drawn' THEN RETURN 'Carte VIP obtenue';
            WHEN 'used' THEN RETURN 'Carte VIP utilisée';
            WHEN 'traded' THEN RETURN 'Carte VIP échangée';
            WHEN 'gained' THEN RETURN 'Carte VIP reçue';
            ELSE RETURN COALESCE(p_reason, 'Activité carte VIP');
        END CASE;
    END IF;

    -- Default: return reason or generic message
    RETURN COALESCE(p_reason, 'Événement de récompense');
END;
$$;

-- ============================================================================
-- PART 5: Fix existing reward_events with old weekly_best_game_bonus description
-- ============================================================================

-- Update old entries that still show 'Récompense hebdomadaire pour le jeu Démineur.'
-- to the new generic text (since we don't know which game they were for)
UPDATE public.reward_events
SET description = 'Récompense hebdomadaire pour les jeux'
WHERE description = 'Récompense hebdomadaire pour le jeu Démineur.';

UPDATE public.reward_events
SET description = 'Récompense hebdomadaire pour les jeux'
WHERE description = 'weekly_best_game_bonus';

-- ============================================================================
-- PART 6: Verification
-- ============================================================================

DO $$
BEGIN
  -- Verify the new unique constraint includes game_type
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'weekly_best_rewards'
      AND c.conname = 'unique_weekly_best'
      AND array_length(c.conkey, 1) = 3
  ) THEN
    RAISE EXCEPTION 'unique_weekly_best constraint should have 3 columns';
  END IF;

  -- Verify column is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_best_rewards'
    AND column_name = 'best_reward_game_type'
    AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'best_reward_game_type should be NOT NULL';
  END IF;

  RAISE NOTICE 'Migration verified: weekly_best_rewards now tracks per game type';
END;
$$;
