-- ============================================================================
-- Chantier « questions-1spe-tracer-droite » : nœud et tags du modèle 1SPE-433
-- ============================================================================
--   dc5d7cb6 (Tracer une droite donnée par un point et sa pente), brouillon créé sans nœud ni tag,
--   va sur la sous-notion EXISTANTE et active « Géométrie > Géométrie repérée > équations de
--   droites » et reçoit ses trois points jumeaux (même libellé « Tracer une droite donnée par un
--   point et son coefficient directeur », même sous-notion) : 1SPE-433, 1GEN-063, 1TECHNO-140.
--   Ses niveaux 1_SPE, 1_GEN, 1_TECHNO ont été écrits à la création.
-- Aucune sous-notion neuve. question_template_points_check_rules accepte un tag dont le point est
-- sur le nœud du modèle OU sur sa notion, et au plus UN point par programme (ADR 0020).
-- Ni le contenu, ni les niveaux, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-03 (journal docs/wip/questions-1spe-tracer-droite-progress.md,
-- § 4) ; les points jumeaux tranchés par David le 2026-11-03 (les trois). Le modèle a été créé en
-- brouillon le 2026-11-03 (6 h 27 UTC) par scripts/create-questions.ts
-- (scripts/questions/1spe-tracer-droite/, #2272), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-03 (MCP) : brouillon aux niveaux {1_SPE, 1_GEN, 1_TECHNO}, sans nœud ni tag ; les trois
-- points sont sur la sous-notion visée, active.
--
-- Le modèle n'existe qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent. Elle est prouvée par
-- tests/integration/questions-1spe-tracer-droite-rangement-tags.test.ts, qui fabrique une copie de
-- l'identifiant de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : le modèle doit être encore SANS nœud et SANS aucun tag (relevé du
-- 2026-11-03), sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin,
-- points par leur code, résolus STRICTEMENT ; chaque point doit être sur le nœud du modèle ou sur sa
-- notion.
--
-- Données d'élèves : aucune (modèle neuf, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillon : admin et prof ; ses tags, pas son
-- contenu, lisibles par tout compte connecté, comme pour tout modèle). Question posée à David AVANT
-- le SQL, tranchée par lui le 2026-11-03 : personne. Aucune règle (policy) ne change. Les élèves ne
-- voient le modèle qu'une fois publié par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 3 tags et rend le modèle sans nœud. Garde : il
-- refuse si le modèle n'est plus sur le nœud laissé par la migration ou si ses tags ont changé.
-- Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q433_retour_tags;
-- drop table if exists pg_temp._q433_retour;
-- create temporary table _q433_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text not null, noeud uuid
-- );
-- insert into _q433_retour values
-- 	('dc5d7cb6-5d9a-41ca-89c3-83f4d6750613', 'Géométrie', 'Géométrie repérée', 'équations de droites', null);
-- create temporary table _q433_retour_tags (id uuid not null, grade text not null, code text not null, primary key (id, grade));
-- insert into _q433_retour_tags values
-- 	('dc5d7cb6-5d9a-41ca-89c3-83f4d6750613', '1_SPE', '1SPE-433'),
-- 	('dc5d7cb6-5d9a-41ca-89c3-83f4d6750613', '1_GEN', '1GEN-063'),
-- 	('dc5d7cb6-5d9a-41ca-89c3-83f4d6750613', '1_TECHNO', '1TECHNO-140');
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _q433_retour order by id;
-- select 1 from public.question_templates where id in (select id from _q433_retour) order by id for update;
-- update _q433_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and s.name = r.sous_notion;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer; v_attendus integer;
-- begin
-- 	if exists (select 1 from _q433_retour where noeud is null) then
-- 		raise exception 'rollback : nœud introuvable';
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _q433_retour r on r.id = q.id;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : le modèle n''est plus sur le nœud de la migration';
-- 	end if;
-- 	select count(*) into v_attendus from _q433_retour_tags t join public.question_templates q on q.id = t.id;
-- 	select count(*), count(*) filter (where exists (select 1 from _q433_retour_tags t
-- 	                                                where t.id = q.template_id and t.grade = p.grade and t.code = p.code))
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _q433_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_attendus or v_total <> v_attendus then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_attendus;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _q433_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _q433_retour);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _q433_retour_tags;
-- drop table _q433_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le modèle et ses tags, en tables temporaires ----------------------------------------
drop table if exists pg_temp._q433_tags;
drop table if exists pg_temp._q433_modeles;
create temporary table _q433_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null
);
insert into _q433_modeles values
	('dc5d7cb6-5d9a-41ca-89c3-83f4d6750613', 'Géométrie', 'Géométrie repérée', 'équations de droites');
create temporary table _q433_tags (
	id uuid not null references _q433_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _q433_tags values
	('dc5d7cb6-5d9a-41ca-89c3-83f4d6750613', '1_SPE', '1SPE-433'),
	('dc5d7cb6-5d9a-41ca-89c3-83f4d6750613', '1_GEN', '1GEN-063'),
	('dc5d7cb6-5d9a-41ca-89c3-83f4d6750613', '1_TECHNO', '1TECHNO-140');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et la ligne du modèle.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q433_modeles order by id;
select 1 from public.question_templates where id in (select id from _q433_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) : sans nœud, sans tag ---------------------------------
do $garde$
declare v_ranges integer; v_tags integer;
begin
	select count(*) into v_ranges from _q433_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèle déjà rangé depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q433_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèle déjà tagué depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. Résolution STRICTE du chemin et des points --------------------------------------
alter table _q433_modeles add column noeud uuid;
alter table _q433_modeles add column notion_id uuid;
alter table _q433_tags add column point_id uuid;
update _q433_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q433_tags t set point_id = p.id
  from _q433_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _q433_modeles where noeud is null)
	   or exists (select 1 from _q433_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q433_modeles where noeud is null),
			(select count(*) from _q433_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 4. Rangement, puis tags (le trigger des tags lit le nœud du modèle) -----------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q433_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _q433_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications ------------------------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q433_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q433_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _q433_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _q433_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q433_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _q433_tags;
drop table _q433_modeles;
