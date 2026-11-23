-- ============================================================================
-- Chantier « questions-cm1 », lot 4 (décimaux) : nœud et tag de 8 modèles neufs
-- ============================================================================
--   - 2cff4ef5 (Lire et écrire un nombre décimal) → CM1-031, sur « Nombres et calculs > Décimaux : numération > écritures » ;
--   - b832dfdf (Colorier un nombre décimal) → CM1-156, sur « Nombres et calculs > Décimaux : numération > écritures » ;
--   - 06f246e4 (Repérer un point par un nombre décimal) → CM1-157, sur « Nombres et calculs > Décimaux : numération > droite graduée » ;
--   - 3560dded (Placer un nombre décimal sur une demi-droite graduée) → CM1-032, sur « Nombres et calculs > Décimaux : numération > droite graduée » ;
--   - 10aae729 (Donner la partie entière d'un nombre décimal) → CM1-033, sur « Nombres et calculs > Décimaux : numération > arrondis et ordres de grandeur » ;
--   - ca08432a (Arrondir un nombre décimal à l'unité) → CM1-158, sur « Nombres et calculs > Décimaux : numération > arrondis et ordres de grandeur » ;
--   - 2af5f9fe (Ranger des nombres décimaux) → CM1-159, sur « Nombres et calculs > Décimaux : numération > ordre » ;
--   - 2cb242e0 (Intercaler un nombre décimal) → CM1-160, sur « Nombres et calculs > Décimaux : numération > encadrement » ;
-- Chaque modèle va sur la SOUS-NOTION de son point (question_template_points_check_rules refuse
-- un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-01 (journal docs/wip/questions-cm1-progress.md § 12 bis). Les
-- modèles ont été créés en brouillon le 2026-11-01 par scripts/create-questions.ts
-- (scripts/questions/cm1-4/, PR #2115), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-01 (MCP) : 8 brouillons [CM1], sans nœud ni tag ; les 8 points sous « Décimaux :
-- numération » (sous-notions ci-dessus), sans aucun modèle.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (8 modèles). Elle est prouvée par
-- tests/integration/questions-cm1-lot4-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-01), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David AVANT le SQL, tranchée par
-- lui le 2026-11-01 : personne, journal § 12 et 12 bis). Aucune règle ne change. Effet visible : les 8
-- brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient
-- qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 8 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('2cff4ef5-a463-4bce-85ff-b0fec81dce08'::uuid),
--                ('b832dfdf-f1eb-4f4c-8469-66d89a9db899'::uuid),
--                ('06f246e4-eda1-44f5-a65f-9f55c360833d'::uuid),
--                ('3560dded-0565-4f15-a6e0-44e7e2adc834'::uuid),
--                ('10aae729-4a29-4dac-9578-21ef655d60d1'::uuid),
--                ('ca08432a-cfcc-4372-809e-f5d0d9895eff'::uuid),
--                ('2af5f9fe-de36-4b1c-adf9-dec60f759910'::uuid),
--                ('2cb242e0-fa40-458b-abb0-819e4720c731'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('2cff4ef5-a463-4bce-85ff-b0fec81dce08'::uuid, 'CM1-031'),
-- 	('b832dfdf-f1eb-4f4c-8469-66d89a9db899'::uuid, 'CM1-156'),
-- 	('06f246e4-eda1-44f5-a65f-9f55c360833d'::uuid, 'CM1-157'),
-- 	('3560dded-0565-4f15-a6e0-44e7e2adc834'::uuid, 'CM1-032'),
-- 	('10aae729-4a29-4dac-9578-21ef655d60d1'::uuid, 'CM1-033'),
-- 	('ca08432a-cfcc-4372-809e-f5d0d9895eff'::uuid, 'CM1-158'),
-- 	('2af5f9fe-de36-4b1c-adf9-dec60f759910'::uuid, 'CM1-159'),
-- 	('2cb242e0-fa40-458b-abb0-819e4720c731'::uuid, 'CM1-160')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CM1' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('2cff4ef5-a463-4bce-85ff-b0fec81dce08',
--               'b832dfdf-f1eb-4f4c-8469-66d89a9db899',
--               '06f246e4-eda1-44f5-a65f-9f55c360833d',
--               '3560dded-0565-4f15-a6e0-44e7e2adc834',
--               '10aae729-4a29-4dac-9578-21ef655d60d1',
--               'ca08432a-cfcc-4372-809e-f5d0d9895eff',
--               '2af5f9fe-de36-4b1c-adf9-dec60f759910',
--               '2cb242e0-fa40-458b-abb0-819e4720c731');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qcm1l4_modeles;
create temporary table _qcm1l4_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qcm1l4_modeles values
	('2cff4ef5-a463-4bce-85ff-b0fec81dce08', 'Nombres et calculs', 'Décimaux : numération', 'écritures', 'CM1-031'),
	('b832dfdf-f1eb-4f4c-8469-66d89a9db899', 'Nombres et calculs', 'Décimaux : numération', 'écritures', 'CM1-156'),
	('06f246e4-eda1-44f5-a65f-9f55c360833d', 'Nombres et calculs', 'Décimaux : numération', 'droite graduée', 'CM1-157'),
	('3560dded-0565-4f15-a6e0-44e7e2adc834', 'Nombres et calculs', 'Décimaux : numération', 'droite graduée', 'CM1-032'),
	('10aae729-4a29-4dac-9578-21ef655d60d1', 'Nombres et calculs', 'Décimaux : numération', 'arrondis et ordres de grandeur', 'CM1-033'),
	('ca08432a-cfcc-4372-809e-f5d0d9895eff', 'Nombres et calculs', 'Décimaux : numération', 'arrondis et ordres de grandeur', 'CM1-158'),
	('2af5f9fe-de36-4b1c-adf9-dec60f759910', 'Nombres et calculs', 'Décimaux : numération', 'ordre', 'CM1-159'),
	('2cb242e0-fa40-458b-abb0-819e4720c731', 'Nombres et calculs', 'Décimaux : numération', 'encadrement', 'CM1-160');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm1l4_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm1l4_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qcm1l4_modeles add column noeud uuid, add column point_id uuid;
update _qcm1l4_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qcm1l4_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qcm1l4_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CM1' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qcm1l4_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qcm1l4_modeles where noeud is null),
			(select count(*) from _qcm1l4_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm1l4_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 8) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 8', v_presents;
	end if;
	select count(*) into v_ranges from _qcm1l4_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcm1l4_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qcm1l4_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qcm1l4_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm1l4_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm1l4_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qcm1l4_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm1l4_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qcm1l4_modeles;
