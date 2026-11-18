-- ============================================================================
-- 1re techno, lot 5 : tags 1TECHNO sur 4 modèles de statistiques à deux variables communs avec la
-- 1re générale
-- ============================================================================
--   4 modèles publiés par le chantier questions-1gen (son lot 6, rangés et tagués 1GEN) reçoivent
--   chacun UN point de 1re technologique et le niveau `1_TECHNO` :
--     7461bb44 « Lire un nuage de points »                       → 1TECHNO-082 (à côté de 1GEN-002)
--     f3cb0c7a « Représenter une série … par un nuage de points » → 1TECHNO-085 (à côté de 1GEN-002)
--     4f328c8c « Le point moyen d'un nuage de points »            → 1TECHNO-084 (à côté de 1GEN-004)
--     3fec6b41 « Déterminer un ajustement affine »                → 1TECHNO-087 (à côté de 1GEN-007)
--   Rien d'autre ne change : ni contenu, ni nœud, ni statut, ni le tag 1GEN ; `updated_at` est
--   PRÉSERVÉ. Aucun niveau n'est retiré.
-- ============================================================================
-- Chantier `questions-1techno` (journal docs/wip/questions-1techno-progress.md, § 28 et 29).
-- Relevé de la prod du 2026-11-18 (MCP) : grades = {1_GEN}, publiés, chacun rangé sur le nœud
-- même de son point 1TECHNO (qui est aussi celui de son point 1GEN). Phase 0 validée par David le
-- 2026-11-18 ; les 4 modèles relus par David sur la page à cocher du lot 5 (4 « OK » sur 4 le
-- 2026-11-18). Instantanés : scripts/questions/1techno-5-communs/.
--
-- Le point est résolu par son CODE (stable) ; le trigger des tags vérifie qu'il est posé sur le
-- nœud du modèle ou sur sa notion, et qu'aucun autre point 1TECHNO n'est déjà posé.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (4 modèles). Elle est prouvée par
-- tests/integration/questions-1techno-lot5-communs-tags.test.ts, qui fabrique des copies portant les
-- vrais identifiants, au niveau relevé, rangées sur le nœud du point visé et taguées de leur point
-- 1GEN, puis rejoue CE fichier.
--
-- Niveaux : la migration n'AJOUTE que `1_TECHNO` (`array_append`), jamais une affectation complète
-- de `grades` (accord entre sessions du 2026-11-17 avec questions-1gen et questions-ttechno).
-- Gardes : aucun des 4 n'a `1_TECHNO` ni de point 1TECHNO ; sinon le lot est incohérent.
--
-- Données d'élèves : aucune n'est modifiée (cartes, tentatives, devoirs non touchés).
--
-- Accès : aucune règle (policy) ne change. Question d'accès de la phase 0 (§ 28, validée par David
-- le 2026-11-18 AVANT le SQL) : personne n'accède à une donnée nouvelle ; ces modèles, déjà
-- publiés, apparaissent en plus dans le catalogue et le cahier de texte de 1re technologique.
-- Personne ne perd rien.
--
-- Rollback (aucune donnée d'élève). Il retire les 4 tags 1TECHNO posés et `1_TECHNO` des niveaux
-- (le tag 1GEN et les autres niveaux restent tels qu'ils sont). Garde : il refuse si un modèle n'a
-- plus `1_TECHNO` ou si un des 4 tags manque.
-- Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q1t5c_retour;
-- create temporary table _q1t5c_retour (id uuid primary key, code text not null);
-- insert into _q1t5c_retour values
-- 	('7461bb44-6811-4f56-9397-6fb3ff82c1b9', '1TECHNO-082'),
-- 	('f3cb0c7a-5fa9-4578-ba55-769581dcc64b', '1TECHNO-085'),
-- 	('4f328c8c-16c8-40b0-b192-bc2eaa94a867', '1TECHNO-084'),
-- 	('3fec6b41-b401-430b-b602-017bd51e5f10', '1TECHNO-087');
-- select 1 from public.question_templates where id in (select id from _q1t5c_retour) order by id for update;
-- do $rollback$
-- declare v_presents integer; v_conformes integer; v_tags integer;
-- begin
-- 	select count(*), count(*) filter (where '1_TECHNO' = any(q.grades))
-- 	  into v_presents, v_conformes
-- 	  from _q1t5c_retour r join public.question_templates q on q.id = r.id;
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 4 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 4', v_presents;
-- 	end if;
-- 	if v_conformes <> 4 then
-- 		raise exception 'rollback : 1_TECHNO retiré depuis la migration : % sur 4 conformes', v_conformes;
-- 	end if;
-- 	select count(*) into v_tags
-- 	  from _q1t5c_retour r
-- 	  join public.curriculum_points p on p.code = r.code
-- 	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
-- 	if v_tags <> 4 then
-- 		raise exception 'rollback : tags changés depuis la migration : % sur 4 présents', v_tags;
-- 	end if;
-- 	delete from public.question_template_points t
-- 	 using _q1t5c_retour r, public.curriculum_points p
-- 	 where p.code = r.code and t.template_id = r.id and t.point_id = p.id;
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates q set grades = array_remove(q.grades, '1_TECHNO')
-- 	  from _q1t5c_retour r where q.id = r.id;
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- end $rollback$;
-- drop table _q1t5c_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les lignes des modèles sont verrouillées une à une.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q1t5c_modeles;
create temporary table _q1t5c_modeles (
	id uuid primary key,
	code text not null
);
insert into _q1t5c_modeles values
	('7461bb44-6811-4f56-9397-6fb3ff82c1b9', '1TECHNO-082'),
	('f3cb0c7a-5fa9-4578-ba55-769581dcc64b', '1TECHNO-085'),
	('4f328c8c-16c8-40b0-b192-bc2eaa94a867', '1TECHNO-084'),
	('3fec6b41-b401-430b-b602-017bd51e5f10', '1TECHNO-087');

select 1 from public.question_templates where id in (select id from _q1t5c_modeles) order by id for update;

-- ---- 2. Gardes : présence TOUT ou RIEN, niveau du relevé, aucun point 1TECHNO -------
do $garde$
declare v_presents integer; v_conformes integer; v_deja text; v_points integer;
begin
	select count(*), count(*) filter (where not ('1_TECHNO' = any(q.grades)))
	  into v_presents, v_conformes
	  from _q1t5c_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 4 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 4', v_presents;
	end if;
	if v_conformes <> 4 then
		raise exception 'niveau 1_TECHNO différent du relevé : % sur 4 conformes', v_conformes;
	end if;
	select string_agg(left(r.id::text, 8) || ' (' || p.code || ')', ', ') into v_deja
	  from _q1t5c_modeles r
	  join public.question_template_points t on t.template_id = r.id
	  join public.curriculum_points p on p.id = t.point_id
	 where p.grade = '1_TECHNO';
	if v_deja is not null then
		raise exception 'modèle(s) déjà tagué(s) d''un point 1TECHNO : %', v_deja;
	end if;
	select count(distinct r.code) into v_points
	  from _q1t5c_modeles r
	  join public.curriculum_points p on p.code = r.code and p.archived_at is null;
	if v_points <> 4 then
		raise exception 'points 1TECHNO introuvables : % sur 4', v_points;
	end if;
end $garde$;

-- ---- 3. Tags et niveaux --------------------------------------------------------------
-- (en base locale, aucun modèle : la jointure ne rend rien et rien n'est écrit)
insert into public.question_template_points (template_id, point_id)
select r.id, p.id
  from _q1t5c_modeles r
  join public.question_templates q on q.id = r.id
  join public.curriculum_points p on p.code = r.code and p.archived_at is null;

alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set grades = array_append(q.grades, '1_TECHNO')
  from _q1t5c_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- ---- 4. Vérification : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_conformes integer; v_tags integer;
begin
	select count(*), count(*) filter (where '1_TECHNO' = any(q.grades))
	  into v_presents, v_conformes
	  from _q1t5c_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	select count(*) into v_tags
	  from _q1t5c_modeles r
	  join public.curriculum_points p on p.code = r.code and p.archived_at is null
	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
	if v_conformes <> 4 or v_tags <> 4 then
		raise exception 'lot incohérent : % modèle(s) sur 4 avec 1_TECHNO, % tag(s) sur 4', v_conformes, v_tags;
	end if;
end $check$;

drop table _q1t5c_modeles;
