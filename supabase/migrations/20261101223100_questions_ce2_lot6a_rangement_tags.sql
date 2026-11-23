-- ============================================================================
-- Chantier « questions-ce2 », lot 6a (longueurs et masses) : nœud et tag de 9 modèles neufs
-- ============================================================================
--   - 87e082e2 (Les unités de longueur : km, m, dm, cm, mm) → CE2-035, sur « Grandeurs et mesures > Longueurs > unités et conversions »;
--   - 0987f91b (Mètres, décimètres, centimètres et millimètres) → CE2-036, sur « Grandeurs et mesures > Longueurs > unités et conversions »;
--   - 7c31aa9a (Kilomètres et mètres) → CE2-036, sur « Grandeurs et mesures > Longueurs > unités et conversions »;
--   - adbbb55d (Quelle unité pour mesurer ?) → CE2-037, sur « Grandeurs et mesures > Longueurs > unités et conversions »;
--   - 7a493f49 (Comparer des longueurs) → CE2-038, sur « Grandeurs et mesures > Longueurs > comparaison et mesure »;
--   - f5edd7ef (Les unités de masse : g, kg, t) → CE2-045, sur « Grandeurs et mesures > Masses > unités et conversions »;
--   - 73cf4818 (Gramme, kilogramme ou tonne ?) → CE2-046, sur « Grandeurs et mesures > Masses > unités et conversions »;
--   - f4d95001 (Grammes, kilogrammes et tonnes) → CE2-047, sur « Grandeurs et mesures > Masses > unités et conversions »;
--   - 4e2fa156 (Comparer des masses) → CE2-048, sur « Grandeurs et mesures > Masses > comparaison et mesure ».
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-01 (journal docs/wip/questions-ce2-progress.md § 10). Les modèles
-- ont été créés en brouillon le 2026-11-01 par scripts/create-questions.ts
-- (scripts/questions/ce2-6a/, lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (9 modèles). Elle est prouvée par
-- tests/integration/questions-ce2-lot6a-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-01, après la création),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-11-01 en phase 0 (§ 10), AVANT le SQL, tranchée par lui le 2026-11-01 : personne).
-- Aucune règle ne change. Effet visible : les 9 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 9 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('87e082e2-958a-42d0-81c4-e95f9070918e'::uuid),
--               ('0987f91b-6714-4841-be27-71bfee87ccb3'::uuid),
--               ('7c31aa9a-9c57-40a1-8f22-87eb7b11eecd'::uuid),
--               ('adbbb55d-8859-45d9-b6b8-4a66cd4fe41c'::uuid),
--               ('7a493f49-fee5-4345-a5c6-043aea35471b'::uuid),
--               ('f5edd7ef-88c1-420a-8a29-39bee56a6114'::uuid),
--               ('73cf4818-56d6-4b4e-bac9-9b1c2ea13911'::uuid),
--               ('f4d95001-1193-47c5-a8e2-efb17d47be4d'::uuid),
--               ('4e2fa156-85cf-49ad-b839-d8f2d1fbecea'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('87e082e2-958a-42d0-81c4-e95f9070918e'::uuid, 'CE2-035'),
-- 	('0987f91b-6714-4841-be27-71bfee87ccb3'::uuid, 'CE2-036'),
-- 	('7c31aa9a-9c57-40a1-8f22-87eb7b11eecd'::uuid, 'CE2-036'),
-- 	('adbbb55d-8859-45d9-b6b8-4a66cd4fe41c'::uuid, 'CE2-037'),
-- 	('7a493f49-fee5-4345-a5c6-043aea35471b'::uuid, 'CE2-038'),
-- 	('f5edd7ef-88c1-420a-8a29-39bee56a6114'::uuid, 'CE2-045'),
-- 	('73cf4818-56d6-4b4e-bac9-9b1c2ea13911'::uuid, 'CE2-046'),
-- 	('f4d95001-1193-47c5-a8e2-efb17d47be4d'::uuid, 'CE2-047'),
-- 	('4e2fa156-85cf-49ad-b839-d8f2d1fbecea'::uuid, 'CE2-048')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CE2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('87e082e2-958a-42d0-81c4-e95f9070918e',
--               '0987f91b-6714-4841-be27-71bfee87ccb3',
--               '7c31aa9a-9c57-40a1-8f22-87eb7b11eecd',
--               'adbbb55d-8859-45d9-b6b8-4a66cd4fe41c',
--               '7a493f49-fee5-4345-a5c6-043aea35471b',
--               'f5edd7ef-88c1-420a-8a29-39bee56a6114',
--               '73cf4818-56d6-4b4e-bac9-9b1c2ea13911',
--               'f4d95001-1193-47c5-a8e2-efb17d47be4d',
--               '4e2fa156-85cf-49ad-b839-d8f2d1fbecea');
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
	('87e082e2-958a-42d0-81c4-e95f9070918e', 'Grandeurs et mesures', 'Longueurs', 'unités et conversions', 'CE2-035'),
	('0987f91b-6714-4841-be27-71bfee87ccb3', 'Grandeurs et mesures', 'Longueurs', 'unités et conversions', 'CE2-036'),
	('7c31aa9a-9c57-40a1-8f22-87eb7b11eecd', 'Grandeurs et mesures', 'Longueurs', 'unités et conversions', 'CE2-036'),
	('adbbb55d-8859-45d9-b6b8-4a66cd4fe41c', 'Grandeurs et mesures', 'Longueurs', 'unités et conversions', 'CE2-037'),
	('7a493f49-fee5-4345-a5c6-043aea35471b', 'Grandeurs et mesures', 'Longueurs', 'comparaison et mesure', 'CE2-038'),
	('f5edd7ef-88c1-420a-8a29-39bee56a6114', 'Grandeurs et mesures', 'Masses', 'unités et conversions', 'CE2-045'),
	('73cf4818-56d6-4b4e-bac9-9b1c2ea13911', 'Grandeurs et mesures', 'Masses', 'unités et conversions', 'CE2-046'),
	('f4d95001-1193-47c5-a8e2-efb17d47be4d', 'Grandeurs et mesures', 'Masses', 'unités et conversions', 'CE2-047'),
	('4e2fa156-85cf-49ad-b839-d8f2d1fbecea', 'Grandeurs et mesures', 'Masses', 'comparaison et mesure', 'CE2-048');

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
	if v_presents not in (0, 9) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 9', v_presents;
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
