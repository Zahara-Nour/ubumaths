-- ============================================================================
-- Chantier « questions-tspe », lot 4 (intégrales et primitives) : nœud et tags de 9 modèles
-- ============================================================================
--   les 9 brouillons du lot 4, créés sans nœud ni tag, vont sur un nœud EXISTANT, tag posé :
--   b822359e (Résoudre l'équation y′ = f) → TSPE-461 (point sur la notion), « y′ = f > primitives : notion » ;
--   4329e837 (F est-elle une primitive de f ?) → TSPE-462, « y′ = f > primitives : notion » ;
--   31defbfe (Existence de primitives d'une fonction continue) → TSPE-478, « y′ = f > primitives : notion » ;
--   e68152f7 (Linéarité de l'intégrale) → TSPE-480, « Calcul d'intégrales > linéarité » ;
--   affbbde3 (Estimer graphiquement une intégrale) → TSPE-485, « Intégrale et aire > aire algébrique » ;
--   b9d542d5 (Estimer graphiquement une valeur moyenne) → TSPE-486, sur la NOTION « Valeur moyenne »
--   (elle n'a aucune sous-notion ; ses 3 modèles publiés y sont déjà) ;
--   fafe2d94 (Majorer une intégrale par une autre fonction) → TSPE-489, « Calcul d'intégrales >
--   positivité et inégalités » ;
--   6035aa61 (Suite d'intégrales) → TSPE-491, « Calcul d'intégrales > suites d'intégrales » ;
--   16974687 (Allure des solutions de y′ = ay) → TSPE-465, « Généralités > allure des courbes ».
-- Branches : « Équations différentielles » (y′ = f, Généralités), « Intégration » (le reste).
-- Aucune sous-notion neuve. question_template_points_check_rules accepte un tag dont le point est
-- sur le nœud du modèle OU sur sa notion, et au plus UN point par programme (ADR 0020).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-02 (journal docs/wip/questions-tspe-progress.md § 17).
-- Les modèles ont été créés en brouillon le 2026-11-02 par scripts/create-questions.ts
-- (scripts/questions/tspe-4-integrales-primitives/, #2215), qui ne pose ni nœud ni tag. Relevé de
-- la prod du 2026-11-02 (MCP) : 9 brouillons en [T_SPE], niveaux 3, 2, 4, 1, 2, 1, 3, 1, 1, sans nœud
-- ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (9 modèles). Elle est prouvée par
-- tests/integration/questions-tspe-lot4-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : chaque modèle doit être encore SANS nœud et SANS aucun tag
-- (relevé du 2026-11-02), sinon un rangement fait depuis à la main serait écrasé. Nœuds désignés
-- par leur chemin, résolus STRICTEMENT ; chaque point doit être sur le nœud de son modèle ou sur sa
-- notion.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin et prof ; leurs tags, pas leur
-- contenu, lisibles par tout compte connecté, comme avant). Question posée avec la phase 0 du lot 4
-- (journal § 17), « go » de David le 2026-11-02. Aucune règle (policy) ne change. Les élèves ne
-- voient les modèles qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 9 tags et rend les modèles sans nœud. Garde : il
-- refuse si un modèle n'est plus sur le nœud laissé par la migration ou porte d'autres tags. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qtl4_retour;
-- create temporary table _qtl4_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text,
-- 	grade text not null, code text not null, noeud uuid
-- );
-- insert into _qtl4_retour values
-- 	('b822359e-6a1c-418b-b991-95b46a5c5b17', 'Équations différentielles', 'y′ = f', 'primitives : notion', 'T_SPE', 'TSPE-461', null),
-- 	('4329e837-f3ca-48e9-9d4b-b1e34418fb2a', 'Équations différentielles', 'y′ = f', 'primitives : notion', 'T_SPE', 'TSPE-462', null),
-- 	('31defbfe-6b65-4b30-9c42-f60eab110f23', 'Équations différentielles', 'y′ = f', 'primitives : notion', 'T_SPE', 'TSPE-478', null),
-- 	('e68152f7-f990-4788-ae8f-0e49ec6e2778', 'Intégration', 'Calcul d''intégrales', 'linéarité', 'T_SPE', 'TSPE-480', null),
-- 	('affbbde3-d883-401a-a190-6145bfac350f', 'Intégration', 'Intégrale et aire', 'aire algébrique', 'T_SPE', 'TSPE-485', null),
-- 	('b9d542d5-467c-429e-a4ef-dbc918067673', 'Intégration', 'Valeur moyenne', null, 'T_SPE', 'TSPE-486', null),
-- 	('fafe2d94-06f5-43b4-b720-611708835b2b', 'Intégration', 'Calcul d''intégrales', 'positivité et inégalités', 'T_SPE', 'TSPE-489', null),
-- 	('6035aa61-12d4-4a6e-82b1-9455d46fae82', 'Intégration', 'Calcul d''intégrales', 'suites d''intégrales', 'T_SPE', 'TSPE-491', null),
-- 	('16974687-c9a6-41ca-9faa-c11c7e881a1e', 'Équations différentielles', 'Généralités', 'allure des courbes', 'T_SPE', 'TSPE-465', null);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qtl4_retour order by id;
-- select 1 from public.question_templates where id in (select id from _qtl4_retour) order by id for update;
-- update _qtl4_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and r.sous_notion is not null and s.name = r.sous_notion;
-- update _qtl4_retour r set noeud = n.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and r.sous_notion is null;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _qtl4_retour where noeud is null) then
-- 		raise exception 'rollback : nœuds introuvables : %', (select count(*) from _qtl4_retour where noeud is null);
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _qtl4_retour r on r.id = q.id;
-- 	if v_presents not in (0, 9) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 9', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ne sont plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*), count(*) filter (where p.grade = r.grade and p.code = r.code)
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _qtl4_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_total or v_total <> v_presents then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_presents;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _qtl4_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _qtl4_retour);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _qtl4_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._qtl4_tags;
drop table if exists pg_temp._qtl4_modeles;
create temporary table _qtl4_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text  -- null : le modèle va sur la notion (qui n'a pas de sous-notion)
);
insert into _qtl4_modeles values
	('b822359e-6a1c-418b-b991-95b46a5c5b17', 'Équations différentielles', 'y′ = f', 'primitives : notion'),
	('4329e837-f3ca-48e9-9d4b-b1e34418fb2a', 'Équations différentielles', 'y′ = f', 'primitives : notion'),
	('31defbfe-6b65-4b30-9c42-f60eab110f23', 'Équations différentielles', 'y′ = f', 'primitives : notion'),
	('e68152f7-f990-4788-ae8f-0e49ec6e2778', 'Intégration', 'Calcul d''intégrales', 'linéarité'),
	('affbbde3-d883-401a-a190-6145bfac350f', 'Intégration', 'Intégrale et aire', 'aire algébrique'),
	('b9d542d5-467c-429e-a4ef-dbc918067673', 'Intégration', 'Valeur moyenne', null),
	('fafe2d94-06f5-43b4-b720-611708835b2b', 'Intégration', 'Calcul d''intégrales', 'positivité et inégalités'),
	('6035aa61-12d4-4a6e-82b1-9455d46fae82', 'Intégration', 'Calcul d''intégrales', 'suites d''intégrales'),
	('16974687-c9a6-41ca-9faa-c11c7e881a1e', 'Équations différentielles', 'Généralités', 'allure des courbes');
create temporary table _qtl4_tags (
	id uuid not null references _qtl4_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _qtl4_tags values
	('b822359e-6a1c-418b-b991-95b46a5c5b17', 'T_SPE', 'TSPE-461'),
	('4329e837-f3ca-48e9-9d4b-b1e34418fb2a', 'T_SPE', 'TSPE-462'),
	('31defbfe-6b65-4b30-9c42-f60eab110f23', 'T_SPE', 'TSPE-478'),
	('e68152f7-f990-4788-ae8f-0e49ec6e2778', 'T_SPE', 'TSPE-480'),
	('affbbde3-d883-401a-a190-6145bfac350f', 'T_SPE', 'TSPE-485'),
	('b9d542d5-467c-429e-a4ef-dbc918067673', 'T_SPE', 'TSPE-486'),
	('fafe2d94-06f5-43b4-b720-611708835b2b', 'T_SPE', 'TSPE-489'),
	('6035aa61-12d4-4a6e-82b1-9455d46fae82', 'T_SPE', 'TSPE-491'),
	('16974687-c9a6-41ca-9faa-c11c7e881a1e', 'T_SPE', 'TSPE-465');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qtl4_modeles order by id;
select 1 from public.question_templates where id in (select id from _qtl4_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) : présence TOUT ou RIEN, sans nœud, sans tag ---------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qtl4_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 9) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 9', v_presents;
	end if;
	select count(*) into v_ranges from _qtl4_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qtl4_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. Résolution STRICTE des chemins et des points -----------------------------------
-- Le nœud est la sous-notion désignée, ou la notion quand aucune sous-notion n'est donnée ; chaque
-- point doit être sur ce nœud ou sur sa notion
alter table _qtl4_modeles add column noeud uuid;
alter table _qtl4_modeles add column notion_id uuid;
alter table _qtl4_tags add column point_id uuid;
update _qtl4_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is not null and s.name = r.sous_notion;
update _qtl4_modeles r set noeud = n.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qtl4_tags t set point_id = p.id
  from _qtl4_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _qtl4_modeles where noeud is null)
	   or exists (select 1 from _qtl4_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qtl4_modeles where noeud is null),
			(select count(*) from _qtl4_tags where point_id is null);
	end if;
	-- Une notion désignée sans sous-notion ne doit en avoir AUCUNE (sinon le modèle irait par erreur
	-- sur la notion au lieu d'une de ses sous-notions)
	if exists (select 1 from _qtl4_modeles r
	             join public.classification_nodes s on s.parent_id = r.notion_id
	              and s.kind = 'subnotion' and s.archived_at is null
	            where r.sous_notion is null) then
		raise exception 'notion visée sans sous-notion, mais elle en a : % modèle(s)',
			(select count(*) from _qtl4_modeles r
			  where r.sous_notion is null
			    and exists (select 1 from public.classification_nodes s where s.parent_id = r.notion_id
			                  and s.kind = 'subnotion' and s.archived_at is null));
	end if;
end $resolution$;

-- ---- 4. Rangement, puis tags (le trigger des tags lit le nœud du modèle) -----------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qtl4_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _qtl4_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qtl4_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qtl4_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _qtl4_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _qtl4_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qtl4_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qtl4_tags;
drop table _qtl4_modeles;
