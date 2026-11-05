-- ============================================================================
-- Chantier « geometrie-validation » : nœud et tag du modèle CP-060 (terminer un carré ou un rectangle)
-- ============================================================================
--   - 1cf6eaa9 (« Termine le carré ou le rectangle sur le quadrillage ») → CP-060, sur
--     « Géométrie > Figures planes > constructions ».
-- Le modèle va sur la sous-notion où est déjà rangé son point (relevé de la prod du 2026-11-05 :
-- CP-060 « Construire un carré, un rectangle, un triangle… sur du papier quadrillé ou pointé » est
-- sur « constructions », à côté de CP-059) et porte UN point (ADR 0020).
-- Ni le contenu, ni les niveaux, ni le statut (brouillon) ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Nœud choisi par David le 2026-11-05 (recommandation suivie : « constructions » plutôt que
-- « reconnaître et nommer des formes ») ; journal docs/wip/geometrie-validation-progress.md § 14.
-- Le modèle a été rangé sous l'ancienne forme (thème / domaine / sous-domaine) jusqu'à la v0.73.0,
-- qui l'a laissé « Non rangé » (docs/archive/wip/automaths-arbre-progress.md, « Les 16 brouillons
-- sans nœud »).
--
-- Le modèle n'existe qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent. Elle est prouvée par
-- tests/integration/questions-cp060-rangement-tag.test.ts, qui fabrique une copie de
-- l'identifiant de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : le modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-05), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT ; le point doit être sur ce nœud ou sur sa notion.
--
-- Données d'élèves : aucune (modèle en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question d'accès posée le 2026-11-05, réponse de
-- David : personne). Aucune règle ne change. Effet visible : le brouillon apparaît sous son nœud
-- et sous son point dans l'admin ; les élèves ne le voient qu'une fois publié par David.
--
-- Rollback (aucune donnée d'élève). Il retire le tag et rend le modèle sans nœud. Bloc éprouvé
-- par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou
-- l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || '1cf6eaa9-376d-43a1-a3e4-eb7d18c40099', 0));
-- delete from public.question_template_points q
--  using public.curriculum_points p
--  where q.template_id = '1cf6eaa9-376d-43a1-a3e4-eb7d18c40099'
--    and p.id = q.point_id and p.grade = 'CP' and p.code = 'CP-060';
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id = '1cf6eaa9-376d-43a1-a3e4-eb7d18c40099';
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
	sous_notion text not null,
	code text not null
);
insert into _qc_modeles values
	('1cf6eaa9-376d-43a1-a3e4-eb7d18c40099', 'Géométrie', 'Figures planes', 'constructions', 'CP-060');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et la ligne du modèle.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qc_modeles order by id;
select 1 from public.question_templates where id in (select id from _qc_modeles) order by id for update;

-- ---- 2. Résolution STRICTE du chemin et du point ----------------------------------------
alter table _qc_modeles add column noeud uuid, add column point_id uuid;
update _qc_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qc_modeles r set point_id = p.id
  from public.curriculum_points p, public.classification_nodes x
 where x.id = r.noeud
   and p.grade = 'CP' and p.code = r.code and p.archived_at is null
   and p.node_id in (r.noeud, x.parent_id);
do $resolution$
begin
	if exists (select 1 from _qc_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qc_modeles where noeud is null),
			(select count(*) from _qc_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : sans nœud, sans aucun tag ----------------------------------------------
do $garde$
declare v_ranges integer; v_tags integer;
begin
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

-- ---- 4. Rangement, puis tag ----------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qc_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qc_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications ----------------------------------------------------------------
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
