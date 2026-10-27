-- ============================================================================
-- Chantier « questions-ce1 », lot 1 : niveau de 4 brouillons dans leur catégorie
-- ============================================================================
-- La simulation de publication du 2026-10-27 (scripts/questions/publier-lot.ts) refuse 4 des 6
-- brouillons : leur niveau est déjà pris par un modèle publié de la même catégorie (un seul
-- modèle publié par catégorie et par niveau, idx_question_templates_unique_category). Ils
-- prennent le premier niveau libre :
--   - 240bb640 (Ajouter des centaines entières), Entiers / Additionner / Somme astucieuse : 7 → 11 ;
--   - cb08bf78 (Ajouter des dizaines entières), Entiers / Additionner / Somme astucieuse : 8 → 12 ;
--   - 03675b9b (Les multiples de 25), Entiers / Multiplier / Produit : 1 → 10 ;
--   - b2a4a178 (Échanger les nombres d'une multiplication), Entiers / Multiplier / Produit : 3 → 11.
-- Le niveau n'est qu'un ordre d'affichage dans la catégorie ; aucun modèle publié n'est touché.
-- Ni le contenu, ni le nœud, ni les tags, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- Les fichiers scripts/questions/ce1-1/ portent les mêmes niveaux (clé de create-questions et
-- de publier-lot : titre, thème, domaine, sous-domaine, niveau).
-- ============================================================================
-- Décision de David le 2026-10-27 (journal docs/wip/questions-ce1-progress.md § 6) : premier
-- niveau libre, sans renuméroter les modèles publiés.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (4 modèles). Elle est prouvée par
-- tests/integration/questions-ce1-lot1-niveaux.test.ts, qui fabrique des copies des
-- identifiants de la prod (catégorie et niveau relevés) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore en BROUILLON, dans sa catégorie et à son niveau relevés
-- le 2026-10-27 (MCP) ; aucun modèle publié ne doit occuper le niveau visé.
--
-- Données d'élèves : aucune (brouillons).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-10-27 AVANT le SQL,
-- tranchée par lui le 2026-10-27 : personne). Aucune règle ne change.
--
-- Rollback (aucune donnée d'élève). Il rend aux 4 modèles leur niveau d'avant. Garde : il refuse
-- si un modèle n'est plus en brouillon ou n'est plus au niveau posé par la migration. Bloc éprouvé
-- par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou
-- l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select 1 from public.question_templates
--  where id in ('03675b9b-030e-46f5-9316-abfd55cbc2a2', '240bb640-0548-4ff2-ac47-1b182ca3fcc2',
--               'b2a4a178-ee4f-431f-aaef-baf1224910c9', 'cb08bf78-8c21-4c48-83da-8214dbc2d7a2')
--  order by id for update;
-- do $garde_rollback$
-- begin
-- 	if (select count(*) from public.question_templates q
-- 	      join (values ('03675b9b-030e-46f5-9316-abfd55cbc2a2'::uuid, 10),
-- 	                   ('240bb640-0548-4ff2-ac47-1b182ca3fcc2'::uuid, 11),
-- 	                   ('b2a4a178-ee4f-431f-aaef-baf1224910c9'::uuid, 11),
-- 	                   ('cb08bf78-8c21-4c48-83da-8214dbc2d7a2'::uuid, 12)) as r(id, niveau)
-- 	        on r.id = q.id and q.level = r.niveau and q.status = 'draft') <> 4 then
-- 		raise exception 'rollback refusé : un modèle a changé depuis la migration';
-- 	end if;
-- end $garde_rollback$;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q set level = r.niveau
--   from (values ('03675b9b-030e-46f5-9316-abfd55cbc2a2'::uuid, 1),
--                ('240bb640-0548-4ff2-ac47-1b182ca3fcc2'::uuid, 7),
--                ('b2a4a178-ee4f-431f-aaef-baf1224910c9'::uuid, 3),
--                ('cb08bf78-8c21-4c48-83da-8214dbc2d7a2'::uuid, 8)) as r(id, niveau)
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
	('03675b9b-030e-46f5-9316-abfd55cbc2a2', 'Entiers', 'Multiplier', 'Produit', 1, 10),
	('240bb640-0548-4ff2-ac47-1b182ca3fcc2', 'Entiers', 'Additionner', 'Somme astucieuse', 7, 11),
	('b2a4a178-ee4f-431f-aaef-baf1224910c9', 'Entiers', 'Multiplier', 'Produit', 3, 11),
	('cb08bf78-8c21-4c48-83da-8214dbc2d7a2', 'Entiers', 'Additionner', 'Somme astucieuse', 8, 12);

select 1 from public.question_templates where id in (select id from _qn_modeles) order by id for update;

-- ---- 2. Gardes : présence TOUT ou RIEN, brouillon, catégorie et niveau relevés, niveau visé libre
do $garde$
declare v_presents integer; v_conformes integer; v_pris integer;
begin
	select count(*) into v_presents from _qn_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 4) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 4', v_presents;
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
