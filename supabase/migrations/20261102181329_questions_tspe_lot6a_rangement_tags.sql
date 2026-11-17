-- ============================================================================
-- Chantier « questions-tspe-espace », lot 6a (vecteurs, orthogonalité et distances) : nœud et tags de
-- 9 modèles
-- ============================================================================
--   les 9 brouillons du lot 6a, créés sans nœud ni tag, vont sur un nœud EXISTANT, tag posé :
--   158e5e1a (Translations) → TSPE-549, « Espace > vecteurs de l'espace » ;
--   f42d3f90 (Bilinéarité du produit scalaire) → TSPE-555 ;
--   49b2182f (Symétrie du produit scalaire) → TSPE-556 ;
--   2af3814b (Développer ‖u + v‖²) → TSPE-347 ;
--   49fc94d2 (La base est-elle orthonormée ?) → TSPE-344 ;
--     ces quatre sur « Orthogonalité et distances dans l'espace > produit scalaire dans l'espace »,
--     nœud de leurs points ;
--   2edf8213 (Longueur avec le produit scalaire) → TSPE-355, « … > angles » (nœud du point) ;
--   4f056eb3 (Distance d'un point à une droite) → TSPE-356, « … > projeté orthogonal » ;
--   aaa16821 (Aire et volume en repère) → TSPE-625, « … > produit scalaire dans l'espace » (point
--     sur la notion « Orthogonalité et distances dans l'espace », qui a des sous-notions) ;
--   dcabc409 (Deux droites orthogonales ?) → TSPE-357, « … > orthogonalité de droites et plans ».
-- Branche : « Géométrie ». Aucune sous-notion neuve. question_template_points_check_rules
-- accepte un tag dont le point est sur le nœud du modèle OU sur sa notion, et au plus UN point par
-- programme (ADR 0020).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-02 (journal docs/wip/questions-tspe-espace-progress.md,
-- § Lot 6a). Les modèles ont été créés en brouillon le 2026-11-02 par scripts/create-questions.ts
-- (scripts/questions/tspe-6a-orthogonalite-distances/, #2239), qui ne pose ni nœud ni tag. Relevé
-- de la prod du 2026-11-02 (MCP) : 9 brouillons en [T_SPE], sans nœud ni tag ; nœuds des 9 points
-- vérifiés le même jour.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (9 modèles). Elle est prouvée par
-- tests/integration/questions-tspe-lot6a-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : chaque modèle doit être encore SANS nœud et SANS aucun tag
-- (relevé du 2026-11-02), sinon un rangement fait depuis à la main serait écrasé. Nœuds désignés
-- par leur chemin, résolus STRICTEMENT ; chaque point doit être sur le nœud de son modèle ou sur sa
-- notion.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin et prof ; leurs tags, pas leur
-- contenu, lisibles par tout compte connecté, comme avant). Question posée avec la phase 0 du lot
-- 6a, « je valide » de David le 2026-11-02. Aucune règle (policy) ne change. Les élèves ne voient
-- les modèles qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 9 tags et rend les modèles sans nœud. Garde : il
-- refuse si un modèle n'est plus sur le nœud laissé par la migration ou porte d'autres tags. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qtl6a_retour;
-- create temporary table _qtl6a_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text,
-- 	grade text not null, code text not null, noeud uuid
-- );
-- insert into _qtl6a_retour values
-- 	('158e5e1a-c501-404e-b270-253c2b9e86a3', 'Géométrie', 'Espace', 'vecteurs de l''espace', 'T_SPE', 'TSPE-549', null),
-- 	('f42d3f90-8f8e-4c5b-abe3-fcc1ae15fec0', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'produit scalaire dans l''espace', 'T_SPE', 'TSPE-555', null),
-- 	('49b2182f-67e3-4243-b628-483dc9cea18a', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'produit scalaire dans l''espace', 'T_SPE', 'TSPE-556', null),
-- 	('2af3814b-0991-48b3-86bb-5046c91f6e56', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'produit scalaire dans l''espace', 'T_SPE', 'TSPE-347', null),
-- 	('49fc94d2-517a-42de-b793-dcb397d459af', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'produit scalaire dans l''espace', 'T_SPE', 'TSPE-344', null),
-- 	('2edf8213-0225-4ec8-b21f-1872e84661aa', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'angles', 'T_SPE', 'TSPE-355', null),
-- 	('4f056eb3-1626-44ad-828c-d0e39d1956da', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'projeté orthogonal', 'T_SPE', 'TSPE-356', null),
-- 	('aaa16821-b175-45c9-9085-84b879d77ae6', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'produit scalaire dans l''espace', 'T_SPE', 'TSPE-625', null),
-- 	('dcabc409-b67b-4d21-8fe7-7c104d64c8a3', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'orthogonalité de droites et plans', 'T_SPE', 'TSPE-357', null);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qtl6a_retour order by id;
-- select 1 from public.question_templates where id in (select id from _qtl6a_retour) order by id for update;
-- update _qtl6a_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and r.sous_notion is not null and s.name = r.sous_notion;
-- update _qtl6a_retour r set noeud = n.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and r.sous_notion is null;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _qtl6a_retour where noeud is null) then
-- 		raise exception 'rollback : nœuds introuvables : %', (select count(*) from _qtl6a_retour where noeud is null);
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _qtl6a_retour r on r.id = q.id;
-- 	if v_presents not in (0, 9) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 9', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ne sont plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*), count(*) filter (where p.grade = r.grade and p.code = r.code)
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _qtl6a_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_total or v_total <> v_presents then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_presents;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _qtl6a_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _qtl6a_retour);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _qtl6a_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._qtl6a_tags;
drop table if exists pg_temp._qtl6a_modeles;
create temporary table _qtl6a_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text  -- null : le modèle va sur la notion (qui n'a pas de sous-notion)
);
insert into _qtl6a_modeles values
	('158e5e1a-c501-404e-b270-253c2b9e86a3', 'Géométrie', 'Espace', 'vecteurs de l''espace'),
	('f42d3f90-8f8e-4c5b-abe3-fcc1ae15fec0', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'produit scalaire dans l''espace'),
	('49b2182f-67e3-4243-b628-483dc9cea18a', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'produit scalaire dans l''espace'),
	('2af3814b-0991-48b3-86bb-5046c91f6e56', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'produit scalaire dans l''espace'),
	('49fc94d2-517a-42de-b793-dcb397d459af', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'produit scalaire dans l''espace'),
	('2edf8213-0225-4ec8-b21f-1872e84661aa', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'angles'),
	('4f056eb3-1626-44ad-828c-d0e39d1956da', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'projeté orthogonal'),
	('aaa16821-b175-45c9-9085-84b879d77ae6', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'produit scalaire dans l''espace'),
	('dcabc409-b67b-4d21-8fe7-7c104d64c8a3', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'orthogonalité de droites et plans');
