-- ============================================================================
-- Référentiel — `knowledge_type` → `regime_acquisition` + listes d'automatismes
-- ============================================================================
-- Deux choses étaient confondues dans un seul champ :
--
--   1. COMMENT on mesure la maîtrise d'un point (la règle d'acquisition) ;
--   2. D'OÙ vient le point (les « Automatismes » listés par le BO, évalués à
--      l'examen de fin d'année).
--
-- Les valeurs `automatisme` / `capacite_attendue` sont des mots du BO qui
-- désignent une provenance, alors que le champ pilotait une mesure — d'où une
-- frontière qui paraissait arbitraire au moment de remplir.
--
-- On sépare :
--
--   `regime_acquisition` — ce que ça prend pour conclure « acquis »
--       'fluence'   : ≥ 5 réussites ET ≥ 3 sur les 5 dernières
--                     → le geste doit être rapide, fiable, et le RESTER
--       'diversite' : ≥ 2 templates distincts ET aucun échec sur les 3 dernières
--                     → la maîtrise se prouve sur des cas VARIÉS
--
--   `curriculum_point_automatismes` — quels points figurent dans la liste des
--       automatismes de QUEL programme. « Automatisme » n'est pas une propriété
--       du point : c'est une liste publiée par un programme donné. Un point de
--       seconde peut être dans la liste de 1ʳᵉ ET dans celle de terminale — un
--       booléen sur le point ne saurait ni l'exprimer, ni dire pour quel examen.
--
-- Les deux axes se croisent : un automatisme du BO se mesure en général par la
-- fluence, mais un point qui n'est pas dans la liste du BO peut parfaitement se
-- mesurer ainsi (« déterminer l'équation de la tangente en un point », par ex.).
--
-- Sûr : `curriculum_points` n'a aucune tentative associée (0 ligne dans
-- `skill_attempts` et `student_point_state`) — le renommage ne migre aucun état.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. `knowledge_type` → `regime_acquisition` (+ nouvelles valeurs)
-- ---------------------------------------------------------------------------

alter table public.curriculum_points
	drop constraint curriculum_points_valid_knowledge_type;

alter table public.curriculum_points
	rename column knowledge_type to regime_acquisition;

-- Le défaut doit tomber avant la conversion des valeurs (il référence l'ancienne).
alter table public.curriculum_points
	alter column regime_acquisition drop default;

update public.curriculum_points
set regime_acquisition = case regime_acquisition
	when 'automatisme' then 'fluence'
	when 'capacite_attendue' then 'diversite'
	else regime_acquisition
end;

alter table public.curriculum_points
	alter column regime_acquisition set default 'diversite';

alter table public.curriculum_points
	add constraint curriculum_points_valid_regime_acquisition
		check (regime_acquisition = any (array['fluence', 'diversite']));

comment on column public.curriculum_points.regime_acquisition is
	'Ce qui prouve la maîtrise : fluence (volume + fraîcheur) | diversite (cas variés). Pilote la règle d''acquisition, pas la provenance du point.';

-- ---------------------------------------------------------------------------
-- 2. Listes d'automatismes par programme
-- ---------------------------------------------------------------------------
-- Une ligne = « ce point figure dans la liste des automatismes du programme de
-- <grade> ». Le point, lui, vit dans l'arbre du niveau où il est INTRODUIT :
-- les automatismes attendus en 1ʳᵉ sont pour l'essentiel des acquis de seconde.
-- Les créer dans l'arbre de 1ʳᵉ en dupliquerait la définition.

create table public.curriculum_point_automatismes (
	point_id uuid not null references public.curriculum_points (id) on delete cascade,
	grade text not null,
	created_at timestamptz not null default now(),
	primary key (point_id, grade),
	constraint curriculum_point_automatismes_valid_grade check (
		grade = any (array[
			'CP', 'CE1', 'CE2', 'CM1', 'CM2',
			'6', '5', '4', '3',
			'2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_STMG', 'T_STMG'
		])
	)
);

comment on table public.curriculum_point_automatismes is
	'Quels points de programme figurent dans la liste des « Automatismes » de quel programme (évalués à l''examen de ce niveau). Un point peut être dans plusieurs listes.';

-- « Les automatismes attendus à l'examen de 1ʳᵉ » = une requête sur le grade.
create index idx_curriculum_point_automatismes_grade
	on public.curriculum_point_automatismes (grade);

alter table public.curriculum_point_automatismes enable row level security;

create policy "curriculum_point_automatismes_read_authenticated"
	on public.curriculum_point_automatismes
	for select to authenticated using (true);

create policy "Teachers manage curriculum point automatismes"
	on public.curriculum_point_automatismes
	for all to authenticated
	using (public.is_teacher_or_admin())
	with check (public.is_teacher_or_admin());

-- ---------------------------------------------------------------------------
-- 3. Règle d'acquisition — même logique, nouveau vocabulaire
-- ---------------------------------------------------------------------------
-- Les seuils sont inchangés (design doc §6.1) : seuls le nom du champ et ses
-- valeurs changent.

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
     WHERE sa.student_id = p_student_id
       AND qtp.point_id  = p_point_id
       AND sa.template_id IS NOT NULL
       AND sa.success IS NOT NULL;

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
         WHERE sa.student_id = p_student_id
           AND qtp.point_id  = p_point_id
           AND sa.template_id IS NOT NULL
           AND sa.success IS NOT NULL
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
