-- ============================================================================
-- Chantier « questions-3 », lot 6 (translation, vecteurs, sphère, sections) : nœuds, niveaux et tags de 8 modèles
-- ============================================================================
--   les 7 brouillons du lot 6, créés sans nœud ni tag, vont sur le nœud de leur point, tag posé :
--   ff3bd841 (Vecteurs égaux, opposés, nul) → 3-025, « Vecteurs > égalité de vecteurs » ;
--   787cc937 (Somme de deux vecteurs) → 3-026 et d157dfb2 (Relation de Chasles) → 3-027,
--   « Vecteurs > somme et relation de Chasles » ; 6bcb3535 (Boule ou sphère ?) → 3-018 et cd756e21
--   (Grands cercles et diamètre d'une sphère) → 3-019, « Solides > propriétés » ; 87f79961 (Volume
--   d'une boule) → 3-021, « Volumes > boule » ; 7bb95104 (Sections de solides) → 3-020, « Solides >
--   sections planes » ;
--   le modèle PUBLIÉ de 4e c8306505 (Translation et parallélogramme) passe en grades {4, 3} : tag
--   4-031 gardé, 3-024 posé ; son nœud (« Géométrie > Translations ») ne change pas.
-- Bilan : 7 rangés sur un nœud, 1 niveaux changés (3e ajoutée), 0 tag retiré, 8 posés, 1 gardés.
-- Aucun statut ne change. Le contenu ne change pas : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-01 (journal docs/wip/questions-3-progress.md § 13, 13.6). Les 7
-- brouillons ont été créés le 2026-11-01 par scripts/create-questions.ts (scripts/questions/3-lot-6/,
-- #2091), qui ne pose ni nœud ni tag. Fichier GÉNÉRÉ par docs/wip/questions/lot-rangement-3-6.py
-- (relevé de la prod du 2026-11-01) — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle et
-- ses vérifications le tolèrent ; elle exige TOUT ou RIEN (8 modèles). Elle est prouvée par
-- tests/integration/questions-3-lot6-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (nœud, niveaux, statut et tags d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore à son nœud, aux niveaux et au statut relevés le
-- 2026-11-01, et porter EXACTEMENT les tags relevés : sinon une saisie faite depuis serait
-- écrasée ou contredite. Les nœuds sont désignés par leur chemin, résolu STRICTEMENT.
--
-- Données d'élèves : aucune n'est touchée. c8306505 est publié (des élèves de 4e ont pu y répondre) :
-- seuls ses niveaux et ses tags changent, ni son contenu ni ses réponses.
--
-- Accès (question tranchée par David le 2026-11-01, phase 0 du lot 6, § 13.5) : les élèves et le
-- prof de 3e voient 1 modèle publié de plus (c8306505) ; la 4e ne perd rien ; les brouillons restent
-- hors de la vue des élèves. Aucune règle (policy) ne change.
--
-- Rollback : il ne touche aucune donnée d'élève, mais rendre c8306505 à la seule 4e le
-- retire aux élèves de 3e qui l'auraient reçu depuis : mesurer d'abord (lecture seule) ses usages
-- en 3e. Il retire les 8 tags posés, repose les 0 retirés, rend aux
-- modèles leur nœud (ou aucun), leurs niveaux et leur statut d'avant. Garde : il refuse si un modèle n'a plus EXACTEMENT le nœud, les
-- niveaux, le statut et les tags laissés par la migration (sinon une saisie faite depuis serait
-- écrasée en silence). Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q3l6_retour_noeuds;
-- drop table if exists pg_temp._q3l6_retour_tags;
-- drop table if exists pg_temp._q3l6_retour;
-- create temporary table _q3l6_retour (
-- 	id uuid primary key,
-- 	avant_branche text, avant_notion text, avant_sous_notion text,
-- 	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
-- 	grades_avant text[] not null, grades_apres text[] not null,
-- 	statut_avant text not null, statut_apres text not null
-- );
-- insert into _q3l6_retour values
-- 	('6bcb3535-6632-4659-9a83-23a740b8e685', null, null, null,
-- 	 'Géométrie', 'Solides', 'propriétés', array['3'], array['3'], 'draft', 'draft'),
-- 	('787cc937-5bc7-435f-9a63-7d4d0f102ea1', null, null, null,
-- 	 'Géométrie', 'Vecteurs', 'somme et relation de Chasles', array['3'], array['3'], 'draft', 'draft'),
-- 	('7bb95104-9256-4bdb-a481-bdd2aae66a67', null, null, null,
-- 	 'Géométrie', 'Solides', 'sections planes', array['3'], array['3'], 'draft', 'draft'),
-- 	('87f79961-03c8-44af-98b5-438165d2f689', null, null, null,
-- 	 'Grandeurs et mesures', 'Volumes', 'boule', array['3'], array['3'], 'draft', 'draft'),
-- 	('c8306505-e030-4d65-8a56-3271669f28b5', 'Géométrie', 'Translations', null,
-- 	 'Géométrie', 'Translations', null, array['4'], array['4', '3'], 'published', 'published'),
-- 	('cd756e21-af71-4922-8106-8387658a45e1', null, null, null,
-- 	 'Géométrie', 'Solides', 'propriétés', array['3'], array['3'], 'draft', 'draft'),
-- 	('d157dfb2-3666-484d-93f9-9fe46a0e2fcf', null, null, null,
-- 	 'Géométrie', 'Vecteurs', 'somme et relation de Chasles', array['3'], array['3'], 'draft', 'draft'),
-- 	('ff3bd841-6d22-40f6-a4e3-4ddc7e017905', null, null, null,
-- 	 'Géométrie', 'Vecteurs', 'égalité de vecteurs', array['3'], array['3'], 'draft', 'draft');
-- create temporary table _q3l6_retour_tags (template_id uuid not null, grade text not null, code text not null, avant boolean not null, apres boolean not null);
-- insert into _q3l6_retour_tags values
-- 	('6bcb3535-6632-4659-9a83-23a740b8e685', '3', '3-018', false, true),
-- 	('787cc937-5bc7-435f-9a63-7d4d0f102ea1', '3', '3-026', false, true),
-- 	('7bb95104-9256-4bdb-a481-bdd2aae66a67', '3', '3-020', false, true),
-- 	('87f79961-03c8-44af-98b5-438165d2f689', '3', '3-021', false, true),
-- 	('c8306505-e030-4d65-8a56-3271669f28b5', '3', '3-024', false, true),
-- 	('c8306505-e030-4d65-8a56-3271669f28b5', '4', '4-031', true, true),
-- 	('cd756e21-af71-4922-8106-8387658a45e1', '3', '3-019', false, true),
-- 	('d157dfb2-3666-484d-93f9-9fe46a0e2fcf', '3', '3-027', false, true),
-- 	('ff3bd841-6d22-40f6-a4e3-4ddc7e017905', '3', '3-025', false, true);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _q3l6_retour order by id;
-- select 1 from public.question_templates where id in (select id from _q3l6_retour) order by id for update;
-- create temporary table _q3l6_retour_noeuds as
-- 	select r.id, r.avant_branche,
-- 	       case when r.avant_branche is null then null when r.avant_sous_notion is null then an.id else asn.id end as avant,
-- 	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
-- 	  from _q3l6_retour r
-- 	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
-- 	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
-- 	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
-- 	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
-- 	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
-- 	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
-- -- Clé : deux nœuds homonymes sous un même parent dupliqueraient les lignes et feraient échouer ici.
-- alter table _q3l6_retour_noeuds add primary key (id);
-- alter table _q3l6_retour_tags add column point_id uuid;
-- update _q3l6_retour_tags t set point_id = p.id
--   from public.curriculum_points p
--  where p.grade = t.grade and p.code = t.code and p.archived_at is null;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _q3l6_retour_noeuds where (avant is null and avant_branche is not null) or apres is null)
-- 	   or exists (select 1 from _q3l6_retour_tags where point_id is null) then
-- 		raise exception 'rollback : chemins ou points introuvables';
-- 	end if;
-- 	select count(*), count(*) filter (where q.grades = r.grades_apres and q.status = r.statut_apres
-- 	                                     and q.classification_node_id = x.apres)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q
-- 	  join _q3l6_retour r on r.id = q.id
-- 	  join _q3l6_retour_noeuds x on x.id = q.id;
-- 	if v_presents not in (0, 8) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 8', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ont encore le nœud, les niveaux et le statut de la migration', v_intacts, v_presents;
-- 	end if;
-- 	-- Tags : exactement les 9 laissés par la migration (posés et gardés), rien d'autre (tout niveau).
-- 	select count(*), count(*) filter (where exists (select 1 from _q3l6_retour_tags t
-- 	                                                where t.apres and t.template_id = q.template_id and t.point_id = q.point_id))
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _q3l6_retour r on r.id = q.template_id;
-- 	if v_tags <> v_total or v_total <> least(v_presents, 1) * 9 then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, least(v_presents, 1) * 9;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _q3l6_retour_tags t
--  where t.apres and not t.avant and q.template_id = t.template_id and q.point_id = t.point_id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q
--    set classification_node_id = x.avant, grades = r.grades_avant, status = r.statut_avant
--   from _q3l6_retour r join _q3l6_retour_noeuds x on x.id = r.id
--  where q.id = r.id;
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- insert into public.question_template_points (template_id, point_id)
-- select t.template_id, t.point_id
--   from _q3l6_retour_tags t
--   join public.question_templates q on q.id = t.template_id
--  where t.avant and not t.apres;
-- do $retour$
-- declare v_presents integer; v_total integer; v_reposes integer;
-- begin
-- 	select count(*) into v_presents from _q3l6_retour r join public.question_templates q on q.id = r.id;
-- 	select count(*), count(*) filter (where exists (select 1 from _q3l6_retour_tags t
-- 	                                                where t.avant and t.template_id = q.template_id and t.point_id = q.point_id))
-- 	  into v_total, v_reposes
-- 	  from public.question_template_points q
-- 	  join _q3l6_retour r on r.id = q.template_id;
-- 	if v_reposes <> v_total or v_total <> least(v_presents, 1) * 1 then
-- 		raise exception 'rollback : % tag(s) reposé(s) sur %, attendus %', v_reposes, v_total, least(v_presents, 1) * 1;
-- 	end if;
-- end $retour$;
-- drop table _q3l6_retour_noeuds;
-- drop table _q3l6_retour_tags;
-- drop table _q3l6_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._q3l6_modeles;
drop table if exists pg_temp._q3l6_tags;
create temporary table _q3l6_modeles (
	id uuid primary key,
	avant_branche text, avant_notion text, avant_sous_notion text,
	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
	grades_avant text[] not null,
	grades_apres text[] not null,
	statut_avant text not null,
	statut_apres text not null
);
create temporary table _q3l6_tags (
	template_id uuid not null,
	grade text not null,
	code text not null,
	avant boolean not null,
	apres boolean not null,
	primary key (template_id, grade, code)
);
insert into _q3l6_modeles values
	('6bcb3535-6632-4659-9a83-23a740b8e685', null, null, null,
	 'Géométrie', 'Solides', 'propriétés', array['3'], array['3'], 'draft', 'draft'),
	('787cc937-5bc7-435f-9a63-7d4d0f102ea1', null, null, null,
	 'Géométrie', 'Vecteurs', 'somme et relation de Chasles', array['3'], array['3'], 'draft', 'draft'),
	('7bb95104-9256-4bdb-a481-bdd2aae66a67', null, null, null,
	 'Géométrie', 'Solides', 'sections planes', array['3'], array['3'], 'draft', 'draft'),
	('87f79961-03c8-44af-98b5-438165d2f689', null, null, null,
	 'Grandeurs et mesures', 'Volumes', 'boule', array['3'], array['3'], 'draft', 'draft'),
	('c8306505-e030-4d65-8a56-3271669f28b5', 'Géométrie', 'Translations', null,
	 'Géométrie', 'Translations', null, array['4'], array['4', '3'], 'published', 'published'),
	('cd756e21-af71-4922-8106-8387658a45e1', null, null, null,
	 'Géométrie', 'Solides', 'propriétés', array['3'], array['3'], 'draft', 'draft'),
	('d157dfb2-3666-484d-93f9-9fe46a0e2fcf', null, null, null,
	 'Géométrie', 'Vecteurs', 'somme et relation de Chasles', array['3'], array['3'], 'draft', 'draft'),
	('ff3bd841-6d22-40f6-a4e3-4ddc7e017905', null, null, null,
	 'Géométrie', 'Vecteurs', 'égalité de vecteurs', array['3'], array['3'], 'draft', 'draft');
insert into _q3l6_tags values
	('6bcb3535-6632-4659-9a83-23a740b8e685', '3', '3-018', false, true),
	('787cc937-5bc7-435f-9a63-7d4d0f102ea1', '3', '3-026', false, true),
	('7bb95104-9256-4bdb-a481-bdd2aae66a67', '3', '3-020', false, true),
	('87f79961-03c8-44af-98b5-438165d2f689', '3', '3-021', false, true),
	('c8306505-e030-4d65-8a56-3271669f28b5', '3', '3-024', false, true),
	('c8306505-e030-4d65-8a56-3271669f28b5', '4', '4-031', true, true),
	('cd756e21-af71-4922-8106-8387658a45e1', '3', '3-019', false, true),
	('d157dfb2-3666-484d-93f9-9fe46a0e2fcf', '3', '3-027', false, true),
	('ff3bd841-6d22-40f6-a4e3-4ddc7e017905', '3', '3-025', false, true);

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q3l6_modeles order by id;
select 1 from public.question_templates where id in (select id from _q3l6_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
drop table if exists pg_temp._q3l6_noeuds;
create temporary table _q3l6_noeuds as
	select r.id, r.avant_branche,
	       case when r.avant_branche is null then null when r.avant_sous_notion is null then an.id else asn.id end as avant,
	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
	  from _q3l6_modeles r
	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
-- Clé : deux nœuds homonymes sous un même parent dupliqueraient les lignes et feraient échouer ici.
alter table _q3l6_noeuds add primary key (id);
alter table _q3l6_tags add column point_id uuid;
update _q3l6_tags t set point_id = p.id
  from public.curriculum_points p
 where p.grade = t.grade and p.code = t.code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _q3l6_noeuds where (avant is null and avant_branche is not null) or apres is null)
	   or exists (select 1 from _q3l6_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s) de modèle, % point(s)',
			(select count(*) from _q3l6_noeuds where (avant is null and avant_branche is not null) or apres is null),
			(select count(*) from _q3l6_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, nœud, niveaux et statut relevés, tags EXACTEMENT relevés ---
do $garde$
declare v_presents integer; v_ecarts integer; v_niveaux integer; v_statuts integer; v_detail text;
begin
	select count(*) into v_presents from _q3l6_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 8) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 8', v_presents;
	end if;
	select count(*) into v_ecarts from _q3l6_noeuds x
	  join public.question_templates q on q.id = x.id
	 where q.classification_node_id is distinct from x.avant;
	if v_ecarts <> 0 then
		raise exception 'modèles déplacés depuis le relevé : %', v_ecarts;
	end if;
	select count(*) into v_niveaux from _q3l6_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from r.grades_avant;
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _q3l6_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from r.statut_avant;
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	-- « + » : tag en base non relevé (tout niveau) ; « - » : tag relevé absent de la base
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || left(q.template_id::text, 8) || ' ' || p.code as r
		   from public.question_template_points q
		   join _q3l6_modeles m on m.id = q.template_id
		   join public.curriculum_points p on p.id = q.point_id
		  where not exists (select 1 from _q3l6_tags t where t.template_id = q.template_id and t.point_id = q.point_id and t.avant))
		union all
		(select '-' || left(t.template_id::text, 8) || ' ' || t.code
		   from _q3l6_tags t
		   join public.question_templates q on q.id = t.template_id
		  where t.avant
		    and not exists (select 1 from public.question_template_points u where u.template_id = t.template_id and u.point_id = t.point_id))) d;
	if v_detail is not null then
		raise exception 'tags différents du relevé : %', v_detail;
	end if;
