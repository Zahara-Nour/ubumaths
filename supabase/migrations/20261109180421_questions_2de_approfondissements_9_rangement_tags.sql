-- ============================================================================
-- Chantier « questions-2de-demonstrations », lot 9 (approfondissements, géométrie repérée et
-- racine carrée) : nœud et tag des 2 modèles, réemploi de 64f54fc1 pour 2-323
-- ============================================================================
--   A. Deux brouillons créés sans nœud ni tag vont chacun sur une sous-notion EXISTANTE et active
--      (celle de leur point, ou une sous-notion de la notion de leur point), et reçoivent ce seul
--      point :
--        8009fb19 Partie du plan décrite par des inégalités
--                 → Géométrie > Géométrie repérée > équations de droites, 2-324 (point sur la notion)
--        4014a007 Relier les courbes de la fonction racine carrée et de la fonction carré
--                 → Fonctions > Fonction racine carrée > définition et courbe, 2-363
--   B. Le modèle PUBLIÉ de 1re spé 64f54fc1 « Points équidistants de l'axe des abscisses et d'un
--      point » (Géométrie > Géométrie repérée > parabole, tag 1SPE-334) passe de {1_SPE} à
--      {1_SPE, 2} et reçoit le point 2-323 (posé sur la notion Géométrie repérée). Son nœud ne
--      change pas.
-- Aucune sous-notion neuve, aucun point déplacé. question_template_points_check_rules accepte un
-- tag dont le point est sur le nœud du modèle OU sur sa notion, et au plus UN point par programme
-- (ADR 0020) : 64f54fc1 porte un point de 1re spé et un point de seconde.
-- Ni le contenu ni le statut des modèles ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-09 (journal docs/wip/questions-2de-demonstrations-progress.md,
-- § 13, D5, Q3 à Q6 : réemploi de 64f54fc1, sous-notions). Les 2 modèles ont été créés en
-- brouillon par David le 2026-11-09 avec scripts/create-questions.ts
-- (scripts/questions/2de-approfondissements-9/, #2523), qui ne pose ni nœud ni tag. Relevé de la
-- prod du 2026-11-09 (MCP) : 2 brouillons de seconde sans nœud ni tag ; 64f54fc1 publié, niveaux
-- {1_SPE}, sur Géométrie repérée > parabole, tag 1SPE-334 ; 2-323 et 2-324 sur la notion
-- Géométrie repérée, 2-363 sur définition et courbe, aucun tagué ; chemins visés uniques et actifs.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (les 3 modèles). Elle est prouvée par
-- tests/integration/questions-2de-approfondissements-9-rangement-tags.test.ts, qui fabrique des
-- copies des identifiants de la prod puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : les 2 brouillons encore SANS nœud et SANS tag ; 64f54fc1 encore
-- publié, aux niveaux {1_SPE} exactement, sur Géométrie repérée > parabole, sans point de seconde.
-- Nœuds désignés par leur chemin, points par leur code, résolus STRICTEMENT. Tout ou rien.
--
-- Données d'élèves : aucune (on range, on tague, on ajoute un niveau scolaire à un modèle).
--
-- Accès : personne ne gagne ni ne perd d'accès. La lecture de question_templates ne regarde pas
-- `grades` (publiés : tout compte connecté et anon ; brouillons : admin et prof) ; tags et points
-- restent lisibles comme avant. Ajouter 2 à 64f54fc1 change seulement où il apparaît (niveau
-- seconde) : les élèves de seconde le voient dans leur niveau dès la migration (déjà publié).
-- Question posée à David AVANT le SQL (phase 0, Q6 de D5), tranchée par lui le 2026-11-09 :
-- personne de plus ; à la publication, les élèves de seconde voient les modèles, dont 64f54fc1.
-- Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 3 tags de seconde (64f54fc1 garde 1SPE-334), rend
-- les 2 brouillons sans nœud et remet 64f54fc1 à {1_SPE}. Garde : il refuse si un modèle n'est plus
-- sur le nœud laissé par la migration, ou si leurs tags ou les niveaux de 64f54fc1 ont changé. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q2ap9_retour_tags;
-- drop table if exists pg_temp._q2ap9_retour;
-- create temporary table _q2ap9_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text not null,
-- 	range boolean not null, noeud uuid
-- );
-- insert into _q2ap9_retour values
-- 	('8009fb19-34db-4736-a1bc-ddf88892a863', 'Géométrie', 'Géométrie repérée', 'équations de droites', true, null),
-- 	('4014a007-61cf-41a4-aa5d-963ebf8636c8', 'Fonctions', 'Fonction racine carrée', 'définition et courbe', true, null),
-- 	('64f54fc1-1222-4795-bcb9-305262667688', 'Géométrie', 'Géométrie repérée', 'parabole', false, null);
-- create temporary table _q2ap9_retour_tags (id uuid primary key, code text not null);
-- insert into _q2ap9_retour_tags values
-- 	('8009fb19-34db-4736-a1bc-ddf88892a863', '2-324'),
-- 	('4014a007-61cf-41a4-aa5d-963ebf8636c8', '2-363'),
-- 	('64f54fc1-1222-4795-bcb9-305262667688', '2-323');
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _q2ap9_retour order by id;
-- select 1 from public.question_templates where id in (select id from _q2ap9_retour) order by id for update;
-- update _q2ap9_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and s.name = r.sous_notion;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer; v_attendus integer;
-- 	v_niveaux integer;
-- begin
-- 	if exists (select 1 from _q2ap9_retour where noeud is null) then
-- 		raise exception 'rollback : nœud introuvable';
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _q2ap9_retour r on r.id = q.id;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur %, plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*) into v_attendus from _q2ap9_retour_tags t join public.question_templates q on q.id = t.id;
-- 	select count(*), count(*) filter (where exists (select 1 from _q2ap9_retour_tags t
-- 	                                                where t.id = q.template_id and t.code = p.code))
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _q2ap9_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id and p.grade = '2';
-- 	if v_tags <> v_attendus or v_total <> v_attendus then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_attendus;
-- 	end if;
-- 	select count(*) into v_niveaux from public.question_templates
-- 	 where id = '64f54fc1-1222-4795-bcb9-305262667688' and grades::text[] <> array['1_SPE', '2'];
-- 	if v_niveaux <> 0 then
-- 		raise exception 'rollback : niveaux de 64f54fc1 changés depuis la migration';
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _q2ap9_retour r, public.curriculum_points p
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '2';
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _q2ap9_retour where range);
-- update public.question_templates set grades = array_remove(grades, '2')
--  where id = '64f54fc1-1222-4795-bcb9-305262667688';
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _q2ap9_retour_tags;
-- drop table _q2ap9_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Les modèles et leurs tags, en tables temporaires ---------------------------------------
drop table if exists pg_temp._q2ap9_tags;
drop table if exists pg_temp._q2ap9_modeles;
-- `range` : le modèle reçoit son nœud (les 2 brouillons) ; 64f54fc1 garde le sien.
create temporary table _q2ap9_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null,
	range boolean not null
);
insert into _q2ap9_modeles values
	('8009fb19-34db-4736-a1bc-ddf88892a863', 'Géométrie', 'Géométrie repérée', 'équations de droites', true),
	('4014a007-61cf-41a4-aa5d-963ebf8636c8', 'Fonctions', 'Fonction racine carrée', 'définition et courbe', true),
	('64f54fc1-1222-4795-bcb9-305262667688', 'Géométrie', 'Géométrie repérée', 'parabole', false);
