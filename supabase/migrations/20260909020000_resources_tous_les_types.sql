-- ============================================================================
-- Le catalogue expose enfin TOUS les types de ressources — et la FICHE elle-même
-- ============================================================================
-- Le sélecteur `[[` doit permettre de distinguer ce qu'on cherche : une fiche
-- d'exercices, un exercice, un exercice python, un notebook, une construction,
-- une question, une série. Aujourd'hui la vue n'en connaît que cinq, et surtout
-- elle expose les 127 exercices DE fiches sans exposer les 12 fiches.
--
-- DEUX CHANGEMENTS DE FOND.
--
-- 1. `worksheet_exercise` SORT du catalogue de recherche. On cherche une fiche
--    par son titre, puis on désigne l'exercice par son numéro (`#3`) — c'est le
--    geste réel du professeur, et ça divise le bruit par dix. Le type reste un
--    type de RÉFÉRENCE parfaitement valide : les `[[worksheet_exercise:…]]`
--    déjà écrits continuent de fonctionner, et la couverture du programme
--    continue de les résoudre. Seule la recherche cesse de les lister.
--
-- 2. Quatre types entrent : `worksheet`, `python_exercise`, `python_notebook`,
--    `construction`.
--
-- Effet mesuré sur le catalogue : 257 lignes → 189.
--
-- QUESTION D'ACCÈS : **aucun accès nouveau.** La vue reste `security_invoker`,
-- donc chaque branche est filtrée par la RLS de sa table, vérifiées une à une :
--   worksheets         created_by = auth.uid() OR is_admin()
--                      OR student_has_worksheet_access(id)
--   python_exercises   author_id = auth.uid() (prof) OR is_public
--                      OR affecté à l'élève
--   python_notebooks   author_id = auth.uid() OR is_admin() OR assigné à l'élève
--                      OR (is_public AND prof) OR is_my_student(author_id)
--   constructions      author_id = auth.uid() OR is_public
-- Un appelant ne voit par la vue que ce qu'il voit déjà par ces tables.
--
-- NIVEAUX : ces trois tables n'ont pas de colonne `grades`. Leur `grades` vaut
-- donc NULL, et le filtre par niveau les laisse TOUJOURS passer — la règle
-- posée en 20260908210000 : masquer une ressource sans niveau la rendrait
-- introuvable sans raison compréhensible.
--
-- ROLLBACK : recréer la vue depuis 20260908210000 (six branches).
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
select
	'assessment'::text,
	a.id,
	coalesce(nullif(btrim(a.title), ''), '(sans titre)'),
	a.description,
	array[a.grade],
	a.status,
	false,
	a.created_by,
	null::text,
	a.updated_at
from public.assessments a
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
	'Adressage commun des ressources, huit types. security_invoker = true : les RLS des tables sources s''appliquent. `worksheet_exercise` n''y figure PAS : on cherche une fiche par son titre puis on désigne l''exercice par son numéro affiché, ce qui évite d''inonder le catalogue. Il reste un type de référence valide.';

revoke all on public.resources from public, anon;
revoke all on public.resources from authenticated;
grant select on public.resources to authenticated;
