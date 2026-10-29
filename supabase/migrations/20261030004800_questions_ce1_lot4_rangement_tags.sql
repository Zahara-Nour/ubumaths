-- ============================================================================
-- Chantier « questions-ce1 », lot 4 (problèmes) : nœud et tag de 10 modèles neufs
-- ============================================================================
--   - dfc324b1 (Problèmes parties-tout (jusqu'à 1 000)) → CE1-036, sur « Nombres et calculs > Problèmes arithmétiques > parties-tout » ;
--   - c43bd203 (Problèmes parties-tout avec des prix) → CE1-036, sur « Nombres et calculs > Problèmes arithmétiques > parties-tout » ;
--   - 23b13821 (Est-ce que ça tient ?) → CE1-036, sur « Nombres et calculs > Problèmes arithmétiques > parties-tout » ;
--   - 612eeb31 (Problèmes de comparaison) → CE1-037, sur « Nombres et calculs > Problèmes arithmétiques > comparaison » ;
--   - 93d318d1 (Problèmes en deux étapes (jusqu'à 1 000)) → CE1-038, sur « Nombres et calculs > Problèmes arithmétiques > en deux étapes ou plus » ;
--   - f9eeeffe (Problèmes multiplicatifs : le tout) → CE1-039, sur « Nombres et calculs > Problèmes arithmétiques > multiplicatifs » ;
--   - bc521c99 (Problèmes de partage : le nombre de parts) → CE1-039, sur « Nombres et calculs > Problèmes arithmétiques > multiplicatifs » ;
--   - 5e469f6f (Problèmes de partage : la valeur d'une part) → CE1-039, sur « Nombres et calculs > Problèmes arithmétiques > multiplicatifs » ;
--   - e4815e7f (Problèmes mixtes en deux étapes) → CE1-040, sur « Nombres et calculs > Problèmes arithmétiques > en deux étapes ou plus » ;
--   - 584dc8b3 (La part qui reste) → CE1-099, sur « Nombres et calculs > Fractions : calculs > addition et soustraction ».
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-29 (journal docs/wip/questions-ce1-progress.md § 10). Les modèles
-- ont été créés en brouillon le 2026-10-29 par scripts/create-questions.ts
-- (scripts/questions/ce1-4/, lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (10 modèles). Elle est prouvée par
-- tests/integration/questions-ce1-lot4-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-10-29),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-10-29 en phase 0, AVANT le SQL, tranchée par lui le 2026-10-29 : personne).
-- Aucune règle ne change. Effet visible : les 10 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 10 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('dfc324b1-200e-41e4-85a8-31ce3ccd8538'::uuid),
--               ('c43bd203-4d0b-42a1-9543-291ebe6b9386'::uuid),
--               ('23b13821-e1bf-4e6d-8191-a90e9e776e09'::uuid),
--               ('612eeb31-b373-451d-87c1-390c7662ab4f'::uuid),
--               ('93d318d1-090e-4ea2-8226-792662a60376'::uuid),
--               ('f9eeeffe-1157-4f94-b3c1-d12037184de6'::uuid),
--               ('bc521c99-3335-4b38-8bbe-e49cce095ebf'::uuid),
--               ('5e469f6f-706b-47db-8506-88b41beb4a91'::uuid),
--               ('e4815e7f-4994-4041-9df1-0fc671da3ef8'::uuid),
--               ('584dc8b3-2f0f-41ba-a954-76ba1c882e31'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('dfc324b1-200e-41e4-85a8-31ce3ccd8538'::uuid, 'CE1-036'),
-- 	('c43bd203-4d0b-42a1-9543-291ebe6b9386'::uuid, 'CE1-036'),
-- 	('23b13821-e1bf-4e6d-8191-a90e9e776e09'::uuid, 'CE1-036'),
-- 	('612eeb31-b373-451d-87c1-390c7662ab4f'::uuid, 'CE1-037'),
-- 	('93d318d1-090e-4ea2-8226-792662a60376'::uuid, 'CE1-038'),
-- 	('f9eeeffe-1157-4f94-b3c1-d12037184de6'::uuid, 'CE1-039'),
-- 	('bc521c99-3335-4b38-8bbe-e49cce095ebf'::uuid, 'CE1-039'),
-- 	('5e469f6f-706b-47db-8506-88b41beb4a91'::uuid, 'CE1-039'),
-- 	('e4815e7f-4994-4041-9df1-0fc671da3ef8'::uuid, 'CE1-040'),
-- 	('584dc8b3-2f0f-41ba-a954-76ba1c882e31'::uuid, 'CE1-099')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CE1' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('dfc324b1-200e-41e4-85a8-31ce3ccd8538',
--               'c43bd203-4d0b-42a1-9543-291ebe6b9386',
--               '23b13821-e1bf-4e6d-8191-a90e9e776e09',
--               '612eeb31-b373-451d-87c1-390c7662ab4f',
--               '93d318d1-090e-4ea2-8226-792662a60376',
--               'f9eeeffe-1157-4f94-b3c1-d12037184de6',
--               'bc521c99-3335-4b38-8bbe-e49cce095ebf',
--               '5e469f6f-706b-47db-8506-88b41beb4a91',
--               'e4815e7f-4994-4041-9df1-0fc671da3ef8',
--               '584dc8b3-2f0f-41ba-a954-76ba1c882e31');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qc_modeles;
create temporary table _qc_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qc_modeles values
	('dfc324b1-200e-41e4-85a8-31ce3ccd8538', 'Nombres et calculs', 'Problèmes arithmétiques', 'parties-tout', 'CE1-036'),
	('c43bd203-4d0b-42a1-9543-291ebe6b9386', 'Nombres et calculs', 'Problèmes arithmétiques', 'parties-tout', 'CE1-036'),
	('23b13821-e1bf-4e6d-8191-a90e9e776e09', 'Nombres et calculs', 'Problèmes arithmétiques', 'parties-tout', 'CE1-036'),
	('612eeb31-b373-451d-87c1-390c7662ab4f', 'Nombres et calculs', 'Problèmes arithmétiques', 'comparaison', 'CE1-037'),
	('93d318d1-090e-4ea2-8226-792662a60376', 'Nombres et calculs', 'Problèmes arithmétiques', 'en deux étapes ou plus', 'CE1-038'),
	('f9eeeffe-1157-4f94-b3c1-d12037184de6', 'Nombres et calculs', 'Problèmes arithmétiques', 'multiplicatifs', 'CE1-039'),
	('bc521c99-3335-4b38-8bbe-e49cce095ebf', 'Nombres et calculs', 'Problèmes arithmétiques', 'multiplicatifs', 'CE1-039'),
	('5e469f6f-706b-47db-8506-88b41beb4a91', 'Nombres et calculs', 'Problèmes arithmétiques', 'multiplicatifs', 'CE1-039'),
	('e4815e7f-4994-4041-9df1-0fc671da3ef8', 'Nombres et calculs', 'Problèmes arithmétiques', 'en deux étapes ou plus', 'CE1-040'),
	('584dc8b3-2f0f-41ba-a954-76ba1c882e31', 'Nombres et calculs', 'Fractions : calculs', 'addition et soustraction', 'CE1-099');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qc_modeles order by id;
select 1 from public.question_templates where id in (select id from _qc_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qc_modeles add column noeud uuid, add column point_id uuid;
update _qc_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qc_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qc_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CE1' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qc_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qc_modeles where noeud is null),
			(select count(*) from _qc_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qc_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 10) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 10', v_presents;
	end if;
	select count(*) into v_ranges from _qc_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qc_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qc_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qc_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qc_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qc_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qc_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qc_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qc_modeles;
