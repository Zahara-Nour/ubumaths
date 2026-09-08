-- ============================================================================
-- Filtrer la recherche par NIVEAU, et corriger le niveau d'un exercice de fiche
-- ============================================================================
-- Avec 128 exercices le catalogue tient dans une popup ; avec 500 il faudra
-- trancher. Le contexte le plus riche est déjà là et n'était pas utilisé : la
-- séance appartient à une classe, la classe a un niveau. Écrire la séance de
-- 1SPE 1 en se voyant proposer de la 6ᵉ n'a aucun sens.
--
-- DEUX CHANGEMENTS.
--
-- 1. Le niveau d'un `worksheet_exercise` devient celui de LA FICHE (`w.grades`)
--    et non plus celui de l'exercice (`e.grades`). Décision de David : c'est la
--    fiche qu'on distribue à une classe, donc c'est son niveau qui la situe.
--    Concrètement, 8 exercices sur 127 changent de niveau apparent : ce sont
--    exactement ceux dont le niveau diffère de celui de leur fiche.
--
-- 2. `search_resources` accepte `p_grades`. Sémantique retenue :
--       p_grades is null      → aucun filtre (contexte inconnu)
--       r.grades is null      → TOUJOURS visible
--       sinon                 → intersection non vide (`&&`)
--    Le deuxième point est délibéré : masquer une ressource sans niveau la
--    rendrait introuvable sans que personne comprenne pourquoi. Un chapitre et
--    un document n'ont jamais de niveau ; deux exercices et une fiche n'en ont
--    pas encore.
--
-- QUESTION D'ACCÈS : **aucun accès nouveau**. `p_grades` ne fait que RESTREINDRE
-- à l'intérieur de la même vue `security_invoker`. Un appelant ne peut pas s'en
-- servir pour voir ce que ses RLS lui refusent — au mieux il voit moins.
--
-- ⚠️ POURQUOI UN `drop` : ajouter un 5ᵉ paramètre crée une SURCHARGE, et tout
-- appel à quatre arguments deviendrait ambigu (« function is not unique »). On
-- remplace donc, on ne surcharge pas. Aucune donnée n'est perdue — c'est du
-- code. La fonction est recréée dans la même transaction, il n'existe aucun
-- instant où elle manquerait à l'application.
--
-- ROLLBACK :
--   drop function if exists public.search_resources(text, text[], text[], text[], integer);
--   -- puis recréer la version à 4 paramètres et la vue depuis 20260908190000.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. La vue : niveau de la FICHE pour un exercice de fiche
-- ---------------------------------------------------------------------------
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
from public.rag_documents d
union all
select
	'worksheet_exercise'::text,
	we.id,
	coalesce(nullif(btrim(e.title), ''), 'Exercice ' || we.position::text),
	'Fiche : ' || w.title,
	-- Le niveau de LA FICHE, pas celui de l'exercice : c'est la fiche qu'on
	-- distribue à une classe. Un exercice de 2de réemployé dans une fiche de
	-- 1ʳᵉ spé se cherche donc en 1ʳᵉ spé, là où le prof ira le chercher.
	w.grades,
	w.status,
	false,
	w.created_by,
	null::text,
	greatest(we.updated_at, w.updated_at)
from public.worksheet_exercises we
join public.worksheets w on w.id = we.worksheet_id
join public.exercises e on e.id = we.exercise_id;

comment on view public.resources is
	'Adressage commun des ressources. security_invoker = true : les RLS des tables sources s''appliquent. Pour `worksheet_exercise`, l''id est celui de la JONCTION worksheet_exercises et le niveau est celui de LA FICHE — c''est elle qu''on distribue à une classe.';

revoke all on public.resources from public, anon;
revoke all on public.resources from authenticated;
grant select on public.resources to authenticated;

-- ---------------------------------------------------------------------------
-- 2. La recherche : filtre par niveau
-- ---------------------------------------------------------------------------
drop function if exists public.search_resources(text, text[], text[], integer);

create or replace function public.search_resources(
	p_query text,
	p_kinds text[] default null,
	p_tags text[] default null,
	p_grades text[] default null,
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
			replace(replace(replace(unaccent(lower(btrim(coalesce(p_query, '')))), '\', '\\'), '%', '\%'), '_', '\_') as pattern,
			unaccent(lower(btrim(coalesce(p_query, '')))) as raw
	),
	wanted_tags as (
		select t.id
		from public.tags t
		where p_tags is not null
			and t.slug = any (select public.tag_slug(unnest(p_tags)))
	)
	select r.*
	from public.resources r, needle n
	where
		length(n.raw) between 0 and 100
		-- Bornes de COÛT, volontairement supérieures aux vocabulaires réels : un
		-- plafond calé sur la taille exacte du vocabulaire est une bombe à
		-- retardement (cf. 20260908190000, où passer de 5 à 6 types a vidé la
		-- recherche en silence).
		and coalesce(array_length(p_kinds, 1), 0) <= 12
		and coalesce(array_length(p_tags, 1), 0) <= 10
		and coalesce(array_length(p_grades, 1), 0) <= 20
		and (length(n.raw) >= 2 or p_tags is not null)
		and (p_kinds is null or r.kind = any (p_kinds))
		-- Filtre de niveau. Une ressource SANS niveau reste toujours visible :
		-- la masquer la rendrait introuvable sans raison compréhensible.
		and (p_grades is null or r.grades is null or r.grades && p_grades)
		and (
			p_tags is null
			or exists (
				select 1
				from public.resource_tags rt
				where rt.resource_id = r.id
					and rt.resource_kind = r.kind
					and rt.tag_id in (select id from wanted_tags)
			)
		)
		and (
			length(n.raw) < 2
			or unaccent(lower(r.title)) like '%' || n.pattern || '%' escape '\'
			or unaccent(lower(coalesce(r.subtitle, ''))) like '%' || n.pattern || '%' escape '\'
		)
	order by
		case
			when length(n.raw) >= 2 and unaccent(lower(r.title)) like n.pattern || '%' escape '\' then 0
			else 1
		end,
		r.updated_at desc nulls last,
		r.title
	limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

comment on function public.search_resources(text, text[], text[], text[], integer) is
	'Recherche par titre, métadonnées, tags et niveau dans la vue resources, insensible à la casse et aux accents. p_grades restreint aux ressources dont les niveaux recoupent la liste ; une ressource sans niveau passe toujours. security invoker : ne renvoie que ce que l''appelant peut déjà lire.';

revoke all on function public.search_resources(text, text[], text[], text[], integer) from public;
revoke all on function public.search_resources(text, text[], text[], text[], integer) from anon;
grant execute on function public.search_resources(text, text[], text[], text[], integer) to authenticated;
