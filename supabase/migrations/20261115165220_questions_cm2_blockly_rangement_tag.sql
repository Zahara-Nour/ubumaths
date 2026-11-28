-- ============================================================================
-- Chantier « blockly », lot du CM2 (programme de calcul en blocs) : nœud et tag d'un modèle neuf
-- ============================================================================
--   - 42881663 (Programme de calcul pour un résultat donné) → CM2-152, sur
--     « Algèbre > Premiers pas algébriques > programmes de calcul ».
-- Le modèle va sur le nœud de son point (la sous-notion « programmes de calcul ») et porte UN point
-- (ADR 0020 : au plus un point par programme). Ni le contenu, ni les niveaux (écrits à la
-- création), ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Rangement relevé dans le journal docs/wip/blockly-progress.md § Lot CM2. Le modèle a été créé
-- en brouillon par David le 2026-11-15 avec scripts/create-questions.ts
-- (scripts/questions/CM2-blockly/, #2685), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-15 (MCP) : brouillon en {CM2}, sans nœud ni tag ; CM2-152 sur la sous-notion
-- « Algèbre > Premiers pas algébriques > programmes de calcul » (kinds branch > notion > subnotion).
--
-- Le modèle n'existe qu'en production : en base locale, la migration ne touche aucun modèle et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN. Elle est prouvée par
-- tests/integration/questions-cm2-blockly-rangement-tag.test.ts, qui fabrique une copie de
-- l'identifiant de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : le modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-15), sinon un
-- rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu STRICTEMENT,
-- et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèle neuf, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question d'accès des lots Blockly, journal
-- § Premiers modèles : « rien de neuf (rattachement de modèles à un nœud et à un point) », David le
-- 2026-11-14). Aucune règle ne change. Effet visible : le brouillon apparaît sous son nœud et sous
-- son point dans l'admin ; les élèves ne le voient qu'une fois publié par David.
--
-- Rollback (aucune donnée d'élève). Il retire le tag et rend le modèle sans nœud. Bloc éprouvé par
-- le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou
-- l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || '42881663-80b3-4ef0-95cb-343a5bd55fbf', 0));
-- delete from public.question_template_points q
--  using public.curriculum_points p
--  where q.template_id = '42881663-80b3-4ef0-95cb-343a5bd55fbf' and p.id = q.point_id
--    and p.grade = 'CM2' and p.code = 'CM2-152';
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id = '42881663-80b3-4ef0-95cb-343a5bd55fbf';
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qcm2b_modeles;
create temporary table _qcm2b_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null,
	-- sous-notions que la notion a le droit d'avoir quand le modèle va sur ELLE (sans objet ici :
	-- le modèle va sur une sous-notion)
	sous_notions_admises text[]
);
insert into _qcm2b_modeles values
	('42881663-80b3-4ef0-95cb-343a5bd55fbf', 'Algèbre', 'Premiers pas algébriques', 'programmes de calcul', 'CM2-152', null);

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm2b_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm2b_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qcm2b_modeles add column noeud uuid, add column point_id uuid;
update _qcm2b_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qcm2b_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qcm2b_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CM2' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qcm2b_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qcm2b_modeles where noeud is null),
			(select count(*) from _qcm2b_modeles where point_id is null);
	end if;
	if exists (select 1 from _qcm2b_modeles r
	            join public.classification_nodes s on s.parent_id = r.noeud
	             and s.kind = 'subnotion' and s.archived_at is null
	           where r.sous_notion is null
	             and s.name <> all (coalesce(r.sous_notions_admises, '{}'))) then
		raise exception 'notion visée sans sous-notion, mais elle en a une non admise';
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm2b_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 1) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 1', v_presents;
	end if;
	select count(*) into v_ranges from _qcm2b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcm2b_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qcm2b_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qcm2b_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm2b_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm2b_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qcm2b_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm2b_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qcm2b_modeles;
