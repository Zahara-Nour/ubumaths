-- ============================================================================
-- Chantier « questions », lot B2 du CP (reconnaître sur une figure) : nœud et tag de 10 modèles neufs
-- ============================================================================
--   - 9d6bc8b3 (Combien de formes dans le dessin ?) → CP-054, sur « Géométrie > Figures planes > propriétés » ;
--   - e7453c9b (Quelle est cette forme ?) → CP-055, sur « Géométrie > Figures planes > propriétés » ;
--   - c85626fa (Combien de côtés ? Combien de sommets ?) → CP-056, sur « Géométrie > Figures planes > propriétés » ;
--   - 91012bab (Qui suis-je ? (formes)) → CP-056, sur « Géométrie > Figures planes > propriétés » ;
--   - b5389494 (Quels points sont alignés ?) → CP-057, sur « Géométrie > Figures planes > propriétés » ;
--   - d5a36be9 (Où est-il ?) → CP-061, sur « Géométrie > Repérage et déplacements > positions et plans » ;
--   - 2fc01600 (Qui est assis à côté ?) → CP-062, sur « Géométrie > Repérage et déplacements > positions et plans » ;
--   - f7167af7 (Le robot sur le quadrillage) → CP-067, sur « Géométrie > Repérage et déplacements > coder un déplacement » ;
--   - d50c6e21 (Mesure avec la règle) → CP-035, sur « Grandeurs et mesures > Longueurs > comparaison et mesure » ;
--   - 7093b797 (Quel segment est le plus long ?) → CP-034, sur « Grandeurs et mesures > Longueurs > comparaison et mesure » ;
-- Chaque modèle va sur la SOUS-NOTION de son point (question_template_points_check_rules refuse
-- un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- CP-056 porte deux modèles (case et QCM). Ni le contenu, ni les niveaux, ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-25 (journal docs/wip/questions-progress.md § 4 duodecies). Les
-- modèles ont été créés en brouillon le 2026-10-25 par scripts/create-questions.ts
-- (scripts/questions/cp-b2/), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (10 modèles). Elle est prouvée
-- par tests/integration/questions-cp-b2-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-25), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question tranchée par David le 2026-10-25). Aucune
-- règle ne change. Effet visible : les 10 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 10 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('2fc01600-c06d-45cc-a2bd-a8f89ff7fc58'::uuid),
--                ('7093b797-0fa4-44e1-8828-327d5d3c452b'::uuid),
--                ('91012bab-0bab-4cd0-a86c-97574c44c9d9'::uuid),
--                ('9d6bc8b3-ee8f-4f70-a735-61b1075a9746'::uuid),
--                ('b5389494-3b1c-4f32-85c2-473192c9bacc'::uuid),
--                ('c85626fa-c875-4314-bbb9-96c4b7c6dd48'::uuid),
--                ('d50c6e21-627f-45eb-9ca1-9dcfa6757563'::uuid),
--                ('d5a36be9-f6bb-428f-b0e0-60bee080bd19'::uuid),
--                ('e7453c9b-8cbd-44ef-86ca-2aaf0340b5fa'::uuid),
--                ('f7167af7-564a-481d-8059-47624bdf59a3'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('9d6bc8b3-ee8f-4f70-a735-61b1075a9746'::uuid, 'CP-054'),
-- 	('e7453c9b-8cbd-44ef-86ca-2aaf0340b5fa'::uuid, 'CP-055'),
-- 	('c85626fa-c875-4314-bbb9-96c4b7c6dd48'::uuid, 'CP-056'),
-- 	('91012bab-0bab-4cd0-a86c-97574c44c9d9'::uuid, 'CP-056'),
-- 	('b5389494-3b1c-4f32-85c2-473192c9bacc'::uuid, 'CP-057'),
-- 	('d5a36be9-f6bb-428f-b0e0-60bee080bd19'::uuid, 'CP-061'),
-- 	('2fc01600-c06d-45cc-a2bd-a8f89ff7fc58'::uuid, 'CP-062'),
-- 	('f7167af7-564a-481d-8059-47624bdf59a3'::uuid, 'CP-067'),
-- 	('d50c6e21-627f-45eb-9ca1-9dcfa6757563'::uuid, 'CP-035'),
-- 	('7093b797-0fa4-44e1-8828-327d5d3c452b'::uuid, 'CP-034')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CP' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('2fc01600-c06d-45cc-a2bd-a8f89ff7fc58',
--               '7093b797-0fa4-44e1-8828-327d5d3c452b',
--               '91012bab-0bab-4cd0-a86c-97574c44c9d9',
--               '9d6bc8b3-ee8f-4f70-a735-61b1075a9746',
--               'b5389494-3b1c-4f32-85c2-473192c9bacc',
--               'c85626fa-c875-4314-bbb9-96c4b7c6dd48',
--               'd50c6e21-627f-45eb-9ca1-9dcfa6757563',
--               'd5a36be9-f6bb-428f-b0e0-60bee080bd19',
--               'e7453c9b-8cbd-44ef-86ca-2aaf0340b5fa',
--               'f7167af7-564a-481d-8059-47624bdf59a3');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qb2_modeles;
create temporary table _qb2_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qb2_modeles values
	('9d6bc8b3-ee8f-4f70-a735-61b1075a9746', 'Géométrie', 'Figures planes', 'propriétés', 'CP-054'),
	('e7453c9b-8cbd-44ef-86ca-2aaf0340b5fa', 'Géométrie', 'Figures planes', 'propriétés', 'CP-055'),
	('c85626fa-c875-4314-bbb9-96c4b7c6dd48', 'Géométrie', 'Figures planes', 'propriétés', 'CP-056'),
	('91012bab-0bab-4cd0-a86c-97574c44c9d9', 'Géométrie', 'Figures planes', 'propriétés', 'CP-056'),
	('b5389494-3b1c-4f32-85c2-473192c9bacc', 'Géométrie', 'Figures planes', 'propriétés', 'CP-057'),
	('d5a36be9-f6bb-428f-b0e0-60bee080bd19', 'Géométrie', 'Repérage et déplacements', 'positions et plans', 'CP-061'),
	('2fc01600-c06d-45cc-a2bd-a8f89ff7fc58', 'Géométrie', 'Repérage et déplacements', 'positions et plans', 'CP-062'),
	('f7167af7-564a-481d-8059-47624bdf59a3', 'Géométrie', 'Repérage et déplacements', 'coder un déplacement', 'CP-067'),
	('d50c6e21-627f-45eb-9ca1-9dcfa6757563', 'Grandeurs et mesures', 'Longueurs', 'comparaison et mesure', 'CP-035'),
	('7093b797-0fa4-44e1-8828-327d5d3c452b', 'Grandeurs et mesures', 'Longueurs', 'comparaison et mesure', 'CP-034');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qb2_modeles order by id;
select 1 from public.question_templates where id in (select id from _qb2_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qb2_modeles add column noeud uuid, add column point_id uuid;
update _qb2_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qb2_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qb2_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CP' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qb2_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qb2_modeles where noeud is null),
			(select count(*) from _qb2_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qb2_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 10) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 10', v_presents;
	end if;
	select count(*) into v_ranges from _qb2_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qb2_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qb2_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qb2_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qb2_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qb2_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qb2_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qb2_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qb2_modeles;
