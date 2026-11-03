-- ============================================================================
-- Chantier « questions-tspe-lot9 » (terminale spé, espace sur figure) : nœud et tags de 8 modèles
-- ============================================================================
--   les 8 brouillons du lot 9, créés sans nœud ni tag, vont sur un nœud EXISTANT et actif de
--   « Géométrie > Espace », tag posé (un point par modèle, ADR 0020) :
--   d7a361ca (Espace : exprimer un vecteur à l’aide des arêtes) → TSPE-335, « Géométrie > Espace > coplanarité et décomposition » ;
--   63669e60 (Espace : coordonnées d’un vecteur dans une base) → TSPE-338, « Géométrie > Espace > coplanarité et décomposition » ;
--   4c19f2cb (Espace : deux vecteurs forment-ils une base d’un plan ?) → TSPE-337, « Géométrie > Espace > coplanarité et décomposition » ;
--   f9df1cd9 (Espace : trois vecteurs forment-ils une base ?) → TSPE-553, « Géométrie > Espace > coplanarité et décomposition » ;
--   d6d9d5f7 (Espace : position relative de deux droites) → TSPE-336, « Géométrie > Espace > positions relatives et intersections » ;
--   f61cd451 (Espace : position relative d’une droite et d’un plan) → TSPE-551, « Géométrie > Espace > positions relatives et intersections » ;
--   14a02a32 (Espace : position relative de deux plans) → TSPE-552, « Géométrie > Espace > positions relatives et intersections » ;
--   a45a315b (Espace : coplanarité et parallélisme sur un cube) → TSPE-339, « Géométrie > Espace » ;
-- TSPE-339 est rangé sur la notion « Géométrie > Espace » : son modèle (F8) va sur la NOTION
-- (phase 0, Q4). Les 6 sous-notions actives de la notion au relevé sont admises ; toute autre fait
-- échouer la migration. Aucune sous-notion neuve.
-- question_template_points_check_rules accepte un tag dont le point est sur le nœud du modèle OU
-- sur sa notion, et au plus UN point par programme (ADR 0020).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-03 (journal docs/wip/questions-tspe-lot9-progress.md,
-- « Phase 0 », D-L9). Les modèles ont été créés en brouillon le 2026-11-03 par
-- scripts/create-questions.ts (scripts/questions/tspe-9-figure/, #2312), qui ne pose ni nœud ni tag.
-- Relevé de la prod du 2026-11-03 (MCP) : 8 brouillons en [T_SPE], sans nœud ni tag ; les 8 points
-- sans tag, 7 sur les sous-notions visées, 339 sur la notion « Espace », toutes actives.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (8 modèles). Elle est prouvée par
-- tests/integration/questions-tspe-lot9-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : chaque modèle doit être encore SANS nœud et SANS aucun tag
-- (relevé du 2026-11-03), sinon un rangement fait depuis à la main serait écrasé. Nœuds désignés
-- par leur chemin, résolus STRICTEMENT ; chaque point doit être sur le nœud de son modèle ou sur sa
-- notion.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin et prof ; leurs tags, pas leur
-- contenu, lisibles par tout compte connecté, comme avant). Question posée avec la phase 0 du lot
-- 9 (Q5), tranchée par David le 2026-11-03. Aucune règle (policy) ne change. Les élèves ne voient
-- les modèles qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 8 tags et rend les modèles sans nœud. Garde : il
-- refuse si un modèle n'est plus sur le nœud laissé par la migration ou porte d'autres tags. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qtl9_retour;
-- create temporary table _qtl9_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text,
-- 	grade text not null, code text not null, noeud uuid
-- );
-- insert into _qtl9_retour values
-- 	('d7a361ca-3a71-430a-82e4-720a1b14c0ad', 'Géométrie', 'Espace', 'coplanarité et décomposition', 'T_SPE', 'TSPE-335', null),
-- 	('63669e60-3140-4f55-8d5e-cc9d390adaf1', 'Géométrie', 'Espace', 'coplanarité et décomposition', 'T_SPE', 'TSPE-338', null),
-- 	('4c19f2cb-1c90-4b43-83ad-521ee4edb1f0', 'Géométrie', 'Espace', 'coplanarité et décomposition', 'T_SPE', 'TSPE-337', null),
-- 	('f9df1cd9-9791-42a3-bb5f-c0c84ad84d9c', 'Géométrie', 'Espace', 'coplanarité et décomposition', 'T_SPE', 'TSPE-553', null),
-- 	('d6d9d5f7-8af1-45ba-aa9f-fb5f9e0fc82e', 'Géométrie', 'Espace', 'positions relatives et intersections', 'T_SPE', 'TSPE-336', null),
-- 	('f61cd451-0435-4fa7-ba72-93b1f98f65b8', 'Géométrie', 'Espace', 'positions relatives et intersections', 'T_SPE', 'TSPE-551', null),
-- 	('14a02a32-092f-4c1c-83cc-44f912c66f43', 'Géométrie', 'Espace', 'positions relatives et intersections', 'T_SPE', 'TSPE-552', null),
-- 	('a45a315b-9610-4452-9ab3-df00d5eb24bf', 'Géométrie', 'Espace', null, 'T_SPE', 'TSPE-339', null);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qtl9_retour order by id;
-- select 1 from public.question_templates where id in (select id from _qtl9_retour) order by id for update;
-- update _qtl9_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and r.sous_notion is not null and s.name = r.sous_notion;
-- update _qtl9_retour r set noeud = n.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and r.sous_notion is null;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _qtl9_retour where noeud is null) then
-- 		raise exception 'rollback : nœuds introuvables : %', (select count(*) from _qtl9_retour where noeud is null);
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _qtl9_retour r on r.id = q.id;
-- 	if v_presents not in (0, 8) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 8', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ne sont plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*), count(*) filter (where p.grade = r.grade and p.code = r.code)
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _qtl9_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_total or v_total <> v_presents then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_presents;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _qtl9_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _qtl9_retour);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _qtl9_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._qtl9_tags;
drop table if exists pg_temp._qtl9_modeles;
create temporary table _qtl9_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,  -- null : le modèle va sur la notion
	-- Sous-notions actives que la notion a le droit d'avoir quand le modèle va sur elle (relevé du
	-- 2026-11-03) : toute autre fait échouer la migration
	sous_notions_admises text[]
);
insert into _qtl9_modeles values
	('d7a361ca-3a71-430a-82e4-720a1b14c0ad', 'Géométrie', 'Espace', 'coplanarité et décomposition', null),
	('63669e60-3140-4f55-8d5e-cc9d390adaf1', 'Géométrie', 'Espace', 'coplanarité et décomposition', null),
	('4c19f2cb-1c90-4b43-83ad-521ee4edb1f0', 'Géométrie', 'Espace', 'coplanarité et décomposition', null),
	('f9df1cd9-9791-42a3-bb5f-c0c84ad84d9c', 'Géométrie', 'Espace', 'coplanarité et décomposition', null),
	('d6d9d5f7-8af1-45ba-aa9f-fb5f9e0fc82e', 'Géométrie', 'Espace', 'positions relatives et intersections', null),
	('f61cd451-0435-4fa7-ba72-93b1f98f65b8', 'Géométrie', 'Espace', 'positions relatives et intersections', null),
	('14a02a32-092f-4c1c-83cc-44f912c66f43', 'Géométrie', 'Espace', 'positions relatives et intersections', null),
	('a45a315b-9610-4452-9ab3-df00d5eb24bf', 'Géométrie', 'Espace', null, array['colinéarité et alignement', 'coordonnées', 'coplanarité et décomposition', 'positions relatives et intersections', 'représentation paramétrique', 'vecteurs de l''espace']);
