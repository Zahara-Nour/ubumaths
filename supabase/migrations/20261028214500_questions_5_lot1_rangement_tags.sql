-- ============================================================================
-- Chantier « questions-5 », lot 1 (calcul) : nœud et tag de 7 modèles neufs
-- ============================================================================
--   - 2f1657b0 (Nommer un calcul) → 5-006, sur « Nombres et calculs > Entiers : priorités opératoires > écriture d'une expression » ;
--   - 7b08589b (Le cube de 10) → 5-030, sur « Nombres et calculs > Puissances : sens et écritures > puissances de 10 » ;
--   - 8df8ba2b (Termes et facteurs) → 5-118, sur « Nombres et calculs > Entiers : priorités opératoires > écriture d'une expression » ;
--   - 8e571049 (Enchaîner des opérations) → 5-004, sur « Nombres et calculs > Entiers : priorités opératoires » ;
--   - 9d9b2301 (Calculer avec des carrés et des cubes) → 5-032, sur « Nombres et calculs > Puissances : calculs » ;
--   - be35cd63 (Connaître les carrés) → 5-029, sur « Nombres et calculs > Entiers : multiplication > carrés » ;
--   - faf57d3b (Multiples et diviseurs) → 5-009, sur « Arithmétique > Divisibilité > multiples et diviseurs » ;
-- Chaque modèle va sur le nœud de son point, sous-notion ou notion (5-004, 5-032) :
-- question_template_points_check_rules refuse un tag hors du nœud du point, et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-10-28 (journal docs/wip/questions-5-progress.md § 7). Les
-- modèles ont été créés en brouillon le 2026-10-28 par scripts/create-questions.ts
-- (scripts/questions/5-calcul/, #1919), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-10-28 (MCP) : 7 brouillons [5], sans nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-5-lot1-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-28), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin seul ; question posée à David
-- avec la phase 0 du lot 1, journal § 7). Aucune règle ne change. Effet visible : les 7 brouillons
-- apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient qu'une
-- fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('2f1657b0-0ccd-4f68-93b5-0c6256a0e6e6'::uuid),
--                ('7b08589b-c870-4632-9f36-50d6c441b15b'::uuid),
--                ('8df8ba2b-a492-47be-a5a4-e1da13f4eba7'::uuid),
--                ('8e571049-5485-4812-bdbd-3ae0b2b0942b'::uuid),
--                ('9d9b2301-700d-4613-bba3-5c62017fb193'::uuid),
--                ('be35cd63-cbd3-4a8e-9171-77c5b2b8f3c6'::uuid),
--                ('faf57d3b-a954-4a3e-bd80-5ce4f5ee908c'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('2f1657b0-0ccd-4f68-93b5-0c6256a0e6e6'::uuid, '5-006'),
-- 	('7b08589b-c870-4632-9f36-50d6c441b15b'::uuid, '5-030'),
-- 	('8df8ba2b-a492-47be-a5a4-e1da13f4eba7'::uuid, '5-118'),
-- 	('8e571049-5485-4812-bdbd-3ae0b2b0942b'::uuid, '5-004'),
-- 	('9d9b2301-700d-4613-bba3-5c62017fb193'::uuid, '5-032'),
-- 	('be35cd63-cbd3-4a8e-9171-77c5b2b8f3c6'::uuid, '5-029'),
-- 	('faf57d3b-a954-4a3e-bd80-5ce4f5ee908c'::uuid, '5-009')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '5' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('2f1657b0-0ccd-4f68-93b5-0c6256a0e6e6',
--               '7b08589b-c870-4632-9f36-50d6c441b15b',
--               '8df8ba2b-a492-47be-a5a4-e1da13f4eba7',
--               '8e571049-5485-4812-bdbd-3ae0b2b0942b',
--               '9d9b2301-700d-4613-bba3-5c62017fb193',
--               'be35cd63-cbd3-4a8e-9171-77c5b2b8f3c6',
--               'faf57d3b-a954-4a3e-bd80-5ce4f5ee908c');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q5l1_modeles;
create temporary table _q5l1_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _q5l1_modeles values
	('2f1657b0-0ccd-4f68-93b5-0c6256a0e6e6', 'Nombres et calculs', 'Entiers : priorités opératoires', 'écriture d''une expression', '5-006'),
	('7b08589b-c870-4632-9f36-50d6c441b15b', 'Nombres et calculs', 'Puissances : sens et écritures', 'puissances de 10', '5-030'),
	('8df8ba2b-a492-47be-a5a4-e1da13f4eba7', 'Nombres et calculs', 'Entiers : priorités opératoires', 'écriture d''une expression', '5-118'),
	('8e571049-5485-4812-bdbd-3ae0b2b0942b', 'Nombres et calculs', 'Entiers : priorités opératoires', null, '5-004'),
	('9d9b2301-700d-4613-bba3-5c62017fb193', 'Nombres et calculs', 'Puissances : calculs', null, '5-032'),
	('be35cd63-cbd3-4a8e-9171-77c5b2b8f3c6', 'Nombres et calculs', 'Entiers : multiplication', 'carrés', '5-029'),
	('faf57d3b-a954-4a3e-bd80-5ce4f5ee908c', 'Arithmétique', 'Divisibilité', 'multiples et diviseurs', '5-009');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q5l1_modeles order by id;
select 1 from public.question_templates where id in (select id from _q5l1_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _q5l1_modeles add column noeud uuid, add column point_id uuid;
update _q5l1_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _q5l1_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q5l1_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '5' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q5l1_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q5l1_modeles where noeud is null),
			(select count(*) from _q5l1_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _q5l1_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
	end if;
	select count(*) into v_ranges from _q5l1_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q5l1_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q5l1_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q5l1_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q5l1_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q5l1_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _q5l1_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q5l1_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _q5l1_modeles;
