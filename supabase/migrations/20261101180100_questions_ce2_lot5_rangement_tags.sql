-- ============================================================================
-- Chantier « questions-ce2 », lot 5 (problèmes) : nœud et tag des 12 brouillons neufs
-- ============================================================================
-- Chaque modèle va sur le nœud de son point, une SOUS-NOTION de « Problèmes arithmétiques »
-- (branche « Nombres et calculs ») :
--   - 08cac7de (Problèmes parties-tout (jusqu'à 10 000)) → CE2-029, « Problèmes arithmétiques › parties-tout » ;
--   - a2bee082 (Problèmes parties-tout avec des prix à virgule) → CE2-029, « Problèmes arithmétiques › parties-tout » ;
--   - 4f47f8d6 (Problèmes parties-tout avec des fractions) → CE2-029, « Problèmes arithmétiques › parties-tout » ;
--   - 10f05004 (Problèmes de comparaison (jusqu'à 10 000)) → CE2-079, « Problèmes arithmétiques › comparaison » ;
--   - 28988062 (Problèmes en deux étapes (jusqu'à 10 000)) → CE2-030, « Problèmes arithmétiques › en deux étapes ou plus » ;
--   - 4948acaf (Problèmes de comparaison en deux étapes) → CE2-030, « Problèmes arithmétiques › en deux étapes ou plus » ;
--   - fe26e846 (Problèmes multiplicatifs : le tout) → CE2-031, « Problèmes arithmétiques › multiplicatifs » ;
--   - 37a715c4 (Problèmes de partage : le nombre de parts) → CE2-031, « Problèmes arithmétiques › multiplicatifs » ;
--   - 059b8bba (Problèmes de partage : la valeur d'une part) → CE2-031, « Problèmes arithmétiques › multiplicatifs » ;
--   - 0f5d9ad8 (Comparaison multiplicative : fois plus, fois moins) → CE2-033, « Problèmes arithmétiques › comparaison » ;
--   - 43b40fc7 (Problèmes mixtes en deux ou trois étapes) → CE2-032, « Problèmes arithmétiques › en deux étapes ou plus » ;
--   - 837d027b (Produits cartésiens : combien de façons ?) → CE2-034, « Problèmes arithmétiques › produits cartésiens » ;
-- Le modèle des fractions (4f47f8d6) porte CE2-029 (parties-tout, « fractions de même
-- dénominateur » aux bornes), donc le nœud « parties-tout », pas un nœud de fractions : sa catégorie
-- (Fractions · Calculer · Addition et Soustraction · 22) reste telle quelle.
-- Le modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag hors
-- du nœud du point) et porte UN point (ADR 0020). Ni le contenu, ni le niveau, ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-01 (journal docs/wip/questions-ce2-progress.md, § 9).
-- Créés en brouillon le 2026-11-01 par scripts/create-questions.ts (scripts/questions/ce2-5/),
-- qui ne pose ni nœud ni tag. Relevé de la prod du 2026-11-01 (MCP) : 12
-- brouillons [CE2], sans nœud ni tag ; nœuds des points relevés identiques aux chemins ci-dessus.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne les touche pas et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (12 modèles). Elle est prouvée par
-- tests/integration/questions-ce2-lot5-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-01), sinon
-- un rangement fait depuis à la main serait écrasé. Nœuds désignés par leur chemin, résolus
-- STRICTEMENT, et qui doivent être ceux des points.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès (question posée à David avant le SQL, tranchée le 2026-11-01, journal § 9) : personne
-- ne gagne ni ne perd d'accès (brouillons : prof et admin). Aucune règle ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 12 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('08cac7de-8f4d-42fa-b557-9b833cacde92'::uuid),
--                ('a2bee082-e50e-44b7-880b-baf7b16c9748'::uuid),
--                ('4f47f8d6-48ad-46e3-a237-57ce5ad64b9a'::uuid),
--                ('10f05004-a9a0-49d0-9646-52b1951cbc52'::uuid),
--                ('28988062-64e3-407f-8b14-9340e155fb5c'::uuid),
--                ('4948acaf-461e-4ba7-b969-e8b596d2fa34'::uuid),
--                ('fe26e846-1349-47de-b2bc-789194309461'::uuid),
--                ('37a715c4-273b-449e-811f-8d79232a3761'::uuid),
--                ('059b8bba-c68f-4b8d-b93a-04a33e8d1c1c'::uuid),
--                ('0f5d9ad8-4676-432e-88aa-d8f6fff43184'::uuid),
--                ('43b40fc7-917e-4e8f-8136-1868242354ac'::uuid),
--                ('837d027b-37c9-4378-b721-5122948d8402'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('08cac7de-8f4d-42fa-b557-9b833cacde92'::uuid, 'CE2-029'),
-- 	('a2bee082-e50e-44b7-880b-baf7b16c9748'::uuid, 'CE2-029'),
-- 	('4f47f8d6-48ad-46e3-a237-57ce5ad64b9a'::uuid, 'CE2-029'),
-- 	('10f05004-a9a0-49d0-9646-52b1951cbc52'::uuid, 'CE2-079'),
-- 	('28988062-64e3-407f-8b14-9340e155fb5c'::uuid, 'CE2-030'),
-- 	('4948acaf-461e-4ba7-b969-e8b596d2fa34'::uuid, 'CE2-030'),
-- 	('fe26e846-1349-47de-b2bc-789194309461'::uuid, 'CE2-031'),
-- 	('37a715c4-273b-449e-811f-8d79232a3761'::uuid, 'CE2-031'),
-- 	('059b8bba-c68f-4b8d-b93a-04a33e8d1c1c'::uuid, 'CE2-031'),
-- 	('0f5d9ad8-4676-432e-88aa-d8f6fff43184'::uuid, 'CE2-033'),
-- 	('43b40fc7-917e-4e8f-8136-1868242354ac'::uuid, 'CE2-032'),
-- 	('837d027b-37c9-4378-b721-5122948d8402'::uuid, 'CE2-034')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CE2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('08cac7de-8f4d-42fa-b557-9b833cacde92',
--               'a2bee082-e50e-44b7-880b-baf7b16c9748',
--               '4f47f8d6-48ad-46e3-a237-57ce5ad64b9a',
--               '10f05004-a9a0-49d0-9646-52b1951cbc52',
--               '28988062-64e3-407f-8b14-9340e155fb5c',
--               '4948acaf-461e-4ba7-b969-e8b596d2fa34',
--               'fe26e846-1349-47de-b2bc-789194309461',
--               '37a715c4-273b-449e-811f-8d79232a3761',
--               '059b8bba-c68f-4b8d-b93a-04a33e8d1c1c',
--               '0f5d9ad8-4676-432e-88aa-d8f6fff43184',
--               '43b40fc7-917e-4e8f-8136-1868242354ac',
--               '837d027b-37c9-4378-b721-5122948d8402');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qce2l5_modeles;
create temporary table _qce2l5_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qce2l5_modeles values
	('08cac7de-8f4d-42fa-b557-9b833cacde92', 'Nombres et calculs', 'Problèmes arithmétiques', 'parties-tout', 'CE2-029'),
	('a2bee082-e50e-44b7-880b-baf7b16c9748', 'Nombres et calculs', 'Problèmes arithmétiques', 'parties-tout', 'CE2-029'),
	('4f47f8d6-48ad-46e3-a237-57ce5ad64b9a', 'Nombres et calculs', 'Problèmes arithmétiques', 'parties-tout', 'CE2-029'),
	('10f05004-a9a0-49d0-9646-52b1951cbc52', 'Nombres et calculs', 'Problèmes arithmétiques', 'comparaison', 'CE2-079'),
	('28988062-64e3-407f-8b14-9340e155fb5c', 'Nombres et calculs', 'Problèmes arithmétiques', 'en deux étapes ou plus', 'CE2-030'),
	('4948acaf-461e-4ba7-b969-e8b596d2fa34', 'Nombres et calculs', 'Problèmes arithmétiques', 'en deux étapes ou plus', 'CE2-030'),
	('fe26e846-1349-47de-b2bc-789194309461', 'Nombres et calculs', 'Problèmes arithmétiques', 'multiplicatifs', 'CE2-031'),
	('37a715c4-273b-449e-811f-8d79232a3761', 'Nombres et calculs', 'Problèmes arithmétiques', 'multiplicatifs', 'CE2-031'),
	('059b8bba-c68f-4b8d-b93a-04a33e8d1c1c', 'Nombres et calculs', 'Problèmes arithmétiques', 'multiplicatifs', 'CE2-031'),
	('0f5d9ad8-4676-432e-88aa-d8f6fff43184', 'Nombres et calculs', 'Problèmes arithmétiques', 'comparaison', 'CE2-033'),
	('43b40fc7-917e-4e8f-8136-1868242354ac', 'Nombres et calculs', 'Problèmes arithmétiques', 'en deux étapes ou plus', 'CE2-032'),
	('837d027b-37c9-4378-b721-5122948d8402', 'Nombres et calculs', 'Problèmes arithmétiques', 'produits cartésiens', 'CE2-034');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qce2l5_modeles order by id;
select 1 from public.question_templates where id in (select id from _qce2l5_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qce2l5_modeles add column noeud uuid, add column point_id uuid;
update _qce2l5_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qce2l5_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qce2l5_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CE2' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qce2l5_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qce2l5_modeles where noeud is null),
			(select count(*) from _qce2l5_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qce2l5_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 12) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 12', v_presents;
	end if;
	select count(*) into v_ranges from _qce2l5_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qce2l5_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qce2l5_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qce2l5_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qce2l5_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qce2l5_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qce2l5_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qce2l5_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qce2l5_modeles;
