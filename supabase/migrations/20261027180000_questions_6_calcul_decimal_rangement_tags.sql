-- ============================================================================
-- Chantier « questions-6 », lot 3 « Calcul décimal » : nœud et tag de 10 modèles neufs
-- ============================================================================
--   - 26aceb03 (Diviser un décimal par un entier) → 6-121, sur « Nombres et calculs > Décimaux : calculs > division » ;
--   - 32b7a9bc (Problèmes de produits décimaux) → 6-120, sur « Nombres et calculs > Décimaux : calculs > multiplication » ;
--   - 3c9284c5 (Poser une division euclidienne) → 6-123, sur « Nombres et calculs > Entiers : division > division euclidienne » ;
--   - 3f4bacc6 (Problèmes de division euclidienne) → 6-124, sur « Nombres et calculs > Entiers : division > division euclidienne » ;
--   - 4b0b03b7 (Soustraire des nombres décimaux) → 6-198, sur « Nombres et calculs > Décimaux : calculs > soustraction » ;
--   - 7deff4e0 (Contrôler par un ordre de grandeur) → 6-119, sur « Nombres et calculs > Décimaux : numération > arrondis et ordres de grandeur » ;
--   - 87cfa41b (Problèmes de partage décimal) → 6-122, sur « Nombres et calculs > Décimaux : calculs > division » ;
--   - b586bdf8 (Additionner des nombres décimaux) → 6-114, sur « Nombres et calculs > Décimaux : calculs > addition » ;
--   - e3d87166 (Multiplier par 0,1, c’est diviser par 10) → 6-116, sur « Nombres et calculs > Décimaux : calculs » (notion : le point n’a pas de sous-notion) ;
--   - f5651c7d (Un produit de décimaux par l’aire) → 6-117, sur « Nombres et calculs > Décimaux : calculs > multiplication » ;
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point) : la sous-notion, ou la NOTION pour 6-116, qui n'a pas de sous-notion.
-- Chaque modèle porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-27 (journal docs/wip/questions-6-progress.md § 10). Les modèles ont
-- été créés en brouillon le 2026-10-27 par scripts/create-questions.ts (scripts/questions/6-calcul-decimal/,
-- lancé par David), qui ne pose ni nœud ni tag. Relevé de la prod (MCP, 2026-10-27) : 10 brouillons,
-- niveaux [6], sans nœud, sans tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (10 modèles). Elle est prouvée par
-- tests/integration/questions-6-calcul-decimal-rangement-tags.test.ts, qui fabrique des copies des
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
--   from (values ('26aceb03-fb1c-4088-9bf3-f4754fc2d1aa'::uuid),
--                ('32b7a9bc-300c-44a1-af0d-a811ca688eb2'::uuid),
--                ('3c9284c5-2277-4b95-956e-c2d287b9d077'::uuid),
--                ('3f4bacc6-2ee4-48c7-8ea4-e5ac52af62d4'::uuid),
--                ('4b0b03b7-3b46-4531-aaca-44ab04b13d1c'::uuid),
--                ('7deff4e0-61c6-42bd-8cfb-ddcad1c94b35'::uuid),
--                ('87cfa41b-cd8c-4b53-9150-78f91dd71702'::uuid),
--                ('b586bdf8-0b7b-452b-9fe5-a7f3d6da456a'::uuid),
--                ('e3d87166-f0cb-4a9a-ab24-6377e612cfeb'::uuid),
--                ('f5651c7d-363a-48fa-bf62-3cff037076ef'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('26aceb03-fb1c-4088-9bf3-f4754fc2d1aa'::uuid, '6-121'),
-- 	('32b7a9bc-300c-44a1-af0d-a811ca688eb2'::uuid, '6-120'),
-- 	('3c9284c5-2277-4b95-956e-c2d287b9d077'::uuid, '6-123'),
-- 	('3f4bacc6-2ee4-48c7-8ea4-e5ac52af62d4'::uuid, '6-124'),
-- 	('4b0b03b7-3b46-4531-aaca-44ab04b13d1c'::uuid, '6-198'),
-- 	('7deff4e0-61c6-42bd-8cfb-ddcad1c94b35'::uuid, '6-119'),
-- 	('87cfa41b-cd8c-4b53-9150-78f91dd71702'::uuid, '6-122'),
-- 	('b586bdf8-0b7b-452b-9fe5-a7f3d6da456a'::uuid, '6-114'),
-- 	('e3d87166-f0cb-4a9a-ab24-6377e612cfeb'::uuid, '6-116'),
-- 	('f5651c7d-363a-48fa-bf62-3cff037076ef'::uuid, '6-117')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '6' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('26aceb03-fb1c-4088-9bf3-f4754fc2d1aa',
--               '32b7a9bc-300c-44a1-af0d-a811ca688eb2',
--               '3c9284c5-2277-4b95-956e-c2d287b9d077',
--               '3f4bacc6-2ee4-48c7-8ea4-e5ac52af62d4',
--               '4b0b03b7-3b46-4531-aaca-44ab04b13d1c',
--               '7deff4e0-61c6-42bd-8cfb-ddcad1c94b35',
--               '87cfa41b-cd8c-4b53-9150-78f91dd71702',
--               'b586bdf8-0b7b-452b-9fe5-a7f3d6da456a',
--               'e3d87166-f0cb-4a9a-ab24-6377e612cfeb',
--               'f5651c7d-363a-48fa-bf62-3cff037076ef');
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
	('26aceb03-fb1c-4088-9bf3-f4754fc2d1aa', 'Nombres et calculs', 'Décimaux : calculs', 'division', '6-121'),
	('32b7a9bc-300c-44a1-af0d-a811ca688eb2', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', '6-120'),
	('3c9284c5-2277-4b95-956e-c2d287b9d077', 'Nombres et calculs', 'Entiers : division', 'division euclidienne', '6-123'),
	('3f4bacc6-2ee4-48c7-8ea4-e5ac52af62d4', 'Nombres et calculs', 'Entiers : division', 'division euclidienne', '6-124'),
	('4b0b03b7-3b46-4531-aaca-44ab04b13d1c', 'Nombres et calculs', 'Décimaux : calculs', 'soustraction', '6-198'),
	('7deff4e0-61c6-42bd-8cfb-ddcad1c94b35', 'Nombres et calculs', 'Décimaux : numération', 'arrondis et ordres de grandeur', '6-119'),
	('87cfa41b-cd8c-4b53-9150-78f91dd71702', 'Nombres et calculs', 'Décimaux : calculs', 'division', '6-122'),
	('b586bdf8-0b7b-452b-9fe5-a7f3d6da456a', 'Nombres et calculs', 'Décimaux : calculs', 'addition', '6-114'),
	('e3d87166-f0cb-4a9a-ab24-6377e612cfeb', 'Nombres et calculs', 'Décimaux : calculs', null, '6-116'),
	('f5651c7d-363a-48fa-bf62-3cff037076ef', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', '6-117');

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
