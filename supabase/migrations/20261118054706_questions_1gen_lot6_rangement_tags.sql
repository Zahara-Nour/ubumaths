-- ============================================================================
-- Chantier « questions-1gen », lot 6 (statistiques à deux variables) : nœud et tag de 7 modèles
-- neufs, et un tag 1GEN sur un modèle publié de la 1re techno
-- ============================================================================
--   - 9bedbaf4 (S1, comparer deux groupes sur des diagrammes) → 1GEN-001, sur « Statistiques > Tableaux croisés » ;
--   - f3cb0c7a (S2, représenter un nuage de points) → 1GEN-002, sur « Statistiques > Statistique à deux variables > nuage de points » ;
--   - 7461bb44 (S3, lire un nuage de points) → 1GEN-002, sur « Statistiques > Statistique à deux variables > nuage de points » ;
--   - 4f328c8c (S4, le point moyen d'un nuage) → 1GEN-004, sur « Statistiques > Statistique à deux variables > point moyen » ;
--   - ef8ade24 (S5, interpolation ou extrapolation) → 1GEN-005, sur « Statistiques > Statistique à deux variables > ajustement affine » ;
--   - 3fec6b41 (S6, déterminer un ajustement affine) → 1GEN-007, sur « Statistiques > Statistique à deux variables > ajustement affine » ;
--   - 2e898e54 (S7, formules du tableur) → 1GEN-006, sur « Statistiques > Représenter des données ».
-- Chaque modèle va sur le NŒUD de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point ou de sa notion), et porte UN point (ADR 0020). Ni le contenu, ni les
-- niveaux (écrits à la création : `1_GEN` ; questions-1techno ajoutera `1_TECHNO` à S2, S3, S4,
-- S6 par sa propre migration), ni le statut ne changent : `updated_at` est PRÉSERVÉ.
--
-- Et le modèle PUBLIÉ 49fac266 (« Ajustement affine : interpréter le coefficient directeur et
-- l'ordonnée à l'origine », 1TECHNO-083 + TCOMP-321, déjà sur « … > ajustement affine ») reçoit
-- le niveau `1_GEN` (array_append, seulement s'il est absent : règle commune des chantiers, § 6
-- du journal) et le point 1GEN-003, qui est sur son nœud. Ses autres niveaux, ses autres tags,
-- son nœud, son contenu et son statut ne changent pas ; `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-18 (journal docs/wip/questions-1gen-progress.md § 23, Q20 à Q23).
-- Les 7 modèles ont été créés en brouillon le 2026-11-18 par scripts/create-questions.ts
-- (scripts/questions/1gen-6-statistiques-deux-variables/, lancé par David après le merge de
-- #2802), qui ne pose ni nœud ni tag.
--
-- Les 7 neufs n'existent qu'en production : sans eux (base locale, où une copie de 49fac266 peut
-- exister), la migration ne touche AUCUN modèle ; elle exige TOUT ou RIEN des 7 neufs, et 49fac266
-- avec eux. Elle est prouvée par
-- tests/integration/questions-1gen-lot6-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (dans leur état relevé) puis rejoue CE fichier.
--
-- Gardes (relevé MCP du 2026-11-18) : chaque modèle neuf est encore SANS nœud et SANS aucun tag ;
-- 49fac266 est sur le nœud de 1GEN-003 et ne porte aucun point 1GEN. Sinon, un rangement fait
-- depuis à la main serait écrasé. Nœuds désignés par leur chemin, résolus STRICTEMENT.
--
-- Données d'élèves : aucune.
--
-- Accès : personne ne gagne ni ne perd d'accès (question d'accès de la phase 0, § 23, validée par
-- David le 2026-11-18 AVANT le SQL). Aucune règle ne change. Effets visibles : les 7 brouillons
-- apparaissent sous leur nœud et leur point dans l'admin (élèves : après publication par David) ;
-- 49fac266, publié, entre dans les contenus de 1re générale (niveau et point 1GEN-003).
--
-- Rollback (aucune donnée d'élève). Il retire les 8 tags 1GEN, rend les 7 modèles neufs sans
-- nœud, et retire `1_GEN` des niveaux de 49fac266. Bloc éprouvé par le test d'intégration, à
-- jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi).
-- À jouer AVANT que questions-1techno ait tagué S2, S3, S4, S6 (ses tags exigent le nœud) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('2e898e54-bad7-4a92-b5ca-5d40561ca24d'::uuid),
--                ('3fec6b41-b401-430b-b602-017bd51e5f10'::uuid),
--                ('49fac266-f622-4ef5-8a2b-5638ca5a4c99'::uuid),
--                ('4f328c8c-16c8-40b0-b192-bc2eaa94a867'::uuid),
--                ('7461bb44-6811-4f56-9397-6fb3ff82c1b9'::uuid),
--                ('9bedbaf4-d5d1-4464-947d-19b8946452ab'::uuid),
--                ('ef8ade24-f79c-4bd8-b51c-77852ed0496c'::uuid),
--                ('f3cb0c7a-5fa9-4578-ba55-769581dcc64b'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('9bedbaf4-d5d1-4464-947d-19b8946452ab'::uuid, '1GEN-001'),
-- 	('f3cb0c7a-5fa9-4578-ba55-769581dcc64b'::uuid, '1GEN-002'),
-- 	('7461bb44-6811-4f56-9397-6fb3ff82c1b9'::uuid, '1GEN-002'),
-- 	('4f328c8c-16c8-40b0-b192-bc2eaa94a867'::uuid, '1GEN-004'),
-- 	('ef8ade24-f79c-4bd8-b51c-77852ed0496c'::uuid, '1GEN-005'),
-- 	('3fec6b41-b401-430b-b602-017bd51e5f10'::uuid, '1GEN-007'),
-- 	('2e898e54-bad7-4a92-b5ca-5d40561ca24d'::uuid, '1GEN-006'),
-- 	('49fac266-f622-4ef5-8a2b-5638ca5a4c99'::uuid, '1GEN-003')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '1_GEN' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('9bedbaf4-d5d1-4464-947d-19b8946452ab',
--               'f3cb0c7a-5fa9-4578-ba55-769581dcc64b',
--               '7461bb44-6811-4f56-9397-6fb3ff82c1b9',
--               '4f328c8c-16c8-40b0-b192-bc2eaa94a867',
--               'ef8ade24-f79c-4bd8-b51c-77852ed0496c',
--               '3fec6b41-b401-430b-b602-017bd51e5f10',
--               '2e898e54-bad7-4a92-b5ca-5d40561ca24d');
-- update public.question_templates set grades = array_remove(grades, '1_GEN')
--  where id = '49fac266-f622-4ef5-8a2b-5638ca5a4c99' and '1_GEN' = any(grades);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
-- neuf = brouillon sans nœud ni tag, à ranger ; sinon modèle publié déjà rangé, à taguer seulement
drop table if exists pg_temp._q1g6_modeles;
create temporary table _q1g6_modeles (
	id uuid primary key,
	neuf boolean not null,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _q1g6_modeles (id, neuf, branche, notion, sous_notion, code) values
	('9bedbaf4-d5d1-4464-947d-19b8946452ab', true, 'Statistiques', 'Tableaux croisés', null, '1GEN-001'),
	('f3cb0c7a-5fa9-4578-ba55-769581dcc64b', true, 'Statistiques', 'Statistique à deux variables', 'nuage de points', '1GEN-002'),
	('7461bb44-6811-4f56-9397-6fb3ff82c1b9', true, 'Statistiques', 'Statistique à deux variables', 'nuage de points', '1GEN-002'),
	('4f328c8c-16c8-40b0-b192-bc2eaa94a867', true, 'Statistiques', 'Statistique à deux variables', 'point moyen', '1GEN-004'),
	('ef8ade24-f79c-4bd8-b51c-77852ed0496c', true, 'Statistiques', 'Statistique à deux variables', 'ajustement affine', '1GEN-005'),
	('3fec6b41-b401-430b-b602-017bd51e5f10', true, 'Statistiques', 'Statistique à deux variables', 'ajustement affine', '1GEN-007'),
	('2e898e54-bad7-4a92-b5ca-5d40561ca24d', true, 'Statistiques', 'Représenter des données', null, '1GEN-006'),
	('49fac266-f622-4ef5-8a2b-5638ca5a4c99', false, 'Statistiques', 'Statistique à deux variables', 'ajustement affine', '1GEN-003');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q1g6_modeles order by id;
select 1 from public.question_templates where id in (select id from _q1g6_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _q1g6_modeles add column noeud uuid, add column point_id uuid;
update _q1g6_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _q1g6_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q1g6_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '1_GEN' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q1g6_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q1g6_modeles where noeud is null),
			(select count(*) from _q1g6_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes ---------------------------------------------------------------------
-- Présence TOUT ou RIEN des 7 neufs. Sans eux (base locale, où 49fac266 peut exister seul), la
-- migration ne touche RIEN, pas même 49fac266 : le lot est vidé. Avec eux, 49fac266 est exigé.
-- Puis : neufs sans nœud ni tag ; 49fac266 sur le nœud de son point, sans niveau 1_GEN ni point
-- 1GEN (sinon le rollback, qui retire 1_GEN sans condition, effacerait un ajout fait à la main).
do $garde$
declare v_neufs integer; v_publie_present integer; v_ranges integer; v_tags integer; v_publie integer;
begin
	select count(*) into v_neufs from _q1g6_modeles r join public.question_templates q on q.id = r.id
	 where r.neuf;
	if v_neufs not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) neuf(s) sur 7', v_neufs;
	end if;
	if v_neufs = 0 then
		delete from _q1g6_modeles;
		return;
	end if;
	select count(*) into v_publie_present from _q1g6_modeles r
	  join public.question_templates q on q.id = r.id where not r.neuf;
	if v_publie_present <> 1 then
		raise exception 'modèle publié 49fac266 absent';
	end if;
	select count(*) into v_ranges from _q1g6_modeles r
	  join public.question_templates q on q.id = r.id
	 where r.neuf and q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles neufs déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q1g6_modeles r on r.id = q.template_id and r.neuf;
	if v_tags <> 0 then
		raise exception 'modèles neufs déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
	select count(*) into v_publie from _q1g6_modeles r
	  join public.question_templates q on q.id = r.id
	 where not r.neuf
	   and (q.classification_node_id is distinct from r.noeud
	        or '1_GEN' = any(q.grades)
	        or exists (select 1 from public.question_template_points t
	                     join public.curriculum_points p on p.id = t.point_id
	                    where t.template_id = q.id and p.grade = '1_GEN'));
	if v_publie <> 0 then
		raise exception '49fac266 a changé depuis le relevé (nœud déplacé, niveau 1_GEN ou point 1GEN déjà posé)';
	end if;
end $garde$;

-- ---- 4. Rangement des neufs, niveau 1_GEN du publié, puis tags ------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q1g6_modeles r
 where q.id = r.id and r.neuf;
update public.question_templates q set grades = array_append(q.grades, '1_GEN')
  from _q1g6_modeles r
 where q.id = r.id and not r.neuf and not ('1_GEN' = any(q.grades));
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q1g6_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_tags1g integer; v_lot integer; v_niveaux integer;
begin
	select count(*) into v_presents from _q1g6_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q1g6_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	-- Points 1GEN de chaque modèle : exactement celui du lot
	select count(*), count(*) filter (where exists (select 1 from _q1g6_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_tags1g, v_lot
	  from public.question_template_points q
	  join public.curriculum_points p on p.id = q.point_id and p.grade = '1_GEN'
	  join _q1g6_modeles m on m.id = q.template_id;
	select count(*) into v_niveaux from _q1g6_modeles r
	  join public.question_templates q on q.id = r.id and '1_GEN' = any(q.grades);
	if v_noeuds <> v_presents or v_lot <> v_presents or v_tags1g <> v_presents or v_niveaux <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags 1GEN en base %, niveaux 1_GEN %/%',
			v_noeuds, v_presents, v_lot, v_presents, v_tags1g, v_niveaux, v_presents;
	end if;
end $check$;

drop table _q1g6_modeles;
