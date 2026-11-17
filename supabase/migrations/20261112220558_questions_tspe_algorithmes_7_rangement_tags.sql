-- ============================================================================
-- Chantier « questions-tspe-demonstrations », lot 7 (algorithmes, probabilités, simulation et
-- loi binomiale) : nœud et tag des 4 modèles
-- ============================================================================
--   Quatre brouillons créés sans nœud ni tag vont chacun sur une sous-notion EXISTANTE et active,
--   celle de leur point ou une sous-notion de sa notion, et reçoivent ce seul point :
--     0671ee48 Permutations en Python : générer, tirer au hasard
--              → Dénombrement > Arrangements et permutations > permutations, TSPE-324
--     a29488bc Planche de Galton en Python
--              → Probabilités > Loi binomiale > schéma de Bernoulli, TSPE-513 (point sur la notion)
--     88d644e6 Problème de la surréservation en Python
--              → Probabilités > Loi binomiale > intervalle de fluctuation, TSPE-514
--     b107cbf1 Simuler un échantillon en Python
--              → Probabilités > Sommes et concentration > échantillons, TSPE-515
-- Aucune sous-notion neuve. question_template_points_check_rules accepte un tag dont le point est
-- sur le nœud du modèle OU sur sa notion, et au plus UN point par programme (ADR 0020).
-- Ni le contenu, ni les niveaux, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 des algorithmes validée par David le 2026-11-12 (journal
-- docs/wip/questions-tspe-demonstrations-progress.md, § 18, D2 sur Q1 à Q6), phase 0 du lot 7 le
-- même jour (§ 27, D4). Les modèles ont été créés en brouillon par David le 2026-11-12 avec
-- scripts/create-questions.ts (scripts/questions/tspe-algorithmes-7/, #2605), qui ne pose ni nœud
-- ni tag. Relevé de la prod du 2026-11-12 (MCP) : 4 brouillons au niveau {T_SPE}, sans nœud ni tag ;
-- les 4 points actifs (513 sur sa notion, 324, 514 et 515 sur la sous-notion visée) ; les 4
-- sous-notions visées actives ; aucun modèle déjà tagué sur ces points.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent. Elle est prouvée par
-- tests/integration/questions-tspe-algorithmes-7-rangement-tags.test.ts, qui fabrique des
-- copies des identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : les modèles doivent être encore SANS nœud et SANS aucun tag
-- (relevé du 2026-11-12), sinon un rangement fait depuis à la main serait écrasé. Nœuds désignés par
-- leur chemin, points par leur code, résolus STRICTEMENT ; chaque point doit être sur le nœud de son
-- modèle ou sur sa notion. Tout ou rien.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin et prof ; leurs tags, pas leur
-- contenu, lisibles par tout compte connecté, comme pour tout modèle). Question posée à David AVANT
-- le SQL (phase 0 des algorithmes, § 18 Q5), tranchée par lui le 2026-11-12 (D2) : personne. Aucune
-- règle (policy) ne change. Les élèves ne voient les modèles qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 4 tags et rend les modèles sans nœud. Garde : il
-- refuse si un modèle n'est plus sur le nœud laissé par la migration ou si leurs tags ont changé.
-- Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qta7_retour_tags;
-- drop table if exists pg_temp._qta7_retour;
-- create temporary table _qta7_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text not null, noeud uuid
-- );
-- insert into _qta7_retour values
-- 	('0671ee48-8a7a-4da3-8dd4-55c2861c8134', 'Dénombrement', 'Arrangements et permutations', 'permutations', null),
-- 	('a29488bc-0a0b-4ac8-a799-3d87f9b43d55', 'Probabilités', 'Loi binomiale', 'schéma de Bernoulli', null),
-- 	('88d644e6-24b5-4971-bcc3-f4ce17251412', 'Probabilités', 'Loi binomiale', 'intervalle de fluctuation', null),
-- 	('b107cbf1-7978-4289-b662-aca886ac7752', 'Probabilités', 'Sommes et concentration', 'échantillons', null);
-- create temporary table _qta7_retour_tags (id uuid not null, grade text not null, code text not null, primary key (id, grade));
-- insert into _qta7_retour_tags values
-- 	('0671ee48-8a7a-4da3-8dd4-55c2861c8134', 'T_SPE', 'TSPE-324'),
-- 	('a29488bc-0a0b-4ac8-a799-3d87f9b43d55', 'T_SPE', 'TSPE-513'),
-- 	('88d644e6-24b5-4971-bcc3-f4ce17251412', 'T_SPE', 'TSPE-514'),
-- 	('b107cbf1-7978-4289-b662-aca886ac7752', 'T_SPE', 'TSPE-515');
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qta7_retour order by id;
-- select 1 from public.question_templates where id in (select id from _qta7_retour) order by id for update;
-- update _qta7_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and s.name = r.sous_notion;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer; v_attendus integer;
-- begin
-- 	if exists (select 1 from _qta7_retour where noeud is null) then
-- 		raise exception 'rollback : nœud introuvable';
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _qta7_retour r on r.id = q.id;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur %, plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*) into v_attendus from _qta7_retour_tags t join public.question_templates q on q.id = t.id;
-- 	select count(*), count(*) filter (where exists (select 1 from _qta7_retour_tags t
-- 	                                                where t.id = q.template_id and t.grade = p.grade and t.code = p.code))
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _qta7_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_attendus or v_total <> v_attendus then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_attendus;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _qta7_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _qta7_retour);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _qta7_retour_tags;
-- drop table _qta7_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Les modèles et leurs tags, en tables temporaires ----------------------------------------
drop table if exists pg_temp._qta7_tags;
drop table if exists pg_temp._qta7_modeles;
create temporary table _qta7_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null
);
insert into _qta7_modeles values
	('0671ee48-8a7a-4da3-8dd4-55c2861c8134', 'Dénombrement', 'Arrangements et permutations', 'permutations'),
	('a29488bc-0a0b-4ac8-a799-3d87f9b43d55', 'Probabilités', 'Loi binomiale', 'schéma de Bernoulli'),
	('88d644e6-24b5-4971-bcc3-f4ce17251412', 'Probabilités', 'Loi binomiale', 'intervalle de fluctuation'),
	('b107cbf1-7978-4289-b662-aca886ac7752', 'Probabilités', 'Sommes et concentration', 'échantillons');
