-- Catégorie et notions d'une fiche (ADR 0041)
-- =============================================
-- Une fiche dit QUEL GENRE de fiche elle est (catégorie, fiche d'exercices
-- seulement) et DE QUOI ELLE PARLE (notions de l'arbre, ADR 0019). Les deux
-- s'impriment sur le PDF (titre composé, bas de page).
--
-- Question d'accès (tranchée par David le 2026-11-19) :
-- - le prof lit et écrit la catégorie et les notions de SES fiches (l'admin
--   aussi, comme pour la fiche elle-même) ;
-- - on lit les notions d'une fiche exactement quand on lit la fiche (RLS de
--   `worksheets`) : l'élève à qui elle est donnée les lit ;
-- - le visiteur d'un lien de partage (cahier de texte, cours partagé) reçoit
--   la catégorie et les notions de la fiche citée, en plus de ce qu'il reçoit
--   déjà (dont le niveau, `grades`, déjà transmis). Les noms des nœuds sont
--   déjà publics (`classification_nodes` lisible par anon).
-- Rien de personnel n'est ouvert.
--
-- 1. `worksheets.category` : liste fermée, vide hors fiche d'exercices.
-- 2. `worksheet_classifications` : fiche → nœuds (notion ou sous-notion), ordre
--    d'impression ; calquée sur `exercise_classifications`.
-- 3. Garde : une fiche d'exercices a AU PLUS UNE notion, sauf en Révisions et
--    en Automatismes ; les autres types en ont autant qu'on veut. Trigger de
--    contrainte DIFFÉRÉ (vérifié au commit) sur les deux tables.
-- 4. Les deux fonctions de partage : corps de
--    20261019221542_retrait_worksheets_template_id.sql, deux clés ajoutées
--    (`category`, `classifications`) après `grades`. Mêmes gardes, même
--    signature, SECURITY DEFINER, search_path et droits inchangés.
--
-- Migration ADDITIVE.
--
-- ROLLBACK :
--   drop trigger if exists worksheets_classification_count on public.worksheets;
--   drop table if exists public.worksheet_classifications;  -- emporte policies et triggers
--   drop function if exists public.worksheet_classification_count_guard();
--   alter table public.worksheets drop constraint if exists worksheets_category_check,
--     drop constraint if exists worksheets_category_type_check, drop column if exists category;
--   puis recréer les deux fonctions avec le corps de
--   supabase/migrations/20261019221542_retrait_worksheets_template_id.sql
--   (à partir de « create or replace function public.get_worksheet_by_share_token »
--   et jusqu'au dernier « grant execute » inclus — PAS le « drop column template_id »
--   qui suit : la colonne n'existe plus).

-- ============================================================================
-- 1. worksheets.category
-- ============================================================================

alter table public.worksheets
	add column category text null;

alter table public.worksheets
	add constraint worksheets_category_check
		check (category in ('technical_practice', 'applications', 'automatisms', 'review')),
	-- Seule la fiche d'exercices a une catégorie (évaluation, examen, quiz,
	-- devoir maison : aucune).
	add constraint worksheets_category_type_check
		check (category is null or type = 'worksheet');

comment on column public.worksheets.category is
	'Catégorie de la fiche d''exercices (ADR 0041) : Entraînement technique, Applications, Automatismes, Révisions. NULL hors fiche d''exercices.';

-- ============================================================================
-- 2. worksheet_classifications
-- ============================================================================

create table public.worksheet_classifications (
	worksheet_id uuid not null references public.worksheets (id) on delete cascade,
	node_id uuid not null references public.classification_nodes (id) on delete restrict,
	-- Ordre d'impression des notions (« Suites · Dérivation »).
	position integer not null default 0,
	created_at timestamptz not null default now(),
	primary key (worksheet_id, node_id),
	constraint worksheet_classifications_position_check check (position between 0 and 1000)
);

comment on table public.worksheet_classifications is
	'Notions (ou sous-notions) de l''arbre dont parle une fiche, dans l''ordre d''impression (ADR 0041).';

-- « Quelles fiches dans ce nœud ? » et vérification de la FK RESTRICT.
create index worksheet_classifications_node_id_idx
	on public.worksheet_classifications (node_id);

-- Notion ou sous-notion, pas une branche (même règle que les exercices).
create trigger worksheet_classifications_node_kind
	before insert or update of node_id on public.worksheet_classifications
	for each row execute function public.classification_target_is_leafish('node_id');

alter table public.worksheet_classifications enable row level security;

-- Lecture : la sous-requête sur `worksheets` s'exécute SOUS la RLS de
-- `worksheets` (pas de SECURITY DEFINER) : on voit les notions exactement
-- quand on voit la fiche (auteur, admin, élève qui y a accès).
create policy "Read classifications of readable worksheets"
	on public.worksheet_classifications for select
	to authenticated
	using (
		exists (
			select 1 from public.worksheets w
			where w.id = worksheet_classifications.worksheet_id
		)
	);

