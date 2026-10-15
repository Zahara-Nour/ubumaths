-- Cadres de réponse : plafond de 25 lignes, et lignes transmises par les liens partagés
-- ======================================================================================
-- (ADR 0030, lot 4 — décisions de David, 2026-10-15/16)
--
-- 1. Plafond d'un cadre : 25 lignes (20 cm, une page A4) au lieu de 40. Contrainte
--    CHECK AJOUTÉE à côté de `worksheet_exercises_answer_frame_lines_check` (0..40),
--    qui reste : la plus stricte des deux s'applique. Aucune ligne de production ne
--    dépasse 25 (aucune n'a même de réglage, mesuré le 2026-10-15) : la validation
--    de la contrainte ne refuse rien d'existant.
--
-- 2. Question d'accès (tranchée par David) : le visiteur d'un lien de partage
--    (cahier de texte, cours partagé) lit le NOMBRE DE LIGNES des cadres de chaque
--    exercice d'une fiche citée — rien d'autre de nouveau. Son PDF a ainsi les
--    mêmes cadres que celui du prof. `get_worksheet_by_share_token` et
--    `get_course_worksheet_by_share_token` (les deux seules fonctions qui servent
--    les exercices d'une fiche à un lien de partage) ajoutent
--    `answer_frame_lines` à chaque exercice rendu. Corps identiques à ceux de
--    20261016103500_style_fiche_liens_partages.sql (md5 de prosrc égaux en local
--    et en prod le 2026-10-15) à cette seule clé près : mêmes gardes, même
--    signature, même type de retour (jsonb), SECURITY DEFINER, search_path et
--    droits inchangés.
--
-- Migration ADDITIVE : une contrainte en plus, deux `create or replace`.
--
-- ROLLBACK :
--   alter table public.worksheet_exercises
--     drop constraint if exists worksheet_exercises_answer_frame_lines_max25;
--   puis recréer les deux fonctions avec le corps de
--   supabase/migrations/20261016103500_style_fiche_liens_partages.sql
--   (partie non commentée, à partir de « create or replace function
--   public.get_worksheet_by_share_token »), REVOKE/GRANT compris.

alter table public.worksheet_exercises
	add constraint worksheet_exercises_answer_frame_lines_max25 check (
		answer_frame_lines is null
		or (
			-- Même lecture que la première contrainte (strict : un tableau imbriqué
			-- n'est pas déplié ; silent : clé absente = NULL, d'où le coalesce),
			-- bornée à 25 lignes
			not coalesce(jsonb_path_exists(
				answer_frame_lines,
				'strict $.questions[*] ? (!(@ == null || (@.type() == "number" && @ >= 0 && @ <= 25 && @.floor() == @)))',
				'{}'::jsonb,
				true
			), false)
			and not coalesce(jsonb_path_exists(
				answer_frame_lines,
				'strict $.exercise ? (!(@ == null || (@.type() == "number" && @ >= 0 && @ <= 25 && @.floor() == @)))',
				'{}'::jsonb,
				true
			), false)
		)
	);

comment on column public.worksheet_exercises.answer_frame_lines is
	'Lignes des cadres de réponse choisies par le prof pour cet exercice dans cette fiche (ADR 0030, lot 4) : {"questions": [int|null], "exercise": int|null} ; null = estimation automatique, 0 = pas de cadre, 0..25 lignes, ≤ 200 questions. NULL = tout automatique. Transmis par les liens de partage (cahier, cours).';

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
		'translations', w.translations,
		'total_points', w.total_points,
		'estimated_duration_minutes', w.estimated_duration_minutes,
		-- Le style de la fiche (ADR 0028, lot 4a, D11) : le PDF le suit. Un style
		-- de Chiphre est dans le code ; seule la fiche d'un style de l'AUTEUR de la
		-- fiche est transmise (jamais celle d'un autre compte).
		'style_id', w.style_id,
		'template_id', w.template_id,
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
			where t.style_id = coalesce(w.style_id, w.template_id)
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
		'translations', w.translations,
		'total_points', w.total_points,
		'estimated_duration_minutes', w.estimated_duration_minutes,
		-- Le style de la fiche (ADR 0028, lot 4a, D11) : le PDF le suit. Un style
		-- de Chiphre est dans le code ; seule la fiche d'un style de l'AUTEUR de la
		-- fiche est transmise (jamais celle d'un autre compte).
		'style_id', w.style_id,
		'template_id', w.template_id,
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
			where t.style_id = coalesce(w.style_id, w.template_id)
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
