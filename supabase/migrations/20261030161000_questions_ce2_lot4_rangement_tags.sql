-- ============================================================================
-- Chantier « questions-ce2 », lot 4 (fractions) : nœud et tag des 10 brouillons neufs
-- ============================================================================
-- Chaque modèle va sur le nœud de son point, une SOUS-NOTION de « Nombres et calculs » :
--   - e0aaf18f (Égalité de fractions : le numérateur manquant) → CE2-011, « Fractions : sens et écritures › égalité de fractions » ;
--   - 176b6b93 (Égalité de fractions : le dénominateur manquant) → CE2-011, « Fractions : sens et écritures › égalité de fractions » ;
--   - 51b95890 (Trouver la fraction égale) → CE2-011, « Fractions : sens et écritures › égalité de fractions » ;
--   - 788a22c7 (Comparer des fractions de même dénominateur) → CE2-013, « Fractions : sens et écritures › ordre » ;
--   - 75ec78a1 (Comparer des fractions de même numérateur) → CE2-013, « Fractions : sens et écritures › ordre » ;
--   - c21fe20b (Comparer des fractions dont un dénominateur est multiple de l'autre) → CE2-013, « Fractions : sens et écritures › ordre » ;
--   - b892331e (Additionner des fractions de même dénominateur) → CE2-014, « Fractions : calculs › addition et soustraction » ;
--   - c73dfcd0 (Additionner des fractions dont un dénominateur est multiple de l'autre) → CE2-014, « Fractions : calculs › addition et soustraction » ;
--   - 1f6fb2c2 (Soustraire des fractions de même dénominateur) → CE2-089, « Fractions : calculs › addition et soustraction » ;
--   - de7d9cf3 (Soustraire des fractions dont un dénominateur est multiple de l'autre) → CE2-089, « Fractions : calculs › addition et soustraction » ;
-- Le modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag hors
-- du nœud du point) et porte UN point (ADR 0020). Ni le contenu, ni le niveau, ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-10-29 (journal docs/wip/questions-ce2-progress.md, § 8).
-- Créés en brouillon le 2026-10-29 par scripts/create-questions.ts (scripts/questions/ce2-4/),
-- qui ne pose ni nœud ni tag. Relevé de la prod du 2026-10-30 (MCP) : 10
-- brouillons [CE2], sans nœud ni tag ; nœuds des points relevés identiques aux chemins ci-dessus.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne les touche pas et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (10 modèles). Elle est prouvée par
-- tests/integration/questions-ce2-lot4-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-30), sinon
-- un rangement fait depuis à la main serait écrasé. Nœuds désignés par leur chemin, résolus
-- STRICTEMENT, et qui doivent être ceux des points.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès (question posée à David avant le SQL, tranchée le 2026-10-29, journal § 8) : personne
-- ne gagne ni ne perd d'accès (brouillons : prof et admin). Aucune règle ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 10 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('e0aaf18f-0c9e-4de2-81a5-13e2e5252c4d'::uuid),
--                ('176b6b93-fc2b-4f68-9b77-e5d26303d5a2'::uuid),
--                ('51b95890-db2f-4174-9173-a94a6a596438'::uuid),
--                ('788a22c7-db62-4a5c-9bff-992896ec2691'::uuid),
--                ('75ec78a1-06fc-4581-96f6-6eab3b53b9a4'::uuid),
--                ('c21fe20b-afc2-4de1-9e24-408208102bdc'::uuid),
--                ('b892331e-4450-4806-88ac-0775fcc908a4'::uuid),
--                ('c73dfcd0-855c-417d-93ec-cae6d8e45138'::uuid),
--                ('1f6fb2c2-f7b6-46d2-bdd9-defd927f8247'::uuid),
--                ('de7d9cf3-db6c-4ff0-9a36-bd370ac70ab3'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('e0aaf18f-0c9e-4de2-81a5-13e2e5252c4d'::uuid, 'CE2-011'),
-- 	('176b6b93-fc2b-4f68-9b77-e5d26303d5a2'::uuid, 'CE2-011'),
-- 	('51b95890-db2f-4174-9173-a94a6a596438'::uuid, 'CE2-011'),
-- 	('788a22c7-db62-4a5c-9bff-992896ec2691'::uuid, 'CE2-013'),
-- 	('75ec78a1-06fc-4581-96f6-6eab3b53b9a4'::uuid, 'CE2-013'),
-- 	('c21fe20b-afc2-4de1-9e24-408208102bdc'::uuid, 'CE2-013'),
-- 	('b892331e-4450-4806-88ac-0775fcc908a4'::uuid, 'CE2-014'),
-- 	('c73dfcd0-855c-417d-93ec-cae6d8e45138'::uuid, 'CE2-014'),
-- 	('1f6fb2c2-f7b6-46d2-bdd9-defd927f8247'::uuid, 'CE2-089'),
-- 	('de7d9cf3-db6c-4ff0-9a36-bd370ac70ab3'::uuid, 'CE2-089')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CE2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('e0aaf18f-0c9e-4de2-81a5-13e2e5252c4d',
--               '176b6b93-fc2b-4f68-9b77-e5d26303d5a2',
--               '51b95890-db2f-4174-9173-a94a6a596438',
--               '788a22c7-db62-4a5c-9bff-992896ec2691',
--               '75ec78a1-06fc-4581-96f6-6eab3b53b9a4',
--               'c21fe20b-afc2-4de1-9e24-408208102bdc',
--               'b892331e-4450-4806-88ac-0775fcc908a4',
--               'c73dfcd0-855c-417d-93ec-cae6d8e45138',
--               '1f6fb2c2-f7b6-46d2-bdd9-defd927f8247',
--               'de7d9cf3-db6c-4ff0-9a36-bd370ac70ab3');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qce2l4_modeles;
create temporary table _qce2l4_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qce2l4_modeles values
	('e0aaf18f-0c9e-4de2-81a5-13e2e5252c4d', 'Nombres et calculs', 'Fractions : sens et écritures', 'égalité de fractions', 'CE2-011'),
	('176b6b93-fc2b-4f68-9b77-e5d26303d5a2', 'Nombres et calculs', 'Fractions : sens et écritures', 'égalité de fractions', 'CE2-011'),
	('51b95890-db2f-4174-9173-a94a6a596438', 'Nombres et calculs', 'Fractions : sens et écritures', 'égalité de fractions', 'CE2-011'),
	('788a22c7-db62-4a5c-9bff-992896ec2691', 'Nombres et calculs', 'Fractions : sens et écritures', 'ordre', 'CE2-013'),
	('75ec78a1-06fc-4581-96f6-6eab3b53b9a4', 'Nombres et calculs', 'Fractions : sens et écritures', 'ordre', 'CE2-013'),
	('c21fe20b-afc2-4de1-9e24-408208102bdc', 'Nombres et calculs', 'Fractions : sens et écritures', 'ordre', 'CE2-013'),
	('b892331e-4450-4806-88ac-0775fcc908a4', 'Nombres et calculs', 'Fractions : calculs', 'addition et soustraction', 'CE2-014'),
	('c73dfcd0-855c-417d-93ec-cae6d8e45138', 'Nombres et calculs', 'Fractions : calculs', 'addition et soustraction', 'CE2-014'),
	('1f6fb2c2-f7b6-46d2-bdd9-defd927f8247', 'Nombres et calculs', 'Fractions : calculs', 'addition et soustraction', 'CE2-089'),
	('de7d9cf3-db6c-4ff0-9a36-bd370ac70ab3', 'Nombres et calculs', 'Fractions : calculs', 'addition et soustraction', 'CE2-089');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qce2l4_modeles order by id;
select 1 from public.question_templates where id in (select id from _qce2l4_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qce2l4_modeles add column noeud uuid, add column point_id uuid;
update _qce2l4_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qce2l4_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qce2l4_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CE2' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qce2l4_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qce2l4_modeles where noeud is null),
			(select count(*) from _qce2l4_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qce2l4_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 10) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 10', v_presents;
	end if;
	select count(*) into v_ranges from _qce2l4_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qce2l4_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qce2l4_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qce2l4_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qce2l4_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qce2l4_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qce2l4_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qce2l4_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qce2l4_modeles;
