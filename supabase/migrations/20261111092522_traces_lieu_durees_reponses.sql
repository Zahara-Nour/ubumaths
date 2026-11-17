-- =============================================================================
-- Traces : lieu, durées, graine, réponse et verdict par case (ADR 0038)
-- =============================================================================
--
-- Chantier `formes-de-serie`, PR 1. Migration ADDITIVE : sept colonnes
-- facultatives sur `skill_attempts`, une fonction de contrôle, des CHECK.
--
-- Accès (question tranchée par David, ADR 0038) : aucune policy touchée. Les
-- policies de `skill_attempts` sont par ligne — l'élève lit les siennes
-- (`skill_attempts_select_own`), le prof celles de ses élèves
-- (`skill_attempts_select_teacher`, `is_my_student`) —, les colonnes neuves les
-- suivent : le prof lit individuellement réponses, temps et lieu de ses élèves,
-- comme les copies de contrôle. Personne d'autre ne gagne d'accès.
--
-- Bornes et cohérence EN BASE : un élève insère ses traces directement par
-- PostgREST (`skill_attempts_insert_own_student`), le Zod de l'API ne le
-- protège pas. Le prof lit ce texte libre écrit par des mineurs : borné ici.
--
-- Lieu (`place`) : flash_cards (Flash-cards) · typing (Saisie) · mock_test
-- (Contrôle blanc) · number_race (Course aux nombres) · review (révision) ·
-- evaluation (contrôle). Facultatif en base (anciennes traces) ; l'API l'exige.
--
-- Rollback (aucune donnée à perdre tant que le code n'écrit pas ces colonnes) :
--   alter table public.skill_attempts
--     drop constraint chk_trace_place_values,
--     drop constraint chk_trace_response_ms_range,
--     drop constraint chk_trace_allotted_ms_range,
--     drop constraint chk_trace_end_reason_values,
--     drop constraint chk_trace_seed_range,
--     drop constraint chk_trace_answer_parts_bounds,
--     drop constraint chk_trace_part_verdicts_bounds,
--     drop constraint chk_trace_parts_match,
--     drop constraint chk_trace_allotted_with_end,
--     drop constraint chk_trace_columns_need_place,
--     drop constraint chk_trace_timing_by_place,
--     drop constraint chk_trace_answer_by_place,
--     drop column place, drop column response_ms, drop column allotted_ms,
--     drop column end_reason, drop column seed, drop column answer_parts,
--     drop column part_verdicts;
--   drop function public.trace_answer_parts_valid(text[]);
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Colonnes
-- -----------------------------------------------------------------------------

alter table public.skill_attempts
	add column place text,
	add column response_ms integer,
	add column allotted_ms integer,
	add column end_reason text,
	add column seed integer,
	add column answer_parts text[],
	add column part_verdicts boolean[];

comment on column public.skill_attempts.place is
	'Lieu de la réponse : flash_cards, typing (Saisie), mock_test (Contrôle blanc), number_race (Course aux nombres), review (révision), evaluation (contrôle). NULL : trace antérieure à l''ADR 0038.';
comment on column public.skill_attempts.response_ms is
	'Durée de réponse en ms, de l''affichage de la question à « Valider » ou au temps écoulé. Formes chronométrées (mock_test, number_race) et contrôle seulement (N11).';
comment on column public.skill_attempts.allotted_ms is
	'Durée allouée à la question en ms. Formes chronométrées et contrôle seulement ; va avec end_reason.';
comment on column public.skill_attempts.end_reason is
	'Fin de la question : validated (l''élève a validé) ou timeout (temps écoulé). Va avec allotted_ms.';
comment on column public.skill_attempts.seed is
	'Graine du tirage : avec le modèle, reproduit valeurs, ordre des choix d''un QCM et mélange des étiquettes (generateInstance).';
comment on column public.skill_attempts.answer_parts is
	'Réponse de l''élève, une chaîne par case (50 cases, 2 000 caractères par case, 10 000 en tout au plus). Saisie, Contrôle blanc, Course aux nombres seulement. Purgée en fin d''année scolaire.';
comment on column public.skill_attempts.part_verdicts is
	'Verdict par case (juste / faux), autant que de cases dans answer_parts. Purgé avec elle.';

-- -----------------------------------------------------------------------------
-- 2. Contrôle d'une réponse : 1 à 50 cases, aucune NULL, 2 000 caractères par case
--    au plus (borne commune du code, `submission.ts`) et 10 000 en tout : un élève
--    insère directement, sans limite de nombre ; ce plafond garde une trace sous
--    ~40 Ko (David, 2026-11-11, audit de sécurité de la PR 1).
--    (un CHECK n'accepte pas de sous-requête : la boucle sur les cases vit ici)
-- -----------------------------------------------------------------------------

create or replace function public.trace_answer_parts_valid(p_parts text[])
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
	select coalesce(array_ndims(p_parts), 0) = 1
		and cardinality(p_parts) between 1 and 50
		and not exists (
			select 1
			from unnest(p_parts) as part
			where part is null or char_length(part) > 2000
		)
		and char_length(array_to_string(p_parts, '')) <= 10000;
$$;

comment on function public.trace_answer_parts_valid(text[]) is
	'CHECK de skill_attempts.answer_parts : 1 à 50 cases, aucune NULL, 2 000 caractères par case et 10 000 en tout au plus (ADR 0038).';

-- Le CHECK s'évalue avec les droits de l'élève qui insère : l'exécution est
-- donnée explicitement, sans compter sur les droits par défaut.
revoke all on function public.trace_answer_parts_valid(text[]) from public, anon;
grant execute on function public.trace_answer_parts_valid(text[]) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. Bornes
-- -----------------------------------------------------------------------------

alter table public.skill_attempts
	add constraint chk_trace_place_values check (
		place is null
		or place in ('flash_cards', 'typing', 'mock_test', 'number_race', 'review', 'evaluation')
	),
	add constraint chk_trace_response_ms_range check (
		response_ms is null or response_ms between 0 and 86400000
	),
	add constraint chk_trace_allotted_ms_range check (
		allotted_ms is null or allotted_ms between 1 and 86400000
	),
	add constraint chk_trace_end_reason_values check (
		end_reason is null or end_reason in ('validated', 'timeout')
	),
	add constraint chk_trace_seed_range check (seed is null or seed >= 0),
	add constraint chk_trace_answer_parts_bounds check (
		answer_parts is null or public.trace_answer_parts_valid(answer_parts)
	),
	add constraint chk_trace_part_verdicts_bounds check (
		part_verdicts is null
		or (
			coalesce(array_ndims(part_verdicts), 0) = 1
			and array_position(part_verdicts, null) is null
		)
	);

-- -----------------------------------------------------------------------------
-- 4. Cohérence (N10, N11 du journal formes-de-serie)
--    Les `coalesce(… , false)` évitent qu'un lieu NULL rende le CHECK « inconnu »,
--    donc accepté.
-- -----------------------------------------------------------------------------

alter table public.skill_attempts
	-- Réponse et verdicts vont ensemble, case pour case
	add constraint chk_trace_parts_match check (
		(answer_parts is null and part_verdicts is null)
		or (
			answer_parts is not null
			and part_verdicts is not null
			and cardinality(answer_parts) = cardinality(part_verdicts)
		)
	),
	-- Durée allouée et fin vont ensemble
	add constraint chk_trace_allotted_with_end check (
		(allotted_ms is null) = (end_reason is null)
	),
	-- Sans lieu, aucune colonne neuve (anciennes traces seulement)
	add constraint chk_trace_columns_need_place check (
		place is not null
		or (
			response_ms is null
			and allotted_ms is null
			and end_reason is null
			and seed is null
			and answer_parts is null
			and part_verdicts is null
		)
	),
	-- Durées et fin : formes chronométrées et contrôle seulement
	add constraint chk_trace_timing_by_place check (
		(response_ms is null and allotted_ms is null and end_reason is null)
		or coalesce(place in ('mock_test', 'number_race', 'evaluation'), false)
	),
	-- Réponse tapée : Saisie, Contrôle blanc, Course aux nombres seulement
	-- (le contrôle garde la sienne dans sa copie, `test_answers`)
	add constraint chk_trace_answer_by_place check (
		answer_parts is null
		or coalesce(place in ('typing', 'mock_test', 'number_race'), false)
	);
