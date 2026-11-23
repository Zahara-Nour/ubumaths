-- ============================================================================
-- Chantier « questions-4 », lot 1 (relatifs et rationnels) : nœud et tag de 7 modèles neufs
-- ============================================================================
--   - 05818fa0 (Problèmes avec des fractions) → 4-014, sur « Nombres et calculs > Fractions : calculs » ;
--   - 25c02016 (Nommer un enchaînement d'opérations) → 4-004, sur « Nombres et calculs > Entiers : priorités opératoires > écriture d'une expression » ;
--   - 62eae788 (L'inverse d'un nombre) → 4-010, sur « Nombres et calculs > Fractions : calculs > inverse » ;
--   - 70c52ae9 (Nombre rationnel) → 4-006, sur « Nombres et calculs > Fractions : sens et écritures > définition » ;
--   - 92be516e (Somme de deux opposés) → 4-082, sur « Nombres et calculs > Relatifs : calculs > sommes » ;
--   - a270c7aa (Enchaîner des calculs de fractions) → 4-013, sur « Nombres et calculs > Fractions : calculs » ;
--   - a635df43 (Fraction d'une fraction) → 4-009, sur « Nombres et calculs > Fractions : calculs > fraction d'une quantité » ;
-- Chaque modèle va sur le nœud de son point, sous-notion ou notion (4-013, 4-014) :
-- question_template_points_check_rules refuse un tag hors du nœud du point, et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-10-28 (journal docs/wip/questions-4-progress.md § 9). Les
-- modèles ont été créés en brouillon le 2026-10-28 par scripts/create-questions.ts
-- (scripts/questions/4-lot-1/, #1931), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-10-29 (MCP) : 7 brouillons [4], sans nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-4-lot1-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-29), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin seul ; question posée à David
-- avec la phase 0 du lot 1, journal § 9.3, validée le 2026-10-28). Aucune règle ne change. Effet
-- visible : les 7 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les
-- élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('05818fa0-8135-4b5f-8a0c-df283c52b10f'::uuid),
--                ('25c02016-377f-434a-9b05-c6539c902c96'::uuid),
--                ('62eae788-7844-4b17-a9fa-9b938d566dc7'::uuid),
--                ('70c52ae9-4bdf-45be-b1e5-6fbde1ede513'::uuid),
--                ('92be516e-abb8-44a7-b628-f0db0fd3ce65'::uuid),
--                ('a270c7aa-6760-443e-bc1f-647486c33565'::uuid),
--                ('a635df43-313d-47f7-a445-2020867ed2e4'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('05818fa0-8135-4b5f-8a0c-df283c52b10f'::uuid, '4-014'),
-- 	('25c02016-377f-434a-9b05-c6539c902c96'::uuid, '4-004'),
-- 	('62eae788-7844-4b17-a9fa-9b938d566dc7'::uuid, '4-010'),
-- 	('70c52ae9-4bdf-45be-b1e5-6fbde1ede513'::uuid, '4-006'),
-- 	('92be516e-abb8-44a7-b628-f0db0fd3ce65'::uuid, '4-082'),
-- 	('a270c7aa-6760-443e-bc1f-647486c33565'::uuid, '4-013'),
-- 	('a635df43-313d-47f7-a445-2020867ed2e4'::uuid, '4-009')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '4' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('05818fa0-8135-4b5f-8a0c-df283c52b10f',
--               '25c02016-377f-434a-9b05-c6539c902c96',
--               '62eae788-7844-4b17-a9fa-9b938d566dc7',
--               '70c52ae9-4bdf-45be-b1e5-6fbde1ede513',
--               '92be516e-abb8-44a7-b628-f0db0fd3ce65',
--               'a270c7aa-6760-443e-bc1f-647486c33565',
--               'a635df43-313d-47f7-a445-2020867ed2e4');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q4l1_modeles;
create temporary table _q4l1_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _q4l1_modeles values
	('05818fa0-8135-4b5f-8a0c-df283c52b10f', 'Nombres et calculs', 'Fractions : calculs', null, '4-014'),
	('25c02016-377f-434a-9b05-c6539c902c96', 'Nombres et calculs', 'Entiers : priorités opératoires', 'écriture d''une expression', '4-004'),
	('62eae788-7844-4b17-a9fa-9b938d566dc7', 'Nombres et calculs', 'Fractions : calculs', 'inverse', '4-010'),
	('70c52ae9-4bdf-45be-b1e5-6fbde1ede513', 'Nombres et calculs', 'Fractions : sens et écritures', 'définition', '4-006'),
	('92be516e-abb8-44a7-b628-f0db0fd3ce65', 'Nombres et calculs', 'Relatifs : calculs', 'sommes', '4-082'),
	('a270c7aa-6760-443e-bc1f-647486c33565', 'Nombres et calculs', 'Fractions : calculs', null, '4-013'),
	('a635df43-313d-47f7-a445-2020867ed2e4', 'Nombres et calculs', 'Fractions : calculs', 'fraction d''une quantité', '4-009');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q4l1_modeles order by id;
select 1 from public.question_templates where id in (select id from _q4l1_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _q4l1_modeles add column noeud uuid, add column point_id uuid;
update _q4l1_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _q4l1_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q4l1_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '4' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q4l1_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q4l1_modeles where noeud is null),
			(select count(*) from _q4l1_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _q4l1_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
	end if;
	select count(*) into v_ranges from _q4l1_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q4l1_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q4l1_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q4l1_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q4l1_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q4l1_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _q4l1_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q4l1_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _q4l1_modeles;
