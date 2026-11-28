-- ============================================================================
-- Chantier « questions-cm2 », lot 13 (aires) : nœud et tag de 5 modèles neufs
-- ============================================================================
--   - 087df1a4 (Choisir l'unité d'aire) → CM2-073, sur « Grandeurs et mesures > Aires > unités et conversions » ;
--   - 302c7dcd (Convertir des aires) → CM2-074, sur « Grandeurs et mesures > Aires > unités et conversions » ;
--   - 6243c462 (Aire d'un carré) → CM2-075, sur « Grandeurs et mesures > Aires > carré » ;
--   - d2e2f75d (Aire d'un rectangle) → CM2-120, sur « Grandeurs et mesures > Aires > rectangle » ;
--   - 678a72a7 (Encadrer l'aire d'une figure arrondie) → CM2-072, sur « Grandeurs et mesures > Aires > aires sur quadrillage » ;
-- Chaque modèle va sur la sous-notion de son point ; CM2-072 est posé sur la notion « Aires » :
-- le modèle va sur sa sous-notion « aires sur quadrillage », comme le modèle CM1 + CM2 `31d64c00`
-- du même point. Chaque modèle porte UN point (ADR 0020 : au plus un point par programme) ;
-- question_template_points_check_rules refuse un tag hors du nœud du modèle ou de sa notion.
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-19 (journal docs/wip/questions-cm2-progress.md § 20 et 20.1).
-- Les modèles ont été créés en brouillon le 2026-11-19 par scripts/create-questions.ts
-- (scripts/questions/cm2-13/, PR #2877), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-19 (MCP) : 5 brouillons [CM2], sans nœud ni tag, `updated_at` = création. Les modèles CM1,
-- 6e et 5e des mêmes nœuds ne sont PAS touchés.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (5 modèles). Elle est prouvée par
-- tests/integration/questions-cm2-lot13-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-19), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David AVANT le SQL, en phase 0,
-- tranchée par lui le 2026-11-19 : personne, journal § 20 et 20.1). Aucune règle ne change. Effet visible : les 5
-- brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient
-- qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 5 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('087df1a4-6e57-4121-930d-e08c744220c4'::uuid),
--                ('302c7dcd-0a6e-4e9f-bc98-5abe4166c19d'::uuid),
--                ('6243c462-ef78-41c1-8f24-b5545d06fda3'::uuid),
--                ('d2e2f75d-dc9b-4494-a4f7-911e1ebb71cf'::uuid),
--                ('678a72a7-2a8d-4240-819f-03d5283540ed'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('087df1a4-6e57-4121-930d-e08c744220c4'::uuid, 'CM2-073'),
-- 	('302c7dcd-0a6e-4e9f-bc98-5abe4166c19d'::uuid, 'CM2-074'),
-- 	('6243c462-ef78-41c1-8f24-b5545d06fda3'::uuid, 'CM2-075'),
-- 	('d2e2f75d-dc9b-4494-a4f7-911e1ebb71cf'::uuid, 'CM2-120'),
-- 	('678a72a7-2a8d-4240-819f-03d5283540ed'::uuid, 'CM2-072')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CM2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('087df1a4-6e57-4121-930d-e08c744220c4',
--               '302c7dcd-0a6e-4e9f-bc98-5abe4166c19d',
--               '6243c462-ef78-41c1-8f24-b5545d06fda3',
--               'd2e2f75d-dc9b-4494-a4f7-911e1ebb71cf',
--               '678a72a7-2a8d-4240-819f-03d5283540ed');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qcm2l13_modeles;
create temporary table _qcm2l13_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qcm2l13_modeles values
	('087df1a4-6e57-4121-930d-e08c744220c4', 'Grandeurs et mesures', 'Aires', 'unités et conversions', 'CM2-073'),
	('302c7dcd-0a6e-4e9f-bc98-5abe4166c19d', 'Grandeurs et mesures', 'Aires', 'unités et conversions', 'CM2-074'),
	('6243c462-ef78-41c1-8f24-b5545d06fda3', 'Grandeurs et mesures', 'Aires', 'carré', 'CM2-075'),
	('d2e2f75d-dc9b-4494-a4f7-911e1ebb71cf', 'Grandeurs et mesures', 'Aires', 'rectangle', 'CM2-120'),
	('678a72a7-2a8d-4240-819f-03d5283540ed', 'Grandeurs et mesures', 'Aires', 'aires sur quadrillage', 'CM2-072');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm2l13_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm2l13_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée ; le point est sur ce nœud ou sur sa notion
alter table _qcm2l13_modeles add column noeud uuid, add column point_id uuid;
update _qcm2l13_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qcm2l13_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qcm2l13_modeles r set point_id = p.id
  from public.curriculum_points p, public.classification_nodes s
 where s.id = r.noeud and p.grade = 'CM2' and p.code = r.code and p.archived_at is null
   and (p.node_id = s.id or (s.kind = 'subnotion' and p.node_id = s.parent_id));
do $resolution$
begin
	if exists (select 1 from _qcm2l13_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qcm2l13_modeles where noeud is null),
			(select count(*) from _qcm2l13_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm2l13_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 5) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 5', v_presents;
	end if;
	select count(*) into v_ranges from _qcm2l13_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcm2l13_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qcm2l13_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qcm2l13_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm2l13_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm2l13_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qcm2l13_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm2l13_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qcm2l13_modeles;