create temporary table _qtl6a_tags (
	id uuid not null references _qtl6a_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _qtl6a_tags values
	('158e5e1a-c501-404e-b270-253c2b9e86a3', 'T_SPE', 'TSPE-549'),
	('f42d3f90-8f8e-4c5b-abe3-fcc1ae15fec0', 'T_SPE', 'TSPE-555'),
	('49b2182f-67e3-4243-b628-483dc9cea18a', 'T_SPE', 'TSPE-556'),
	('2af3814b-0991-48b3-86bb-5046c91f6e56', 'T_SPE', 'TSPE-347'),
	('49fc94d2-517a-42de-b793-dcb397d459af', 'T_SPE', 'TSPE-344'),
	('2edf8213-0225-4ec8-b21f-1872e84661aa', 'T_SPE', 'TSPE-355'),
	('4f056eb3-1626-44ad-828c-d0e39d1956da', 'T_SPE', 'TSPE-356'),
	('aaa16821-b175-45c9-9085-84b879d77ae6', 'T_SPE', 'TSPE-625'),
	('dcabc409-b67b-4d21-8fe7-7c104d64c8a3', 'T_SPE', 'TSPE-357');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qtl6a_modeles order by id;
select 1 from public.question_templates where id in (select id from _qtl6a_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) : présence TOUT ou RIEN, sans nœud, sans tag ---------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qtl6a_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 9) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 9', v_presents;
	end if;
	select count(*) into v_ranges from _qtl6a_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qtl6a_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. Résolution STRICTE des chemins et des points -----------------------------------
-- Le nœud est la sous-notion désignée, ou la notion quand aucune sous-notion n'est donnée ; chaque
-- point doit être sur ce nœud ou sur sa notion
alter table _qtl6a_modeles add column noeud uuid;
alter table _qtl6a_modeles add column notion_id uuid;
alter table _qtl6a_tags add column point_id uuid;
update _qtl6a_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is not null and s.name = r.sous_notion;
update _qtl6a_modeles r set noeud = n.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qtl6a_tags t set point_id = p.id
  from _qtl6a_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _qtl6a_modeles where noeud is null)
	   or exists (select 1 from _qtl6a_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qtl6a_modeles where noeud is null),
			(select count(*) from _qtl6a_tags where point_id is null);
	end if;
	-- Une notion désignée sans sous-notion ne doit en avoir AUCUNE (sinon le modèle irait par erreur
	-- sur la notion au lieu d'une de ses sous-notions)
	if exists (select 1 from _qtl6a_modeles r
	             join public.classification_nodes s on s.parent_id = r.notion_id
	              and s.kind = 'subnotion' and s.archived_at is null
	            where r.sous_notion is null) then
		raise exception 'notion visée sans sous-notion, mais elle en a : % modèle(s)',
			(select count(*) from _qtl6a_modeles r
			  where r.sous_notion is null
			    and exists (select 1 from public.classification_nodes s where s.parent_id = r.notion_id
			                  and s.kind = 'subnotion' and s.archived_at is null));
	end if;
end $resolution$;

-- ---- 4. Rangement, puis tags (le trigger des tags lit le nœud du modèle) -----------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qtl6a_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _qtl6a_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qtl6a_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qtl6a_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _qtl6a_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _qtl6a_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qtl6a_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qtl6a_tags;
drop table _qtl6a_modeles;
