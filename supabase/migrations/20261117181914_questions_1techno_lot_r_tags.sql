-- ============================================================================
-- 1re techno, lot R : tags 1TECHNO sur 3 modèles « représentation graphique » communs avec la 1re générale
-- ============================================================================
--   3 modèles écrits par le chantier questions-1gen (rangés et tagués 1GEN par
--   20261117174437, leur lot 2) reçoivent chacun UN point de 1re technologique et le niveau
--   `1_TECHNO` :
--     96668141 R2 « placer, arithmétique »  → 1TECHNO-044 (à côté de 1GEN-019)
--     13388e8f R3 « placer, géométrique »   → 1TECHNO-117 (à côté de 1GEN-041)
--     e8f08a19 R4 « lire sur le nuage »     → 1TECHNO-119 (à côté de 1GEN-058)
--   Rien d'autre ne change : ni contenu, ni nœud, ni statut, ni le tag 1GEN ; `updated_at` est
--   PRÉSERVÉ. Aucun niveau n'est retiré.
-- ============================================================================
-- Chantier `questions-1techno` (journal docs/wip/questions-1techno-progress.md, § 18 à 22).
-- Relevé de la prod du 2026-11-17 (MCP) : grades = {1_GEN}, publiés par questions-1gen, tous les
-- trois rangés sur le nœud « Suites > Généralités sur les suites > représentation graphique »,
-- qui porte aussi les 3 points 1TECHNO visés. Les 3 modèles relus par David sur la page à cocher
-- du lot R (3 « OK » sur 3 le 2026-11-17). Instantanés : scripts/questions/1techno-r/.
--
-- Ordre : APRÈS 20261117174437 (nœuds des modèles, exigés par le trigger des tags).
--
-- Le point est résolu par son CODE (stable) ; le trigger des tags vérifie qu'il est posé sur le
-- nœud du modèle ou sur sa notion, et qu'aucun autre point 1TECHNO n'est déjà posé.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (3 modèles). Elle est prouvée par
-- tests/integration/questions-1techno-lot-r-tags.test.ts, qui fabrique des copies portant les vrais
-- identifiants, au niveau relevé, rangées sur le nœud du point visé et taguées de leur point 1GEN,
-- puis rejoue CE fichier.
--
-- Niveaux : la migration n'AJOUTE que `1_TECHNO` (`array_append`), jamais une affectation complète
-- de `grades` (accord entre sessions du 2026-11-17 avec questions-1gen et questions-ttechno).
-- Gardes : aucun des 3 n'a `1_TECHNO` ni de point 1TECHNO ; sinon le lot est incohérent.
--
-- Données d'élèves : aucune n'est modifiée (cartes, tentatives, devoirs non touchés).
--
-- Accès : aucune règle (policy) ne change. Question d'accès tranchée par David le 2026-11-17 pour
-- le chantier (lot T1, même nature) : personne n'accède à une donnée nouvelle ; ces modèles, déjà
-- publiés, apparaissent en plus dans le catalogue et le cahier de texte de 1re technologique.
-- Personne ne perd rien.
--
-- Rollback (aucune donnée d'élève). Il retire les 3 tags 1TECHNO posés et `1_TECHNO` des niveaux
-- (le tag 1GEN et les autres niveaux restent tels qu'ils sont). Garde : il refuse si un modèle n'a
-- plus `1_TECHNO` ou si un des 3 tags manque.
-- Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q1tr_retour;
-- create temporary table _q1tr_retour (id uuid primary key, code text not null);
-- insert into _q1tr_retour values
-- 	('96668141-c1a7-4996-bb59-b39f6c106b45', '1TECHNO-044'),
-- 	('13388e8f-e662-4f28-97b6-934afaeead31', '1TECHNO-117'),
-- 	('e8f08a19-b417-4183-9cd3-fab7f3810211', '1TECHNO-119');
-- select 1 from public.question_templates where id in (select id from _q1tr_retour) order by id for update;
-- do $rollback$
-- declare v_presents integer; v_conformes integer; v_tags integer;
-- begin
-- 	select count(*), count(*) filter (where '1_TECHNO' = any(q.grades))
-- 	  into v_presents, v_conformes
-- 	  from _q1tr_retour r join public.question_templates q on q.id = r.id;
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 3 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 3', v_presents;
-- 	end if;
-- 	if v_conformes <> 3 then
-- 		raise exception 'rollback : 1_TECHNO retiré depuis la migration : % sur 3 conformes', v_conformes;
-- 	end if;
-- 	select count(*) into v_tags
-- 	  from _q1tr_retour r
-- 	  join public.curriculum_points p on p.code = r.code
-- 	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
-- 	if v_tags <> 3 then
-- 		raise exception 'rollback : tags changés depuis la migration : % sur 3 présents', v_tags;
-- 	end if;
-- 	delete from public.question_template_points t
-- 	 using _q1tr_retour r, public.curriculum_points p
-- 	 where p.code = r.code and t.template_id = r.id and t.point_id = p.id;
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates q set grades = array_remove(q.grades, '1_TECHNO')
-- 	  from _q1tr_retour r where q.id = r.id;
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- end $rollback$;
-- drop table _q1tr_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les lignes des modèles sont verrouillées une à une.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q1tr_modeles;
create temporary table _q1tr_modeles (
	id uuid primary key,
	code text not null
);
insert into _q1tr_modeles values
	('96668141-c1a7-4996-bb59-b39f6c106b45', '1TECHNO-044'),
	('13388e8f-e662-4f28-97b6-934afaeead31', '1TECHNO-117'),
	('e8f08a19-b417-4183-9cd3-fab7f3810211', '1TECHNO-119');

select 1 from public.question_templates where id in (select id from _q1tr_modeles) order by id for update;

-- ---- 2. Gardes : présence TOUT ou RIEN, niveau du relevé, aucun point 1TECHNO -------
do $garde$
declare v_presents integer; v_conformes integer; v_deja text; v_points integer;
begin
	select count(*), count(*) filter (where not ('1_TECHNO' = any(q.grades)))
	  into v_presents, v_conformes
	  from _q1tr_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 3 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 3', v_presents;
	end if;
	if v_conformes <> 3 then
		raise exception 'niveau 1_TECHNO différent du relevé : % sur 3 conformes', v_conformes;
	end if;
	select string_agg(left(r.id::text, 8) || ' (' || p.code || ')', ', ') into v_deja
	  from _q1tr_modeles r
	  join public.question_template_points t on t.template_id = r.id
	  join public.curriculum_points p on p.id = t.point_id
	 where p.grade = '1_TECHNO';
	if v_deja is not null then
		raise exception 'modèle(s) déjà tagué(s) d''un point 1TECHNO : %', v_deja;
	end if;
	select count(distinct r.code) into v_points
	  from _q1tr_modeles r
	  join public.curriculum_points p on p.code = r.code and p.archived_at is null;
	if v_points <> 3 then
		raise exception 'points 1TECHNO introuvables : % sur 3', v_points;
	end if;
end $garde$;

-- ---- 3. Tags et niveaux --------------------------------------------------------------
-- (en base locale, aucun modèle : la jointure ne rend rien et rien n'est écrit)
insert into public.question_template_points (template_id, point_id)
select r.id, p.id
  from _q1tr_modeles r
  join public.question_templates q on q.id = r.id
  join public.curriculum_points p on p.code = r.code and p.archived_at is null;

alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set grades = array_append(q.grades, '1_TECHNO')
  from _q1tr_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- ---- 4. Vérification : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_conformes integer; v_tags integer;
begin
	select count(*), count(*) filter (where '1_TECHNO' = any(q.grades))
	  into v_presents, v_conformes
	  from _q1tr_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	select count(*) into v_tags
	  from _q1tr_modeles r
	  join public.curriculum_points p on p.code = r.code and p.archived_at is null
	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
	if v_conformes <> 3 or v_tags <> 3 then
		raise exception 'lot incohérent : % modèle(s) sur 3 avec 1_TECHNO, % tag(s) sur 3', v_conformes, v_tags;
	end if;
end $check$;

drop table _q1tr_modeles;
