-- ============================================================================
-- Chantier « questions-ttechno », lot 8 (loi binomiale) : nœud et tag de 7 modèles neufs
-- ============================================================================
--   - 9fa1b0e9 (B1, la loi binomiale B(n ; p) : ce que compte X) → TTECHNO-057 ;
--   - 98ce1795 (B2, triangle de Pascal : compléter une ligne) → TTECHNO-060 ;
--   - 04e65a91 (B3, coefficients binomiaux au triangle) → TTECHNO-061 ;
--   - bacd052e (B4, diagramme en bâtons) → TTECHNO-067 ;
--   - ae383e7c (B5, simulation d'échantillons) → TTECHNO-090 ;
--   - 82a0e909 (B6, représenter l'espérance quand n ou p varie) → TTECHNO-069 ;
--   - 8ad50484 (B7, espérance : le lien avec np) → TTECHNO-091 ;
-- Nœuds (relevé MCP du 2026-11-19, journal § 54) : 057, 067 et 090 sur la NOTION « Probabilités >
-- Loi binomiale » (7f0932c3, nœud de ces trois points) ; 060 sur « Dénombrement > Combinaisons >
-- triangle de Pascal » (d78d5a6b) ; 061 sur « Dénombrement > Combinaisons > coefficients binomiaux »
-- (49cafc5f) ; 069 et 091 sur « Probabilités > Loi binomiale > espérance et variance » (aa1217ed).
-- Chaque modèle va sur le NŒUD de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point ou de sa notion), et porte UN point (ADR 0020 : au plus un point par
-- programme). Ni le contenu, ni les niveaux (écrits à la création : `T_TECHNO`), ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ. Gabarit : lot 7 (20261119100631).
-- ============================================================================
-- Décision de David le 2026-11-19 (journal docs/wip/questions-ttechno-progress.md § 54, Q36–Q40 ;
-- § 55 : écriture). Les modèles ont été créés en brouillon le 2026-11-19 par
-- scripts/create-questions.ts (scripts/questions/ttechno-8-loi-binomiale/, lancé par David après
-- le merge de #2882), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-ttechno-lot8-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-19),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-11-19 AVANT le SQL,
-- tranchée par lui le 2026-11-19, § 54 : personne pour les brouillons, Tle techno à la
-- publication). Aucune règle ne change. Effet visible : les 7 brouillons apparaissent sous leur
-- nœud et sous leur point dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--  from (values ('9fa1b0e9-82b4-487d-a97b-cc7c16d29a76'::uuid),
--               ('98ce1795-1cb6-4116-87d1-7ee062e0c2bb'::uuid),
--               ('04e65a91-c47e-4aa9-a92f-aa652e03adbb'::uuid),
--               ('bacd052e-9780-4f1d-9f6a-2e97733168a9'::uuid),
--               ('ae383e7c-937d-44e8-bf19-280ebf98be6e'::uuid),
--               ('82a0e909-3b31-46b8-9b5b-136bb7342b9b'::uuid),
--               ('8ad50484-b694-4109-8e4b-183bb7dbdf91'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('9fa1b0e9-82b4-487d-a97b-cc7c16d29a76'::uuid, 'TTECHNO-057'),
-- 	('98ce1795-1cb6-4116-87d1-7ee062e0c2bb'::uuid, 'TTECHNO-060'),
-- 	('04e65a91-c47e-4aa9-a92f-aa652e03adbb'::uuid, 'TTECHNO-061'),
-- 	('bacd052e-9780-4f1d-9f6a-2e97733168a9'::uuid, 'TTECHNO-067'),
-- 	('ae383e7c-937d-44e8-bf19-280ebf98be6e'::uuid, 'TTECHNO-090'),
-- 	('82a0e909-3b31-46b8-9b5b-136bb7342b9b'::uuid, 'TTECHNO-069'),
-- 	('8ad50484-b694-4109-8e4b-183bb7dbdf91'::uuid, 'TTECHNO-091')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'T_TECHNO' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('9fa1b0e9-82b4-487d-a97b-cc7c16d29a76',
--               '98ce1795-1cb6-4116-87d1-7ee062e0c2bb',
--               '04e65a91-c47e-4aa9-a92f-aa652e03adbb',
--               'bacd052e-9780-4f1d-9f6a-2e97733168a9',
--               'ae383e7c-937d-44e8-bf19-280ebf98be6e',
--               '82a0e909-3b31-46b8-9b5b-136bb7342b9b',
--               '8ad50484-b694-4109-8e4b-183bb7dbdf91');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qtt8_modeles;
create temporary table _qtt8_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qtt8_modeles values
	('9fa1b0e9-82b4-487d-a97b-cc7c16d29a76', 'Probabilités', 'Loi binomiale', null, 'TTECHNO-057'),
	('98ce1795-1cb6-4116-87d1-7ee062e0c2bb', 'Dénombrement', 'Combinaisons', 'triangle de Pascal', 'TTECHNO-060'),
	('04e65a91-c47e-4aa9-a92f-aa652e03adbb', 'Dénombrement', 'Combinaisons', 'coefficients binomiaux', 'TTECHNO-061'),
	('bacd052e-9780-4f1d-9f6a-2e97733168a9', 'Probabilités', 'Loi binomiale', null, 'TTECHNO-067'),
	('ae383e7c-937d-44e8-bf19-280ebf98be6e', 'Probabilités', 'Loi binomiale', null, 'TTECHNO-090'),
	('82a0e909-3b31-46b8-9b5b-136bb7342b9b', 'Probabilités', 'Loi binomiale', 'espérance et variance', 'TTECHNO-069'),
	('8ad50484-b694-4109-8e4b-183bb7dbdf91', 'Probabilités', 'Loi binomiale', 'espérance et variance', 'TTECHNO-091');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qtt8_modeles order by id;
select 1 from public.question_templates where id in (select id from _qtt8_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qtt8_modeles add column noeud uuid, add column point_id uuid;
update _qtt8_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qtt8_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qtt8_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'T_TECHNO' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qtt8_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qtt8_modeles where noeud is null),
			(select count(*) from _qtt8_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qtt8_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
	end if;
	select count(*) into v_ranges from _qtt8_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qtt8_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qtt8_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qtt8_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qtt8_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qtt8_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qtt8_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qtt8_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qtt8_modeles;
