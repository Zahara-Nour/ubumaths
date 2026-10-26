-- ============================================================================
-- Chantier « questions-6 », lot « corrections » : niveaux, nœuds et tags de 37 modèles, 1 doublon en brouillon
-- ============================================================================
-- Les 37 modèles marqués 6e à tort (passe « arbre des notions » : HORS_PROGRAMME) prennent le niveau
-- du point qui les décrit : niveau suivant → `grades` remplacé ([5], [4] ou [3]) ; cours moyen →
-- niveau ajouté, 6 gardé ([CM1, 6] ou [CM2, 6]).
--   - 18 modèles changent de nœud (R2 : leur point vit sur un autre nœud ; sans quoi
--     question_template_points_check_rules refuse le tag) ;
--   - 34 tags posés, un par modèle ; 8a3191ce, ae7a332e (coefficient sur nombres nus) et
--     5d515eb1 (phrase → expression) changent de niveau SANS tag ;
--   - 3a7a5711 (doublon de 059e3fc9) : repassé en BROUILLON, tag 6-200 retiré, nœud gardé.
-- Le contenu ne change pas ici (les 6 modèles réécrits sont dans 20261027100000_questions_6_contenu) :
-- `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décisions de David le 2026-10-26 (journal docs/wip/questions-6-progress.md § 6). Fichier GÉNÉRÉ
-- par docs/wip/questions-6/lot-rangement-6.py (relevé de la prod du 2026-10-27,
-- destinations-42.csv) — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (38 modèles). Elle est prouvée
-- par tests/integration/questions-6-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (nœud, niveaux, statut et tags d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore au nœud, aux niveaux et au statut relevés le 2026-10-27, et
-- porter EXACTEMENT les tags relevés (sinon une saisie faite depuis serait écrasée ou contredite).
-- Les nœuds sont désignés par leur chemin, résolu STRICTEMENT.
--
-- Données d'élèves (MCP, 2026-10-27) : 0 carte SRS, 0 activité de journal, 0 question d'évaluation,
-- 1 tentative de compétence (6ca011c9, qui garde la 6e) ; aucune n'est touchée.
--
-- Accès (question tranchée par David le 2026-10-26) : les élèves et le prof du CM1, du CM2, de la 5e,
-- de la 4e et de la 3e voient les modèles de leur niveau ; ceux de la 6e ne voient plus les 29
-- modèles qui passent au-dessus, ni 3a7a5711 (brouillon : admin seul). Les tags restent lisibles par
-- tout connecté. Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 34 tags posés, rend aux modèles leur nœud,
-- leurs niveaux et leur statut d'avant, puis repose 6-200 sur 3a7a5711. Garde : il refuse si un
-- modèle n'a plus EXACTEMENT le nœud, les niveaux, le statut et les tags posés par la migration
-- (sinon une saisie faite depuis serait écrasée en silence). Bloc éprouvé par le test
-- d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en
-- un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- create temporary table _q6r_retour (
-- 	id uuid primary key,
-- 	avant_branche text not null, avant_notion text not null, avant_sous_notion text,
-- 	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
-- 	grades_avant text[] not null, grades_apres text[] not null,
-- 	statut_avant text not null, statut_apres text not null
-- );
-- insert into _q6r_retour values
-- 	('053391dc-f050-4e0a-afe0-9e5f8071035e', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
-- 	 'Nombres et calculs', 'Entiers : multiplication', 'distributivité', array['6'], array['5'], 'published', 'published'),
-- 	('108b97fa-438e-47c4-8020-7e3877fc28c3', 'Nombres et calculs', 'Entiers : multiplication', 'distributivité',
-- 	 'Nombres et calculs', 'Entiers : multiplication', 'distributivité', array['6'], array['CM2', '6'], 'published', 'published'),
-- 	('1de71a20-4bd4-4cb2-a0d3-369bef2e2afd', 'Grandeurs et mesures', 'Aires', 'parallélogramme',
-- 	 'Grandeurs et mesures', 'Aires', 'parallélogramme', array['6'], array['5'], 'published', 'published'),
-- 	('24a8e2b1-446f-4df9-84f6-eba54599c035', 'Proportionnalité', 'Échelle d''une carte', null,
-- 	 'Proportionnalité', 'Situations de proportionnalité', 'coefficient de proportionnalité', array['6'], array['5'], 'published', 'published'),
-- 	('24f7a007-bb6a-42a4-b1b0-de257308b375', 'Proportionnalité', 'Pourcentages', 'calculs de pourcentages',
-- 	 'Proportionnalité', 'Évolutions', 'variations en pourcentage', array['6'], array['3'], 'published', 'published'),
-- 	('26d4c7c5-2025-417a-9cbb-c98b7217158a', 'Nombres et calculs', 'Entiers : multiplication', 'distributivité',
-- 	 'Nombres et calculs', 'Entiers : multiplication', 'distributivité', array['6'], array['CM2', '6'], 'published', 'published'),
-- 	('290dcf6f-02ee-4c2b-a38f-fa4e860e601c', 'Proportionnalité', 'Pourcentages', 'calculs de pourcentages',
-- 	 'Proportionnalité', 'Évolutions', 'variations en pourcentage', array['6'], array['3'], 'published', 'published'),
-- 	('355bd41a-1589-4c25-be09-5f062bada81a', 'Grandeurs et mesures', 'Volumes', 'conversions',
-- 	 'Grandeurs et mesures', 'Volumes', 'conversions', array['6'], array['5'], 'published', 'published'),
-- 	('3a7a5711-941c-466f-95c6-51a4691c767b', 'Grandeurs et mesures', 'Aires', 'rectangle',
-- 	 'Grandeurs et mesures', 'Aires', 'rectangle', array['6'], array['6'], 'published', 'draft'),
-- 	('44a3062b-4e55-44e8-b40d-ac7218b58cb7', 'Proportionnalité', 'Situations de proportionnalité', 'quatrième proportionnelle',
-- 	 'Proportionnalité', 'Situations de proportionnalité', 'quatrième proportionnelle', array['6'], array['4'], 'published', 'published'),
-- 	('49e31496-47be-4f0c-b462-3b65a8f26f42', 'Nombres et calculs', 'Décimaux : calculs', 'division',
-- 	 'Nombres et calculs', 'Décimaux : calculs', 'division', array['6'], array['5'], 'published', 'published'),
-- 	('4a1e0767-7d1a-416c-aff4-9818165924e3', 'Grandeurs et mesures', 'Aires', 'triangle quelconque',
-- 	 'Grandeurs et mesures', 'Aires', 'triangle quelconque', array['6'], array['5'], 'published', 'published'),
-- 	('59ac62a2-3539-44f4-af7f-7c03cb4617f0', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
-- 	 'Algèbre', 'Équations : premier degré', 'ax = b', array['6'], array['5'], 'published', 'published'),
-- 	('5d515eb1-c8f8-4678-b4bd-f9ab3f34713f', 'Nombres et calculs', 'Entiers : priorités opératoires', 'écriture d''une expression',
-- 	 'Nombres et calculs', 'Entiers : priorités opératoires', 'écriture d''une expression', array['6'], array['4'], 'published', 'published'),
-- 	('5fb2d24b-a4d7-4513-a706-1077ace12e48', 'Grandeurs et mesures', 'Aires', 'parallélogramme',
-- 	 'Grandeurs et mesures', 'Aires', 'parallélogramme', array['6'], array['5'], 'published', 'published'),
-- 	('6632e5c2-45eb-4b6f-afff-c162bcb382e8', 'Nombres et calculs', 'Décimaux : calculs', 'division',
-- 	 'Algèbre', 'Équations : premier degré', 'ax = b', array['6'], array['5'], 'published', 'published'),
-- 	('6ca011c9-7384-4561-9aa1-d991575c569c', 'Nombres et calculs', 'Entiers : priorités opératoires', 'avec parenthèses',
-- 	 'Nombres et calculs', 'Entiers : priorités opératoires', 'avec parenthèses', array['6'], array['CM2', '6'], 'published', 'published'),
-- 	('72ac333e-4d40-44d3-bd27-25e8fd775729', 'Grandeurs et mesures', 'Aires', 'triangle quelconque',
-- 	 'Grandeurs et mesures', 'Aires', 'triangle quelconque', array['6'], array['5'], 'published', 'published'),
-- 	('819df2a9-5dd9-40c5-9525-c68e626c04b6', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
-- 	 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['6'], array['CM2', '6'], 'published', 'published'),
-- 	('8a3191ce-0c5a-488e-ad3f-d59d97cd6245', 'Proportionnalité', 'Situations de proportionnalité', 'coefficient de proportionnalité',
-- 	 'Proportionnalité', 'Situations de proportionnalité', 'coefficient de proportionnalité', array['6'], array['5'], 'published', 'published'),
-- 	('91c0f9a0-3c4d-4ee1-86be-aed4b02b38fa', 'Grandeurs et mesures', 'Aires', 'triangle quelconque',
-- 	 'Grandeurs et mesures', 'Aires', 'triangle quelconque', array['6'], array['5'], 'published', 'published'),
-- 	('98c41bde-bb56-4569-88ec-76f09f21e783', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
-- 	 'Nombres et calculs', 'Entiers : multiplication', 'distributivité', array['6'], array['5'], 'published', 'published'),
-- 	('99c4ab73-9824-46e6-9c55-98cf8250fca3', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
-- 	 'Algèbre', 'Équations : premier degré', 'ax = b', array['6'], array['5'], 'published', 'published'),
-- 	('9c7978da-6bf9-4ff6-b117-f26733bda9f0', 'Nombres et calculs', 'Décimaux : calculs', 'division',
-- 	 'Nombres et calculs', 'Décimaux : calculs', 'division', array['6'], array['5'], 'published', 'published'),
-- 	('9cc8cd82-371c-4d7d-ab1f-40f45766ae5a', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
-- 	 'Algèbre', 'Équations : premier degré', 'ax = b', array['6'], array['5'], 'published', 'published'),
-- 	('a869c2c1-cd5a-432a-927c-565495c3c872', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
-- 	 'Nombres et calculs', 'Entiers : multiplication', 'distributivité', array['6'], array['5'], 'published', 'published'),
-- 	('ae7a332e-c69a-4f4a-aa32-cb38c6b1ef42', 'Proportionnalité', 'Situations de proportionnalité', 'coefficient de proportionnalité',
-- 	 'Proportionnalité', 'Situations de proportionnalité', 'coefficient de proportionnalité', array['6'], array['5'], 'published', 'published'),
-- 	('b79d4cb7-d138-4be0-86e5-57131c8e265d', 'Grandeurs et mesures', 'Unités et conversions', 'unités composées',
-- 	 'Grandeurs et mesures', 'Volumes', 'conversions', array['6'], array['5'], 'published', 'published'),
-- 	('bf774c82-c2cb-496f-9305-d5da7b3ffe10', 'Nombres et calculs', 'Entiers : multiplication', 'distributivité',
-- 	 'Nombres et calculs', 'Entiers : multiplication', 'distributivité', array['6'], array['CM2', '6'], 'published', 'published'),
-- 	('c1a54695-3914-4990-85cd-fc6ede9c6a35', 'Proportionnalité', 'Échelle d''une carte', null,
-- 	 'Proportionnalité', 'Situations de proportionnalité', 'coefficient de proportionnalité', array['6'], array['5'], 'published', 'published'),
-- 	('c5607804-f31f-49ab-b71a-fa1379ec794a', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
-- 	 'Algèbre', 'Équations : premier degré', 'ax = b', array['6'], array['5'], 'published', 'published'),
-- 	('d006d936-c7a9-431f-819e-2f06da722c0e', 'Grandeurs et mesures', 'Aires', 'triangle rectangle',
-- 	 'Grandeurs et mesures', 'Aires', 'triangle quelconque', array['6'], array['5'], 'published', 'published'),
-- 	('d793de49-b065-46ea-aa8b-d09adcbb7617', 'Nombres et calculs', 'Entiers : multiplication', 'distributivité',
-- 	 'Nombres et calculs', 'Entiers : multiplication', 'distributivité', array['6'], array['CM2', '6'], 'published', 'published'),
-- 	('def797c6-4841-43ca-977f-020deb4c36d7', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
-- 	 'Algèbre', 'Équations : premier degré', 'ax = b', array['6'], array['5'], 'published', 'published'),
-- 	('e0f6b04e-2969-4aaa-aa5c-8f8d2b2b637f', 'Nombres et calculs', 'Entiers : priorités opératoires', 'avec parenthèses',
-- 	 'Nombres et calculs', 'Entiers : priorités opératoires', 'avec parenthèses', array['6'], array['CM1', '6'], 'published', 'published'),
-- 	('f3ae46e9-f305-429e-b9e9-f33d0062b7f0', 'Grandeurs et mesures', 'Aires', 'triangle rectangle',
-- 	 'Grandeurs et mesures', 'Aires', 'triangle quelconque', array['6'], array['5'], 'published', 'published'),
-- 	('f3bf4c64-5de9-4728-adb7-c86ab79e94e5', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
-- 	 'Algèbre', 'Premiers pas algébriques', 'égalités à trous', array['6'], array['CM2', '6'], 'published', 'published'),
-- 	('f9a3333d-94ad-4a9b-b5d4-22325d67f6d9', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
-- 	 'Algèbre', 'Équations : premier degré', 'ax = b', array['6'], array['5'], 'published', 'published');
-- create temporary table _q6r_retour_tags (template_id uuid not null, grade text not null, code text not null, avant boolean not null);
-- insert into _q6r_retour_tags values
-- 	('053391dc-f050-4e0a-afe0-9e5f8071035e', '5', '5-008', false),
-- 	('108b97fa-438e-47c4-8020-7e3877fc28c3', 'CM2', 'CM2-047', false),
-- 	('1de71a20-4bd4-4cb2-a0d3-369bef2e2afd', '5', '5-073', false),
-- 	('24a8e2b1-446f-4df9-84f6-eba54599c035', '5', '5-088', false),
-- 	('24f7a007-bb6a-42a4-b1b0-de257308b375', '3', '3-069', false),
-- 	('26d4c7c5-2025-417a-9cbb-c98b7217158a', 'CM2', 'CM2-047', false),
-- 	('290dcf6f-02ee-4c2b-a38f-fa4e860e601c', '3', '3-068', false),
-- 	('355bd41a-1589-4c25-be09-5f062bada81a', '5', '5-129', false),
-- 	('44a3062b-4e55-44e8-b40d-ac7218b58cb7', '4', '4-055', false),
-- 	('49e31496-47be-4f0c-b462-3b65a8f26f42', '5', '5-003', false),
-- 	('4a1e0767-7d1a-416c-aff4-9818165924e3', '5', '5-061', false),
-- 	('59ac62a2-3539-44f4-af7f-7c03cb4617f0', '5', '5-126', false),
-- 	('5fb2d24b-a4d7-4513-a706-1077ace12e48', '5', '5-073', false),
-- 	('6632e5c2-45eb-4b6f-afff-c162bcb382e8', '5', '5-126', false),
-- 	('6ca011c9-7384-4561-9aa1-d991575c569c', 'CM2', 'CM2-054', false),
-- 	('72ac333e-4d40-44d3-bd27-25e8fd775729', '5', '5-061', false),
-- 	('819df2a9-5dd9-40c5-9525-c68e626c04b6', 'CM2', 'CM2-042', false),
-- 	('91c0f9a0-3c4d-4ee1-86be-aed4b02b38fa', '5', '5-061', false),
-- 	('98c41bde-bb56-4569-88ec-76f09f21e783', '5', '5-008', false),
-- 	('99c4ab73-9824-46e6-9c55-98cf8250fca3', '5', '5-126', false),
-- 	('9c7978da-6bf9-4ff6-b117-f26733bda9f0', '5', '5-003', false),
-- 	('9cc8cd82-371c-4d7d-ab1f-40f45766ae5a', '5', '5-126', false),
-- 	('a869c2c1-cd5a-432a-927c-565495c3c872', '5', '5-008', false),
-- 	('b79d4cb7-d138-4be0-86e5-57131c8e265d', '5', '5-051', false),
-- 	('bf774c82-c2cb-496f-9305-d5da7b3ffe10', 'CM2', 'CM2-047', false),
-- 	('c1a54695-3914-4990-85cd-fc6ede9c6a35', '5', '5-088', false),
-- 	('c5607804-f31f-49ab-b71a-fa1379ec794a', '5', '5-126', false),
-- 	('d006d936-c7a9-431f-819e-2f06da722c0e', '5', '5-061', false),
-- 	('d793de49-b065-46ea-aa8b-d09adcbb7617', 'CM2', 'CM2-047', false),
-- 	('def797c6-4841-43ca-977f-020deb4c36d7', '5', '5-126', false),
-- 	('e0f6b04e-2969-4aaa-aa5c-8f8d2b2b637f', 'CM1', 'CM1-049', false),
-- 	('f3ae46e9-f305-429e-b9e9-f33d0062b7f0', '5', '5-061', false),
-- 	('f3bf4c64-5de9-4728-adb7-c86ab79e94e5', 'CM2', 'CM2-065', false),
-- 	('f9a3333d-94ad-4a9b-b5d4-22325d67f6d9', '5', '5-126', false),
-- 	('3a7a5711-941c-466f-95c6-51a4691c767b', '6', '6-200', true);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _q6r_retour order by id;
-- select 1 from public.question_templates where id in (select id from _q6r_retour) order by id for update;
-- create temporary table _q6r_retour_noeuds as
-- 	select r.id,
-- 	       case when r.avant_sous_notion is null then an.id else asn.id end as avant,
-- 	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
-- 	  from _q6r_retour r
-- 	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
-- 	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
-- 	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
-- 	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
-- 	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
-- 	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
-- alter table _q6r_retour_tags add column point_id uuid;
-- update _q6r_retour_tags t set point_id = p.id
--   from public.curriculum_points p
--  where p.grade = t.grade and p.code = t.code and p.archived_at is null;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _q6r_retour_noeuds where avant is null or apres is null)
-- 	   or exists (select 1 from _q6r_retour_tags where point_id is null) then
-- 		raise exception 'rollback : chemins ou points introuvables';
-- 	end if;
-- 	select count(*), count(*) filter (where q.grades = r.grades_apres and q.status = r.statut_apres
-- 	                                     and q.classification_node_id = x.apres)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q
-- 	  join _q6r_retour r on r.id = q.id
-- 	  join _q6r_retour_noeuds x on x.id = q.id;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ont encore le nœud, les niveaux et le statut de la migration', v_intacts, v_presents;
-- 	end if;
-- 	-- Tags : exactement les 34 posés par la migration, rien d'autre (tout niveau).
-- 	select count(*), count(*) filter (where exists (select 1 from _q6r_retour_tags t
-- 	                                                where not t.avant and t.template_id = q.template_id and t.point_id = q.point_id))
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _q6r_retour r on r.id = q.template_id;
-- 	if v_tags <> v_total or v_total <> least(v_presents, 1) * 34 then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, least(v_presents, 1) * 34;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _q6r_retour_tags t
--  where not t.avant and q.template_id = t.template_id and q.point_id = t.point_id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q
--    set classification_node_id = x.avant, grades = r.grades_avant, status = r.statut_avant
--   from _q6r_retour r join _q6r_retour_noeuds x on x.id = r.id
--  where q.id = r.id;
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- insert into public.question_template_points (template_id, point_id)
-- select t.template_id, t.point_id
--   from _q6r_retour_tags t
--   join public.question_templates q on q.id = t.template_id
--  where t.avant;
-- do $retour$
-- declare v_presents integer; v_total integer; v_reposes integer;
-- begin
-- 	select count(*) into v_presents from _q6r_retour r join public.question_templates q on q.id = r.id;
-- 	select count(*), count(*) filter (where exists (select 1 from _q6r_retour_tags t
-- 	                                                where t.avant and t.template_id = q.template_id and t.point_id = q.point_id))
-- 	  into v_total, v_reposes
-- 	  from public.question_template_points q
-- 	  join _q6r_retour r on r.id = q.template_id;
-- 	if v_reposes <> v_total or v_total <> least(v_presents, 1) * 1 then
-- 		raise exception 'rollback : % tag(s) reposé(s) sur %, attendus %', v_reposes, v_total, least(v_presents, 1) * 1;
-- 	end if;
-- end $retour$;
-- drop table _q6r_retour_noeuds;
-- drop table _q6r_retour_tags;
-- drop table _q6r_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._q6r_modeles;
drop table if exists pg_temp._q6r_tags;
create temporary table _q6r_modeles (
	id uuid primary key,
	avant_branche text not null, avant_notion text not null, avant_sous_notion text,
	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
	grades_avant text[] not null,
	grades_apres text[] not null,
	statut_avant text not null,
	statut_apres text not null
);
create temporary table _q6r_tags (
	template_id uuid not null,
	grade text not null,
	code text not null,
	avant boolean not null,
	apres boolean not null,
	primary key (template_id, grade, code)
);
insert into _q6r_modeles values
	('053391dc-f050-4e0a-afe0-9e5f8071035e', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Nombres et calculs', 'Entiers : multiplication', 'distributivité', array['6'], array['5'], 'published', 'published'),
	('108b97fa-438e-47c4-8020-7e3877fc28c3', 'Nombres et calculs', 'Entiers : multiplication', 'distributivité',
	 'Nombres et calculs', 'Entiers : multiplication', 'distributivité', array['6'], array['CM2', '6'], 'published', 'published'),
	('1de71a20-4bd4-4cb2-a0d3-369bef2e2afd', 'Grandeurs et mesures', 'Aires', 'parallélogramme',
	 'Grandeurs et mesures', 'Aires', 'parallélogramme', array['6'], array['5'], 'published', 'published'),
	('24a8e2b1-446f-4df9-84f6-eba54599c035', 'Proportionnalité', 'Échelle d''une carte', null,
	 'Proportionnalité', 'Situations de proportionnalité', 'coefficient de proportionnalité', array['6'], array['5'], 'published', 'published'),
	('24f7a007-bb6a-42a4-b1b0-de257308b375', 'Proportionnalité', 'Pourcentages', 'calculs de pourcentages',
	 'Proportionnalité', 'Évolutions', 'variations en pourcentage', array['6'], array['3'], 'published', 'published'),
	('26d4c7c5-2025-417a-9cbb-c98b7217158a', 'Nombres et calculs', 'Entiers : multiplication', 'distributivité',
	 'Nombres et calculs', 'Entiers : multiplication', 'distributivité', array['6'], array['CM2', '6'], 'published', 'published'),
	('290dcf6f-02ee-4c2b-a38f-fa4e860e601c', 'Proportionnalité', 'Pourcentages', 'calculs de pourcentages',
	 'Proportionnalité', 'Évolutions', 'variations en pourcentage', array['6'], array['3'], 'published', 'published'),
	('355bd41a-1589-4c25-be09-5f062bada81a', 'Grandeurs et mesures', 'Volumes', 'conversions',
	 'Grandeurs et mesures', 'Volumes', 'conversions', array['6'], array['5'], 'published', 'published'),
	('3a7a5711-941c-466f-95c6-51a4691c767b', 'Grandeurs et mesures', 'Aires', 'rectangle',
	 'Grandeurs et mesures', 'Aires', 'rectangle', array['6'], array['6'], 'published', 'draft'),
	('44a3062b-4e55-44e8-b40d-ac7218b58cb7', 'Proportionnalité', 'Situations de proportionnalité', 'quatrième proportionnelle',
	 'Proportionnalité', 'Situations de proportionnalité', 'quatrième proportionnelle', array['6'], array['4'], 'published', 'published'),
	('49e31496-47be-4f0c-b462-3b65a8f26f42', 'Nombres et calculs', 'Décimaux : calculs', 'division',
	 'Nombres et calculs', 'Décimaux : calculs', 'division', array['6'], array['5'], 'published', 'published'),
	('4a1e0767-7d1a-416c-aff4-9818165924e3', 'Grandeurs et mesures', 'Aires', 'triangle quelconque',
	 'Grandeurs et mesures', 'Aires', 'triangle quelconque', array['6'], array['5'], 'published', 'published'),
	('59ac62a2-3539-44f4-af7f-7c03cb4617f0', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Algèbre', 'Équations : premier degré', 'ax = b', array['6'], array['5'], 'published', 'published'),
	('5d515eb1-c8f8-4678-b4bd-f9ab3f34713f', 'Nombres et calculs', 'Entiers : priorités opératoires', 'écriture d''une expression',
	 'Nombres et calculs', 'Entiers : priorités opératoires', 'écriture d''une expression', array['6'], array['4'], 'published', 'published'),
	('5fb2d24b-a4d7-4513-a706-1077ace12e48', 'Grandeurs et mesures', 'Aires', 'parallélogramme',
	 'Grandeurs et mesures', 'Aires', 'parallélogramme', array['6'], array['5'], 'published', 'published'),
	('6632e5c2-45eb-4b6f-afff-c162bcb382e8', 'Nombres et calculs', 'Décimaux : calculs', 'division',
	 'Algèbre', 'Équations : premier degré', 'ax = b', array['6'], array['5'], 'published', 'published'),
	('6ca011c9-7384-4561-9aa1-d991575c569c', 'Nombres et calculs', 'Entiers : priorités opératoires', 'avec parenthèses',
	 'Nombres et calculs', 'Entiers : priorités opératoires', 'avec parenthèses', array['6'], array['CM2', '6'], 'published', 'published'),
	('72ac333e-4d40-44d3-bd27-25e8fd775729', 'Grandeurs et mesures', 'Aires', 'triangle quelconque',
	 'Grandeurs et mesures', 'Aires', 'triangle quelconque', array['6'], array['5'], 'published', 'published'),
	('819df2a9-5dd9-40c5-9525-c68e626c04b6', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['6'], array['CM2', '6'], 'published', 'published'),
	('8a3191ce-0c5a-488e-ad3f-d59d97cd6245', 'Proportionnalité', 'Situations de proportionnalité', 'coefficient de proportionnalité',
	 'Proportionnalité', 'Situations de proportionnalité', 'coefficient de proportionnalité', array['6'], array['5'], 'published', 'published'),
	('91c0f9a0-3c4d-4ee1-86be-aed4b02b38fa', 'Grandeurs et mesures', 'Aires', 'triangle quelconque',
	 'Grandeurs et mesures', 'Aires', 'triangle quelconque', array['6'], array['5'], 'published', 'published'),
	('98c41bde-bb56-4569-88ec-76f09f21e783', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Nombres et calculs', 'Entiers : multiplication', 'distributivité', array['6'], array['5'], 'published', 'published'),
	('99c4ab73-9824-46e6-9c55-98cf8250fca3', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Algèbre', 'Équations : premier degré', 'ax = b', array['6'], array['5'], 'published', 'published'),
	('9c7978da-6bf9-4ff6-b117-f26733bda9f0', 'Nombres et calculs', 'Décimaux : calculs', 'division',
	 'Nombres et calculs', 'Décimaux : calculs', 'division', array['6'], array['5'], 'published', 'published'),
	('9cc8cd82-371c-4d7d-ab1f-40f45766ae5a', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Algèbre', 'Équations : premier degré', 'ax = b', array['6'], array['5'], 'published', 'published'),
	('a869c2c1-cd5a-432a-927c-565495c3c872', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Nombres et calculs', 'Entiers : multiplication', 'distributivité', array['6'], array['5'], 'published', 'published'),
	('ae7a332e-c69a-4f4a-aa32-cb38c6b1ef42', 'Proportionnalité', 'Situations de proportionnalité', 'coefficient de proportionnalité',
	 'Proportionnalité', 'Situations de proportionnalité', 'coefficient de proportionnalité', array['6'], array['5'], 'published', 'published'),
	('b79d4cb7-d138-4be0-86e5-57131c8e265d', 'Grandeurs et mesures', 'Unités et conversions', 'unités composées',
	 'Grandeurs et mesures', 'Volumes', 'conversions', array['6'], array['5'], 'published', 'published'),
	('bf774c82-c2cb-496f-9305-d5da7b3ffe10', 'Nombres et calculs', 'Entiers : multiplication', 'distributivité',
	 'Nombres et calculs', 'Entiers : multiplication', 'distributivité', array['6'], array['CM2', '6'], 'published', 'published'),
	('c1a54695-3914-4990-85cd-fc6ede9c6a35', 'Proportionnalité', 'Échelle d''une carte', null,
	 'Proportionnalité', 'Situations de proportionnalité', 'coefficient de proportionnalité', array['6'], array['5'], 'published', 'published'),
	('c5607804-f31f-49ab-b71a-fa1379ec794a', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Algèbre', 'Équations : premier degré', 'ax = b', array['6'], array['5'], 'published', 'published'),
	('d006d936-c7a9-431f-819e-2f06da722c0e', 'Grandeurs et mesures', 'Aires', 'triangle rectangle',
	 'Grandeurs et mesures', 'Aires', 'triangle quelconque', array['6'], array['5'], 'published', 'published'),
	('d793de49-b065-46ea-aa8b-d09adcbb7617', 'Nombres et calculs', 'Entiers : multiplication', 'distributivité',
	 'Nombres et calculs', 'Entiers : multiplication', 'distributivité', array['6'], array['CM2', '6'], 'published', 'published'),
	('def797c6-4841-43ca-977f-020deb4c36d7', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Algèbre', 'Équations : premier degré', 'ax = b', array['6'], array['5'], 'published', 'published'),
	('e0f6b04e-2969-4aaa-aa5c-8f8d2b2b637f', 'Nombres et calculs', 'Entiers : priorités opératoires', 'avec parenthèses',
	 'Nombres et calculs', 'Entiers : priorités opératoires', 'avec parenthèses', array['6'], array['CM1', '6'], 'published', 'published'),
	('f3ae46e9-f305-429e-b9e9-f33d0062b7f0', 'Grandeurs et mesures', 'Aires', 'triangle rectangle',
	 'Grandeurs et mesures', 'Aires', 'triangle quelconque', array['6'], array['5'], 'published', 'published'),
	('f3bf4c64-5de9-4728-adb7-c86ab79e94e5', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Algèbre', 'Premiers pas algébriques', 'égalités à trous', array['6'], array['CM2', '6'], 'published', 'published'),
	('f9a3333d-94ad-4a9b-b5d4-22325d67f6d9', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Algèbre', 'Équations : premier degré', 'ax = b', array['6'], array['5'], 'published', 'published');
insert into _q6r_tags values
	('3a7a5711-941c-466f-95c6-51a4691c767b', '6', '6-200', true, false),
	('053391dc-f050-4e0a-afe0-9e5f8071035e', '5', '5-008', false, true),
	('108b97fa-438e-47c4-8020-7e3877fc28c3', 'CM2', 'CM2-047', false, true),
	('1de71a20-4bd4-4cb2-a0d3-369bef2e2afd', '5', '5-073', false, true),
	('24a8e2b1-446f-4df9-84f6-eba54599c035', '5', '5-088', false, true),
	('24f7a007-bb6a-42a4-b1b0-de257308b375', '3', '3-069', false, true),
	('26d4c7c5-2025-417a-9cbb-c98b7217158a', 'CM2', 'CM2-047', false, true),
	('290dcf6f-02ee-4c2b-a38f-fa4e860e601c', '3', '3-068', false, true),
	('355bd41a-1589-4c25-be09-5f062bada81a', '5', '5-129', false, true),
	('44a3062b-4e55-44e8-b40d-ac7218b58cb7', '4', '4-055', false, true),
	('49e31496-47be-4f0c-b462-3b65a8f26f42', '5', '5-003', false, true),
	('4a1e0767-7d1a-416c-aff4-9818165924e3', '5', '5-061', false, true),
	('59ac62a2-3539-44f4-af7f-7c03cb4617f0', '5', '5-126', false, true),
	('5fb2d24b-a4d7-4513-a706-1077ace12e48', '5', '5-073', false, true),
	('6632e5c2-45eb-4b6f-afff-c162bcb382e8', '5', '5-126', false, true),
	('6ca011c9-7384-4561-9aa1-d991575c569c', 'CM2', 'CM2-054', false, true),
	('72ac333e-4d40-44d3-bd27-25e8fd775729', '5', '5-061', false, true),
	('819df2a9-5dd9-40c5-9525-c68e626c04b6', 'CM2', 'CM2-042', false, true),
	('91c0f9a0-3c4d-4ee1-86be-aed4b02b38fa', '5', '5-061', false, true),
	('98c41bde-bb56-4569-88ec-76f09f21e783', '5', '5-008', false, true),
	('99c4ab73-9824-46e6-9c55-98cf8250fca3', '5', '5-126', false, true),
	('9c7978da-6bf9-4ff6-b117-f26733bda9f0', '5', '5-003', false, true),
	('9cc8cd82-371c-4d7d-ab1f-40f45766ae5a', '5', '5-126', false, true),
	('a869c2c1-cd5a-432a-927c-565495c3c872', '5', '5-008', false, true),
	('b79d4cb7-d138-4be0-86e5-57131c8e265d', '5', '5-051', false, true),
	('bf774c82-c2cb-496f-9305-d5da7b3ffe10', 'CM2', 'CM2-047', false, true),
	('c1a54695-3914-4990-85cd-fc6ede9c6a35', '5', '5-088', false, true),
	('c5607804-f31f-49ab-b71a-fa1379ec794a', '5', '5-126', false, true),
	('d006d936-c7a9-431f-819e-2f06da722c0e', '5', '5-061', false, true),
	('d793de49-b065-46ea-aa8b-d09adcbb7617', 'CM2', 'CM2-047', false, true),
	('def797c6-4841-43ca-977f-020deb4c36d7', '5', '5-126', false, true),
	('e0f6b04e-2969-4aaa-aa5c-8f8d2b2b637f', 'CM1', 'CM1-049', false, true),
	('f3ae46e9-f305-429e-b9e9-f33d0062b7f0', '5', '5-061', false, true),
	('f3bf4c64-5de9-4728-adb7-c86ab79e94e5', 'CM2', 'CM2-065', false, true),
	('f9a3333d-94ad-4a9b-b5d4-22325d67f6d9', '5', '5-126', false, true);

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q6r_modeles order by id;
select 1 from public.question_templates where id in (select id from _q6r_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
create temporary table _q6r_noeuds as
	select r.id,
	       case when r.avant_sous_notion is null then an.id else asn.id end as avant,
	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
	  from _q6r_modeles r
	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
alter table _q6r_tags add column point_id uuid;
update _q6r_tags t set point_id = p.id
  from public.curriculum_points p
 where p.grade = t.grade and p.code = t.code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _q6r_noeuds where avant is null or apres is null)
	   or exists (select 1 from _q6r_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s) de modèle, % point(s)',
			(select count(*) from _q6r_noeuds where avant is null or apres is null),
			(select count(*) from _q6r_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, nœud, niveaux et statut relevés, tags EXACTEMENT relevés ---
do $garde$
declare v_presents integer; v_ecarts integer; v_niveaux integer; v_statuts integer; v_detail text;
begin
	select count(*) into v_presents from _q6r_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 38) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 38', v_presents;
	end if;
	select count(*) into v_ecarts from _q6r_noeuds x
	  join public.question_templates q on q.id = x.id
	 where q.classification_node_id is distinct from x.avant;
	if v_ecarts <> 0 then
		raise exception 'modèles déplacés depuis le relevé : %', v_ecarts;
	end if;
	select count(*) into v_niveaux from _q6r_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from r.grades_avant;
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _q6r_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from r.statut_avant;
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	-- « + » : tag en base non relevé (tout niveau) ; « - » : tag relevé absent de la base
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || left(q.template_id::text, 8) || ' ' || p.code as r
		   from public.question_template_points q
		   join _q6r_modeles m on m.id = q.template_id
		   join public.curriculum_points p on p.id = q.point_id
		  where not exists (select 1 from _q6r_tags t where t.template_id = q.template_id and t.point_id = q.point_id and t.avant))
		union all
		(select '-' || left(t.template_id::text, 8) || ' ' || t.code
		   from _q6r_tags t
		   join public.question_templates q on q.id = t.template_id
		  where t.avant
		    and not exists (select 1 from public.question_template_points u where u.template_id = t.template_id and u.point_id = t.point_id))) d;
	if v_detail is not null then
		raise exception 'tags différents du relevé : %', v_detail;
	end if;
end $garde$;

-- ---- 4. Retraits, déplacements, niveaux, statut, poses ---------------------------------
delete from public.question_template_points q
 using _q6r_tags t
 where q.template_id = t.template_id and q.point_id = t.point_id and t.avant and not t.apres;

-- R2 : les modèles passent sur le nœud de leur point AVANT les tags (le trigger des tags lit le
-- nœud du modèle).
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = x.apres
  from _q6r_noeuds x
 where q.id = x.id and q.classification_node_id is distinct from x.apres;
update public.question_templates q set grades = r.grades_apres
  from _q6r_modeles r
 where q.id = r.id and q.grades is distinct from r.grades_apres;
update public.question_templates q set status = r.statut_apres
  from _q6r_modeles r
 where q.id = r.id and q.status is distinct from r.statut_apres;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.template_id, t.point_id
  from _q6r_tags t
  join public.question_templates q on q.id = t.template_id
 where t.apres and not t.avant;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_niveaux integer; v_statuts integer; v_total integer; v_tags integer; v_tags_attendus integer;
begin
	select count(*) into v_presents from _q6r_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q6r_noeuds x
	  join public.question_templates q on q.id = x.id and q.classification_node_id = x.apres;
	select count(*) into v_niveaux from _q6r_modeles r
	  join public.question_templates q on q.id = r.id and q.grades = r.grades_apres;
	select count(*) into v_statuts from _q6r_modeles r
	  join public.question_templates q on q.id = r.id and q.status = r.statut_apres;
	-- tags de ces modèles (tout niveau) : tous, et ceux du lot d'après (doivent coïncider)
	select count(*), count(*) filter (where exists (select 1 from _q6r_tags t
	                                                where t.template_id = q.template_id and t.point_id = q.point_id and t.apres))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q6r_modeles m on m.id = q.template_id;
	-- Base sans les modèles (locale) : aucun tag attendu.
	v_tags_attendus := least(v_presents, 1) * 34;
	if v_noeuds <> v_presents or v_niveaux <> v_presents or v_statuts <> v_presents
	   or v_tags <> v_tags_attendus or v_total <> v_tags_attendus then
		raise exception 'lot incohérent : nœuds %/%, niveaux %/%, statuts %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_niveaux, v_presents, v_statuts, v_presents, v_tags, v_tags_attendus, v_total;
	end if;
end $check$;

drop table _q6r_noeuds;
drop table _q6r_tags;
drop table _q6r_modeles;
