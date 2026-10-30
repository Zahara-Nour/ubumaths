-- ============================================================================
-- Chantier « questions-6 », lot 6b « Grandeurs et probabilités » : nœud et tag de 7 brouillons
-- ============================================================================
-- Les 7 brouillons neufs (sans nœud ni tag), M7 à M13 de la phase 0, vont sur le nœud de leur point :
--   - 4343af4c (07, M7), ccb4f5e5 (08, M8), cfb4c692 (09, M9) : 6-145, 6-146, 6-147,
--     « Grandeurs et mesures > Périmètres > disque » ;
--   - 5db370fc (10, M10) : 6-153, « Grandeurs et mesures > Volumes > conversions » ;
--   - ffca5b4a (11, M11) : 6-156, « Grandeurs et mesures > Durées > conversions » ;
--   - ee82f057 (12, M12) : 6-158, « Grandeurs et mesures > Durées > calcul de durées » ;
--   - 78dcb478 (13, M13) : 6-186, « Probabilités > Expériences aléatoires > probabilité simple ».
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point) et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni le niveau, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décisions de David le 2026-10-29 (journal docs/wip/questions-6-progress.md § 13, « je valide »).
-- Les 7 brouillons ont été créés le 2026-10-30 par scripts/create-questions.ts
-- (scripts/questions/6-grandeurs/, lancé par David), qui ne pose ni nœud ni tag. Relevé de la prod
-- (MCP, 2026-10-30) : 7 brouillons, niveaux [6], sans nœud, sans tag ; les 7 points actifs, sur
-- les nœuds ci-dessus.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-6-lot6b-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (état relevé) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore sans nœud, en 6e, en brouillon, et ne porter aucun tag,
-- sinon une saisie faite depuis serait écrasée. Nœud désigné par son chemin, résolu STRICTEMENT,
-- et qui doit être celui du point.
--
-- Données d'élèves : aucune (brouillons neufs).
--
-- Accès (question tranchée par David le 2026-10-29, phase 0 du § 13) : personne ne gagne de
-- lecture ; les 7 brouillons restent visibles des seuls admin et auteur jusqu'à leur publication.
-- Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les 7 brouillons sans nœud.
-- Garde : il refuse si un modèle n'est plus en 6e, rangé, en brouillon, avec son seul tag (une
-- saisie faite depuis serait écrasée en silence). Bloc éprouvé par le test d'intégration, à jouer
-- dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('4343af4c-1549-4eb3-8471-8fd3f9233c38'::uuid),
--                ('5db370fc-6573-4398-aaee-7014947e25b9'::uuid),
--                ('78dcb478-bcde-4234-99bf-4f396d1511e6'::uuid),
--                ('ccb4f5e5-3494-4447-9f6a-3bc3b3622eab'::uuid),
--                ('cfb4c692-04d8-4cd9-9849-3b5cb94628e5'::uuid),
--                ('ee82f057-9b6a-46e6-9892-ca2f9578dd9d'::uuid),
--                ('ffca5b4a-cb8d-43c2-979e-fb7956046032'::uuid)) as r(id)
--  order by r.id;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_tags integer;
-- begin
-- 	perform 1 from public.question_templates where id in ('4343af4c-1549-4eb3-8471-8fd3f9233c38', '5db370fc-6573-4398-aaee-7014947e25b9', '78dcb478-bcde-4234-99bf-4f396d1511e6', 'ccb4f5e5-3494-4447-9f6a-3bc3b3622eab', 'cfb4c692-04d8-4cd9-9849-3b5cb94628e5', 'ee82f057-9b6a-46e6-9892-ca2f9578dd9d', 'ffca5b4a-cb8d-43c2-979e-fb7956046032') order by id for update;
-- 	-- Intact, modèle par modèle : en 6e, en brouillon, sur le nœud de SON point, et ce point pour seul tag
-- 	select count(*), count(*) filter (where q.grades = array['6'] and q.status = 'draft'
-- 	                                     and q.classification_node_id = p.node_id
-- 	                                     and (select count(*) from public.question_template_points t where t.template_id = q.id) = 1
-- 	                                     and exists (select 1 from public.question_template_points t
-- 	                                                  where t.template_id = q.id and t.point_id = p.id))
-- 	  into v_presents, v_intacts
-- 	  from (values
-- 	        ('4343af4c-1549-4eb3-8471-8fd3f9233c38'::uuid, '6-145'),
-- 	        ('ccb4f5e5-3494-4447-9f6a-3bc3b3622eab'::uuid, '6-146'),
-- 	        ('cfb4c692-04d8-4cd9-9849-3b5cb94628e5'::uuid, '6-147'),
-- 	        ('5db370fc-6573-4398-aaee-7014947e25b9'::uuid, '6-153'),
-- 	        ('ffca5b4a-cb8d-43c2-979e-fb7956046032'::uuid, '6-156'),
-- 	        ('ee82f057-9b6a-46e6-9892-ca2f9578dd9d'::uuid, '6-158'),
-- 	        ('78dcb478-bcde-4234-99bf-4f396d1511e6'::uuid, '6-186')
-- 	       ) as r(id, code)
-- 	  join public.question_templates q on q.id = r.id
-- 	  left join public.curriculum_points p on p.grade = '6' and p.code = r.code and p.archived_at is null;
-- 	select count(*) into v_tags from public.question_template_points
-- 	 where template_id in ('4343af4c-1549-4eb3-8471-8fd3f9233c38', '5db370fc-6573-4398-aaee-7014947e25b9', '78dcb478-bcde-4234-99bf-4f396d1511e6', 'ccb4f5e5-3494-4447-9f6a-3bc3b3622eab', 'cfb4c692-04d8-4cd9-9849-3b5cb94628e5', 'ee82f057-9b6a-46e6-9892-ca2f9578dd9d', 'ffca5b4a-cb8d-43c2-979e-fb7956046032');
-- 	if v_intacts <> v_presents or v_tags <> v_presents then
-- 		raise exception 'rollback : état changé depuis la migration (% intact(s) sur %, % tag(s))', v_intacts, v_presents, v_tags;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('4343af4c-1549-4eb3-8471-8fd3f9233c38'::uuid, '6-145'),
-- 	('ccb4f5e5-3494-4447-9f6a-3bc3b3622eab'::uuid, '6-146'),
-- 	('cfb4c692-04d8-4cd9-9849-3b5cb94628e5'::uuid, '6-147'),
-- 	('5db370fc-6573-4398-aaee-7014947e25b9'::uuid, '6-153'),
-- 	('ffca5b4a-cb8d-43c2-979e-fb7956046032'::uuid, '6-156'),
-- 	('ee82f057-9b6a-46e6-9892-ca2f9578dd9d'::uuid, '6-158'),
-- 	('78dcb478-bcde-4234-99bf-4f396d1511e6'::uuid, '6-186')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '6' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('4343af4c-1549-4eb3-8471-8fd3f9233c38',
--              'ccb4f5e5-3494-4447-9f6a-3bc3b3622eab',
--              'cfb4c692-04d8-4cd9-9849-3b5cb94628e5',
--              '5db370fc-6573-4398-aaee-7014947e25b9',
--              'ffca5b4a-cb8d-43c2-979e-fb7956046032',
--              'ee82f057-9b6a-46e6-9892-ca2f9578dd9d',
--              '78dcb478-bcde-4234-99bf-4f396d1511e6');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` envoie le fichier sans `begin` explicite, et LOCK TABLE
-- y est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne. Après `db:migrate`,
-- relire que le trigger update_question_templates_updated_at est réactivé (`tgenabled = 'O'`).
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q6b_modeles;
create temporary table _q6b_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null,
	code text not null
);
insert into _q6b_modeles values
	('4343af4c-1549-4eb3-8471-8fd3f9233c38', 'Grandeurs et mesures', 'Périmètres', 'disque', '6-145'),
	('ccb4f5e5-3494-4447-9f6a-3bc3b3622eab', 'Grandeurs et mesures', 'Périmètres', 'disque', '6-146'),
	('cfb4c692-04d8-4cd9-9849-3b5cb94628e5', 'Grandeurs et mesures', 'Périmètres', 'disque', '6-147'),
	('5db370fc-6573-4398-aaee-7014947e25b9', 'Grandeurs et mesures', 'Volumes', 'conversions', '6-153'),
	('ffca5b4a-cb8d-43c2-979e-fb7956046032', 'Grandeurs et mesures', 'Durées', 'conversions', '6-156'),
	('ee82f057-9b6a-46e6-9892-ca2f9578dd9d', 'Grandeurs et mesures', 'Durées', 'calcul de durées', '6-158'),
	('78dcb478-bcde-4234-99bf-4f396d1511e6', 'Probabilités', 'Expériences aléatoires', 'probabilité simple', '6-186');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q6b_modeles order by id;
select 1 from public.question_templates where id in (select id from _q6b_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la sous-notion désignée, et doit être celui du point
alter table _q6b_modeles add column noeud uuid, add column point_id uuid;
update _q6b_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q6b_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '6' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q6b_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q6b_modeles where noeud is null),
			(select count(*) from _q6b_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, en 6e, brouillon, aucun tag -----------
do $garde$
declare v_presents integer; v_ranges integer; v_niveaux integer; v_statuts integer; v_tags integer;
begin
	select count(*) into v_presents from _q6b_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
	end if;
	select count(*) into v_ranges from _q6b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_niveaux from _q6b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from array['6'];
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _q6b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from 'draft';
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q6b_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q6b_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q6b_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q6b_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q6b_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _q6b_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q6b_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _q6b_modeles;
