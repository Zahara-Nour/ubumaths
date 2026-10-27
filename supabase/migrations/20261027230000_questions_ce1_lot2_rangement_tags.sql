-- ============================================================================
-- Chantier « questions-ce1 », lot 2 (numération) : nœud et tag de 7 modèles neufs
-- ============================================================================
--   - 0e60a71e (Ranger cinq nombres) → CE1-008, sur « Nombres et calculs > Entiers : numération > ordre » ;
--   - 29cb38fb (Encadrer un nombre (unité, dizaine, centaine)) → CE1-093, sur « Nombres et calculs > Entiers : numération > ordre » ;
--   - 8cd98206 (Unités, dizaines et centaines) → CE1-003, sur « Nombres et calculs > Entiers : numération > décomposition » ;
--   - 949ba026 (Intercaler un nombre (jusqu'à 1 000)) → CE1-094, sur « Nombres et calculs > Entiers : numération > ordre » ;
--   - be6f0f5f (Supérieur à, inférieur à, compris entre) → CE1-009, sur « Nombres et calculs > Entiers : numération > ordre » ;
--   - c4d4bf70 (Le nombre qui suit, le nombre qui précède (jusqu'à 1 000)) → CE1-004, sur « Nombres et calculs > Entiers : numération > écritures » ;
--   - f0a879d2 (Écrire un nombre donné en unités non canoniques) → CE1-005, sur « Nombres et calculs > Entiers : numération > écritures ».
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-27 (journal docs/wip/questions-ce1-progress.md § 7). Les modèles
-- ont été créés en brouillon le 2026-10-27 par scripts/create-questions.ts
-- (scripts/questions/ce1-2/, lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-ce1-lot2-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-10-27),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-10-27 en phase 0, AVANT le SQL, tranchée par lui le 2026-10-27 : personne).
-- Aucune règle ne change. Effet visible : les 7 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('0e60a71e-0267-4c02-a242-36820362b5f0'::uuid),
--                ('29cb38fb-bdb6-4473-9fe1-10cf02bfbd80'::uuid),
--                ('8cd98206-8da7-4209-a574-ef85826b9720'::uuid),
--                ('949ba026-2f6e-47e7-98e5-bc49a28bf25e'::uuid),
--                ('be6f0f5f-da09-44b6-81e2-e53daa1bb2cc'::uuid),
--                ('c4d4bf70-6496-4772-a146-569ab0aaa176'::uuid),
--                ('f0a879d2-c78d-42ea-b569-5b9bc6d4332f'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('0e60a71e-0267-4c02-a242-36820362b5f0'::uuid, 'CE1-008'),
-- 	('29cb38fb-bdb6-4473-9fe1-10cf02bfbd80'::uuid, 'CE1-093'),
-- 	('8cd98206-8da7-4209-a574-ef85826b9720'::uuid, 'CE1-003'),
-- 	('949ba026-2f6e-47e7-98e5-bc49a28bf25e'::uuid, 'CE1-094'),
-- 	('be6f0f5f-da09-44b6-81e2-e53daa1bb2cc'::uuid, 'CE1-009'),
-- 	('c4d4bf70-6496-4772-a146-569ab0aaa176'::uuid, 'CE1-004'),
-- 	('f0a879d2-c78d-42ea-b569-5b9bc6d4332f'::uuid, 'CE1-005')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CE1' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('0e60a71e-0267-4c02-a242-36820362b5f0',
--               '29cb38fb-bdb6-4473-9fe1-10cf02bfbd80',
--               '8cd98206-8da7-4209-a574-ef85826b9720',
--               '949ba026-2f6e-47e7-98e5-bc49a28bf25e',
--               'be6f0f5f-da09-44b6-81e2-e53daa1bb2cc',
--               'c4d4bf70-6496-4772-a146-569ab0aaa176',
--               'f0a879d2-c78d-42ea-b569-5b9bc6d4332f');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qc_modeles;
create temporary table _qc_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qc_modeles values
	('0e60a71e-0267-4c02-a242-36820362b5f0', 'Nombres et calculs', 'Entiers : numération', 'ordre', 'CE1-008'),
	('29cb38fb-bdb6-4473-9fe1-10cf02bfbd80', 'Nombres et calculs', 'Entiers : numération', 'ordre', 'CE1-093'),
	('8cd98206-8da7-4209-a574-ef85826b9720', 'Nombres et calculs', 'Entiers : numération', 'décomposition', 'CE1-003'),
	('949ba026-2f6e-47e7-98e5-bc49a28bf25e', 'Nombres et calculs', 'Entiers : numération', 'ordre', 'CE1-094'),
	('be6f0f5f-da09-44b6-81e2-e53daa1bb2cc', 'Nombres et calculs', 'Entiers : numération', 'ordre', 'CE1-009'),
	('c4d4bf70-6496-4772-a146-569ab0aaa176', 'Nombres et calculs', 'Entiers : numération', 'écritures', 'CE1-004'),
	('f0a879d2-c78d-42ea-b569-5b9bc6d4332f', 'Nombres et calculs', 'Entiers : numération', 'écritures', 'CE1-005');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qc_modeles order by id;
select 1 from public.question_templates where id in (select id from _qc_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qc_modeles add column noeud uuid, add column point_id uuid;
update _qc_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qc_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qc_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CE1' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qc_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qc_modeles where noeud is null),
			(select count(*) from _qc_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qc_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
	end if;
	select count(*) into v_ranges from _qc_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qc_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qc_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qc_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qc_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qc_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qc_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qc_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qc_modeles;
