-- ============================================================================
-- Chantier « questions-6 », lot 10 « Distances, cercle, médiatrice » : nœud et tag de 8 brouillons
-- ============================================================================
-- Les 8 brouillons neufs (sans nœud ni tag) de la phase 0 (§ 24) vont sur le nœud de leur point,
-- une SOUS-NOTION pour chacun : le nœud est celui du point.
--   - 4a86db27 (01, Distance entre deux points) : 6-160, « Géométrie > Figures planes > cercle » ;
--   - 3ec74bbc (02, Milieu d'un segment) : 6-161, même nœud ;
--   - b8939937 (03, Cercle, disque, rayon…) : 6-162, même nœud ;
--   - 48524505 (04, Cercle et disque, ensembles de points) : 6-163, même nœud ;
--   - 2f3da9ce (05, Problèmes de distances à un point) : 6-164, même nœud ;
--   - 15f9d78b (06, Définition de la médiatrice) : 6-165, « Géométrie > Figures planes > médiatrice et bissectrice » ;
--   - 9e90342c (07, Propriété de la médiatrice) : 6-166, même nœud ;
--   - 1b2ed3a5 (08, Problèmes avec la médiatrice) : 6-167, même nœud ;
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point) et porte UN point (ADR 0020 : au plus un point par programme).
-- 6-160 (distance) et 6-161 (milieu) sont rangés en prod sous « cercle » : décision de David
-- (2026-11-02, § 24, question 2) de suivre le nœud du point.
-- Ni le contenu, ni le niveau, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décisions de David le 2026-11-02 (journal docs/wip/questions-6-progress.md § 24, « je te suis »).
-- Les 8 brouillons ont été créés le 2026-11-02 par scripts/create-questions.ts
-- (scripts/questions/6-distances-cercle-mediatrice/, lancé par David), qui ne pose ni nœud ni tag.
-- Relevé de la prod (MCP, 2026-11-02) : 8 brouillons, niveaux [6], sans nœud, sans tag ; les 8
-- points actifs, sur les deux sous-notions ci-dessus (actives, sous la branche racine Géométrie).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (8 modèles). Elle est prouvée par
-- tests/integration/questions-6-lot10-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (état relevé) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore sans nœud, en 6e, en brouillon, et ne porter aucun tag,
-- sinon une saisie faite depuis serait écrasée. Nœud désigné par son chemin, résolu STRICTEMENT,
-- et qui doit être celui du point.
--
-- Données d'élèves : aucune (brouillons neufs).
--
-- Accès (question tranchée par David le 2026-11-02, phase 0 du § 24) : personne ne gagne de
-- lecture ; les 8 brouillons restent visibles des seuls admin et auteur jusqu'à leur publication.
-- Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 8 tags et rend les 8 brouillons sans nœud.
-- Garde : il refuse si un modèle n'est plus en 6e, rangé, en brouillon, avec son seul tag (une
-- saisie faite depuis serait écrasée en silence). Bloc éprouvé par le test d'intégration, à jouer
-- dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('15f9d78b-f1b0-4d20-b72f-a4eb2bdeefe4'::uuid),
--                ('1b2ed3a5-7080-4bd2-8c0d-962df1814cf7'::uuid),
--                ('2f3da9ce-ec43-407a-bbb9-70759bbe3027'::uuid),
--                ('3ec74bbc-fe33-4362-a3ad-184a6bac2649'::uuid),
--                ('48524505-717f-4dd1-a69e-c9cf016406d1'::uuid),
--                ('4a86db27-ae09-4095-97a6-e29eb29927eb'::uuid),
--                ('9e90342c-2426-4f9f-93bd-f4e6dd3d6670'::uuid),
--                ('b8939937-5201-406f-885a-0e5a0b5eec4e'::uuid)) as r(id)
--  order by r.id;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_tags integer;
-- begin
-- 	perform 1 from public.question_templates where id in ('15f9d78b-f1b0-4d20-b72f-a4eb2bdeefe4', '1b2ed3a5-7080-4bd2-8c0d-962df1814cf7', '2f3da9ce-ec43-407a-bbb9-70759bbe3027', '3ec74bbc-fe33-4362-a3ad-184a6bac2649', '48524505-717f-4dd1-a69e-c9cf016406d1', '4a86db27-ae09-4095-97a6-e29eb29927eb', '9e90342c-2426-4f9f-93bd-f4e6dd3d6670', 'b8939937-5201-406f-885a-0e5a0b5eec4e') order by id for update;
-- 	-- Intact, modèle par modèle : en 6e, en brouillon, sur le nœud de SON point, et ce point pour seul tag
-- 	select count(*), count(*) filter (where q.grades = array['6'] and q.status = 'draft'
-- 	                                     and q.classification_node_id = p.node_id
-- 	                                     and (select count(*) from public.question_template_points t where t.template_id = q.id) = 1
-- 	                                     and exists (select 1 from public.question_template_points t
-- 	                                                  where t.template_id = q.id and t.point_id = p.id))
-- 	  into v_presents, v_intacts
-- 	  from (values
-- 	        ('4a86db27-ae09-4095-97a6-e29eb29927eb'::uuid, '6-160'),
-- 	        ('3ec74bbc-fe33-4362-a3ad-184a6bac2649'::uuid, '6-161'),
-- 	        ('b8939937-5201-406f-885a-0e5a0b5eec4e'::uuid, '6-162'),
-- 	        ('48524505-717f-4dd1-a69e-c9cf016406d1'::uuid, '6-163'),
-- 	        ('2f3da9ce-ec43-407a-bbb9-70759bbe3027'::uuid, '6-164'),
-- 	        ('15f9d78b-f1b0-4d20-b72f-a4eb2bdeefe4'::uuid, '6-165'),
-- 	        ('9e90342c-2426-4f9f-93bd-f4e6dd3d6670'::uuid, '6-166'),
-- 	        ('1b2ed3a5-7080-4bd2-8c0d-962df1814cf7'::uuid, '6-167')
-- 	       ) as r(id, code)
-- 	  join public.question_templates q on q.id = r.id
-- 	  left join public.curriculum_points p on p.grade = '6' and p.code = r.code and p.archived_at is null;
-- 	select count(*) into v_tags from public.question_template_points
-- 	 where template_id in ('15f9d78b-f1b0-4d20-b72f-a4eb2bdeefe4', '1b2ed3a5-7080-4bd2-8c0d-962df1814cf7', '2f3da9ce-ec43-407a-bbb9-70759bbe3027', '3ec74bbc-fe33-4362-a3ad-184a6bac2649', '48524505-717f-4dd1-a69e-c9cf016406d1', '4a86db27-ae09-4095-97a6-e29eb29927eb', '9e90342c-2426-4f9f-93bd-f4e6dd3d6670', 'b8939937-5201-406f-885a-0e5a0b5eec4e');
-- 	if v_intacts <> v_presents or v_tags <> v_presents then
-- 		raise exception 'rollback : état changé depuis la migration (% intact(s) sur %, % tag(s))', v_intacts, v_presents, v_tags;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('4a86db27-ae09-4095-97a6-e29eb29927eb'::uuid, '6-160'),
-- 	('3ec74bbc-fe33-4362-a3ad-184a6bac2649'::uuid, '6-161'),
-- 	('b8939937-5201-406f-885a-0e5a0b5eec4e'::uuid, '6-162'),
-- 	('48524505-717f-4dd1-a69e-c9cf016406d1'::uuid, '6-163'),
-- 	('2f3da9ce-ec43-407a-bbb9-70759bbe3027'::uuid, '6-164'),
-- 	('15f9d78b-f1b0-4d20-b72f-a4eb2bdeefe4'::uuid, '6-165'),
-- 	('9e90342c-2426-4f9f-93bd-f4e6dd3d6670'::uuid, '6-166'),
-- 	('1b2ed3a5-7080-4bd2-8c0d-962df1814cf7'::uuid, '6-167')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '6' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('4a86db27-ae09-4095-97a6-e29eb29927eb',
--              '3ec74bbc-fe33-4362-a3ad-184a6bac2649',
--              'b8939937-5201-406f-885a-0e5a0b5eec4e',
--              '48524505-717f-4dd1-a69e-c9cf016406d1',
--              '2f3da9ce-ec43-407a-bbb9-70759bbe3027',
--              '15f9d78b-f1b0-4d20-b72f-a4eb2bdeefe4',
--              '9e90342c-2426-4f9f-93bd-f4e6dd3d6670',
--              '1b2ed3a5-7080-4bd2-8c0d-962df1814cf7');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` envoie le fichier sans `begin` explicite, et LOCK TABLE
-- y est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne. Après `db:migrate`,
-- relire que le trigger update_question_templates_updated_at est réactivé (`tgenabled = 'O'`).
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
-- `sous_notion` nulle : le point est rangé sur la notion elle-même.
drop table if exists pg_temp._q6l10_modeles;
create temporary table _q6l10_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _q6l10_modeles values
	('4a86db27-ae09-4095-97a6-e29eb29927eb', 'Géométrie', 'Figures planes', 'cercle', '6-160'),
	('3ec74bbc-fe33-4362-a3ad-184a6bac2649', 'Géométrie', 'Figures planes', 'cercle', '6-161'),
	('b8939937-5201-406f-885a-0e5a0b5eec4e', 'Géométrie', 'Figures planes', 'cercle', '6-162'),
	('48524505-717f-4dd1-a69e-c9cf016406d1', 'Géométrie', 'Figures planes', 'cercle', '6-163'),
	('2f3da9ce-ec43-407a-bbb9-70759bbe3027', 'Géométrie', 'Figures planes', 'cercle', '6-164'),
	('15f9d78b-f1b0-4d20-b72f-a4eb2bdeefe4', 'Géométrie', 'Figures planes', 'médiatrice et bissectrice', '6-165'),
	('9e90342c-2426-4f9f-93bd-f4e6dd3d6670', 'Géométrie', 'Figures planes', 'médiatrice et bissectrice', '6-166'),
	('1b2ed3a5-7080-4bd2-8c0d-962df1814cf7', 'Géométrie', 'Figures planes', 'médiatrice et bissectrice', '6-167');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q6l10_modeles order by id;
select 1 from public.question_templates where id in (select id from _q6l10_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion désignée (sous une branche racine), ou sa sous-notion désignée, et doit
-- être celui du point
alter table _q6l10_modeles add column noeud uuid, add column point_id uuid;
update _q6l10_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _q6l10_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q6l10_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '6' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q6l10_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q6l10_modeles where noeud is null),
			(select count(*) from _q6l10_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, en 6e, brouillon, aucun tag -----------
do $garde$
declare v_presents integer; v_ranges integer; v_niveaux integer; v_statuts integer; v_tags integer;
begin
	select count(*) into v_presents from _q6l10_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 8) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 8', v_presents;
	end if;
	select count(*) into v_ranges from _q6l10_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_niveaux from _q6l10_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from array['6'];
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _q6l10_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from 'draft';
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q6l10_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q6l10_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q6l10_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q6l10_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q6l10_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _q6l10_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q6l10_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _q6l10_modeles;
