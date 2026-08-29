-- ============================================================================
-- Refonte du référentiel — Phase 1 : fusion des arbres de contenus
-- ============================================================================
-- Spec : docs/wip/refonte-referentiel-progress.md
--
-- Fusionne les deux référentiels de contenus rivaux en un seul arbre par
-- niveau scolaire, et réduit `skills` aux seuls observables de compétences.
--
--   AVANT  curriculum_themes / curriculum_items / curriculum_points
--            → couverture du programme par la classe (le prof)
--          skill_themes / skill_objectives / skills (famille A)
--            → acquisition par l'élève
--          aucune FK entre les deux
--
--   APRÈS  curriculum_themes / curriculum_objectives / curriculum_points
--            → les deux usages, plus le tagging des ressources
--          observables
--            → les 6 compétences mathématiques, logique inchangée
--
-- Cause racine de la scission (design doc, décision 57) : famille A imposait
-- « exactement 4 capacités ordonnées par objectif ». Le suivi du programme
-- avait besoin d'un niveau 3 à cardinalité libre. `rang` devient ici
-- facultatif : l'échelle descriptive reste possible sans être imposée.
--
-- Sûreté : toutes les tables dépendantes sont VIDES (0 tentative, 0 tagging,
-- 0 couverture, 0 cache) — vérifié en prod et en local le 2026-08-29. Les 72
-- capacités famille A sont supprimées ; leur contenu reste dans
-- docs/wip/referentiel/6e-savoirs.md (source de vérité des seeds).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Arbre des contenus — renommages Item → Objectif
-- ---------------------------------------------------------------------------

alter table public.curriculum_items rename to curriculum_objectives;

alter table public.curriculum_objectives
	rename constraint curriculum_items_pkey to curriculum_objectives_pkey;
alter table public.curriculum_objectives
	rename constraint curriculum_items_name_not_blank to curriculum_objectives_name_not_blank;
alter table public.curriculum_objectives
	rename constraint curriculum_items_theme_name_unique to curriculum_objectives_theme_name_unique;
alter table public.curriculum_objectives
	rename constraint curriculum_items_theme_id_fkey to curriculum_objectives_theme_id_fkey;
alter index public.idx_curriculum_items_theme rename to idx_curriculum_objectives_theme;

alter table public.curriculum_points rename column item_id to objective_id;
alter table public.curriculum_points
	rename constraint curriculum_points_item_name_unique to curriculum_points_objective_name_unique;
alter table public.curriculum_points
	rename constraint curriculum_points_item_id_fkey to curriculum_points_objective_id_fkey;
alter index public.idx_curriculum_points_item rename to idx_curriculum_points_objective;

-- Description libre de l'objectif, reprise de l'ancien `skill_objectives.description` :
-- affichée à l'élève sur la page de détail d'un objectif.
alter table public.curriculum_objectives add column description text;

comment on column public.curriculum_objectives.description is
	'Description libre affichée à l''élève sur la vue détail de l''objectif. Facultative.';

-- Code court du thème, repris de l'ancien `skill_themes.bo_reference` : il sert
-- de badge dans les grilles d'analytics (où le nom complet ne tient pas) et de
-- clé de filtre stable pour la courbe de rétention par thème.
alter table public.curriculum_themes add column code text;

create unique index curriculum_themes_grade_code_unique
	on public.curriculum_themes (grade, code)
	where code is not null;

comment on column public.curriculum_themes.code is
	'Code court affiché en badge dans les grilles (ex. NUM, CALC). Facultatif, unique par niveau.';

-- L'arbre servait jusqu'ici au seul suivi de programme (prof) : ses policies
-- n'autorisaient que `is_teacher_or_admin()`. Il porte désormais aussi
-- l'acquisition élève, qui exigeait une lecture publique authentifiée
-- (décision Q3, héritée de `skill_themes` / `skill_objectives` / `skills`).
-- Sans ces trois policies, « Mes objectifs » et « Mes compétences » sont vides.
alter policy "Teachers manage curriculum items" on public.curriculum_objectives
	rename to "Teachers manage curriculum objectives";

create policy "curriculum_themes_read_authenticated" on public.curriculum_themes
	for select to authenticated using (true);
create policy "curriculum_objectives_read_authenticated" on public.curriculum_objectives
	for select to authenticated using (true);
create policy "curriculum_points_read_authenticated" on public.curriculum_points
	for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 2. Arbre des contenus — typage des points
-- ---------------------------------------------------------------------------
-- `kind` passe à 3 valeurs et devient obligatoire : c'est lui qui garantit que
-- « la liste des connaissances du niveau » est toujours complète. Les 3 valeurs
-- reprennent les 3 rubriques du BO lycée (Contenus / Capacités attendues /
-- Démonstrations). Les 95 lignes existantes sont toutes renseignées.

alter table public.curriculum_points drop constraint curriculum_points_valid_kind;
alter table public.curriculum_points alter column kind set not null;
alter table public.curriculum_points add constraint curriculum_points_valid_kind
	check (kind = any (array['connaissance', 'savoir_faire', 'demonstration']));

-- `knowledge_type` (repris de skills) : sélectionne la règle d'acquisition §6.1.
-- `exigence` : sépare l'attendu de l'approfondissement (poids dans la couverture).
-- `rang` : l'échelle descriptive, facultative — c'est le geste central de la refonte.
alter table public.curriculum_points
	add column knowledge_type text not null default 'capacite_attendue',
	add column exigence text not null default 'attendu',
	add column rang smallint;

