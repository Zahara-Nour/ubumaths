-- ============================================================================
-- Chantier « cours-suites » : nœud et tag des 30 questions de cours sur les suites (1re spé), et
-- marqueur « question de cours » sur les deux modèles « Démontrer la somme… »
-- ============================================================================
--   A. Les 30 brouillons « Cours : … » créés sans nœud ni tag vont chacun sur la sous-notion de
--      leur point, ou sur la notion quand le point est sur la notion (précédent :
--      20261101215000), et reçoivent ce seul point (ADR 0020). Exception : « notations uₙ₊₁,
--      uₙ + 1, (uₙ) » (point 1SPE-212, sur la notion « Généralités sur les suites ») va sur la
--      sous-notion « explicite ou par récurrence », comme le modèle publié « Exprimer le terme
--      suivant » qui porte le même point.
--   B. Les deux modèles PUBLIÉS « Démontrer la somme 1 + 2 + ⋯ + n » (5fbb9a04) et « Démontrer la
--      somme 1 + q + ⋯ + qⁿ » (b554a47f), dont la variation « Remets les étapes » tient lieu des
--      questions de cours n° 24 et 25, reçoivent `options.courseQuestion = true` : ils rejoignent le
--      paquet de révision du chapitre et ne peuvent plus entrer dans le paquet « Programme ». Leur
--      nœud et leurs tags ne changent pas.
-- Aucune sous-notion neuve. Ni le contenu ni le statut ne changent ; `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-09 (journal docs/wip/cours-suites-progress.md, § « Rangement
-- proposé » : tableau tel quel, B11 un seul modèle sous 1SPE-214 ; marqueur sur les deux
-- « Démontrer la somme… »). Les 30 modèles ont été créés en brouillon par David le 2026-11-09 avec
-- scripts/create-questions.ts (scripts/questions/1spe-cours-suites/, ids commités par #2530), qui
-- ne pose ni nœud ni tag. Relevé de la prod du 2026-11-09 (MCP) : 30 brouillons, sans nœud, sans
-- tag, `options.courseQuestion` déjà vrai ; 5fbb9a04 et b554a47f publiés, `options` NULL, sur
-- « somme des termes » ; aucune carte de révision (srs_cards) sur ces deux modèles.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (30 modèles, 2 modèles). Elle est prouvée par
-- tests/integration/questions-1spe-cours-suites-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : les 30 modèles encore SANS nœud et SANS tag ; les deux modèles
-- « Démontrer la somme… » encore publiés et sans marqueur. Nœuds désignés par leur chemin, points
-- par leur code, résolus STRICTEMENT ; chaque point doit être sur le nœud de son modèle ou sur sa
-- notion.
--
-- Données d'élèves : aucune (on range, on tague, on pose un marqueur sur des modèles).
--
-- Accès : personne ne gagne ni ne perd d'accès. La lecture de question_templates ne regarde ni le
-- nœud ni `options` (publiés : tout compte connecté et anon ; brouillons : admin et prof) ; les
-- tags restent lisibles par tout compte connecté. Question posée à David AVANT le SQL (phase 0),
-- tranchée par lui le 2026-11-09 : personne. Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 30 tags, rend les 30 modèles sans nœud et retire
-- le marqueur des deux modèles « Démontrer la somme… » (`options` redevient NULL s'il ne reste
-- rien). Garde : il refuse si un modèle n'est plus sur le nœud laissé par la migration, si ses tags
-- ont changé, ou si l'un des deux modèles n'a plus le marqueur. Bloc éprouvé par le test
-- d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL
-- en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qcs_retour;
-- drop table if exists pg_temp._qcs_retour_cours;
-- create temporary table _qcs_retour (
-- 	id uuid primary key, notion text not null, sous_notion text, code text not null, noeud uuid
-- );
-- insert into _qcs_retour (id, notion, sous_notion, code) values
-- 	('57129cb5-7c81-4e2c-b3a5-d55a12ea8b34', 'Généralités sur les suites', 'explicite ou par récurrence', '1SPE-211'),
-- 	('cc4ceb8a-4757-4011-83bc-76a5fa1c9859', 'Généralités sur les suites', 'explicite ou par récurrence', '1SPE-368'),
-- 	('9f740496-6e16-4eb5-9205-08104ad1bb33', 'Généralités sur les suites', 'explicite ou par récurrence', '1SPE-368'),
-- 	('a6932b68-3701-49e3-8e92-838051e48110', 'Généralités sur les suites', 'explicite ou par récurrence', '1SPE-212'),
-- 	('cd169e7f-0d79-4893-82eb-68c7944bef7e', 'Suites arithmétiques', 'définition', '1SPE-213'),
-- 	('74333045-1969-4a61-85d2-6627e2956f3b', 'Suites arithmétiques', 'terme général', '1SPE-371'),
-- 	('a9d3af96-8fe0-4571-a1f2-8922ae4aadf8', 'Suites arithmétiques', 'définition', '1SPE-213'),
-- 	('86db3cc4-5386-470f-9e49-a19792245c85', 'Suites arithmétiques', 'définition', '1SPE-213'),
-- 	('98962cae-001d-4b0a-af06-ea69703cf06d', 'Suites arithmétiques', 'définition', '1SPE-213'),
-- 	('24b7e5dc-4d78-4039-8e9e-24d4bffeed4d', 'Suites arithmétiques', null, '1SPE-228'),
-- 	('5dadd081-d6ba-4df6-be07-d42f4a27ade2', 'Suites arithmétiques', null, '1SPE-214'),
-- 	('b0992067-bf43-4366-9869-4257a97266ae', 'Suites arithmétiques', null, '1SPE-372'),
-- 	('20ecab00-054c-4b8a-a68e-55755edafc03', 'Suites géométriques', 'définition', '1SPE-216'),
-- 	('5394f049-d2f5-4b46-a7e9-6e0c964c77f6', 'Suites géométriques', 'terme général', '1SPE-373'),
-- 	('6586e882-13d0-45f2-b445-a2fb20a5b701', 'Suites géométriques', 'définition', '1SPE-216'),
-- 	('cd8ec0e7-d454-44ce-9139-9c4e0a7e9252', 'Suites géométriques', null, '1SPE-217'),
-- 	('93f113af-e4a5-4344-869d-94187669f345', 'Suites géométriques', null, '1SPE-229'),
-- 	('97088e3d-75fc-4936-bbf8-857227661b45', 'Suites géométriques', null, '1SPE-229'),
-- 	('a43de156-28a4-4a65-90d9-97c5f2deee18', 'Suites géométriques', 'définition', '1SPE-216'),
-- 	('9bfe6c4c-a0b9-4590-9f3f-3115bc628741', 'Suites arithmétiques', 'somme des termes', '1SPE-215'),
-- 	('53facec2-c6a6-4d77-8880-74ca4d3d43df', 'Suites géométriques', 'somme des termes', '1SPE-218'),
-- 	('e2743a04-3a87-4781-abae-4b402edb9b75', 'Suites arithmétiques', 'somme des termes', '1SPE-226'),
-- 	('7f63ea6b-63dc-4123-a4dc-8cc6043d0942', 'Suites géométriques', 'somme des termes', '1SPE-227'),
-- 	('252e85d9-3493-49b4-bc3b-6ca1462077e3', 'Suites arithmétiques', 'somme des termes', '1SPE-226'),
-- 	('9c19a6ab-ab08-4c50-b64e-6bbaa7f5cf08', 'Généralités sur les suites', 'sens de variation', '1SPE-219'),
-- 	('102fd5f2-5120-4aac-9217-2c383e4420e4', 'Généralités sur les suites', 'sens de variation', '1SPE-219'),
-- 	('947675fa-a17d-484c-94fa-c67f548816a6', 'Généralités sur les suites', 'sens de variation', '1SPE-219'),
-- 	('77cbab8d-affa-4240-89e3-c3ba81f3ec44', 'Généralités sur les suites', 'sens de variation', '1SPE-219'),
-- 	('43f277b2-0bbd-470f-93ce-357bc913e4f6', 'Limites de suites', 'définition', '1SPE-231'),
-- 	('958f5f05-e87d-443c-a976-da2072563c34', 'Limites de suites', 'définition', '1SPE-220');
-- create temporary table _qcs_retour_cours (id uuid primary key);
-- insert into _qcs_retour_cours values
-- 	('5fbb9a04-d4c3-4810-b717-075493df916b'), ('b554a47f-1b2e-4530-a979-44d785890adf');
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qcs_retour order by id;
-- select 1 from public.question_templates
--  where id in (select id from _qcs_retour union select id from _qcs_retour_cours) order by id for update;
-- update _qcs_retour r set noeud = n.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = 'Suites'
--    and n.name = r.notion and r.sous_notion is null;
-- update _qcs_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = 'Suites'
--    and n.name = r.notion and s.name = r.sous_notion;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- 	v_cours integer; v_cours_intacts integer;
-- begin
-- 	if exists (select 1 from _qcs_retour where noeud is null) then
-- 		raise exception 'rollback : nœud introuvable';
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _qcs_retour r on r.id = q.id;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur %, plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*), count(*) filter (where exists (select 1 from _qcs_retour r
-- 	                                                where r.id = q.template_id and p.grade = '1_SPE' and p.code = r.code))
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _qcs_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_presents or v_total <> v_presents then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_presents;
-- 	end if;
-- 	select count(*), count(*) filter (where q.options->'courseQuestion' = 'true'::jsonb)
-- 	  into v_cours, v_cours_intacts
-- 	  from public.question_templates q join _qcs_retour_cours c on c.id = q.id;
-- 	if v_cours_intacts <> v_cours then
-- 		raise exception 'rollback : marqueur retiré depuis la migration sur % modèle(s)', v_cours - v_cours_intacts;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _qcs_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q set classification_node_id = null
--   from _qcs_retour r where q.id = r.id;
-- update public.question_templates q set options = nullif(q.options - 'courseQuestion', '{}'::jsonb)
--   from _qcs_retour_cours c where q.id = c.id;
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _qcs_retour_cours;
-- drop table _qcs_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Les modèles, en tables temporaires ----------------------------------------------------
drop table if exists pg_temp._qcs_modeles;
drop table if exists pg_temp._qcs_cours;
create temporary table _qcs_modeles (
	id uuid primary key,
	notion text not null,
	-- Sous-notion de la branche « Suites » (null : le modèle va sur la notion).
	sous_notion text,
	code text not null
);
insert into _qcs_modeles values
	('57129cb5-7c81-4e2c-b3a5-d55a12ea8b34', 'Généralités sur les suites', 'explicite ou par récurrence', '1SPE-211'), -- A1 Cours : deux façons de définir une suite
	('cc4ceb8a-4757-4011-83bc-76a5fa1c9859', 'Généralités sur les suites', 'explicite ou par récurrence', '1SPE-368'), -- A2 Cours : suite définie explicitement ou par récurrence ?
	('9f740496-6e16-4eb5-9205-08104ad1bb33', 'Généralités sur les suites', 'explicite ou par récurrence', '1SPE-368'), -- A3 Cours : vrai ou faux sur les modes de génération
	('a6932b68-3701-49e3-8e92-838051e48110', 'Généralités sur les suites', 'explicite ou par récurrence', '1SPE-212'), -- A4 Cours : notations (point sur la notion)
	('cd169e7f-0d79-4893-82eb-68c7944bef7e', 'Suites arithmétiques', 'définition', '1SPE-213'), -- B5 Cours : définition d'une suite arithmétique
	('74333045-1969-4a61-85d2-6627e2956f3b', 'Suites arithmétiques', 'terme général', '1SPE-371'), -- B6 Cours : formule du terme général (arithmétique)
	('a9d3af96-8fe0-4571-a1f2-8922ae4aadf8', 'Suites arithmétiques', 'définition', '1SPE-213'), -- B7 Cours : démontrer qu'une suite est arithmétique
	('86db3cc4-5386-470f-9e49-a19792245c85', 'Suites arithmétiques', 'définition', '1SPE-213'), -- B8 Cours : quelle méthode (arithmétique) ?
	('98962cae-001d-4b0a-af06-ea69703cf06d', 'Suites arithmétiques', 'définition', '1SPE-213'), -- B9 Cours : vrai ou faux (arithmétiques)
	('24b7e5dc-4d78-4039-8e9e-24d4bffeed4d', 'Suites arithmétiques', null, '1SPE-228'), -- B10 Cours : sens de variation selon la raison
	('5dadd081-d6ba-4df6-be07-d42f4a27ade2', 'Suites arithmétiques', null, '1SPE-214'), -- B11 Cours : arithmétique ou géométrique ? (situation)
	('b0992067-bf43-4366-9869-4257a97266ae', 'Suites arithmétiques', null, '1SPE-372'), -- B12 Cours : représentation graphique (arithmétique)
	('20ecab00-054c-4b8a-a68e-55755edafc03', 'Suites géométriques', 'définition', '1SPE-216'), -- C13 Cours : définition d'une suite géométrique
	('5394f049-d2f5-4b46-a7e9-6e0c964c77f6', 'Suites géométriques', 'terme général', '1SPE-373'), -- C14 Cours : formule du terme général (géométrique)
	('6586e882-13d0-45f2-b445-a2fb20a5b701', 'Suites géométriques', 'définition', '1SPE-216'), -- C15 Cours : démontrer qu'une suite est géométrique
	('cd8ec0e7-d454-44ce-9139-9c4e0a7e9252', 'Suites géométriques', null, '1SPE-217'), -- C16 Cours : coefficient multiplicateur
	('93f113af-e4a5-4344-869d-94187669f345', 'Suites géométriques', null, '1SPE-229'), -- C17 Cours : vrai ou faux (variation géométrique)
	('97088e3d-75fc-4936-bbf8-857227661b45', 'Suites géométriques', null, '1SPE-229'), -- C18 Cours : quand une suite géométrique croît-elle ?
	('a43de156-28a4-4a65-90d9-97c5f2deee18', 'Suites géométriques', 'définition', '1SPE-216'), -- C19 Cours : trouver l'erreur (géométrique)
	('9bfe6c4c-a0b9-4590-9f3f-3115bc628741', 'Suites arithmétiques', 'somme des termes', '1SPE-215'), -- D20 Cours : formule de 1 + 2 + ⋯ + n
	('53facec2-c6a6-4d77-8880-74ca4d3d43df', 'Suites géométriques', 'somme des termes', '1SPE-218'), -- D21 Cours : formule de 1 + q + ⋯ + qⁿ
	('e2743a04-3a87-4781-abae-4b402edb9b75', 'Suites arithmétiques', 'somme des termes', '1SPE-226'), -- D22a Cours : somme de termes (arithmétique)
	('7f63ea6b-63dc-4123-a4dc-8cc6043d0942', 'Suites géométriques', 'somme des termes', '1SPE-227'), -- D22b Cours : somme de termes (géométrique)
	('252e85d9-3493-49b4-bc3b-6ca1462077e3', 'Suites arithmétiques', 'somme des termes', '1SPE-226'), -- D23 Cours : nombre de termes d'une somme
	('9c19a6ab-ab08-4c50-b64e-6bbaa7f5cf08', 'Généralités sur les suites', 'sens de variation', '1SPE-219'), -- E26 Cours : méthodes (sens de variation)
	('102fd5f2-5120-4aac-9217-2c383e4420e4', 'Généralités sur les suites', 'sens de variation', '1SPE-219'), -- E27 Cours : choisir la méthode (sens de variation)
	('947675fa-a17d-484c-94fa-c67f548816a6', 'Généralités sur les suites', 'sens de variation', '1SPE-219'), -- E28 Cours : vrai ou faux (sens de variation)
	('77cbab8d-affa-4240-89e3-c3ba81f3ec44', 'Généralités sur les suites', 'sens de variation', '1SPE-219'), -- E29 Cours : trouver l'erreur (sens de variation)
	('43f277b2-0bbd-470f-93ce-357bc913e4f6', 'Limites de suites', 'définition', '1SPE-231'), -- F30 Cours : conjecturer une limite en mots
	('958f5f05-e87d-443c-a976-da2072563c34', 'Limites de suites', 'définition', '1SPE-220'); -- F31 Cours : vrai ou faux (limite)
create temporary table _qcs_cours (id uuid primary key);
insert into _qcs_cours values
	('5fbb9a04-d4c3-4810-b717-075493df916b'), -- Démontrer la somme 1 + 2 + ⋯ + n
	('b554a47f-1b2e-4530-a979-44d785890adf'); -- Démontrer la somme 1 + q + ⋯ + qⁿ

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et la ligne du modèle.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcs_modeles order by id;
select 1 from public.question_templates
 where id in (select id from _qcs_modeles union select id from _qcs_cours) order by id for update;

-- ---- 2. Gardes (avant toute écriture) ---------------------------------------------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer; v_cours integer; v_cours_changes integer;
begin
	select count(*) into v_presents from _qcs_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, (select count(*) from _qcs_modeles)) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur %', v_presents,
			(select count(*) from _qcs_modeles);
	end if;
	select count(*) into v_ranges from _qcs_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèle(s) déjà rangé(s) depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcs_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèle(s) déjà tagué(s) depuis le relevé : % tag(s)', v_tags;
	end if;
	select count(*), count(*) filter (where q.status <> 'published'
	                                     or q.options->'courseQuestion' is not null)
	  into v_cours, v_cours_changes
	  from _qcs_cours c join public.question_templates q on q.id = c.id;
	if v_cours not in (0, (select count(*) from _qcs_cours)) then
		raise exception 'démonstrations partiellement présentes : % modèle(s) sur %', v_cours,
			(select count(*) from _qcs_cours);
	end if;
	if v_cours_changes <> 0 then
		raise exception 'démonstration(s) changée(s) depuis le relevé (statut ou marqueur) : %', v_cours_changes;
	end if;
end $garde$;

-- ---- 3. Résolution STRICTE des chemins et des points ------------------------------------------
alter table _qcs_modeles add column noeud uuid;
alter table _qcs_modeles add column notion_id uuid;
alter table _qcs_modeles add column point_id uuid;
update _qcs_modeles r set noeud = n.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = 'Suites'
   and n.name = r.notion and r.sous_notion is null;
update _qcs_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = 'Suites'
   and n.name = r.notion and s.name = r.sous_notion;
update _qcs_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '1_SPE' and p.code = r.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _qcs_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qcs_modeles where noeud is null),
			(select count(*) from _qcs_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 4. Rangement, puis tags (le trigger des tags lit le nœud du modèle), puis marqueur ---------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qcs_modeles r
 where q.id = r.id;
update public.question_templates q
   set options = coalesce(q.options, '{}'::jsonb) || jsonb_build_object('courseQuestion', true)
  from _qcs_cours c
 where q.id = c.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qcs_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN -----------------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
	v_cours integer; v_cours_ok integer;
begin
	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
	  into v_presents, v_noeuds
	  from _qcs_modeles r join public.question_templates q on q.id = r.id;
	select count(*), count(*) filter (where exists (select 1 from _qcs_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcs_modeles m on m.id = q.template_id;
	select count(*), count(*) filter (where q.options->'courseQuestion' = 'true'::jsonb)
	  into v_cours, v_cours_ok
	  from _qcs_cours c join public.question_templates q on q.id = c.id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents
	   or v_cours_ok <> v_cours then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %, marqueurs %/%',
			v_noeuds, v_presents, v_tags, v_presents, v_total, v_cours_ok, v_cours;
	end if;
end $check$;

drop table _qcs_cours;
drop table _qcs_modeles;
