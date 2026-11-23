-- ============================================================================
-- Chantier « questions-2de », lot 8 (statistiques, information chiffrée) : nœud et tag de 22 modèles neufs
-- ============================================================================
--   - 03d8f171 (moyenne des moyennes de classes) → 2-380, sur « Statistiques > Indicateurs > moyenne » ;
--   - 11f91d46 (pourcentage d'un pourcentage) → 2-364, sur « Proportionnalité > Pourcentages > calculs de pourcentages » ;
--   - 2dec310f (coefficients successifs) → 2-368, sur « Proportionnalité > Évolutions > évolutions successives et réciproque » ;
--   - 39b4823d (le tout connaissant une partie) → 2-490, sur « Proportionnalité > Pourcentages > calculs de pourcentages » ;
--   - 3c411c3b (médiane après ajout ou retrait) → 2-479, sur « Statistiques > Indicateurs > médiane » ;
--   - 5b3bef9f (effectifs, proportions, pourcentages) → 2-375, sur « Statistiques > Représenter des données > effectifs et fréquences » ;
--   - 6b2b7055 (comparer : médiane et écart interquartile) → 2-483, sur « Statistiques > Indicateurs » ;
--   - 7a56029d (polygone des fréquences cumulées) → 2-480, sur « Statistiques > Représenter des données » ;
--   - 7a763528 (coefficient réciproque) → 2-478, sur « Proportionnalité > Évolutions > évolutions successives et réciproque » ;
--   - 7ca1d2da (lire un histogramme) → 2-372, sur « Statistiques > Représenter des données » ;
--   - 82ba1365 (interpréter un quartile) → 2-402, sur « Statistiques > Indicateurs > quartiles » ;
--   - 893eb3cd (comparer : moyenne et écart type) → 2-382, sur « Statistiques > Indicateurs » ;
--   - 8d94fd69 (médiane estimée) → 2-482, sur « Statistiques > Indicateurs > médiane » ;
--   - 90e2e7d8 (moyenne par les centres) → 2-481, sur « Statistiques > Indicateurs > moyenne » ;
--   - a4de4154 (moyenne après ajout ou retrait) → 2-371, sur « Statistiques > Indicateurs > moyenne » ;
--   - afbfa8c6 (pourcentages de pourcentages, effectifs) → 2-376, sur « Proportionnalité > Pourcentages > calculs de pourcentages » ;
--   - b73677c8 (comparer deux boîtes à moustaches) → 2-484, sur « Statistiques > Indicateurs » ;
--   - b7c71958 (classe médiane) → 2-381, sur « Statistiques > Indicateurs > médiane » ;
--   - ba0925ce (linéarité de la moyenne) → 2-369, sur « Statistiques > Indicateurs > moyenne » ;
--   - cc88ebd3 (images lues sur une courbe) → 2-491, sur « Fonctions > Généralités sur les fonctions > images et antécédents » ;
--   - de146ac1 (variation absolue) → 2-365, sur « Proportionnalité > Évolutions > variations en pourcentage » ;
--   - ef92701a (écart type) → 2-370, sur « Statistiques > Indicateurs > écart-type » ;
-- Chaque modèle va sur le nœud de son point (notion ou sous-notion : question_template_points_check_rules
-- refuse un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- 2-372, 2-480, 2-382, 2-483 et 2-484 sont rangés sur leur NOTION (leur point n'a pas de
-- sous-notion). Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent :
-- `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-02 (journal docs/wip/questions-2de-progress.md § 51). Les modèles
-- ont été créés en brouillon le 2026-11-02 par scripts/create-questions.ts (lots 8 A, 8 B et 8 C,
-- lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (22 modèles). Elle est prouvée par
-- tests/integration/questions-2de-statistiques-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-02),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David en phase 0 du lot 8, AVANT
-- le SQL, tranchée par lui le 2026-11-02 : personne). Aucune règle ne change. Effet visible : les
-- 22 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les
-- voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 22 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('03d8f171-09b1-43e3-987d-1c19f963372b'::uuid),
--                ('11f91d46-82c7-4dca-8812-e85b7bd93ae2'::uuid),
--                ('2dec310f-86f4-4fc3-9c74-656ed4ac1299'::uuid),
--                ('39b4823d-0241-408b-b04e-1fb6620b1951'::uuid),
--                ('3c411c3b-354b-4e66-91ce-64c6308860e0'::uuid),
--                ('5b3bef9f-f2b0-49e0-8b15-9ef7d19c9c4b'::uuid),
--                ('6b2b7055-f935-4481-98b2-f0704be3a0f3'::uuid),
--                ('7a56029d-3c3b-4dcd-a7fc-c94912d9d80f'::uuid),
--                ('7a763528-d666-4d02-95ed-7fff218b9b7b'::uuid),
--                ('7ca1d2da-5519-4968-b903-5003ed4b1502'::uuid),
--                ('82ba1365-0c8f-4d04-bce2-4c314748e291'::uuid),
--                ('893eb3cd-4c8e-4957-b739-844bcb4caaa7'::uuid),
--                ('8d94fd69-4375-4773-8eef-63f59f05a0ce'::uuid),
--                ('90e2e7d8-4c6a-4ce9-b870-79e300381d14'::uuid),
--                ('a4de4154-a681-48b9-802a-f5f1b9df6fb9'::uuid),
--                ('afbfa8c6-ad87-40ed-83e9-2e29cec24480'::uuid),
--                ('b73677c8-0bb9-4e8d-af79-3a45d30a6a11'::uuid),
--                ('b7c71958-5d88-4828-87d7-5a4964fcb1d1'::uuid),
--                ('ba0925ce-e338-4a87-91f5-270c55329e0b'::uuid),
--                ('cc88ebd3-411a-4a86-80f9-084b9840f863'::uuid),
--                ('de146ac1-f0fb-413c-996e-3132a1f02f7e'::uuid),
--                ('ef92701a-a752-42b5-9873-7aa9f2035166'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('03d8f171-09b1-43e3-987d-1c19f963372b'::uuid, '2-380'),
-- 	('11f91d46-82c7-4dca-8812-e85b7bd93ae2'::uuid, '2-364'),
-- 	('2dec310f-86f4-4fc3-9c74-656ed4ac1299'::uuid, '2-368'),
-- 	('39b4823d-0241-408b-b04e-1fb6620b1951'::uuid, '2-490'),
-- 	('3c411c3b-354b-4e66-91ce-64c6308860e0'::uuid, '2-479'),
-- 	('5b3bef9f-f2b0-49e0-8b15-9ef7d19c9c4b'::uuid, '2-375'),
-- 	('6b2b7055-f935-4481-98b2-f0704be3a0f3'::uuid, '2-483'),
-- 	('7a56029d-3c3b-4dcd-a7fc-c94912d9d80f'::uuid, '2-480'),
-- 	('7a763528-d666-4d02-95ed-7fff218b9b7b'::uuid, '2-478'),
-- 	('7ca1d2da-5519-4968-b903-5003ed4b1502'::uuid, '2-372'),
-- 	('82ba1365-0c8f-4d04-bce2-4c314748e291'::uuid, '2-402'),
-- 	('893eb3cd-4c8e-4957-b739-844bcb4caaa7'::uuid, '2-382'),
-- 	('8d94fd69-4375-4773-8eef-63f59f05a0ce'::uuid, '2-482'),
-- 	('90e2e7d8-4c6a-4ce9-b870-79e300381d14'::uuid, '2-481'),
-- 	('a4de4154-a681-48b9-802a-f5f1b9df6fb9'::uuid, '2-371'),
-- 	('afbfa8c6-ad87-40ed-83e9-2e29cec24480'::uuid, '2-376'),
-- 	('b73677c8-0bb9-4e8d-af79-3a45d30a6a11'::uuid, '2-484'),
-- 	('b7c71958-5d88-4828-87d7-5a4964fcb1d1'::uuid, '2-381'),
-- 	('ba0925ce-e338-4a87-91f5-270c55329e0b'::uuid, '2-369'),
-- 	('cc88ebd3-411a-4a86-80f9-084b9840f863'::uuid, '2-491'),
-- 	('de146ac1-f0fb-413c-996e-3132a1f02f7e'::uuid, '2-365'),
-- 	('ef92701a-a752-42b5-9873-7aa9f2035166'::uuid, '2-370')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '03d8f171-09b1-43e3-987d-1c19f963372b',
--               '11f91d46-82c7-4dca-8812-e85b7bd93ae2',
--               '2dec310f-86f4-4fc3-9c74-656ed4ac1299',
--               '39b4823d-0241-408b-b04e-1fb6620b1951',
--               '3c411c3b-354b-4e66-91ce-64c6308860e0',
--               '5b3bef9f-f2b0-49e0-8b15-9ef7d19c9c4b',
--               '6b2b7055-f935-4481-98b2-f0704be3a0f3',
--               '7a56029d-3c3b-4dcd-a7fc-c94912d9d80f',
--               '7a763528-d666-4d02-95ed-7fff218b9b7b',
--               '7ca1d2da-5519-4968-b903-5003ed4b1502',
--               '82ba1365-0c8f-4d04-bce2-4c314748e291',
--               '893eb3cd-4c8e-4957-b739-844bcb4caaa7',
--               '8d94fd69-4375-4773-8eef-63f59f05a0ce',
--               '90e2e7d8-4c6a-4ce9-b870-79e300381d14',
--               'a4de4154-a681-48b9-802a-f5f1b9df6fb9',
--               'afbfa8c6-ad87-40ed-83e9-2e29cec24480',
--               'b73677c8-0bb9-4e8d-af79-3a45d30a6a11',
--               'b7c71958-5d88-4828-87d7-5a4964fcb1d1',
--               'ba0925ce-e338-4a87-91f5-270c55329e0b',
--               'cc88ebd3-411a-4a86-80f9-084b9840f863',
--               'de146ac1-f0fb-413c-996e-3132a1f02f7e',
--               'ef92701a-a752-42b5-9873-7aa9f2035166');
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
	('03d8f171-09b1-43e3-987d-1c19f963372b', 'Statistiques', 'Indicateurs', 'moyenne', '2-380'),
	('11f91d46-82c7-4dca-8812-e85b7bd93ae2', 'Proportionnalité', 'Pourcentages', 'calculs de pourcentages', '2-364'),
	('2dec310f-86f4-4fc3-9c74-656ed4ac1299', 'Proportionnalité', 'Évolutions', 'évolutions successives et réciproque', '2-368'),
	('39b4823d-0241-408b-b04e-1fb6620b1951', 'Proportionnalité', 'Pourcentages', 'calculs de pourcentages', '2-490'),
	('3c411c3b-354b-4e66-91ce-64c6308860e0', 'Statistiques', 'Indicateurs', 'médiane', '2-479'),
	('5b3bef9f-f2b0-49e0-8b15-9ef7d19c9c4b', 'Statistiques', 'Représenter des données', 'effectifs et fréquences', '2-375'),
	('6b2b7055-f935-4481-98b2-f0704be3a0f3', 'Statistiques', 'Indicateurs', null, '2-483'),
	('7a56029d-3c3b-4dcd-a7fc-c94912d9d80f', 'Statistiques', 'Représenter des données', null, '2-480'),
	('7a763528-d666-4d02-95ed-7fff218b9b7b', 'Proportionnalité', 'Évolutions', 'évolutions successives et réciproque', '2-478'),
	('7ca1d2da-5519-4968-b903-5003ed4b1502', 'Statistiques', 'Représenter des données', null, '2-372'),
	('82ba1365-0c8f-4d04-bce2-4c314748e291', 'Statistiques', 'Indicateurs', 'quartiles', '2-402'),
	('893eb3cd-4c8e-4957-b739-844bcb4caaa7', 'Statistiques', 'Indicateurs', null, '2-382'),
	('8d94fd69-4375-4773-8eef-63f59f05a0ce', 'Statistiques', 'Indicateurs', 'médiane', '2-482'),
	('90e2e7d8-4c6a-4ce9-b870-79e300381d14', 'Statistiques', 'Indicateurs', 'moyenne', '2-481'),
	('a4de4154-a681-48b9-802a-f5f1b9df6fb9', 'Statistiques', 'Indicateurs', 'moyenne', '2-371'),
	('afbfa8c6-ad87-40ed-83e9-2e29cec24480', 'Proportionnalité', 'Pourcentages', 'calculs de pourcentages', '2-376'),
	('b73677c8-0bb9-4e8d-af79-3a45d30a6a11', 'Statistiques', 'Indicateurs', null, '2-484'),
	('b7c71958-5d88-4828-87d7-5a4964fcb1d1', 'Statistiques', 'Indicateurs', 'médiane', '2-381'),
	('ba0925ce-e338-4a87-91f5-270c55329e0b', 'Statistiques', 'Indicateurs', 'moyenne', '2-369'),
	('cc88ebd3-411a-4a86-80f9-084b9840f863', 'Fonctions', 'Généralités sur les fonctions', 'images et antécédents', '2-491'),
	('de146ac1-f0fb-413c-996e-3132a1f02f7e', 'Proportionnalité', 'Évolutions', 'variations en pourcentage', '2-365'),
	('ef92701a-a752-42b5-9873-7aa9f2035166', 'Statistiques', 'Indicateurs', 'écart-type', '2-370');

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
	if v_presents not in (0, 22) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 22', v_presents;
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
