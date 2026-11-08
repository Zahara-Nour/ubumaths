-- ============================================================================
-- Chantier « questions-2de-demonstrations », lot 5 (exemples d'algorithmes, géométrie) : nœud et tag des 2 modèles
-- ============================================================================
--   Deux brouillons créés sans nœud ni tag vont chacun sur la sous-notion EXISTANTE et active où
--   est posé leur point, et reçoivent ce seul point :
--     6564c2bf Tester l'alignement de trois points en Python
--              → Géométrie > Vecteurs > colinéarité, 2-321
--     9a05a09f Équation réduite d'une droite par deux points, en Python
--              → Géométrie > Géométrie repérée > équations de droites, 2-322
-- Aucune sous-notion neuve. question_template_points_check_rules accepte un tag dont le point est
-- sur le nœud du modèle OU sur sa notion, et au plus UN point par programme (ADR 0020).
-- Ni le contenu, ni les niveaux, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-08 (journal docs/wip/questions-2de-demonstrations-progress.md,
-- § 9, D3, Q3 à Q5). Les modèles ont été créés en brouillon par David le 2026-11-08 avec
-- scripts/create-questions.ts (scripts/questions/2de-algorithmes-5/, #2484), qui ne pose ni nœud
-- ni tag. Relevé de la prod du 2026-11-08 (MCP) : 2 brouillons au niveau {2}, sans nœud ni tag ;
-- les 2 points sur les sous-notions visées, actives ; aucun modèle déjà tagué sur ces points.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent. Elle est prouvée par
-- tests/integration/questions-2de-algorithmes-5-rangement-tags.test.ts, qui fabrique des
-- copies des identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : les modèles doivent être encore SANS nœud et SANS aucun tag
-- (relevé du 2026-11-08), sinon un rangement fait depuis à la main serait écrasé. Nœuds désignés par
-- leur chemin, points par leur code, résolus STRICTEMENT ; chaque point doit être sur le nœud de son
-- modèle ou sur sa notion. Tout ou rien.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin et prof ; leurs tags, pas leur
-- contenu, lisibles par tout compte connecté, comme pour tout modèle). Question posée à David AVANT
-- le SQL (phase 0, Q5 de D3), tranchée par lui le 2026-11-08 : personne. Aucune
-- règle (policy) ne change. Les élèves ne voient les modèles qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 2 tags et rend les modèles sans nœud. Garde : il
-- refuse si un modèle n'est plus sur le nœud laissé par la migration ou si leurs tags ont changé.
-- Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q2a5_retour_tags;
-- drop table if exists pg_temp._q2a5_retour;
-- create temporary table _q2a5_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text not null, noeud uuid
-- );
-- insert into _q2a5_retour values
-- 	('6564c2bf-4dbc-4558-8a1f-f2aa149991b4', 'Géométrie', 'Vecteurs', 'colinéarité', null),
-- 	('9a05a09f-636c-4079-9a8c-210a960644d3', 'Géométrie', 'Géométrie repérée', 'équations de droites', null);
-- create temporary table _q2a5_retour_tags (id uuid not null, grade text not null, code text not null, primary key (id, grade));
-- insert into _q2a5_retour_tags values
-- 	('6564c2bf-4dbc-4558-8a1f-f2aa149991b4', '2', '2-321'),
-- 	('9a05a09f-636c-4079-9a8c-210a960644d3', '2', '2-322');
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _q2a5_retour order by id;
-- select 1 from public.question_templates where id in (select id from _q2a5_retour) order by id for update;
-- update _q2a5_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and s.name = r.sous_notion;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer; v_attendus integer;
-- begin
-- 	if exists (select 1 from _q2a5_retour where noeud is null) then
-- 		raise exception 'rollback : nœud introuvable';
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _q2a5_retour r on r.id = q.id;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur %, plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*) into v_attendus from _q2a5_retour_tags t join public.question_templates q on q.id = t.id;
-- 	select count(*), count(*) filter (where exists (select 1 from _q2a5_retour_tags t
-- 	                                                where t.id = q.template_id and t.grade = p.grade and t.code = p.code))
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _q2a5_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_attendus or v_total <> v_attendus then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_attendus;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _q2a5_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _q2a5_retour);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _q2a5_retour_tags;
-- drop table _q2a5_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Les modèles et leurs tags, en tables temporaires ----------------------------------------
drop table if exists pg_temp._q2a5_tags;
drop table if exists pg_temp._q2a5_modeles;
create temporary table _q2a5_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null
);
insert into _q2a5_modeles values
	('6564c2bf-4dbc-4558-8a1f-f2aa149991b4', 'Géométrie', 'Vecteurs', 'colinéarité'),
	('9a05a09f-636c-4079-9a8c-210a960644d3', 'Géométrie', 'Géométrie repérée', 'équations de droites');
create temporary table _q2a5_tags (
	id uuid not null references _q2a5_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _q2a5_tags values
	('6564c2bf-4dbc-4558-8a1f-f2aa149991b4', '2', '2-321'),
	('9a05a09f-636c-4079-9a8c-210a960644d3', '2', '2-322');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et la ligne du modèle.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q2a5_modeles order by id;
select 1 from public.question_templates where id in (select id from _q2a5_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) : sans nœud, sans tag ---------------------------------
do $garde$
declare v_ranges integer; v_tags integer;
begin
	select count(*) into v_ranges from _q2a5_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèle(s) déjà rangé(s) depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q2a5_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèle(s) déjà tagué(s) depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. Résolution STRICTE du chemin et des points --------------------------------------
alter table _q2a5_modeles add column noeud uuid;
alter table _q2a5_modeles add column notion_id uuid;
alter table _q2a5_tags add column point_id uuid;
update _q2a5_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q2a5_tags t set point_id = p.id
  from _q2a5_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _q2a5_modeles where noeud is null)
	   or exists (select 1 from _q2a5_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q2a5_modeles where noeud is null),
			(select count(*) from _q2a5_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 4. Rangement, puis tags (le trigger des tags lit le nœud du modèle) -----------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q2a5_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _q2a5_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications ------------------------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q2a5_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q2a5_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _q2a5_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _q2a5_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q2a5_modeles m on m.id = q.template_id;
	-- Tout ou rien : les 2 modèles (prod) ou aucun (base locale), jamais une partie.
	if v_presents not in (0, (select count(*) from _q2a5_modeles)) then
		raise exception 'lot partiel : % modèle(s) présent(s) sur %', v_presents,
			(select count(*) from _q2a5_modeles);
	end if;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _q2a5_tags;
drop table _q2a5_modeles;