end $garde$;

-- ---- 4. Retraits, déplacements, niveaux, statut, poses ---------------------------------
delete from public.question_template_points q
 using _q3l6_tags t
 where q.template_id = t.template_id and q.point_id = t.point_id and t.avant and not t.apres;

-- R2 : les modèles passent sur le nœud de leur point AVANT les tags (le trigger des tags lit le
-- nœud du modèle).
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = x.apres
  from _q3l6_noeuds x
 where q.id = x.id and q.classification_node_id is distinct from x.apres;
update public.question_templates q set grades = r.grades_apres
  from _q3l6_modeles r
 where q.id = r.id and q.grades is distinct from r.grades_apres;
update public.question_templates q set status = r.statut_apres
  from _q3l6_modeles r
 where q.id = r.id and q.status is distinct from r.statut_apres;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.template_id, t.point_id
  from _q3l6_tags t
  join public.question_templates q on q.id = t.template_id
 where t.apres and not t.avant;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_niveaux integer; v_statuts integer; v_total integer; v_tags integer; v_tags_attendus integer;
begin
	select count(*) into v_presents from _q3l6_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q3l6_noeuds x
	  join public.question_templates q on q.id = x.id and q.classification_node_id = x.apres;
	select count(*) into v_niveaux from _q3l6_modeles r
	  join public.question_templates q on q.id = r.id and q.grades = r.grades_apres;
	select count(*) into v_statuts from _q3l6_modeles r
	  join public.question_templates q on q.id = r.id and q.status = r.statut_apres;
	-- tags de ces modèles (tout niveau) : tous, et ceux du lot d'après (doivent coïncider)
	select count(*), count(*) filter (where exists (select 1 from _q3l6_tags t
	                                                where t.template_id = q.template_id and t.point_id = q.point_id and t.apres))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q3l6_modeles m on m.id = q.template_id;
	-- Base sans les modèles (locale) : aucun tag attendu.
	v_tags_attendus := least(v_presents, 1) * 9;
	if v_noeuds <> v_presents or v_niveaux <> v_presents or v_statuts <> v_presents
	   or v_tags <> v_tags_attendus or v_total <> v_tags_attendus then
		raise exception 'lot incohérent : nœuds %/%, niveaux %/%, statuts %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_niveaux, v_presents, v_statuts, v_presents, v_tags, v_tags_attendus, v_total;
	end if;
end $check$;

drop table _q3l6_noeuds;
drop table _q3l6_tags;
drop table _q3l6_modeles;
