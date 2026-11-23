-- ============================================================================
-- Chantier « questions-5 », lot 2 (relatifs) : nœud et tag de 8 modèles neufs
-- ============================================================================
--   - 0b491d0e (Calculer un écart) → 5-024, sur « Nombres et calculs > Relatifs : calculs » ;
--   - 3b9d3ec2 (Donner la valeur absolue d'un nombre) → 5-120, sur « Nombres et calculs > Relatifs : sens et écritures > définition » ;
--   - 469f1c9d (Variation de température ou d'altitude) → 5-024, sur « Nombres et calculs > Relatifs : calculs » ;
--   - 7f9d7df5 (Les parenthèses sont-elles indispensables ?) → 5-021, sur « Nombres et calculs > Relatifs : calculs > sommes algébriques » ;
--   - b92b4b51 (Additionner plusieurs nombres relatifs) → 5-019, sur « Nombres et calculs > Relatifs : calculs > sommes » ;
--   - c52836ad (Traduire une situation par un nombre relatif) → 5-015, sur « Nombres et calculs > Relatifs : sens et écritures » ;
--   - d5d1f676 (Additionner plusieurs nombres relatifs, décimaux) → 5-019, sur « Nombres et calculs > Relatifs : calculs > sommes » ;
--   - fc8fb430 (Positif, négatif, strictement ?) → 5-014, sur « Nombres et calculs > Relatifs : sens et écritures > définition » ;
-- Chaque modèle va sur le nœud de son point, sous-notion ou notion (5-015, 5-024) :
-- question_template_points_check_rules refuse un tag hors du nœud du point, et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-10-28 (journal docs/wip/questions-5-progress.md § 10). Les
-- modèles ont été créés en brouillon le 2026-10-28 par scripts/create-questions.ts
-- (scripts/questions/5-relatifs/, #1935), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-10-28 (MCP) : 8 brouillons [5], sans nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (8 modèles). Elle est prouvée par
-- tests/integration/questions-5-lot2-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-28), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin seul ; question posée à David
-- avec la phase 0 du lot 2, journal § 10). Aucune règle ne change. Effet visible : les 8 brouillons
-- apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient qu'une
-- fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 8 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('0b491d0e-3063-426f-91aa-847b71fa9057'::uuid),
--                ('3b9d3ec2-502e-4443-b03d-6a098a97dd41'::uuid),
--                ('469f1c9d-9f38-43e7-8464-ab4af7dfb682'::uuid),
--                ('7f9d7df5-3be5-43b2-8dac-9c37e04c7909'::uuid),
--                ('b92b4b51-5ad2-45d9-bd32-a83547f7cc6c'::uuid),
--                ('c52836ad-e754-4523-9a3e-04cb5822aefd'::uuid),
--                ('d5d1f676-561b-4cc1-acf6-8e0de532089b'::uuid),
--                ('fc8fb430-1510-4984-9cfd-56448de8793a'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('0b491d0e-3063-426f-91aa-847b71fa9057'::uuid, '5-024'),
-- 	('3b9d3ec2-502e-4443-b03d-6a098a97dd41'::uuid, '5-120'),
-- 	('469f1c9d-9f38-43e7-8464-ab4af7dfb682'::uuid, '5-024'),
-- 	('7f9d7df5-3be5-43b2-8dac-9c37e04c7909'::uuid, '5-021'),
-- 	('b92b4b51-5ad2-45d9-bd32-a83547f7cc6c'::uuid, '5-019'),
-- 	('c52836ad-e754-4523-9a3e-04cb5822aefd'::uuid, '5-015'),
-- 	('d5d1f676-561b-4cc1-acf6-8e0de532089b'::uuid, '5-019'),
-- 	('fc8fb430-1510-4984-9cfd-56448de8793a'::uuid, '5-014')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '5' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('0b491d0e-3063-426f-91aa-847b71fa9057',
--               '3b9d3ec2-502e-4443-b03d-6a098a97dd41',
--               '469f1c9d-9f38-43e7-8464-ab4af7dfb682',
--               '7f9d7df5-3be5-43b2-8dac-9c37e04c7909',
--               'b92b4b51-5ad2-45d9-bd32-a83547f7cc6c',
--               'c52836ad-e754-4523-9a3e-04cb5822aefd',
--               'd5d1f676-561b-4cc1-acf6-8e0de532089b',
--               'fc8fb430-1510-4984-9cfd-56448de8793a');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q5l2_modeles;
create temporary table _q5l2_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _q5l2_modeles values
	('0b491d0e-3063-426f-91aa-847b71fa9057', 'Nombres et calculs', 'Relatifs : calculs', null, '5-024'),
	('3b9d3ec2-502e-4443-b03d-6a098a97dd41', 'Nombres et calculs', 'Relatifs : sens et écritures', 'définition', '5-120'),
	('469f1c9d-9f38-43e7-8464-ab4af7dfb682', 'Nombres et calculs', 'Relatifs : calculs', null, '5-024'),
	('7f9d7df5-3be5-43b2-8dac-9c37e04c7909', 'Nombres et calculs', 'Relatifs : calculs', 'sommes algébriques', '5-021'),
	('b92b4b51-5ad2-45d9-bd32-a83547f7cc6c', 'Nombres et calculs', 'Relatifs : calculs', 'sommes', '5-019'),
	('c52836ad-e754-4523-9a3e-04cb5822aefd', 'Nombres et calculs', 'Relatifs : sens et écritures', null, '5-015'),
	('d5d1f676-561b-4cc1-acf6-8e0de532089b', 'Nombres et calculs', 'Relatifs : calculs', 'sommes', '5-019'),
	('fc8fb430-1510-4984-9cfd-56448de8793a', 'Nombres et calculs', 'Relatifs : sens et écritures', 'définition', '5-014');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q5l2_modeles order by id;
select 1 from public.question_templates where id in (select id from _q5l2_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _q5l2_modeles add column noeud uuid, add column point_id uuid;
update _q5l2_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _q5l2_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q5l2_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '5' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q5l2_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q5l2_modeles where noeud is null),
			(select count(*) from _q5l2_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _q5l2_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 8) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 8', v_presents;
	end if;
	select count(*) into v_ranges from _q5l2_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q5l2_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q5l2_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q5l2_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q5l2_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q5l2_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _q5l2_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q5l2_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _q5l2_modeles;