alter table public.curriculum_points
	add constraint curriculum_points_valid_knowledge_type
		check (knowledge_type = any (array['automatisme', 'capacite_attendue'])),
	add constraint curriculum_points_valid_exigence
		check (exigence = any (array['attendu', 'approfondissement'])),
	add constraint curriculum_points_valid_rang
		check (rang is null or (rang between 1 and 4));

-- Deux points d'un même objectif ne peuvent pas partager un rang.
create unique index curriculum_points_objective_rang_unique
	on public.curriculum_points (objective_id, rang)
	where rang is not null;

comment on column public.curriculum_points.kind is
	'Nature du contenu : connaissance | savoir_faire | demonstration (rubriques BO).';
comment on column public.curriculum_points.knowledge_type is
	'Régime de validation : automatisme (fluence) | capacite_attendue (réfléchi). Voir design doc §6.1.';
comment on column public.curriculum_points.exigence is
	'attendu = au programme ; approfondissement = au-delà (ne pèse pas comme un attendu).';
comment on column public.curriculum_points.rang is
	'Position 1-4 dans l''échelle descriptive de l''objectif. NULL = objectif sans échelle.';

-- ---------------------------------------------------------------------------
-- 3. `skills` → `observables` (les 72 capacités famille A disparaissent)
-- ---------------------------------------------------------------------------

delete from public.skills where objective_id is not null;

alter table public.skills
	drop constraint chk_skill_family,
	drop constraint chk_skill_knowledge_rang,
	drop constraint chk_skill_knowledge_type_values,
	drop constraint chk_skill_competence_code;

drop index public.uq_skill_knowledge_rang_under_objective;
drop index public.idx_skills_objective_id;
drop index public.idx_skills_family;

-- `family` est une colonne GENERATED calculée depuis `objective_id` : elle doit
-- tomber en premier, sinon Postgres refuse la suppression de sa source.
alter table public.skills drop column family;

alter table public.skills
	drop column objective_id,
	drop column knowledge_type,
	drop column niveau_scolaire;

-- Toutes les lignes restantes sont des observables : les deux colonnes
-- deviennent obligatoires (elles remplacent chk_skill_competence_code).
alter table public.skills alter column subdimension_id set not null;
alter table public.skills alter column observable_code set not null;

alter table public.skills rename to observables;
alter table public.observables rename constraint skills_pkey to observables_pkey;
alter table public.observables
	rename constraint skills_subdimension_id_fkey to observables_subdimension_id_fkey;

-- Les index partiels `WHERE subdimension_id IS NOT NULL` sont devenus
-- tautologiques : recréés en index pleins.
drop index public.uq_skill_competence_observable_code;
drop index public.idx_skills_subdimension_id;
create unique index uq_observable_code_under_subdimension
	on public.observables (subdimension_id, observable_code);
create index idx_observables_subdimension
	on public.observables (subdimension_id, display_order);

alter policy "Admins can manage all skills" on public.observables
	rename to "Admins can manage all observables";
alter policy "skills_read_authenticated" on public.observables
	rename to "observables_read_authenticated";

comment on table public.observables is
	'Observables des 6 compétences mathématiques (ex-`skills` famille B). Les contenus disciplinaires vivent dans curriculum_points.';

drop table public.skill_objectives;
drop table public.skill_themes;

-- ---------------------------------------------------------------------------
-- 4. Tentatives, caches et jonction de tagging
-- ---------------------------------------------------------------------------
-- Le régime « contenus » reste identifié par `template_id` (refonte per-template
-- du 2026-06-10 : 1 ligne par réponse, l'état de chaque point est dérivé via
-- question_template_points). Seul le régime « compétences » porte une FK directe.

alter table public.skill_attempts drop constraint chk_attempt_family_regime;
alter table public.skill_attempts rename column skill_id to observable_id;
alter table public.skill_attempts
	rename constraint skill_attempts_skill_id_fkey to skill_attempts_observable_id_fkey;
alter index public.idx_skill_attempts_skill_time rename to idx_skill_attempts_observable_time;
alter index public.idx_skill_attempts_student_skill_time
	rename to idx_skill_attempts_student_observable_time;

alter table public.skill_attempts add constraint chk_attempt_regime check (
	(
		template_id is not null and success is not null
		and observable_id is null and code is null and task_id is null
	)
	or
	(
		observable_id is not null and code is not null and task_id is not null
		and template_id is null and success is null and grade is null
	)
);

-- Jonction de tagging : question_template_skills → question_template_points
alter table public.question_template_skills rename to question_template_points;
alter table public.question_template_points rename column skill_id to point_id;
alter table public.question_template_points
	rename constraint question_template_skills_pkey to question_template_points_pkey;
alter table public.question_template_points
	rename constraint question_template_skills_template_id_fkey
	to question_template_points_template_id_fkey;
alter table public.question_template_points
	drop constraint question_template_skills_skill_id_fkey;
alter table public.question_template_points
	add constraint question_template_points_point_id_fkey
	foreign key (point_id) references public.curriculum_points (id) on delete restrict;
alter index public.idx_question_template_skills_skill rename to idx_question_template_points_point;

alter policy "Admins can manage all question_template_skills" on public.question_template_points
	rename to "Admins can manage all question_template_points";
alter policy "question_template_skills_read_authenticated" on public.question_template_points
	rename to "question_template_points_read_authenticated";

-- Cache d'acquisition : student_skill_state_a → student_point_state
drop view if exists public.student_skill_state_a_v;

alter table public.student_skill_state_a rename to student_point_state;
alter table public.student_point_state rename column skill_id to point_id;
alter table public.student_point_state
	rename constraint student_skill_state_a_pkey to student_point_state_pkey;
