-- ============================================================================
-- Chantier « questions » : sous-notion « reconnaître et nommer des formes », niveaux de 19 brouillons CP
-- ============================================================================
-- 1. Crée la sous-notion « Géométrie > Figures planes > reconnaître et nommer des formes ».
-- 2. Y déplace les points CP-054 (reconnaître des formes dans un assemblage) et CP-055 (nommer
--    disque, carré, rectangle, triangle), jusqu'ici sur « propriétés », et leurs deux modèles :
--      - e7453c9b (Quelle est cette forme ?) → CP-055 ;
--      - 9d6bc8b3 (Combien de formes dans le dessin ?) → CP-054.
--    CP-056 et CP-057 restent sur « propriétés ».
-- 3. Donne des niveaux 1, 2, 3… aux 19 brouillons CP que la publication du 2026-10-25 a refusés
--    (tous au niveau 1 dans leur catégorie : un seul modèle publié par catégorie et par niveau,
--    idx_question_templates_unique_category). La catégorie est encore l'ancien texte
--    (theme, domain, subdomain) : celui des deux modèles déplacés suit leur nouvelle sous-notion.
-- Ni le contenu, ni le statut ne changent : `updated_at` des modèles est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-25 (journal docs/wip/questions-progress.md, « Reprendre ici ») :
-- option A (nouvelle sous-notion), CP-057 laissé sur « propriétés », niveaux du plus simple au
-- plus exigeant.
--
-- Ordre imposé par les triggers de garde des tags (un point tagué reste sur le nœud de son
-- modèle ou sur sa notion) : points sur la notion « Figures planes », puis modèles sur la
-- nouvelle sous-notion, puis points sur la nouvelle sous-notion.
--
-- Les modèles n'existent qu'en production : en base locale, seuls la sous-notion et les deux
-- points changent ; les vérifications des modèles exigent TOUT ou RIEN (19 modèles). Prouvée par
-- tests/integration/questions-cp-formes-et-niveaux.test.ts, qui fabrique des copies des
-- identifiants de la prod puis rejoue CE fichier.
--
-- Gardes : chaque modèle doit être encore en brouillon, au niveau 1, dans sa catégorie relevée
-- le 2026-10-25 ; les deux modèles déplacés, sur « propriétés » avec leur seul point ; les deux
-- points, sur « propriétés » ; la sous-notion, pas encore créée.
--
-- Données d'élèves : aucune (relevé du 2026-10-25 : CP-054 et CP-055 sans état d'élève, sans
-- exercice, sans journal, sans automatisme ; les 19 modèles sont en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question tranchée par David le 2026-10-25).
-- L'arbre et les points sont déjà lisibles par tous (anon compris) ; aucune règle ne change.
-- Effet visible : la nouvelle sous-notion apparaît dans l'arbre, avec CP-054 et CP-055.
--
-- Rollback (aucune donnée d'élève), valable tant que les 19 modèles sont en brouillon (un modèle
-- publié entre-temps garde niveau et texte). Il rend les niveaux 1, l'ancien texte, ramène modèles et
-- points sur « propriétés » et supprime la sous-notion. Bloc éprouvé par le test d'intégration,
-- à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un envoi) :
-- ROLLBACK:BEGIN
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set level = 1
--  where id in ('9780d3c1-bb3b-4519-bd0f-032fa27e8e1f', 'f1759d81-6c73-4c3a-9db0-df90f37b71c7',
--               '76d14aa6-086b-4c58-b668-b8a0b2968cb8', '55662eef-d05e-46fa-897d-354a2bd5ec22',
--               'e7453c9b-8cbd-44ef-86ca-2aaf0340b5fa', '9d6bc8b3-ee8f-4f70-a735-61b1075a9746',
--               'c85626fa-c875-4314-bbb9-96c4b7c6dd48', '91012bab-0bab-4cd0-a86c-97574c44c9d9',
--               'b5389494-3b1c-4f32-85c2-473192c9bacc', 'd5a36be9-f6bb-428f-b0e0-60bee080bd19',
--               '2fc01600-c06d-45cc-a2bd-a8f89ff7fc58', '7093b797-0fa4-44e1-8828-327d5d3c452b',
--               'd50c6e21-627f-45eb-9ca1-9dcfa6757563', '12482155-d91f-4744-bc43-fd0d9ff18f77',
--               'b556f617-a7d6-43a2-a1f0-15ac34834e7b', '7e7e2968-a550-483f-9399-3526f2bb5030',
--               '3e9a610e-46a8-4b0c-b6bd-5d022aebf7e3', '8e207417-6be5-4c0d-81d2-d419a7dc4db1',
--               '74d6b4f3-f180-4315-a2c4-ccfb1b3f3024')
--    and status = 'draft';
-- update public.question_templates set subdomain = 'Propriétés'
--  where id in ('e7453c9b-8cbd-44ef-86ca-2aaf0340b5fa', '9d6bc8b3-ee8f-4f70-a735-61b1075a9746')
--    and status = 'draft';
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- update public.curriculum_points p set node_id = f.id
--   from public.classification_nodes f
--   join public.classification_nodes b on b.id = f.parent_id and b.kind = 'branch' and b.name = 'Géométrie'
--  where f.kind = 'notion' and f.name = 'Figures planes'
--    and p.grade = 'CP' and p.code in ('CP-054', 'CP-055');
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q set classification_node_id = s.id
--   from public.classification_nodes s
--   join public.classification_nodes f on f.id = s.parent_id and f.kind = 'notion' and f.name = 'Figures planes'
--   join public.classification_nodes b on b.id = f.parent_id and b.kind = 'branch' and b.name = 'Géométrie'
--  where s.kind = 'subnotion' and s.name = 'propriétés'
--    and q.id in ('e7453c9b-8cbd-44ef-86ca-2aaf0340b5fa', '9d6bc8b3-ee8f-4f70-a735-61b1075a9746');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- update public.curriculum_points p set node_id = s.id
--   from public.classification_nodes s
--   join public.classification_nodes f on f.id = s.parent_id and f.kind = 'notion' and f.name = 'Figures planes'
--   join public.classification_nodes b on b.id = f.parent_id and b.kind = 'branch' and b.name = 'Géométrie'
--  where s.kind = 'subnotion' and s.name = 'propriétés'
--    and p.grade = 'CP' and p.code in ('CP-054', 'CP-055');
-- delete from public.classification_nodes s
--  using public.classification_nodes f
--   join public.classification_nodes b on b.id = f.parent_id and b.kind = 'branch' and b.name = 'Géométrie'
--  where s.parent_id = f.id and f.kind = 'notion' and f.name = 'Figures planes'
--    and s.kind = 'subnotion' and s.name = 'reconnaître et nommer des formes';
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qfn_modeles;
create temporary table _qfn_modeles (
	id uuid primary key,
	theme text not null,
	domain text not null,
	subdomain text not null,
	nouveau_subdomain text not null,
	niveau integer not null,
	deplace boolean not null
);
insert into _qfn_modeles values
	('9780d3c1-bb3b-4519-bd0f-032fa27e8e1f', 'Grandeurs', 'Durées', 'Lire l''heure', 'Lire l''heure', 1, false),
	('f1759d81-6c73-4c3a-9db0-df90f37b71c7', 'Grandeurs', 'Durées', 'Lire l''heure', 'Lire l''heure', 2, false),
	('76d14aa6-086b-4c58-b668-b8a0b2968cb8', 'Statistiques', 'Représenter des données', 'Tableau à double entrée', 'Tableau à double entrée', 1, false),
	('55662eef-d05e-46fa-897d-354a2bd5ec22', 'Statistiques', 'Représenter des données', 'Tableau à double entrée', 'Tableau à double entrée', 2, false),
	('e7453c9b-8cbd-44ef-86ca-2aaf0340b5fa', 'Géométrie', 'Figures planes', 'Propriétés', 'Reconnaître et nommer des formes', 1, true),
	('9d6bc8b3-ee8f-4f70-a735-61b1075a9746', 'Géométrie', 'Figures planes', 'Propriétés', 'Reconnaître et nommer des formes', 2, true),
	('c85626fa-c875-4314-bbb9-96c4b7c6dd48', 'Géométrie', 'Figures planes', 'Propriétés', 'Propriétés', 1, false),
	('91012bab-0bab-4cd0-a86c-97574c44c9d9', 'Géométrie', 'Figures planes', 'Propriétés', 'Propriétés', 2, false),
	('b5389494-3b1c-4f32-85c2-473192c9bacc', 'Géométrie', 'Figures planes', 'Propriétés', 'Propriétés', 3, false),
	('d5a36be9-f6bb-428f-b0e0-60bee080bd19', 'Géométrie', 'Repérage et déplacements', 'Positions et plans', 'Positions et plans', 1, false),
	('2fc01600-c06d-45cc-a2bd-a8f89ff7fc58', 'Géométrie', 'Repérage et déplacements', 'Positions et plans', 'Positions et plans', 2, false),
	('7093b797-0fa4-44e1-8828-327d5d3c452b', 'Grandeurs', 'Longueurs', 'Comparaison et mesure', 'Comparaison et mesure', 1, false),
	('d50c6e21-627f-45eb-9ca1-9dcfa6757563', 'Grandeurs', 'Longueurs', 'Comparaison et mesure', 'Comparaison et mesure', 2, false),
	('12482155-d91f-4744-bc43-fd0d9ff18f77', 'Géométrie', 'Solides', 'Reconnaître et décrire', 'Reconnaître et décrire', 1, false),
	('b556f617-a7d6-43a2-a1f0-15ac34834e7b', 'Géométrie', 'Solides', 'Reconnaître et décrire', 'Reconnaître et décrire', 2, false),
	('7e7e2968-a550-483f-9399-3526f2bb5030', 'Géométrie', 'Solides', 'Reconnaître et décrire', 'Reconnaître et décrire', 3, false),
	('3e9a610e-46a8-4b0c-b6bd-5d022aebf7e3', 'Géométrie', 'Solides', 'Reconnaître et décrire', 'Reconnaître et décrire', 4, false),
	('8e207417-6be5-4c0d-81d2-d419a7dc4db1', 'Géométrie', 'Solides', 'Reconnaître et décrire', 'Reconnaître et décrire', 5, false),
	('74d6b4f3-f180-4315-a2c4-ccfb1b3f3024', 'Géométrie', 'Solides', 'Reconnaître et décrire', 'Reconnaître et décrire', 6, false);

