-- ============================================================================
-- Chantier « questions-1gen » : points 1GEN et niveau 1_GEN de 19 modèles
-- ============================================================================
--   A. 11 modèles reçoivent un point de 1re générale ET le niveau 1_GEN :
--      103cf8d9 → 1GEN-048, 21f42c7f → 1GEN-009, 42bb2d66 → 1GEN-011, 70e682f9 → 1GEN-017,
--      c90fa022 (brouillon) → 1GEN-017, aab8e41c → 1GEN-023, afe51ac4 → 1GEN-055,
--      bd27e002 → 1GEN-018, d2067413 (brouillon) → 1GEN-031, d8c9cb60 → 1GEN-010,
--      f2ed0ea0 → 1GEN-010 ;
--   B. 5397c20f reçoit 1GEN-062 (1_GEN déjà dans ses niveaux) ;
--   C. 6 modèles perdent le niveau 1_GEN, sans aucun tag touché : 9852d62c, 7f82d15a, 95ee57c8,
--      0f673c27, 1c86d122, f5585668 ;
--   D. 1acb6d47 perd le tag 1GEN-022 et le niveau 1_GEN (garde 1SPE-402 et 1TECHNO-057).
-- Un seul point 1GEN par modèle (ADR 0020) ; chaque point posé est sur le nœud du modèle ou sur
-- sa notion (question_template_points_check_rules), exigé dès la résolution. Les tags des autres
-- programmes ne bougent pas.
-- Niveaux : JAMAIS d'affectation complète (les chantiers questions-1techno et questions-ttechno
-- touchent les mêmes modèles) : ajout par array_append(grades, '1_GEN') seulement si 1_GEN est
-- absent, retrait par array_remove(grades, '1_GEN'). Ni le contenu, ni le nœud, ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ (trigger de date désactivé le temps des deux mises à jour,
-- dans la transaction de la migration).
-- ============================================================================
-- Décision de David le 2026-11-17 (journal docs/wip/questions-1gen-progress.md § 5 à 7).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (19 modèles). Elle est prouvée par
-- tests/integration/questions-1gen-tags.test.ts, qui fabrique des copies des identifiants de la
-- prod (nœud, niveaux, statut et tags relevés) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore au nœud relevé le 2026-11-17 (MCP) et porter EXACTEMENT
-- les tags relevés, tous programmes confondus, sinon une saisie faite depuis serait écrasée ou
-- contredite. Nœuds désignés par leur chemin complet, points par leur code, résolus STRICTEMENT.
-- Vérification finale : A et B portent 1_GEN, C et D ne le portent plus.
--
-- Données d'élèves (MCP, 2026-11-17) : aucune sur ces 19 modèles (0 skill_attempts, 0 srs_cards,
-- 0 journal_entry_activities, 0 evaluation_attempt_questions, 0 question_template_reviews).
--
-- Accès (question posée à David AVANT le SQL, validée le 2026-11-17) : les élèves et les profs en
-- 1re générale voient 11 modèles de plus (A) ; ils ne voient plus les 6 modèles de C ni 1acb6d47
-- (D), qui restent visibles depuis leurs autres niveaux (1_SPE, 1_TECHNO). Aucune règle ne change.
-- Effets visibles : les modèles comptent pour leurs points 1GEN (couverture, progression, badges
-- de capacité) ; 1GEN-022 perd 1acb6d47.
--
-- Rollback (aucune donnée d'élève), inverse exact : il retire les 12 tags 1GEN posés, repose
-- 1GEN-022 sur 1acb6d47, retire 1_GEN des niveaux de A (array_remove) et le rajoute à C et D
-- (array_append, seulement s'il est absent ; 1_GEN revient en fin de tableau). Garde : il refuse
-- si les tags des modèles ne sont plus EXACTEMENT ceux de la migration (sinon une saisie faite
-- depuis serait écrasée en silence). Bloc éprouvé par le test d'intégration, à jouer dans UNE
-- transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q1gr_modeles;
-- create temporary table _q1gr_modeles (id uuid primary key, lettre text not null);
-- insert into _q1gr_modeles values
-- 	('103cf8d9-a014-44d0-a4a0-08d94749a60e', 'A'), ('21f42c7f-82bc-4204-b294-cb9658bcfd8e', 'A'),
-- 	('42bb2d66-4559-4a1b-8124-de6977fbb0b1', 'A'), ('70e682f9-9f54-495b-8943-69c8597a5c32', 'A'),
-- 	('c90fa022-9493-4812-adb7-c785babee9d4', 'A'), ('aab8e41c-4539-4c90-9c1d-6ee41dc7a1cb', 'A'),
-- 	('afe51ac4-8552-454e-b45e-46f0edbd9416', 'A'), ('bd27e002-ca19-444e-948b-f8ed4fc8bbb5', 'A'),
-- 	('d2067413-da43-42bb-a24c-642d2a3cc5e8', 'A'), ('d8c9cb60-e9c5-4f38-a8d9-b5c2b83de908', 'A'),
-- 	('f2ed0ea0-e285-49fc-93df-9e388cc36eb0', 'A'), ('5397c20f-7b3a-4d56-b441-644607e0138a', 'B'),
-- 	('9852d62c-4109-4155-aa56-afef8c72d923', 'C'), ('7f82d15a-1c46-4bd5-81bc-a9f5e21048ed', 'C'),
-- 	('95ee57c8-4e16-4554-add5-cb8f72ee6f28', 'C'), ('0f673c27-9814-445f-9643-97c5fab9ce5b', 'C'),
-- 	('1c86d122-92f8-4bee-a566-b023ffb79dda', 'C'), ('f5585668-2ec1-45d1-a279-d82f45903926', 'C'),
-- 	('1acb6d47-5d88-4ccf-830f-98dc57d0022c', 'D');
-- drop table if exists pg_temp._q1gr_tags;
-- create temporary table _q1gr_tags (id uuid not null, cote text not null, grade text not null, code text not null, point uuid, primary key (id, cote, code));
-- insert into _q1gr_tags (id, cote, grade, code) values
-- 	('103cf8d9-a014-44d0-a4a0-08d94749a60e', 'garde', '1_SPE', '1SPE-230'),
-- 	('103cf8d9-a014-44d0-a4a0-08d94749a60e', 'pose', '1_GEN', '1GEN-048'),
-- 	('21f42c7f-82bc-4204-b294-cb9658bcfd8e', 'garde', '1_SPE', '1SPE-336'),
-- 	('21f42c7f-82bc-4204-b294-cb9658bcfd8e', 'pose', '1_GEN', '1GEN-009'),
-- 	('42bb2d66-4559-4a1b-8124-de6977fbb0b1', 'garde', '1_SPE', '1SPE-343'),
-- 	('42bb2d66-4559-4a1b-8124-de6977fbb0b1', 'pose', '1_GEN', '1GEN-011'),
-- 	('70e682f9-9f54-495b-8943-69c8597a5c32', 'garde', '1_SPE', '1SPE-230'),
-- 	('70e682f9-9f54-495b-8943-69c8597a5c32', 'pose', '1_GEN', '1GEN-017'),
-- 	('c90fa022-9493-4812-adb7-c785babee9d4', 'garde', '1_TECHNO', '1TECHNO-042'),
-- 	('c90fa022-9493-4812-adb7-c785babee9d4', 'pose', '1_GEN', '1GEN-017'),
-- 	('aab8e41c-4539-4c90-9c1d-6ee41dc7a1cb', 'garde', '1_SPE', '1SPE-252'),
-- 	('aab8e41c-4539-4c90-9c1d-6ee41dc7a1cb', 'pose', '1_GEN', '1GEN-023'),
-- 	('afe51ac4-8552-454e-b45e-46f0edbd9416', 'garde', '1_SPE', '1SPE-251'),
-- 	('afe51ac4-8552-454e-b45e-46f0edbd9416', 'pose', '1_GEN', '1GEN-055'),
-- 	('bd27e002-ca19-444e-948b-f8ed4fc8bbb5', 'garde', '1_SPE', '1SPE-372'),
-- 	('bd27e002-ca19-444e-948b-f8ed4fc8bbb5', 'pose', '1_GEN', '1GEN-018'),
-- 	('d2067413-da43-42bb-a24c-642d2a3cc5e8', 'garde', '1_TECHNO', '1TECHNO-045'),
-- 	('d2067413-da43-42bb-a24c-642d2a3cc5e8', 'pose', '1_GEN', '1GEN-031'),
-- 	('d8c9cb60-e9c5-4f38-a8d9-b5c2b83de908', 'garde', '1_SPE', '1SPE-426'),
-- 	('d8c9cb60-e9c5-4f38-a8d9-b5c2b83de908', 'pose', '1_GEN', '1GEN-010'),
-- 	('f2ed0ea0-e285-49fc-93df-9e388cc36eb0', 'garde', '1_SPE', '1SPE-339'),
-- 	('f2ed0ea0-e285-49fc-93df-9e388cc36eb0', 'pose', '1_GEN', '1GEN-010'),
-- 	('5397c20f-7b3a-4d56-b441-644607e0138a', 'garde', '1_SPE', '1SPE-432'),
-- 	('5397c20f-7b3a-4d56-b441-644607e0138a', 'pose', '1_GEN', '1GEN-062'),
-- 	('9852d62c-4109-4155-aa56-afef8c72d923', 'garde', '5', '5-113'),
-- 	('7f82d15a-1c46-4bd5-81bc-a9f5e21048ed', 'garde', '2', '2-349'),
-- 	('95ee57c8-4e16-4554-add5-cb8f72ee6f28', 'garde', '2', '2-448'),
-- 	('0f673c27-9814-445f-9643-97c5fab9ce5b', 'garde', '2', '2-328'),
-- 	('1c86d122-92f8-4bee-a566-b023ffb79dda', 'garde', '5', '5-135'),
-- 	('f5585668-2ec1-45d1-a279-d82f45903926', 'garde', '2', '2-314'),
-- 	('1acb6d47-5d88-4ccf-830f-98dc57d0022c', 'garde', '1_SPE', '1SPE-402'),
-- 	('1acb6d47-5d88-4ccf-830f-98dc57d0022c', 'garde', '1_TECHNO', '1TECHNO-057'),
-- 	('1acb6d47-5d88-4ccf-830f-98dc57d0022c', 'retour', '1_GEN', '1GEN-022');
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0)) from _q1gr_modeles order by id;
-- select 1 from public.question_templates where id in (select id from _q1gr_modeles) order by id for update;
-- do $rollback$
-- declare v_presents integer; v_total integer; v_present integer; v_attendus integer;
-- begin
-- 	select count(*) into v_presents from _q1gr_modeles r join public.question_templates q on q.id = r.id;
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 19 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 19', v_presents;
-- 	end if;
-- 	update _q1gr_tags t set point = p.id from public.curriculum_points p
-- 	 where p.grade = t.grade and p.code = t.code and p.archived_at is null;
-- 	if exists (select 1 from _q1gr_tags where point is null) then
-- 		raise exception 'rollback : points introuvables : %', (select count(*) from _q1gr_tags where point is null);
-- 	end if;
-- 	select count(*), count(*) filter (where exists (select 1 from _q1gr_tags t
-- 	                                               where t.cote in ('garde', 'pose') and t.id = q.template_id and t.point = q.point_id))
-- 	  into v_total, v_present
-- 	  from public.question_template_points q join _q1gr_modeles r on r.id = q.template_id;
-- 	select count(*) into v_attendus from _q1gr_tags where cote in ('garde', 'pose');
-- 	if v_total <> v_attendus or v_present <> v_attendus then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_present, v_total, v_attendus;
-- 	end if;
-- 	delete from public.question_template_points q using _q1gr_tags t
-- 	 where t.cote = 'pose' and q.template_id = t.id and q.point_id = t.point;
-- 	insert into public.question_template_points (template_id, point_id)
-- 	select id, point from _q1gr_tags where cote = 'retour';
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates q set grades = array_remove(q.grades, '1_GEN')
-- 	  from _q1gr_modeles r where q.id = r.id and r.lettre = 'A' and '1_GEN' = any(q.grades);
-- 	update public.question_templates q set grades = array_append(q.grades, '1_GEN')
-- 	  from _q1gr_modeles r where q.id = r.id and r.lettre in ('C', 'D') and not ('1_GEN' = any(q.grades));
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- end $rollback$;
-- drop table _q1gr_tags;
-- drop table _q1gr_modeles;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ------------------------------------------------
-- lettre : A (point 1GEN posé, 1_GEN ajouté), B (point 1GEN posé, 1_GEN déjà là),
-- C (1_GEN retiré), D (1GEN-022 et 1_GEN retirés).
drop table if exists pg_temp._q1g_modeles;
create temporary table _q1g_modeles (
	id uuid primary key,
	lettre text not null check (lettre in ('A', 'B', 'C', 'D')),
	chemin text not null
);
insert into _q1g_modeles values
	('103cf8d9-a014-44d0-a4a0-08d94749a60e', 'A', 'Suites > Modèles d''évolution'),
	('21f42c7f-82bc-4204-b294-cb9658bcfd8e', 'A', 'Probabilités > Probabilités conditionnelles > indépendance'),
	('42bb2d66-4559-4a1b-8124-de6977fbb0b1', 'A', 'Probabilités > Probabilités conditionnelles > épreuves indépendantes successives'),
	('70e682f9-9f54-495b-8943-69c8597a5c32', 'A', 'Suites > Modèles d''évolution'),
	('c90fa022-9493-4812-adb7-c785babee9d4', 'A', 'Suites > Modèles d''évolution'),
	('aab8e41c-4539-4c90-9c1d-6ee41dc7a1cb', 'A', 'Fonctions > Second degré > racines'),
	('afe51ac4-8552-454e-b45e-46f0edbd9416', 'A', 'Fonctions > Second degré > signe'),
	('bd27e002-ca19-444e-948b-f8ed4fc8bbb5', 'A', 'Suites > Suites arithmétiques'),
	('d2067413-da43-42bb-a24c-642d2a3cc5e8', 'A', 'Suites > Généralités sur les suites > représentation graphique'),
	('d8c9cb60-e9c5-4f38-a8d9-b5c2b83de908', 'A', 'Probabilités > Probabilités conditionnelles > épreuves indépendantes successives'),
	('f2ed0ea0-e285-49fc-93df-9e388cc36eb0', 'A', 'Probabilités > Probabilités conditionnelles > épreuves indépendantes successives'),
	('5397c20f-7b3a-4d56-b441-644607e0138a', 'B', 'Fonctions > Généralités sur les fonctions > signe'),
	('9852d62c-4109-4155-aa56-afef8c72d923', 'C', 'Statistiques > Représenter des données > diagrammes circulaires'),
	('7f82d15a-1c46-4bd5-81bc-a9f5e21048ed', 'C', 'Fonctions > Généralités sur les fonctions > variations'),
	('95ee57c8-4e16-4554-add5-cb8f72ee6f28', 'C', 'Fonctions > Généralités sur les fonctions > équations et inéquations f(x) = k'),
	('0f673c27-9814-445f-9643-97c5fab9ce5b', 'C', 'Fonctions > Fonctions affines > variations et signe'),
	('1c86d122-92f8-4bee-a566-b023ffb79dda', 'C', 'Statistiques > Représenter des données > courbes et repères'),
	('f5585668-2ec1-45d1-a279-d82f45903926', 'C', 'Géométrie > Géométrie repérée > équations de droites'),
	('1acb6d47-5d88-4ccf-830f-98dc57d0022c', 'D', 'Fonctions > Second degré > parabole');

