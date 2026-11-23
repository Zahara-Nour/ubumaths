-- ============================================================================
-- Chantier « questions-1spe », lot 6a « à savoir » : nœud et tag de 7 modèles neufs
-- ============================================================================
--   - 21f42c7f (indépendance de deux événements) → 1SPE-336, sur « Probabilités > Probabilités conditionnelles > indépendance » ;
--   - 56ec6a7c (exponentielle de l'opposé) → 1SPE-404, sur « Fonctions > Fonction exponentielle > propriétés algébriques » ;
--   - 7201f3b2 (dérivée de la fonction inverse) → 1SPE-392, sur « Fonctions > Dérivation > fonctions dérivées » ;
--   - a16a9bba (dérivée de la fonction cube) → 1SPE-391, sur « Fonctions > Dérivation > fonctions dérivées » ;
--   - a181f10b (dérivée de la fonction carré) → 1SPE-264, sur « Fonctions > Dérivation > fonctions dérivées » ;
--   - c24d21e1 (exponentielle d'une somme) → 1SPE-290, sur « Fonctions > Fonction exponentielle > propriétés algébriques » ;
--   - fba01378 (variance et écart type) → 1SPE-350, sur « Probabilités > Variables aléatoires > variance et écart-type » ;
-- Chaque modèle va sur le nœud de son point (sous-notion : question_template_points_check_rules
-- refuse un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-02 (journal docs/wip/questions-1spe-progress.md § 23, D29). Les
-- modèles ont été créés en brouillon le 2026-11-02 par scripts/create-questions.ts (lancé par
-- David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-1spe-savoir-a-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-02),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David en phase 0 du lot, AVANT
-- le SQL, tranchée par lui le 2026-11-02 : personne). Aucune règle ne change. Effet visible : les
-- 7 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les
-- voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('21f42c7f-82bc-4204-b294-cb9658bcfd8e'::uuid),
--                ('56ec6a7c-dc66-4729-bc2c-6d1ba3e41851'::uuid),
--                ('7201f3b2-bb5c-4963-a6a6-f64cdeb6f111'::uuid),
--                ('a16a9bba-2cc5-48d8-b98b-eb4fee6ded3d'::uuid),
--                ('a181f10b-1b9c-436c-8f8c-51cce68352db'::uuid),
--                ('c24d21e1-1441-4f0a-90fd-12a0288a234a'::uuid),
--                ('fba01378-d2d7-4d44-9236-300a5871ef1c'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('21f42c7f-82bc-4204-b294-cb9658bcfd8e'::uuid, '1SPE-336'),
-- 	('56ec6a7c-dc66-4729-bc2c-6d1ba3e41851'::uuid, '1SPE-404'),
-- 	('7201f3b2-bb5c-4963-a6a6-f64cdeb6f111'::uuid, '1SPE-392'),
-- 	('a16a9bba-2cc5-48d8-b98b-eb4fee6ded3d'::uuid, '1SPE-391'),
-- 	('a181f10b-1b9c-436c-8f8c-51cce68352db'::uuid, '1SPE-264'),
-- 	('c24d21e1-1441-4f0a-90fd-12a0288a234a'::uuid, '1SPE-290'),
-- 	('fba01378-d2d7-4d44-9236-300a5871ef1c'::uuid, '1SPE-350')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '1_SPE' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '21f42c7f-82bc-4204-b294-cb9658bcfd8e',
--               '56ec6a7c-dc66-4729-bc2c-6d1ba3e41851',
--               '7201f3b2-bb5c-4963-a6a6-f64cdeb6f111',
--               'a16a9bba-2cc5-48d8-b98b-eb4fee6ded3d',
--               'a181f10b-1b9c-436c-8f8c-51cce68352db',
--               'c24d21e1-1441-4f0a-90fd-12a0288a234a',
--               'fba01378-d2d7-4d44-9236-300a5871ef1c');
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
	('21f42c7f-82bc-4204-b294-cb9658bcfd8e', 'Probabilités', 'Probabilités conditionnelles', 'indépendance', '1SPE-336'),
	('56ec6a7c-dc66-4729-bc2c-6d1ba3e41851', 'Fonctions', 'Fonction exponentielle', 'propriétés algébriques', '1SPE-404'),
	('7201f3b2-bb5c-4963-a6a6-f64cdeb6f111', 'Fonctions', 'Dérivation', 'fonctions dérivées', '1SPE-392'),
	('a16a9bba-2cc5-48d8-b98b-eb4fee6ded3d', 'Fonctions', 'Dérivation', 'fonctions dérivées', '1SPE-391'),
	('a181f10b-1b9c-436c-8f8c-51cce68352db', 'Fonctions', 'Dérivation', 'fonctions dérivées', '1SPE-264'),
	('c24d21e1-1441-4f0a-90fd-12a0288a234a', 'Fonctions', 'Fonction exponentielle', 'propriétés algébriques', '1SPE-290'),
	('fba01378-d2d7-4d44-9236-300a5871ef1c', 'Probabilités', 'Variables aléatoires', 'variance et écart-type', '1SPE-350');

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
 where p.grade = '1_SPE' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
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
