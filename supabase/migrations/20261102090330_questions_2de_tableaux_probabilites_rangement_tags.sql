-- ============================================================================
-- Chantier « questions-2de », lot 8 bis (tableaux croisés, probabilités) : nœud et tag de 14 modèles neufs
-- ============================================================================
--   - 23ceafb0 (construire un tableau croisé d'effectifs) → 2-394, sur « Probabilités > Probabilités conditionnelles > tableaux croisés » ;
--   - 31096bae (traduire en notations) → 2-395, sur « Probabilités > Probabilités conditionnelles » ;
--   - 38fe4cd5 (arbre de deux épreuves) → 2-391, sur « Probabilités > Probabilités conditionnelles > arbres pondérés » ;
--   - 62105594 (calculer une fréquence marginale) → 2-486, sur « Statistiques > Tableaux croisés > fréquences marginales et conditionnelles » ;
--   - 7953dcfc (loi des grands nombres) → 2-389, sur « Statistiques > Échantillonnage > fluctuation » ;
--   - 89e928a4 (compléter par les effectifs) → 2-386, sur « Statistiques > Tableaux croisés > tableau croisé d'effectifs » ;
--   - 94b22887 (faux positifs) → 2-400, sur « Probabilités > Probabilités conditionnelles > inversion du conditionnement » ;
--   - b28f4a68 (construire un arbre pondéré) → 2-393, sur « Probabilités > Probabilités conditionnelles > arbres pondérés » ;
--   - b6ab5599 (compléter avec une fréquence conditionnelle) → 2-487, sur « Statistiques > Tableaux croisés > tableau croisé d'effectifs » ;
--   - ba16b4f4 (fréquence conditionnelle, notion) → 2-384, sur « Statistiques > Tableaux croisés > fréquences marginales et conditionnelles » ;
--   - d64946e4 (fréquence marginale, notion) → 2-485, sur « Statistiques > Tableaux croisés > fréquences marginales et conditionnelles » ;
--   - d7507e78 (probabilité conditionnelle sur un arbre) → 2-397, sur « Probabilités > Probabilités conditionnelles > arbres pondérés » ;
--   - eb0dcd85 (lire un tableau croisé) → 2-383, sur « Statistiques > Tableaux croisés > tableau croisé d'effectifs » ;
--   - ed96107e (calculer une fréquence conditionnelle) → 2-385, sur « Statistiques > Tableaux croisés > fréquences marginales et conditionnelles » ;
-- Chaque modèle va sur le nœud de son point (notion ou sous-notion : question_template_points_check_rules
-- refuse un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- 2-395 est rangé sur sa NOTION (son point n'a pas de sous-notion). Ni le contenu, ni les niveaux
-- (écrits à la création), ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-02 (journal docs/wip/questions-2de-progress.md § 51). Les modèles
-- ont été créés en brouillon le 2026-11-02 par scripts/create-questions.ts (lots 8 D et 8 E,
-- lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (14 modèles). Elle est prouvée par
-- tests/integration/questions-2de-tableaux-probabilites-rangement-tags.test.ts, qui fabrique des copies des
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
-- 14 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les
-- voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 14 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('23ceafb0-61ea-4ce8-9e38-7a3e1f1a0dd1'::uuid),
--                ('31096bae-515c-40e9-8305-000c28258afb'::uuid),
--                ('38fe4cd5-90ad-446d-a2cc-936faa2dde13'::uuid),
--                ('62105594-17b0-4a0e-91e1-f5be360db13f'::uuid),
--                ('7953dcfc-bedc-465e-9abe-b8db19647d7e'::uuid),
--                ('89e928a4-e0bf-4ba7-a3b8-46ff8abae375'::uuid),
--                ('94b22887-26db-491d-aa5e-ca3f828eafb7'::uuid),
--                ('b28f4a68-de95-4437-9e5a-c423fce38ead'::uuid),
--                ('b6ab5599-6995-4eea-9701-cde577c43541'::uuid),
--                ('ba16b4f4-65d2-4850-8a9c-2b543f8cb379'::uuid),
--                ('d64946e4-9383-484b-a9e8-41c9d8e208c3'::uuid),
--                ('d7507e78-4041-441a-82fc-40de926f92cc'::uuid),
--                ('eb0dcd85-af63-442c-9bf4-3848b15891ea'::uuid),
--                ('ed96107e-a0ba-49a2-afad-e5c75d5c4c3e'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('23ceafb0-61ea-4ce8-9e38-7a3e1f1a0dd1'::uuid, '2-394'),
-- 	('31096bae-515c-40e9-8305-000c28258afb'::uuid, '2-395'),
-- 	('38fe4cd5-90ad-446d-a2cc-936faa2dde13'::uuid, '2-391'),
-- 	('62105594-17b0-4a0e-91e1-f5be360db13f'::uuid, '2-486'),
-- 	('7953dcfc-bedc-465e-9abe-b8db19647d7e'::uuid, '2-389'),
-- 	('89e928a4-e0bf-4ba7-a3b8-46ff8abae375'::uuid, '2-386'),
-- 	('94b22887-26db-491d-aa5e-ca3f828eafb7'::uuid, '2-400'),
-- 	('b28f4a68-de95-4437-9e5a-c423fce38ead'::uuid, '2-393'),
-- 	('b6ab5599-6995-4eea-9701-cde577c43541'::uuid, '2-487'),
-- 	('ba16b4f4-65d2-4850-8a9c-2b543f8cb379'::uuid, '2-384'),
-- 	('d64946e4-9383-484b-a9e8-41c9d8e208c3'::uuid, '2-485'),
-- 	('d7507e78-4041-441a-82fc-40de926f92cc'::uuid, '2-397'),
-- 	('eb0dcd85-af63-442c-9bf4-3848b15891ea'::uuid, '2-383'),
-- 	('ed96107e-a0ba-49a2-afad-e5c75d5c4c3e'::uuid, '2-385')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '23ceafb0-61ea-4ce8-9e38-7a3e1f1a0dd1',
--               '31096bae-515c-40e9-8305-000c28258afb',
--               '38fe4cd5-90ad-446d-a2cc-936faa2dde13',
--               '62105594-17b0-4a0e-91e1-f5be360db13f',
--               '7953dcfc-bedc-465e-9abe-b8db19647d7e',
--               '89e928a4-e0bf-4ba7-a3b8-46ff8abae375',
--               '94b22887-26db-491d-aa5e-ca3f828eafb7',
--               'b28f4a68-de95-4437-9e5a-c423fce38ead',
--               'b6ab5599-6995-4eea-9701-cde577c43541',
--               'ba16b4f4-65d2-4850-8a9c-2b543f8cb379',
--               'd64946e4-9383-484b-a9e8-41c9d8e208c3',
--               'd7507e78-4041-441a-82fc-40de926f92cc',
--               'eb0dcd85-af63-442c-9bf4-3848b15891ea',
--               'ed96107e-a0ba-49a2-afad-e5c75d5c4c3e');
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
	('23ceafb0-61ea-4ce8-9e38-7a3e1f1a0dd1', 'Probabilités', 'Probabilités conditionnelles', 'tableaux croisés', '2-394'),
	('31096bae-515c-40e9-8305-000c28258afb', 'Probabilités', 'Probabilités conditionnelles', null, '2-395'),
	('38fe4cd5-90ad-446d-a2cc-936faa2dde13', 'Probabilités', 'Probabilités conditionnelles', 'arbres pondérés', '2-391'),
	('62105594-17b0-4a0e-91e1-f5be360db13f', 'Statistiques', 'Tableaux croisés', 'fréquences marginales et conditionnelles', '2-486'),
	('7953dcfc-bedc-465e-9abe-b8db19647d7e', 'Statistiques', 'Échantillonnage', 'fluctuation', '2-389'),
	('89e928a4-e0bf-4ba7-a3b8-46ff8abae375', 'Statistiques', 'Tableaux croisés', 'tableau croisé d''effectifs', '2-386'),
	('94b22887-26db-491d-aa5e-ca3f828eafb7', 'Probabilités', 'Probabilités conditionnelles', 'inversion du conditionnement', '2-400'),
	('b28f4a68-de95-4437-9e5a-c423fce38ead', 'Probabilités', 'Probabilités conditionnelles', 'arbres pondérés', '2-393'),
	('b6ab5599-6995-4eea-9701-cde577c43541', 'Statistiques', 'Tableaux croisés', 'tableau croisé d''effectifs', '2-487'),
	('ba16b4f4-65d2-4850-8a9c-2b543f8cb379', 'Statistiques', 'Tableaux croisés', 'fréquences marginales et conditionnelles', '2-384'),
	('d64946e4-9383-484b-a9e8-41c9d8e208c3', 'Statistiques', 'Tableaux croisés', 'fréquences marginales et conditionnelles', '2-485'),
	('d7507e78-4041-441a-82fc-40de926f92cc', 'Probabilités', 'Probabilités conditionnelles', 'arbres pondérés', '2-397'),
	('eb0dcd85-af63-442c-9bf4-3848b15891ea', 'Statistiques', 'Tableaux croisés', 'tableau croisé d''effectifs', '2-383'),
	('ed96107e-a0ba-49a2-afad-e5c75d5c4c3e', 'Statistiques', 'Tableaux croisés', 'fréquences marginales et conditionnelles', '2-385');

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
	if v_presents not in (0, 14) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 14', v_presents;
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
