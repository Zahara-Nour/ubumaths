-- ============================================================================
-- Chantier « questions », lot A5 du CP (problèmes) : nœud et tag de 4 modèles neufs
-- ============================================================================
--   - da6e20cd (Problèmes parties-tout (jusqu'à 20)) et a1c5da8b (… (jusqu'à 100)) → CP-029,
--     sous-notion « Problèmes arithmétiques > parties-tout » ;
--   - 5c6999c6 (Problèmes en deux étapes (jusqu'à 30)) → CP-030, « … > en deux étapes ou plus » ;
--   - 87460358 (Problèmes multiplicatifs (jusqu'à 30)) → CP-031, « … > multiplicatifs ».
-- Chaque modèle va sur la SOUS-NOTION de son point (le point y est rangé ;
-- question_template_points_check_rules refuse un tag hors du nœud du point), et porte UN point
-- (ADR 0020 : au plus un point par programme). Ni le contenu, ni les niveaux, ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-25 (journal docs/wip/questions-progress.md § 4 sexies). Les
-- modèles ont été créés en brouillon le 2026-10-25 par scripts/create-questions.ts
-- (scripts/questions/cp-a5/), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (4 modèles). Elle est prouvée
-- par tests/integration/questions-cp-a5-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-25), sinon
-- un rangement fait depuis à la main serait écrasé. Nœuds désignés par leur chemin, résolus
-- STRICTEMENT.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès. Aucune règle ne change. Effet visible : les
-- 4 brouillons apparaissent sous leur sous-notion et sous leur point dans l'admin ; les élèves ne
-- les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 4 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('5c6999c6-0c15-4461-80d0-4a83d65e7f69'::uuid),
--                ('87460358-375f-4051-b6fa-4182d136a157'::uuid),
--                ('a1c5da8b-caca-4e55-9f51-152b14e782b3'::uuid),
--                ('da6e20cd-31f3-4be1-b2c7-180bdd0b482d'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('da6e20cd-31f3-4be1-b2c7-180bdd0b482d'::uuid, 'CP-029'),
-- 	('a1c5da8b-caca-4e55-9f51-152b14e782b3'::uuid, 'CP-029'),
-- 	('5c6999c6-0c15-4461-80d0-4a83d65e7f69'::uuid, 'CP-030'),
-- 	('87460358-375f-4051-b6fa-4182d136a157'::uuid, 'CP-031')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CP' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('5c6999c6-0c15-4461-80d0-4a83d65e7f69',
--               '87460358-375f-4051-b6fa-4182d136a157',
--               'a1c5da8b-caca-4e55-9f51-152b14e782b3',
--               'da6e20cd-31f3-4be1-b2c7-180bdd0b482d');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qa5_modeles;
create temporary table _qa5_modeles (
	id uuid primary key,
	sous_notion text not null,
	code text not null
);
insert into _qa5_modeles values
	('da6e20cd-31f3-4be1-b2c7-180bdd0b482d', 'parties-tout', 'CP-029'),
	('a1c5da8b-caca-4e55-9f51-152b14e782b3', 'parties-tout', 'CP-029'),
	('5c6999c6-0c15-4461-80d0-4a83d65e7f69', 'en deux étapes ou plus', 'CP-030'),
	('87460358-375f-4051-b6fa-4182d136a157', 'multiplicatifs', 'CP-031');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qa5_modeles order by id;
select 1 from public.question_templates where id in (select id from _qa5_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Les modèles vont sur la sous-notion de leur point, sous « Problèmes arithmétiques »
alter table _qa5_modeles add column noeud uuid, add column point_id uuid;
update _qa5_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = 'Nombres et calculs'
   and n.name = 'Problèmes arithmétiques' and s.name = r.sous_notion;
update _qa5_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CP' and p.code = r.code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _qa5_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qa5_modeles where noeud is null),
			(select count(*) from _qa5_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qa5_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 4) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 4', v_presents;
	end if;
	select count(*) into v_ranges from _qa5_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qa5_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qa5_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qa5_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qa5_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qa5_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qa5_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qa5_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qa5_modeles;
