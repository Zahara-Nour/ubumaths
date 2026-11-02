-- ============================================================================
-- Chantier « questions-1spe », lot 6b « à savoir » : nœud et tag de 7 modèles neufs
-- ============================================================================
--   - 24ca7584 (produit scalaire en base orthonormée) → 1SPE-313, sur « Géométrie > Produit scalaire > expressions du produit scalaire » ;
--   - 47d451b4 (équation de cercle) → 1SPE-329, sur « Géométrie > Géométrie repérée > équation de cercle » ;
--   - 4f8c7b91 (produit scalaire et cosinus) → 1SPE-412, sur « Géométrie > Produit scalaire > expressions du produit scalaire » ;
--   - 52a3ad9b (caractérisation de l'orthogonalité) → 1SPE-311, sur « Géométrie > Produit scalaire > propriétés » ;
--   - 71205949 (formule d'Al-Kashi) → 1SPE-316, sur « Géométrie > Produit scalaire > angles et longueurs » ;
--   - 7bf472bc (produit scalaire et projection orthogonale) → 1SPE-310, sur « Géométrie > Produit scalaire > expressions du produit scalaire » ;
--   - 9af16245 (critère d'orthogonalité en base orthonormée) → 1SPE-415, sur « Géométrie > Produit scalaire > propriétés » ;
-- Chaque modèle va sur le nœud de son point (sous-notion : question_template_points_check_rules
-- refuse un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-02 (journal docs/wip/questions-1spe-progress.md § 23, D29 ; écriture : docs/wip/questions-1spe-geometrie-progress.md). Les
-- modèles ont été créés en brouillon le 2026-11-02 (17 h 35 UTC) par scripts/create-questions.ts (lancé par
-- David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-1spe-savoir-b-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-02),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David en phase 0 du lot, AVANT
-- le SQL, tranchée par lui le 2026-11-02 : personne). Aucune règle ne change. Effet visible : les
-- 7 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les
-- voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('24ca7584-1de6-49e7-91df-8717989efc53'::uuid),
--                ('47d451b4-4d79-4bf1-9190-c7a8b131c2a5'::uuid),
--                ('4f8c7b91-af59-46f3-8ec3-b2f6e9a72c53'::uuid),
--                ('52a3ad9b-a6af-4e19-a4fe-dcb4806df355'::uuid),
--                ('71205949-5fdf-42a3-8761-76b3fef8f33a'::uuid),
--                ('7bf472bc-fcc9-436c-bc49-931990208941'::uuid),
--                ('9af16245-83f4-4838-8ca5-6ebc5451dc32'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('24ca7584-1de6-49e7-91df-8717989efc53'::uuid, '1SPE-313'),
-- 	('47d451b4-4d79-4bf1-9190-c7a8b131c2a5'::uuid, '1SPE-329'),
-- 	('4f8c7b91-af59-46f3-8ec3-b2f6e9a72c53'::uuid, '1SPE-412'),
-- 	('52a3ad9b-a6af-4e19-a4fe-dcb4806df355'::uuid, '1SPE-311'),
-- 	('71205949-5fdf-42a3-8761-76b3fef8f33a'::uuid, '1SPE-316'),
-- 	('7bf472bc-fcc9-436c-bc49-931990208941'::uuid, '1SPE-310'),
-- 	('9af16245-83f4-4838-8ca5-6ebc5451dc32'::uuid, '1SPE-415')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '1_SPE' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '24ca7584-1de6-49e7-91df-8717989efc53',
--               '47d451b4-4d79-4bf1-9190-c7a8b131c2a5',
--               '4f8c7b91-af59-46f3-8ec3-b2f6e9a72c53',
--               '52a3ad9b-a6af-4e19-a4fe-dcb4806df355',
--               '71205949-5fdf-42a3-8761-76b3fef8f33a',
--               '7bf472bc-fcc9-436c-bc49-931990208941',
--               '9af16245-83f4-4838-8ca5-6ebc5451dc32');
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
	('24ca7584-1de6-49e7-91df-8717989efc53', 'Géométrie', 'Produit scalaire', 'expressions du produit scalaire', '1SPE-313'),
	('47d451b4-4d79-4bf1-9190-c7a8b131c2a5', 'Géométrie', 'Géométrie repérée', 'équation de cercle', '1SPE-329'),
	('4f8c7b91-af59-46f3-8ec3-b2f6e9a72c53', 'Géométrie', 'Produit scalaire', 'expressions du produit scalaire', '1SPE-412'),
	('52a3ad9b-a6af-4e19-a4fe-dcb4806df355', 'Géométrie', 'Produit scalaire', 'propriétés', '1SPE-311'),
	('71205949-5fdf-42a3-8761-76b3fef8f33a', 'Géométrie', 'Produit scalaire', 'angles et longueurs', '1SPE-316'),
	('7bf472bc-fcc9-436c-bc49-931990208941', 'Géométrie', 'Produit scalaire', 'expressions du produit scalaire', '1SPE-310'),
	('9af16245-83f4-4838-8ca5-6ebc5451dc32', 'Géométrie', 'Produit scalaire', 'propriétés', '1SPE-415');

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
 where p.grade = '1_SPE' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
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
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
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
