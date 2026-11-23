-- ============================================================================
-- Chantier « questions-2de », lot 2 (équations et inéquations du premier degré) : nœud et tag de
-- 10 modèles neufs
-- ============================================================================
--   - 58984eff (a + x = b) → 2-430, sur « Algèbre > Équations : premier degré » ;
--   - 4563f7c5 (ax = b) → 2-429, sur « Algèbre > Équations : premier degré » ;
--   - e8ce1278 (ax + b = 0) → 2-265, sur « Algèbre > Équations : premier degré > ax + b = c » ;
--   - 834c734f (ax + b = cx + d) → 2-279, sur « Algèbre > Équations : premier degré > ax + b = cx + d » ;
--   - bb3b8e76 (produit nul) → 2-267, sur « Algèbre > Équations : produit et quotient > produit nul » ;
--   - ac9579d6 (x² = a) → 2-281, sur « Algèbre > Équations : produit et quotient > x² = a » ;
--   - 29d74cf6 (a + x ⩾ b) → 2-432, sur « Algèbre > Inéquations : premier degré » ;
--   - cf796fab (ax ⩾ b) → 2-431, sur « Algèbre > Inéquations : premier degré » ;
--   - 75439740 (ax + b > 0) → 2-266, sur « Algèbre > Inéquations : premier degré > ax + b < c » ;
--   - bb5fa6ef (ax + b ⩾ cx + d) → 2-280, sur « Algèbre > Inéquations : premier degré » ;
-- Chaque modèle va sur le nœud de son point (notion ou sous-notion : question_template_points_check_rules
-- refuse un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-27 (journal docs/wip/questions-2de-progress.md § 8). Les modèles
-- ont été créés en brouillon le 2026-10-27 par scripts/create-questions.ts
-- (scripts/questions/2de-equations/, lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (10 modèles). Elle est prouvée par
-- tests/integration/questions-2de-equations-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-27), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-10-27 en phase 0 du
-- lot, AVANT le SQL, tranchée par lui le 2026-10-27 : personne). Aucune règle ne change. Effet
-- visible : les 10 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les
-- élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 10 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('29d74cf6-a8bc-4545-b83c-d772ec6e3f0f'::uuid),
--                ('4563f7c5-b7bb-4c0d-bc39-6be10205f6c4'::uuid),
--                ('58984eff-03a7-4cf6-9050-a486e7eefee9'::uuid),
--                ('75439740-73da-4257-8896-6b64a9332e21'::uuid),
--                ('834c734f-7887-4b08-8758-9f5002011f3f'::uuid),
--                ('ac9579d6-7d48-4b88-8d2f-e8c5319867db'::uuid),
--                ('bb3b8e76-e6de-4987-94c4-207e4f5acec0'::uuid),
--                ('bb5fa6ef-004d-4828-8277-a2aa3a2a6eba'::uuid),
--                ('cf796fab-520e-4d68-9d6f-756e7c2afaa9'::uuid),
--                ('e8ce1278-4f9c-4be5-9e45-e6323239a42b'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('29d74cf6-a8bc-4545-b83c-d772ec6e3f0f'::uuid, '2-432'),
-- 	('4563f7c5-b7bb-4c0d-bc39-6be10205f6c4'::uuid, '2-429'),
-- 	('58984eff-03a7-4cf6-9050-a486e7eefee9'::uuid, '2-430'),
-- 	('75439740-73da-4257-8896-6b64a9332e21'::uuid, '2-266'),
-- 	('834c734f-7887-4b08-8758-9f5002011f3f'::uuid, '2-279'),
-- 	('ac9579d6-7d48-4b88-8d2f-e8c5319867db'::uuid, '2-281'),
-- 	('bb3b8e76-e6de-4987-94c4-207e4f5acec0'::uuid, '2-267'),
-- 	('bb5fa6ef-004d-4828-8277-a2aa3a2a6eba'::uuid, '2-280'),
-- 	('cf796fab-520e-4d68-9d6f-756e7c2afaa9'::uuid, '2-431'),
-- 	('e8ce1278-4f9c-4be5-9e45-e6323239a42b'::uuid, '2-265')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '29d74cf6-a8bc-4545-b83c-d772ec6e3f0f',
--               '4563f7c5-b7bb-4c0d-bc39-6be10205f6c4',
--               '58984eff-03a7-4cf6-9050-a486e7eefee9',
--               '75439740-73da-4257-8896-6b64a9332e21',
--               '834c734f-7887-4b08-8758-9f5002011f3f',
--               'ac9579d6-7d48-4b88-8d2f-e8c5319867db',
--               'bb3b8e76-e6de-4987-94c4-207e4f5acec0',
--               'bb5fa6ef-004d-4828-8277-a2aa3a2a6eba',
--               'cf796fab-520e-4d68-9d6f-756e7c2afaa9',
--               'e8ce1278-4f9c-4be5-9e45-e6323239a42b');
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
	('29d74cf6-a8bc-4545-b83c-d772ec6e3f0f', 'Algèbre', 'Inéquations : premier degré', null, '2-432'),
	('4563f7c5-b7bb-4c0d-bc39-6be10205f6c4', 'Algèbre', 'Équations : premier degré', null, '2-429'),
	('58984eff-03a7-4cf6-9050-a486e7eefee9', 'Algèbre', 'Équations : premier degré', null, '2-430'),
	('75439740-73da-4257-8896-6b64a9332e21', 'Algèbre', 'Inéquations : premier degré', 'ax + b < c', '2-266'),
	('834c734f-7887-4b08-8758-9f5002011f3f', 'Algèbre', 'Équations : premier degré', 'ax + b = cx + d', '2-279'),
	('ac9579d6-7d48-4b88-8d2f-e8c5319867db', 'Algèbre', 'Équations : produit et quotient', 'x² = a', '2-281'),
	('bb3b8e76-e6de-4987-94c4-207e4f5acec0', 'Algèbre', 'Équations : produit et quotient', 'produit nul', '2-267'),
	('bb5fa6ef-004d-4828-8277-a2aa3a2a6eba', 'Algèbre', 'Inéquations : premier degré', null, '2-280'),
	('cf796fab-520e-4d68-9d6f-756e7c2afaa9', 'Algèbre', 'Inéquations : premier degré', null, '2-431'),
	('e8ce1278-4f9c-4be5-9e45-e6323239a42b', 'Algèbre', 'Équations : premier degré', 'ax + b = c', '2-265');

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
