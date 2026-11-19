-- ============================================================================
-- 1re techno, lot 6 « probabilités » : nœud et tags de 5 brouillons neufs, retrait de 97b3a376
-- du catalogue de 1re technologique
-- ============================================================================
--   A. 5 brouillons neufs (créés par scripts/create-questions.ts, sans nœud ni tag, {1_TECHNO})
--      sont rangés sur le nœud de leur point 1TECHNO et tagués :
--        699b1aae P1 probabilités totales      → 1TECHNO-090  (« probabilités totales »)
--        ef34cc66 P2 loi de Bernoulli          → 1TECHNO-097  (« schéma de Bernoulli »)
--        4ccf75c2 P3 espérance de Bernoulli    → 1TECHNO-136  (« schéma de Bernoulli »)
--        b342c534 P4 P(X = a), P(X ⩽ a)        → 1TECHNO-137  (« loi d'une variable aléatoire »)
--        2405ca31 P5 tableau croisé            → 1TECHNO-013  (« tableau croisé d'effectifs »)
--      Leurs niveaux (écrits à la création) et leur statut (brouillon) ne changent pas.
--   B. 97b3a376 (modèle de 1re spé, publié, {1_SPE,1_TECHNO}, tags 1SPE-353 + 1TECHNO-137)
--      quitte le catalogue de 1re techno : son tag 1TECHNO-137 est retiré et `1_TECHNO` ôté de ses
--      niveaux. P4 le remplace sur 1TECHNO-137 (ses variations 3 et 4 tirent P(a ⩽ X ⩽ b), hors du
--      point, décision l1t-6). Ni son contenu, ni son nœud, ni son tag 1SPE, ni son statut ne changent.
--   `updated_at` est PRÉSERVÉ pour les 6.
-- ============================================================================
-- Chantier `questions-1techno` (journal docs/wip/questions-1techno-progress.md, § 30-31). Phase 0
-- validée par David le 2026-11-18 (« je suis tes recos » : P1-P5, 97b3a376 quitte la 1re techno) ;
-- brouillons créés en prod par David le 2026-11-18 (fichiers scripts/questions/1techno-6/).
-- Aucun point 1GEN : les 5 brouillons sont {1_TECHNO}, rien de questions-1gen sur ces nœuds.
--
-- Relevé de la prod du 2026-11-19 (MCP) : les 5 en brouillon, {1_TECHNO}, sans nœud ni tag ;
-- 97b3a376 publié, {1_SPE,1_TECHNO}, rangé sur le nœud de 1SPE-353 et 1TECHNO-137 (le même), tags
-- 1SPE-353 + 1TECHNO-137. Données d'élèves liées à 97b3a376 ou au point 1TECHNO-137 (2026-11-18) :
-- aucune (cartes, tentatives, évaluations, réponses de test, cahier de texte, état des points,
-- exercices, automatismes : 0 ligne).
--
-- Le trigger des tags vérifie que le point est sur le nœud du modèle ou sur sa notion. Le nœud
-- de chaque modèle est LU sur son point 1TECHNO (`node_id`).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée par
-- tests/integration/questions-1techno-lot6-rangement-tags.test.ts, qui fabrique des copies portant
-- les vrais identifiants dans l'état relevé, puis rejoue CE fichier.
--
-- Gardes : les 5 brouillons encore SANS nœud et SANS tag, {1_TECHNO} ; 97b3a376 avec `1_TECHNO`
-- et le tag 1TECHNO-137, sans autre point 1TECHNO. Sinon le lot a bougé depuis le relevé : rien
-- n'est écrit.
--
-- Données d'élèves : aucune n'est modifiée (cartes, tentatives, devoirs non touchés).
--
-- Accès : aucune règle (policy) ne change. Question d'accès de la phase 0 (§ 30, validée par David
-- le 2026-11-18 AVANT le SQL) : personne ne gagne d'accès. Les 5 restent des brouillons, visibles
-- dans l'admin sous leur nœud et leur point. Miroir : 97b3a376 n'apparaît plus dans le catalogue
-- ni le cahier de texte de 1re technologique ; il reste publié pour la 1re spé (aucun élève ne l'a
-- travaillé).
--
-- Partie destructive : une seule ligne de tag supprimée (97b3a376 ↔ 1TECHNO-137) et une valeur
-- retirée d'un tableau de niveaux ; le rollback ci-dessous les rend telles quelles.
--
-- Rollback (aucune donnée d'élève). Il retire les 5 tags posés, rend les 5 brouillons sans nœud,
-- et rend à 97b3a376 le niveau `1_TECHNO` et le tag 1TECHNO-137. Garde : il refuse si un des 5
-- tags manque, si un des 5 n'est plus un brouillon (un modèle publié perdrait son nœud et son
-- tag), ou si 97b3a376 a repris `1_TECHNO` ou un point 1TECHNO depuis.
-- Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q1t6_retour;
-- create temporary table _q1t6_retour (id uuid not null, code text not null);
-- insert into _q1t6_retour values
-- 	('699b1aae-eada-468e-af95-25f74aede343', '1TECHNO-090'),
-- 	('ef34cc66-8aac-4e06-8cb0-d6c4acf93997', '1TECHNO-097'),
-- 	('4ccf75c2-eae2-4d85-8045-50bdf26add73', '1TECHNO-136'),
-- 	('b342c534-4dfd-4a37-ba06-0c48e7d50ae2', '1TECHNO-137'),
-- 	('2405ca31-d856-454d-9e1e-682ec371e088', '1TECHNO-013');
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from (select distinct id from _q1t6_retour
--         union select '97b3a376-01de-42cd-8297-b0f7937e38f1'::uuid) m order by id;
-- select 1 from public.question_templates
--  where id in (select id from _q1t6_retour) or id = '97b3a376-01de-42cd-8297-b0f7937e38f1'
--  order by id for update;
-- do $rollback$
-- declare v_presents integer; v_tags integer; v_retire integer;
-- begin
-- 	select count(*) into v_presents from public.question_templates
-- 	 where id in (select id from _q1t6_retour) or id = '97b3a376-01de-42cd-8297-b0f7937e38f1';
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 6 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 6', v_presents;
-- 	end if;
-- 	select count(*) into v_tags
-- 	  from _q1t6_retour r
-- 	  join public.curriculum_points p on p.code = r.code and p.archived_at is null
-- 	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
-- 	if v_tags <> 5 then
-- 		raise exception 'rollback : tags changés depuis la migration : % sur 5 présents', v_tags;
-- 	end if;
-- 	if exists (select 1 from public.question_templates
-- 	            where id in (select id from _q1t6_retour) and status <> 'draft') then
-- 		raise exception 'rollback : un des 5 modèles n''est plus un brouillon (publié depuis la migration)';
-- 	end if;
-- 	select count(*) into v_retire from public.question_templates q
-- 	 where q.id = '97b3a376-01de-42cd-8297-b0f7937e38f1' and not ('1_TECHNO' = any(q.grades))
-- 	   and not exists (select 1 from public.question_template_points t
-- 	                     join public.curriculum_points p on p.id = t.point_id
-- 	                    where t.template_id = q.id and p.grade = '1_TECHNO');
-- 	if v_retire <> 1 then
-- 		raise exception 'rollback : 97b3a376 a repris 1_TECHNO ou un point 1TECHNO depuis la migration';
-- 	end if;
-- 	delete from public.question_template_points t
-- 	 using _q1t6_retour r, public.curriculum_points p
-- 	 where p.code = r.code and p.archived_at is null and t.template_id = r.id and t.point_id = p.id;
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates set classification_node_id = null
-- 	 where id in (select id from _q1t6_retour);
-- 	update public.question_templates set grades = array_append(grades, '1_TECHNO')
-- 	 where id = '97b3a376-01de-42cd-8297-b0f7937e38f1';
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- 	insert into public.question_template_points (template_id, point_id)
-- 	select '97b3a376-01de-42cd-8297-b0f7937e38f1', p.id
-- 	  from public.curriculum_points p where p.code = '1TECHNO-137' and p.archived_at is null;
-- end $rollback$;
-- drop table _q1t6_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q1t6_modeles;
create temporary table _q1t6_modeles (
	id uuid primary key,
	code_techno text not null,
	point_techno uuid,
	noeud uuid
);
insert into _q1t6_modeles (id, code_techno) values
	('699b1aae-eada-468e-af95-25f74aede343', '1TECHNO-090'),
	('ef34cc66-8aac-4e06-8cb0-d6c4acf93997', '1TECHNO-097'),
	('4ccf75c2-eae2-4d85-8045-50bdf26add73', '1TECHNO-136'),
	('b342c534-4dfd-4a37-ba06-0c48e7d50ae2', '1TECHNO-137'),
	('2405ca31-d856-454d-9e1e-682ec371e088', '1TECHNO-013');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from (select id from _q1t6_modeles
        union select '97b3a376-01de-42cd-8297-b0f7937e38f1'::uuid) m order by id;
select 1 from public.question_templates
 where id in (select id from _q1t6_modeles) or id = '97b3a376-01de-42cd-8297-b0f7937e38f1'
 order by id for update;

-- ---- 2. Points et nœuds, résolus par le code -----------------------------------------
update _q1t6_modeles r set point_techno = p.id, noeud = p.node_id
  from public.curriculum_points p
 where p.grade = '1_TECHNO' and p.code = r.code_techno and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _q1t6_modeles where point_techno is null or noeud is null) then
		raise exception 'points 1TECHNO introuvables : % modèle(s) sur 5',
			(select count(*) from _q1t6_modeles where point_techno is null or noeud is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, état du relevé -------------------------------
do $garde$
declare v_presents integer; v_a integer; v_b integer;
begin
	select count(*) into v_presents from public.question_templates
	 where id in (select id from _q1t6_modeles) or id = '97b3a376-01de-42cd-8297-b0f7937e38f1';
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 6 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	-- A : brouillons neufs, encore sans nœud ni tag, {1_TECHNO}
	select count(*) into v_a
	  from _q1t6_modeles r join public.question_templates q on q.id = r.id
	 where q.classification_node_id is null and q.grades = '{1_TECHNO}' and q.status = 'draft'
	   and not exists (select 1 from public.question_template_points t where t.template_id = r.id);
	if v_a <> 5 then
		raise exception 'brouillons P1–P5 différents du relevé (nœud, tag, niveau ou statut) : % sur 5 conformes', v_a;
	end if;
	-- B : 97b3a376 avec 1_TECHNO et, pour seul point 1TECHNO, 1TECHNO-137
	select count(*) into v_b
	  from public.question_templates q
	 where q.id = '97b3a376-01de-42cd-8297-b0f7937e38f1' and '1_TECHNO' = any(q.grades)
	   and (select array_agg(p.code order by p.code)
	          from public.question_template_points t
	          join public.curriculum_points p on p.id = t.point_id
	         where t.template_id = q.id and p.grade = '1_TECHNO') = '{1TECHNO-137}';
	if v_b <> 1 then
		raise exception '97b3a376 différent du relevé (niveau 1_TECHNO ou tag 1TECHNO-137)';
	end if;
end $garde$;

-- ---- 4. Retrait (B), rangement (A), puis tags ----------------------------------------
-- (en base locale, aucun modèle : les jointures ne rendent rien et rien n'est écrit)
delete from public.question_template_points t
 using public.curriculum_points p
 where t.template_id = '97b3a376-01de-42cd-8297-b0f7937e38f1'
   and p.id = t.point_id and p.code = '1TECHNO-137';

alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set grades = array_remove(q.grades, '1_TECHNO')
 where q.id = '97b3a376-01de-42cd-8297-b0f7937e38f1';
update public.question_templates q set classification_node_id = r.noeud
  from _q1t6_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_techno
  from _q1t6_modeles r join public.question_templates q on q.id = r.id;

-- ---- 5. Vérification : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_tags integer; v_retire integer;
begin
	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
	  into v_presents, v_noeuds
	  from _q1t6_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	select count(*) into v_tags
	  from _q1t6_modeles r
	  join public.question_template_points t on t.template_id = r.id and t.point_id = r.point_techno;
	select count(*) into v_retire from public.question_templates q
	 where q.id = '97b3a376-01de-42cd-8297-b0f7937e38f1' and not ('1_TECHNO' = any(q.grades))
	   and not exists (select 1 from public.question_template_points t
	                     join public.curriculum_points p on p.id = t.point_id
	                    where t.template_id = q.id and p.grade = '1_TECHNO');
	if v_noeuds <> 5 or v_tags <> 5 or v_retire <> 1 then
		raise exception 'lot incohérent : nœuds %/5, tags %/5, 97b3a376 retiré %/1', v_noeuds, v_tags, v_retire;
	end if;
end $check$;

drop table _q1t6_modeles;
