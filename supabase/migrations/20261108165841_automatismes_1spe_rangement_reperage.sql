-- ============================================================================
-- Chantier « automatismes-1spe » : nœud et tags des deux modèles neufs de repérage (5e)
-- ============================================================================
--   - d4f38d30 (Lire les coordonnées d'un point)         → 5-047
--   - d4d56c1b (Placer un point de coordonnées données)  → 5-128
--   tous deux sur « Géométrie > Repérage et déplacements > coordonnées dans le plan ».
-- Nœud EXISTANT et actif, aucune sous-notion neuve. Chaque modèle porte UN point (ADR 0020) ; les
-- deux points sont sur ce nœud même. Aucun modèle n'était encore tagué 5-047 ni 5-128.
-- Les modèles sont de niveau `5`, comme leurs points : aucune exception de niveaux.
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Les modèles ont été créés en brouillon le 2026-11-08 par scripts/create-questions.ts (lot
-- « Géométrie et repérage », #2462, scripts/questions/automatismes-2de-geometrie/), sans nœud ni
-- tag. Rangement validé par David le 2026-11-08 (journal docs/wip/automatismes-1spe-progress.md :
-- modèles de 5e, rangés sur 5-047 / 5-128, sans exception de niveaux). Relevé de la prod du
-- 2026-11-08 (MCP) : brouillons en {5}, sans nœud ni tag ; les deux points sont actifs, sur le
-- nœud désigné, sans aucun modèle.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent. Elle est prouvée par
-- tests/integration/automatismes-1spe-rangement-reperage.test.ts, qui fabrique une copie des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : les modèles doivent être encore SANS nœud et SANS aucun tag (relevé du 2026-11-08), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT ; le point doit être sur ce nœud ou sur sa notion.
--
-- Données d'élèves : aucune (modèles en brouillon, jamais publiés).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David avant le SQL, tranchée par
-- lui le 2026-11-08 : personne). Aucune règle (policy) ne change. Effet visible : les brouillons
-- apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient qu'une fois
-- publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('d4d56c1b-d411-49fc-a314-dc2bf14bf05e'::uuid), ('d4f38d30-3575-472f-827c-cc2d8ad6c651'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('d4f38d30-3575-472f-827c-cc2d8ad6c651'::uuid, '5', '5-047'),
-- 	('d4d56c1b-d411-49fc-a314-dc2bf14bf05e'::uuid, '5', '5-128')
--  ) as r(id, grade, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('d4f38d30-3575-472f-827c-cc2d8ad6c651', 'd4d56c1b-d411-49fc-a314-dc2bf14bf05e');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._a1_reperage;
create temporary table _a1_reperage (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	grade text not null,
	code text not null
);
insert into _a1_reperage values
	('d4f38d30-3575-472f-827c-cc2d8ad6c651', 'Géométrie', 'Repérage et déplacements', 'coordonnées dans le plan', '5', '5-047'),
	('d4d56c1b-d411-49fc-a314-dc2bf14bf05e', 'Géométrie', 'Repérage et déplacements', 'coordonnées dans le plan', '5', '5-128');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _a1_reperage order by id;
select 1 from public.question_templates where id in (select id from _a1_reperage) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée ; le point est sur ce nœud ou sur sa notion
alter table _a1_reperage add column noeud uuid, add column point_id uuid;
update _a1_reperage r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _a1_reperage r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _a1_reperage r set point_id = p.id
  from public.curriculum_points p, public.classification_nodes x
 where x.id = r.noeud
   and p.grade = r.grade and p.code = r.code and p.archived_at is null
   and p.node_id in (r.noeud, case when x.kind = 'subnotion' then x.parent_id else x.id end);
do $resolution$
begin
	if exists (select 1 from _a1_reperage where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _a1_reperage where noeud is null),
			(select count(*) from _a1_reperage where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _a1_reperage r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 2) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 2', v_presents;
	end if;
	select count(*) into v_ranges from _a1_reperage r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _a1_reperage r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _a1_reperage r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _a1_reperage r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _a1_reperage r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _a1_reperage r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _a1_reperage r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _a1_reperage m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _a1_reperage;
