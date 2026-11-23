-- ============================================================================
-- Chantier « questions-2de-demonstrations », lot 8 (approfondissements, géométrie) : nœud et tag
-- des 5 modèles, déplacement des points 2-307 et 2-310, réemploi de d4db2207 pour 2-309
-- ============================================================================
--   A. Deux points de seconde posés sur la notion Géométrie > Géométrie repérée passent sous
--      Figures planes, sur une sous-notion EXISTANTE et active :
--        2-307 Démontrer que les hauteurs d'un triangle sont concourantes
--              → Géométrie > Figures planes > triangles
--        2-310 Démontrer que le point de concours des médiatrices est le centre du cercle circonscrit
--              → Géométrie > Figures planes > médiatrice et bissectrice
--   B. Cinq brouillons créés sans nœud ni tag vont chacun sur une sous-notion EXISTANTE et active
--      (celle de leur point, ou une sous-notion de la notion de leur point), et reçoivent ce seul
--      point :
--        6bd8366f Barycentre de deux ou trois points
--                 → Géométrie > Vecteurs > combinaison linéaire, 2-305 (point sur la notion)
--        574142b3 Démontrer la formule des coordonnées du milieu
--                 → Géométrie > Géométrie repérée > milieu et distance, 2-306
--        b1b7bfc1 Démontrer que les hauteurs d'un triangle sont concourantes
--                 → Géométrie > Figures planes > triangles, 2-307 (déplacé en A)
--        31177044 Aire d'un triangle : ½ ab sin C
--                 → Grandeurs et mesures > Aires > triangle quelconque, 2-308
--        13908afe Démontrer que les médiatrices d'un triangle sont concourantes
--                 → Géométrie > Figures planes > médiatrice et bissectrice, 2-310 (déplacé en A)
--   C. Le modèle PUBLIÉ de 1re spé d4db2207 « Démontrer que les médianes concourent au centre de
--      gravité » (Géométrie > Vecteurs > combinaison linéaire, tag 1SPE-326) passe de {1_SPE} à
--      {1_SPE, 2} et reçoit le point 2-309 (posé sur la notion Vecteurs). Son nœud ne change pas.
-- Aucune sous-notion neuve. question_template_points_check_rules accepte un tag dont le point est
-- sur le nœud du modèle OU sur sa notion, et au plus UN point par programme (ADR 0020) : d4db2207
-- porte un point de 1re spé et un point de seconde.
-- Ni le contenu ni le statut des modèles ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-09 (journal docs/wip/questions-2de-demonstrations-progress.md,
-- § 13, D5, Q3 à Q6 : réemploi de d4db2207, sous-notions, déplacement de 2-307 et 2-310 sous
-- Figures planes). Les 5 modèles ont été créés en brouillon par David le 2026-11-09 avec
-- scripts/create-questions.ts (scripts/questions/2de-approfondissements-8/, #2517), qui ne pose ni
-- nœud ni tag. Relevé de la prod du 2026-11-09 (MCP) : 5 brouillons de seconde sans nœud ni tag ;
-- d4db2207 publié, niveaux {1_SPE}, sur Vecteurs > combinaison linéaire ; 2-305 et 2-309 sur la
-- notion Vecteurs, 2-306 sur milieu et distance, 2-307 et 2-310 sur la notion Géométrie repérée,
-- 2-308 sur triangle quelconque, aucun tagué ; chemins visés uniques et actifs.
--
-- Les modèles n'existent qu'en production : en base locale, la partie B-C ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (les 6 modèles). La partie A (points) joue
-- partout. Elle est prouvée par tests/integration/questions-2de-approfondissements-8-rangement-tags.test.ts,
-- qui fabrique des copies des identifiants de la prod puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : les 5 modèles encore SANS nœud et SANS tag ; d4db2207 encore
-- publié, aux niveaux {1_SPE} exactement, sur Vecteurs > combinaison linéaire, sans point de
-- seconde ; 2-307 et 2-310 encore sur la notion Géométrie repérée et sans tag. Nœuds désignés par
-- leur chemin, points par leur code, résolus STRICTEMENT. Tout ou rien.
--
-- Données d'élèves : aucune (on range, on tague, on déplace deux points du programme, on ajoute un
-- niveau scolaire à un modèle).
--
-- Accès : personne ne gagne ni ne perd d'accès. La lecture de question_templates ne regarde pas
-- `grades` (publiés : tout compte connecté et anon ; brouillons : admin et prof) ; tags et points
-- restent lisibles comme avant. Ajouter 2 à d4db2207 change seulement où il apparaît (niveau
-- seconde) : les élèves de seconde le voient dans leur niveau dès la migration (déjà publié).
-- Question posée à David AVANT le SQL (phase 0, Q6 de D5), tranchée par lui le 2026-11-09 :
-- personne de plus ; à la publication, les élèves de seconde voient les modèles, dont d4db2207.
-- Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags de seconde (d4db2207 garde 1SPE-326), rend
-- les 5 modèles sans nœud, remet d4db2207 à {1_SPE} et 2-307, 2-310 sur la notion Géométrie
-- repérée. Garde : il refuse si un modèle n'est plus sur le nœud laissé par la migration, si leurs
-- tags ou les niveaux de d4db2207 ont changé, ou si un point n'est plus sur sa sous-notion ou porte
-- un autre tag. Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q2ap8_retour_tags;
-- drop table if exists pg_temp._q2ap8_retour;
-- drop table if exists pg_temp._q2ap8_retour_points;
-- create temporary table _q2ap8_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text not null,
-- 	range boolean not null, noeud uuid
-- );
-- insert into _q2ap8_retour values
-- 	('6bd8366f-028b-4619-afc1-db1aaa24113f', 'Géométrie', 'Vecteurs', 'combinaison linéaire', true, null),
-- 	('574142b3-e610-4d4c-8506-8e77f0dfb630', 'Géométrie', 'Géométrie repérée', 'milieu et distance', true, null),
-- 	('b1b7bfc1-af33-44c8-93dd-e7f18acf405d', 'Géométrie', 'Figures planes', 'triangles', true, null),
-- 	('31177044-256b-43e2-8a61-5003dea31b4e', 'Grandeurs et mesures', 'Aires', 'triangle quelconque', true, null),
-- 	('13908afe-a957-4af1-974c-5e743adcc233', 'Géométrie', 'Figures planes', 'médiatrice et bissectrice', true, null),
-- 	('d4db2207-e392-4b3b-8973-3656a4ab4642', 'Géométrie', 'Vecteurs', 'combinaison linéaire', false, null);
-- create temporary table _q2ap8_retour_tags (id uuid primary key, code text not null);
-- insert into _q2ap8_retour_tags values
-- 	('6bd8366f-028b-4619-afc1-db1aaa24113f', '2-305'),
-- 	('574142b3-e610-4d4c-8506-8e77f0dfb630', '2-306'),
-- 	('b1b7bfc1-af33-44c8-93dd-e7f18acf405d', '2-307'),
-- 	('31177044-256b-43e2-8a61-5003dea31b4e', '2-308'),
-- 	('13908afe-a957-4af1-974c-5e743adcc233', '2-310'),
-- 	('d4db2207-e392-4b3b-8973-3656a4ab4642', '2-309');
-- create temporary table _q2ap8_retour_points (code text primary key, sous_notion text not null, source uuid, cible uuid);
-- insert into _q2ap8_retour_points values
-- 	('2-307', 'triangles', null, null),
-- 	('2-310', 'médiatrice et bissectrice', null, null);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _q2ap8_retour order by id;
-- select 1 from public.question_templates where id in (select id from _q2ap8_retour) order by id for update;
-- update _q2ap8_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and s.name = r.sous_notion;
-- update _q2ap8_retour_points x set source = n.id, cible = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--        and n.name = 'Géométrie repérée'
--   join public.classification_nodes f on f.parent_id = b.id and f.kind = 'notion' and f.archived_at is null
--        and f.name = 'Figures planes'
--   join public.classification_nodes s on s.parent_id = f.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = 'Géométrie'
--    and s.name = x.sous_notion;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer; v_attendus integer;
-- 	v_niveaux integer; v_points integer; v_autres integer;
-- begin
-- 	if exists (select 1 from _q2ap8_retour where noeud is null)
-- 	   or exists (select 1 from _q2ap8_retour_points where source is null or cible is null) then
-- 		raise exception 'rollback : nœud introuvable';
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _q2ap8_retour r on r.id = q.id;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur %, plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*) into v_attendus from _q2ap8_retour_tags t join public.question_templates q on q.id = t.id;
-- 	select count(*), count(*) filter (where exists (select 1 from _q2ap8_retour_tags t
-- 	                                                where t.id = q.template_id and t.code = p.code))
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _q2ap8_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id and p.grade = '2';
-- 	if v_tags <> v_attendus or v_total <> v_attendus then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_attendus;
-- 	end if;
-- 	select count(*) into v_niveaux from public.question_templates
-- 	 where id = 'd4db2207-e392-4b3b-8973-3656a4ab4642' and grades::text[] <> array['1_SPE', '2'];
-- 	if v_niveaux <> 0 then
-- 		raise exception 'rollback : niveaux de d4db2207 changés depuis la migration';
-- 	end if;
-- 	select count(*) into v_points from public.curriculum_points p
-- 	  join _q2ap8_retour_points x on x.code = p.code
-- 	 where p.grade = '2' and p.archived_at is null and p.node_id = x.cible;
-- 	if v_points <> 2 then
-- 		raise exception 'rollback : % point(s) sur 2 encore sur leur sous-notion de Figures planes', v_points;
-- 	end if;
-- 	select count(*) into v_autres from public.question_template_points q
-- 	  join public.curriculum_points p on p.id = q.point_id and p.grade = '2'
-- 	  join _q2ap8_retour_points x on x.code = p.code
-- 	 where q.template_id not in (select id from _q2ap8_retour);
-- 	if v_autres <> 0 then
-- 		raise exception 'rollback : 2-307 ou 2-310 tagué(s) sur un autre modèle : % tag(s)', v_autres;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _q2ap8_retour r, public.curriculum_points p
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '2';
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _q2ap8_retour where range);
-- update public.question_templates set grades = array_remove(grades, '2')
--  where id = 'd4db2207-e392-4b3b-8973-3656a4ab4642';
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- update public.curriculum_points p set node_id = x.source
--   from _q2ap8_retour_points x
--  where p.grade = '2' and p.code = x.code and p.archived_at is null and p.node_id = x.cible;
-- drop table _q2ap8_retour_points;
-- drop table _q2ap8_retour_tags;
-- drop table _q2ap8_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Les points, les modèles et leurs tags, en tables temporaires ----------------------------
drop table if exists pg_temp._q2ap8_tags;
drop table if exists pg_temp._q2ap8_modeles;
drop table if exists pg_temp._q2ap8_points;
create temporary table _q2ap8_points (
	code text primary key,
	sous_notion text not null,
	source uuid,
	cible uuid
);
insert into _q2ap8_points values
	('2-307', 'triangles', null, null),
	('2-310', 'médiatrice et bissectrice', null, null);
