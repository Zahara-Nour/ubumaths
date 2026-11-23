-- ============================================================================
-- Chantier « questions-6 », lot 5 « Scissions des fractions » : nœud et tag de 7 brouillons
-- ============================================================================
-- Les 7 brouillons neufs (sans nœud ni tag), scindés de 4 modèles publiés, vont sur le nœud et le
-- point de leur modèle d'origine :
--   - ece43e92 (11, de 02 c9c3a8a3) : 6-131, « Fractions : calculs > fraction d'une quantité » ;
--   - 5af91ef2 (12) et 53045ec4 (13), de 03 378aa770 : 6-136, « Fractions : calculs > multiplication » ;
--   - 6818662d (14), 228b1620 (15) et 259a0b26 (16), de 04 afebbb91 : 6-133,
--     « Fractions : sens et écritures > ordre » ;
--   - 2ff6e717 (17, de 08 ddf5d292) : 6-205, « Fractions : calculs > addition et soustraction ».
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point) et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni le niveau, ni le statut ne changent : `updated_at` est PRÉSERVÉ. Le contenu
-- des 4 modèles d'origine sera rétréci par une migration à part, APRÈS la publication des 7.
-- ============================================================================
-- Décisions de David le 2026-10-28 (journal docs/wip/questions-6-progress.md § 12, « je valide »).
-- Les 7 brouillons ont été créés le 2026-10-28 par scripts/create-questions.ts
-- (scripts/questions/6-fractions-scissions/, lancé par David), qui ne pose ni nœud ni tag. Relevé
-- de la prod (MCP, 2026-10-28) : 7 brouillons, niveaux [6], sans nœud, sans tag ; les 4 modèles
-- d'origine publiés, sur les nœuds et points ci-dessus.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-6-scissions-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (état relevé) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore sans nœud, en 6e, en brouillon, et ne porter aucun tag,
-- sinon une saisie faite depuis serait écrasée. Nœud désigné par son chemin, résolu STRICTEMENT,
-- et qui doit être celui du point.
--
-- Données d'élèves : aucune (brouillons neufs).
--
-- Accès (question tranchée par David le 2026-10-28) : personne ne gagne de lecture ; les 7
-- brouillons restent visibles des seuls admin et auteur jusqu'à leur publication. Aucune règle
-- (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les 7 brouillons sans nœud.
-- Garde : il refuse si un modèle n'est plus en 6e, rangé, en brouillon, avec son seul tag (une
-- saisie faite depuis serait écrasée en silence). Bloc éprouvé par le test d'intégration, à jouer
-- dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('228b1620-640c-4570-9c8f-2f3e960aca7d'::uuid),
--                ('259a0b26-9b36-4662-b1fb-13ffd0748ab6'::uuid),
--                ('2ff6e717-b714-4fca-88e4-bc866736686e'::uuid),
--                ('53045ec4-7d7d-4e66-8f5d-5829c52431e4'::uuid),
--                ('5af91ef2-4aa4-4268-8ea6-501447b01082'::uuid),
--                ('6818662d-446f-4307-8bab-235f0247545c'::uuid),
--                ('ece43e92-c87e-4ea5-b1d1-28045635996f'::uuid)) as r(id)
--  order by r.id;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_tags integer;
-- begin
-- 	perform 1 from public.question_templates where id in ('228b1620-640c-4570-9c8f-2f3e960aca7d', '259a0b26-9b36-4662-b1fb-13ffd0748ab6', '2ff6e717-b714-4fca-88e4-bc866736686e', '53045ec4-7d7d-4e66-8f5d-5829c52431e4', '5af91ef2-4aa4-4268-8ea6-501447b01082', '6818662d-446f-4307-8bab-235f0247545c', 'ece43e92-c87e-4ea5-b1d1-28045635996f') order by id for update;
-- 	-- Intact, modèle par modèle : en 6e, en brouillon, sur le nœud de SON point, et ce point pour seul tag
-- 	select count(*), count(*) filter (where q.grades = array['6'] and q.status = 'draft'
-- 	                                     and q.classification_node_id = p.node_id
-- 	                                     and (select count(*) from public.question_template_points t where t.template_id = q.id) = 1
-- 	                                     and exists (select 1 from public.question_template_points t
-- 	                                                  where t.template_id = q.id and t.point_id = p.id))
-- 	  into v_presents, v_intacts
-- 	  from (values
-- 	        ('ece43e92-c87e-4ea5-b1d1-28045635996f'::uuid, '6-131'),
-- 	        ('5af91ef2-4aa4-4268-8ea6-501447b01082'::uuid, '6-136'),
-- 	        ('53045ec4-7d7d-4e66-8f5d-5829c52431e4'::uuid, '6-136'),
-- 	        ('6818662d-446f-4307-8bab-235f0247545c'::uuid, '6-133'),
-- 	        ('228b1620-640c-4570-9c8f-2f3e960aca7d'::uuid, '6-133'),
-- 	        ('259a0b26-9b36-4662-b1fb-13ffd0748ab6'::uuid, '6-133'),
-- 	        ('2ff6e717-b714-4fca-88e4-bc866736686e'::uuid, '6-205')
-- 	       ) as r(id, code)
-- 	  join public.question_templates q on q.id = r.id
-- 	  left join public.curriculum_points p on p.grade = '6' and p.code = r.code and p.archived_at is null;
-- 	select count(*) into v_tags from public.question_template_points
-- 	 where template_id in ('228b1620-640c-4570-9c8f-2f3e960aca7d', '259a0b26-9b36-4662-b1fb-13ffd0748ab6', '2ff6e717-b714-4fca-88e4-bc866736686e', '53045ec4-7d7d-4e66-8f5d-5829c52431e4', '5af91ef2-4aa4-4268-8ea6-501447b01082', '6818662d-446f-4307-8bab-235f0247545c', 'ece43e92-c87e-4ea5-b1d1-28045635996f');
-- 	if v_intacts <> v_presents or v_tags <> v_presents then
-- 		raise exception 'rollback : état changé depuis la migration (% intact(s) sur %, % tag(s))', v_intacts, v_presents, v_tags;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('ece43e92-c87e-4ea5-b1d1-28045635996f'::uuid, '6-131'),
-- 	('5af91ef2-4aa4-4268-8ea6-501447b01082'::uuid, '6-136'),
-- 	('53045ec4-7d7d-4e66-8f5d-5829c52431e4'::uuid, '6-136'),
-- 	('6818662d-446f-4307-8bab-235f0247545c'::uuid, '6-133'),
-- 	('228b1620-640c-4570-9c8f-2f3e960aca7d'::uuid, '6-133'),
-- 	('259a0b26-9b36-4662-b1fb-13ffd0748ab6'::uuid, '6-133'),
-- 	('2ff6e717-b714-4fca-88e4-bc866736686e'::uuid, '6-205')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '6' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('ece43e92-c87e-4ea5-b1d1-28045635996f',
--              '5af91ef2-4aa4-4268-8ea6-501447b01082',
--              '53045ec4-7d7d-4e66-8f5d-5829c52431e4',
--              '6818662d-446f-4307-8bab-235f0247545c',
--              '228b1620-640c-4570-9c8f-2f3e960aca7d',
--              '259a0b26-9b36-4662-b1fb-13ffd0748ab6',
--              '2ff6e717-b714-4fca-88e4-bc866736686e');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` envoie le fichier sans `begin` explicite, et LOCK TABLE
-- y est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne. Après `db:migrate`,
-- relire que le trigger update_question_templates_updated_at est réactivé (`tgenabled = 'O'`).
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q6s_modeles;
create temporary table _q6s_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null,
	code text not null
);
insert into _q6s_modeles values
	('ece43e92-c87e-4ea5-b1d1-28045635996f', 'Nombres et calculs', 'Fractions : calculs', 'fraction d''une quantité', '6-131'),
	('5af91ef2-4aa4-4268-8ea6-501447b01082', 'Nombres et calculs', 'Fractions : calculs', 'multiplication', '6-136'),
	('53045ec4-7d7d-4e66-8f5d-5829c52431e4', 'Nombres et calculs', 'Fractions : calculs', 'multiplication', '6-136'),
	('6818662d-446f-4307-8bab-235f0247545c', 'Nombres et calculs', 'Fractions : sens et écritures', 'ordre', '6-133'),
	('228b1620-640c-4570-9c8f-2f3e960aca7d', 'Nombres et calculs', 'Fractions : sens et écritures', 'ordre', '6-133'),
	('259a0b26-9b36-4662-b1fb-13ffd0748ab6', 'Nombres et calculs', 'Fractions : sens et écritures', 'ordre', '6-133'),
	('2ff6e717-b714-4fca-88e4-bc866736686e', 'Nombres et calculs', 'Fractions : calculs', 'addition et soustraction', '6-205');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q6s_modeles order by id;
select 1 from public.question_templates where id in (select id from _q6s_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la sous-notion désignée, et doit être celui du point
alter table _q6s_modeles add column noeud uuid, add column point_id uuid;
update _q6s_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q6s_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '6' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q6s_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q6s_modeles where noeud is null),
			(select count(*) from _q6s_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, en 6e, brouillon, aucun tag -----------
do $garde$
declare v_presents integer; v_ranges integer; v_niveaux integer; v_statuts integer; v_tags integer;
begin
	select count(*) into v_presents from _q6s_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
	end if;
	select count(*) into v_ranges from _q6s_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_niveaux from _q6s_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from array['6'];
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _q6s_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from 'draft';
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q6s_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q6s_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q6s_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q6s_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q6s_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _q6s_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q6s_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _q6s_modeles;
