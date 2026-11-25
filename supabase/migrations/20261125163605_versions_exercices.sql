-- Versions d'un exercice : un historique, la fiche choisit la sienne
-- ===================================================================
--
-- ADR 0044, chantier versions-exercices, PR 1 (la bascule).
--
-- Un exercice a des versions successives (1, 2, 3…). Chaque version porte le CONTENU (niveaux de
-- guidage dans `variations`, valeurs communes dans `shared`, fonctions de l'exercice dans
-- `generic_functions`) ; la fiche d'identité (titre, notion, étiquettes, « public »…) reste sur
-- l'exercice. Chaque ligne de fiche dit quelle version elle utilise ; hors fiche, c'est la dernière.
--
-- Reprise : chaque exercice devient sa version 1 (contenu actuel, à l'identique), chaque ligne de
-- fiche pointe vers la v1 de son exercice. Rien ne change à l'écran. Les anciennes colonnes de
-- contenu d'`exercises` restent jusqu'à la PR 4 (destructive, après `deploy:prod`) ; plus rien ne
-- les lit ni ne les écrit après cette PR.
--
-- Question d'accès (« qui pourra lire quoi, qu'il ne pouvait pas lire avant ? »), tranchée par
-- David le 2026-11-25 : PERSONNE. Une version se lit exactement quand son exercice se lit (la policy
-- de lecture délègue à la RLS d'`exercises`, présente et future) ; elle s'écrit quand il s'écrit
-- (prof auteur de l'exercice).
--
-- Suppression : `exercise_versions.exercise_id` est en cascade ; la clé composée
-- (exercise_id, exercise_version_id) des lignes de fiche est en NO ACTION, vérifiée en fin
-- d'instruction. Supprimer une version utilisée par une fiche est refusé ; supprimer l'exercice
-- passe (les deux cascades ont eu lieu avant la vérification). En RESTRICT, la seconde serait
-- refusée. La clé composée interdit aussi de pointer la version d'un AUTRE exercice.
--
-- ⚠️ Livraison (décision B de David, 2026-11-25) : PAS de déclencheur de compatibilité. Le code en
-- prod avant cette PR ajoute des lignes de fiche sans version : `db:migrate` et `deploy:prod` se
-- jouent coup sur coup, sans toucher à un exercice ni à une fiche entre les deux.
--
-- Additive (une table, une colonne, quatre fonctions réécrites à signature égale). Les fonctions
-- mortes qui lisent l'ancien contenu (get_*_exercise_assignments, exercise_has_multiple_variations,
-- exercise_variation_count) partent en PR 4.
--
-- Rollback : rend les quatre fonctions d'avant, puis retire la colonne et la table (les versions
-- 2 et plus, créées après la mise en prod, seraient perdues). Le bloc est joué par
-- tests/integration/versions-exercices.test.ts.
--
-- ROLLBACK:BEGIN
-- CREATE OR REPLACE FUNCTION public.get_worksheet_by_share_token(p_token text, p_worksheet_id uuid)
--  RETURNS jsonb
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'pg_temp'
-- AS $function$
-- declare
-- 	v_class_id uuid;
-- 	v_cite boolean;
-- 	v_result jsonb;
-- begin
-- 	-- Garde de forme avant toute lecture.
-- 	if p_token is null or char_length(p_token) not between 16 and 64 then
-- 		return null;
-- 	end if;
-- 	if p_worksheet_id is null then
-- 		return null;
-- 	end if;
--
-- 	select t.class_id into v_class_id
-- 	from public.class_journal_share_tokens t
-- 	join public.classes c on c.id = t.class_id
-- 	where t.token = p_token
-- 		and t.is_active
-- 		and (t.expires_at is null or t.expires_at > now())
-- 		and c.is_active;
--
-- 	if not found then
-- 		return null;
-- 	end if;
--
-- 	-- La fiche est-elle CITÉE dans une séance visible de ce cahier ?
-- 	-- Dans son contenu de cours, OU dans l'un de ses travaux à faire.
-- 	select exists (
-- 		select 1
-- 		from public.class_journal_entries e
-- 		where e.class_id = v_class_id
-- 			and e.is_published
-- 			and e.entry_date <= current_date
-- 			and (
-- 				position('[[worksheet:' || p_worksheet_id::text in coalesce(e.lesson_content, '')) > 0
-- 				or exists (
-- 					select 1
-- 					from public.journal_entry_homework h
-- 					where h.entry_id = e.id
-- 						and position('[[worksheet:' || p_worksheet_id::text in h.content) > 0
-- 				)
-- 			)
-- 	) into v_cite;
--
-- 	-- Même réponse qu'un jeton invalide : ne rien apprendre sur l'existence de
-- 	-- la fiche à qui essaierait des identifiants au hasard.
-- 	if not v_cite then
-- 		return null;
-- 	end if;
--
-- 	select jsonb_build_object(
-- 		'id', w.id,
-- 		'title', w.title,
-- 		-- Titre libre ou titre composé (ADR 0041) : le PDF en dépend.
-- 		'custom_title', w.custom_title,
-- 		'description', w.description,
-- 		'type', w.type,
-- 		'config', w.config,
-- 		'status', w.status,
-- 		'grades', w.grades,
-- 		-- Catégorie et notions de la fiche (ADR 0041) : imprimées sur le PDF.
-- 		'category', w.category,
-- 		'classifications', coalesce((
-- 			select jsonb_agg(
-- 				jsonb_build_object(
-- 					'node_id', n.id,
-- 					'name', n.name,
-- 					-- Nom anglais du nœud (ADR 0043) : le PDF anglais l'imprime.
-- 					'translations', n.translations,
-- 					'kind', n.kind,
-- 					'position', wc.position
-- 				) order by wc.position, n.name
-- 			)
-- 			from public.worksheet_classifications wc
-- 			join public.classification_nodes n on n.id = wc.node_id
-- 			where wc.worksheet_id = w.id
-- 		), '[]'::jsonb),
-- 		'translations', w.translations,
-- 		'total_points', w.total_points,
-- 		'estimated_duration_minutes', w.estimated_duration_minutes,
-- 		-- Le style de la fiche (ADR 0028, lot 4a, D11) : le PDF le suit. Un style
-- 		-- de Chiphre est dans le code ; seule la fiche d'un style de l'AUTEUR de la
-- 		-- fiche est transmise (jamais celle d'un autre compte).
-- 		'style_id', w.style_id,
-- 		'template', (
-- 			select jsonb_build_object(
-- 				'id', t.id,
-- 				'name', t.name,
-- 				'description', t.description,
-- 				'style_id', t.style_id,
-- 				'template_content', t.template_content
-- 			)
-- 			from public.worksheet_templates t
-- 			join public.worksheet_styles st on st.id = t.style_id
-- 			where t.style_id = w.style_id
-- 				and t.form = 'worksheet'
-- 				and st.owner_id = w.created_by
-- 		),
-- 		'sections', coalesce((
-- 			select jsonb_agg(
-- 				jsonb_build_object(
-- 					'id', s.id,
-- 					'worksheet_id', s.worksheet_id,
-- 					'title', s.title,
-- 					'instructions', s.instructions,
-- 					'position', s.position,
-- 					'points_total', s.points_total,
-- 					'translations', s.translations
-- 				) order by s.position
-- 			)
-- 			from public.worksheet_sections s
-- 			where s.worksheet_id = w.id
-- 		), '[]'::jsonb),
-- 		'exercises', coalesce((
-- 			select jsonb_agg(
-- 				jsonb_build_object(
-- 					'id', we.id,
-- 					'worksheet_id', we.worksheet_id,
-- 					'exercise_id', we.exercise_id,
-- 					'section_id', we.section_id,
-- 					'position', we.position,
-- 					'points', we.points,
-- 					'is_essential', we.is_essential,
-- 					'custom_instructions', we.custom_instructions,
-- 					'variant_mode', we.variant_mode,
-- 					'variant_config', we.variant_config,
-- 					'variation_index', we.variation_index,
-- 					'translations', we.translations,
-- 					-- Lignes des cadres de réponse réglées par le prof (ADR 0030, lot 4) : le
-- 					-- PDF du lien de partage a les mêmes cadres que celui du prof
-- 					'answer_frame_lines', we.answer_frame_lines,
-- 					'exercise', jsonb_build_object(
-- 						'id', e.id,
-- 						'title', e.title,
-- 						'variables', e.variables,
-- 						'shared', e.shared,
-- 						'variations', e.variations,
-- 						-- Lettres déclarées comme fonctions (C'(x) dans le PDF)
-- 						'generic_functions', e.generic_functions
-- 					)
-- 				) order by we.position
-- 			)
-- 			from public.worksheet_exercises we
-- 			join public.exercises e on e.id = we.exercise_id
-- 			where we.worksheet_id = w.id
-- 		), '[]'::jsonb)
-- 	) into v_result
-- 	from public.worksheets w
-- 	where w.id = p_worksheet_id;
--
-- 	return v_result; end;
-- $function$;
--
-- CREATE OR REPLACE FUNCTION public.get_course_worksheet_by_share_token(p_token text, p_worksheet_id uuid)
--  RETURNS jsonb
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'pg_temp'
-- AS $function$
-- declare
-- 	v_class_id uuid;
-- 	v_visible boolean;
-- 	v_result jsonb;
-- begin
-- 	-- Garde de forme avant toute lecture.
-- 	if p_token is null or char_length(p_token) not between 16 and 64 then
-- 		return null;
-- 	end if;
-- 	if p_worksheet_id is null then
-- 		return null;
-- 	end if;
--
-- 	select t.class_id into v_class_id
-- 	from public.class_course_share_tokens t
-- 	join public.classes c on c.id = t.class_id
-- 	where t.token = p_token
-- 		and t.is_active
-- 		and (t.expires_at is null or t.expires_at > now())
-- 		and c.is_active;
--
-- 	if not found then
-- 		return null;
-- 	end if;
--
-- 	select exists (
-- 		select 1
-- 		from public.chapter_worksheets cw
-- 		join public.class_chapters ch on ch.id = cw.chapter_id
-- 		where cw.worksheet_id = p_worksheet_id
-- 			and ch.class_id = v_class_id
-- 			and ch.is_visible
-- 			and cw.published_at <= now()
-- 	)
-- 	and exists (
-- 		select 1
-- 		from public.worksheet_assignments wa
-- 		join public.worksheet_assignment_classes wac on wac.assignment_id = wa.id
-- 		where wa.worksheet_id = p_worksheet_id
-- 			and wac.class_id = v_class_id
-- 			and wa.status = 'active'
-- 			and (wa.available_from is null or wa.available_from <= now())
-- 	) into v_visible;
--
-- 	-- Même réponse qu'un jeton invalide : ne rien apprendre sur l'existence de
-- 	-- la fiche à qui essaierait des identifiants au hasard.
-- 	if not v_visible then
-- 		return null;
-- 	end if;
--
-- 	select jsonb_build_object(
-- 		'id', w.id,
-- 		'title', w.title,
-- 		-- Titre libre ou titre composé (ADR 0041) : le PDF en dépend.
-- 		'custom_title', w.custom_title,
-- 		'description', w.description,
-- 		'type', w.type,
-- 		'config', w.config,
-- 		'status', w.status,
-- 		'grades', w.grades,
-- 		-- Catégorie et notions de la fiche (ADR 0041) : imprimées sur le PDF.
-- 		'category', w.category,
-- 		'classifications', coalesce((
-- 			select jsonb_agg(
-- 				jsonb_build_object(
-- 					'node_id', n.id,
-- 					'name', n.name,
-- 					-- Nom anglais du nœud (ADR 0043) : le PDF anglais l'imprime.
-- 					'translations', n.translations,
-- 					'kind', n.kind,
-- 					'position', wc.position
-- 				) order by wc.position, n.name
-- 			)
-- 			from public.worksheet_classifications wc
-- 			join public.classification_nodes n on n.id = wc.node_id
-- 			where wc.worksheet_id = w.id
-- 		), '[]'::jsonb),
-- 		'translations', w.translations,
-- 		'total_points', w.total_points,
-- 		'estimated_duration_minutes', w.estimated_duration_minutes,
-- 		-- Le style de la fiche (ADR 0028, lot 4a, D11) : le PDF le suit. Un style
-- 		-- de Chiphre est dans le code ; seule la fiche d'un style de l'AUTEUR de la
-- 		-- fiche est transmise (jamais celle d'un autre compte).
-- 		'style_id', w.style_id,
-- 		'template', (
-- 			select jsonb_build_object(
-- 				'id', t.id,
-- 				'name', t.name,
-- 				'description', t.description,
-- 				'style_id', t.style_id,
-- 				'template_content', t.template_content
-- 			)
-- 			from public.worksheet_templates t
-- 			join public.worksheet_styles st on st.id = t.style_id
-- 			where t.style_id = w.style_id
-- 				and t.form = 'worksheet'
-- 				and st.owner_id = w.created_by
-- 		),
-- 		'sections', coalesce((
-- 			select jsonb_agg(
-- 				jsonb_build_object(
-- 					'id', s.id,
-- 					'worksheet_id', s.worksheet_id,
-- 					'title', s.title,
-- 					'instructions', s.instructions,
-- 					'position', s.position,
-- 					'points_total', s.points_total,
-- 					'translations', s.translations
-- 				) order by s.position
-- 			)
-- 			from public.worksheet_sections s
-- 			where s.worksheet_id = w.id
-- 		), '[]'::jsonb),
-- 		'exercises', coalesce((
-- 			select jsonb_agg(
-- 				jsonb_build_object(
-- 					'id', we.id,
-- 					'worksheet_id', we.worksheet_id,
-- 					'exercise_id', we.exercise_id,
-- 					'section_id', we.section_id,
-- 					'position', we.position,
-- 					'points', we.points,
-- 					'is_essential', we.is_essential,
-- 					'custom_instructions', we.custom_instructions,
-- 					'variant_mode', we.variant_mode,
-- 					'variant_config', we.variant_config,
-- 					'variation_index', we.variation_index,
-- 					'translations', we.translations,
-- 					-- Lignes des cadres de réponse réglées par le prof (ADR 0030, lot 4) : le
-- 					-- PDF du lien de partage a les mêmes cadres que celui du prof
-- 					'answer_frame_lines', we.answer_frame_lines,
-- 					'exercise', jsonb_build_object(
-- 						'id', e.id,
-- 						'title', e.title,
-- 						'variables', e.variables,
-- 						'shared', e.shared,
-- 						'variations', e.variations,
-- 						-- Lettres déclarées comme fonctions (C'(x) dans le PDF)
-- 						'generic_functions', e.generic_functions
-- 					)
-- 				) order by we.position
-- 			)
-- 			from public.worksheet_exercises we
-- 			join public.exercises e on e.id = we.exercise_id
-- 			where we.worksheet_id = w.id
-- 		), '[]'::jsonb)
-- 	) into v_result
-- 	from public.worksheets w
-- 	where w.id = p_worksheet_id;
--
-- 	return v_result; end;
-- $function$;
--
-- CREATE OR REPLACE FUNCTION public.get_student_exercises(p_student_id uuid)
--  RETURNS TABLE(exercise_id uuid, exercise_title text, variations jsonb, shared jsonb, variables jsonb, distribution_mode text, tags text[], grades text[], assignment_id uuid, assignment_type text, assigned_at timestamp with time zone, optional_deadline timestamp with time zone, notes text, assigned_by_name text, completed_at timestamp with time zone, last_viewed_at timestamp with time zone, view_count integer)
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
-- 	-- Garde (lot 1) : soi-même, le professeur/admin, ou un appel service.
-- 	select public.assert_can_read_student(p_student_id);
-- 	select
-- 		e.id as exercise_id,
-- 		e.title as exercise_title,
-- 		e.variations,
-- 		e.shared,
-- 		e.variables,
-- 		e.distribution_mode,
-- 		coalesce(
-- 			array(
-- 				select t.name from resource_tags rt
-- 				join tags t on t.id = rt.tag_id
-- 				where rt.resource_id = e.id and rt.resource_kind = 'exercise'
-- 				order by t.name
-- 			),
-- 			'{}'::text[]
-- 		) as tags,
-- 		e.grades,
-- 		ea.id as assignment_id,
-- 		ea.assigned_to_type as assignment_type,
-- 		ea.assigned_at,
-- 		ea.optional_deadline,
-- 		ea.notes,
-- 		p.full_name as assigned_by_name,
-- 		ec.completed_at,
-- 		ec.last_viewed_at,
-- 		ec.view_count
-- 	from exercises e
-- 	left join exercise_assignments ea on e.id = ea.exercise_id
-- 		and ea.is_active = true
-- 		and (
-- 			ea.student_id = p_student_id
-- 			or ea.class_id in (
-- 				select class_id from class_members
-- 				where student_id = p_student_id and status = 'active'
-- 			)
-- 			or ea.assigned_to_type = 'public'
-- 		)
-- 	left join profiles p on ea.assigned_by = p.id
-- 	left join exercise_completions ec on e.id = ec.exercise_id
-- 		and ec.student_id = p_student_id
-- 	where
-- 		e.is_public = true
-- 		or ea.id is not null
-- 	order by
-- 		case when ea.id is not null and ec.completed_at is null then 0 else 1 end,
-- 		ec.last_viewed_at desc nulls last,
-- 		ea.assigned_at desc nulls last;
-- $function$;
--
-- CREATE OR REPLACE FUNCTION public.get_exercise_by_share_token(p_token text)
--  RETURNS SETOF exercises
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'pg_temp'
-- AS $function$
-- DECLARE
-- 	v_exercise_id uuid;
-- BEGIN
-- 	-- Le jeton exact, actif et non expiré, sinon rien.
-- 	SELECT exercise_id INTO v_exercise_id
-- 	FROM public.exercise_share_tokens
-- 	WHERE token = p_token
-- 	  AND is_active = true
-- 	  AND (expires_at IS NULL OR expires_at > now());
--
-- 	IF v_exercise_id IS NULL THEN
-- 		RETURN; -- aucune ligne : jeton inconnu, révoqué ou expiré
-- 	END IF;
--
-- 	-- Comptage des accès (incrément atomique dans l'UPDATE).
-- 	UPDATE public.exercise_share_tokens
-- 	SET last_accessed_at = now(),
-- 		access_count = coalesce(access_count, 0) + 1
-- 	WHERE token = p_token;
--
-- 	RETURN QUERY SELECT * FROM public.exercises WHERE id = v_exercise_id; END;
-- $function$;
--
-- alter table public.worksheet_exercises drop constraint worksheet_exercises_exercise_version_fkey;
-- drop index public.worksheet_exercises_exercise_version_idx;
-- alter table public.worksheet_exercises drop column exercise_version_id;
-- drop table public.exercise_versions;
-- ROLLBACK:END

-- ============================================================================
-- 1. La table des versions
-- ============================================================================

create table public.exercise_versions (
	id uuid primary key default gen_random_uuid(),
	exercise_id uuid not null references public.exercises (id) on delete cascade,
	number integer not null check (number >= 1),
	-- « v2 : question b) reformulée après le test en 2de 3 »
	note text check (note is null or char_length(note) between 1 and 500),
	-- Mêmes types et mêmes contrôles que les colonnes d'`exercises` qu'elles remplacent
	variations jsonb check (variations is null or jsonb_typeof(variations) = 'array'),
	shared jsonb check (shared is null or jsonb_typeof(shared) = 'object'),
	generic_functions text[],
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	created_by uuid not null references public.profiles (id) on delete cascade,
	constraint exercise_versions_number_unique unique (exercise_id, number),
	-- Cible de la clé composée des lignes de fiche
	constraint exercise_versions_exercise_id_id_unique unique (exercise_id, id)
);

comment on table public.exercise_versions is
	'Versions successives d''un exercice (ADR 0044) : le contenu (variations, shared, generic_functions). Hors fiche, la dernière (plus grand numéro) ; dans une fiche, celle de worksheet_exercises.exercise_version_id.';

create trigger exercise_versions_updated_at
	before update on public.exercise_versions
	for each row execute function public.update_updated_at_column();

alter table public.exercise_versions enable row level security;

revoke all on public.exercise_versions from public, anon, authenticated;
grant select on public.exercise_versions to anon, authenticated;
grant insert, update, delete on public.exercise_versions to authenticated;
grant all on public.exercise_versions to service_role;

-- Lecture : exactement quand l'exercice se lit. La sous-requête passe par la RLS d'`exercises`
-- (policies présentes et futures) : aucune règle d'accès n'est recopiée ici.
create policy "Read versions of readable exercises" on public.exercise_versions
	for select to anon, authenticated
	using (exists (select 1 from public.exercises e where e.id = exercise_versions.exercise_id));

-- Écriture : le prof auteur de l'exercice, comme les policies d'`exercises`.
create policy "Teachers can create versions of own exercises" on public.exercise_versions
	for insert to authenticated
	with check (
		exists (
			select 1 from public.profiles p
			where p.id = (select auth.uid()) and p.role = 'teacher'::public.user_role
		)
		and created_by = (select auth.uid())
		and exists (
			select 1 from public.exercises e
			where e.id = exercise_versions.exercise_id and e.created_by = (select auth.uid())
		)
	);

create policy "Teachers can update versions of own exercises" on public.exercise_versions
	for update to authenticated
	using (
		exists (
			select 1 from public.profiles p
			where p.id = (select auth.uid()) and p.role = 'teacher'::public.user_role
		)
		and exists (
			select 1 from public.exercises e
			where e.id = exercise_versions.exercise_id and e.created_by = (select auth.uid())
		)
	)
	with check (
		exists (
			select 1 from public.exercises e
			where e.id = exercise_versions.exercise_id and e.created_by = (select auth.uid())
		)
	);

create policy "Teachers can delete versions of own exercises" on public.exercise_versions
	for delete to authenticated
	using (
		exists (
			select 1 from public.profiles p
			where p.id = (select auth.uid()) and p.role = 'teacher'::public.user_role
		)
		and exists (
			select 1 from public.exercises e
			where e.id = exercise_versions.exercise_id and e.created_by = (select auth.uid())
		)
	);

-- ============================================================================
-- 2. Reprise : chaque exercice devient sa version 1, à l'identique
-- ============================================================================

insert into public.exercise_versions (
	exercise_id, number, variations, shared, generic_functions, created_at, updated_at, created_by
)
select e.id, 1, e.variations, e.shared, e.generic_functions, e.created_at, e.updated_at, e.created_by
from public.exercises e;

-- ============================================================================
-- 3. Chaque ligne de fiche dit sa version
-- ============================================================================

alter table public.worksheet_exercises add column exercise_version_id uuid;

-- La reprise ne date pas les lignes d'une modification qui n'a pas eu lieu (`updated_at`).
alter table public.worksheet_exercises disable trigger update_worksheet_exercises_updated_at;
update public.worksheet_exercises we
set exercise_version_id = v.id
from public.exercise_versions v
where v.exercise_id = we.exercise_id and v.number = 1;
alter table public.worksheet_exercises enable trigger update_worksheet_exercises_updated_at;

alter table public.worksheet_exercises alter column exercise_version_id set not null;

alter table public.worksheet_exercises
	add constraint worksheet_exercises_exercise_version_fkey
	foreign key (exercise_id, exercise_version_id)
	references public.exercise_versions (exercise_id, id)
	on delete no action;

-- Supprimer une version cherche ses lignes de fiche
create index worksheet_exercises_exercise_version_idx
	on public.worksheet_exercises (exercise_id, exercise_version_id);

comment on column public.worksheet_exercises.exercise_version_id is
	'Version de l''exercice utilisée par cette fiche (ADR 0044). Une version pointée ne se supprime pas.';

-- ============================================================================
-- 4. Les fonctions qui rendent le contenu d'un exercice
-- ============================================================================
--
-- Signatures, droits et clés rendues inchangés ; seule la source du contenu change :
-- - liens de partage d'une fiche (cahier de texte, cours) : la version de la ligne de fiche ;
-- - lien de partage d'un exercice, exercices d'un élève : la dernière version.


CREATE OR REPLACE FUNCTION public.get_worksheet_by_share_token(p_token text, p_worksheet_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
	v_class_id uuid;
	v_cite boolean;
	v_result jsonb;
begin
	-- Garde de forme avant toute lecture.
	if p_token is null or char_length(p_token) not between 16 and 64 then
		return null;
	end if;
	if p_worksheet_id is null then
		return null;
	end if;

	select t.class_id into v_class_id
	from public.class_journal_share_tokens t
	join public.classes c on c.id = t.class_id
	where t.token = p_token
		and t.is_active
		and (t.expires_at is null or t.expires_at > now())
		and c.is_active;

	if not found then
		return null;
	end if;

	-- La fiche est-elle CITÉE dans une séance visible de ce cahier ?
	-- Dans son contenu de cours, OU dans l'un de ses travaux à faire.
	select exists (
		select 1
		from public.class_journal_entries e
		where e.class_id = v_class_id
			and e.is_published
			and e.entry_date <= current_date
			and (
				position('[[worksheet:' || p_worksheet_id::text in coalesce(e.lesson_content, '')) > 0
				or exists (
					select 1
					from public.journal_entry_homework h
					where h.entry_id = e.id
						and position('[[worksheet:' || p_worksheet_id::text in h.content) > 0
				)
			)
	) into v_cite;

	-- Même réponse qu'un jeton invalide : ne rien apprendre sur l'existence de
	-- la fiche à qui essaierait des identifiants au hasard.
	if not v_cite then
		return null;
	end if;

	select jsonb_build_object(
		'id', w.id,
		'title', w.title,
		-- Titre libre ou titre composé (ADR 0041) : le PDF en dépend.
		'custom_title', w.custom_title,
		'description', w.description,
		'type', w.type,
		'config', w.config,
		'status', w.status,
		'grades', w.grades,
		-- Catégorie et notions de la fiche (ADR 0041) : imprimées sur le PDF.
		'category', w.category,
		'classifications', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'node_id', n.id,
					'name', n.name,
					-- Nom anglais du nœud (ADR 0043) : le PDF anglais l'imprime.
					'translations', n.translations,
					'kind', n.kind,
					'position', wc.position
				) order by wc.position, n.name
			)
			from public.worksheet_classifications wc
			join public.classification_nodes n on n.id = wc.node_id
			where wc.worksheet_id = w.id
		), '[]'::jsonb),
		'translations', w.translations,
		'total_points', w.total_points,
		'estimated_duration_minutes', w.estimated_duration_minutes,
		-- Le style de la fiche (ADR 0028, lot 4a, D11) : le PDF le suit. Un style
		-- de Chiphre est dans le code ; seule la fiche d'un style de l'AUTEUR de la
		-- fiche est transmise (jamais celle d'un autre compte).
		'style_id', w.style_id,
		'template', (
			select jsonb_build_object(
				'id', t.id,
				'name', t.name,
				'description', t.description,
				'style_id', t.style_id,
				'template_content', t.template_content
			)
			from public.worksheet_templates t
			join public.worksheet_styles st on st.id = t.style_id
			where t.style_id = w.style_id
				and t.form = 'worksheet'
				and st.owner_id = w.created_by
		),
		'sections', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'id', s.id,
					'worksheet_id', s.worksheet_id,
					'title', s.title,
					'instructions', s.instructions,
					'position', s.position,
					'points_total', s.points_total,
					'translations', s.translations
				) order by s.position
			)
			from public.worksheet_sections s
			where s.worksheet_id = w.id
		), '[]'::jsonb),
		'exercises', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'id', we.id,
					'worksheet_id', we.worksheet_id,
					'exercise_id', we.exercise_id,
					'section_id', we.section_id,
					'position', we.position,
					'points', we.points,
					'is_essential', we.is_essential,
					'custom_instructions', we.custom_instructions,
					'variant_mode', we.variant_mode,
					'variant_config', we.variant_config,
					'variation_index', we.variation_index,
					'translations', we.translations,
					-- Lignes des cadres de réponse réglées par le prof (ADR 0030, lot 4) : le
					-- PDF du lien de partage a les mêmes cadres que celui du prof
					'answer_frame_lines', we.answer_frame_lines,
					'exercise', jsonb_build_object(
						'id', e.id,
						'title', e.title,
						'variables', e.variables,
						-- Contenu de la VERSION choisie par la fiche (ADR 0044), pas la dernière
						'shared', v.shared,
						'variations', v.variations,
						-- Lettres déclarées comme fonctions (C'(x) dans le PDF)
						'generic_functions', v.generic_functions
					)
				) order by we.position
			)
			from public.worksheet_exercises we
			join public.exercises e on e.id = we.exercise_id
			join public.exercise_versions v on v.id = we.exercise_version_id
			where we.worksheet_id = w.id
		), '[]'::jsonb)
	) into v_result
	from public.worksheets w
	where w.id = p_worksheet_id;

	return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_course_worksheet_by_share_token(p_token text, p_worksheet_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
	v_class_id uuid;
	v_visible boolean;
	v_result jsonb;
begin
	-- Garde de forme avant toute lecture.
	if p_token is null or char_length(p_token) not between 16 and 64 then
		return null;
	end if;
	if p_worksheet_id is null then
		return null;
	end if;

	select t.class_id into v_class_id
	from public.class_course_share_tokens t
	join public.classes c on c.id = t.class_id
	where t.token = p_token
		and t.is_active
		and (t.expires_at is null or t.expires_at > now())
		and c.is_active;

	if not found then
		return null;
	end if;

	select exists (
		select 1
		from public.chapter_worksheets cw
		join public.class_chapters ch on ch.id = cw.chapter_id
		where cw.worksheet_id = p_worksheet_id
			and ch.class_id = v_class_id
			and ch.is_visible
			and cw.published_at <= now()
	)
	and exists (
		select 1
		from public.worksheet_assignments wa
		join public.worksheet_assignment_classes wac on wac.assignment_id = wa.id
		where wa.worksheet_id = p_worksheet_id
			and wac.class_id = v_class_id
			and wa.status = 'active'
			and (wa.available_from is null or wa.available_from <= now())
	) into v_visible;

	-- Même réponse qu'un jeton invalide : ne rien apprendre sur l'existence de
	-- la fiche à qui essaierait des identifiants au hasard.
	if not v_visible then
		return null;
	end if;

	select jsonb_build_object(
		'id', w.id,
		'title', w.title,
		-- Titre libre ou titre composé (ADR 0041) : le PDF en dépend.
		'custom_title', w.custom_title,
		'description', w.description,
		'type', w.type,
		'config', w.config,
		'status', w.status,
		'grades', w.grades,
		-- Catégorie et notions de la fiche (ADR 0041) : imprimées sur le PDF.
		'category', w.category,
		'classifications', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'node_id', n.id,
					'name', n.name,
					-- Nom anglais du nœud (ADR 0043) : le PDF anglais l'imprime.
					'translations', n.translations,
					'kind', n.kind,
					'position', wc.position
				) order by wc.position, n.name
			)
			from public.worksheet_classifications wc
			join public.classification_nodes n on n.id = wc.node_id
			where wc.worksheet_id = w.id
		), '[]'::jsonb),
		'translations', w.translations,
		'total_points', w.total_points,
		'estimated_duration_minutes', w.estimated_duration_minutes,
		-- Le style de la fiche (ADR 0028, lot 4a, D11) : le PDF le suit. Un style
		-- de Chiphre est dans le code ; seule la fiche d'un style de l'AUTEUR de la
		-- fiche est transmise (jamais celle d'un autre compte).
		'style_id', w.style_id,
		'template', (
			select jsonb_build_object(
				'id', t.id,
				'name', t.name,
				'description', t.description,
				'style_id', t.style_id,
				'template_content', t.template_content
			)
			from public.worksheet_templates t
			join public.worksheet_styles st on st.id = t.style_id
			where t.style_id = w.style_id
				and t.form = 'worksheet'
				and st.owner_id = w.created_by
		),
		'sections', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'id', s.id,
					'worksheet_id', s.worksheet_id,
					'title', s.title,
					'instructions', s.instructions,
					'position', s.position,
					'points_total', s.points_total,
					'translations', s.translations
				) order by s.position
			)
			from public.worksheet_sections s
			where s.worksheet_id = w.id
		), '[]'::jsonb),
		'exercises', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'id', we.id,
					'worksheet_id', we.worksheet_id,
					'exercise_id', we.exercise_id,
					'section_id', we.section_id,
					'position', we.position,
					'points', we.points,
					'is_essential', we.is_essential,
					'custom_instructions', we.custom_instructions,
					'variant_mode', we.variant_mode,
					'variant_config', we.variant_config,
					'variation_index', we.variation_index,
					'translations', we.translations,
					-- Lignes des cadres de réponse réglées par le prof (ADR 0030, lot 4) : le
					-- PDF du lien de partage a les mêmes cadres que celui du prof
					'answer_frame_lines', we.answer_frame_lines,
					'exercise', jsonb_build_object(
						'id', e.id,
						'title', e.title,
						'variables', e.variables,
						-- Contenu de la VERSION choisie par la fiche (ADR 0044), pas la dernière
						'shared', v.shared,
						'variations', v.variations,
						-- Lettres déclarées comme fonctions (C'(x) dans le PDF)
						'generic_functions', v.generic_functions
					)
				) order by we.position
			)
			from public.worksheet_exercises we
			join public.exercises e on e.id = we.exercise_id
			join public.exercise_versions v on v.id = we.exercise_version_id
			where we.worksheet_id = w.id
		), '[]'::jsonb)
	) into v_result
	from public.worksheets w
	where w.id = p_worksheet_id;

	return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_student_exercises(p_student_id uuid)
 RETURNS TABLE(exercise_id uuid, exercise_title text, variations jsonb, shared jsonb, variables jsonb, distribution_mode text, tags text[], grades text[], assignment_id uuid, assignment_type text, assigned_at timestamp with time zone, optional_deadline timestamp with time zone, notes text, assigned_by_name text, completed_at timestamp with time zone, last_viewed_at timestamp with time zone, view_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
	-- Garde (lot 1) : soi-même, le professeur/admin, ou un appel service.
	select public.assert_can_read_student(p_student_id);
	select
		e.id as exercise_id,
		e.title as exercise_title,
		-- Hors fiche : la DERNIÈRE version (ADR 0044)
		dv.variations,
		dv.shared,
		e.variables,
		e.distribution_mode,
		coalesce(
			array(
				select t.name from resource_tags rt
				join tags t on t.id = rt.tag_id
				where rt.resource_id = e.id and rt.resource_kind = 'exercise'
				order by t.name
			),
			'{}'::text[]
		) as tags,
		e.grades,
		ea.id as assignment_id,
		ea.assigned_to_type as assignment_type,
		ea.assigned_at,
		ea.optional_deadline,
		ea.notes,
		p.full_name as assigned_by_name,
		ec.completed_at,
		ec.last_viewed_at,
		ec.view_count
	from exercises e
	left join lateral (
		select v.variations, v.shared
		from exercise_versions v
		where v.exercise_id = e.id
		order by v.number desc
		limit 1
	) dv on true
	left join exercise_assignments ea on e.id = ea.exercise_id
		and ea.is_active = true
		and (
			ea.student_id = p_student_id
			or ea.class_id in (
				select class_id from class_members
				where student_id = p_student_id and status = 'active'
			)
			or ea.assigned_to_type = 'public'
		)
	left join profiles p on ea.assigned_by = p.id
	left join exercise_completions ec on e.id = ec.exercise_id
		and ec.student_id = p_student_id
	where
		e.is_public = true
		or ea.id is not null
	order by
		case when ea.id is not null and ec.completed_at is null then 0 else 1 end,
		ec.last_viewed_at desc nulls last,
		ea.assigned_at desc nulls last;
$function$;

CREATE OR REPLACE FUNCTION public.get_exercise_by_share_token(p_token text)
 RETURNS SETOF exercises
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
	v_exercise_id uuid;
BEGIN
	-- Le jeton exact, actif et non expiré, sinon rien.
	SELECT exercise_id INTO v_exercise_id
	FROM public.exercise_share_tokens
	WHERE token = p_token
	  AND is_active = true
	  AND (expires_at IS NULL OR expires_at > now());

	IF v_exercise_id IS NULL THEN
		RETURN; -- aucune ligne : jeton inconnu, révoqué ou expiré
	END IF;

	-- Comptage des accès (incrément atomique dans l'UPDATE).
	UPDATE public.exercise_share_tokens
	SET last_accessed_at = now(),
		access_count = coalesce(access_count, 0) + 1
	WHERE token = p_token;

	-- Hors fiche : le contenu de la DERNIÈRE version (ADR 0044). La forme rendue reste celle
	-- d'une ligne d'`exercises` ; ses colonnes de contenu portent la dernière version (elles
	-- disparaissent en PR 4, avec ce détour).
	RETURN QUERY
	SELECT (jsonb_populate_record(
		e,
		jsonb_build_object(
			'variations', dv.variations,
			'shared', dv.shared,
			'generic_functions', to_jsonb(dv.generic_functions)
		)
	)).*
	FROM public.exercises e
	LEFT JOIN LATERAL (
		SELECT v.variations, v.shared, v.generic_functions
		FROM public.exercise_versions v
		WHERE v.exercise_id = e.id
		ORDER BY v.number DESC
		LIMIT 1
	) dv ON true
	WHERE e.id = v_exercise_id;
END;
$function$;
