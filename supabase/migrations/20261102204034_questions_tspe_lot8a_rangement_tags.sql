-- ============================================================================
-- Chantier « questions-tspe-restes », lot 8a (« à savoir » : suites, limites, convexité, continuité,
-- logarithme) : nœud et tags de 11 modèles
-- ============================================================================
--   les 11 brouillons du lot 8a, créés sans nœud ni tag, vont sur une sous-notion EXISTANTE et
--   active, tag posé (un point par modèle, ADR 0020) :
--   747d627a (Théorèmes de comparaison pour les suites) → TSPE-381, « Suites > Limites de suites > comparaison et encadrement » ;
--   2b29942c (Théorème des gendarmes) → TSPE-570, « Suites > Limites de suites > comparaison et encadrement » ;
--   5bf5b452 (Comparaison et encadrement pour les fonctions) → TSPE-400, « Fonctions > Limites de fonctions > comparaison et encadrement » ;
--   f6415cb9 (Opérations sur les limites : formes indéterminées) → TSPE-401, « Fonctions > Limites de fonctions > opérations » ;
--   12ed13ec (Convexité : position par rapport aux sécantes) → TSPE-410, « Fonctions > Convexité > caractérisations » ;
--   eeb72d3a (Convexité : position par rapport aux tangentes) → TSPE-411, « Fonctions > Convexité > caractérisations » ;
--   cfd13223 (Convexité et croissance de la dérivée) → TSPE-585, « Fonctions > Convexité > caractérisations » ;
--   c10096eb (Théorème des valeurs intermédiaires) → TSPE-428, « Fonctions > Continuité > valeurs intermédiaires » ;
--   fe7f5218 (TVI : cas strictement monotone) → TSPE-429, « Fonctions > Continuité > valeurs intermédiaires » ;
--   7c8b341b (Propriétés algébriques du logarithme) → TSPE-439, « Fonctions > Logarithmes > propriétés algébriques » ;
--   9de80159 (Dérivée de la fonction logarithme) → TSPE-440, « Fonctions > Logarithmes > dérivée » ;
-- Aucune sous-notion neuve. question_template_points_check_rules accepte un tag dont le point est
-- sur le nœud du modèle OU sur sa notion, et au plus UN point par programme (ADR 0020).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-02 (journal docs/wip/questions-tspe-restes-progress.md,
-- « Lot 8 : phase 0 », D-L8). Les modèles ont été créés en brouillon le 2026-11-02 (20 h 39 UTC) par
-- scripts/create-questions.ts (scripts/questions/tspe-8a-savoir/, #2259), qui ne pose ni nœud ni
-- tag. Relevé de la prod du 2026-11-02 (MCP) : 11 brouillons en [T_SPE], sous-domaine « À savoir »,
-- sans nœud ni tag ; les 11 points sont sur les sous-notions visées, toutes actives.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (11 modèles). Elle est prouvée par
-- tests/integration/questions-tspe-lot8a-rangement-tags.test.ts, qui fabrique des copies des
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
-- Rollback (aucune donnée d'élève). Il retire les 11 tags et rend les modèles sans nœud. Garde : il
-- refuse si un modèle n'est plus sur le nœud laissé par la migration ou porte d'autres tags. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qtl8a_retour;
-- create temporary table _qtl8a_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text,
-- 	grade text not null, code text not null, noeud uuid
-- );
-- insert into _qtl8a_retour values
-- 	('747d627a-54ed-45f3-9ac3-d10b1d68e2a0', 'Suites', 'Limites de suites', 'comparaison et encadrement', 'T_SPE', 'TSPE-381', null),
-- 	('2b29942c-0947-47cd-9a4d-77e43d34bb58', 'Suites', 'Limites de suites', 'comparaison et encadrement', 'T_SPE', 'TSPE-570', null),
-- 	('5bf5b452-1039-4139-aff0-ed5224050761', 'Fonctions', 'Limites de fonctions', 'comparaison et encadrement', 'T_SPE', 'TSPE-400', null),
-- 	('f6415cb9-d177-406d-9745-8c7f30840def', 'Fonctions', 'Limites de fonctions', 'opérations', 'T_SPE', 'TSPE-401', null),
-- 	('12ed13ec-d4d8-43e2-9da0-48eff48effc9', 'Fonctions', 'Convexité', 'caractérisations', 'T_SPE', 'TSPE-410', null),
-- 	('eeb72d3a-8a31-494a-afcf-6a6a580dfe69', 'Fonctions', 'Convexité', 'caractérisations', 'T_SPE', 'TSPE-411', null),
-- 	('cfd13223-e81b-427b-8a99-f7c126b9ad19', 'Fonctions', 'Convexité', 'caractérisations', 'T_SPE', 'TSPE-585', null),
-- 	('c10096eb-7403-4986-863e-e497ea477f44', 'Fonctions', 'Continuité', 'valeurs intermédiaires', 'T_SPE', 'TSPE-428', null),
-- 	('fe7f5218-5a09-4ef4-844b-e0d1202dda83', 'Fonctions', 'Continuité', 'valeurs intermédiaires', 'T_SPE', 'TSPE-429', null),
-- 	('7c8b341b-34e4-4328-9e21-d4b508796021', 'Fonctions', 'Logarithmes', 'propriétés algébriques', 'T_SPE', 'TSPE-439', null),
-- 	('9de80159-979b-4917-81e4-8e956147dafc', 'Fonctions', 'Logarithmes', 'dérivée', 'T_SPE', 'TSPE-440', null);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qtl8a_retour order by id;
-- select 1 from public.question_templates where id in (select id from _qtl8a_retour) order by id for update;
-- update _qtl8a_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and r.sous_notion is not null and s.name = r.sous_notion;
-- update _qtl8a_retour r set noeud = n.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and r.sous_notion is null;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _qtl8a_retour where noeud is null) then
-- 		raise exception 'rollback : nœuds introuvables : %', (select count(*) from _qtl8a_retour where noeud is null);
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _qtl8a_retour r on r.id = q.id;
-- 	if v_presents not in (0, 11) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 11', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ne sont plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*), count(*) filter (where p.grade = r.grade and p.code = r.code)
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _qtl8a_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_total or v_total <> v_presents then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_presents;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _qtl8a_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _qtl8a_retour);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _qtl8a_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._qtl8a_tags;
drop table if exists pg_temp._qtl8a_modeles;
create temporary table _qtl8a_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,  -- null : le modèle va sur la notion
	-- Sous-notions actives que la notion a le droit d'avoir quand le modèle va sur elle (relevé du
	-- 2026-11-02) : toute autre fait échouer la migration
	sous_notions_admises text[]
);
insert into _qtl8a_modeles values
	('747d627a-54ed-45f3-9ac3-d10b1d68e2a0', 'Suites', 'Limites de suites', 'comparaison et encadrement', null),
	('2b29942c-0947-47cd-9a4d-77e43d34bb58', 'Suites', 'Limites de suites', 'comparaison et encadrement', null),
	('5bf5b452-1039-4139-aff0-ed5224050761', 'Fonctions', 'Limites de fonctions', 'comparaison et encadrement', null),
	('f6415cb9-d177-406d-9745-8c7f30840def', 'Fonctions', 'Limites de fonctions', 'opérations', null),
	('12ed13ec-d4d8-43e2-9da0-48eff48effc9', 'Fonctions', 'Convexité', 'caractérisations', null),
	('eeb72d3a-8a31-494a-afcf-6a6a580dfe69', 'Fonctions', 'Convexité', 'caractérisations', null),
	('cfd13223-e81b-427b-8a99-f7c126b9ad19', 'Fonctions', 'Convexité', 'caractérisations', null),
	('c10096eb-7403-4986-863e-e497ea477f44', 'Fonctions', 'Continuité', 'valeurs intermédiaires', null),
	('fe7f5218-5a09-4ef4-844b-e0d1202dda83', 'Fonctions', 'Continuité', 'valeurs intermédiaires', null),
	('7c8b341b-34e4-4328-9e21-d4b508796021', 'Fonctions', 'Logarithmes', 'propriétés algébriques', null),
	('9de80159-979b-4917-81e4-8e956147dafc', 'Fonctions', 'Logarithmes', 'dérivée', null);