-- Écriture : reproduit « Users can update own worksheets » (auteur ou admin),
-- sans l'élargir.
create policy "Authors can insert classifications of own worksheets"
	on public.worksheet_classifications for insert
	to authenticated
	with check (
		exists (
			select 1 from public.worksheets w
			where w.id = worksheet_classifications.worksheet_id
				and (w.created_by = auth.uid() or public.is_admin())
		)
	);

create policy "Authors can update classifications of own worksheets"
	on public.worksheet_classifications for update
	to authenticated
	using (
		exists (
			select 1 from public.worksheets w
			where w.id = worksheet_classifications.worksheet_id
				and (w.created_by = auth.uid() or public.is_admin())
		)
	)
	with check (
		exists (
			select 1 from public.worksheets w
			where w.id = worksheet_classifications.worksheet_id
				and (w.created_by = auth.uid() or public.is_admin())
		)
	);

create policy "Authors can delete classifications of own worksheets"
	on public.worksheet_classifications for delete
	to authenticated
	using (
		exists (
			select 1 from public.worksheets w
			where w.id = worksheet_classifications.worksheet_id
				and (w.created_by = auth.uid() or public.is_admin())
		)
	);

-- ============================================================================
-- 3. Garde : une seule notion, sauf Révisions et Automatismes
-- ============================================================================
-- Différée : l'éditeur peut changer la catégorie et les notions dans l'ordre
-- qu'il veut au sein d'une transaction. Hors transaction (requêtes PostgREST
-- séparées), retirer les notions en trop AVANT de passer en catégorie à une
-- notion. Message sans accent : PostgREST le rend tel quel.
-- SECURITY INVOKER : seul l'auteur ou l'admin écrit, et il voit toutes les
-- lignes de sa fiche.

create or replace function public.worksheet_classification_count_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
	v_worksheet_id uuid;
	v_type text;
	v_category text;
	v_count integer;
begin
	if tg_table_name = 'worksheets' then
		v_worksheet_id := new.id;
	else
		v_worksheet_id := new.worksheet_id;
	end if;

	-- FOR UPDATE : deux transactions qui ajoutent chacune une notion à une fiche
	-- vide compteraient chacune 1 ; le verrou sur la ligne de la fiche les met
	-- en file (la seconde compte 2).
	select w.type, w.category into v_type, v_category
	from public.worksheets w where w.id = v_worksheet_id
	for update;
	-- Fiche supprimée dans la même transaction : rien à vérifier.
	if not found then
		return null;
	end if;

	if v_type <> 'worksheet' or v_category in ('review', 'automatisms') then
		return null;
	end if;

	select count(*) into v_count
	from public.worksheet_classifications wc where wc.worksheet_id = v_worksheet_id;

	if v_count > 1 then
		raise exception 'Une fiche d''exercices a une seule notion, sauf en Revisions et en Automatismes.'
			using errcode = 'check_violation';
	end if;
	return null;
end;
$$;

revoke all on function public.worksheet_classification_count_guard() from public, anon, authenticated;

create constraint trigger worksheet_classifications_count
	after insert or update on public.worksheet_classifications
	deferrable initially deferred
	for each row execute function public.worksheet_classification_count_guard();

create constraint trigger worksheets_classification_count
	after update of category, type on public.worksheets
	deferrable initially deferred
	for each row execute function public.worksheet_classification_count_guard();

-- ============================================================================
-- 4. Fonctions des liens de partage : catégorie et notions de la fiche
-- ============================================================================

create or replace function public.get_worksheet_by_share_token(p_token text, p_worksheet_id uuid)
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
						'shared', e.shared,
						'variations', e.variations,
						-- Lettres déclarées comme fonctions (C'(x) dans le PDF)
						'generic_functions', e.generic_functions
					)
				) order by we.position
			)
			from public.worksheet_exercises we
			join public.exercises e on e.id = we.exercise_id
			where we.worksheet_id = w.id
		), '[]'::jsonb)
	) into v_result
	from public.worksheets w
	where w.id = p_worksheet_id;

	return v_result;
end;
$function$;

revoke all on function public.get_worksheet_by_share_token(text, uuid) from public;
grant execute on function public.get_worksheet_by_share_token(text, uuid) to anon, authenticated;

create or replace function public.get_course_worksheet_by_share_token(p_token text, p_worksheet_id uuid)
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
						'shared', e.shared,
						'variations', e.variations,
						-- Lettres déclarées comme fonctions (C'(x) dans le PDF)
						'generic_functions', e.generic_functions
					)
				) order by we.position
			)
			from public.worksheet_exercises we
			join public.exercises e on e.id = we.exercise_id
			where we.worksheet_id = w.id
		), '[]'::jsonb)
	) into v_result
	from public.worksheets w
	where w.id = p_worksheet_id;

	return v_result;
end;
$function$;

revoke all on function public.get_course_worksheet_by_share_token(text, uuid) from public;
grant execute on function public.get_course_worksheet_by_share_token(text, uuid) to anon, authenticated;