-- Tags, un par ligne : « garde » (relevé et conservé), « pose » (posé par la migration),
-- « retire » (relevé et retiré). Relevé = garde + retire ; visé = garde + pose.
drop table if exists pg_temp._q1g_tags;
create temporary table _q1g_tags (
	id uuid not null references _q1g_modeles (id),
	cote text not null check (cote in ('garde', 'pose', 'retire')),
	grade text not null,
	code text not null,
	primary key (id, cote, code)
);
insert into _q1g_tags values
	('103cf8d9-a014-44d0-a4a0-08d94749a60e', 'garde', '1_SPE', '1SPE-230'),
	('103cf8d9-a014-44d0-a4a0-08d94749a60e', 'pose', '1_GEN', '1GEN-048'),
	('21f42c7f-82bc-4204-b294-cb9658bcfd8e', 'garde', '1_SPE', '1SPE-336'),
	('21f42c7f-82bc-4204-b294-cb9658bcfd8e', 'pose', '1_GEN', '1GEN-009'),
	('42bb2d66-4559-4a1b-8124-de6977fbb0b1', 'garde', '1_SPE', '1SPE-343'),
	('42bb2d66-4559-4a1b-8124-de6977fbb0b1', 'pose', '1_GEN', '1GEN-011'),
	('70e682f9-9f54-495b-8943-69c8597a5c32', 'garde', '1_SPE', '1SPE-230'),
	('70e682f9-9f54-495b-8943-69c8597a5c32', 'pose', '1_GEN', '1GEN-017'),
	('c90fa022-9493-4812-adb7-c785babee9d4', 'garde', '1_TECHNO', '1TECHNO-042'),
	('c90fa022-9493-4812-adb7-c785babee9d4', 'pose', '1_GEN', '1GEN-017'),
	('aab8e41c-4539-4c90-9c1d-6ee41dc7a1cb', 'garde', '1_SPE', '1SPE-252'),
	('aab8e41c-4539-4c90-9c1d-6ee41dc7a1cb', 'pose', '1_GEN', '1GEN-023'),
	('afe51ac4-8552-454e-b45e-46f0edbd9416', 'garde', '1_SPE', '1SPE-251'),
	('afe51ac4-8552-454e-b45e-46f0edbd9416', 'pose', '1_GEN', '1GEN-055'),
	('bd27e002-ca19-444e-948b-f8ed4fc8bbb5', 'garde', '1_SPE', '1SPE-372'),
	('bd27e002-ca19-444e-948b-f8ed4fc8bbb5', 'pose', '1_GEN', '1GEN-018'),
	('d2067413-da43-42bb-a24c-642d2a3cc5e8', 'garde', '1_TECHNO', '1TECHNO-045'),
	('d2067413-da43-42bb-a24c-642d2a3cc5e8', 'pose', '1_GEN', '1GEN-031'),
	('d8c9cb60-e9c5-4f38-a8d9-b5c2b83de908', 'garde', '1_SPE', '1SPE-426'),
	('d8c9cb60-e9c5-4f38-a8d9-b5c2b83de908', 'pose', '1_GEN', '1GEN-010'),
	('f2ed0ea0-e285-49fc-93df-9e388cc36eb0', 'garde', '1_SPE', '1SPE-339'),
	('f2ed0ea0-e285-49fc-93df-9e388cc36eb0', 'pose', '1_GEN', '1GEN-010'),
	('5397c20f-7b3a-4d56-b441-644607e0138a', 'garde', '1_SPE', '1SPE-432'),
	('5397c20f-7b3a-4d56-b441-644607e0138a', 'pose', '1_GEN', '1GEN-062'),
	('9852d62c-4109-4155-aa56-afef8c72d923', 'garde', '5', '5-113'),
	('7f82d15a-1c46-4bd5-81bc-a9f5e21048ed', 'garde', '2', '2-349'),
	('95ee57c8-4e16-4554-add5-cb8f72ee6f28', 'garde', '2', '2-448'),
	('0f673c27-9814-445f-9643-97c5fab9ce5b', 'garde', '2', '2-328'),
	('1c86d122-92f8-4bee-a566-b023ffb79dda', 'garde', '5', '5-135'),
	('f5585668-2ec1-45d1-a279-d82f45903926', 'garde', '2', '2-314'),
	('1acb6d47-5d88-4ccf-830f-98dc57d0022c', 'garde', '1_SPE', '1SPE-402'),
	('1acb6d47-5d88-4ccf-830f-98dc57d0022c', 'garde', '1_TECHNO', '1TECHNO-057'),
	('1acb6d47-5d88-4ccf-830f-98dc57d0022c', 'retire', '1_GEN', '1GEN-022');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q1g_modeles order by id;
