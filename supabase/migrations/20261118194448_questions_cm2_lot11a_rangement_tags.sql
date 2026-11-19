-- ============================================================================
-- Chantier « questions-cm2 », lot 11a (problèmes en une étape) : nœud et tag de 7 modèles neufs
-- ============================================================================
--   - f0f354c8 (Problèmes additifs : parties-tout) → CM2-058, sur « Nombres et calculs > Problèmes arithmétiques > parties-tout » ;
--   - fd017309 (Problèmes de comparaison additive) → CM2-058, sur « Nombres et calculs > Problèmes arithmétiques > comparaison » ;
--   - 454c54ac (Problèmes multiplicatifs : le tout, une part) → CM2-059, sur « Nombres et calculs > Problèmes arithmétiques > multiplicatifs » ;
--   - ac39b933 (Comparaison multiplicative en deux étapes) → CM2-061, sur « Nombres et calculs > Problèmes arithmétiques > comparaison » ;
--   - d962df2c (Problèmes algébriques : symboles et schémas) → CM2-066, sur « Algèbre > Premiers pas algébriques > nombre inconnu » ;
--   - 90d6612d (Est-ce une situation de proportionnalité ?) → CM2-115, sur « Proportionnalité > Situations de proportionnalité > caractérisation » ;
--   - 5343077e (Problèmes de proportionnalité (linéarité)) → CM2-116, sur « Proportionnalité > Situations de proportionnalité > quatrième proportionnelle » ;
-- Les points CM2-058 (« Problèmes arithmétiques ») et CM2-116 (« Situations de proportionnalité »)
-- sont posés sur la NOTION : un tag est accepté quand son point est sur le nœud du modèle OU sur sa
-- notion (question_template_points_check_rules), et la résolution ci-dessous suit la même règle.
-- CM2-058 porte deux modèles (parties-tout, comparaison additive), un point chacun.
-- Chaque modèle va sur une SOUS-NOTION, celle de son point ou une sous-notion de la notion de son point
-- (question_template_points_check_rules refuse un tag hors de ces deux cas), et porte UN point
-- (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-18 (journal docs/wip/questions-cm2-progress.md § 17 et 17.1).
-- Les modèles ont été créés en brouillon le 2026-11-18 par scripts/create-questions.ts
-- (scripts/questions/cm2-11a/, PR #2837), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-18 (MCP) : 7 brouillons [CM2], sans nœud ni tag, `updated_at` = création. Les modèles CM1
-- et 6e des mêmes sous-notions ne sont PAS touchés.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-cm2-lot11a-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-18), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David AVANT le SQL, en phase 0,
-- tranchée par lui le 2026-11-18 : personne, journal § 17 et 17.1). Aucune règle ne change. Effet visible : les 7
-- brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient
-- qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('f0f354c8-3169-4c46-a1a9-4ce9b6b1694e'::uuid),
--                ('fd017309-11d0-429f-b776-5bbdabbb3f6b'::uuid),
--                ('454c54ac-6c7a-4801-862e-c197a53a76e2'::uuid),
--                ('ac39b933-cc90-4b96-a8f4-87a467dfae57'::uuid),
--                ('d962df2c-671e-4443-988e-a69b2b8a8bc9'::uuid),
--                ('90d6612d-948c-4dcc-8867-2928c18596a1'::uuid),
--                ('5343077e-3b0a-4bbe-980a-e584b216d45e'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('f0f354c8-3169-4c46-a1a9-4ce9b6b1694e'::uuid, 'CM2-058'),
-- 	('fd017309-11d0-429f-b776-5bbdabbb3f6b'::uuid, 'CM2-058'),
-- 	('454c54ac-6c7a-4801-862e-c197a53a76e2'::uuid, 'CM2-059'),
-- 	('ac39b933-cc90-4b96-a8f4-87a467dfae57'::uuid, 'CM2-061'),
-- 	('d962df2c-671e-4443-988e-a69b2b8a8bc9'::uuid, 'CM2-066'),
-- 	('90d6612d-948c-4dcc-8867-2928c18596a1'::uuid, 'CM2-115'),
-- 	('5343077e-3b0a-4bbe-980a-e584b216d45e'::uuid, 'CM2-116')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CM2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('f0f354c8-3169-4c46-a1a9-4ce9b6b1694e',
--               'fd017309-11d0-429f-b776-5bbdabbb3f6b',
--               '454c54ac-6c7a-4801-862e-c197a53a76e2',
--               'ac39b933-cc90-4b96-a8f4-87a467dfae57',
--               'd962df2c-671e-4443-988e-a69b2b8a8bc9',
--               '90d6612d-948c-4dcc-8867-2928c18596a1',
--               '5343077e-3b0a-4bbe-980a-e584b216d45e');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qcm2l11a_modeles;
create temporary table _qcm2l11a_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qcm2l11a_modeles values
	('f0f354c8-3169-4c46-a1a9-4ce9b6b1694e', 'Nombres et calculs', 'Problèmes arithmétiques', 'parties-tout', 'CM2-058'),
	('fd017309-11d0-429f-b776-5bbdabbb3f6b', 'Nombres et calculs', 'Problèmes arithmétiques', 'comparaison', 'CM2-058'),
	('454c54ac-6c7a-4801-862e-c197a53a76e2', 'Nombres et calculs', 'Problèmes arithmétiques', 'multiplicatifs', 'CM2-059'),
	('ac39b933-cc90-4b96-a8f4-87a467dfae57', 'Nombres et calculs', 'Problèmes arithmétiques', 'comparaison', 'CM2-061'),
	('d962df2c-671e-4443-988e-a69b2b8a8bc9', 'Algèbre', 'Premiers pas algébriques', 'nombre inconnu', 'CM2-066'),
	('90d6612d-948c-4dcc-8867-2928c18596a1', 'Proportionnalité', 'Situations de proportionnalité', 'caractérisation', 'CM2-115'),
	('5343077e-3b0a-4bbe-980a-e584b216d45e', 'Proportionnalité', 'Situations de proportionnalité', 'quatrième proportionnelle', 'CM2-116');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm2l11a_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm2l11a_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée ; le point est sur ce nœud ou sur sa notion
alter table _qcm2l11a_modeles add column noeud uuid, add column point_id uuid;
update _qcm2l11a_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qcm2l11a_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qcm2l11a_modeles r set point_id = p.id
  from public.curriculum_points p, public.classification_nodes s
 where s.id = r.noeud and p.grade = 'CM2' and p.code = r.code and p.archived_at is null
   and (p.node_id = s.id or (s.kind = 'subnotion' and p.node_id = s.parent_id));
do $resolution$
begin
	if exists (select 1 from _qcm2l11a_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qcm2l11a_modeles where noeud is null),
			(select count(*) from _qcm2l11a_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm2l11a_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
	end if;
	select count(*) into v_ranges from _qcm2l11a_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcm2l11a_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qcm2l11a_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qcm2l11a_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm2l11a_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm2l11a_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qcm2l11a_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm2l11a_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qcm2l11a_modeles;
