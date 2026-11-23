-- ============================================================================
-- Chantier « questions-cm1 », lot 4b (calcul posé) : nœud et tag de 6 modèles neufs
-- ============================================================================
--   - 39e7d0a5 (Poser une addition de nombres décimaux) → CM1-050, sur « Nombres et calculs > Décimaux : calculs > addition » ;
--   - 613817ea (Poser une soustraction de nombres décimaux (par compensation)) → CM1-165, sur « Nombres et calculs > Décimaux : calculs > soustraction » ;
--   - 1ed5202f (Poser une soustraction de nombres décimaux (par cassage)) → CM1-165, sur « Nombres et calculs > Décimaux : calculs > soustraction » ;
--   - e8086f21 (Poser une multiplication de deux nombres entiers) → CM1-051, sur « Nombres et calculs > Entiers : multiplication > calcul posé » ;
--   - c3246792 (Poser la multiplication d'un nombre décimal par un entier) → CM1-052, sur « Nombres et calculs > Décimaux : calculs > multiplication » ;
--   - 4b666c28 (Poser une division euclidienne) → CM1-053, sur « Nombres et calculs > Entiers : division > calcul posé » ;
-- Chaque modèle va sur une SOUS-NOTION et porte UN point (ADR 0020 : au plus un point par
-- programme). 050 et 165 sont posés sur la NOTION « Décimaux : calculs » : leurs modèles vont sous
-- ses sous-notions « addition » et « soustraction » (décision de David, § 13 bis), ce que la règle
-- des tags admet (point sur le nœud du modèle OU sur sa notion, question_template_points_check_rules).
-- Les deux soustractions (compensation, cassage) portent le même point CM1-165.
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-01 (journal docs/wip/questions-cm1-progress.md § 13 et
-- 13 bis). Les modèles ont été créés en brouillon le 2026-11-01 par scripts/create-questions.ts
-- (scripts/questions/cm1-4b/, PR #2149), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-01 (MCP) : 6 brouillons [CM1], sans nœud ni tag ; 050 et 165 sur la notion « Décimaux :
-- calculs », 052 sur « › multiplication », 051 et 053 sur « calcul posé » de leur notion ; aucun
-- modèle sur ces points.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée par
-- tests/integration/questions-cm1-lot4b-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-01), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT ; le point doit être sur ce nœud ou sur sa notion.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David AVANT le SQL, tranchée par
-- lui le 2026-11-01 : personne, journal § 13 et 13 bis). Aucune règle ne change. Effet visible : les 6
-- brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient
-- qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('39e7d0a5-c605-4e1c-b0db-91a67f53f117'::uuid),
--                ('613817ea-58af-4c94-b82a-a2dba19e687a'::uuid),
--                ('1ed5202f-d031-4964-8f4b-a8dc0ade21c5'::uuid),
--                ('e8086f21-13e4-4adf-8691-347c65f88258'::uuid),
--                ('c3246792-8dbf-4afb-8ad5-33c6f37feeb0'::uuid),
--                ('4b666c28-0357-41b6-ae08-daae13ac0642'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('39e7d0a5-c605-4e1c-b0db-91a67f53f117'::uuid, 'CM1-050'),
-- 	('613817ea-58af-4c94-b82a-a2dba19e687a'::uuid, 'CM1-165'),
-- 	('1ed5202f-d031-4964-8f4b-a8dc0ade21c5'::uuid, 'CM1-165'),
-- 	('e8086f21-13e4-4adf-8691-347c65f88258'::uuid, 'CM1-051'),
-- 	('c3246792-8dbf-4afb-8ad5-33c6f37feeb0'::uuid, 'CM1-052'),
-- 	('4b666c28-0357-41b6-ae08-daae13ac0642'::uuid, 'CM1-053')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CM1' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('39e7d0a5-c605-4e1c-b0db-91a67f53f117',
--               '613817ea-58af-4c94-b82a-a2dba19e687a',
--               '1ed5202f-d031-4964-8f4b-a8dc0ade21c5',
--               'e8086f21-13e4-4adf-8691-347c65f88258',
--               'c3246792-8dbf-4afb-8ad5-33c6f37feeb0',
--               '4b666c28-0357-41b6-ae08-daae13ac0642');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qcm1l4b_modeles;
create temporary table _qcm1l4b_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qcm1l4b_modeles values
	('39e7d0a5-c605-4e1c-b0db-91a67f53f117', 'Nombres et calculs', 'Décimaux : calculs', 'addition', 'CM1-050'),
	('613817ea-58af-4c94-b82a-a2dba19e687a', 'Nombres et calculs', 'Décimaux : calculs', 'soustraction', 'CM1-165'),
	('1ed5202f-d031-4964-8f4b-a8dc0ade21c5', 'Nombres et calculs', 'Décimaux : calculs', 'soustraction', 'CM1-165'),
	('e8086f21-13e4-4adf-8691-347c65f88258', 'Nombres et calculs', 'Entiers : multiplication', 'calcul posé', 'CM1-051'),
	('c3246792-8dbf-4afb-8ad5-33c6f37feeb0', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', 'CM1-052'),
	('4b666c28-0357-41b6-ae08-daae13ac0642', 'Nombres et calculs', 'Entiers : division', 'calcul posé', 'CM1-053');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm1l4b_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm1l4b_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée
alter table _qcm1l4b_modeles add column noeud uuid, add column point_id uuid;
update _qcm1l4b_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qcm1l4b_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
-- Le point est sur le nœud du modèle ou sur sa notion (050, 165), comme l'exige la règle des tags
update _qcm1l4b_modeles r set point_id = p.id
  from public.curriculum_points p, public.classification_nodes n
 where n.id = r.noeud
   and p.grade = 'CM1' and p.code = r.code and p.archived_at is null
   and (p.node_id = r.noeud or (n.kind = 'subnotion' and p.node_id = n.parent_id));
do $resolution$
begin
	if exists (select 1 from _qcm1l4b_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qcm1l4b_modeles where noeud is null),
			(select count(*) from _qcm1l4b_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm1l4b_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	select count(*) into v_ranges from _qcm1l4b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcm1l4b_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qcm1l4b_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qcm1l4b_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm1l4b_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm1l4b_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qcm1l4b_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm1l4b_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qcm1l4b_modeles;
