-- ============================================================================
-- Chantier « questions-tspe-restes », lot 8b (« à savoir » : primitives de référence, y′ = ay + b,
-- intégration par parties) : nœud et tags de 7 modèles
-- ============================================================================
--   les 7 brouillons du lot 8b, créés sans nœud ni tag, vont sur un nœud EXISTANT et actif, tag
--   posé (un point par modèle, ADR 0020) :
--   9f47bf89 (Primitive de x ↦ xⁿ) → TSPE-463, « Équations différentielles > y′ = f > primitives des fonctions de référence » ;
--   10c6d48e (Primitive de x ↦ 1/√x) → TSPE-603, « Équations différentielles > y′ = f > primitives des fonctions de référence » ;
--   b46ed512 (Primitive de la fonction exponentielle) → TSPE-604, « Équations différentielles > y′ = f > primitives des fonctions de référence » ;
--   31789847 (Primitive de la fonction sinus) → TSPE-605, « Équations différentielles > y′ = f > primitives des fonctions de référence » ;
--   e002fdd3 (Primitive de la fonction cosinus) → TSPE-606, « Équations différentielles > y′ = f > primitives des fonctions de référence » ;
--   c79a1c43 (Solutions de l'équation y′ = ay + b) → TSPE-466, « Équations différentielles > y′ = ay + b » (NOTION) ;
--   b4554528 (Formule d'intégration par parties) → TSPE-484, « Intégration > Calcul d'intégrales > intégration par parties » ;
-- Aucune sous-notion neuve. TSPE-466 est sur la NOTION « Équations différentielles > y′ = ay + b »,
-- dont les deux sous-notions (« solution générale », « condition initiale ») sont archivées depuis
-- le 2026-10-10 : le modèle va sur la notion, et la garde « notion sans sous-notion » reste ENTIÈRE
-- (`sous_notions_admises` vide) : si une sous-notion active y apparaît, la migration échoue.
-- question_template_points_check_rules accepte un tag dont le point est sur le nœud du modèle OU
-- sur sa notion, et au plus UN point par programme (ADR 0020).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-02 (journal docs/wip/questions-tspe-restes-progress.md,
-- « Lot 8 : phase 0 », D-L8). Les modèles ont été créés en brouillon le 2026-11-02 (22 h 25 UTC) par
-- scripts/create-questions.ts (scripts/questions/tspe-8b-savoir/, #2263), qui ne pose ni nœud ni
-- tag. Relevé de la prod du 2026-11-02 (MCP) : 7 brouillons en [T_SPE], sous-domaine « À savoir »,
-- sans nœud ni tag ; les 7 points sont sur les nœuds visés, tous actifs, sans tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-tspe-lot8b-rangement-tags.test.ts, qui fabrique des copies des
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
-- contenu, lisibles par tout compte connecté, comme avant). Question posée avec la phase 0 du lot 8
-- (Q5), tranchée par David le 2026-11-02. Aucune règle (policy) ne change. Les élèves ne voient les
-- modèles qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Garde : il
-- refuse si un modèle n'est plus sur le nœud laissé par la migration ou porte d'autres tags. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qtl8b_retour;
-- create temporary table _qtl8b_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text,
-- 	grade text not null, code text not null, noeud uuid
-- );
-- insert into _qtl8b_retour values
-- 	('9f47bf89-8973-4047-bf46-3e88b8700dd2', 'Équations différentielles', 'y′ = f', 'primitives des fonctions de référence', 'T_SPE', 'TSPE-463', null),
-- 	('10c6d48e-22b6-4e03-90a2-2cc25bf6dc87', 'Équations différentielles', 'y′ = f', 'primitives des fonctions de référence', 'T_SPE', 'TSPE-603', null),
-- 	('b46ed512-5233-415b-9cfa-f5f448f846d4', 'Équations différentielles', 'y′ = f', 'primitives des fonctions de référence', 'T_SPE', 'TSPE-604', null),
-- 	('31789847-27f2-403f-92ee-cc5d25de4603', 'Équations différentielles', 'y′ = f', 'primitives des fonctions de référence', 'T_SPE', 'TSPE-605', null),
-- 	('e002fdd3-82b9-41a2-80a8-439f26ff167a', 'Équations différentielles', 'y′ = f', 'primitives des fonctions de référence', 'T_SPE', 'TSPE-606', null),
-- 	('c79a1c43-18c6-4ea6-b729-d32819d30419', 'Équations différentielles', 'y′ = ay + b', null, 'T_SPE', 'TSPE-466', null),
-- 	('b4554528-8ca6-4966-8850-f541fe91d505', 'Intégration', 'Calcul d''intégrales', 'intégration par parties', 'T_SPE', 'TSPE-484', null);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qtl8b_retour order by id;
-- select 1 from public.question_templates where id in (select id from _qtl8b_retour) order by id for update;
-- update _qtl8b_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and r.sous_notion is not null and s.name = r.sous_notion;
-- update _qtl8b_retour r set noeud = n.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and r.sous_notion is null;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _qtl8b_retour where noeud is null) then
-- 		raise exception 'rollback : nœuds introuvables : %', (select count(*) from _qtl8b_retour where noeud is null);
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _qtl8b_retour r on r.id = q.id;
-- 	if v_presents not in (0, 7) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 7', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ne sont plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*), count(*) filter (where p.grade = r.grade and p.code = r.code)
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _qtl8b_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_total or v_total <> v_presents then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_presents;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _qtl8b_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _qtl8b_retour);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _qtl8b_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._qtl8b_tags;
drop table if exists pg_temp._qtl8b_modeles;
create temporary table _qtl8b_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,  -- null : le modèle va sur la notion
	-- Sous-notions actives que la notion a le droit d'avoir quand le modèle va sur elle (relevé du
	-- 2026-11-02) : toute autre fait échouer la migration
	sous_notions_admises text[]
);
insert into _qtl8b_modeles values
	('9f47bf89-8973-4047-bf46-3e88b8700dd2', 'Équations différentielles', 'y′ = f', 'primitives des fonctions de référence', null),
	('10c6d48e-22b6-4e03-90a2-2cc25bf6dc87', 'Équations différentielles', 'y′ = f', 'primitives des fonctions de référence', null),
	('b46ed512-5233-415b-9cfa-f5f448f846d4', 'Équations différentielles', 'y′ = f', 'primitives des fonctions de référence', null),
	('31789847-27f2-403f-92ee-cc5d25de4603', 'Équations différentielles', 'y′ = f', 'primitives des fonctions de référence', null),
	('e002fdd3-82b9-41a2-80a8-439f26ff167a', 'Équations différentielles', 'y′ = f', 'primitives des fonctions de référence', null),
	('c79a1c43-18c6-4ea6-b729-d32819d30419', 'Équations différentielles', 'y′ = ay + b', null, null),
	('b4554528-8ca6-4966-8850-f541fe91d505', 'Intégration', 'Calcul d''intégrales', 'intégration par parties', null);
