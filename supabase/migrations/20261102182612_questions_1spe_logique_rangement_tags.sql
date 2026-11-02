-- ============================================================================
-- Chantier « questions-1spe-logique », lot « logique et listes » : nœud et tag de 7 modèles neufs
-- ============================================================================
--   - 051ff81f (itérer sur les éléments d'une liste) → 1SPE-210, sur « Algorithmique > Listes > parcourir une liste » ;
--   - 2f7d637b (parcourir une liste par ses indices) → 1SPE-209, sur « Algorithmique > Listes > parcourir une liste » ;
--   - 344a2248 (liste en extension) → 1SPE-206, sur « Algorithmique > Listes > créer une liste » ;
--   - 5d17692b (liste en compréhension) → 1SPE-207, sur « Algorithmique > Listes > liste en compréhension » ;
--   - 63849c41 (liste par ajouts successifs) → 1SPE-367, sur « Algorithmique > Listes > créer une liste » ;
--   - dd9a33b7 (quantification implicite) → 1SPE-203, sur « Logique > Quantificateurs et négation > pour tout, il existe » ;
--   - de42b303 (éléments et indices d'une liste) → 1SPE-208, sur « Algorithmique > Listes > éléments et indices » ;
-- Chaque modèle va sur le nœud de son point (sous-notion : question_template_points_check_rules
-- refuse un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-02 (journal docs/wip/questions-1spe-logique-progress.md, phase 0 et Q5). Les
-- modèles ont été créés en brouillon le 2026-11-02 (18 h 23 UTC) par scripts/create-questions.ts (lancé par
-- David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-1spe-logique-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-02),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David en phase 0 du lot, AVANT
-- le SQL, tranchée par lui le 2026-11-02 : personne). Aucune règle ne change. Effet visible : les
-- 7 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les
-- voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('051ff81f-69df-475a-89d6-6eca7a225efa'::uuid),
--                ('2f7d637b-c49c-41bd-811d-dcaad76f52b3'::uuid),
--                ('344a2248-3f01-4b9e-8bd7-6fcb8537221a'::uuid),
--                ('5d17692b-397d-4de1-8629-fe5c5a5cc73b'::uuid),
--                ('63849c41-cd39-4bd0-98e9-acba106f231e'::uuid),
--                ('dd9a33b7-6b33-441f-8db2-05b30aa4bd39'::uuid),
--                ('de42b303-0c6b-4e54-9c1e-61d8a5d4fd6b'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('051ff81f-69df-475a-89d6-6eca7a225efa'::uuid, '1SPE-210'),
-- 	('2f7d637b-c49c-41bd-811d-dcaad76f52b3'::uuid, '1SPE-209'),
-- 	('344a2248-3f01-4b9e-8bd7-6fcb8537221a'::uuid, '1SPE-206'),
-- 	('5d17692b-397d-4de1-8629-fe5c5a5cc73b'::uuid, '1SPE-207'),
-- 	('63849c41-cd39-4bd0-98e9-acba106f231e'::uuid, '1SPE-367'),
-- 	('dd9a33b7-6b33-441f-8db2-05b30aa4bd39'::uuid, '1SPE-203'),
-- 	('de42b303-0c6b-4e54-9c1e-61d8a5d4fd6b'::uuid, '1SPE-208')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '1_SPE' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '051ff81f-69df-475a-89d6-6eca7a225efa',
--               '2f7d637b-c49c-41bd-811d-dcaad76f52b3',
--               '344a2248-3f01-4b9e-8bd7-6fcb8537221a',
--               '5d17692b-397d-4de1-8629-fe5c5a5cc73b',
--               '63849c41-cd39-4bd0-98e9-acba106f231e',
--               'dd9a33b7-6b33-441f-8db2-05b30aa4bd39',
--               'de42b303-0c6b-4e54-9c1e-61d8a5d4fd6b');
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
	('051ff81f-69df-475a-89d6-6eca7a225efa', 'Algorithmique', 'Listes', 'parcourir une liste', '1SPE-210'),
	('2f7d637b-c49c-41bd-811d-dcaad76f52b3', 'Algorithmique', 'Listes', 'parcourir une liste', '1SPE-209'),
	('344a2248-3f01-4b9e-8bd7-6fcb8537221a', 'Algorithmique', 'Listes', 'créer une liste', '1SPE-206'),
	('5d17692b-397d-4de1-8629-fe5c5a5cc73b', 'Algorithmique', 'Listes', 'liste en compréhension', '1SPE-207'),
	('63849c41-cd39-4bd0-98e9-acba106f231e', 'Algorithmique', 'Listes', 'créer une liste', '1SPE-367'),
	('dd9a33b7-6b33-441f-8db2-05b30aa4bd39', 'Logique', 'Quantificateurs et négation', 'pour tout, il existe', '1SPE-203'),
	('de42b303-0c6b-4e54-9c1e-61d8a5d4fd6b', 'Algorithmique', 'Listes', 'éléments et indices', '1SPE-208');

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
 where p.grade = '1_SPE' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
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
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
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
