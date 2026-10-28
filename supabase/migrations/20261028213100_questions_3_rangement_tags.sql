-- ============================================================================
-- Chantier « questions-3 », lot 0 (corrections) : niveaux, nœuds et tags de 17 modèles
-- ============================================================================
--   - 10 modèles de 4e relèvent d'un point de 3e : niveaux [4] → [3], tag posé (c9d6c5db → 3-001 ;
--     15368b02, 65110463 → 3-004 ; bb9cff7b, 5b627bb7 → 3-005 ; 1db08bdc, 743c0809, 8ac99be4 →
--     3-052 ; 953574d4, 9f380957 → 3-006) ; 65110463 (« Fractions : calculs > inverse ») et 8ac99be4
--     (« Puissances : calculs ») passent sur le nœud de leur point ;
--   - 17f3dfcd (puissance d'une puissance de 10, exposants relatifs) : niveaux [4] → [3], sans tag
--     (aucun point ne la cite) ;
--   - 6 modèles de 3e relèvent d'un autre niveau : 54107079 → [4], 4-022 ; 2bdb3db6 → [4], 4-024, sur
--     le nœud de son point (« Algèbre > Équations : premier degré > ax + b = c ») ; ac5d0413 → [5],
--     5-039 ; 7c0ee046 → [2], 2-348 ; bba95c2d → [2], 2-328 ; 336451af → [2], 2-318, sur le nœud de
--     son point (« Géométrie > Géométrie repérée > intersection de deux droites »).
-- Bilan : 17 niveaux changés, 4 déplacements (R2 : le point vit ailleurs ; sans quoi
-- question_template_points_check_rules refuse le tag), 16 tags posés. Aucun statut ne change. Le
-- contenu ne change pas ici (290dcf6f, réécrit, est dans 20261028213000_questions_3_contenu et ne
-- figure pas dans celle-ci) : `updated_at` est PRÉSERVÉ.
-- 90dca27a et acbd2280 (phase 0 : 3-001) n'y sont pas : passés en 4e, tag 4-005, par
-- 20261028193700_questions_5_niveaux (session 5e, déjà jouée).
-- ============================================================================
-- Décisions de David le 2026-10-28 (journal docs/wip/questions-3-progress.md § 6.2). Fichier GÉNÉRÉ
-- par docs/wip/questions/lot-rangement-3.py (relevé de la prod du 2026-10-28) — ne pas éditer à la
-- main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (17 modèles). Elle est prouvée
-- par tests/integration/questions-3-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (nœud, niveaux, statut et tags d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore au nœud, aux niveaux et au statut relevés le 2026-10-28, et
-- porter EXACTEMENT les tags relevés (aucun) : sinon une saisie faite depuis serait écrasée ou
-- contredite. Les nœuds sont désignés par leur chemin, résolu STRICTEMENT.
--
-- Données d'élèves (MCP, 2026-10-28) : aucune sur ces modèles (0 carte SRS, 0 tentative de
-- compétence ou d'évaluation, 0 réponse de test, 0 activité de journal, 0 exercice, série ou fiche
-- de chapitre, 0 favori).
--
-- Accès (question tranchée par David le 2026-10-28) : personne ne gagne de lecture. Les 17 modèles
-- restent publiés : 11 apparaissent en 3e au lieu de la 4e ; 6 quittent la 3e pour la 4e (2), la 5e
-- (1) ou la 2de (3). Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 16 tags posés, rend aux modèles leur nœud, leurs
-- niveaux et leur statut d'avant. Garde : il refuse si un modèle n'a plus EXACTEMENT le nœud, les
-- niveaux, le statut et les tags laissés par la migration (sinon une saisie faite depuis serait
-- écrasée en silence). Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q3r_retour_noeuds;
-- drop table if exists pg_temp._q3r_retour_tags;
-- drop table if exists pg_temp._q3r_retour;
-- create temporary table _q3r_retour (
-- 	id uuid primary key,
-- 	avant_branche text not null, avant_notion text not null, avant_sous_notion text,
-- 	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
-- 	grades_avant text[] not null, grades_apres text[] not null,
-- 	statut_avant text not null, statut_apres text not null
-- );
-- insert into _q3r_retour values
-- 	('15368b02-73cc-4f0d-b978-fa0d0848eb03', 'Nombres et calculs', 'Puissances : sens et écritures', 'définition',
-- 	 'Nombres et calculs', 'Puissances : sens et écritures', 'définition', array['4'], array['3'], 'published', 'published'),
-- 	('17f3dfcd-01e4-460f-9b94-40be348c2ed7', 'Nombres et calculs', 'Puissances : calculs', 'puissance de puissance',
-- 	 'Nombres et calculs', 'Puissances : calculs', 'puissance de puissance', array['4'], array['3'], 'published', 'published'),
-- 	('1db08bdc-e262-464c-9a51-b77b281e0510', 'Nombres et calculs', 'Puissances : calculs', 'quotient de puissances',
-- 	 'Nombres et calculs', 'Puissances : calculs', 'quotient de puissances', array['4'], array['3'], 'published', 'published'),
-- 	('2bdb3db6-8ef7-43af-aa7a-2332e34d2a01', 'Fonctions', 'Fonctions affines', 'équations',
-- 	 'Algèbre', 'Équations : premier degré', 'ax + b = c', array['3'], array['4'], 'published', 'published'),
-- 	('336451af-1329-4e38-adf3-01a857455c1d', 'Fonctions', 'Fonctions affines', 'coefficient directeur et ordonnée à l''origine',
-- 	 'Géométrie', 'Géométrie repérée', 'intersection de deux droites', array['3'], array['2'], 'published', 'published'),
-- 	('54107079-218f-48dd-8df4-3cb4d1f5a801', 'Algèbre', 'Calcul littéral', 'développement',
-- 	 'Algèbre', 'Calcul littéral', 'développement', array['3'], array['4'], 'published', 'published'),
-- 	('5b627bb7-201f-4482-91e7-58b98604a4f9', 'Nombres et calculs', 'Puissances : calculs', 'produit de puissances',
-- 	 'Nombres et calculs', 'Puissances : calculs', 'produit de puissances', array['4'], array['3'], 'published', 'published'),
-- 	('65110463-afc0-4dfd-91b3-977fd7402de7', 'Nombres et calculs', 'Fractions : calculs', 'inverse',
-- 	 'Nombres et calculs', 'Puissances : sens et écritures', 'définition', array['4'], array['3'], 'published', 'published'),
-- 	('743c0809-885f-4536-bad4-267cffbb1ae7', 'Nombres et calculs', 'Puissances : calculs', 'quotient de puissances',
-- 	 'Nombres et calculs', 'Puissances : calculs', 'quotient de puissances', array['4'], array['3'], 'published', 'published'),
-- 	('7c0ee046-124a-4f90-a84a-9a41042804f7', 'Fonctions', 'Fonctions affines', 'variations et signe',
-- 	 'Fonctions', 'Fonctions affines', 'variations et signe', array['3'], array['2'], 'published', 'published'),
-- 	('8ac99be4-a6be-4c89-90c8-c7d8974313f4', 'Nombres et calculs', 'Puissances : calculs', null,
-- 	 'Nombres et calculs', 'Puissances : calculs', 'quotient de puissances', array['4'], array['3'], 'published', 'published'),
-- 	('953574d4-e345-4a5d-9435-7faecc3ff7ac', 'Nombres et calculs', 'Puissances : sens et écritures', 'notation scientifique',
-- 	 'Nombres et calculs', 'Puissances : sens et écritures', 'notation scientifique', array['4'], array['3'], 'published', 'published'),
-- 	('9f380957-48db-4b31-9f28-61fc4bfb5420', 'Nombres et calculs', 'Puissances : sens et écritures', 'notation scientifique',
-- 	 'Nombres et calculs', 'Puissances : sens et écritures', 'notation scientifique', array['4'], array['3'], 'published', 'published'),
-- 	('ac5d0413-2eee-4bed-998b-d540701667a0', 'Algèbre', 'Calcul littéral', 'réduction',
-- 	 'Algèbre', 'Calcul littéral', 'réduction', array['3'], array['5'], 'published', 'published'),
-- 	('bb9cff7b-f2c7-40ce-af3c-249970ad0a9e', 'Nombres et calculs', 'Puissances : calculs', 'produit de puissances',
-- 	 'Nombres et calculs', 'Puissances : calculs', 'produit de puissances', array['4'], array['3'], 'published', 'published'),
-- 	('bba95c2d-033b-4648-944d-102a3c2c386d', 'Fonctions', 'Fonctions affines', 'variations et signe',
-- 	 'Fonctions', 'Fonctions affines', 'variations et signe', array['3'], array['2'], 'published', 'published'),
-- 	('c9d6c5db-e067-4056-9db9-4130485cb16a', 'Nombres et calculs', 'Fractions : sens et écritures', 'simplification',
-- 	 'Nombres et calculs', 'Fractions : sens et écritures', 'simplification', array['4'], array['3'], 'published', 'published');
-- create temporary table _q3r_retour_tags (template_id uuid not null, grade text not null, code text not null, avant boolean not null, apres boolean not null);
-- insert into _q3r_retour_tags values
-- 	('15368b02-73cc-4f0d-b978-fa0d0848eb03', '3', '3-004', false, true),
-- 	('1db08bdc-e262-464c-9a51-b77b281e0510', '3', '3-052', false, true),
-- 	('2bdb3db6-8ef7-43af-aa7a-2332e34d2a01', '4', '4-024', false, true),
-- 	('336451af-1329-4e38-adf3-01a857455c1d', '2', '2-318', false, true),
-- 	('54107079-218f-48dd-8df4-3cb4d1f5a801', '4', '4-022', false, true),
-- 	('5b627bb7-201f-4482-91e7-58b98604a4f9', '3', '3-005', false, true),
-- 	('65110463-afc0-4dfd-91b3-977fd7402de7', '3', '3-004', false, true),
-- 	('743c0809-885f-4536-bad4-267cffbb1ae7', '3', '3-052', false, true),
-- 	('7c0ee046-124a-4f90-a84a-9a41042804f7', '2', '2-348', false, true),
-- 	('8ac99be4-a6be-4c89-90c8-c7d8974313f4', '3', '3-052', false, true),
-- 	('953574d4-e345-4a5d-9435-7faecc3ff7ac', '3', '3-006', false, true),
-- 	('9f380957-48db-4b31-9f28-61fc4bfb5420', '3', '3-006', false, true),
-- 	('ac5d0413-2eee-4bed-998b-d540701667a0', '5', '5-039', false, true),
-- 	('bb9cff7b-f2c7-40ce-af3c-249970ad0a9e', '3', '3-005', false, true),
-- 	('bba95c2d-033b-4648-944d-102a3c2c386d', '2', '2-328', false, true),
-- 	('c9d6c5db-e067-4056-9db9-4130485cb16a', '3', '3-001', false, true);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _q3r_retour order by id;
-- select 1 from public.question_templates where id in (select id from _q3r_retour) order by id for update;
-- create temporary table _q3r_retour_noeuds as
-- 	select r.id,
-- 	       case when r.avant_sous_notion is null then an.id else asn.id end as avant,
-- 	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
-- 	  from _q3r_retour r
-- 	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
-- 	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
-- 	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
-- 	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
-- 	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
-- 	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
-- -- Clé : deux nœuds homonymes sous un même parent dupliqueraient les lignes et feraient échouer ici.
-- alter table _q3r_retour_noeuds add primary key (id);
-- alter table _q3r_retour_tags add column point_id uuid;
-- update _q3r_retour_tags t set point_id = p.id
--   from public.curriculum_points p
--  where p.grade = t.grade and p.code = t.code and p.archived_at is null;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _q3r_retour_noeuds where avant is null or apres is null)
-- 	   or exists (select 1 from _q3r_retour_tags where point_id is null) then
-- 		raise exception 'rollback : chemins ou points introuvables';
-- 	end if;
-- 	select count(*), count(*) filter (where q.grades = r.grades_apres and q.status = r.statut_apres
-- 	                                     and q.classification_node_id = x.apres)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q
-- 	  join _q3r_retour r on r.id = q.id
-- 	  join _q3r_retour_noeuds x on x.id = q.id;
-- 	if v_presents not in (0, 17) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 17', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ont encore le nœud, les niveaux et le statut de la migration', v_intacts, v_presents;
-- 	end if;
-- 	-- Tags : exactement les 16 laissés par la migration (posés et gardés), rien d'autre (tout niveau).
-- 	select count(*), count(*) filter (where exists (select 1 from _q3r_retour_tags t
-- 	                                                where t.apres and t.template_id = q.template_id and t.point_id = q.point_id))
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _q3r_retour r on r.id = q.template_id;
-- 	if v_tags <> v_total or v_total <> least(v_presents, 1) * 16 then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, least(v_presents, 1) * 16;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _q3r_retour_tags t
--  where t.apres and not t.avant and q.template_id = t.template_id and q.point_id = t.point_id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q
--    set classification_node_id = x.avant, grades = r.grades_avant, status = r.statut_avant
--   from _q3r_retour r join _q3r_retour_noeuds x on x.id = r.id
--  where q.id = r.id;
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- insert into public.question_template_points (template_id, point_id)
-- select t.template_id, t.point_id
--   from _q3r_retour_tags t
--   join public.question_templates q on q.id = t.template_id
--  where t.avant and not t.apres;
-- do $retour$
-- declare v_presents integer; v_total integer; v_reposes integer;
-- begin
-- 	select count(*) into v_presents from _q3r_retour r join public.question_templates q on q.id = r.id;
-- 	select count(*), count(*) filter (where exists (select 1 from _q3r_retour_tags t
-- 	                                                where t.avant and t.template_id = q.template_id and t.point_id = q.point_id))
-- 	  into v_total, v_reposes
-- 	  from public.question_template_points q
-- 	  join _q3r_retour r on r.id = q.template_id;
-- 	if v_reposes <> v_total or v_total <> least(v_presents, 1) * 0 then
-- 		raise exception 'rollback : % tag(s) reposé(s) sur %, attendus %', v_reposes, v_total, least(v_presents, 1) * 0;
-- 	end if;
-- end $retour$;
-- drop table _q3r_retour_noeuds;
-- drop table _q3r_retour_tags;
-- drop table _q3r_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._q3r_modeles;
drop table if exists pg_temp._q3r_tags;
create temporary table _q3r_modeles (
	id uuid primary key,
	avant_branche text not null, avant_notion text not null, avant_sous_notion text,
	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
	grades_avant text[] not null,
	grades_apres text[] not null,
	statut_avant text not null,
	statut_apres text not null
);
create temporary table _q3r_tags (
	template_id uuid not null,
	grade text not null,
	code text not null,
	avant boolean not null,
	apres boolean not null,
	primary key (template_id, grade, code)
);
insert into _q3r_modeles values
	('15368b02-73cc-4f0d-b978-fa0d0848eb03', 'Nombres et calculs', 'Puissances : sens et écritures', 'définition',
	 'Nombres et calculs', 'Puissances : sens et écritures', 'définition', array['4'], array['3'], 'published', 'published'),
	('17f3dfcd-01e4-460f-9b94-40be348c2ed7', 'Nombres et calculs', 'Puissances : calculs', 'puissance de puissance',
	 'Nombres et calculs', 'Puissances : calculs', 'puissance de puissance', array['4'], array['3'], 'published', 'published'),
	('1db08bdc-e262-464c-9a51-b77b281e0510', 'Nombres et calculs', 'Puissances : calculs', 'quotient de puissances',
	 'Nombres et calculs', 'Puissances : calculs', 'quotient de puissances', array['4'], array['3'], 'published', 'published'),
	('2bdb3db6-8ef7-43af-aa7a-2332e34d2a01', 'Fonctions', 'Fonctions affines', 'équations',
	 'Algèbre', 'Équations : premier degré', 'ax + b = c', array['3'], array['4'], 'published', 'published'),
	('336451af-1329-4e38-adf3-01a857455c1d', 'Fonctions', 'Fonctions affines', 'coefficient directeur et ordonnée à l''origine',
	 'Géométrie', 'Géométrie repérée', 'intersection de deux droites', array['3'], array['2'], 'published', 'published'),
	('54107079-218f-48dd-8df4-3cb4d1f5a801', 'Algèbre', 'Calcul littéral', 'développement',
	 'Algèbre', 'Calcul littéral', 'développement', array['3'], array['4'], 'published', 'published'),
	('5b627bb7-201f-4482-91e7-58b98604a4f9', 'Nombres et calculs', 'Puissances : calculs', 'produit de puissances',
	 'Nombres et calculs', 'Puissances : calculs', 'produit de puissances', array['4'], array['3'], 'published', 'published'),
	('65110463-afc0-4dfd-91b3-977fd7402de7', 'Nombres et calculs', 'Fractions : calculs', 'inverse',
	 'Nombres et calculs', 'Puissances : sens et écritures', 'définition', array['4'], array['3'], 'published', 'published'),
	('743c0809-885f-4536-bad4-267cffbb1ae7', 'Nombres et calculs', 'Puissances : calculs', 'quotient de puissances',
	 'Nombres et calculs', 'Puissances : calculs', 'quotient de puissances', array['4'], array['3'], 'published', 'published'),
	('7c0ee046-124a-4f90-a84a-9a41042804f7', 'Fonctions', 'Fonctions affines', 'variations et signe',
	 'Fonctions', 'Fonctions affines', 'variations et signe', array['3'], array['2'], 'published', 'published'),
	('8ac99be4-a6be-4c89-90c8-c7d8974313f4', 'Nombres et calculs', 'Puissances : calculs', null,
	 'Nombres et calculs', 'Puissances : calculs', 'quotient de puissances', array['4'], array['3'], 'published', 'published'),
	('953574d4-e345-4a5d-9435-7faecc3ff7ac', 'Nombres et calculs', 'Puissances : sens et écritures', 'notation scientifique',
	 'Nombres et calculs', 'Puissances : sens et écritures', 'notation scientifique', array['4'], array['3'], 'published', 'published'),
	('9f380957-48db-4b31-9f28-61fc4bfb5420', 'Nombres et calculs', 'Puissances : sens et écritures', 'notation scientifique',
	 'Nombres et calculs', 'Puissances : sens et écritures', 'notation scientifique', array['4'], array['3'], 'published', 'published'),
	('ac5d0413-2eee-4bed-998b-d540701667a0', 'Algèbre', 'Calcul littéral', 'réduction',
	 'Algèbre', 'Calcul littéral', 'réduction', array['3'], array['5'], 'published', 'published'),
	('bb9cff7b-f2c7-40ce-af3c-249970ad0a9e', 'Nombres et calculs', 'Puissances : calculs', 'produit de puissances',
	 'Nombres et calculs', 'Puissances : calculs', 'produit de puissances', array['4'], array['3'], 'published', 'published'),
	('bba95c2d-033b-4648-944d-102a3c2c386d', 'Fonctions', 'Fonctions affines', 'variations et signe',
	 'Fonctions', 'Fonctions affines', 'variations et signe', array['3'], array['2'], 'published', 'published'),
	('c9d6c5db-e067-4056-9db9-4130485cb16a', 'Nombres et calculs', 'Fractions : sens et écritures', 'simplification',
	 'Nombres et calculs', 'Fractions : sens et écritures', 'simplification', array['4'], array['3'], 'published', 'published');
