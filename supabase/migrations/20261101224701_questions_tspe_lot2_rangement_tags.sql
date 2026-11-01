-- ============================================================================
-- Chantier « questions-tspe », lot 2 (limites) : 3 sous-notions neuves, nœud et tags de 4 modèles
-- ============================================================================
--   trois sous-notions NEUVES, en fin de leur notion :
--     « Suites > Limites de suites > limites usuelles »,
--     « Suites > Limites de suites > croissances comparées »,
--     « Fonctions > Limites de fonctions > limites usuelles » ;
--   les 4 brouillons du lot 2, créés sans nœud ni tag, vont sur leur sous-notion, tag posé :
--   3d7d1d25 (Limites usuelles d'une suite) → TSPE-402, « Limites de suites > limites usuelles » ;
--   0fb97bb9 (Croissances comparées : suites) → TSPE-576, « Limites de suites > croissances comparées » ;
--   6d611634 (Limites usuelles d'une fonction) → TSPE-403, « Limites de fonctions > limites usuelles » ;
--   ae70373c (Limite d'une fonction par comparaison ou encadrement) → TSPE-582, « Limites de
--   fonctions > comparaison et encadrement » (sous-notion existante, vide).
-- Les 4 points restent sur leur notion : question_template_points_check_rules accepte un tag dont
-- le point est sur le nœud du modèle OU sur sa notion, et au plus UN point par programme (ADR 0020).
-- Ni le contenu, ni les niveaux (écrits à la création : [T_SPE], niveau 1), ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-01 (journal docs/wip/questions-tspe-progress.md § 15, D-L1).
-- Les modèles ont été créés en brouillon le 2026-11-01 par scripts/create-questions.ts
-- (scripts/questions/tspe-2-limites/, #2160), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-01 (MCP) : 4 brouillons en [T_SPE], niveau 1, sans nœud ni tag ; TSPE-402 et 576 sur
-- « Suites > Limites de suites », TSPE-403 et 582 sur « Fonctions > Limites de fonctions » ; aucune
-- des trois sous-notions n'existe.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle et
-- ses vérifications le tolèrent (les sous-notions, elles, sont créées partout) ; elle exige TOUT ou
-- RIEN (4 modèles). Elle est prouvée par tests/integration/questions-tspe-lot2-rangement-tags.test.ts,
-- qui fabrique des copies des identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : chaque modèle doit être encore SANS nœud et SANS aucun tag
-- (relevé du 2026-11-01), sinon un rangement fait depuis à la main serait écrasé ; aucune des trois
-- sous-notions ne doit exister (même nom, casse ignorée, sous la même notion). Nœuds désignés par
-- leur chemin, résolus STRICTEMENT ; chaque point doit être sur le nœud de son modèle ou sur sa
-- notion.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon ; sous-notions neuves).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin et prof ; leurs tags, pas leur
-- contenu, lisibles par tout compte connecté, comme avant ; l'arbre des notions est de lecture
-- publique, les sous-notions neuves aussi, comme toutes). Question posée avec la phase 0 du lot 2
-- (journal § 15), « go » de David le 2026-11-01. Aucune règle (policy) ne change. Les élèves ne
-- voient les modèles qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 4 tags, rend les modèles sans nœud et supprime
-- les trois sous-notions. Garde : il refuse si un modèle n'est plus sur le nœud laissé par la
-- migration ou porte d'autres tags, ou si une sous-notion neuve porte autre chose (modèle, point,
-- enfant) que les modèles du lot. Bloc éprouvé par le test d'intégration, à jouer dans UNE
-- transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qtl2_retour;
-- create temporary table _qtl2_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text not null,
-- 	grade text not null, code text not null, neuve boolean not null, noeud uuid
-- );
-- insert into _qtl2_retour values
-- 	('3d7d1d25-98eb-47c1-9841-299b2d6666ae', 'Suites', 'Limites de suites', 'limites usuelles', 'T_SPE', 'TSPE-402', true, null),
-- 	('0fb97bb9-f5fd-4c5e-b220-8d6bdb6da662', 'Suites', 'Limites de suites', 'croissances comparées', 'T_SPE', 'TSPE-576', true, null),
-- 	('6d611634-f7a1-4100-b931-9035ea5c0d29', 'Fonctions', 'Limites de fonctions', 'limites usuelles', 'T_SPE', 'TSPE-403', true, null),
-- 	('ae70373c-8135-4c3b-bf17-74ca1e265c68', 'Fonctions', 'Limites de fonctions', 'comparaison et encadrement', 'T_SPE', 'TSPE-582', false, null);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qtl2_retour order by id;
-- select 1 from public.question_templates where id in (select id from _qtl2_retour) order by id for update;
-- update _qtl2_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and s.name = r.sous_notion;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _qtl2_retour where noeud is null) then
-- 		raise exception 'rollback : sous-notions introuvables : %', (select count(*) from _qtl2_retour where noeud is null);
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _qtl2_retour r on r.id = q.id;
-- 	if v_presents not in (0, 4) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 4', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % encore sur le nœud de la migration', v_intacts, v_presents;
-- 	end if;
-- 	select count(*), count(*) filter (where p.grade = r.grade and p.code = r.code)
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _qtl2_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_total or v_total <> v_presents then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_presents;
-- 	end if;
-- 	if exists (select 1 from public.question_templates q
-- 	            where q.classification_node_id in (select noeud from _qtl2_retour where neuve)
-- 	              and q.id not in (select id from _qtl2_retour))
-- 	   or exists (select 1 from public.classification_nodes c where c.parent_id in (select noeud from _qtl2_retour where neuve))
-- 	   or exists (select 1 from public.curriculum_points p where p.node_id in (select noeud from _qtl2_retour where neuve)) then
-- 		raise exception 'rollback : une sous-notion neuve porte autre chose que les modèles du lot';
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _qtl2_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _qtl2_retour);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- delete from public.classification_nodes where id in (select noeud from _qtl2_retour where neuve);
-- drop table _qtl2_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._qtl2_tags;
drop table if exists pg_temp._qtl2_modeles;
drop table if exists pg_temp._qtl2_neuves;
create temporary table _qtl2_neuves (
	branche text not null,
	notion text not null,
	sous_notion text not null,
	primary key (branche, notion, sous_notion)
);
insert into _qtl2_neuves values
	('Suites', 'Limites de suites', 'limites usuelles'),
	('Suites', 'Limites de suites', 'croissances comparées'),
	('Fonctions', 'Limites de fonctions', 'limites usuelles');
