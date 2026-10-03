-- =============================================================================
-- Succès : gidouilles réellement versées, succès déjà obtenu ignoré proprement ;
-- copie d'un modèle de message : modèle personnel sans classe
-- =============================================================================
--
-- Décisions de David (2026-10-03) :
--
-- Q146 (a) — Les gidouilles annoncées par un succès (`gidouilles_reward` du
--   catalogue, recopié dans `student_achievements.gidouilles_awarded`) sont
--   VERSÉES par le serveur. `process_achievement_event` enregistrait le montant
--   sans créditer `profiles.gidouilles`. Le versement se fait désormais dans la
--   MÊME transaction que l'enregistrement du succès, par la fonction de crédit
--   existante `update_student_gidouilles(uuid, uuid, integer, text, uuid)` :
--   elle crédite le profil ET écrit `gidouilles_activity`, dont le trigger
--   `trigger_log_gidouilles_to_events` alimente `reward_events` (journal de
--   l'élève, solde affiché) — exactement comme les récompenses hebdomadaires.
--   Sa garde laisse passer un appelant NULL (client service) ; or
--   `process_achievement_event` n'est exécutable que par service_role depuis le
--   lot 3. Raison journalisée : « Succès : <nom du succès> ».
--   Prod au 2026-10-03 : 0 ligne dans student_achievements → aucun rattrapage.
--
-- Q153 — Un second événement identique pour le même élève plantait sur
--   l'index unique `idx_unique_student_achievement` : le contrôle « déjà
--   obtenu » comparait `context_data` à `v_context_data` alors que la ligne
--   enregistrée contient en plus `reference_type` / `reference_id`. Le contrôle
--   compare maintenant les MÊMES clés que l'index unique (difficulty, subject,
--   tier, iteration), et l'INSERT porte `ON CONFLICT DO NOTHING` (course entre
--   deux appels simultanés) : seul un succès réellement inséré est annoncé et
--   versé. Un succès n'est donc versé qu'une fois.
--
-- Q154 (a) — `duplicate_template` échouait toujours (23514
--   `message_templates_check` : scope 'class' avec class_id NULL). Valeurs de
--   scope existantes : 'system' et 'class' seulement. La copie devient un
--   modèle PERSONNEL : scope 'class', class_id NULL. La contrainte est élargie
--   pour l'accepter (elle accepte un modèle 'class' sans classe). La garde du
--   lot 2 (p_user_id = auth.uid() ET prof/admin, ou serveur) est conservée ;
--   le corps de la fonction est INCHANGÉ (il insérait déjà ces valeurs).
--
-- Q157 — `minesweeper_first_win` (condition params.won = true) ne se débloque
--   plus sur une défaite : la condition `won` est évaluée.
--
-- Audit A — Succès `difficulty_specific` / `subject_specific` : la difficulté
--   (beginner, intermediate, expert) et la matière (8 thèmes de
--   src/lib/config/tutor-help-methods.ts) sont contrôlées sur une liste
--   FERMÉE ; une valeur inventée ne débloque rien (sinon un succès par valeur).
--
-- Q158 — Supprimer un modèle de message échouait toujours (FK de
--   template_audit_log sur le modèle effacé, journalisé par le trigger AFTER
--   DELETE). La trace 'deleted' est écrite avec template_id NULL et l'id
--   d'origine dans metadata. Ni FK ni trigger modifiés.
--
-- Audit B — update_student_gidouilles (5 args) : un compte connecté SANS
--   profil passait la garde (rôle NULL → condition NULL → pas d'exception).
--   COALESCE(v_caller_role, '') le refuse.
--
-- Qui perd quel accès : un compte connecté sans profil ne crédite plus de
--   gidouilles (il le pouvait par défaut de garde).
--
-- Qui gagne quel accès : personne.
--   * Un modèle 'class' sans classe est lu/modifié par son auteur (policies
--     teacher_manage_class_templates / teacher_view_system_templates :
--     scope 'class' AND created_by = auth.uid()) et par l'admin ; un élève ne
--     le voit pas (student_view_templates exige class_id IN ses classes
--     actives, faux pour NULL) ; get_templates_for_context ne le choisit pas
--     (exige t.class_id = p_class_id). Aucune policy n'est touchée.
--   * Les élèves gagnent des gidouilles qu'on leur annonçait déjà.
--
-- ⚠️ La migration contient `ALTER TABLE … DROP CONSTRAINT` (remplacement de
--   la contrainte par une version PLUS LARGE, dans la même transaction) :
--   aucune donnée perdue, aucune ligne existante ne peut violer la nouvelle.
--
-- Corps repris de la prod (pg_get_functiondef local, md5(prosrc) local = prod
-- vérifié le 2026-10-03) : process_achievement_event
-- 78b1ad798bb41d54cb9e2c7e084cd607, auto_log_template_changes
-- 034e37d72fe626946edad5fd11f1191a, update_student_gidouilles(5 args)
-- df540176c353b6d9010fa43abdb5ef7d. Seules les modifications ci-dessus sont
-- apportées (balisées « Q146 », « Q153 », « Q157 », « Audit A/B », « Q158 »). Droits inchangés (CREATE OR
-- REPLACE conserve proacl : process_achievement_event {postgres, service_role} ;
-- update_student_gidouilles(5 args) {postgres, authenticated, service_role}, un élève
-- étant refusé par la garde de rôle).
--
-- Lot 4 (20261003210000) : search_path des fonctions SECURITY DEFINER figé à
-- « public, pg_temp ». Les deux fonctions DEFINER recréées ici le gardent
-- (process_achievement_event, update_student_gidouilles 5 args) ; le rollback
-- les remet dans cet état. auto_log_template_changes (INVOKER, non touchée par
-- le lot 4) garde son search_path de prod. Cette migration part APRÈS le lot 4.
--
-- Ordre de livraison : indépendant. Le code (écran des modèles ; routes 2048 et
-- Mathémo, qui créditent par la version à 5 arguments, déjà en prod) marche
-- avant comme après la migration.
--
-- Tests : tests/integration/succes-gidouilles.test.ts
--
-- =============================================================================
-- ROLLBACK (intégral)
-- =============================================================================
-- 1. Contrainte (⚠️ échoue s'il existe des modèles 'class' sans classe : les
--    rattacher à une classe ou les supprimer d'abord — perte de données,
--    à décider avec David) :
--
-- ALTER TABLE public.message_templates DROP CONSTRAINT message_templates_check;
-- ALTER TABLE public.message_templates ADD CONSTRAINT message_templates_check
--   CHECK ((((scope = 'system'::text) AND (class_id IS NULL))
--     OR ((scope = 'class'::text) AND (class_id IS NOT NULL))));
--
-- 2. process_achievement_event : rejouer le CREATE OR REPLACE FUNCTION de
--    supabase/migrations/20260616220000_baseline_schema.sql (corps identique à
--    la prod, md5 78b1ad798bb41d54cb9e2c7e084cd607), puis :
-- REVOKE EXECUTE ON FUNCTION public.process_achievement_event(text, uuid, jsonb)
--   FROM PUBLIC, anon, authenticated;
-- ALTER FUNCTION public.process_achievement_event(text, uuid, jsonb)
--   SET search_path = public, pg_temp;   -- état laissé par le lot 4
--    (Les gidouilles déjà versées restent sur les profils, tracées dans
--    gidouilles_activity / reward_events.)
--
-- 3. auto_log_template_changes (corps de prod exact, md5 034e37d72fe626946edad5fd11f1191a
--    vérifié en rejouant ce rollback en local) :
--
-- CREATE OR REPLACE FUNCTION public.auto_log_template_changes()
--  RETURNS trigger
--  LANGUAGE plpgsql
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
-- BEGIN
--   IF TG_OP = 'INSERT' THEN
--     PERFORM log_template_action(NEW.id, 'created', NEW.created_by);
--   ELSIF TG_OP = 'UPDATE' THEN
--     PERFORM log_template_action(
--       NEW.id,
--       'updated',
--       NEW.created_by,
--       jsonb_build_object(
--         'old', row_to_json(OLD),
--         'new', row_to_json(NEW)
--       )
--     );
--   ELSIF TG_OP = 'DELETE' THEN
--     PERFORM log_template_action(OLD.id, 'deleted', OLD.created_by);
--   END IF;
--
--   RETURN COALESCE(NEW, OLD);
-- END;
-- $function$;
--    (Les traces 'deleted' déjà écrites restent, template_id NULL.)
--
-- 4. update_student_gidouilles (5 args) : rejouer le CREATE OR REPLACE de la
--    fin de ce fichier en remplaçant les deux « COALESCE(v_caller_role, '') »
--    par « v_caller_role » et en retirant la ligne de commentaire « Audit B »
--    (rend le corps de prod exact, md5 df540176c353b6d9010fa43abdb5ef7d,
--    vérifié en rejouant ce rollback en local), avec
--    SET search_path TO 'public', 'pg_temp' (état laissé par le lot 4).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Q154 : la copie d'un modèle est un modèle personnel ('class', sans classe)
-- -----------------------------------------------------------------------------
ALTER TABLE public.message_templates DROP CONSTRAINT message_templates_check;
ALTER TABLE public.message_templates ADD CONSTRAINT message_templates_check
  CHECK (
    ((scope = 'system'::text) AND (class_id IS NULL))
    -- Modèle de classe ; class_id NULL = modèle personnel (copie non rattachée)
    OR (scope = 'class'::text)
  );

COMMENT ON CONSTRAINT message_templates_check ON public.message_templates IS
  'system : sans classe. class : rattaché à une classe, ou personnel (class_id NULL, visible de son auteur et de l''admin seulement).';

-- -----------------------------------------------------------------------------
-- Q146 + Q153 : process_achievement_event
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_achievement_event(p_event_type text, p_student_id uuid, p_event_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_event_id UUID;
  v_achievement RECORD;
  v_unlocked_achievements JSONB[] := ARRAY[]::JSONB[];
  v_unlock_conditions JSONB;
  v_context_data JSONB;
  v_should_unlock BOOLEAN;
  v_points INTEGER;
  v_gidouilles INTEGER;
  -- Q146 : classe active de l'élève (journal des gidouilles) et ligne insérée
  v_class_id UUID;
  v_student_achievement_id UUID;
BEGIN
  -- Insert event into log
  INSERT INTO achievement_events (event_type, event_data, student_id)
  VALUES (p_event_type, p_event_data, p_student_id)
  RETURNING id INTO v_event_id;

  -- Q146 : classe ACTIVE de l'élève, comme log_achievements_to_events (NULL
  -- si hors classe : le versement a lieu quand même).
  SELECT class_id INTO v_class_id
  FROM class_members
  WHERE student_id = p_student_id
    AND status = 'active'
  ORDER BY joined_at DESC
  LIMIT 1;

  -- Find achievements that might be triggered by this event
  FOR v_achievement IN
    SELECT *
    FROM achievements
    WHERE is_active = true
    AND unlock_type IN ('automatic', 'event_based')
    AND (
      -- Match by event type in unlock conditions
      metadata->'unlock_conditions'->>'type' = p_event_type
      OR
      -- Match by context
      context = split_part(p_event_type, '_', 1)
    )
    ORDER BY display_order
  LOOP
    v_unlock_conditions := v_achievement.metadata->'unlock_conditions';
    v_should_unlock := false;
    v_context_data := '{}'::jsonb;

    -- Check if prerequisites are met
    IF NOT check_achievement_prerequisites(p_student_id, v_achievement.id) THEN
      CONTINUE;
    END IF;

    -- Evaluate unlock conditions based on event type
    CASE
      -- Minesweeper achievements
      WHEN p_event_type = 'minesweeper_game_completed' THEN
        -- Check difficulty-specific achievements
        IF v_achievement.metadata->>'difficulty_specific' = 'true' THEN
          v_context_data := jsonb_build_object('difficulty', p_event_data->>'difficulty');
        END IF;

        -- Check unlock parameters
        v_should_unlock := true;

        -- Check min_score requirement
        IF v_unlock_conditions->'params'->>'min_score' IS NOT NULL THEN
          v_should_unlock := v_should_unlock AND
            (p_event_data->>'score')::INTEGER >= (v_unlock_conditions->'params'->>'min_score')::INTEGER;
        END IF;

        -- Check max_time requirement
        IF v_unlock_conditions->'params'->>'max_time' IS NOT NULL THEN
          v_should_unlock := v_should_unlock AND
            (p_event_data->>'time_seconds')::INTEGER <= (v_unlock_conditions->'params'->>'max_time')::INTEGER;
        END IF;

        -- Check perfect requirement
        IF v_unlock_conditions->'params'->>'perfect' = 'true' THEN
          v_should_unlock := v_should_unlock AND
            p_event_data->>'perfect' = 'true';
        END IF;

        -- Q157 : une condition « victoire » (minesweeper_first_win) exige
        -- won = true dans l'événement ; une défaite ne débloque rien.
        IF v_unlock_conditions->'params'->>'won' = 'true' THEN
          v_should_unlock := v_should_unlock AND
            COALESCE(p_event_data->>'won', '') = 'true';
        END IF;

        -- Audit A : succès par difficulté → liste FERMÉE ; une difficulté
        -- inventée ne débloque rien (elle ouvrirait un succès par valeur).
        IF v_achievement.metadata->>'difficulty_specific' = 'true'
           AND COALESCE(p_event_data->>'difficulty', '') NOT IN ('beginner', 'intermediate', 'expert') THEN
          v_should_unlock := false;
        END IF;

      -- Questions/Assessments achievements
      WHEN p_event_type IN ('question_answered', 'assessment_completed') THEN
        -- Check subject-specific achievements
        IF v_achievement.metadata->>'subject_specific' = 'true' THEN
          v_context_data := jsonb_build_object('subject', p_event_data->>'subject');
        END IF;

        -- For progressive achievements, update progress instead
        IF v_achievement.unlock_type = 'progressive' THEN
          PERFORM update_achievement_progress(
            p_student_id,
            v_achievement.id,
            1,  -- Increment by 1
            p_event_data->>'subject'
          );
          CONTINUE;  -- Skip direct unlock
        END IF;

        -- Check accuracy requirement
        IF v_unlock_conditions->'params'->>'min_accuracy' IS NOT NULL THEN
          v_should_unlock :=
            (p_event_data->>'accuracy')::NUMERIC >= (v_unlock_conditions->'params'->>'min_accuracy')::NUMERIC;
        END IF;

        -- Audit A : succès par matière → liste FERMÉE (thèmes de
        -- src/lib/config/tutor-help-methods.ts) ; une matière inventée ne
        -- débloque rien.
        IF v_achievement.metadata->>'subject_specific' = 'true'
           AND COALESCE(p_event_data->>'subject', '') NOT IN (
             'arithmetic', 'algebra', 'geometry', 'functions',
             'calculus', 'statistics', 'logic', 'proofs'
           ) THEN
          v_should_unlock := false;
        END IF;

      -- Social achievements
      WHEN p_event_type = 'friend_added' THEN
        v_should_unlock := true;

        -- Check if repeatable
        IF v_achievement.metadata->>'repeatable' = 'true' THEN
          -- Count current iterations
          DECLARE
            v_current_iterations INTEGER;
            v_max_repetitions INTEGER;
          BEGIN
            SELECT COUNT(*) INTO v_current_iterations
            FROM student_achievements
            WHERE student_id = p_student_id
            AND achievement_id = v_achievement.id;

            v_max_repetitions := COALESCE((v_achievement.metadata->>'max_repetitions')::INTEGER, 999);

            IF v_current_iterations >= v_max_repetitions THEN
              v_should_unlock := false;
            ELSE
              v_context_data := jsonb_build_object('iteration', v_current_iterations + 1);
            END IF;
          END;
        END IF;

      ELSE
        -- Generic event processing
        v_should_unlock := v_unlock_conditions->>'type' = p_event_type;
    END CASE;

    -- If should unlock, award the achievement
    IF v_should_unlock THEN
      -- Q153 : « déjà obtenu » se juge sur les MÊMES clés que l'index unique
      -- idx_unique_student_achievement. La ligne enregistrée porte en plus
      -- reference_type / reference_id : la comparer en entier à
      -- v_context_data ne la reconnaissait jamais.
      IF NOT EXISTS (
        SELECT 1 FROM student_achievements
        WHERE student_id = p_student_id
        AND achievement_id = v_achievement.id
        AND COALESCE(context_data->>'difficulty', '') = COALESCE(v_context_data->>'difficulty', '')
        AND COALESCE(context_data->>'subject', '') = COALESCE(v_context_data->>'subject', '')
        AND COALESCE(context_data->>'tier', '') = COALESCE(v_context_data->>'tier', '')
        AND COALESCE(context_data->>'iteration', '') = COALESCE(v_context_data->>'iteration', '')
      ) THEN
        -- Calculate rewards
        v_points := COALESCE((v_achievement.metadata->>'points')::INTEGER, 0);
        v_gidouilles := COALESCE((v_achievement.metadata->>'gidouilles_reward')::INTEGER, 0);

        -- Award achievement
        v_student_achievement_id := NULL;
        INSERT INTO student_achievements (
          student_id,
          achievement_id,
          context_data,
          points_awarded,
          gidouilles_awarded,
          unlock_reason
        )
        VALUES (
          p_student_id,
          v_achievement.id,
          v_context_data || jsonb_build_object(
            'reference_type', p_event_type,
            'reference_id', p_event_data->>'reference_id'
          ),
          v_points,
          v_gidouilles,
          format('Event: %s', p_event_type)
        )
        -- Q153 : un appel concurrent l'a inséré entre-temps → ni annonce ni
        -- versement.
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_student_achievement_id;

        IF v_student_achievement_id IS NULL THEN
          CONTINUE;
        END IF;

        -- Q146 : verser les gidouilles annoncées, dans cette transaction, par
        -- la fonction de crédit commune (profil + gidouilles_activity →
        -- reward_events). Appelant NULL (service) : sa garde laisse passer.
        IF v_gidouilles > 0 THEN
          PERFORM update_student_gidouilles(
            p_student_id,
            v_class_id,
            v_gidouilles,
            format('Succès : %s', v_achievement.name),
            NULL
          );
        END IF;

        -- Add to unlocked list
        v_unlocked_achievements := array_append(
          v_unlocked_achievements,
          jsonb_build_object(
            'achievement_id', v_achievement.id,
            'name', v_achievement.name,
            'description', v_achievement.description,
            'icon', v_achievement.icon,
            'points', v_points,
            'gidouilles', v_gidouilles,
            'context_data', v_context_data
          )
        );
      END IF;
    END IF;
  END LOOP;

  -- Mark event as processed
  UPDATE achievement_events
  SET
    processed = true,
    processed_at = NOW()
  WHERE id = v_event_id;

  -- Return newly unlocked achievements
  RETURN jsonb_build_object(
    'event_id', v_event_id,
    'unlocked_achievements', to_jsonb(v_unlocked_achievements),
    'count', array_length(v_unlocked_achievements, 1)
  );
END;
$function$
;

-- Droits : inchangés par CREATE OR REPLACE ; réaffirmés (leçon d'août).
REVOKE EXECUTE ON FUNCTION public.process_achievement_event(text, uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Q158 : supprimer un modèle de message échouait toujours
-- -----------------------------------------------------------------------------
-- Le trigger AFTER DELETE journalisait le modèle supprimé avec template_id =
-- OLD.id : la FK template_audit_log_template_id_fkey refuse une ligne qui
-- pointe vers un modèle déjà effacé, et la suppression entière était annulée.
-- La trace 'deleted' est gardée SANS la référence bloquante : template_id NULL,
-- id et titre d'origine dans metadata. Auteur de la trace : celui qui supprime
-- (auth.uid()), à défaut l'auteur du modèle (appel serveur).
-- Aucune FK ni aucun trigger modifié : seul le corps de la fonction change.
-- Corps repris de la prod (md5 034e37d72fe626946edad5fd11f1191a), branche
-- DELETE seule modifiée.
CREATE OR REPLACE FUNCTION public.auto_log_template_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_template_action(NEW.id, 'created', NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_template_action(
      NEW.id,
      'updated',
      NEW.created_by,
      jsonb_build_object(
        'old', row_to_json(OLD),
        'new', row_to_json(NEW)
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    -- Q158 : le modèle n'existe plus → template_id NULL, id dans metadata.
    PERFORM log_template_action(
      NULL,
      'deleted',
      COALESCE(auth.uid(), OLD.created_by),
      NULL,
      jsonb_build_object('template_id', OLD.id, 'title', OLD.title)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

-- -----------------------------------------------------------------------------
-- Audit B : update_student_gidouilles (5 arguments), compte sans profil refusé
-- -----------------------------------------------------------------------------
-- Pour un appelant connecté SANS profil, v_caller_role est NULL : la garde
-- valait NOT (NULL OR …) = NULL, et IF NULL ne lève rien → crédit accepté.
-- COALESCE(v_caller_role, '') rend la garde fausse, donc le refus effectif.
-- Corps repris de la prod (md5 df540176c353b6d9010fa43abdb5ef7d), garde seule
-- modifiée. Droits inchangés (CREATE OR REPLACE conserve proacl).
CREATE OR REPLACE FUNCTION public.update_student_gidouilles(p_student_id uuid, p_class_id uuid, p_delta integer, p_reason text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_new_gidouilles INTEGER;
    v_caller_role TEXT;
BEGIN
    -- SECURITY CHECK: Get caller's role to enforce authorization
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Mono-teacher: admin, teacher with an active member in this class, or system (NULL caller).
    -- Audit B : COALESCE — un compte connecté sans profil est refusé.
    IF auth.uid() IS NOT NULL AND NOT (
        COALESCE(v_caller_role, '') = 'admin'
        OR (COALESCE(v_caller_role, '') = 'teacher' AND EXISTS (
            SELECT 1 FROM public.class_members cm
            WHERE cm.student_id = p_student_id
            AND cm.class_id = p_class_id
            AND cm.status = 'active'
        ))
    ) THEN
        RAISE EXCEPTION 'Non autorisé: seuls les professeurs de cet élève peuvent modifier ses gidouilles';
    END IF;

    -- Update gidouilles with floor at 0
    UPDATE public.profiles
    SET gidouilles = GREATEST(0, COALESCE(gidouilles, 0) + p_delta)
    WHERE id = p_student_id
    RETURNING gidouilles INTO v_new_gidouilles;

    -- Log the change in activity table
    INSERT INTO public.gidouilles_activity (
        student_id,
        class_id,
        delta,
        reason,
        created_by
    ) VALUES (
        p_student_id,
        p_class_id,
        p_delta,
        p_reason,
        COALESCE(p_created_by, auth.uid())
    );

    RETURN v_new_gidouilles;
END;
$function$
;
