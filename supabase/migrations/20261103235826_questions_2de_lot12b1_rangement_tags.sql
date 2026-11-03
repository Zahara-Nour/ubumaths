-- ============================================================================
-- Chantier « questions-2de », lot 12 b-1 (vecteurs sans coordonnées) : nœud et tag de 5 modèles neufs
-- ============================================================================
--   - ac50c946 (égalité de deux vecteurs) → 2-287, sur « Géométrie > Vecteurs > égalité de vecteurs » ;
--   - 2228d79e (le vecteur nul) → 2-433, sur « Géométrie > Vecteurs > égalité de vecteurs » ;
--   - 7d07b0c2 (représentants d'un vecteur) → 2-288, sur « Géométrie > Vecteurs > égalité de vecteurs » ;
--   - 37a1b7ab (milieu d'un segment et vecteurs) → 2-296, sur « Géométrie > Vecteurs > égalité de vecteurs »
--     (décision L12b-b de David, 2026-11-04) ;
--   - 51192dc4 (représenter la somme de deux vecteurs) → 2-297, sur « Géométrie > Vecteurs > somme et
--     relation de Chasles ».
-- Chaque modèle va sur la sous-notion de la phase 0 et porte UN point (ADR 0020). Le point est sur
-- ce nœud, ou sur sa NOTION pour 2-296 (point rangé sur « Vecteurs ») : question_template_points_check_rules
-- admet un point sur le nœud du modèle ou sur la notion de ce nœud.
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-04 (journal docs/wip/questions-2de-progress.md § 77). Les
-- modèles ont été créés en brouillon le 2026-11-04 par scripts/create-questions.ts (lot 12 b-1, lancé
-- par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (5 modèles). Elle est prouvée par
-- tests/integration/questions-2de-lot12b1-rangement-tags.test.ts, qui fabrique des copies
-- des identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-04), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT ; le point doit être sur ce nœud ou sur sa notion.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question d'accès de la phase 0, § 77, tranchée par
-- David le 2026-11-04 : personne). Aucune règle ne change. Effet visible : les 5 brouillons
-- apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient qu'une
-- fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 5 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('ac50c946-05f0-464b-a39f-323b3226293a'::uuid),
--                ('2228d79e-c5db-43e3-b896-26ea11aefbdd'::uuid),
--                ('7d07b0c2-dfa7-45a5-997e-0309d14af3bb'::uuid),
--                ('37a1b7ab-94c8-4ad7-9286-934d10cc7b5f'::uuid),
--                ('51192dc4-78df-4d5d-b6be-7062f456cef3'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('ac50c946-05f0-464b-a39f-323b3226293a'::uuid, '2-287'),
-- 	('2228d79e-c5db-43e3-b896-26ea11aefbdd'::uuid, '2-433'),
-- 	('7d07b0c2-dfa7-45a5-997e-0309d14af3bb'::uuid, '2-288'),
-- 	('37a1b7ab-94c8-4ad7-9286-934d10cc7b5f'::uuid, '2-296'),
-- 	('51192dc4-78df-4d5d-b6be-7062f456cef3'::uuid, '2-297')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               'ac50c946-05f0-464b-a39f-323b3226293a',
--               '2228d79e-c5db-43e3-b896-26ea11aefbdd',
--               '7d07b0c2-dfa7-45a5-997e-0309d14af3bb',
--               '37a1b7ab-94c8-4ad7-9286-934d10cc7b5f',
--               '51192dc4-78df-4d5d-b6be-7062f456cef3');
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
	code text not null
);
insert into _qc_modeles values
	('ac50c946-05f0-464b-a39f-323b3226293a', 'Géométrie', 'Vecteurs', 'égalité de vecteurs', '2-287'),
	('2228d79e-c5db-43e3-b896-26ea11aefbdd', 'Géométrie', 'Vecteurs', 'égalité de vecteurs', '2-433'),
	('7d07b0c2-dfa7-45a5-997e-0309d14af3bb', 'Géométrie', 'Vecteurs', 'égalité de vecteurs', '2-288'),
	('37a1b7ab-94c8-4ad7-9286-934d10cc7b5f', 'Géométrie', 'Vecteurs', 'égalité de vecteurs', '2-296'),
	('51192dc4-78df-4d5d-b6be-7062f456cef3', 'Géométrie', 'Vecteurs', 'somme et relation de Chasles', '2-297');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qc_modeles order by id;
select 1 from public.question_templates where id in (select id from _qc_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée ; le point est sur ce nœud ou sur sa notion
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
  from public.curriculum_points p, public.classification_nodes x
 where x.id = r.noeud
   and p.grade = '2' and p.code = r.code and p.archived_at is null
   and p.node_id in (r.noeud, case when x.kind = 'subnotion' then x.parent_id else x.id end);
do $resolution$
begin
	if exists (select 1 from _qc_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qc_modeles where noeud is null),
			(select count(*) from _qc_modeles where point_id is null);
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