create temporary table _qtl2_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null
);
insert into _qtl2_modeles values
	('3d7d1d25-98eb-47c1-9841-299b2d6666ae', 'Suites', 'Limites de suites', 'limites usuelles'),
	('0fb97bb9-f5fd-4c5e-b220-8d6bdb6da662', 'Suites', 'Limites de suites', 'croissances comparées'),
	('6d611634-f7a1-4100-b931-9035ea5c0d29', 'Fonctions', 'Limites de fonctions', 'limites usuelles'),
	('ae70373c-8135-4c3b-bf17-74ca1e265c68', 'Fonctions', 'Limites de fonctions', 'comparaison et encadrement');
create temporary table _qtl2_tags (
	id uuid not null references _qtl2_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _qtl2_tags values
	('3d7d1d25-98eb-47c1-9841-299b2d6666ae', 'T_SPE', 'TSPE-402'),
	('0fb97bb9-f5fd-4c5e-b220-8d6bdb6da662', 'T_SPE', 'TSPE-576'),
	('6d611634-f7a1-4100-b931-9035ea5c0d29', 'T_SPE', 'TSPE-403'),
	('ae70373c-8135-4c3b-bf17-74ca1e265c68', 'T_SPE', 'TSPE-582');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qtl2_modeles order by id;
select 1 from public.question_templates where id in (select id from _qtl2_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) : présence TOUT ou RIEN, sans nœud, sans tag ; ---------
-- notions présentes, sous-notions neuves absentes
alter table _qtl2_neuves add column notion_id uuid;
update _qtl2_neuves r set notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion;
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer; v_existantes integer;
begin
	if exists (select 1 from _qtl2_neuves where notion_id is null) then
		raise exception 'notions introuvables : %', (select count(*) from _qtl2_neuves where notion_id is null);
	end if;
	select count(*) into v_existantes from _qtl2_neuves r
	  join public.classification_nodes s on s.parent_id = r.notion_id and lower(s.name) = lower(r.sous_notion);
	if v_existantes <> 0 then
		raise exception 'sous-notions déjà présentes : %', v_existantes;
	end if;
	select count(*) into v_presents from _qtl2_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 4) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 4', v_presents;
	end if;
	select count(*) into v_ranges from _qtl2_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qtl2_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. Les sous-notions neuves, en fin de leur notion -----------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
select 'subnotion', r.notion_id, r.sous_notion,
       (select coalesce(max(s.position), -1) from public.classification_nodes s where s.parent_id = r.notion_id)
       + row_number() over (partition by r.notion_id order by r.sous_notion desc)
  from _qtl2_neuves r;

-- ---- 4. Résolution STRICTE des chemins et des points -----------------------------------
-- Le nœud est la sous-notion désignée ; chaque point doit être sur ce nœud ou sur sa notion
alter table _qtl2_modeles add column noeud uuid;
alter table _qtl2_modeles add column notion_id uuid;
alter table _qtl2_tags add column point_id uuid;
update _qtl2_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qtl2_tags t set point_id = p.id
  from _qtl2_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _qtl2_modeles where noeud is null)
	   or exists (select 1 from _qtl2_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qtl2_modeles where noeud is null),
			(select count(*) from _qtl2_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 5. Rangement, puis tags (le trigger des tags lit le nœud du modèle) -----------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qtl2_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _qtl2_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 6. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
        v_neuves integer;
begin
	select count(*) into v_neuves from _qtl2_neuves r
	  join public.classification_nodes s on s.parent_id = r.notion_id and s.kind = 'subnotion'
	   and s.archived_at is null and s.name = r.sous_notion;
	select count(*) into v_presents from _qtl2_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qtl2_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _qtl2_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _qtl2_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qtl2_modeles m on m.id = q.template_id;
	if v_neuves <> 3 or v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : sous-notions %/3, nœuds %/%, tags du lot %/%, tags en base %',
			v_neuves, v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qtl2_tags;
drop table _qtl2_modeles;
drop table _qtl2_neuves;
