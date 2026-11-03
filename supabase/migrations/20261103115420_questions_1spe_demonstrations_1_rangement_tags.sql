-- ============================================================================
-- Chantier « questions-1spe-demonstrations », lot 1 : nœud et tag des 5 modèles de démonstrations
-- ============================================================================
--   Cinq brouillons créés sans nœud ni tag vont chacun sur la sous-notion EXISTANTE et active de
--   leur point, et reçoivent ce seul point (aucun point jumeau : relevé du 2026-11-03) :
--     a81c4c9f Démontrer le terme général d'une suite arithmétique → Suites > Suites arithmétiques
--              > terme général, 1SPE-232
--     acaeb02a Démontrer le terme général d'une suite géométrique → Suites > Suites géométriques
--              > terme général, 1SPE-233
--     5fbb9a04 Démontrer la somme 1 + 2 + ⋯ + n → Suites > Suites arithmétiques > somme des termes,
--              1SPE-234
--     b554a47f Démontrer la somme 1 + q + ⋯ + qⁿ → Suites > Suites géométriques > somme des termes,
--              1SPE-235
--     8865b98c Démontrer la résolution de l'équation du second degré → Algèbre > Équations : second
--              degré > discriminant, 1SPE-255
-- Aucune sous-notion neuve. question_template_points_check_rules accepte un tag dont le point est
-- sur le nœud du modèle OU sur sa notion, et au plus UN point par programme (ADR 0020).
-- Ni le contenu, ni les niveaux, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-03 (journal docs/wip/questions-1spe-demonstrations-progress.md,
-- § 3, D1). Les modèles ont été créés en brouillon le 2026-11-03 par scripts/create-questions.ts
-- (scripts/questions/1spe-demonstrations-1/, #2299), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-03 (MCP) : 5 brouillons au niveau {1_SPE}, sans nœud ni tag ; les 5 points sont sur les
-- sous-notions visées, actives.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent. Elle est prouvée par
-- tests/integration/questions-1spe-demonstrations-1-rangement-tags.test.ts, qui fabrique des copies
-- des identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : les modèles doivent être encore SANS nœud et SANS aucun tag
-- (relevé du 2026-11-03), sinon un rangement fait depuis à la main serait écrasé. Nœuds désignés par
-- leur chemin, points par leur code, résolus STRICTEMENT ; chaque point doit être sur le nœud de son
-- modèle ou sur sa notion. Tout ou rien.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin et prof ; leurs tags, pas leur
-- contenu, lisibles par tout compte connecté, comme pour tout modèle). Question posée à David AVANT
-- le SQL (phase 0, Q5), tranchée par lui le 2026-11-03 : personne. Aucune règle (policy) ne change.
-- Les élèves ne voient les modèles qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 5 tags et rend les modèles sans nœud. Garde : il
-- refuse si un modèle n'est plus sur le nœud laissé par la migration ou si leurs tags ont changé.
-- Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qdem1_retour_tags;
-- drop table if exists pg_temp._qdem1_retour;
-- create temporary table _qdem1_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text not null, noeud uuid
-- );
-- insert into _qdem1_retour values
-- 	('a81c4c9f-7a25-48a4-89c4-d48cadf0fa1b', 'Suites', 'Suites arithmétiques', 'terme général', null),
-- 	('acaeb02a-e934-43b6-99bc-46bb1ffb4f0f', 'Suites', 'Suites géométriques', 'terme général', null),
-- 	('5fbb9a04-d4c3-4810-b717-075493df916b', 'Suites', 'Suites arithmétiques', 'somme des termes', null),
-- 	('b554a47f-1b2e-4530-a979-44d785890adf', 'Suites', 'Suites géométriques', 'somme des termes', null),
-- 	('8865b98c-ba20-4188-bd16-5c6637cd6fad', 'Algèbre', 'Équations : second degré', 'discriminant', null);
-- create temporary table _qdem1_retour_tags (id uuid not null, grade text not null, code text not null, primary key (id, grade));
-- insert into _qdem1_retour_tags values
-- 	('a81c4c9f-7a25-48a4-89c4-d48cadf0fa1b', '1_SPE', '1SPE-232'),
-- 	('acaeb02a-e934-43b6-99bc-46bb1ffb4f0f', '1_SPE', '1SPE-233'),
-- 	('5fbb9a04-d4c3-4810-b717-075493df916b', '1_SPE', '1SPE-234'),
-- 	('b554a47f-1b2e-4530-a979-44d785890adf', '1_SPE', '1SPE-235'),
-- 	('8865b98c-ba20-4188-bd16-5c6637cd6fad', '1_SPE', '1SPE-255');
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qdem1_retour order by id;
-- select 1 from public.question_templates where id in (select id from _qdem1_retour) order by id for update;
-- update _qdem1_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and s.name = r.sous_notion;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer; v_attendus integer;
-- begin
-- 	if exists (select 1 from _qdem1_retour where noeud is null) then
-- 		raise exception 'rollback : nœud introuvable';
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _qdem1_retour r on r.id = q.id;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur %, plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*) into v_attendus from _qdem1_retour_tags t join public.question_templates q on q.id = t.id;
-- 	select count(*), count(*) filter (where exists (select 1 from _qdem1_retour_tags t
-- 	                                                where t.id = q.template_id and t.grade = p.grade and t.code = p.code))
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _qdem1_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_attendus or v_total <> v_attendus then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_attendus;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _qdem1_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _qdem1_retour);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _qdem1_retour_tags;
-- drop table _qdem1_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Les modèles et leurs tags, en tables temporaires ----------------------------------------
drop table if exists pg_temp._qdem1_tags;
drop table if exists pg_temp._qdem1_modeles;
create temporary table _qdem1_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null
);
insert into _qdem1_modeles values
	('a81c4c9f-7a25-48a4-89c4-d48cadf0fa1b', 'Suites', 'Suites arithmétiques', 'terme général'),
	('acaeb02a-e934-43b6-99bc-46bb1ffb4f0f', 'Suites', 'Suites géométriques', 'terme général'),
	('5fbb9a04-d4c3-4810-b717-075493df916b', 'Suites', 'Suites arithmétiques', 'somme des termes'),
	('b554a47f-1b2e-4530-a979-44d785890adf', 'Suites', 'Suites géométriques', 'somme des termes'),
	('8865b98c-ba20-4188-bd16-5c6637cd6fad', 'Algèbre', 'Équations : second degré', 'discriminant');
