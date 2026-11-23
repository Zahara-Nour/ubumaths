-- ============================================================================
-- 1re techno, lot 5 « graphiques » : nœud et tags de 3 brouillons neufs
-- ============================================================================
--   3 brouillons neufs (créés par scripts/create-questions.ts, sans nœud ni tag) sont rangés sur le
--   nœud de leur point 1TECHNO et tagués :
--     d0eb1666 N1 « Résoudre graphiquement une équation f(x) = k »                  → 1TECHNO-059
--     fc84a1c8 N2 « Représenter une liste de termes d'une suite en Python »         → 1TECHNO-121
--     8d2047fe N3 « Représenter les fréquences des 1 dans N échantillons »          → 1TECHNO-104
--   Leurs niveaux ({1_TECHNO}, écrits à la création), leur statut (brouillon) et `updated_at` ne
--   changent pas.
-- ============================================================================
-- Chantier `questions-1techno` (journal docs/wip/questions-1techno-progress.md, § 28 et 29). Phase 0
-- validée par David le 2026-11-18 ; rendus validés par David le 2026-11-18 ; brouillons créés en
-- prod par David le 2026-11-18 (fichiers scripts/questions/1techno-5/).
--
-- Relevé de la prod du 2026-11-18 (MCP) : les 3 en brouillon, {1_TECHNO}, sans nœud ni tag. Les 3
-- points visés ont 0 modèle.
--
-- Chaque modèle porte UN point 1TECHNO (ADR 0020) ; le trigger des tags vérifie que le point est sur
-- le nœud du modèle ou sur sa notion. Le nœud est LU sur le point (`node_id`).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (3 modèles). Elle est prouvée par
-- tests/integration/questions-1techno-lot5-rangement-tags.test.ts, qui fabrique des copies portant
-- les vrais identifiants dans l'état relevé, puis rejoue CE fichier.
--
-- Gardes : les 3 encore SANS nœud et SANS tag, en brouillon, avec les niveaux du relevé. Sinon le
-- lot a bougé depuis le relevé : rien n'est écrit.
--
-- Données d'élèves : aucune n'est modifiée (cartes, tentatives, devoirs non touchés).
--
-- Accès : aucune règle (policy) ne change. Question d'accès de la phase 0 (§ 28, validée par David
-- le 2026-11-18 AVANT le SQL) : personne ne gagne d'accès. Les 3 restent des brouillons, visibles
-- dans l'admin sous leur nœud et leur point ; aucun modèle existant n'est touché. Personne ne
-- perd rien.
--
-- Rollback (aucune donnée d'élève). Il retire les 3 tags posés et rend les 3 sans nœud. Garde : il
-- refuse si un des 3 tags manque. Bloc éprouvé par le test d'intégration, à jouer dans UNE
-- transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q1t5_retour;
-- create temporary table _q1t5_retour (id uuid not null, code text not null);
-- insert into _q1t5_retour values
-- 	('d0eb1666-9852-4bc5-8f7f-a0b4db23dcc3', '1TECHNO-059'),
-- 	('fc84a1c8-f0fd-45c5-bf58-40009ac00efa', '1TECHNO-121'),
-- 	('8d2047fe-91f1-47fa-888e-aeb296f2434b', '1TECHNO-104');
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from (select distinct id from _q1t5_retour) m order by id;
-- select 1 from public.question_templates where id in (select id from _q1t5_retour) order by id for update;
-- do $rollback$
-- declare v_presents integer; v_tags integer;
-- begin
-- 	select count(*) into v_presents
-- 	  from public.question_templates q where q.id in (select id from _q1t5_retour);
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 3 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 3', v_presents;
-- 	end if;
-- 	select count(*) into v_tags
-- 	  from _q1t5_retour r
-- 	  join public.curriculum_points p on p.code = r.code and p.archived_at is null
-- 	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
-- 	if v_tags <> 3 then
-- 		raise exception 'rollback : tags changés depuis la migration : % sur 3 présents', v_tags;
-- 	end if;
-- 	delete from public.question_template_points t
-- 	 using _q1t5_retour r, public.curriculum_points p
-- 	 where p.code = r.code and p.archived_at is null and t.template_id = r.id and t.point_id = p.id;
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates q set classification_node_id = null
-- 	 where q.id in (select id from _q1t5_retour);
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- end $rollback$;
-- drop table _q1t5_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
-- `code_spe` : nul pour les 3 (colonne gardée du gabarit du lot 4). `grades` : les niveaux du relevé.
drop table if exists pg_temp._q1t5_modeles;
create temporary table _q1t5_modeles (
	id uuid primary key,
	code_techno text not null,
	code_spe text,
	grades text[] not null,
	point_techno uuid,
	point_spe uuid,
	noeud uuid
);
insert into _q1t5_modeles (id, code_techno, code_spe, grades) values
	('d0eb1666-9852-4bc5-8f7f-a0b4db23dcc3', '1TECHNO-059', null, '{1_TECHNO}'),
	('fc84a1c8-f0fd-45c5-bf58-40009ac00efa', '1TECHNO-121', null, '{1_TECHNO}'),
	('8d2047fe-91f1-47fa-888e-aeb296f2434b', '1TECHNO-104', null, '{1_TECHNO}');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q1t5_modeles order by id;
select 1 from public.question_templates where id in (select id from _q1t5_modeles) order by id for update;

-- ---- 2. Points et nœuds, résolus par le code -----------------------------------------
update _q1t5_modeles r set point_techno = p.id, noeud = p.node_id
  from public.curriculum_points p
 where p.grade = '1_TECHNO' and p.code = r.code_techno and p.archived_at is null;
update _q1t5_modeles r set point_spe = p.id
  from public.curriculum_points p
 where p.grade = '1_SPE' and p.code = r.code_spe and p.archived_at is null
   and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q1t5_modeles
	            where point_techno is null or noeud is null
	               or (code_spe is not null and point_spe is null)) then
		raise exception 'points introuvables ou point 1SPE hors du nœud du point 1TECHNO : % modèle(s) sur 3',
			(select count(*) from _q1t5_modeles
			  where point_techno is null or noeud is null or (code_spe is not null and point_spe is null));
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, état du relevé -------------------------------
do $garde$
declare v_presents integer; v_conformes integer;
begin
	select count(*) into v_presents from _q1t5_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 3 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 3', v_presents;
	end if;
	select count(*) into v_conformes
	  from _q1t5_modeles r join public.question_templates q on q.id = r.id
	 where q.classification_node_id is null and q.grades = r.grades and q.status = 'draft'
	   and not exists (select 1 from public.question_template_points t where t.template_id = r.id);
	if v_conformes <> 3 then
		raise exception 'brouillons différents du relevé (nœud, tag, niveau ou statut) : % sur 3 conformes', v_conformes;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
-- (en base locale, aucun modèle : les jointures ne rendent rien et rien n'est écrit)
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q1t5_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_techno
  from _q1t5_modeles r join public.question_templates q on q.id = r.id
union all
select r.id, r.point_spe
  from _q1t5_modeles r join public.question_templates q on q.id = r.id
 where r.point_spe is not null;

-- ---- 5. Vérification : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_tags integer;
begin
	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
	  into v_presents, v_noeuds
	  from _q1t5_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	select count(*) into v_tags
	  from _q1t5_modeles r
	  join public.question_template_points t
	    on t.template_id = r.id and (t.point_id = r.point_techno or t.point_id = r.point_spe);
	if v_noeuds <> 3 or v_tags <> 3 then
		raise exception 'lot incohérent : nœuds %/3, tags %/3', v_noeuds, v_tags;
	end if;
end $check$;

drop table _q1t5_modeles;
