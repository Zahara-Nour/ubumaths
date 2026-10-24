-- ============================================================================
-- Chantier « questions », corrections CP : rangement, niveaux et tags de 4 modèles
-- ============================================================================
--   - 52c4d773 (Décomposition, 74 = 70 + 4) : CP-005 retiré, CP-004 posé (sa borne cite la
--     « décomposition additive 30 + 5 ») ; le modèle passe de la sous-notion « décomposition » à
--     « écritures », où vit CP-004 (sans quoi question_template_points_check_rules refuse le tag) ;
--   - 25285413, a3ef26ab (doubles), 89bef942 (moitiés) : niveaux [CP] → [CE1] (le × de leur corrigé
--     est hors CP, borne CP-017), tags CE1-028 (doubles) et CE1-101 (moitiés) ; nœud inchangé.
-- Le contenu ne change pas ici (migration précédente, 20261024233000_questions_cp_contenu) :
-- `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-24 (journal docs/wip/questions-progress.md § 4 bis). Écrite à la
-- main : le générateur des lots de contenu ne sait pas retirer un tag.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (4 modèles). Elle est prouvée
-- par tests/integration/questions-cp-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (nœud, niveaux et tags d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore au nœud et aux niveaux relevés le 2026-10-24, et porter
-- EXACTEMENT les tags relevés (sinon une saisie faite depuis serait écrasée ou contredite). Les
-- nœuds sont désignés par leur chemin, résolu STRICTEMENT.
--
-- Données d'élèves : aucune (relevé du 2026-10-24 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal, 0 exercice de chapitre, 0 favori).
--
-- Accès : personne ne gagne d'accès (question tranchée par David le 2026-10-24). Aucune règle ne
-- change. Effet visible : les 3 modèles de doubles et moitiés quittent le catalogue du CP pour
-- celui du CE1 ; la décomposition apparaît sous « écritures » au lieu de « décomposition ».
--
-- Rollback (aucune donnée d'élève). Il retire les tags posés, rend aux modèles leur nœud et leurs
-- niveaux d'avant, puis repose CP-005. Bloc éprouvé par le test d'intégration, à jouer dans UNE
-- transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('25285413-ba15-401d-a0e8-fd0a84770f3a'::uuid), ('52c4d773-d86c-45a3-88e4-ddc99cc4beab'::uuid),
--                ('89bef942-2e3f-4f76-8712-4bf7e6f226cf'::uuid), ('a3ef26ab-2334-4061-86f4-295f5e4e0bc4'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('52c4d773-d86c-45a3-88e4-ddc99cc4beab'::uuid, 'CP', 'CP-004'),
-- 	('25285413-ba15-401d-a0e8-fd0a84770f3a'::uuid, 'CE1', 'CE1-028'),
-- 	('a3ef26ab-2334-4061-86f4-295f5e4e0bc4'::uuid, 'CE1', 'CE1-028'),
-- 	('89bef942-2e3f-4f76-8712-4bf7e6f226cf'::uuid, 'CE1', 'CE1-101')
--  ) as r(id, grade, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q set classification_node_id = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = 'Nombres et calculs'
--    and n.name = 'Entiers : numération' and s.name = 'décomposition'
--    and q.id = '52c4d773-d86c-45a3-88e4-ddc99cc4beab';
-- update public.question_templates set grades = array['CP']
--  where id in ('25285413-ba15-401d-a0e8-fd0a84770f3a', 'a3ef26ab-2334-4061-86f4-295f5e4e0bc4', '89bef942-2e3f-4f76-8712-4bf7e6f226cf');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- insert into public.question_template_points (template_id, point_id)
-- select q.id, p.id from public.question_templates q
--   join public.curriculum_points p on p.grade = 'CP' and p.code = 'CP-005' and p.archived_at is null
--  where q.id = '52c4d773-d86c-45a3-88e4-ddc99cc4beab';
-- do $retour$
-- declare v_presents integer; v_reposes integer;
-- begin
-- 	select count(*) into v_presents from public.question_templates where id = '52c4d773-d86c-45a3-88e4-ddc99cc4beab';
-- 	select count(*) into v_reposes from public.question_template_points q
-- 	  join public.curriculum_points p on p.id = q.point_id
-- 	 where q.template_id = '52c4d773-d86c-45a3-88e4-ddc99cc4beab' and p.grade = 'CP' and p.code = 'CP-005';
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
drop table if exists pg_temp._qcp_modeles;
drop table if exists pg_temp._qcp_tags;
create temporary table _qcp_modeles (
	id uuid primary key,
	avant_branche text not null, avant_notion text not null, avant_sous_notion text,
	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
	grades_avant text[] not null,
	grades_apres text[] not null
);
create temporary table _qcp_tags (
	template_id uuid not null,
	grade text not null,
	code text not null,
	avant boolean not null,
	apres boolean not null,
	primary key (template_id, grade, code)
);
insert into _qcp_modeles values
	('25285413-ba15-401d-a0e8-fd0a84770f3a', 'Nombres et calculs', 'Entiers : multiplication', 'double et moitié',
	 'Nombres et calculs', 'Entiers : multiplication', 'double et moitié', array['CP'], array['CE1']),
	('52c4d773-d86c-45a3-88e4-ddc99cc4beab', 'Nombres et calculs', 'Entiers : numération', 'décomposition',
	 'Nombres et calculs', 'Entiers : numération', 'écritures', array['CP'], array['CP']),
	('89bef942-2e3f-4f76-8712-4bf7e6f226cf', 'Nombres et calculs', 'Entiers : multiplication', 'double et moitié',
	 'Nombres et calculs', 'Entiers : multiplication', 'double et moitié', array['CP'], array['CE1']),
	('a3ef26ab-2334-4061-86f4-295f5e4e0bc4', 'Nombres et calculs', 'Entiers : multiplication', 'double et moitié',
	 'Nombres et calculs', 'Entiers : multiplication', 'double et moitié', array['CP'], array['CE1']);
insert into _qcp_tags values
	('52c4d773-d86c-45a3-88e4-ddc99cc4beab', 'CP', 'CP-005', true, false),
	('52c4d773-d86c-45a3-88e4-ddc99cc4beab', 'CP', 'CP-004', false, true),
	('25285413-ba15-401d-a0e8-fd0a84770f3a', 'CE1', 'CE1-028', false, true),
	('a3ef26ab-2334-4061-86f4-295f5e4e0bc4', 'CE1', 'CE1-028', false, true),
	('89bef942-2e3f-4f76-8712-4bf7e6f226cf', 'CE1', 'CE1-101', false, true);

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcp_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcp_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
create temporary table _qcp_noeuds as
	select r.id,
	       case when r.avant_sous_notion is null then an.id else asn.id end as avant,
	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
	  from _qcp_modeles r
	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
alter table _qcp_tags add column point_id uuid;
update _qcp_tags t set point_id = p.id
  from public.curriculum_points p
 where p.grade = t.grade and p.code = t.code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _qcp_noeuds where avant is null or apres is null)
	   or exists (select 1 from _qcp_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s) de modèle, % point(s)',
			(select count(*) from _qcp_noeuds where avant is null or apres is null),
			(select count(*) from _qcp_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, nœud et niveaux relevés, tags EXACTEMENT relevés ---
do $garde$
declare v_presents integer; v_ecarts integer; v_niveaux integer; v_detail text;
begin
	select count(*) into v_presents from _qcp_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 4) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 4', v_presents;
	end if;
	select count(*) into v_ecarts from _qcp_noeuds x
	  join public.question_templates q on q.id = x.id
	 where q.classification_node_id is distinct from x.avant;
	if v_ecarts <> 0 then
		raise exception 'modèles déplacés depuis le relevé : %', v_ecarts;
	end if;
	select count(*) into v_niveaux from _qcp_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from r.grades_avant;
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	-- « + » : tag en base non relevé (tout niveau) ; « - » : tag relevé absent de la base
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || left(q.template_id::text, 8) || ' ' || p.code as r
		   from public.question_template_points q
		   join _qcp_modeles m on m.id = q.template_id
		   join public.curriculum_points p on p.id = q.point_id
		  where not exists (select 1 from _qcp_tags t where t.template_id = q.template_id and t.point_id = q.point_id and t.avant))
		union all
		(select '-' || left(t.template_id::text, 8) || ' ' || t.code
		   from _qcp_tags t
		   join public.question_templates q on q.id = t.template_id
		  where t.avant
		    and not exists (select 1 from public.question_template_points u where u.template_id = t.template_id and u.point_id = t.point_id))) d;
	if v_detail is not null then
		raise exception 'tags différents du relevé : %', v_detail;
	end if;
end $garde$;

-- ---- 4. Retraits, déplacement, niveaux, poses -----------------------------------------
delete from public.question_template_points q
 using _qcp_tags t
 where q.template_id = t.template_id and q.point_id = t.point_id and t.avant and not t.apres;

alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = x.apres
  from _qcp_noeuds x
 where q.id = x.id and q.classification_node_id is distinct from x.apres;
update public.question_templates q set grades = r.grades_apres
  from _qcp_modeles r
 where q.id = r.id and q.grades is distinct from r.grades_apres;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.template_id, t.point_id
  from _qcp_tags t
  join public.question_templates q on q.id = t.template_id
 where t.apres and not t.avant;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_niveaux integer; v_total integer; v_tags integer; v_tags_attendus integer;
begin
	select count(*) into v_presents from _qcp_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcp_noeuds x
	  join public.question_templates q on q.id = x.id and q.classification_node_id = x.apres;
	select count(*) into v_niveaux from _qcp_modeles r
	  join public.question_templates q on q.id = r.id and q.grades = r.grades_apres;
	-- tags de ces modèles (tout niveau) : tous, et ceux du lot d'après (doivent coïncider)
	select count(*), count(*) filter (where exists (select 1 from _qcp_tags t
	                                                where t.template_id = q.template_id and t.point_id = q.point_id and t.apres))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcp_modeles m on m.id = q.template_id;
	-- Base sans les modèles (locale) : aucun tag attendu.
	v_tags_attendus := least(v_presents, 1) * 4;
	if v_noeuds <> v_presents or v_niveaux <> v_presents or v_tags <> v_tags_attendus or v_total <> v_tags_attendus then
		raise exception 'lot incohérent : nœuds %/%, niveaux %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_niveaux, v_presents, v_tags, v_tags_attendus, v_total;
	end if;
end $check$;

drop table _qcp_noeuds;
drop table _qcp_tags;
drop table _qcp_modeles;
