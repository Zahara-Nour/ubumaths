-- ============================================================================
-- Chantier « questions-1spe », lot 0-produit scalaire : niveau de 8 brouillons dans leur catégorie
-- ============================================================================
-- La publication du 2026-10-30 (scripts/questions/publier-lot.ts --publier) refuse 9 des 15
-- brouillons de Géométrie / Produit scalaire : plusieurs modèles de la sélection partagent une
-- catégorie et un niveau (un seul modèle publié par catégorie et par niveau,
-- idx_question_templates_unique_category). Aucun modèle de ce domaine n'est publié ; les niveaux
-- sont renumérotés du plus simple au plus composé :
--   - 74363137 (Norme d'une somme ou d'une différence), Propriétés : 2 → 4 ;
--   - 9c7f7ef0 (Produit scalaire par projection orthogonale), Calculer un produit scalaire : 2 → 3 ;
--   - affe59f7 (Produit scalaire à partir de trois normes), Propriétés : 3 → 5 ;
--   - b73923a1 (Choisir la méthode dans une figure usuelle), Calculer un produit scalaire : 3 → 5 ;
--   - bf5dadf6 (Angle de deux vecteurs), Angles et longueurs : 2 → 1 ;
--   - d520539a (Bilinéarité du produit scalaire), Propriétés : 2 → 3 ;
--   - d787d8c0 (Produit scalaire avec les normes), Calculer un produit scalaire : 2 → 4 ;
--   - f2cc01fc (Orthogonaux ou non ?), Propriétés : 2 → 1 ;
-- Restent à leur niveau : fe407c88 (1), ba8ae428 (2), 721324f9 (2), f7c15433 (3), 2bfbf2fc (2),
-- 044a3ae3 (2), a6f0ca3f (3).
-- Le niveau n'est qu'un ordre d'affichage dans la catégorie ; aucun modèle publié n'est touché.
-- Ni le contenu, ni le nœud, ni les tags, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- Les fichiers scripts/questions/1spe-0-produit-scalaire/ portent les mêmes niveaux (clé de
-- create-questions et de publier-lot : titre, thème, domaine, sous-domaine, niveau).
-- ============================================================================
-- Décision de David le 2026-10-30 (journal docs/wip/questions-1spe-progress.md, § 12).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (8 modèles). Elle est prouvée par
-- tests/integration/questions-1spe-produit-scalaire-niveaux.test.ts, qui fabrique des copies des
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
-- Rollback (aucune donnée d'élève). Il rend aux 8 modèles leur niveau d'avant. Garde : il refuse
-- si un modèle n'est plus en brouillon ou n'est plus au niveau posé par la migration. Bloc éprouvé
-- par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou
-- l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select 1 from public.question_templates
--  where id in ('74363137-8fef-4a59-bb0a-ce1c0908198f', '9c7f7ef0-8491-4ce9-a52c-80bcf907845f', 'affe59f7-3de6-4f30-89ce-33486ed01fcf', 'b73923a1-ed5a-49b0-ba69-6e389e28cec3', 'bf5dadf6-ba11-4fbb-a527-014f59e3145a', 'd520539a-4d14-492d-8d85-a303a6c30798', 'd787d8c0-6f5a-45d0-84de-73b887f81bc8', 'f2cc01fc-a317-4052-92d9-2c9f67255a14')
--  order by id for update;
-- do $garde_rollback$
-- begin
-- 	if (select count(*) from public.question_templates q
-- 	      join (values
-- 	                   ('74363137-8fef-4a59-bb0a-ce1c0908198f'::uuid, 4),
-- 	                   ('9c7f7ef0-8491-4ce9-a52c-80bcf907845f'::uuid, 3),
-- 	                   ('affe59f7-3de6-4f30-89ce-33486ed01fcf'::uuid, 5),
-- 	                   ('b73923a1-ed5a-49b0-ba69-6e389e28cec3'::uuid, 5),
-- 	                   ('bf5dadf6-ba11-4fbb-a527-014f59e3145a'::uuid, 1),
-- 	                   ('d520539a-4d14-492d-8d85-a303a6c30798'::uuid, 3),
-- 	                   ('d787d8c0-6f5a-45d0-84de-73b887f81bc8'::uuid, 4),
-- 	                   ('f2cc01fc-a317-4052-92d9-2c9f67255a14'::uuid, 1)) as r(id, niveau)
-- 	        on r.id = q.id and q.level = r.niveau and q.status = 'draft') <> 8 then
-- 		raise exception 'rollback refusé : un modèle a changé depuis la migration';
-- 	end if;
-- end $garde_rollback$;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q set level = r.niveau
--   from (values
--                ('74363137-8fef-4a59-bb0a-ce1c0908198f'::uuid, 2),
--                ('9c7f7ef0-8491-4ce9-a52c-80bcf907845f'::uuid, 2),
--                ('affe59f7-3de6-4f30-89ce-33486ed01fcf'::uuid, 3),
--                ('b73923a1-ed5a-49b0-ba69-6e389e28cec3'::uuid, 3),
--                ('bf5dadf6-ba11-4fbb-a527-014f59e3145a'::uuid, 2),
--                ('d520539a-4d14-492d-8d85-a303a6c30798'::uuid, 2),
--                ('d787d8c0-6f5a-45d0-84de-73b887f81bc8'::uuid, 2),
--                ('f2cc01fc-a317-4052-92d9-2c9f67255a14'::uuid, 2)) as r(id, niveau)
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
	('74363137-8fef-4a59-bb0a-ce1c0908198f', 'Géométrie', 'Produit scalaire', 'Propriétés', 2, 4),
	('9c7f7ef0-8491-4ce9-a52c-80bcf907845f', 'Géométrie', 'Produit scalaire', 'Calculer un produit scalaire', 2, 3),
	('affe59f7-3de6-4f30-89ce-33486ed01fcf', 'Géométrie', 'Produit scalaire', 'Propriétés', 3, 5),
	('b73923a1-ed5a-49b0-ba69-6e389e28cec3', 'Géométrie', 'Produit scalaire', 'Calculer un produit scalaire', 3, 5),
	('bf5dadf6-ba11-4fbb-a527-014f59e3145a', 'Géométrie', 'Produit scalaire', 'Angles et longueurs', 2, 1),
	('d520539a-4d14-492d-8d85-a303a6c30798', 'Géométrie', 'Produit scalaire', 'Propriétés', 2, 3),
	('d787d8c0-6f5a-45d0-84de-73b887f81bc8', 'Géométrie', 'Produit scalaire', 'Calculer un produit scalaire', 2, 4),
	('f2cc01fc-a317-4052-92d9-2c9f67255a14', 'Géométrie', 'Produit scalaire', 'Propriétés', 2, 1);

select 1 from public.question_templates where id in (select id from _qn_modeles) order by id for update;

-- ---- 2. Gardes : présence TOUT ou RIEN, brouillon, catégorie et niveau relevés, niveau visé libre
do $garde$
declare v_presents integer; v_conformes integer; v_pris integer;
begin
	select count(*) into v_presents from _qn_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 8) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 8', v_presents;
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
