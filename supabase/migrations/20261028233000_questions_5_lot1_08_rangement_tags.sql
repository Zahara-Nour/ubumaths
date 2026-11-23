-- ============================================================================
-- Chantier « questions-5 », lot 1 (relecture) : nœud et tag du modèle neuf 08
-- ============================================================================
--   - 5007877e (Enchaîner des opérations, niveau 2, décimaux) → 5-004, sur « Nombres et calculs >
--     Entiers : priorités opératoires » (notion, nœud du point).
-- Le modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag hors
-- du nœud du point) et porte UN point (ADR 0020). Ni le contenu, ni le niveau, ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Relecture de David du 2026-10-28 (page à cocher du lot 1, journal docs/wip/questions-5-progress.md
-- § 9) : les variations décimales du 01 (8e571049) passent dans ce modèle neuf, de niveau 2 (#1925).
-- Créé en brouillon le 2026-10-28 par scripts/create-questions.ts, qui ne pose ni nœud ni tag.
-- Relevé de la prod du 2026-10-28 (MCP) : brouillon [5], sans nœud ni tag.
--
-- Le modèle n'existe qu'en production : en base locale, la migration ne le touche pas et ses
-- vérifications le tolèrent. Elle est prouvée par tests/integration/questions-5-lot1-08-rangement-tags.test.ts,
-- qui fabrique une copie de l'identifiant de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : le modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-28), sinon un
-- rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu STRICTEMENT,
-- et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèle neuf, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillon : admin seul). Aucune règle ne change.
--
-- Rollback (aucune donnée d'élève). Il retire le tag et rend le modèle sans nœud. Bloc éprouvé par
-- le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou
-- l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('5007877e-3abe-4cbf-ba69-0d48e78b31b3'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('5007877e-3abe-4cbf-ba69-0d48e78b31b3'::uuid, '5-004')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '5' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('5007877e-3abe-4cbf-ba69-0d48e78b31b3');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q5l1b_modeles;
create temporary table _q5l1b_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _q5l1b_modeles values
	('5007877e-3abe-4cbf-ba69-0d48e78b31b3', 'Nombres et calculs', 'Entiers : priorités opératoires', null, '5-004');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q5l1b_modeles order by id;
select 1 from public.question_templates where id in (select id from _q5l1b_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _q5l1b_modeles add column noeud uuid, add column point_id uuid;
update _q5l1b_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _q5l1b_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q5l1b_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '5' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q5l1b_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q5l1b_modeles where noeud is null),
			(select count(*) from _q5l1b_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _q5l1b_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 1) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 1', v_presents;
	end if;
	select count(*) into v_ranges from _q5l1b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q5l1b_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q5l1b_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q5l1b_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q5l1b_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q5l1b_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _q5l1b_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q5l1b_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _q5l1b_modeles;
