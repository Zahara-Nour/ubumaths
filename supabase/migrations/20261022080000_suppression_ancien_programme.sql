-- ============================================================================
-- Suppression de l'ancien programme : thèmes, objectifs, anciens points et leurs liens
-- ============================================================================
-- Étape 4 de C5 (ADR 0020), DESTRUCTIVE. Phase 0 validée par David le 2026-10-21 (« je te suis ») :
-- comportements, Q1 (node_id obligatoire), Q2 (copie figée de l'ancien monde avant suppression,
-- docs/archive/arbre-notions/ancien-programme/), Q3 (simplification du code dans une 2e PR, après
-- db:types). Jouée seulement APRÈS le deploy:prod qui livre l'étape 3 (v0.44.0, 2026-10-21) : le code
-- en prod ne lit plus ces tables (grep de src/ : aucune référence).
--
-- Ce qui disparaît (mesuré en prod le 2026-10-21) :
--   * curriculum_themes (29 lignes) et curriculum_objectives (87) ;
--   * les 1 007 anciens points (curriculum_points avec un objectif, aucun rangé sur un nœud) ;
--   * leurs 1 026 liens de modèles (question_template_points) ; 12 modèles, tous en brouillon, n'ont
--     plus aucun point (verdicts de David du 2026-10-10 : « détaguer », « reste, sans point ») ;
--   * la colonne curriculum_points.objective_id, ses index et contraintes, et la contrainte
--     curriculum_points_one_generation (il ne reste qu'une génération) ;
--   * 8 fonctions : reorder_curriculum_{themes,objectives,points} et curriculum_referenced_points
--     (sans appelant), place_curriculum_{theme,objective,point}_last et assign_curriculum_point_code
--     (triggers ; pour un point neuf, inertes — l'ordre vaut 1 — ou trompeurs : un point sans code
--     était refusé par « objectif introuvable », il l'est désormais par NOT NULL sur code).
--
-- Ce qui reste : les points neufs, désormais tous rangés (node_id NOT NULL), et leurs tags.
--
-- Accès (question en miroir, posée à David le 2026-10-21) : tout utilisateur connecté LISAIT
-- thèmes et objectifs, prof et admin les ÉCRIVAIENT ; plus personne ensuite. Aucune page ni API ne
-- les lit depuis l'étape 3. Aucun accès gagné.
--
-- Garde : si une ligne d'élève, de cahier de texte, d'exercice, d'automatisme ou d'anti-fraude
-- pointe encore vers un ancien point, la migration S'ARRÊTE (elles partiraient en cascade, sans
-- bruit). Toutes sont à 0 en prod le 2026-10-21.
--
-- Rollback : pas de retour par migration (les données sont perdues). Recréer le schéma à partir des
-- migrations d'origine (20250930000000_curriculum_tracking.sql et suivantes), puis recharger les
-- quatre CSV de docs/archive/arbre-notions/ancien-programme/ (themes, objectifs, points,
-- liens-modeles), dans cet ordre, avec node_id redevenu facultatif.
-- ============================================================================

-- ---- 1. Garde : rien ne pointe vers un ancien point, sinon RIEN ne change --------------------
do $garde$
declare
	v_n integer;
	v_list text;
begin
	select count(*), string_agg(x.t || ' (' || x.n || ')', ', ')
	  into v_n, v_list
	  from (
		select 'student_point_state' as t, count(*) as n
		  from public.student_point_state s
		  join public.curriculum_points p on p.id = s.point_id
		 where p.objective_id is not null
		union all
		select 'journal_entry_points', count(*)
		  from public.journal_entry_points j
		  join public.curriculum_points p on p.id = j.point_id
		 where p.objective_id is not null
		union all
		select 'exercise_curriculum_points', count(*)
		  from public.exercise_curriculum_points e
		  join public.curriculum_points p on p.id = e.point_id
		 where p.objective_id is not null
		union all
		select 'curriculum_point_automatismes', count(*)
		  from public.curriculum_point_automatismes a
		  join public.curriculum_points p on p.id = a.point_id
		 where p.objective_id is not null
		union all
		select 'srs_anti_fraud_flags', count(*)
		  from public.srs_anti_fraud_flags f
		  join public.curriculum_points p on p.id = f.capacity_point_id
		 where p.objective_id is not null
	  ) x
	 where x.n > 0;
	if v_n > 0 then
		raise exception 'anciens points encore référencés : % — suppression refusée', v_list;
	end if;

	-- Un ancien point porte un objectif et aucun nœud (contrainte curriculum_points_one_generation) :
	-- après suppression, chaque point restant a un nœud, et node_id peut devenir obligatoire.
	select count(*) into v_n
	  from public.curriculum_points
	 where objective_id is null and node_id is null;
	if v_n > 0 then
		raise exception 'points sans objectif ni nœud : % — node_id obligatoire impossible', v_n;
	end if;
end $garde$;

-- ---- 2. Les données -------------------------------------------------------------------------
-- Les liens d'abord : la clé étrangère de question_template_points est en RESTRICT.
delete from public.question_template_points q
 using public.curriculum_points p
 where p.id = q.point_id
   and p.objective_id is not null;

delete from public.curriculum_points
 where objective_id is not null;

-- ---- 3. Les triggers et les fonctions de l'ancien monde --------------------------------------
drop trigger curriculum_points_assign_code on public.curriculum_points;
drop trigger curriculum_points_place_last on public.curriculum_points;
drop trigger curriculum_themes_place_last on public.curriculum_themes;
drop trigger curriculum_objectives_place_last on public.curriculum_objectives;

drop function public.assign_curriculum_point_code();
drop function public.place_curriculum_point_last();
drop function public.place_curriculum_theme_last();
drop function public.place_curriculum_objective_last();
drop function public.reorder_curriculum_themes(text, uuid[]);
drop function public.reorder_curriculum_objectives(uuid, uuid[]);
drop function public.reorder_curriculum_points(uuid, uuid[]);
drop function public.curriculum_referenced_points(text);

-- ---- 4. Le schéma ---------------------------------------------------------------------------
alter table public.curriculum_points
	drop constraint curriculum_points_one_generation;

-- Emporte la clé étrangère vers curriculum_objectives, les contraintes d'unicité
-- (objectif, nom) et (objectif, rang), et l'index idx_curriculum_points_objective.
alter table public.curriculum_points
	drop column objective_id;

alter table public.curriculum_points
	alter column node_id set not null;

drop table public.curriculum_objectives;
drop table public.curriculum_themes;
