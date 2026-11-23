-- ============================================================================
-- Chantier « questions-ce1 », lot 2 bis (ordinaux) : nœud et tag de 7 modèles neufs
-- ============================================================================
--   - 8e9c0137 (Le rang en lettres (jusqu'à centième)) → CE1-011, sur « Nombres et calculs > Entiers : numération > ordinaux et rangs » ;
--   - 50d9118b (Le rang en chiffres (jusqu'à centième)) → CE1-011, sur « Nombres et calculs > Entiers : numération > ordinaux et rangs » ;
--   - 14dfdd8c (La place d'un nombre ou d'une lettre dans une liste) → CE1-012, sur « Nombres et calculs > Entiers : numération > ordinaux et rangs » ;
--   - 8471f4b3 (Repérer un rang, depuis le début ou depuis la fin) → CE1-013, sur « Nombres et calculs > Entiers : numération > ordinaux et rangs » ;
--   - 2dec5c08 (Rang et nombre de coureurs avant ou après) → CE1-014, sur « Nombres et calculs > Entiers : numération > ordinaux et rangs » ;
--   - ef446e9b (Suites qui se répètent : quel élément à la 89e place ?) → CE1-015, sur « Nombres et calculs > Entiers : numération > ordinaux et rangs » ;
--   - e54c58f0 (Suites qui grandissent : quel élément à telle place ?) → CE1-015, sur « Nombres et calculs > Entiers : numération > ordinaux et rangs ».
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-28 (journal docs/wip/questions-ce1-progress.md § 8). Les modèles
-- ont été créés en brouillon le 2026-10-28 par scripts/create-questions.ts
-- (scripts/questions/ce1-2bis/, lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-ce1-lot2bis-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-10-28),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-10-28 en phase 0, AVANT le SQL, tranchée par lui le 2026-10-28 : personne).
-- Aucune règle ne change. Effet visible : les 7 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('8e9c0137-ece7-4ad6-9ca0-bb343cb34955'::uuid),
--                ('50d9118b-8b76-4a21-9be0-6db6d6eb39ca'::uuid),
--                ('14dfdd8c-751c-46e1-8dea-6ae9c9ae9bba'::uuid),
--                ('8471f4b3-f3d9-44c3-a46e-7800d133cd55'::uuid),
--                ('2dec5c08-d8b8-4e0d-8239-ef8f549156ee'::uuid),
--                ('ef446e9b-66fb-4c89-b3ad-cda9c34f4d91'::uuid),
--                ('e54c58f0-9d59-4552-b8f7-3c7d4072d9ce'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('8e9c0137-ece7-4ad6-9ca0-bb343cb34955'::uuid, 'CE1-011'),
-- 	('50d9118b-8b76-4a21-9be0-6db6d6eb39ca'::uuid, 'CE1-011'),
-- 	('14dfdd8c-751c-46e1-8dea-6ae9c9ae9bba'::uuid, 'CE1-012'),
-- 	('8471f4b3-f3d9-44c3-a46e-7800d133cd55'::uuid, 'CE1-013'),
-- 	('2dec5c08-d8b8-4e0d-8239-ef8f549156ee'::uuid, 'CE1-014'),
-- 	('ef446e9b-66fb-4c89-b3ad-cda9c34f4d91'::uuid, 'CE1-015'),
-- 	('e54c58f0-9d59-4552-b8f7-3c7d4072d9ce'::uuid, 'CE1-015')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CE1' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('8e9c0137-ece7-4ad6-9ca0-bb343cb34955',
--               '50d9118b-8b76-4a21-9be0-6db6d6eb39ca',
--               '14dfdd8c-751c-46e1-8dea-6ae9c9ae9bba',
--               '8471f4b3-f3d9-44c3-a46e-7800d133cd55',
--               '2dec5c08-d8b8-4e0d-8239-ef8f549156ee',
--               'ef446e9b-66fb-4c89-b3ad-cda9c34f4d91',
--               'e54c58f0-9d59-4552-b8f7-3c7d4072d9ce');
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
	('8e9c0137-ece7-4ad6-9ca0-bb343cb34955', 'Nombres et calculs', 'Entiers : numération', 'ordinaux et rangs', 'CE1-011'),
	('50d9118b-8b76-4a21-9be0-6db6d6eb39ca', 'Nombres et calculs', 'Entiers : numération', 'ordinaux et rangs', 'CE1-011'),
	('14dfdd8c-751c-46e1-8dea-6ae9c9ae9bba', 'Nombres et calculs', 'Entiers : numération', 'ordinaux et rangs', 'CE1-012'),
	('8471f4b3-f3d9-44c3-a46e-7800d133cd55', 'Nombres et calculs', 'Entiers : numération', 'ordinaux et rangs', 'CE1-013'),
	('2dec5c08-d8b8-4e0d-8239-ef8f549156ee', 'Nombres et calculs', 'Entiers : numération', 'ordinaux et rangs', 'CE1-014'),
	('ef446e9b-66fb-4c89-b3ad-cda9c34f4d91', 'Nombres et calculs', 'Entiers : numération', 'ordinaux et rangs', 'CE1-015'),
	('e54c58f0-9d59-4552-b8f7-3c7d4072d9ce', 'Nombres et calculs', 'Entiers : numération', 'ordinaux et rangs', 'CE1-015');

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
