-- ============================================================================
-- Chantier « questions-ce2 », lot 3 (vocabulaire des opérations) : nœud et tag des 6 brouillons neufs
-- ============================================================================
-- Chaque modèle va sur le nœud de son point, une NOTION de « Nombres et calculs » (les trois points
-- n'ont pas de sous-notion) :
--   - 1076ebed (La somme de deux ou trois nombres) → CE2-015, notion « Entiers : addition et soustraction » ;
--   - b461cd02 (La différence entre deux nombres) → CE2-015, notion « Entiers : addition et soustraction » ;
--   - 0ada6949 (Termes, somme et différence dans une égalité) → CE2-015, notion « Entiers : addition et soustraction » ;
--   - c9bd997c (Le produit de deux nombres) → CE2-017, notion « Entiers : multiplication » ;
--   - baec0070 (Facteurs et produit dans une égalité) → CE2-017, notion « Entiers : multiplication » ;
--   - 376a2264 (Les multiples d'un nombre) → CE2-091, notion « Entiers : multiplication ».
-- Le modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag hors
-- du nœud du point) et porte UN point (ADR 0020). Ni le contenu, ni le niveau, ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-10-29 (journal docs/wip/questions-ce2-progress.md, § 7).
-- Créés en brouillon le 2026-10-29 par scripts/create-questions.ts (scripts/questions/ce2-3/,
-- lancé par David), qui ne pose ni nœud ni tag. Relevé de la prod du 2026-10-29 (MCP) : 6
-- brouillons [CE2], sans nœud ni tag ; nœuds des points relevés identiques aux chemins ci-dessus.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne les touche pas et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée par
-- tests/integration/questions-ce2-lot3-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-29), sinon
-- un rangement fait depuis à la main serait écrasé. Nœuds désignés par leur chemin, résolus
-- STRICTEMENT, et qui doivent être ceux des points.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès (question posée à David avant le SQL, tranchée le 2026-10-29, journal § 7) : personne
-- ne gagne ni ne perd d'accès (brouillons : prof et admin). Aucune règle ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('1076ebed-6b19-4259-9afa-c09932e97ba4'::uuid),
--                ('b461cd02-f72a-44d5-9158-111b1410e116'::uuid),
--                ('0ada6949-e6e5-42b3-961c-6b40e6d35af0'::uuid),
--                ('c9bd997c-2055-4b0b-8e26-0bd929996c38'::uuid),
--                ('baec0070-8a67-4c58-99c6-dc9fd127cc3d'::uuid),
--                ('376a2264-d460-4d48-88e8-b443177bfa33'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('1076ebed-6b19-4259-9afa-c09932e97ba4'::uuid, 'CE2-015'),
-- 	('b461cd02-f72a-44d5-9158-111b1410e116'::uuid, 'CE2-015'),
-- 	('0ada6949-e6e5-42b3-961c-6b40e6d35af0'::uuid, 'CE2-015'),
-- 	('c9bd997c-2055-4b0b-8e26-0bd929996c38'::uuid, 'CE2-017'),
-- 	('baec0070-8a67-4c58-99c6-dc9fd127cc3d'::uuid, 'CE2-017'),
-- 	('376a2264-d460-4d48-88e8-b443177bfa33'::uuid, 'CE2-091')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CE2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('1076ebed-6b19-4259-9afa-c09932e97ba4',
--               'b461cd02-f72a-44d5-9158-111b1410e116',
--               '0ada6949-e6e5-42b3-961c-6b40e6d35af0',
--               'c9bd997c-2055-4b0b-8e26-0bd929996c38',
--               'baec0070-8a67-4c58-99c6-dc9fd127cc3d',
--               '376a2264-d460-4d48-88e8-b443177bfa33');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qce2l3_modeles;
create temporary table _qce2l3_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qce2l3_modeles values
	('1076ebed-6b19-4259-9afa-c09932e97ba4', 'Nombres et calculs', 'Entiers : addition et soustraction', null, 'CE2-015'),
	('b461cd02-f72a-44d5-9158-111b1410e116', 'Nombres et calculs', 'Entiers : addition et soustraction', null, 'CE2-015'),
	('0ada6949-e6e5-42b3-961c-6b40e6d35af0', 'Nombres et calculs', 'Entiers : addition et soustraction', null, 'CE2-015'),
	('c9bd997c-2055-4b0b-8e26-0bd929996c38', 'Nombres et calculs', 'Entiers : multiplication', null, 'CE2-017'),
	('baec0070-8a67-4c58-99c6-dc9fd127cc3d', 'Nombres et calculs', 'Entiers : multiplication', null, 'CE2-017'),
	('376a2264-d460-4d48-88e8-b443177bfa33', 'Nombres et calculs', 'Entiers : multiplication', null, 'CE2-091');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qce2l3_modeles order by id;
select 1 from public.question_templates where id in (select id from _qce2l3_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qce2l3_modeles add column noeud uuid, add column point_id uuid;
update _qce2l3_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qce2l3_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qce2l3_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CE2' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qce2l3_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qce2l3_modeles where noeud is null),
			(select count(*) from _qce2l3_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qce2l3_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	select count(*) into v_ranges from _qce2l3_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qce2l3_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qce2l3_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qce2l3_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qce2l3_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qce2l3_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qce2l3_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qce2l3_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qce2l3_modeles;
