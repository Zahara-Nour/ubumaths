-- ============================================================================
-- Chantier « automatismes-1spe » : nœud et tag des 6 brouillons « Non rangés » d'automatismes de 1re
-- ============================================================================
--   - f5585668 (lire l'équation réduite d'une droite) → 2-314, sur « Géométrie > Géométrie repérée >
--     équations de droites » ;
--   - 95ee57c8 (résoudre graphiquement f(x) < k) → 2-448, sur « Fonctions > Généralités sur les
--     fonctions > équations et inéquations f(x) = k » ;
--   - 5397c20f (tableau de signes lu sur la courbe) → 1SPE-432, sur « Fonctions > Généralités sur les
--     fonctions > signe » ;
--   - 7f82d15a (tableau de variations lu sur la courbe) → 2-349, sur « Fonctions > Généralités sur les
--     fonctions > variations » ;
--   - 1c86d122 (graphique dont l'axe ne part pas de 0) → 5-135, sur « Statistiques > Représenter des
--     données > courbes et repères » ;
--   - 9852d62c (angle d'un secteur circulaire) → 5-113, sur « Statistiques > Représenter des
--     données > diagrammes circulaires ».
-- Nœuds EXISTANTS et actifs, aucune sous-notion neuve. Chaque modèle porte UN point (ADR 0020),
-- sur le nœud même du modèle. Les automatismes de 1re sont rattachés, en base, à des points de 2de
-- et de collège (curriculum_point_automatismes) : d'où des points de programmes 2 et 5.
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Les modèles ont été créés en brouillon par scripts/create-questions.ts (lots « lectures
-- graphiques », « droites », « statistiques » du chantier), avec un thème / domaine / sous-domaine
-- pour seul rangement ; la v0.73.0 (automaths_fin_ancienne_forme) a retiré ces colonnes et ils sont
-- devenus « Non rangés ». Nœuds proposés par le chantier automaths-arbre
-- (docs/archive/wip/automaths-arbre-progress.md), validés par David le 2026-11-05 avec les points
-- (journal docs/wip/automatismes-1spe-progress.md). Relevé de la prod du 2026-11-05 (MCP) :
-- 6 brouillons en {1_SPE,1_GEN,1_TECHNO}, sans nœud ni tag ; les 6 points sont actifs, chacun sur
-- la sous-notion désignée.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée par
-- tests/integration/automatismes-1spe-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-05), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT ; le point doit être sur ce nœud ou sur sa notion.
--
-- Données d'élèves : aucune (modèles en brouillon, jamais publiés).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David avant le SQL, tranchée par
-- lui le 2026-11-05 : personne). Aucune règle (policy) ne change. Effet visible : les 6 brouillons
-- quittent « Non rangés » et apparaissent sous leur nœud et sous leur point dans l'admin ; les
-- élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('f5585668-2ec1-45d1-a279-d82f45903926'::uuid),
--                ('95ee57c8-4e16-4554-add5-cb8f72ee6f28'::uuid),
--                ('5397c20f-7b3a-4d56-b441-644607e0138a'::uuid),
--                ('7f82d15a-1c46-4bd5-81bc-a9f5e21048ed'::uuid),
--                ('1c86d122-92f8-4bee-a566-b023ffb79dda'::uuid),
--                ('9852d62c-4109-4155-aa56-afef8c72d923'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('f5585668-2ec1-45d1-a279-d82f45903926'::uuid, '2', '2-314'),
-- 	('95ee57c8-4e16-4554-add5-cb8f72ee6f28'::uuid, '2', '2-448'),
-- 	('5397c20f-7b3a-4d56-b441-644607e0138a'::uuid, '1_SPE', '1SPE-432'),
-- 	('7f82d15a-1c46-4bd5-81bc-a9f5e21048ed'::uuid, '2', '2-349'),
-- 	('1c86d122-92f8-4bee-a566-b023ffb79dda'::uuid, '5', '5-135'),
-- 	('9852d62c-4109-4155-aa56-afef8c72d923'::uuid, '5', '5-113')
--  ) as r(id, grade, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               'f5585668-2ec1-45d1-a279-d82f45903926',
--               '95ee57c8-4e16-4554-add5-cb8f72ee6f28',
--               '5397c20f-7b3a-4d56-b441-644607e0138a',
--               '7f82d15a-1c46-4bd5-81bc-a9f5e21048ed',
--               '1c86d122-92f8-4bee-a566-b023ffb79dda',
--               '9852d62c-4109-4155-aa56-afef8c72d923');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._a1_modeles;
create temporary table _a1_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	grade text not null,
	code text not null
);
insert into _a1_modeles values
	('f5585668-2ec1-45d1-a279-d82f45903926', 'Géométrie', 'Géométrie repérée', 'équations de droites', '2', '2-314'),
	('95ee57c8-4e16-4554-add5-cb8f72ee6f28', 'Fonctions', 'Généralités sur les fonctions', 'équations et inéquations f(x) = k', '2', '2-448'),
	('5397c20f-7b3a-4d56-b441-644607e0138a', 'Fonctions', 'Généralités sur les fonctions', 'signe', '1_SPE', '1SPE-432'),
	('7f82d15a-1c46-4bd5-81bc-a9f5e21048ed', 'Fonctions', 'Généralités sur les fonctions', 'variations', '2', '2-349'),
	('1c86d122-92f8-4bee-a566-b023ffb79dda', 'Statistiques', 'Représenter des données', 'courbes et repères', '5', '5-135'),
	('9852d62c-4109-4155-aa56-afef8c72d923', 'Statistiques', 'Représenter des données', 'diagrammes circulaires', '5', '5-113');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _a1_modeles order by id;
select 1 from public.question_templates where id in (select id from _a1_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée ; le point est sur ce nœud ou sur sa notion
alter table _a1_modeles add column noeud uuid, add column point_id uuid;
update _a1_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _a1_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _a1_modeles r set point_id = p.id
  from public.curriculum_points p, public.classification_nodes x
 where x.id = r.noeud
   and p.grade = r.grade and p.code = r.code and p.archived_at is null
   and p.node_id in (r.noeud, case when x.kind = 'subnotion' then x.parent_id else x.id end);
do $resolution$
begin
	if exists (select 1 from _a1_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _a1_modeles where noeud is null),
			(select count(*) from _a1_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _a1_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	select count(*) into v_ranges from _a1_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _a1_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _a1_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _a1_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _a1_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _a1_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _a1_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _a1_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _a1_modeles;