create temporary table _qtl8b_tags (
	id uuid not null references _qtl8b_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _qtl8b_tags values
	('9f47bf89-8973-4047-bf46-3e88b8700dd2', 'T_SPE', 'TSPE-463'),
	('10c6d48e-22b6-4e03-90a2-2cc25bf6dc87', 'T_SPE', 'TSPE-603'),
	('b46ed512-5233-415b-9cfa-f5f448f846d4', 'T_SPE', 'TSPE-604'),
	('31789847-27f2-403f-92ee-cc5d25de4603', 'T_SPE', 'TSPE-605'),
	('e002fdd3-82b9-41a2-80a8-439f26ff167a', 'T_SPE', 'TSPE-606'),
	('c79a1c43-18c6-4ea6-b729-d32819d30419', 'T_SPE', 'TSPE-466'),
	('b4554528-8ca6-4966-8850-f541fe91d505', 'T_SPE', 'TSPE-484');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qtl8b_modeles order by id;
select 1 from public.question_templates where id in (select id from _qtl8b_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) : présence TOUT ou RIEN, sans nœud, sans tag ---------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qtl8b_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
	end if;
	select count(*) into v_ranges from _qtl8b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qtl8b_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. Résolution STRICTE des chemins et des points -----------------------------------
-- Le nœud est la sous-notion désignée, ou la notion quand aucune sous-notion n'est donnée ; chaque
-- point doit être sur ce nœud ou sur sa notion
alter table _qtl8b_modeles add column noeud uuid;
alter table _qtl8b_modeles add column notion_id uuid;
alter table _qtl8b_tags add column point_id uuid;
update _qtl8b_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is not null and s.name = r.sous_notion;
update _qtl8b_modeles r set noeud = n.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qtl8b_tags t set point_id = p.id
  from _qtl8b_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _qtl8b_modeles where noeud is null)
	   or exists (select 1 from _qtl8b_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qtl8b_modeles where noeud is null),
			(select count(*) from _qtl8b_tags where point_id is null);
	end if;
	-- Une notion désignée sans sous-notion ne doit avoir AUCUNE sous-notion active hors de celles
	-- admises (sinon le modèle irait par erreur sur la notion au lieu d'une de ses sous-notions).
	-- (Lot 8b : TSPE-466 va sur la notion « y′ = ay + b », aucune sous-notion admise.)
	if exists (select 1 from _qtl8b_modeles r
	             join public.classification_nodes s on s.parent_id = r.notion_id
	              and s.kind = 'subnotion' and s.archived_at is null
	            where r.sous_notion is null
	              and s.name <> all (coalesce(r.sous_notions_admises, '{}'))) then
		raise exception 'notion visée sans sous-notion, mais elle en a une non admise : % modèle(s)',
			(select count(*) from _qtl8b_modeles r
			  where r.sous_notion is null
			    and exists (select 1 from public.classification_nodes s where s.parent_id = r.notion_id
			                  and s.kind = 'subnotion' and s.archived_at is null
			                  and s.name <> all (coalesce(r.sous_notions_admises, '{}'))));
	end if;
end $resolution$;

-- ---- 4. Rangement, puis tags (le trigger des tags lit le nœud du modèle) -----------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qtl8b_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _qtl8b_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qtl8b_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qtl8b_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _qtl8b_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _qtl8b_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qtl8b_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qtl8b_tags;
drop table _qtl8b_modeles;
