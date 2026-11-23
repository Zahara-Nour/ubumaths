-- ============================================================================
-- Chantier « questions-1spe », lot 1-dérivation : nœud et tag de 10 modèles neufs
-- ============================================================================
--   - 2067f7a4 (valeur approchée) → 1SPE-273, sur « Fonctions > Dérivation > approximation affine » ;
--   - 286a68a8 (calculer un taux) → 1SPE-268, sur « Fonctions > Dérivation > taux de variation » ;
--   - 5be4ac71 (approximation de f(a + h)) → 1SPE-390, sur « Fonctions > Dérivation > approximation affine » ;
--   - 8a384698 (sécante lue sur un graphique) → 1SPE-388, sur « Fonctions > Dérivation > taux de variation » ;
--   - 9f072622 (pente d'une sécante) → 1SPE-397, sur « Fonctions > Dérivation > taux de variation » ;
--   - b359cd25 (|x| en 0) → 1SPE-267, sur « Fonctions > Dérivation > dérivabilité en un point » ;
--   - be57bd36 (fonction affine tangente) → 1SPE-262, sur « Fonctions > Dérivation > approximation affine » ;
--   - d2bca2d8 (ensemble de dérivabilité) → 1SPE-263, sur « Fonctions > Dérivation > fonctions dérivées » ;
--   - de73e71d (définition du taux) → 1SPE-259, sur « Fonctions > Dérivation > taux de variation » ;
--   - e9fe1a28 (nombre dérivé en contexte) → 1SPE-269, sur « Fonctions > Dérivation > nombre dérivé » ;
-- Chaque modèle va sur le nœud de son point (sous-notion : question_template_points_check_rules
-- refuse un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-01 (journal docs/wip/questions-1spe-progress.md § 18, D23). Les
-- modèles ont été créés en brouillon le 2026-11-01 par scripts/create-questions.ts (lancé par
-- David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (10 modèles). Elle est prouvée par
-- tests/integration/questions-1spe-derivation-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-01),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David en phase 0 du lot, AVANT
-- le SQL, tranchée par lui le 2026-11-01 : personne). Aucune règle ne change. Effet visible : les
-- 10 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les
-- voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 10 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('2067f7a4-c00d-4b9b-b590-70987d82372c'::uuid),
--                ('286a68a8-49c1-4d7d-b845-452457e8dab8'::uuid),
--                ('5be4ac71-a093-4501-bf71-47f0db619177'::uuid),
--                ('8a384698-1367-4a12-a995-b6cd4df9cfe1'::uuid),
--                ('9f072622-9ce5-4e76-b02e-a738bf6ea39a'::uuid),
--                ('b359cd25-c05c-4f15-be5b-a0e581c45b47'::uuid),
--                ('be57bd36-3bd4-4852-9033-b443630eab40'::uuid),
--                ('d2bca2d8-1824-44ae-954e-96a5cb69fd61'::uuid),
--                ('de73e71d-031b-4f9a-b3c9-a1cc6f970a0e'::uuid),
--                ('e9fe1a28-be69-4ac8-8cd0-019f76a981da'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('2067f7a4-c00d-4b9b-b590-70987d82372c'::uuid, '1SPE-273'),
-- 	('286a68a8-49c1-4d7d-b845-452457e8dab8'::uuid, '1SPE-268'),
-- 	('5be4ac71-a093-4501-bf71-47f0db619177'::uuid, '1SPE-390'),
-- 	('8a384698-1367-4a12-a995-b6cd4df9cfe1'::uuid, '1SPE-388'),
-- 	('9f072622-9ce5-4e76-b02e-a738bf6ea39a'::uuid, '1SPE-397'),
-- 	('b359cd25-c05c-4f15-be5b-a0e581c45b47'::uuid, '1SPE-267'),
-- 	('be57bd36-3bd4-4852-9033-b443630eab40'::uuid, '1SPE-262'),
-- 	('d2bca2d8-1824-44ae-954e-96a5cb69fd61'::uuid, '1SPE-263'),
-- 	('de73e71d-031b-4f9a-b3c9-a1cc6f970a0e'::uuid, '1SPE-259'),
-- 	('e9fe1a28-be69-4ac8-8cd0-019f76a981da'::uuid, '1SPE-269')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '1_SPE' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '2067f7a4-c00d-4b9b-b590-70987d82372c',
--               '286a68a8-49c1-4d7d-b845-452457e8dab8',
--               '5be4ac71-a093-4501-bf71-47f0db619177',
--               '8a384698-1367-4a12-a995-b6cd4df9cfe1',
--               '9f072622-9ce5-4e76-b02e-a738bf6ea39a',
--               'b359cd25-c05c-4f15-be5b-a0e581c45b47',
--               'be57bd36-3bd4-4852-9033-b443630eab40',
--               'd2bca2d8-1824-44ae-954e-96a5cb69fd61',
--               'de73e71d-031b-4f9a-b3c9-a1cc6f970a0e',
--               'e9fe1a28-be69-4ac8-8cd0-019f76a981da');
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
	('2067f7a4-c00d-4b9b-b590-70987d82372c', 'Fonctions', 'Dérivation', 'approximation affine', '1SPE-273'),
	('286a68a8-49c1-4d7d-b845-452457e8dab8', 'Fonctions', 'Dérivation', 'taux de variation', '1SPE-268'),
	('5be4ac71-a093-4501-bf71-47f0db619177', 'Fonctions', 'Dérivation', 'approximation affine', '1SPE-390'),
	('8a384698-1367-4a12-a995-b6cd4df9cfe1', 'Fonctions', 'Dérivation', 'taux de variation', '1SPE-388'),
	('9f072622-9ce5-4e76-b02e-a738bf6ea39a', 'Fonctions', 'Dérivation', 'taux de variation', '1SPE-397'),
	('b359cd25-c05c-4f15-be5b-a0e581c45b47', 'Fonctions', 'Dérivation', 'dérivabilité en un point', '1SPE-267'),
	('be57bd36-3bd4-4852-9033-b443630eab40', 'Fonctions', 'Dérivation', 'approximation affine', '1SPE-262'),
	('d2bca2d8-1824-44ae-954e-96a5cb69fd61', 'Fonctions', 'Dérivation', 'fonctions dérivées', '1SPE-263'),
	('de73e71d-031b-4f9a-b3c9-a1cc6f970a0e', 'Fonctions', 'Dérivation', 'taux de variation', '1SPE-259'),
	('e9fe1a28-be69-4ac8-8cd0-019f76a981da', 'Fonctions', 'Dérivation', 'nombre dérivé', '1SPE-269');

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
	if v_presents not in (0, 10) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 10', v_presents;
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