select 1 from public.question_templates where id in (select id from _q1g_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Chemin complet de chaque nœud non archivé (ancêtres non archivés compris), et sa notion (le
-- nœud lui-même pour une notion, son parent pour une sous-notion).
drop table if exists pg_temp._q1g_chemins;
create temporary table _q1g_chemins as
with recursive c(id, chemin, notion) as (
	select n.id, n.name::text, null::uuid from public.classification_nodes n
	 where n.parent_id is null and n.archived_at is null
	union all
	select n.id, c.chemin || ' > ' || n.name,
	       case when n.kind = 'notion' then n.id when n.kind = 'subnotion' then n.parent_id end
	  from public.classification_nodes n join c on n.parent_id = c.id
	 where n.archived_at is null
)
select id, chemin, notion from c;

alter table _q1g_modeles add column noeud uuid, add column notion uuid;
update _q1g_modeles r set noeud = c.id, notion = c.notion
  from _q1g_chemins c
 where c.chemin = r.chemin
   and (select count(*) from _q1g_chemins d where d.chemin = r.chemin) = 1;

-- Point relevé (garde, retire) : son code dans son programme. Point posé : en plus, sur le nœud
-- du modèle ou sur sa notion (règle du nœud) ; pour un modèle rangé sur une notion, sur celle-ci.
alter table _q1g_tags add column point uuid;
update _q1g_tags t set point = p.id
  from public.curriculum_points p
 where t.cote in ('garde', 'retire') and p.grade = t.grade and p.code = t.code and p.archived_at is null;
update _q1g_tags t set point = p.id
  from _q1g_modeles r, public.curriculum_points p
 where t.cote = 'pose' and r.id = t.id and p.grade = t.grade and p.code = t.code
   and p.archived_at is null and (p.node_id = r.noeud or p.node_id = r.notion);

-- ---- 3. Gardes : présence TOUT ou RIEN, nœud et tags du relevé -------------------------
do $garde$
declare v_presents integer; v_deplaces integer; v_total integer; v_releve integer; v_attendus integer;
begin
	select count(*) into v_presents from _q1g_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 19 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 19', v_presents;
	end if;
	if exists (select 1 from _q1g_modeles where noeud is null) then
		raise exception 'chemins introuvables ou ambigus : % modèle(s)',
			(select count(*) from _q1g_modeles where noeud is null);
	end if;
	if exists (select 1 from _q1g_tags where point is null) then
		raise exception 'points introuvables ou hors du nœud du modèle : %',
			(select count(*) from _q1g_tags where point is null);
	end if;
	select count(*) into v_deplaces from _q1g_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is distinct from r.noeud;
	if v_deplaces <> 0 then
		raise exception 'modèles déplacés depuis le relevé : %', v_deplaces;
	end if;
	select count(*), count(*) filter (where exists (select 1 from _q1g_tags t
	                                               where t.cote in ('garde', 'retire') and t.id = q.template_id
	                                                 and t.point = q.point_id))
	  into v_total, v_releve
	  from public.question_template_points q
	  join _q1g_modeles r on r.id = q.template_id;
	select count(*) into v_attendus from _q1g_tags where cote in ('garde', 'retire');
	if v_total <> v_attendus or v_releve <> v_attendus then
		raise exception 'tags différents du relevé : % tag(s) dont % du relevé, attendus %', v_total, v_releve, v_attendus;
	end if;
end $garde$;

-- ---- 4. Tags : retrait de 1GEN-022 (D), pose des 12 points 1GEN (A, B) ----------------
delete from public.question_template_points q
 using _q1g_tags t
 where t.cote = 'retire' and q.template_id = t.id and q.point_id = t.point;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point
  from _q1g_tags t
  join public.question_templates q on q.id = t.id
 where t.cote = 'pose';

-- ---- 5. Niveaux : 1_GEN ajouté (A, s'il manque), retiré (C, D) ------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set grades = array_append(q.grades, '1_GEN')
  from _q1g_modeles r
 where q.id = r.id and r.lettre = 'A' and not ('1_GEN' = any(q.grades));
update public.question_templates q set grades = array_remove(q.grades, '1_GEN')
  from _q1g_modeles r
 where q.id = r.id and r.lettre in ('C', 'D') and '1_GEN' = any(q.grades);
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- ---- 6. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_total integer; v_tags integer; v_attendus integer; v_niveaux integer;
begin
	select count(*) into v_presents from _q1g_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_attendus from _q1g_tags t
	  join public.question_templates q on q.id = t.id
	 where t.cote in ('garde', 'pose');
	select count(*), count(*) filter (where exists (select 1 from _q1g_tags t
	                                               where t.cote in ('garde', 'pose') and t.id = q.template_id
	                                                 and t.point = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q1g_modeles m on m.id = q.template_id;
	select count(*) into v_niveaux from _q1g_modeles r
	  join public.question_templates q on q.id = r.id
	 where ('1_GEN' = any(q.grades)) = (r.lettre in ('A', 'B'));
	if v_tags <> v_attendus or v_total <> v_attendus or v_niveaux <> v_presents then
		raise exception 'lot incohérent : tags du lot %/%, tags en base %, niveaux conformes %/%',
			v_tags, v_attendus, v_total, v_niveaux, v_presents;
	end if;
end $check$;

drop table _q1g_chemins;
drop table _q1g_tags;
drop table _q1g_modeles;
