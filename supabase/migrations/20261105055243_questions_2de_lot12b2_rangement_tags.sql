-- ============================================================================
-- Chantier « questions-2de », lot 12 b-2 (vecteurs, suite, et périmètre) : nœud et tag de 5 modèles neufs
-- ============================================================================
--   - 8d099a87 (produit d'un vecteur par un réel) → 2-289, sur « Géométrie > Vecteurs > produit par un réel » ;
--   - da5554a9 (vecteurs colinéaires, sur la figure) → 2-290, sur « Géométrie > Vecteurs > colinéarité » ;
--   - 1422eeb1 (écrire un vecteur avec deux vecteurs non colinéaires) → 2-291, sur « Géométrie > Vecteurs >
--     combinaison linéaire » ;
--   - 09007e44 (base orthonormée) → 2-292, sur « Géométrie > Vecteurs > coordonnées » ;
--   - 11bce2bf (périmètre d'un polygone) → 2-401, sur la NOTION « Grandeurs et mesures > Périmètres »
--     (décision L12b-c de David, 2026-11-04 : aucune sous-notion « polygone »).
-- Chaque modèle va sur le nœud de la phase 0 et porte UN point (ADR 0020), posé sur ce nœud même
-- (relevé du 2026-11-05) : question_template_points_check_rules admet un point sur le nœud du modèle
-- ou sur la notion de ce nœud.
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-04 (journal docs/wip/questions-2de-progress.md § 77). Les
-- modèles ont été créés en brouillon le 2026-11-05 par scripts/create-questions.ts (lot 12 b-2, lancé
-- par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (5 modèles). Elle est prouvée par
-- tests/integration/questions-2de-lot12b2-rangement-tags.test.ts, qui fabrique des copies
-- des identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-05), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT ; le point doit être sur ce nœud ou sur sa notion.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question d'accès de la phase 0, § 77, tranchée par
-- David le 2026-11-04 : personne). Aucune règle ne change. Effet visible : les 5 brouillons
-- apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient qu'une
-- fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 5 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('8d099a87-ac26-4c0c-98fd-39cf18be69f2'::uuid),
--                ('da5554a9-71e7-46e7-92d6-b42f808a791f'::uuid),
--                ('1422eeb1-1915-4c40-841f-5e08cffb89fb'::uuid),
--                ('09007e44-463a-4d1f-ad89-c1e3979d9c1a'::uuid),
--                ('11bce2bf-3ec3-46b6-a333-8f5b1e430c89'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('8d099a87-ac26-4c0c-98fd-39cf18be69f2'::uuid, '2-289'),
-- 	('da5554a9-71e7-46e7-92d6-b42f808a791f'::uuid, '2-290'),
-- 	('1422eeb1-1915-4c40-841f-5e08cffb89fb'::uuid, '2-291'),
-- 	('09007e44-463a-4d1f-ad89-c1e3979d9c1a'::uuid, '2-292'),
-- 	('11bce2bf-3ec3-46b6-a333-8f5b1e430c89'::uuid, '2-401')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '8d099a87-ac26-4c0c-98fd-39cf18be69f2',
--               'da5554a9-71e7-46e7-92d6-b42f808a791f',
--               '1422eeb1-1915-4c40-841f-5e08cffb89fb',
--               '09007e44-463a-4d1f-ad89-c1e3979d9c1a',
--               '11bce2bf-3ec3-46b6-a333-8f5b1e430c89');
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
	('8d099a87-ac26-4c0c-98fd-39cf18be69f2', 'Géométrie', 'Vecteurs', 'produit par un réel', '2-289'),
	('da5554a9-71e7-46e7-92d6-b42f808a791f', 'Géométrie', 'Vecteurs', 'colinéarité', '2-290'),
	('1422eeb1-1915-4c40-841f-5e08cffb89fb', 'Géométrie', 'Vecteurs', 'combinaison linéaire', '2-291'),
	('09007e44-463a-4d1f-ad89-c1e3979d9c1a', 'Géométrie', 'Vecteurs', 'coordonnées', '2-292'),
	('11bce2bf-3ec3-46b6-a333-8f5b1e430c89', 'Grandeurs et mesures', 'Périmètres', null, '2-401');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qc_modeles order by id;
select 1 from public.question_templates where id in (select id from _qc_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée ; le point est sur ce nœud ou sur sa notion
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
  from public.curriculum_points p, public.classification_nodes x
 where x.id = r.noeud
   and p.grade = '2' and p.code = r.code and p.archived_at is null
   and p.node_id in (r.noeud, case when x.kind = 'subnotion' then x.parent_id else x.id end);
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
	if v_presents not in (0, 5) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 5', v_presents;
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
