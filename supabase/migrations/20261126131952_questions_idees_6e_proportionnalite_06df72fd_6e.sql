-- ============================================================================
-- idees-6e-proportionnalite, F4 : un modèle de 5e ouvert à la 6e
-- ============================================================================
--   06df72fd « Reconnaître des situations de proportionnalité » (publié, rangé sur la sous-notion
--   « caractérisation », tagué 5-087) reçoit le niveau `6` et le point 6-190 (posé sur le même
--   nœud), à côté de son point 5-087.
--   Rien d'autre ne change : ni contenu, ni nœud, ni statut, ni le tag 5-087 ; `updated_at` est
--   PRÉSERVÉ. Aucun niveau n'est retiré.
-- ============================================================================
-- Chantier `idees-6e-proportionnalite` (journal docs/wip/idees-6e-proportionnalite-progress.md,
-- fiche F4). Phase 0 validée par David le 2026-11-25 (« je valide »). Relevé de la prod du
-- 2026-11-26 (MCP) : grades = {5}, publié, nœud = celui de 6-190, seul tag 5-087.
--
-- Le point est résolu par son CODE (stable) ; le trigger des tags vérifie qu'il est posé sur le
-- nœud du modèle ou sur sa notion.
--
-- Le modèle n'existe qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent. Elle est prouvée par
-- tests/integration/questions-idees-6e-proportionnalite-06df72fd-6e.test.ts, qui fabrique une copie
-- portant le vrai identifiant, au niveau relevé, rangée sur le nœud de 6-190 et taguée 5-087, puis
-- rejoue CE fichier.
--
-- Niveaux : la migration n'AJOUTE que `6` (`array_append`), jamais une affectation complète de
-- `grades`. Gardes : le modèle n'a ni `6` ni de point de 6e ; sinon il a changé depuis le relevé.
--
-- Données d'élèves : aucune n'est modifiée (cartes, tentatives, devoirs non touchés).
--
-- Accès : aucune règle (policy) ne change. Question d'accès de la phase 0 : personne n'accède à
-- une donnée nouvelle ; ce modèle, déjà publié, apparaît en plus dans le catalogue de 6e.
-- Personne ne perd rien.
--
-- Rollback (aucune donnée d'élève). Il retire le tag 6-190 et `6` des niveaux (le tag 5-087 et
-- les autres niveaux restent tels qu'ils sont). Garde : il refuse si le modèle n'a plus `6` ou si
-- le tag 6-190 manque.
-- Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select 1 from public.question_templates where id = '06df72fd-21ad-4c0e-9f3b-13dcfa03a015' for update;
-- do $rollback$
-- declare v_grades text[]; v_tag integer;
-- begin
-- 	select q.grades into v_grades
-- 	  from public.question_templates q where q.id = '06df72fd-21ad-4c0e-9f3b-13dcfa03a015';
-- 	if not found then
-- 		return;
-- 	end if;
-- 	if not ('6' = any(v_grades)) then
-- 		raise exception 'rollback : niveau 6 retiré depuis la migration';
-- 	end if;
-- 	select count(*) into v_tag
-- 	  from public.question_template_points t
-- 	  join public.curriculum_points p on p.id = t.point_id
-- 	 where t.template_id = '06df72fd-21ad-4c0e-9f3b-13dcfa03a015' and p.code = '6-190';
-- 	if v_tag <> 1 then
-- 		raise exception 'rollback : tag 6-190 absent depuis la migration';
-- 	end if;
-- 	delete from public.question_template_points t
-- 	 using public.curriculum_points p
-- 	 where p.id = t.point_id and p.code = '6-190'
-- 	   and t.template_id = '06df72fd-21ad-4c0e-9f3b-13dcfa03a015';
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates q set grades = array_remove(q.grades, '6')
-- 	 where q.id = '06df72fd-21ad-4c0e-9f3b-13dcfa03a015';
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- end $rollback$;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). La ligne du modèle est verrouillée seule.
set local lock_timeout = '5s';

select 1 from public.question_templates where id = '06df72fd-21ad-4c0e-9f3b-13dcfa03a015' for update;

-- ---- 1. Gardes : niveau du relevé, aucun point de 6e, point présent -------------------
do $garde$
declare v_grades text[]; v_deja text; v_point integer;
begin
	select q.grades into v_grades
	  from public.question_templates q where q.id = '06df72fd-21ad-4c0e-9f3b-13dcfa03a015';
	if not found then
		return;
	end if;
	if '6' = any(v_grades) then
		raise exception 'niveau 6 différent du relevé : déjà présent';
	end if;
	select string_agg(p.code, ', ') into v_deja
	  from public.question_template_points t
	  join public.curriculum_points p on p.id = t.point_id
	 where t.template_id = '06df72fd-21ad-4c0e-9f3b-13dcfa03a015' and p.grade = '6';
	if v_deja is not null then
		raise exception 'modèle déjà tagué d''un point de 6e : %', v_deja;
	end if;
	select count(*) into v_point
	  from public.curriculum_points p where p.code = '6-190' and p.archived_at is null;
	if v_point <> 1 then
		raise exception 'point 6-190 introuvable';
	end if;
end $garde$;

-- ---- 2. Tag et niveau ---------------------------------------------------------------
-- (en base locale, aucun modèle : la jointure ne rend rien et rien n'est écrit)
insert into public.question_template_points (template_id, point_id)
select q.id, p.id
  from public.question_templates q
  join public.curriculum_points p on p.code = '6-190' and p.archived_at is null
 where q.id = '06df72fd-21ad-4c0e-9f3b-13dcfa03a015';

alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set grades = array_append(q.grades, '6')
 where q.id = '06df72fd-21ad-4c0e-9f3b-13dcfa03a015';
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- ---- 3. Vérification ----------------------------------------------------------------
do $check$
declare v_grades text[]; v_tag integer;
begin
	select q.grades into v_grades
	  from public.question_templates q where q.id = '06df72fd-21ad-4c0e-9f3b-13dcfa03a015';
	if not found then
		return;
	end if;
	select count(*) into v_tag
	  from public.question_template_points t
	  join public.curriculum_points p on p.id = t.point_id
	 where t.template_id = '06df72fd-21ad-4c0e-9f3b-13dcfa03a015' and p.code = '6-190';
	if not ('6' = any(v_grades)) or v_tag <> 1 then
		raise exception 'modèle incohérent : niveaux %, % tag 6-190', v_grades, v_tag;
	end if;
end $check$;
