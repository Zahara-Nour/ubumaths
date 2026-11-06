-- ============================================================================
-- Chantier « questions-2de », lot 11 (lire un programme) : nœud et tag de 15 modèles neufs
-- ============================================================================
--   - b7785962 (type d'une variable) → 2-218, sur « Algorithmique > Variables et instructions > types » ;
--   - b3db9b3c (choisir le type) → 2-223, sur « Algorithmique > Variables et instructions > types » ;
--   - 1bb39e2d (affectation (←)) → 2-219, sur « Algorithmique > Variables et instructions > variables et affectation » ;
--   - bfdb42c0 (séquence d'instructions) → 2-220, sur « Algorithmique > Variables et instructions > variables et affectation » ;
--   - 3f4c0e5f (compléter une affectation) → 2-224, sur « Algorithmique > Variables et instructions > variables et affectation » ;
--   - 5bd3323d (instruction conditionnelle) → 2-221, sur « Algorithmique > Variables et instructions > instructions conditionnelles » ;
--   - e2cc8a48 (compléter une condition) → 2-415, sur « Algorithmique > Variables et instructions > instructions conditionnelles » ;
--   - 2ffa6d80 (boucle for) → 2-222, sur « Algorithmique > Boucles > boucle bornée » ;
--   - 3cacefc5 (boucle while) → 2-413, sur « Algorithmique > Boucles > boucle non bornée » ;
--   - 8f0bbf63 (programme plus complexe) → 2-228, sur « Algorithmique > Variables et instructions » ;
--   - da04078f (fonction à un ou plusieurs arguments) → 2-229, sur « Algorithmique > Fonctions Python > définir une fonction » ;
--   - 8d46dd50 (appeler une fonction) → 2-416, sur « Algorithmique > Fonctions Python > appeler une fonction » ;
--   - e4784c78 (fonction plus complexe) → 2-232, sur « Algorithmique > Fonctions Python > définir une fonction » ;
--   - 4ce02817 (fonction moyenne) → 2-233, sur « Algorithmique > Fonctions Python > définir une fonction » ;
--   - f77e86cf (fonction écart type) → 2-417, sur « Algorithmique > Fonctions Python > définir une fonction » ;
-- Chaque modèle porte UN point (ADR 0020), posé sur son nœud ou sur la notion de ce nœud (relevé
-- du 2026-11-06) : question_template_points_check_rules l'exige. Décision L11-b : 2-233 et 2-417 sous
-- « Algorithmique > Fonctions Python », pas sous « Statistiques ».
-- Ni le contenu ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-05 (journal docs/wip/questions-2de-progress.md § 87). Les
-- modèles ont été créés en brouillon les 2026-11-05 et 2026-11-06 par scripts/create-questions.ts
-- (lots 11 A et 11 B, lancés par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (15 modèles). Elle est prouvée par
-- tests/integration/questions-2de-lot11-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-06), sinon
-- une retouche faite depuis à la main serait écrasée. Nœud désigné par son chemin, résolu
-- STRICTEMENT ; le point doit être sur ce nœud ou sur sa notion.
--
-- Données d'élèves : aucune (brouillons).
--
-- Accès : personne ne gagne ni ne perd d'accès (question d'accès des lots de questions-2de, tranchée
-- par David : personne). Aucune règle ne change. Effet visible : les 15 brouillons apparaissent sous
-- leur nœud et sous leur point dans l'admin ; les élèves ne voient rien avant la publication par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 15 tags et rend les 15 modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('b7785962-b3a1-491b-988d-fcff7707ef29'::uuid),
--                ('b3db9b3c-67e3-4031-8489-80836c988654'::uuid),
--                ('1bb39e2d-4b9c-4fe2-b434-bfc06894f871'::uuid),
--                ('bfdb42c0-5157-458b-b3f9-00e4deac849c'::uuid),
--                ('3f4c0e5f-d2dc-4004-a471-bab7e6350514'::uuid),
--                ('5bd3323d-8cf5-4f62-a4a8-15d6245494ab'::uuid),
--                ('e2cc8a48-5b81-4909-9d8c-5000fc4340b8'::uuid),
--                ('2ffa6d80-d62d-4de5-87f1-fcbb3fea7438'::uuid),
--                ('3cacefc5-59a1-498e-a453-fc25369110f9'::uuid),
--                ('8f0bbf63-6861-453d-acf1-a942dbf7e67c'::uuid),
--                ('da04078f-0afb-4ca3-910e-45cb480e3b48'::uuid),
--                ('8d46dd50-34ea-4504-b92f-d269a84f0179'::uuid),
--                ('e4784c78-13d5-49ac-b50b-b07efca03d19'::uuid),
--                ('4ce02817-c5b4-4500-9d0c-0bbf7be0a662'::uuid),
--                ('f77e86cf-e00f-41e7-a214-2b5ccefecf01'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('b7785962-b3a1-491b-988d-fcff7707ef29'::uuid, '2-218'),
-- 	('b3db9b3c-67e3-4031-8489-80836c988654'::uuid, '2-223'),
-- 	('1bb39e2d-4b9c-4fe2-b434-bfc06894f871'::uuid, '2-219'),
-- 	('bfdb42c0-5157-458b-b3f9-00e4deac849c'::uuid, '2-220'),
-- 	('3f4c0e5f-d2dc-4004-a471-bab7e6350514'::uuid, '2-224'),
-- 	('5bd3323d-8cf5-4f62-a4a8-15d6245494ab'::uuid, '2-221'),
-- 	('e2cc8a48-5b81-4909-9d8c-5000fc4340b8'::uuid, '2-415'),
-- 	('2ffa6d80-d62d-4de5-87f1-fcbb3fea7438'::uuid, '2-222'),
-- 	('3cacefc5-59a1-498e-a453-fc25369110f9'::uuid, '2-413'),
-- 	('8f0bbf63-6861-453d-acf1-a942dbf7e67c'::uuid, '2-228'),
-- 	('da04078f-0afb-4ca3-910e-45cb480e3b48'::uuid, '2-229'),
-- 	('8d46dd50-34ea-4504-b92f-d269a84f0179'::uuid, '2-416'),
-- 	('e4784c78-13d5-49ac-b50b-b07efca03d19'::uuid, '2-232'),
-- 	('4ce02817-c5b4-4500-9d0c-0bbf7be0a662'::uuid, '2-233'),
-- 	('f77e86cf-e00f-41e7-a214-2b5ccefecf01'::uuid, '2-417')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               'b7785962-b3a1-491b-988d-fcff7707ef29',
--               'b3db9b3c-67e3-4031-8489-80836c988654',
--               '1bb39e2d-4b9c-4fe2-b434-bfc06894f871',
--               'bfdb42c0-5157-458b-b3f9-00e4deac849c',
--               '3f4c0e5f-d2dc-4004-a471-bab7e6350514',
--               '5bd3323d-8cf5-4f62-a4a8-15d6245494ab',
--               'e2cc8a48-5b81-4909-9d8c-5000fc4340b8',
--               '2ffa6d80-d62d-4de5-87f1-fcbb3fea7438',
--               '3cacefc5-59a1-498e-a453-fc25369110f9',
--               '8f0bbf63-6861-453d-acf1-a942dbf7e67c',
--               'da04078f-0afb-4ca3-910e-45cb480e3b48',
--               '8d46dd50-34ea-4504-b92f-d269a84f0179',
--               'e4784c78-13d5-49ac-b50b-b07efca03d19',
--               '4ce02817-c5b4-4500-9d0c-0bbf7be0a662',
--               'f77e86cf-e00f-41e7-a214-2b5ccefecf01');
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
	('b7785962-b3a1-491b-988d-fcff7707ef29', 'Algorithmique', 'Variables et instructions', 'types', '2-218'),
	('b3db9b3c-67e3-4031-8489-80836c988654', 'Algorithmique', 'Variables et instructions', 'types', '2-223'),
	('1bb39e2d-4b9c-4fe2-b434-bfc06894f871', 'Algorithmique', 'Variables et instructions', 'variables et affectation', '2-219'),
	('bfdb42c0-5157-458b-b3f9-00e4deac849c', 'Algorithmique', 'Variables et instructions', 'variables et affectation', '2-220'),
	('3f4c0e5f-d2dc-4004-a471-bab7e6350514', 'Algorithmique', 'Variables et instructions', 'variables et affectation', '2-224'),
	('5bd3323d-8cf5-4f62-a4a8-15d6245494ab', 'Algorithmique', 'Variables et instructions', 'instructions conditionnelles', '2-221'),
	('e2cc8a48-5b81-4909-9d8c-5000fc4340b8', 'Algorithmique', 'Variables et instructions', 'instructions conditionnelles', '2-415'),
	('2ffa6d80-d62d-4de5-87f1-fcbb3fea7438', 'Algorithmique', 'Boucles', 'boucle bornée', '2-222'),
	('3cacefc5-59a1-498e-a453-fc25369110f9', 'Algorithmique', 'Boucles', 'boucle non bornée', '2-413'),
	('8f0bbf63-6861-453d-acf1-a942dbf7e67c', 'Algorithmique', 'Variables et instructions', null, '2-228'),
	('da04078f-0afb-4ca3-910e-45cb480e3b48', 'Algorithmique', 'Fonctions Python', 'définir une fonction', '2-229'),
	('8d46dd50-34ea-4504-b92f-d269a84f0179', 'Algorithmique', 'Fonctions Python', 'appeler une fonction', '2-416'),
	('e4784c78-13d5-49ac-b50b-b07efca03d19', 'Algorithmique', 'Fonctions Python', 'définir une fonction', '2-232'),
	('4ce02817-c5b4-4500-9d0c-0bbf7be0a662', 'Algorithmique', 'Fonctions Python', 'définir une fonction', '2-233'),
	('f77e86cf-e00f-41e7-a214-2b5ccefecf01', 'Algorithmique', 'Fonctions Python', 'définir une fonction', '2-417');

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
	if v_presents not in (0, 15) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 15', v_presents;
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
