-- ============================================================================
-- Niveaux de Terminale manquants : 07bce646 (+ T_COMP) et 4ff9d049 (+ T_TECHNO)
-- ============================================================================
--   Deux modèles publiés sont tagués d'un point d'une Terminale absente de leurs `grades` :
--   - 07bce646 « Opérations sur les limites », `[T_SPE]`, tagué TCOMP-204 → + T_COMP ;
--   - 4ff9d049 « Loi binomiale : identifier les paramètres n et p », `[T_SPE, T_COMP]`, tagué
--     TTECHNO-089 → + T_TECHNO.
--   Le cahier de texte filtre les modèles par niveau (`.contains('grades', [niveau])`) : ces classes
--   ne les voyaient pas. La migration AJOUTE ces niveaux, rien d'autre : ni nœud, ni tag, ni contenu,
--   ni statut ; `updated_at` est PRÉSERVÉ. Aucun niveau n'est retiré. Même forme que
--   20261103082130_questions_1techno_grades (#2280) et 20261103084609_questions_1gen_grades.
-- ============================================================================
-- Décision de David le 2026-11-03 (journal docs/wip/garde-niveaux-tags-progress.md § 2, écarts trouvés
-- par scripts/questions/garde-niveaux-tags.ts). Les 5 brouillons de seconde tagués aussi de Terminale
-- restent `['2']` (questions-2de Q7 c) : hors de cette migration. Relevé de la prod du 2026-11-03 (MCP).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (2 modèles). Elle est prouvée par
-- tests/integration/questions-terminale-grades.test.ts, qui fabrique des copies des identifiants de
-- la prod aux niveaux relevés puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore EXACTEMENT aux niveaux du relevé, sinon une saisie faite
-- depuis serait écrasée. Les tags ne sont pas gardés : la migration n'en dépend pas pour écrire.
--
-- Données d'élèves : aucune n'est modifiée (cartes, tentatives, devoirs non touchés).
--
-- Accès : aucune règle (policy) ne change. Question d'accès posée à David AVANT le SQL, approuvée le
-- 2026-11-03 (« oui ») : le prof et les élèves d'une classe de Terminale complémentaire (07bce646) ou
-- de Terminale technologique (4ff9d049) voient ce modèle publié dans le cahier de texte et les listes
-- filtrées par niveau ; personne ne perd rien.
--
-- Rollback (aucune donnée d'élève). Il rend les 2 modèles à leurs niveaux du relevé. Garde : il
-- refuse si un modèle n'est plus EXACTEMENT aux niveaux posés par la migration. Bloc éprouvé par
-- le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou
-- l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qtgn_retour;
-- create temporary table _qtgn_retour (id uuid primary key, grades_avant text[] not null, grades_apres text[] not null);
-- insert into _qtgn_retour values
-- 	('07bce646-6a88-4b7c-aaf6-fe07ffa63ed6', array['T_SPE'], array['T_SPE', 'T_COMP']),
-- 	('4ff9d049-afd9-4fd2-be40-f8e242923af4', array['T_SPE', 'T_COMP'], array['T_SPE', 'T_COMP', 'T_TECHNO']);
-- select 1 from public.question_templates where id in (select id from _qtgn_retour) order by id for update;
-- do $rollback$
-- declare v_presents integer; v_conformes integer;
-- begin
-- 	select count(*), count(*) filter (where q.grades = r.grades_apres)
-- 	  into v_presents, v_conformes
-- 	  from _qtgn_retour r join public.question_templates q on q.id = r.id;
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 2 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 2', v_presents;
-- 	end if;
-- 	if v_conformes <> 2 then
-- 		raise exception 'rollback : niveaux changés depuis la migration : % sur 2 conformes', v_conformes;
-- 	end if;
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates q set grades = r.grades_avant
-- 	  from _qtgn_retour r where q.id = r.id;
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- end $rollback$;
-- drop table _qtgn_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les lignes des modèles sont verrouillées une à une.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qtgn_modeles;
create temporary table _qtgn_modeles (
	id uuid primary key,
	grades_avant text[] not null,
	grades_apres text[] not null
);
insert into _qtgn_modeles values
	('07bce646-6a88-4b7c-aaf6-fe07ffa63ed6', array['T_SPE'], array['T_SPE', 'T_COMP']),
	('4ff9d049-afd9-4fd2-be40-f8e242923af4', array['T_SPE', 'T_COMP'], array['T_SPE', 'T_COMP', 'T_TECHNO']);

select 1 from public.question_templates where id in (select id from _qtgn_modeles) order by id for update;

-- ---- 2. Garde : présence TOUT ou RIEN, niveaux du relevé ---------------------------
do $garde$
declare v_presents integer; v_conformes integer;
begin
	select count(*), count(*) filter (where q.grades = r.grades_avant)
	  into v_presents, v_conformes
	  from _qtgn_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 2 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 2', v_presents;
	end if;
	if v_conformes <> 2 then
		raise exception 'niveaux changés depuis le relevé : % sur 2 conformes', v_conformes;
	end if;
end $garde$;

-- ---- 3. Niveaux ----------------------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set grades = r.grades_apres
  from _qtgn_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- ---- 4. Vérification : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_conformes integer;
begin
	select count(*), count(*) filter (where q.grades = r.grades_apres)
	  into v_presents, v_conformes
	  from _qtgn_modeles r join public.question_templates q on q.id = r.id;
	if v_presents <> 0 and v_conformes <> 2 then
		raise exception 'lot incohérent : % modèle(s) sur 2 aux niveaux visés', v_conformes;
	end if;
end $check$;

drop table _qtgn_modeles;
