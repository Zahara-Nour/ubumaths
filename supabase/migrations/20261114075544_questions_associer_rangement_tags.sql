-- ============================================================================
-- Chantier « associer » (geste « associer deux colonnes ») : nœud et tag des 2 modèles
-- ============================================================================
--   Deux brouillons créés sans nœud ni tag :
--     27ac630c Relier une droite à sa fonction affine (3e)
--              → Fonctions > Fonctions affines > coefficient directeur et ordonnée à l'origine, 3-067
--     5eec6d7d Relier une courbe à sa fonction de référence (2de)
--              → Fonctions > Généralités sur les fonctions (NOTION), SANS tag
-- Le modèle de 2de va sur la notion elle-même, sans point : aucun point de 2de ne le décrit en entier
-- (ADR 0020 : un tag dit « ce modèle couvre ce point »). La notion a 8 sous-notions actives, aucune
-- ne lui convient ; dix modèles sont déjà posés sur la notion. La garde « notion visée sans
-- sous-notion » liste ces 8 sous-notions comme admises : si une neuve apparaît, la migration échoue
-- (le modèle pourrait devoir y aller).
-- Aucune sous-notion neuve. question_template_points_check_rules accepte un tag dont le point est
-- sur le nœud du modèle OU sur sa notion, et au plus UN point par programme (ADR 0020).
-- Ni le contenu, ni les niveaux, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décisions de David du 2026-11-14 (journal docs/wip/associer-progress.md, § « Modèles courbe ↔
-- expression ») : 3e sur le point 3-067 ; 2de sans tag, rangé sous Fonctions > Généralités sur les
-- fonctions. Les modèles ont été créés en brouillon par David avec scripts/create-questions.ts
-- (scripts/questions/2de-associer-courbes/, scripts/questions/3-associer-droites/, #2644), qui ne
-- pose ni nœud ni tag. Relevé de la prod du 2026-11-14 (MCP) : 2 brouillons, aux niveaux {3} et {2},
-- sans nœud ni tag ; 3-067 actif, sur la sous-notion « coefficient directeur et ordonnée à
-- l'origine » ; la notion « Généralités sur les fonctions » active, avec 8 sous-notions actives.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent. Elle est prouvée par
-- tests/integration/questions-associer-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : les modèles doivent être encore SANS nœud et SANS aucun tag
-- (relevé du 2026-11-14), sinon un rangement fait depuis à la main serait écrasé. Nœuds désignés par
-- leur chemin, points par leur code, résolus STRICTEMENT ; chaque point doit être sur le nœud de son
-- modèle ou sur sa notion. Tout ou rien.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin et prof ; leurs tags, pas leur
-- contenu, lisibles par tout compte connecté, comme pour tout modèle). Question posée à David AVANT
-- le SQL, tranchée par lui le 2026-11-14 : personne. Aucune règle (policy) ne change. Les élèves ne
-- voient les modèles qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire le tag et rend les modèles sans nœud. Garde : il
-- refuse si un modèle n'est plus sur le nœud laissé par la migration ou si leurs tags ont changé.
-- Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qas_retour_tags;
-- drop table if exists pg_temp._qas_retour;
-- create temporary table _qas_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text, noeud uuid
-- );
-- insert into _qas_retour values
-- 	('27ac630c-3784-43fe-8569-53b769eb4f00', 'Fonctions', 'Fonctions affines', 'coefficient directeur et ordonnée à l''origine', null),
-- 	('5eec6d7d-a69b-4ef9-bebd-524e28044929', 'Fonctions', 'Généralités sur les fonctions', null, null);
-- create temporary table _qas_retour_tags (id uuid not null, grade text not null, code text not null, primary key (id, grade));
-- insert into _qas_retour_tags values
-- 	('27ac630c-3784-43fe-8569-53b769eb4f00', '3', '3-067');
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qas_retour order by id;
-- select 1 from public.question_templates where id in (select id from _qas_retour) order by id for update;
-- update _qas_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and s.name = r.sous_notion;
-- update _qas_retour r set noeud = n.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--  where r.sous_notion is null
--    and b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer; v_attendus integer;
-- begin
-- 	if exists (select 1 from _qas_retour where noeud is null) then
-- 		raise exception 'rollback : nœud introuvable';
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _qas_retour r on r.id = q.id;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur %, plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*) into v_attendus from _qas_retour_tags t join public.question_templates q on q.id = t.id;
-- 	select count(*), count(*) filter (where exists (select 1 from _qas_retour_tags t
-- 	                                                where t.id = q.template_id and t.grade = p.grade and t.code = p.code))
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _qas_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_attendus or v_total <> v_attendus then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_attendus;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _qas_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _qas_retour);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _qas_retour_tags;
-- drop table _qas_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Les modèles et leurs tags, en tables temporaires ----------------------------------------
drop table if exists pg_temp._qas_tags;
drop table if exists pg_temp._qas_modeles;
create temporary table _qas_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	-- Notion visée sans sous-notion : ses sous-notions actives admises (toutes celles du relevé).
	sous_notions_admises text[]
);
insert into _qas_modeles values
	('27ac630c-3784-43fe-8569-53b769eb4f00', 'Fonctions', 'Fonctions affines',
	 'coefficient directeur et ordonnée à l''origine', null),
	('5eec6d7d-a69b-4ef9-bebd-524e28044929', 'Fonctions', 'Généralités sur les fonctions', null,
	 array['images et antécédents', 'ensemble de définition', 'appartenance à une courbe', 'variations',
	       'extremums', 'signe', 'parité', 'équations et inéquations f(x) = k']);
