-- ============================================================================
-- Chantier « questions-cm2 », lot 14a (données lues) : nœud et tag de 6 modèles neufs
-- ============================================================================
--   - c382e240 (Lis un tableau) → CM2-107, sur « Statistiques > Représenter des données > tableaux » ;
--   - e1f02c23 (Que dit le tableau ?) → CM2-156, sur « Statistiques > Représenter des données > tableaux » ;
--   - 9d601156 (Lis le diagramme en barres) → CM2-123, sur « Statistiques > Représenter des données > diagrammes en barres » ;
--   - aff8498b (Que dit le diagramme en barres ?) → CM2-157, sur « Statistiques > Représenter des données > diagrammes en barres » ;
--   - d8a1484c (Lis le diagramme circulaire) → CM2-124, sur « Statistiques > Représenter des données > diagrammes circulaires » ;
--   - ebd55761 (Que dit le diagramme circulaire ?) → CM2-158, sur « Statistiques > Représenter des données > diagrammes circulaires » ;
-- Chaque modèle va sur la sous-notion de son point (les 6 points sont posés sur leur sous-notion).
-- Chaque modèle porte UN point (ADR 0020 : au plus un point par programme) ;
-- question_template_points_check_rules refuse un tag hors du nœud du modèle ou de sa notion.
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-19 (journal docs/wip/questions-cm2-progress.md § 21 et 21.2).
-- Les modèles ont été créés en brouillon le 2026-11-19 par scripts/create-questions.ts
-- (scripts/questions/cm2-14a/, PR #2883), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-19 (MCP) : 6 brouillons [CM2], sans nœud ni tag, `updated_at` = création. Les modèles des
-- autres niveaux, sur les mêmes nœuds, ne sont PAS touchés.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée par
-- tests/integration/questions-cm2-lot14a-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-19), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David AVANT le SQL, en phase 0,
-- tranchée par lui le 2026-11-19 : personne, journal § 21 et 21.2). Aucune règle ne change. Effet visible : les 6
-- brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient
-- qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('c382e240-277c-44eb-a79d-e6a763daa8bf'::uuid),
--                ('e1f02c23-582c-4e7e-b5a0-20578e66f834'::uuid),
--                ('9d601156-86e1-4b56-ac11-f6cbf96182b4'::uuid),
--                ('aff8498b-3e20-4d2b-9ca9-ba5150a33d87'::uuid),
--                ('d8a1484c-3a3c-46ca-8396-5aaacd8c261f'::uuid),
--                ('ebd55761-821b-42bb-8f09-dc9c59d609f4'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('c382e240-277c-44eb-a79d-e6a763daa8bf'::uuid, 'CM2-107'),
-- 	('e1f02c23-582c-4e7e-b5a0-20578e66f834'::uuid, 'CM2-156'),
-- 	('9d601156-86e1-4b56-ac11-f6cbf96182b4'::uuid, 'CM2-123'),
-- 	('aff8498b-3e20-4d2b-9ca9-ba5150a33d87'::uuid, 'CM2-157'),
-- 	('d8a1484c-3a3c-46ca-8396-5aaacd8c261f'::uuid, 'CM2-124'),
-- 	('ebd55761-821b-42bb-8f09-dc9c59d609f4'::uuid, 'CM2-158')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CM2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('c382e240-277c-44eb-a79d-e6a763daa8bf',
--               'e1f02c23-582c-4e7e-b5a0-20578e66f834',
--               '9d601156-86e1-4b56-ac11-f6cbf96182b4',
--               'aff8498b-3e20-4d2b-9ca9-ba5150a33d87',
--               'd8a1484c-3a3c-46ca-8396-5aaacd8c261f',
--               'ebd55761-821b-42bb-8f09-dc9c59d609f4');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qcm2l14a_modeles;
create temporary table _qcm2l14a_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qcm2l14a_modeles values
	('c382e240-277c-44eb-a79d-e6a763daa8bf', 'Statistiques', 'Représenter des données', 'tableaux', 'CM2-107'),
	('e1f02c23-582c-4e7e-b5a0-20578e66f834', 'Statistiques', 'Représenter des données', 'tableaux', 'CM2-156'),
	('9d601156-86e1-4b56-ac11-f6cbf96182b4', 'Statistiques', 'Représenter des données', 'diagrammes en barres', 'CM2-123'),
	('aff8498b-3e20-4d2b-9ca9-ba5150a33d87', 'Statistiques', 'Représenter des données', 'diagrammes en barres', 'CM2-157'),
	('d8a1484c-3a3c-46ca-8396-5aaacd8c261f', 'Statistiques', 'Représenter des données', 'diagrammes circulaires', 'CM2-124'),
	('ebd55761-821b-42bb-8f09-dc9c59d609f4', 'Statistiques', 'Représenter des données', 'diagrammes circulaires', 'CM2-158');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm2l14a_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm2l14a_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée ; le point est sur ce nœud ou sur sa notion
alter table _qcm2l14a_modeles add column noeud uuid, add column point_id uuid;
update _qcm2l14a_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qcm2l14a_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qcm2l14a_modeles r set point_id = p.id
  from public.curriculum_points p, public.classification_nodes s
 where s.id = r.noeud and p.grade = 'CM2' and p.code = r.code and p.archived_at is null
   and (p.node_id = s.id or (s.kind = 'subnotion' and p.node_id = s.parent_id));
do $resolution$
begin
	if exists (select 1 from _qcm2l14a_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qcm2l14a_modeles where noeud is null),
			(select count(*) from _qcm2l14a_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm2l14a_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	select count(*) into v_ranges from _qcm2l14a_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcm2l14a_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qcm2l14a_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qcm2l14a_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm2l14a_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm2l14a_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qcm2l14a_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm2l14a_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qcm2l14a_modeles;
