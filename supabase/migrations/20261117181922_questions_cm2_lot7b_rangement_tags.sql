-- ============================================================================
-- Chantier « questions-cm2 », lot 7b (droites graduées, fractions décimales et décimaux) : nœud et tag de 4 modèles neufs
-- ============================================================================
--   - 03c5df14 (Placer un nombre décimal sur une demi-droite graduée) → CM2-032, sur « Nombres et calculs > Décimaux : numération > droite graduée » ;
--   - 4a2edffb (Repérer un point par un nombre décimal) → CM2-144, sur « Nombres et calculs > Décimaux : numération > droite graduée » ;
--   - 521c3f16 (Placer une fraction décimale sur une demi-droite graduée) → CM2-025, sur « Nombres et calculs > Fractions : sens et écritures > droite graduée » ;
--   - b432b38e (Repérer un point par une fraction décimale) → CM2-138, sur « Nombres et calculs > Fractions : sens et écritures > droite graduée » ;
-- Chaque modèle va sur la SOUS-NOTION de son point (question_template_points_check_rules refuse
-- un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-02 (journal docs/wip/questions-cm2-progress.md § 12 et 12.1).
-- Les modèles ont été créés en brouillon le 2026-11-17 par scripts/create-questions.ts
-- (scripts/questions/cm2-7b/, PR #2236), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-17 (MCP) : 4 brouillons [CM2], sans nœud ni tag. Leurs jumeaux CM1 de même titre
-- (6de4ad5b, 5b038fc8, 06f246e4, 3560dded) ne sont PAS touchés.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (4 modèles). Elle est prouvée par
-- tests/integration/questions-cm2-lot7b-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-17), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David AVANT le SQL, en phase 0,
-- tranchée par lui le 2026-11-02 : personne, journal § 12 et 12.1). Aucune règle ne change. Effet visible : les 4
-- brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient
-- qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 4 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('03c5df14-02d1-4069-81bc-f5e3ac4eba96'::uuid),
--                ('4a2edffb-8237-4dee-8308-2f45261a33bd'::uuid),
--                ('521c3f16-383c-4fbd-8ed3-0982af61c6c0'::uuid),
--                ('b432b38e-520a-4ff7-8a64-6bbb6accd5bb'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('03c5df14-02d1-4069-81bc-f5e3ac4eba96'::uuid, 'CM2-032'),
-- 	('4a2edffb-8237-4dee-8308-2f45261a33bd'::uuid, 'CM2-144'),
-- 	('521c3f16-383c-4fbd-8ed3-0982af61c6c0'::uuid, 'CM2-025'),
-- 	('b432b38e-520a-4ff7-8a64-6bbb6accd5bb'::uuid, 'CM2-138')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CM2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('03c5df14-02d1-4069-81bc-f5e3ac4eba96',
--               '4a2edffb-8237-4dee-8308-2f45261a33bd',
--               '521c3f16-383c-4fbd-8ed3-0982af61c6c0',
--               'b432b38e-520a-4ff7-8a64-6bbb6accd5bb');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qcm2l7b_modeles;
create temporary table _qcm2l7b_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qcm2l7b_modeles values
	('03c5df14-02d1-4069-81bc-f5e3ac4eba96', 'Nombres et calculs', 'Décimaux : numération', 'droite graduée', 'CM2-032'),
	('4a2edffb-8237-4dee-8308-2f45261a33bd', 'Nombres et calculs', 'Décimaux : numération', 'droite graduée', 'CM2-144'),
	('521c3f16-383c-4fbd-8ed3-0982af61c6c0', 'Nombres et calculs', 'Fractions : sens et écritures', 'droite graduée', 'CM2-025'),
	('b432b38e-520a-4ff7-8a64-6bbb6accd5bb', 'Nombres et calculs', 'Fractions : sens et écritures', 'droite graduée', 'CM2-138');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm2l7b_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm2l7b_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qcm2l7b_modeles add column noeud uuid, add column point_id uuid;
update _qcm2l7b_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qcm2l7b_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qcm2l7b_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CM2' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qcm2l7b_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qcm2l7b_modeles where noeud is null),
			(select count(*) from _qcm2l7b_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm2l7b_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 4) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 4', v_presents;
	end if;
	select count(*) into v_ranges from _qcm2l7b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcm2l7b_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qcm2l7b_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qcm2l7b_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm2l7b_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm2l7b_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qcm2l7b_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm2l7b_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qcm2l7b_modeles;
