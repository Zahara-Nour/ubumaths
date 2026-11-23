-- ============================================================================
-- Chantier « questions-4 », lot 5 (Pythagore et triangles) : nœud et tags de 7 modèles neufs
-- ============================================================================
--   - 22d947f4 (Calculer une longueur avec Pythagore) → 4-034, sur « Théorème de Pythagore > calcul de longueurs » ;
--   - 5e85f283 (Réciproque et contraposée de Pythagore) → 4-072, sur « Théorème de Pythagore > réciproque » ;
--   - bdcc75c5 (Droite des milieux) → 4-033, sur « Théorème de Thalès > droite des milieux » ;
--   - 75713f0c (Triangle inscrit dans un demi-cercle) → 4-036, sur « Figures planes > triangles » ;
--   - f7d802ae (Centre du cercle circonscrit) → 4-037, sur « Figures planes > triangles » ;
--   - 03f891f6 (Réciproque et contraposée) → 4-035, sur « Théorème de Pythagore > réciproque » ;
--   - 050c8807 (Formule de l'aire d'un triangle) → 4-075, sur la notion « Algèbre > Calcul littéral ».
-- Chaque modèle va sur le nœud de son point (sous-notion ou notion) :
-- question_template_points_check_rules refuse un tag hors du nœud du point, et porte au plus UN
-- point par programme (ADR 0020).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-10-30 (journal docs/wip/questions-4-progress.md § 25). Les
-- modèles ont été créés en brouillon le 2026-10-30 par scripts/create-questions.ts
-- (scripts/questions/4-lot-5/, #2034), qui ne pose ni nœud ni tag. Relevé de la prod du 2026-10-30
-- (MCP) : 7 brouillons en [4], sans nœud ni tag ; les 7 points actifs, chacun sur le nœud
-- ci-dessus.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-4-lot5-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-30), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui de chacun de ses points.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin seul ; question posée à David
-- avec la phase 0 du lot 5, journal § 25.3, validée le 2026-10-30). Aucune règle ne change. Effet
-- visible : les 7 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les
-- élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('03f891f6-7af1-45b4-bb61-d83b48f65600'::uuid),
--                ('050c8807-34ea-44fa-8bf0-a4f682d03b91'::uuid),
--                ('22d947f4-1093-44d1-8d58-96a976520fb7'::uuid),
--                ('5e85f283-4f72-4ad0-8758-f980e1c75289'::uuid),
--                ('75713f0c-f3d9-4c89-af22-9d6f3a4f5ee0'::uuid),
--                ('bdcc75c5-697a-44ae-824a-41ed7dd8ba81'::uuid),
--                ('f7d802ae-0dfa-4bd9-ad31-44bfd9f68254'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('22d947f4-1093-44d1-8d58-96a976520fb7'::uuid, '4', '4-034'),
-- 	('5e85f283-4f72-4ad0-8758-f980e1c75289'::uuid, '4', '4-072'),
-- 	('bdcc75c5-697a-44ae-824a-41ed7dd8ba81'::uuid, '4', '4-033'),
-- 	('75713f0c-f3d9-4c89-af22-9d6f3a4f5ee0'::uuid, '4', '4-036'),
-- 	('f7d802ae-0dfa-4bd9-ad31-44bfd9f68254'::uuid, '4', '4-037'),
-- 	('03f891f6-7af1-45b4-bb61-d83b48f65600'::uuid, '4', '4-035'),
-- 	('050c8807-34ea-44fa-8bf0-a4f682d03b91'::uuid, '4', '4-075')
--  ) as r(id, grade, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('22d947f4-1093-44d1-8d58-96a976520fb7',
--               '5e85f283-4f72-4ad0-8758-f980e1c75289',
--               'bdcc75c5-697a-44ae-824a-41ed7dd8ba81',
--               '75713f0c-f3d9-4c89-af22-9d6f3a4f5ee0',
--               'f7d802ae-0dfa-4bd9-ad31-44bfd9f68254',
--               '03f891f6-7af1-45b4-bb61-d83b48f65600',
--               '050c8807-34ea-44fa-8bf0-a4f682d03b91');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires (les modèles, puis leurs points) --------------
drop table if exists pg_temp._q4l5_tags;
drop table if exists pg_temp._q4l5_modeles;
create temporary table _q4l5_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text
);
insert into _q4l5_modeles values
	('22d947f4-1093-44d1-8d58-96a976520fb7', 'Géométrie', 'Théorème de Pythagore', 'calcul de longueurs'),
	('5e85f283-4f72-4ad0-8758-f980e1c75289', 'Géométrie', 'Théorème de Pythagore', 'réciproque'),
	('bdcc75c5-697a-44ae-824a-41ed7dd8ba81', 'Géométrie', 'Théorème de Thalès', 'droite des milieux'),
	('75713f0c-f3d9-4c89-af22-9d6f3a4f5ee0', 'Géométrie', 'Figures planes', 'triangles'),
	('f7d802ae-0dfa-4bd9-ad31-44bfd9f68254', 'Géométrie', 'Figures planes', 'triangles'),
	('03f891f6-7af1-45b4-bb61-d83b48f65600', 'Géométrie', 'Théorème de Pythagore', 'réciproque'),
	('050c8807-34ea-44fa-8bf0-a4f682d03b91', 'Algèbre', 'Calcul littéral', null);
create temporary table _q4l5_tags (
	id uuid not null references _q4l5_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _q4l5_tags values
	('22d947f4-1093-44d1-8d58-96a976520fb7', '4', '4-034'),
	('5e85f283-4f72-4ad0-8758-f980e1c75289', '4', '4-072'),
	('bdcc75c5-697a-44ae-824a-41ed7dd8ba81', '4', '4-033'),
	('75713f0c-f3d9-4c89-af22-9d6f3a4f5ee0', '4', '4-036'),
	('f7d802ae-0dfa-4bd9-ad31-44bfd9f68254', '4', '4-037'),
	('03f891f6-7af1-45b4-bb61-d83b48f65600', '4', '4-035'),
	('050c8807-34ea-44fa-8bf0-a4f682d03b91', '4', '4-075');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q4l5_modeles order by id;
select 1 from public.question_templates where id in (select id from _q4l5_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui de
-- chacun des points du modèle
alter table _q4l5_modeles add column noeud uuid;
alter table _q4l5_tags add column point_id uuid;
update _q4l5_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _q4l5_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q4l5_tags t set point_id = p.id
  from _q4l5_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q4l5_modeles where noeud is null)
	   or exists (select 1 from _q4l5_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q4l5_modeles where noeud is null),
			(select count(*) from _q4l5_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _q4l5_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
	end if;
	select count(*) into v_ranges from _q4l5_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q4l5_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q4l5_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _q4l5_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q4l5_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q4l5_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _q4l5_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _q4l5_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q4l5_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _q4l5_tags;
drop table _q4l5_modeles;
