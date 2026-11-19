-- ============================================================================
-- Chantier « questions-6 », lot 11b « Triangles, symétrie, périmètres » : nœud et tag de 7 brouillons
-- ============================================================================
-- Les 7 brouillons neufs (sans nœud ni tag) de la phase 0 (§ 26) vont sur le nœud de leur point :
--   - e4b77481 (07, Les angles des triangles particuliers) : 6-174, « Géométrie > Figures planes > triangles » ;
--   - 4e98c2d6 (08, La somme des angles d'un triangle) : 6-175, « Géométrie > Figures planes > triangles » ;
--   - 7a3e2bc9 (09, Calculer un angle d'un triangle) : 6-176, « Géométrie > Figures planes > triangles » ;
--   - c199bf10 (10, Les médiatrices d'un triangle sont concourantes) : 6-177, « Géométrie > Figures planes > triangles » ;
--   - ec11ca90 (11, Le cercle circonscrit à un triangle) : 6-178, « Géométrie > Figures planes > triangles » ;
--   - 9e83ea34 (12, Le symétrique d'un point par rapport à une droite) : 6-179, « Géométrie > Symétrie axiale » (NOTION seule) ;
--   - 60f165a8 (13, Périmètres de figures composées) : 6-148, « Grandeurs et mesures > Périmètres » (NOTION seule) ;
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point) et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni le niveau, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décisions de David le 2026-11-09 (journal docs/wip/questions-6-progress.md § 26, « je suis tes recos »).
-- Les 7 brouillons ont été créés le 2026-11-12 par scripts/create-questions.ts
-- (scripts/questions/6-triangles-symetrie-perimetres/, lancé par David), qui ne pose ni nœud ni tag.
-- Relevé de la prod (MCP, 2026-11-12) : 7 brouillons, niveaux [6], sans nœud, sans tag ; les 7
-- points actifs, sur les nœuds ci-dessus (actifs, sous les branches racines Géométrie et
-- Grandeurs et mesures).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-6-lot11b-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (état relevé) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore sans nœud, en 6e, en brouillon, et ne porter aucun tag,
-- sinon une saisie faite depuis serait écrasée. Nœud désigné par son chemin, résolu STRICTEMENT,
-- et qui doit être celui du point.
--
-- Données d'élèves : aucune (brouillons neufs).
--
-- Accès (question tranchée par David le 2026-11-09, phase 0 du § 26) : personne ne gagne de
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
--   from (values ('4e98c2d6-fa1b-4458-861c-2cd64d97f52e'::uuid),
--                ('60f165a8-3aba-4983-95c0-6b92b0cc6257'::uuid),
--                ('7a3e2bc9-bdcc-41b0-b54d-86061d0cba1d'::uuid),
--                ('9e83ea34-494f-4fd5-b270-8e5f3d087d1d'::uuid),
--                ('c199bf10-42bc-4b5d-b0d9-2ed669da614b'::uuid),
--                ('e4b77481-eacd-43f6-bf5a-6d7e37057a79'::uuid),
--                ('ec11ca90-97a1-43b3-b36f-65a0e2f17fc8'::uuid)) as r(id)
--  order by r.id;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_tags integer;
-- begin
-- 	perform 1 from public.question_templates where id in ('4e98c2d6-fa1b-4458-861c-2cd64d97f52e', '60f165a8-3aba-4983-95c0-6b92b0cc6257', '7a3e2bc9-bdcc-41b0-b54d-86061d0cba1d', '9e83ea34-494f-4fd5-b270-8e5f3d087d1d', 'c199bf10-42bc-4b5d-b0d9-2ed669da614b', 'e4b77481-eacd-43f6-bf5a-6d7e37057a79', 'ec11ca90-97a1-43b3-b36f-65a0e2f17fc8') order by id for update;
-- 	-- Intact, modèle par modèle : en 6e, en brouillon, sur le nœud de SON point, et ce point pour seul tag
-- 	select count(*), count(*) filter (where q.grades = array['6'] and q.status = 'draft'
-- 	                                     and q.classification_node_id = p.node_id
-- 	                                     and (select count(*) from public.question_template_points t where t.template_id = q.id) = 1
-- 	                                     and exists (select 1 from public.question_template_points t
-- 	                                                  where t.template_id = q.id and t.point_id = p.id))
-- 	  into v_presents, v_intacts
-- 	  from (values
-- 	        ('e4b77481-eacd-43f6-bf5a-6d7e37057a79'::uuid, '6-174'),
-- 	        ('4e98c2d6-fa1b-4458-861c-2cd64d97f52e'::uuid, '6-175'),
-- 	        ('7a3e2bc9-bdcc-41b0-b54d-86061d0cba1d'::uuid, '6-176'),
-- 	        ('c199bf10-42bc-4b5d-b0d9-2ed669da614b'::uuid, '6-177'),
-- 	        ('ec11ca90-97a1-43b3-b36f-65a0e2f17fc8'::uuid, '6-178'),
-- 	        ('9e83ea34-494f-4fd5-b270-8e5f3d087d1d'::uuid, '6-179'),
-- 	        ('60f165a8-3aba-4983-95c0-6b92b0cc6257'::uuid, '6-148')
-- 	       ) as r(id, code)
-- 	  join public.question_templates q on q.id = r.id
-- 	  left join public.curriculum_points p on p.grade = '6' and p.code = r.code and p.archived_at is null;
-- 	select count(*) into v_tags from public.question_template_points
-- 	 where template_id in ('4e98c2d6-fa1b-4458-861c-2cd64d97f52e', '60f165a8-3aba-4983-95c0-6b92b0cc6257', '7a3e2bc9-bdcc-41b0-b54d-86061d0cba1d', '9e83ea34-494f-4fd5-b270-8e5f3d087d1d', 'c199bf10-42bc-4b5d-b0d9-2ed669da614b', 'e4b77481-eacd-43f6-bf5a-6d7e37057a79', 'ec11ca90-97a1-43b3-b36f-65a0e2f17fc8');
-- 	if v_intacts <> v_presents or v_tags <> v_presents then
-- 		raise exception 'rollback : état changé depuis la migration (% intact(s) sur %, % tag(s))', v_intacts, v_presents, v_tags;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('e4b77481-eacd-43f6-bf5a-6d7e37057a79'::uuid, '6-174'),
-- 	('4e98c2d6-fa1b-4458-861c-2cd64d97f52e'::uuid, '6-175'),
-- 	('7a3e2bc9-bdcc-41b0-b54d-86061d0cba1d'::uuid, '6-176'),
-- 	('c199bf10-42bc-4b5d-b0d9-2ed669da614b'::uuid, '6-177'),
-- 	('ec11ca90-97a1-43b3-b36f-65a0e2f17fc8'::uuid, '6-178'),
-- 	('9e83ea34-494f-4fd5-b270-8e5f3d087d1d'::uuid, '6-179'),
-- 	('60f165a8-3aba-4983-95c0-6b92b0cc6257'::uuid, '6-148')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '6' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('4e98c2d6-fa1b-4458-861c-2cd64d97f52e', '60f165a8-3aba-4983-95c0-6b92b0cc6257', '7a3e2bc9-bdcc-41b0-b54d-86061d0cba1d', '9e83ea34-494f-4fd5-b270-8e5f3d087d1d', 'c199bf10-42bc-4b5d-b0d9-2ed669da614b', 'e4b77481-eacd-43f6-bf5a-6d7e37057a79', 'ec11ca90-97a1-43b3-b36f-65a0e2f17fc8');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` envoie le fichier sans `begin` explicite, et LOCK TABLE
-- y est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne. Après `db:migrate`,
-- relire que le trigger update_question_templates_updated_at est réactivé (`tgenabled = 'O'`).
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
-- 6-179 et 6-148 sont sur une NOTION (sous_notion null), les 5 autres sur la sous-notion « triangles ».
drop table if exists pg_temp._q6l11b_modeles;
create temporary table _q6l11b_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _q6l11b_modeles values
	('e4b77481-eacd-43f6-bf5a-6d7e37057a79', 'Géométrie', 'Figures planes', 'triangles', '6-174'),
	('4e98c2d6-fa1b-4458-861c-2cd64d97f52e', 'Géométrie', 'Figures planes', 'triangles', '6-175'),
	('7a3e2bc9-bdcc-41b0-b54d-86061d0cba1d', 'Géométrie', 'Figures planes', 'triangles', '6-176'),
	('c199bf10-42bc-4b5d-b0d9-2ed669da614b', 'Géométrie', 'Figures planes', 'triangles', '6-177'),
	('ec11ca90-97a1-43b3-b36f-65a0e2f17fc8', 'Géométrie', 'Figures planes', 'triangles', '6-178'),
	('9e83ea34-494f-4fd5-b270-8e5f3d087d1d', 'Géométrie', 'Symétrie axiale', null, '6-179'),
	('60f165a8-3aba-4983-95c0-6b92b0cc6257', 'Grandeurs et mesures', 'Périmètres', null, '6-148');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q6l11b_modeles order by id;
select 1 from public.question_templates where id in (select id from _q6l11b_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion désignée (sous une branche racine), ou sa sous-notion désignée, et doit
-- être celui du point
alter table _q6l11b_modeles add column noeud uuid, add column point_id uuid;
update _q6l11b_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _q6l11b_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q6l11b_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '6' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q6l11b_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q6l11b_modeles where noeud is null),
			(select count(*) from _q6l11b_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, en 6e, brouillon, aucun tag -----------
do $garde$
declare v_presents integer; v_ranges integer; v_niveaux integer; v_statuts integer; v_tags integer;
begin
	select count(*) into v_presents from _q6l11b_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
	end if;
	select count(*) into v_ranges from _q6l11b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_niveaux from _q6l11b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from array['6'];
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _q6l11b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from 'draft';
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q6l11b_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q6l11b_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q6l11b_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q6l11b_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q6l11b_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _q6l11b_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q6l11b_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _q6l11b_modeles;
