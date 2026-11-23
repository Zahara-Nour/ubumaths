-- ============================================================================
-- Chantier « questions-1spe », lot 2-variations : nœud et tag de 7 modèles neufs
-- ============================================================================
--   - 1e097d3d (position relative) → 1SPE-286, sur « Fonctions > Dérivation > position relative de deux courbes » ;
--   - 3fa3af6c (inégalité par les variations) → 1SPE-285, sur « Fonctions > Dérivation > variations et extremums » ;
--   - 47843e39 (extrémum et tangente horizontale) → 1SPE-282, sur « Fonctions > Dérivation > variations et extremums » ;
--   - 655d06ff (étudier la parité) → 1SPE-280, sur « Fonctions > Généralités sur les fonctions > parité » ;
--   - 707aa89d (lire la parité) → 1SPE-399, sur « Fonctions > Généralités sur les fonctions > parité » ;
--   - 75b2aa08 (dérivée nulle) → 1SPE-400, sur « Fonctions > Dérivation > variations et extremums » ;
--   - 8a7e39b7 (allure de la parabole) → 1SPE-403, sur « Fonctions > Second degré > parabole » ;
-- Chaque modèle va sur le nœud de son point (sous-notion : question_template_points_check_rules
-- refuse un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-01 (journal docs/wip/questions-1spe-progress.md § 19, D25). Les
-- modèles ont été créés en brouillon le 2026-11-01 par scripts/create-questions.ts (lancé par
-- David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-1spe-variations-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-01),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David en phase 0 du lot, AVANT
-- le SQL, tranchée par lui le 2026-11-01 : personne). Aucune règle ne change. Effet visible : les
-- 7 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les
-- voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('1e097d3d-0fdf-4fdc-9549-836d1a0efb48'::uuid),
--                ('3fa3af6c-e50f-42ff-88a9-85ca0d913cef'::uuid),
--                ('47843e39-cf3c-4d19-873b-5d630177aafd'::uuid),
--                ('655d06ff-7e1b-4ec5-b489-65473d73a9b9'::uuid),
--                ('707aa89d-3366-4372-b508-3fa946fc4e9b'::uuid),
--                ('75b2aa08-1481-4a82-9551-9d9378b3dbb8'::uuid),
--                ('8a7e39b7-83c0-4c28-8d90-d1f42dc62c0e'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('1e097d3d-0fdf-4fdc-9549-836d1a0efb48'::uuid, '1SPE-286'),
-- 	('3fa3af6c-e50f-42ff-88a9-85ca0d913cef'::uuid, '1SPE-285'),
-- 	('47843e39-cf3c-4d19-873b-5d630177aafd'::uuid, '1SPE-282'),
-- 	('655d06ff-7e1b-4ec5-b489-65473d73a9b9'::uuid, '1SPE-280'),
-- 	('707aa89d-3366-4372-b508-3fa946fc4e9b'::uuid, '1SPE-399'),
-- 	('75b2aa08-1481-4a82-9551-9d9378b3dbb8'::uuid, '1SPE-400'),
-- 	('8a7e39b7-83c0-4c28-8d90-d1f42dc62c0e'::uuid, '1SPE-403')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '1_SPE' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '1e097d3d-0fdf-4fdc-9549-836d1a0efb48',
--               '3fa3af6c-e50f-42ff-88a9-85ca0d913cef',
--               '47843e39-cf3c-4d19-873b-5d630177aafd',
--               '655d06ff-7e1b-4ec5-b489-65473d73a9b9',
--               '707aa89d-3366-4372-b508-3fa946fc4e9b',
--               '75b2aa08-1481-4a82-9551-9d9378b3dbb8',
--               '8a7e39b7-83c0-4c28-8d90-d1f42dc62c0e');
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
	('1e097d3d-0fdf-4fdc-9549-836d1a0efb48', 'Fonctions', 'Dérivation', 'position relative de deux courbes', '1SPE-286'),
	('3fa3af6c-e50f-42ff-88a9-85ca0d913cef', 'Fonctions', 'Dérivation', 'variations et extremums', '1SPE-285'),
	('47843e39-cf3c-4d19-873b-5d630177aafd', 'Fonctions', 'Dérivation', 'variations et extremums', '1SPE-282'),
	('655d06ff-7e1b-4ec5-b489-65473d73a9b9', 'Fonctions', 'Généralités sur les fonctions', 'parité', '1SPE-280'),
	('707aa89d-3366-4372-b508-3fa946fc4e9b', 'Fonctions', 'Généralités sur les fonctions', 'parité', '1SPE-399'),
	('75b2aa08-1481-4a82-9551-9d9378b3dbb8', 'Fonctions', 'Dérivation', 'variations et extremums', '1SPE-400'),
	('8a7e39b7-83c0-4c28-8d90-d1f42dc62c0e', 'Fonctions', 'Second degré', 'parabole', '1SPE-403');

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
 where p.grade = '1_SPE' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
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
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
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
