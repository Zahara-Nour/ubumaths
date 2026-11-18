-- ============================================================================
-- 1re techno, lot T1 : tags 1TECHNO sur 15 modèles publiés de 1re spé et de 2de
-- ============================================================================
--   15 modèles déjà PUBLIÉS et déjà rangés (logique, algorithmique, suites) reçoivent chacun UN
--   point de 1re technologique et le niveau `1_TECHNO` (le cahier de texte filtre par niveau).
--   Rien d'autre ne change : ni contenu, ni nœud, ni statut, ni leurs autres tags ; `updated_at`
--   est PRÉSERVÉ. Aucun niveau n'est retiré.
-- ============================================================================
-- Chantier `questions-1techno` (journal docs/wip/questions-1techno-progress.md, § 3, 7 et 8).
-- Relevé de la prod du 2026-11-17 (MCP) ; les 15 modèles relus par David sur la page à cocher
-- du lot T1 (19 « OK » sur 19 le 2026-11-17). Quatre des 19 n'entrent pas ici : 5cb7f6ce, 8d4e5302,
-- a430a698 portent déjà un point 1TECHNO (un modèle a au plus un point par programme, ADR 0020,
-- trigger `question_template_points_check_rules`) ; 4f8f420a attend le choix entre 034 et 117.
--
-- Le point est résolu par son CODE (stable) ; le trigger des tags vérifie qu'il est posé sur le
-- nœud du modèle ou sur sa notion, et qu'aucun autre point 1TECHNO n'est déjà posé.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (15 modèles). Elle est prouvée par
-- tests/integration/questions-1techno-t1-tags.test.ts, qui fabrique des copies portant les vrais
-- identifiants, aux niveaux relevés, rangées sur le nœud du point visé, puis rejoue CE fichier.
--
-- Niveaux : la migration n'AJOUTE que `1_TECHNO` (`array_append`), jamais une affectation complète
-- de `grades` : les chantiers questions-1gen et questions-ttechno touchent les mêmes modèles et ne
-- touchent, eux, que leur niveau (accord entre sessions du 2026-11-17). Gardes : aucun des 15 n'a
-- déjà `1_TECHNO` ni un point 1TECHNO ; sinon le lot est incohérent.
--
-- Données d'élèves : aucune n'est modifiée (cartes, tentatives, devoirs non touchés).
--
-- Accès : aucune règle (policy) ne change. Question posée à David AVANT le SQL (« qui pourra lire
-- quoi, qu'il ne pouvait pas lire avant ? »), tranchée le 2026-11-17 : personne n'accède à une
-- donnée nouvelle ; ces modèles, déjà publiés, apparaissent en plus dans le catalogue et le cahier
-- de texte de 1re technologique. Personne ne perd rien.
--
-- Rollback (aucune donnée d'élève). Il retire les 15 tags posés et `1_TECHNO` des niveaux (les
-- autres niveaux restent tels qu'ils sont). Garde : il refuse si un modèle n'a plus `1_TECHNO` ou
-- si un des 15 tags manque. Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q1tt1_retour;
-- create temporary table _q1tt1_retour (id uuid primary key, code text not null);
-- insert into _q1tt1_retour values
-- 	('051ff81f-69df-475a-89d6-6eca7a225efa', '1TECHNO-011'),
-- 	('2ffa6d80-d62d-4de5-87f1-fcbb3fea7438', '1TECHNO-005'),
-- 	('344a2248-3f01-4b9e-8bd7-6fcb8537221a', '1TECHNO-008'),
-- 	('3cacefc5-59a1-498e-a453-fc25369110f9', '1TECHNO-004'),
-- 	('45da9678-f16d-4168-9e19-aefcd4197edb', '1TECHNO-032'),
-- 	('536c01bb-8401-4f53-b8ca-faf9bf4c243d', '1TECHNO-001'),
-- 	('5d17692b-397d-4de1-8629-fe5c5a5cc73b', '1TECHNO-009'),
-- 	('63849c41-cd39-4bd0-98e9-acba106f231e', '1TECHNO-108'),
-- 	('aeb1389d-0805-4421-9b25-1fcb4e4f4670', '1TECHNO-142'),
-- 	('d2943133-ebf7-424d-946a-8fed6cfa76be', '1TECHNO-046'),
-- 	('da04078f-0afb-4ca3-910e-45cb480e3b48', '1TECHNO-006'),
-- 	('de42b303-0c6b-4e54-9c1e-61d8a5d4fd6b', '1TECHNO-010'),
-- 	('e4eaaf16-407c-4a8b-9ba0-a93f28312fd6', '1TECHNO-120'),
-- 	('f3100c29-23bc-4bfe-b353-20f59d07371e', '1TECHNO-142'),
-- 	('fb3b536c-1ead-4863-85b2-a6104d949d50', '1TECHNO-106');
-- select 1 from public.question_templates where id in (select id from _q1tt1_retour) order by id for update;
-- do $rollback$
-- declare v_presents integer; v_conformes integer; v_tags integer;
-- begin
-- 	select count(*), count(*) filter (where '1_TECHNO' = any(q.grades))
-- 	  into v_presents, v_conformes
-- 	  from _q1tt1_retour r join public.question_templates q on q.id = r.id;
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 15 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 15', v_presents;
-- 	end if;
-- 	if v_conformes <> 15 then
-- 		raise exception 'rollback : 1_TECHNO retiré depuis la migration : % sur 15 conformes', v_conformes;
-- 	end if;
-- 	select count(*) into v_tags
-- 	  from _q1tt1_retour r
-- 	  join public.curriculum_points p on p.code = r.code
-- 	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
-- 	if v_tags <> 15 then
-- 		raise exception 'rollback : tags changés depuis la migration : % sur 15 présents', v_tags;
-- 	end if;
-- 	delete from public.question_template_points t
-- 	 using _q1tt1_retour r, public.curriculum_points p
-- 	 where p.code = r.code and t.template_id = r.id and t.point_id = p.id;
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates q set grades = array_remove(q.grades, '1_TECHNO')
-- 	  from _q1tt1_retour r where q.id = r.id;
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- end $rollback$;
-- drop table _q1tt1_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les lignes des modèles sont verrouillées une à une.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q1tt1_modeles;
create temporary table _q1tt1_modeles (
	id uuid primary key,
	code text not null
);
insert into _q1tt1_modeles values
	('051ff81f-69df-475a-89d6-6eca7a225efa', '1TECHNO-011'),
	('2ffa6d80-d62d-4de5-87f1-fcbb3fea7438', '1TECHNO-005'),
	('344a2248-3f01-4b9e-8bd7-6fcb8537221a', '1TECHNO-008'),
	('3cacefc5-59a1-498e-a453-fc25369110f9', '1TECHNO-004'),
	('45da9678-f16d-4168-9e19-aefcd4197edb', '1TECHNO-032'),
	('536c01bb-8401-4f53-b8ca-faf9bf4c243d', '1TECHNO-001'),
	('5d17692b-397d-4de1-8629-fe5c5a5cc73b', '1TECHNO-009'),
	('63849c41-cd39-4bd0-98e9-acba106f231e', '1TECHNO-108'),
	('aeb1389d-0805-4421-9b25-1fcb4e4f4670', '1TECHNO-142'),
	('d2943133-ebf7-424d-946a-8fed6cfa76be', '1TECHNO-046'),
	('da04078f-0afb-4ca3-910e-45cb480e3b48', '1TECHNO-006'),
	('de42b303-0c6b-4e54-9c1e-61d8a5d4fd6b', '1TECHNO-010'),
	('e4eaaf16-407c-4a8b-9ba0-a93f28312fd6', '1TECHNO-120'),
	('f3100c29-23bc-4bfe-b353-20f59d07371e', '1TECHNO-142'),
	('fb3b536c-1ead-4863-85b2-a6104d949d50', '1TECHNO-106');

select 1 from public.question_templates where id in (select id from _q1tt1_modeles) order by id for update;

-- ---- 2. Gardes : présence TOUT ou RIEN, niveaux du relevé, aucun point 1TECHNO -----
do $garde$
declare v_presents integer; v_conformes integer; v_deja text; v_points integer;
begin
	select count(*), count(*) filter (where not ('1_TECHNO' = any(q.grades)))
	  into v_presents, v_conformes
	  from _q1tt1_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 15 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 15', v_presents;
	end if;
	if v_conformes <> 15 then
		raise exception 'niveau 1_TECHNO déjà présent : % sur 15 sans lui', v_conformes;
	end if;
	select string_agg(left(r.id::text, 8) || ' (' || p.code || ')', ', ') into v_deja
	  from _q1tt1_modeles r
	  join public.question_template_points t on t.template_id = r.id
	  join public.curriculum_points p on p.id = t.point_id
	 where p.grade = '1_TECHNO';
	if v_deja is not null then
		raise exception 'modèle(s) déjà tagué(s) d''un point 1TECHNO : %', v_deja;
	end if;
	select count(distinct r.code) into v_points
	  from _q1tt1_modeles r
	  join public.curriculum_points p on p.code = r.code and p.archived_at is null;
	if v_points <> 14 then
		raise exception 'points 1TECHNO introuvables : % sur 14', v_points;
	end if;
end $garde$;

-- ---- 3. Tags et niveaux --------------------------------------------------------------
-- (en base locale, aucun modèle : la jointure ne rend rien et rien n'est écrit)
insert into public.question_template_points (template_id, point_id)
select r.id, p.id
  from _q1tt1_modeles r
  join public.question_templates q on q.id = r.id
  join public.curriculum_points p on p.code = r.code and p.archived_at is null;

alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set grades = array_append(q.grades, '1_TECHNO')
  from _q1tt1_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- ---- 4. Vérification : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_conformes integer; v_tags integer;
begin
	select count(*), count(*) filter (where '1_TECHNO' = any(q.grades))
	  into v_presents, v_conformes
	  from _q1tt1_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	select count(*) into v_tags
	  from _q1tt1_modeles r
	  join public.curriculum_points p on p.code = r.code and p.archived_at is null
	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
	if v_conformes <> 15 or v_tags <> 15 then
		raise exception 'lot incohérent : % modèle(s) sur 15 avec 1_TECHNO, % tag(s) sur 15', v_conformes, v_tags;
	end if;
end $check$;

drop table _q1tt1_modeles;
