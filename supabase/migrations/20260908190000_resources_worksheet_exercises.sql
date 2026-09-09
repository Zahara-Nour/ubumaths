-- ============================================================================
-- Référencer un exercice AU SEIN d'une fiche
-- ============================================================================
-- Dans le cahier de texte, « faire les exercices 3 et 5 de la fiche Dérivées »
-- doit être citable tel quel : l'élève a besoin de savoir QUELLE FICHE ouvrir,
-- pas seulement quel exercice faire.
--
-- Le pivot est `worksheet_exercises.id` : un uuid qui identifie « cet exercice,
-- dans cette fiche, à cette position ». Il entre donc dans la grammaire
-- `[[type:uuid|libellé]]` sans la modifier, et depuis lui le serveur retrouve la
-- fiche (pour le lien) comme l'exercice (pour la couverture du programme).
--
-- QUESTION D'ACCÈS : **aucun accès nouveau.** La vue reste `security_invoker`,
-- et cette branche lit `worksheet_exercises`, `worksheets` et `exercises` sous
-- l'identité de l'appelant — donc sous leurs RLS respectives. Un élève n'y voit
-- que ce qu'il voyait déjà.
--
-- Pourquoi dans la vue plutôt que dans un point d'entrée dédié : la recherche
-- porte sur le titre ET le sous-titre. En mettant le titre de la fiche en
-- sous-titre, taper « Dérivées » remonte ses exercices — exactement le geste
-- recherché — sans aucune interface nouvelle.
--
-- ROLLBACK : recréer la vue depuis 20260908120000 (cinq branches).
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
-- 6ᵉ branche : un exercice DANS une fiche.
select
	'worksheet_exercise'::text,
	we.id,
	-- Le titre porte le repère de l'élève. Un exercice de fiche est souvent sans
	-- titre propre : sa position est alors la seule chose qui l'identifie.
	coalesce(nullif(btrim(e.title), ''), 'Exercice ' || we.position::text),
	-- Le sous-titre est le nom de la FICHE : c'est lui qui rend la recherche par
	-- fiche possible, puisque search_resources compare titre et sous-titre.
	'Fiche : ' || w.title,
	e.grades,
	w.status,
	false,
	w.created_by,
	null::text,
	greatest(we.updated_at, w.updated_at)
from public.worksheet_exercises we
join public.worksheets w on w.id = we.worksheet_id
join public.exercises e on e.id = we.exercise_id;

comment on view public.resources is
	'Adressage commun des ressources. security_invoker = true : les RLS des tables sources s''appliquent. Inclut `worksheet_exercise`, dont l''id est celui de la JONCTION worksheet_exercises — il désigne un exercice DANS une fiche, ce qui permet de citer « exercice 3 de la fiche X » et d''en dériver à la fois le lien vers la fiche et la couverture du programme de l''exercice.';

revoke all on public.resources from public, anon;
revoke all on public.resources from authenticated;
grant select on public.resources to authenticated;

-- ---------------------------------------------------------------------------
-- Le plafond du nombre de types était collé au nombre de types
-- ---------------------------------------------------------------------------
-- `search_resources` refusait plus de 5 types (`array_length(p_kinds,1) <= 5`),
-- soit exactement la taille du vocabulaire d'alors. L'éditeur envoie TOUS les
-- types (`kinds=RESOURCE_KINDS.join(',')`) : en passer à six aurait donc rendu
-- la recherche vide — sans erreur, sans trace, juste « aucun résultat ».
--
-- Ce garde-fou borne un COÛT (le `= any(...)` est linéaire en la taille du
-- tableau), il ne valide pas un vocabulaire : c'est le rôle du schéma Zod, qui
-- énumère les types réels. On lui donne donc une marge, pour qu'ajouter un type
-- ne casse plus jamais la recherche en silence.
create or replace function public.search_resources(
	p_query text,
	p_kinds text[] default null,
	p_tags text[] default null,
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
		-- Marge délibérée sur la taille du vocabulaire : borne de coût, pas
		-- validation de contenu (cf. RESOURCE_KINDS côté application).
		and coalesce(array_length(p_kinds, 1), 0) <= 12
		and coalesce(array_length(p_tags, 1), 0) <= 10
		and (length(n.raw) >= 2 or p_tags is not null)
		and (p_kinds is null or r.kind = any (p_kinds))
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

comment on function public.search_resources(text, text[], text[], integer) is
	'Recherche par titre, métadonnées et tags dans la vue resources, insensible à la casse et aux accents. Les tags sont comparés sur leur slug canonique. security invoker : ne renvoie que ce que l''appelant peut déjà lire. Un tag seul suffit ; sinon deux caractères de texte minimum. Le plafond sur p_kinds est une borne de coût, volontairement supérieure au vocabulaire.';

revoke all on function public.search_resources(text, text[], text[], integer) from public;
revoke all on function public.search_resources(text, text[], text[], integer) from anon;
grant execute on function public.search_resources(text, text[], text[], integer) to authenticated;
