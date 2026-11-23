-- ============================================================================
-- Chantier « questions-4 », lot 2 (proportionnalité et pourcentages) : nœud et tag de 7 modèles neufs
-- ============================================================================
--   - 0c5f6039 (Partage proportionnel) → 4-059, sur « Proportionnalité > Situations de proportionnalité > ratio » ;
--   - 21c79ea0 (Égalités de rapports) → 4-054, sur « Proportionnalité > Situations de proportionnalité > ratio » ;
--   - 342cff76 (Comparer avec un rapport) → 4-053, sur « Proportionnalité > Situations de proportionnalité > ratio » ;
--   - 4f599434 (Calculer avec des pourcentages) → 4-056, sur « Proportionnalité > Pourcentages > calculs de pourcentages » ;
--   - 76f5f143 (Diminution et coefficient multiplicateur) → 4-080, sur « Proportionnalité > Évolutions > variations en pourcentage » ;
--   - ccb51039 (Augmentation et coefficient multiplicateur) → 4-057, sur « Proportionnalité > Évolutions > variations en pourcentage » ;
--   - d727be44 (Le coefficient multiplicateur) → 4-058, sur « Proportionnalité > Évolutions > variations en pourcentage » ;
-- Chaque modèle va sur le nœud de son point (une sous-notion pour les 7) :
-- question_template_points_check_rules refuse un tag hors du nœud du point, et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-10-29 (journal docs/wip/questions-4-progress.md § 12). Les
-- modèles ont été créés en brouillon le 2026-10-29 par scripts/create-questions.ts
-- (scripts/questions/4-lot-2/, #1955), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-10-29 (MCP) : 7 brouillons [4], sans nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-4-lot2-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-29), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin seul ; question posée à David
-- avec la phase 0 du lot 2, journal § 12.3, validée le 2026-10-29). Aucune règle ne change. Effet
-- visible : les 7 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les
-- élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('0c5f6039-2a38-4418-b08b-3c890a784f90'::uuid),
--                ('21c79ea0-cb67-445b-b515-a698de63425e'::uuid),
--                ('342cff76-193d-4610-be08-e99faca5e9e3'::uuid),
--                ('4f599434-9927-4420-bf62-f8047ca65bec'::uuid),
--                ('76f5f143-14c0-4181-8e8c-525aa4f99292'::uuid),
--                ('ccb51039-cf8d-4edf-8d8e-9288e8fa11e2'::uuid),
--                ('d727be44-bd71-4697-ba1e-c56167b8ac63'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('0c5f6039-2a38-4418-b08b-3c890a784f90'::uuid, '4-059'),
-- 	('21c79ea0-cb67-445b-b515-a698de63425e'::uuid, '4-054'),
-- 	('342cff76-193d-4610-be08-e99faca5e9e3'::uuid, '4-053'),
-- 	('4f599434-9927-4420-bf62-f8047ca65bec'::uuid, '4-056'),
-- 	('76f5f143-14c0-4181-8e8c-525aa4f99292'::uuid, '4-080'),
-- 	('ccb51039-cf8d-4edf-8d8e-9288e8fa11e2'::uuid, '4-057'),
-- 	('d727be44-bd71-4697-ba1e-c56167b8ac63'::uuid, '4-058')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '4' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('0c5f6039-2a38-4418-b08b-3c890a784f90',
--               '21c79ea0-cb67-445b-b515-a698de63425e',
--               '342cff76-193d-4610-be08-e99faca5e9e3',
--               '4f599434-9927-4420-bf62-f8047ca65bec',
--               '76f5f143-14c0-4181-8e8c-525aa4f99292',
--               'ccb51039-cf8d-4edf-8d8e-9288e8fa11e2',
--               'd727be44-bd71-4697-ba1e-c56167b8ac63');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q4l2_modeles;
create temporary table _q4l2_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _q4l2_modeles values
	('0c5f6039-2a38-4418-b08b-3c890a784f90', 'Proportionnalité', 'Situations de proportionnalité', 'ratio', '4-059'),
	('21c79ea0-cb67-445b-b515-a698de63425e', 'Proportionnalité', 'Situations de proportionnalité', 'ratio', '4-054'),
	('342cff76-193d-4610-be08-e99faca5e9e3', 'Proportionnalité', 'Situations de proportionnalité', 'ratio', '4-053'),
	('4f599434-9927-4420-bf62-f8047ca65bec', 'Proportionnalité', 'Pourcentages', 'calculs de pourcentages', '4-056'),
	('76f5f143-14c0-4181-8e8c-525aa4f99292', 'Proportionnalité', 'Évolutions', 'variations en pourcentage', '4-080'),
	('ccb51039-cf8d-4edf-8d8e-9288e8fa11e2', 'Proportionnalité', 'Évolutions', 'variations en pourcentage', '4-057'),
	('d727be44-bd71-4697-ba1e-c56167b8ac63', 'Proportionnalité', 'Évolutions', 'variations en pourcentage', '4-058');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q4l2_modeles order by id;
select 1 from public.question_templates where id in (select id from _q4l2_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _q4l2_modeles add column noeud uuid, add column point_id uuid;
update _q4l2_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _q4l2_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q4l2_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '4' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q4l2_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q4l2_modeles where noeud is null),
			(select count(*) from _q4l2_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _q4l2_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
	end if;
	select count(*) into v_ranges from _q4l2_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q4l2_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q4l2_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q4l2_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q4l2_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q4l2_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _q4l2_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q4l2_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _q4l2_modeles;
