-- ============================================================================
-- Chantier « questions-ce2 », lot 7c (statistiques) : nœud et tag de 8 modèles neufs
-- ============================================================================
--   - 4b2272d7 (Range les données dans un tableau) → CE2-074, sur « Statistiques > Représenter des données > tableaux »;
--   - 7e60148e (Lis le tableau à double entrée (trois lignes)) → CE2-075, sur « Statistiques > Représenter des données > tableau à double entrée »;
--   - f0f681c4 (Que dit le tableau à double entrée ? (trois lignes)) → CE2-096, sur « Statistiques > Représenter des données > tableau à double entrée »;
--   - 4aa224bd (Complète le tableau avec ses totaux) → CE2-076, sur « Statistiques > Représenter des données »;
--   - 7e5c1d35 (Retrouve la barre qui manque grâce au total) → CE2-076, sur « Statistiques > Représenter des données »;
--   - 77877cbe (Lis le diagramme en barres (axe gradué de 2 en 2, 5 en 5, 10 en 10)) → CE2-083, sur « Statistiques > Représenter des données > diagrammes en barres »;
--   - afdab6ae (Compare les barres du diagramme) → CE2-097, sur « Statistiques > Représenter des données > diagrammes en barres »;
--   - 3a8899e8 (Choisis l'échelle et construis le diagramme) → CE2-082, sur « Statistiques > Représenter des données > diagrammes en barres »;
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-05 (journal docs/wip/questions-ce2-progress.md § 13). Les modèles
-- ont été créés en brouillon par scripts/create-questions.ts
-- (scripts/questions/ce2-7c/, lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (8 modèles). Elle est prouvée par
-- tests/integration/questions-ce2-lot7c-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- CE2-076 est posé par le programme sur la NOTION « Représenter des données » (04 et 05 y vont, comme
-- les deux modèles de 2de) : garde sur ses sous-notions actives, relevées le 2026-11-05.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-05, après la création),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-11-05 en phase 0 (§ 13), AVANT le SQL, tranchée par lui le 2026-11-05 : personne).
-- Aucune règle ne change. Effet visible : les 8 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 8 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--               ('4b2272d7-2d46-4960-bafe-d1f1b232e093'::uuid),
--               ('7e60148e-7695-4ba3-b0e5-0e18eaea1e95'::uuid),
--               ('f0f681c4-4057-4124-87dd-9ce75036bb0e'::uuid),
--               ('4aa224bd-6371-4e5e-aad5-74f4075825e8'::uuid),
--               ('7e5c1d35-c3f3-4d57-a2a4-37eee8a95729'::uuid),
--               ('77877cbe-720c-4af5-9401-f4c3b328eea8'::uuid),
--               ('afdab6ae-c3cf-47c7-a9cd-751db7d78fcd'::uuid),
--               ('3a8899e8-a9f0-4932-9169-669b873457fa'::uuid))
--  as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('4b2272d7-2d46-4960-bafe-d1f1b232e093'::uuid, 'CE2-074'),
-- 	('7e60148e-7695-4ba3-b0e5-0e18eaea1e95'::uuid, 'CE2-075'),
-- 	('f0f681c4-4057-4124-87dd-9ce75036bb0e'::uuid, 'CE2-096'),
-- 	('4aa224bd-6371-4e5e-aad5-74f4075825e8'::uuid, 'CE2-076'),
-- 	('7e5c1d35-c3f3-4d57-a2a4-37eee8a95729'::uuid, 'CE2-076'),
-- 	('77877cbe-720c-4af5-9401-f4c3b328eea8'::uuid, 'CE2-083'),
-- 	('afdab6ae-c3cf-47c7-a9cd-751db7d78fcd'::uuid, 'CE2-097'),
-- 	('3a8899e8-a9f0-4932-9169-669b873457fa'::uuid, 'CE2-082')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CE2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '4b2272d7-2d46-4960-bafe-d1f1b232e093',
--               '7e60148e-7695-4ba3-b0e5-0e18eaea1e95',
--               'f0f681c4-4057-4124-87dd-9ce75036bb0e',
--               '4aa224bd-6371-4e5e-aad5-74f4075825e8',
--               '7e5c1d35-c3f3-4d57-a2a4-37eee8a95729',
--               '77877cbe-720c-4af5-9401-f4c3b328eea8',
--               'afdab6ae-c3cf-47c7-a9cd-751db7d78fcd',
--               '3a8899e8-a9f0-4932-9169-669b873457fa');
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
	code text not null,
	-- sous-notions que la notion a le droit d'avoir quand le modèle va sur elle (relevé du 2026-11-05)
	sous_notions_admises text[]
);
insert into _qc_modeles values
	('4b2272d7-2d46-4960-bafe-d1f1b232e093', 'Statistiques', 'Représenter des données', 'tableaux', 'CE2-074', null),
	('7e60148e-7695-4ba3-b0e5-0e18eaea1e95', 'Statistiques', 'Représenter des données', 'tableau à double entrée', 'CE2-075', null),
	('f0f681c4-4057-4124-87dd-9ce75036bb0e', 'Statistiques', 'Représenter des données', 'tableau à double entrée', 'CE2-096', null),
	('4aa224bd-6371-4e5e-aad5-74f4075825e8', 'Statistiques', 'Représenter des données', null, 'CE2-076', array['choisir une représentation', 'courbes et repères', 'diagrammes circulaires', 'diagrammes en barres', 'effectifs et fréquences', 'fréquences cumulées', 'histogrammes', 'tableau à double entrée', 'tableaux']),
	('7e5c1d35-c3f3-4d57-a2a4-37eee8a95729', 'Statistiques', 'Représenter des données', null, 'CE2-076', array['choisir une représentation', 'courbes et repères', 'diagrammes circulaires', 'diagrammes en barres', 'effectifs et fréquences', 'fréquences cumulées', 'histogrammes', 'tableau à double entrée', 'tableaux']),
	('77877cbe-720c-4af5-9401-f4c3b328eea8', 'Statistiques', 'Représenter des données', 'diagrammes en barres', 'CE2-083', null),
	('afdab6ae-c3cf-47c7-a9cd-751db7d78fcd', 'Statistiques', 'Représenter des données', 'diagrammes en barres', 'CE2-097', null),
	('3a8899e8-a9f0-4932-9169-669b873457fa', 'Statistiques', 'Représenter des données', 'diagrammes en barres', 'CE2-082', null);

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
 where p.grade = 'CE2' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qc_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qc_modeles where noeud is null),
			(select count(*) from _qc_modeles where point_id is null);
	end if;
	if exists (select 1 from _qc_modeles r
	            join public.classification_nodes s on s.parent_id = r.noeud
	             and s.kind = 'subnotion' and s.archived_at is null
	           where r.sous_notion is null
	             and s.name <> all (coalesce(r.sous_notions_admises, '{}'))) then
		raise exception 'notion visée sans sous-notion, mais elle en a une non admise';
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qc_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 8) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 8', v_presents;
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
