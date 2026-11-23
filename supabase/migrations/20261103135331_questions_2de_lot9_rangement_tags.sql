-- ============================================================================
-- Chantier « questions-2de », lot 9 (nombres réels, arithmétique, intervalles) : nœud et tag de 18 modèles neufs
-- ============================================================================
--   - be39c27d (entiers naturels, entiers relatifs) → 2-235, sur « Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ » ;
--   - fa65910d (multiple : a = k × b) → 2-236, sur « Arithmétique > Divisibilité > multiples et diviseurs » ;
--   - 5e6ce5a3 (tous les diviseurs d'un nombre) → 2-418, sur « Arithmétique > Divisibilité > multiples et diviseurs » ;
--   - d264f7aa (pair ou impair) → 2-419, sur « Arithmétique > Divisibilité > pair ou impair » ;
--   - 53c55b4a (problèmes : multiples et parité) → 2-237, sur « Arithmétique > Divisibilité » ;
--   - bfcbf381 (le plus petit ensemble de nombres) → 2-243, sur « Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ » ;
--   - d7392618 (nombre décimal ou non) → 2-247, sur « Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ » ;
--   - b6ece43a (décimal en quotient d'entiers) → 2-248, sur « Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ » ;
--   - 30585711 (irrationnels de la géométrie) → 2-422, sur « Ensembles > Ensembles de nombres > nombres irrationnels » ;
--   - b720edd7 (inégalités et intervalles) → 2-407, sur « Ensembles > Ensembles de nombres > intervalles » ;
--   - 98eee50d (appartenance à un intervalle) → 2-252, sur « Ensembles > Ensembles de nombres > intervalles » ;
--   - 2069ac7e (représenter un intervalle) → 2-251, sur « Ensembles > Ensembles de nombres > intervalles » ;
--   - f4a12cab (|x − a| ⩽ r) → 2-246, sur « Fonctions > Fonction valeur absolue > équations et inéquations » ;
--   - a692569a (lire l'abscisse d'un point) → 2-249, sur « Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ » ;
--   - 3b0a04c0 (placer un réel) → 2-250, sur « Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ » ;
--   - c99ae1e8 (encadrement à 10⁻ⁿ près) → 2-421, sur « Nombres et calculs > Décimaux : numération > encadrement » ;
--   - 7d411132 (encadrement d'amplitude donnée) → 2-253, sur « Nombres et calculs > Décimaux : numération > encadrement » ;
--   - 22b0a9d6 (chiffres significatifs) → 2-254, sur « Nombres et calculs > Décimaux : numération > arrondis et ordres de grandeur » ;
-- Chaque modèle va sur le nœud de son point (sous-notion, ou la notion « Divisibilité » pour 2-237,
-- dont le point est sur la notion : question_template_points_check_rules refuse un tag hors du nœud
-- du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-03 (journal docs/wip/questions-2de-progress.md § 66). Les
-- modèles ont été créés en brouillon le 2026-11-03 par scripts/create-questions.ts (lots 9 A, 9 B,
-- 9 C, lancés par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (18 modèles). Elle est prouvée par
-- tests/integration/questions-2de-lot9-rangement-tags.test.ts, qui fabrique des copies
-- des identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-03), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question d'accès de la phase 0, § 66, tranchée par
-- David le 2026-11-03 : personne). Aucune règle ne change. Effet visible : les 18 brouillons
-- apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient qu'une
-- fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 18 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('be39c27d-41f6-41ba-821d-70c25dd50a5e'::uuid),
--                ('fa65910d-147f-447f-b846-8e7348e58ed0'::uuid),
--                ('5e6ce5a3-2071-4c79-9995-9eacd5944477'::uuid),
--                ('d264f7aa-1867-43cc-93e1-f66912786117'::uuid),
--                ('53c55b4a-d109-4ad1-8142-2f8568eb7407'::uuid),
--                ('bfcbf381-d454-41f3-9097-939f72c0df16'::uuid),
--                ('d7392618-e2e9-4c4e-a4ff-188f4e9f6be1'::uuid),
--                ('b6ece43a-7394-4074-83f9-ab61a7fc155e'::uuid),
--                ('30585711-5e3e-40b1-a910-7f5d60b48980'::uuid),
--                ('b720edd7-fe00-4ff7-a26a-f23b4dbd72ec'::uuid),
--                ('98eee50d-af83-4663-91db-e71129ff1469'::uuid),
--                ('2069ac7e-ce15-41f3-9b8d-b0ff52fdcb68'::uuid),
--                ('f4a12cab-b62e-473e-92f0-b5cdc7e82d19'::uuid),
--                ('a692569a-ec38-413b-a774-4991d8c88b94'::uuid),
--                ('3b0a04c0-1af8-4040-9537-0aef99b31dd0'::uuid),
--                ('c99ae1e8-25bd-4cf4-b2ed-dbcf2b3c672d'::uuid),
--                ('7d411132-aecc-4788-bb06-9c9d27012e1f'::uuid),
--                ('22b0a9d6-2d43-4db8-a3be-599b9f9e3a37'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('be39c27d-41f6-41ba-821d-70c25dd50a5e'::uuid, '2-235'),
-- 	('fa65910d-147f-447f-b846-8e7348e58ed0'::uuid, '2-236'),
-- 	('5e6ce5a3-2071-4c79-9995-9eacd5944477'::uuid, '2-418'),
-- 	('d264f7aa-1867-43cc-93e1-f66912786117'::uuid, '2-419'),
-- 	('53c55b4a-d109-4ad1-8142-2f8568eb7407'::uuid, '2-237'),
-- 	('bfcbf381-d454-41f3-9097-939f72c0df16'::uuid, '2-243'),
-- 	('d7392618-e2e9-4c4e-a4ff-188f4e9f6be1'::uuid, '2-247'),
-- 	('b6ece43a-7394-4074-83f9-ab61a7fc155e'::uuid, '2-248'),
-- 	('30585711-5e3e-40b1-a910-7f5d60b48980'::uuid, '2-422'),
-- 	('b720edd7-fe00-4ff7-a26a-f23b4dbd72ec'::uuid, '2-407'),
-- 	('98eee50d-af83-4663-91db-e71129ff1469'::uuid, '2-252'),
-- 	('2069ac7e-ce15-41f3-9b8d-b0ff52fdcb68'::uuid, '2-251'),
-- 	('f4a12cab-b62e-473e-92f0-b5cdc7e82d19'::uuid, '2-246'),
-- 	('a692569a-ec38-413b-a774-4991d8c88b94'::uuid, '2-249'),
-- 	('3b0a04c0-1af8-4040-9537-0aef99b31dd0'::uuid, '2-250'),
-- 	('c99ae1e8-25bd-4cf4-b2ed-dbcf2b3c672d'::uuid, '2-421'),
-- 	('7d411132-aecc-4788-bb06-9c9d27012e1f'::uuid, '2-253'),
-- 	('22b0a9d6-2d43-4db8-a3be-599b9f9e3a37'::uuid, '2-254')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               'be39c27d-41f6-41ba-821d-70c25dd50a5e',
--               'fa65910d-147f-447f-b846-8e7348e58ed0',
--               '5e6ce5a3-2071-4c79-9995-9eacd5944477',
--               'd264f7aa-1867-43cc-93e1-f66912786117',
--               '53c55b4a-d109-4ad1-8142-2f8568eb7407',
--               'bfcbf381-d454-41f3-9097-939f72c0df16',
--               'd7392618-e2e9-4c4e-a4ff-188f4e9f6be1',
--               'b6ece43a-7394-4074-83f9-ab61a7fc155e',
--               '30585711-5e3e-40b1-a910-7f5d60b48980',
--               'b720edd7-fe00-4ff7-a26a-f23b4dbd72ec',
--               '98eee50d-af83-4663-91db-e71129ff1469',
--               '2069ac7e-ce15-41f3-9b8d-b0ff52fdcb68',
--               'f4a12cab-b62e-473e-92f0-b5cdc7e82d19',
--               'a692569a-ec38-413b-a774-4991d8c88b94',
--               '3b0a04c0-1af8-4040-9537-0aef99b31dd0',
--               'c99ae1e8-25bd-4cf4-b2ed-dbcf2b3c672d',
--               '7d411132-aecc-4788-bb06-9c9d27012e1f',
--               '22b0a9d6-2d43-4db8-a3be-599b9f9e3a37');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qc_modeles;
create temporary table _qc_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qc_modeles values
	('be39c27d-41f6-41ba-821d-70c25dd50a5e', 'Ensembles', 'Ensembles de nombres', 'ℕ, ℤ, 𝔻, ℚ, ℝ', '2-235'),
	('fa65910d-147f-447f-b846-8e7348e58ed0', 'Arithmétique', 'Divisibilité', 'multiples et diviseurs', '2-236'),
	('5e6ce5a3-2071-4c79-9995-9eacd5944477', 'Arithmétique', 'Divisibilité', 'multiples et diviseurs', '2-418'),
	('d264f7aa-1867-43cc-93e1-f66912786117', 'Arithmétique', 'Divisibilité', 'pair ou impair', '2-419'),
	('53c55b4a-d109-4ad1-8142-2f8568eb7407', 'Arithmétique', 'Divisibilité', null, '2-237'),
	('bfcbf381-d454-41f3-9097-939f72c0df16', 'Ensembles', 'Ensembles de nombres', 'ℕ, ℤ, 𝔻, ℚ, ℝ', '2-243'),
	('d7392618-e2e9-4c4e-a4ff-188f4e9f6be1', 'Ensembles', 'Ensembles de nombres', 'ℕ, ℤ, 𝔻, ℚ, ℝ', '2-247'),
	('b6ece43a-7394-4074-83f9-ab61a7fc155e', 'Ensembles', 'Ensembles de nombres', 'ℕ, ℤ, 𝔻, ℚ, ℝ', '2-248'),
	('30585711-5e3e-40b1-a910-7f5d60b48980', 'Ensembles', 'Ensembles de nombres', 'nombres irrationnels', '2-422'),
	('b720edd7-fe00-4ff7-a26a-f23b4dbd72ec', 'Ensembles', 'Ensembles de nombres', 'intervalles', '2-407'),
	('98eee50d-af83-4663-91db-e71129ff1469', 'Ensembles', 'Ensembles de nombres', 'intervalles', '2-252'),
	('2069ac7e-ce15-41f3-9b8d-b0ff52fdcb68', 'Ensembles', 'Ensembles de nombres', 'intervalles', '2-251'),
	('f4a12cab-b62e-473e-92f0-b5cdc7e82d19', 'Fonctions', 'Fonction valeur absolue', 'équations et inéquations', '2-246'),
	('a692569a-ec38-413b-a774-4991d8c88b94', 'Ensembles', 'Ensembles de nombres', 'ℕ, ℤ, 𝔻, ℚ, ℝ', '2-249'),
	('3b0a04c0-1af8-4040-9537-0aef99b31dd0', 'Ensembles', 'Ensembles de nombres', 'ℕ, ℤ, 𝔻, ℚ, ℝ', '2-250'),
	('c99ae1e8-25bd-4cf4-b2ed-dbcf2b3c672d', 'Nombres et calculs', 'Décimaux : numération', 'encadrement', '2-421'),
	('7d411132-aecc-4788-bb06-9c9d27012e1f', 'Nombres et calculs', 'Décimaux : numération', 'encadrement', '2-253'),
	('22b0a9d6-2d43-4db8-a3be-599b9f9e3a37', 'Nombres et calculs', 'Décimaux : numération', 'arrondis et ordres de grandeur', '2-254');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qc_modeles order by id;
select 1 from public.question_templates where id in (select id from _qc_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qc_modeles add column noeud uuid, add column point_id uuid;
update _qc_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qc_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qc_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '2' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qc_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qc_modeles where noeud is null),
			(select count(*) from _qc_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qc_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 18) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 18', v_presents;
	end if;
	select count(*) into v_ranges from _qc_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qc_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qc_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qc_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qc_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qc_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qc_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qc_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qc_modeles;
