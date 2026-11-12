-- ============================================================================
-- Chantier « questions-6 », lot 13 « Schémas en barres » : nœud et tag de 6 brouillons
-- ============================================================================
-- Les 6 brouillons neufs (sans nœud ni tag) de la phase 0 (§ 30) vont sur le nœud de leur point,
-- 6-142 « Utiliser des modèles pré-algébriques (schémas en barre) », « Algèbre > Premiers pas
-- algébriques > nombre inconnu » :
--   - a9c37578 (01, Choisir le schéma d'un énoncé) ;
--   - 399342ff (02, Somme et différence) ;
--   - d79ea0bc (03, « n fois plus ») ;
--   - e97ca3dd (04, Trois parts avec des écarts) ;
--   - 4c967bde (05, Deux achats pour deux prix) ;
--   - 2af325bb (06, Parts égales et un reste) ;
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point) et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni le niveau, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décisions de David le 2026-11-12 (journal docs/wip/questions-6-progress.md § 30, « je valide »).
-- Les 6 brouillons ont été créés le 2026-11-12, après le deploy:prod 0.85.0 qui livre le bloc
-- schema-barres, par scripts/create-questions.ts (scripts/questions/6-schemas-en-barres/, lancé par
-- David), qui ne pose ni nœud ni tag.
-- Relevé de la prod (MCP, 2026-11-12) : 6 brouillons, niveaux [6], sans nœud, sans tag ; le point
-- 6-142 actif, sur la sous-notion ci-dessus (active, sous la branche racine Algèbre).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée par
-- tests/integration/questions-6-lot13-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (état relevé) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore sans nœud, en 6e, en brouillon, et ne porter aucun tag,
-- sinon une saisie faite depuis serait écrasée. Nœud désigné par son chemin, résolu STRICTEMENT,
-- et qui doit être celui du point.
--
-- Données d'élèves : aucune (brouillons neufs).
--
-- Accès (question tranchée par David le 2026-11-12, phase 0 du § 30) : personne ne gagne de
-- lecture ; les 6 brouillons restent visibles des seuls admin et auteur jusqu'à leur publication.
-- Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags et rend les 6 brouillons sans nœud.
-- Garde : il refuse si un modèle n'est plus en 6e, rangé, en brouillon, avec son seul tag (une
-- saisie faite depuis serait écrasée en silence). Bloc éprouvé par le test d'intégration, à jouer
-- dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('2af325bb-4e7f-42c2-bb93-c9902bc133d7'::uuid),
--                ('399342ff-6732-450e-82a8-7a934cc04ace'::uuid),
--                ('4c967bde-dc18-457f-867e-de54f9cc7aae'::uuid),
--                ('a9c37578-1364-47f4-9cf1-b047b6c29a68'::uuid),
--                ('d79ea0bc-e25b-4408-9919-50608a10a7ac'::uuid),
--                ('e97ca3dd-6e83-429b-a81c-3f23d55b9a7c'::uuid)) as r(id)
--  order by r.id;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_tags integer;
-- begin
-- 	perform 1 from public.question_templates where id in ('2af325bb-4e7f-42c2-bb93-c9902bc133d7', '399342ff-6732-450e-82a8-7a934cc04ace', '4c967bde-dc18-457f-867e-de54f9cc7aae', 'a9c37578-1364-47f4-9cf1-b047b6c29a68', 'd79ea0bc-e25b-4408-9919-50608a10a7ac', 'e97ca3dd-6e83-429b-a81c-3f23d55b9a7c') order by id for update;
-- 	-- Intact, modèle par modèle : en 6e, en brouillon, sur le nœud de SON point, et ce point pour seul tag
-- 	select count(*), count(*) filter (where q.grades = array['6'] and q.status = 'draft'
-- 	                                     and q.classification_node_id = p.node_id
-- 	                                     and (select count(*) from public.question_template_points t where t.template_id = q.id) = 1
-- 	                                     and exists (select 1 from public.question_template_points t
-- 	                                                  where t.template_id = q.id and t.point_id = p.id))
-- 	  into v_presents, v_intacts
-- 	  from (values
-- 	        ('a9c37578-1364-47f4-9cf1-b047b6c29a68'::uuid, '6-142'),
-- 	        ('399342ff-6732-450e-82a8-7a934cc04ace'::uuid, '6-142'),
-- 	        ('d79ea0bc-e25b-4408-9919-50608a10a7ac'::uuid, '6-142'),
-- 	        ('e97ca3dd-6e83-429b-a81c-3f23d55b9a7c'::uuid, '6-142'),
-- 	        ('4c967bde-dc18-457f-867e-de54f9cc7aae'::uuid, '6-142'),
-- 	        ('2af325bb-4e7f-42c2-bb93-c9902bc133d7'::uuid, '6-142')
-- 	       ) as r(id, code)
-- 	  join public.question_templates q on q.id = r.id
-- 	  left join public.curriculum_points p on p.grade = '6' and p.code = r.code and p.archived_at is null;
-- 	select count(*) into v_tags from public.question_template_points
-- 	 where template_id in ('2af325bb-4e7f-42c2-bb93-c9902bc133d7', '399342ff-6732-450e-82a8-7a934cc04ace', '4c967bde-dc18-457f-867e-de54f9cc7aae', 'a9c37578-1364-47f4-9cf1-b047b6c29a68', 'd79ea0bc-e25b-4408-9919-50608a10a7ac', 'e97ca3dd-6e83-429b-a81c-3f23d55b9a7c');
-- 	if v_intacts <> v_presents or v_tags <> v_presents then
-- 		raise exception 'rollback : état changé depuis la migration (% intact(s) sur %, % tag(s))', v_intacts, v_presents, v_tags;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('a9c37578-1364-47f4-9cf1-b047b6c29a68'::uuid, '6-142'),
-- 	('399342ff-6732-450e-82a8-7a934cc04ace'::uuid, '6-142'),
-- 	('d79ea0bc-e25b-4408-9919-50608a10a7ac'::uuid, '6-142'),
-- 	('e97ca3dd-6e83-429b-a81c-3f23d55b9a7c'::uuid, '6-142'),
-- 	('4c967bde-dc18-457f-867e-de54f9cc7aae'::uuid, '6-142'),
-- 	('2af325bb-4e7f-42c2-bb93-c9902bc133d7'::uuid, '6-142')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '6' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('2af325bb-4e7f-42c2-bb93-c9902bc133d7', '399342ff-6732-450e-82a8-7a934cc04ace', '4c967bde-dc18-457f-867e-de54f9cc7aae', 'a9c37578-1364-47f4-9cf1-b047b6c29a68', 'd79ea0bc-e25b-4408-9919-50608a10a7ac', 'e97ca3dd-6e83-429b-a81c-3f23d55b9a7c');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` envoie le fichier sans `begin` explicite, et LOCK TABLE
-- y est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne. Après `db:migrate`,
-- relire que le trigger update_question_templates_updated_at est réactivé (`tgenabled = 'O'`).
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
-- Les 6 sur la même sous-notion.
drop table if exists pg_temp._q6l13_modeles;
create temporary table _q6l13_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null,
	code text not null
);
insert into _q6l13_modeles values
	('a9c37578-1364-47f4-9cf1-b047b6c29a68', 'Algèbre', 'Premiers pas algébriques', 'nombre inconnu', '6-142'),
	('399342ff-6732-450e-82a8-7a934cc04ace', 'Algèbre', 'Premiers pas algébriques', 'nombre inconnu', '6-142'),
	('d79ea0bc-e25b-4408-9919-50608a10a7ac', 'Algèbre', 'Premiers pas algébriques', 'nombre inconnu', '6-142'),
	('e97ca3dd-6e83-429b-a81c-3f23d55b9a7c', 'Algèbre', 'Premiers pas algébriques', 'nombre inconnu', '6-142'),
	('4c967bde-dc18-457f-867e-de54f9cc7aae', 'Algèbre', 'Premiers pas algébriques', 'nombre inconnu', '6-142'),
	('2af325bb-4e7f-42c2-bb93-c9902bc133d7', 'Algèbre', 'Premiers pas algébriques', 'nombre inconnu', '6-142');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q6l13_modeles order by id;
select 1 from public.question_templates where id in (select id from _q6l13_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la sous-notion désignée (sous sa notion, sous une branche racine), et doit être
-- celui du point
alter table _q6l13_modeles add column noeud uuid, add column point_id uuid;
update _q6l13_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q6l13_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '6' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q6l13_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q6l13_modeles where noeud is null),
			(select count(*) from _q6l13_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, en 6e, brouillon, aucun tag -----------
do $garde$
declare v_presents integer; v_ranges integer; v_niveaux integer; v_statuts integer; v_tags integer;
begin
	select count(*) into v_presents from _q6l13_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	select count(*) into v_ranges from _q6l13_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_niveaux from _q6l13_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from array['6'];
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _q6l13_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from 'draft';
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q6l13_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q6l13_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q6l13_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q6l13_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q6l13_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _q6l13_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q6l13_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _q6l13_modeles;
