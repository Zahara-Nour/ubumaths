-- ============================================================================
-- Chantier « questions-cm1 », lot 2 (numération des entiers) : nœud et tag de 10 modèles neufs
-- ============================================================================
--   - 08ec7b9f (Intercaler un nombre) → CM1-142, sur « Nombres et calculs > Entiers : numération > ordre » ;
--   - 178730c2 (Encadrer un nombre) → CM1-141, sur « Nombres et calculs > Entiers : numération > ordre » ;
--   - 1cb66993 (Le nombre qui suit, le nombre qui précède) → CM1-004, sur « Nombres et calculs > Entiers : numération > écritures » ;
--   - 4292d153 (Unités de numération) → CM1-003, sur « Nombres et calculs > Entiers : numération > décomposition » ;
--   - 5291643e (Supérieur à, inférieur à, compris entre) → CM1-007, sur « Nombres et calculs > Entiers : numération > ordre » ;
--   - 573a49b3 (La valeur d'un chiffre) → CM1-005, sur « Nombres et calculs > Entiers : numération > décomposition » ;
--   - 5dbcc8dd (Est-ce un multiple ?) → CM1-012, sur « Arithmétique > Divisibilité > multiples et diviseurs » ;
--   - 6dbea912 (Est-ce un diviseur ?) → CM1-013, sur « Arithmétique > Divisibilité > multiples et diviseurs » ;
--   - b4ea91fe (Le nombre de centaines, de milliers…) → CM1-003, sur « Nombres et calculs > Entiers : numération > décomposition » ;
--   - d7df43c4 (Ranger cinq nombres) → CM1-009, sur « Nombres et calculs > Entiers : numération > ordre » ;
-- Chaque modèle va sur la SOUS-NOTION de son point (question_template_points_check_rules refuse
-- un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-10-29 (journal docs/wip/questions-cm1-progress.md § 8 bis). Les
-- modèles ont été créés en brouillon le 2026-10-29 par scripts/create-questions.ts
-- (scripts/questions/cm1-2/, PR #1964), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-10-29 (MCP) : 10 brouillons [CM1], sans nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (10 modèles). Elle est prouvée par
-- tests/integration/questions-cm1-lot2-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-29), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David AVANT le SQL, tranchée par
-- lui le 2026-10-29 : personne, journal § 8). Aucune règle ne change. Effet visible : les 10
-- brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient
-- qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 10 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('08ec7b9f-7f8b-42f7-8ed5-b9cc3f6ee24a'::uuid),
--                ('178730c2-36e1-4343-b99c-c3952303a29d'::uuid),
--                ('1cb66993-a0f8-42fb-8d3d-21593ce29c79'::uuid),
--                ('4292d153-275a-4087-b9f8-2b3cce99fc14'::uuid),
--                ('5291643e-06bd-4134-9f96-77c8adbe76ea'::uuid),
--                ('573a49b3-9c6c-4d6f-9f92-70f196c50232'::uuid),
--                ('5dbcc8dd-861a-4d4d-ba98-735fb7418c3d'::uuid),
--                ('6dbea912-4647-4021-91e8-18e6f9dc36b9'::uuid),
--                ('b4ea91fe-7f9b-4b87-8056-425e4b93a93b'::uuid),
--                ('d7df43c4-0a25-49a6-832e-6d8d00da705b'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('08ec7b9f-7f8b-42f7-8ed5-b9cc3f6ee24a'::uuid, 'CM1-142'),
-- 	('178730c2-36e1-4343-b99c-c3952303a29d'::uuid, 'CM1-141'),
-- 	('1cb66993-a0f8-42fb-8d3d-21593ce29c79'::uuid, 'CM1-004'),
-- 	('4292d153-275a-4087-b9f8-2b3cce99fc14'::uuid, 'CM1-003'),
-- 	('5291643e-06bd-4134-9f96-77c8adbe76ea'::uuid, 'CM1-007'),
-- 	('573a49b3-9c6c-4d6f-9f92-70f196c50232'::uuid, 'CM1-005'),
-- 	('5dbcc8dd-861a-4d4d-ba98-735fb7418c3d'::uuid, 'CM1-012'),
-- 	('6dbea912-4647-4021-91e8-18e6f9dc36b9'::uuid, 'CM1-013'),
-- 	('b4ea91fe-7f9b-4b87-8056-425e4b93a93b'::uuid, 'CM1-003'),
-- 	('d7df43c4-0a25-49a6-832e-6d8d00da705b'::uuid, 'CM1-009')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CM1' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('08ec7b9f-7f8b-42f7-8ed5-b9cc3f6ee24a',
--               '178730c2-36e1-4343-b99c-c3952303a29d',
--               '1cb66993-a0f8-42fb-8d3d-21593ce29c79',
--               '4292d153-275a-4087-b9f8-2b3cce99fc14',
--               '5291643e-06bd-4134-9f96-77c8adbe76ea',
--               '573a49b3-9c6c-4d6f-9f92-70f196c50232',
--               '5dbcc8dd-861a-4d4d-ba98-735fb7418c3d',
--               '6dbea912-4647-4021-91e8-18e6f9dc36b9',
--               'b4ea91fe-7f9b-4b87-8056-425e4b93a93b',
--               'd7df43c4-0a25-49a6-832e-6d8d00da705b');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qcm1l2_modeles;
create temporary table _qcm1l2_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qcm1l2_modeles values
	('08ec7b9f-7f8b-42f7-8ed5-b9cc3f6ee24a', 'Nombres et calculs', 'Entiers : numération', 'ordre', 'CM1-142'),
	('178730c2-36e1-4343-b99c-c3952303a29d', 'Nombres et calculs', 'Entiers : numération', 'ordre', 'CM1-141'),
	('1cb66993-a0f8-42fb-8d3d-21593ce29c79', 'Nombres et calculs', 'Entiers : numération', 'écritures', 'CM1-004'),
	('4292d153-275a-4087-b9f8-2b3cce99fc14', 'Nombres et calculs', 'Entiers : numération', 'décomposition', 'CM1-003'),
	('5291643e-06bd-4134-9f96-77c8adbe76ea', 'Nombres et calculs', 'Entiers : numération', 'ordre', 'CM1-007'),
	('573a49b3-9c6c-4d6f-9f92-70f196c50232', 'Nombres et calculs', 'Entiers : numération', 'décomposition', 'CM1-005'),
	('5dbcc8dd-861a-4d4d-ba98-735fb7418c3d', 'Arithmétique', 'Divisibilité', 'multiples et diviseurs', 'CM1-012'),
	('6dbea912-4647-4021-91e8-18e6f9dc36b9', 'Arithmétique', 'Divisibilité', 'multiples et diviseurs', 'CM1-013'),
	('b4ea91fe-7f9b-4b87-8056-425e4b93a93b', 'Nombres et calculs', 'Entiers : numération', 'décomposition', 'CM1-003'),
	('d7df43c4-0a25-49a6-832e-6d8d00da705b', 'Nombres et calculs', 'Entiers : numération', 'ordre', 'CM1-009');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm1l2_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm1l2_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qcm1l2_modeles add column noeud uuid, add column point_id uuid;
update _qcm1l2_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qcm1l2_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qcm1l2_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CM1' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qcm1l2_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qcm1l2_modeles where noeud is null),
			(select count(*) from _qcm1l2_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm1l2_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 10) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 10', v_presents;
	end if;
	select count(*) into v_ranges from _qcm1l2_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcm1l2_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qcm1l2_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qcm1l2_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm1l2_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm1l2_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qcm1l2_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm1l2_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qcm1l2_modeles;
