-- ============================================================================
-- Chantier « questions », lot A3 du CP (ordinaux) : nœud et tag de 6 modèles neufs
-- ============================================================================
--   - d437959a (Le rang en lettres) → CP-009 ;
--   - c3b236fc (Le rang en chiffres) → CP-009 ;
--   - 7dc1629e (Dire la place) → CP-010 ;
--   - 10226cae (Repérer un rang dans une liste ou une file) → CP-011 ;
--   - 0559204d (Rang et nombre d'enfants devant) → CP-012 ;
--   - 62ae6847 (Suites qui se répètent) → CP-013 ;
--   tous sur la sous-notion « Nombres et calculs > Entiers : numération > ordinaux et rangs ».
-- Chaque modèle va sur la SOUS-NOTION de son point (le point y est rangé ;
-- question_template_points_check_rules refuse un tag hors du nœud du point), et porte UN point
-- (ADR 0020 : au plus un point par programme). Ni le contenu, ni les niveaux, ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-25 (journal docs/wip/questions-progress.md § 4 septies). Les
-- modèles ont été créés en brouillon le 2026-10-25 par scripts/create-questions.ts
-- (scripts/questions/cp-a3/), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée
-- par tests/integration/questions-cp-a3-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-25), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès. Aucune règle ne change. Effet visible : les
-- 6 brouillons apparaissent sous leur sous-notion et sous leur point dans l'admin ; les élèves ne
-- les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('0559204d-cee6-4c77-b4e8-33088416ff18'::uuid),
--                ('10226cae-4a16-4e9f-98a1-469099d3e192'::uuid),
--                ('62ae6847-6cc4-41c9-98c1-97b26487c4d0'::uuid),
--                ('7dc1629e-182a-48b0-a37c-05a25804cfc3'::uuid),
--                ('c3b236fc-8000-4111-950c-c98f6d788abd'::uuid),
--                ('d437959a-09d2-4441-bd8b-b8ad1893f8a8'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('d437959a-09d2-4441-bd8b-b8ad1893f8a8'::uuid, 'CP-009'),
-- 	('c3b236fc-8000-4111-950c-c98f6d788abd'::uuid, 'CP-009'),
-- 	('7dc1629e-182a-48b0-a37c-05a25804cfc3'::uuid, 'CP-010'),
-- 	('10226cae-4a16-4e9f-98a1-469099d3e192'::uuid, 'CP-011'),
-- 	('0559204d-cee6-4c77-b4e8-33088416ff18'::uuid, 'CP-012'),
-- 	('62ae6847-6cc4-41c9-98c1-97b26487c4d0'::uuid, 'CP-013')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CP' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('0559204d-cee6-4c77-b4e8-33088416ff18',
--               '10226cae-4a16-4e9f-98a1-469099d3e192',
--               '62ae6847-6cc4-41c9-98c1-97b26487c4d0',
--               '7dc1629e-182a-48b0-a37c-05a25804cfc3',
--               'c3b236fc-8000-4111-950c-c98f6d788abd',
--               'd437959a-09d2-4441-bd8b-b8ad1893f8a8');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qa3_modeles;
create temporary table _qa3_modeles (
	id uuid primary key,
	sous_notion text not null,
	code text not null
);
insert into _qa3_modeles values
	('d437959a-09d2-4441-bd8b-b8ad1893f8a8', 'ordinaux et rangs', 'CP-009'),
	('c3b236fc-8000-4111-950c-c98f6d788abd', 'ordinaux et rangs', 'CP-009'),
	('7dc1629e-182a-48b0-a37c-05a25804cfc3', 'ordinaux et rangs', 'CP-010'),
	('10226cae-4a16-4e9f-98a1-469099d3e192', 'ordinaux et rangs', 'CP-011'),
	('0559204d-cee6-4c77-b4e8-33088416ff18', 'ordinaux et rangs', 'CP-012'),
	('62ae6847-6cc4-41c9-98c1-97b26487c4d0', 'ordinaux et rangs', 'CP-013');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qa3_modeles order by id;
select 1 from public.question_templates where id in (select id from _qa3_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Les modèles vont sur la sous-notion de leur point, sous « Entiers : numération »
alter table _qa3_modeles add column noeud uuid, add column point_id uuid;
update _qa3_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = 'Nombres et calculs'
   and n.name = 'Entiers : numération' and s.name = r.sous_notion;
update _qa3_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CP' and p.code = r.code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _qa3_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qa3_modeles where noeud is null),
			(select count(*) from _qa3_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qa3_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	select count(*) into v_ranges from _qa3_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qa3_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qa3_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qa3_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qa3_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qa3_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qa3_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qa3_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qa3_modeles;
