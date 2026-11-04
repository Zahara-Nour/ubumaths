-- ============================================================================
-- Fin de l'ancienne forme : thème / domaine / sous-domaine et catégorie retirés,
-- `categories` renommée `items` (ADR 0035, chantier automaths-arbre, lot 4b)
-- ============================================================================
-- ⚠️ DESTRUCTIVE. Depuis la 0.72.0 (lot 4a), plus aucun code ne lit ni n'écrit
-- `question_templates.theme` / `domain` / `subdomain` ni
-- `evaluation_attempt_questions.category_key` : le catalogue range les modèles selon l'arbre
-- des notions (`classification_node_id`), une ligne de série désigne un modèle
-- (`{templateId, quantity, delay}`). Cette migration :
--   1. refuse (TOUT ou RIEN) s'il reste une ligne de série ou de séance en ancienne forme, ou un
--      modèle publié sans nœud de l'arbre ;
--   2. donne au sous-titre d'un modèle dans `resources` (recherche `[[…]]`) son chemin dans
--      l'arbre : branche · notion · sous-notion (Q17 A) ;
--   3. supprime les trois colonnes des modèles, leurs index (dont l'index unique de catégorie)
--      et `category_key` avec sa contrainte ;
--   4. renomme `series.categories` et `test_sessions.categories` en `items` (Q18 B), avec la
--      contrainte de non-vacuité, et réécrit les deux fonctions qui les nomment :
--      series_lock_guard (trigger) et get_class_course_by_share_token (clé `items` rendue).
--
-- Livraison (Q18 B) : `maintenance:on` → `db:migrate` → `deploy:prod` (code qui lit `items`)
-- → `maintenance:off`. Entre la migration et le deploy, l'ancien code lit `categories` : d'où
-- la maintenance.
--
-- Ce qui est PERDU : les valeurs theme / domain / subdomain des modèles (relevé du 2026-11-04 :
-- 2 090 modèles les portent encore, tous publiés rangés dans l'arbre, aucun code ne les lit) ;
-- category_key (0 ligne remplie).
--
-- Accès (question tranchée par David le 2026-11-04) : personne ne gagne ni ne perd de lecture.
-- Les colonnes disparaissent pour tous ; `resources` garde `security_invoker` et ses lignes, et
-- ne lit en plus que `classification_nodes`, lisible par tous (anon compris). Les fonctions
-- réécrites gardent leurs gardes d'appelant mot pour mot. Prouvé par
-- tests/integration/automaths-arbre-fin-ancienne-forme.test.ts.
--
-- Rollback : rend les noms et la structure, PAS les valeurs perdues (colonnes recréées vides) ;
-- le code de la 0.72.0 n'en a pas besoin. À jouer dans une transaction :
-- ROLLBACK:BEGIN
-- alter table public.series rename column items to categories;
-- alter table public.series rename constraint series_items_non_empty to series_categories_non_empty;
-- alter table public.test_sessions rename column items to categories;
-- alter table public.question_templates add column theme text, add column domain text, add column subdomain text;
-- alter table public.evaluation_attempt_questions add column category_key text
--   constraint evaluation_attempt_questions_category_key_check
--   check (char_length(category_key) >= 1 and char_length(category_key) <= 200);
-- create index idx_question_templates_theme on public.question_templates (theme);
-- create index idx_question_templates_domain on public.question_templates (domain);
-- create index idx_question_templates_subdomain on public.question_templates (subdomain) where subdomain is not null;
-- create index idx_question_templates_categories on public.question_templates (theme, domain, level);
-- create unique index idx_question_templates_unique_category on public.question_templates
--   (theme, domain, coalesce(subdomain, ''), level) where status = 'published';
-- do $rb$
-- declare d text;
-- begin
--   d := replace(pg_get_functiondef('public.series_lock_guard'::regproc),
--     'new.items is not distinct from old.items', 'new.categories is not distinct from old.categories');
--   execute d;
--   d := replace(replace(pg_get_functiondef('public.get_class_course_by_share_token(text)'::regprocedure),
--     's.items as series_items', 's.categories as series_categories'),
--     '''items'', sp.series_items', '''categories'', sp.series_categories');
--   execute d;
--   -- jointures à l'arbre gardées : sans effet sur les lignes (jointures externes sur une clé)
--   d := replace(pg_get_viewdef('public.resources'::regclass),
--     'concat_ws('' · ''::text, g.name, p.name, n.name)',
--     'concat_ws('' · ''::text, q.theme, q.domain, q.subdomain)');
--   execute 'create or replace view public.resources with (security_invoker = true) as ' || d;
-- end;
-- $rb$;
-- ROLLBACK:END
-- ============================================================================

-- Les `alter table` attendent les transactions en cours : pas plus de 5 s
set local lock_timeout = '5s';

-- 1. TOUT ou RIEN
do $$
declare
	anciennes_series integer;
	anciennes_seances integer;
	sans_noeud integer;
begin
	select count(*) into anciennes_series
	  from public.series s, jsonb_array_elements(s.categories) e
	 where not (e ? 'templateId');
	select count(*) into anciennes_seances
	  from public.test_sessions t, jsonb_array_elements(t.categories) e
	 where not (e ? 'templateId');
	select count(*) into sans_noeud
	  from public.question_templates q
	 where q.status = 'published' and q.classification_node_id is null;
	if anciennes_series > 0 or anciennes_seances > 0 or sans_noeud > 0 then
		raise exception 'fin de l''ancienne forme refusée : % ligne(s) de série et % de séance en ancienne forme, % modèle(s) publié(s) sans nœud',
			anciennes_series, anciennes_seances, sans_noeud;
	end if;
end;
$$;

-- 2. Sous-titre d'un modèle = son chemin dans l'arbre (avant le DROP : la vue lisait les colonnes).
-- L'arbre a au plus trois niveaux (branche > notion > sous-notion, classification_nodes_validate) ;
-- un modèle est rangé sur une notion ou une sous-notion, un brouillon peut n'être rangé nulle part.
create or replace view public.resources with (security_invoker = true) as
 SELECT 'exercise'::text AS kind,
    e.id,
    COALESCE(NULLIF(btrim(e.title), ''::text), e.slug, '(sans titre)'::text) AS title,
    e.topic AS subtitle,
    e.grades,
    NULL::text AS status,
    e.is_public,
    e.created_by AS owner_id,
    e.slug,
    e.updated_at
   FROM public.exercises e
UNION ALL
 SELECT 'worksheet'::text AS kind,
    w.id,
    COALESCE(NULLIF(btrim(w.title), ''::text), '(sans titre)'::text) AS title,
    w.description AS subtitle,
    w.grades,
    w.status,
    false AS is_public,
    w.created_by AS owner_id,
    NULL::text AS slug,
    w.updated_at
   FROM public.worksheets w
UNION ALL
 SELECT 'question'::text AS kind,
    q.id,
    COALESCE(NULLIF(btrim(q.title), ''::text), '(sans titre)'::text) AS title,
    NULLIF(concat_ws(' · '::text, g.name, p.name, n.name), ''::text) AS subtitle,
    q.grades,
    q.status,
    false AS is_public,
    q.created_by AS owner_id,
    NULL::text AS slug,
    COALESCE(q.updated_at, q.created_at) AS updated_at
   FROM public.question_templates q
     LEFT JOIN public.classification_nodes n ON n.id = q.classification_node_id
     LEFT JOIN public.classification_nodes p ON p.id = n.parent_id
     LEFT JOIN public.classification_nodes g ON g.id = p.parent_id
UNION ALL
 SELECT 'assessment'::text AS kind,
    ev.id,
    COALESCE(NULLIF(btrim(s.title), ''::text), '(sans titre)'::text) AS title,
    s.description AS subtitle,
    ARRAY[s.grade] AS grades,
    ev.status,
    false AS is_public,
    ev.created_by AS owner_id,
    NULL::text AS slug,
    GREATEST(ev.updated_at, s.updated_at) AS updated_at
   FROM public.evaluations ev
     JOIN public.series s ON s.id = ev.series_id
UNION ALL
 SELECT 'chapter'::text AS kind,
    c.id,
    COALESCE(NULLIF(btrim(c.title), ''::text), '(sans titre)'::text) AS title,
    c.description AS subtitle,
    NULL::text[] AS grades,
        CASE
            WHEN c.is_visible THEN 'visible'::text
            ELSE 'masque'::text
        END AS status,
    false AS is_public,
    NULL::uuid AS owner_id,
    NULL::text AS slug,
    c.updated_at
   FROM public.class_chapters c
UNION ALL
 SELECT 'python_exercise'::text AS kind,
    px.id,
    COALESCE(NULLIF(btrim(px.title), ''::text), '(sans titre)'::text) AS title,
    NULLIF(concat_ws(' · '::text, px.level, px.source), ''::text) AS subtitle,
    NULL::text[] AS grades,
    NULL::text AS status,
    px.is_public,
    px.author_id AS owner_id,
    NULL::text AS slug,
    px.updated_at
   FROM public.python_exercises px
UNION ALL
 SELECT 'python_notebook'::text AS kind,
    pn.id,
    COALESCE(NULLIF(btrim(pn.title), ''::text), '(sans titre)'::text) AS title,
    pn.description AS subtitle,
    NULL::text[] AS grades,
        CASE
            WHEN pn.is_template THEN 'modele'::text
            ELSE NULL::text
        END AS status,
    pn.is_public,
    pn.author_id AS owner_id,
    NULL::text AS slug,
    pn.updated_at
   FROM public.python_notebooks pn
UNION ALL
 SELECT 'construction'::text AS kind,
    cn.id,
    COALESCE(NULLIF(btrim(cn.title), ''::text), '(sans titre)'::text) AS title,
    NULLIF(concat_ws(' · '::text, cn.description, cn.format), ''::text) AS subtitle,
    NULL::text[] AS grades,
    NULL::text AS status,
    cn.is_public,
    NULL::uuid AS owner_id,
    NULL::text AS slug,
    cn.updated_at
   FROM public.constructions cn
UNION ALL
 SELECT 'document'::text AS kind,
    d.id,
    COALESCE(NULLIF(btrim(d.title), ''::text), '(sans titre)'::text) AS title,
    NULLIF(array_to_string(d.topics, ' · '::text), ''::text) AS subtitle,
    d.grades,
    NULL::text AS status,
    false AS is_public,
    d.teacher_id AS owner_id,
    NULL::text AS slug,
    d.updated_at
   FROM public.rag_documents d;

-- 3. Colonnes de l'ancienne forme (leurs index et la contrainte partent avec elles ; nommés
-- pour que l'échec soit lisible si l'un d'eux avait changé)
drop index public.idx_question_templates_unique_category;
drop index public.idx_question_templates_categories;
drop index public.idx_question_templates_theme;
drop index public.idx_question_templates_domain;
drop index public.idx_question_templates_subdomain;
alter table public.question_templates
	drop column theme,
	drop column domain,
	drop column subdomain;
alter table public.evaluation_attempt_questions drop column category_key;

-- 4. `categories` → `items`
alter table public.series rename column categories to items;
alter table public.series rename constraint series_categories_non_empty to series_items_non_empty;
alter table public.test_sessions rename column categories to items;

create or replace function public.series_lock_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
	if tg_op = 'UPDATE'
		and new.title is not distinct from old.title
		and new.description is not distinct from old.description
		and new.grade is not distinct from old.grade
		and new.items is not distinct from old.items
		and new.created_by is not distinct from old.created_by
	then
		return new; -- contenu inchangé (ex. updated_at seul) : rien à protéger
	end if;

	if exists (
		select 1
		from public.test_sessions ts
		join public.evaluations e on e.id = ts.evaluation_id
		where e.series_id = old.id
	) then
		raise exception 'Série verrouillée : un élève a déjà commencé une évaluation qui l''utilise. Dupliquez-la pour la modifier.'
			using errcode = 'UBS01';
	end if;

	if tg_op = 'DELETE' then
		return old;
	end if;
	return new;
end;
$function$;

-- Identique à la définition en vigueur, à `categories` → `items` près (lecture et clé rendue)
create or replace function public.get_class_course_by_share_token(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
	v_token record;
	v_result jsonb;
begin
	-- Garde de forme avant toute lecture.
	if p_token is null or char_length(p_token) not between 16 and 64 then
		return null;
	end if;

	select t.id, t.class_id into v_token
	from public.class_course_share_tokens t
	where t.token = p_token
		and t.is_active
		and (t.expires_at is null or t.expires_at > now());

	if not found then
		return null;
	end if;

	-- Les ensembles visibles sont calculés UNE fois (CTE) : la règle « une section
	-- n'apparaît que si elle porte un contenu renvoyé » relit exactement ce qui
	-- est renvoyé, sans recopier les conditions de publication.
	with
	chapitres as (
		select ch.*
		from public.class_chapters ch
		where ch.class_id = v_token.class_id
			and ch.is_visible
	),
	documents as (
		select d.*
		from public.chapter_documents d
		join chapitres ch on ch.id = d.chapter_id
		-- `<= now()` et jamais `is not null` seul : une date future = programmé.
		where d.published_at <= now()
	),
	fiches as (
		select cw.*, w.title as worksheet_title
		from public.chapter_worksheets cw
		join chapitres ch on ch.id = cw.chapter_id
		join public.worksheets w on w.id = cw.worksheet_id
		where cw.published_at <= now()
			-- Distribuée à CETTE classe (miroir de student_has_worksheet_access,
			-- branche « par la classe ») : publier sans distribuer ne montre rien.
			and exists (
				select 1
				from public.worksheet_assignments wa
				join public.worksheet_assignment_classes wac on wac.assignment_id = wa.id
				where wa.worksheet_id = cw.worksheet_id
					and wac.class_id = v_token.class_id
					and wa.status = 'active'
					and (wa.available_from is null or wa.available_from <= now())
			)
	),
	items as (
		select ci.*
		from public.chapter_checklist_items ci
		join chapitres ch on ch.id = ci.chapter_id
		where ci.published_at <= now()
	),
	series_publiees as (
		select cs.*, s.title as series_title, s.description as series_description,
			s.items as series_items
		from public.chapter_series cs
		join chapitres ch on ch.id = cs.chapter_id
		join public.series s on s.id = cs.series_id
		where cs.published_at <= now()
	),
	sections as (
		select sec.*
		from public.chapter_sections sec
		join chapitres ch on ch.id = sec.chapter_id
		where exists (select 1 from documents x where x.section_id = sec.id)
			or exists (select 1 from fiches x where x.section_id = sec.id)
			or exists (select 1 from items x where x.section_id = sec.id)
			or exists (select 1 from series_publiees x where x.section_id = sec.id)
	)
	select jsonb_build_object(
		'class_name', c.name,
		'class_grade', c.grade,
		'chapters', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'id', ch.id,
					'title', ch.title,
					'description', ch.description,
					'color', ch.color,
					'icon', ch.icon,
					'display_order', ch.display_order,
					'sections', coalesce((
						select jsonb_agg(
							jsonb_build_object(
								'id', sec.id,
								'title', sec.title,
								'display_order', sec.display_order
							) order by sec.display_order, sec.id
						)
						from sections sec
						where sec.chapter_id = ch.id
					), '[]'::jsonb),
					-- SANS storage_path : le fichier passe par
					-- get_course_document_by_share_token puis une URL signée courte.
					'documents', coalesce((
						select jsonb_agg(
							jsonb_build_object(
								'id', d.id,
								'title', d.title,
								'description', d.description,
								'source_type', d.source_type,
								'file_name', d.file_name,
								'mime_type', d.mime_type,
								'file_size', d.file_size,
								'google_drive_url', d.google_drive_url,
								'section_id', d.section_id,
								'section_order', d.section_order,
								'display_order', d.display_order
							) order by d.display_order, d.id
						)
						from documents d
						where d.chapter_id = ch.id
					), '[]'::jsonb),
					'worksheets', coalesce((
						select jsonb_agg(
							jsonb_build_object(
								'id', f.id,
								'worksheet_id', f.worksheet_id,
								'title', f.worksheet_title,
								'section_id', f.section_id,
								'section_order', f.section_order,
								'display_order', f.display_order
							) order by f.display_order, f.id
						)
						from fiches f
						where f.chapter_id = ch.id
					), '[]'::jsonb),
					-- Aucune progression : student_checklist_progress n'est pas lue.
					'checklist_items', coalesce((
						select jsonb_agg(
							jsonb_build_object(
								'id', i.id,
								'content', i.content,
								'description', i.description,
								'section_id', i.section_id,
								'section_order', i.section_order,
								'display_order', i.display_order
							) order by i.display_order, i.id
						)
						from items i
						where i.chapter_id = ch.id
					), '[]'::jsonb),
					'series', coalesce((
						select jsonb_agg(
							jsonb_build_object(
								'id', sp.id,
								'series_id', sp.series_id,
								'title', sp.series_title,
								'description', sp.series_description,
								'items', sp.series_items,
								'form', sp.form,
								'section_id', sp.section_id,
								'section_order', sp.section_order,
								'display_order', sp.display_order
							) order by sp.display_order, sp.id
						)
						from series_publiees sp
						where sp.chapter_id = ch.id
					), '[]'::jsonb)
				)
				order by ch.display_order, ch.id
			)
			from chapitres ch
		), '[]'::jsonb)
	) into v_result
	from public.classes c
	where c.id = v_token.class_id
		-- Archiver une classe vaut révocation de son lien.
		and c.is_active;

	-- Classe archivée : même réponse qu'un jeton invalide.
	if v_result is null then
		return null;
	end if;

	-- Comptabilité d'accès, après la lecture : un échec de mise à jour ne doit
	-- pas priver le lecteur de son cours.
	update public.class_course_share_tokens
	set access_count = access_count + 1,
		last_accessed_at = now()
	where id = v_token.id;

	return v_result;
end;
$function$;
