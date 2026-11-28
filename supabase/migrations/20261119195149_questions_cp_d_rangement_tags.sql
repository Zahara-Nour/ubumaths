-- ============================================================================
-- Chantier « questions » (CP), lot D : nœud et tag de 6 modèles neufs
-- ============================================================================
--   - ea370045 (Combien de petits cubes ?) → CP-001, sur « Nombres et calculs > Entiers : numération > dénombrement » ;
--   - 4c2de9af (Quelle collection a le plus de cubes ?) → CP-070, sur « Nombres et calculs > Entiers : numération > ordre » ;
--   - 11a01460 (Place le nombre sur la demi-droite) → CP-008, sur « Nombres et calculs > Entiers : numération > droite graduée » ;
--   - 6fc49a88 (Quelle bandelette est la plus longue ?) → CP-033, sur « Grandeurs et mesures > Longueurs > comparaison et mesure » ;
--   - 59ffdd9e (Range les bandelettes) → CP-033, sur « Grandeurs et mesures > Longueurs > comparaison et mesure » ;
--   - d0dec6cb (Construis le diagramme en barres) → CP-072, sur « Statistiques > Représenter des données > diagrammes en barres » ;
-- Chaque modèle va sur le nœud de son point (une sous-notion) et porte UN point (ADR 0020 : au plus
-- un point par programme) ; question_template_points_check_rules refuse un tag hors du nœud du
-- modèle ou de sa notion. Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-19 (journal docs/wip/questions-progress.md § 4 septdecies).
-- Les modèles ont été créés en brouillon le 2026-11-19 par scripts/create-questions.ts
-- (scripts/questions/cp-d/, PR #2909), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-19 (MCP) : 6 brouillons [CP], sans nœud ni tag. Les modèles des autres niveaux, sur les
-- mêmes nœuds, ne sont PAS touchés.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée par
-- tests/integration/questions-cp-d-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-19), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David AVANT le SQL, en phase 0,
-- validée par lui le 2026-11-19 : personne, journal § 4 septdecies). Aucune règle ne change. Effet
-- visible : les 6 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les
-- élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('ea370045-e86b-42c3-ac78-10843d9b847d'::uuid),
--                ('4c2de9af-6293-48de-9c3a-1eaf555e55ea'::uuid),
--                ('11a01460-f201-44f5-83fc-18041c5c585d'::uuid),
--                ('6fc49a88-ae90-4e4d-b099-4b66519a1274'::uuid),
--                ('59ffdd9e-1a90-412a-9eb1-f04374042bb6'::uuid),
--                ('d0dec6cb-3785-499c-adf3-267a0f24c008'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('ea370045-e86b-42c3-ac78-10843d9b847d'::uuid, 'CP-001'),
-- 	('4c2de9af-6293-48de-9c3a-1eaf555e55ea'::uuid, 'CP-070'),
-- 	('11a01460-f201-44f5-83fc-18041c5c585d'::uuid, 'CP-008'),
-- 	('6fc49a88-ae90-4e4d-b099-4b66519a1274'::uuid, 'CP-033'),
-- 	('59ffdd9e-1a90-412a-9eb1-f04374042bb6'::uuid, 'CP-033'),
-- 	('d0dec6cb-3785-499c-adf3-267a0f24c008'::uuid, 'CP-072')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CP' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('ea370045-e86b-42c3-ac78-10843d9b847d',
--               '4c2de9af-6293-48de-9c3a-1eaf555e55ea',
--               '11a01460-f201-44f5-83fc-18041c5c585d',
--               '6fc49a88-ae90-4e4d-b099-4b66519a1274',
--               '59ffdd9e-1a90-412a-9eb1-f04374042bb6',
--               'd0dec6cb-3785-499c-adf3-267a0f24c008');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qcpd_modeles;
create temporary table _qcpd_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qcpd_modeles values
	('ea370045-e86b-42c3-ac78-10843d9b847d', 'Nombres et calculs', 'Entiers : numération', 'dénombrement', 'CP-001'),
	('4c2de9af-6293-48de-9c3a-1eaf555e55ea', 'Nombres et calculs', 'Entiers : numération', 'ordre', 'CP-070'),
	('11a01460-f201-44f5-83fc-18041c5c585d', 'Nombres et calculs', 'Entiers : numération', 'droite graduée', 'CP-008'),
	('6fc49a88-ae90-4e4d-b099-4b66519a1274', 'Grandeurs et mesures', 'Longueurs', 'comparaison et mesure', 'CP-033'),
	('59ffdd9e-1a90-412a-9eb1-f04374042bb6', 'Grandeurs et mesures', 'Longueurs', 'comparaison et mesure', 'CP-033'),
	('d0dec6cb-3785-499c-adf3-267a0f24c008', 'Statistiques', 'Représenter des données', 'diagrammes en barres', 'CP-072');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcpd_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcpd_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée ; le point est sur ce nœud ou sur sa notion
alter table _qcpd_modeles add column noeud uuid, add column point_id uuid;
update _qcpd_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qcpd_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qcpd_modeles r set point_id = p.id
  from public.curriculum_points p, public.classification_nodes s
 where s.id = r.noeud and p.grade = 'CP' and p.code = r.code and p.archived_at is null
   and (p.node_id = s.id or (s.kind = 'subnotion' and p.node_id = s.parent_id));
do $resolution$
begin
	if exists (select 1 from _qcpd_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qcpd_modeles where noeud is null),
			(select count(*) from _qcpd_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qcpd_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	select count(*) into v_ranges from _qcpd_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcpd_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qcpd_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qcpd_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qcpd_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcpd_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qcpd_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcpd_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qcpd_modeles;