drop table if exists pg_temp._qfn_points;
create temporary table _qfn_points (code text primary key, modele uuid not null, point_id uuid);
insert into _qfn_points values
	('CP-054', '9d6bc8b3-ee8f-4f70-a735-61b1075a9746'),
	('CP-055', 'e7453c9b-8cbd-44ef-86ca-2aaf0340b5fa');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags,
-- puis les lignes des modèles et des deux points.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qfn_modeles order by id;
select 1 from public.question_templates where id in (select id from _qfn_modeles) order by id for update;
select 1 from public.curriculum_points
 where grade = 'CP' and code in (select code from _qfn_points) and archived_at is null
 order by id for update;

-- ---- 2. Résolution STRICTE des nœuds et des points ------------------------------------
drop table if exists pg_temp._qfn_noeuds;
create temporary table _qfn_noeuds (notion uuid not null, proprietes uuid not null, nouveau uuid);
do $resolution$
declare v_notion uuid; v_proprietes uuid; v_points integer;
begin
	select n.id into strict v_notion
	  from public.classification_nodes b
	  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
	 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null
	   and b.name = 'Géométrie' and n.name = 'Figures planes';
	select s.id into strict v_proprietes
	  from public.classification_nodes s
	 where s.parent_id = v_notion and s.kind = 'subnotion' and s.archived_at is null and s.name = 'propriétés';
	if exists (select 1 from public.classification_nodes
	            where parent_id = v_notion and lower(name) = 'reconnaître et nommer des formes') then
		raise exception 'la sous-notion « reconnaître et nommer des formes » existe déjà';
	end if;
	insert into _qfn_noeuds (notion, proprietes) values (v_notion, v_proprietes);
	update _qfn_points r set point_id = p.id
	  from public.curriculum_points p
	 where p.grade = 'CP' and p.code = r.code and p.archived_at is null and p.node_id = v_proprietes;
	select count(*) into v_points from _qfn_points where point_id is not null;
	if v_points <> 2 then
		raise exception 'points CP-054 et CP-055 introuvables sur « propriétés » : % sur 2', v_points;
	end if;
