-- ============================================================================
-- Chantier « questions-ttechno », lot 7 (séries statistiques à deux variables : changement de
-- variable, ajustement, somme des carrés des écarts) : nœud et tag de 6 modèles neufs
-- ============================================================================
--   - 50bf587d (D1, quel changement de variable redresse le nuage) → TTECHNO-050 ;
--   - 007822c5 (D2, représenter le nuage transformé) → TTECHNO-052 ;
--   - 68ee10e5 (D3, conjecturer une relation linéaire) → TTECHNO-088 ;
--   - 80850db7 (D4, ajustement après changement de variable) → TTECHNO-051 ;
--   - f88cc70d (D5, somme des carrés des écarts) → TTECHNO-053 ;
--   - 43f1fd84 (D6, couple (a ; b) qui minimise) → TTECHNO-054 ;
-- Nœuds (relevé MCP du 2026-11-19, journal § 49) : 050, 051, 052 et 088 sur « Statistiques >
-- Statistique à deux variables > changement de variable » (aed5064f) ; 053 et 054 sur
-- « Statistiques > Statistique à deux variables > ajustement affine » (61aaeaa9).
-- Chaque modèle va sur le NŒUD de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point ou de sa notion), et porte UN point (ADR 0020 : au plus un point par
-- programme). Ni le contenu, ni les niveaux (écrits à la création : `T_TECHNO`), ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ. Gabarit : lot 6 (20261119060317).
-- ============================================================================
-- Décision de David le 2026-11-19 (journal docs/wip/questions-ttechno-progress.md § 49, Q32–Q35 ;
-- § 50 : écriture). Les modèles ont été créés en brouillon le 2026-11-19 par
-- scripts/create-questions.ts (scripts/questions/ttechno-7-deux-variables/, lancé par David après
-- le merge de #2874), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée par
-- tests/integration/questions-ttechno-lot7-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-19),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-11-19 AVANT le SQL,
-- tranchée par lui le 2026-11-19, § 49 : personne pour les brouillons, Tle techno à la
-- publication). Aucune règle ne change. Effet visible : les 6 brouillons apparaissent sous leur
-- nœud et sous leur point dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--  from (values ('50bf587d-30e5-42c5-a214-cf0b69895bea'::uuid),
--               ('007822c5-baf3-49d7-afcc-40fad51bc13c'::uuid),
--               ('68ee10e5-d587-493e-b2cb-75b0e124708b'::uuid),
--               ('80850db7-d658-4789-b273-bb73635e245d'::uuid),
--               ('f88cc70d-a12d-4481-8943-f0532fabd647'::uuid),
--               ('43f1fd84-e598-416a-9df0-1fbeda3ffeba'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('50bf587d-30e5-42c5-a214-cf0b69895bea'::uuid, 'TTECHNO-050'),
-- 	('007822c5-baf3-49d7-afcc-40fad51bc13c'::uuid, 'TTECHNO-052'),
-- 	('68ee10e5-d587-493e-b2cb-75b0e124708b'::uuid, 'TTECHNO-088'),
-- 	('80850db7-d658-4789-b273-bb73635e245d'::uuid, 'TTECHNO-051'),
-- 	('f88cc70d-a12d-4481-8943-f0532fabd647'::uuid, 'TTECHNO-053'),
-- 	('43f1fd84-e598-416a-9df0-1fbeda3ffeba'::uuid, 'TTECHNO-054')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'T_TECHNO' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('50bf587d-30e5-42c5-a214-cf0b69895bea',
--               '007822c5-baf3-49d7-afcc-40fad51bc13c',
--               '68ee10e5-d587-493e-b2cb-75b0e124708b',
--               '80850db7-d658-4789-b273-bb73635e245d',
--               'f88cc70d-a12d-4481-8943-f0532fabd647',
--               '43f1fd84-e598-416a-9df0-1fbeda3ffeba');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qtt7_modeles;
create temporary table _qtt7_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qtt7_modeles values
	('50bf587d-30e5-42c5-a214-cf0b69895bea', 'Statistiques', 'Statistique à deux variables', 'changement de variable', 'TTECHNO-050'),
	('007822c5-baf3-49d7-afcc-40fad51bc13c', 'Statistiques', 'Statistique à deux variables', 'changement de variable', 'TTECHNO-052'),
	('68ee10e5-d587-493e-b2cb-75b0e124708b', 'Statistiques', 'Statistique à deux variables', 'changement de variable', 'TTECHNO-088'),
	('80850db7-d658-4789-b273-bb73635e245d', 'Statistiques', 'Statistique à deux variables', 'changement de variable', 'TTECHNO-051'),
	('f88cc70d-a12d-4481-8943-f0532fabd647', 'Statistiques', 'Statistique à deux variables', 'ajustement affine', 'TTECHNO-053'),
	('43f1fd84-e598-416a-9df0-1fbeda3ffeba', 'Statistiques', 'Statistique à deux variables', 'ajustement affine', 'TTECHNO-054');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qtt7_modeles order by id;
select 1 from public.question_templates where id in (select id from _qtt7_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qtt7_modeles add column noeud uuid, add column point_id uuid;
update _qtt7_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qtt7_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qtt7_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'T_TECHNO' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qtt7_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qtt7_modeles where noeud is null),
			(select count(*) from _qtt7_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qtt7_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	select count(*) into v_ranges from _qtt7_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qtt7_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qtt7_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qtt7_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qtt7_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qtt7_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qtt7_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qtt7_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qtt7_modeles;
