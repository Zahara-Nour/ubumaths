-- ============================================================================
-- Chantier « questions-ce1 », lot 9 (fractions dessinées et géométrie) : nœud et tag de 9 modèles neufs
-- ============================================================================
--   - 6bee2313 (Quelle part de la figure est coloriée ? Fractions unitaires) → CE1-096, sur « Nombres et calculs > Fractions : sens et écritures > définition » ;
--   - 435eb33c (Quelle fraction de la figure est coloriée ? Jusqu'à 1) → CE1-098, sur « Nombres et calculs > Fractions : sens et écritures > définition » ;
--   - 191eee18 (Colorie une fraction unitaire de la figure) → CE1-095, sur « Nombres et calculs > Fractions : sens et écritures > définition » ;
--   - 2d051cdc (Colorie une fraction de la figure, jusqu'à 1) → CE1-097, sur « Nombres et calculs > Fractions : sens et écritures > définition » ;
--   - b3ff17bc (Quelle est cette figure ? Cercle, carré, rectangle, triangles) → CE1-070, sur « Géométrie > Figures planes > propriétés » ;
--   - 9733e97c (Le bon mot : sommet, côté, centre, milieu, droite, segment) → CE1-069, sur « Géométrie > Figures planes > propriétés » ;
--   - 0fa9f1f8 (Décrire une figure : côtés et angles droits) → CE1-105, sur « Géométrie > Figures planes > propriétés » ;
--   - 803969b5 (Le code de l'angle droit) → CE1-075, sur « Géométrie > Figures planes > angles droits » ;
--   - bbb43bf4 (Angle droit, aigu ou obtus ?) → CE1-087, sur « Géométrie > Figures planes > angles droits » ;
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-01 (journal docs/wip/questions-ce1-progress.md § 16). Les modèles
-- ont été créés en brouillon le 2026-11-01 par scripts/create-questions.ts
-- (scripts/questions/ce1-9/, lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (9 modèles). Elle est prouvée par
-- tests/integration/questions-ce1-lot9-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-01, après la création),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-11-01 en phase 0 (§ 16), AVANT le SQL, tranchée par lui le 2026-11-01 : personne).
-- Aucune règle ne change. Effet visible : les 9 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 9 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('6bee2313-273b-48a4-940f-860d21b11ae9'::uuid),
--               ('435eb33c-e070-4edc-b0b4-80854aeffdff'::uuid),
--               ('191eee18-341b-47b9-ba6c-0b873746d64d'::uuid),
--               ('2d051cdc-fa11-4e4d-b4f9-ce2fa3a02aa4'::uuid),
--               ('b3ff17bc-74f7-4fbe-a696-675d83aa45a3'::uuid),
--               ('9733e97c-0313-429a-bd0e-bfe5b4ee82b1'::uuid),
--               ('0fa9f1f8-268c-421c-b5dd-b21dc3f7a826'::uuid),
--               ('803969b5-2a86-44c1-8168-f125c191235e'::uuid),
--               ('bbb43bf4-2cb7-4aa0-abf2-946b7199d159'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('6bee2313-273b-48a4-940f-860d21b11ae9'::uuid, 'CE1-096'),
-- 	('435eb33c-e070-4edc-b0b4-80854aeffdff'::uuid, 'CE1-098'),
-- 	('191eee18-341b-47b9-ba6c-0b873746d64d'::uuid, 'CE1-095'),
-- 	('2d051cdc-fa11-4e4d-b4f9-ce2fa3a02aa4'::uuid, 'CE1-097'),
-- 	('b3ff17bc-74f7-4fbe-a696-675d83aa45a3'::uuid, 'CE1-070'),
-- 	('9733e97c-0313-429a-bd0e-bfe5b4ee82b1'::uuid, 'CE1-069'),
-- 	('0fa9f1f8-268c-421c-b5dd-b21dc3f7a826'::uuid, 'CE1-105'),
-- 	('803969b5-2a86-44c1-8168-f125c191235e'::uuid, 'CE1-075'),
-- 	('bbb43bf4-2cb7-4aa0-abf2-946b7199d159'::uuid, 'CE1-087')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CE1' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('6bee2313-273b-48a4-940f-860d21b11ae9',
--               '435eb33c-e070-4edc-b0b4-80854aeffdff',
--               '191eee18-341b-47b9-ba6c-0b873746d64d',
--               '2d051cdc-fa11-4e4d-b4f9-ce2fa3a02aa4',
--               'b3ff17bc-74f7-4fbe-a696-675d83aa45a3',
--               '9733e97c-0313-429a-bd0e-bfe5b4ee82b1',
--               '0fa9f1f8-268c-421c-b5dd-b21dc3f7a826',
--               '803969b5-2a86-44c1-8168-f125c191235e',
--               'bbb43bf4-2cb7-4aa0-abf2-946b7199d159');
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
	('6bee2313-273b-48a4-940f-860d21b11ae9', 'Nombres et calculs', 'Fractions : sens et écritures', 'définition', 'CE1-096'),
	('435eb33c-e070-4edc-b0b4-80854aeffdff', 'Nombres et calculs', 'Fractions : sens et écritures', 'définition', 'CE1-098'),
	('191eee18-341b-47b9-ba6c-0b873746d64d', 'Nombres et calculs', 'Fractions : sens et écritures', 'définition', 'CE1-095'),
	('2d051cdc-fa11-4e4d-b4f9-ce2fa3a02aa4', 'Nombres et calculs', 'Fractions : sens et écritures', 'définition', 'CE1-097'),
	('b3ff17bc-74f7-4fbe-a696-675d83aa45a3', 'Géométrie', 'Figures planes', 'propriétés', 'CE1-070'),
	('9733e97c-0313-429a-bd0e-bfe5b4ee82b1', 'Géométrie', 'Figures planes', 'propriétés', 'CE1-069'),
	('0fa9f1f8-268c-421c-b5dd-b21dc3f7a826', 'Géométrie', 'Figures planes', 'propriétés', 'CE1-105'),
	('803969b5-2a86-44c1-8168-f125c191235e', 'Géométrie', 'Figures planes', 'angles droits', 'CE1-075'),
	('bbb43bf4-2cb7-4aa0-abf2-946b7199d159', 'Géométrie', 'Figures planes', 'angles droits', 'CE1-087');

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
 where p.grade = 'CE1' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
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
