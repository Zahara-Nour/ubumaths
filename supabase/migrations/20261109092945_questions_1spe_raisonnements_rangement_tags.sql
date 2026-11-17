-- ============================================================================
-- Chantier « questions-1spe-raisonnements » : nœud, tag (et niveau) des 6 modèles du lot, et
-- niveau 1re spé ajouté à 11 modèles de logique de seconde
-- ============================================================================
--   A. Six brouillons créés sans nœud ni tag vont chacun sur une sous-notion EXISTANTE et active
--      (celle de leur point, ou une sous-notion de la notion de leur point), et reçoivent ce seul
--      point :
--        ab663da7 Démontrer par contraposée
--                 → Logique > Raisonnements > par contraposée, 1SPE-205
--        6cd78094 Raisonner par disjonction des cas                       (niveaux {2, 1_SPE})
--                 → Logique > Raisonnements > disjonction de cas, 2-216
--        d9a627e4 Raisonner par l'absurde                                  (niveaux {2, 1_SPE})
--                 → Logique > Raisonnements > par l'absurde, 2-217
--        b7b0c27b Résoudre un problème d'optimisation
--                 → Fonctions > Dérivation > variations et extremums, 1SPE-284
--        6058963e Produit scalaire : résoudre un problème géométrique   (niveau 1 → 7)
--                 → Géométrie > Produit scalaire > propriétés, 1SPE-436 (point sur la notion)
--        9f4c4a19 Étudier une configuration dans un repère              (niveau 1 → 3)
--                 → Géométrie > Géométrie repérée > milieu et distance, 1SPE-437 (point sur la notion)
--   B. Onze modèles PUBLIÉS de seconde (logique : « et », « ou », implication, équivalence,
--      réciproque, contraposée, « pour tout », « il existe ») passent de {2} à {2, 1_SPE} : le BO de
--      1re spé les reprend (« Vocabulaire ensembliste et logique ») sans point propre. Leurs tags
--      (points de seconde) ne changent pas.
-- Aucune sous-notion neuve. question_template_points_check_rules accepte un tag dont le point est
-- sur le nœud du modèle OU sur sa notion, et au plus UN point par programme (ADR 0020).
-- Ni le contenu ni le statut ne changent ; `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-09 (journal docs/wip/questions-1spe-raisonnements-progress.md,
-- § 4 et § 5 ; sous-notions et niveaux de 436 et 437 tranchés le même jour). Les 6 modèles ont été
-- créés en brouillon par David le 2026-11-09 avec scripts/create-questions.ts
-- (scripts/questions/1spe-raisonnements/, #2511), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-09 (MCP) : 6 brouillons sans nœud ni tag, niveaux 1, 1, 1, 9, 1, 1 ; les 11 modèles de
-- seconde publiés, niveaux {2}, chacun tagué de son point de seconde.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles, 11 modèles). Elle est prouvée par
-- tests/integration/questions-1spe-raisonnements-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : les 6 modèles encore SANS nœud et SANS tag, et 6058963e, 9f4c4a19
-- encore au niveau 1 ; les 11 modèles de seconde encore publiés et aux niveaux {2} exactement.
-- Nœuds désignés par leur chemin, points par leur code, résolus STRICTEMENT ; chaque point doit être
-- sur le nœud de son modèle ou sur sa notion.
--
-- Données d'élèves : aucune (on range, on tague, on change des niveaux de modèles).
--
-- Accès : personne ne gagne ni ne perd d'accès. La lecture de question_templates ne regarde pas
-- `grades` (publiés : tout compte connecté et anon ; brouillons : admin et prof) ; les tags restent
-- lisibles par tout compte connecté. Ajouter 1_SPE change seulement où le modèle apparaît (niveau de
-- la 1re spé), pas qui peut le lire. Question posée à David AVANT le SQL (phase 0), tranchée par lui
-- le 2026-11-09 : personne. Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags, rend les modèles sans nœud, remet 6058963e
-- et 9f4c4a19 au niveau 1 et les 11 modèles de seconde à {2}. Garde : il refuse si un modèle n'est
-- plus sur le nœud laissé par la migration, si leurs tags ou niveaux ont changé. Bloc éprouvé par le
-- test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur
-- SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q1r_retour;
-- drop table if exists pg_temp._q1r_retour_seconde;
-- create temporary table _q1r_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text not null,
-- 	grade text not null, code text not null, niveau integer, noeud uuid
-- );
-- insert into _q1r_retour values
-- 	('ab663da7-ede6-4575-896f-4cad52753252', 'Logique', 'Raisonnements', 'par contraposée', '1_SPE', '1SPE-205', null, null),
-- 	('6cd78094-1036-4f05-9846-f57a5e51b068', 'Logique', 'Raisonnements', 'disjonction de cas', '2', '2-216', null, null),
-- 	('d9a627e4-4dbe-44aa-b668-ad70194d6d8e', 'Logique', 'Raisonnements', 'par l''absurde', '2', '2-217', null, null),
-- 	('b7b0c27b-0c30-4297-b707-53f328d36f7a', 'Fonctions', 'Dérivation', 'variations et extremums', '1_SPE', '1SPE-284', null, null),
-- 	('6058963e-3c10-4140-94a4-26f008dbe11f', 'Géométrie', 'Produit scalaire', 'propriétés', '1_SPE', '1SPE-436', 7, null),
-- 	('9f4c4a19-1408-412c-ad7b-0c31c8b0ee42', 'Géométrie', 'Géométrie repérée', 'milieu et distance', '1_SPE', '1SPE-437', 3, null);
-- create temporary table _q1r_retour_seconde (id uuid primary key);
-- insert into _q1r_retour_seconde values
-- 	('219c9470-ffe0-48a6-bebf-39fb814ad613'), ('6c3ee9e6-3c71-4ff9-943b-22691a9a92c7'),
-- 	('1e9a534f-b04c-4a1d-88fb-5aba696422e0'), ('55341e85-6782-4ccd-84a4-8b2d3ef10a80'),
-- 	('214f7500-0e36-4208-b688-44ddabde06d8'), ('75d0fc89-24b1-4edb-abf2-82b7e76f272e'),
-- 	('e05203b0-9833-4647-b6dc-39b10f2ae5be'), ('5426cead-c0c2-48d3-a10b-2e46714f9129'),
-- 	('bed58c24-6ead-4e6a-bd3e-3aaf2891ea00'), ('61d0571e-b6f3-413b-9272-3539b8a55708'),
-- 	('24fd6a10-7843-4b7c-9e7c-7a05b1696bc9');
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _q1r_retour order by id;
-- select 1 from public.question_templates
--  where id in (select id from _q1r_retour union select id from _q1r_retour_seconde) order by id for update;
-- update _q1r_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and s.name = r.sous_notion;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer; v_attendus integer;
-- 	v_seconde integer; v_seconde_intacts integer;
-- begin
-- 	if exists (select 1 from _q1r_retour where noeud is null) then
-- 		raise exception 'rollback : nœud introuvable';
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud
-- 	                                    and (r.niveau is null or q.level = r.niveau))
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _q1r_retour r on r.id = q.id;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur %, plus sur le nœud ou le niveau de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*) into v_attendus from _q1r_retour r join public.question_templates q on q.id = r.id;
-- 	select count(*), count(*) filter (where exists (select 1 from _q1r_retour r
-- 	                                                where r.id = q.template_id and r.grade = p.grade and r.code = p.code))
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _q1r_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_attendus or v_total <> v_attendus then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_attendus;
-- 	end if;
-- 	select count(*), count(*) filter (where q.grades::text[] @> array['2', '1_SPE'] and cardinality(q.grades) = 2)
-- 	  into v_seconde, v_seconde_intacts
-- 	  from public.question_templates q join _q1r_retour_seconde s on s.id = q.id;
-- 	if v_seconde_intacts <> v_seconde then
-- 		raise exception 'rollback : niveaux changés depuis la migration sur % modèle(s) de seconde', v_seconde - v_seconde_intacts;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _q1r_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q set classification_node_id = null,
--        level = case when r.niveau is null then q.level else 1 end
--   from _q1r_retour r where q.id = r.id;
-- update public.question_templates q set grades = array_remove(q.grades, '1_SPE')
--   from _q1r_retour_seconde s where q.id = s.id;
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _q1r_retour_seconde;
-- drop table _q1r_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Les modèles, en tables temporaires ----------------------------------------------------
drop table if exists pg_temp._q1r_modeles;
drop table if exists pg_temp._q1r_seconde;
create temporary table _q1r_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null,
	grade text not null,
	code text not null,
	-- Niveau numéroté à poser (null : celui écrit à la création ne change pas).
	niveau integer
);
insert into _q1r_modeles values
	('ab663da7-ede6-4575-896f-4cad52753252', 'Logique', 'Raisonnements', 'par contraposée', '1_SPE', '1SPE-205', null),
	('6cd78094-1036-4f05-9846-f57a5e51b068', 'Logique', 'Raisonnements', 'disjonction de cas', '2', '2-216', null),
	('d9a627e4-4dbe-44aa-b668-ad70194d6d8e', 'Logique', 'Raisonnements', 'par l''absurde', '2', '2-217', null),
	('b7b0c27b-0c30-4297-b707-53f328d36f7a', 'Fonctions', 'Dérivation', 'variations et extremums', '1_SPE', '1SPE-284', null),
	('6058963e-3c10-4140-94a4-26f008dbe11f', 'Géométrie', 'Produit scalaire', 'propriétés', '1_SPE', '1SPE-436', 7),
	('9f4c4a19-1408-412c-ad7b-0c31c8b0ee42', 'Géométrie', 'Géométrie repérée', 'milieu et distance', '1_SPE', '1SPE-437', 3);
create temporary table _q1r_seconde (id uuid primary key);
insert into _q1r_seconde values
	('219c9470-ffe0-48a6-bebf-39fb814ad613'), -- « Et » : vrai ou faux ? (2-210)
	('6c3ee9e6-3c71-4ff9-943b-22691a9a92c7'), -- « Et » et intervalles (2-210)
	('1e9a534f-b04c-4a1d-88fb-5aba696422e0'), -- « Ou » : vrai ou faux ? (2-408)
	('55341e85-6782-4ccd-84a4-8b2d3ef10a80'), -- « Ou » et intervalles (2-408)
	('214f7500-0e36-4208-b688-44ddabde06d8'), -- Formuler une implication (2-213)
	('75d0fc89-24b1-4edb-abf2-82b7e76f272e'), -- Implication ou équivalence ? (2-409)
	('e05203b0-9833-4647-b6dc-39b10f2ae5be'), -- Une implication est-elle vraie ? (2-410)
	('5426cead-c0c2-48d3-a10b-2e46714f9129'), -- Réciproque d'une implication (2-214)
	('bed58c24-6ead-4e6a-bd3e-3aaf2891ea00'), -- Contraposée d'une implication (2-411)
	('61d0571e-b6f3-413b-9272-3539b8a55708'), -- Propositions « pour tout » (2-215)
	('24fd6a10-7843-4b7c-9e7c-7a05b1696bc9'); -- Propositions « il existe » (2-412)

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et la ligne du modèle.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q1r_modeles order by id;
select 1 from public.question_templates
 where id in (select id from _q1r_modeles union select id from _q1r_seconde) order by id for update;

-- ---- 2. Gardes (avant toute écriture) ---------------------------------------------------------
do $garde$
declare v_ranges integer; v_tags integer; v_niveaux integer; v_seconde integer;
begin
	select count(*) into v_ranges from _q1r_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèle(s) déjà rangé(s) depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q1r_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèle(s) déjà tagué(s) depuis le relevé : % tag(s)', v_tags;
	end if;
	select count(*) into v_niveaux from _q1r_modeles r
	  join public.question_templates q on q.id = r.id
	 where r.niveau is not null and q.level <> 1;
	if v_niveaux <> 0 then
		raise exception 'niveau changé depuis le relevé : % modèle(s)', v_niveaux;
	end if;
	select count(*) into v_seconde from _q1r_seconde s
	  join public.question_templates q on q.id = s.id
	 where q.status <> 'published' or q.grades::text[] <> array['2'];
	if v_seconde <> 0 then
		raise exception 'modèle(s) de seconde changé(s) depuis le relevé (statut ou niveaux) : %', v_seconde;
	end if;
end $garde$;

-- ---- 3. Résolution STRICTE des chemins et des points ------------------------------------------
alter table _q1r_modeles add column noeud uuid;
alter table _q1r_modeles add column notion_id uuid;
alter table _q1r_modeles add column point_id uuid;
update _q1r_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q1r_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = r.grade and p.code = r.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _q1r_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q1r_modeles where noeud is null),
			(select count(*) from _q1r_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 4. Rangement et niveaux, puis tags (le trigger des tags lit le nœud du modèle), puis les
--         niveaux scolaires des modèles de seconde ------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud,
       level = coalesce(r.niveau, q.level)
  from _q1r_modeles r
 where q.id = r.id;
update public.question_templates q set grades = array_append(q.grades, '1_SPE')
  from _q1r_seconde s
 where q.id = s.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q1r_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications ------------------------------------------------------------------------
do $check$
declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
	v_seconde integer; v_seconde_ok integer;
begin
	select count(*), count(*) filter (where q.classification_node_id = r.noeud
	                                    and q.level = coalesce(r.niveau, q.level))
	  into v_presents, v_intacts
	  from _q1r_modeles r join public.question_templates q on q.id = r.id;
	select count(*), count(*) filter (where exists (select 1 from _q1r_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q1r_modeles m on m.id = q.template_id;
	select count(*), count(*) filter (where q.grades::text[] = array['2', '1_SPE'])
	  into v_seconde, v_seconde_ok
	  from _q1r_seconde s join public.question_templates q on q.id = s.id;
	-- Tout ou rien : les 6 et les 11 modèles (prod) ou aucun (base locale), jamais une partie.
	if v_presents not in (0, (select count(*) from _q1r_modeles)) then
		raise exception 'lot partiel : % modèle(s) présent(s) sur %', v_presents,
			(select count(*) from _q1r_modeles);
	end if;
	if v_seconde not in (0, (select count(*) from _q1r_seconde)) then
		raise exception 'seconde partielle : % modèle(s) présent(s) sur %', v_seconde,
			(select count(*) from _q1r_seconde);
	end if;
	if v_intacts <> v_presents or v_tags <> v_presents or v_total <> v_presents
	   or v_seconde_ok <> v_seconde then
		raise exception 'lot incohérent : nœuds et niveaux %/%, tags du lot %/%, tags en base %, seconde %/%',
			v_intacts, v_presents, v_tags, v_presents, v_total, v_seconde_ok, v_seconde;
	end if;
end $check$;

drop table _q1r_seconde;
drop table _q1r_modeles;
