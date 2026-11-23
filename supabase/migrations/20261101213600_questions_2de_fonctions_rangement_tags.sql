-- ============================================================================
-- Chantier « questions-2de », lot 6 (fonctions de référence, résolutions) : nœud et tag de 20 modèles neufs
-- ============================================================================
--   - 05e8453d (√x = k) → 2-467, sur « Fonctions > Fonction racine carrée > √x = k, √x < k » ;
--   - 1048e462 (la fonction inverse) → 2-335, sur « Fonctions > Fonction inverse > définition et courbe » ;
--   - 214f91c0 (1/x < k) → 2-466, sur « Fonctions > Fonction inverse > 1/x = k, 1/x < k » ;
--   - 2a249385 (f(x) = k, méthode adaptée) → 2-336, sur « Fonctions > Généralités sur les fonctions > équations et inéquations f(x) = k » ;
--   - 345beb60 (ensemble de définition lu) → 2-325, sur « Fonctions > Généralités sur les fonctions » ;
--   - 37f39db3 (antécédents par la fonction carré) → 2-461, sur « Fonctions > Fonction carré > x² = k, x² < k » ;
--   - 42c19a19 (traduire un point de la courbe) → 2-327, sur « Fonctions > Généralités sur les fonctions > appartenance à une courbe » ;
--   - 602bd8d7 (la fonction carré) → 2-334, sur « Fonctions > Fonction carré > définition et courbe » ;
--   - 80a87e34 (|x| < k) → 2-460, sur « Fonctions > Fonction valeur absolue > équations et inéquations » ;
--   - 811f6004 (x³ < k) → 2-472, sur « Fonctions > Fonction cube > x³ = k, x³ < k » ;
--   - 8bc8159f (x² < k) → 2-463, sur « Fonctions > Fonction carré > x² = k, x² < k » ;
--   - 9723b1e4 (ensemble de définition d'un quotient) → 2-326, sur « Fonctions > Généralités sur les fonctions > ensemble de définition » ;
--   - aeaff491 (f(x) < k, f affine) → 2-457, sur « Fonctions > Fonctions affines > équations » ;
--   - b44e582b (la fonction valeur absolue) → 2-333, sur « Fonctions > Fonction valeur absolue » ;
--   - bcfbf5f8 (appartenance par le calcul) → 2-331, sur « Fonctions > Généralités sur les fonctions > appartenance à une courbe » ;
--   - cd8f96ba (√x < k) → 2-469, sur « Fonctions > Fonction racine carrée > √x = k, √x < k » ;
--   - d49de3f3 (f(x) = k, f affine) → 2-455, sur « Fonctions > Fonctions affines > équations » ;
--   - d86c9577 (f(x) < k, méthode adaptée) → 2-448, sur « Fonctions > Généralités sur les fonctions > équations et inéquations f(x) = k » ;
--   - ddc60d24 (coordonnées d'un point de la courbe) → 2-447, sur « Fonctions > Généralités sur les fonctions > appartenance à une courbe » ;
--   - e7b37987 (x³ = k) → 2-470, sur « Fonctions > Fonction cube > x³ = k, x³ < k » ;
-- Chaque modèle va sur le nœud de son point (notion ou sous-notion : question_template_points_check_rules
-- refuse un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- 2-325 et 2-333 sont rangés sur leur NOTION (leur point n'a pas de sous-notion). Ni le contenu, ni
-- les niveaux (écrits à la création), ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-01 (journal docs/wip/questions-2de-progress.md § 37). Les modèles
-- ont été créés en brouillon le 2026-11-01 par scripts/create-questions.ts (lots 6 A, 6 B et 6 C,
-- lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (20 modèles). Elle est prouvée par
-- tests/integration/questions-2de-fonctions-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-01),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David en phase 0 du lot 6, AVANT
-- le SQL, tranchée par lui le 2026-11-01 : personne). Aucune règle ne change. Effet visible : les
-- 20 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les
-- voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 20 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('05e8453d-71c7-443b-8045-72291ed5e860'::uuid),
--                ('1048e462-5585-4cf1-8915-2c6d7bf95244'::uuid),
--                ('214f91c0-997a-4086-9fd9-747f0311ca30'::uuid),
--                ('2a249385-5832-40da-b1f4-afe13707d2c3'::uuid),
--                ('345beb60-d98f-4392-8470-cfe1414a6e03'::uuid),
--                ('37f39db3-985b-4ee9-84e1-ad28afeb59df'::uuid),
--                ('42c19a19-4533-4dc5-81a3-2dba70b5cdb4'::uuid),
--                ('602bd8d7-589e-4bf5-9b8c-40f113b5e219'::uuid),
--                ('80a87e34-251c-481a-a086-7b7add231cc9'::uuid),
--                ('811f6004-df26-437a-976d-3ac11eec62be'::uuid),
--                ('8bc8159f-1095-4b71-ba96-329ffe90471b'::uuid),
--                ('9723b1e4-ff05-4b08-961a-5207bc879cce'::uuid),
--                ('aeaff491-9215-47c0-aba1-c021a335d6d0'::uuid),
--                ('b44e582b-a999-43c0-873a-16309427bf59'::uuid),
--                ('bcfbf5f8-367e-4927-8041-489acaeb9831'::uuid),
--                ('cd8f96ba-2aab-4e4f-b0ff-de7dd4713b54'::uuid),
--                ('d49de3f3-05c3-4986-8825-9e13b4544161'::uuid),
--                ('d86c9577-898c-4c0b-8fc0-bf789c20bc89'::uuid),
--                ('ddc60d24-ddce-473b-8e23-58af62ec8b78'::uuid),
--                ('e7b37987-fcb4-42e1-b133-b3b83ba55865'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('05e8453d-71c7-443b-8045-72291ed5e860'::uuid, '2-467'),
-- 	('1048e462-5585-4cf1-8915-2c6d7bf95244'::uuid, '2-335'),
-- 	('214f91c0-997a-4086-9fd9-747f0311ca30'::uuid, '2-466'),
-- 	('2a249385-5832-40da-b1f4-afe13707d2c3'::uuid, '2-336'),
-- 	('345beb60-d98f-4392-8470-cfe1414a6e03'::uuid, '2-325'),
-- 	('37f39db3-985b-4ee9-84e1-ad28afeb59df'::uuid, '2-461'),
-- 	('42c19a19-4533-4dc5-81a3-2dba70b5cdb4'::uuid, '2-327'),
-- 	('602bd8d7-589e-4bf5-9b8c-40f113b5e219'::uuid, '2-334'),
-- 	('80a87e34-251c-481a-a086-7b7add231cc9'::uuid, '2-460'),
-- 	('811f6004-df26-437a-976d-3ac11eec62be'::uuid, '2-472'),
-- 	('8bc8159f-1095-4b71-ba96-329ffe90471b'::uuid, '2-463'),
-- 	('9723b1e4-ff05-4b08-961a-5207bc879cce'::uuid, '2-326'),
-- 	('aeaff491-9215-47c0-aba1-c021a335d6d0'::uuid, '2-457'),
-- 	('b44e582b-a999-43c0-873a-16309427bf59'::uuid, '2-333'),
-- 	('bcfbf5f8-367e-4927-8041-489acaeb9831'::uuid, '2-331'),
-- 	('cd8f96ba-2aab-4e4f-b0ff-de7dd4713b54'::uuid, '2-469'),
-- 	('d49de3f3-05c3-4986-8825-9e13b4544161'::uuid, '2-455'),
-- 	('d86c9577-898c-4c0b-8fc0-bf789c20bc89'::uuid, '2-448'),
-- 	('ddc60d24-ddce-473b-8e23-58af62ec8b78'::uuid, '2-447'),
-- 	('e7b37987-fcb4-42e1-b133-b3b83ba55865'::uuid, '2-470')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '05e8453d-71c7-443b-8045-72291ed5e860',
--               '1048e462-5585-4cf1-8915-2c6d7bf95244',
--               '214f91c0-997a-4086-9fd9-747f0311ca30',
--               '2a249385-5832-40da-b1f4-afe13707d2c3',
--               '345beb60-d98f-4392-8470-cfe1414a6e03',
--               '37f39db3-985b-4ee9-84e1-ad28afeb59df',
--               '42c19a19-4533-4dc5-81a3-2dba70b5cdb4',
--               '602bd8d7-589e-4bf5-9b8c-40f113b5e219',
--               '80a87e34-251c-481a-a086-7b7add231cc9',
--               '811f6004-df26-437a-976d-3ac11eec62be',
--               '8bc8159f-1095-4b71-ba96-329ffe90471b',
--               '9723b1e4-ff05-4b08-961a-5207bc879cce',
--               'aeaff491-9215-47c0-aba1-c021a335d6d0',
--               'b44e582b-a999-43c0-873a-16309427bf59',
--               'bcfbf5f8-367e-4927-8041-489acaeb9831',
--               'cd8f96ba-2aab-4e4f-b0ff-de7dd4713b54',
--               'd49de3f3-05c3-4986-8825-9e13b4544161',
--               'd86c9577-898c-4c0b-8fc0-bf789c20bc89',
--               'ddc60d24-ddce-473b-8e23-58af62ec8b78',
--               'e7b37987-fcb4-42e1-b133-b3b83ba55865');
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
	('05e8453d-71c7-443b-8045-72291ed5e860', 'Fonctions', 'Fonction racine carrée', '√x = k, √x < k', '2-467'),
	('1048e462-5585-4cf1-8915-2c6d7bf95244', 'Fonctions', 'Fonction inverse', 'définition et courbe', '2-335'),
	('214f91c0-997a-4086-9fd9-747f0311ca30', 'Fonctions', 'Fonction inverse', '1/x = k, 1/x < k', '2-466'),
	('2a249385-5832-40da-b1f4-afe13707d2c3', 'Fonctions', 'Généralités sur les fonctions', 'équations et inéquations f(x) = k', '2-336'),
	('345beb60-d98f-4392-8470-cfe1414a6e03', 'Fonctions', 'Généralités sur les fonctions', null, '2-325'),
	('37f39db3-985b-4ee9-84e1-ad28afeb59df', 'Fonctions', 'Fonction carré', 'x² = k, x² < k', '2-461'),
	('42c19a19-4533-4dc5-81a3-2dba70b5cdb4', 'Fonctions', 'Généralités sur les fonctions', 'appartenance à une courbe', '2-327'),
	('602bd8d7-589e-4bf5-9b8c-40f113b5e219', 'Fonctions', 'Fonction carré', 'définition et courbe', '2-334'),
	('80a87e34-251c-481a-a086-7b7add231cc9', 'Fonctions', 'Fonction valeur absolue', 'équations et inéquations', '2-460'),
	('811f6004-df26-437a-976d-3ac11eec62be', 'Fonctions', 'Fonction cube', 'x³ = k, x³ < k', '2-472'),
	('8bc8159f-1095-4b71-ba96-329ffe90471b', 'Fonctions', 'Fonction carré', 'x² = k, x² < k', '2-463'),
	('9723b1e4-ff05-4b08-961a-5207bc879cce', 'Fonctions', 'Généralités sur les fonctions', 'ensemble de définition', '2-326'),
	('aeaff491-9215-47c0-aba1-c021a335d6d0', 'Fonctions', 'Fonctions affines', 'équations', '2-457'),
	('b44e582b-a999-43c0-873a-16309427bf59', 'Fonctions', 'Fonction valeur absolue', null, '2-333'),
	('bcfbf5f8-367e-4927-8041-489acaeb9831', 'Fonctions', 'Généralités sur les fonctions', 'appartenance à une courbe', '2-331'),
	('cd8f96ba-2aab-4e4f-b0ff-de7dd4713b54', 'Fonctions', 'Fonction racine carrée', '√x = k, √x < k', '2-469'),
	('d49de3f3-05c3-4986-8825-9e13b4544161', 'Fonctions', 'Fonctions affines', 'équations', '2-455'),
	('d86c9577-898c-4c0b-8fc0-bf789c20bc89', 'Fonctions', 'Généralités sur les fonctions', 'équations et inéquations f(x) = k', '2-448'),
	('ddc60d24-ddce-473b-8e23-58af62ec8b78', 'Fonctions', 'Généralités sur les fonctions', 'appartenance à une courbe', '2-447'),
	('e7b37987-fcb4-42e1-b133-b3b83ba55865', 'Fonctions', 'Fonction cube', 'x³ = k, x³ < k', '2-470');

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
	if v_presents not in (0, 20) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 20', v_presents;
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
