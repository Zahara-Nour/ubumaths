-- ============================================================================
-- Chantier « questions-2de », lot 10 (ensembles et logique) : nœud et tag de 11 modèles neufs,
-- niveaux de 2 anciens brouillons
-- ============================================================================
-- 10 A, ensembles :
--   - 99af2696 (appartenance) → 2-201, sur « Ensembles > Ensembles de nombres > appartenance et inclusion » ;
--   - e7db99fc (ensemble vide) → 2-202, sur la notion « Ensembles > Opérations sur les ensembles » ;
--   - c22d387e (le bon symbole : ∈, ⊂, ∩, ∪) → 2-203, sur la notion « Ensembles > Opérations sur les
--     ensembles », où est posé le point 2-203 (la sous-notion « appartenance et inclusion », visée au
--     § 83 du journal, n'est pas sous cette notion : la base y refuserait le tag) ;
--   - 994437aa (notations Ā et E \ A) → 2-206, sur « … > Opérations sur les ensembles > complémentaire ».
-- 10 B, logique :
--   - fa39b703 (proposition ou non) → 2-208, sur la notion « Logique > Proposition mathématique » ;
--   - 9207c6e6 (proposition avec une variable) → 2-209, sur « … > statut des lettres et des égalités » ;
--   - c4e19f99 (négation) → 2-211, sur « Logique > Quantificateurs et négation > négation d'une proposition » ;
--   - 214f7500 (formuler une implication) → 2-213, sur « Logique > Implication et équivalence > implication » ;
--   - 75d0fc89 (implication ou équivalence) → 2-409, sur « … > Implication et équivalence > équivalence » ;
--   - 61d0571e (« pour tout ») → 2-215 et 24fd6a10 (« il existe ») → 2-412, sur « Logique >
--     Quantificateurs et négation > pour tout, il existe ».
-- Chaque modèle porte UN point (ADR 0020), posé sur son nœud ou sur la notion de ce nœud (relevé
-- du 2026-11-05) : question_template_points_check_rules l'exige.
-- Niveaux (décision L10-a) : 5062197a (vrai ou faux : inclusion) et 5b20321f (à quels ensembles
-- appartient ce nombre ?), anciens brouillons rangés et tagués en 2de, passent de {2, 1_SPE} à {2}.
-- Ni le contenu ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-05 (journal docs/wip/questions-2de-progress.md § 82). Les
-- modèles neufs ont été créés en brouillon le 2026-11-05 par scripts/create-questions.ts (lots 10 A
-- et 10 B, lancés par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (11 modèles neufs, 2 anciens). Elle
-- est prouvée par tests/integration/questions-2de-lot10-rangement-tags.test.ts, qui fabrique des
-- copies des identifiants de la prod (les neufs sans nœud ni tag, les anciens en {2, 1_SPE}) puis
-- rejoue CE fichier.
--
-- Gardes : chaque modèle neuf doit être encore SANS nœud et SANS aucun tag, chaque ancien encore en
-- {2, 1_SPE} (relevé du 2026-11-05), sinon une retouche faite depuis à la main serait écrasée.
-- Nœud désigné par son chemin, résolu STRICTEMENT ; le point doit être sur ce nœud ou sur sa notion.
--
-- Données d'élèves : aucune (brouillons).
--
-- Accès : personne ne gagne ni ne perd d'accès (question d'accès des lots de questions-2de, tranchée
-- par David : personne). Aucune règle ne change. Effet visible : les 11 brouillons apparaissent sous
-- leur nœud et sous leur point dans l'admin ; les 2 anciens ne sont plus proposés en 1re ; les élèves
-- ne voient rien avant la publication par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 11 tags, rend les 11 modèles sans nœud et les 2
-- anciens en {2, 1_SPE}. Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('99af2696-1482-43e8-bd02-714b279180ed'::uuid),
--                ('e7db99fc-d513-4979-8084-e1caa0279735'::uuid),
--                ('c22d387e-5d6e-4da9-83eb-efc56748e1ea'::uuid),
--                ('994437aa-6626-4a78-8b6b-f195bb985e9b'::uuid),
--                ('fa39b703-dad2-4951-a1fd-22665befafbd'::uuid),
--                ('9207c6e6-2875-4927-b651-45982a09d428'::uuid),
--                ('c4e19f99-9c7a-4d6b-941a-d7e6516c078a'::uuid),
--                ('214f7500-0e36-4208-b688-44ddabde06d8'::uuid),
--                ('75d0fc89-24b1-4edb-abf2-82b7e76f272e'::uuid),
--                ('61d0571e-b6f3-413b-9272-3539b8a55708'::uuid),
--                ('24fd6a10-7843-4b7c-9e7c-7a05b1696bc9'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('99af2696-1482-43e8-bd02-714b279180ed'::uuid, '2-201'),
-- 	('e7db99fc-d513-4979-8084-e1caa0279735'::uuid, '2-202'),
-- 	('c22d387e-5d6e-4da9-83eb-efc56748e1ea'::uuid, '2-203'),
-- 	('994437aa-6626-4a78-8b6b-f195bb985e9b'::uuid, '2-206'),
-- 	('fa39b703-dad2-4951-a1fd-22665befafbd'::uuid, '2-208'),
-- 	('9207c6e6-2875-4927-b651-45982a09d428'::uuid, '2-209'),
-- 	('c4e19f99-9c7a-4d6b-941a-d7e6516c078a'::uuid, '2-211'),
-- 	('214f7500-0e36-4208-b688-44ddabde06d8'::uuid, '2-213'),
-- 	('75d0fc89-24b1-4edb-abf2-82b7e76f272e'::uuid, '2-409'),
-- 	('61d0571e-b6f3-413b-9272-3539b8a55708'::uuid, '2-215'),
-- 	('24fd6a10-7843-4b7c-9e7c-7a05b1696bc9'::uuid, '2-412')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '99af2696-1482-43e8-bd02-714b279180ed',
--               'e7db99fc-d513-4979-8084-e1caa0279735',
--               'c22d387e-5d6e-4da9-83eb-efc56748e1ea',
--               '994437aa-6626-4a78-8b6b-f195bb985e9b',
--               'fa39b703-dad2-4951-a1fd-22665befafbd',
--               '9207c6e6-2875-4927-b651-45982a09d428',
--               'c4e19f99-9c7a-4d6b-941a-d7e6516c078a',
--               '214f7500-0e36-4208-b688-44ddabde06d8',
--               '75d0fc89-24b1-4edb-abf2-82b7e76f272e',
--               '61d0571e-b6f3-413b-9272-3539b8a55708',
--               '24fd6a10-7843-4b7c-9e7c-7a05b1696bc9');
-- update public.question_templates set grades = array['2', '1_SPE']::text[]
--  where id in ('5062197a-5ffa-47bf-805d-8ec39d4445b8', '5b20321f-e86a-4a13-b478-1cf4f441e920')
--    and grades = array['2']::text[];
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
	('99af2696-1482-43e8-bd02-714b279180ed', 'Ensembles', 'Ensembles de nombres', 'appartenance et inclusion', '2-201'),
	('e7db99fc-d513-4979-8084-e1caa0279735', 'Ensembles', 'Opérations sur les ensembles', null, '2-202'),
	('c22d387e-5d6e-4da9-83eb-efc56748e1ea', 'Ensembles', 'Opérations sur les ensembles', null, '2-203'),
	('994437aa-6626-4a78-8b6b-f195bb985e9b', 'Ensembles', 'Opérations sur les ensembles', 'complémentaire', '2-206'),
	('fa39b703-dad2-4951-a1fd-22665befafbd', 'Logique', 'Proposition mathématique', null, '2-208'),
	('9207c6e6-2875-4927-b651-45982a09d428', 'Logique', 'Proposition mathématique', 'statut des lettres et des égalités', '2-209'),
	('c4e19f99-9c7a-4d6b-941a-d7e6516c078a', 'Logique', 'Quantificateurs et négation', 'négation d''une proposition', '2-211'),
	('214f7500-0e36-4208-b688-44ddabde06d8', 'Logique', 'Implication et équivalence', 'implication', '2-213'),
	('75d0fc89-24b1-4edb-abf2-82b7e76f272e', 'Logique', 'Implication et équivalence', 'équivalence', '2-409'),
	('61d0571e-b6f3-413b-9272-3539b8a55708', 'Logique', 'Quantificateurs et négation', 'pour tout, il existe', '2-215'),
	('24fd6a10-7843-4b7c-9e7c-7a05b1696bc9', 'Logique', 'Quantificateurs et négation', 'pour tout, il existe', '2-412');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qc_modeles order by id;
select 1 from public.question_templates where id in (select id from _qc_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée ; le point est sur ce nœud ou sur sa notion
alter table _qc_modeles add column noeud uuid, add column point_id uuid;
-- Un chemin ne peut désigner qu'un nœud : l'index classification_nodes_sibling_name_key rend le nom
-- unique parmi les frères (remarque de l'audit du lot 12 b-2).
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
	if v_presents not in (0, 11) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 11', v_presents;
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

-- ---- 3 bis. Niveaux des 2 anciens brouillons (L10-a) : {2, 1_SPE} → {2} --------------
-- Présence TOUT ou RIEN (0 ou 2), et niveaux encore ceux du relevé, sinon une retouche faite depuis
-- serait écrasée.
drop table if exists pg_temp._qc_niveaux;
create temporary table _qc_niveaux (id uuid primary key);
insert into _qc_niveaux values
	('5062197a-5ffa-47bf-805d-8ec39d4445b8'),
	('5b20321f-e86a-4a13-b478-1cf4f441e920');
select 1 from public.question_templates where id in (select id from _qc_niveaux) order by id for update;
do $garde_niveaux$
declare v_presents integer; v_conformes integer;
begin
	select count(*), count(*) filter (where q.grades = array['2', '1_SPE']::text[])
	  into v_presents, v_conformes
	  from _qc_niveaux r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 2) then
		raise exception 'anciens brouillons partiellement présents : % sur 2', v_presents;
	end if;
	if v_conformes <> v_presents then
		raise exception 'niveaux des anciens brouillons modifiés depuis le relevé : % sur %',
			v_presents - v_conformes, v_presents;
	end if;
end $garde_niveaux$;

-- ---- 4. Rangement, niveaux, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qc_modeles r
 where q.id = r.id;
update public.question_templates q set grades = array['2']::text[]
  from _qc_niveaux r
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

do $check_niveaux$
begin
	if exists (select 1 from _qc_niveaux r join public.question_templates q on q.id = r.id
	            where q.grades <> array['2']::text[]) then
		raise exception 'niveaux des anciens brouillons non ramenés à {2}';
	end if;
end $check_niveaux$;

drop table _qc_modeles;
drop table _qc_niveaux;