alter table public.student_point_state
	rename constraint student_skill_state_a_student_id_fkey to student_point_state_student_id_fkey;
alter table public.student_point_state
	drop constraint student_skill_state_a_skill_id_fkey;
alter table public.student_point_state
	add constraint student_point_state_point_id_fkey
	foreign key (point_id) references public.curriculum_points (id) on delete cascade;
alter index public.idx_student_skill_state_a_needs_remediation
	rename to idx_student_point_state_needs_remediation;
alter index public.idx_student_skill_state_a_student_last_success
	rename to idx_student_point_state_student_last_success;

alter policy "Admins can manage all student_skill_state_a" on public.student_point_state
	rename to "Admins can manage all student_point_state";
alter policy "student_skill_state_a_select_own" on public.student_point_state
	rename to "student_point_state_select_own";
alter policy "student_skill_state_a_select_teacher" on public.student_point_state
	rename to "student_point_state_select_teacher";

create view public.student_point_state_v
with (security_invoker = on) as
select
	student_id,
	point_id,
	is_acquired,
	total_successes,
	distinct_template_successes,
	last_success_at,
	last_attempt_at,
	needs_remediation,
	updated_at
from public.student_point_state s;

-- Cache famille B : la colonne pointe désormais vers `observables`
alter table public.student_observable_state rename column skill_id to observable_id;
alter table public.student_observable_state
	rename constraint student_observable_state_skill_id_fkey
	to student_observable_state_observable_id_fkey;

-- Périmètre des tâches d'évaluation : idem
alter table public.evaluation_task_perimeter rename column skill_id to observable_id;
alter table public.evaluation_task_perimeter
	rename constraint evaluation_task_perimeter_skill_id_fkey
	to evaluation_task_perimeter_observable_id_fkey;

-- Anti-fraude SRS : la capacité visée est désormais un point de programme
alter table public.srs_anti_fraud_flags rename column capacity_skill_id to capacity_point_id;
alter table public.srs_anti_fraud_flags
	drop constraint srs_anti_fraud_flags_capacity_skill_id_fkey;
