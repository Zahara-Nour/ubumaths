-- ============================================================================
-- Chantier « questions-tspe-proba », lot 5a (succession d'épreuves) : nœud et tags de 9 modèles
-- ============================================================================
--   les 9 brouillons du lot 5a, créés sans nœud ni tag, vont sur un nœud EXISTANT, tag posé :
--   bd9b293f (Univers d'une succession d'épreuves) → TSPE-612 ;
--   7e357962 (Probabilité d'une issue) → TSPE-501 ;
--   303aeac2 (Modéliser par des épreuves indépendantes) → TSPE-505 ;
--   eb12ac14 (Arbre d'une succession : chemins, indépendance) → TSPE-613 ;
--   883c9922 (Compléter l'arbre de trois épreuves) → TSPE-506 ;
--   5925e666 (Deux ou trois tirages sans remise) → TSPE-615 ;
--     tous les six sur « Probabilités conditionnelles > épreuves indépendantes successives », nœud
--     de leurs points ;
--   e82450c7 (Calculer en utilisant l'indépendance) → TSPE-507, « Probabilités conditionnelles >
--     indépendance » (point sur la notion) ;
--   ecf4d46b (Probabilités totales) → TSPE-617, « Probabilités conditionnelles > probabilités
--     totales » (point sur la notion) ;
--   4ee9a359 (Seuil par la loi binomiale) → TSPE-509, « Loi binomiale > expression de la loi ».
-- Branche : « Probabilités ». Aucune sous-notion neuve. question_template_points_check_rules
-- accepte un tag dont le point est sur le nœud du modèle OU sur sa notion, et au plus UN point par
-- programme (ADR 0020).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-02 (journal docs/wip/questions-tspe-proba-progress.md,
-- § Lot 5a). Les modèles ont été créés en brouillon le 2026-11-02 par scripts/create-questions.ts
-- (scripts/questions/tspe-5a-succession/, #2240), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-02 (MCP) : 9 brouillons en [T_SPE], niveaux 1, 2, 3, 4 (Épreuves indépendantes), 1, 2
-- (Arbres), 1, 2 (Épreuves dépendantes), 6 (Loi binomiale > Calcul de probabilités), sans nœud ni
-- tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (9 modèles). Elle est prouvée par
-- tests/integration/questions-tspe-lot5a-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : chaque modèle doit être encore SANS nœud et SANS aucun tag
-- (relevé du 2026-11-02), sinon un rangement fait depuis à la main serait écrasé. Nœuds désignés
-- par leur chemin, résolus STRICTEMENT ; chaque point doit être sur le nœud de son modèle ou sur sa
-- notion.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin et prof ; leurs tags, pas leur
-- contenu, lisibles par tout compte connecté, comme avant). Question posée avec la phase 0 du lot
-- 5a, « je valide » de David le 2026-11-02. Aucune règle (policy) ne change. Les élèves ne voient
-- les modèles qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 9 tags et rend les modèles sans nœud. Garde : il
-- refuse si un modèle n'est plus sur le nœud laissé par la migration ou porte d'autres tags. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qtl5a_retour;
-- create temporary table _qtl5a_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text,
-- 	grade text not null, code text not null, noeud uuid
-- );
-- insert into _qtl5a_retour values
-- 	('bd9b293f-ddc3-465c-8d9d-3451a897b656', 'Probabilités', 'Probabilités conditionnelles', 'épreuves indépendantes successives', 'T_SPE', 'TSPE-612', null),
-- 	('7e357962-aa93-43cd-a3d5-3c0020f0020b', 'Probabilités', 'Probabilités conditionnelles', 'épreuves indépendantes successives', 'T_SPE', 'TSPE-501', null),
-- 	('303aeac2-268d-4654-9b9a-702068a38562', 'Probabilités', 'Probabilités conditionnelles', 'épreuves indépendantes successives', 'T_SPE', 'TSPE-505', null),
-- 	('e82450c7-fbb5-47e4-8a97-7762b8e1c3e6', 'Probabilités', 'Probabilités conditionnelles', 'indépendance', 'T_SPE', 'TSPE-507', null),
-- 	('eb12ac14-2618-43aa-995f-491d56a57406', 'Probabilités', 'Probabilités conditionnelles', 'épreuves indépendantes successives', 'T_SPE', 'TSPE-613', null),
-- 	('883c9922-023c-47ee-acef-e112a13ae955', 'Probabilités', 'Probabilités conditionnelles', 'épreuves indépendantes successives', 'T_SPE', 'TSPE-506', null),
-- 	('5925e666-75c5-45a7-91d8-dd92f9853ead', 'Probabilités', 'Probabilités conditionnelles', 'épreuves indépendantes successives', 'T_SPE', 'TSPE-615', null),
-- 	('ecf4d46b-02d5-4fd1-86db-eac7b017a257', 'Probabilités', 'Probabilités conditionnelles', 'probabilités totales', 'T_SPE', 'TSPE-617', null),
-- 	('4ee9a359-c6b1-43af-9082-24cc6cdc8c53', 'Probabilités', 'Loi binomiale', 'expression de la loi', 'T_SPE', 'TSPE-509', null);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qtl5a_retour order by id;
-- select 1 from public.question_templates where id in (select id from _qtl5a_retour) order by id for update;
-- update _qtl5a_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and r.sous_notion is not null and s.name = r.sous_notion;
-- update _qtl5a_retour r set noeud = n.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and r.sous_notion is null;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _qtl5a_retour where noeud is null) then
-- 		raise exception 'rollback : nœuds introuvables : %', (select count(*) from _qtl5a_retour where noeud is null);
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _qtl5a_retour r on r.id = q.id;
-- 	if v_presents not in (0, 9) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 9', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ne sont plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*), count(*) filter (where p.grade = r.grade and p.code = r.code)
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _qtl5a_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_total or v_total <> v_presents then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_presents;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _qtl5a_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _qtl5a_retour);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _qtl5a_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._qtl5a_tags;
drop table if exists pg_temp._qtl5a_modeles;
create temporary table _qtl5a_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text  -- null : le modèle va sur la notion (qui n'a pas de sous-notion)
);
insert into _qtl5a_modeles values
	('bd9b293f-ddc3-465c-8d9d-3451a897b656', 'Probabilités', 'Probabilités conditionnelles', 'épreuves indépendantes successives'),
	('7e357962-aa93-43cd-a3d5-3c0020f0020b', 'Probabilités', 'Probabilités conditionnelles', 'épreuves indépendantes successives'),
	('303aeac2-268d-4654-9b9a-702068a38562', 'Probabilités', 'Probabilités conditionnelles', 'épreuves indépendantes successives'),
	('e82450c7-fbb5-47e4-8a97-7762b8e1c3e6', 'Probabilités', 'Probabilités conditionnelles', 'indépendance'),
	('eb12ac14-2618-43aa-995f-491d56a57406', 'Probabilités', 'Probabilités conditionnelles', 'épreuves indépendantes successives'),
	('883c9922-023c-47ee-acef-e112a13ae955', 'Probabilités', 'Probabilités conditionnelles', 'épreuves indépendantes successives'),
	('5925e666-75c5-45a7-91d8-dd92f9853ead', 'Probabilités', 'Probabilités conditionnelles', 'épreuves indépendantes successives'),
	('ecf4d46b-02d5-4fd1-86db-eac7b017a257', 'Probabilités', 'Probabilités conditionnelles', 'probabilités totales'),
	('4ee9a359-c6b1-43af-9082-24cc6cdc8c53', 'Probabilités', 'Loi binomiale', 'expression de la loi');
create temporary table _qtl5a_tags (
	id uuid not null references _qtl5a_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _qtl5a_tags values
	('bd9b293f-ddc3-465c-8d9d-3451a897b656', 'T_SPE', 'TSPE-612'),
	('7e357962-aa93-43cd-a3d5-3c0020f0020b', 'T_SPE', 'TSPE-501'),
	('303aeac2-268d-4654-9b9a-702068a38562', 'T_SPE', 'TSPE-505'),
	('e82450c7-fbb5-47e4-8a97-7762b8e1c3e6', 'T_SPE', 'TSPE-507'),
	('eb12ac14-2618-43aa-995f-491d56a57406', 'T_SPE', 'TSPE-613'),
	('883c9922-023c-47ee-acef-e112a13ae955', 'T_SPE', 'TSPE-506'),
	('5925e666-75c5-45a7-91d8-dd92f9853ead', 'T_SPE', 'TSPE-615'),
	('ecf4d46b-02d5-4fd1-86db-eac7b017a257', 'T_SPE', 'TSPE-617'),
	('4ee9a359-c6b1-43af-9082-24cc6cdc8c53', 'T_SPE', 'TSPE-509');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qtl5a_modeles order by id;
select 1 from public.question_templates where id in (select id from _qtl5a_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) : présence TOUT ou RIEN, sans nœud, sans tag ---------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qtl5a_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 9) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 9', v_presents;
	end if;
	select count(*) into v_ranges from _qtl5a_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qtl5a_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. Résolution STRICTE des chemins et des points -----------------------------------
-- Le nœud est la sous-notion désignée, ou la notion quand aucune sous-notion n'est donnée ; chaque
-- point doit être sur ce nœud ou sur sa notion
alter table _qtl5a_modeles add column noeud uuid;
alter table _qtl5a_modeles add column notion_id uuid;
alter table _qtl5a_tags add column point_id uuid;
update _qtl5a_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is not null and s.name = r.sous_notion;
update _qtl5a_modeles r set noeud = n.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qtl5a_tags t set point_id = p.id
  from _qtl5a_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _qtl5a_modeles where noeud is null)
	   or exists (select 1 from _qtl5a_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qtl5a_modeles where noeud is null),
			(select count(*) from _qtl5a_tags where point_id is null);
	end if;
	-- Une notion désignée sans sous-notion ne doit en avoir AUCUNE (sinon le modèle irait par erreur
	-- sur la notion au lieu d'une de ses sous-notions)
	if exists (select 1 from _qtl5a_modeles r
	             join public.classification_nodes s on s.parent_id = r.notion_id
	              and s.kind = 'subnotion' and s.archived_at is null
	            where r.sous_notion is null) then
		raise exception 'notion visée sans sous-notion, mais elle en a : % modèle(s)',
			(select count(*) from _qtl5a_modeles r
			  where r.sous_notion is null
			    and exists (select 1 from public.classification_nodes s where s.parent_id = r.notion_id
			                  and s.kind = 'subnotion' and s.archived_at is null));
	end if;
end $resolution$;

-- ---- 4. Rangement, puis tags (le trigger des tags lit le nœud du modèle) -----------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qtl5a_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _qtl5a_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qtl5a_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qtl5a_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _qtl5a_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _qtl5a_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qtl5a_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qtl5a_tags;
drop table _qtl5a_modeles;