-- `range` : le modèle reçoit son nœud (les 5 brouillons) ; d4db2207 garde le sien.
create temporary table _q2ap8_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null,
	range boolean not null
);
insert into _q2ap8_modeles values
	('6bd8366f-028b-4619-afc1-db1aaa24113f', 'Géométrie', 'Vecteurs', 'combinaison linéaire', true),
	('574142b3-e610-4d4c-8506-8e77f0dfb630', 'Géométrie', 'Géométrie repérée', 'milieu et distance', true),
	('b1b7bfc1-af33-44c8-93dd-e7f18acf405d', 'Géométrie', 'Figures planes', 'triangles', true),
	('31177044-256b-43e2-8a61-5003dea31b4e', 'Grandeurs et mesures', 'Aires', 'triangle quelconque', true),
	('13908afe-a957-4af1-974c-5e743adcc233', 'Géométrie', 'Figures planes', 'médiatrice et bissectrice', true),
	('d4db2207-e392-4b3b-8973-3656a4ab4642', 'Géométrie', 'Vecteurs', 'combinaison linéaire', false);
create temporary table _q2ap8_tags (
	id uuid primary key references _q2ap8_modeles (id),
	code text not null
);
insert into _q2ap8_tags values
	('6bd8366f-028b-4619-afc1-db1aaa24113f', '2-305'),
	('574142b3-e610-4d4c-8506-8e77f0dfb630', '2-306'),
	('b1b7bfc1-af33-44c8-93dd-e7f18acf405d', '2-307'),
	('31177044-256b-43e2-8a61-5003dea31b4e', '2-308'),
	('13908afe-a957-4af1-974c-5e743adcc233', '2-310'),
	('d4db2207-e392-4b3b-8973-3656a4ab4642', '2-309');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), la ligne du modèle, et les
