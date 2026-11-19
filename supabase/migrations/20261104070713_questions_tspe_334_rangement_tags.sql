-- ============================================================================
-- Chantier « solide-vecteur » (terminale spé, TSPE-334) : nœud et tag d'un modèle
-- ============================================================================
--   le brouillon 7ce9936b (Espace : tracer une combinaison linéaire de vecteurs), créé sans nœud
--   ni tag, va sur un nœud EXISTANT et actif, tag posé (un point par modèle, ADR 0020) :
--   7ce9936b → TSPE-334, « Géométrie > Espace > vecteurs de l'espace ».
-- Aucune sous-notion neuve.
-- question_template_points_check_rules accepte un tag dont le point est sur le nœud du modèle OU
-- sur sa notion, et au plus UN point par programme (ADR 0020).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Le modèle a été créé en brouillon le 2026-11-04 par scripts/create-questions.ts
-- (scripts/questions/tspe-334-tracer/, #2363), qui ne pose ni nœud ni tag.
-- Relevé de la prod du 2026-11-04 (MCP) : brouillon en [T_SPE], sans nœud ni tag ; le point
-- TSPE-334 « Représenter des combinaisons linéaires de vecteurs donnés » est actif, sur la
-- sous-notion active « vecteurs de l'espace » de « Géométrie > Espace ».
--
-- Le modèle n'existe qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent. Elle est prouvée par
-- tests/integration/questions-tspe-334-rangement-tags.test.ts, qui fabrique une copie de
-- l'identifiant de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : le modèle doit être encore SANS nœud et SANS aucun tag (relevé
-- du 2026-11-04), sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son
-- chemin, résolu STRICTEMENT ; le point doit être sur ce nœud.
--
-- Données d'élèves : aucune (modèle neuf, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillon : admin et prof ; son tag, pas son
-- contenu, lisible par tout compte connecté, comme ceux des lots précédents). Question tranchée
-- par David le 2026-11-04 (journal docs/wip/solide-vecteur-progress.md). Aucune règle (policy) ne
-- change. Les élèves ne voient le modèle qu'une fois publié par David.
--
-- Rollback (aucune donnée d'élève). Il retire le tag et rend le modèle sans nœud. Garde : il
-- refuse si le modèle n'est plus sur le nœud laissé par la migration ou porte d'autres tags. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:7ce9936b-7835-4b99-9e2b-f3644f2956af', 0));
-- select 1 from public.question_templates where id = '7ce9936b-7835-4b99-9e2b-f3644f2956af' for update;
-- do $garde_retour$
-- declare v_noeud uuid; v_present boolean; v_intact boolean; v_total integer; v_tags integer;
-- begin
-- 	select s.id into v_noeud
-- 	  from public.classification_nodes b
-- 	  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
-- 	  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
-- 	 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null
-- 	   and b.name = 'Géométrie' and n.name = 'Espace' and s.name = 'vecteurs de l''espace';
-- 	if v_noeud is null then
-- 		raise exception 'rollback : nœud introuvable';
-- 	end if;
-- 	select true, q.classification_node_id is not distinct from v_noeud into v_present, v_intact
-- 	  from public.question_templates q where q.id = '7ce9936b-7835-4b99-9e2b-f3644f2956af';
-- 	if v_present and not v_intact then
-- 		raise exception 'rollback : le modèle n’est plus sur le nœud de la migration';
-- 	end if;
-- 	select count(*), count(*) filter (where p.grade = 'T_SPE' and p.code = 'TSPE-334')
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join public.curriculum_points p on p.id = q.point_id
-- 	 where q.template_id = '7ce9936b-7835-4b99-9e2b-f3644f2956af';
-- 	if v_tags <> v_total or v_total <> (case when v_present then 1 else 0 end) then
-- 		raise exception 'rollback : tags changés depuis la migration (% TSPE-334 sur %)', v_tags, v_total;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points
--  where template_id = '7ce9936b-7835-4b99-9e2b-f3644f2956af';
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id = '7ce9936b-7835-4b99-9e2b-f3644f2956af';
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Verrous ligne par ligne.
set local lock_timeout = '5s';

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et la ligne du modèle.
select pg_advisory_xact_lock(hashtextextended('question_template_points:7ce9936b-7835-4b99-9e2b-f3644f2956af', 0));
select 1 from public.question_templates where id = '7ce9936b-7835-4b99-9e2b-f3644f2956af' for update;

do $rangement$
declare
	v_modele constant uuid := '7ce9936b-7835-4b99-9e2b-f3644f2956af';
	v_present boolean;
	v_noeud uuid;
	v_point uuid;
	v_tags integer;
begin
	select exists (select 1 from public.question_templates where id = v_modele) into v_present;
	if not v_present then
		-- Base locale : le modèle n'existe qu'en production
		return;
	end if;

	-- ---- 1. Gardes (avant toute écriture) : sans nœud, sans tag ----------------------------
	if exists (select 1 from public.question_templates
	            where id = v_modele and classification_node_id is not null) then
		raise exception 'modèle déjà rangé depuis le relevé';
	end if;
	select count(*) into v_tags from public.question_template_points where template_id = v_modele;
	if v_tags <> 0 then
		raise exception 'modèle déjà tagué depuis le relevé : % tag(s)', v_tags;
	end if;

	-- ---- 2. Résolution STRICTE du chemin et du point ------------------------------------
	select s.id into v_noeud
	  from public.classification_nodes b
	  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
	  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
	 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null
	   and b.name = 'Géométrie' and n.name = 'Espace' and s.name = 'vecteurs de l''espace';
	select p.id into v_point
	  from public.curriculum_points p
	 where p.grade = 'T_SPE' and p.code = 'TSPE-334' and p.archived_at is null
	   and p.node_id = v_noeud;
	if v_noeud is null or v_point is null then
		raise exception 'nœud ou point introuvable : nœud %, point %', v_noeud, v_point;
	end if;

	-- ---- 3. Rangement, puis tag (le trigger des tags lit le nœud du modèle) -------------
	alter table public.question_templates disable trigger update_question_templates_updated_at;
	update public.question_templates set classification_node_id = v_noeud where id = v_modele;
	alter table public.question_templates enable trigger update_question_templates_updated_at;

	insert into public.question_template_points (template_id, point_id) values (v_modele, v_point);

	-- ---- 4. Vérification ------------------------------------------------------------
	if not exists (select 1 from public.question_templates
	                where id = v_modele and classification_node_id = v_noeud)
	   or (select count(*) from public.question_template_points where template_id = v_modele) <> 1
	   or not exists (select 1 from public.question_template_points
	                   where template_id = v_modele and point_id = v_point) then
		raise exception 'rangement incohérent après écriture';
	end if;
end $rangement$;