insert into _q3r_tags values
	('15368b02-73cc-4f0d-b978-fa0d0848eb03', '3', '3-004', false, true),
	('1db08bdc-e262-464c-9a51-b77b281e0510', '3', '3-052', false, true),
	('2bdb3db6-8ef7-43af-aa7a-2332e34d2a01', '4', '4-024', false, true),
	('336451af-1329-4e38-adf3-01a857455c1d', '2', '2-318', false, true),
	('54107079-218f-48dd-8df4-3cb4d1f5a801', '4', '4-022', false, true),
	('5b627bb7-201f-4482-91e7-58b98604a4f9', '3', '3-005', false, true),
	('65110463-afc0-4dfd-91b3-977fd7402de7', '3', '3-004', false, true),
	('743c0809-885f-4536-bad4-267cffbb1ae7', '3', '3-052', false, true),
	('7c0ee046-124a-4f90-a84a-9a41042804f7', '2', '2-348', false, true),
	('8ac99be4-a6be-4c89-90c8-c7d8974313f4', '3', '3-052', false, true),
	('953574d4-e345-4a5d-9435-7faecc3ff7ac', '3', '3-006', false, true),
	('9f380957-48db-4b31-9f28-61fc4bfb5420', '3', '3-006', false, true),
	('ac5d0413-2eee-4bed-998b-d540701667a0', '5', '5-039', false, true),
	('bb9cff7b-f2c7-40ce-af3c-249970ad0a9e', '3', '3-005', false, true),
	('bba95c2d-033b-4648-944d-102a3c2c386d', '2', '2-328', false, true),
	('c9d6c5db-e067-4056-9db9-4130485cb16a', '3', '3-001', false, true);

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q3r_modeles order by id;
select 1 from public.question_templates where id in (select id from _q3r_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
drop table if exists pg_temp._q3r_noeuds;
create temporary table _q3r_noeuds as
	select r.id,
	       case when r.avant_sous_notion is null then an.id else asn.id end as avant,
	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
	  from _q3r_modeles r
	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
-- Clé : deux nœuds homonymes sous un même parent dupliqueraient les lignes et feraient échouer ici.
alter table _q3r_noeuds add primary key (id);
alter table _q3r_tags add column point_id uuid;
update _q3r_tags t set point_id = p.id
  from public.curriculum_points p
 where p.grade = t.grade and p.code = t.code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _q3r_noeuds where avant is null or apres is null)
	   or exists (select 1 from _q3r_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s) de modèle, % point(s)',
			(select count(*) from _q3r_noeuds where avant is null or apres is null),
			(select count(*) from _q3r_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, nœud, niveaux et statut relevés, tags EXACTEMENT relevés ---
do $garde$
declare v_presents integer; v_ecarts integer; v_niveaux integer; v_statuts integer; v_detail text;
begin
	select count(*) into v_presents from _q3r_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 17) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 17', v_presents;
	end if;
	select count(*) into v_ecarts from _q3r_noeuds x
	  join public.question_templates q on q.id = x.id
	 where q.classification_node_id is distinct from x.avant;
	if v_ecarts <> 0 then
		raise exception 'modèles déplacés depuis le relevé : %', v_ecarts;
	end if;
	select count(*) into v_niveaux from _q3r_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from r.grades_avant;
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _q3r_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from r.statut_avant;
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	-- « + » : tag en base non relevé (tout niveau) ; « - » : tag relevé absent de la base
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || left(q.template_id::text, 8) || ' ' || p.code as r
		   from public.question_template_points q
		   join _q3r_modeles m on m.id = q.template_id
		   join public.curriculum_points p on p.id = q.point_id
		  where not exists (select 1 from _q3r_tags t where t.template_id = q.template_id and t.point_id = q.point_id and t.avant))
		union all
		(select '-' || left(t.template_id::text, 8) || ' ' || t.code
		   from _q3r_tags t
		   join public.question_templates q on q.id = t.template_id
		  where t.avant
		    and not exists (select 1 from public.question_template_points u where u.template_id = t.template_id and u.point_id = t.point_id))) d;
	if v_detail is not null then
		raise exception 'tags différents du relevé : %', v_detail;
	end if;
