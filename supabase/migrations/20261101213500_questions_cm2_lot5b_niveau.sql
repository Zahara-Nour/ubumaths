-- ============================================================================
-- Chantier « questions-cm2 », lot 5b : niveau d'un brouillon dans sa catégorie
-- ============================================================================
-- La simulation de publication du 2026-11-01 (scripts/questions/publier-lot.ts) refuse
-- cf85bd1b (Calculer une fraction d'une quantité, CM2) : sa catégorie Fractions / Calculer /
-- Fraction d'une quantité, niveau 7, est déjà occupée par a635df43 « Fraction d'une fraction »
-- (publié, 4e ; passé de 5 à 7 le même jour par 20261101193000_questions_4_lot1_niveau, après le
-- relevé du lot ; un seul modèle publié par catégorie et par niveau,
-- idx_question_templates_unique_category). Les niveaux 1 à 7 sont pris (relevé MCP du
-- 2026-11-01) : le brouillon passe au premier niveau libre, 7 → 8. Aucun modèle publié n'est touché.
-- Le niveau n'est qu'un ordre d'affichage dans la catégorie. Ni le contenu, ni le nœud, ni les
-- tags, ni le statut ne changent : `updated_at` est PRÉSERVÉ. Le fichier
-- scripts/questions/cm2-5b/06-fraction-d-une-quantite.json porte le même niveau (clé de
-- create-questions et de publier-lot : titre, thème, domaine, sous-domaine, niveau).
-- ============================================================================
-- Décision de David le 2026-11-01 (journal docs/wip/questions-cm2-progress.md, § 10.8).
--
-- Le modèle n'existe qu'en production : en base locale, la migration ne touche aucun modèle et
-- ses vérifications le tolèrent. Elle est prouvée par
-- tests/integration/questions-cm2-lot5b-niveau.test.ts, qui fabrique une copie de
-- l'identifiant de la prod (catégorie et niveau relevés) puis rejoue CE fichier.
--
-- Garde : le modèle doit être encore en BROUILLON, dans sa catégorie et à son niveau relevés le
-- 2026-11-01 (MCP) ; aucun modèle publié ne doit occuper le niveau visé.
--
-- Données d'élèves : aucune (brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-11-01 AVANT le SQL,
-- tranchée par lui le 2026-11-01 : personne). Aucune règle ne change.
--
-- Rollback (aucune donnée d'élève). Il rend au modèle son niveau d'avant. Garde : il refuse si le
-- modèle n'est plus en brouillon ou n'est plus au niveau posé par la migration. Bloc éprouvé par
-- le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou
-- l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select 1 from public.question_templates where id = 'cf85bd1b-725b-4195-a65b-3c53d132a55d' for update;
-- do $garde_rollback$
-- begin
-- 	if (select count(*) from public.question_templates q
-- 	     where q.id = 'cf85bd1b-725b-4195-a65b-3c53d132a55d' and q.level = 8 and q.status = 'draft') <> 1 then
-- 		raise exception 'rollback refusé : un modèle a changé depuis la migration';
-- 	end if;
-- end $garde_rollback$;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set level = 7 where id = 'cf85bd1b-725b-4195-a65b-3c53d132a55d';
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
	('cf85bd1b-725b-4195-a65b-3c53d132a55d', 'Fractions', 'Calculer', 'Fraction d''une quantité', 7, 8);

select 1 from public.question_templates where id in (select id from _qn_modeles) order by id for update;

-- ---- 2. Gardes : présence TOUT ou RIEN, brouillon, catégorie et niveau relevés, niveau visé libre
do $garde$
declare v_presents integer; v_conformes integer; v_pris integer;
begin
	select count(*) into v_presents from _qn_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 1) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 1', v_presents;
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
