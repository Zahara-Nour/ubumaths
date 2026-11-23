-- ============================================================================
-- Chantier « questions-ce1 », lot 8 (monnaie) : nœud et tag de 6 modèles neufs
-- ============================================================================
--   - 3fa7e2b5 (Combien d'argent ? Euros et centimes) → CE1-055, sur « Grandeurs et mesures > Monnaie > pièces et billets » ;
--   - 0942f96a (Qui a le plus d'argent ? Euros et centimes) → CE1-054, sur « Grandeurs et mesures > Monnaie > pièces et billets » ;
--   - 463d8266 (Pose la somme en euros et centimes) → CE1-056, sur « Grandeurs et mesures > Monnaie > pièces et billets » ;
--   - 4cd0d93f (Paie tes achats en euros et centimes) → CE1-057, sur « Grandeurs et mesures > Monnaie > pièces et billets » ;
--   - 3c9711f9 (Combien le marchand rend-il ? Euros et centimes) → CE1-086, sur « Grandeurs et mesures > Monnaie > rendre la monnaie » ;
--   - 19d80fc9 (Rends la monnaie en euros et centimes) → CE1-086, sur « Grandeurs et mesures > Monnaie > rendre la monnaie ».
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-01 (journal docs/wip/questions-ce1-progress.md § 15). Les modèles
-- ont été créés en brouillon le 2026-11-01 par scripts/create-questions.ts
-- (scripts/questions/ce1-8/, lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée par
-- tests/integration/questions-ce1-lot8-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-01, après la création),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-11-01 en phase 0 (§ 15), AVANT le SQL, tranchée par lui le 2026-11-01 : personne).
-- Aucune règle ne change. Effet visible : les 6 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('3fa7e2b5-43f8-4f74-bc91-ebb7840e816c'::uuid),
--               ('0942f96a-ee04-4c46-a480-b270826f002c'::uuid),
--               ('463d8266-b02f-4af6-98f6-25274c6e257d'::uuid),
--               ('4cd0d93f-9273-45ea-89b1-b7523c390306'::uuid),
--               ('3c9711f9-90e7-49f5-a1c1-4537bfe0fe41'::uuid),
--               ('19d80fc9-0d50-4dee-9ae8-b2ac4a42dece'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('3fa7e2b5-43f8-4f74-bc91-ebb7840e816c'::uuid, 'CE1-055'),
-- 	('0942f96a-ee04-4c46-a480-b270826f002c'::uuid, 'CE1-054'),
-- 	('463d8266-b02f-4af6-98f6-25274c6e257d'::uuid, 'CE1-056'),
-- 	('4cd0d93f-9273-45ea-89b1-b7523c390306'::uuid, 'CE1-057'),
-- 	('3c9711f9-90e7-49f5-a1c1-4537bfe0fe41'::uuid, 'CE1-086'),
-- 	('19d80fc9-0d50-4dee-9ae8-b2ac4a42dece'::uuid, 'CE1-086')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CE1' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('3fa7e2b5-43f8-4f74-bc91-ebb7840e816c',
--               '0942f96a-ee04-4c46-a480-b270826f002c',
--               '463d8266-b02f-4af6-98f6-25274c6e257d',
--               '4cd0d93f-9273-45ea-89b1-b7523c390306',
--               '3c9711f9-90e7-49f5-a1c1-4537bfe0fe41',
--               '19d80fc9-0d50-4dee-9ae8-b2ac4a42dece');
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
	('3fa7e2b5-43f8-4f74-bc91-ebb7840e816c', 'Grandeurs et mesures', 'Monnaie', 'pièces et billets', 'CE1-055'),
	('0942f96a-ee04-4c46-a480-b270826f002c', 'Grandeurs et mesures', 'Monnaie', 'pièces et billets', 'CE1-054'),
	('463d8266-b02f-4af6-98f6-25274c6e257d', 'Grandeurs et mesures', 'Monnaie', 'pièces et billets', 'CE1-056'),
	('4cd0d93f-9273-45ea-89b1-b7523c390306', 'Grandeurs et mesures', 'Monnaie', 'pièces et billets', 'CE1-057'),
	('3c9711f9-90e7-49f5-a1c1-4537bfe0fe41', 'Grandeurs et mesures', 'Monnaie', 'rendre la monnaie', 'CE1-086'),
	('19d80fc9-0d50-4dee-9ae8-b2ac4a42dece', 'Grandeurs et mesures', 'Monnaie', 'rendre la monnaie', 'CE1-086');

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
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
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
