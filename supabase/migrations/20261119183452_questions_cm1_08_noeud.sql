-- ============================================================================
-- Chantier « questions-cm1 », modèle 08 du lot 9b : déplacement de 1dd68bdd vers sa sous-notion
-- ============================================================================
--   1dd68bdd (« Résoudre un problème de proportionnalité », CM1, publié) passe de
--   Proportionnalité > Situations de proportionnalité à … > quatrième proportionnelle, à côté du
--   modèle CM2 5343077e. Tag CM1-130 GARDÉ (point sur la notion, parent de la sous-notion).
-- Bilan : 1 rangés sur un nœud, 0 niveau changé, 0 tag retiré, 0 posés, 1 gardé.
-- Aucun statut ne change. Le contenu ne change pas : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-19 (journal docs/archive/wip/questions-cm1-progress.md § 26 quater,
-- 26 nonies ; aucun nœud créé). Le modèle a été rangé sur la notion par
-- 20261119145503_questions_cm1_lot9ab_rangement_tags (#2888), puis publié. Fichier GÉNÉRÉ par
-- docs/wip/questions/lot-cm1-08-noeud.py (relevé de la prod du 2026-11-19) — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle et
-- ses vérifications le tolèrent ; elle exige TOUT ou RIEN (1 modèle). Elle est prouvée par
-- tests/integration/questions-cm1-08-noeud.test.ts, qui fabrique des copies des
-- identifiants de la prod (nœud, niveaux, statut et tags d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore au nœud (ou sans nœud), aux niveaux et au statut relevés le
-- 2026-11-19, et porter EXACTEMENT les tags relevés : sinon une saisie faite depuis serait écrasée
-- ou contredite. Les nœuds sont désignés par leur chemin, résolu STRICTEMENT.
--
-- Données d'élèves : aucune ligne d'élève touchée.
--
-- Accès (question tranchée par David le 2026-11-19) : personne ne gagne d'accès. Le modèle, publié,
-- reste lisible comme avant ; seule sa place dans l'arbre des notions change. Aucune règle (policy)
-- ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 0 tags posés, repose les 0 retirés, rend aux
-- modèles leur nœud (ou aucun), leurs niveaux et leur statut d'avant. Garde : il refuse si un modèle n'a plus EXACTEMENT le nœud, les
-- niveaux, le statut et les tags laissés par la migration (sinon une saisie faite depuis serait
-- écrasée en silence). Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qcm1l08_retour_noeuds;
-- drop table if exists pg_temp._qcm1l08_retour_tags;
-- drop table if exists pg_temp._qcm1l08_retour;
-- create temporary table _qcm1l08_retour (
-- 	id uuid primary key,
-- 	avant_branche text, avant_notion text, avant_sous_notion text,
-- 	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
-- 	grades_avant text[] not null, grades_apres text[] not null,
-- 	statut_avant text not null, statut_apres text not null
-- );
-- insert into _qcm1l08_retour values
-- 	('1dd68bdd-2c62-4dd5-8908-b82b6a013a7d', 'Proportionnalité', 'Situations de proportionnalité', null,
-- 	 'Proportionnalité', 'Situations de proportionnalité', 'quatrième proportionnelle', array['CM1'], array['CM1'], 'published', 'published');
-- create temporary table _qcm1l08_retour_tags (template_id uuid not null, grade text not null, code text not null, avant boolean not null, apres boolean not null);
-- insert into _qcm1l08_retour_tags values
-- 	('1dd68bdd-2c62-4dd5-8908-b82b6a013a7d', 'CM1', 'CM1-130', true, true);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qcm1l08_retour order by id;
-- select 1 from public.question_templates where id in (select id from _qcm1l08_retour) order by id for update;
-- create temporary table _qcm1l08_retour_noeuds as
-- 	select r.id, r.avant_branche,
-- 	       case when r.avant_branche is null then null when r.avant_sous_notion is null then an.id else asn.id end as avant,
-- 	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
-- 	  from _qcm1l08_retour r
-- 	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
-- 	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
-- 	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
-- 	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
-- 	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
-- 	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
-- -- Clé : deux nœuds homonymes sous un même parent dupliqueraient les lignes et feraient échouer ici.
-- alter table _qcm1l08_retour_noeuds add primary key (id);
-- alter table _qcm1l08_retour_tags add column point_id uuid;
-- update _qcm1l08_retour_tags t set point_id = p.id
--   from public.curriculum_points p
--  where p.grade = t.grade and p.code = t.code and p.archived_at is null;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _qcm1l08_retour_noeuds where (avant is null and avant_branche is not null) or apres is null)
-- 	   or exists (select 1 from _qcm1l08_retour_tags where point_id is null) then
-- 		raise exception 'rollback : chemins ou points introuvables';
-- 	end if;
-- 	select count(*), count(*) filter (where q.grades = r.grades_apres and q.status = r.statut_apres
-- 	                                     and q.classification_node_id = x.apres)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q
-- 	  join _qcm1l08_retour r on r.id = q.id
-- 	  join _qcm1l08_retour_noeuds x on x.id = q.id;
-- 	if v_presents not in (0, 1) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 1', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ont encore le nœud, les niveaux et le statut de la migration', v_intacts, v_presents;
-- 	end if;
-- 	-- Tags : exactement les 1 laissés par la migration (posés et gardés), rien d'autre (tout niveau).
-- 	select count(*), count(*) filter (where exists (select 1 from _qcm1l08_retour_tags t
-- 	                                                where t.apres and t.template_id = q.template_id and t.point_id = q.point_id))
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _qcm1l08_retour r on r.id = q.template_id;
-- 	if v_tags <> v_total or v_total <> least(v_presents, 1) * 1 then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, least(v_presents, 1) * 1;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _qcm1l08_retour_tags t
--  where t.apres and not t.avant and q.template_id = t.template_id and q.point_id = t.point_id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q
--    set classification_node_id = x.avant, grades = r.grades_avant, status = r.statut_avant
--   from _qcm1l08_retour r join _qcm1l08_retour_noeuds x on x.id = r.id
--  where q.id = r.id;
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- insert into public.question_template_points (template_id, point_id)
-- select t.template_id, t.point_id
--   from _qcm1l08_retour_tags t
--   join public.question_templates q on q.id = t.template_id
--  where t.avant and not t.apres;
-- do $retour$
-- declare v_presents integer; v_total integer; v_reposes integer;
-- begin
-- 	select count(*) into v_presents from _qcm1l08_retour r join public.question_templates q on q.id = r.id;
-- 	select count(*), count(*) filter (where exists (select 1 from _qcm1l08_retour_tags t
-- 	                                                where t.avant and t.template_id = q.template_id and t.point_id = q.point_id))
-- 	  into v_total, v_reposes
-- 	  from public.question_template_points q
-- 	  join _qcm1l08_retour r on r.id = q.template_id;
-- 	if v_reposes <> v_total or v_total <> least(v_presents, 1) * 1 then
-- 		raise exception 'rollback : % tag(s) reposé(s) sur %, attendus %', v_reposes, v_total, least(v_presents, 1) * 1;
-- 	end if;
-- end $retour$;
-- drop table _qcm1l08_retour_noeuds;
-- drop table _qcm1l08_retour_tags;
-- drop table _qcm1l08_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._qcm1l08_modeles;
drop table if exists pg_temp._qcm1l08_tags;
create temporary table _qcm1l08_modeles (
	id uuid primary key,
	avant_branche text, avant_notion text, avant_sous_notion text,
	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
	grades_avant text[] not null,
	grades_apres text[] not null,
	statut_avant text not null,
	statut_apres text not null
);
create temporary table _qcm1l08_tags (
	template_id uuid not null,
	grade text not null,
	code text not null,
	avant boolean not null,
	apres boolean not null,
	primary key (template_id, grade, code)
);
insert into _qcm1l08_modeles values
	('1dd68bdd-2c62-4dd5-8908-b82b6a013a7d', 'Proportionnalité', 'Situations de proportionnalité', null,
	 'Proportionnalité', 'Situations de proportionnalité', 'quatrième proportionnelle', array['CM1'], array['CM1'], 'published', 'published');
insert into _qcm1l08_tags values
	('1dd68bdd-2c62-4dd5-8908-b82b6a013a7d', 'CM1', 'CM1-130', true, true);

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm1l08_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm1l08_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
drop table if exists pg_temp._qcm1l08_noeuds;
create temporary table _qcm1l08_noeuds as
	select r.id, r.avant_branche,
	       case when r.avant_branche is null then null when r.avant_sous_notion is null then an.id else asn.id end as avant,
	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
	  from _qcm1l08_modeles r
	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
-- Clé : deux nœuds homonymes sous un même parent dupliqueraient les lignes et feraient échouer ici.
alter table _qcm1l08_noeuds add primary key (id);
alter table _qcm1l08_tags add column point_id uuid;
update _qcm1l08_tags t set point_id = p.id
  from public.curriculum_points p
 where p.grade = t.grade and p.code = t.code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _qcm1l08_noeuds where (avant is null and avant_branche is not null) or apres is null)
	   or exists (select 1 from _qcm1l08_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s) de modèle, % point(s)',
			(select count(*) from _qcm1l08_noeuds where (avant is null and avant_branche is not null) or apres is null),
			(select count(*) from _qcm1l08_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, nœud, niveaux et statut relevés, tags EXACTEMENT relevés ---
do $garde$
declare v_presents integer; v_ecarts integer; v_niveaux integer; v_statuts integer; v_detail text;
begin
	select count(*) into v_presents from _qcm1l08_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 1) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 1', v_presents;
	end if;
	select count(*) into v_ecarts from _qcm1l08_noeuds x
	  join public.question_templates q on q.id = x.id
	 where q.classification_node_id is distinct from x.avant;
	if v_ecarts <> 0 then
		raise exception 'modèles déplacés depuis le relevé : %', v_ecarts;
	end if;
	select count(*) into v_niveaux from _qcm1l08_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from r.grades_avant;
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _qcm1l08_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from r.statut_avant;
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	-- « + » : tag en base non relevé (tout niveau) ; « - » : tag relevé absent de la base
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || left(q.template_id::text, 8) || ' ' || p.code as r
		   from public.question_template_points q
		   join _qcm1l08_modeles m on m.id = q.template_id
		   join public.curriculum_points p on p.id = q.point_id
		  where not exists (select 1 from _qcm1l08_tags t where t.template_id = q.template_id and t.point_id = q.point_id and t.avant))
		union all
		(select '-' || left(t.template_id::text, 8) || ' ' || t.code
		   from _qcm1l08_tags t
		   join public.question_templates q on q.id = t.template_id
		  where t.avant
		    and not exists (select 1 from public.question_template_points u where u.template_id = t.template_id and u.point_id = t.point_id))) d;
	if v_detail is not null then
		raise exception 'tags différents du relevé : %', v_detail;
	end if;
