-- ============================================================================
-- Énigmes : une tentative ne s'écrit plus que par le serveur (1/2)
-- ============================================================================
--
-- Constat (audit de #1077, 2026-10-11, mesuré en prod) : la policy « Students can create
-- own attempts » laisse l'élève insérer via PostgREST une tentative avec `is_correct` et
-- `gidouilles_awarded` de son choix — il se met en tête du classement de son école.
-- (`submit_riddle_attempt`, qui prend aussi `p_is_correct` de l'appelant, est traitée en
-- deux temps : la route passe au client service dans la même PR, puis une 2ᵉ migration
-- retire EXECUTE à `authenticated` après le `deploy:prod`.)
-- La vue `riddle_progress` n'a plus de lecteur depuis #1079 (le classement passe par
-- `riddle_school_leaderboard`) ; elle reste lisible par tout compte connecté.
--
-- Décision de David (2026-10-11) : correction des énigmes côté serveur seulement ;
-- retirer l'accès à la vue, sans la supprimer.
--
-- Qui perd quoi : l'élève ne peut plus insérer lui-même une tentative (aucun code ne le
-- faisait : la soumission passe par `submit_riddle_attempt`, SECURITY DEFINER) ; les
-- comptes connectés et anon ne lisent plus `riddle_progress`. Personne ne gagne d'accès.
-- Aucune donnée touchée (prod : `riddle_attempts` vide).
--
-- Garde de `submit_riddle_attempt` rendue explicite (security-auditor) : client service ou
-- l'élève lui-même, plus rien d'autre — un appel sans auth.uid() passait par accident.
-- Corps inchangé par ailleurs (copié de la prod, md5 vérifié identique au local).
--
-- Prouvé par tests/integration/enigmes-tentatives-par-le-serveur.test.ts.
--
-- ROLLBACK :
--   CREATE POLICY "Students can create own attempts" ON public.riddle_attempts
--     FOR INSERT WITH CHECK ((student_id = auth.uid()) AND is_student());
--   GRANT ALL ON public.riddle_progress TO authenticated;  -- (anon n'avait déjà plus SELECT)
--   submit_riddle_attempt : remettre la garde `IF auth.uid() != p_student_id THEN RAISE ...`
--   (corps identique sinon ; md5(prosrc) d'avant = f90b2823ddc0bef3b307580ad5eed903).
-- ============================================================================

DROP POLICY "Students can create own attempts" ON public.riddle_attempts;

REVOKE ALL ON public.riddle_progress FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_riddle_attempt(p_riddle_id uuid, p_student_id uuid, p_submitted_answer jsonb, p_is_correct boolean DEFAULT NULL::boolean)
 RETURNS TABLE(attempt_id uuid, theoretical_reward numeric, actual_reward numeric, is_first_win boolean, week_best_reward numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_attempt_number INTEGER;
  v_difficulty INTEGER;
  v_theoretical_gidouilles NUMERIC(10,2);
  v_actual_gidouilles NUMERIC(10,2);
  v_is_first_win BOOLEAN;
  v_week_best NUMERIC(10,2);
  v_attempt_id UUID;
  v_school_id UUID;
  v_daily_result RECORD;
BEGIN
  -- Appelant : le client service (route api/riddles/[id]/submit, qui corrige) ou l'élève
  -- lui-même. Explicite : l'ancienne garde `auth.uid() != p_student_id` laissait passer
  -- tout appel où auth.uid() est nul, la fonction ne tenait que par ses droits.
  IF coalesce((SELECT auth.role()), '') <> 'service_role'
     AND (SELECT auth.uid()) IS DISTINCT FROM p_student_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only submit attempts for yourself';
  END IF;

  -- Get riddle difficulty
  SELECT difficulty INTO v_difficulty
  FROM riddles
  WHERE id = p_riddle_id;

  IF v_difficulty IS NULL THEN
    RAISE EXCEPTION 'Riddle not found';
  END IF;

  -- Get student's school_id
  SELECT DISTINCT c.school_id INTO v_school_id
  FROM class_members cm
  JOIN classes c ON c.id = cm.class_id
  WHERE cm.student_id = p_student_id
    AND cm.status = 'active'
  LIMIT 1;

  -- Get next attempt number
  v_attempt_number := public.get_next_riddle_attempt_number(p_riddle_id, p_student_id);

  -- Calculate theoretical gidouilles (only if correct)
  IF p_is_correct = true THEN
    v_theoretical_gidouilles := public.calculate_riddle_gidouilles(v_difficulty, v_attempt_number)::NUMERIC(10,2);
  ELSE
    v_theoretical_gidouilles := 0;
  END IF;

  -- Create attempt record first (to get the attempt_id for record_game_reward)
  INSERT INTO riddle_attempts (
    riddle_id,
    student_id,
    attempt_number,
    submitted_answer,
    is_correct,
    gidouilles_awarded,  -- Will be updated after record_game_reward
    validated_at
  ) VALUES (
    p_riddle_id,
    p_student_id,
    v_attempt_number,
    p_submitted_answer,
    p_is_correct,
    0,  -- Temporary, will update
    CASE WHEN p_is_correct IS NOT NULL THEN now() ELSE NULL END
  )
  RETURNING id INTO v_attempt_id;

  -- If correct and has school, use daily limit system
  IF p_is_correct = true AND v_theoretical_gidouilles > 0 AND v_school_id IS NOT NULL THEN
    SELECT * INTO v_daily_result
    FROM public.record_game_reward(
      p_student_id,
      'riddle',
      v_attempt_id,
      v_theoretical_gidouilles,
      v_school_id
    );

    v_actual_gidouilles := COALESCE(v_daily_result.actual_reward, 0);
    v_is_first_win := COALESCE(v_daily_result.is_first_win, FALSE);
    v_week_best := COALESCE(v_daily_result.week_best_reward, v_theoretical_gidouilles);

    -- Update attempt with actual reward
    UPDATE riddle_attempts
    SET gidouilles_awarded = v_actual_gidouilles::INTEGER
    WHERE id = v_attempt_id;
  ELSE
    v_actual_gidouilles := 0;
    v_is_first_win := FALSE;
    v_week_best := 0;
  END IF;

  -- Return results
  RETURN QUERY SELECT
    v_attempt_id,
    v_theoretical_gidouilles,
    v_actual_gidouilles,
    v_is_first_win,
    v_week_best;
END;
$function$;
