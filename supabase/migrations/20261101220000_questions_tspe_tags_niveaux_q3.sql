-- ============================================================================
-- Chantier « questions-tspe », Q3 : tags, un nœud et des niveaux de 10 modèles publiés de terminale
-- ============================================================================
-- Tags (au plus un point par programme et par modèle, ADR 0020 ; le point est sur le nœud du
-- modèle ou sur sa notion, question_template_points_check_rules) :
--   - a80a780f (caractérisations de la convexité) : sans tag → TSPE-586 ;
--   - 4ff9d049 (binomiale : n et p) : + TSPE-508 (garde TCOMP-367, TTECHNO-089) ;
--   - 7a0b795c (encadrer une valeur moyenne) : + TSPE-609 (garde TCOMP-269) ;
--   - 5e702745 (x ↦ ∫ₐˣ f : variations) : + TSPE-476 (garde TCOMP-272) ;
--   - dd0ee69a (encadrer une intégrale) : TSPE-481 → TSPE-489 (majorer, minorer une intégrale) ;
--   - 624bf511 (allure des solutions de y′ = ay + b) : + TSPE-465 (garde TCOMP-249) ;
--   - f1963ef2 (seuil par le logarithme) : + TSPE-392 (recherche de seuils ; garde TCOMP-239) ;
--   - ef3c495c (relation et triangle de Pascal) : déplacé de « Dénombrement > Combinaisons >
--     coefficients binomiaux » vers « … > triangle de Pascal », TCOMP-296 → TCOMP-361 et + TSPE-316.
-- Niveaux de la catégorie Probabilités / Loi binomiale / Coefficients binomiaux (ordre D-D1) :
--   07ebdcbe 2 → 1, 4dcbae71 4 → 2, ef3c495c 1 → 4 ; 970dab52 reste à 3 (hors lot). L'échange est
--   circulaire et l'index unique idx_question_templates_unique_category porte sur les publiés :
--   passage par des niveaux provisoires (niveau visé + 1000).
-- Ni le contenu ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décisions de David : Q3 (2026-10-29) révisée le 2026-11-01 (« je suis tes recos ») après le
-- relevé des nœuds (8 tags de la Q3 d'origine refusés par la règle du nœud) ; D-D1 (2026-11-01).
-- Journal docs/wip/questions-tspe-progress.md, § 14. Laissés sans point TSPE (aucun point
-- compatible) : 9f14d672, 81ff485d, 7d3632bb, efb12f4b, 07ebdcbe.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (10 modèles). Elle est prouvée par
-- tests/integration/questions-tspe-tags-niveaux-q3.test.ts, qui fabrique des copies des
-- identifiants de la prod (nœuds, niveaux, tags relevés) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore PUBLIÉ, au nœud et au niveau relevés le 2026-11-01 (MCP),
-- et porter EXACTEMENT les tags relevés, sinon une saisie faite depuis serait écrasée ; aucun
-- modèle publié hors du lot ne doit occuper un niveau visé. Nœuds désignés par leur chemin,
-- points par leur code, résolus STRICTEMENT.
--
-- Données d'élèves (MCP, 2026-11-01) : aucune sur ces modèles (0 carte SRS, 0 tentative, 0 activité
-- de journal, 0 question d'évaluation, 0 revue).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David AVANT le SQL, tranchée par
-- lui le 2026-11-01 : personne). Aucune règle ne change. Effets visibles : les modèles comptent
-- pour leurs nouveaux points (couverture, progression, badges de capacité) ; TSPE-481 et TCOMP-296
-- n'ont plus de modèle ; ef3c495c apparaît sous « triangle de Pascal » ; ordre des trois modèles
-- dans leur catégorie.
--
-- Rollback (aucune donnée d'élève). Il rend tags, nœud et niveaux d'avant. Garde : il refuse si
-- un modèle n'est plus EXACTEMENT dans l'état posé par la migration (sinon une saisie faite depuis
-- serait écrasée en silence). Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qt3r_modeles;
-- create temporary table _qt3r_modeles (id uuid primary key, chemin text not null, chemin_retour text not null, niveau integer not null, niveau_retour integer not null);
-- insert into _qt3r_modeles values
-- 	('a80a780f-bed5-404c-b5fe-db4211437ac8', 'Fonctions > Convexité > caractérisations', 'Fonctions > Convexité > caractérisations', 1, 1),
-- 	('4ff9d049-afd9-4fd2-be40-f8e242923af4', 'Probabilités > Loi binomiale > schéma de Bernoulli', 'Probabilités > Loi binomiale > schéma de Bernoulli', 1, 1),
-- 	('7a0b795c-b802-44c2-b06c-e3631610908c', 'Intégration > Valeur moyenne', 'Intégration > Valeur moyenne', 3, 3),
-- 	('5e702745-c4ba-4d75-9188-902ac7373531', 'Intégration > Fonction intégrale > dérivée d''une fonction intégrale', 'Intégration > Fonction intégrale > dérivée d''une fonction intégrale', 3, 3),
-- 	('dd0ee69a-2203-47a3-b2b8-af70a77281d3', 'Intégration > Calcul d''intégrales > positivité et inégalités', 'Intégration > Calcul d''intégrales > positivité et inégalités', 2, 2),
-- 	('624bf511-0830-4aa7-91cc-1d016a94df2b', 'Équations différentielles > Généralités > allure des courbes', 'Équations différentielles > Généralités > allure des courbes', 2, 2),
-- 	('f1963ef2-4618-4ae7-9491-9955dacd0258', 'Suites > Modèles d''évolution > seuil', 'Suites > Modèles d''évolution > seuil', 2, 2),
-- 	('ef3c495c-632b-40ec-840d-fbbf7bfc879a', 'Dénombrement > Combinaisons > triangle de Pascal', 'Dénombrement > Combinaisons > coefficients binomiaux', 4, 1),
-- 	('07ebdcbe-dc7c-45cf-ad81-df70231719a2', 'Dénombrement > Combinaisons > coefficients binomiaux', 'Dénombrement > Combinaisons > coefficients binomiaux', 1, 2),
-- 	('4dcbae71-f935-4792-93fe-0357b18e3511', 'Dénombrement > Combinaisons > coefficients binomiaux', 'Dénombrement > Combinaisons > coefficients binomiaux', 2, 4);
-- drop table if exists pg_temp._qt3r_tags;
-- create temporary table _qt3r_tags (id uuid not null, cote text not null, grade text not null, code text not null, point uuid, primary key (id, cote, code));
-- insert into _qt3r_tags (id, cote, grade, code) values
-- 	('a80a780f-bed5-404c-b5fe-db4211437ac8', 'present', 'T_SPE', 'TSPE-586'),
-- 	('4ff9d049-afd9-4fd2-be40-f8e242923af4', 'present', 'T_COMP', 'TCOMP-367'),
-- 	('4ff9d049-afd9-4fd2-be40-f8e242923af4', 'present', 'T_TECHNO', 'TTECHNO-089'),
-- 	('4ff9d049-afd9-4fd2-be40-f8e242923af4', 'present', 'T_SPE', 'TSPE-508'),
-- 	('4ff9d049-afd9-4fd2-be40-f8e242923af4', 'retour', 'T_COMP', 'TCOMP-367'),
-- 	('4ff9d049-afd9-4fd2-be40-f8e242923af4', 'retour', 'T_TECHNO', 'TTECHNO-089'),
-- 	('7a0b795c-b802-44c2-b06c-e3631610908c', 'present', 'T_COMP', 'TCOMP-269'),
-- 	('7a0b795c-b802-44c2-b06c-e3631610908c', 'present', 'T_SPE', 'TSPE-609'),
-- 	('7a0b795c-b802-44c2-b06c-e3631610908c', 'retour', 'T_COMP', 'TCOMP-269'),
-- 	('5e702745-c4ba-4d75-9188-902ac7373531', 'present', 'T_COMP', 'TCOMP-272'),
-- 	('5e702745-c4ba-4d75-9188-902ac7373531', 'present', 'T_SPE', 'TSPE-476'),
-- 	('5e702745-c4ba-4d75-9188-902ac7373531', 'retour', 'T_COMP', 'TCOMP-272'),
-- 	('dd0ee69a-2203-47a3-b2b8-af70a77281d3', 'present', 'T_SPE', 'TSPE-489'),
-- 	('dd0ee69a-2203-47a3-b2b8-af70a77281d3', 'retour', 'T_SPE', 'TSPE-481'),
-- 	('624bf511-0830-4aa7-91cc-1d016a94df2b', 'present', 'T_COMP', 'TCOMP-249'),
-- 	('624bf511-0830-4aa7-91cc-1d016a94df2b', 'present', 'T_SPE', 'TSPE-465'),
-- 	('624bf511-0830-4aa7-91cc-1d016a94df2b', 'retour', 'T_COMP', 'TCOMP-249'),
-- 	('f1963ef2-4618-4ae7-9491-9955dacd0258', 'present', 'T_COMP', 'TCOMP-239'),
-- 	('f1963ef2-4618-4ae7-9491-9955dacd0258', 'present', 'T_SPE', 'TSPE-392'),
-- 	('f1963ef2-4618-4ae7-9491-9955dacd0258', 'retour', 'T_COMP', 'TCOMP-239'),
-- 	('ef3c495c-632b-40ec-840d-fbbf7bfc879a', 'present', 'T_COMP', 'TCOMP-361'),
-- 	('ef3c495c-632b-40ec-840d-fbbf7bfc879a', 'present', 'T_SPE', 'TSPE-316'),
-- 	('ef3c495c-632b-40ec-840d-fbbf7bfc879a', 'retour', 'T_COMP', 'TCOMP-296'),
-- 	('07ebdcbe-dc7c-45cf-ad81-df70231719a2', 'present', 'T_COMP', 'TCOMP-288'),
-- 	('07ebdcbe-dc7c-45cf-ad81-df70231719a2', 'retour', 'T_COMP', 'TCOMP-288'),
-- 	('4dcbae71-f935-4792-93fe-0357b18e3511', 'present', 'T_COMP', 'TCOMP-288'),
-- 	('4dcbae71-f935-4792-93fe-0357b18e3511', 'present', 'T_SPE', 'TSPE-314'),
-- 	('4dcbae71-f935-4792-93fe-0357b18e3511', 'retour', 'T_COMP', 'TCOMP-288'),
-- 	('4dcbae71-f935-4792-93fe-0357b18e3511', 'retour', 'T_SPE', 'TSPE-314');
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0)) from _qt3r_modeles order by id;
-- select 1 from public.question_templates where id in (select id from _qt3r_modeles) order by id for update;
-- do $rollback$
-- declare v_presents integer; v_conformes integer; v_total integer; v_present integer; v_attendus integer;
-- begin
-- 	select count(*) into v_presents from _qt3r_modeles r join public.question_templates q on q.id = r.id;
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 10 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 10', v_presents;
-- 	end if;
-- 	update _qt3r_tags t set point = p.id from public.curriculum_points p
-- 	 where p.grade = t.grade and p.code = t.code and p.archived_at is null;
-- 	if exists (select 1 from _qt3r_tags where point is null) then
-- 		raise exception 'rollback : points introuvables : %', (select count(*) from _qt3r_tags where point is null);
-- 	end if;
-- 	select count(*) into v_conformes from _qt3r_modeles r
-- 	  join public.question_templates q on q.id = r.id
-- 	  join lateral (with recursive c(id, parent_id, chemin) as (
-- 	         select n.id, n.parent_id, n.name::text from public.classification_nodes n where n.id = q.classification_node_id
-- 	         union all select c.id, n.parent_id, n.name || ' > ' || c.chemin from c join public.classification_nodes n on n.id = c.parent_id)
-- 	       select chemin from c where parent_id is null) ch on true
-- 	 where q.status = 'published' and q.level = r.niveau and ch.chemin = r.chemin;
-- 	if v_conformes <> 10 then
-- 		raise exception 'rollback : modèles changés depuis la migration (% sur 10 conformes)', v_conformes;
-- 	end if;
-- 	select count(*), count(*) filter (where exists (select 1 from _qt3r_tags t
-- 	                                               where t.cote = 'present' and t.id = q.template_id and t.point = q.point_id))
-- 	  into v_total, v_present
-- 	  from public.question_template_points q join _qt3r_modeles r on r.id = q.template_id;
-- 	select count(*) into v_attendus from _qt3r_tags where cote = 'present';
-- 	if v_total <> v_attendus or v_present <> v_attendus then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_present, v_total, v_attendus;
-- 	end if;
-- 	delete from public.question_template_points q using _qt3r_modeles r where q.template_id = r.id;
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates q set classification_node_id = (
-- 	         select n3.id from public.classification_nodes n1
-- 	           join public.classification_nodes n2 on n2.parent_id = n1.id
-- 	           join public.classification_nodes n3 on n3.parent_id = n2.id
-- 	          where n1.parent_id is null and n1.name || ' > ' || n2.name || ' > ' || n3.name = r.chemin_retour)
-- 	  from _qt3r_modeles r where q.id = r.id and r.chemin <> r.chemin_retour;
-- 	update public.question_templates q set level = r.niveau_retour + 1000
-- 	  from _qt3r_modeles r where q.id = r.id and r.niveau <> r.niveau_retour;
-- 	update public.question_templates q set level = r.niveau_retour
-- 	  from _qt3r_modeles r where q.id = r.id and r.niveau <> r.niveau_retour;
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- 	insert into public.question_template_points (template_id, point_id)
-- 	select id, point from _qt3r_tags where cote = 'retour';
-- end $rollback$;
-- drop table _qt3r_tags;
-- drop table _qt3r_modeles;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ------------------------------------------------
drop table if exists pg_temp._qt3_modeles;
create temporary table _qt3_modeles (
	id uuid primary key,
	chemin_avant text not null,
	chemin_apres text not null,
	niveau_avant integer not null,
	niveau_apres integer not null
);
insert into _qt3_modeles values
	('a80a780f-bed5-404c-b5fe-db4211437ac8', 'Fonctions > Convexité > caractérisations', 'Fonctions > Convexité > caractérisations', 1, 1),
	('4ff9d049-afd9-4fd2-be40-f8e242923af4', 'Probabilités > Loi binomiale > schéma de Bernoulli', 'Probabilités > Loi binomiale > schéma de Bernoulli', 1, 1),
	('7a0b795c-b802-44c2-b06c-e3631610908c', 'Intégration > Valeur moyenne', 'Intégration > Valeur moyenne', 3, 3),
	('5e702745-c4ba-4d75-9188-902ac7373531', 'Intégration > Fonction intégrale > dérivée d''une fonction intégrale', 'Intégration > Fonction intégrale > dérivée d''une fonction intégrale', 3, 3),
	('dd0ee69a-2203-47a3-b2b8-af70a77281d3', 'Intégration > Calcul d''intégrales > positivité et inégalités', 'Intégration > Calcul d''intégrales > positivité et inégalités', 2, 2),
	('624bf511-0830-4aa7-91cc-1d016a94df2b', 'Équations différentielles > Généralités > allure des courbes', 'Équations différentielles > Généralités > allure des courbes', 2, 2),
	('f1963ef2-4618-4ae7-9491-9955dacd0258', 'Suites > Modèles d''évolution > seuil', 'Suites > Modèles d''évolution > seuil', 2, 2),
	('ef3c495c-632b-40ec-840d-fbbf7bfc879a', 'Dénombrement > Combinaisons > coefficients binomiaux', 'Dénombrement > Combinaisons > triangle de Pascal', 1, 4),
	('07ebdcbe-dc7c-45cf-ad81-df70231719a2', 'Dénombrement > Combinaisons > coefficients binomiaux', 'Dénombrement > Combinaisons > coefficients binomiaux', 2, 1),
	('4dcbae71-f935-4792-93fe-0357b18e3511', 'Dénombrement > Combinaisons > coefficients binomiaux', 'Dénombrement > Combinaisons > coefficients binomiaux', 4, 2);

