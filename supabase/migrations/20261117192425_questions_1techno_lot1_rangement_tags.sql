-- ============================================================================
-- 1re techno, lot 1 « connaissances des suites » : nœud et tag de 2 brouillons neufs, tag 1TECHNO
-- d'un modèle commun avec la 1re générale
-- ============================================================================
--   A. 2 brouillons neufs (créés par scripts/create-questions.ts, sans nœud ni tag) sont rangés sur
--      le nœud de leur point et tagués :
--        0e64a8b0 M1 « Cours : sens de variation d'une suite arithmétique » → 1TECHNO-039,
--                 sur « Suites > Suites arithmétiques »
--        28d1c03e M2 « Cours : sens de variation d'une suite géométrique » → 1TECHNO-040,
--                 sur « Suites > Suites géométriques »
--      Leurs niveaux ({1_TECHNO}, écrits à la création) et leur statut (brouillon) ne changent pas.
--   B. 817d257f R1 « Associer un nuage de points à une suite arithmétique » (questions-1gen, publié,
--      rangé sur « Suites > Généralités sur les suites > représentation graphique », tag 1GEN-016)
--      reçoit 1TECHNO-041 (même nœud) et le niveau `1_TECHNO` (ajouté, jamais affecté en bloc).
--      Ni son contenu, ni son nœud, ni son tag 1GEN, ni son statut ne changent.
--   `updated_at` est PRÉSERVÉ pour les 3.
-- ============================================================================
-- Chantier `questions-1techno` (journal docs/wip/questions-1techno-progress.md, § 23). Phase 0
-- validée par David le 2026-11-17 ; brouillons créés en prod par David le 2026-11-17 (fichiers
-- scripts/questions/1techno-1/) ; les 3 modèles relus par David sur la page à cocher du lot 1
-- (3 « OK » sur 3 le 2026-11-17). Instantanés : scripts/questions/1techno-1-tags/. questions-1gen
-- prévenu et d'accord pour R1 (aucune modification en cours chez lui).
--
-- Relevé de la prod du 2026-11-17 (MCP) : M1, M2 en brouillon, {1_TECHNO}, sans nœud ni tag ;
-- 817d257f publié, {1_GEN}, seul tag 1GEN-016, sur le nœud qui porte aussi 1TECHNO-041.
--
-- Chaque modèle porte UN point 1TECHNO (ADR 0020) ; le trigger des tags vérifie que le point est
-- sur le nœud du modèle ou sur sa notion. Le nœud de M1 et M2 est LU sur leur point (`node_id`).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (3 modèles). Elle est prouvée par
-- tests/integration/questions-1techno-lot1-rangement-tags.test.ts, qui fabrique des copies portant
-- les vrais identifiants dans l'état relevé, puis rejoue CE fichier.
--
-- Gardes : M1 et M2 encore SANS nœud et SANS tag, avec `1_TECHNO` ; 817d257f SANS `1_TECHNO`, sans
-- point 1TECHNO, sur le nœud du point 041. Sinon le lot a bougé depuis le relevé : rien n'est écrit.
--
-- Données d'élèves : aucune n'est modifiée (cartes, tentatives, devoirs non touchés).
--
-- Accès : aucune règle (policy) ne change. Question d'accès de la phase 0 (§ 23, validée par David
-- le 2026-11-17 AVANT le SQL) : personne ne gagne d'accès. M1 et M2 restent des brouillons, visibles
-- dans l'admin sous leur nœud et leur point ; 817d257f, déjà publié pour tous, apparaît en plus dans
-- le catalogue et le cahier de texte de 1re technologique. Personne ne perd rien.
--
-- Après ce tag, le rollback de 20261117174437 (questions-1gen, lot 2) ne doit plus être joué : il
-- retire le nœud de 817d257f, que le tag 1TECHNO-041 exige (convenu avec questions-1gen).
--
-- Rollback (aucune donnée d'élève). Il retire les 3 tags 1TECHNO posés, rend M1 et M2 sans nœud, et
-- retire `1_TECHNO` des niveaux de 817d257f (son tag 1GEN et ses autres niveaux restent). Garde :
-- il refuse si un des 3 tags manque ou si 817d257f n'a plus `1_TECHNO`.
-- Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q1t1_retour;
-- create temporary table _q1t1_retour (id uuid primary key, code text not null, a_ranger boolean not null);
-- insert into _q1t1_retour values
-- 	('0e64a8b0-92c1-4c74-be3f-5894d7b7eba6', '1TECHNO-039', true),
-- 	('28d1c03e-add8-46d1-affe-87ae04598041', '1TECHNO-040', true),
-- 	('817d257f-dcc6-4c31-92ca-57b0d20665da', '1TECHNO-041', false);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _q1t1_retour order by id;
-- select 1 from public.question_templates where id in (select id from _q1t1_retour) order by id for update;
-- do $rollback$
-- declare v_presents integer; v_conformes integer; v_tags integer;
-- begin
-- 	select count(*), count(*) filter (where r.a_ranger or '1_TECHNO' = any(q.grades))
-- 	  into v_presents, v_conformes
-- 	  from _q1t1_retour r join public.question_templates q on q.id = r.id;
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 3 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 3', v_presents;
-- 	end if;
-- 	if v_conformes <> 3 then
-- 		raise exception 'rollback : 1_TECHNO retiré de 817d257f depuis la migration';
-- 	end if;
-- 	select count(*) into v_tags
-- 	  from _q1t1_retour r
-- 	  join public.curriculum_points p on p.code = r.code
-- 	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
-- 	if v_tags <> 3 then
-- 		raise exception 'rollback : tags changés depuis la migration : % sur 3 présents', v_tags;
-- 	end if;
-- 	delete from public.question_template_points t
-- 	 using _q1t1_retour r, public.curriculum_points p
-- 	 where p.code = r.code and t.template_id = r.id and t.point_id = p.id;
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates q set classification_node_id = null
-- 	  from _q1t1_retour r where q.id = r.id and r.a_ranger;
-- 	update public.question_templates q set grades = array_remove(q.grades, '1_TECHNO')
-- 	  from _q1t1_retour r where q.id = r.id and not r.a_ranger;
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- end $rollback$;
-- drop table _q1t1_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
-- `a_ranger` : vrai pour un brouillon neuf à ranger (A), faux pour le modèle commun (B).
drop table if exists pg_temp._q1t1_modeles;
create temporary table _q1t1_modeles (
	id uuid primary key,
	code text not null,
	a_ranger boolean not null,
	point_id uuid,
	noeud uuid
);
insert into _q1t1_modeles (id, code, a_ranger) values
	('0e64a8b0-92c1-4c74-be3f-5894d7b7eba6', '1TECHNO-039', true),
	('28d1c03e-add8-46d1-affe-87ae04598041', '1TECHNO-040', true),
	('817d257f-dcc6-4c31-92ca-57b0d20665da', '1TECHNO-041', false);

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q1t1_modeles order by id;
select 1 from public.question_templates where id in (select id from _q1t1_modeles) order by id for update;

-- ---- 2. Points et nœuds, résolus par le code -----------------------------------------
update _q1t1_modeles r set point_id = p.id, noeud = p.node_id
  from public.curriculum_points p
 where p.grade = '1_TECHNO' and p.code = r.code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _q1t1_modeles where point_id is null or noeud is null) then
		raise exception 'points 1TECHNO introuvables : % sur 3',
			(select count(*) from _q1t1_modeles where point_id is null or noeud is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, état du relevé -------------------------------
do $garde$
declare v_presents integer; v_a integer; v_b integer; v_deja text;
begin
	select count(*) into v_presents from _q1t1_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 3 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 3', v_presents;
	end if;
	-- A : brouillons neufs, encore sans nœud ni tag, avec 1_TECHNO
	select count(*) into v_a
	  from _q1t1_modeles r join public.question_templates q on q.id = r.id
	 where r.a_ranger and q.classification_node_id is null and '1_TECHNO' = any(q.grades)
	   and not exists (select 1 from public.question_template_points t where t.template_id = r.id);
	if v_a <> 2 then
		raise exception 'brouillons M1, M2 différents du relevé (nœud, tag ou niveau) : % sur 2 conformes', v_a;
	end if;
	-- B : modèle commun sans 1_TECHNO, sur le nœud du point visé
	select count(*) into v_b
	  from _q1t1_modeles r join public.question_templates q on q.id = r.id
	 where not r.a_ranger and not ('1_TECHNO' = any(q.grades)) and q.classification_node_id = r.noeud;
	if v_b <> 1 then
		raise exception '817d257f différent du relevé (niveau 1_TECHNO ou nœud)';
	end if;
	select string_agg(left(r.id::text, 8) || ' (' || p.code || ')', ', ') into v_deja
	  from _q1t1_modeles r
	  join public.question_template_points t on t.template_id = r.id
	  join public.curriculum_points p on p.id = t.point_id
	 where p.grade = '1_TECHNO';
	if v_deja is not null then
		raise exception 'modèle(s) déjà tagué(s) d''un point 1TECHNO : %', v_deja;
	end if;
end $garde$;

-- ---- 4. Rangement (A), niveau (B), puis tags -----------------------------------------
-- (en base locale, aucun modèle : les jointures ne rendent rien et rien n'est écrit)
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q1t1_modeles r
 where q.id = r.id and r.a_ranger;
update public.question_templates q set grades = array_append(q.grades, '1_TECHNO')
  from _q1t1_modeles r
 where q.id = r.id and not r.a_ranger;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q1t1_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérification : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_niveaux integer; v_tags integer;
begin
	select count(*),
	       count(*) filter (where q.classification_node_id = r.noeud),
	       count(*) filter (where '1_TECHNO' = any(q.grades))
	  into v_presents, v_noeuds, v_niveaux
	  from _q1t1_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	select count(*) into v_tags
	  from _q1t1_modeles r
	  join public.question_template_points t on t.template_id = r.id and t.point_id = r.point_id;
	if v_noeuds <> 3 or v_niveaux <> 3 or v_tags <> 3 then
		raise exception 'lot incohérent : nœuds %/3, niveaux 1_TECHNO %/3, tags %/3', v_noeuds, v_niveaux, v_tags;
	end if;
end $check$;

drop table _q1t1_modeles;