alter table public.srs_anti_fraud_flags
	add constraint srs_anti_fraud_flags_capacity_point_id_fkey
	foreign key (capacity_point_id) references public.curriculum_points (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 5a. Fonctions réécrites (elles portaient la logique famille A / le filtre family)
-- ---------------------------------------------------------------------------

-- Le garde-fou « le skill du périmètre est bien de famille competence » devient
-- tautologique : toute ligne de `observables` est une compétence.
drop trigger if exists trg_perimeter_skill_family on public.evaluation_task_perimeter;
drop function if exists public.check_perimeter_skill_is_competence();

-- État d'un point de contenu (ex-update_student_skill_state_a).
-- Règles §6.1 inchangées, seule la source du knowledge_type change :
-- curriculum_points au lieu de skills.
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
    v_knowledge_type   text;
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
    SELECT cp.knowledge_type
      INTO v_knowledge_type
      FROM public.curriculum_points cp
     WHERE cp.id = p_point_id;

    -- knowledge_type est NOT NULL : un NULL signifie « point inexistant ».
    IF v_knowledge_type IS NULL THEN
        RETURN;
    END IF;

    v_window := CASE v_knowledge_type
                    WHEN 'capacite_attendue' THEN 3
                    WHEN 'automatisme'       THEN 5
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

    -- Règles §6.1 — strictement inchangées.
    IF v_knowledge_type = 'capacite_attendue' THEN
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

drop function if exists public.update_student_skill_state_a(uuid, uuid);

-- Consolidation d'un observable (§6.1bis). Le filtre `family = 'competence'`
-- disparaît : toute ligne de `observables` est une compétence.
-- DROP + CREATE car le nom du paramètre change (CREATE OR REPLACE ne le permet pas).
drop function if exists public.update_student_observable_state(uuid, uuid);

create function public.update_student_observable_state(
	p_student_id uuid,
	p_observable_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
    v_math_competence_id  uuid;
    v_total_attempts      integer;
    v_count_plus          integer;
    v_count_minus         integer;
    v_last_attempt_at     timestamptz;
    v_is_acquis           boolean;
BEGIN
    -- Résout la compétence parente via la sous-dimension.
    SELECT mcs.math_competence_id
      INTO v_math_competence_id
      FROM public.observables o
      JOIN public.math_competence_subdimensions mcs ON mcs.id = o.subdimension_id
     WHERE o.id = p_observable_id;

    IF v_math_competence_id IS NULL THEN
        -- Observable inexistant. Défensif : ne rien faire.
        RETURN;
    END IF;

    SELECT COUNT(*)                            FILTER (WHERE TRUE),
           COUNT(*)                            FILTER (WHERE code = 'plus'),
           COUNT(*)                            FILTER (WHERE code = 'minus'),
           MAX(created_at)
      INTO v_total_attempts,
           v_count_plus,
           v_count_minus,
           v_last_attempt_at
      FROM public.skill_attempts
     WHERE student_id    = p_student_id
       AND observable_id = p_observable_id
       AND code IS NOT NULL;

    -- Règle de consolidation (§6.1bis) — inchangée.
    v_is_acquis := (v_count_plus >= 2) AND (v_count_plus > v_count_minus);

    IF v_total_attempts = 0 THEN
        DELETE FROM public.student_observable_state
         WHERE student_id    = p_student_id
           AND observable_id = p_observable_id;
    ELSE
        INSERT INTO public.student_observable_state (
            student_id,
            observable_id,
            count_plus,
            count_minus,
            is_acquis,
            last_attempt_at,
            updated_at
        ) VALUES (
            p_student_id,
            p_observable_id,
            v_count_plus,
            v_count_minus,
            v_is_acquis,
            v_last_attempt_at,
            NOW()
        )
        ON CONFLICT (student_id, observable_id) DO UPDATE
            SET count_plus      = EXCLUDED.count_plus,
                count_minus     = EXCLUDED.count_minus,
                is_acquis       = EXCLUDED.is_acquis,
                last_attempt_at = EXCLUDED.last_attempt_at,
                updated_at      = NOW();
    END IF;

    -- Cascade : recalcul du verdict de la compétence parente.
    PERFORM public.update_student_competence_level(p_student_id, v_math_competence_id);
END $function$;

-- Trigger d'aiguillage. Le filtre `s.family = 'knowledge'` disparaît : toute
-- ligne de question_template_points référence un point de contenu.
create or replace function public.skill_attempts_after_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
    v_point_id uuid;
BEGIN
    -- Régime contenus : boucle sur les points tagués par le template.
    IF NEW.template_id IS NOT NULL AND NEW.success IS NOT NULL THEN
        FOR v_point_id IN
            SELECT qtp.point_id
              FROM public.question_template_points qtp
             WHERE qtp.template_id = NEW.template_id
        LOOP
            PERFORM public.update_student_point_state(NEW.student_id, v_point_id);
        END LOOP;
    -- Régime compétences : inchangé.
    ELSIF NEW.observable_id IS NOT NULL AND NEW.code IS NOT NULL THEN
        PERFORM public.update_student_observable_state(NEW.student_id, NEW.observable_id);
    END IF;

    RETURN NEW;
END $function$;

-- ---------------------------------------------------------------------------
-- 5b. Fonctions régénérées par substitution mécanique
-- ---------------------------------------------------------------------------
-- Les 7 fonctions ci-dessous portent la règle conjonctive famille B et les
-- « cœurs d'excellence ». Elles ne référencent ni `family`, ni `knowledge_type`,
-- ni `niveau_scolaire` : le renommage des tables est la SEULE raison de les
-- rouvrir. Elles ont donc été régénérées depuis pg_get_functiondef() par
-- substitution textuelle (public.skills → public.observables,
-- sos.skill_id → sos.observable_id, sa.skill_id → sa.observable_id) et le diff
-- vérifié : 7 lignes modifiées, toutes des clauses JOIN. AUCUNE logique touchée.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_calculer_level(p_student_id uuid, p_math_competence_id uuid)
 RETURNS TABLE(niveau text, validated_observables jsonb, missing_for_next jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_acquired       text[];
    v_a_count        integer;   -- A1..A3
    v_b_count        integer;   -- B1..B5
    v_c_count        integer;   -- C1..C3
    v_d1             boolean;
    v_d2             boolean;
    v_satisfaisante  boolean;
    v_tres_bonne     boolean;
    v_missing        jsonb := '[]'::jsonb;
BEGIN
    SELECT COALESCE(array_agg(s.observable_code), ARRAY[]::text[])
      INTO v_acquired
      FROM public.student_observable_state sos
      JOIN public.observables s ON s.id = sos.observable_id
     WHERE sos.student_id = p_student_id
       AND sos.is_acquis  = TRUE
       AND s.subdimension_id IN (
           SELECT id FROM public.math_competence_subdimensions
            WHERE math_competence_id = p_math_competence_id
       );

    v_a_count := (SELECT COUNT(*) FROM unnest(v_acquired) c WHERE c = ANY (ARRAY['A1','A2','A3']));
    v_b_count := (SELECT COUNT(*) FROM unnest(v_acquired) c WHERE c = ANY (ARRAY['B1','B2','B3','B4','B5']));
    v_c_count := (SELECT COUNT(*) FROM unnest(v_acquired) c WHERE c = ANY (ARRAY['C1','C2','C3']));
    v_d1      := ('D1' = ANY (v_acquired));
    v_d2      := ('D2' = ANY (v_acquired));

    -- Satisfaisante : (>=2 of B) AND (>=1 of A) AND (>=1 of D).
    v_satisfaisante := (v_b_count >= 2) AND (v_a_count >= 1) AND (v_d1 OR v_d2);

    -- Très bonne : Satisfaisante AND D1 AND D2 AND (>=3 of B) AND (>=2 of A) AND (>=1 of C).
    v_tres_bonne := v_satisfaisante
                AND v_d1 AND v_d2
                AND (v_b_count >= 3)
                AND (v_a_count >= 2)
                AND (v_c_count >= 1);

    IF v_tres_bonne THEN
        RETURN QUERY SELECT 'tres_bonne'::text,
                            to_jsonb(v_acquired),
                            '[]'::jsonb;
        RETURN;
    END IF;

    IF v_satisfaisante THEN
        IF NOT v_d1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'D1');
        END IF;
        IF NOT v_d2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'D2');
        END IF;
        IF v_b_count < 3 THEN
            -- ≥ 3 among B1..B5
            v_missing := v_missing || jsonb_build_object(
                'kind', 'n_of_subdim', 'letter', 'B', 'n', 3, 'total', 5
            );
        END IF;
        IF v_a_count < 2 THEN
            -- ≥ 2 among A1..A3
            v_missing := v_missing || jsonb_build_object(
                'kind', 'n_of_subdim', 'letter', 'A', 'n', 2, 'total', 3
            );
        END IF;
        IF v_c_count < 1 THEN
            -- ≥ 1 of C
            v_missing := v_missing || jsonb_build_object('kind', 'one_of_subdim', 'letter', 'C');
        END IF;
        RETURN QUERY SELECT 'satisfaisante'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Fragile : >=1 of B (Satisfaisante not reached).
    IF v_b_count >= 1 THEN
        -- Missing for Satisfaisante:
        IF v_b_count < 2 THEN
            -- ≥ 2 among B1..B5
            v_missing := v_missing || jsonb_build_object(
                'kind', 'n_of_subdim', 'letter', 'B', 'n', 2, 'total', 5
            );
        END IF;
        IF v_a_count < 1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'one_of_subdim', 'letter', 'A');
        END IF;
        IF NOT (v_d1 OR v_d2) THEN
            -- ≥ 1 among {D1, D2} (only first two D matter for Calculer Satisfaisante)
            v_missing := v_missing || jsonb_build_object(
                'kind', 'one_of_codes',
                'codes', jsonb_build_array('D1', 'D2')
            );
        END IF;
        RETURN QUERY SELECT 'fragile'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Insuffisante : residual.
    IF v_b_count < 1 THEN
        v_missing := v_missing || jsonb_build_object('kind', 'one_of_subdim', 'letter', 'B');
    END IF;

    RETURN QUERY SELECT 'insuffisante'::text,
                        to_jsonb(v_acquired),
                        v_missing;
