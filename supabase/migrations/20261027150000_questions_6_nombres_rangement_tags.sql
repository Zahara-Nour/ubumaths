-- ============================================================================
-- Chantier « questions-6 », lot 2 « Nombres » : nœud et tag de 10 modèles neufs
-- ============================================================================
--   - 030e3554 (Encadrer un nombre décimal) → 6-113, sur « Nombres et calculs > Décimaux : numération > encadrement » ;
--   - 2c5bae8f (Liens entre les unités de numération) → 6-102, sur « Nombres et calculs > Décimaux : numération > décomposition » ;
--   - 2e982062 (Intercaler un nombre décimal) → 6-202, sur « Nombres et calculs > Décimaux : numération > encadrement » ;
--   - 36991abb (Arrondir un quotient, arrondir π) → 6-112, sur « Nombres et calculs > Décimaux : numération > arrondis et ordres de grandeur » ;
--   - 4bcbbaae (Le nombre de dizaines, de centièmes…) → 6-101, sur « Nombres et calculs > Entiers : numération > décomposition » ;
--   - 4d825d44 (Le chiffre d'un rang) → 6-101, sur « Nombres et calculs > Entiers : numération > décomposition » ;
--   - 8d7edbde (Grands nombres jusqu'aux milliards) → 6-103, sur « Nombres et calculs > Entiers : numération > écritures » ;
--   - a1b46489 (Comparer deux nombres décimaux) → 6-109, sur « Nombres et calculs > Décimaux : numération > ordre » ;
--   - d7781eed (Reconnaître un nombre décimal) → 6-104, sur « Nombres et calculs > Décimaux : numération » (notion : le point n’a pas de sous-notion) ;
--   - e75cb1a3 (Arrondir un nombre décimal) → 6-111, sur « Nombres et calculs > Décimaux : numération > arrondis et ordres de grandeur » ;
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point) : la sous-notion, ou la NOTION pour 6-104, qui n'a pas de sous-notion.
-- Chaque modèle porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-27 (journal docs/wip/questions-6-progress.md § 9). Les modèles ont
-- été créés en brouillon le 2026-10-27 par scripts/create-questions.ts (scripts/questions/6-nombres/,
-- lancé par David), qui ne pose ni nœud ni tag. Relevé de la prod (MCP, 2026-10-27) : 10 brouillons,
-- niveaux [6], sans nœud, sans tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (10 modèles). Elle est prouvée par
-- tests/integration/questions-6-nombres-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-27), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David en phase 0, tranchée par lui le 2026-10-27 : personne).
-- Aucune règle ne change. Effet visible : les 10 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 10 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('030e3554-0a49-4a22-9931-bebd2a8cb227'::uuid),
--                ('2c5bae8f-03e3-44c6-9dbd-6849c7177ceb'::uuid),
--                ('2e982062-0fc9-473f-8aa2-affaf55c567d'::uuid),
--                ('36991abb-b704-4c0f-9165-c5de5e18f70b'::uuid),
--                ('4bcbbaae-a01d-43c2-903c-1b365a438761'::uuid),
--                ('4d825d44-928a-4461-9df0-3b3c3fdc74fc'::uuid),
--                ('8d7edbde-d1d0-4a9d-bb6e-7e516ef1381d'::uuid),
--                ('a1b46489-4566-449e-a4e9-e1e144a0b11d'::uuid),
--                ('d7781eed-7930-4619-9b00-caade882a637'::uuid),
--                ('e75cb1a3-56f6-4498-b6bf-06e852b3252d'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('030e3554-0a49-4a22-9931-bebd2a8cb227'::uuid, '6-113'),
-- 	('2c5bae8f-03e3-44c6-9dbd-6849c7177ceb'::uuid, '6-102'),
-- 	('2e982062-0fc9-473f-8aa2-affaf55c567d'::uuid, '6-202'),
-- 	('36991abb-b704-4c0f-9165-c5de5e18f70b'::uuid, '6-112'),
-- 	('4bcbbaae-a01d-43c2-903c-1b365a438761'::uuid, '6-101'),
-- 	('4d825d44-928a-4461-9df0-3b3c3fdc74fc'::uuid, '6-101'),
-- 	('8d7edbde-d1d0-4a9d-bb6e-7e516ef1381d'::uuid, '6-103'),
-- 	('a1b46489-4566-449e-a4e9-e1e144a0b11d'::uuid, '6-109'),
-- 	('d7781eed-7930-4619-9b00-caade882a637'::uuid, '6-104'),
-- 	('e75cb1a3-56f6-4498-b6bf-06e852b3252d'::uuid, '6-111')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '6' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('030e3554-0a49-4a22-9931-bebd2a8cb227',
--               '2c5bae8f-03e3-44c6-9dbd-6849c7177ceb',
--               '2e982062-0fc9-473f-8aa2-affaf55c567d',
--               '36991abb-b704-4c0f-9165-c5de5e18f70b',
--               '4bcbbaae-a01d-43c2-903c-1b365a438761',
--               '4d825d44-928a-4461-9df0-3b3c3fdc74fc',
--               '8d7edbde-d1d0-4a9d-bb6e-7e516ef1381d',
--               'a1b46489-4566-449e-a4e9-e1e144a0b11d',
--               'd7781eed-7930-4619-9b00-caade882a637',
--               'e75cb1a3-56f6-4498-b6bf-06e852b3252d');
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
	('030e3554-0a49-4a22-9931-bebd2a8cb227', 'Nombres et calculs', 'Décimaux : numération', 'encadrement', '6-113'),
	('2c5bae8f-03e3-44c6-9dbd-6849c7177ceb', 'Nombres et calculs', 'Décimaux : numération', 'décomposition', '6-102'),
	('2e982062-0fc9-473f-8aa2-affaf55c567d', 'Nombres et calculs', 'Décimaux : numération', 'encadrement', '6-202'),
	('36991abb-b704-4c0f-9165-c5de5e18f70b', 'Nombres et calculs', 'Décimaux : numération', 'arrondis et ordres de grandeur', '6-112'),
	('4bcbbaae-a01d-43c2-903c-1b365a438761', 'Nombres et calculs', 'Entiers : numération', 'décomposition', '6-101'),
	('4d825d44-928a-4461-9df0-3b3c3fdc74fc', 'Nombres et calculs', 'Entiers : numération', 'décomposition', '6-101'),
	('8d7edbde-d1d0-4a9d-bb6e-7e516ef1381d', 'Nombres et calculs', 'Entiers : numération', 'écritures', '6-103'),
	('a1b46489-4566-449e-a4e9-e1e144a0b11d', 'Nombres et calculs', 'Décimaux : numération', 'ordre', '6-109'),
	('d7781eed-7930-4619-9b00-caade882a637', 'Nombres et calculs', 'Décimaux : numération', null, '6-104'),
	('e75cb1a3-56f6-4498-b6bf-06e852b3252d', 'Nombres et calculs', 'Décimaux : numération', 'arrondis et ordres de grandeur', '6-111');

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
 where p.grade = '6' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
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