end $garde$;

-- ---- 4. Retraits, déplacements, niveaux, statut, poses ---------------------------------
delete from public.question_template_points q
 using _q3r_tags t
 where q.template_id = t.template_id and q.point_id = t.point_id and t.avant and not t.apres;

-- R2 : les modèles passent sur le nœud de leur point AVANT les tags (le trigger des tags lit le
-- nœud du modèle).
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = x.apres
  from _q3r_noeuds x
 where q.id = x.id and q.classification_node_id is distinct from x.apres;
update public.question_templates q set grades = r.grades_apres
  from _q3r_modeles r
 where q.id = r.id and q.grades is distinct from r.grades_apres;
update public.question_templates q set status = r.statut_apres
  from _q3r_modeles r
 where q.id = r.id and q.status is distinct from r.statut_apres;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.template_id, t.point_id
  from _q3r_tags t
  join public.question_templates q on q.id = t.template_id
 where t.apres and not t.avant;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_niveaux integer; v_statuts integer; v_total integer; v_tags integer; v_tags_attendus integer;
begin
	select count(*) into v_presents from _q3r_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q3r_noeuds x
	  join public.question_templates q on q.id = x.id and q.classification_node_id = x.apres;
	select count(*) into v_niveaux from _q3r_modeles r
	  join public.question_templates q on q.id = r.id and q.grades = r.grades_apres;
	select count(*) into v_statuts from _q3r_modeles r
	  join public.question_templates q on q.id = r.id and q.status = r.statut_apres;
	-- tags de ces modèles (tout niveau) : tous, et ceux du lot d'après (doivent coïncider)
	select count(*), count(*) filter (where exists (select 1 from _q3r_tags t
	                                                where t.template_id = q.template_id and t.point_id = q.point_id and t.apres))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q3r_modeles m on m.id = q.template_id;
	-- Base sans les modèles (locale) : aucun tag attendu.
	v_tags_attendus := least(v_presents, 1) * 16;
	if v_noeuds <> v_presents or v_niveaux <> v_presents or v_statuts <> v_presents
	   or v_tags <> v_tags_attendus or v_total <> v_tags_attendus then
		raise exception 'lot incohérent : nœuds %/%, niveaux %/%, statuts %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_niveaux, v_presents, v_statuts, v_presents, v_tags, v_tags_attendus, v_total;
	end if;
end $check$;

drop table _q3r_noeuds;
drop table _q3r_tags;
drop table _q3r_modeles;
