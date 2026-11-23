-- ============================================================================
-- Chantier « questions-ce2 », lot 12b (cercle de centre donné, triangle rectangle) : nœud et tag de 6 modèles neufs
-- ============================================================================
--   - 1c0ba52e (Tracer un cercle de centre donné passant par un point) → CE2-070, sur « Géométrie > Figures planes > constructions »;
--   - d73d429b (Tracer un cercle de rayon donné par un segment) → CE2-070, sur « Géométrie > Figures planes > constructions »;
--   - b8fb32a4 (Terminer un triangle rectangle sur quadrillage) → CE2-070, sur « Géométrie > Figures planes > constructions »;
--   - f4b94b4f (Construire un triangle rectangle à l'équerre et au compas) → CE2-070, sur « Géométrie > Figures planes > constructions »;
--   - d0f7d7a8 (Tracer un cercle de centre donné sur quadrillage) → CE1-072, sur « Géométrie > Figures planes > constructions »;
--   - e50d512d (Terminer un triangle rectangle en comptant les carreaux) → CE1-072, sur « Géométrie > Figures planes > constructions »;
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-08 (journal docs/wip/questions-ce2-progress.md § 19). Les modèles
-- ont été créés en brouillon par scripts/create-questions.ts
-- (scripts/questions/ce2-12b/, lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée par
-- tests/integration/questions-ce2-lot12b-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-08, après la création du lot 12b),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Deux niveaux : 4 modèles CE2 sur CE2-070, 2 modèles CE1 sur CE1-072 (même nœud) ; le niveau
-- du point est porté par la colonne `grade`.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-11-08 en phase 0 (§ 19), AVANT le SQL, tranchée par lui le 2026-11-08 : personne).
-- Aucune règle ne change. Effet visible : les 6 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--               ('1c0ba52e-698b-40c9-8e71-30068c1ed261'::uuid),
--               ('d73d429b-1b4e-47b8-89bf-b2a6668c9d79'::uuid),
--               ('b8fb32a4-2469-49dc-974d-0387c6d184cf'::uuid),
--               ('f4b94b4f-cf5f-4b18-a014-39b300c61cdf'::uuid),
--               ('d0f7d7a8-1d52-4a46-beac-d3526cc7004f'::uuid),
--               ('e50d512d-e163-4dd0-aec1-864b078e626a'::uuid))
--  as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('1c0ba52e-698b-40c9-8e71-30068c1ed261'::uuid, 'CE2', 'CE2-070'),
-- 	('d73d429b-1b4e-47b8-89bf-b2a6668c9d79'::uuid, 'CE2', 'CE2-070'),
-- 	('b8fb32a4-2469-49dc-974d-0387c6d184cf'::uuid, 'CE2', 'CE2-070'),
-- 	('f4b94b4f-cf5f-4b18-a014-39b300c61cdf'::uuid, 'CE2', 'CE2-070'),
-- 	('d0f7d7a8-1d52-4a46-beac-d3526cc7004f'::uuid, 'CE1', 'CE1-072'),
-- 	('e50d512d-e163-4dd0-aec1-864b078e626a'::uuid, 'CE1', 'CE1-072')
--  ) as r(id, grade, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '1c0ba52e-698b-40c9-8e71-30068c1ed261',
--               'd73d429b-1b4e-47b8-89bf-b2a6668c9d79',
--               'b8fb32a4-2469-49dc-974d-0387c6d184cf',
--               'f4b94b4f-cf5f-4b18-a014-39b300c61cdf',
--               'd0f7d7a8-1d52-4a46-beac-d3526cc7004f',
--               'e50d512d-e163-4dd0-aec1-864b078e626a');
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
	grade text not null,
	code text not null,
	-- sous-notions que la notion a le droit d'avoir quand le modèle va sur elle (aucune ici : tous
	-- les modèles vont sur une sous-notion)
	sous_notions_admises text[]
);
insert into _qc_modeles values
	('1c0ba52e-698b-40c9-8e71-30068c1ed261', 'Géométrie', 'Figures planes', 'constructions', 'CE2', 'CE2-070', null),
	('d73d429b-1b4e-47b8-89bf-b2a6668c9d79', 'Géométrie', 'Figures planes', 'constructions', 'CE2', 'CE2-070', null),
	('b8fb32a4-2469-49dc-974d-0387c6d184cf', 'Géométrie', 'Figures planes', 'constructions', 'CE2', 'CE2-070', null),
	('f4b94b4f-cf5f-4b18-a014-39b300c61cdf', 'Géométrie', 'Figures planes', 'constructions', 'CE2', 'CE2-070', null),
	('d0f7d7a8-1d52-4a46-beac-d3526cc7004f', 'Géométrie', 'Figures planes', 'constructions', 'CE1', 'CE1-072', null),
	('e50d512d-e163-4dd0-aec1-864b078e626a', 'Géométrie', 'Figures planes', 'constructions', 'CE1', 'CE1-072', null);

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
 where p.grade = r.grade and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
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
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
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