-- deux lignes de points déplacées.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q2ap8_modeles order by id;
select 1 from public.question_templates where id in (select id from _q2ap8_modeles) order by id for update;
select 1 from public.curriculum_points
 where grade = '2' and code in (select code from _q2ap8_points) and archived_at is null
 order by code for update;

-- ---- 2. Résolution STRICTE des nœuds des points ------------------------------------------------
update _q2ap8_points x set source = n.id, cible = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
       and n.name = 'Géométrie repérée'
  join public.classification_nodes f on f.parent_id = b.id and f.kind = 'notion' and f.archived_at is null
       and f.name = 'Figures planes'
  join public.classification_nodes s on s.parent_id = f.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = 'Géométrie'
   and s.name = x.sous_notion;

-- ---- 3. Gardes (avant toute écriture) ----------------------------------------------------------
do $garde$
declare v_ranges integer; v_tags integer; v_reemploi integer; v_points integer; v_tags_points integer;
begin
	if exists (select 1 from _q2ap8_points where source is null or cible is null) then
		raise exception 'nœuds des points introuvables : % point(s)',
			(select count(*) from _q2ap8_points where source is null or cible is null);
	end if;
	select count(*) into v_points from public.curriculum_points p
	  join _q2ap8_points x on x.code = p.code
	 where p.grade = '2' and p.archived_at is null and p.node_id = x.source;
	if v_points <> 2 then
		raise exception 'point(s) déplacé(s) ou archivé(s) depuis le relevé : % sur 2 sur la notion Géométrie repérée', v_points;
	end if;
	select count(*) into v_tags_points from public.question_template_points q
	  join public.curriculum_points p on p.id = q.point_id and p.grade = '2'
	  join _q2ap8_points x on x.code = p.code;
	if v_tags_points <> 0 then
		raise exception 'point(s) déjà tagué(s) depuis le relevé : % tag(s) sur 2-307 ou 2-310', v_tags_points;
	end if;
	select count(*) into v_ranges from _q2ap8_modeles r
	  join public.question_templates q on q.id = r.id
	 where r.range and q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèle(s) déjà rangé(s) depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q2ap8_modeles r on r.id = q.template_id and r.range;
	if v_tags <> 0 then
		raise exception 'modèle(s) déjà tagué(s) depuis le relevé : % tag(s)', v_tags;
	end if;
	-- d4db2207 : publié, {1_SPE} exactement, sur Vecteurs > combinaison linéaire, sans point de seconde.
	select count(*) into v_reemploi
	  from public.question_templates q
	  join _q2ap8_modeles r on r.id = q.id and not r.range
	 where q.status <> 'published' or q.grades::text[] <> array['1_SPE']
	    or q.classification_node_id is distinct from (
	         select s.id from public.classification_nodes b
	           join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
	           join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
	          where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
	            and n.name = r.notion and s.name = r.sous_notion)
	    or exists (select 1 from public.question_template_points t
	                 join public.curriculum_points p on p.id = t.point_id and p.grade = '2'
	                where t.template_id = q.id);
	if v_reemploi <> 0 then
		raise exception 'd4db2207 changé depuis le relevé (statut, niveaux, nœud ou tag de seconde)';
	end if;