END $function$
;

CREATE OR REPLACE FUNCTION public.compute_chercher_level(p_student_id uuid, p_math_competence_id uuid)
 RETURNS TABLE(niveau text, validated_observables jsonb, missing_for_next jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_acquired       text[];
    -- Per-subdimension counts and flags:
    v_a_count        integer;   -- acquired among A1..A3
    v_b_count        integer;   -- acquired among B1..B5
    v_b1             boolean;
    v_b2_b5_count    integer;   -- acquired among B2..B5
    v_c1             boolean;
    v_c2             boolean;
    v_d_count        integer;   -- acquired among D1..D3
    -- Derived predicates:
    v_satisfaisante  boolean;
    v_tres_bonne     boolean;
    -- Missing list collector (typed JSONB objects — refactor 2026-06-09):
    v_missing        jsonb := '[]'::jsonb;
BEGIN
    -- Load the set of observable codes acquired for this competence.
    SELECT COALESCE(array_agg(s.observable_code), ARRAY[]::text[])
      INTO v_acquired
      FROM public.student_observable_state sos
      JOIN public.observables s ON s.id = sos.observable_id
     WHERE sos.student_id = p_student_id
       AND sos.is_acquis  = TRUE
       AND s.subdimension_id IN (
           SELECT id
             FROM public.math_competence_subdimensions
            WHERE math_competence_id = p_math_competence_id
       );

    -- Per-subdimension counts.
    v_a_count     := (SELECT COUNT(*) FROM unnest(v_acquired) c WHERE c = ANY (ARRAY['A1','A2','A3']));
    v_b_count     := (SELECT COUNT(*) FROM unnest(v_acquired) c WHERE c = ANY (ARRAY['B1','B2','B3','B4','B5']));
    v_b1          := ('B1' = ANY (v_acquired));
    v_b2_b5_count := (SELECT COUNT(*) FROM unnest(v_acquired) c WHERE c = ANY (ARRAY['B2','B3','B4','B5']));
    v_c1          := ('C1' = ANY (v_acquired));
    v_c2          := ('C2' = ANY (v_acquired));
    v_d_count     := (SELECT COUNT(*) FROM unnest(v_acquired) c WHERE c = ANY (ARRAY['D1','D2','D3']));

    -- Test Satisfaisante (used both for the level itself and as a precondition of Très bonne).
    v_satisfaisante := v_b1 AND (v_a_count >= 2) AND (v_b2_b5_count >= 1);

    -- Test Très bonne : Satisfaisante AND C2 AND C1 AND (>=1 of D).
    v_tres_bonne := v_satisfaisante AND v_c2 AND v_c1 AND (v_d_count >= 1);

    IF v_tres_bonne THEN
        RETURN QUERY SELECT 'tres_bonne'::text,
                            to_jsonb(v_acquired),
                            '[]'::jsonb;
        RETURN;
    END IF;

    IF v_satisfaisante THEN
        -- Build the missing-for-next list (target = Très bonne).
        IF NOT v_c2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'C2');
        END IF;
        IF NOT v_c1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'C1');
        END IF;
        IF v_d_count < 1 THEN
            -- any one of D1/D2/D3
            v_missing := v_missing || jsonb_build_object('kind', 'one_of_subdim', 'letter', 'D');
        END IF;
        RETURN QUERY SELECT 'satisfaisante'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Fragile : >=1 of A AND >=1 of B (Satisfaisante not reached).
    IF (v_a_count >= 1) AND (v_b_count >= 1) THEN
        -- Missing for Satisfaisante:
        IF NOT v_b1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'B1');
        END IF;
        IF v_a_count < 2 THEN
            -- ≥ 2 of A1..A3
            v_missing := v_missing || jsonb_build_object(
                'kind', 'n_of_subdim', 'letter', 'A', 'n', 2, 'total', 3
            );
        END IF;
        IF v_b2_b5_count < 1 THEN
            -- ≥ 1 of B2..B5 (subset of B sub-dim)
            v_missing := v_missing || jsonb_build_object(
                'kind', 'one_of_codes',
                'codes', jsonb_build_array('B2', 'B3', 'B4', 'B5')
            );
        END IF;
        RETURN QUERY SELECT 'fragile'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Insuffisante : residual.
    -- Missing for Fragile:
    IF v_a_count < 1 THEN
        v_missing := v_missing || jsonb_build_object('kind', 'one_of_subdim', 'letter', 'A');
    END IF;
    IF v_b_count < 1 THEN
        v_missing := v_missing || jsonb_build_object('kind', 'one_of_subdim', 'letter', 'B');
    END IF;

    RETURN QUERY SELECT 'insuffisante'::text,
                        to_jsonb(v_acquired),
                        v_missing;
