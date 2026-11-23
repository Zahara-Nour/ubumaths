-- ============================================================================
-- Chantier « questions-1spe », lot 0-géométrie repérée : niveau de 8 brouillons dans leur catégorie
-- ============================================================================
-- La simulation de publication du 2026-10-30 (scripts/questions/publier-lot.ts) refuse 8 des 12
-- brouillons de Géométrie / Géométrie repérée : plusieurs modèles de la sélection partagent une
-- catégorie et un niveau (un seul modèle publié par catégorie et par niveau,
-- idx_question_templates_unique_category). Aucun modèle de ce domaine n'est publié ; les niveaux
-- sont renumérotés du plus simple au plus composé, dans l'ordre déjà donné par les niveaux :
--   - 1602c40d (Un point appartient-il à un cercle ?), Équation de cercle : 1 → 2 ;
--   - 518f7f0b (Droite perpendiculaire passant par un point), Vecteur normal et équation de droite : 2 → 3 ;
--   - 60a428b9 (Centre et rayon d’un cercle à partir de son équation développée), Équation de cercle : 2 → 4 ;
--   - 81811b59 (Équation d'une hauteur d'un triangle), Vecteur normal et équation de droite : 3 → 5 ;
--   - a6d7b414 (Équation d’un cercle : centre et point, ou diamètre), Équation de cercle : 2 → 3 ;
--   - c2add21a (Équation de la médiatrice d'un segment), Vecteur normal et équation de droite : 2 → 4 ;
--   - d7ad48d8 (Est-ce l’équation d’un cercle ?), Équation de cercle : 3 → 5 ;
--   - e710f32f (Équation de droite : un point et un vecteur normal), Vecteur normal et équation de droite : 1 → 2 ;
-- Restent à leur niveau : 71d10661 (1), 3a6583b5 (1), 9bea5ec2 (2), f6c423de (3).
-- Le niveau n'est qu'un ordre d'affichage dans la catégorie ; aucun modèle publié n'est touché.
-- Ni le contenu, ni le nœud, ni les tags, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- Les fichiers scripts/questions/1spe-0-geometrie-reperee/ portent les mêmes niveaux (clé de
-- create-questions et de publier-lot : titre, thème, domaine, sous-domaine, niveau).
-- ============================================================================
-- Décision de David le 2026-10-30 (journal docs/wip/questions-1spe-progress.md, § 13).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (8 modèles). Elle est prouvée par
-- tests/integration/questions-1spe-geometrie-reperee-niveaux.test.ts, qui fabrique des copies des
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
--  where id in ('1602c40d-818f-4218-beb9-0d7f116992a4', '518f7f0b-389b-4cf2-b67c-5591ca00afb9', '60a428b9-72d0-4375-99a3-26ef6f594d3b', '81811b59-b17c-4d94-bbd4-7f5515b4dd6d', 'a6d7b414-b42d-4378-a3fd-eff48890cc72', 'c2add21a-3c8a-4f02-bb87-59755c033510', 'd7ad48d8-614c-44e3-905d-b60f6630d2f5', 'e710f32f-993f-4c49-9b18-f06ace3f1af7')
--  order by id for update;
-- do $garde_rollback$
-- begin
-- 	if (select count(*) from public.question_templates q
-- 	      join (values
-- 	                   ('1602c40d-818f-4218-beb9-0d7f116992a4'::uuid, 2),
-- 	                   ('518f7f0b-389b-4cf2-b67c-5591ca00afb9'::uuid, 3),
-- 	                   ('60a428b9-72d0-4375-99a3-26ef6f594d3b'::uuid, 4),
-- 	                   ('81811b59-b17c-4d94-bbd4-7f5515b4dd6d'::uuid, 5),
-- 	                   ('a6d7b414-b42d-4378-a3fd-eff48890cc72'::uuid, 3),
-- 	                   ('c2add21a-3c8a-4f02-bb87-59755c033510'::uuid, 4),
-- 	                   ('d7ad48d8-614c-44e3-905d-b60f6630d2f5'::uuid, 5),
-- 	                   ('e710f32f-993f-4c49-9b18-f06ace3f1af7'::uuid, 2)) as r(id, niveau)
-- 	        on r.id = q.id and q.level = r.niveau and q.status = 'draft') <> 8 then
-- 		raise exception 'rollback refusé : un modèle a changé depuis la migration';
-- 	end if;
-- end $garde_rollback$;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q set level = r.niveau
--   from (values
--                ('1602c40d-818f-4218-beb9-0d7f116992a4'::uuid, 1),
--                ('518f7f0b-389b-4cf2-b67c-5591ca00afb9'::uuid, 2),
--                ('60a428b9-72d0-4375-99a3-26ef6f594d3b'::uuid, 2),
--                ('81811b59-b17c-4d94-bbd4-7f5515b4dd6d'::uuid, 3),
--                ('a6d7b414-b42d-4378-a3fd-eff48890cc72'::uuid, 2),
--                ('c2add21a-3c8a-4f02-bb87-59755c033510'::uuid, 2),
--                ('d7ad48d8-614c-44e3-905d-b60f6630d2f5'::uuid, 3),
--                ('e710f32f-993f-4c49-9b18-f06ace3f1af7'::uuid, 1)) as r(id, niveau)
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
	('1602c40d-818f-4218-beb9-0d7f116992a4', 'Géométrie', 'Géométrie repérée', 'Équation de cercle', 1, 2),
	('518f7f0b-389b-4cf2-b67c-5591ca00afb9', 'Géométrie', 'Géométrie repérée', 'Vecteur normal et équation de droite', 2, 3),
	('60a428b9-72d0-4375-99a3-26ef6f594d3b', 'Géométrie', 'Géométrie repérée', 'Équation de cercle', 2, 4),
	('81811b59-b17c-4d94-bbd4-7f5515b4dd6d', 'Géométrie', 'Géométrie repérée', 'Vecteur normal et équation de droite', 3, 5),
	('a6d7b414-b42d-4378-a3fd-eff48890cc72', 'Géométrie', 'Géométrie repérée', 'Équation de cercle', 2, 3),
	('c2add21a-3c8a-4f02-bb87-59755c033510', 'Géométrie', 'Géométrie repérée', 'Vecteur normal et équation de droite', 2, 4),
	('d7ad48d8-614c-44e3-905d-b60f6630d2f5', 'Géométrie', 'Géométrie repérée', 'Équation de cercle', 3, 5),
	('e710f32f-993f-4c49-9b18-f06ace3f1af7', 'Géométrie', 'Géométrie repérée', 'Vecteur normal et équation de droite', 1, 2);

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
