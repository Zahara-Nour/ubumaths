-- ============================================================================
-- Chantiers « questions-ce1 » (lot 9) et CP : « Trois points alignés ? Vérifie à la règle »
-- passe au CP ET au CE1, rangé et tagué CP-058 et CE1-073
-- ============================================================================
--   - a7dfe502 (Trois points alignés ? Vérifie à la règle), brouillon écrit pour CP-058 (chantier
--     geometrie-validation, PR 5, 2026-10-26), resté sans nœud ni tag : niveaux {CP} → {CP, CE1},
--     nœud « Géométrie > Figures planes > propriétés » (celui de CP-058 ET de CE1-073), tags
--     CP-058 et CE1-073 (ADR 0020 : un point par programme, ici deux programmes).
-- Ni le contenu, ni la catégorie, ni le niveau dans la catégorie (Tracés / Droites, 1), ni le
-- statut ne changent : `updated_at` est PRÉSERVÉ. Le fichier
-- scripts/questions/cp-figure/03-points-alignes.json porte les mêmes niveaux ({CP, CE1}), pour
-- que create-questions le trouve identique.
-- ============================================================================
-- Décision de David le 2026-11-01 (journal docs/wip/questions-ce1-progress.md § 16, question 5
-- reposée : le modèle était celui de CP-058, pas un orphelin ; réponse « CP et CE1 »).
--
-- Le modèle n'existe qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent. Elle est prouvée par
-- tests/integration/questions-cp-ce1-alignes-rangement-tags.test.ts, qui fabrique une copie de
-- l'identifiant de la prod (au CP, sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : le modèle doit être encore en BROUILLON, au CP seul, SANS nœud et SANS aucun tag
-- (relevé MCP du 2026-11-01), sinon une saisie faite depuis serait écrasée. Nœud désigné par son
-- chemin, résolu STRICTEMENT, et qui doit être celui des DEUX points.
--
-- Données d'élèves : aucune (brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-11-01 en phase 0
-- (§ 16), AVANT le SQL, tranchée par lui le 2026-11-01 : personne). Aucune règle ne change. Effet
-- visible : le brouillon apparaît sous son nœud et sous ses deux points dans l'admin ; les élèves
-- ne le voient qu'une fois publié par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 2 tags, rend le modèle sans nœud et au CP seul.
-- Garde : il refuse si le modèle n'est plus en brouillon ou n'est plus aux niveaux posés par la
-- migration. Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:a7dfe502-4af3-4130-8f88-3d8ab14bf91b', 0));
-- do $garde$
-- begin
-- 	if exists (select 1 from public.question_templates
-- 	            where id = 'a7dfe502-4af3-4130-8f88-3d8ab14bf91b'
-- 	              and (status <> 'draft' or not (grades @> array['CP','CE1'] and array['CP','CE1'] @> grades))) then
-- 		raise exception 'rollback refusé : modèle publié ou niveaux changés depuis la migration';
-- 	end if;
-- end $garde$;
-- delete from public.question_template_points q
--  using public.curriculum_points p
--  where q.template_id = 'a7dfe502-4af3-4130-8f88-3d8ab14bf91b' and p.id = q.point_id
--    and ((p.grade = 'CP' and p.code = 'CP-058') or (p.grade = 'CE1' and p.code = 'CE1-073'));
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null, grades = array['CP']
--  where id = 'a7dfe502-4af3-4130-8f88-3d8ab14bf91b';
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris ligne par ligne.
set local lock_timeout = '5s';

select pg_advisory_xact_lock(hashtextextended('question_template_points:a7dfe502-4af3-4130-8f88-3d8ab14bf91b', 0));
select 1 from public.question_templates where id = 'a7dfe502-4af3-4130-8f88-3d8ab14bf91b' for update;

-- ---- 1. Résolution STRICTE du nœud et des deux points ------------------------------------
drop table if exists pg_temp._qc_alignes;
create temporary table _qc_alignes (grade text not null, code text not null, point_id uuid);
insert into _qc_alignes (grade, code) values ('CP', 'CP-058'), ('CE1', 'CE1-073');

drop table if exists pg_temp._qc_noeud;
create temporary table _qc_noeud as
select s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = 'Géométrie'
   and n.name = 'Figures planes' and s.name = 'propriétés';

update _qc_alignes r set point_id = p.id
  from public.curriculum_points p
 where p.grade = r.grade and p.code = r.code and p.archived_at is null
   and p.node_id = (select id from _qc_noeud);

do $resolution$
begin
	if (select count(*) from _qc_noeud) <> 1 then
		raise exception 'nœud « Géométrie > Figures planes > propriétés » introuvable ou ambigu : %',
			(select count(*) from _qc_noeud);
	end if;
	if exists (select 1 from _qc_alignes where point_id is null) then
		raise exception 'points introuvables sur le nœud : %',
			(select string_agg(code, ', ') from _qc_alignes where point_id is null);
	end if;
end $resolution$;

-- ---- 2. Garde : brouillon, au CP seul, sans nœud, sans aucun tag ------------------------
do $garde$
declare v_present boolean; v_ok boolean; v_tags integer;
begin
	select exists (select 1 from public.question_templates where id = 'a7dfe502-4af3-4130-8f88-3d8ab14bf91b')
	  into v_present;
	if not v_present then
		return;  -- base locale : rien à faire
	end if;
	select status = 'draft' and grades = array['CP'] and classification_node_id is null into v_ok
	  from public.question_templates where id = 'a7dfe502-4af3-4130-8f88-3d8ab14bf91b';
	if not v_ok then
		raise exception 'modèle changé depuis le relevé (statut, niveaux ou nœud)';
	end if;
	select count(*) into v_tags from public.question_template_points
	 where template_id = 'a7dfe502-4af3-4130-8f88-3d8ab14bf91b';
	if v_tags <> 0 then
		raise exception 'modèle déjà tagué depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. Niveaux et rangement, puis tags --------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates
   set grades = array['CP', 'CE1'], classification_node_id = (select id from _qc_noeud)
 where id = 'a7dfe502-4af3-4130-8f88-3d8ab14bf91b';
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select q.id, r.point_id
  from _qc_alignes r
  join public.question_templates q on q.id = 'a7dfe502-4af3-4130-8f88-3d8ab14bf91b';

-- ---- 4. Vérification : tout ou rien --------------------------------------------------------
do $check$
declare v_present integer; v_ok integer; v_tags integer;
begin
	select count(*) into v_present from public.question_templates
	 where id = 'a7dfe502-4af3-4130-8f88-3d8ab14bf91b';
	select count(*) into v_ok from public.question_templates
	 where id = 'a7dfe502-4af3-4130-8f88-3d8ab14bf91b' and grades = array['CP', 'CE1']
	   and classification_node_id = (select id from _qc_noeud);
	select count(*) into v_tags from public.question_template_points q
	  join _qc_alignes r on r.point_id = q.point_id
	 where q.template_id = 'a7dfe502-4af3-4130-8f88-3d8ab14bf91b';
	if v_ok <> v_present or v_tags <> 2 * v_present
	   or (select count(*) from public.question_template_points
	        where template_id = 'a7dfe502-4af3-4130-8f88-3d8ab14bf91b') <> 2 * v_present then
		raise exception 'état incohérent : niveaux et nœud %/%, tags %/%', v_ok, v_present, v_tags, 2 * v_present;
	end if;
end $check$;

drop table _qc_alignes;
drop table _qc_noeud;
