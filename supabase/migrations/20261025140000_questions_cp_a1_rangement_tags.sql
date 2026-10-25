-- ============================================================================
-- Chantier « questions », lot A1 du CP (calcul mental) : nœud et tag de 6 modèles neufs
-- ============================================================================
--   - 7eb376bf (Ajouter 1 ou 2) → CP-020 ; 85f93a6e (Soustraire 1 ou 2) → CP-081 ;
--     882c436f (Ajouter 10) → CP-021 ; 87a869c2 (Soustraire 10) → CP-082 ;
--     ee822bbc (dizaines − un chiffre) → CP-028 : sous-notion « calcul astucieux » ;
--   - eccf910b (Moitié d'un nombre pair) → CP-027 : sous-notion « double et moitié ».
-- Chaque modèle va au nœud de son point (sans quoi question_template_points_check_rules refuse
-- le tag). Ni le contenu, ni les niveaux, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-24/25 (journal docs/wip/questions-progress.md § 4 ter). Les modèles
-- ont été créés en brouillon le 2026-10-25 par scripts/create-questions.ts (scripts/questions/cp-a1/),
-- qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée
-- par tests/integration/questions-cp-a1-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-25), sinon
-- un rangement fait depuis à la main serait écrasé. Nœuds désignés par leur chemin, résolus
-- STRICTEMENT.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne d'accès (question tranchée par David le 2026-10-25). Aucune règle ne
-- change. Effet visible : les 6 brouillons apparaissent sous leur sous-notion et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('7eb376bf-20e7-4203-9953-3ecce00b520d'::uuid), ('85f93a6e-4351-45be-b8f5-c122e288144a'::uuid),
--                ('87a869c2-5800-4f4d-853a-ae67fb7c688a'::uuid), ('882c436f-d74c-41df-a449-5175533cdf9c'::uuid),
--                ('eccf910b-e001-4ef5-95fd-bdade806c198'::uuid), ('ee822bbc-4f0d-4a1f-97ce-bab91719f14e'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('7eb376bf-20e7-4203-9953-3ecce00b520d'::uuid, 'CP-020'),
-- 	('85f93a6e-4351-45be-b8f5-c122e288144a'::uuid, 'CP-081'),
-- 	('882c436f-d74c-41df-a449-5175533cdf9c'::uuid, 'CP-021'),
-- 	('87a869c2-5800-4f4d-853a-ae67fb7c688a'::uuid, 'CP-082'),
-- 	('ee822bbc-4f0d-4a1f-97ce-bab91719f14e'::uuid, 'CP-028'),
-- 	('eccf910b-e001-4ef5-95fd-bdade806c198'::uuid, 'CP-027')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CP' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('7eb376bf-20e7-4203-9953-3ecce00b520d', '85f93a6e-4351-45be-b8f5-c122e288144a',
--               '882c436f-d74c-41df-a449-5175533cdf9c', '87a869c2-5800-4f4d-853a-ae67fb7c688a',
--               'ee822bbc-4f0d-4a1f-97ce-bab91719f14e', 'eccf910b-e001-4ef5-95fd-bdade806c198');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qa1_modeles;
create temporary table _qa1_modeles (
	id uuid primary key,
	sous_notion text not null,
	code text not null
);
insert into _qa1_modeles values
	('7eb376bf-20e7-4203-9953-3ecce00b520d', 'calcul astucieux', 'CP-020'),
	('85f93a6e-4351-45be-b8f5-c122e288144a', 'calcul astucieux', 'CP-081'),
	('882c436f-d74c-41df-a449-5175533cdf9c', 'calcul astucieux', 'CP-021'),
	('87a869c2-5800-4f4d-853a-ae67fb7c688a', 'calcul astucieux', 'CP-082'),
	('ee822bbc-4f0d-4a1f-97ce-bab91719f14e', 'calcul astucieux', 'CP-028'),
	('eccf910b-e001-4ef5-95fd-bdade806c198', 'double et moitié', 'CP-027');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qa1_modeles order by id;
select 1 from public.question_templates where id in (select id from _qa1_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
alter table _qa1_modeles add column noeud uuid, add column point_id uuid;
update _qa1_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = 'Nombres et calculs'
   and n.name = 'Entiers : addition et soustraction' and s.name = r.sous_notion;
update _qa1_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CP' and p.code = r.code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _qa1_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qa1_modeles where noeud is null),
			(select count(*) from _qa1_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qa1_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	select count(*) into v_ranges from _qa1_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qa1_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qa1_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qa1_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qa1_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qa1_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qa1_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qa1_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qa1_modeles;
