-- ============================================================================
-- Chantier « questions-ce2 », lot 7a (calcul posé et monnaie) : nœud et tag de 10 modèles neufs
-- ============================================================================
--   - 3d1856ac (Pose et calcule une addition) → CE2-016, sur « Nombres et calculs > Entiers : addition et soustraction > calcul posé »;
--   - 89698b69 (Soustraction par cassage) → CE2-090, sur « Nombres et calculs > Entiers : addition et soustraction > calcul posé »;
--   - b0740746 (Soustraction par compensation) → CE2-090, sur « Nombres et calculs > Entiers : addition et soustraction > calcul posé »;
--   - d1fc9daa (Multiplication par un chiffre) → CE2-019, sur « Nombres et calculs > Entiers : multiplication > calcul posé »;
--   - c25f80f0 (Multiplication par deux chiffres) → CE2-019, sur « Nombres et calculs > Entiers : multiplication > calcul posé »;
--   - 4954edb5 (Addition de montants) → CE2-055, sur « Grandeurs et mesures > Monnaie > euros et centimes »;
--   - 8c90be06 (Soustraction de montants) → CE2-056, sur « Grandeurs et mesures > Monnaie > euros et centimes »;
--   - e05931f9 (Simule tes achats) → CE2-054, sur « Grandeurs et mesures > Monnaie > pièces et billets »;
--   - 91805d1e (Rends la monnaie par ajouts) → CE2-080, sur « Grandeurs et mesures > Monnaie > rendre la monnaie »;
--   - 52206066 (Pose la monnaie rendue) → CE2-080, sur « Grandeurs et mesures > Monnaie > rendre la monnaie »;
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-02 (journal docs/wip/questions-ce2-progress.md § 11). Les modèles
-- ont été créés en brouillon le 2026-11-02 par scripts/create-questions.ts
-- (scripts/questions/ce2-7a/, lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (10 modèles). Elle est prouvée par
-- tests/integration/questions-ce2-lot7a-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-02, après la création),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-11-02 en phase 0 (§ 11), AVANT le SQL, tranchée par lui le 2026-11-02 : personne).
-- Aucune règle ne change. Effet visible : les 10 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 10 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--               ('3d1856ac-c0d8-43ad-a7c7-a3c40c3201d3'::uuid),
--               ('89698b69-cb9a-4cc7-bed2-00e5aa0a0f5b'::uuid),
--               ('b0740746-2ee5-4812-81b6-69cdf90d529e'::uuid),
--               ('d1fc9daa-1dc9-4e3b-9b99-ec50943c25a8'::uuid),
--               ('c25f80f0-d9d3-4323-a07e-9ee96f2fa138'::uuid),
--               ('4954edb5-588e-41ed-8801-8165f83ec001'::uuid),
--               ('8c90be06-d281-4020-b607-2958767b0313'::uuid),
--               ('e05931f9-cbcb-481e-9c46-0835e7635fd1'::uuid),
--               ('91805d1e-10ea-40ed-ab39-8a55c576d27e'::uuid),
--               ('52206066-8c93-4538-99e8-4cfd7fc1c689'::uuid))
--  as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('3d1856ac-c0d8-43ad-a7c7-a3c40c3201d3'::uuid, 'CE2-016'),
-- 	('89698b69-cb9a-4cc7-bed2-00e5aa0a0f5b'::uuid, 'CE2-090'),
-- 	('b0740746-2ee5-4812-81b6-69cdf90d529e'::uuid, 'CE2-090'),
-- 	('d1fc9daa-1dc9-4e3b-9b99-ec50943c25a8'::uuid, 'CE2-019'),
-- 	('c25f80f0-d9d3-4323-a07e-9ee96f2fa138'::uuid, 'CE2-019'),
-- 	('4954edb5-588e-41ed-8801-8165f83ec001'::uuid, 'CE2-055'),
-- 	('8c90be06-d281-4020-b607-2958767b0313'::uuid, 'CE2-056'),
-- 	('e05931f9-cbcb-481e-9c46-0835e7635fd1'::uuid, 'CE2-054'),
-- 	('91805d1e-10ea-40ed-ab39-8a55c576d27e'::uuid, 'CE2-080'),
-- 	('52206066-8c93-4538-99e8-4cfd7fc1c689'::uuid, 'CE2-080')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CE2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '3d1856ac-c0d8-43ad-a7c7-a3c40c3201d3',
--               '89698b69-cb9a-4cc7-bed2-00e5aa0a0f5b',
--               'b0740746-2ee5-4812-81b6-69cdf90d529e',
--               'd1fc9daa-1dc9-4e3b-9b99-ec50943c25a8',
--               'c25f80f0-d9d3-4323-a07e-9ee96f2fa138',
--               '4954edb5-588e-41ed-8801-8165f83ec001',
--               '8c90be06-d281-4020-b607-2958767b0313',
--               'e05931f9-cbcb-481e-9c46-0835e7635fd1',
--               '91805d1e-10ea-40ed-ab39-8a55c576d27e',
--               '52206066-8c93-4538-99e8-4cfd7fc1c689');
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
	('3d1856ac-c0d8-43ad-a7c7-a3c40c3201d3', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul posé', 'CE2-016'),
	('89698b69-cb9a-4cc7-bed2-00e5aa0a0f5b', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul posé', 'CE2-090'),
	('b0740746-2ee5-4812-81b6-69cdf90d529e', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul posé', 'CE2-090'),
	('d1fc9daa-1dc9-4e3b-9b99-ec50943c25a8', 'Nombres et calculs', 'Entiers : multiplication', 'calcul posé', 'CE2-019'),
	('c25f80f0-d9d3-4323-a07e-9ee96f2fa138', 'Nombres et calculs', 'Entiers : multiplication', 'calcul posé', 'CE2-019'),
	('4954edb5-588e-41ed-8801-8165f83ec001', 'Grandeurs et mesures', 'Monnaie', 'euros et centimes', 'CE2-055'),
	('8c90be06-d281-4020-b607-2958767b0313', 'Grandeurs et mesures', 'Monnaie', 'euros et centimes', 'CE2-056'),
	('e05931f9-cbcb-481e-9c46-0835e7635fd1', 'Grandeurs et mesures', 'Monnaie', 'pièces et billets', 'CE2-054'),
	('91805d1e-10ea-40ed-ab39-8a55c576d27e', 'Grandeurs et mesures', 'Monnaie', 'rendre la monnaie', 'CE2-080'),
	('52206066-8c93-4538-99e8-4cfd7fc1c689', 'Grandeurs et mesures', 'Monnaie', 'rendre la monnaie', 'CE2-080');

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
 where p.grade = 'CE2' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
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
