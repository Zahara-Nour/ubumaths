-- ============================================================================
-- Chantier « questions-cm2 », lot 10 (heures et durées, avec les secondes) : nœud et tag de 5 modèles neufs
-- ============================================================================
--   - 16d78592 (Quelle heure est-il ? (avec les secondes)) → CM2-082, sur « Grandeurs et mesures > Durées > lecture de l'heure » ;
--   - 35ba6a94 (Place les aiguilles (avec les secondes)) → CM2-083, sur « Grandeurs et mesures > Durées > lecture de l'heure » ;
--   - 99f80f5e (Combien de temps a-t-il duré ? (avec les secondes)) → CM2-084, sur « Grandeurs et mesures > Durées > calcul de durées » ;
--   - 57846784 (Quelle durée est la plus longue ? (à la seconde)) → CM2-153, sur « Grandeurs et mesures > Durées > calcul de durées » ;
--   - 2fda6db8 (Problèmes de durées (h, min, s, jours)) → CM2-085, sur « Grandeurs et mesures > Durées > calcul de durées » ;
-- Chaque modèle va sur la SOUS-NOTION de son point (question_template_points_check_rules refuse
-- un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-18 (journal docs/wip/questions-cm2-progress.md § 16 et 16.1).
-- Les modèles ont été créés en brouillon le 2026-11-18 par scripts/create-questions.ts
-- (scripts/questions/cm2-10/, PR #2807), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-18 (MCP) : 5 brouillons [CM2], sans nœud ni tag. Les jumeaux CM1 (lot 8a du CM1 : 9e655e1a,
-- dd81eefb, f3f00294, cdec9199, 68134013) ne sont PAS touchés.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (5 modèles). Elle est prouvée par
-- tests/integration/questions-cm2-lot10-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-18), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David AVANT le SQL, en phase 0,
-- tranchée par lui le 2026-11-18 : personne, journal § 16 et 16.1). Aucune règle ne change. Effet visible : les 5
-- brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient
-- qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 5 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('16d78592-ccf2-491a-ac33-c83b7a007dce'::uuid),
--                ('35ba6a94-7bcd-405d-89c2-cd68fd9beaf2'::uuid),
--                ('99f80f5e-2549-46f6-b9f5-11072aa8fe42'::uuid),
--                ('57846784-e8e2-4912-9c47-83ab8c345ac5'::uuid),
--                ('2fda6db8-bec6-4f10-bbef-942d2da65bb5'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('16d78592-ccf2-491a-ac33-c83b7a007dce'::uuid, 'CM2-082'),
-- 	('35ba6a94-7bcd-405d-89c2-cd68fd9beaf2'::uuid, 'CM2-083'),
-- 	('99f80f5e-2549-46f6-b9f5-11072aa8fe42'::uuid, 'CM2-084'),
-- 	('57846784-e8e2-4912-9c47-83ab8c345ac5'::uuid, 'CM2-153'),
-- 	('2fda6db8-bec6-4f10-bbef-942d2da65bb5'::uuid, 'CM2-085')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CM2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('16d78592-ccf2-491a-ac33-c83b7a007dce',
--               '35ba6a94-7bcd-405d-89c2-cd68fd9beaf2',
--               '99f80f5e-2549-46f6-b9f5-11072aa8fe42',
--               '57846784-e8e2-4912-9c47-83ab8c345ac5',
--               '2fda6db8-bec6-4f10-bbef-942d2da65bb5');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qcm2l10_modeles;
create temporary table _qcm2l10_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qcm2l10_modeles values
	('16d78592-ccf2-491a-ac33-c83b7a007dce', 'Grandeurs et mesures', 'Durées', 'lecture de l''heure', 'CM2-082'),
	('35ba6a94-7bcd-405d-89c2-cd68fd9beaf2', 'Grandeurs et mesures', 'Durées', 'lecture de l''heure', 'CM2-083'),
	('99f80f5e-2549-46f6-b9f5-11072aa8fe42', 'Grandeurs et mesures', 'Durées', 'calcul de durées', 'CM2-084'),
	('57846784-e8e2-4912-9c47-83ab8c345ac5', 'Grandeurs et mesures', 'Durées', 'calcul de durées', 'CM2-153'),
	('2fda6db8-bec6-4f10-bbef-942d2da65bb5', 'Grandeurs et mesures', 'Durées', 'calcul de durées', 'CM2-085');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm2l10_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm2l10_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qcm2l10_modeles add column noeud uuid, add column point_id uuid;
update _qcm2l10_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qcm2l10_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qcm2l10_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CM2' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qcm2l10_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qcm2l10_modeles where noeud is null),
			(select count(*) from _qcm2l10_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm2l10_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 5) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 5', v_presents;
	end if;
	select count(*) into v_ranges from _qcm2l10_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcm2l10_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qcm2l10_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qcm2l10_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm2l10_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm2l10_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qcm2l10_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm2l10_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qcm2l10_modeles;
