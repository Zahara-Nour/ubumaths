-- ============================================================================
-- 1re techno, lot 3 « dérivation » : nœud et tag de 9 brouillons neufs
-- ============================================================================
--   9 brouillons neufs (créés par scripts/create-questions.ts, sans nœud ni tag) sont rangés sur le
--   nœud de leur point et tagués :
--     06bee149 M1 « Taux de variation en un point »                         → 1TECHNO-128
--     5643abd0 M2 « Tangente : position limite des sécantes »               → 1TECHNO-069
--     382171b6 M3 « Équation réduite de la tangente : la formule »          → 1TECHNO-071
--     9b89e676 M4 « Fonction dérivée et nombre dérivé »                     → 1TECHNO-072
--     531a7080 M5 « Dérivée d'une somme »                                   → 1TECHNO-074
--     8efb084c M6 « Dérivée de kf »                                         → 1TECHNO-130
--     77a599ef M7 « Dérivée d'un polynôme de degré au plus 3 »              → 1TECHNO-131
--     14b60caa M8 « Sens de variation d'une fonction polynôme de degré ≤ 3 » → 1TECHNO-081
--     936b7e76 M9 « Fonction monotone et signe du taux de variation »      → 1TECHNO-056
--   Leurs niveaux ({1_TECHNO}, écrits à la création), leur statut (brouillon) et `updated_at` ne
--   changent pas.
-- ============================================================================
-- Chantier `questions-1techno` (journal docs/wip/questions-1techno-progress.md, § 25). Phase 0
-- validée par David le 2026-11-18 ; brouillons créés en prod par David le 2026-11-18 (fichiers
-- scripts/questions/1techno-3/) ; les 9 modèles relus par David sur la page à cocher du lot 3
-- (9 « OK » sur 9 le 2026-11-18). Aucun jumeau en 1re générale (questions-1gen consulté).
--
-- Relevé de la prod du 2026-11-18 (MCP) : les 9 en brouillon, {1_TECHNO}, sans nœud ni tag.
--
-- Chaque modèle porte UN point 1TECHNO (ADR 0020) ; le trigger des tags vérifie que le point est
-- sur le nœud du modèle ou sur sa notion. Le nœud est LU sur le point (`node_id`).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (9 modèles). Elle est prouvée par
-- tests/integration/questions-1techno-lot3-rangement-tags.test.ts, qui fabrique des copies portant
-- les vrais identifiants dans l'état relevé, puis rejoue CE fichier.
--
-- Gardes : les 9 encore SANS nœud et SANS tag, avec `1_TECHNO`. Sinon le lot a bougé depuis le
-- relevé : rien n'est écrit.
--
-- Données d'élèves : aucune n'est modifiée (cartes, tentatives, devoirs non touchés).
--
-- Accès : aucune règle (policy) ne change. Question d'accès de la phase 0 (§ 25, validée par David
-- le 2026-11-18 AVANT le SQL) : personne ne gagne d'accès. Les 9 restent des brouillons, visibles
-- dans l'admin sous leur nœud et leur point ; aucun modèle existant n'est touché. Personne ne perd
-- rien.
--
-- Rollback (aucune donnée d'élève). Il retire les 9 tags posés et rend les 9 sans nœud. Garde : il
-- refuse si un des 9 tags manque. Bloc éprouvé par le test d'intégration, à jouer dans UNE
-- transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q1t3_retour;
-- create temporary table _q1t3_retour (id uuid primary key, code text not null);
-- insert into _q1t3_retour values
-- 	('06bee149-e006-4b9f-8f0b-1e21ace0a1cf', '1TECHNO-128'),
-- 	('5643abd0-1454-4b03-b612-3fd3b1a1ca33', '1TECHNO-069'),
-- 	('382171b6-f5b5-490d-97c1-e0e9db592ac4', '1TECHNO-071'),
-- 	('9b89e676-8833-4b2e-aa44-ef34c8655785', '1TECHNO-072'),
-- 	('531a7080-9b20-46be-a614-7104d5401451', '1TECHNO-074'),
-- 	('8efb084c-aefe-41f2-a8b5-50167d6f7257', '1TECHNO-130'),
-- 	('77a599ef-2cee-4ac2-b1cc-f0036d56b9d7', '1TECHNO-131'),
-- 	('14b60caa-e18e-46d8-9ff6-3889fd9de40e', '1TECHNO-081'),
-- 	('936b7e76-74eb-4c82-a3b8-bdccb3682cfc', '1TECHNO-056');
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _q1t3_retour order by id;
-- select 1 from public.question_templates where id in (select id from _q1t3_retour) order by id for update;
-- do $rollback$
-- declare v_presents integer; v_tags integer;
-- begin
-- 	select count(*) into v_presents
-- 	  from _q1t3_retour r join public.question_templates q on q.id = r.id;
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 9 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 9', v_presents;
-- 	end if;
-- 	select count(*) into v_tags
-- 	  from _q1t3_retour r
-- 	  join public.curriculum_points p on p.code = r.code
-- 	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
-- 	if v_tags <> 9 then
-- 		raise exception 'rollback : tags changés depuis la migration : % sur 9 présents', v_tags;
-- 	end if;
-- 	delete from public.question_template_points t
-- 	 using _q1t3_retour r, public.curriculum_points p
-- 	 where p.code = r.code and t.template_id = r.id and t.point_id = p.id;
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates q set classification_node_id = null
-- 	  from _q1t3_retour r where q.id = r.id;
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- end $rollback$;
-- drop table _q1t3_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q1t3_modeles;
create temporary table _q1t3_modeles (
	id uuid primary key,
	code text not null,
	point_id uuid,
	noeud uuid
);
insert into _q1t3_modeles (id, code) values
	('06bee149-e006-4b9f-8f0b-1e21ace0a1cf', '1TECHNO-128'),
	('5643abd0-1454-4b03-b612-3fd3b1a1ca33', '1TECHNO-069'),
	('382171b6-f5b5-490d-97c1-e0e9db592ac4', '1TECHNO-071'),
	('9b89e676-8833-4b2e-aa44-ef34c8655785', '1TECHNO-072'),
	('531a7080-9b20-46be-a614-7104d5401451', '1TECHNO-074'),
	('8efb084c-aefe-41f2-a8b5-50167d6f7257', '1TECHNO-130'),
	('77a599ef-2cee-4ac2-b1cc-f0036d56b9d7', '1TECHNO-131'),
	('14b60caa-e18e-46d8-9ff6-3889fd9de40e', '1TECHNO-081'),
	('936b7e76-74eb-4c82-a3b8-bdccb3682cfc', '1TECHNO-056');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q1t3_modeles order by id;
select 1 from public.question_templates where id in (select id from _q1t3_modeles) order by id for update;

-- ---- 2. Points et nœuds, résolus par le code -----------------------------------------
update _q1t3_modeles r set point_id = p.id, noeud = p.node_id
  from public.curriculum_points p
 where p.grade = '1_TECHNO' and p.code = r.code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _q1t3_modeles where point_id is null or noeud is null) then
		raise exception 'points 1TECHNO introuvables : % sur 9',
			(select count(*) from _q1t3_modeles where point_id is null or noeud is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, état du relevé -------------------------------
do $garde$
declare v_presents integer; v_conformes integer;
begin
	select count(*) into v_presents from _q1t3_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 9 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 9', v_presents;
	end if;
	select count(*) into v_conformes
	  from _q1t3_modeles r join public.question_templates q on q.id = r.id
	 where q.classification_node_id is null and '1_TECHNO' = any(q.grades)
	   and not exists (select 1 from public.question_template_points t where t.template_id = r.id);
	if v_conformes <> 9 then
		raise exception 'brouillons différents du relevé (nœud, tag ou niveau) : % sur 9 conformes', v_conformes;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
-- (en base locale, aucun modèle : les jointures ne rendent rien et rien n'est écrit)
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q1t3_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q1t3_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérification : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_tags integer;
begin
	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
	  into v_presents, v_noeuds
	  from _q1t3_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	select count(*) into v_tags
	  from _q1t3_modeles r
	  join public.question_template_points t on t.template_id = r.id and t.point_id = r.point_id;
	if v_noeuds <> 9 or v_tags <> 9 then
		raise exception 'lot incohérent : nœuds %/9, tags %/9', v_noeuds, v_tags;
	end if;
end $check$;

drop table _q1t3_modeles;
