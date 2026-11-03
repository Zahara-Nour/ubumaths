-- ============================================================================
-- Niveaux 1_GEN des modèles tagués d'un point de 1re générale (enseignement spécifique)
-- ============================================================================
--   21 modèles (19 publiés, 2 brouillons au relevé) portent un tag 1GEN-* sans avoir `1_GEN` dans
--   `grades` ; le cahier de texte filtre les modèles par niveau (`.contains('grades', [niveau])`) :
--   une classe de 1re générale n'en voit donc aucun. La migration AJOUTE `1_GEN` à leurs niveaux,
--   rien d'autre : ni nœud, ni tag, ni contenu, ni statut ; `updated_at` est PRÉSERVÉ. Aucun niveau
--   n'est retiré. Même forme que 20261103082130_questions_1techno_grades (#2280).
-- ============================================================================
-- Décision de David le 2026-11-03 (journal docs/wip/questions-1techno-grades-progress.md, § 3 et 6).
-- Relevé de la prod du 2026-11-03 (MCP), APRÈS le `db:migrate` de #2280 (19 des 21 modèles y ont
-- reçu `1_TECHNO`) : tout modèle ayant au moins un tag dont le point est de niveau 1_GEN et dont
-- `grades` ne contient pas '1_GEN'.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (21 modèles). Elle est prouvée par
-- tests/integration/questions-1gen-grades.test.ts, qui fabrique des copies des identifiants de la
-- prod aux niveaux relevés puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore EXACTEMENT aux niveaux du relevé, sinon une saisie faite
-- depuis serait écrasée. Les tags ne sont pas gardés : la migration n'en dépend pas pour écrire.
--
-- Données d'élèves : aucune n'est modifiée (cartes, tentatives, devoirs non touchés).
--
-- Accès : aucune règle (policy) ne change. Question d'accès posée à David AVANT le SQL, approuvée le
-- 2026-11-03 (« oui, fais 1 ») : le prof et les élèves d'une classe de 1re générale voient ces
-- modèles publiés dans le cahier de texte et les listes filtrées par niveau ; personne ne perd rien.
-- Les 2 brouillons apparaissent aussi dans le sélecteur du cahier de texte du prof (qui les lisait
-- déjà par la RLS : un tri, pas un droit) ; ils restent invisibles des élèves et d'anon (policies
-- bornées à `status = 'published'`).
--
-- Rollback (aucune donnée d'élève). Il rend les 21 modèles à leurs niveaux du relevé. Garde : il
-- refuse si un modèle n'est plus EXACTEMENT aux niveaux posés par la migration. Bloc éprouvé par
-- le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou
-- l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q1gn_retour;
-- create temporary table _q1gn_retour (id uuid primary key, grades_avant text[] not null, grades_apres text[] not null);
-- insert into _q1gn_retour values
-- 	('0af4bf32-b97e-493d-bea4-917b6bbdf6f2', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
-- 	('0b686e01-725c-448d-9e10-b295cf9b4128', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
-- 	('1315d326-1a4b-4abc-af93-f8ab9aeecc66', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
-- 	('18e26873-dca0-4c73-bc23-f181e0164a66', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
-- 	('1acb6d47-5d88-4ccf-830f-98dc57d0022c', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
-- 	('1b1a6d7b-d776-491b-b2bc-b2bc9fe629fe', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
-- 	('1c65d58e-8596-4e11-b917-6c8a86d8ef0f', array['T_COMP', '1_TECHNO'], array['T_COMP', '1_TECHNO', '1_GEN']),
-- 	('337d31c3-5d6b-4bd0-b9da-f025ddb26145', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
-- 	('36010981-8f6b-4b95-bc86-4fcbf87be4ac', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
-- 	('373fc5b4-63af-409d-a1b9-1320ae9b3b75', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
-- 	('5cb7f6ce-8c71-4874-9b42-cd9afd4a1c29', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
-- 	('65e96f31-31fe-4c2b-b894-e689b998b849', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
-- 	('7247dbb0-eeb4-49f0-9c54-4b6ce26f2db8', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
-- 	('8d4e5302-a133-441d-a618-69abb9cb4b63', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
-- 	('8ed02829-51de-40e2-af77-8fa47d01ea98', array['1_SPE'], array['1_SPE', '1_GEN']),
-- 	('a573d517-be46-442b-a298-03469d286e79', array['T_COMP', '1_TECHNO'], array['T_COMP', '1_TECHNO', '1_GEN']),
-- 	('a8b51d16-261f-4acd-a2c2-933d3ea9bab5', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
-- 	('c23840b6-f01c-4d33-ac40-4c5f9c2b6eab', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
-- 	('d5780995-4cd1-49f9-af54-45edca0a27b8', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
-- 	('eb9517ed-85ed-4702-b8d0-e155f5a5d474', array['1_SPE'], array['1_SPE', '1_GEN']),
-- 	('ebe7e788-3fdc-4d48-8429-ecc959f35349', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']);
-- select 1 from public.question_templates where id in (select id from _q1gn_retour) order by id for update;
-- do $rollback$
-- declare v_presents integer; v_conformes integer;
-- begin
-- 	select count(*), count(*) filter (where q.grades = r.grades_apres)
-- 	  into v_presents, v_conformes
-- 	  from _q1gn_retour r join public.question_templates q on q.id = r.id;
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 21 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 21', v_presents;
-- 	end if;
-- 	if v_conformes <> 21 then
-- 		raise exception 'rollback : niveaux changés depuis la migration : % sur 21 conformes', v_conformes;
-- 	end if;
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates q set grades = r.grades_avant
-- 	  from _q1gn_retour r where q.id = r.id;
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- end $rollback$;
-- drop table _q1gn_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les lignes des modèles sont verrouillées une à une.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q1gn_modeles;
create temporary table _q1gn_modeles (
	id uuid primary key,
	grades_avant text[] not null,
	grades_apres text[] not null
);
insert into _q1gn_modeles values
	('0af4bf32-b97e-493d-bea4-917b6bbdf6f2', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
	('0b686e01-725c-448d-9e10-b295cf9b4128', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
	('1315d326-1a4b-4abc-af93-f8ab9aeecc66', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
	('18e26873-dca0-4c73-bc23-f181e0164a66', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
	('1acb6d47-5d88-4ccf-830f-98dc57d0022c', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
	('1b1a6d7b-d776-491b-b2bc-b2bc9fe629fe', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
	('1c65d58e-8596-4e11-b917-6c8a86d8ef0f', array['T_COMP', '1_TECHNO'], array['T_COMP', '1_TECHNO', '1_GEN']),
	('337d31c3-5d6b-4bd0-b9da-f025ddb26145', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
	('36010981-8f6b-4b95-bc86-4fcbf87be4ac', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
	('373fc5b4-63af-409d-a1b9-1320ae9b3b75', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
	('5cb7f6ce-8c71-4874-9b42-cd9afd4a1c29', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
	('65e96f31-31fe-4c2b-b894-e689b998b849', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
	('7247dbb0-eeb4-49f0-9c54-4b6ce26f2db8', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
	('8d4e5302-a133-441d-a618-69abb9cb4b63', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
	('8ed02829-51de-40e2-af77-8fa47d01ea98', array['1_SPE'], array['1_SPE', '1_GEN']),
	('a573d517-be46-442b-a298-03469d286e79', array['T_COMP', '1_TECHNO'], array['T_COMP', '1_TECHNO', '1_GEN']),
	('a8b51d16-261f-4acd-a2c2-933d3ea9bab5', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
	('c23840b6-f01c-4d33-ac40-4c5f9c2b6eab', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
	('d5780995-4cd1-49f9-af54-45edca0a27b8', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']),
	('eb9517ed-85ed-4702-b8d0-e155f5a5d474', array['1_SPE'], array['1_SPE', '1_GEN']),
	('ebe7e788-3fdc-4d48-8429-ecc959f35349', array['1_SPE', '1_TECHNO'], array['1_SPE', '1_TECHNO', '1_GEN']);

select 1 from public.question_templates where id in (select id from _q1gn_modeles) order by id for update;

-- ---- 2. Garde : présence TOUT ou RIEN, niveaux du relevé ---------------------------
do $garde$
declare v_presents integer; v_conformes integer;
begin
	select count(*), count(*) filter (where q.grades = r.grades_avant)
	  into v_presents, v_conformes
	  from _q1gn_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 21 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 21', v_presents;
	end if;
	if v_conformes <> 21 then
		raise exception 'niveaux changés depuis le relevé : % sur 21 conformes', v_conformes;
	end if;
end $garde$;

-- ---- 3. Niveaux ----------------------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set grades = r.grades_apres
  from _q1gn_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- ---- 4. Vérification : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_conformes integer;
begin
	select count(*), count(*) filter (where q.grades = r.grades_apres)
	  into v_presents, v_conformes
	  from _q1gn_modeles r join public.question_templates q on q.id = r.id;
	if v_presents <> 0 and v_conformes <> 21 then
		raise exception 'lot incohérent : % modèle(s) sur 21 aux niveaux visés', v_conformes;
	end if;
end $check$;

drop table _q1gn_modeles;