end $resolution$;

-- ---- 3. Gardes des modèles : présence TOUT ou RIEN, état du relevé -------------------
do $garde$
declare v_presents integer; v_ecarts integer; v_deplaces integer;
begin
	select count(*) into v_presents from _qfn_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 19) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 19', v_presents;
	end if;
	if v_presents = 0 then
		return;
	end if;
	select count(*) into v_ecarts from _qfn_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status <> 'draft' or q.level <> 1
	    or q.theme <> r.theme or q.domain <> r.domain or coalesce(q.subdomain, '') <> r.subdomain;
	if v_ecarts <> 0 then
		raise exception 'modèles modifiés depuis le relevé (statut, niveau ou catégorie) : %', v_ecarts;
	end if;
	-- Les deux modèles déplacés : sur « propriétés », avec leur seul point
	select count(*) into v_deplaces from _qfn_points r
	  join public.question_templates q on q.id = r.modele
	  join public.curriculum_points p on p.id = r.point_id
	 where q.classification_node_id = p.node_id
	   and (select array_agg(t.point_id) from public.question_template_points t where t.template_id = q.id)
	       = array[r.point_id];
	if v_deplaces <> 2 then
		raise exception 'modèles déplacés : % sur 2 sur « propriétés » avec leur seul point', v_deplaces;
	end if;