create temporary table _q2ap9_tags (
	id uuid primary key references _q2ap9_modeles (id),
	code text not null
);
insert into _q2ap9_tags values
	('8009fb19-34db-4736-a1bc-ddf88892a863', '2-324'),
	('4014a007-61cf-41a4-aa5d-963ebf8636c8', '2-363'),
	('64f54fc1-1222-4795-bcb9-305262667688', '2-323');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin) et la ligne du modèle.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q2ap9_modeles order by id;
select 1 from public.question_templates where id in (select id from _q2ap9_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) ----------------------------------------------------------
do $garde$
declare v_ranges integer; v_tags integer; v_reemploi integer;
begin
	select count(*) into v_ranges from _q2ap9_modeles r
	  join public.question_templates q on q.id = r.id
	 where r.range and q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèle(s) déjà rangé(s) depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q2ap9_modeles r on r.id = q.template_id and r.range;
	if v_tags <> 0 then
		raise exception 'modèle(s) déjà tagué(s) depuis le relevé : % tag(s)', v_tags;
	end if;
	-- 64f54fc1 : publié, {1_SPE} exactement, sur Géométrie repérée > parabole, sans point de seconde.
	select count(*) into v_reemploi
	  from public.question_templates q
	  join _q2ap9_modeles r on r.id = q.id and not r.range
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
		raise exception '64f54fc1 changé depuis le relevé (statut, niveaux, nœud ou tag de seconde)';
	end if;
end $garde$;

-- ---- 3. Résolution STRICTE des chemins et des points des modèles -------------------------------
alter table _q2ap9_modeles add column noeud uuid;
alter table _q2ap9_modeles add column notion_id uuid;
alter table _q2ap9_tags add column point_id uuid;
update _q2ap9_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q2ap9_tags t set point_id = p.id
  from _q2ap9_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = '2' and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _q2ap9_modeles where noeud is null)
	   or exists (select 1 from _q2ap9_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q2ap9_modeles where noeud is null),
			(select count(*) from _q2ap9_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 4. Rangement et niveaux, puis tags (le trigger des tags lit le nœud du modèle) -------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q2ap9_modeles r
 where q.id = r.id and r.range;
update public.question_templates q set grades = array_append(q.grades, '2')
  from _q2ap9_modeles r
 where q.id = r.id and not r.range;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _q2ap9_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications ------------------------------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
	v_niveaux integer;
begin
	select count(*) into v_presents from _q2ap9_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q2ap9_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _q2ap9_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _q2ap9_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q2ap9_modeles m on m.id = q.template_id
	  join public.curriculum_points p on p.id = q.point_id and p.grade = '2';
	select count(*) into v_niveaux from public.question_templates q
	  join _q2ap9_modeles r on r.id = q.id
	 where q.grades::text[] <> case when r.range then array['2'] else array['1_SPE', '2'] end;
	-- Tout ou rien : les 3 modèles (prod) ou aucun (base locale), jamais une partie.
	if v_presents not in (0, (select count(*) from _q2ap9_modeles)) then
		raise exception 'lot partiel : % modèle(s) présent(s) sur %', v_presents,
			(select count(*) from _q2ap9_modeles);
	end if;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus or v_niveaux <> 0 then
		raise exception 'lot incohérent : nœuds %/%, tags de seconde du lot %/%, en base %, niveaux faux %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total, v_niveaux;
	end if;
end $check$;

drop table _q2ap9_tags;
drop table _q2ap9_modeles;
