-- ============================================================================
-- Recherche par tag (phase 4 du chantier de référencement)
-- ============================================================================
-- Le clic sur un `#hashtag` doit répondre « quelles ressources portent cette
-- étiquette », pas « quelles ressources mentionnent ce mot dans leur titre ».
-- Ce sont deux questions différentes : un exercice tagué `fractions` peut
-- s'intituler « Additionner des quarts ».
--
-- La jonction `resource_tags` (migration 20260908130000) rend cette question
-- posable pour la première fois : avant elle, il aurait fallu chercher dans
-- cinq vocabulaires distincts.
--
-- QUESTION D'ACCÈS : **aucun accès nouveau**. Le filtre s'ajoute à l'intérieur
-- de la même vue `resources` (`security_invoker = true`) ; il RESTREINT les
-- résultats, il n'en ajoute jamais. Un élève qui appellerait la fonction avec un
-- tag ne verrait toujours que ce que ses RLS lui permettent.
--
-- ⚠️ POURQUOI UN `drop` : ajouter un 4ᵉ paramètre crée une SURCHARGE, et tout
-- appel à trois arguments deviendrait alors ambigu (« function is not unique »).
-- Il faut donc remplacer, pas surcharger. Aucune donnée n'est perdue : on
-- remplace du code, jamais des lignes. La fonction est recréée dans la même
-- transaction, il n'existe aucun instant où elle manquerait à l'application.
--
-- ROLLBACK :
--   drop function if exists public.search_resources(text, text[], text[], integer);
--   -- puis recréer la version à 3 paramètres depuis 20260908120000.
-- ============================================================================

drop function if exists public.search_resources(text, text[], integer);

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
			-- Les jokers de LIKE viennent de l'utilisateur : sans échappement, une
			-- recherche sur « % » renverrait tout le catalogue. La barre oblique
			-- inverse est échappée en premier, sinon elle mangerait les suivantes.
			replace(replace(replace(unaccent(lower(btrim(coalesce(p_query, '')))), '\', '\\'), '%', '\%'), '_', '\_') as pattern,
			unaccent(lower(btrim(coalesce(p_query, '')))) as raw
	),
	wanted_tags as (
		-- Les tags sont comparés sur leur forme canonique, jamais sur le libellé :
		-- « Algèbre », « algebre » et « ALGEBRE » désignent la même étiquette.
		select t.id
		from public.tags t
		where p_tags is not null
			and t.slug = any (select public.tag_slug(unnest(p_tags)))
	)
	select r.*
	from public.resources r, needle n
	where
		-- Bornes des DEUX côtés. Le plancher évite un balayage inutile ; le
		-- plafond est une garde de dénormalisation : la fonction est appelable
		-- directement en `POST /rest/v1/rpc/...` par tout compte connecté, donc
		-- les bornes du schéma Zod ne protègent que la route `/api/search`.
		length(n.raw) between 0 and 100
		and coalesce(array_length(p_kinds, 1), 0) <= 5
		and coalesce(array_length(p_tags, 1), 0) <= 10
		-- Au moins un critère : sans tag ET sans texte exploitable, on ne
		-- déverse pas le catalogue entier.
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
			-- Un tag seul est un critère suffisant : le texte devient facultatif.
			length(n.raw) < 2
			or unaccent(lower(r.title)) like '%' || n.pattern || '%' escape '\'
			or unaccent(lower(coalesce(r.subtitle, ''))) like '%' || n.pattern || '%' escape '\'
		)
	order by
		-- Un titre qui COMMENCE par la recherche passe avant un titre qui la
		-- contient ; à pertinence égale, le plus récemment modifié.
		case
			when length(n.raw) >= 2 and unaccent(lower(r.title)) like n.pattern || '%' escape '\' then 0
			else 1
		end,
		r.updated_at desc nulls last,
		r.title
	limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

comment on function public.search_resources(text, text[], text[], integer) is
	'Recherche par titre, métadonnées et tags dans la vue resources, insensible à la casse et aux accents. Les tags sont comparés sur leur slug canonique. security invoker : ne renvoie que ce que l''appelant peut déjà lire. Un tag seul suffit ; sinon deux caractères de texte minimum.';

revoke all on function public.search_resources(text, text[], text[], integer) from public;
revoke all on function public.search_resources(text, text[], text[], integer) from anon;
grant execute on function public.search_resources(text, text[], text[], integer) to authenticated;
