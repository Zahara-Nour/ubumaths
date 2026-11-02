-- ============================================================================
-- Chantier « questions-ce1 », lot 10 (espace et mesure) : niveau d'un brouillon dans sa catégorie
-- ============================================================================
-- La simulation de publication du 2026-11-02 (scripts/questions/publier-lot.ts) refuse 25e2fdd1
-- (Mesurer un segment avec la règle, sans partir du 0) : son niveau 5 de Grandeurs / Longueurs /
-- Comparaison et mesure est pris par « Comparer des longueurs d'unités différentes » (8aa2821f, CM1,
-- publié après la création du lot ; un seul modèle publié par catégorie et par niveau,
-- idx_question_templates_unique_category). Il prend le premier niveau libre : 5 → 6.
-- Le niveau n'est qu'un ordre d'affichage dans la catégorie ; aucun modèle publié n'est touché.
-- Ni le contenu, ni le nœud, ni les tags, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- Le fichier scripts/questions/ce1-10/01-mesure-a-la-regle.json porte le même niveau (clé de
-- create-questions et de publier-lot : titre, thème, domaine, sous-domaine, niveau).
-- ============================================================================
-- Décision de David le 2026-11-02 (journal docs/wip/questions-ce1-progress.md, § 17 : premier
-- niveau libre, aucun publié renuméroté).
--
-- Le modèle n'existe qu'en production : en base locale, la migration ne touche aucun modèle et ses
-- vérifications le tolèrent. Elle est prouvée par tests/integration/questions-ce1-lot10-niveau.test.ts,
-- qui fabrique une copie de l'identifiant de la prod (catégorie et niveau relevés) puis rejoue CE
-- fichier.
--
-- Garde : le modèle doit être encore en BROUILLON, dans sa catégorie et à son niveau relevés le
-- 2026-11-02 (MCP) ; aucun modèle publié ne doit occuper le niveau visé.
--
-- Données d'élèves : aucune (brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-11-02 AVANT le SQL,
-- tranchée par lui le 2026-11-02 : personne). Aucune règle ne change.
--
-- Rollback (aucune donnée d'élève). Il rend au modèle son niveau d'avant. Garde : il refuse si le
-- modèle n'est plus en brouillon ou n'est plus au niveau posé par la migration. Bloc éprouvé par le
-- test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur
-- SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select 1 from public.question_templates
--  where id = '25e2fdd1-efbe-4cff-b2bd-fd583f1e9226' for update;
-- do $garde_rollback$
-- begin
-- 	if (select count(*) from public.question_templates
-- 	     where id = '25e2fdd1-efbe-4cff-b2bd-fd583f1e9226' and level = 6 and status = 'draft') <> 1 then
-- 		raise exception 'rollback refusé : le modèle a changé depuis la migration';
-- 	end if;
-- end $garde_rollback$;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set level = 5 where id = '25e2fdd1-efbe-4cff-b2bd-fd583f1e9226';
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). La ligne du modèle est verrouillée après l'étape 1.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qce1l10n_modeles;
create temporary table _qce1l10n_modeles (
	id uuid primary key,
	theme text not null,
	domain text not null,
	subdomain text not null,
	avant integer not null,
	apres integer not null
);
insert into _qce1l10n_modeles values
	('25e2fdd1-efbe-4cff-b2bd-fd583f1e9226', 'Grandeurs', 'Longueurs', 'Comparaison et mesure', 5, 6);

select 1 from public.question_templates where id in (select id from _qce1l10n_modeles) order by id for update;

-- ---- 2. Gardes : brouillon, catégorie et niveau relevés, niveau visé libre -----------
do $garde$
declare v_presents integer; v_conformes integer; v_pris integer;
begin
	select count(*) into v_presents from _qce1l10n_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_conformes from _qce1l10n_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status = 'draft' and q.theme = r.theme and q.domain = r.domain
	   and q.subdomain = r.subdomain and q.level = r.avant;
	if v_conformes <> v_presents then
		raise exception 'modèles changés depuis le relevé : % sur % conformes', v_conformes, v_presents;
	end if;
	select count(*) into v_pris from _qce1l10n_modeles r
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
  from _qce1l10n_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- ---- 4. Vérification ------------------------------------------------------------------
do $check$
declare v_presents integer; v_niveaux integer;
begin
	select count(*) into v_presents from _qce1l10n_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_niveaux from _qce1l10n_modeles r
	  join public.question_templates q on q.id = r.id and q.level = r.apres and q.status = 'draft';
	if v_niveaux <> v_presents then
		raise exception 'lot incohérent : niveaux %/%', v_niveaux, v_presents;
	end if;
end $check$;

drop table _qce1l10n_modeles;