create temporary table _qta7_tags (
	id uuid not null references _qta7_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _qta7_tags values
	('0671ee48-8a7a-4da3-8dd4-55c2861c8134', 'T_SPE', 'TSPE-324'),
	('a29488bc-0a0b-4ac8-a799-3d87f9b43d55', 'T_SPE', 'TSPE-513'),
	('88d644e6-24b5-4971-bcc3-f4ce17251412', 'T_SPE', 'TSPE-514'),
	('b107cbf1-7978-4289-b662-aca886ac7752', 'T_SPE', 'TSPE-515');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et la ligne du modèle.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qta7_modeles order by id;
select 1 from public.question_templates where id in (select id from _qta7_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) : sans nœud, sans tag ---------------------------------
do $garde$
declare v_ranges integer; v_tags integer;
begin
	select count(*) into v_ranges from _qta7_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèle(s) déjà rangé(s) depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qta7_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèle(s) déjà tagué(s) depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. Résolution STRICTE du chemin et des points --------------------------------------
alter table _qta7_modeles add column noeud uuid;
alter table _qta7_modeles add column notion_id uuid;
alter table _qta7_tags add column point_id uuid;
update _qta7_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qta7_tags t set point_id = p.id
  from _qta7_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _qta7_modeles where noeud is null)
	   or exists (select 1 from _qta7_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qta7_modeles where noeud is null),
			(select count(*) from _qta7_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 4. Rangement, puis tags (le trigger des tags lit le nœud du modèle) -----------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qta7_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _qta7_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications ------------------------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qta7_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qta7_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _qta7_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _qta7_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qta7_modeles m on m.id = q.template_id;
	-- Tout ou rien : les 4 modèles (prod) ou aucun (base locale), jamais une partie.
	if v_presents not in (0, (select count(*) from _qta7_modeles)) then
		raise exception 'lot partiel : % modèle(s) présent(s) sur %', v_presents,
			(select count(*) from _qta7_modeles);
	end if;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qta7_tags;
drop table _qta7_modeles;
