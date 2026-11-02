-- ============================================================================
-- Chantier « questions-tspe », lot 3 (logarithme, continuité, convexité) : nœud et tags de 6 modèles
-- ============================================================================
--   les 6 brouillons du lot 3, créés sans nœud ni tag, vont sur une sous-notion EXISTANTE, tag posé :
--   86c59a05 (Variations de ln : comparer, signe) → TSPE-593, « Logarithmes > dérivée » ;
--   28ede1b8 (Problème : demi-vie, doublement) → TSPE-447 (point sur la notion), « Logarithmes >
--   équations et inéquations » ;
--   560effd0 (Transformer une écriture exponentielle) → TSPE-626, « Fonction exponentielle >
--   propriétés algébriques » ;
--   7ea93a82 (Dérivable implique continue) → TSPE-426, « Continuité > continuité en un point » ;
--   9102bbb0 (Point d'inflexion lu sur la courbe de f′) → TSPE-589, « Convexité > point d'inflexion » ;
--   5ffe398a (Point d'inflexion lu sur la courbe de f″) → TSPE-591, « Convexité > point d'inflexion ».
-- Aucune sous-notion neuve. question_template_points_check_rules accepte un tag dont le point est
-- sur le nœud du modèle OU sur sa notion, et au plus UN point par programme (ADR 0020).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-02 (journal docs/wip/questions-tspe-progress.md § 16).
-- Les modèles ont été créés en brouillon le 2026-11-02 par scripts/create-questions.ts
-- (scripts/questions/tspe-3-ln-continuite-convexite/, #2195), qui ne pose ni nœud ni tag. Relevé de
-- la prod du 2026-11-02 (MCP) : 6 brouillons en [T_SPE], niveaux 1, 4, 8, 2, 3, 4, sans nœud ni tag ;
-- niveaux libres sur leur sous-notion.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée par
-- tests/integration/questions-tspe-lot3-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : chaque modèle doit être encore SANS nœud et SANS aucun tag
-- (relevé du 2026-11-02), sinon un rangement fait depuis à la main serait écrasé. Nœuds désignés
-- par leur chemin, résolus STRICTEMENT ; chaque point doit être sur le nœud de son modèle ou sur sa
-- notion.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin et prof ; leurs tags, pas leur
-- contenu, lisibles par tout compte connecté, comme avant). Question posée avec la phase 0 du lot 3
-- (journal § 16), « je suis tes recos » de David le 2026-11-02. Aucune règle (policy) ne change. Les
-- élèves ne voient les modèles qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags et rend les modèles sans nœud. Garde : il
-- refuse si un modèle n'est plus sur le nœud laissé par la migration ou porte d'autres tags. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qtl3_retour;
-- create temporary table _qtl3_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text not null,
-- 	grade text not null, code text not null, noeud uuid
-- );
-- insert into _qtl3_retour values
-- 	('86c59a05-936c-41a5-a05e-d85ab56a2bfb', 'Fonctions', 'Logarithmes', 'dérivée', 'T_SPE', 'TSPE-593', null),
-- 	('28ede1b8-76ec-4343-aab3-cd4f5f8a37a2', 'Fonctions', 'Logarithmes', 'équations et inéquations', 'T_SPE', 'TSPE-447', null),
-- 	('560effd0-8fce-46a7-b59e-bc4988f4f1fc', 'Fonctions', 'Fonction exponentielle', 'propriétés algébriques', 'T_SPE', 'TSPE-626', null),
-- 	('7ea93a82-d1d2-4dd3-8089-5f58cc1fe08f', 'Fonctions', 'Continuité', 'continuité en un point', 'T_SPE', 'TSPE-426', null),
-- 	('9102bbb0-1e20-45d0-9af6-575a6a6f1f86', 'Fonctions', 'Convexité', 'point d''inflexion', 'T_SPE', 'TSPE-589', null),
-- 	('5ffe398a-1f35-4681-8b47-e123e3ee03f7', 'Fonctions', 'Convexité', 'point d''inflexion', 'T_SPE', 'TSPE-591', null);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qtl3_retour order by id;
-- select 1 from public.question_templates where id in (select id from _qtl3_retour) order by id for update;
-- update _qtl3_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and s.name = r.sous_notion;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _qtl3_retour where noeud is null) then
-- 		raise exception 'rollback : sous-notions introuvables : %', (select count(*) from _qtl3_retour where noeud is null);
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _qtl3_retour r on r.id = q.id;
-- 	if v_presents not in (0, 6) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 6', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ne sont plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*), count(*) filter (where p.grade = r.grade and p.code = r.code)
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _qtl3_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_total or v_total <> v_presents then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_presents;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _qtl3_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _qtl3_retour);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _qtl3_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._qtl3_tags;
drop table if exists pg_temp._qtl3_modeles;
create temporary table _qtl3_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null
);
insert into _qtl3_modeles values
	('86c59a05-936c-41a5-a05e-d85ab56a2bfb', 'Fonctions', 'Logarithmes', 'dérivée'),
	('28ede1b8-76ec-4343-aab3-cd4f5f8a37a2', 'Fonctions', 'Logarithmes', 'équations et inéquations'),
	('560effd0-8fce-46a7-b59e-bc4988f4f1fc', 'Fonctions', 'Fonction exponentielle', 'propriétés algébriques'),
	('7ea93a82-d1d2-4dd3-8089-5f58cc1fe08f', 'Fonctions', 'Continuité', 'continuité en un point'),
	('9102bbb0-1e20-45d0-9af6-575a6a6f1f86', 'Fonctions', 'Convexité', 'point d''inflexion'),
	('5ffe398a-1f35-4681-8b47-e123e3ee03f7', 'Fonctions', 'Convexité', 'point d''inflexion');
create temporary table _qtl3_tags (
	id uuid not null references _qtl3_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _qtl3_tags values
	('86c59a05-936c-41a5-a05e-d85ab56a2bfb', 'T_SPE', 'TSPE-593'),
	('28ede1b8-76ec-4343-aab3-cd4f5f8a37a2', 'T_SPE', 'TSPE-447'),
	('560effd0-8fce-46a7-b59e-bc4988f4f1fc', 'T_SPE', 'TSPE-626'),
	('7ea93a82-d1d2-4dd3-8089-5f58cc1fe08f', 'T_SPE', 'TSPE-426'),
	('9102bbb0-1e20-45d0-9af6-575a6a6f1f86', 'T_SPE', 'TSPE-589'),
	('5ffe398a-1f35-4681-8b47-e123e3ee03f7', 'T_SPE', 'TSPE-591');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qtl3_modeles order by id;
select 1 from public.question_templates where id in (select id from _qtl3_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) : présence TOUT ou RIEN, sans nœud, sans tag ---------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qtl3_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	select count(*) into v_ranges from _qtl3_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qtl3_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. Résolution STRICTE des chemins et des points -----------------------------------
-- Le nœud est la sous-notion désignée ; chaque point doit être sur ce nœud ou sur sa notion
alter table _qtl3_modeles add column noeud uuid;
alter table _qtl3_modeles add column notion_id uuid;
alter table _qtl3_tags add column point_id uuid;
update _qtl3_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qtl3_tags t set point_id = p.id
  from _qtl3_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _qtl3_modeles where noeud is null)
	   or exists (select 1 from _qtl3_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qtl3_modeles where noeud is null),
			(select count(*) from _qtl3_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 4. Rangement, puis tags (le trigger des tags lit le nœud du modèle) -----------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qtl3_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _qtl3_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qtl3_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qtl3_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _qtl3_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _qtl3_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qtl3_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qtl3_tags;
drop table _qtl3_modeles;
