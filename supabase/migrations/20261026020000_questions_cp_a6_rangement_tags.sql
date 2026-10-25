-- ============================================================================
-- Chantier « questions », lot A6 du CP (grandeurs et lexique) : nœud et tag de 9 modèles neufs
-- ============================================================================
--   - 92c8e499 (Écrire un nombre en lettres) → CP-004, sur « Nombres et calculs > Entiers : numération > écritures » ;
--   - 54ea05d7 (Lire un nombre écrit en lettres) → CP-004, sur « Nombres et calculs > Entiers : numération > écritures » ;
--   - 192f52f3 (Long, court, près, loin) → CP-032, sur « Grandeurs et mesures > Longueurs » ;
--   - 9ee150a2 (Mètre ou centimètre ?) → CP-036, sur « Grandeurs et mesures > Longueurs > unités et conversions » ;
--   - 39dfd0cc (Quelle longueur ?) → CP-037, sur « Grandeurs et mesures > Longueurs > comparaison et mesure » ;
--   - 7e11b651 (Un mètre, c'est 100 centimètres) → CP-038, sur « Grandeurs et mesures > Longueurs > unités et conversions » ;
--   - e9e9970b (Lourd ou léger ?) → CP-039, sur « Grandeurs et mesures > Masses » ;
--   - 35426707 (Les mots de la monnaie) → CP-041, sur « Grandeurs et mesures > Monnaie » ;
--   - fc63fdf0 (Quelle heure pour… ?) → CP-048, sur « Grandeurs et mesures > Durées > lecture de l'heure » ;
-- Chaque modèle va sur le NŒUD de son point (notion, ou sous-notion quand le point en a une ;
-- question_template_points_check_rules refuse un tag hors du nœud du point), et porte UN point
-- (ADR 0020 : au plus un point par programme). Ni le contenu, ni les niveaux, ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-25 (journal docs/wip/questions-progress.md § 4 octies). Les
-- modèles ont été créés en brouillon le 2026-10-25 par scripts/create-questions.ts
-- (scripts/questions/cp-a6/), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (9 modèles). Elle est prouvée
-- par tests/integration/questions-cp-a6-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-25), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès. Aucune règle ne change. Effet visible : les
-- 9 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne
-- les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 9 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('192f52f3-7363-473c-a174-e3b5fb48a835'::uuid),
--                ('35426707-aba5-4ab7-aef8-b1fde807aa69'::uuid),
--                ('39dfd0cc-fb95-41cb-adbd-88e240b19abd'::uuid),
--                ('54ea05d7-c160-4803-a440-d583a6c4fe10'::uuid),
--                ('7e11b651-c18d-4462-b141-5e735023c17d'::uuid),
--                ('92c8e499-865c-4e41-82d0-0679ae311afd'::uuid),
--                ('9ee150a2-7bbb-402a-8ddf-77a21fee6f8c'::uuid),
--                ('e9e9970b-1cc7-4567-9cde-112efb0405c2'::uuid),
--                ('fc63fdf0-fe90-4fd3-a5c4-347db2510ee0'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('92c8e499-865c-4e41-82d0-0679ae311afd'::uuid, 'CP-004'),
-- 	('54ea05d7-c160-4803-a440-d583a6c4fe10'::uuid, 'CP-004'),
-- 	('192f52f3-7363-473c-a174-e3b5fb48a835'::uuid, 'CP-032'),
-- 	('9ee150a2-7bbb-402a-8ddf-77a21fee6f8c'::uuid, 'CP-036'),
-- 	('39dfd0cc-fb95-41cb-adbd-88e240b19abd'::uuid, 'CP-037'),
-- 	('7e11b651-c18d-4462-b141-5e735023c17d'::uuid, 'CP-038'),
-- 	('e9e9970b-1cc7-4567-9cde-112efb0405c2'::uuid, 'CP-039'),
-- 	('35426707-aba5-4ab7-aef8-b1fde807aa69'::uuid, 'CP-041'),
-- 	('fc63fdf0-fe90-4fd3-a5c4-347db2510ee0'::uuid, 'CP-048')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CP' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('192f52f3-7363-473c-a174-e3b5fb48a835',
--               '35426707-aba5-4ab7-aef8-b1fde807aa69',
--               '39dfd0cc-fb95-41cb-adbd-88e240b19abd',
--               '54ea05d7-c160-4803-a440-d583a6c4fe10',
--               '7e11b651-c18d-4462-b141-5e735023c17d',
--               '92c8e499-865c-4e41-82d0-0679ae311afd',
--               '9ee150a2-7bbb-402a-8ddf-77a21fee6f8c',
--               'e9e9970b-1cc7-4567-9cde-112efb0405c2',
--               'fc63fdf0-fe90-4fd3-a5c4-347db2510ee0');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qa6_modeles;
create temporary table _qa6_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qa6_modeles values
	('92c8e499-865c-4e41-82d0-0679ae311afd', 'Nombres et calculs', 'Entiers : numération', 'écritures', 'CP-004'),
	('54ea05d7-c160-4803-a440-d583a6c4fe10', 'Nombres et calculs', 'Entiers : numération', 'écritures', 'CP-004'),
	('192f52f3-7363-473c-a174-e3b5fb48a835', 'Grandeurs et mesures', 'Longueurs', null, 'CP-032'),
	('9ee150a2-7bbb-402a-8ddf-77a21fee6f8c', 'Grandeurs et mesures', 'Longueurs', 'unités et conversions', 'CP-036'),
	('39dfd0cc-fb95-41cb-adbd-88e240b19abd', 'Grandeurs et mesures', 'Longueurs', 'comparaison et mesure', 'CP-037'),
	('7e11b651-c18d-4462-b141-5e735023c17d', 'Grandeurs et mesures', 'Longueurs', 'unités et conversions', 'CP-038'),
	('e9e9970b-1cc7-4567-9cde-112efb0405c2', 'Grandeurs et mesures', 'Masses', null, 'CP-039'),
	('35426707-aba5-4ab7-aef8-b1fde807aa69', 'Grandeurs et mesures', 'Monnaie', null, 'CP-041'),
	('fc63fdf0-fe90-4fd3-a5c4-347db2510ee0', 'Grandeurs et mesures', 'Durées', 'lecture de l''heure', 'CP-048');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qa6_modeles order by id;
select 1 from public.question_templates where id in (select id from _qa6_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qa6_modeles add column noeud uuid, add column point_id uuid;
update _qa6_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qa6_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qa6_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CP' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qa6_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qa6_modeles where noeud is null),
			(select count(*) from _qa6_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qa6_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 9) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 9', v_presents;
	end if;
	select count(*) into v_ranges from _qa6_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qa6_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qa6_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qa6_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qa6_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qa6_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qa6_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qa6_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qa6_modeles;