END $function$
;

CREATE OR REPLACE FUNCTION public.compute_communiquer_level(p_student_id uuid, p_math_competence_id uuid)
 RETURNS TABLE(niveau text, validated_observables jsonb, missing_for_next jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_acquired       text[];
    v_a1             boolean;
    v_a2             boolean;
    v_b1             boolean;
    v_b2             boolean;
    v_c1             boolean;
    v_c2             boolean;
    v_a_count        integer;   -- A1..A2
    v_b_count        integer;   -- B1..B2
    v_satisfaisante  boolean;
    v_tres_bonne     boolean;
    v_missing        jsonb := '[]'::jsonb;
BEGIN
    SELECT COALESCE(array_agg(s.observable_code), ARRAY[]::text[])
      INTO v_acquired
      FROM public.student_observable_state sos
      JOIN public.observables s ON s.id = sos.observable_id
     WHERE sos.student_id = p_student_id
       AND sos.is_acquis  = TRUE
       AND s.subdimension_id IN (
           SELECT id FROM public.math_competence_subdimensions
            WHERE math_competence_id = p_math_competence_id
       );

    v_a1 := ('A1' = ANY (v_acquired));
    v_a2 := ('A2' = ANY (v_acquired));
    v_b1 := ('B1' = ANY (v_acquired));
    v_b2 := ('B2' = ANY (v_acquired));
    v_c1 := ('C1' = ANY (v_acquired));
    v_c2 := ('C2' = ANY (v_acquired));

    v_a_count := (CASE WHEN v_a1 THEN 1 ELSE 0 END) + (CASE WHEN v_a2 THEN 1 ELSE 0 END);
    v_b_count := (CASE WHEN v_b1 THEN 1 ELSE 0 END) + (CASE WHEN v_b2 THEN 1 ELSE 0 END);

    v_satisfaisante := (v_b_count >= 1) AND (v_a_count >= 1);

    v_tres_bonne := v_satisfaisante AND v_c1 AND v_c2 AND v_a1 AND v_a2;

    IF v_tres_bonne THEN
        RETURN QUERY SELECT 'tres_bonne'::text,
                            to_jsonb(v_acquired),
                            '[]'::jsonb;
        RETURN;
    END IF;

    IF v_satisfaisante THEN
        IF NOT v_c1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'C1');
        END IF;
        IF NOT v_c2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'C2');
        END IF;
        IF NOT v_a1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'A1');
        END IF;
        IF NOT v_a2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'A2');
        END IF;
        RETURN QUERY SELECT 'satisfaisante'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Fragile : >=1 of B OR >=1 of A.
    IF (v_b_count >= 1) OR (v_a_count >= 1) THEN
        -- Missing for Satisfaisante:
        IF v_b_count < 1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'one_of_subdim', 'letter', 'B');
        END IF;
        IF v_a_count < 1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'one_of_subdim', 'letter', 'A');
        END IF;
        RETURN QUERY SELECT 'fragile'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Insuffisante : residual.
    v_missing := jsonb_build_array(
        jsonb_build_object('kind', 'one_of_subdim', 'letter', 'A'),
        jsonb_build_object('kind', 'one_of_subdim', 'letter', 'B')
    );

    RETURN QUERY SELECT 'insuffisante'::text,
                        to_jsonb(v_acquired),
                        v_missing;
END $function$
;

CREATE OR REPLACE FUNCTION public.compute_modeliser_level(p_student_id uuid, p_math_competence_id uuid)
 RETURNS TABLE(niveau text, validated_observables jsonb, missing_for_next jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_acquired       text[];
    v_a1             boolean;
    v_a2             boolean;
    v_a3             boolean;
    v_b1             boolean;
    v_b2             boolean;
    v_c1             boolean;
    v_c2             boolean;
    v_c3             boolean;
    v_a_count        integer;   -- A1..A3
    v_satisfaisante  boolean;
    v_tres_bonne     boolean;
    v_missing        jsonb := '[]'::jsonb;
BEGIN
    SELECT COALESCE(array_agg(s.observable_code), ARRAY[]::text[])
      INTO v_acquired
      FROM public.student_observable_state sos
      JOIN public.observables s ON s.id = sos.observable_id
     WHERE sos.student_id = p_student_id
       AND sos.is_acquis  = TRUE
       AND s.subdimension_id IN (
           SELECT id FROM public.math_competence_subdimensions
            WHERE math_competence_id = p_math_competence_id
       );

    v_a1 := ('A1' = ANY (v_acquired));
    v_a2 := ('A2' = ANY (v_acquired));
    v_a3 := ('A3' = ANY (v_acquired));
    v_b1 := ('B1' = ANY (v_acquired));
    v_b2 := ('B2' = ANY (v_acquired));
    v_c1 := ('C1' = ANY (v_acquired));
    v_c2 := ('C2' = ANY (v_acquired));
    v_c3 := ('C3' = ANY (v_acquired));

    v_a_count := (CASE WHEN v_a1 THEN 1 ELSE 0 END)
               + (CASE WHEN v_a2 THEN 1 ELSE 0 END)
               + (CASE WHEN v_a3 THEN 1 ELSE 0 END);

    v_satisfaisante := v_a2 AND v_a3 AND v_b1;

    v_tres_bonne := v_satisfaisante AND v_b2 AND v_c1 AND (v_c2 OR v_c3);

    IF v_tres_bonne THEN
        RETURN QUERY SELECT 'tres_bonne'::text,
                            to_jsonb(v_acquired),
                            '[]'::jsonb;
        RETURN;
    END IF;

    IF v_satisfaisante THEN
        IF NOT v_b2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'B2');
        END IF;
        IF NOT v_c1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'C1');
        END IF;
        IF NOT (v_c2 OR v_c3) THEN
            -- ≥ 1 among {C2, C3}
            v_missing := v_missing || jsonb_build_object(
                'kind', 'one_of_codes',
                'codes', jsonb_build_array('C2', 'C3')
            );
        END IF;
        RETURN QUERY SELECT 'satisfaisante'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Fragile : >=1 of A.
    IF v_a_count >= 1 THEN
        -- Missing for Satisfaisante:
        IF NOT v_a2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'A2');
        END IF;
        IF NOT v_a3 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'A3');
        END IF;
        IF NOT v_b1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'B1');
        END IF;
        RETURN QUERY SELECT 'fragile'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Insuffisante : residual.
    v_missing := jsonb_build_array(
        jsonb_build_object('kind', 'one_of_subdim', 'letter', 'A')
    );

    RETURN QUERY SELECT 'insuffisante'::text,
                        to_jsonb(v_acquired),
                        v_missing;