end $garde$;

-- ---- 4. Les points 2-307 et 2-310 passent sous Figures planes ----------------------------------
update public.curriculum_points p set node_id = x.cible
  from _q2ap8_points x
 where p.grade = '2' and p.code = x.code and p.archived_at is null and p.node_id = x.source;

-- ---- 5. Résolution STRICTE des chemins et des points des modèles -------------------------------
alter table _q2ap8_modeles add column noeud uuid;
alter table _q2ap8_modeles add column notion_id uuid;
alter table _q2ap8_tags add column point_id uuid;
update _q2ap8_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q2ap8_tags t set point_id = p.id
  from _q2ap8_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = '2' and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _q2ap8_modeles where noeud is null)
	   or exists (select 1 from _q2ap8_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q2ap8_modeles where noeud is null),
			(select count(*) from _q2ap8_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 6. Rangement et niveaux, puis tags (le trigger des tags lit le nœud du modèle) -------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q2ap8_modeles r
 where q.id = r.id and r.range;
update public.question_templates q set grades = array_append(q.grades, '2')
  from _q2ap8_modeles r
 where q.id = r.id and not r.range;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _q2ap8_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 7. Vérifications ------------------------------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
	v_niveaux integer; v_points integer;
begin
	select count(*) into v_points from public.curriculum_points p
	  join _q2ap8_points x on x.code = p.code
	 where p.grade = '2' and p.archived_at is null and p.node_id = x.cible;
	if v_points <> 2 then
		raise exception 'points : % sur 2 sous Figures planes', v_points;
	end if;
	select count(*) into v_presents from _q2ap8_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q2ap8_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _q2ap8_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _q2ap8_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q2ap8_modeles m on m.id = q.template_id
	  join public.curriculum_points p on p.id = q.point_id and p.grade = '2';
	select count(*) into v_niveaux from public.question_templates q
	  join _q2ap8_modeles r on r.id = q.id
	 where q.grades::text[] <> case when r.range then array['2'] else array['1_SPE', '2'] end;
	-- Tout ou rien : les 6 modèles (prod) ou aucun (base locale), jamais une partie.
	if v_presents not in (0, (select count(*) from _q2ap8_modeles)) then
		raise exception 'lot partiel : % modèle(s) présent(s) sur %', v_presents,
			(select count(*) from _q2ap8_modeles);
	end if;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus or v_niveaux <> 0 then
		raise exception 'lot incohérent : nœuds %/%, tags de seconde du lot %/%, en base %, niveaux faux %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total, v_niveaux;
	end if;
end $check$;

drop table _q2ap8_tags;
drop table _q2ap8_modeles;
drop table _q2ap8_points;
