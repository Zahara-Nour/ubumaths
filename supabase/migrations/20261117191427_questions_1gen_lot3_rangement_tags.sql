-- ============================================================================
-- Chantier « questions-1gen », lot 3 (fonctions x ↦ aˣ) : nœud et tag de 7 modèles neufs
-- ============================================================================
--   - 065eea60 (E4, associer une courbe à sa fonction aˣ) → 1GEN-035, sur « Fonctions > Fonction exponentielle > fonctions x ↦ aˣ » ;
--   - 2a9c316a (E3, sens de variation de x ↦ aˣ) → 1GEN-034, sur « Fonctions > Fonction exponentielle > fonctions x ↦ aˣ » ;
--   - 3a8ef5f7 (E5, exposant 1/n) → 1GEN-036, sur « Fonctions > Fonction exponentielle > fonctions x ↦ aˣ » ;
--   - 60971c9a (E2, une seule puissance) → 1GEN-033, sur « Fonctions > Fonction exponentielle > fonctions x ↦ aˣ » ;
--   - 9ead685c (E6, placer des points de la courbe) → 1GEN-042, sur « Fonctions > Fonction exponentielle > fonctions x ↦ aˣ » ;
--   - e4e65a69 (E1, calculer une valeur de aˣ) → 1GEN-032, sur « Fonctions > Fonction exponentielle > fonctions x ↦ aˣ » ;
--   - fc27769e (E7, lire sur la courbe) → 1GEN-059, sur « Fonctions > Fonction exponentielle > fonctions x ↦ aˣ » ;
-- Chaque modèle va sur le NŒUD de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point ou de sa notion), et porte UN point (ADR 0020 : au plus un point par
-- programme). Ni le contenu, ni les niveaux (écrits à la création : `1_GEN` ; questions-ttechno
-- ajoutera `T_TECHNO` à E1, E2, E3, E4 par sa propre migration, tags TTECHNO-031, 081, 032, 033), ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-17 (journal docs/wip/questions-1gen-progress.md § 14 et § 18). Les
-- modèles ont été créés en brouillon le 2026-11-17 par scripts/create-questions.ts
-- (scripts/questions/1gen-3-fonctions-exponentielles/, lancé par David après le merge de #2773),
-- qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-1gen-lot3-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-17),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question d'accès de la phase 0, § 14, validée par
-- David le 2026-11-17 AVANT le SQL : personne). Aucune règle ne change. Effet visible : les 7
-- brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les
-- voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi). À jouer AVANT que questions-ttechno ait tagué E1, E2, E3, E4
-- (ses tags TTECHNO exigent le nœud : retirer le nœud serait alors refusé ou les contredirait) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('065eea60-1d6d-4404-9015-f4624e661ab2'::uuid),
--                ('2a9c316a-ee3d-44dc-89be-8b3b5c00ac2c'::uuid),
--                ('3a8ef5f7-402f-48a3-9ddc-aca94723bf56'::uuid),
--                ('60971c9a-82e7-4ed5-a18a-7520b40c38b2'::uuid),
--                ('9ead685c-6032-4b2b-982d-0cadfcdf40b4'::uuid),
--                ('e4e65a69-2710-45d1-9592-1edd100d9067'::uuid),
--                ('fc27769e-ad53-4b35-8b97-b0d86acef03a'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('065eea60-1d6d-4404-9015-f4624e661ab2'::uuid, '1GEN-035'),
-- 	('2a9c316a-ee3d-44dc-89be-8b3b5c00ac2c'::uuid, '1GEN-034'),
-- 	('3a8ef5f7-402f-48a3-9ddc-aca94723bf56'::uuid, '1GEN-036'),
-- 	('60971c9a-82e7-4ed5-a18a-7520b40c38b2'::uuid, '1GEN-033'),
-- 	('9ead685c-6032-4b2b-982d-0cadfcdf40b4'::uuid, '1GEN-042'),
-- 	('e4e65a69-2710-45d1-9592-1edd100d9067'::uuid, '1GEN-032'),
-- 	('fc27769e-ad53-4b35-8b97-b0d86acef03a'::uuid, '1GEN-059')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '1_GEN' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('065eea60-1d6d-4404-9015-f4624e661ab2',
--               '2a9c316a-ee3d-44dc-89be-8b3b5c00ac2c',
--               '3a8ef5f7-402f-48a3-9ddc-aca94723bf56',
--               '60971c9a-82e7-4ed5-a18a-7520b40c38b2',
--               '9ead685c-6032-4b2b-982d-0cadfcdf40b4',
--               'e4e65a69-2710-45d1-9592-1edd100d9067',
--               'fc27769e-ad53-4b35-8b97-b0d86acef03a');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q1g3_modeles;
create temporary table _q1g3_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _q1g3_modeles values
	('065eea60-1d6d-4404-9015-f4624e661ab2', 'Fonctions', 'Fonction exponentielle', 'fonctions x ↦ aˣ', '1GEN-035'),
	('2a9c316a-ee3d-44dc-89be-8b3b5c00ac2c', 'Fonctions', 'Fonction exponentielle', 'fonctions x ↦ aˣ', '1GEN-034'),
	('3a8ef5f7-402f-48a3-9ddc-aca94723bf56', 'Fonctions', 'Fonction exponentielle', 'fonctions x ↦ aˣ', '1GEN-036'),
	('60971c9a-82e7-4ed5-a18a-7520b40c38b2', 'Fonctions', 'Fonction exponentielle', 'fonctions x ↦ aˣ', '1GEN-033'),
	('9ead685c-6032-4b2b-982d-0cadfcdf40b4', 'Fonctions', 'Fonction exponentielle', 'fonctions x ↦ aˣ', '1GEN-042'),
	('e4e65a69-2710-45d1-9592-1edd100d9067', 'Fonctions', 'Fonction exponentielle', 'fonctions x ↦ aˣ', '1GEN-032'),
	('fc27769e-ad53-4b35-8b97-b0d86acef03a', 'Fonctions', 'Fonction exponentielle', 'fonctions x ↦ aˣ', '1GEN-059');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q1g3_modeles order by id;
select 1 from public.question_templates where id in (select id from _q1g3_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _q1g3_modeles add column noeud uuid, add column point_id uuid;
update _q1g3_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _q1g3_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q1g3_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '1_GEN' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q1g3_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q1g3_modeles where noeud is null),
			(select count(*) from _q1g3_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _q1g3_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
	end if;
	select count(*) into v_ranges from _q1g3_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q1g3_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q1g3_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q1g3_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q1g3_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q1g3_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _q1g3_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q1g3_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _q1g3_modeles;
