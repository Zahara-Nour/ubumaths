-- ============================================================================
-- Chantier « questions-2de », lot 4 (vecteurs en coordonnées) : nœud et tag de 11 modèles neufs
-- ============================================================================
--   - 576e8aed (distance entre deux points) → 2-301, sur « Géométrie > Géométrie repérée > milieu et distance » ;
--   - 583398f7 (coordonnées dans une base) → 2-434, sur « Géométrie > Vecteurs > coordonnées » ;
--   - 59f818c4 (milieu d'un segment) → 2-302, sur « Géométrie > Géométrie repérée > milieu et distance » ;
--   - 5a97d95a (coordonnées du vecteur AB) → 2-294, sur « Géométrie > Vecteurs > coordonnées » ;
--   - 6514d084 (trois points alignés) → 2-303, sur « Géométrie > Vecteurs > colinéarité » ;
--   - 84227334 (critère de colinéarité) → 2-435, sur « Géométrie > Vecteurs > colinéarité » ;
--   - 930711ec (déterminant) → 2-295, sur « Géométrie > Vecteurs > colinéarité » ;
--   - b9f06686 (coordonnées d'une somme) → 2-300, sur « Géométrie > Vecteurs > coordonnées » ;
--   - cf08f061 (norme d'un vecteur) → 2-293, sur « Géométrie > Vecteurs > norme » ;
--   - f26e24b9 (produit par un réel) → 2-436, sur « Géométrie > Vecteurs > coordonnées » ;
--   - f53ad892 (deux droites parallèles) → 2-437, sur « Géométrie > Vecteurs > colinéarité » ;
-- Chaque modèle va sur le nœud de son point (sous-notion : question_template_points_check_rules
-- refuse un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- 2u⃗ − 3v⃗ est rangé sur 2-300 (décision L4-c). Ni le contenu, ni les niveaux (écrits à la
-- création), ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-29 (journal docs/wip/questions-2de-progress.md § 23). Les modèles
-- ont été créés en brouillon le 2026-10-30 par scripts/create-questions.ts (lots 4 A et 4 B, lancé
-- par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (11 modèles). Elle est prouvée par
-- tests/integration/questions-2de-vecteurs-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-30), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David en phase 0 du lot 4, AVANT
-- le SQL, tranchée par lui le 2026-10-29 : personne). Aucune règle ne change. Effet visible : les
-- 11 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les
-- voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 11 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('576e8aed-3ea2-4bdd-8584-89d247fd3f03'::uuid),
--                ('583398f7-dc30-4f9d-bf81-7ae39e6a0d91'::uuid),
--                ('59f818c4-e3e0-460c-8635-857236c61b13'::uuid),
--                ('5a97d95a-8d28-40d6-a64c-79dbad34bc63'::uuid),
--                ('6514d084-b34e-4277-9e13-c1e3e65e0b78'::uuid),
--                ('84227334-c406-4d8f-a25a-ca0024599ae3'::uuid),
--                ('930711ec-0bb7-4cf0-bd78-c06140bc41c3'::uuid),
--                ('b9f06686-9c65-4fe6-bb38-aa787fea30a1'::uuid),
--                ('cf08f061-198f-4432-a312-f903ca7cd5bf'::uuid),
--                ('f26e24b9-abe3-45ca-84ee-dfeea372a5ef'::uuid),
--                ('f53ad892-dba0-49b4-badb-0a3b6add8973'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('576e8aed-3ea2-4bdd-8584-89d247fd3f03'::uuid, '2-301'),
-- 	('583398f7-dc30-4f9d-bf81-7ae39e6a0d91'::uuid, '2-434'),
-- 	('59f818c4-e3e0-460c-8635-857236c61b13'::uuid, '2-302'),
-- 	('5a97d95a-8d28-40d6-a64c-79dbad34bc63'::uuid, '2-294'),
-- 	('6514d084-b34e-4277-9e13-c1e3e65e0b78'::uuid, '2-303'),
-- 	('84227334-c406-4d8f-a25a-ca0024599ae3'::uuid, '2-435'),
-- 	('930711ec-0bb7-4cf0-bd78-c06140bc41c3'::uuid, '2-295'),
-- 	('b9f06686-9c65-4fe6-bb38-aa787fea30a1'::uuid, '2-300'),
-- 	('cf08f061-198f-4432-a312-f903ca7cd5bf'::uuid, '2-293'),
-- 	('f26e24b9-abe3-45ca-84ee-dfeea372a5ef'::uuid, '2-436'),
-- 	('f53ad892-dba0-49b4-badb-0a3b6add8973'::uuid, '2-437')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '576e8aed-3ea2-4bdd-8584-89d247fd3f03',
--               '583398f7-dc30-4f9d-bf81-7ae39e6a0d91',
--               '59f818c4-e3e0-460c-8635-857236c61b13',
--               '5a97d95a-8d28-40d6-a64c-79dbad34bc63',
--               '6514d084-b34e-4277-9e13-c1e3e65e0b78',
--               '84227334-c406-4d8f-a25a-ca0024599ae3',
--               '930711ec-0bb7-4cf0-bd78-c06140bc41c3',
--               'b9f06686-9c65-4fe6-bb38-aa787fea30a1',
--               'cf08f061-198f-4432-a312-f903ca7cd5bf',
--               'f26e24b9-abe3-45ca-84ee-dfeea372a5ef',
--               'f53ad892-dba0-49b4-badb-0a3b6add8973');
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
	('576e8aed-3ea2-4bdd-8584-89d247fd3f03', 'Géométrie', 'Géométrie repérée', 'milieu et distance', '2-301'),
	('583398f7-dc30-4f9d-bf81-7ae39e6a0d91', 'Géométrie', 'Vecteurs', 'coordonnées', '2-434'),
	('59f818c4-e3e0-460c-8635-857236c61b13', 'Géométrie', 'Géométrie repérée', 'milieu et distance', '2-302'),
	('5a97d95a-8d28-40d6-a64c-79dbad34bc63', 'Géométrie', 'Vecteurs', 'coordonnées', '2-294'),
	('6514d084-b34e-4277-9e13-c1e3e65e0b78', 'Géométrie', 'Vecteurs', 'colinéarité', '2-303'),
	('84227334-c406-4d8f-a25a-ca0024599ae3', 'Géométrie', 'Vecteurs', 'colinéarité', '2-435'),
	('930711ec-0bb7-4cf0-bd78-c06140bc41c3', 'Géométrie', 'Vecteurs', 'colinéarité', '2-295'),
	('b9f06686-9c65-4fe6-bb38-aa787fea30a1', 'Géométrie', 'Vecteurs', 'coordonnées', '2-300'),
	('cf08f061-198f-4432-a312-f903ca7cd5bf', 'Géométrie', 'Vecteurs', 'norme', '2-293'),
	('f26e24b9-abe3-45ca-84ee-dfeea372a5ef', 'Géométrie', 'Vecteurs', 'coordonnées', '2-436'),
	('f53ad892-dba0-49b4-badb-0a3b6add8973', 'Géométrie', 'Vecteurs', 'colinéarité', '2-437');

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
	if v_presents not in (0, 11) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 11', v_presents;
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
