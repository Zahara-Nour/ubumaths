-- ============================================================================
-- Vue `resources` + recherche globale (phase 2 du chantier de référencement)
-- ============================================================================
-- Une ressource — exercice, question, évaluation, chapitre, document — vit dans
-- sa propre table, avec ses propres colonnes de titre et de métadonnées. Pour
-- répondre à « qu'est-ce que j'ai qui parle de fractions ? » il fallait jusqu'ici
-- interroger cinq tables et réconcilier cinq formes différentes.
--
-- QUESTION D'ACCÈS (tranchée avec David avant écriture) : **personne ne gagne
-- d'accès**. La vue est déclarée `security_invoker = true`, donc elle s'exécute
-- avec les droits de CELUI QUI L'INTERROGE et les RLS des tables sources
-- s'appliquent normalement. Chacun ne voit dans la vue que ce qu'il pouvait déjà
-- ouvrir : un élève n'y trouve ni brouillon, ni évaluation non assignée, ni
-- chapitre d'une autre classe.
--
-- ⚠️ Sans `security_invoker`, une vue s'exécute avec les droits de son
-- PROPRIÉTAIRE (postgres) et court-circuite d'un coup toutes les RLS des tables
-- qu'elle agrège. C'est le principal piège de cette migration, et c'est ce que
-- vérifie `tests/integration/resources-view-search.test.ts`.
--
-- La recherche est réservée au prof et à l'admin (décision produit) : c'est
-- l'API qui pose ce filtre. La RLS reste la ceinture, le rôle est la bretelle.
--
-- ROLLBACK :
--   drop function if exists public.search_resources(text, text[], integer);
--   drop view if exists public.resources;
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. La vue
-- ---------------------------------------------------------------------------
-- Les colonnes sont volontairement pauvres et communes : ce qu'il faut pour
-- LISTER et RETROUVER une ressource, pas pour l'afficher. L'affichage passe par
-- le registre `$lib/resources` (phase 1), qui sait construire l'URL.
--
-- `title` ne peut jamais être NULL : `exercises.title` l'est en base, on retombe
-- alors sur le slug, puis sur un libellé explicite. Une ligne sans libellé serait
-- inutilisable dans une liste de résultats.
--
-- Les tags ne sont pas exposés ici : ils vivent encore dans cinq vocabulaires
-- distincts (jonction pour les exercices, `text[]` ailleurs). C'est l'objet de la
-- phase 3 ; les ajouter maintenant figerait la forme qu'on veut justement changer.
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
select
	'question'::text,
	q.id,
	coalesce(nullif(btrim(q.title), ''), '(sans titre)'),
	-- Le quadruplet thème/domaine/sous-domaine EST l'identité d'une question.
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
	-- `assessments.grade` est un niveau unique, pas un tableau : on l'aligne sur
	-- la forme commune plutôt que d'ajouter une colonne pour un seul type.
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
	-- Un chapitre n'a pas de statut de publication mais une visibilité élève.
	case when c.is_visible then 'visible' else 'masque' end,
	false,
	-- `class_chapters.teacher_id` a été supprimé lors du passage au mono-prof
	-- (20260620090000) : la propriété est portée par le rôle, plus par la ligne.
	null::uuid,
	null::text,
	c.updated_at
from public.class_chapters c
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
	'Adressage commun des ressources (exercice, question, évaluation, chapitre, document). security_invoker = true : les RLS des tables sources s''appliquent, la vue n''ouvre aucun accès nouveau. Phase 2 du chantier de référencement — voir docs/wip/referencement-ressources.md.';

