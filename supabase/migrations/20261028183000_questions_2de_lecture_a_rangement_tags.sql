-- ============================================================================
-- Chantier « questions-2de », lot 2 bis A (lecture graphique) : nœud et tag de 8 modèles neufs
-- ============================================================================
--   - 08c059b8 (x² < k) → 2-462, sur « Fonctions > Fonction carré > x² = k, x² < k » ;
--   - 17809937 (antécédents) → 2-492, sur « Fonctions > Généralités sur les fonctions > images et antécédents » ;
--   - 406fd9a8 (f(x) = g(x)) → 2-338, sur « Fonctions > Généralités sur les fonctions > équations et inéquations f(x) = k » ;
--   - 7efd2e76 (f(x) < g(x)) → 2-453, sur « Fonctions > Généralités sur les fonctions > équations et inéquations f(x) = k » ;
--   - 9c4f6b4f (x² = k) → 2-341, sur « Fonctions > Fonction carré > x² = k, x² < k » ;
--   - a55ad3b4 (f(x) < k, affine) → 2-456, sur « Fonctions > Fonctions affines > équations » ;
--   - b807cc6c (|x| = k) → 2-340, sur « Fonctions > Fonction valeur absolue > équations et inéquations » ;
--   - cbf00ce7 (|x| < k) → 2-459, sur « Fonctions > Fonction valeur absolue > équations et inéquations » ;
-- Chaque modèle va sur le nœud de son point (notion ou sous-notion : question_template_points_check_rules
-- refuse un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-28 (journal docs/wip/questions-2de-progress.md § 11). Les modèles
-- ont été créés en brouillon le 2026-10-28 par scripts/create-questions.ts
-- (scripts/questions/2de-lecture-a/, lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (8 modèles). Elle est prouvée par
-- tests/integration/questions-2de-lecture-a-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-28), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-10-28 en phase 0 du
-- lot, AVANT le SQL, tranchée par lui le 2026-10-28 : personne). Aucune règle ne change. Effet
-- visible : les 8 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les
-- élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 8 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('08c059b8-2efc-483e-9a7d-cdb9d146c9f9'::uuid),
--                ('17809937-5109-4af9-87a6-988f33bb33fc'::uuid),
--                ('406fd9a8-ad71-4c24-ab35-5029ddc1b18b'::uuid),
--                ('7efd2e76-f27c-4b9c-b8f0-71dfa86265e2'::uuid),
--                ('9c4f6b4f-5ad7-4f63-9c6c-de8cb229d8ce'::uuid),
--                ('a55ad3b4-6013-455d-83a5-7ee32516c374'::uuid),
--                ('b807cc6c-a78e-4f28-94b1-afa99517d179'::uuid),
--                ('cbf00ce7-71c1-4bec-9dc8-7ae53972cbeb'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('08c059b8-2efc-483e-9a7d-cdb9d146c9f9'::uuid, '2-462'),
-- 	('17809937-5109-4af9-87a6-988f33bb33fc'::uuid, '2-492'),
-- 	('406fd9a8-ad71-4c24-ab35-5029ddc1b18b'::uuid, '2-338'),
-- 	('7efd2e76-f27c-4b9c-b8f0-71dfa86265e2'::uuid, '2-453'),
-- 	('9c4f6b4f-5ad7-4f63-9c6c-de8cb229d8ce'::uuid, '2-341'),
-- 	('a55ad3b4-6013-455d-83a5-7ee32516c374'::uuid, '2-456'),
-- 	('b807cc6c-a78e-4f28-94b1-afa99517d179'::uuid, '2-340'),
-- 	('cbf00ce7-71c1-4bec-9dc8-7ae53972cbeb'::uuid, '2-459')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '08c059b8-2efc-483e-9a7d-cdb9d146c9f9',
--               '17809937-5109-4af9-87a6-988f33bb33fc',
--               '406fd9a8-ad71-4c24-ab35-5029ddc1b18b',
--               '7efd2e76-f27c-4b9c-b8f0-71dfa86265e2',
--               '9c4f6b4f-5ad7-4f63-9c6c-de8cb229d8ce',
--               'a55ad3b4-6013-455d-83a5-7ee32516c374',
--               'b807cc6c-a78e-4f28-94b1-afa99517d179',
--               'cbf00ce7-71c1-4bec-9dc8-7ae53972cbeb');
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
	('08c059b8-2efc-483e-9a7d-cdb9d146c9f9', 'Fonctions', 'Fonction carré', 'x² = k, x² < k', '2-462'),
	('17809937-5109-4af9-87a6-988f33bb33fc', 'Fonctions', 'Généralités sur les fonctions', 'images et antécédents', '2-492'),
	('406fd9a8-ad71-4c24-ab35-5029ddc1b18b', 'Fonctions', 'Généralités sur les fonctions', 'équations et inéquations f(x) = k', '2-338'),
	('7efd2e76-f27c-4b9c-b8f0-71dfa86265e2', 'Fonctions', 'Généralités sur les fonctions', 'équations et inéquations f(x) = k', '2-453'),
	('9c4f6b4f-5ad7-4f63-9c6c-de8cb229d8ce', 'Fonctions', 'Fonction carré', 'x² = k, x² < k', '2-341'),
	('a55ad3b4-6013-455d-83a5-7ee32516c374', 'Fonctions', 'Fonctions affines', 'équations', '2-456'),
	('b807cc6c-a78e-4f28-94b1-afa99517d179', 'Fonctions', 'Fonction valeur absolue', 'équations et inéquations', '2-340'),
	('cbf00ce7-71c1-4bec-9dc8-7ae53972cbeb', 'Fonctions', 'Fonction valeur absolue', 'équations et inéquations', '2-459');

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
 where p.grade = '2' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
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
	if v_presents not in (0, 8) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 8', v_presents;
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
