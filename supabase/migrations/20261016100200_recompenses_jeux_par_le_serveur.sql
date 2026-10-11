-- Récompenses des jeux enregistrées par le serveur — étape 1 sur 2.
--
-- Constat (audit de #1132) : `record_game_reward` est exécutable par tout compte
-- connecté, et sa garde ne vérifiait que `auth.uid() = p_student_id`. Un élève
-- pouvait donc l'appeler lui-même et s'attribuer, chaque jour, la gidouille de
-- chaque type de jeu (y compris 'minesweeper' et 'riddle', sans jouer), ainsi
-- qu'un « meilleur score de la semaine » forgé jusqu'à 1000. De plus,
-- `NULL != x` vaut NULL : un appel sans `auth.uid()` passait la garde.
--
-- Question d'accès (tranchée par David, 2026-10-12) : la récompense est calculée
-- et enregistrée par le serveur (2048, Mathémo), jamais par l'élève.
--
-- Étape 1 (ici, compatible avec le code en prod) : la garde n'accepte plus que
-- le serveur (`service_role`) ou l'élève lui-même, et refuse l'appel sans
-- identité. Corps identique à la prod (md5 144585b62670d5a1948871e59b654fda)
-- sauf ces trois lignes.
-- Étape 2 (APRÈS le deploy:prod du code qui passe par le client service) :
--   REVOKE EXECUTE ON FUNCTION public.record_game_reward(uuid, text, uuid, numeric, uuid)
--     FROM authenticated;
--
-- Qui perd quoi : l'appel sans identité (aucun usage légitime). Élèves, prof,
-- admin : rien à cette étape.
--
-- Rollback : remettre la garde d'origine dans le même corps :
--   IF auth.uid() != p_student_id THEN
--     RAISE EXCEPTION 'Unauthorized: You can only record rewards for yourself';
--   END IF;

CREATE OR REPLACE FUNCTION public.record_game_reward(p_student_id uuid, p_game_type text, p_game_id uuid, p_theoretical_reward numeric, p_school_id uuid)
 RETURNS TABLE(actual_reward numeric, is_first_win boolean, week_best_reward numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  IF coalesce((SELECT auth.role()), '') <> 'service_role'
     AND (SELECT auth.uid()) IS DISTINCT FROM p_student_id THEN
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
$function$;
