-- ============================================================================
-- Le catalogue `resources` lit les ÉVALUATIONS, plus les assessments
-- ============================================================================
-- Chantier 4 (docs/wip/series-formes-progress.md). Depuis 20260930130000, une
-- évaluation nouvelle vit dans `evaluations` + `series` ; le code ne crée plus
-- d'assessment. La branche `kind = 'assessment'` de la vue lisait encore
-- `assessments` : une évaluation nouvelle n'apparaissait donc jamais dans la
-- recherche du cahier de texte (autocomplétion `[[`, page recherche, liens
-- `serie:`).
--
-- SEULE la branche `assessment` change. Les huit autres branches, la liste des
-- colonnes, leurs types et leur ordre sont repris À L'IDENTIQUE de
-- 20260909020000. La valeur de kind reste 'assessment' : le registre des types
-- (src/lib/resources/kinds.ts) et le préfixe `serie:` (prefixes.ts) en dépendent.
--
--   id         = evaluations.id        (et non plus assessments.id)
--   title      = titre de la SÉRIE     (même COALESCE qu'avant)
--   subtitle   = series.description
--   grades     = ARRAY[series.grade]
--   status     = evaluations.status
--   owner_id   = evaluations.created_by
--   updated_at = greatest(evaluations.updated_at, series.updated_at)
--
-- ── QUESTION D'ACCÈS (tranchée par David, Q22) : AUCUN accès nouveau ─────────
-- La vue reste `security_invoker = true` : la RLS d'`evaluations` ET celle de
-- `series` s'appliquent à l'appelant (jointure interne : une ligne n'apparaît
-- que si l'appelant lit les deux).
--   · prof propriétaire et admin : leurs évaluations ;
--   · élève : uniquement les évaluations PUBLIÉES qui lui sont assignées
--     (nommément, ou via une classe dont il est membre ACTIF) ;
--   · anon : rien (aucun droit sur la vue, inchangé).
-- `search_resources` (seule fonction qui lit la vue) est SECURITY INVOKER :
-- vérifié (pg_proc.prosecdef = false) avant d'écrire cette migration.
-- Droits de la vue inchangés : SELECT pour authenticated, rien pour anon.
--
-- ⚠️ Les lignes recopiées depuis les assessments (legacy_assessment_id) changent
-- d'id dans la vue : evaluations.id au lieu de assessments.id. Un tag posé sur
-- l'ANCIEN id (resource_tags.resource_id) ne fait plus remonter l'évaluation
-- dans une recherche par tag. Hors périmètre de cette migration (données).
--
-- ── ROLLBACK : recréer la vue telle que définie en 20260909020000 ────────────
-- create or replace view public.resources with (security_invoker = true) as
-- select
-- 	'exercise'::text as kind,
-- 	e.id,
-- 	coalesce(nullif(btrim(e.title), ''), e.slug, '(sans titre)') as title,
-- 	e.topic as subtitle,
-- 	e.grades,
-- 	null::text as status,
-- 	e.is_public,
-- 	e.created_by as owner_id,
-- 	e.slug,
-- 	e.updated_at
-- from public.exercises e
-- union all
-- -- LA FICHE elle-même : ce qu'on cherche quand on écrit « les exercices de la
-- -- fiche Dérivées ». Cité sans numéro, c'est un lien vers la fiche ; suivi d'un
-- -- numéro, le sélecteur le convertit en référence d'exercice.
-- select
-- 	'worksheet'::text,
-- 	w.id,
-- 	coalesce(nullif(btrim(w.title), ''), '(sans titre)'),
-- 	w.description,
-- 	w.grades,
-- 	w.status,
-- 	false,
-- 	w.created_by,
-- 	null::text,
-- 	w.updated_at
-- from public.worksheets w
-- union all
-- select
-- 	'question'::text,
-- 	q.id,
-- 	coalesce(nullif(btrim(q.title), ''), '(sans titre)'),
-- 	nullif(concat_ws(' · ', q.theme, q.domain, q.subdomain), ''),
-- 	q.grades,
-- 	q.status,
-- 	false,
-- 	q.created_by,
-- 	null::text,
-- 	coalesce(q.updated_at, q.created_at)
-- from public.question_templates q
-- union all
-- select
-- 	'assessment'::text,
-- 	a.id,
-- 	coalesce(nullif(btrim(a.title), ''), '(sans titre)'),
-- 	a.description,
-- 	array[a.grade],
-- 	a.status,
-- 	false,
-- 	a.created_by,
-- 	null::text,
-- 	a.updated_at
-- from public.assessments a
-- union all
-- select
-- 	'chapter'::text,
-- 	c.id,
-- 	coalesce(nullif(btrim(c.title), ''), '(sans titre)'),
-- 	c.description,
-- 	null::text[],
-- 	case when c.is_visible then 'visible' else 'masque' end,
-- 	false,
-- 	null::uuid,
-- 	null::text,
-- 	c.updated_at
-- from public.class_chapters c
-- union all
-- select
-- 	'python_exercise'::text,
-- 	px.id,
-- 	coalesce(nullif(btrim(px.title), ''), '(sans titre)'),
-- 	nullif(concat_ws(' · ', px.level, px.source), ''),
-- 	null::text[],
-- 	null::text,
-- 	px.is_public,
-- 	px.author_id,
-- 	null::text,
-- 	px.updated_at
-- from public.python_exercises px
-- union all
-- select
-- 	'python_notebook'::text,
-- 	pn.id,
-- 	coalesce(nullif(btrim(pn.title), ''), '(sans titre)'),
-- 	pn.description,
-- 	null::text[],
-- 	case when pn.is_template then 'modele' else null end,
-- 	pn.is_public,
-- 	pn.author_id,
-- 	null::text,
-- 	pn.updated_at
-- from public.python_notebooks pn
-- union all
-- select
-- 	'construction'::text,
-- 	cn.id,
-- 	coalesce(nullif(btrim(cn.title), ''), '(sans titre)'),
-- 	nullif(concat_ws(' · ', cn.description, cn.format), ''),
-- 	null::text[],
-- 	null::text,
-- 	cn.is_public,
-- 	cn.author_id,
-- 	null::text,
-- 	cn.updated_at
-- from public.constructions cn
-- union all
-- select
-- 	'document'::text,
-- 	d.id,
-- 	coalesce(nullif(btrim(d.title), ''), '(sans titre)'),
-- 	nullif(array_to_string(d.topics, ' · '), ''),
-- 	d.grades,
-- 	null::text,
-- 	false,
-- 	d.teacher_id,
-- 	null::text,
-- 	d.updated_at
-- from public.rag_documents d;
--
-- comment on view public.resources is
-- 	'Adressage commun des ressources, huit types. security_invoker = true : les RLS des tables sources s''appliquent. `worksheet_exercise` n''y figure PAS : on cherche une fiche par son titre puis on désigne l''exercice par son numéro affiché, ce qui évite d''inonder le catalogue. Il reste un type de référence valide.';
--
-- revoke all on public.resources from public, anon;
-- revoke all on public.resources from authenticated;
-- grant select on public.resources to authenticated;
-- ============================================================================

create or replace view public.resources with (security_invoker = true) as
select
	'exercise'::text as kind,
	e.id,
	coalesce(nullif(btrim(e.title), ''), e.slug, '(sans titre)') as title,
	e.topic as subtitle,
	e.grades,
	null::text as status,
	e.is_public,
	e.created_by as owner_id,
	e.slug,
	e.updated_at
from public.exercises e
union all
-- LA FICHE elle-même : ce qu'on cherche quand on écrit « les exercices de la
-- fiche Dérivées ». Cité sans numéro, c'est un lien vers la fiche ; suivi d'un
-- numéro, le sélecteur le convertit en référence d'exercice.
select
	'worksheet'::text,
	w.id,
	coalesce(nullif(btrim(w.title), ''), '(sans titre)'),
	w.description,
	w.grades,
	w.status,
	false,
	w.created_by,
	null::text,
	w.updated_at
from public.worksheets w
union all
select
	'question'::text,
	q.id,
	coalesce(nullif(btrim(q.title), ''), '(sans titre)'),
	nullif(concat_ws(' · ', q.theme, q.domain, q.subdomain), ''),
	q.grades,
	q.status,
	false,
	q.created_by,
	null::text,
	coalesce(q.updated_at, q.created_at)
from public.question_templates q
union all
-- L'ÉVALUATION (série passée sous une forme). kind 'assessment' conservé : le
-- registre des types et le préfixe `serie:` en dépendent.
select
	'assessment'::text,
	ev.id,
	coalesce(nullif(btrim(s.title), ''), '(sans titre)'),
	s.description,
	array[s.grade],
	ev.status,
	false,
	ev.created_by,
	null::text,
	greatest(ev.updated_at, s.updated_at)
from public.evaluations ev
join public.series s on s.id = ev.series_id
union all
select
	'chapter'::text,
	c.id,
	coalesce(nullif(btrim(c.title), ''), '(sans titre)'),
	c.description,
	null::text[],
	case when c.is_visible then 'visible' else 'masque' end,
	false,
	null::uuid,
	null::text,
	c.updated_at
from public.class_chapters c
union all
select
	'python_exercise'::text,
	px.id,
	coalesce(nullif(btrim(px.title), ''), '(sans titre)'),
	nullif(concat_ws(' · ', px.level, px.source), ''),
	null::text[],
	null::text,
	px.is_public,
	px.author_id,
	null::text,
	px.updated_at
from public.python_exercises px
union all
select
	'python_notebook'::text,
	pn.id,
	coalesce(nullif(btrim(pn.title), ''), '(sans titre)'),
	pn.description,
	null::text[],
	case when pn.is_template then 'modele' else null end,
	pn.is_public,
	pn.author_id,
	null::text,
	pn.updated_at
from public.python_notebooks pn
union all
select
	'construction'::text,
	cn.id,
	coalesce(nullif(btrim(cn.title), ''), '(sans titre)'),
	nullif(concat_ws(' · ', cn.description, cn.format), ''),
	null::text[],
	null::text,
	cn.is_public,
	cn.author_id,
	null::text,
	cn.updated_at
from public.constructions cn
union all
select
	'document'::text,
	d.id,
	coalesce(nullif(btrim(d.title), ''), '(sans titre)'),
	nullif(array_to_string(d.topics, ' · '), ''),
	d.grades,
	null::text,
	false,
	d.teacher_id,
	null::text,
	d.updated_at
from public.rag_documents d;


comment on view public.resources is
	'Adressage commun des ressources, huit types. security_invoker = true : les RLS des tables sources s''appliquent. La branche `assessment` lit `evaluations` jointe à `series` (id = evaluations.id). `worksheet_exercise` n''y figure PAS : on cherche une fiche par son titre puis on désigne l''exercice par son numéro affiché, ce qui évite d''inonder le catalogue. Il reste un type de référence valide.';

revoke all on public.resources from public, anon;
revoke all on public.resources from authenticated;
grant select on public.resources to authenticated;
