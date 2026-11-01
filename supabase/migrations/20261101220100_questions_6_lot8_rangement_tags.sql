-- ============================================================================
-- Chantier « questions-6 », lot 8 « Assemblages de cubes » : nœud et tag de 5 brouillons
-- ============================================================================
-- Les 5 brouillons neufs (sans nœud ni tag) de la phase 0 (§ 20) vont sur le nœud de leur point.
-- Ces points sont rangés sur une NOTION (pas sur une sous-notion) : le nœud est la notion.
--   - ce3c4e11 (01, Compter les cubes d'un assemblage) : 6-209, « Géométrie > Solides » ;
--   - 763d1183 (02, Dessiner une vue d'un assemblage de cubes) : 6-181, même nœud ;
--   - 37c6852c (03, Retrouver un assemblage de cubes d'après ses vues) : 6-208, même nœud ;
--   - 650dcfc6 (04, Volume d'un assemblage de cubes) : 6-155, « Grandeurs et mesures > Volumes » ;
--   - 0464c3f6 (05, Comparer les volumes de deux assemblages de cubes) : 6-154, même nœud.
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point) et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni le niveau, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décisions de David le 2026-11-01 (journal docs/wip/questions-6-progress.md § 20, « je valide »).
-- Les 5 brouillons ont été créés le 2026-11-01 par scripts/create-questions.ts
-- (scripts/questions/6-assemblages-cubes/, lancé par David), qui ne pose ni nœud ni tag. Relevé de
-- la prod (MCP, 2026-11-01) : 5 brouillons, niveaux [6], sans nœud, sans tag ; les 5 points actifs,
-- sur les notions ci-dessus (notions actives, sous des branches racines).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (5 modèles). Elle est prouvée par
-- tests/integration/questions-6-lot8-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (état relevé) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore sans nœud, en 6e, en brouillon, et ne porter aucun tag,
-- sinon une saisie faite depuis serait écrasée. Nœud désigné par son chemin, résolu STRICTEMENT,
-- et qui doit être celui du point.
--
-- Données d'élèves : aucune (brouillons neufs).
--
-- Accès (question tranchée par David le 2026-11-01, phase 0 du § 20) : personne ne gagne de
-- lecture ; les 5 brouillons restent visibles des seuls admin et auteur jusqu'à leur publication.
-- Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 5 tags et rend les 5 brouillons sans nœud.
-- Garde : il refuse si un modèle n'est plus en 6e, rangé, en brouillon, avec son seul tag (une
-- saisie faite depuis serait écrasée en silence). Bloc éprouvé par le test d'intégration, à jouer
-- dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('0464c3f6-3b73-49fb-8af2-576574fcaa87'::uuid),
--                ('37c6852c-1408-45d1-95b5-5e2e31530de3'::uuid),
--                ('650dcfc6-19f5-40a5-a9a1-13d3e657d60f'::uuid),
--                ('763d1183-65e9-497f-9cd6-84ccadf32802'::uuid),
--                ('ce3c4e11-d2ac-4b56-bf45-58211f085be9'::uuid)) as r(id)
--  order by r.id;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_tags integer;
-- begin
-- 	perform 1 from public.question_templates where id in ('0464c3f6-3b73-49fb-8af2-576574fcaa87', '37c6852c-1408-45d1-95b5-5e2e31530de3', '650dcfc6-19f5-40a5-a9a1-13d3e657d60f', '763d1183-65e9-497f-9cd6-84ccadf32802', 'ce3c4e11-d2ac-4b56-bf45-58211f085be9') order by id for update;
-- 	-- Intact, modèle par modèle : en 6e, en brouillon, sur le nœud de SON point, et ce point pour seul tag
-- 	select count(*), count(*) filter (where q.grades = array['6'] and q.status = 'draft'
-- 	                                     and q.classification_node_id = p.node_id
-- 	                                     and (select count(*) from public.question_template_points t where t.template_id = q.id) = 1
-- 	                                     and exists (select 1 from public.question_template_points t
-- 	                                                  where t.template_id = q.id and t.point_id = p.id))
-- 	  into v_presents, v_intacts
-- 	  from (values
-- 	        ('ce3c4e11-d2ac-4b56-bf45-58211f085be9'::uuid, '6-209'),
-- 	        ('763d1183-65e9-497f-9cd6-84ccadf32802'::uuid, '6-181'),
-- 	        ('37c6852c-1408-45d1-95b5-5e2e31530de3'::uuid, '6-208'),
-- 	        ('650dcfc6-19f5-40a5-a9a1-13d3e657d60f'::uuid, '6-155'),
-- 	        ('0464c3f6-3b73-49fb-8af2-576574fcaa87'::uuid, '6-154')
-- 	       ) as r(id, code)
-- 	  join public.question_templates q on q.id = r.id
-- 	  left join public.curriculum_points p on p.grade = '6' and p.code = r.code and p.archived_at is null;
-- 	select count(*) into v_tags from public.question_template_points
-- 	 where template_id in ('0464c3f6-3b73-49fb-8af2-576574fcaa87', '37c6852c-1408-45d1-95b5-5e2e31530de3', '650dcfc6-19f5-40a5-a9a1-13d3e657d60f', '763d1183-65e9-497f-9cd6-84ccadf32802', 'ce3c4e11-d2ac-4b56-bf45-58211f085be9');
-- 	if v_intacts <> v_presents or v_tags <> v_presents then
-- 		raise exception 'rollback : état changé depuis la migration (% intact(s) sur %, % tag(s))', v_intacts, v_presents, v_tags;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('ce3c4e11-d2ac-4b56-bf45-58211f085be9'::uuid, '6-209'),
-- 	('763d1183-65e9-497f-9cd6-84ccadf32802'::uuid, '6-181'),
-- 	('37c6852c-1408-45d1-95b5-5e2e31530de3'::uuid, '6-208'),
-- 	('650dcfc6-19f5-40a5-a9a1-13d3e657d60f'::uuid, '6-155'),
-- 	('0464c3f6-3b73-49fb-8af2-576574fcaa87'::uuid, '6-154')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '6' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('ce3c4e11-d2ac-4b56-bf45-58211f085be9',
--              '763d1183-65e9-497f-9cd6-84ccadf32802',
--              '37c6852c-1408-45d1-95b5-5e2e31530de3',
--              '650dcfc6-19f5-40a5-a9a1-13d3e657d60f',
--              '0464c3f6-3b73-49fb-8af2-576574fcaa87');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` envoie le fichier sans `begin` explicite, et LOCK TABLE
-- y est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne. Après `db:migrate`,
-- relire que le trigger update_question_templates_updated_at est réactivé (`tgenabled = 'O'`).
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q6l8_modeles;
create temporary table _q6l8_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	code text not null
);
insert into _q6l8_modeles values
	('ce3c4e11-d2ac-4b56-bf45-58211f085be9', 'Géométrie', 'Solides', '6-209'),
	('763d1183-65e9-497f-9cd6-84ccadf32802', 'Géométrie', 'Solides', '6-181'),
	('37c6852c-1408-45d1-95b5-5e2e31530de3', 'Géométrie', 'Solides', '6-208'),
	('650dcfc6-19f5-40a5-a9a1-13d3e657d60f', 'Grandeurs et mesures', 'Volumes', '6-155'),
	('0464c3f6-3b73-49fb-8af2-576574fcaa87', 'Grandeurs et mesures', 'Volumes', '6-154');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q6l8_modeles order by id;
select 1 from public.question_templates where id in (select id from _q6l8_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion désignée (sous une branche racine), et doit être celui du point
alter table _q6l8_modeles add column noeud uuid, add column point_id uuid;
update _q6l8_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion;
update _q6l8_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '6' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q6l8_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q6l8_modeles where noeud is null),
			(select count(*) from _q6l8_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, en 6e, brouillon, aucun tag -----------
do $garde$
declare v_presents integer; v_ranges integer; v_niveaux integer; v_statuts integer; v_tags integer;
begin
	select count(*) into v_presents from _q6l8_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 5) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 5', v_presents;
	end if;
	select count(*) into v_ranges from _q6l8_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_niveaux from _q6l8_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from array['6'];
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _q6l8_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from 'draft';
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q6l8_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q6l8_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q6l8_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q6l8_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q6l8_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _q6l8_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q6l8_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _q6l8_modeles;
