-- ============================================================================
-- Chantier « questions-ce2 », lot 9 (longueurs, fraction de l'unité, masses) : nœud et tag de 8 modèles neufs
-- ============================================================================
--   - 0bba8ca0 (Mesurer avec une unité partagée en quarts ou en huitièmes) → CE2-012, sur « Nombres et calculs > Fractions : sens et écritures > droite graduée »;
--   - fdd29421 (Mesurer avec une unité partagée en dixièmes) → CE2-012, sur « Nombres et calculs > Fractions : sens et écritures > droite graduée »;
--   - 186a5d8d (Des longueurs de référence, du millimètre au kilomètre) → CE2-040, sur « Grandeurs et mesures > Longueurs > comparaison et mesure »;
--   - 6f6afa6c (Estimer une longueur ou une distance) → CE2-041, sur « Grandeurs et mesures > Longueurs > comparaison et mesure »;
--   - a43667e9 (Qu'est-ce que le périmètre ?) → CE2-042, sur « Grandeurs et mesures > Périmètres »;
--   - d840809a (Le périmètre d'un polygone, mesuré à la règle) → CE2-044, sur « Grandeurs et mesures > Périmètres »;
--   - adf913ca (Des masses de référence, du gramme à la tonne) → CE2-049, sur « Grandeurs et mesures > Masses > comparaison et mesure »;
--   - 404e82c9 (Estimer une masse) → CE2-050, sur « Grandeurs et mesures > Masses > comparaison et mesure »;
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-06 (journal docs/wip/questions-ce2-progress.md § 15). Les modèles
-- ont été créés en brouillon par scripts/create-questions.ts
-- (scripts/questions/ce2-9/, lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (8 modèles). Elle est prouvée par
-- tests/integration/questions-ce2-lot9-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- CE2-042 et CE2-044 sont posés par le programme sur la NOTION « Périmètres », qui a trois
-- sous-notions (carré, rectangle, disque ; relevé du 2026-11-06) : 05 et 06 y vont, sur la notion ;
-- garde : seules ces trois sous-notions sont admises.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-06, après la création),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-11-06 en phase 0 (§ 15), AVANT le SQL, tranchée par lui le 2026-11-06 : personne).
-- Aucune règle ne change. Effet visible : les 8 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 8 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--               ('0bba8ca0-179a-470c-8303-8f6b94086d15'::uuid),
--               ('fdd29421-22c9-49fb-b28c-76a3b6028056'::uuid),
--               ('186a5d8d-7e89-4e73-a44c-cec4aa397218'::uuid),
--               ('6f6afa6c-008b-4fcb-9611-2c7b572487c0'::uuid),
--               ('a43667e9-410c-4a75-8536-590ec613f256'::uuid),
--               ('d840809a-9867-4c05-8148-bc83f9c6c1d7'::uuid),
--               ('adf913ca-53c8-4070-a2eb-f72638c518c2'::uuid),
--               ('404e82c9-88fc-4b3b-9aa2-0bf6e78d6ae5'::uuid))
--  as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('0bba8ca0-179a-470c-8303-8f6b94086d15'::uuid, 'CE2-012'),
-- 	('fdd29421-22c9-49fb-b28c-76a3b6028056'::uuid, 'CE2-012'),
-- 	('186a5d8d-7e89-4e73-a44c-cec4aa397218'::uuid, 'CE2-040'),
-- 	('6f6afa6c-008b-4fcb-9611-2c7b572487c0'::uuid, 'CE2-041'),
-- 	('a43667e9-410c-4a75-8536-590ec613f256'::uuid, 'CE2-042'),
-- 	('d840809a-9867-4c05-8148-bc83f9c6c1d7'::uuid, 'CE2-044'),
-- 	('adf913ca-53c8-4070-a2eb-f72638c518c2'::uuid, 'CE2-049'),
-- 	('404e82c9-88fc-4b3b-9aa2-0bf6e78d6ae5'::uuid, 'CE2-050')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CE2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '0bba8ca0-179a-470c-8303-8f6b94086d15',
--               'fdd29421-22c9-49fb-b28c-76a3b6028056',
--               '186a5d8d-7e89-4e73-a44c-cec4aa397218',
--               '6f6afa6c-008b-4fcb-9611-2c7b572487c0',
--               'a43667e9-410c-4a75-8536-590ec613f256',
--               'd840809a-9867-4c05-8148-bc83f9c6c1d7',
--               'adf913ca-53c8-4070-a2eb-f72638c518c2',
--               '404e82c9-88fc-4b3b-9aa2-0bf6e78d6ae5');
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
	code text not null,
	-- sous-notions que la notion a le droit d'avoir quand le modèle va sur elle (relevé du 2026-11-06)
	sous_notions_admises text[]
);
insert into _qc_modeles values
	('0bba8ca0-179a-470c-8303-8f6b94086d15', 'Nombres et calculs', 'Fractions : sens et écritures', 'droite graduée', 'CE2-012', null),
	('fdd29421-22c9-49fb-b28c-76a3b6028056', 'Nombres et calculs', 'Fractions : sens et écritures', 'droite graduée', 'CE2-012', null),
	('186a5d8d-7e89-4e73-a44c-cec4aa397218', 'Grandeurs et mesures', 'Longueurs', 'comparaison et mesure', 'CE2-040', null),
	('6f6afa6c-008b-4fcb-9611-2c7b572487c0', 'Grandeurs et mesures', 'Longueurs', 'comparaison et mesure', 'CE2-041', null),
	('a43667e9-410c-4a75-8536-590ec613f256', 'Grandeurs et mesures', 'Périmètres', null, 'CE2-042', '{carré,rectangle,disque}'),
	('d840809a-9867-4c05-8148-bc83f9c6c1d7', 'Grandeurs et mesures', 'Périmètres', null, 'CE2-044', '{carré,rectangle,disque}'),
	('adf913ca-53c8-4070-a2eb-f72638c518c2', 'Grandeurs et mesures', 'Masses', 'comparaison et mesure', 'CE2-049', null),
	('404e82c9-88fc-4b3b-9aa2-0bf6e78d6ae5', 'Grandeurs et mesures', 'Masses', 'comparaison et mesure', 'CE2-050', null);

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
 where p.grade = 'CE2' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qc_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qc_modeles where noeud is null),
			(select count(*) from _qc_modeles where point_id is null);
	end if;
	if exists (select 1 from _qc_modeles r
	            join public.classification_nodes s on s.parent_id = r.noeud
	             and s.kind = 'subnotion' and s.archived_at is null
	           where r.sous_notion is null
	             and s.name <> all (coalesce(r.sous_notions_admises, '{}'))) then
		raise exception 'notion visée sans sous-notion, mais elle en a une non admise';
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qc_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 8) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 8', v_presents;
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
