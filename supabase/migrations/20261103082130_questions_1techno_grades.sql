-- ============================================================================
-- Niveaux 1_TECHNO des modèles tagués d'un point de 1re technologique
-- ============================================================================
--   53 modèles (48 publiés, 5 brouillons au relevé) portent un tag 1TECHNO-* sans avoir `1_TECHNO`
--   dans `grades` ; le cahier de texte filtre les modèles par niveau (`.contains('grades', [niveau])`) :
--   une classe de 1re technologique n'en voit donc aucun. La migration AJOUTE `1_TECHNO` à leurs
--   niveaux, rien d'autre : ni nœud, ni tag, ni contenu, ni statut ; `updated_at` est PRÉSERVÉ.
--   Aucun niveau n'est retiré (`contains` : la 1re spé et la Terminale les voient toujours).
-- ============================================================================
-- Décision de David le 2026-11-03 (journal docs/wip/questions-1techno-grades-progress.md) : les
-- 53 modèles 1TECHNO, à part des 1GEN (21 modèles dans le même cas, question séparée). Relevé de
-- la prod du 2026-11-03 (MCP) : tout modèle ayant au moins un tag dont le point est de niveau
-- 1_TECHNO et dont `grades` ne contient pas '1_TECHNO'.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (53 modèles). Elle est prouvée par
-- tests/integration/questions-1techno-grades.test.ts, qui fabrique des copies des identifiants
-- de la prod aux niveaux relevés puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore EXACTEMENT aux niveaux du relevé, sinon une saisie faite
-- depuis serait écrasée. Les tags ne sont pas gardés : la migration n'en dépend pas pour écrire.
--
-- Données d'élèves : aucune n'est modifiée (cartes, tentatives, devoirs non touchés).
--
-- Accès : aucune règle (policy) ne change. Question posée à David AVANT le SQL (« qui pourra voir
-- quoi, qu'il ne voyait pas avant ? »), tranchée le 2026-11-03 : élargissement voulu — le prof et
-- les élèves d'une classe de 1re technologique voient ces modèles publiés dans le cahier de texte
-- et les listes filtrées par niveau ; personne ne perd rien. Les 5 brouillons apparaissent aussi dans
-- le sélecteur du cahier de texte du prof (qui les lisait déjà par la RLS : un tri, pas un droit) ;
-- ils restent invisibles des élèves et d'anon (policies bornées à `status = 'published'`).
-- Audit `security-auditor` du 2026-11-03 : aucun finding bloquant.
--
-- Rollback (aucune donnée d'élève). Il rend les 53 modèles à leurs niveaux du relevé. Garde : il
-- refuse si un modèle n'est plus EXACTEMENT aux niveaux posés par la migration. Bloc éprouvé par
-- le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou
-- l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q1tn_retour;
-- create temporary table _q1tn_retour (id uuid primary key, grades_avant text[] not null, grades_apres text[] not null);
-- insert into _q1tn_retour values
-- 	('0495289a-abb1-4fed-b058-5e924a5f05ed', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('05387201-2403-409a-8ebe-5898b6e77e3c', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('0718f490-bfdd-4a62-b78f-b15753c27d8a', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('0af4bf32-b97e-493d-bea4-917b6bbdf6f2', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('0b686e01-725c-448d-9e10-b295cf9b4128', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('1239554b-d442-4be6-8867-d9dc38311999', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('1315d326-1a4b-4abc-af93-f8ab9aeecc66', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('1666b8e9-8225-4e66-8b8c-4d5190806ed1', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('17f64f63-9af0-48ea-96b1-a74e0bef16f4', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('18e26873-dca0-4c73-bc23-f181e0164a66', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('19961e67-88c4-43bf-a76b-6a2af61dedf3', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('1acb6d47-5d88-4ccf-830f-98dc57d0022c', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('1b1a6d7b-d776-491b-b2bc-b2bc9fe629fe', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('1bbfa5f2-1c32-4a81-92cf-b9e7c5996977', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('1c65d58e-8596-4e11-b917-6c8a86d8ef0f', array['T_COMP'], array['T_COMP', '1_TECHNO']),
-- 	('2dd2b712-3687-4910-ab92-378c46125129', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('31a77ba9-520c-4f35-82b3-066492b512c1', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('337d31c3-5d6b-4bd0-b9da-f025ddb26145', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('36010981-8f6b-4b95-bc86-4fcbf87be4ac', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('373fc5b4-63af-409d-a1b9-1320ae9b3b75', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('46913a48-c97f-4f00-9cdc-b98214b8420b', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('5ba712bc-fda7-4d3c-80ee-b2aa8de6cc4f', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('5cb7f6ce-8c71-4874-9b42-cd9afd4a1c29', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('65e96f31-31fe-4c2b-b894-e689b998b849', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('6dd2f133-e203-4cf6-a422-6a0e716203f3', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('6fbc355c-aca7-4e2e-8a55-78b3a5722e17', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('7247dbb0-eeb4-49f0-9c54-4b6ce26f2db8', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('7703e625-8a3e-48bd-b4d3-245201766457', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('782bf7f8-b6af-43f2-a1d7-78089cdb9485', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('79d69593-e815-496c-b429-637a1cd68b4d', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('83b1f614-95db-4d74-9fbf-d4d502ee8c01', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('8d4e5302-a133-441d-a618-69abb9cb4b63', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('97b3a376-01de-42cd-8297-b0f7937e38f1', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('a0089728-f07a-46ba-8109-7550d2ac800d', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('a3f92832-2daf-4f00-94b5-68b57275e93a', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('a430a698-851d-40b9-b4b0-146153788397', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('a573d517-be46-442b-a298-03469d286e79', array['T_COMP'], array['T_COMP', '1_TECHNO']),
-- 	('a8b51d16-261f-4acd-a2c2-933d3ea9bab5', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('bf3e3211-3dc9-4a91-964a-eb8a68350903', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('c23840b6-f01c-4d33-ac40-4c5f9c2b6eab', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('c90fa022-9493-4812-adb7-c785babee9d4', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('cda8e0d2-366c-482f-8cf3-2564b4b7083d', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('d2067413-da43-42bb-a24c-642d2a3cc5e8', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('d5780995-4cd1-49f9-af54-45edca0a27b8', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('d58208eb-48f8-4a77-b5bb-55cddcd845ab', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('d683e906-b1ca-44f0-bed5-8df2a9740b11', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('e5205176-140d-4376-9761-8172ca8bf10a', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('eafd17a1-6e78-4bf3-932c-da806ac9d889', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('ebe7e788-3fdc-4d48-8429-ecc959f35349', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('ecba8a9e-bedb-478d-a324-a4f3fbdb3967', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('ed8444bb-dfa3-4b6c-8414-27afb3066d2b', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('f36ce3ff-9ae5-435e-b6c2-affe0ad902ec', array['1_SPE'], array['1_SPE', '1_TECHNO']),
-- 	('f52395d1-31ca-4bdb-be8f-723c5d96d2ac', array['1_SPE'], array['1_SPE', '1_TECHNO']);
-- select 1 from public.question_templates where id in (select id from _q1tn_retour) order by id for update;
-- do $rollback$
-- declare v_presents integer; v_conformes integer;
-- begin
-- 	select count(*), count(*) filter (where q.grades = r.grades_apres)
-- 	  into v_presents, v_conformes
-- 	  from _q1tn_retour r join public.question_templates q on q.id = r.id;
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 53 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 53', v_presents;
-- 	end if;
-- 	if v_conformes <> 53 then
-- 		raise exception 'rollback : niveaux changés depuis la migration : % sur 53 conformes', v_conformes;
-- 	end if;
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates q set grades = r.grades_avant
-- 	  from _q1tn_retour r where q.id = r.id;
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- end $rollback$;
-- drop table _q1tn_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les lignes des modèles sont verrouillées une à une.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q1tn_modeles;
create temporary table _q1tn_modeles (
	id uuid primary key,
	grades_avant text[] not null,
	grades_apres text[] not null
);
insert into _q1tn_modeles values
	('0495289a-abb1-4fed-b058-5e924a5f05ed', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('05387201-2403-409a-8ebe-5898b6e77e3c', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('0718f490-bfdd-4a62-b78f-b15753c27d8a', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('0af4bf32-b97e-493d-bea4-917b6bbdf6f2', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('0b686e01-725c-448d-9e10-b295cf9b4128', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('1239554b-d442-4be6-8867-d9dc38311999', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('1315d326-1a4b-4abc-af93-f8ab9aeecc66', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('1666b8e9-8225-4e66-8b8c-4d5190806ed1', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('17f64f63-9af0-48ea-96b1-a74e0bef16f4', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('18e26873-dca0-4c73-bc23-f181e0164a66', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('19961e67-88c4-43bf-a76b-6a2af61dedf3', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('1acb6d47-5d88-4ccf-830f-98dc57d0022c', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('1b1a6d7b-d776-491b-b2bc-b2bc9fe629fe', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('1bbfa5f2-1c32-4a81-92cf-b9e7c5996977', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('1c65d58e-8596-4e11-b917-6c8a86d8ef0f', array['T_COMP'], array['T_COMP', '1_TECHNO']),
	('2dd2b712-3687-4910-ab92-378c46125129', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('31a77ba9-520c-4f35-82b3-066492b512c1', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('337d31c3-5d6b-4bd0-b9da-f025ddb26145', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('36010981-8f6b-4b95-bc86-4fcbf87be4ac', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('373fc5b4-63af-409d-a1b9-1320ae9b3b75', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('46913a48-c97f-4f00-9cdc-b98214b8420b', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('5ba712bc-fda7-4d3c-80ee-b2aa8de6cc4f', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('5cb7f6ce-8c71-4874-9b42-cd9afd4a1c29', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('65e96f31-31fe-4c2b-b894-e689b998b849', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('6dd2f133-e203-4cf6-a422-6a0e716203f3', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('6fbc355c-aca7-4e2e-8a55-78b3a5722e17', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('7247dbb0-eeb4-49f0-9c54-4b6ce26f2db8', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('7703e625-8a3e-48bd-b4d3-245201766457', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('782bf7f8-b6af-43f2-a1d7-78089cdb9485', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('79d69593-e815-496c-b429-637a1cd68b4d', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('83b1f614-95db-4d74-9fbf-d4d502ee8c01', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('8d4e5302-a133-441d-a618-69abb9cb4b63', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('97b3a376-01de-42cd-8297-b0f7937e38f1', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('a0089728-f07a-46ba-8109-7550d2ac800d', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('a3f92832-2daf-4f00-94b5-68b57275e93a', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('a430a698-851d-40b9-b4b0-146153788397', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('a573d517-be46-442b-a298-03469d286e79', array['T_COMP'], array['T_COMP', '1_TECHNO']),
	('a8b51d16-261f-4acd-a2c2-933d3ea9bab5', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('bf3e3211-3dc9-4a91-964a-eb8a68350903', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('c23840b6-f01c-4d33-ac40-4c5f9c2b6eab', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('c90fa022-9493-4812-adb7-c785babee9d4', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('cda8e0d2-366c-482f-8cf3-2564b4b7083d', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('d2067413-da43-42bb-a24c-642d2a3cc5e8', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('d5780995-4cd1-49f9-af54-45edca0a27b8', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('d58208eb-48f8-4a77-b5bb-55cddcd845ab', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('d683e906-b1ca-44f0-bed5-8df2a9740b11', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('e5205176-140d-4376-9761-8172ca8bf10a', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('eafd17a1-6e78-4bf3-932c-da806ac9d889', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('ebe7e788-3fdc-4d48-8429-ecc959f35349', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('ecba8a9e-bedb-478d-a324-a4f3fbdb3967', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('ed8444bb-dfa3-4b6c-8414-27afb3066d2b', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('f36ce3ff-9ae5-435e-b6c2-affe0ad902ec', array['1_SPE'], array['1_SPE', '1_TECHNO']),
	('f52395d1-31ca-4bdb-be8f-723c5d96d2ac', array['1_SPE'], array['1_SPE', '1_TECHNO']);

select 1 from public.question_templates where id in (select id from _q1tn_modeles) order by id for update;

-- ---- 2. Garde : présence TOUT ou RIEN, niveaux du relevé ---------------------------
do $garde$
declare v_presents integer; v_conformes integer;
begin
	select count(*), count(*) filter (where q.grades = r.grades_avant)
	  into v_presents, v_conformes
	  from _q1tn_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 53 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 53', v_presents;
	end if;
	if v_conformes <> 53 then
		raise exception 'niveaux changés depuis le relevé : % sur 53 conformes', v_conformes;
	end if;
end $garde$;

-- ---- 3. Niveaux ----------------------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set grades = r.grades_apres
  from _q1tn_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- ---- 4. Vérification : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_conformes integer;
begin
	select count(*), count(*) filter (where q.grades = r.grades_apres)
	  into v_presents, v_conformes
	  from _q1tn_modeles r join public.question_templates q on q.id = r.id;
	if v_presents <> 0 and v_conformes <> 53 then
		raise exception 'lot incohérent : % modèle(s) sur 53 aux niveaux visés', v_conformes;
	end if;
end $check$;

drop table _q1tn_modeles;
