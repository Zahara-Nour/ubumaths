-- ============================================================================
-- 1re techno, lot T2 : tags 1TECHNO sur 33 modèles publiés (1re spé, 2de, 3e, terminale)
-- ============================================================================
--   33 modèles déjà PUBLIÉS et déjà rangés reçoivent chacun UN point de 1re technologique
--   (24 points) et, s'il leur manque, le niveau `1_TECHNO` (31 sur 33 : 5397c20f et 95ee57c8
--   l'ont déjà). Rien d'autre ne change : ni contenu, ni nœud, ni statut, ni leurs autres tags ;
--   `updated_at` est PRÉSERVÉ. Aucun niveau n'est retiré.
-- ============================================================================
-- Chantier `questions-1techno` (journal docs/wip/questions-1techno-progress.md, § 9, 10 et 11).
-- Relevé de la prod du 2026-11-17 (MCP), refait sur la branche T2 ; les 33 modèles relus par David
-- sur la page à cocher du lot T2 (33 « OK » sur 33 le 2026-11-17). Instantanés :
-- scripts/questions/1techno-t2/.
--
-- Ordre : APRÈS la migration 20261117124605_questions_1gen_tags (#2744), qui vérifie le relevé
-- exact des tags de 8 de ces modèles (21f42c7f, 42bb2d66, aab8e41c, afe51ac4, d8c9cb60, f2ed0ea0,
-- 5397c20f, 95ee57c8) : posés avant elle, nos tags la feraient échouer.
--
-- Le point est résolu par son CODE (stable) ; le trigger des tags vérifie qu'il est posé sur le
-- nœud du modèle ou sur sa notion, et qu'aucun autre point 1TECHNO n'est déjà posé.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (33 modèles). Elle est prouvée par
-- tests/integration/questions-1techno-t2-tags.test.ts, qui fabrique des copies portant les vrais
-- identifiants, aux niveaux relevés, rangées sur le nœud du point visé (ou sur une sous-notion
-- fille, comme en prod pour 6 d'entre eux), puis rejoue CE fichier.
--
-- Niveaux : la migration n'AJOUTE que `1_TECHNO` (`array_append`), et seulement aux 31 modèles
-- marqués `ajout`, jamais une affectation complète de `grades` (accord entre sessions du
-- 2026-11-17 avec questions-1gen et questions-ttechno). Gardes : les 31 n'ont pas `1_TECHNO`, les
-- 2 autres l'ont ; aucun des 33 n'a de point 1TECHNO ; sinon le lot est incohérent.
--
-- Données d'élèves : aucune n'est modifiée (cartes, tentatives, devoirs non touchés).
--
-- Accès : aucune règle (policy) ne change. Question d'accès tranchée par David le 2026-11-17 pour
-- le chantier (lot T1, même nature) : personne n'accède à une donnée nouvelle ; ces modèles, déjà
-- publiés, apparaissent en plus dans le catalogue et le cahier de texte de 1re technologique.
-- Personne ne perd rien.
--
-- Rollback (aucune donnée d'élève). Il retire les 33 tags posés et `1_TECHNO` des 31 niveaux où
-- la migration l'a ajouté (5397c20f et 95ee57c8 le gardent ; les autres niveaux restent tels
-- qu'ils sont). Garde : il refuse si un modèle n'a plus `1_TECHNO` ou si un des 33 tags manque.
-- Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q1tt2_retour;
-- create temporary table _q1tt2_retour (id uuid primary key, code text not null, deja boolean not null);
-- insert into _q1tt2_retour values
-- 	('03b3d9b3-2d38-4062-a70b-c9b31839444b', '1TECHNO-076', false),
-- 	('21f42c7f-82bc-4204-b294-cb9658bcfd8e', '1TECHNO-089', false),
-- 	('286a68a8-49c1-4d7d-b845-452457e8dab8', '1TECHNO-055', false),
-- 	('3020b065-2be5-4541-beda-1115718121c5', '1TECHNO-068', false),
-- 	('3bd19f82-85f7-4828-8cac-2a2281642f86', '1TECHNO-098', false),
-- 	('42bb2d66-4559-4a1b-8124-de6977fbb0b1', '1TECHNO-094', false),
-- 	('42c19a19-4533-4dc5-81a3-2dba70b5cdb4', '1TECHNO-054', false),
-- 	('49fac266-f622-4ef5-8a2b-5638ca5a4c99', '1TECHNO-083', false),
-- 	('4ce02817-c5b4-4500-9d0c-0bbf7be0a662', '1TECHNO-007', false),
-- 	('4f8f420a-c93b-4d99-8fe2-acfac2d38cbe', '1TECHNO-034', false),
-- 	('5397c20f-7b3a-4d56-b441-644607e0138a', '1TECHNO-139', true),
-- 	('6ad254b4-69c3-49db-9541-fa921964cefc', '1TECHNO-053', false),
-- 	('77498f1b-3625-4701-aa9c-f6132eb3b4ba', '1TECHNO-100', false),
-- 	('7953dcfc-bedc-465e-9abe-b8db19647d7e', '1TECHNO-102', false),
-- 	('8354a0e7-f707-48e0-ac3d-f43cc5b2e2fa', '1TECHNO-096', false),
-- 	('8a384698-1367-4a12-a995-b6cd4df9cfe1', '1TECHNO-060', false),
-- 	('8d46dd50-34ea-4504-b92f-d269a84f0179', '1TECHNO-007', false),
-- 	('95ee57c8-4e16-4554-add5-cb8f72ee6f28', '1TECHNO-127', true),
-- 	('9c04693a-33f3-4c4c-bf1a-ff801b8b15c4', '1TECHNO-098', false),
-- 	('9f072622-9ce5-4e76-b02e-a738bf6ea39a', '1TECHNO-060', false),
-- 	('a16a9bba-2cc5-48d8-b98b-eb4fee6ded3d', '1TECHNO-129', false),
-- 	('a181f10b-1b9c-436c-8f8c-51cce68352db', '1TECHNO-073', false),
-- 	('aab8e41c-4539-4c90-9c1d-6ee41dc7a1cb', '1TECHNO-058', false),
-- 	('ad555cb1-c4a2-4390-ad14-6a626b39e0fb', '1TECHNO-096', false),
-- 	('afe51ac4-8552-454e-b45e-46f0edbd9416', '1TECHNO-066', false),
-- 	('b7b0c27b-0c30-4297-b707-53f328d36f7a', '1TECHNO-132', false),
-- 	('bc59d5ce-a696-4460-91a3-ad8614de25a7', '1TECHNO-096', false),
-- 	('d1010214-1537-4b3d-9b99-1b3718a5d981', '1TECHNO-047', false),
-- 	('d8c9cb60-e9c5-4f38-a8d9-b5c2b83de908', '1TECHNO-093', false),
-- 	('ddc60d24-ddce-473b-8e23-58af62ec8b78', '1TECHNO-054', false),
-- 	('de73e71d-031b-4f9a-b3c9-a1cc6f970a0e', '1TECHNO-055', false),
-- 	('e4784c78-13d5-49ac-b50b-b07efca03d19', '1TECHNO-007', false),
-- 	('f2ed0ea0-e285-49fc-93df-9e388cc36eb0', '1TECHNO-093', false);
-- select 1 from public.question_templates where id in (select id from _q1tt2_retour) order by id for update;
-- do $rollback$
-- declare v_presents integer; v_conformes integer; v_tags integer;
-- begin
-- 	select count(*), count(*) filter (where '1_TECHNO' = any(q.grades))
-- 	  into v_presents, v_conformes
-- 	  from _q1tt2_retour r join public.question_templates q on q.id = r.id;
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 33 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 33', v_presents;
-- 	end if;
-- 	if v_conformes <> 33 then
-- 		raise exception 'rollback : 1_TECHNO retiré depuis la migration : % sur 33 conformes', v_conformes;
-- 	end if;
-- 	select count(*) into v_tags
-- 	  from _q1tt2_retour r
-- 	  join public.curriculum_points p on p.code = r.code
-- 	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
-- 	if v_tags <> 33 then
-- 		raise exception 'rollback : tags changés depuis la migration : % sur 33 présents', v_tags;
-- 	end if;
-- 	delete from public.question_template_points t
-- 	 using _q1tt2_retour r, public.curriculum_points p
-- 	 where p.code = r.code and t.template_id = r.id and t.point_id = p.id;
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates q set grades = array_remove(q.grades, '1_TECHNO')
-- 	  from _q1tt2_retour r where q.id = r.id and not r.deja;
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- end $rollback$;
-- drop table _q1tt2_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les lignes des modèles sont verrouillées une à une.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
-- `deja` : le modèle a déjà le niveau 1_TECHNO (relevé) ; on ne le lui ajoute pas.
drop table if exists pg_temp._q1tt2_modeles;
create temporary table _q1tt2_modeles (
	id uuid primary key,
	code text not null,
	deja boolean not null
);
insert into _q1tt2_modeles values
	('03b3d9b3-2d38-4062-a70b-c9b31839444b', '1TECHNO-076', false),
	('21f42c7f-82bc-4204-b294-cb9658bcfd8e', '1TECHNO-089', false),
	('286a68a8-49c1-4d7d-b845-452457e8dab8', '1TECHNO-055', false),
	('3020b065-2be5-4541-beda-1115718121c5', '1TECHNO-068', false),
	('3bd19f82-85f7-4828-8cac-2a2281642f86', '1TECHNO-098', false),
	('42bb2d66-4559-4a1b-8124-de6977fbb0b1', '1TECHNO-094', false),
	('42c19a19-4533-4dc5-81a3-2dba70b5cdb4', '1TECHNO-054', false),
	('49fac266-f622-4ef5-8a2b-5638ca5a4c99', '1TECHNO-083', false),
	('4ce02817-c5b4-4500-9d0c-0bbf7be0a662', '1TECHNO-007', false),
	('4f8f420a-c93b-4d99-8fe2-acfac2d38cbe', '1TECHNO-034', false),
	('5397c20f-7b3a-4d56-b441-644607e0138a', '1TECHNO-139', true),
	('6ad254b4-69c3-49db-9541-fa921964cefc', '1TECHNO-053', false),
	('77498f1b-3625-4701-aa9c-f6132eb3b4ba', '1TECHNO-100', false),
	('7953dcfc-bedc-465e-9abe-b8db19647d7e', '1TECHNO-102', false),
	('8354a0e7-f707-48e0-ac3d-f43cc5b2e2fa', '1TECHNO-096', false),
	('8a384698-1367-4a12-a995-b6cd4df9cfe1', '1TECHNO-060', false),
	('8d46dd50-34ea-4504-b92f-d269a84f0179', '1TECHNO-007', false),
	('95ee57c8-4e16-4554-add5-cb8f72ee6f28', '1TECHNO-127', true),
	('9c04693a-33f3-4c4c-bf1a-ff801b8b15c4', '1TECHNO-098', false),
	('9f072622-9ce5-4e76-b02e-a738bf6ea39a', '1TECHNO-060', false),
	('a16a9bba-2cc5-48d8-b98b-eb4fee6ded3d', '1TECHNO-129', false),
	('a181f10b-1b9c-436c-8f8c-51cce68352db', '1TECHNO-073', false),
	('aab8e41c-4539-4c90-9c1d-6ee41dc7a1cb', '1TECHNO-058', false),
	('ad555cb1-c4a2-4390-ad14-6a626b39e0fb', '1TECHNO-096', false),
	('afe51ac4-8552-454e-b45e-46f0edbd9416', '1TECHNO-066', false),
	('b7b0c27b-0c30-4297-b707-53f328d36f7a', '1TECHNO-132', false),
	('bc59d5ce-a696-4460-91a3-ad8614de25a7', '1TECHNO-096', false),
	('d1010214-1537-4b3d-9b99-1b3718a5d981', '1TECHNO-047', false),
	('d8c9cb60-e9c5-4f38-a8d9-b5c2b83de908', '1TECHNO-093', false),
	('ddc60d24-ddce-473b-8e23-58af62ec8b78', '1TECHNO-054', false),
	('de73e71d-031b-4f9a-b3c9-a1cc6f970a0e', '1TECHNO-055', false),
	('e4784c78-13d5-49ac-b50b-b07efca03d19', '1TECHNO-007', false),
	('f2ed0ea0-e285-49fc-93df-9e388cc36eb0', '1TECHNO-093', false);

select 1 from public.question_templates where id in (select id from _q1tt2_modeles) order by id for update;

-- ---- 2. Gardes : présence TOUT ou RIEN, niveaux du relevé, aucun point 1TECHNO -----
do $garde$
declare v_presents integer; v_conformes integer; v_deja text; v_points integer;
begin
	select count(*), count(*) filter (where ('1_TECHNO' = any(q.grades)) = r.deja)
	  into v_presents, v_conformes
	  from _q1tt2_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 33 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 33', v_presents;
	end if;
	if v_conformes <> 33 then
		raise exception 'niveau 1_TECHNO différent du relevé : % sur 33 conformes', v_conformes;
	end if;
	select string_agg(left(r.id::text, 8) || ' (' || p.code || ')', ', ') into v_deja
	  from _q1tt2_modeles r
	  join public.question_template_points t on t.template_id = r.id
	  join public.curriculum_points p on p.id = t.point_id
	 where p.grade = '1_TECHNO';
	if v_deja is not null then
		raise exception 'modèle(s) déjà tagué(s) d''un point 1TECHNO : %', v_deja;
	end if;
	select count(distinct r.code) into v_points
	  from _q1tt2_modeles r
	  join public.curriculum_points p on p.code = r.code and p.archived_at is null;
	if v_points <> 24 then
		raise exception 'points 1TECHNO introuvables : % sur 24', v_points;
	end if;
end $garde$;

-- ---- 3. Tags et niveaux --------------------------------------------------------------
-- (en base locale, aucun modèle : la jointure ne rend rien et rien n'est écrit)
insert into public.question_template_points (template_id, point_id)
select r.id, p.id
  from _q1tt2_modeles r
  join public.question_templates q on q.id = r.id
  join public.curriculum_points p on p.code = r.code and p.archived_at is null;

alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set grades = array_append(q.grades, '1_TECHNO')
  from _q1tt2_modeles r
 where q.id = r.id and not r.deja;
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- ---- 4. Vérification : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_conformes integer; v_tags integer;
begin
	select count(*), count(*) filter (where '1_TECHNO' = any(q.grades))
	  into v_presents, v_conformes
	  from _q1tt2_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	select count(*) into v_tags
	  from _q1tt2_modeles r
	  join public.curriculum_points p on p.code = r.code and p.archived_at is null
	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
	if v_conformes <> 33 or v_tags <> 33 then
		raise exception 'lot incohérent : % modèle(s) sur 33 avec 1_TECHNO, % tag(s) sur 33', v_conformes, v_tags;
	end if;
end $check$;

drop table _q1tt2_modeles;