END $function$
;

CREATE OR REPLACE FUNCTION public.compute_raisonner_level(p_student_id uuid, p_math_competence_id uuid)
 RETURNS TABLE(niveau text, validated_observables jsonb, missing_for_next jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_acquired       text[];
    v_a1             boolean;
    v_b1             boolean;
    v_b2             boolean;
    v_c_count        integer;   -- C1..C3
    v_d1             boolean;
    v_d2             boolean;
    v_satisfaisante  boolean;
    v_tres_bonne     boolean;
    v_missing        jsonb := '[]'::jsonb;
BEGIN
    SELECT COALESCE(array_agg(s.observable_code), ARRAY[]::text[])
      INTO v_acquired
      FROM public.student_observable_state sos
      JOIN public.observables s ON s.id = sos.observable_id
     WHERE sos.student_id = p_student_id
       AND sos.is_acquis  = TRUE
       AND s.subdimension_id IN (
           SELECT id FROM public.math_competence_subdimensions
            WHERE math_competence_id = p_math_competence_id
       );

    v_a1      := ('A1' = ANY (v_acquired));
    v_b1      := ('B1' = ANY (v_acquired));
    v_b2      := ('B2' = ANY (v_acquired));
    v_c_count := (SELECT COUNT(*) FROM unnest(v_acquired) c WHERE c = ANY (ARRAY['C1','C2','C3']));
    v_d1      := ('D1' = ANY (v_acquired));
    v_d2      := ('D2' = ANY (v_acquired));

    v_satisfaisante := v_a1 AND v_b1;

    v_tres_bonne := v_satisfaisante AND v_b2 AND v_d2 AND (v_c_count >= 1);

    IF v_tres_bonne THEN
        RETURN QUERY SELECT 'tres_bonne'::text,
                            to_jsonb(v_acquired),
                            '[]'::jsonb;
        RETURN;
    END IF;

    IF v_satisfaisante THEN
        IF NOT v_b2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'B2');
        END IF;
        IF NOT v_d2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'D2');
        END IF;
        IF v_c_count < 1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'one_of_subdim', 'letter', 'C');
        END IF;
        RETURN QUERY SELECT 'satisfaisante'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Fragile : >=1 of {A1, B1, D1}
    IF v_a1 OR v_b1 OR v_d1 THEN
        -- Missing for Satisfaisante:
        IF NOT v_a1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'A1');
        END IF;
        IF NOT v_b1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'B1');
        END IF;
        RETURN QUERY SELECT 'fragile'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Insuffisante : residual.
    -- Missing for Fragile : ≥ 1 of {A1, B1, D1} (cross-subdim, narrow set).
    v_missing := jsonb_build_array(
        jsonb_build_object(
            'kind', 'one_of_codes',
            'codes', jsonb_build_array('A1', 'B1', 'D1')
        )
    );

    RETURN QUERY SELECT 'insuffisante'::text,
                        to_jsonb(v_acquired),
                        v_missing;
END $function$
;