create temporary table _qdem1_tags (
	id uuid not null references _qdem1_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _qdem1_tags values
	('a81c4c9f-7a25-48a4-89c4-d48cadf0fa1b', '1_SPE', '1SPE-232'),
	('acaeb02a-e934-43b6-99bc-46bb1ffb4f0f', '1_SPE', '1SPE-233'),
	('5fbb9a04-d4c3-4810-b717-075493df916b', '1_SPE', '1SPE-234'),
	('b554a47f-1b2e-4530-a979-44d785890adf', '1_SPE', '1SPE-235'),
	('8865b98c-ba20-4188-bd16-5c6637cd6fad', '1_SPE', '1SPE-255');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et la ligne du modèle.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qdem1_modeles order by id;
select 1 from public.question_templates where id in (select id from _qdem1_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) : sans nœud, sans tag ---------------------------------
do $garde$
declare v_ranges integer; v_tags integer;
begin
	select count(*) into v_ranges from _qdem1_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèle(s) déjà rangé(s) depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qdem1_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèle(s) déjà tagué(s) depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. Résolution STRICTE du chemin et des points --------------------------------------
alter table _qdem1_modeles add column noeud uuid;
alter table _qdem1_modeles add column notion_id uuid;
alter table _qdem1_tags add column point_id uuid;
update _qdem1_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qdem1_tags t set point_id = p.id
  from _qdem1_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _qdem1_modeles where noeud is null)
	   or exists (select 1 from _qdem1_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qdem1_modeles where noeud is null),
			(select count(*) from _qdem1_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 4. Rangement, puis tags (le trigger des tags lit le nœud du modèle) -----------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qdem1_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _qdem1_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications ------------------------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qdem1_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qdem1_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _qdem1_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _qdem1_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qdem1_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qdem1_tags;
drop table _qdem1_modeles;
