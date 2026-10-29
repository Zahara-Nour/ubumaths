-- ============================================================================
-- Chantier « questions-6 », lot 6a « Pourcentages et proportionnalité » : nœud et tag de 6 brouillons
-- ============================================================================
-- Les 6 brouillons neufs (sans nœud ni tag), M1 à M6 de la phase 0, vont sur le nœud de leur point :
--   - f9e9637c (01, M1) : 6-139, « Pourcentages > définition » ;
--   - 35754c24 (02, M2) et 5c8a6da6 (03, M3) : 6-140, « Pourcentages > calculs de pourcentages » ;
--   - c26597b4 (04, M4) et d960edfb (05, M5) : 6-189,
--     « Situations de proportionnalité > caractérisation » ;
--   - 7981dab0 (06, M6) : 6-211, « Entiers : multiplication > triple et tiers ».
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point) et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni le niveau, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décisions de David le 2026-10-29 (journal docs/wip/questions-6-progress.md § 13, « je valide »),
-- dont M6 rangé sur « triple et tiers ». Les 6 brouillons ont été créés le 2026-10-29 par
-- scripts/create-questions.ts (scripts/questions/6-proportionnalite/, lancé par David), qui ne pose
-- ni nœud ni tag. Relevé de la prod (MCP, 2026-10-29) : 6 brouillons, niveaux [6], sans nœud, sans
-- tag ; les 4 points actifs, sur les nœuds ci-dessus.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée par
-- tests/integration/questions-6-lot6a-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (état relevé) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore sans nœud, en 6e, en brouillon, et ne porter aucun tag,
-- sinon une saisie faite depuis serait écrasée. Nœud désigné par son chemin, résolu STRICTEMENT,
-- et qui doit être celui du point.
--
-- Données d'élèves : aucune (brouillons neufs).
--
-- Accès (question tranchée par David le 2026-10-29) : personne ne gagne de lecture ; les 6
-- brouillons restent visibles des seuls admin et auteur jusqu'à leur publication. Aucune règle
-- (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags et rend les 6 brouillons sans nœud.
-- Garde : il refuse si un modèle n'est plus en 6e, rangé, en brouillon, avec son seul tag (une
-- saisie faite depuis serait écrasée en silence). Bloc éprouvé par le test d'intégration, à jouer
-- dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('35754c24-2abf-4c9b-bebd-17b889f33d80'::uuid),
--                ('5c8a6da6-f99b-4d61-94cc-7147605ec7c6'::uuid),
--                ('7981dab0-c1f9-4e87-961f-91be61e698dc'::uuid),
--                ('c26597b4-c2c6-463c-a5ca-b18cae5e1662'::uuid),
--                ('d960edfb-120f-44ba-a118-cfbcd629caf3'::uuid),
--                ('f9e9637c-b62f-4758-baf4-0b28de4a5dc6'::uuid)) as r(id)
--  order by r.id;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_tags integer;
-- begin
-- 	perform 1 from public.question_templates where id in ('35754c24-2abf-4c9b-bebd-17b889f33d80', '5c8a6da6-f99b-4d61-94cc-7147605ec7c6', '7981dab0-c1f9-4e87-961f-91be61e698dc', 'c26597b4-c2c6-463c-a5ca-b18cae5e1662', 'd960edfb-120f-44ba-a118-cfbcd629caf3', 'f9e9637c-b62f-4758-baf4-0b28de4a5dc6') order by id for update;
-- 	-- Intact, modèle par modèle : en 6e, en brouillon, sur le nœud de SON point, et ce point pour seul tag
-- 	select count(*), count(*) filter (where q.grades = array['6'] and q.status = 'draft'
-- 	                                     and q.classification_node_id = p.node_id
-- 	                                     and (select count(*) from public.question_template_points t where t.template_id = q.id) = 1
-- 	                                     and exists (select 1 from public.question_template_points t
-- 	                                                  where t.template_id = q.id and t.point_id = p.id))
-- 	  into v_presents, v_intacts
-- 	  from (values
-- 	        ('f9e9637c-b62f-4758-baf4-0b28de4a5dc6'::uuid, '6-139'),
-- 	        ('35754c24-2abf-4c9b-bebd-17b889f33d80'::uuid, '6-140'),
-- 	        ('5c8a6da6-f99b-4d61-94cc-7147605ec7c6'::uuid, '6-140'),
-- 	        ('c26597b4-c2c6-463c-a5ca-b18cae5e1662'::uuid, '6-189'),
-- 	        ('d960edfb-120f-44ba-a118-cfbcd629caf3'::uuid, '6-189'),
-- 	        ('7981dab0-c1f9-4e87-961f-91be61e698dc'::uuid, '6-211')
-- 	       ) as r(id, code)
-- 	  join public.question_templates q on q.id = r.id
-- 	  left join public.curriculum_points p on p.grade = '6' and p.code = r.code and p.archived_at is null;
-- 	select count(*) into v_tags from public.question_template_points
-- 	 where template_id in ('35754c24-2abf-4c9b-bebd-17b889f33d80', '5c8a6da6-f99b-4d61-94cc-7147605ec7c6', '7981dab0-c1f9-4e87-961f-91be61e698dc', 'c26597b4-c2c6-463c-a5ca-b18cae5e1662', 'd960edfb-120f-44ba-a118-cfbcd629caf3', 'f9e9637c-b62f-4758-baf4-0b28de4a5dc6');
-- 	if v_intacts <> v_presents or v_tags <> v_presents then
-- 		raise exception 'rollback : état changé depuis la migration (% intact(s) sur %, % tag(s))', v_intacts, v_presents, v_tags;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('f9e9637c-b62f-4758-baf4-0b28de4a5dc6'::uuid, '6-139'),
-- 	('35754c24-2abf-4c9b-bebd-17b889f33d80'::uuid, '6-140'),
-- 	('5c8a6da6-f99b-4d61-94cc-7147605ec7c6'::uuid, '6-140'),
-- 	('c26597b4-c2c6-463c-a5ca-b18cae5e1662'::uuid, '6-189'),
-- 	('d960edfb-120f-44ba-a118-cfbcd629caf3'::uuid, '6-189'),
-- 	('7981dab0-c1f9-4e87-961f-91be61e698dc'::uuid, '6-211')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '6' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('f9e9637c-b62f-4758-baf4-0b28de4a5dc6',
--              '35754c24-2abf-4c9b-bebd-17b889f33d80',
--              '5c8a6da6-f99b-4d61-94cc-7147605ec7c6',
--              'c26597b4-c2c6-463c-a5ca-b18cae5e1662',
--              'd960edfb-120f-44ba-a118-cfbcd629caf3',
--              '7981dab0-c1f9-4e87-961f-91be61e698dc');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` envoie le fichier sans `begin` explicite, et LOCK TABLE
-- y est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne. Après `db:migrate`,
-- relire que le trigger update_question_templates_updated_at est réactivé (`tgenabled = 'O'`).
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q6a_modeles;
create temporary table _q6a_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null,
	code text not null
);
insert into _q6a_modeles values
	('f9e9637c-b62f-4758-baf4-0b28de4a5dc6', 'Proportionnalité', 'Pourcentages', 'définition', '6-139'),
	('35754c24-2abf-4c9b-bebd-17b889f33d80', 'Proportionnalité', 'Pourcentages', 'calculs de pourcentages', '6-140'),
	('5c8a6da6-f99b-4d61-94cc-7147605ec7c6', 'Proportionnalité', 'Pourcentages', 'calculs de pourcentages', '6-140'),
	('c26597b4-c2c6-463c-a5ca-b18cae5e1662', 'Proportionnalité', 'Situations de proportionnalité', 'caractérisation', '6-189'),
	('d960edfb-120f-44ba-a118-cfbcd629caf3', 'Proportionnalité', 'Situations de proportionnalité', 'caractérisation', '6-189'),
	('7981dab0-c1f9-4e87-961f-91be61e698dc', 'Nombres et calculs', 'Entiers : multiplication', 'triple et tiers', '6-211');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q6a_modeles order by id;
select 1 from public.question_templates where id in (select id from _q6a_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la sous-notion désignée, et doit être celui du point
alter table _q6a_modeles add column noeud uuid, add column point_id uuid;
update _q6a_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q6a_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '6' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q6a_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q6a_modeles where noeud is null),
			(select count(*) from _q6a_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, en 6e, brouillon, aucun tag -----------
do $garde$
declare v_presents integer; v_ranges integer; v_niveaux integer; v_statuts integer; v_tags integer;
begin
	select count(*) into v_presents from _q6a_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	select count(*) into v_ranges from _q6a_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_niveaux from _q6a_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from array['6'];
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _q6a_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from 'draft';
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q6a_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q6a_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q6a_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q6a_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q6a_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _q6a_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q6a_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _q6a_modeles;
