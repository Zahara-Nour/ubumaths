-- ============================================================================
-- Chantier « questions-ce1 », lot 2 : niveau d'un brouillon dans sa catégorie
-- ============================================================================
-- Relevé du 2026-10-28 (MCP) : le brouillon c4d4bf70 (Le nombre qui suit, le nombre qui précède
-- (jusqu'à 1 000)), Entiers / Apprivoiser / Ecriture, est au niveau 3, déjà pris par le modèle
-- publié « Parité d'un nombre entier » (un seul modèle publié par catégorie et par niveau,
-- idx_question_templates_unique_category). Il prend le premier niveau libre : 3 → 10.
-- Les 6 autres brouillons du lot 2 sont à des niveaux libres (relevé du même jour).
-- Le niveau n'est qu'un ordre d'affichage dans la catégorie ; aucun modèle publié n'est touché.
-- Ni le contenu, ni le nœud, ni les tags, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- Le fichier scripts/questions/ce1-2/03-suite-jusqu-a-1000.json porte le même niveau (clé de
-- create-questions et de publier-lot : titre, thème, domaine, sous-domaine, niveau).
-- ============================================================================
-- Règle décidée par David le 2026-10-27 (journal docs/wip/questions-ce1-progress.md § 6) : premier
-- niveau libre, sans renuméroter les modèles publiés.
--
-- Le modèle n'existe qu'en production : en base locale, la migration ne touche aucun modèle et
-- ses vérifications le tolèrent. Elle est prouvée par
-- tests/integration/questions-ce1-lot2-niveau.test.ts, qui fabrique une copie de l'identifiant de
-- la prod (catégorie et niveau relevés) puis rejoue CE fichier.
--
-- Garde : le modèle doit être encore en BROUILLON, dans sa catégorie et à son niveau relevés le
-- 2026-10-28 (MCP) ; aucun modèle publié ne doit occuper le niveau visé.
--
-- Données d'élèves : aucune (brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David AVANT le SQL, tranchée par
-- lui le 2026-10-28 : personne). Aucune règle ne change.
--
-- Rollback (aucune donnée d'élève). Il rend au modèle son niveau d'avant. Garde : il refuse si le
-- modèle n'est plus en brouillon ou n'est plus au niveau posé par la migration. Bloc éprouvé par le
-- test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur
-- SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select 1 from public.question_templates
--  where id = 'c4d4bf70-6496-4772-a146-569ab0aaa176' for update;
-- do $garde_rollback$
-- begin
-- 	if not exists (select 1 from public.question_templates
-- 	                where id = 'c4d4bf70-6496-4772-a146-569ab0aaa176'
-- 	                  and level = 10 and status = 'draft') then
-- 		raise exception 'rollback refusé : le modèle a changé depuis la migration';
-- 	end if;
-- end $garde_rollback$;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set level = 3
--  where id = 'c4d4bf70-6496-4772-a146-569ab0aaa176';
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). La ligne du modèle est verrouillée après l'étape 1.
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
	('c4d4bf70-6496-4772-a146-569ab0aaa176', 'Entiers', 'Apprivoiser', 'Ecriture', 3, 10);

select 1 from public.question_templates where id in (select id from _qn_modeles) order by id for update;

-- ---- 2. Gardes : brouillon, catégorie et niveau relevés, niveau visé libre ----------
do $garde$
declare v_presents integer; v_conformes integer; v_pris integer;
begin
	select count(*) into v_presents from _qn_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_conformes from _qn_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status = 'draft' and q.theme = r.theme and q.domain = r.domain
	   and q.subdomain = r.subdomain and q.level = r.avant;
	if v_conformes <> v_presents then
		raise exception 'modèle changé depuis le relevé : % sur % conforme', v_conformes, v_presents;
	end if;
	select count(*) into v_pris from _qn_modeles r
	  join public.question_templates q
	    on q.theme = r.theme and q.domain = r.domain and q.subdomain = r.subdomain
	   and q.level = r.apres and q.status = 'published';
	if v_presents > 0 and v_pris <> 0 then
		raise exception 'niveau visé déjà pris par un modèle publié : %', v_pris;
	end if;
end $garde$;

-- ---- 3. Niveau -----------------------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set level = r.apres
  from _qn_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- ---- 4. Vérification -----------------------------------------------------------------
do $check$
declare v_presents integer; v_niveaux integer;
begin
	select count(*) into v_presents from _qn_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_niveaux from _qn_modeles r
	  join public.question_templates q on q.id = r.id and q.level = r.apres and q.status = 'draft';
	if v_niveaux <> v_presents then
		raise exception 'niveau incohérent : %/%', v_niveaux, v_presents;
	end if;
end $check$;

drop table _qn_modeles;