end $garde$;

-- ---- 4. Retraits, déplacements, niveaux, statut, poses ---------------------------------
delete from public.question_template_points q
 using _qcm1l08_tags t
 where q.template_id = t.template_id and q.point_id = t.point_id and t.avant and not t.apres;

-- R2 : les modèles passent sur le nœud de leur point AVANT les tags (le trigger des tags lit le
-- nœud du modèle).
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = x.apres
  from _qcm1l08_noeuds x
 where q.id = x.id and q.classification_node_id is distinct from x.apres;
update public.question_templates q set grades = r.grades_apres
  from _qcm1l08_modeles r
 where q.id = r.id and q.grades is distinct from r.grades_apres;
update public.question_templates q set status = r.statut_apres
  from _qcm1l08_modeles r
 where q.id = r.id and q.status is distinct from r.statut_apres;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.template_id, t.point_id
  from _qcm1l08_tags t
  join public.question_templates q on q.id = t.template_id
 where t.apres and not t.avant;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_niveaux integer; v_statuts integer; v_total integer; v_tags integer; v_tags_attendus integer;
begin
	select count(*) into v_presents from _qcm1l08_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm1l08_noeuds x
	  join public.question_templates q on q.id = x.id and q.classification_node_id = x.apres;
	select count(*) into v_niveaux from _qcm1l08_modeles r
	  join public.question_templates q on q.id = r.id and q.grades = r.grades_apres;
	select count(*) into v_statuts from _qcm1l08_modeles r
	  join public.question_templates q on q.id = r.id and q.status = r.statut_apres;
	-- tags de ces modèles (tout niveau) : tous, et ceux du lot d'après (doivent coïncider)
	select count(*), count(*) filter (where exists (select 1 from _qcm1l08_tags t
	                                                where t.template_id = q.template_id and t.point_id = q.point_id and t.apres))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm1l08_modeles m on m.id = q.template_id;
	-- Base sans les modèles (locale) : aucun tag attendu.
	v_tags_attendus := least(v_presents, 1) * 1;
	if v_noeuds <> v_presents or v_niveaux <> v_presents or v_statuts <> v_presents
	   or v_tags <> v_tags_attendus or v_total <> v_tags_attendus then
		raise exception 'lot incohérent : nœuds %/%, niveaux %/%, statuts %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_niveaux, v_presents, v_statuts, v_presents, v_tags, v_tags_attendus, v_total;
	end if;
end $check$;

drop table _qcm1l08_noeuds;
drop table _qcm1l08_tags;
drop table _qcm1l08_modeles;
