-- Badges de capacité : les cartes de cours n'y comptent pas
-- =========================================================
--
-- Décision A1 de David (2026-09-28) : une carte de cours ne mesure pas une
-- capacité (l'élève se note lui-même). Ses tentatives — entraînement libre
-- (`student_self`) comme paquet de révision (`srs`) — sont écartées du calcul
-- de `student_point_state`, même si la carte est taguée à un point.
--
-- Question d'accès : personne ne lit rien de nouveau (aucune policy touchée).
-- En miroir : aucun badge existant ne change — mesuré le 2026-09-28,
-- `skill_attempts` est vide en production ; le calcul ne se refait qu'à la
-- prochaine tentative sur le point.
--
-- Effet rétroactif voulu (A1) : si un modèle devient plus tard une carte de
-- cours, ses anciennes tentatives sortent du calcul au prochain recalcul du
-- point ; s'il n'en reste aucune, l'état du point est supprimé.
--
-- Seul changement : jointure sur `question_templates` et filtre
-- `qt.type <> 'course_card'` dans les deux requêtes (totaux, fenêtre de
-- récence). Le reste est identique à 20260830080000.
--
-- Rollback : réappliquer la définition de `update_student_point_state` de
-- 20260830080000_regime_acquisition_et_listes_automatismes.sql (lignes 114-237).

create or replace function public.update_student_point_state(
	p_student_id uuid,
	p_point_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
    v_regime           text;
    v_window           integer;
    v_total_attempts   integer;
    v_total_successes  integer;
    v_distinct_tpl     integer;
    v_last_success_at  timestamptz;
    v_last_attempt_at  timestamptz;
    v_recent_successes integer;
    v_recent_failures  integer;
    v_is_acquired      boolean;
    v_needs_remed      boolean;
BEGIN
    SELECT cp.regime_acquisition
      INTO v_regime
      FROM public.curriculum_points cp
     WHERE cp.id = p_point_id;

    -- regime_acquisition est NOT NULL : un NULL signifie « point inexistant ».
    IF v_regime IS NULL THEN
        RETURN;
    END IF;

    v_window := CASE v_regime
                    WHEN 'diversite' THEN 3
                    WHEN 'fluence'   THEN 5
                END;

    -- Les tentatives du régime contenus n'ont pas de FK vers le point : on les
    -- retrouve via les templates tagués (question_template_points).
    SELECT COUNT(*)                            FILTER (WHERE TRUE),
           COUNT(*)                            FILTER (WHERE sa.success = TRUE),
           COUNT(DISTINCT sa.template_id)      FILTER (WHERE sa.success = TRUE),
           MAX(sa.created_at)                  FILTER (WHERE sa.success = TRUE),
           MAX(sa.created_at)
      INTO v_total_attempts,
           v_total_successes,
           v_distinct_tpl,
           v_last_success_at,
           v_last_attempt_at
      FROM public.skill_attempts sa
      JOIN public.question_template_points qtp
        ON qtp.template_id = sa.template_id
      JOIN public.question_templates qt
        ON qt.id = sa.template_id
     WHERE sa.student_id = p_student_id
       AND qtp.point_id  = p_point_id
       AND sa.template_id IS NOT NULL
       AND sa.success IS NOT NULL
       -- Carte de cours : auto-évaluation, ne mesure pas une capacité (A1)
       AND qt.type <> 'course_card';

    IF v_total_attempts = 0 THEN
        DELETE FROM public.student_point_state
         WHERE student_id = p_student_id
           AND point_id   = p_point_id;
        RETURN;
    END IF;

    -- Fenêtre de récence : les `v_window` dernières tentatives.
    WITH recent AS (
        SELECT sa.success
          FROM public.skill_attempts sa
          JOIN public.question_template_points qtp
            ON qtp.template_id = sa.template_id
          JOIN public.question_templates qt
            ON qt.id = sa.template_id
         WHERE sa.student_id = p_student_id
           AND qtp.point_id  = p_point_id
           AND sa.template_id IS NOT NULL
           AND sa.success IS NOT NULL
           AND qt.type <> 'course_card'
         ORDER BY sa.created_at DESC
         LIMIT v_window
    )
    SELECT COUNT(*) FILTER (WHERE success = TRUE),
           COUNT(*) FILTER (WHERE success = FALSE)
      INTO v_recent_successes,
           v_recent_failures
      FROM recent;

    -- Seuils inchangés (design doc §6.1).
    IF v_regime = 'diversite' THEN
        v_is_acquired := (v_distinct_tpl >= 2)
                     AND (v_recent_failures = 0);
    ELSE
        v_is_acquired := (v_total_successes >= 5)
                     AND (v_recent_successes >= 3);
    END IF;

    v_needs_remed := (NOT v_is_acquired) AND (v_recent_failures >= 2);

    INSERT INTO public.student_point_state (
        student_id,
        point_id,
        is_acquired,
        total_successes,
        distinct_template_successes,
        last_success_at,
        last_attempt_at,
        needs_remediation,
        updated_at
    ) VALUES (
        p_student_id,
        p_point_id,
        v_is_acquired,
        v_total_successes,
        v_distinct_tpl,
        v_last_success_at,
        v_last_attempt_at,
        v_needs_remed,
        NOW()
    )
    ON CONFLICT (student_id, point_id) DO UPDATE
        SET is_acquired                 = EXCLUDED.is_acquired,
            total_successes             = EXCLUDED.total_successes,
            distinct_template_successes = EXCLUDED.distinct_template_successes,
            last_success_at             = EXCLUDED.last_success_at,
            last_attempt_at             = EXCLUDED.last_attempt_at,
            needs_remediation           = EXCLUDED.needs_remediation,
            updated_at                  = NOW();
END $function$;
