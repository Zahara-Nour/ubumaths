-- ============================================================================
-- Tle techno, lot 0 : tags TTECHNO sur 30 modèles publiés (1re spé, 2de, terminale)
-- ============================================================================
--   30 modèles déjà PUBLIÉS et déjà rangés reçoivent chacun UN point de Terminale technologique
--   (17 points) et le niveau `T_TECHNO` (aucun ne l'a). Rien d'autre ne change : ni contenu, ni
--   nœud, ni statut, ni leurs autres tags ; `updated_at` est PRÉSERVÉ. Aucun niveau n'est retiré.
-- ============================================================================
-- Chantier `questions-ttechno` (journal docs/wip/questions-ttechno-progress.md, § 9). Relevé de la
-- prod du 2026-11-17 (MCP) ; les 30 modèles lus en entier contre les bornes de Tle techno, puis
-- relus par David sur la page à cocher du lot 0 (30 « OK » sur 30 le 2026-11-17, dont les 4
-- marqués ⚠ : e4eaaf16, b0a94f05, a29488bc, a4b9281f). Instantanés : scripts/questions/ttechno-t0/.
--
-- Le point est résolu par son CODE (stable) ; le trigger des tags vérifie qu'il est posé sur le
-- nœud du modèle ou sur sa notion (e4eaaf16 est rangé sur une sous-notion fille du nœud de
-- TTECHNO-077), et qu'aucun autre point TTECHNO n'est déjà posé.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (30 modèles). Elle est prouvée par
-- tests/integration/questions-ttechno-lot0-tags.test.ts, qui fabrique des copies portant les vrais
-- identifiants, aux niveaux relevés, rangées comme en prod, puis rejoue CE fichier.
--
-- Niveaux : la migration n'AJOUTE que `T_TECHNO` (`array_append`), jamais une affectation complète
-- de `grades` (accord entre sessions du 2026-11-17 avec questions-1gen et questions-1techno).
-- Gardes : aucun des 30 n'a `T_TECHNO` ni de point TTECHNO ; sinon le lot est incohérent.
--
-- Données d'élèves : aucune n'est modifiée (cartes, tentatives, devoirs non touchés).
--
-- Accès : aucune règle (policy) ne change. Question d'accès tranchée par David le 2026-11-17
-- (journal § 3, Q2) : personne n'accède à une donnée nouvelle ; ces modèles, déjà publiés,
-- apparaissent en plus dans le catalogue et le cahier de texte de Terminale technologique.
-- Personne ne perd rien.
--
-- Rollback (aucune donnée d'élève). Il retire les 30 tags posés et `T_TECHNO` des 30 niveaux (les
-- autres niveaux restent tels qu'ils sont). Garde : il refuse si un modèle n'a plus `T_TECHNO` ou
-- si un des 30 tags manque. Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qtt0_retour;
-- create temporary table _qtt0_retour (id uuid primary key, code text not null);
-- insert into _qtt0_retour values
-- 	('0718f490-bfdd-4a62-b78f-b15753c27d8a', 'TTECHNO-068'),
-- 	('07ebdcbe-dc7c-45cf-ad81-df70231719a2', 'TTECHNO-059'),
-- 	('0af4bf32-b97e-493d-bea4-917b6bbdf6f2', 'TTECHNO-024'),
-- 	('1048e462-5585-4cf1-8915-2c6d7bf95244', 'TTECHNO-048'),
-- 	('2c116f4d-d7ef-4d8c-8114-9f113a983c4c', 'TTECHNO-056'),
-- 	('373fc5b4-63af-409d-a1b9-1320ae9b3b75', 'TTECHNO-024'),
-- 	('44b32cad-1803-4ff2-a649-4c502610b43c', 'TTECHNO-026'),
-- 	('5ba712bc-fda7-4d3c-80ee-b2aa8de6cc4f', 'TTECHNO-055'),
-- 	('65e96f31-31fe-4c2b-b894-e689b998b849', 'TTECHNO-024'),
-- 	('69a05f98-9dd9-4ce5-b23e-5376e85fbbaf', 'TTECHNO-056'),
-- 	('6dd2f133-e203-4cf6-a422-6a0e716203f3', 'TTECHNO-056'),
-- 	('6fbc355c-aca7-4e2e-8a55-78b3a5722e17', 'TTECHNO-068'),
-- 	('7201f3b2-bb5c-4963-a6a6-f64cdeb6f111', 'TTECHNO-046'),
-- 	('8354a0e7-f707-48e0-ac3d-f43cc5b2e2fa', 'TTECHNO-068'),
-- 	('96be181c-6cd4-43e9-9291-1cd526955408', 'TTECHNO-066'),
-- 	('a29488bc-0a0b-4ac8-a799-3d87f9b43d55', 'TTECHNO-062'),
-- 	('a4b9281f-3e12-4ae3-a4b7-3ac02043f491', 'TTECHNO-063'),
-- 	('a95a9c0d-0d5d-4a5a-ab50-294e12bb7f47', 'TTECHNO-064'),
-- 	('a9c71276-30e3-406f-8082-248cce389824', 'TTECHNO-056'),
-- 	('ad555cb1-c4a2-4390-ad14-6a626b39e0fb', 'TTECHNO-068'),
-- 	('b0a94f05-cd9d-437d-8481-79f619d3d2ac', 'TTECHNO-047'),
-- 	('bc59d5ce-a696-4460-91a3-ad8614de25a7', 'TTECHNO-068'),
-- 	('dbee4649-3ab6-49f0-8a5e-5814ce15ba43', 'TTECHNO-058'),
-- 	('e2908d60-2360-453c-a6e2-5c0318d8b9b2', 'TTECHNO-046'),
-- 	('e4eaaf16-407c-4a8b-9ba0-a93f28312fd6', 'TTECHNO-077'),
-- 	('e56be9b5-5189-48a6-aca9-4f7781ddcc51', 'TTECHNO-065'),
-- 	('e7cfe442-6653-4f97-a74e-08b8853d3305', 'TTECHNO-027'),
-- 	('eafd17a1-6e78-4bf3-932c-da806ac9d889', 'TTECHNO-068'),
-- 	('ecf4d46b-02d5-4fd1-86db-eac7b017a257', 'TTECHNO-056'),
-- 	('ef807ee9-f95b-469a-a6a8-4232e933b4c6', 'TTECHNO-026');
-- select 1 from public.question_templates where id in (select id from _qtt0_retour) order by id for update;
-- do $rollback$
-- declare v_presents integer; v_conformes integer; v_tags integer;
-- begin
-- 	select count(*), count(*) filter (where 'T_TECHNO' = any(q.grades))
-- 	  into v_presents, v_conformes
-- 	  from _qtt0_retour r join public.question_templates q on q.id = r.id;
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 30 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 30', v_presents;
-- 	end if;
-- 	if v_conformes <> 30 then
-- 		raise exception 'rollback : T_TECHNO retiré depuis la migration : % sur 30 conformes', v_conformes;
-- 	end if;
-- 	select count(*) into v_tags
-- 	  from _qtt0_retour r
-- 	  join public.curriculum_points p on p.code = r.code
-- 	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
-- 	if v_tags <> 30 then
-- 		raise exception 'rollback : tags changés depuis la migration : % sur 30 présents', v_tags;
-- 	end if;
-- 	delete from public.question_template_points t
-- 	 using _qtt0_retour r, public.curriculum_points p
-- 	 where p.code = r.code and t.template_id = r.id and t.point_id = p.id;
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates q set grades = array_remove(q.grades, 'T_TECHNO')
-- 	  from _qtt0_retour r where q.id = r.id;
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- end $rollback$;
-- drop table _qtt0_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les lignes des modèles sont verrouillées une à une.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qtt0_modeles;
create temporary table _qtt0_modeles (
	id uuid primary key,
	code text not null
);
insert into _qtt0_modeles values
	('0718f490-bfdd-4a62-b78f-b15753c27d8a', 'TTECHNO-068'),
	('07ebdcbe-dc7c-45cf-ad81-df70231719a2', 'TTECHNO-059'),
	('0af4bf32-b97e-493d-bea4-917b6bbdf6f2', 'TTECHNO-024'),
	('1048e462-5585-4cf1-8915-2c6d7bf95244', 'TTECHNO-048'),
	('2c116f4d-d7ef-4d8c-8114-9f113a983c4c', 'TTECHNO-056'),
	('373fc5b4-63af-409d-a1b9-1320ae9b3b75', 'TTECHNO-024'),
	('44b32cad-1803-4ff2-a649-4c502610b43c', 'TTECHNO-026'),
	('5ba712bc-fda7-4d3c-80ee-b2aa8de6cc4f', 'TTECHNO-055'),
	('65e96f31-31fe-4c2b-b894-e689b998b849', 'TTECHNO-024'),
	('69a05f98-9dd9-4ce5-b23e-5376e85fbbaf', 'TTECHNO-056'),
	('6dd2f133-e203-4cf6-a422-6a0e716203f3', 'TTECHNO-056'),
	('6fbc355c-aca7-4e2e-8a55-78b3a5722e17', 'TTECHNO-068'),
	('7201f3b2-bb5c-4963-a6a6-f64cdeb6f111', 'TTECHNO-046'),
	('8354a0e7-f707-48e0-ac3d-f43cc5b2e2fa', 'TTECHNO-068'),
	('96be181c-6cd4-43e9-9291-1cd526955408', 'TTECHNO-066'),
	('a29488bc-0a0b-4ac8-a799-3d87f9b43d55', 'TTECHNO-062'),
	('a4b9281f-3e12-4ae3-a4b7-3ac02043f491', 'TTECHNO-063'),
	('a95a9c0d-0d5d-4a5a-ab50-294e12bb7f47', 'TTECHNO-064'),
	('a9c71276-30e3-406f-8082-248cce389824', 'TTECHNO-056'),
	('ad555cb1-c4a2-4390-ad14-6a626b39e0fb', 'TTECHNO-068'),
	('b0a94f05-cd9d-437d-8481-79f619d3d2ac', 'TTECHNO-047'),
	('bc59d5ce-a696-4460-91a3-ad8614de25a7', 'TTECHNO-068'),
	('dbee4649-3ab6-49f0-8a5e-5814ce15ba43', 'TTECHNO-058'),
	('e2908d60-2360-453c-a6e2-5c0318d8b9b2', 'TTECHNO-046'),
	('e4eaaf16-407c-4a8b-9ba0-a93f28312fd6', 'TTECHNO-077'),
	('e56be9b5-5189-48a6-aca9-4f7781ddcc51', 'TTECHNO-065'),
	('e7cfe442-6653-4f97-a74e-08b8853d3305', 'TTECHNO-027'),
	('eafd17a1-6e78-4bf3-932c-da806ac9d889', 'TTECHNO-068'),
	('ecf4d46b-02d5-4fd1-86db-eac7b017a257', 'TTECHNO-056'),
	('ef807ee9-f95b-469a-a6a8-4232e933b4c6', 'TTECHNO-026');

select 1 from public.question_templates where id in (select id from _qtt0_modeles) order by id for update;

-- ---- 2. Gardes : présence TOUT ou RIEN, pas de T_TECHNO, aucun point TTECHNO -------
do $garde$
declare v_presents integer; v_sans integer; v_deja text; v_points integer;
begin
	select count(*), count(*) filter (where not ('T_TECHNO' = any(q.grades)))
	  into v_presents, v_sans
	  from _qtt0_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 30 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 30', v_presents;
	end if;
	if v_sans <> 30 then
		raise exception 'niveau T_TECHNO déjà présent : % sur 30 sans T_TECHNO', v_sans;
	end if;
	select string_agg(left(r.id::text, 8) || ' (' || p.code || ')', ', ') into v_deja
	  from _qtt0_modeles r
	  join public.question_template_points t on t.template_id = r.id
	  join public.curriculum_points p on p.id = t.point_id
	 where p.grade = 'T_TECHNO';
	if v_deja is not null then
		raise exception 'modèle(s) déjà tagué(s) d''un point TTECHNO : %', v_deja;
	end if;
	select count(distinct r.code) into v_points
	  from _qtt0_modeles r
	  join public.curriculum_points p on p.code = r.code and p.archived_at is null;
	if v_points <> 17 then
		raise exception 'points TTECHNO introuvables : % sur 17', v_points;
	end if;
end $garde$;

-- ---- 3. Tags et niveaux --------------------------------------------------------------
-- (en base locale, aucun modèle : la jointure ne rend rien et rien n'est écrit)
insert into public.question_template_points (template_id, point_id)
select r.id, p.id
  from _qtt0_modeles r
  join public.question_templates q on q.id = r.id
  join public.curriculum_points p on p.code = r.code and p.archived_at is null;

alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set grades = array_append(q.grades, 'T_TECHNO')
  from _qtt0_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- ---- 4. Vérification : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_conformes integer; v_tags integer;
begin
	select count(*), count(*) filter (where 'T_TECHNO' = any(q.grades))
	  into v_presents, v_conformes
	  from _qtt0_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	select count(*) into v_tags
	  from _qtt0_modeles r
	  join public.curriculum_points p on p.code = r.code and p.archived_at is null
	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
	if v_conformes <> 30 or v_tags <> 30 then
		raise exception 'lot incohérent : % modèle(s) sur 30 avec T_TECHNO, % tag(s) sur 30', v_conformes, v_tags;
	end if;
end $check$;

drop table _qtt0_modeles;
