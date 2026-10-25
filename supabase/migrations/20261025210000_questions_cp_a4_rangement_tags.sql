-- ============================================================================
-- Chantier « questions », lot A4 du CP (sens des opérations) : nœud et tag de 7 modèles neufs
-- ============================================================================
--   - a59fba89 (Addition ou soustraction ?) → CP-014 ; 3bde8d25 (Soustraction ou addition ?)
--     → CP-077 ; c342f32e (Les signes + et −) → CP-015 ; c4644788 (Les signes − et +) → CP-078 ;
--     f7463b7d (Le signe =) → CP-079 : notion « Entiers : addition et soustraction » ;
--   - 6e712e78 (Le sens de « fois » : quel calcul ?) et b873739e (… : combien ?) → CP-017 :
--     notion « Entiers : multiplication ».
-- Chaque modèle va sur la NOTION de son point, sans sous-notion (le point y est rangé ;
-- question_template_points_check_rules refuse un tag hors du nœud du point), et porte UN point
-- (ADR 0020 : au plus un point par programme). Ni le contenu, ni les niveaux, ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-25 (journal docs/wip/questions-progress.md § 4 quinquies). Les
-- modèles ont été créés en brouillon le 2026-10-25 par scripts/create-questions.ts
-- (scripts/questions/cp-a4/), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée
-- par tests/integration/questions-cp-a4-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-25), sinon
-- un rangement fait depuis à la main serait écrasé. Nœuds désignés par leur chemin, résolus
-- STRICTEMENT.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question tranchée par David le 2026-10-25). Aucune
-- règle ne change. Effet visible : les 7 brouillons apparaissent sous leur notion et sous leur
-- point dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('3bde8d25-64d3-4361-9765-85f38b198656'::uuid),
--                ('6e712e78-2bef-4028-be37-745c47418797'::uuid),
--                ('a59fba89-002e-41d8-82b0-6ecabaf21352'::uuid),
--                ('b873739e-1e3e-4530-8b7c-7bcaf048e404'::uuid),
--                ('c342f32e-f25d-4cf8-9035-ffa36870d58f'::uuid),
--                ('c4644788-e3a7-4266-bcb0-03bbbdc81c94'::uuid),
--                ('f7463b7d-3093-4cd6-b074-fb0072844305'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('a59fba89-002e-41d8-82b0-6ecabaf21352'::uuid, 'CP-014'),
-- 	('3bde8d25-64d3-4361-9765-85f38b198656'::uuid, 'CP-077'),
-- 	('c342f32e-f25d-4cf8-9035-ffa36870d58f'::uuid, 'CP-015'),
-- 	('c4644788-e3a7-4266-bcb0-03bbbdc81c94'::uuid, 'CP-078'),
-- 	('f7463b7d-3093-4cd6-b074-fb0072844305'::uuid, 'CP-079'),
-- 	('6e712e78-2bef-4028-be37-745c47418797'::uuid, 'CP-017'),
-- 	('b873739e-1e3e-4530-8b7c-7bcaf048e404'::uuid, 'CP-017')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CP' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('3bde8d25-64d3-4361-9765-85f38b198656',
--               '6e712e78-2bef-4028-be37-745c47418797',
--               'a59fba89-002e-41d8-82b0-6ecabaf21352',
--               'b873739e-1e3e-4530-8b7c-7bcaf048e404',
--               'c342f32e-f25d-4cf8-9035-ffa36870d58f',
--               'c4644788-e3a7-4266-bcb0-03bbbdc81c94',
--               'f7463b7d-3093-4cd6-b074-fb0072844305');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qa4_modeles;
create temporary table _qa4_modeles (
	id uuid primary key,
	notion text not null,
	code text not null
);
insert into _qa4_modeles values
	('a59fba89-002e-41d8-82b0-6ecabaf21352', 'Entiers : addition et soustraction', 'CP-014'),
	('3bde8d25-64d3-4361-9765-85f38b198656', 'Entiers : addition et soustraction', 'CP-077'),
	('c342f32e-f25d-4cf8-9035-ffa36870d58f', 'Entiers : addition et soustraction', 'CP-015'),
	('c4644788-e3a7-4266-bcb0-03bbbdc81c94', 'Entiers : addition et soustraction', 'CP-078'),
	('f7463b7d-3093-4cd6-b074-fb0072844305', 'Entiers : addition et soustraction', 'CP-079'),
	('6e712e78-2bef-4028-be37-745c47418797', 'Entiers : multiplication', 'CP-017'),
	('b873739e-1e3e-4530-8b7c-7bcaf048e404', 'Entiers : multiplication', 'CP-017');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qa4_modeles order by id;
select 1 from public.question_templates where id in (select id from _qa4_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Les modèles vont sur la notion elle-même : ses points y sont rangés, sans sous-notion
alter table _qa4_modeles add column noeud uuid, add column point_id uuid;
update _qa4_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = 'Nombres et calculs'
   and n.name = r.notion;
update _qa4_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CP' and p.code = r.code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _qa4_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qa4_modeles where noeud is null),
			(select count(*) from _qa4_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qa4_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
	end if;
	select count(*) into v_ranges from _qa4_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qa4_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qa4_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qa4_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qa4_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qa4_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qa4_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qa4_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qa4_modeles;
