-- ============================================================================
-- Chantier « questions-cm1 », lot 3b (fractions décimales) : nœud et tag de 8 modèles neufs
-- ============================================================================
--   - 34c58018 (Encadrer une fraction décimale par deux entiers) → CM1-152, sur « Nombres et calculs > Fractions : sens et écritures > ordre » ;
--   - 36507fc9 (Lire et écrire une fraction décimale) → CM1-023, sur « Nombres et calculs > Fractions : sens et écritures > définition » ;
--   - 53031438 (Comparer deux fractions décimales) → CM1-028, sur « Nombres et calculs > Fractions : sens et écritures > ordre » ;
--   - 5b038fc8 (Placer une fraction décimale sur une demi-droite graduée) → CM1-025, sur « Nombres et calculs > Fractions : sens et écritures > droite graduée » ;
--   - 6de4ad5b (Repérer un point par une fraction décimale) → CM1-151, sur « Nombres et calculs > Fractions : sens et écritures > droite graduée » ;
--   - 6faa64d0 (Décomposer une fraction décimale) → CM1-027, sur « Nombres et calculs > Fractions : sens et écritures > décomposition » ;
--   - 7ed61c5f (Intercaler une fraction décimale) → CM1-153, sur « Nombres et calculs > Fractions : sens et écritures > ordre » ;
--   - 85e4d251 (Ranger des fractions décimales) → CM1-029, sur « Nombres et calculs > Fractions : sens et écritures > ordre » ;
-- Chaque modèle va sur la SOUS-NOTION de son point (question_template_points_check_rules refuse
-- un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-10-30 (journal docs/wip/questions-cm1-progress.md § 10 bis). Les
-- modèles ont été créés en brouillon le 2026-10-31 par scripts/create-questions.ts
-- (scripts/questions/cm1-3b/, PR #2043), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-10-31 (MCP) : 8 brouillons [CM1], sans nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (8 modèles). Elle est prouvée par
-- tests/integration/questions-cm1-lot3b-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-31), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David AVANT le SQL, tranchée par
-- lui le 2026-10-30 : personne, journal § 10 et 10 bis). Aucune règle ne change. Effet visible : les 8
-- brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient
-- qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 8 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('34c58018-b588-4c93-85fb-40eb94879cfb'::uuid),
--                ('36507fc9-df87-46a4-865d-aec7935580c3'::uuid),
--                ('53031438-c180-484b-834c-a29913b25a0f'::uuid),
--                ('5b038fc8-226f-4307-8609-27d87e5f7608'::uuid),
--                ('6de4ad5b-49a4-44a5-9b3f-062797fbefab'::uuid),
--                ('6faa64d0-6b77-41f6-930d-f12549e69e2c'::uuid),
--                ('7ed61c5f-dd82-4a78-8251-621e01138ebb'::uuid),
--                ('85e4d251-8685-461e-9dff-255580999725'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('34c58018-b588-4c93-85fb-40eb94879cfb'::uuid, 'CM1-152'),
-- 	('36507fc9-df87-46a4-865d-aec7935580c3'::uuid, 'CM1-023'),
-- 	('53031438-c180-484b-834c-a29913b25a0f'::uuid, 'CM1-028'),
-- 	('5b038fc8-226f-4307-8609-27d87e5f7608'::uuid, 'CM1-025'),
-- 	('6de4ad5b-49a4-44a5-9b3f-062797fbefab'::uuid, 'CM1-151'),
-- 	('6faa64d0-6b77-41f6-930d-f12549e69e2c'::uuid, 'CM1-027'),
-- 	('7ed61c5f-dd82-4a78-8251-621e01138ebb'::uuid, 'CM1-153'),
-- 	('85e4d251-8685-461e-9dff-255580999725'::uuid, 'CM1-029')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CM1' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('34c58018-b588-4c93-85fb-40eb94879cfb',
--               '36507fc9-df87-46a4-865d-aec7935580c3',
--               '53031438-c180-484b-834c-a29913b25a0f',
--               '5b038fc8-226f-4307-8609-27d87e5f7608',
--               '6de4ad5b-49a4-44a5-9b3f-062797fbefab',
--               '6faa64d0-6b77-41f6-930d-f12549e69e2c',
--               '7ed61c5f-dd82-4a78-8251-621e01138ebb',
--               '85e4d251-8685-461e-9dff-255580999725');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qcm1l3b_modeles;
create temporary table _qcm1l3b_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qcm1l3b_modeles values
	('34c58018-b588-4c93-85fb-40eb94879cfb', 'Nombres et calculs', 'Fractions : sens et écritures', 'ordre', 'CM1-152'),
	('36507fc9-df87-46a4-865d-aec7935580c3', 'Nombres et calculs', 'Fractions : sens et écritures', 'définition', 'CM1-023'),
	('53031438-c180-484b-834c-a29913b25a0f', 'Nombres et calculs', 'Fractions : sens et écritures', 'ordre', 'CM1-028'),
	('5b038fc8-226f-4307-8609-27d87e5f7608', 'Nombres et calculs', 'Fractions : sens et écritures', 'droite graduée', 'CM1-025'),
	('6de4ad5b-49a4-44a5-9b3f-062797fbefab', 'Nombres et calculs', 'Fractions : sens et écritures', 'droite graduée', 'CM1-151'),
	('6faa64d0-6b77-41f6-930d-f12549e69e2c', 'Nombres et calculs', 'Fractions : sens et écritures', 'décomposition', 'CM1-027'),
	('7ed61c5f-dd82-4a78-8251-621e01138ebb', 'Nombres et calculs', 'Fractions : sens et écritures', 'ordre', 'CM1-153'),
	('85e4d251-8685-461e-9dff-255580999725', 'Nombres et calculs', 'Fractions : sens et écritures', 'ordre', 'CM1-029');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm1l3b_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm1l3b_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qcm1l3b_modeles add column noeud uuid, add column point_id uuid;
update _qcm1l3b_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qcm1l3b_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qcm1l3b_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CM1' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qcm1l3b_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qcm1l3b_modeles where noeud is null),
			(select count(*) from _qcm1l3b_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm1l3b_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 8) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 8', v_presents;
	end if;
	select count(*) into v_ranges from _qcm1l3b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcm1l3b_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qcm1l3b_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qcm1l3b_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm1l3b_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm1l3b_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qcm1l3b_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm1l3b_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qcm1l3b_modeles;
