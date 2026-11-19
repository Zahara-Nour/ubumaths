-- ============================================================================
-- Chantier « questions-cm2 », lot 12 (suites et motifs) : nœud et tag de 5 modèles neufs
-- ============================================================================
--   - 4d75350c (Suite de nombres : trouver la règle et continuer) → CM2-068, sur « Algèbre > Premiers pas algébriques > suites de motifs » ;
--   - 1b122322 (Suite à pas constant : un terme éloigné) → CM2-068, sur « Algèbre > Premiers pas algébriques > suites de motifs » ;
--   - 4baa1364 (Motif évolutif : les étapes suivantes) → CM2-069, sur « Algèbre > Premiers pas algébriques > suites de motifs » ;
--   - 6223743f (Motif évolutif : une étape lointaine) → CM2-070, sur « Algèbre > Premiers pas algébriques > suites de motifs » ;
--   - 3ffa86cd (Motif évolutif : le calcul pour l'étape n) → CM2-070, sur « Algèbre > Premiers pas algébriques > suites de motifs » ;
-- Les 5 modèles vont sur la sous-notion « suites de motifs », celle de leurs trois points ; CM2-068
-- et CM2-070 portent chacun deux modèles. Chaque modèle porte UN point (ADR 0020 : au plus un
-- point par programme) ; question_template_points_check_rules refuse un tag hors du nœud du
-- modèle ou de sa notion.
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-19 (journal docs/wip/questions-cm2-progress.md § 19 et 19.1).
-- Les modèles ont été créés en brouillon le 2026-11-19 par scripts/create-questions.ts
-- (scripts/questions/cm2-12/, PR #2864), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-19 (MCP) : 5 brouillons [CM2], sans nœud ni tag, `updated_at` = création. Les modèles CM1
-- et 6e du même nœud ne sont PAS touchés.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (5 modèles). Elle est prouvée par
-- tests/integration/questions-cm2-lot12-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-19), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David AVANT le SQL, en phase 0,
-- tranchée par lui le 2026-11-19 : personne, journal § 19 et 19.1). Aucune règle ne change. Effet visible : les 5
-- brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient
-- qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 5 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('4d75350c-a7fc-46e9-9b57-bb505bb46172'::uuid),
--                ('1b122322-0ce2-4ca4-b366-55f130f11366'::uuid),
--                ('4baa1364-2b79-421a-8e79-899fa41dd432'::uuid),
--                ('6223743f-56fc-412c-9ee9-7b62bc9dba3f'::uuid),
--                ('3ffa86cd-4aa8-46d8-90aa-cec9e81ae256'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('4d75350c-a7fc-46e9-9b57-bb505bb46172'::uuid, 'CM2-068'),
-- 	('1b122322-0ce2-4ca4-b366-55f130f11366'::uuid, 'CM2-068'),
-- 	('4baa1364-2b79-421a-8e79-899fa41dd432'::uuid, 'CM2-069'),
-- 	('6223743f-56fc-412c-9ee9-7b62bc9dba3f'::uuid, 'CM2-070'),
-- 	('3ffa86cd-4aa8-46d8-90aa-cec9e81ae256'::uuid, 'CM2-070')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CM2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('4d75350c-a7fc-46e9-9b57-bb505bb46172',
--               '1b122322-0ce2-4ca4-b366-55f130f11366',
--               '4baa1364-2b79-421a-8e79-899fa41dd432',
--               '6223743f-56fc-412c-9ee9-7b62bc9dba3f',
--               '3ffa86cd-4aa8-46d8-90aa-cec9e81ae256');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qcm2l12_modeles;
create temporary table _qcm2l12_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qcm2l12_modeles values
	('4d75350c-a7fc-46e9-9b57-bb505bb46172', 'Algèbre', 'Premiers pas algébriques', 'suites de motifs', 'CM2-068'),
	('1b122322-0ce2-4ca4-b366-55f130f11366', 'Algèbre', 'Premiers pas algébriques', 'suites de motifs', 'CM2-068'),
	('4baa1364-2b79-421a-8e79-899fa41dd432', 'Algèbre', 'Premiers pas algébriques', 'suites de motifs', 'CM2-069'),
	('6223743f-56fc-412c-9ee9-7b62bc9dba3f', 'Algèbre', 'Premiers pas algébriques', 'suites de motifs', 'CM2-070'),
	('3ffa86cd-4aa8-46d8-90aa-cec9e81ae256', 'Algèbre', 'Premiers pas algébriques', 'suites de motifs', 'CM2-070');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm2l12_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm2l12_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée ; le point est sur ce nœud ou sur sa notion
alter table _qcm2l12_modeles add column noeud uuid, add column point_id uuid;
update _qcm2l12_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qcm2l12_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qcm2l12_modeles r set point_id = p.id
  from public.curriculum_points p, public.classification_nodes s
 where s.id = r.noeud and p.grade = 'CM2' and p.code = r.code and p.archived_at is null
   and (p.node_id = s.id or (s.kind = 'subnotion' and p.node_id = s.parent_id));
do $resolution$
begin
	if exists (select 1 from _qcm2l12_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qcm2l12_modeles where noeud is null),
			(select count(*) from _qcm2l12_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm2l12_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 5) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 5', v_presents;
	end if;
	select count(*) into v_ranges from _qcm2l12_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcm2l12_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qcm2l12_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qcm2l12_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm2l12_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm2l12_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qcm2l12_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm2l12_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qcm2l12_modeles;
