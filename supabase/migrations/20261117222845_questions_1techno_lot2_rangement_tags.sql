-- ============================================================================
-- 1re techno, lot 2 « second degré sans formule » : nœud et tags de 8 brouillons neufs, retrait
-- de 1acb6d47 du catalogue de 1re technologique
-- ============================================================================
--   A. 8 brouillons neufs (créés par scripts/create-questions.ts, sans nœud ni tag) sont rangés sur
--      le nœud de leur point 1TECHNO et tagués :
--        129067e4 M1 allure                 → 1TECHNO-057 + 1GEN-022  (« parabole »)
--        7efa9e79 M2 associer               → 1TECHNO-061 + 1GEN-024  (« parabole »)
--        f81b8735 M3 axe                    → 1TECHNO-123 + 1GEN-052  (« parabole »)
--        493adeb4 M4 sommet                 → 1TECHNO-124 + 1GEN-053  (« parabole »)
--        f95f05a0 M5 f(x) = c               → 1TECHNO-062 + 1GEN-025  (« parabole »)
--        e539088a M6 tableau de variation   → 1TECHNO-125 + 1GEN-054  (« parabole »)
--        82e40d16 M7 signe                  → 1TECHNO-126 + 1GEN-027  (« signe »)
--        9adefa88 M8 factoriser             → 1TECHNO-064              (« formes »)
--      M1 à M7 sont communs {1_GEN,1_TECHNO} (un point par programme, ADR 0020) ; M8 est {1_TECHNO}.
--      Leurs niveaux (écrits à la création) et leur statut (brouillon) ne changent pas.
--   B. 1acb6d47 « Déterminer la nature de l'extremum » (modèle de 1re spé, publié, {1_SPE,1_TECHNO},
--      tags 1SPE-402 + 1TECHNO-057) quitte le catalogue de 1re techno : son tag 1TECHNO-057 est
--      retiré et `1_TECHNO` ôté de ses niveaux. M1 le remplace sur 1TECHNO-057. Ni son contenu, ni
--      son nœud, ni son tag 1SPE, ni son statut ne changent.
--   `updated_at` est PRÉSERVÉ pour les 9.
-- ============================================================================
-- Chantier `questions-1techno` (journal docs/wip/questions-1techno-progress.md, § 24). Phase 0
-- validée par David le 2026-11-17 (Q1 modèles communs + deux tags ; 1acb6d47 quitte la 1re techno) ;
-- brouillons créés en prod par David le 2026-11-17 (fichiers scripts/questions/1techno-2/).
-- questions-1gen prévenu et d'accord (message du 2026-11-17) : il a retiré son lot 5, n'a aucune
-- modification en cours sur les 7 points 1GEN, et laisse poser les deux tags ici.
--
-- Relevé de la prod du 2026-11-17 (MCP) : les 8 en brouillon, sans nœud ni tag, M1–M7
-- {1_GEN,1_TECHNO}, M8 {1_TECHNO} ; 1acb6d47 publié, {1_SPE,1_TECHNO}, tags 1SPE-402 + 1TECHNO-057.
-- Chaque point 1GEN est sur le même nœud que le point 1TECHNO de son modèle. Données d'élèves
-- liées à 1acb6d47 ou au point 1TECHNO-057 : aucune (cartes, tentatives, évaluations, cahier de
-- texte, état des points : 0 ligne).
--
-- Le trigger des tags vérifie que le point est sur le nœud du modèle ou sur sa notion. Le nœud
-- de chaque modèle est LU sur son point 1TECHNO (`node_id`).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (9 modèles). Elle est prouvée par
-- tests/integration/questions-1techno-lot2-rangement-tags.test.ts, qui fabrique des copies portant
-- les vrais identifiants dans l'état relevé, puis rejoue CE fichier.
--
-- Gardes : les 8 brouillons encore SANS nœud et SANS tag, avec leurs niveaux du relevé ; 1acb6d47
-- avec `1_TECHNO` et le tag 1TECHNO-057, sans autre point 1TECHNO. Sinon le lot a bougé depuis le
-- relevé : rien n'est écrit.
--
-- Données d'élèves : aucune n'est modifiée (cartes, tentatives, devoirs non touchés).
--
-- Accès : aucune règle (policy) ne change. Question d'accès de la phase 0 (§ 24, validée par David
-- le 2026-11-17 AVANT le SQL) : personne ne gagne d'accès. Les 8 restent des brouillons, visibles
-- dans l'admin sous leur nœud et leurs points. Miroir : 1acb6d47 n'apparaît plus dans le catalogue
-- ni le cahier de texte de 1re technologique ; il reste publié pour la 1re spé (aucun élève de 1re
-- techno ne l'a travaillé).
--
-- Partie destructive : une seule ligne de tag supprimée (1acb6d47 ↔ 1TECHNO-057) et une valeur
-- retirée d'un tableau de niveaux ; le rollback ci-dessous les rend telles quelles.
--
-- Rollback (aucune donnée d'élève). Il retire les 15 tags posés, rend les 8 brouillons sans nœud,
-- et rend à 1acb6d47 le niveau `1_TECHNO` et le tag 1TECHNO-057. Garde : il refuse si un des 15
-- tags manque, ou si 1acb6d47 a repris `1_TECHNO` ou un point 1TECHNO depuis.
-- Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q1t2_retour;
-- create temporary table _q1t2_retour (id uuid not null, code text not null);
-- insert into _q1t2_retour values
-- 	('129067e4-e97c-458c-9bd7-540383a5dac6', '1TECHNO-057'), ('129067e4-e97c-458c-9bd7-540383a5dac6', '1GEN-022'),
-- 	('7efa9e79-e985-407d-bdec-73dce30ef283', '1TECHNO-061'), ('7efa9e79-e985-407d-bdec-73dce30ef283', '1GEN-024'),
-- 	('f81b8735-9b8f-41aa-ada0-08b7415a6076', '1TECHNO-123'), ('f81b8735-9b8f-41aa-ada0-08b7415a6076', '1GEN-052'),
-- 	('493adeb4-7eb9-4156-bd1b-79996f54c5e4', '1TECHNO-124'), ('493adeb4-7eb9-4156-bd1b-79996f54c5e4', '1GEN-053'),
-- 	('f95f05a0-4c66-409f-9ea3-0f9fcdd98759', '1TECHNO-062'), ('f95f05a0-4c66-409f-9ea3-0f9fcdd98759', '1GEN-025'),
-- 	('e539088a-1eee-4259-8e61-b0f6fa514eaf', '1TECHNO-125'), ('e539088a-1eee-4259-8e61-b0f6fa514eaf', '1GEN-054'),
-- 	('82e40d16-6069-4bea-b7e6-df3344d26bd3', '1TECHNO-126'), ('82e40d16-6069-4bea-b7e6-df3344d26bd3', '1GEN-027'),
-- 	('9adefa88-5d73-4fea-b64e-538323a3f45f', '1TECHNO-064');
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from (select distinct id from _q1t2_retour
--         union select '1acb6d47-5d88-4ccf-830f-98dc57d0022c'::uuid) m order by id;
-- select 1 from public.question_templates
--  where id in (select id from _q1t2_retour) or id = '1acb6d47-5d88-4ccf-830f-98dc57d0022c'
--  order by id for update;
-- do $rollback$
-- declare v_presents integer; v_tags integer; v_retire integer;
-- begin
-- 	select count(*) into v_presents from public.question_templates
-- 	 where id in (select id from _q1t2_retour) or id = '1acb6d47-5d88-4ccf-830f-98dc57d0022c';
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 9 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 9', v_presents;
-- 	end if;
-- 	select count(*) into v_tags
-- 	  from _q1t2_retour r
-- 	  join public.curriculum_points p on p.code = r.code and p.archived_at is null
-- 	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
-- 	if v_tags <> 15 then
-- 		raise exception 'rollback : tags changés depuis la migration : % sur 15 présents', v_tags;
-- 	end if;
-- 	select count(*) into v_retire from public.question_templates q
-- 	 where q.id = '1acb6d47-5d88-4ccf-830f-98dc57d0022c' and not ('1_TECHNO' = any(q.grades))
-- 	   and not exists (select 1 from public.question_template_points t
-- 	                     join public.curriculum_points p on p.id = t.point_id
-- 	                    where t.template_id = q.id and p.grade = '1_TECHNO');
-- 	if v_retire <> 1 then
-- 		raise exception 'rollback : 1acb6d47 a repris 1_TECHNO ou un point 1TECHNO depuis la migration';
-- 	end if;
-- 	delete from public.question_template_points t
-- 	 using _q1t2_retour r, public.curriculum_points p
-- 	 where p.code = r.code and p.archived_at is null and t.template_id = r.id and t.point_id = p.id;
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates set classification_node_id = null
-- 	 where id in (select id from _q1t2_retour);
-- 	update public.question_templates set grades = array_append(grades, '1_TECHNO')
-- 	 where id = '1acb6d47-5d88-4ccf-830f-98dc57d0022c';
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- 	insert into public.question_template_points (template_id, point_id)
-- 	select '1acb6d47-5d88-4ccf-830f-98dc57d0022c', p.id
-- 	  from public.curriculum_points p where p.code = '1TECHNO-057' and p.archived_at is null;
-- end $rollback$;
-- drop table _q1t2_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
-- `code_gen` : nul pour M8 (techno seule). `grades` : les niveaux du relevé.
drop table if exists pg_temp._q1t2_modeles;
create temporary table _q1t2_modeles (
	id uuid primary key,
	code_techno text not null,
	code_gen text,
	grades text[] not null,
	point_techno uuid,
	point_gen uuid,
	noeud uuid
);
insert into _q1t2_modeles (id, code_techno, code_gen, grades) values
	('129067e4-e97c-458c-9bd7-540383a5dac6', '1TECHNO-057', '1GEN-022', '{1_GEN,1_TECHNO}'),
	('7efa9e79-e985-407d-bdec-73dce30ef283', '1TECHNO-061', '1GEN-024', '{1_GEN,1_TECHNO}'),
	('f81b8735-9b8f-41aa-ada0-08b7415a6076', '1TECHNO-123', '1GEN-052', '{1_GEN,1_TECHNO}'),
	('493adeb4-7eb9-4156-bd1b-79996f54c5e4', '1TECHNO-124', '1GEN-053', '{1_GEN,1_TECHNO}'),
	('f95f05a0-4c66-409f-9ea3-0f9fcdd98759', '1TECHNO-062', '1GEN-025', '{1_GEN,1_TECHNO}'),
	('e539088a-1eee-4259-8e61-b0f6fa514eaf', '1TECHNO-125', '1GEN-054', '{1_GEN,1_TECHNO}'),
	('82e40d16-6069-4bea-b7e6-df3344d26bd3', '1TECHNO-126', '1GEN-027', '{1_GEN,1_TECHNO}'),
	('9adefa88-5d73-4fea-b64e-538323a3f45f', '1TECHNO-064', null, '{1_TECHNO}');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from (select id from _q1t2_modeles
        union select '1acb6d47-5d88-4ccf-830f-98dc57d0022c'::uuid) m order by id;
select 1 from public.question_templates
 where id in (select id from _q1t2_modeles) or id = '1acb6d47-5d88-4ccf-830f-98dc57d0022c'
 order by id for update;

-- ---- 2. Points et nœuds, résolus par le code -----------------------------------------
update _q1t2_modeles r set point_techno = p.id, noeud = p.node_id
  from public.curriculum_points p
 where p.grade = '1_TECHNO' and p.code = r.code_techno and p.archived_at is null;
update _q1t2_modeles r set point_gen = p.id
  from public.curriculum_points p
 where p.grade = '1_GEN' and p.code = r.code_gen and p.archived_at is null
   and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q1t2_modeles
	            where point_techno is null or noeud is null
	               or (code_gen is not null and point_gen is null)) then
		raise exception 'points introuvables ou point 1GEN hors du nœud du point 1TECHNO : % modèle(s) sur 8',
			(select count(*) from _q1t2_modeles
			  where point_techno is null or noeud is null or (code_gen is not null and point_gen is null));
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, état du relevé -------------------------------
do $garde$
declare v_presents integer; v_a integer; v_b integer;
begin
	select count(*) into v_presents from public.question_templates
	 where id in (select id from _q1t2_modeles) or id = '1acb6d47-5d88-4ccf-830f-98dc57d0022c';
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 9 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 9', v_presents;
	end if;
	-- A : brouillons neufs, encore sans nœud ni tag, niveaux du relevé
	select count(*) into v_a
	  from _q1t2_modeles r join public.question_templates q on q.id = r.id
	 where q.classification_node_id is null and q.grades = r.grades and q.status = 'draft'
	   and not exists (select 1 from public.question_template_points t where t.template_id = r.id);
	if v_a <> 8 then
		raise exception 'brouillons M1–M8 différents du relevé (nœud, tag, niveau ou statut) : % sur 8 conformes', v_a;
	end if;
	-- B : 1acb6d47 avec 1_TECHNO et, pour seul point 1TECHNO, 1TECHNO-057
	select count(*) into v_b
	  from public.question_templates q
	 where q.id = '1acb6d47-5d88-4ccf-830f-98dc57d0022c' and '1_TECHNO' = any(q.grades)
	   and (select array_agg(p.code order by p.code)
	          from public.question_template_points t
	          join public.curriculum_points p on p.id = t.point_id
	         where t.template_id = q.id and p.grade = '1_TECHNO') = '{1TECHNO-057}';
	if v_b <> 1 then
		raise exception '1acb6d47 différent du relevé (niveau 1_TECHNO ou tag 1TECHNO-057)';
	end if;
end $garde$;

-- ---- 4. Retrait (B), rangement (A), puis tags ----------------------------------------
-- (en base locale, aucun modèle : les jointures ne rendent rien et rien n'est écrit)
delete from public.question_template_points t
 using public.curriculum_points p
 where t.template_id = '1acb6d47-5d88-4ccf-830f-98dc57d0022c'
   and p.id = t.point_id and p.code = '1TECHNO-057';

alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set grades = array_remove(q.grades, '1_TECHNO')
 where q.id = '1acb6d47-5d88-4ccf-830f-98dc57d0022c';
update public.question_templates q set classification_node_id = r.noeud
  from _q1t2_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_techno
  from _q1t2_modeles r join public.question_templates q on q.id = r.id
union all
select r.id, r.point_gen
  from _q1t2_modeles r join public.question_templates q on q.id = r.id
 where r.point_gen is not null;

-- ---- 5. Vérification : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_tags integer; v_retire integer;
begin
	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
	  into v_presents, v_noeuds
	  from _q1t2_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	select count(*) into v_tags
	  from _q1t2_modeles r
	  join public.question_template_points t
	    on t.template_id = r.id and (t.point_id = r.point_techno or t.point_id = r.point_gen);
	select count(*) into v_retire from public.question_templates q
	 where q.id = '1acb6d47-5d88-4ccf-830f-98dc57d0022c' and not ('1_TECHNO' = any(q.grades))
	   and not exists (select 1 from public.question_template_points t
	                     join public.curriculum_points p on p.id = t.point_id
	                    where t.template_id = q.id and p.grade = '1_TECHNO');
	if v_noeuds <> 8 or v_tags <> 15 or v_retire <> 1 then
		raise exception 'lot incohérent : nœuds %/8, tags %/15, 1acb6d47 retiré %/1', v_noeuds, v_tags, v_retire;
	end if;
end $check$;

drop table _q1t2_modeles;
