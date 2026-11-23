-- ============================================================================
-- Chantier « questions-4 », lot 3 (statistiques) : nœud et tags de 9 modèles neufs
-- ============================================================================
--   - c2497d96 (Moyenne pondérée) → 4-039, sur « Statistiques > Indicateurs > moyenne » ;
--   - b2908d52 (Déterminer la médiane) → 4-040, sur « Statistiques > Indicateurs > médiane » ;
--   - e8990535 (Interpréter la médiane) → 4-077, sur « Statistiques > Indicateurs > médiane » ;
--   - 4604b429 (Calculer une étendue) → 4-041, sur « Statistiques > Indicateurs > étendue » ;
--   - e4d9eb0f (Interpréter une étendue) → 4-078, sur « Statistiques > Indicateurs > étendue » ;
--   - 410c104b (Ajouter une valeur extrême) → 4-042, sur « Statistiques > Indicateurs » ;
--   - 7bb351d0 (Problèmes avec les indicateurs) → 4-043, sur « Statistiques > Indicateurs » ;
--   - 3afa8d97 (Comparer deux séries) → 4-044, sur « Statistiques > Indicateurs » ;
--   - 5c092e43 (Formules du tableur, grades 4 et 3) → 4-045 ET 3-032, sur « Statistiques > Indicateurs ».
-- Chaque modèle va sur le nœud de son point (sous-notion ou notion) :
-- question_template_points_check_rules refuse un tag hors du nœud du point, et porte au plus UN
-- point par programme (ADR 0020) : le tableur porte un point de 4e et un point de 3e, les deux
-- posés sur la notion « Indicateurs ».
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-10-29 (journal docs/wip/questions-4-progress.md § 16 ; un
-- seul modèle tableur, grades 4 et 3, tagué 4-045 et 3-032). Les modèles ont été créés en
-- brouillon le 2026-10-29 par scripts/create-questions.ts (scripts/questions/4-lot-3/, #1978), qui
-- ne pose ni nœud ni tag. Relevé de la prod du 2026-10-29 (MCP) : 9 brouillons (8 en [4], le
-- tableur en [4, 3]), sans nœud ni tag ; les 10 points actifs, chacun sur le nœud ci-dessus.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (9 modèles). Elle est prouvée par
-- tests/integration/questions-4-lot3-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-29), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui de chacun de ses points.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin seul ; question posée à David
-- avec la phase 0 du lot 3, journal § 16.3, validée le 2026-10-29). Aucune règle ne change. Effet
-- visible : les 9 brouillons apparaissent sous leur nœud et sous leur point dans l'admin (le
-- tableur aussi sous 3-032) ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 10 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('3afa8d97-c45c-49af-b1f2-6a42dc9d93e2'::uuid),
--                ('410c104b-81cd-4a6b-8796-01a303d88f54'::uuid),
--                ('4604b429-1559-4406-800a-4d73340c8b8a'::uuid),
--                ('5c092e43-3bb3-4f5d-8eaf-5f9da9a70039'::uuid),
--                ('7bb351d0-be4f-4b90-a70c-471560537518'::uuid),
--                ('b2908d52-9b12-478e-a0d9-acebce7b013f'::uuid),
--                ('c2497d96-498e-463a-82a0-611705a6e249'::uuid),
--                ('e4d9eb0f-a896-45f4-af15-12a737b2da5a'::uuid),
--                ('e8990535-33cf-43c2-ae54-c72a94136afb'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('c2497d96-498e-463a-82a0-611705a6e249'::uuid, '4', '4-039'),
-- 	('b2908d52-9b12-478e-a0d9-acebce7b013f'::uuid, '4', '4-040'),
-- 	('e8990535-33cf-43c2-ae54-c72a94136afb'::uuid, '4', '4-077'),
-- 	('4604b429-1559-4406-800a-4d73340c8b8a'::uuid, '4', '4-041'),
-- 	('e4d9eb0f-a896-45f4-af15-12a737b2da5a'::uuid, '4', '4-078'),
-- 	('410c104b-81cd-4a6b-8796-01a303d88f54'::uuid, '4', '4-042'),
-- 	('7bb351d0-be4f-4b90-a70c-471560537518'::uuid, '4', '4-043'),
-- 	('3afa8d97-c45c-49af-b1f2-6a42dc9d93e2'::uuid, '4', '4-044'),
-- 	('5c092e43-3bb3-4f5d-8eaf-5f9da9a70039'::uuid, '4', '4-045'),
-- 	('5c092e43-3bb3-4f5d-8eaf-5f9da9a70039'::uuid, '3', '3-032')
--  ) as r(id, grade, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('c2497d96-498e-463a-82a0-611705a6e249',
--               'b2908d52-9b12-478e-a0d9-acebce7b013f',
--               'e8990535-33cf-43c2-ae54-c72a94136afb',
--               '4604b429-1559-4406-800a-4d73340c8b8a',
--               'e4d9eb0f-a896-45f4-af15-12a737b2da5a',
--               '410c104b-81cd-4a6b-8796-01a303d88f54',
--               '7bb351d0-be4f-4b90-a70c-471560537518',
--               '3afa8d97-c45c-49af-b1f2-6a42dc9d93e2',
--               '5c092e43-3bb3-4f5d-8eaf-5f9da9a70039');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires (les modèles, puis leurs points) --------------
drop table if exists pg_temp._q4l3_tags;
drop table if exists pg_temp._q4l3_modeles;
create temporary table _q4l3_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text
);
insert into _q4l3_modeles values
	('c2497d96-498e-463a-82a0-611705a6e249', 'Statistiques', 'Indicateurs', 'moyenne'),
	('b2908d52-9b12-478e-a0d9-acebce7b013f', 'Statistiques', 'Indicateurs', 'médiane'),
	('e8990535-33cf-43c2-ae54-c72a94136afb', 'Statistiques', 'Indicateurs', 'médiane'),
	('4604b429-1559-4406-800a-4d73340c8b8a', 'Statistiques', 'Indicateurs', 'étendue'),
	('e4d9eb0f-a896-45f4-af15-12a737b2da5a', 'Statistiques', 'Indicateurs', 'étendue'),
	('410c104b-81cd-4a6b-8796-01a303d88f54', 'Statistiques', 'Indicateurs', null),
	('7bb351d0-be4f-4b90-a70c-471560537518', 'Statistiques', 'Indicateurs', null),
	('3afa8d97-c45c-49af-b1f2-6a42dc9d93e2', 'Statistiques', 'Indicateurs', null),
	('5c092e43-3bb3-4f5d-8eaf-5f9da9a70039', 'Statistiques', 'Indicateurs', null);
