-- ============================================================================
-- Chantier « questions-ttechno », lot 2a (suites) : nœud et tag de 8 modèles neufs, tag et niveau
-- T_TECHNO de 2 modèles communs déjà publiés
-- ============================================================================
-- Partie A — 8 brouillons créés le 2026-11-17 par scripts/create-questions.ts
-- (scripts/questions/ttechno-2a-suites/, lancé par David après le merge de #2774), sans nœud ni tag :
--   - 45ea676f (M1, moyenne arithmétique)        → TTECHNO-016, « Suites > Suites arithmétiques » ;
--   - 72b876d7 (M2, moyenne géométrique)         → TTECHNO-018, « Suites > Suites géométriques » ;
--   - 6336ae4d (M3, trois nombres, arithmétique) → TTECHNO-020, « Suites > Suites arithmétiques > définition » ;
--   - a46e60cf (M4, trois nombres, géométrique)  → TTECHNO-021, « Suites > Suites géométriques > définition » ;
--   - 292f865b (M5, raison d'une évolution)      → TTECHNO-022, « Suites > Suites arithmétiques > définition » ;
--   - 65e0e9f5 (M6, somme arithm. en situation)  → TTECHNO-028, « Suites > Suites arithmétiques > somme des termes » ;
--   - 5ec00b89 (M7, somme géom. en situation)    → TTECHNO-029, « Suites > Suites géométriques > somme des termes » ;
--   - 752d26c9 (M8, notation Σ)                  → TTECHNO-074, « Suites > Suites arithmétiques > somme des termes ».
-- Chaque modèle va sur le NŒUD de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point ou de sa notion) et porte UN point (ADR 0020). Contenu, niveaux (écrits à
-- la création : `T_TECHNO`) et statut inchangés : `updated_at` PRÉSERVÉ. Gabarit : lot 1
-- (20261117172627).
--
-- Partie B — 2 modèles communs de questions-1gen, PUBLIÉS, `{1_GEN,1_TECHNO}`, déjà rangés sur le
-- nœud du point visé (relevé MCP du 2026-11-17) :
--   - c4887e49 (terme général d'une suite géométrique à termes positifs) → TTECHNO-025 ;
--   - 0b5c3db6 (raison d'une suite géométrique à termes positifs)        → TTECHNO-023.
-- Tag TTECHNO + `array_append(grades, 'T_TECHNO')` (jamais d'affectation complète : chaque chantier
-- ne touche que son niveau). Tags 1GEN / 1TECHNO et nœud inchangés. Gabarit : lot 0 (20261117145436).
-- ============================================================================
-- Décisions de David le 2026-11-17 (journal docs/wip/questions-ttechno-progress.md § 12 : phase 0,
-- Q16 « 0b5c3db6 tagué 023 » ; § 13 : écriture).
--
-- Partie A : les modèles n'existent qu'en production ; en base locale, elle ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (8 modèles), encore SANS nœud et SANS tag
-- (sinon un rangement fait à la main depuis le relevé serait écrasé). Nœud désigné par son chemin,
-- résolu STRICTEMENT, et qui doit être celui du point.
-- Partie B : TOUT ou RIEN (2 modèles), encore sans `T_TECHNO` et sans point TTECHNO, chacun rangé
-- sur le nœud du point visé.
-- Prouvée par tests/integration/questions-ttechno-lot2a-rangement-tags.test.ts (copies des
-- identifiants de la prod, migration rejouée depuis CE fichier).
--
-- Données d'élèves : aucune (aucune ligne d'élève lue ni écrite).
--
-- Accès (question posée et tranchée AVANT le SQL) :
--   - partie A : personne ne gagne ni ne perd d'accès (brouillons ; les élèves ne les voient qu'une
--     fois publiés par David) ;
--   - partie B : les classes de Tle techno voient deux modèles déjà publiés en 1re (question d'accès du
--     chantier, Q2 du § 5, tranchée par David le 2026-11-17 : « personne ne perd rien »).
-- Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 10 tags TTECHNO, rend les 8 brouillons sans nœud
-- et retire `T_TECHNO` des 2 modèles communs. Bloc éprouvé par le test d'intégration, à jouer dans
-- UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('0b5c3db6-cb37-40fc-8247-12e3ace03a46'::uuid),
--                ('292f865b-8292-4b57-b717-e1ccba7d65a2'::uuid),
--                ('45ea676f-2454-407d-a3ef-88da0d201a73'::uuid),
--                ('5ec00b89-1cb5-45b5-a781-cda1d051e359'::uuid),
--                ('6336ae4d-33ed-4a23-9517-9f27b0492de5'::uuid),
--                ('65e0e9f5-dfff-49b5-8a91-11ae76bbc89b'::uuid),
--                ('72b876d7-6673-4b75-a67d-631caebe1b8c'::uuid),
--                ('752d26c9-a9ce-4ee8-ad6d-dcefa3ce578f'::uuid),
--                ('a46e60cf-69d5-4911-b905-67b873fd6887'::uuid),
--                ('c4887e49-2337-4ac7-a2c9-369434868b65'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('0b5c3db6-cb37-40fc-8247-12e3ace03a46'::uuid, 'TTECHNO-023'),
-- 	('292f865b-8292-4b57-b717-e1ccba7d65a2'::uuid, 'TTECHNO-022'),
-- 	('45ea676f-2454-407d-a3ef-88da0d201a73'::uuid, 'TTECHNO-016'),
-- 	('5ec00b89-1cb5-45b5-a781-cda1d051e359'::uuid, 'TTECHNO-029'),
-- 	('6336ae4d-33ed-4a23-9517-9f27b0492de5'::uuid, 'TTECHNO-020'),
-- 	('65e0e9f5-dfff-49b5-8a91-11ae76bbc89b'::uuid, 'TTECHNO-028'),
-- 	('72b876d7-6673-4b75-a67d-631caebe1b8c'::uuid, 'TTECHNO-018'),
-- 	('752d26c9-a9ce-4ee8-ad6d-dcefa3ce578f'::uuid, 'TTECHNO-074'),
-- 	('a46e60cf-69d5-4911-b905-67b873fd6887'::uuid, 'TTECHNO-021'),
-- 	('c4887e49-2337-4ac7-a2c9-369434868b65'::uuid, 'TTECHNO-025')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'T_TECHNO' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('292f865b-8292-4b57-b717-e1ccba7d65a2',
--               '45ea676f-2454-407d-a3ef-88da0d201a73',
--               '5ec00b89-1cb5-45b5-a781-cda1d051e359',
--               '6336ae4d-33ed-4a23-9517-9f27b0492de5',
--               '65e0e9f5-dfff-49b5-8a91-11ae76bbc89b',
--               '72b876d7-6673-4b75-a67d-631caebe1b8c',
--               '752d26c9-a9ce-4ee8-ad6d-dcefa3ce578f',
--               'a46e60cf-69d5-4911-b905-67b873fd6887');
-- update public.question_templates set grades = array_remove(grades, 'T_TECHNO')
--  where id in ('0b5c3db6-cb37-40fc-8247-12e3ace03a46', 'c4887e49-2337-4ac7-a2c9-369434868b65');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris ligne par ligne.
set local lock_timeout = '5s';

-- ============================================================================
-- PARTIE A — 8 brouillons : nœud + tag
-- ============================================================================

-- ---- A1. Le lot, en table temporaire -----------------------------------------------
drop table if exists pg_temp._qtt2a_modeles;
create temporary table _qtt2a_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qtt2a_modeles values
	('292f865b-8292-4b57-b717-e1ccba7d65a2', 'Suites', 'Suites arithmétiques', 'définition', 'TTECHNO-022'),
	('45ea676f-2454-407d-a3ef-88da0d201a73', 'Suites', 'Suites arithmétiques', null, 'TTECHNO-016'),
	('5ec00b89-1cb5-45b5-a781-cda1d051e359', 'Suites', 'Suites géométriques', 'somme des termes', 'TTECHNO-029'),
	('6336ae4d-33ed-4a23-9517-9f27b0492de5', 'Suites', 'Suites arithmétiques', 'définition', 'TTECHNO-020'),
	('65e0e9f5-dfff-49b5-8a91-11ae76bbc89b', 'Suites', 'Suites arithmétiques', 'somme des termes', 'TTECHNO-028'),
	('72b876d7-6673-4b75-a67d-631caebe1b8c', 'Suites', 'Suites géométriques', null, 'TTECHNO-018'),
	('752d26c9-a9ce-4ee8-ad6d-dcefa3ce578f', 'Suites', 'Suites arithmétiques', 'somme des termes', 'TTECHNO-074'),
	('a46e60cf-69d5-4911-b905-67b873fd6887', 'Suites', 'Suites géométriques', 'définition', 'TTECHNO-021');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qtt2a_modeles order by id;
select 1 from public.question_templates where id in (select id from _qtt2a_modeles) order by id for update;

-- ---- A2. Résolution STRICTE des chemins et des points --------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qtt2a_modeles add column noeud uuid, add column point_id uuid;
update _qtt2a_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qtt2a_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qtt2a_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'T_TECHNO' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qtt2a_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qtt2a_modeles where noeud is null),
			(select count(*) from _qtt2a_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- A3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag --------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qtt2a_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 8) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 8', v_presents;
	end if;
	select count(*) into v_ranges from _qtt2a_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qtt2a_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- A4. Rangement, puis tags -------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qtt2a_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qtt2a_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- A5. Vérifications : TOUT ou RIEN -----------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qtt2a_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qtt2a_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qtt2a_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qtt2a_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qtt2a_modeles;

-- ============================================================================
-- PARTIE B — 2 modèles communs publiés : tag TTECHNO + niveau T_TECHNO
-- ============================================================================

drop table if exists pg_temp._qtt2a_communs;
create temporary table _qtt2a_communs (
	id uuid primary key,
	code text not null
);
insert into _qtt2a_communs values
	('0b5c3db6-cb37-40fc-8247-12e3ace03a46', 'TTECHNO-023'),
	('c4887e49-2337-4ac7-a2c9-369434868b65', 'TTECHNO-025');

select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qtt2a_communs order by id;
select 1 from public.question_templates where id in (select id from _qtt2a_communs) order by id for update;

do $garde_b$
declare v_presents integer; v_sans integer; v_deja text; v_noeud integer;
begin
	select count(*), count(*) filter (where not ('T_TECHNO' = any(q.grades)))
	  into v_presents, v_sans
	  from _qtt2a_communs r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 2 then
		raise exception 'modèles communs partiellement présents : % sur 2', v_presents;
	end if;
	if v_sans <> 2 then
		raise exception 'niveau T_TECHNO déjà présent : % sur 2 sans T_TECHNO', v_sans;
	end if;
	select string_agg(left(r.id::text, 8) || ' (' || p.code || ')', ', ') into v_deja
	  from _qtt2a_communs r
	  join public.question_template_points t on t.template_id = r.id
	  join public.curriculum_points p on p.id = t.point_id
	 where p.grade = 'T_TECHNO';
	if v_deja is not null then
		raise exception 'modèle(s) commun(s) déjà tagué(s) d''un point TTECHNO : %', v_deja;
	end if;
	-- Chaque modèle sur le nœud de son point (vérifié au relevé ; le trigger le redemande).
	select count(*) into v_noeud
	  from _qtt2a_communs r
	  join public.question_templates q on q.id = r.id
	  join public.curriculum_points p on p.grade = 'T_TECHNO' and p.code = r.code and p.archived_at is null
	 where p.node_id = q.classification_node_id;
	if v_noeud <> 2 then
		raise exception 'modèles communs hors du nœud de leur point TTECHNO : % sur 2 conformes', v_noeud;
	end if;
end $garde_b$;

insert into public.question_template_points (template_id, point_id)
select r.id, p.id
  from _qtt2a_communs r
  join public.question_templates q on q.id = r.id
  join public.curriculum_points p on p.grade = 'T_TECHNO' and p.code = r.code and p.archived_at is null;

alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set grades = array_append(q.grades, 'T_TECHNO')
  from _qtt2a_communs r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

do $check_b$
declare v_presents integer; v_conformes integer; v_tags integer;
begin
	select count(*), count(*) filter (where 'T_TECHNO' = any(q.grades))
	  into v_presents, v_conformes
	  from _qtt2a_communs r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	select count(*) into v_tags
	  from _qtt2a_communs r
	  join public.curriculum_points p on p.grade = 'T_TECHNO' and p.code = r.code and p.archived_at is null
	  join public.question_template_points t on t.template_id = r.id and t.point_id = p.id;
	if v_conformes <> 2 or v_tags <> 2 then
		raise exception 'modèles communs incohérents : % sur 2 avec T_TECHNO, % tag(s) sur 2', v_conformes, v_tags;
	end if;
end $check_b$;

drop table _qtt2a_communs;
