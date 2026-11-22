-- ============================================================================
-- Chantier « idees-tle-limites » : nœud et tag de 4 modèles neufs (Terminale spécialité, limites)
-- ============================================================================
--   - 1b97da49 (conjecturer la limite en +∞ sur la courbe) → TSPE-397, sur la notion « Fonctions >
--     Limites de fonctions », où est posé le point (aucune sous-notion de lecture graphique) ;
--   - 5ab2aee2 (conjecturer la limite en −∞ sur la courbe) → TSPE-572, sur la même notion ;
--   - a1e540c9 (limite par composition) → TSPE-581, sur « Fonctions > Limites de fonctions >
--     opérations », voisin de 806c10f4 et f6415cb9 ;
--   - ec040806 (quantité conjuguée, hors programme) → sans point, sur « Fonctions > Limites de
--     fonctions > formes indéterminées », voisin de 7844be9a.
-- Chaque modèle porte AU PLUS un point (ADR 0020), posé sur son nœud ou sur la notion de ce nœud
-- (relevé du 2026-11-22 : les trois points sont sur la notion) : question_template_points_check_rules
-- l'exige. Le modèle hors programme, gardé par David (« je garde les modèles hors programme »), est
-- rangé SANS point (ADR 0020 : rangé sans point = hors programme). Ni le contenu, ni le niveau, ni
-- le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-22 (journal docs/wip/idees-tle-limites-progress.md). Les
-- modèles ont été créés en brouillon le 2026-11-22 par scripts/create-questions.ts (lancé par
-- David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (4 modèles). Elle est prouvée par
-- tests/integration/questions-tle-limites-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-22), sinon
-- une retouche faite depuis à la main serait écrasée. Nœud désigné par son chemin, résolu
-- STRICTEMENT ; le point, s'il y en a un, doit être sur ce nœud ou sur sa notion.
--
-- Données d'élèves : aucune (brouillons).
--
-- Accès : personne ne gagne ni ne perd d'accès (rangement de brouillons, question d'accès de la
-- phase 0 : personne). Aucune règle ne change. Effet visible : les 4 brouillons apparaissent sous
-- leur nœud (et leur point) dans l'admin ; les élèves ne voient rien avant la publication par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 3 tags et rend les 4 modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('1b97da49-7eda-4b32-aa3b-21b0c07bfd90'::uuid),
--                ('5ab2aee2-7891-46d8-ba09-eccc9cbefb7a'::uuid),
--                ('a1e540c9-041f-4c68-9c7b-75b8c11fa950'::uuid),
--                ('ec040806-37f0-45e1-9858-472a902d8f75'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('1b97da49-7eda-4b32-aa3b-21b0c07bfd90'::uuid, 'TSPE-397'),
-- 	('5ab2aee2-7891-46d8-ba09-eccc9cbefb7a'::uuid, 'TSPE-572'),
-- 	('a1e540c9-041f-4c68-9c7b-75b8c11fa950'::uuid, 'TSPE-581')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'T_SPE' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '1b97da49-7eda-4b32-aa3b-21b0c07bfd90',
--               '5ab2aee2-7891-46d8-ba09-eccc9cbefb7a',
--               'a1e540c9-041f-4c68-9c7b-75b8c11fa950',
--               'ec040806-37f0-45e1-9858-472a902d8f75');
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
	-- null : modèle hors programme, rangé sans point
	code text
);
insert into _qc_modeles values
	('1b97da49-7eda-4b32-aa3b-21b0c07bfd90', 'Fonctions', 'Limites de fonctions', null, 'TSPE-397'),
	('5ab2aee2-7891-46d8-ba09-eccc9cbefb7a', 'Fonctions', 'Limites de fonctions', null, 'TSPE-572'),
	('a1e540c9-041f-4c68-9c7b-75b8c11fa950', 'Fonctions', 'Limites de fonctions', 'opérations', 'TSPE-581'),
	('ec040806-37f0-45e1-9858-472a902d8f75', 'Fonctions', 'Limites de fonctions', 'formes indéterminées', null);

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qc_modeles order by id;
select 1 from public.question_templates where id in (select id from _qc_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée ; le point est sur ce nœud ou sur sa notion
alter table _qc_modeles add column noeud uuid, add column point_id uuid;
-- Un chemin ne peut désigner qu'un nœud : l'index classification_nodes_sibling_name_key rend le nom
-- unique parmi les frères.
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
 where x.id = r.noeud and r.code is not null
   and p.grade = 'T_SPE' and p.code = r.code and p.archived_at is null
   and p.node_id in (r.noeud, case when x.kind = 'subnotion' then x.parent_id else x.id end);
do $resolution$
begin
	if exists (select 1 from _qc_modeles where noeud is null or (code is not null and point_id is null)) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qc_modeles where noeud is null),
			(select count(*) from _qc_modeles where code is not null and point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qc_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 4) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 4', v_presents;
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
  join public.question_templates q on q.id = r.id
 where r.point_id is not null;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_attendus integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*), count(*) filter (where r.point_id is not null) into v_presents, v_attendus
	  from _qc_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qc_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qc_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qc_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qc_modeles;
