-- ============================================================================
-- Chantier « questions-1gen », lot 2 (représentations graphiques : suites et affines) : nœud et
-- tag de 6 modèles neufs
-- ============================================================================
--   - 13388e8f (R3, placer les termes d'une suite géométrique) → 1GEN-041, sur « Suites > Généralités sur les suites > représentation graphique » ;
--   - 216555e7 (R5, tracer la droite d'une fonction affine) → 1GEN-020, sur « Fonctions > Fonctions affines > expression et droite » ;
--   - 817d257f (R1, associer nuages et suites arithmétiques) → 1GEN-016, sur « Suites > Généralités sur les suites > représentation graphique » ;
--   - 96668141 (R2, placer les termes d'une suite arithmétique) → 1GEN-019, sur « Suites > Généralités sur les suites > représentation graphique » ;
--   - e17ce5be (R6, lire sur la droite d'une fonction affine) → 1GEN-051, sur « Fonctions > Fonctions affines > expression et droite » ;
--   - e8f08a19 (R4, lire sur le nuage d'une suite géométrique) → 1GEN-058, sur « Suites > Généralités sur les suites > représentation graphique » ;
-- Chaque modèle va sur le NŒUD de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point ou de sa notion), et porte UN point (ADR 0020 : au plus un point par
-- programme). Ni le contenu, ni les niveaux (écrits à la création : `1_GEN` ; questions-1techno
-- ajoutera `1_TECHNO` à R2, R3, R4 par sa propre migration, tags 1TECHNO-044, 117, 119), ni le statut ne changent :
-- `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-17 (journal docs/wip/questions-1gen-progress.md § 15 et § 16). Les
-- modèles ont été créés en brouillon le 2026-11-17 par scripts/create-questions.ts
-- (scripts/questions/1gen-2-representations-graphiques/, lancé par David après le merge de #2762),
-- qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée par
-- tests/integration/questions-1gen-lot2-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-17),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question d'accès de la phase 0, § 15, validée par
-- David le 2026-11-17 AVANT le SQL : personne). Aucune règle ne change. Effet visible : les 6
-- brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les
-- voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi). À jouer AVANT que questions-1techno ait tagué R2, R3, R4
-- (ses tags 1TECHNO exigent le nœud : retirer le nœud serait alors refusé ou les contredirait) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('13388e8f-e662-4f28-97b6-934afaeead31'::uuid),
--                ('216555e7-9f28-4992-b0f4-416bc418e7da'::uuid),
--                ('817d257f-dcc6-4c31-92ca-57b0d20665da'::uuid),
--                ('96668141-c1a7-4996-bb59-b39f6c106b45'::uuid),
--                ('e17ce5be-7beb-4773-b267-7910d6c8a86b'::uuid),
--                ('e8f08a19-b417-4183-9cd3-fab7f3810211'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('13388e8f-e662-4f28-97b6-934afaeead31'::uuid, '1GEN-041'),
-- 	('216555e7-9f28-4992-b0f4-416bc418e7da'::uuid, '1GEN-020'),
-- 	('817d257f-dcc6-4c31-92ca-57b0d20665da'::uuid, '1GEN-016'),
-- 	('96668141-c1a7-4996-bb59-b39f6c106b45'::uuid, '1GEN-019'),
-- 	('e17ce5be-7beb-4773-b267-7910d6c8a86b'::uuid, '1GEN-051'),
-- 	('e8f08a19-b417-4183-9cd3-fab7f3810211'::uuid, '1GEN-058')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '1_GEN' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('13388e8f-e662-4f28-97b6-934afaeead31',
--               '216555e7-9f28-4992-b0f4-416bc418e7da',
--               '817d257f-dcc6-4c31-92ca-57b0d20665da',
--               '96668141-c1a7-4996-bb59-b39f6c106b45',
--               'e17ce5be-7beb-4773-b267-7910d6c8a86b',
--               'e8f08a19-b417-4183-9cd3-fab7f3810211');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q1g2_modeles;
create temporary table _q1g2_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _q1g2_modeles values
	('13388e8f-e662-4f28-97b6-934afaeead31', 'Suites', 'Généralités sur les suites', 'représentation graphique', '1GEN-041'),
	('216555e7-9f28-4992-b0f4-416bc418e7da', 'Fonctions', 'Fonctions affines', 'expression et droite', '1GEN-020'),
	('817d257f-dcc6-4c31-92ca-57b0d20665da', 'Suites', 'Généralités sur les suites', 'représentation graphique', '1GEN-016'),
	('96668141-c1a7-4996-bb59-b39f6c106b45', 'Suites', 'Généralités sur les suites', 'représentation graphique', '1GEN-019'),
	('e17ce5be-7beb-4773-b267-7910d6c8a86b', 'Fonctions', 'Fonctions affines', 'expression et droite', '1GEN-051'),
	('e8f08a19-b417-4183-9cd3-fab7f3810211', 'Suites', 'Généralités sur les suites', 'représentation graphique', '1GEN-058');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q1g2_modeles order by id;
select 1 from public.question_templates where id in (select id from _q1g2_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _q1g2_modeles add column noeud uuid, add column point_id uuid;
update _q1g2_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _q1g2_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q1g2_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '1_GEN' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q1g2_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q1g2_modeles where noeud is null),
			(select count(*) from _q1g2_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _q1g2_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	select count(*) into v_ranges from _q1g2_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q1g2_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q1g2_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q1g2_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q1g2_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q1g2_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _q1g2_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q1g2_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _q1g2_modeles;
