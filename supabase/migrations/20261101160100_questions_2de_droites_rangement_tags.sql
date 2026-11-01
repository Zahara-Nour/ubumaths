-- ============================================================================
-- Chantier « questions-2de », lot 5 (droites du plan) : nœud et tag de 16 modèles neufs
-- ============================================================================
--   - 2540ca82 (vecteur directeur sur un graphique) → 2-444, sur « Géométrie > Géométrie repérée > vecteur directeur » ;
--   - 2cfae58d (tracer, équation cartésienne) → 2-445, sur « Géométrie > Géométrie repérée > équations de droites » ;
--   - 36c21f21 (vecteur directeur sur une équation) → 2-443, sur « Géométrie > Géométrie repérée > vecteur directeur » ;
--   - 49df6491 (pente lue sur une équation) → 2-442, sur « Géométrie > Géométrie repérée > vecteur directeur » ;
--   - 6e074f0e (deux points) → 2-314, sur « Géométrie > Géométrie repérée > équations de droites » ;
--   - 718b7183 (point d'intersection) → 2-319, sur « Géométrie > Géométrie repérée > intersection de deux droites » ;
--   - 7a3b209d (alignement par une équation) → 2-317, sur « Géométrie > Vecteurs > colinéarité » ;
--   - 7c0f1c1a (équation cartésienne) → 2-312, sur « Géométrie > Géométrie repérée > équations de droites » ;
--   - 7d605742 (vecteurs directeurs) → 2-311, sur « Géométrie > Géométrie repérée > vecteur directeur » ;
--   - 7d6cf480 (pente par deux points) → 2-313, sur « Fonctions > Fonctions affines > coefficient directeur et ordonnée à l'origine » ;
--   - 7f308eb4 (équation réduite) → 2-439, sur « Géométrie > Géométrie repérée > équations de droites » ;
--   - 8d4bd94d (tracer, équation réduite) → 2-316, sur « Géométrie > Géométrie repérée > équations de droites » ;
--   - c23f5a94 (parallèles ou sécantes) → 2-318, sur « Géométrie > Géométrie repérée > intersection de deux droites » ;
--   - d8a958ba (point et vecteur directeur) → 2-440, sur « Géométrie > Géométrie repérée > équations de droites » ;
--   - e6552232 (point et pente) → 2-441, sur « Géométrie > Géométrie repérée > équations de droites » ;
--   - f381c646 (pente lue sur un graphique) → 2-315, sur « Géométrie > Géométrie repérée > vecteur directeur » ;
-- Chaque modèle va sur le nœud de son point (sous-notion : question_template_points_check_rules
-- refuse un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- 2-313 (pente par deux points) est rangé côté Fonctions, 2-317 (alignement) côté Vecteurs : c'est
-- le nœud de leur point. Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-01 (journal docs/wip/questions-2de-progress.md § 30). Les modèles
-- ont été créés en brouillon le 2026-11-01 par scripts/create-questions.ts (lots 5 A et 5 B, lancé
-- par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (16 modèles). Elle est prouvée par
-- tests/integration/questions-2de-droites-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-01),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David en phase 0 du lot 5, AVANT
-- le SQL, tranchée par lui le 2026-11-01 : personne). Aucune règle ne change. Effet visible : les
-- 16 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les
-- voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 16 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('2540ca82-26ca-443e-a5f7-5f87a49629e3'::uuid),
--                ('2cfae58d-7fdb-45f7-8ea1-777a4a307b5a'::uuid),
--                ('36c21f21-fee5-4d2e-a191-364b42039cd1'::uuid),
--                ('49df6491-f424-4560-8fba-a9c302449e3d'::uuid),
--                ('6e074f0e-0c3a-41b8-b70a-82cb402494b3'::uuid),
--                ('718b7183-415b-4a86-bbf1-70a3c1eb0c6c'::uuid),
--                ('7a3b209d-05b1-400d-98ba-e57d85639d05'::uuid),
--                ('7c0f1c1a-e415-499c-97ac-cb6060f99105'::uuid),
--                ('7d605742-cf00-4282-b56c-c99aee16ad14'::uuid),
--                ('7d6cf480-b062-4e45-a593-2e85fbeb28b3'::uuid),
--                ('7f308eb4-40f9-408e-9c71-012464d0f79d'::uuid),
--                ('8d4bd94d-73f7-4589-8b3f-67c84edcf778'::uuid),
--                ('c23f5a94-269d-4f2d-915a-ca234cec67a6'::uuid),
--                ('d8a958ba-c6f2-4e6b-b4c9-ee7b370cc03e'::uuid),
--                ('e6552232-b549-4966-8863-1cba6f945fcc'::uuid),
--                ('f381c646-80fa-4cd2-86c0-0c3d9ad934be'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('2540ca82-26ca-443e-a5f7-5f87a49629e3'::uuid, '2-444'),
-- 	('2cfae58d-7fdb-45f7-8ea1-777a4a307b5a'::uuid, '2-445'),
-- 	('36c21f21-fee5-4d2e-a191-364b42039cd1'::uuid, '2-443'),
-- 	('49df6491-f424-4560-8fba-a9c302449e3d'::uuid, '2-442'),
-- 	('6e074f0e-0c3a-41b8-b70a-82cb402494b3'::uuid, '2-314'),
-- 	('718b7183-415b-4a86-bbf1-70a3c1eb0c6c'::uuid, '2-319'),
-- 	('7a3b209d-05b1-400d-98ba-e57d85639d05'::uuid, '2-317'),
-- 	('7c0f1c1a-e415-499c-97ac-cb6060f99105'::uuid, '2-312'),
-- 	('7d605742-cf00-4282-b56c-c99aee16ad14'::uuid, '2-311'),
-- 	('7d6cf480-b062-4e45-a593-2e85fbeb28b3'::uuid, '2-313'),
-- 	('7f308eb4-40f9-408e-9c71-012464d0f79d'::uuid, '2-439'),
-- 	('8d4bd94d-73f7-4589-8b3f-67c84edcf778'::uuid, '2-316'),
-- 	('c23f5a94-269d-4f2d-915a-ca234cec67a6'::uuid, '2-318'),
-- 	('d8a958ba-c6f2-4e6b-b4c9-ee7b370cc03e'::uuid, '2-440'),
-- 	('e6552232-b549-4966-8863-1cba6f945fcc'::uuid, '2-441'),
-- 	('f381c646-80fa-4cd2-86c0-0c3d9ad934be'::uuid, '2-315')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '2540ca82-26ca-443e-a5f7-5f87a49629e3',
--               '2cfae58d-7fdb-45f7-8ea1-777a4a307b5a',
--               '36c21f21-fee5-4d2e-a191-364b42039cd1',
--               '49df6491-f424-4560-8fba-a9c302449e3d',
--               '6e074f0e-0c3a-41b8-b70a-82cb402494b3',
--               '718b7183-415b-4a86-bbf1-70a3c1eb0c6c',
--               '7a3b209d-05b1-400d-98ba-e57d85639d05',
--               '7c0f1c1a-e415-499c-97ac-cb6060f99105',
--               '7d605742-cf00-4282-b56c-c99aee16ad14',
--               '7d6cf480-b062-4e45-a593-2e85fbeb28b3',
--               '7f308eb4-40f9-408e-9c71-012464d0f79d',
--               '8d4bd94d-73f7-4589-8b3f-67c84edcf778',
--               'c23f5a94-269d-4f2d-915a-ca234cec67a6',
--               'd8a958ba-c6f2-4e6b-b4c9-ee7b370cc03e',
--               'e6552232-b549-4966-8863-1cba6f945fcc',
--               'f381c646-80fa-4cd2-86c0-0c3d9ad934be');
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
	('2540ca82-26ca-443e-a5f7-5f87a49629e3', 'Géométrie', 'Géométrie repérée', 'vecteur directeur', '2-444'),
	('2cfae58d-7fdb-45f7-8ea1-777a4a307b5a', 'Géométrie', 'Géométrie repérée', 'équations de droites', '2-445'),
	('36c21f21-fee5-4d2e-a191-364b42039cd1', 'Géométrie', 'Géométrie repérée', 'vecteur directeur', '2-443'),
	('49df6491-f424-4560-8fba-a9c302449e3d', 'Géométrie', 'Géométrie repérée', 'vecteur directeur', '2-442'),
	('6e074f0e-0c3a-41b8-b70a-82cb402494b3', 'Géométrie', 'Géométrie repérée', 'équations de droites', '2-314'),
	('718b7183-415b-4a86-bbf1-70a3c1eb0c6c', 'Géométrie', 'Géométrie repérée', 'intersection de deux droites', '2-319'),
	('7a3b209d-05b1-400d-98ba-e57d85639d05', 'Géométrie', 'Vecteurs', 'colinéarité', '2-317'),
	('7c0f1c1a-e415-499c-97ac-cb6060f99105', 'Géométrie', 'Géométrie repérée', 'équations de droites', '2-312'),
	('7d605742-cf00-4282-b56c-c99aee16ad14', 'Géométrie', 'Géométrie repérée', 'vecteur directeur', '2-311'),
	('7d6cf480-b062-4e45-a593-2e85fbeb28b3', 'Fonctions', 'Fonctions affines', 'coefficient directeur et ordonnée à l''origine', '2-313'),
	('7f308eb4-40f9-408e-9c71-012464d0f79d', 'Géométrie', 'Géométrie repérée', 'équations de droites', '2-439'),
	('8d4bd94d-73f7-4589-8b3f-67c84edcf778', 'Géométrie', 'Géométrie repérée', 'équations de droites', '2-316'),
	('c23f5a94-269d-4f2d-915a-ca234cec67a6', 'Géométrie', 'Géométrie repérée', 'intersection de deux droites', '2-318'),
	('d8a958ba-c6f2-4e6b-b4c9-ee7b370cc03e', 'Géométrie', 'Géométrie repérée', 'équations de droites', '2-440'),
	('e6552232-b549-4966-8863-1cba6f945fcc', 'Géométrie', 'Géométrie repérée', 'équations de droites', '2-441'),
	('f381c646-80fa-4cd2-86c0-0c3d9ad934be', 'Géométrie', 'Géométrie repérée', 'vecteur directeur', '2-315');

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
	if v_presents not in (0, 16) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 16', v_presents;
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