create temporary table _qtl9_tags (
	id uuid not null references _qtl9_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _qtl9_tags values
	('d7a361ca-3a71-430a-82e4-720a1b14c0ad', 'T_SPE', 'TSPE-335'),
	('63669e60-3140-4f55-8d5e-cc9d390adaf1', 'T_SPE', 'TSPE-338'),
	('4c19f2cb-1c90-4b43-83ad-521ee4edb1f0', 'T_SPE', 'TSPE-337'),
	('f9df1cd9-9791-42a3-bb5f-c0c84ad84d9c', 'T_SPE', 'TSPE-553'),
	('d6d9d5f7-8af1-45ba-aa9f-fb5f9e0fc82e', 'T_SPE', 'TSPE-336'),
	('f61cd451-0435-4fa7-ba72-93b1f98f65b8', 'T_SPE', 'TSPE-551'),
	('14a02a32-092f-4c1c-83cc-44f912c66f43', 'T_SPE', 'TSPE-552'),
	('a45a315b-9610-4452-9ab3-df00d5eb24bf', 'T_SPE', 'TSPE-339');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qtl9_modeles order by id;
select 1 from public.question_templates where id in (select id from _qtl9_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) : présence TOUT ou RIEN, sans nœud, sans tag ---------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qtl9_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 8) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 8', v_presents;
	end if;
	select count(*) into v_ranges from _qtl9_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qtl9_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. Résolution STRICTE des chemins et des points -----------------------------------
-- Le nœud est la sous-notion désignée, ou la notion quand aucune sous-notion n'est donnée ; chaque
-- point doit être sur ce nœud ou sur sa notion
alter table _qtl9_modeles add column noeud uuid;
alter table _qtl9_modeles add column notion_id uuid;
alter table _qtl9_tags add column point_id uuid;
update _qtl9_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is not null and s.name = r.sous_notion;
update _qtl9_modeles r set noeud = n.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qtl9_tags t set point_id = p.id
  from _qtl9_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _qtl9_modeles where noeud is null)
	   or exists (select 1 from _qtl9_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qtl9_modeles where noeud is null),
			(select count(*) from _qtl9_tags where point_id is null);
	end if;
	-- Une notion désignée sans sous-notion ne doit avoir AUCUNE sous-notion active hors de celles
	-- admises (sinon le modèle irait par erreur sur la notion au lieu d'une de ses sous-notions).
	-- (Lot 9 : F8 va sur la notion « Espace », dont les 6 sous-notions du relevé sont admises.)
	if exists (select 1 from _qtl9_modeles r
	             join public.classification_nodes s on s.parent_id = r.notion_id
	              and s.kind = 'subnotion' and s.archived_at is null
	            where r.sous_notion is null
	              and s.name <> all (coalesce(r.sous_notions_admises, '{}'))) then
		raise exception 'notion visée sans sous-notion, mais elle en a une non admise : % modèle(s)',
			(select count(*) from _qtl9_modeles r
			  where r.sous_notion is null
			    and exists (select 1 from public.classification_nodes s where s.parent_id = r.notion_id
			                  and s.kind = 'subnotion' and s.archived_at is null
			                  and s.name <> all (coalesce(r.sous_notions_admises, '{}'))));
	end if;
end $resolution$;

-- ---- 4. Rangement, puis tags (le trigger des tags lit le nœud du modèle) -----------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qtl9_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _qtl9_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qtl9_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qtl9_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _qtl9_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _qtl9_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qtl9_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qtl9_tags;
drop table _qtl9_modeles;
