-- ============================================================================
-- Chantier « questions-cm1 », lot 5a (longueurs) : nœud et tag de 7 modèles neufs
-- ============================================================================
--   - 0720f9de (Les unités de longueur, du millimètre au kilomètre) → CM1-067, sur « Grandeurs et mesures > Longueurs > unités et conversions » ;
--   - da2e705f (Relations entre les unités de longueur) → CM1-068, sur « Grandeurs et mesures > Longueurs > unités et conversions » ;
--   - e22cff99 (Longueurs : écritures décimales et fractions) → CM1-068, sur « Grandeurs et mesures > Longueurs > unités et conversions » ;
--   - 2a08a490 (Quelle unité pour mesurer une longueur ?) → CM1-069, sur « Grandeurs et mesures > Longueurs > unités et conversions » ;
--   - 8aa2821f (Comparer des longueurs d'unités différentes) → CM1-070, sur « Grandeurs et mesures > Longueurs > comparaison et mesure » ;
--   - 89283903 (Des longueurs de référence, du millimètre au kilomètre) → CM1-071, sur « Grandeurs et mesures > Longueurs > comparaison et mesure » ;
--   - 1e01404d (Estimer une longueur) → CM1-072, sur « Grandeurs et mesures > Longueurs > comparaison et mesure » ;
-- Chaque modèle va sur la SOUS-NOTION de son point et porte CE point, un seul (ADR 0020). Les
-- deux modèles de relations (entiers ; décimaux et fractions) portent le même point CM1-068.
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-02 (journal docs/wip/questions-cm1-progress.md § 14 et
-- 14 bis). Les modèles ont été créés en brouillon le 2026-11-02 par scripts/create-questions.ts
-- (scripts/questions/cm1-5a/, PR #2201), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-02 (MCP) : 7 brouillons [CM1], sans nœud ni tag ; 067-069 sur « Longueurs › unités et
-- conversions », 070-072 sur « Longueurs › comparaison et mesure » ; aucun modèle sur ces points.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-cm1-lot5a-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-02), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT ; le point doit être sur ce nœud.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David AVANT le SQL, tranchée par
-- lui le 2026-11-02 : personne, journal § 14 et 14 bis). Aucune règle ne change. Effet visible : les 7
-- brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient
-- qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('0720f9de-4387-4bd4-ad5c-3e6526f27dc1'::uuid),
--                ('da2e705f-ca7b-4715-b0fc-992d440f02b5'::uuid),
--                ('e22cff99-529a-49c9-8ef9-0c48b7dae6ea'::uuid),
--                ('2a08a490-7ee7-45c6-8b17-9c7abd3a3bf9'::uuid),
--                ('8aa2821f-d852-464b-9ff6-c7a8c373a6e9'::uuid),
--                ('89283903-974d-44b3-8350-99f62f56e3ce'::uuid),
--                ('1e01404d-5400-4a39-b465-7e86b5b7bd6e'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('0720f9de-4387-4bd4-ad5c-3e6526f27dc1'::uuid, 'CM1-067'),
-- 	('da2e705f-ca7b-4715-b0fc-992d440f02b5'::uuid, 'CM1-068'),
-- 	('e22cff99-529a-49c9-8ef9-0c48b7dae6ea'::uuid, 'CM1-068'),
-- 	('2a08a490-7ee7-45c6-8b17-9c7abd3a3bf9'::uuid, 'CM1-069'),
-- 	('8aa2821f-d852-464b-9ff6-c7a8c373a6e9'::uuid, 'CM1-070'),
-- 	('89283903-974d-44b3-8350-99f62f56e3ce'::uuid, 'CM1-071'),
-- 	('1e01404d-5400-4a39-b465-7e86b5b7bd6e'::uuid, 'CM1-072')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CM1' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('0720f9de-4387-4bd4-ad5c-3e6526f27dc1',
--               'da2e705f-ca7b-4715-b0fc-992d440f02b5',
--               'e22cff99-529a-49c9-8ef9-0c48b7dae6ea',
--               '2a08a490-7ee7-45c6-8b17-9c7abd3a3bf9',
--               '8aa2821f-d852-464b-9ff6-c7a8c373a6e9',
--               '89283903-974d-44b3-8350-99f62f56e3ce',
--               '1e01404d-5400-4a39-b465-7e86b5b7bd6e');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qcm1l5a_modeles;
create temporary table _qcm1l5a_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qcm1l5a_modeles values
	('0720f9de-4387-4bd4-ad5c-3e6526f27dc1', 'Grandeurs et mesures', 'Longueurs', 'unités et conversions', 'CM1-067'),
	('da2e705f-ca7b-4715-b0fc-992d440f02b5', 'Grandeurs et mesures', 'Longueurs', 'unités et conversions', 'CM1-068'),
	('e22cff99-529a-49c9-8ef9-0c48b7dae6ea', 'Grandeurs et mesures', 'Longueurs', 'unités et conversions', 'CM1-068'),
	('2a08a490-7ee7-45c6-8b17-9c7abd3a3bf9', 'Grandeurs et mesures', 'Longueurs', 'unités et conversions', 'CM1-069'),
	('8aa2821f-d852-464b-9ff6-c7a8c373a6e9', 'Grandeurs et mesures', 'Longueurs', 'comparaison et mesure', 'CM1-070'),
	('89283903-974d-44b3-8350-99f62f56e3ce', 'Grandeurs et mesures', 'Longueurs', 'comparaison et mesure', 'CM1-071'),
	('1e01404d-5400-4a39-b465-7e86b5b7bd6e', 'Grandeurs et mesures', 'Longueurs', 'comparaison et mesure', 'CM1-072');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm1l5a_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm1l5a_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée
alter table _qcm1l5a_modeles add column noeud uuid, add column point_id uuid;
update _qcm1l5a_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qcm1l5a_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
-- Le point est sur le nœud du modèle
update _qcm1l5a_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CM1' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qcm1l5a_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qcm1l5a_modeles where noeud is null),
			(select count(*) from _qcm1l5a_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm1l5a_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
	end if;
	select count(*) into v_ranges from _qcm1l5a_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcm1l5a_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qcm1l5a_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qcm1l5a_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qcm1l5a_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm1l5a_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qcm1l5a_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm1l5a_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qcm1l5a_modeles;
