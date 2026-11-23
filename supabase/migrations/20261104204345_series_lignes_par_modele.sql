-- ============================================================================
-- Séries et séances : chaque ancienne ligne (catégorie) devient une ligne de modèle
-- (ADR 0035, chantier automaths-arbre, lot 2b)
-- ============================================================================
-- Avant l'ADR 0035, une ligne de `series.categories` et de `test_sessions.categories` désignait
-- une CATÉGORIE : `{category: {theme, domain, subdomain, level}, quantity, delay}`. Le code livré
-- par la 0.71.0 lit les deux formes et n'écrit plus que la nouvelle, `{templateId, quantity,
-- delay}`. Cette migration convertit EN PLACE ce qui reste dans l'ancienne forme (relevé en prod
-- le 2026-11-04 : 5 séries / 29 lignes, 4 séances / 27 lignes, chacune → 1 modèle publié).
--
-- Une ancienne ligne désigne le modèle PUBLIÉ de son quadruplet (l'index unique
-- idx_question_templates_unique_category en garantit au plus un), sous-domaine absent, nul ou
-- vide confondus, comme `src/lib/questions/series-legacy.ts`. L'ordre des lignes, leurs nombres
-- de questions et leurs durées sont gardés ; les lignes déjà dans la nouvelle forme ne bougent
-- pas : rejouée, la migration ne change rien.
--
-- Décisions de David (2026-11-04, Q9-Q11 de la phase 0 de 2b) :
--   * TOUT ou RIEN : une ancienne ligne sans modèle publié (ou à plusieurs) fait échouer la
--     migration, qui ne change rien (Q11) ;
--   * une série verrouillée (évaluation commencée) est convertie aussi : elle joue les mêmes
--     modèles, seule l'écriture change. series_lock_guard est suspendu le temps de la
--     conversion (Q9) ;
--   * la date de modification des séries est gardée : update_series_updated_at est suspendu (Q10).
--
-- Accès : personne ne lit rien de nouveau. Les lignes réécrites restent lues par ceux qui les
-- lisaient (auteur de la série et ses élèves, élève de la séance, export RGPD) ; aucune policy
-- n'est touchée. Prouvée par tests/integration/series-lignes-par-modele.test.ts, qui pose des
-- séries et séances en ancienne forme puis rejoue CE fichier et son rollback.
--
-- Rollback : chaque ligne de modèle redevient la catégorie de son modèle (colonnes theme,
-- domain, subdomain, level encore là jusqu'au lot 4) ; une ligne dont le modèle n'a pas de
-- catégorie (modèle neuf, rangé par l'arbre) reste telle quelle — le code de la 0.71.0 lit les
-- deux formes. Sous-domaine nul → clé `subdomain` nulle. À jouer dans une transaction :
-- ROLLBACK:BEGIN
-- alter table public.series disable trigger series_lock_guard;
-- alter table public.series disable trigger update_series_updated_at;
-- update public.series s set categories = (
--   select jsonb_agg(case when q.id is null then e.value
--     else jsonb_build_object('category', jsonb_build_object('theme', q.theme, 'domain', q.domain,
--       'subdomain', q.subdomain, 'level', q.level), 'quantity', e.value->'quantity', 'delay', e.value->'delay') end
--     order by e.ordinality)
--   from jsonb_array_elements(s.categories) with ordinality e
--   left join public.question_templates q on e.value ? 'templateId'
--     and q.id::text = e.value->>'templateId' and q.theme is not null and q.domain is not null)
-- where exists (select 1 from jsonb_array_elements(s.categories) e where e ? 'templateId');
-- update public.test_sessions s set categories = (
--   select jsonb_agg(case when q.id is null then e.value
--     else jsonb_build_object('category', jsonb_build_object('theme', q.theme, 'domain', q.domain,
--       'subdomain', q.subdomain, 'level', q.level), 'quantity', e.value->'quantity', 'delay', e.value->'delay') end
--     order by e.ordinality)
--   from jsonb_array_elements(s.categories) with ordinality e
--   left join public.question_templates q on e.value ? 'templateId'
--     and q.id::text = e.value->>'templateId' and q.theme is not null and q.domain is not null)
-- where exists (select 1 from jsonb_array_elements(s.categories) e where e ? 'templateId');
-- alter table public.series enable trigger update_series_updated_at;
-- alter table public.series enable trigger series_lock_guard;
-- ROLLBACK:END
-- ============================================================================

-- Les `alter table` attendent les transactions en cours sur `series` : pas plus de 5 s
set local lock_timeout = '5s';

-- 1. Les anciennes lignes et leur modèle publié (rejouée dans la même transaction : table refaite)
drop table if exists _lignes_2b;
create temporary table _lignes_2b on commit drop as
select l.source, l.row_id, l.ord, l.ligne,
	(select count(*) from public.question_templates q
	  where q.status = 'published'
	    and q.theme = l.ligne->'category'->>'theme'
	    and q.domain = l.ligne->'category'->>'domain'
	    and coalesce(q.subdomain, '') = coalesce(l.ligne->'category'->>'subdomain', '')
	    and q.level::text = l.ligne->'category'->>'level') as n_modeles,
	(select q.id from public.question_templates q
	  where q.status = 'published'
	    and q.theme = l.ligne->'category'->>'theme'
	    and q.domain = l.ligne->'category'->>'domain'
	    and coalesce(q.subdomain, '') = coalesce(l.ligne->'category'->>'subdomain', '')
	    and q.level::text = l.ligne->'category'->>'level'
	  limit 1) as template_id
from (
	select 'series' as source, s.id as row_id, e.ordinality as ord, e.value as ligne
	  from public.series s, jsonb_array_elements(s.categories) with ordinality e
	union all
	select 'test_sessions', s.id, e.ordinality, e.value
	  from public.test_sessions s, jsonb_array_elements(s.categories) with ordinality e
) l
where l.ligne ? 'category';

-- 2. TOUT ou RIEN : chaque ancienne ligne désigne exactement un modèle publié
do $$
declare
	sans_modele integer;
	plusieurs integer;
begin
	select count(*) filter (where n_modeles = 0), count(*) filter (where n_modeles > 1)
	  into sans_modele, plusieurs
	  from _lignes_2b;
	if sans_modele > 0 or plusieurs > 0 then
		raise exception 'conversion des séries : % ancienne(s) ligne(s) sans modèle publié, % à plusieurs modèles',
			sans_modele, plusieurs;
	end if;
	raise notice 'conversion des séries : % ancienne(s) ligne(s) à convertir', (select count(*) from _lignes_2b);
end;
$$;

-- 3. Conversion, ordre gardé ; séries : verrou et date de modification suspendus (Q9, Q10)
alter table public.series disable trigger series_lock_guard;
alter table public.series disable trigger update_series_updated_at;

update public.series s set categories = (
	select jsonb_agg(case when c.template_id is null then e.value
		else jsonb_build_object('templateId', c.template_id, 'quantity', e.value->'quantity', 'delay', e.value->'delay') end
		order by e.ordinality)
	from jsonb_array_elements(s.categories) with ordinality e
	left join _lignes_2b c on c.source = 'series' and c.row_id = s.id and c.ord = e.ordinality)
where s.id in (select row_id from _lignes_2b where source = 'series');

update public.test_sessions s set categories = (
	select jsonb_agg(case when c.template_id is null then e.value
		else jsonb_build_object('templateId', c.template_id, 'quantity', e.value->'quantity', 'delay', e.value->'delay') end
		order by e.ordinality)
	from jsonb_array_elements(s.categories) with ordinality e
	left join _lignes_2b c on c.source = 'test_sessions' and c.row_id = s.id and c.ord = e.ordinality)
where s.id in (select row_id from _lignes_2b where source = 'test_sessions');

alter table public.series enable trigger update_series_updated_at;
alter table public.series enable trigger series_lock_guard;
