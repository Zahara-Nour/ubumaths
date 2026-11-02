-- ============================================================================
-- Chantier « questions-6 », lot 9 « Tableaux et programmes » : nœud et tag de 7 brouillons
-- ============================================================================
-- Les 7 brouillons neufs (sans nœud ni tag) de la phase 0 (§ 22) vont sur le nœud de leur point.
-- Trois points sont rangés sur une SOUS-NOTION, quatre sur une NOTION : le nœud est celui du point.
--   - 39bafe0e (01, Motif évolutif) : 6-143, « Algèbre > Premiers pas algébriques > suites de motifs » ;
--   - 6cabd2db (02, Construire un tableau) : 6-184, « Statistiques > Représenter des données > tableaux » ;
--   - b371908d (03, Filtrer un tableau) : 6-185, même nœud ;
--   - 3838457d (04, Proportionnalité par un tableau) : 6-192, « Proportionnalité > Situations de proportionnalité » ;
--   - 4aa51892 (05, Identifier une instruction) : 6-194, « Algorithmique > Préalgorithmique » ;
--   - f1295102 (06, Exécuter un programme) : 6-195, même nœud ;
--   - a8ec4c14 (07, Répéter à la main une séquence) : 6-196, même nœud.
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point) et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni le niveau, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décisions de David le 2026-11-02 (journal docs/wip/questions-6-progress.md § 22, « je valide »).
-- Les 7 brouillons ont été créés le 2026-11-02 par scripts/create-questions.ts
-- (scripts/questions/6-tableaux-programmes/, lancé par David), qui ne pose ni nœud ni tag. Relevé
-- de la prod (MCP, 2026-11-02) : 7 brouillons, niveaux [6], sans nœud, sans tag ; les 7 points
-- actifs, sur les nœuds ci-dessus (actifs, sous des branches racines).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-6-lot9-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (état relevé) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore sans nœud, en 6e, en brouillon, et ne porter aucun tag,
-- sinon une saisie faite depuis serait écrasée. Nœud désigné par son chemin, résolu STRICTEMENT,
-- et qui doit être celui du point.
--
-- Données d'élèves : aucune (brouillons neufs).
--
-- Accès (question tranchée par David le 2026-11-02, phase 0 du § 22) : personne ne gagne de
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
--   from (values ('3838457d-87ce-4b1e-a19e-a59ad2cd0c98'::uuid),
--                ('39bafe0e-3b01-49d8-97d9-a723136a34cf'::uuid),
--                ('4aa51892-3278-4b1d-af37-dbfc4e1ae5f1'::uuid),
--                ('6cabd2db-ade8-4e08-b1bb-715d0eaa5a99'::uuid),
--                ('a8ec4c14-04c7-4ebe-9a0c-60234ca6784f'::uuid),
--                ('b371908d-14fc-44a5-a286-d32cc55e6cd5'::uuid),
--                ('f1295102-f779-4e3a-adcb-4072410a2f99'::uuid)) as r(id)
--  order by r.id;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_tags integer;
-- begin
-- 	perform 1 from public.question_templates where id in ('3838457d-87ce-4b1e-a19e-a59ad2cd0c98', '39bafe0e-3b01-49d8-97d9-a723136a34cf', '4aa51892-3278-4b1d-af37-dbfc4e1ae5f1', '6cabd2db-ade8-4e08-b1bb-715d0eaa5a99', 'a8ec4c14-04c7-4ebe-9a0c-60234ca6784f', 'b371908d-14fc-44a5-a286-d32cc55e6cd5', 'f1295102-f779-4e3a-adcb-4072410a2f99') order by id for update;
-- 	-- Intact, modèle par modèle : en 6e, en brouillon, sur le nœud de SON point, et ce point pour seul tag
-- 	select count(*), count(*) filter (where q.grades = array['6'] and q.status = 'draft'
-- 	                                     and q.classification_node_id = p.node_id
-- 	                                     and (select count(*) from public.question_template_points t where t.template_id = q.id) = 1
-- 	                                     and exists (select 1 from public.question_template_points t
-- 	                                                  where t.template_id = q.id and t.point_id = p.id))
-- 	  into v_presents, v_intacts
-- 	  from (values
-- 	        ('39bafe0e-3b01-49d8-97d9-a723136a34cf'::uuid, '6-143'),
-- 	        ('6cabd2db-ade8-4e08-b1bb-715d0eaa5a99'::uuid, '6-184'),
-- 	        ('b371908d-14fc-44a5-a286-d32cc55e6cd5'::uuid, '6-185'),
-- 	        ('3838457d-87ce-4b1e-a19e-a59ad2cd0c98'::uuid, '6-192'),
-- 	        ('4aa51892-3278-4b1d-af37-dbfc4e1ae5f1'::uuid, '6-194'),
-- 	        ('f1295102-f779-4e3a-adcb-4072410a2f99'::uuid, '6-195'),
-- 	        ('a8ec4c14-04c7-4ebe-9a0c-60234ca6784f'::uuid, '6-196')
-- 	       ) as r(id, code)
-- 	  join public.question_templates q on q.id = r.id
-- 	  left join public.curriculum_points p on p.grade = '6' and p.code = r.code and p.archived_at is null;
-- 	select count(*) into v_tags from public.question_template_points
-- 	 where template_id in ('3838457d-87ce-4b1e-a19e-a59ad2cd0c98', '39bafe0e-3b01-49d8-97d9-a723136a34cf', '4aa51892-3278-4b1d-af37-dbfc4e1ae5f1', '6cabd2db-ade8-4e08-b1bb-715d0eaa5a99', 'a8ec4c14-04c7-4ebe-9a0c-60234ca6784f', 'b371908d-14fc-44a5-a286-d32cc55e6cd5', 'f1295102-f779-4e3a-adcb-4072410a2f99');
-- 	if v_intacts <> v_presents or v_tags <> v_presents then
-- 		raise exception 'rollback : état changé depuis la migration (% intact(s) sur %, % tag(s))', v_intacts, v_presents, v_tags;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('39bafe0e-3b01-49d8-97d9-a723136a34cf'::uuid, '6-143'),
-- 	('6cabd2db-ade8-4e08-b1bb-715d0eaa5a99'::uuid, '6-184'),
-- 	('b371908d-14fc-44a5-a286-d32cc55e6cd5'::uuid, '6-185'),
-- 	('3838457d-87ce-4b1e-a19e-a59ad2cd0c98'::uuid, '6-192'),
-- 	('4aa51892-3278-4b1d-af37-dbfc4e1ae5f1'::uuid, '6-194'),
-- 	('f1295102-f779-4e3a-adcb-4072410a2f99'::uuid, '6-195'),
-- 	('a8ec4c14-04c7-4ebe-9a0c-60234ca6784f'::uuid, '6-196')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '6' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('39bafe0e-3b01-49d8-97d9-a723136a34cf',
--              '6cabd2db-ade8-4e08-b1bb-715d0eaa5a99',
--              'b371908d-14fc-44a5-a286-d32cc55e6cd5',
--              '3838457d-87ce-4b1e-a19e-a59ad2cd0c98',
--              '4aa51892-3278-4b1d-af37-dbfc4e1ae5f1',
--              'f1295102-f779-4e3a-adcb-4072410a2f99',
--              'a8ec4c14-04c7-4ebe-9a0c-60234ca6784f');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` envoie le fichier sans `begin` explicite, et LOCK TABLE
-- y est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne. Après `db:migrate`,
-- relire que le trigger update_question_templates_updated_at est réactivé (`tgenabled = 'O'`).
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
-- `sous_notion` nulle : le point est rangé sur la notion elle-même.
drop table if exists pg_temp._q6l9_modeles;
create temporary table _q6l9_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _q6l9_modeles values
	('39bafe0e-3b01-49d8-97d9-a723136a34cf', 'Algèbre', 'Premiers pas algébriques', 'suites de motifs', '6-143'),
	('6cabd2db-ade8-4e08-b1bb-715d0eaa5a99', 'Statistiques', 'Représenter des données', 'tableaux', '6-184'),
	('b371908d-14fc-44a5-a286-d32cc55e6cd5', 'Statistiques', 'Représenter des données', 'tableaux', '6-185'),
	('3838457d-87ce-4b1e-a19e-a59ad2cd0c98', 'Proportionnalité', 'Situations de proportionnalité', null, '6-192'),
	('4aa51892-3278-4b1d-af37-dbfc4e1ae5f1', 'Algorithmique', 'Préalgorithmique', null, '6-194'),
	('f1295102-f779-4e3a-adcb-4072410a2f99', 'Algorithmique', 'Préalgorithmique', null, '6-195'),
	('a8ec4c14-04c7-4ebe-9a0c-60234ca6784f', 'Algorithmique', 'Préalgorithmique', null, '6-196');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q6l9_modeles order by id;
select 1 from public.question_templates where id in (select id from _q6l9_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion désignée (sous une branche racine), ou sa sous-notion désignée, et doit
-- être celui du point
alter table _q6l9_modeles add column noeud uuid, add column point_id uuid;
update _q6l9_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _q6l9_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q6l9_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '6' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q6l9_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q6l9_modeles where noeud is null),
			(select count(*) from _q6l9_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, en 6e, brouillon, aucun tag -----------
do $garde$
declare v_presents integer; v_ranges integer; v_niveaux integer; v_statuts integer; v_tags integer;
begin
	select count(*) into v_presents from _q6l9_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
	end if;
	select count(*) into v_ranges from _q6l9_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_niveaux from _q6l9_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from array['6'];
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _q6l9_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from 'draft';
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q6l9_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q6l9_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q6l9_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q6l9_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q6l9_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _q6l9_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q6l9_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _q6l9_modeles;