create temporary table _qtl8a_tags (
	id uuid not null references _qtl8a_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _qtl8a_tags values
	('747d627a-54ed-45f3-9ac3-d10b1d68e2a0', 'T_SPE', 'TSPE-381'),
	('2b29942c-0947-47cd-9a4d-77e43d34bb58', 'T_SPE', 'TSPE-570'),
	('5bf5b452-1039-4139-aff0-ed5224050761', 'T_SPE', 'TSPE-400'),
	('f6415cb9-d177-406d-9745-8c7f30840def', 'T_SPE', 'TSPE-401'),
	('12ed13ec-d4d8-43e2-9da0-48eff48effc9', 'T_SPE', 'TSPE-410'),
	('eeb72d3a-8a31-494a-afcf-6a6a580dfe69', 'T_SPE', 'TSPE-411'),
	('cfd13223-e81b-427b-8a99-f7c126b9ad19', 'T_SPE', 'TSPE-585'),
	('c10096eb-7403-4986-863e-e497ea477f44', 'T_SPE', 'TSPE-428'),
	('fe7f5218-5a09-4ef4-844b-e0d1202dda83', 'T_SPE', 'TSPE-429'),
	('7c8b341b-34e4-4328-9e21-d4b508796021', 'T_SPE', 'TSPE-439'),
	('9de80159-979b-4917-81e4-8e956147dafc', 'T_SPE', 'TSPE-440');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qtl8a_modeles order by id;
select 1 from public.question_templates where id in (select id from _qtl8a_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) : présence TOUT ou RIEN, sans nœud, sans tag ---------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qtl8a_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 11) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 11', v_presents;
	end if;
	select count(*) into v_ranges from _qtl8a_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qtl8a_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. Résolution STRICTE des chemins et des points -----------------------------------
