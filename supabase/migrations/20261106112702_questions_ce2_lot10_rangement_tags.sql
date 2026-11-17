-- ============================================================================
-- Chantier « questions-ce2 », lot 10 (solides) : nœud et tag de 7 modèles neufs
-- ============================================================================
--   - b9c77a83 (Nommer un solide : cube, pavé, boule, cône, pyramide, cylindre) → CE2-061, sur « Géométrie > Solides > propriétés »;
--   - d0d3249b (Face, arête ou sommet ?) → CE2-062, sur « Géométrie > Solides > propriétés »;
--   - c9d9d6d4 (Compter les sommets, les arêtes et les faces d'un solide) → CE2-062, sur « Géométrie > Solides > propriétés »;
--   - 7ed6c420 (Les faces d'un cube et d'un pavé) → CE2-063, sur « Géométrie > Solides > propriétés »;
--   - 964711ea (Les faces d'une pyramide) → CE2-064, sur « Géométrie > Solides > propriétés »;
--   - c8c9746a (Cet assemblage se plie-t-il en cube ?) → CE2-066, sur « Géométrie > Solides > patrons »;
--   - 11ebf9fe (Lequel se plie en cube ?) → CE2-066, sur « Géométrie > Solides > patrons »;
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-06 (journal docs/wip/questions-ce2-progress.md § 16). Les modèles
-- ont été créés en brouillon par scripts/create-questions.ts
-- (scripts/questions/ce2-10/, lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-ce2-lot10-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-06, après la création),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-11-06 en phase 0 (§ 16), AVANT le SQL, tranchée par lui le 2026-11-06 : personne).
-- Aucune règle ne change. Effet visible : les 7 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--               ('b9c77a83-e673-4f7f-bdde-c99308e4d273'::uuid),
--               ('d0d3249b-27fa-4694-aa38-e2cb9588b6cf'::uuid),
--               ('c9d9d6d4-6306-4f39-83dd-2700e0cc9e65'::uuid),
--               ('7ed6c420-c2db-4156-8ed1-1abe122c6164'::uuid),
--               ('964711ea-6cc8-41fc-845d-fc97de352b28'::uuid),
--               ('c8c9746a-75e5-478f-9a57-8145626d438c'::uuid),
--               ('11ebf9fe-a361-4fe8-b1a6-d239585a6cbc'::uuid))
--  as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('b9c77a83-e673-4f7f-bdde-c99308e4d273'::uuid, 'CE2-061'),
-- 	('d0d3249b-27fa-4694-aa38-e2cb9588b6cf'::uuid, 'CE2-062'),
-- 	('c9d9d6d4-6306-4f39-83dd-2700e0cc9e65'::uuid, 'CE2-062'),
-- 	('7ed6c420-c2db-4156-8ed1-1abe122c6164'::uuid, 'CE2-063'),
-- 	('964711ea-6cc8-41fc-845d-fc97de352b28'::uuid, 'CE2-064'),
-- 	('c8c9746a-75e5-478f-9a57-8145626d438c'::uuid, 'CE2-066'),
-- 	('11ebf9fe-a361-4fe8-b1a6-d239585a6cbc'::uuid, 'CE2-066')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CE2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               'b9c77a83-e673-4f7f-bdde-c99308e4d273',
--               'd0d3249b-27fa-4694-aa38-e2cb9588b6cf',
--               'c9d9d6d4-6306-4f39-83dd-2700e0cc9e65',
--               '7ed6c420-c2db-4156-8ed1-1abe122c6164',
--               '964711ea-6cc8-41fc-845d-fc97de352b28',
--               'c8c9746a-75e5-478f-9a57-8145626d438c',
--               '11ebf9fe-a361-4fe8-b1a6-d239585a6cbc');
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
	code text not null,
	-- sous-notions que la notion a le droit d'avoir quand le modèle va sur elle (aucune ici : tous
	-- les modèles vont sur une sous-notion)
	sous_notions_admises text[]
);
insert into _qc_modeles values
	('b9c77a83-e673-4f7f-bdde-c99308e4d273', 'Géométrie', 'Solides', 'propriétés', 'CE2-061', null),
	('d0d3249b-27fa-4694-aa38-e2cb9588b6cf', 'Géométrie', 'Solides', 'propriétés', 'CE2-062', null),
	('c9d9d6d4-6306-4f39-83dd-2700e0cc9e65', 'Géométrie', 'Solides', 'propriétés', 'CE2-062', null),
	('7ed6c420-c2db-4156-8ed1-1abe122c6164', 'Géométrie', 'Solides', 'propriétés', 'CE2-063', null),
	('964711ea-6cc8-41fc-845d-fc97de352b28', 'Géométrie', 'Solides', 'propriétés', 'CE2-064', null),
	('c8c9746a-75e5-478f-9a57-8145626d438c', 'Géométrie', 'Solides', 'patrons', 'CE2-066', null),
	('11ebf9fe-a361-4fe8-b1a6-d239585a6cbc', 'Géométrie', 'Solides', 'patrons', 'CE2-066', null);

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
	if exists (select 1 from _qc_modeles r
	            join public.classification_nodes s on s.parent_id = r.noeud
	             and s.kind = 'subnotion' and s.archived_at is null
	           where r.sous_notion is null
	             and s.name <> all (coalesce(r.sous_notions_admises, '{}'))) then
		raise exception 'notion visée sans sous-notion, mais elle en a une non admise';
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
