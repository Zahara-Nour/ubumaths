-- Constructions : la colonne `author_id` est retirée (PR 2 du chantier « écriture au prof seul »).
--
-- Depuis 20261024120100, l'écriture des constructions tient au rôle (`is_teacher()`), plus
-- à la propriété : mono-professeur, l'auteur ne sert à rien. En prod, les 9 constructions
-- ont `author_id` NULL (comptes supprimés, `ON DELETE SET NULL`) ; la colonne n'a pas de
-- défaut ; le code livré en v0.46.0 ne la lit ni ne l'écrit plus.
--
-- Dépendances relevées en prod (pg_depend) : l'index `idx_constructions_author_id`, la clé
-- étrangère `constructions_author_id_fkey` et la vue `public.resources`. Aucune policy.
-- La vue est recréée d'abord, à colonnes identiques : la branche `construction` rend
-- `null::uuid` comme propriétaire (c'était déjà NULL partout). Le `DROP COLUMN` emporte
-- ensuite l'index et la clé étrangère.
--
-- Destructif : ne jouer en prod (`db:migrate`) qu'avec l'accord de David.
--
-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- La valeur perdue est NULL partout : la recréer vide suffit.
-- alter table public.constructions
-- 	add column author_id uuid references public.profiles(id) on delete set null;
-- comment on column public.constructions.author_id is 'Reference to the user who created this construction';
-- create index idx_constructions_author_id on public.constructions using btree (author_id);
-- puis recréer la vue telle que définie en 20260930140000 :
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
-- -- L'ÉVALUATION (série passée sous une forme). kind 'assessment' conservé : le
-- -- registre des types et le préfixe `serie:` en dépendent.
-- select
-- 	'assessment'::text,
-- 	ev.id,
-- 	coalesce(nullif(btrim(s.title), ''), '(sans titre)'),
-- 	s.description,
-- 	array[s.grade],
-- 	ev.status,
-- 	false,
-- 	ev.created_by,
-- 	null::text,
-- 	greatest(ev.updated_at, s.updated_at)
-- from public.evaluations ev
-- join public.series s on s.id = ev.series_id
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
--
-- comment on view public.resources is
-- 	'Adressage commun des ressources, huit types. security_invoker = true : les RLS des tables sources s''appliquent. La branche `assessment` lit `evaluations` jointe à `series` (id = evaluations.id). `worksheet_exercise` n''y figure PAS : on cherche une fiche par son titre puis on désigne l''exercice par son numéro affiché, ce qui évite d''inonder le catalogue. Il reste un type de référence valide.';
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
	null::uuid,
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


alter table public.constructions drop column author_id;