CREATE OR REPLACE FUNCTION public.compute_representer_level(p_student_id uuid, p_math_competence_id uuid)
 RETURNS TABLE(niveau text, validated_observables jsonb, missing_for_next jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_acquired       text[];
    v_a1             boolean;
    v_a2             boolean;
    v_b1             boolean;
    v_b2             boolean;
    v_c1             boolean;
    v_c2             boolean;
    v_d1             boolean;
    v_d2             boolean;
    v_a_count        integer;   -- A1..A2
    v_b_count        integer;   -- B1..B2
    v_satisfaisante  boolean;
    v_tres_bonne     boolean;
    v_missing        jsonb := '[]'::jsonb;
BEGIN
    SELECT COALESCE(array_agg(s.observable_code), ARRAY[]::text[])
      INTO v_acquired
      FROM public.student_observable_state sos
      JOIN public.observables s ON s.id = sos.observable_id
     WHERE sos.student_id = p_student_id
       AND sos.is_acquis  = TRUE
       AND s.subdimension_id IN (
           SELECT id FROM public.math_competence_subdimensions
            WHERE math_competence_id = p_math_competence_id
       );

    v_a1 := ('A1' = ANY (v_acquired));
    v_a2 := ('A2' = ANY (v_acquired));
    v_b1 := ('B1' = ANY (v_acquired));
    v_b2 := ('B2' = ANY (v_acquired));
    v_c1 := ('C1' = ANY (v_acquired));
    v_c2 := ('C2' = ANY (v_acquired));
    v_d1 := ('D1' = ANY (v_acquired));
    v_d2 := ('D2' = ANY (v_acquired));

    v_a_count := (CASE WHEN v_a1 THEN 1 ELSE 0 END) + (CASE WHEN v_a2 THEN 1 ELSE 0 END);
    v_b_count := (CASE WHEN v_b1 THEN 1 ELSE 0 END) + (CASE WHEN v_b2 THEN 1 ELSE 0 END);

    v_satisfaisante := v_a2 AND v_b1 AND v_b2;

    v_tres_bonne := v_satisfaisante AND v_c1 AND v_c2 AND (v_d1 OR v_d2);

    IF v_tres_bonne THEN
        RETURN QUERY SELECT 'tres_bonne'::text,
                            to_jsonb(v_acquired),
                            '[]'::jsonb;
        RETURN;
    END IF;

    IF v_satisfaisante THEN
        IF NOT v_c1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'C1');
        END IF;
        IF NOT v_c2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'C2');
        END IF;
        IF NOT (v_d1 OR v_d2) THEN
            -- ≥ 1 among {D1, D2} (only first two D matter for Représenter)
            v_missing := v_missing || jsonb_build_object(
                'kind', 'one_of_codes',
                'codes', jsonb_build_array('D1', 'D2')
            );
        END IF;
        RETURN QUERY SELECT 'satisfaisante'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Fragile : >=1 of A OR >=1 of B.
    IF (v_a_count >= 1) OR (v_b_count >= 1) THEN
        -- Missing for Satisfaisante:
        IF NOT v_a2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'A2');
        END IF;
        IF NOT v_b1 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'B1');
        END IF;
        IF NOT v_b2 THEN
            v_missing := v_missing || jsonb_build_object('kind', 'observable', 'code', 'B2');
        END IF;
        RETURN QUERY SELECT 'fragile'::text,
                            to_jsonb(v_acquired),
                            v_missing;
        RETURN;
    END IF;

    -- Insuffisante : residual.
    v_missing := jsonb_build_array(
        jsonb_build_object('kind', 'one_of_subdim', 'letter', 'A'),
        jsonb_build_object('kind', 'one_of_subdim', 'letter', 'B')
    );

    RETURN QUERY SELECT 'insuffisante'::text,
                        to_jsonb(v_acquired),
                        v_missing;
END $function$
;

CREATE OR REPLACE FUNCTION public.update_student_competence_level(p_student_id uuid, p_math_competence_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_niveau                 text;
    v_validated_observables  jsonb;
    v_missing_for_next       jsonb;
    v_task_count             integer;
BEGIN
    -- Compute the raw conjunctive verdict.
    SELECT niveau, validated_observables, missing_for_next
      INTO v_niveau, v_validated_observables, v_missing_for_next
      FROM public.compute_competence_level(p_student_id, p_math_competence_id);

    -- Unknown competence id: nothing to upsert.
    IF v_niveau IS NULL THEN
        RETURN;
    END IF;

    -- §6.4 safeguard — count distinct in-perimeter tasks observed for this
    -- student on observables belonging to this competence.
    SELECT COUNT(DISTINCT sa.task_id)
      INTO v_task_count
      FROM public.skill_attempts sa
      JOIN public.observables s ON s.id = sa.observable_id
      JOIN public.math_competence_subdimensions mcs ON mcs.id = s.subdimension_id
     WHERE sa.student_id = p_student_id
       AND sa.task_id   IS NOT NULL
       AND mcs.math_competence_id = p_math_competence_id;

    -- §6.4 caps:
    --   < 2 tasks  -> insuffisante (cannot validate any observable on a single task)
    --   < 3 tasks  -> cap Très bonne to Satisfaisante
    --
    -- Guards are emitted as typed objects { kind: 'guard', name: ... } to match
    -- the missing_for_next contract (refactor 2026-06-09).
    IF v_task_count < 2 THEN
        v_niveau := 'insuffisante';
        -- Reset validated_observables (the consolidation cannot have produced any
        -- acquired observable from < 2 tasks anyway — defensive consistency).
        v_validated_observables := '[]'::jsonb;
        v_missing_for_next      := jsonb_build_array(
            jsonb_build_object('kind', 'guard', 'name', 'needs_more_tasks')
        );
    ELSIF v_task_count < 3 AND v_niveau = 'tres_bonne' THEN
        v_niveau := 'satisfaisante';
        -- Signal that a 3rd task would unlock the upgrade.
        v_missing_for_next := jsonb_build_array(
            jsonb_build_object('kind', 'guard', 'name', 'confirm_with_third_task')
        );
    END IF;

    -- UPSERT.
    INSERT INTO public.student_competence_level (
        student_id,
        math_competence_id,
        niveau,
        validated_observables,
        missing_for_next,
        task_count,
        last_recalc_at
    ) VALUES (
        p_student_id,
        p_math_competence_id,
        v_niveau,
        COALESCE(v_validated_observables, '[]'::jsonb),
        COALESCE(v_missing_for_next,      '[]'::jsonb),
        v_task_count,
        NOW()
    )
    ON CONFLICT (student_id, math_competence_id) DO UPDATE
        SET niveau                = EXCLUDED.niveau,
            validated_observables = EXCLUDED.validated_observables,
            missing_for_next      = EXCLUDED.missing_for_next,
            task_count            = EXCLUDED.task_count,
            last_recalc_at        = NOW();
END $function$
;