create temporary table _q4l3_tags (
	id uuid not null references _q4l3_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _q4l3_tags values
	('c2497d96-498e-463a-82a0-611705a6e249', '4', '4-039'),
	('b2908d52-9b12-478e-a0d9-acebce7b013f', '4', '4-040'),
	('e8990535-33cf-43c2-ae54-c72a94136afb', '4', '4-077'),
	('4604b429-1559-4406-800a-4d73340c8b8a', '4', '4-041'),
	('e4d9eb0f-a896-45f4-af15-12a737b2da5a', '4', '4-078'),
	('410c104b-81cd-4a6b-8796-01a303d88f54', '4', '4-042'),
	('7bb351d0-be4f-4b90-a70c-471560537518', '4', '4-043'),
	('3afa8d97-c45c-49af-b1f2-6a42dc9d93e2', '4', '4-044'),
	('5c092e43-3bb3-4f5d-8eaf-5f9da9a70039', '4', '4-045'),
	('5c092e43-3bb3-4f5d-8eaf-5f9da9a70039', '3', '3-032');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q4l3_modeles order by id;
select 1 from public.question_templates where id in (select id from _q4l3_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui de
-- chacun des points du modèle
alter table _q4l3_modeles add column noeud uuid;
alter table _q4l3_tags add column point_id uuid;
update _q4l3_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _q4l3_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q4l3_tags t set point_id = p.id
  from _q4l3_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q4l3_modeles where noeud is null)
	   or exists (select 1 from _q4l3_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q4l3_modeles where noeud is null),
			(select count(*) from _q4l3_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _q4l3_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 9) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 9', v_presents;
	end if;
	select count(*) into v_ranges from _q4l3_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q4l3_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q4l3_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _q4l3_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q4l3_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q4l3_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _q4l3_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _q4l3_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q4l3_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _q4l3_tags;
drop table _q4l3_modeles;
