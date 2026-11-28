-- ============================================================================
-- Chantier « idees-6e-decimaux » : nœud et tag de 6 modèles neufs (6e, nombres décimaux), niveau 6
-- ajouté à 590169c4
-- ============================================================================
--   - a2ae7206 (fraction décimale et écriture décimale, F2) → 6-106, sur « Nombres et calculs >
--     Décimaux : numération > forme fractionnaire », voisin de 000368e1, c1a83c8f, 5d7726eb ;
--   - 67954fbb (par combien multiplier ou diviser pour changer le rang d'un chiffre, F3) → 6-101,
--     sur « Nombres et calculs > Entiers : numération > décomposition », voisin de 4d825d44 ;
--   - 44d352a2 (compléter une multiplication par 0,1, 0,01, 0,001, F5) → 6-115, sur « Nombres et
--     calculs > Décimaux : calculs > multiplication », voisin de 7c1f54d2 ;
--   - a29bf7c7 (poser la multiplication de deux décimaux, F7) → 6-118, même sous-notion ;
--   - 33ff7000 (dernier chiffre et décimales d'un produit, F8) → 6-118, même sous-notion ;
--   - c04b78f8 (égalité de la division euclidienne, F12a) → 6-123, sur « Nombres et calculs >
--     Entiers : division > division euclidienne », voisin de 3c9284c5.
-- Chaque modèle porte UN point (ADR 0020), posé sur son nœud ou sur la notion de ce nœud (relevé du
-- 2026-11-22 : 6-106 est sur la notion, les autres sur la sous-notion) :
-- question_template_points_check_rules l'exige. Ni le contenu, ni le niveau numéroté, ni le statut
-- ne changent : `updated_at` est PRÉSERVÉ.
--   - 590169c4 (« Calculer un quotient », publié, CM2-043) : `grades` passe de {CM2} à {CM2,6}
--     (ses 2 variations neuves, fiche F4, sont de 6e ; il garde son point). `updated_at` préservé.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-22 (« je valide tes recos », journal
-- docs/wip/idees-6e-decimaux-progress.md). Les modèles ont été créés en brouillon le 2026-11-22 par
-- scripts/create-questions.ts (lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée par
-- tests/integration/questions-6e-decimaux-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes : chaque modèle neuf doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-22),
-- et 590169c4 doit avoir EXACTEMENT les niveaux {CM2}, sinon une retouche faite depuis à la main
-- serait écrasée. Nœud désigné par son chemin, résolu STRICTEMENT ; le point doit être sur ce nœud
-- ou sur sa notion.
--
-- Données d'élèves : aucune (brouillons ; 590169c4 ne change que de niveaux).
--
-- Accès : personne ne gagne ni ne perd d'accès (question d'accès de la phase 0, Q3 : rangement sans
-- accès nouveau). Aucune règle ne change. Effets visibles : les 6 brouillons apparaissent sous leur
-- nœud (et leur point) dans l'admin, les élèves ne voient rien avant la publication par David ;
-- 590169c4, déjà publié, est aussi proposé en 6e (cahier de texte, filtre par niveau).
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags, rend les 6 modèles sans nœud et rend à
-- 590169c4 ses niveaux {CM2}. Bloc éprouvé par le test d'intégration, à jouer dans UNE
-- transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('a2ae7206-64c7-4c16-bd37-92f43fe5d60b'::uuid),
--                ('67954fbb-d89f-4893-a2a0-30d393e979c5'::uuid),
--                ('44d352a2-579c-44cc-b804-43bbcec8da4e'::uuid),
--                ('a29bf7c7-6ecc-4650-a731-a32fb896c9e4'::uuid),
--                ('33ff7000-4605-4e22-81db-6e2307cd6291'::uuid),
--                ('c04b78f8-04ab-46e9-b8c9-cc330fb84b19'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('a2ae7206-64c7-4c16-bd37-92f43fe5d60b'::uuid, '6-106'),
-- 	('67954fbb-d89f-4893-a2a0-30d393e979c5'::uuid, '6-101'),
-- 	('44d352a2-579c-44cc-b804-43bbcec8da4e'::uuid, '6-115'),
-- 	('a29bf7c7-6ecc-4650-a731-a32fb896c9e4'::uuid, '6-118'),
-- 	('33ff7000-4605-4e22-81db-6e2307cd6291'::uuid, '6-118'),
-- 	('c04b78f8-04ab-46e9-b8c9-cc330fb84b19'::uuid, '6-123')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '6' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               'a2ae7206-64c7-4c16-bd37-92f43fe5d60b',
--               '67954fbb-d89f-4893-a2a0-30d393e979c5',
--               '44d352a2-579c-44cc-b804-43bbcec8da4e',
--               'a29bf7c7-6ecc-4650-a731-a32fb896c9e4',
--               '33ff7000-4605-4e22-81db-6e2307cd6291',
--               'c04b78f8-04ab-46e9-b8c9-cc330fb84b19');
-- update public.question_templates set grades = array['CM2']
--  where id = '590169c4-e51d-4ea1-adaa-1cc38093442f' and grades = array['CM2', '6']::text[];
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
	('a2ae7206-64c7-4c16-bd37-92f43fe5d60b', 'Nombres et calculs', 'Décimaux : numération', 'forme fractionnaire', '6-106'),
	('67954fbb-d89f-4893-a2a0-30d393e979c5', 'Nombres et calculs', 'Entiers : numération', 'décomposition', '6-101'),
	('44d352a2-579c-44cc-b804-43bbcec8da4e', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', '6-115'),
	('a29bf7c7-6ecc-4650-a731-a32fb896c9e4', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', '6-118'),
	('33ff7000-4605-4e22-81db-6e2307cd6291', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', '6-118'),
	('c04b78f8-04ab-46e9-b8c9-cc330fb84b19', 'Nombres et calculs', 'Entiers : division', 'division euclidienne', '6-123');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qc_modeles order by id;
select 1 from public.question_templates where id in (select id from _qc_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée ; le point est sur ce nœud ou sur sa notion
alter table _qc_modeles add column noeud uuid, add column point_id uuid;
-- Un chemin ne peut désigner qu'un nœud : l'index classification_nodes_sibling_name_key rend le nom
-- unique parmi les frères.
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
  from public.curriculum_points p, public.classification_nodes x
 where x.id = r.noeud and r.code is not null
   and p.grade = '6' and p.code = r.code and p.archived_at is null
   and p.node_id in (r.noeud, case when x.kind = 'subnotion' then x.parent_id else x.id end);
do $resolution$
begin
	if exists (select 1 from _qc_modeles where noeud is null or (code is not null and point_id is null)) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qc_modeles where noeud is null),
			(select count(*) from _qc_modeles where code is not null and point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qc_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
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
  join public.question_templates q on q.id = r.id
 where r.point_id is not null;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_attendus integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*), count(*) filter (where r.point_id is not null) into v_presents, v_attendus
	  from _qc_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qc_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qc_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qc_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

-- ---- 6. Niveau 6 ajouté à 590169c4 (« Calculer un quotient », CM2-043) ---------------------
-- Ses 2 variations neuves (lot idees-6e-decimaux, fiche F4 : dividende ou diviseur manquant par 10,
-- 100, 1 000) sont de 6e ; il garde son point CM2-043 (ADR 0020), `grades` porte les deux niveaux.
-- Garde : niveaux EXACTEMENT ceux du relevé (CM2), sinon une retouche serait écrasée. Absent (base
-- locale) : rien.
select 1 from public.question_templates where id = '590169c4-e51d-4ea1-adaa-1cc38093442f' for update;
do $niveau$
declare v_grades text[];
begin
	select grades into v_grades from public.question_templates where id = '590169c4-e51d-4ea1-adaa-1cc38093442f';
	if found and v_grades is distinct from array['CM2']::text[] then
		raise exception 'niveaux de 590169c4 changés depuis le relevé : %', v_grades;
	end if;
end $niveau$;
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates set grades = array['CM2', '6']
 where id = '590169c4-e51d-4ea1-adaa-1cc38093442f' and grades = array['CM2']::text[];
alter table public.question_templates enable trigger update_question_templates_updated_at;

drop table _qc_modeles;