create temporary table _qas_tags (
	id uuid not null references _qas_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _qas_tags values
	('27ac630c-3784-43fe-8569-53b769eb4f00', '3', '3-067');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et la ligne du modèle.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qas_modeles order by id;
select 1 from public.question_templates where id in (select id from _qas_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) : sans nœud, sans tag ---------------------------------
do $garde$
declare v_ranges integer; v_tags integer;
begin
	select count(*) into v_ranges from _qas_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèle(s) déjà rangé(s) depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qas_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèle(s) déjà tagué(s) depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. Résolution STRICTE du chemin et des points --------------------------------------
alter table _qas_modeles add column noeud uuid;
alter table _qas_modeles add column notion_id uuid;
alter table _qas_tags add column point_id uuid;
update _qas_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
-- Modèle rangé sur une notion (2de) : son nœud est la notion elle-même.
update _qas_modeles r set noeud = n.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where r.sous_notion is null
   and b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion;
update _qas_tags t set point_id = p.id
  from _qas_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _qas_modeles where noeud is null)
	   or exists (select 1 from _qas_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qas_modeles where noeud is null),
			(select count(*) from _qas_tags where point_id is null);
	end if;
	-- Une notion visée sans sous-notion ne doit avoir AUCUNE sous-notion active hors de celles
	-- admises (sinon le modèle irait par erreur sur la notion au lieu d'une sous-notion neuve).
	if exists (select 1 from _qas_modeles r
	             join public.classification_nodes s on s.parent_id = r.notion_id
	              and s.kind = 'subnotion' and s.archived_at is null
	            where r.sous_notion is null
	              and s.name <> all (coalesce(r.sous_notions_admises, '{}'))) then
		raise exception 'notion visée sans sous-notion, mais elle en a une non admise : % modèle(s)',
			(select count(*) from _qas_modeles r
			  where r.sous_notion is null
			    and exists (select 1 from public.classification_nodes s where s.parent_id = r.notion_id
			                  and s.kind = 'subnotion' and s.archived_at is null
			                  and s.name <> all (coalesce(r.sous_notions_admises, '{}'))));
	end if;
end $resolution$;

-- ---- 4. Rangement, puis tags (le trigger des tags lit le nœud du modèle) -----------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qas_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _qas_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications ------------------------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qas_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qas_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _qas_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _qas_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qas_modeles m on m.id = q.template_id;
	-- Tout ou rien : les 2 modèles (prod) ou aucun (base locale), jamais une partie.
	if v_presents not in (0, (select count(*) from _qas_modeles)) then
		raise exception 'lot partiel : % modèle(s) présent(s) sur %', v_presents,
			(select count(*) from _qas_modeles);
	end if;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qas_tags;
drop table _qas_modeles;
