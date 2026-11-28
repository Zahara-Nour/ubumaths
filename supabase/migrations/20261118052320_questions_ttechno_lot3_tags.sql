-- ============================================================================
-- Tle techno, lot 3 : tags TTECHNO sur 6 modèles publiés de 1re générale (aˣ, taux moyen)
-- ============================================================================
--   6 modèles déjà PUBLIÉS et déjà rangés, écrits par le chantier `questions-1gen` (lots 3 et 4),
--   reçoivent chacun UN point de Terminale technologique (6 points) et le niveau `T_TECHNO`
--   (aucun ne l'a). Rien d'autre ne change : ni contenu, ni nœud, ni statut, ni leurs tags 1GEN ;
--   `updated_at` est PRÉSERVÉ. Aucun niveau n'est retiré.
-- ============================================================================
-- Chantier `questions-ttechno` (journal docs/wip/questions-ttechno-progress.md, § 8 bis et § 20).
-- Rattachements convenus en phase 0 avec `questions-1gen` (Q15 de David : E2 est un modèle commun).
-- Les 6 lus en entier contre les bornes de Tle techno (MCP, 2026-11-17/18) :
--   E1 e4e65a69 → 031 · E2 60971c9a → 081 · E3 2a9c316a → 032 · E4 065eea60 → 033 ·
--   T1 a439df84 → 035 · T2 f84e23a3 → 038.
-- E2, variante 3 (aˣ × bˣ = (ab)ˣ, hors des trois propriétés citées par le BO) : taguée telle
-- quelle, décision de David du 2026-11-18 (« par extension des puissances entières »).
--
-- Le point est résolu par son CODE (stable) ; le trigger des tags vérifie qu'il est posé sur le
-- nœud du modèle ou sur sa notion (les 6 sont rangés sur le nœud même de leur point : relevé MCP
-- du 2026-11-18), et qu'aucun autre point TTECHNO n'est déjà posé.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée par
-- tests/integration/questions-ttechno-lot3-tags.test.ts, qui fabrique des copies portant les vrais
-- identifiants, aux niveaux relevés, rangées comme en prod, puis rejoue CE fichier.
--
-- Niveaux : la migration n'AJOUTE que `T_TECHNO` (`array_append`), jamais une affectation complète
-- de `grades` (accord entre sessions du 2026-11-17 avec questions-1gen et questions-1techno).
-- Gardes : aucun des 6 n'a `T_TECHNO` ni de point TTECHNO ; sinon le lot est incohérent.
--
-- Données d'élèves : aucune n'est modifiée (cartes, tentatives, devoirs non touchés).
--
-- Accès : aucune règle (policy) ne change. Question d'accès tranchée par David le 2026-11-18 :
-- ces 6 modèles, déjà publiés pour la 1re générale, apparaissent en plus dans le catalogue et le
-- cahier de texte de Terminale technologique. Personne ne perd rien.
--
-- ⚠ Les rollbacks commentés des migrations 20261117191427 et 20261117222809 (questions-1gen)
-- retirent le nœud de ces modèles : ne plus les jouer une fois ces tags posés.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags posés et `T_TECHNO` des 6 niveaux (les
-- autres niveaux restent tels qu'ils sont). Garde : il refuse si un modèle n'a plus `T_TECHNO` ou
-- si un des 6 tags manque. Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qtt3_retour;
-- create temporary table _qtt3_retour (id uuid primary key, code text not null);
-- insert into _qtt3_retour values
-- 	('065eea60-1d6d-4404-9015-f4624e661ab2', 'TTECHNO-033'),
-- 	('2a9c316a-ee3d-44dc-89be-8b3b5c00ac2c', 'TTECHNO-032'),
-- 	('60971c9a-82e7-4ed5-a18a-7520b40c38b2', 'TTECHNO-081'),
-- 	('a439df84-9d32-4138-bbc1-cf846616e0ca', 'TTECHNO-035'),
-- 	('e4e65a69-2710-45d1-9592-1edd100d9067', 'TTECHNO-031'),
-- 	('f84e23a3-36c0-4cb0-801f-3807134f307d', 'TTECHNO-038');
-- select 1 from public.question_templates where id in (select id from _qtt3_retour) order by id for update;
-- do $rollback$
-- declare v_presents integer; v_conformes integer; v_tags integer;
-- begin
-- 	select count(*), count(*) filter (where 'T_TECHNO' = any(q.grades))
-- 	  into v_presents, v_conformes
-- 	  from _qtt3_retour r join public.question_templates q on q.id = r.id;
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 6 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 6', v_presents;
-- 	end if;
-- 	if v_conformes <> 6 then
-- 		raise exception 'rollback : T_TECHNO retiré depuis la migration : % sur 6 conformes', v_conformes;
-- 	end if;
-- 	select count(*) into v_tags
-- 	  from _qtt3_retour r
-- 	  join public.curriculum_points p on p.code = r.code
-- 	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
-- 	if v_tags <> 6 then
-- 		raise exception 'rollback : tags changés depuis la migration : % sur 6 présents', v_tags;
-- 	end if;
-- 	delete from public.question_template_points t
-- 	 using _qtt3_retour r, public.curriculum_points p
-- 	 where p.code = r.code and t.template_id = r.id and t.point_id = p.id;
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates q set grades = array_remove(q.grades, 'T_TECHNO')
-- 	  from _qtt3_retour r where q.id = r.id;
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- end $rollback$;
-- drop table _qtt3_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les lignes des modèles sont verrouillées une à une.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qtt3_modeles;
create temporary table _qtt3_modeles (
	id uuid primary key,
	code text not null
);
insert into _qtt3_modeles values
	('065eea60-1d6d-4404-9015-f4624e661ab2', 'TTECHNO-033'),
	('2a9c316a-ee3d-44dc-89be-8b3b5c00ac2c', 'TTECHNO-032'),
	('60971c9a-82e7-4ed5-a18a-7520b40c38b2', 'TTECHNO-081'),
	('a439df84-9d32-4138-bbc1-cf846616e0ca', 'TTECHNO-035'),
	('e4e65a69-2710-45d1-9592-1edd100d9067', 'TTECHNO-031'),
	('f84e23a3-36c0-4cb0-801f-3807134f307d', 'TTECHNO-038');

select 1 from public.question_templates where id in (select id from _qtt3_modeles) order by id for update;

-- ---- 2. Gardes : présence TOUT ou RIEN, pas de T_TECHNO, aucun point TTECHNO -------
do $garde$
declare v_presents integer; v_sans integer; v_deja text; v_points integer;
begin
	select count(*), count(*) filter (where not ('T_TECHNO' = any(q.grades)))
	  into v_presents, v_sans
	  from _qtt3_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 6 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	if v_sans <> 6 then
		raise exception 'niveau T_TECHNO déjà présent : % sur 6 sans T_TECHNO', v_sans;
	end if;
	select string_agg(left(r.id::text, 8) || ' (' || p.code || ')', ', ') into v_deja
	  from _qtt3_modeles r
	  join public.question_template_points t on t.template_id = r.id
	  join public.curriculum_points p on p.id = t.point_id
	 where p.grade = 'T_TECHNO';
	if v_deja is not null then
		raise exception 'modèle(s) déjà tagué(s) d''un point TTECHNO : %', v_deja;
	end if;
	select count(distinct r.code) into v_points
	  from _qtt3_modeles r
	  join public.curriculum_points p on p.code = r.code and p.archived_at is null;
	if v_points <> 6 then
		raise exception 'points TTECHNO introuvables : % sur 6', v_points;
	end if;
end $garde$;

-- ---- 3. Tags et niveaux --------------------------------------------------------------
-- (en base locale, aucun modèle : la jointure ne rend rien et rien n'est écrit)
insert into public.question_template_points (template_id, point_id)
select r.id, p.id
  from _qtt3_modeles r
  join public.question_templates q on q.id = r.id
  join public.curriculum_points p on p.code = r.code and p.archived_at is null;

alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set grades = array_append(q.grades, 'T_TECHNO')
  from _qtt3_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- ---- 4. Vérification : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_conformes integer; v_tags integer;
begin
	select count(*), count(*) filter (where 'T_TECHNO' = any(q.grades))
	  into v_presents, v_conformes
	  from _qtt3_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	select count(*) into v_tags
	  from _qtt3_modeles r
	  join public.curriculum_points p on p.code = r.code and p.archived_at is null
	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
	if v_conformes <> 6 or v_tags <> 6 then
		raise exception 'lot incohérent : % modèle(s) sur 6 avec T_TECHNO, % tag(s) sur 6', v_conformes, v_tags;
	end if;
end $check$;

drop table _qtt3_modeles;
