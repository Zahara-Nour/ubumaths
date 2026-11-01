-- ============================================================================
-- Chantier « questions-1spe », lot 0-variables aléatoires : niveau de 7 brouillons dans leur catégorie
-- ============================================================================
-- La simulation de publication du 2026-10-30 (scripts/questions/publier-lot.ts) refuse 10 des 17
-- brouillons de Probabilités / Variables aléatoires : plusieurs modèles de la sélection partagent une
-- catégorie et un niveau (un seul modèle publié par catégorie et par niveau,
-- idx_question_templates_unique_category). Aucun modèle de ce domaine n'est publié ; les niveaux
-- sont renumérotés du plus simple au plus composé, en changeant le moins de niveaux possible :
--   - 0417223e (Linéarité de l'espérance), Espérance : 2 → 4 ;
--   - 2af6296f (Variance à partir de la loi), Variance et écart-type : 2 → 1 ;
--   - 6fbc355c (Espérance à partir d'un énoncé), Espérance : 2 → 3 ;
--   - 97b3a376 (Probabilité d'une valeur de X à partir d'un énoncé), Loi d'une variable aléatoire : 2 → 3 ;
--   - a3f92832 (Interpréter une espérance), Espérance : 1 → 2 ;
--   - d683e906 (Probabilités de la loi de X à partir d'un arbre pondéré), Loi d'une variable aléatoire : 3 → 4 ;
--   - eafd17a1 (Gain algébrique moyen), Jeux et gains : 2 → 1 ;
-- Restent à leur niveau : 8354a0e7 (1), 0718f490 (2), ad555cb1 (3), 448894f3 (1), 570f91d5 (2),
-- 35ad8891 (2), bad86bec (3), b83f1392 (1), 7e9b9b32 (2), f3addbe3 (3).
-- Le niveau n'est qu'un ordre d'affichage dans la catégorie ; aucun modèle publié n'est touché.
-- Ni le contenu, ni le nœud, ni les tags, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- Les fichiers scripts/questions/1spe-0-variables-aleatoires/ portent les mêmes niveaux (clé de
-- create-questions et de publier-lot : titre, thème, domaine, sous-domaine, niveau).
-- ============================================================================
-- Décision de David le 2026-10-30 (journal docs/wip/questions-1spe-progress.md, § 15, D20).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-1spe-variables-aleatoires-niveaux.test.ts, qui fabrique des copies des
-- identifiants de la prod (catégorie et niveau relevés) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore en BROUILLON, dans sa catégorie et à son niveau relevés
-- le 2026-10-30 (MCP) ; aucun modèle publié ne doit occuper le niveau visé.
--
-- Données d'élèves : aucune (brouillons).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-10-30 AVANT le SQL,
-- tranchée par lui le 2026-10-30 : personne). Aucune règle ne change.
--
-- Rollback (aucune donnée d'élève). Il rend aux 7 modèles leur niveau d'avant. Garde : il refuse
-- si un modèle n'est plus en brouillon ou n'est plus au niveau posé par la migration. Bloc éprouvé
-- par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou
-- l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select 1 from public.question_templates
--  where id in ('0417223e-923d-4ae2-b25c-89b60f4c7631', '2af6296f-7863-40db-89de-eda542be5e45', '6fbc355c-aca7-4e2e-8a55-78b3a5722e17', '97b3a376-01de-42cd-8297-b0f7937e38f1', 'a3f92832-2daf-4f00-94b5-68b57275e93a', 'd683e906-b1ca-44f0-bed5-8df2a9740b11', 'eafd17a1-6e78-4bf3-932c-da806ac9d889')
--  order by id for update;
-- do $garde_rollback$
-- begin
-- 	if (select count(*) from public.question_templates q
-- 	      join (values
-- 	                   ('0417223e-923d-4ae2-b25c-89b60f4c7631'::uuid, 4),
-- 	                   ('2af6296f-7863-40db-89de-eda542be5e45'::uuid, 1),
-- 	                   ('6fbc355c-aca7-4e2e-8a55-78b3a5722e17'::uuid, 3),
-- 	                   ('97b3a376-01de-42cd-8297-b0f7937e38f1'::uuid, 3),
-- 	                   ('a3f92832-2daf-4f00-94b5-68b57275e93a'::uuid, 2),
-- 	                   ('d683e906-b1ca-44f0-bed5-8df2a9740b11'::uuid, 4),
-- 	                   ('eafd17a1-6e78-4bf3-932c-da806ac9d889'::uuid, 1)) as r(id, niveau)
-- 	        on r.id = q.id and q.level = r.niveau and q.status = 'draft') <> 7 then
-- 		raise exception 'rollback refusé : un modèle a changé depuis la migration';
-- 	end if;
-- end $garde_rollback$;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q set level = r.niveau
--   from (values
--                ('0417223e-923d-4ae2-b25c-89b60f4c7631'::uuid, 2),
--                ('2af6296f-7863-40db-89de-eda542be5e45'::uuid, 2),
--                ('6fbc355c-aca7-4e2e-8a55-78b3a5722e17'::uuid, 2),
--                ('97b3a376-01de-42cd-8297-b0f7937e38f1'::uuid, 2),
--                ('a3f92832-2daf-4f00-94b5-68b57275e93a'::uuid, 1),
--                ('d683e906-b1ca-44f0-bed5-8df2a9740b11'::uuid, 3),
--                ('eafd17a1-6e78-4bf3-932c-da806ac9d889'::uuid, 2)) as r(id, niveau)
--  where q.id = r.id;
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les lignes des modèles sont verrouillées après l'étape 1.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qn_modeles;
create temporary table _qn_modeles (
	id uuid primary key,
	theme text not null,
	domain text not null,
	subdomain text not null,
	avant integer not null,
	apres integer not null
);
insert into _qn_modeles values
	('0417223e-923d-4ae2-b25c-89b60f4c7631', 'Probabilités', 'Variables aléatoires', 'Espérance', 2, 4),
	('2af6296f-7863-40db-89de-eda542be5e45', 'Probabilités', 'Variables aléatoires', 'Variance et écart-type', 2, 1),
	('6fbc355c-aca7-4e2e-8a55-78b3a5722e17', 'Probabilités', 'Variables aléatoires', 'Espérance', 2, 3),
	('97b3a376-01de-42cd-8297-b0f7937e38f1', 'Probabilités', 'Variables aléatoires', 'Loi d''une variable aléatoire', 2, 3),
	('a3f92832-2daf-4f00-94b5-68b57275e93a', 'Probabilités', 'Variables aléatoires', 'Espérance', 1, 2),
	('d683e906-b1ca-44f0-bed5-8df2a9740b11', 'Probabilités', 'Variables aléatoires', 'Loi d''une variable aléatoire', 3, 4),
	('eafd17a1-6e78-4bf3-932c-da806ac9d889', 'Probabilités', 'Variables aléatoires', 'Jeux et gains', 2, 1);

select 1 from public.question_templates where id in (select id from _qn_modeles) order by id for update;

-- ---- 2. Gardes : présence TOUT ou RIEN, brouillon, catégorie et niveau relevés, niveau visé libre
do $garde$
declare v_presents integer; v_conformes integer; v_pris integer;
begin
	select count(*) into v_presents from _qn_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
	end if;
	select count(*) into v_conformes from _qn_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status = 'draft' and q.theme = r.theme and q.domain = r.domain
	   and q.subdomain = r.subdomain and q.level = r.avant;
	if v_conformes <> v_presents then
		raise exception 'modèles changés depuis le relevé : % sur % conformes', v_conformes, v_presents;
	end if;
	select count(*) into v_pris from _qn_modeles r
	  join public.question_templates q
	    on q.theme = r.theme and q.domain = r.domain and q.subdomain = r.subdomain
	   and q.level = r.apres and q.status = 'published';
	if v_presents > 0 and v_pris <> 0 then
		raise exception 'niveau visé déjà pris par un modèle publié : %', v_pris;
	end if;
end $garde$;

-- ---- 3. Niveaux ----------------------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set level = r.apres
  from _qn_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- ---- 4. Vérification : TOUT ou RIEN -------------------------------------------------
do $check$
declare v_presents integer; v_niveaux integer;
begin
	select count(*) into v_presents from _qn_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_niveaux from _qn_modeles r
	  join public.question_templates q on q.id = r.id and q.level = r.apres and q.status = 'draft';
	if v_niveaux <> v_presents then
		raise exception 'lot incohérent : niveaux %/%', v_niveaux, v_presents;
	end if;
end $check$;

drop table _qn_modeles;