-- Tags relevés (cote « avant ») et tags visés (cote « apres »), un par ligne.
drop table if exists pg_temp._qt3_tags;
create temporary table _qt3_tags (
	id uuid not null,
	cote text not null check (cote in ('avant', 'apres')),
	grade text not null,
	code text not null,
	primary key (id, cote, code)
);
insert into _qt3_tags values
	('a80a780f-bed5-404c-b5fe-db4211437ac8', 'apres', 'T_SPE', 'TSPE-586'),
	('4ff9d049-afd9-4fd2-be40-f8e242923af4', 'avant', 'T_COMP', 'TCOMP-367'),
	('4ff9d049-afd9-4fd2-be40-f8e242923af4', 'avant', 'T_TECHNO', 'TTECHNO-089'),
	('4ff9d049-afd9-4fd2-be40-f8e242923af4', 'apres', 'T_COMP', 'TCOMP-367'),
	('4ff9d049-afd9-4fd2-be40-f8e242923af4', 'apres', 'T_TECHNO', 'TTECHNO-089'),
	('4ff9d049-afd9-4fd2-be40-f8e242923af4', 'apres', 'T_SPE', 'TSPE-508'),
	('7a0b795c-b802-44c2-b06c-e3631610908c', 'avant', 'T_COMP', 'TCOMP-269'),
	('7a0b795c-b802-44c2-b06c-e3631610908c', 'apres', 'T_COMP', 'TCOMP-269'),
	('7a0b795c-b802-44c2-b06c-e3631610908c', 'apres', 'T_SPE', 'TSPE-609'),
	('5e702745-c4ba-4d75-9188-902ac7373531', 'avant', 'T_COMP', 'TCOMP-272'),
	('5e702745-c4ba-4d75-9188-902ac7373531', 'apres', 'T_COMP', 'TCOMP-272'),
	('5e702745-c4ba-4d75-9188-902ac7373531', 'apres', 'T_SPE', 'TSPE-476'),
	('dd0ee69a-2203-47a3-b2b8-af70a77281d3', 'avant', 'T_SPE', 'TSPE-481'),
	('dd0ee69a-2203-47a3-b2b8-af70a77281d3', 'apres', 'T_SPE', 'TSPE-489'),
	('624bf511-0830-4aa7-91cc-1d016a94df2b', 'avant', 'T_COMP', 'TCOMP-249'),
	('624bf511-0830-4aa7-91cc-1d016a94df2b', 'apres', 'T_COMP', 'TCOMP-249'),
	('624bf511-0830-4aa7-91cc-1d016a94df2b', 'apres', 'T_SPE', 'TSPE-465'),
	('f1963ef2-4618-4ae7-9491-9955dacd0258', 'avant', 'T_COMP', 'TCOMP-239'),
	('f1963ef2-4618-4ae7-9491-9955dacd0258', 'apres', 'T_COMP', 'TCOMP-239'),
	('f1963ef2-4618-4ae7-9491-9955dacd0258', 'apres', 'T_SPE', 'TSPE-392'),
	('ef3c495c-632b-40ec-840d-fbbf7bfc879a', 'avant', 'T_COMP', 'TCOMP-296'),
	('ef3c495c-632b-40ec-840d-fbbf7bfc879a', 'apres', 'T_COMP', 'TCOMP-361'),
	('ef3c495c-632b-40ec-840d-fbbf7bfc879a', 'apres', 'T_SPE', 'TSPE-316'),
	('07ebdcbe-dc7c-45cf-ad81-df70231719a2', 'avant', 'T_COMP', 'TCOMP-288'),
	('07ebdcbe-dc7c-45cf-ad81-df70231719a2', 'apres', 'T_COMP', 'TCOMP-288'),
	('4dcbae71-f935-4792-93fe-0357b18e3511', 'avant', 'T_COMP', 'TCOMP-288'),
	('4dcbae71-f935-4792-93fe-0357b18e3511', 'avant', 'T_SPE', 'TSPE-314'),
	('4dcbae71-f935-4792-93fe-0357b18e3511', 'apres', 'T_COMP', 'TCOMP-288'),
	('4dcbae71-f935-4792-93fe-0357b18e3511', 'apres', 'T_SPE', 'TSPE-314');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qt3_modeles order by id;