-- Lecture réservée aux comptes connectés. Les RLS filtrent ensuite ligne à ligne ;
-- `anon` n'a rien à faire dans un index de contenus pédagogiques.
--
-- ⚠️ Les DEUX révocations sont nécessaires, et c'est contre-intuitif. Le baseline
-- pose `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES TO anon`
-- (20260616220000:46144), jamais neutralisé — le sweep de l'audit d'août ne
-- couvrait que `ON FUNCTIONS`. Une vue créée par `postgres` reçoit donc une
-- entrée ACL **explicite** pour `anon`, que `revoke ... from public` ne touche
-- pas : PUBLIC est un pseudo-rôle, pas un ensemble de rôles. C'est la symétrie
-- exacte de la leçon d'août (« REVOKE FROM anon seul ne suffit pas »), retournée.
-- Sans la seconde ligne, cette vue deviendrait un agrégateur dont la surface
-- anonyme suivrait passivement chaque assouplissement de policy.
revoke all on public.resources from public;
revoke all on public.resources from anon;
grant select on public.resources to authenticated;

-- ---------------------------------------------------------------------------
-- 2. La recherche
-- ---------------------------------------------------------------------------
-- `security invoker` (le défaut, écrit explicitement pour que ça se voie) : la
-- fonction lit la vue, qui lit les tables, sous l'identité de l'appelant.
--
-- Recherche sur le titre ET le sous-titre — « titres et métadonnées », décision
-- produit. Les énoncés et les corrigés ne sont volontairement PAS indexés : le
-- jour où la recherche s'ouvrirait aux élèves, personne ne se souviendrait que
-- l'index contient les solutions.
--
-- `unaccent` parce qu'on cherche en français : « algebre » doit trouver
-- « Algèbre ». Même approche que `search_users_unaccent()`.
create or replace function public.search_resources(
	p_query text,
	p_kinds text[] default null,
	p_limit integer default 20
)
returns setof public.resources
language sql
stable
security invoker
set search_path = public, extensions
as $$
	with needle as (
		select
			-- Les jokers de LIKE viennent de l'utilisateur : sans échappement, une
			-- recherche sur « % » renverrait tout le catalogue. La barre oblique
			-- inverse est échappée en premier, sinon elle mangerait les suivantes.
			replace(replace(replace(unaccent(lower(btrim(p_query))), '\', '\\'), '%', '\%'), '_', '\_') as pattern,
			unaccent(lower(btrim(p_query))) as raw
	)
	select r.*
	from public.resources r, needle n
	where
		-- Bornes des DEUX côtés. Le plancher évite un balayage inutile ; le
		-- plafond est une garde de dénormalisation : `search_resources` est
		-- appelable directement en `POST /rest/v1/rpc/...` par tout compte
		-- connecté, donc le `.max(100)` du schéma Zod ne protège que la route
		-- `/api/search`. Le coût unitaire est structurellement élevé (UNION ALL
		-- de 5 balayages, `unaccent` par ligne, aucun index utilisable), il ne
		-- faut pas le laisser croître avec la longueur de l'entrée.
		length(n.raw) between 2 and 100
		and coalesce(array_length(p_kinds, 1), 0) <= 5
		and (p_kinds is null or r.kind = any (p_kinds))
		and (
			unaccent(lower(r.title)) like '%' || n.pattern || '%' escape '\'
			or unaccent(lower(coalesce(r.subtitle, ''))) like '%' || n.pattern || '%' escape '\'
		)
	order by
		-- Un titre qui COMMENCE par la recherche passe avant un titre qui la
		-- contient ; à pertinence égale, le plus récemment modifié.
		case when unaccent(lower(r.title)) like n.pattern || '%' escape '\' then 0 else 1 end,
		r.updated_at desc nulls last,
		r.title
	limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

comment on function public.search_resources(text, text[], integer) is
	'Recherche par titre et métadonnées dans la vue resources, insensible à la casse et aux accents. security invoker : ne renvoie que ce que l''appelant peut déjà lire. Les jokers LIKE fournis par l''appelant sont échappés. Réservée prof/admin par l''API.';

revoke all on function public.search_resources(text, text[], integer) from public;
grant execute on function public.search_resources(text, text[], integer) to authenticated;
