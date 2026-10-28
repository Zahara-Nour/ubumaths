-- ============================================================================
-- Chantier « questions-ce2 », lot 2 (numération) : nœud et tag des 9 brouillons neufs
-- ============================================================================
-- Chaque modèle va sur le nœud de son point, sous « Nombres et calculs > Entiers : numération » :
--   - 5258350a (Milliers, centaines et dizaines) → CE2-003, « décomposition » ;
--   - 78d3ff5b (Ranger par lots de 100 ou de 10) → CE2-003, « décomposition » ;
--   - b4dd4008 (Unités non canoniques et décompositions) → CE2-005, « écritures » ;
--   - 692d237e (Le nombre qui suit, le nombre qui précède) → CE2-004, « écritures » ;
--   - 3dd3b738 (Écrire en chiffres un nombre écrit en lettres) → CE2-004, « écritures » ;
--   - 8c5c7d70 (Ranger cinq nombres) → CE2-008, « ordre » ;
--   - d6753aef (Supérieur à, inférieur à, compris entre) → CE2-009, « ordre » ;
--   - 41dd05bc (Encadrer un nombre) → CE2-087, « ordre » ;
--   - f8fd9552 (Intercaler un nombre) → CE2-088, « ordre ».
-- Le modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag hors
-- du nœud du point) et porte UN point (ADR 0020). Ni le contenu, ni le niveau, ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-10-28 (journal docs/wip/questions-ce2-progress.md, lot 2).
-- Créés en brouillon le 2026-10-28 par scripts/create-questions.ts (scripts/questions/ce2-2/,
-- lancé par David), qui ne pose ni nœud ni tag. Relevé de la prod du 2026-10-28 (MCP) : 9
-- brouillons [CE2], sans nœud ni tag ; nœuds des points relevés identiques aux chemins ci-dessus.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne les touche pas et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (9 modèles). Elle est prouvée par
-- tests/integration/questions-ce2-lot2-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-28), sinon
-- un rangement fait depuis à la main serait écrasé. Nœuds désignés par leur chemin, résolus
-- STRICTEMENT, et qui doivent être ceux des points.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès (question posée à David avant le SQL, tranchée le 2026-10-28, journal § lot 2) : personne
-- ne gagne ni ne perd d'accès (brouillons : prof et admin). Aucune règle ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 9 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('5258350a-1bcd-4ef7-bdd2-14b1ac5a5b3b'::uuid),
--                ('78d3ff5b-b047-41b2-9600-0500d0feec24'::uuid),
--                ('b4dd4008-b395-455c-b9e4-72ed1d38bad7'::uuid),
--                ('692d237e-a9db-464d-ad46-817b20e2fa90'::uuid),
--                ('3dd3b738-02d4-4b1e-85a6-7dcbbad9b27f'::uuid),
--                ('8c5c7d70-ce4c-410c-9b8c-f0a041ffd67f'::uuid),
--                ('d6753aef-f384-41ee-be25-f57c663fc5c2'::uuid),
--                ('41dd05bc-345d-4a18-843c-dc4785585ec5'::uuid),
--                ('f8fd9552-6a1d-4caa-acb3-54f0748f58d3'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('5258350a-1bcd-4ef7-bdd2-14b1ac5a5b3b'::uuid, 'CE2-003'),
-- 	('78d3ff5b-b047-41b2-9600-0500d0feec24'::uuid, 'CE2-003'),
-- 	('b4dd4008-b395-455c-b9e4-72ed1d38bad7'::uuid, 'CE2-005'),
-- 	('692d237e-a9db-464d-ad46-817b20e2fa90'::uuid, 'CE2-004'),
-- 	('3dd3b738-02d4-4b1e-85a6-7dcbbad9b27f'::uuid, 'CE2-004'),
-- 	('8c5c7d70-ce4c-410c-9b8c-f0a041ffd67f'::uuid, 'CE2-008'),
-- 	('d6753aef-f384-41ee-be25-f57c663fc5c2'::uuid, 'CE2-009'),
-- 	('41dd05bc-345d-4a18-843c-dc4785585ec5'::uuid, 'CE2-087'),
-- 	('f8fd9552-6a1d-4caa-acb3-54f0748f58d3'::uuid, 'CE2-088')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CE2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('5258350a-1bcd-4ef7-bdd2-14b1ac5a5b3b',
--               '78d3ff5b-b047-41b2-9600-0500d0feec24',
--               'b4dd4008-b395-455c-b9e4-72ed1d38bad7',
--               '692d237e-a9db-464d-ad46-817b20e2fa90',
--               '3dd3b738-02d4-4b1e-85a6-7dcbbad9b27f',
--               '8c5c7d70-ce4c-410c-9b8c-f0a041ffd67f',
--               'd6753aef-f384-41ee-be25-f57c663fc5c2',
--               '41dd05bc-345d-4a18-843c-dc4785585ec5',
--               'f8fd9552-6a1d-4caa-acb3-54f0748f58d3');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qce2l2_modeles;
create temporary table _qce2l2_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qce2l2_modeles values
	('5258350a-1bcd-4ef7-bdd2-14b1ac5a5b3b', 'Nombres et calculs', 'Entiers : numération', 'décomposition', 'CE2-003'),
	('78d3ff5b-b047-41b2-9600-0500d0feec24', 'Nombres et calculs', 'Entiers : numération', 'décomposition', 'CE2-003'),
	('b4dd4008-b395-455c-b9e4-72ed1d38bad7', 'Nombres et calculs', 'Entiers : numération', 'écritures', 'CE2-005'),
	('692d237e-a9db-464d-ad46-817b20e2fa90', 'Nombres et calculs', 'Entiers : numération', 'écritures', 'CE2-004'),
	('3dd3b738-02d4-4b1e-85a6-7dcbbad9b27f', 'Nombres et calculs', 'Entiers : numération', 'écritures', 'CE2-004'),
	('8c5c7d70-ce4c-410c-9b8c-f0a041ffd67f', 'Nombres et calculs', 'Entiers : numération', 'ordre', 'CE2-008'),
	('d6753aef-f384-41ee-be25-f57c663fc5c2', 'Nombres et calculs', 'Entiers : numération', 'ordre', 'CE2-009'),
	('41dd05bc-345d-4a18-843c-dc4785585ec5', 'Nombres et calculs', 'Entiers : numération', 'ordre', 'CE2-087'),
	('f8fd9552-6a1d-4caa-acb3-54f0748f58d3', 'Nombres et calculs', 'Entiers : numération', 'ordre', 'CE2-088');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qce2l2_modeles order by id;
select 1 from public.question_templates where id in (select id from _qce2l2_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qce2l2_modeles add column noeud uuid, add column point_id uuid;
update _qce2l2_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qce2l2_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qce2l2_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CE2' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qce2l2_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qce2l2_modeles where noeud is null),
			(select count(*) from _qce2l2_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qce2l2_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 9) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 9', v_presents;
	end if;
	select count(*) into v_ranges from _qce2l2_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qce2l2_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qce2l2_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qce2l2_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qce2l2_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qce2l2_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qce2l2_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qce2l2_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qce2l2_modeles;
