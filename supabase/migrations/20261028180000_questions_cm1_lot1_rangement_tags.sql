-- ============================================================================
-- Chantier « questions-cm1 », lot 1 (calcul mental) : nœud et tag de 9 modèles neufs
-- ============================================================================
--   - 01729e6e (Ajouter 8, 9, 18… 39) → CM1-043, sur « Nombres et calculs > Entiers : addition et soustraction > calcul astucieux » ;
--   - 2d58ce54 (Relations entre fractions usuelles) → CM1-037, sur « Nombres et calculs > Fractions : sens et écritures > égalité de fractions » ;
--   - 50a9d91c (Tables de multiplication) → CM1-036, sur « Nombres et calculs > Entiers : multiplication > tables » ;
--   - 57cc0fca (Multiplier par 5) → CM1-046, sur « Nombres et calculs > Entiers : multiplication > calcul astucieux » ;
--   - 8fee3492 (Tables d'addition) → CM1-035, sur « Nombres et calculs > Entiers : addition et soustraction > tables » ;
--   - 9db49362 (Multiplier par 8) → CM1-164, sur « Nombres et calculs > Entiers : multiplication > calcul astucieux » ;
--   - b6b1cae5 (Soustraire 8, 9, 18… 39) → CM1-163, sur « Nombres et calculs > Entiers : addition et soustraction > calcul astucieux » ;
--   - f24bb468 (Trouver le terme manquant) → CM1-161, sur « Nombres et calculs > Entiers : addition et soustraction > tables » ;
--   - f91a2d8e (1/10 et 1/100 en écriture décimale) → CM1-038, sur « Nombres et calculs > Fractions : sens et écritures > forme décimale » ;
-- Chaque modèle va sur la SOUS-NOTION de son point (question_template_points_check_rules refuse
-- un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-10-28 (journal docs/wip/questions-cm1-progress.md § 7 bis). Les
-- modèles ont été créés en brouillon le 2026-10-28 par scripts/create-questions.ts
-- (scripts/questions/cm1-1/, § 7 quater), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-10-28 (MCP) : 9 brouillons [CM1], sans nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (9 modèles). Elle est prouvée par
-- tests/integration/questions-cm1-lot1-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-28), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David AVANT le SQL, tranchée par
-- lui le 2026-10-28 : personne, journal § 7). Aucune règle ne change. Effet visible : les 9
-- brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient
-- qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 9 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('01729e6e-7fe0-4708-a130-236faf9bd1f3'::uuid),
--                ('2d58ce54-26d3-407a-a0d6-05281d543169'::uuid),
--                ('50a9d91c-9647-4b98-bec1-5a7b939e3180'::uuid),
--                ('57cc0fca-d299-4dbd-a20b-dd4c60d6893c'::uuid),
--                ('8fee3492-87df-4227-a6f5-77d70a715b77'::uuid),
--                ('9db49362-f770-4b90-9775-a4d9dc58ad11'::uuid),
--                ('b6b1cae5-f2a2-40c3-996b-b5e2e22aaf21'::uuid),
--                ('f24bb468-6194-4dfa-b9b8-3eeb29086adc'::uuid),
--                ('f91a2d8e-a649-45c9-a5d7-4ae61a9cb04f'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('01729e6e-7fe0-4708-a130-236faf9bd1f3'::uuid, 'CM1-043'),
-- 	('2d58ce54-26d3-407a-a0d6-05281d543169'::uuid, 'CM1-037'),
-- 	('50a9d91c-9647-4b98-bec1-5a7b939e3180'::uuid, 'CM1-036'),
-- 	('57cc0fca-d299-4dbd-a20b-dd4c60d6893c'::uuid, 'CM1-046'),
-- 	('8fee3492-87df-4227-a6f5-77d70a715b77'::uuid, 'CM1-035'),
-- 	('9db49362-f770-4b90-9775-a4d9dc58ad11'::uuid, 'CM1-164'),
-- 	('b6b1cae5-f2a2-40c3-996b-b5e2e22aaf21'::uuid, 'CM1-163'),
-- 	('f24bb468-6194-4dfa-b9b8-3eeb29086adc'::uuid, 'CM1-161'),
-- 	('f91a2d8e-a649-45c9-a5d7-4ae61a9cb04f'::uuid, 'CM1-038')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CM1' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('01729e6e-7fe0-4708-a130-236faf9bd1f3',
--               '2d58ce54-26d3-407a-a0d6-05281d543169',
--               '50a9d91c-9647-4b98-bec1-5a7b939e3180',
--               '57cc0fca-d299-4dbd-a20b-dd4c60d6893c',
--               '8fee3492-87df-4227-a6f5-77d70a715b77',
--               '9db49362-f770-4b90-9775-a4d9dc58ad11',
--               'b6b1cae5-f2a2-40c3-996b-b5e2e22aaf21',
--               'f24bb468-6194-4dfa-b9b8-3eeb29086adc',
--               'f91a2d8e-a649-45c9-a5d7-4ae61a9cb04f');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qcm1l1_modeles;
create temporary table _qcm1l1_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qcm1l1_modeles values
	('01729e6e-7fe0-4708-a130-236faf9bd1f3', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux', 'CM1-043'),
	('2d58ce54-26d3-407a-a0d6-05281d543169', 'Nombres et calculs', 'Fractions : sens et écritures', 'égalité de fractions', 'CM1-037'),
	('50a9d91c-9647-4b98-bec1-5a7b939e3180', 'Nombres et calculs', 'Entiers : multiplication', 'tables', 'CM1-036'),
	('57cc0fca-d299-4dbd-a20b-dd4c60d6893c', 'Nombres et calculs', 'Entiers : multiplication', 'calcul astucieux', 'CM1-046'),
	('8fee3492-87df-4227-a6f5-77d70a715b77', 'Nombres et calculs', 'Entiers : addition et soustraction', 'tables', 'CM1-035'),
	('9db49362-f770-4b90-9775-a4d9dc58ad11', 'Nombres et calculs', 'Entiers : multiplication', 'calcul astucieux', 'CM1-164'),
	('b6b1cae5-f2a2-40c3-996b-b5e2e22aaf21', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux', 'CM1-163'),
	('f24bb468-6194-4dfa-b9b8-3eeb29086adc', 'Nombres et calculs', 'Entiers : addition et soustraction', 'tables', 'CM1-161'),
	('f91a2d8e-a649-45c9-a5d7-4ae61a9cb04f', 'Nombres et calculs', 'Fractions : sens et écritures', 'forme décimale', 'CM1-038');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm1l1_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm1l1_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qcm1l1_modeles add column noeud uuid, add column point_id uuid;
update _qcm1l1_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qcm1l1_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qcm1l1_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CM1' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qcm1l1_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qcm1l1_modeles where noeud is null),
			(select count(*) from _qcm1l1_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm1l1_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 9) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 9', v_presents;
	end if;
	select count(*) into v_ranges from _qcm1l1_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcm1l1_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qcm1l1_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qcm1l1_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm1l1_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm1l1_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qcm1l1_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm1l1_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qcm1l1_modeles;
