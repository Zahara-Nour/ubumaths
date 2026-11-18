-- ============================================================================
-- 1re techno, lot 4 « algorithmique » : nœud et tags de 8 brouillons neufs
-- ============================================================================
--   8 brouillons neufs (créés par scripts/create-questions.ts, sans nœud ni tag) sont rangés sur le
--   nœud de leur point 1TECHNO et tagués :
--     fba4bd3c M1 « Simuler une loi de Bernoulli avec random() »             → 1TECHNO-003
--     2bf630e5 M2 « Simuler un échantillon d'une loi de Bernoulli »          → 1TECHNO-103 + 1SPE-362
--     dfeed66c M3 « Simuler N échantillons et lire l'histogramme »           → 1TECHNO-101
--     a14d1b12 M4 « Compter les fréquences dans [p − ks ; p + ks] »          → 1TECHNO-105
--     ecba4038 M5 « Accumulateur pour calculer un produit »                  → 1TECHNO-107
--     b916ab0f M6 « Liste des premiers termes d'une suite en Python »        → 1TECHNO-051
--     92120570 M7 « Rang à partir duquel une suite dépasse une autre »       → 1TECHNO-122
--     3263f8f6 M8 « Valeur approchée d'une solution par balayage »           → 1TECHNO-067
--   M2 est un modèle commun ({1_TECHNO,1_SPE}) : 1SPE-362 « Simuler une variable aléatoire avec
--   Python » est sur le même nœud (« simulation ») que 1TECHNO-103. Leurs niveaux (écrits à la
--   création), leur statut (brouillon) et `updated_at` ne changent pas.
-- ============================================================================
-- Chantier `questions-1techno` (journal docs/wip/questions-1techno-progress.md, § 26). Phase 0
-- validée par David le 2026-11-18 ; rendus validés par David le 2026-11-18 ; brouillons créés en
-- prod par David le 2026-11-18 (fichiers scripts/questions/1techno-4/).
--
-- Relevé de la prod du 2026-11-18 (MCP) : les 8 en brouillon, sans nœud ni tag ; M2 {1_TECHNO,1_SPE},
-- les 7 autres {1_TECHNO}. Les 9 points visés ont 0 modèle ; 1SPE-362 et 1TECHNO-103 sont sur le
-- même nœud.
--
-- Chaque modèle porte UN point 1TECHNO (ADR 0020), et M2 son point jumeau 1SPE ; le trigger des
-- tags vérifie que le point est sur le nœud du modèle ou sur sa notion. Le nœud est LU sur le point
-- 1TECHNO (`node_id`) ; le point 1SPE doit être sur ce même nœud.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (8 modèles). Elle est prouvée par
-- tests/integration/questions-1techno-lot4-rangement-tags.test.ts, qui fabrique des copies portant
-- les vrais identifiants dans l'état relevé, puis rejoue CE fichier.
--
-- Gardes : les 8 encore SANS nœud et SANS tag, en brouillon, avec les niveaux du relevé. Sinon le
-- lot a bougé depuis le relevé : rien n'est écrit.
--
-- Données d'élèves : aucune n'est modifiée (cartes, tentatives, devoirs non touchés).
--
-- Accès : aucune règle (policy) ne change. Question d'accès de la phase 0 (§ 26, validée par David
-- le 2026-11-18 AVANT le SQL) : personne ne gagne d'accès. Les 8 restent des brouillons, visibles
-- dans l'admin sous leur nœud et leurs points ; aucun modèle existant n'est touché. Personne ne
-- perd rien.
--
-- Rollback (aucune donnée d'élève). Il retire les 9 tags posés et rend les 8 sans nœud. Garde : il
-- refuse si un des 9 tags manque. Bloc éprouvé par le test d'intégration, à jouer dans UNE
-- transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q1t4_retour;
-- create temporary table _q1t4_retour (id uuid not null, code text not null);
-- insert into _q1t4_retour values
-- 	('fba4bd3c-0888-4ce1-a4a3-70be99b68987', '1TECHNO-003'),
-- 	('2bf630e5-d983-4123-a5b8-17a9a0eddbe6', '1TECHNO-103'),
-- 	('2bf630e5-d983-4123-a5b8-17a9a0eddbe6', '1SPE-362'),
-- 	('dfeed66c-f7fb-4a28-b8d8-80d5bf61a3e7', '1TECHNO-101'),
-- 	('a14d1b12-505f-492c-8f72-35efa16ab3be', '1TECHNO-105'),
-- 	('ecba4038-e4f2-4861-835b-2b2d3beab467', '1TECHNO-107'),
-- 	('b916ab0f-73d5-4c3d-80d6-5300f4594f91', '1TECHNO-051'),
-- 	('92120570-1a05-4caa-a0da-5e4d3e20e897', '1TECHNO-122'),
-- 	('3263f8f6-44af-4952-9cf0-45fdc0d8e344', '1TECHNO-067');
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from (select distinct id from _q1t4_retour) m order by id;
-- select 1 from public.question_templates where id in (select id from _q1t4_retour) order by id for update;
-- do $rollback$
-- declare v_presents integer; v_tags integer;
-- begin
-- 	select count(*) into v_presents
-- 	  from public.question_templates q where q.id in (select id from _q1t4_retour);
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 8 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 8', v_presents;
-- 	end if;
-- 	select count(*) into v_tags
-- 	  from _q1t4_retour r
-- 	  join public.curriculum_points p on p.code = r.code and p.archived_at is null
-- 	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
-- 	if v_tags <> 9 then
-- 		raise exception 'rollback : tags changés depuis la migration : % sur 9 présents', v_tags;
-- 	end if;
-- 	delete from public.question_template_points t
-- 	 using _q1t4_retour r, public.curriculum_points p
-- 	 where p.code = r.code and p.archived_at is null and t.template_id = r.id and t.point_id = p.id;
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates q set classification_node_id = null
-- 	 where q.id in (select id from _q1t4_retour);
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- end $rollback$;
-- drop table _q1t4_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
-- `code_spe` : nul sauf pour M2. `grades` : les niveaux du relevé.
drop table if exists pg_temp._q1t4_modeles;
create temporary table _q1t4_modeles (
	id uuid primary key,
	code_techno text not null,
	code_spe text,
	grades text[] not null,
	point_techno uuid,
	point_spe uuid,
	noeud uuid
);
insert into _q1t4_modeles (id, code_techno, code_spe, grades) values
	('fba4bd3c-0888-4ce1-a4a3-70be99b68987', '1TECHNO-003', null, '{1_TECHNO}'),
	('2bf630e5-d983-4123-a5b8-17a9a0eddbe6', '1TECHNO-103', '1SPE-362', '{1_TECHNO,1_SPE}'),
	('dfeed66c-f7fb-4a28-b8d8-80d5bf61a3e7', '1TECHNO-101', null, '{1_TECHNO}'),
	('a14d1b12-505f-492c-8f72-35efa16ab3be', '1TECHNO-105', null, '{1_TECHNO}'),
	('ecba4038-e4f2-4861-835b-2b2d3beab467', '1TECHNO-107', null, '{1_TECHNO}'),
	('b916ab0f-73d5-4c3d-80d6-5300f4594f91', '1TECHNO-051', null, '{1_TECHNO}'),
	('92120570-1a05-4caa-a0da-5e4d3e20e897', '1TECHNO-122', null, '{1_TECHNO}'),
	('3263f8f6-44af-4952-9cf0-45fdc0d8e344', '1TECHNO-067', null, '{1_TECHNO}');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q1t4_modeles order by id;
select 1 from public.question_templates where id in (select id from _q1t4_modeles) order by id for update;

-- ---- 2. Points et nœuds, résolus par le code -----------------------------------------
update _q1t4_modeles r set point_techno = p.id, noeud = p.node_id
  from public.curriculum_points p
 where p.grade = '1_TECHNO' and p.code = r.code_techno and p.archived_at is null;
update _q1t4_modeles r set point_spe = p.id
  from public.curriculum_points p
 where p.grade = '1_SPE' and p.code = r.code_spe and p.archived_at is null
   and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q1t4_modeles
	            where point_techno is null or noeud is null
	               or (code_spe is not null and point_spe is null)) then
		raise exception 'points introuvables ou point 1SPE hors du nœud du point 1TECHNO : % modèle(s) sur 8',
			(select count(*) from _q1t4_modeles
			  where point_techno is null or noeud is null or (code_spe is not null and point_spe is null));
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, état du relevé -------------------------------
do $garde$
declare v_presents integer; v_conformes integer;
begin
	select count(*) into v_presents from _q1t4_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 8 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 8', v_presents;
	end if;
	select count(*) into v_conformes
	  from _q1t4_modeles r join public.question_templates q on q.id = r.id
	 where q.classification_node_id is null and q.grades = r.grades and q.status = 'draft'
	   and not exists (select 1 from public.question_template_points t where t.template_id = r.id);
	if v_conformes <> 8 then
		raise exception 'brouillons différents du relevé (nœud, tag, niveau ou statut) : % sur 8 conformes', v_conformes;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
-- (en base locale, aucun modèle : les jointures ne rendent rien et rien n'est écrit)
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q1t4_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_techno
  from _q1t4_modeles r join public.question_templates q on q.id = r.id
union all
select r.id, r.point_spe
  from _q1t4_modeles r join public.question_templates q on q.id = r.id
 where r.point_spe is not null;

-- ---- 5. Vérification : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_tags integer;
begin
	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
	  into v_presents, v_noeuds
	  from _q1t4_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	select count(*) into v_tags
	  from _q1t4_modeles r
	  join public.question_template_points t
	    on t.template_id = r.id and (t.point_id = r.point_techno or t.point_id = r.point_spe);
	if v_noeuds <> 8 or v_tags <> 9 then
		raise exception 'lot incohérent : nœuds %/8, tags %/9', v_noeuds, v_tags;
	end if;
end $check$;

drop table _q1t4_modeles;
