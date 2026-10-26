-- ============================================================================
-- Chantier « questions-ce1 », lot 0 (corrections) : rangement, tags, niveaux et statut de 9 modèles
-- ============================================================================
--   - 9827242b, 495a397f, 3eedd905 (décompositions) : CE1-006 retiré, CE1-005 posé ; les modèles
--     passent de la sous-notion « décomposition » à « écritures », où vit CE1-005 (sans quoi
--     question_template_points_check_rules refuse le tag) ;
--   - e94c03b6 (produit astucieux) : CE1-024 retiré, nœud « calcul astucieux » gardé ;
--   - 47f97c9f (double, doublon de 022130ca) : repassé en BROUILLON ; nœud et tag CE1-028 gardés ;
--   - 810f1824, 7d2d412b, 579d0b00, de71495c (sommes et différences hors bornes du CE1) : niveaux
--     [CE1] → [CE2] ; aucun tag, nœud inchangé.
-- Le contenu ne change pas ici (les 3 modèles réécrits sont dans la migration précédente,
-- 20261027000000_questions_ce1_contenu, et ne figurent pas dans celle-ci) : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-10-26 (journal docs/wip/questions-ce1-progress.md § 5). Écrite
-- à la main : le générateur des lots de contenu ne sait ni retirer un tag ni changer un statut.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (9 modèles). Elle est prouvée
-- par tests/integration/questions-ce1-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (nœud, niveaux, statut et tags d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore au nœud, aux niveaux et au statut relevés le 2026-10-26, et
-- porter EXACTEMENT les tags relevés (sinon une saisie faite depuis serait écrasée ou contredite).
-- Les nœuds sont désignés par leur chemin, résolu STRICTEMENT.
--
-- Données d'élèves : aucune (relevé du 2026-10-26 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal, 0 exercice de chapitre, 0 favori).
--
-- Accès (question tranchée par David le 2026-10-26) : les élèves et le prof du CE2 voient 4 modèles
-- publiés de plus ; ceux du CE1 ne voient plus ces 4 modèles ni 47f97c9f (brouillon : admin seul).
-- Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les tags posés, rend aux modèles leur nœud, leurs
-- niveaux et leur statut d'avant, puis repose CE1-006 et CE1-024. Bloc éprouvé par le test
-- d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL
-- en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('3eedd905-1526-4c90-9005-eb1df389a9f9'::uuid), ('47f97c9f-5117-4817-8d10-7c17777397d8'::uuid),
--                ('495a397f-23b6-4bc4-82c3-2974b234b275'::uuid), ('579d0b00-b3a5-46e6-a076-04ec265c1c4f'::uuid),
--                ('7d2d412b-843c-446f-8394-2a31856556d5'::uuid), ('810f1824-18ac-48e5-bf15-1c0b3854f78b'::uuid),
--                ('9827242b-fbcd-4b63-8003-2b898372be63'::uuid), ('de71495c-b88c-4b42-9cd7-3562847aedfc'::uuid),
--                ('e94c03b6-604f-4074-8763-0744b97cb7dd'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('9827242b-fbcd-4b63-8003-2b898372be63'::uuid, 'CE1', 'CE1-005'),
-- 	('495a397f-23b6-4bc4-82c3-2974b234b275'::uuid, 'CE1', 'CE1-005'),
-- 	('3eedd905-1526-4c90-9005-eb1df389a9f9'::uuid, 'CE1', 'CE1-005')
--  ) as r(id, grade, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q set classification_node_id = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = 'Nombres et calculs'
--    and n.name = 'Entiers : numération' and s.name = 'décomposition'
--    and q.id in ('9827242b-fbcd-4b63-8003-2b898372be63', '495a397f-23b6-4bc4-82c3-2974b234b275', '3eedd905-1526-4c90-9005-eb1df389a9f9');
-- update public.question_templates set grades = array['CE1']
--  where id in ('810f1824-18ac-48e5-bf15-1c0b3854f78b', '7d2d412b-843c-446f-8394-2a31856556d5',
--               '579d0b00-b3a5-46e6-a076-04ec265c1c4f', 'de71495c-b88c-4b42-9cd7-3562847aedfc');
-- update public.question_templates set status = 'published' where id = '47f97c9f-5117-4817-8d10-7c17777397d8';
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- insert into public.question_template_points (template_id, point_id)
-- select q.id, p.id from public.question_templates q
--   join (values
-- 	('9827242b-fbcd-4b63-8003-2b898372be63'::uuid, 'CE1-006'),
-- 	('495a397f-23b6-4bc4-82c3-2974b234b275'::uuid, 'CE1-006'),
-- 	('3eedd905-1526-4c90-9005-eb1df389a9f9'::uuid, 'CE1-006'),
-- 	('e94c03b6-604f-4074-8763-0744b97cb7dd'::uuid, 'CE1-024')
--   ) as r(id, code) on r.id = q.id
--   join public.curriculum_points p on p.grade = 'CE1' and p.code = r.code and p.archived_at is null;
-- do $retour$
-- declare v_presents integer; v_reposes integer;
-- begin
-- 	select count(*) into v_presents from public.question_templates
-- 	 where id in ('9827242b-fbcd-4b63-8003-2b898372be63', '495a397f-23b6-4bc4-82c3-2974b234b275',
-- 	              '3eedd905-1526-4c90-9005-eb1df389a9f9', 'e94c03b6-604f-4074-8763-0744b97cb7dd');
-- 	select count(*) into v_reposes from public.question_template_points q
-- 	  join public.curriculum_points p on p.id = q.point_id
-- 	  join (values
-- 		('9827242b-fbcd-4b63-8003-2b898372be63'::uuid, 'CE1-006'),
-- 		('495a397f-23b6-4bc4-82c3-2974b234b275'::uuid, 'CE1-006'),
-- 		('3eedd905-1526-4c90-9005-eb1df389a9f9'::uuid, 'CE1-006'),
-- 		('e94c03b6-604f-4074-8763-0744b97cb7dd'::uuid, 'CE1-024')
-- 	  ) as r(id, code) on r.id = q.template_id and p.grade = 'CE1' and p.code = r.code;
-- 	if v_reposes <> v_presents then
-- 		raise exception 'rollback : % tag(s) reposé(s) sur %', v_reposes, v_presents;
-- 	end if;
-- end $retour$;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._qce1_modeles;
drop table if exists pg_temp._qce1_tags;
create temporary table _qce1_modeles (
	id uuid primary key,
	avant_branche text not null, avant_notion text not null, avant_sous_notion text,
	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
	grades_avant text[] not null,
	grades_apres text[] not null,
	statut_avant text not null,
	statut_apres text not null
);
create temporary table _qce1_tags (
	template_id uuid not null,
	grade text not null,
	code text not null,
	avant boolean not null,
	apres boolean not null,
	primary key (template_id, grade, code)
);
insert into _qce1_modeles values
	('3eedd905-1526-4c90-9005-eb1df389a9f9', 'Nombres et calculs', 'Entiers : numération', 'décomposition',
	 'Nombres et calculs', 'Entiers : numération', 'écritures', array['CE1'], array['CE1'], 'published', 'published'),
	('47f97c9f-5117-4817-8d10-7c17777397d8', 'Nombres et calculs', 'Entiers : multiplication', 'double et moitié',
	 'Nombres et calculs', 'Entiers : multiplication', 'double et moitié', array['CE1'], array['CE1'], 'published', 'draft'),
	('495a397f-23b6-4bc4-82c3-2974b234b275', 'Nombres et calculs', 'Entiers : numération', 'décomposition',
	 'Nombres et calculs', 'Entiers : numération', 'écritures', array['CE1'], array['CE1'], 'published', 'published'),
	('579d0b00-b3a5-46e6-a076-04ec265c1c4f', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux',
	 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux', array['CE1'], array['CE2'], 'published', 'published'),
	('7d2d412b-843c-446f-8394-2a31856556d5', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux',
	 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux', array['CE1'], array['CE2'], 'published', 'published'),
	('810f1824-18ac-48e5-bf15-1c0b3854f78b', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux',
	 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux', array['CE1'], array['CE2'], 'published', 'published'),
	('9827242b-fbcd-4b63-8003-2b898372be63', 'Nombres et calculs', 'Entiers : numération', 'décomposition',
	 'Nombres et calculs', 'Entiers : numération', 'écritures', array['CE1'], array['CE1'], 'published', 'published'),
	('de71495c-b88c-4b42-9cd7-3562847aedfc', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux',
	 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux', array['CE1'], array['CE2'], 'published', 'published'),
	('e94c03b6-604f-4074-8763-0744b97cb7dd', 'Nombres et calculs', 'Entiers : multiplication', 'calcul astucieux',
	 'Nombres et calculs', 'Entiers : multiplication', 'calcul astucieux', array['CE1'], array['CE1'], 'published', 'published');
insert into _qce1_tags values
	('9827242b-fbcd-4b63-8003-2b898372be63', 'CE1', 'CE1-006', true, false),
	('9827242b-fbcd-4b63-8003-2b898372be63', 'CE1', 'CE1-005', false, true),
	('495a397f-23b6-4bc4-82c3-2974b234b275', 'CE1', 'CE1-006', true, false),
	('495a397f-23b6-4bc4-82c3-2974b234b275', 'CE1', 'CE1-005', false, true),
	('3eedd905-1526-4c90-9005-eb1df389a9f9', 'CE1', 'CE1-006', true, false),
	('3eedd905-1526-4c90-9005-eb1df389a9f9', 'CE1', 'CE1-005', false, true),
	('e94c03b6-604f-4074-8763-0744b97cb7dd', 'CE1', 'CE1-024', true, false),
	('47f97c9f-5117-4817-8d10-7c17777397d8', 'CE1', 'CE1-028', true, true);

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qce1_modeles order by id;
select 1 from public.question_templates where id in (select id from _qce1_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
create temporary table _qce1_noeuds as
	select r.id,
	       case when r.avant_sous_notion is null then an.id else asn.id end as avant,
	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
	  from _qce1_modeles r
	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
alter table _qce1_tags add column point_id uuid;
update _qce1_tags t set point_id = p.id
  from public.curriculum_points p
 where p.grade = t.grade and p.code = t.code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _qce1_noeuds where avant is null or apres is null)
	   or exists (select 1 from _qce1_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s) de modèle, % point(s)',
			(select count(*) from _qce1_noeuds where avant is null or apres is null),
			(select count(*) from _qce1_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, nœud, niveaux et statut relevés, tags EXACTEMENT relevés ---
do $garde$
declare v_presents integer; v_ecarts integer; v_niveaux integer; v_statuts integer; v_detail text;
begin
	select count(*) into v_presents from _qce1_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 9) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 9', v_presents;
	end if;
	select count(*) into v_ecarts from _qce1_noeuds x
	  join public.question_templates q on q.id = x.id
	 where q.classification_node_id is distinct from x.avant;
	if v_ecarts <> 0 then
		raise exception 'modèles déplacés depuis le relevé : %', v_ecarts;
	end if;
	select count(*) into v_niveaux from _qce1_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from r.grades_avant;
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _qce1_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from r.statut_avant;
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	-- « + » : tag en base non relevé (tout niveau) ; « - » : tag relevé absent de la base
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || left(q.template_id::text, 8) || ' ' || p.code as r
		   from public.question_template_points q
		   join _qce1_modeles m on m.id = q.template_id
		   join public.curriculum_points p on p.id = q.point_id
		  where not exists (select 1 from _qce1_tags t where t.template_id = q.template_id and t.point_id = q.point_id and t.avant))
		union all
		(select '-' || left(t.template_id::text, 8) || ' ' || t.code
		   from _qce1_tags t
		   join public.question_templates q on q.id = t.template_id
		  where t.avant
		    and not exists (select 1 from public.question_template_points u where u.template_id = t.template_id and u.point_id = t.point_id))) d;
	if v_detail is not null then
		raise exception 'tags différents du relevé : %', v_detail;
	end if;
end $garde$;

-- ---- 4. Retraits, déplacement, niveaux, statut, poses ---------------------------------
delete from public.question_template_points q
 using _qce1_tags t
 where q.template_id = t.template_id and q.point_id = t.point_id and t.avant and not t.apres;

alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = x.apres
  from _qce1_noeuds x
 where q.id = x.id and q.classification_node_id is distinct from x.apres;
update public.question_templates q set grades = r.grades_apres
  from _qce1_modeles r
 where q.id = r.id and q.grades is distinct from r.grades_apres;
update public.question_templates q set status = r.statut_apres
  from _qce1_modeles r
 where q.id = r.id and q.status is distinct from r.statut_apres;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.template_id, t.point_id
  from _qce1_tags t
  join public.question_templates q on q.id = t.template_id
 where t.apres and not t.avant;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_niveaux integer; v_statuts integer; v_total integer; v_tags integer; v_tags_attendus integer;
begin
	select count(*) into v_presents from _qce1_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qce1_noeuds x
	  join public.question_templates q on q.id = x.id and q.classification_node_id = x.apres;
	select count(*) into v_niveaux from _qce1_modeles r
	  join public.question_templates q on q.id = r.id and q.grades = r.grades_apres;
	select count(*) into v_statuts from _qce1_modeles r
	  join public.question_templates q on q.id = r.id and q.status = r.statut_apres;
	-- tags de ces modèles (tout niveau) : tous, et ceux du lot d'après (doivent coïncider)
	select count(*), count(*) filter (where exists (select 1 from _qce1_tags t
	                                                where t.template_id = q.template_id and t.point_id = q.point_id and t.apres))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qce1_modeles m on m.id = q.template_id;
	-- Base sans les modèles (locale) : aucun tag attendu.
	v_tags_attendus := least(v_presents, 1) * 4;
	if v_noeuds <> v_presents or v_niveaux <> v_presents or v_statuts <> v_presents
	   or v_tags <> v_tags_attendus or v_total <> v_tags_attendus then
		raise exception 'lot incohérent : nœuds %/%, niveaux %/%, statuts %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_niveaux, v_presents, v_statuts, v_presents, v_tags, v_tags_attendus, v_total;
	end if;
end $check$;

drop table _qce1_noeuds;
drop table _qce1_tags;
drop table _qce1_modeles;
