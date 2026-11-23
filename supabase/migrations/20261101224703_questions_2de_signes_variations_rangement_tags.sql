-- ============================================================================
-- Chantier « questions-2de », lot 7 (signes et variations) : nœud et tag de 21 modèles neufs
-- ============================================================================
--   - 0cecc7f2 (signe des fonctions de référence) → 2-329, sur « Fonctions > Généralités sur les fonctions > signe » ;
--   - 118c4696 (B(x) > 0 par un tableau, quotient) → 2-451, sur « Algèbre > Inéquations : produit et quotient > tableau de signes » ;
--   - 23908ef7 (signe de |x|) → 2-475, sur « Fonctions > Fonction valeur absolue » ;
--   - 275cb665 (comparer des images sur la courbe) → 2-477, sur « Fonctions > Généralités sur les fonctions > variations » ;
--   - 284bc012 (B(x) = 0 par un tableau, quotient) → 2-449, sur « Algèbre > Inéquations : produit et quotient > tableau de signes » ;
--   - 3810a06c (courbe et tableau de variations) → 2-349, sur « Fonctions > Généralités sur les fonctions > variations » ;
--   - 39154ac5 (extremums lus sur une courbe) → 2-350, sur « Fonctions > Généralités sur les fonctions > extremums » ;
--   - 4f887f53 (comparer des images par le calcul) → 2-356, sur « Fonctions > Généralités sur les fonctions > variations » ;
--   - 6670b161 (affine : variations, signe, droite) → 2-352, sur « Fonctions > Fonctions affines > variations et signe » ;
--   - 6bb5ff09 (signe d'un produit, sans tableau) → 2-268, sur « Algèbre > Inéquations : produit et quotient > tableau de signes » ;
--   - 71174c9c (A(x) > 0 par un tableau) → 2-450, sur « Algèbre > Inéquations : produit et quotient > tableau de signes » ;
--   - 71c7933f (signe de x²) → 2-476, sur « Fonctions > Généralités sur les fonctions > signe » ;
--   - 752c6c5e (variations de |x|) → 2-354, sur « Fonctions > Fonction valeur absolue > variations » ;
--   - 80826238 (signe d'un quotient, sans tableau) → 2-426, sur « Algèbre > Inéquations : produit et quotient > tableau de signes » ;
--   - 93bc8b5e (croissante ou décroissante sur un intervalle) → 2-345, sur « Fonctions > Généralités sur les fonctions > variations » ;
--   - 9c7ab1c7 (tableau de signes d'un quotient) → 2-446, sur « Algèbre > Inéquations : produit et quotient > tableau de signes » ;
--   - 9e35f8ba (lire un tableau de variations) → 2-473, sur « Fonctions > Généralités sur les fonctions > variations » ;
--   - a1cd5403 (variations de x²) → 2-355, sur « Fonctions > Fonction carré > variations » ;
--   - d80a7d42 (A(x) = 0 par un tableau) → 2-337, sur « Algèbre > Inéquations : produit et quotient > tableau de signes » ;
--   - e372112e (maximum et minimum sur un intervalle) → 2-346, sur « Fonctions > Généralités sur les fonctions > extremums » ;
--   - f0163416 (tableau de signes d'un produit) → 2-330, sur « Algèbre > Inéquations : produit et quotient > tableau de signes » ;
-- Chaque modèle va sur le nœud de son point (notion ou sous-notion : question_template_points_check_rules
-- refuse un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- 2-475 est rangé sur sa NOTION (son point n'a pas de sous-notion). Ni le contenu, ni
-- les niveaux (écrits à la création), ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-01 (journal docs/wip/questions-2de-progress.md § 44). Les modèles
-- ont été créés en brouillon le 2026-11-01 par scripts/create-questions.ts (lots 7 A, 7 B et 7 C,
-- lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (21 modèles). Elle est prouvée par
-- tests/integration/questions-2de-signes-variations-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-01),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David en phase 0 du lot 7, AVANT
-- le SQL, tranchée par lui le 2026-11-01 : personne). Aucune règle ne change. Effet visible : les
-- 21 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les
-- voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 21 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('0cecc7f2-9741-4d83-ad08-99b5d0c3007c'::uuid),
--                ('118c4696-2486-4ab8-9012-e27ab1986e50'::uuid),
--                ('23908ef7-a9ac-4218-a8a7-5faf479a8158'::uuid),
--                ('275cb665-f0ab-4649-8188-df9ae44bb322'::uuid),
--                ('284bc012-619b-4692-b0b0-6a26097ca326'::uuid),
--                ('3810a06c-a433-41f6-9fbc-533c2acfaf4f'::uuid),
--                ('39154ac5-b4b2-4995-a953-ab980156bce1'::uuid),
--                ('4f887f53-263e-4ef3-b497-b3b50d83ec59'::uuid),
--                ('6670b161-4120-44a4-a6fd-22c8db71d2a1'::uuid),
--                ('6bb5ff09-34ba-401b-a7d5-8edb76d9dee0'::uuid),
--                ('71174c9c-2ab7-4829-9f0f-d8e81e2eb7a8'::uuid),
--                ('71c7933f-edca-45b8-9847-b180a8c05196'::uuid),
--                ('752c6c5e-8bb3-4e35-9d94-1447a07a2cf4'::uuid),
--                ('80826238-a393-4840-b6be-b115dbfae8d7'::uuid),
--                ('93bc8b5e-b2a5-4793-b64e-271601504498'::uuid),
--                ('9c7ab1c7-d3f3-4c78-96f4-c14e5a657574'::uuid),
--                ('9e35f8ba-9427-40ad-a62a-13422f50442b'::uuid),
--                ('a1cd5403-c607-42d2-a49d-a73d076e1f16'::uuid),
--                ('d80a7d42-d377-415e-b5b1-5fc0a0b01b5a'::uuid),
--                ('e372112e-c0f1-4b8d-9fad-cf84372bd1dc'::uuid),
--                ('f0163416-0610-49cc-bf2d-83db744dbf43'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('0cecc7f2-9741-4d83-ad08-99b5d0c3007c'::uuid, '2-329'),
-- 	('118c4696-2486-4ab8-9012-e27ab1986e50'::uuid, '2-451'),
-- 	('23908ef7-a9ac-4218-a8a7-5faf479a8158'::uuid, '2-475'),
-- 	('275cb665-f0ab-4649-8188-df9ae44bb322'::uuid, '2-477'),
-- 	('284bc012-619b-4692-b0b0-6a26097ca326'::uuid, '2-449'),
-- 	('3810a06c-a433-41f6-9fbc-533c2acfaf4f'::uuid, '2-349'),
-- 	('39154ac5-b4b2-4995-a953-ab980156bce1'::uuid, '2-350'),
-- 	('4f887f53-263e-4ef3-b497-b3b50d83ec59'::uuid, '2-356'),
-- 	('6670b161-4120-44a4-a6fd-22c8db71d2a1'::uuid, '2-352'),
-- 	('6bb5ff09-34ba-401b-a7d5-8edb76d9dee0'::uuid, '2-268'),
-- 	('71174c9c-2ab7-4829-9f0f-d8e81e2eb7a8'::uuid, '2-450'),
-- 	('71c7933f-edca-45b8-9847-b180a8c05196'::uuid, '2-476'),
-- 	('752c6c5e-8bb3-4e35-9d94-1447a07a2cf4'::uuid, '2-354'),
-- 	('80826238-a393-4840-b6be-b115dbfae8d7'::uuid, '2-426'),
-- 	('93bc8b5e-b2a5-4793-b64e-271601504498'::uuid, '2-345'),
-- 	('9c7ab1c7-d3f3-4c78-96f4-c14e5a657574'::uuid, '2-446'),
-- 	('9e35f8ba-9427-40ad-a62a-13422f50442b'::uuid, '2-473'),
-- 	('a1cd5403-c607-42d2-a49d-a73d076e1f16'::uuid, '2-355'),
-- 	('d80a7d42-d377-415e-b5b1-5fc0a0b01b5a'::uuid, '2-337'),
-- 	('e372112e-c0f1-4b8d-9fad-cf84372bd1dc'::uuid, '2-346'),
-- 	('f0163416-0610-49cc-bf2d-83db744dbf43'::uuid, '2-330')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '0cecc7f2-9741-4d83-ad08-99b5d0c3007c',
--               '118c4696-2486-4ab8-9012-e27ab1986e50',
--               '23908ef7-a9ac-4218-a8a7-5faf479a8158',
--               '275cb665-f0ab-4649-8188-df9ae44bb322',
--               '284bc012-619b-4692-b0b0-6a26097ca326',
--               '3810a06c-a433-41f6-9fbc-533c2acfaf4f',
--               '39154ac5-b4b2-4995-a953-ab980156bce1',
--               '4f887f53-263e-4ef3-b497-b3b50d83ec59',
--               '6670b161-4120-44a4-a6fd-22c8db71d2a1',
--               '6bb5ff09-34ba-401b-a7d5-8edb76d9dee0',
--               '71174c9c-2ab7-4829-9f0f-d8e81e2eb7a8',
--               '71c7933f-edca-45b8-9847-b180a8c05196',
--               '752c6c5e-8bb3-4e35-9d94-1447a07a2cf4',
--               '80826238-a393-4840-b6be-b115dbfae8d7',
--               '93bc8b5e-b2a5-4793-b64e-271601504498',
--               '9c7ab1c7-d3f3-4c78-96f4-c14e5a657574',
--               '9e35f8ba-9427-40ad-a62a-13422f50442b',
--               'a1cd5403-c607-42d2-a49d-a73d076e1f16',
--               'd80a7d42-d377-415e-b5b1-5fc0a0b01b5a',
--               'e372112e-c0f1-4b8d-9fad-cf84372bd1dc',
--               'f0163416-0610-49cc-bf2d-83db744dbf43');
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
	('0cecc7f2-9741-4d83-ad08-99b5d0c3007c', 'Fonctions', 'Généralités sur les fonctions', 'signe', '2-329'),
	('118c4696-2486-4ab8-9012-e27ab1986e50', 'Algèbre', 'Inéquations : produit et quotient', 'tableau de signes', '2-451'),
	('23908ef7-a9ac-4218-a8a7-5faf479a8158', 'Fonctions', 'Fonction valeur absolue', null, '2-475'),
	('275cb665-f0ab-4649-8188-df9ae44bb322', 'Fonctions', 'Généralités sur les fonctions', 'variations', '2-477'),
	('284bc012-619b-4692-b0b0-6a26097ca326', 'Algèbre', 'Inéquations : produit et quotient', 'tableau de signes', '2-449'),
	('3810a06c-a433-41f6-9fbc-533c2acfaf4f', 'Fonctions', 'Généralités sur les fonctions', 'variations', '2-349'),
	('39154ac5-b4b2-4995-a953-ab980156bce1', 'Fonctions', 'Généralités sur les fonctions', 'extremums', '2-350'),
	('4f887f53-263e-4ef3-b497-b3b50d83ec59', 'Fonctions', 'Généralités sur les fonctions', 'variations', '2-356'),
	('6670b161-4120-44a4-a6fd-22c8db71d2a1', 'Fonctions', 'Fonctions affines', 'variations et signe', '2-352'),
	('6bb5ff09-34ba-401b-a7d5-8edb76d9dee0', 'Algèbre', 'Inéquations : produit et quotient', 'tableau de signes', '2-268'),
	('71174c9c-2ab7-4829-9f0f-d8e81e2eb7a8', 'Algèbre', 'Inéquations : produit et quotient', 'tableau de signes', '2-450'),
	('71c7933f-edca-45b8-9847-b180a8c05196', 'Fonctions', 'Généralités sur les fonctions', 'signe', '2-476'),
	('752c6c5e-8bb3-4e35-9d94-1447a07a2cf4', 'Fonctions', 'Fonction valeur absolue', 'variations', '2-354'),
	('80826238-a393-4840-b6be-b115dbfae8d7', 'Algèbre', 'Inéquations : produit et quotient', 'tableau de signes', '2-426'),
	('93bc8b5e-b2a5-4793-b64e-271601504498', 'Fonctions', 'Généralités sur les fonctions', 'variations', '2-345'),
	('9c7ab1c7-d3f3-4c78-96f4-c14e5a657574', 'Algèbre', 'Inéquations : produit et quotient', 'tableau de signes', '2-446'),
	('9e35f8ba-9427-40ad-a62a-13422f50442b', 'Fonctions', 'Généralités sur les fonctions', 'variations', '2-473'),
	('a1cd5403-c607-42d2-a49d-a73d076e1f16', 'Fonctions', 'Fonction carré', 'variations', '2-355'),
	('d80a7d42-d377-415e-b5b1-5fc0a0b01b5a', 'Algèbre', 'Inéquations : produit et quotient', 'tableau de signes', '2-337'),
	('e372112e-c0f1-4b8d-9fad-cf84372bd1dc', 'Fonctions', 'Généralités sur les fonctions', 'extremums', '2-346'),
	('f0163416-0610-49cc-bf2d-83db744dbf43', 'Algèbre', 'Inéquations : produit et quotient', 'tableau de signes', '2-330');

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
 where p.grade = '2' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
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
	if v_presents not in (0, 21) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 21', v_presents;
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
