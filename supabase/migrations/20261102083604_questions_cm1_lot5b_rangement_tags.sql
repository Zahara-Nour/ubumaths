-- ============================================================================
-- Chantier « questions-cm1 », lot 5b (masses et contenances) : nœud et tag de 10 modèles neufs
-- ============================================================================
--   - 8f48ef70 (Les unités de masse, du milligramme à la tonne) → CM1-076, sur « Grandeurs et mesures > Masses > unités et conversions » ;
--   - 1be3eee7 (Relations entre les unités de masse) → CM1-077, sur « Grandeurs et mesures > Masses > unités et conversions » ;
--   - 97781d22 (Quelle unité pour peser un objet ?) → CM1-078, sur « Grandeurs et mesures > Masses > unités et conversions » ;
--   - dceea553 (Comparer des masses d'unités différentes) → CM1-079, sur « Grandeurs et mesures > Masses > comparaison et mesure » ;
--   - db4e32ba (Des masses de référence, du milligramme à la tonne) → CM1-080, sur « Grandeurs et mesures > Masses > comparaison et mesure » ;
--   - 5ecdc120 (Estimer une masse, du milligramme à la tonne) → CM1-081, sur « Grandeurs et mesures > Masses > comparaison et mesure » ;
--   - 4b628efa (Les unités de contenance, du millilitre à l'hectolitre) → CM1-082, sur « Grandeurs et mesures > Contenances > unités et conversions » ;
--   - e297293d (Relations entre les unités de contenance) → CM1-083, sur « Grandeurs et mesures > Contenances > unités et conversions » ;
--   - 64a2c3f6 (Quelle unité pour mesurer une contenance ?) → CM1-084, sur « Grandeurs et mesures > Contenances > unités et conversions » ;
--   - 5a476fc4 (Comparer des contenances d'unités différentes) → CM1-085, sur « Grandeurs et mesures > Contenances > comparaison et mesure » ;
-- Chaque modèle va sur la SOUS-NOTION de son point et porte CE point, un seul (ADR 0020).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-02 (journal docs/wip/questions-cm1-progress.md § 14, 14 bis,
-- et 14 septies pour les deux écarts confirmés le 2026-11-02). Les modèles ont été créés en
-- brouillon le 2026-11-02 par scripts/create-questions.ts
-- (scripts/questions/cm1-5b/, PR #2216), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-02 (MCP) : 10 brouillons [CM1], sans nœud ni tag ; 076-078 et 082-084 sur « Masses » et
-- « Contenances › unités et conversions », 079-081 et 085 sur « … › comparaison et mesure ».
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (10 modèles). Elle est prouvée par
-- tests/integration/questions-cm1-lot5b-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-02), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT ; le point doit être sur ce nœud.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David AVANT le SQL, tranchée par
-- lui le 2026-11-02 : personne, journal § 14 et 14 bis). Aucune règle ne change. Effet visible : les 10
-- brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient
-- qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 10 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('8f48ef70-8e7a-444b-9a23-0e4418762332'::uuid),
--                ('1be3eee7-337c-4ffb-b848-ee06bee78def'::uuid),
--                ('97781d22-6653-4f45-af32-e861bf0206a5'::uuid),
--                ('dceea553-c857-4f51-8246-5eadf2ae2e05'::uuid),
--                ('db4e32ba-5c83-43ec-b6b9-0bcb8fdf65f0'::uuid),
--                ('5ecdc120-01b2-401b-b729-f5f628cadd35'::uuid),
--                ('4b628efa-0b6d-42b7-bbc1-3bf2aafcf897'::uuid),
--                ('e297293d-41fd-4c8d-94de-be0e4e377756'::uuid),
--                ('64a2c3f6-ea43-4219-b71e-66be169c20b7'::uuid),
--                ('5a476fc4-e9ce-4b9b-9626-4f31ee7ab1ee'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('8f48ef70-8e7a-444b-9a23-0e4418762332'::uuid, 'CM1-076'),
-- 	('1be3eee7-337c-4ffb-b848-ee06bee78def'::uuid, 'CM1-077'),
-- 	('97781d22-6653-4f45-af32-e861bf0206a5'::uuid, 'CM1-078'),
-- 	('dceea553-c857-4f51-8246-5eadf2ae2e05'::uuid, 'CM1-079'),
-- 	('db4e32ba-5c83-43ec-b6b9-0bcb8fdf65f0'::uuid, 'CM1-080'),
-- 	('5ecdc120-01b2-401b-b729-f5f628cadd35'::uuid, 'CM1-081'),
-- 	('4b628efa-0b6d-42b7-bbc1-3bf2aafcf897'::uuid, 'CM1-082'),
-- 	('e297293d-41fd-4c8d-94de-be0e4e377756'::uuid, 'CM1-083'),
-- 	('64a2c3f6-ea43-4219-b71e-66be169c20b7'::uuid, 'CM1-084'),
-- 	('5a476fc4-e9ce-4b9b-9626-4f31ee7ab1ee'::uuid, 'CM1-085')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CM1' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('8f48ef70-8e7a-444b-9a23-0e4418762332',
--               '1be3eee7-337c-4ffb-b848-ee06bee78def',
--               '97781d22-6653-4f45-af32-e861bf0206a5',
--               'dceea553-c857-4f51-8246-5eadf2ae2e05',
--               'db4e32ba-5c83-43ec-b6b9-0bcb8fdf65f0',
--               '5ecdc120-01b2-401b-b729-f5f628cadd35',
--               '4b628efa-0b6d-42b7-bbc1-3bf2aafcf897',
--               'e297293d-41fd-4c8d-94de-be0e4e377756',
--               '64a2c3f6-ea43-4219-b71e-66be169c20b7',
--               '5a476fc4-e9ce-4b9b-9626-4f31ee7ab1ee');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qcm1l5b_modeles;
create temporary table _qcm1l5b_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qcm1l5b_modeles values
	('8f48ef70-8e7a-444b-9a23-0e4418762332', 'Grandeurs et mesures', 'Masses', 'unités et conversions', 'CM1-076'),
	('1be3eee7-337c-4ffb-b848-ee06bee78def', 'Grandeurs et mesures', 'Masses', 'unités et conversions', 'CM1-077'),
	('97781d22-6653-4f45-af32-e861bf0206a5', 'Grandeurs et mesures', 'Masses', 'unités et conversions', 'CM1-078'),
	('dceea553-c857-4f51-8246-5eadf2ae2e05', 'Grandeurs et mesures', 'Masses', 'comparaison et mesure', 'CM1-079'),
	('db4e32ba-5c83-43ec-b6b9-0bcb8fdf65f0', 'Grandeurs et mesures', 'Masses', 'comparaison et mesure', 'CM1-080'),
	('5ecdc120-01b2-401b-b729-f5f628cadd35', 'Grandeurs et mesures', 'Masses', 'comparaison et mesure', 'CM1-081'),
	('4b628efa-0b6d-42b7-bbc1-3bf2aafcf897', 'Grandeurs et mesures', 'Contenances', 'unités et conversions', 'CM1-082'),
	('e297293d-41fd-4c8d-94de-be0e4e377756', 'Grandeurs et mesures', 'Contenances', 'unités et conversions', 'CM1-083'),
	('64a2c3f6-ea43-4219-b71e-66be169c20b7', 'Grandeurs et mesures', 'Contenances', 'unités et conversions', 'CM1-084'),
	('5a476fc4-e9ce-4b9b-9626-4f31ee7ab1ee', 'Grandeurs et mesures', 'Contenances', 'comparaison et mesure', 'CM1-085');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm1l5b_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm1l5b_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée
alter table _qcm1l5b_modeles add column noeud uuid, add column point_id uuid;
update _qcm1l5b_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qcm1l5b_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
-- Le point est sur le nœud du modèle
update _qcm1l5b_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CM1' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qcm1l5b_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qcm1l5b_modeles where noeud is null),
			(select count(*) from _qcm1l5b_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm1l5b_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 10) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 10', v_presents;
	end if;
	select count(*) into v_ranges from _qcm1l5b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcm1l5b_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qcm1l5b_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qcm1l5b_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm1l5b_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm1l5b_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qcm1l5b_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm1l5b_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qcm1l5b_modeles;
