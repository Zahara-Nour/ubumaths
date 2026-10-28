-- ============================================================================
-- Chantier « questions-ce1 », lot 3 (fractions) : nœud et tag de 9 modèles neufs
-- ============================================================================
--   - a8685870 (Écrire en chiffres une fraction unitaire) → CE1-016, sur « Nombres et calculs > Fractions : sens et écritures > définition » ;
--   - 837cd6bc (Lire une fraction unitaire) → CE1-016, sur « Nombres et calculs > Fractions : sens et écritures > définition » ;
--   - b165ea1c (Écrire en chiffres une fraction) → CE1-017, sur « Nombres et calculs > Fractions : sens et écritures > définition » ;
--   - 0c675062 (Lire une fraction) → CE1-017, sur « Nombres et calculs > Fractions : sens et écritures > définition » ;
--   - 77c1dec0 (Numérateur et dénominateur) → CE1-018, sur « Nombres et calculs > Fractions : sens et écritures > définition » ;
--   - af373581 (Comparer des fractions de même dénominateur) → CE1-019, sur « Nombres et calculs > Fractions : sens et écritures > ordre » ;
--   - 643d294c (Comparer des fractions de numérateur 1) → CE1-020, sur « Nombres et calculs > Fractions : sens et écritures > ordre » ;
--   - 00ac9765 (Additionner des fractions de même dénominateur) → CE1-021, sur « Nombres et calculs > Fractions : calculs > addition et soustraction » ;
--   - 29e7e3c6 (Soustraire des fractions de même dénominateur) → CE1-099, sur « Nombres et calculs > Fractions : calculs > addition et soustraction ».
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-28 (journal docs/wip/questions-ce1-progress.md § 9). Les modèles
-- ont été créés en brouillon le 2026-10-28 par scripts/create-questions.ts
-- (scripts/questions/ce1-3/, lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (9 modèles). Elle est prouvée par
-- tests/integration/questions-ce1-lot3-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-10-28),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-10-28 en phase 0, AVANT le SQL, tranchée par lui le 2026-10-28 : personne).
-- Aucune règle ne change. Effet visible : les 9 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 9 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('a8685870-00a4-4534-a479-99b4793e9405'::uuid),
--               ('837cd6bc-a660-4b4d-9b97-06a983b3f73d'::uuid),
--               ('b165ea1c-f0ee-4434-87c0-3531e44286fb'::uuid),
--               ('0c675062-76c3-4929-8545-c4d1bc6e0e35'::uuid),
--               ('77c1dec0-81e0-46b3-9340-b2d9aa3e513f'::uuid),
--               ('af373581-11de-4246-b50d-21cb18f9e7c4'::uuid),
--               ('643d294c-8228-4bef-8986-1eee2c252a72'::uuid),
--               ('00ac9765-28de-4fb0-b108-f46c70efb82b'::uuid),
--               ('29e7e3c6-4f48-4ef7-8914-ce712636f7a2'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('a8685870-00a4-4534-a479-99b4793e9405'::uuid, 'CE1-016'),
-- 	('837cd6bc-a660-4b4d-9b97-06a983b3f73d'::uuid, 'CE1-016'),
-- 	('b165ea1c-f0ee-4434-87c0-3531e44286fb'::uuid, 'CE1-017'),
-- 	('0c675062-76c3-4929-8545-c4d1bc6e0e35'::uuid, 'CE1-017'),
-- 	('77c1dec0-81e0-46b3-9340-b2d9aa3e513f'::uuid, 'CE1-018'),
-- 	('af373581-11de-4246-b50d-21cb18f9e7c4'::uuid, 'CE1-019'),
-- 	('643d294c-8228-4bef-8986-1eee2c252a72'::uuid, 'CE1-020'),
-- 	('00ac9765-28de-4fb0-b108-f46c70efb82b'::uuid, 'CE1-021'),
-- 	('29e7e3c6-4f48-4ef7-8914-ce712636f7a2'::uuid, 'CE1-099')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CE1' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('a8685870-00a4-4534-a479-99b4793e9405',
--               '837cd6bc-a660-4b4d-9b97-06a983b3f73d',
--               'b165ea1c-f0ee-4434-87c0-3531e44286fb',
--               '0c675062-76c3-4929-8545-c4d1bc6e0e35',
--               '77c1dec0-81e0-46b3-9340-b2d9aa3e513f',
--               'af373581-11de-4246-b50d-21cb18f9e7c4',
--               '643d294c-8228-4bef-8986-1eee2c252a72',
--               '00ac9765-28de-4fb0-b108-f46c70efb82b',
--               '29e7e3c6-4f48-4ef7-8914-ce712636f7a2');
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
	('a8685870-00a4-4534-a479-99b4793e9405', 'Nombres et calculs', 'Fractions : sens et écritures', 'définition', 'CE1-016'),
	('837cd6bc-a660-4b4d-9b97-06a983b3f73d', 'Nombres et calculs', 'Fractions : sens et écritures', 'définition', 'CE1-016'),
	('b165ea1c-f0ee-4434-87c0-3531e44286fb', 'Nombres et calculs', 'Fractions : sens et écritures', 'définition', 'CE1-017'),
	('0c675062-76c3-4929-8545-c4d1bc6e0e35', 'Nombres et calculs', 'Fractions : sens et écritures', 'définition', 'CE1-017'),
	('77c1dec0-81e0-46b3-9340-b2d9aa3e513f', 'Nombres et calculs', 'Fractions : sens et écritures', 'définition', 'CE1-018'),
	('af373581-11de-4246-b50d-21cb18f9e7c4', 'Nombres et calculs', 'Fractions : sens et écritures', 'ordre', 'CE1-019'),
	('643d294c-8228-4bef-8986-1eee2c252a72', 'Nombres et calculs', 'Fractions : sens et écritures', 'ordre', 'CE1-020'),
	('00ac9765-28de-4fb0-b108-f46c70efb82b', 'Nombres et calculs', 'Fractions : calculs', 'addition et soustraction', 'CE1-021'),
	('29e7e3c6-4f48-4ef7-8914-ce712636f7a2', 'Nombres et calculs', 'Fractions : calculs', 'addition et soustraction', 'CE1-099');

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
	if v_presents not in (0, 9) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 9', v_presents;
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