end $garde$;

-- ---- 4. La sous-notion, puis le déplacement en trois temps ---------------------------
with cree as (
	insert into public.classification_nodes (kind, parent_id, name, position)
	select 'subnotion', k.notion, 'reconnaître et nommer des formes',
	       (select coalesce(max(s.position), -1) + 1 from public.classification_nodes s where s.parent_id = k.notion)
	  from _qfn_noeuds k
	returning id
)
update _qfn_noeuds set nouveau = (select id from cree);

-- a. Les points sur la notion (permis : c'est la notion du nœud de leur modèle)
update public.curriculum_points p set node_id = k.notion
  from _qfn_points r, _qfn_noeuds k
 where p.id = r.point_id;

-- b. Les modèles sur la nouvelle sous-notion ; texte de catégorie et niveaux des 19
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = k.nouveau
  from _qfn_points r, _qfn_noeuds k
 where q.id = r.modele;
update public.question_templates q set level = r.niveau, subdomain = r.nouveau_subdomain
  from _qfn_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- c. Les points sur la nouvelle sous-notion
update public.curriculum_points p set node_id = k.nouveau
  from _qfn_points r, _qfn_noeuds k
 where p.id = r.point_id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_noeud uuid; v_points integer; v_presents integer; v_niveaux integer; v_deplaces integer;
begin
	select s.id into strict v_noeud
	  from _qfn_noeuds k
	  join public.classification_nodes s on s.id = k.nouveau and s.parent_id = k.notion and s.kind = 'subnotion';
	select count(*) into v_points from _qfn_points r
	  join public.curriculum_points p on p.id = r.point_id and p.node_id = v_noeud;
	if v_points <> 2 then
		raise exception 'points sur la nouvelle sous-notion : % sur 2', v_points;
	end if;
	select count(*) into v_presents from _qfn_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_niveaux from _qfn_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.level = r.niveau and q.subdomain = r.nouveau_subdomain and q.status = 'draft';
	select count(*) into v_deplaces from _qfn_points r
	  join public.question_templates q on q.id = r.modele and q.classification_node_id = v_noeud
	  join public.question_template_points t on t.template_id = q.id and t.point_id = r.point_id;
	if v_niveaux <> v_presents or (v_presents = 19 and v_deplaces <> 2) then
		raise exception 'lot incohérent : niveaux %/%, modèles déplacés %/2', v_niveaux, v_presents, v_deplaces;
	end if;
end $check$;

drop table _qfn_noeuds;
drop table _qfn_points;
drop table _qfn_modeles;