-- Le nœud est la sous-notion désignée, ou la notion quand aucune sous-notion n'est donnée ; chaque
-- point doit être sur ce nœud ou sur sa notion
alter table _qtl8a_modeles add column noeud uuid;
alter table _qtl8a_modeles add column notion_id uuid;
alter table _qtl8a_tags add column point_id uuid;
update _qtl8a_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is not null and s.name = r.sous_notion;
update _qtl8a_modeles r set noeud = n.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qtl8a_tags t set point_id = p.id
  from _qtl8a_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _qtl8a_modeles where noeud is null)
	   or exists (select 1 from _qtl8a_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qtl8a_modeles where noeud is null),
			(select count(*) from _qtl8a_tags where point_id is null);
	end if;
	-- Une notion désignée sans sous-notion ne doit avoir AUCUNE sous-notion active hors de celles
	-- admises (sinon le modèle irait par erreur sur la notion au lieu d'une de ses sous-notions).
	-- (Lot 8a : les 11 modèles vont sur une sous-notion ; garde gardée telle quelle, sans effet.)
	if exists (select 1 from _qtl8a_modeles r
	             join public.classification_nodes s on s.parent_id = r.notion_id
	              and s.kind = 'subnotion' and s.archived_at is null
	            where r.sous_notion is null
	              and s.name <> all (coalesce(r.sous_notions_admises, '{}'))) then
		raise exception 'notion visée sans sous-notion, mais elle en a une non admise : % modèle(s)',
			(select count(*) from _qtl8a_modeles r
			  where r.sous_notion is null
			    and exists (select 1 from public.classification_nodes s where s.parent_id = r.notion_id
			                  and s.kind = 'subnotion' and s.archived_at is null
			                  and s.name <> all (coalesce(r.sous_notions_admises, '{}'))));
	end if;
end $resolution$;

-- ---- 4. Rangement, puis tags (le trigger des tags lit le nœud du modèle) -----------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qtl8a_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _qtl8a_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qtl8a_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qtl8a_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _qtl8a_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _qtl8a_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qtl8a_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qtl8a_tags;
drop table _qtl8a_modeles;
