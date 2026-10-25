-- ============================================================================
-- Chantier « questions », lot B3 du CP (solides et masses) : nœud et tag de 7 modèles neufs
-- ============================================================================
--   - 12482155 (Trouve le solide) → CP-049, sur « Géométrie > Solides > propriétés » ;
--   - b556f617 (À quel solide ressemble cet objet ?) → CP-049, sur « Géométrie > Solides > propriétés » ;
--   - 7e7e2968 (Comment s'appelle ce solide ?) → CP-050, sur « Géométrie > Solides > propriétés » ;
--   - 3e9a610e (Comment s'appelle la partie coloriée ?) → CP-051, sur « Géométrie > Solides > propriétés » ;
--   - 8e207417 (Combien de faces ?) → CP-052, sur « Géométrie > Solides > propriétés » ;
--   - 74d6b4f3 (De quelle forme sont les faces ?) → CP-052, sur « Géométrie > Solides > propriétés » ;
--   - 5592a129 (Lequel est le plus lourd ?) → CP-040, sur « Grandeurs et mesures > Masses > comparaison et mesure » ;
-- Chaque modèle va sur la SOUS-NOTION de son point (question_template_points_check_rules refuse
-- un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- CP-049 et CP-052 portent deux modèles chacun. Ni le contenu, ni les niveaux, ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-25 (journal docs/wip/questions-progress.md § 4 terdecies). Les
-- modèles ont été créés en brouillon le 2026-10-25 par scripts/create-questions.ts
-- (scripts/questions/cp-b3/), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée
-- par tests/integration/questions-cp-b3-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-25), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-10-25, en attente).
-- Aucune règle ne change. Effet visible : les 7 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('12482155-d91f-4744-bc43-fd0d9ff18f77'::uuid),
--                ('3e9a610e-46a8-4b0c-b6bd-5d022aebf7e3'::uuid),
--                ('5592a129-22f8-450d-9dff-f454afb1908e'::uuid),
--                ('74d6b4f3-f180-4315-a2c4-ccfb1b3f3024'::uuid),
--                ('7e7e2968-a550-483f-9399-3526f2bb5030'::uuid),
--                ('8e207417-6be5-4c0d-81d2-d419a7dc4db1'::uuid),
--                ('b556f617-a7d6-43a2-a1f0-15ac34834e7b'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('12482155-d91f-4744-bc43-fd0d9ff18f77'::uuid, 'CP-049'),
-- 	('b556f617-a7d6-43a2-a1f0-15ac34834e7b'::uuid, 'CP-049'),
-- 	('7e7e2968-a550-483f-9399-3526f2bb5030'::uuid, 'CP-050'),
-- 	('3e9a610e-46a8-4b0c-b6bd-5d022aebf7e3'::uuid, 'CP-051'),
-- 	('8e207417-6be5-4c0d-81d2-d419a7dc4db1'::uuid, 'CP-052'),
-- 	('74d6b4f3-f180-4315-a2c4-ccfb1b3f3024'::uuid, 'CP-052'),
-- 	('5592a129-22f8-450d-9dff-f454afb1908e'::uuid, 'CP-040')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CP' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('12482155-d91f-4744-bc43-fd0d9ff18f77',
--               '3e9a610e-46a8-4b0c-b6bd-5d022aebf7e3',
--               '5592a129-22f8-450d-9dff-f454afb1908e',
--               '74d6b4f3-f180-4315-a2c4-ccfb1b3f3024',
--               '7e7e2968-a550-483f-9399-3526f2bb5030',
--               '8e207417-6be5-4c0d-81d2-d419a7dc4db1',
--               'b556f617-a7d6-43a2-a1f0-15ac34834e7b');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qb3_modeles;
create temporary table _qb3_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qb3_modeles values
	('12482155-d91f-4744-bc43-fd0d9ff18f77', 'Géométrie', 'Solides', 'propriétés', 'CP-049'),
	('b556f617-a7d6-43a2-a1f0-15ac34834e7b', 'Géométrie', 'Solides', 'propriétés', 'CP-049'),
	('7e7e2968-a550-483f-9399-3526f2bb5030', 'Géométrie', 'Solides', 'propriétés', 'CP-050'),
	('3e9a610e-46a8-4b0c-b6bd-5d022aebf7e3', 'Géométrie', 'Solides', 'propriétés', 'CP-051'),
	('8e207417-6be5-4c0d-81d2-d419a7dc4db1', 'Géométrie', 'Solides', 'propriétés', 'CP-052'),
	('74d6b4f3-f180-4315-a2c4-ccfb1b3f3024', 'Géométrie', 'Solides', 'propriétés', 'CP-052'),
	('5592a129-22f8-450d-9dff-f454afb1908e', 'Grandeurs et mesures', 'Masses', 'comparaison et mesure', 'CP-040');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qb3_modeles order by id;
select 1 from public.question_templates where id in (select id from _qb3_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qb3_modeles add column noeud uuid, add column point_id uuid;
update _qb3_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qb3_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qb3_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CP' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qb3_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qb3_modeles where noeud is null),
			(select count(*) from _qb3_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qb3_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
	end if;
	select count(*) into v_ranges from _qb3_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qb3_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qb3_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qb3_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qb3_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qb3_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qb3_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qb3_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qb3_modeles;
