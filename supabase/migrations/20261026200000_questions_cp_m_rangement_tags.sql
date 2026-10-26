-- ============================================================================
-- Chantier « questions », lot M du CP (monnaie) : nœud et tag de 6 modèles neufs
-- ============================================================================
--   - 0f4a530e (Combien d'argent y a-t-il ?) → CP-043, sur « Grandeurs et mesures > Monnaie > pièces et billets » ;
--   - 93760337 (Qui a le plus d'argent ?) → CP-042, sur « Grandeurs et mesures > Monnaie > pièces et billets » ;
--   - 8e54475b (Quel porte-monnaie contient exactement… ?) → CP-044, sur « Grandeurs et mesures > Monnaie > pièces et billets » ;
--   - 9592804d (Combien de pièces ou de billets faut-il ajouter ?) → CP-044, sur « Grandeurs et mesures > Monnaie > pièces et billets » ;
--   - b81c8cf4 (Peut-il acheter ?) → CP-045, sur « Grandeurs et mesures > Monnaie > pièces et billets » ;
--   - 45a90289 (Combien le marchand rend-il ?) → CP-071, sur « Grandeurs et mesures > Monnaie > rendre la monnaie » ;
-- Chaque modèle va sur la SOUS-NOTION de son point (question_template_points_check_rules refuse
-- un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- CP-044 porte deux modèles. Ni le contenu, ni les niveaux (1 à 5 sur « pièces et billets », écrits
-- à la création), ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-26 (journal docs/wip/questions-progress.md § 4 quattuordecies). Les
-- modèles ont été créés en brouillon le 2026-10-26 par scripts/create-questions.ts
-- (scripts/questions/cp-m/), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée
-- par tests/integration/questions-cp-m-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-26), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-10-26 AVANT le SQL, tranchée par lui le 2026-10-26 : personne).
-- Aucune règle ne change. Effet visible : les 6 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('0f4a530e-4cb4-4cdb-a27c-d20ca702ac84'::uuid),
--                ('45a90289-20a2-468b-bcdc-c6abc69bfe52'::uuid),
--                ('8e54475b-fc73-42cc-b25b-d31497406216'::uuid),
--                ('93760337-7fa5-4f44-8807-b95a9bae9a35'::uuid),
--                ('9592804d-cbbc-48e7-8f57-085d1da10d0a'::uuid),
--                ('b81c8cf4-85ad-4470-bb0f-7191932c3c57'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('0f4a530e-4cb4-4cdb-a27c-d20ca702ac84'::uuid, 'CP-043'),
-- 	('93760337-7fa5-4f44-8807-b95a9bae9a35'::uuid, 'CP-042'),
-- 	('8e54475b-fc73-42cc-b25b-d31497406216'::uuid, 'CP-044'),
-- 	('9592804d-cbbc-48e7-8f57-085d1da10d0a'::uuid, 'CP-044'),
-- 	('b81c8cf4-85ad-4470-bb0f-7191932c3c57'::uuid, 'CP-045'),
-- 	('45a90289-20a2-468b-bcdc-c6abc69bfe52'::uuid, 'CP-071')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CP' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('0f4a530e-4cb4-4cdb-a27c-d20ca702ac84',
--               '45a90289-20a2-468b-bcdc-c6abc69bfe52',
--               '8e54475b-fc73-42cc-b25b-d31497406216',
--               '93760337-7fa5-4f44-8807-b95a9bae9a35',
--               '9592804d-cbbc-48e7-8f57-085d1da10d0a',
--               'b81c8cf4-85ad-4470-bb0f-7191932c3c57');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qm_modeles;
create temporary table _qm_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qm_modeles values
	('0f4a530e-4cb4-4cdb-a27c-d20ca702ac84', 'Grandeurs et mesures', 'Monnaie', 'pièces et billets', 'CP-043'),
	('93760337-7fa5-4f44-8807-b95a9bae9a35', 'Grandeurs et mesures', 'Monnaie', 'pièces et billets', 'CP-042'),
	('8e54475b-fc73-42cc-b25b-d31497406216', 'Grandeurs et mesures', 'Monnaie', 'pièces et billets', 'CP-044'),
	('9592804d-cbbc-48e7-8f57-085d1da10d0a', 'Grandeurs et mesures', 'Monnaie', 'pièces et billets', 'CP-044'),
	('b81c8cf4-85ad-4470-bb0f-7191932c3c57', 'Grandeurs et mesures', 'Monnaie', 'pièces et billets', 'CP-045'),
	('45a90289-20a2-468b-bcdc-c6abc69bfe52', 'Grandeurs et mesures', 'Monnaie', 'rendre la monnaie', 'CP-071');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qm_modeles order by id;
select 1 from public.question_templates where id in (select id from _qm_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qm_modeles add column noeud uuid, add column point_id uuid;
update _qm_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qm_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qm_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CP' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qm_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qm_modeles where noeud is null),
			(select count(*) from _qm_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qm_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	select count(*) into v_ranges from _qm_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qm_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qm_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qm_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qm_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qm_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qm_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qm_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qm_modeles;
