-- ============================================================================
-- Chantier « questions-ce2 », lot 13 (règle graduée : segments, constructions cotées en cm) : nœud et tag de 5 modèles neufs
-- ============================================================================
--   - c1caa00f (Tracer un segment de longueur donnée en cm) → CE2-039, sur « Grandeurs et mesures > Longueurs > comparaison et mesure »;
--   - 68425f1e (Tracer un segment de longueur donnée en cm et mm) → CE2-039, sur « Grandeurs et mesures > Longueurs > comparaison et mesure »;
--   - 7a143d38 (Construire un carré ou un rectangle de dimensions données) → CE2-070, sur « Géométrie > Figures planes > constructions »;
--   - d29a1fac (Construire un triangle rectangle de dimensions données) → CE2-070, sur « Géométrie > Figures planes > constructions »;
--   - b1f51780 (Tracer un cercle de rayon donné en cm) → CE2-070, sur « Géométrie > Figures planes > constructions »;
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-19 (journal docs/wip/questions-ce2-progress.md § 20). Les modèles
-- ont été créés en brouillon par scripts/create-questions.ts
-- (scripts/questions/ce2-13/, lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (5 modèles). Elle est prouvée par
-- tests/integration/questions-ce2-lot13-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-19, après la création du lot 13),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Un seul niveau : 2 modèles sur CE2-039 (« Grandeurs et mesures > Longueurs > comparaison et mesure »),
-- 3 sur CE2-070 (« Géométrie > Figures planes > constructions »).
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-11-19 en phase 0 (§ 20), AVANT le SQL, tranchée par lui le 2026-11-19 : personne).
-- Aucune règle ne change. Effet visible : les 5 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 5 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--               ('c1caa00f-f72a-49fd-9001-8f1551c33714'::uuid),
--               ('68425f1e-0734-476a-995d-627998229963'::uuid),
--               ('7a143d38-4674-4dec-b355-b2d3d00a5321'::uuid),
--               ('d29a1fac-8c6f-41b6-98a2-bda33b52a823'::uuid),
--               ('b1f51780-5a7a-4aeb-b4ae-8428090cc84a'::uuid))
--  as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('c1caa00f-f72a-49fd-9001-8f1551c33714'::uuid, 'CE2', 'CE2-039'),
-- 	('68425f1e-0734-476a-995d-627998229963'::uuid, 'CE2', 'CE2-039'),
-- 	('7a143d38-4674-4dec-b355-b2d3d00a5321'::uuid, 'CE2', 'CE2-070'),
-- 	('d29a1fac-8c6f-41b6-98a2-bda33b52a823'::uuid, 'CE2', 'CE2-070'),
-- 	('b1f51780-5a7a-4aeb-b4ae-8428090cc84a'::uuid, 'CE2', 'CE2-070')
--  ) as r(id, grade, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               'c1caa00f-f72a-49fd-9001-8f1551c33714',
--               '68425f1e-0734-476a-995d-627998229963',
--               '7a143d38-4674-4dec-b355-b2d3d00a5321',
--               'd29a1fac-8c6f-41b6-98a2-bda33b52a823',
--               'b1f51780-5a7a-4aeb-b4ae-8428090cc84a');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qc_modeles;
create temporary table _qc_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	grade text not null,
	code text not null,
	-- sous-notions que la notion a le droit d'avoir quand le modèle va sur elle (aucune ici : tous
	-- les modèles vont sur une sous-notion)
	sous_notions_admises text[]
);
insert into _qc_modeles values
	('c1caa00f-f72a-49fd-9001-8f1551c33714', 'Grandeurs et mesures', 'Longueurs', 'comparaison et mesure', 'CE2', 'CE2-039', null),
	('68425f1e-0734-476a-995d-627998229963', 'Grandeurs et mesures', 'Longueurs', 'comparaison et mesure', 'CE2', 'CE2-039', null),
	('7a143d38-4674-4dec-b355-b2d3d00a5321', 'Géométrie', 'Figures planes', 'constructions', 'CE2', 'CE2-070', null),
	('d29a1fac-8c6f-41b6-98a2-bda33b52a823', 'Géométrie', 'Figures planes', 'constructions', 'CE2', 'CE2-070', null),
	('b1f51780-5a7a-4aeb-b4ae-8428090cc84a', 'Géométrie', 'Figures planes', 'constructions', 'CE2', 'CE2-070', null);

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qc_modeles order by id;
select 1 from public.question_templates where id in (select id from _qc_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qc_modeles add column noeud uuid, add column point_id uuid;
update _qc_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qc_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qc_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = r.grade and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qc_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qc_modeles where noeud is null),
			(select count(*) from _qc_modeles where point_id is null);
	end if;
	if exists (select 1 from _qc_modeles r
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
	select count(*) into v_presents from _qc_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 5) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 5', v_presents;
	end if;
	select count(*) into v_ranges from _qc_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qc_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qc_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qc_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qc_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qc_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qc_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qc_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qc_modeles;
