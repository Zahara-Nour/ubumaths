-- ============================================================================
-- Chantier « questions-1spe », lot 3-suites : nœud et tag de 10 modèles neufs
-- ============================================================================
--   - 05edc72b (motif : relation explicite) → 1SPE-222, sur « Suites > Généralités sur les suites > explicite ou par récurrence » ;
--   - 22141fa4 (exponentielle et géométrique) → 1SPE-374, sur « Fonctions > Fonction exponentielle > croissance et décroissance exponentielles » ;
--   - 41100a51 (motif : relation de récurrence) → 1SPE-376, sur « Suites > Généralités sur les suites > explicite ou par récurrence » ;
--   - 45da9678 (de l'énoncé à la suite) → 1SPE-375, sur « Suites > Généralités sur les suites > explicite ou par récurrence » ;
--   - 4a51f887 (termes par un algorithme) → 1SPE-378, sur « Suites > Généralités sur les suites > explicite ou par récurrence » ;
--   - 81322162 (reconnaître la suite d'un algorithme) → 1SPE-369, sur « Suites > Généralités sur les suites » ;
--   - 89594aa7 (motif : nombre d'éléments) → 1SPE-370, sur « Suites > Généralités sur les suites » ;
--   - 98c3f740 (accroissement constant) → 1SPE-214, sur « Suites > Suites arithmétiques » ;
--   - b6753dff (taux constant) → 1SPE-217, sur « Suites > Suites géométriques » ;
--   - bd27e002 (arithmétique et affine) → 1SPE-372, sur « Suites > Suites arithmétiques » ;
-- Chaque modèle va sur le nœud de son point (sous-notion : question_template_points_check_rules
-- refuse un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-01 (journal docs/wip/questions-1spe-progress.md § 20, D26). Les
-- modèles ont été créés en brouillon le 2026-11-01 par scripts/create-questions.ts (lancé par
-- David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (10 modèles). Elle est prouvée par
-- tests/integration/questions-1spe-suites-rangement-tags.test.ts, qui fabrique des copies des
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
--                ('05edc72b-5253-454c-91d6-b001fa50e12c'::uuid),
--                ('22141fa4-f1b9-43d8-88c2-ff2637d0a8a1'::uuid),
--                ('41100a51-0ca9-436e-9d90-13ff62f01331'::uuid),
--                ('45da9678-f16d-4168-9e19-aefcd4197edb'::uuid),
--                ('4a51f887-48be-4eda-a58e-00ae529c15a1'::uuid),
--                ('81322162-3f57-46ab-b4c9-dd45c14f0b18'::uuid),
--                ('89594aa7-17b2-45cb-9991-0483d311796f'::uuid),
--                ('98c3f740-1fae-440f-a5d1-142a85029a36'::uuid),
--                ('b6753dff-47c1-40c6-8001-aebdf1e436d0'::uuid),
--                ('bd27e002-ca19-444e-948b-f8ed4fc8bbb5'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('05edc72b-5253-454c-91d6-b001fa50e12c'::uuid, '1SPE-222'),
-- 	('22141fa4-f1b9-43d8-88c2-ff2637d0a8a1'::uuid, '1SPE-374'),
-- 	('41100a51-0ca9-436e-9d90-13ff62f01331'::uuid, '1SPE-376'),
-- 	('45da9678-f16d-4168-9e19-aefcd4197edb'::uuid, '1SPE-375'),
-- 	('4a51f887-48be-4eda-a58e-00ae529c15a1'::uuid, '1SPE-378'),
-- 	('81322162-3f57-46ab-b4c9-dd45c14f0b18'::uuid, '1SPE-369'),
-- 	('89594aa7-17b2-45cb-9991-0483d311796f'::uuid, '1SPE-370'),
-- 	('98c3f740-1fae-440f-a5d1-142a85029a36'::uuid, '1SPE-214'),
-- 	('b6753dff-47c1-40c6-8001-aebdf1e436d0'::uuid, '1SPE-217'),
-- 	('bd27e002-ca19-444e-948b-f8ed4fc8bbb5'::uuid, '1SPE-372')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '1_SPE' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '05edc72b-5253-454c-91d6-b001fa50e12c',
--               '22141fa4-f1b9-43d8-88c2-ff2637d0a8a1',
--               '41100a51-0ca9-436e-9d90-13ff62f01331',
--               '45da9678-f16d-4168-9e19-aefcd4197edb',
--               '4a51f887-48be-4eda-a58e-00ae529c15a1',
--               '81322162-3f57-46ab-b4c9-dd45c14f0b18',
--               '89594aa7-17b2-45cb-9991-0483d311796f',
--               '98c3f740-1fae-440f-a5d1-142a85029a36',
--               'b6753dff-47c1-40c6-8001-aebdf1e436d0',
--               'bd27e002-ca19-444e-948b-f8ed4fc8bbb5');
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
	('05edc72b-5253-454c-91d6-b001fa50e12c', 'Suites', 'Généralités sur les suites', 'explicite ou par récurrence', '1SPE-222'),
	('22141fa4-f1b9-43d8-88c2-ff2637d0a8a1', 'Fonctions', 'Fonction exponentielle', 'croissance et décroissance exponentielles', '1SPE-374'),
	('41100a51-0ca9-436e-9d90-13ff62f01331', 'Suites', 'Généralités sur les suites', 'explicite ou par récurrence', '1SPE-376'),
	('45da9678-f16d-4168-9e19-aefcd4197edb', 'Suites', 'Généralités sur les suites', 'explicite ou par récurrence', '1SPE-375'),
	('4a51f887-48be-4eda-a58e-00ae529c15a1', 'Suites', 'Généralités sur les suites', 'explicite ou par récurrence', '1SPE-378'),
	('81322162-3f57-46ab-b4c9-dd45c14f0b18', 'Suites', 'Généralités sur les suites', null, '1SPE-369'),
	('89594aa7-17b2-45cb-9991-0483d311796f', 'Suites', 'Généralités sur les suites', null, '1SPE-370'),
	('98c3f740-1fae-440f-a5d1-142a85029a36', 'Suites', 'Suites arithmétiques', null, '1SPE-214'),
	('b6753dff-47c1-40c6-8001-aebdf1e436d0', 'Suites', 'Suites géométriques', null, '1SPE-217'),
	('bd27e002-ca19-444e-948b-f8ed4fc8bbb5', 'Suites', 'Suites arithmétiques', null, '1SPE-372');

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
