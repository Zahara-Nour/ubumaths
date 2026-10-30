-- ============================================================================
-- Chantier « questions-cm1 », lot 3a (fractions) : nœud et tag de 10 modèles neufs
-- ============================================================================
--   - 00910e5b (Placer un entier plus une fraction sur une demi-droite) → CM1-146, sur « Nombres et calculs > Fractions : sens et écritures > droite graduée » ;
--   - 0e3f82a1 (Placer une fraction sur une demi-droite graduée) → CM1-018, sur « Nombres et calculs > Fractions : sens et écritures > droite graduée » ;
--   - 5c5bf99a (Écrire une fraction comme un entier plus une fraction) → CM1-015, sur « Nombres et calculs > Fractions : sens et écritures > décomposition » ;
--   - 6d94994a (Repérer un point par un entier plus une fraction) → CM1-147, sur « Nombres et calculs > Fractions : sens et écritures > droite graduée » ;
--   - 884908d3 (Soustraire des fractions) → CM1-148, sur « Nombres et calculs > Fractions : calculs > addition et soustraction » ;
--   - a2b41659 (Lire et écrire une fraction) → CM1-014, sur « Nombres et calculs > Fractions : sens et écritures > définition » ;
--   - b2b5320f (Encadrer une fraction par deux entiers) → CM1-017, sur « Nombres et calculs > Fractions : sens et écritures > ordre » ;
--   - c2fa5767 (Repérer un point par une fraction) → CM1-019, sur « Nombres et calculs > Fractions : sens et écritures > droite graduée » ;
--   - ef1ed0ce (Fraction d'une quantité) → CM1-022, sur « Nombres et calculs > Fractions : calculs > fraction d'une quantité » ;
--   - f1a880e9 (Écrire un entier plus une fraction comme une fraction) → CM1-016, sur « Nombres et calculs > Fractions : sens et écritures > décomposition » ;
-- Chaque modèle va sur la SOUS-NOTION de son point (question_template_points_check_rules refuse
-- un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-10-30 (journal docs/wip/questions-cm1-progress.md § 9 bis). Les
-- modèles ont été créés en brouillon le 2026-10-30 par scripts/create-questions.ts
-- (scripts/questions/cm1-3a/, PR #2001), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-10-30 (MCP) : 10 brouillons [CM1], sans nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (10 modèles). Elle est prouvée par
-- tests/integration/questions-cm1-lot3a-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-30), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David AVANT le SQL, tranchée par
-- lui le 2026-10-30 : personne, journal § 9 et 9 bis). Aucune règle ne change. Effet visible : les 10
-- brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient
-- qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 10 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('00910e5b-7a51-4c30-a489-115883738058'::uuid),
--                ('0e3f82a1-0bce-4ec8-bef2-5712cb9a7af5'::uuid),
--                ('5c5bf99a-3b8c-4f32-b18c-bb700efba13a'::uuid),
--                ('6d94994a-6eaa-458a-bd25-fdd745282243'::uuid),
--                ('884908d3-b1d8-4e54-9eb1-287908213fa8'::uuid),
--                ('a2b41659-6473-423a-93ed-2ecd60b87d6e'::uuid),
--                ('b2b5320f-332d-4335-bcdc-9ad8ff48b7e9'::uuid),
--                ('c2fa5767-5d3d-492f-8992-f46d8db66957'::uuid),
--                ('ef1ed0ce-f8d9-42e5-bb52-cde271ca885e'::uuid),
--                ('f1a880e9-707a-4cee-a78a-b2d3968b7250'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('00910e5b-7a51-4c30-a489-115883738058'::uuid, 'CM1-146'),
-- 	('0e3f82a1-0bce-4ec8-bef2-5712cb9a7af5'::uuid, 'CM1-018'),
-- 	('5c5bf99a-3b8c-4f32-b18c-bb700efba13a'::uuid, 'CM1-015'),
-- 	('6d94994a-6eaa-458a-bd25-fdd745282243'::uuid, 'CM1-147'),
-- 	('884908d3-b1d8-4e54-9eb1-287908213fa8'::uuid, 'CM1-148'),
-- 	('a2b41659-6473-423a-93ed-2ecd60b87d6e'::uuid, 'CM1-014'),
-- 	('b2b5320f-332d-4335-bcdc-9ad8ff48b7e9'::uuid, 'CM1-017'),
-- 	('c2fa5767-5d3d-492f-8992-f46d8db66957'::uuid, 'CM1-019'),
-- 	('ef1ed0ce-f8d9-42e5-bb52-cde271ca885e'::uuid, 'CM1-022'),
-- 	('f1a880e9-707a-4cee-a78a-b2d3968b7250'::uuid, 'CM1-016')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CM1' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('00910e5b-7a51-4c30-a489-115883738058',
--               '0e3f82a1-0bce-4ec8-bef2-5712cb9a7af5',
--               '5c5bf99a-3b8c-4f32-b18c-bb700efba13a',
--               '6d94994a-6eaa-458a-bd25-fdd745282243',
--               '884908d3-b1d8-4e54-9eb1-287908213fa8',
--               'a2b41659-6473-423a-93ed-2ecd60b87d6e',
--               'b2b5320f-332d-4335-bcdc-9ad8ff48b7e9',
--               'c2fa5767-5d3d-492f-8992-f46d8db66957',
--               'ef1ed0ce-f8d9-42e5-bb52-cde271ca885e',
--               'f1a880e9-707a-4cee-a78a-b2d3968b7250');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qcm1l3a_modeles;
create temporary table _qcm1l3a_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qcm1l3a_modeles values
	('00910e5b-7a51-4c30-a489-115883738058', 'Nombres et calculs', 'Fractions : sens et écritures', 'droite graduée', 'CM1-146'),
	('0e3f82a1-0bce-4ec8-bef2-5712cb9a7af5', 'Nombres et calculs', 'Fractions : sens et écritures', 'droite graduée', 'CM1-018'),
	('5c5bf99a-3b8c-4f32-b18c-bb700efba13a', 'Nombres et calculs', 'Fractions : sens et écritures', 'décomposition', 'CM1-015'),
	('6d94994a-6eaa-458a-bd25-fdd745282243', 'Nombres et calculs', 'Fractions : sens et écritures', 'droite graduée', 'CM1-147'),
	('884908d3-b1d8-4e54-9eb1-287908213fa8', 'Nombres et calculs', 'Fractions : calculs', 'addition et soustraction', 'CM1-148'),
	('a2b41659-6473-423a-93ed-2ecd60b87d6e', 'Nombres et calculs', 'Fractions : sens et écritures', 'définition', 'CM1-014'),
	('b2b5320f-332d-4335-bcdc-9ad8ff48b7e9', 'Nombres et calculs', 'Fractions : sens et écritures', 'ordre', 'CM1-017'),
	('c2fa5767-5d3d-492f-8992-f46d8db66957', 'Nombres et calculs', 'Fractions : sens et écritures', 'droite graduée', 'CM1-019'),
	('ef1ed0ce-f8d9-42e5-bb52-cde271ca885e', 'Nombres et calculs', 'Fractions : calculs', 'fraction d''une quantité', 'CM1-022'),
	('f1a880e9-707a-4cee-a78a-b2d3968b7250', 'Nombres et calculs', 'Fractions : sens et écritures', 'décomposition', 'CM1-016');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm1l3a_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm1l3a_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qcm1l3a_modeles add column noeud uuid, add column point_id uuid;
update _qcm1l3a_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qcm1l3a_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qcm1l3a_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CM1' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qcm1l3a_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qcm1l3a_modeles where noeud is null),
			(select count(*) from _qcm1l3a_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm1l3a_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 10) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 10', v_presents;
	end if;
	select count(*) into v_ranges from _qcm1l3a_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcm1l3a_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qcm1l3a_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qcm1l3a_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm1l3a_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm1l3a_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qcm1l3a_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm1l3a_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qcm1l3a_modeles;