select 1 from public.question_templates where id in (select id from _qt3_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Chemin complet de chaque nœud non archivé (ancêtres non archivés compris).
drop table if exists pg_temp._qt3_chemins;
create temporary table _qt3_chemins as
with recursive c(id, chemin) as (
	select n.id, n.name::text from public.classification_nodes n
	 where n.parent_id is null and n.archived_at is null
	union all
	select n.id, c.chemin || ' > ' || n.name
	  from public.classification_nodes n join c on n.parent_id = c.id
	 where n.archived_at is null
)
select id, chemin from c;

alter table _qt3_modeles add column noeud_avant uuid, add column noeud_apres uuid;
update _qt3_modeles r set noeud_avant = (select c.id from _qt3_chemins c where c.chemin = r.chemin_avant)
 where (select count(*) from _qt3_chemins c where c.chemin = r.chemin_avant) = 1;
update _qt3_modeles r set noeud_apres = (select c.id from _qt3_chemins c where c.chemin = r.chemin_apres)
 where (select count(*) from _qt3_chemins c where c.chemin = r.chemin_apres) = 1;

alter table _qt3_tags add column point uuid;
update _qt3_tags t set point = p.id
  from public.curriculum_points p
 where p.grade = t.grade and p.code = t.code and p.archived_at is null;

-- ---- 3. Gardes : présence TOUT ou RIEN, statut, nœud, niveau et tags du relevé ------------
do $garde$
declare v_presents integer; v_conformes integer; v_total integer; v_releve integer; v_attendus integer;
        v_pris integer;
begin
	select count(*) into v_presents from _qt3_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 10 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 10', v_presents;
	end if;
	if exists (select 1 from _qt3_modeles where noeud_avant is null or noeud_apres is null) then
		raise exception 'chemins introuvables ou ambigus : % modèle(s)',
			(select count(*) from _qt3_modeles where noeud_avant is null or noeud_apres is null);
	end if;
	if exists (select 1 from _qt3_tags where point is null) then
		raise exception 'points introuvables : %', (select count(*) from _qt3_tags where point is null);
	end if;
	select count(*) into v_conformes from _qt3_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status = 'published' and q.classification_node_id = r.noeud_avant and q.level = r.niveau_avant;
	if v_conformes <> 10 then
		raise exception 'modèles changés depuis le relevé (statut, nœud ou niveau) : % sur 10 conformes', v_conformes;
	end if;
	select count(*), count(*) filter (where exists (select 1 from _qt3_tags t
	                                               where t.cote = 'avant' and t.id = q.template_id and t.point = q.point_id))
	  into v_total, v_releve
	  from public.question_template_points q
	  join _qt3_modeles r on r.id = q.template_id;
	select count(*) into v_attendus from _qt3_tags where cote = 'avant';
	if v_total <> v_attendus or v_releve <> v_attendus then
		raise exception 'tags différents du relevé : % tag(s) dont % du relevé, attendus %', v_total, v_releve, v_attendus;
	end if;
	-- Niveau visé occupé par un modèle publié HORS du lot, dans la catégorie du modèle.
	select count(*) into v_pris from _qt3_modeles r
	  join public.question_templates q on q.id = r.id
	  join public.question_templates o
	    on o.theme = q.theme and o.domain = q.domain and coalesce(o.subdomain, '') = coalesce(q.subdomain, '')
	   and o.level = r.niveau_apres and o.status = 'published'
	   and o.id not in (select id from _qt3_modeles)
	 where r.niveau_apres <> r.niveau_avant;
	if v_pris <> 0 then
		raise exception 'niveau visé déjà pris par un modèle publié hors du lot : %', v_pris;
	end if;
end $garde$;

-- ---- 4. Tags retirés, déplacement, niveaux, tags posés ----------------------------------
-- Les tags retirés d'abord : le déplacement de ef3c495c est refusé tant qu'il porte un point de
-- son ancien nœud (question_templates_guard_point_tags).
delete from public.question_template_points q
 using _qt3_tags t
 where t.cote = 'avant' and q.template_id = t.id and q.point_id = t.point
   and not exists (select 1 from _qt3_tags a where a.cote = 'apres' and a.id = t.id and a.point = t.point);

alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud_apres
  from _qt3_modeles r
 where q.id = r.id and r.noeud_apres <> r.noeud_avant;
-- Échange circulaire sous l'index unique des publiés : niveaux provisoires, puis définitifs.
update public.question_templates q set level = r.niveau_apres + 1000
  from _qt3_modeles r
 where q.id = r.id and r.niveau_apres <> r.niveau_avant;
update public.question_templates q set level = r.niveau_apres
  from _qt3_modeles r
 where q.id = r.id and r.niveau_apres <> r.niveau_avant;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point
  from _qt3_tags t
  join public.question_templates q on q.id = t.id
 where t.cote = 'apres'
   and not exists (select 1 from _qt3_tags a where a.cote = 'avant' and a.id = t.id and a.point = t.point);

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_conformes integer; v_total integer; v_tags integer; v_attendus integer;
begin
	select count(*) into v_presents from _qt3_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	select count(*) into v_conformes from _qt3_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status = 'published' and q.classification_node_id = r.noeud_apres and q.level = r.niveau_apres;
	select count(*), count(*) filter (where exists (select 1 from _qt3_tags t
	                                               where t.cote = 'apres' and t.id = q.template_id and t.point = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qt3_modeles r on r.id = q.template_id;
	select count(*) into v_attendus from _qt3_tags where cote = 'apres';
	if v_conformes <> 10 or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : modèles conformes %/10, tags du lot %/%, tags en base %',
			v_conformes, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qt3_chemins;
drop table _qt3_tags;
drop table _qt3_modeles;
