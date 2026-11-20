-- ============================================================================
-- Chantier « ensembles-2de », gros lot « nombres et calculs » : nœud et tag de 36 modèles neufs
-- ============================================================================
--   - 10a51999 (arrondir) → 2-254, sur « Nombres et calculs > Décimaux : numération > arrondis et ordres de grandeur » ;
--   - ca1a1201 (ordre de grandeur vraisemblable) → 2-254, sur « Nombres et calculs > Décimaux : numération > arrondis et ordres de grandeur » ;
--   - 51f08367 (comparer à 1, ranger) → 2-264, sur « Algèbre > Inégalités > comparaison et encadrement » ;
--   - c6634cf8 (entiers d'un intervalle) → 2-244, sur « Ensembles > Ensembles de nombres > intervalles » ;
--   - a0018475 (distance entre deux nombres) → 2-420, sur « Fonctions > Fonction valeur absolue > définition et distance » ;
--   - 37b3a637 (|x − a| > r (hors programme)) → sans point, sur « Fonctions > Fonction valeur absolue > équations et inéquations » ;
--   - 896125d8 (plusieurs valeurs absolues (hors programme)) → sans point, sur « Fonctions > Fonction valeur absolue > définition et distance » ;
--   - aece0612 (somme et différence de fractions) → 2-272, sur « Algèbre > Calcul littéral > expressions fractionnaires » ;
--   - 3e4a8f6c (produit de fractions) → 2-272, sur « Algèbre > Calcul littéral > expressions fractionnaires » ;
--   - 7b4a0268 (quotient de fractions) → 2-272, sur « Algèbre > Calcul littéral > expressions fractionnaires » ;
--   - 9882dc64 (entier + fraction < 1) → 2-272, sur « Algèbre > Calcul littéral > expressions fractionnaires » ;
--   - a5f9a809 (fractions et priorités) → 2-272, sur « Algèbre > Calcul littéral > expressions fractionnaires » ;
--   - 502e4f97 (fraction faite, fraction restante) → 2-272, sur « Algèbre > Calcul littéral > expressions fractionnaires » ;
--   - 46b95c39 (fraction du reste) → 2-272, sur « Algèbre > Calcul littéral > expressions fractionnaires » ;
--   - 3326ea25 (comparer deux fractions) → 2-264, sur « Algèbre > Inégalités > comparaison et encadrement » ;
--   - a1a20304 (valeur décimale d'une fraction) → 2-248, sur « Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ » ;
--   - 2be2c495 (division euclidienne) → 2-236, sur « Arithmétique > Divisibilité > multiples et diviseurs » ;
--   - 943033bf (critères de divisibilité) → 2-236, sur « Arithmétique > Divisibilité > multiples et diviseurs » ;
--   - 73bceb97 (nombre premier, décomposition (hors programme)) → sans point, sur « Arithmétique > Divisibilité > multiples et diviseurs » ;
--   - 0bd51758 (PGCD et PPCM (hors programme)) → sans point, sur « Arithmétique > Divisibilité > multiples et diviseurs » ;
--   - 8fb1a23a (valeur d'une puissance) → 2-260, sur « Nombres et calculs > Puissances : calculs » ;
--   - f6d63dfa (signe d'une puissance) → 2-260, sur « Nombres et calculs > Puissances : calculs » ;
--   - f8736002 (notation puissance) → 2-260, sur « Nombres et calculs > Puissances : calculs » ;
--   - 747d5773 (écrire comme une puissance) → 2-260, sur « Nombres et calculs > Puissances : calculs » ;
--   - fa0dd978 (bases cachées) → 2-260, sur « Nombres et calculs > Puissances : calculs » ;
--   - fbb2d0da (priorités avec des puissances) → 2-260, sur « Nombres et calculs > Puissances : calculs » ;
--   - a80f1a52 (écriture scientifique) → 2-270, sur « Nombres et calculs > Puissances : calculs » ;
--   - 0369c9ac (puissances de 10) → 2-270, sur « Nombres et calculs > Puissances : calculs » ;
--   - 204ac445 (préfixes) → 2-270, sur « Nombres et calculs > Puissances : calculs » ;
--   - 516273a4 (une racine existe-t-elle ?) → 2-261, sur « Nombres et calculs > Racines carrées : calculs > propriétés » ;
--   - 5ddd58db (racine d'un carré parfait) → 2-261, sur « Nombres et calculs > Racines carrées : calculs > propriétés » ;
--   - 4c79b893 (calculs directs avec des racines) → 2-261, sur « Nombres et calculs > Racines carrées : calculs > propriétés » ;
--   - db1834a6 (développer avec des racines) → 2-261, sur « Nombres et calculs > Racines carrées : calculs > propriétés » ;
--   - 9f01ca57 (entre deux puissances de 10) → 2-254, sur « Nombres et calculs > Décimaux : numération > arrondis et ordres de grandeur » ;
--   - c7840c10 (ranger carrés et cubes) → 2-264, sur « Algèbre > Inégalités > comparaison et encadrement » ;
--   - 96ede34c (rationaliser (hors programme)) → sans point, sur « Nombres et calculs > Racines carrées : calculs > techniques de calcul » ;
-- Chaque modèle porte AU PLUS un point (ADR 0020), posé sur son nœud ou sur la notion de ce nœud
-- (relevé du 2026-11-20) : question_template_points_check_rules l'exige. Les 5 modèles hors
-- programme, gardés par David, sont rangés SANS point (ADR 0020 : rangé sans point = hors programme).
-- Ni le contenu, ni le niveau, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-20 (journal docs/wip/ensembles-2de-progress.md). Les modèles
-- ont été créés en brouillon le 2026-11-20 par scripts/create-questions.ts (lancé par David), qui ne
-- pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (36 modèles). Elle est prouvée par
-- tests/integration/questions-2de-nombres-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-20), sinon
-- une retouche faite depuis à la main serait écrasée. Nœud désigné par son chemin, résolu
-- STRICTEMENT ; le point, s'il y en a un, doit être sur ce nœud ou sur sa notion.
--
-- Données d'élèves : aucune (brouillons).
--
-- Accès : personne ne gagne ni ne perd d'accès (question d'accès d'un lot de brouillons : personne,
-- tranchée par David au lot 1 le 2026-11-20). Aucune règle ne change. Effet visible : les 36
-- brouillons apparaissent sous leur nœud (et leur point) dans l'admin ; les élèves ne voient rien
-- avant la publication par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 31 tags et rend les 36 modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('0369c9ac-5e72-4175-b40b-a23617f23615'::uuid),
--                ('0bd51758-ede5-4969-b76a-a6608f4a4df1'::uuid),
--                ('10a51999-6d45-41fb-80db-03b70dfeecb8'::uuid),
--                ('204ac445-03a6-4c17-b4a3-67704cf664fd'::uuid),
--                ('2be2c495-9f07-4d76-8e21-65e189c8345d'::uuid),
--                ('3326ea25-4329-40a9-a3e9-536de7abbb47'::uuid),
--                ('37b3a637-bd6e-46ae-bf85-a19175d41c9a'::uuid),
--                ('3e4a8f6c-55fe-49d1-bf7d-0ae352e1451a'::uuid),
--                ('46b95c39-fc13-4e8d-a013-50799dbfd666'::uuid),
--                ('4c79b893-f663-4e49-9e33-9fd3bacb7e3b'::uuid),
--                ('502e4f97-26fa-42e1-b247-e9c57b96f664'::uuid),
--                ('516273a4-899d-4e12-8fe6-6cc1fa055442'::uuid),
--                ('51f08367-a8db-4714-a119-821107398cdb'::uuid),
--                ('5ddd58db-f08b-44d4-bc9c-67ee47250ace'::uuid),
--                ('73bceb97-6f47-4e93-97c4-70606e8813a7'::uuid),
--                ('747d5773-0e0d-4094-9c3b-11daef5e2463'::uuid),
--                ('7b4a0268-8d79-455c-b8f4-0af1b84a96f3'::uuid),
--                ('896125d8-9c88-44e3-a1eb-9cf070077634'::uuid),
--                ('8fb1a23a-6e98-4b58-8745-caf5fec3dc88'::uuid),
--                ('943033bf-3420-4660-8941-14bf2c2030d9'::uuid),
--                ('96ede34c-259b-43f0-b920-d9e90003576e'::uuid),
--                ('9882dc64-40cd-48ce-9681-4e7a3be923c8'::uuid),
--                ('9f01ca57-6330-40b6-a423-997ff357a6f3'::uuid),
--                ('a0018475-8694-4bfb-8823-b722394687d0'::uuid),
--                ('a1a20304-015a-4c63-807e-aa69a58cbb7d'::uuid),
--                ('a5f9a809-4f1e-4b40-a340-13540500cf3f'::uuid),
--                ('a80f1a52-d7ad-414e-ad42-6f0f2fe4e761'::uuid),
--                ('aece0612-6686-46f6-883f-7326cfecd506'::uuid),
--                ('c6634cf8-b7d9-42f6-b12d-a504fd32bc34'::uuid),
--                ('c7840c10-3e06-4aa7-ab97-257f80cd16d2'::uuid),
--                ('ca1a1201-e819-4ad2-8237-dd61c3d1dbc2'::uuid),
--                ('db1834a6-3374-47bd-94c9-87c9aa263604'::uuid),
--                ('f6d63dfa-94a6-4be7-b19e-367405c574b6'::uuid),
--                ('f8736002-2920-444f-973f-b365e1c429d5'::uuid),
--                ('fa0dd978-a74e-4488-bcfd-026aef0288cc'::uuid),
--                ('fbb2d0da-e126-41ec-b8d1-f0e97bf4f974'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('10a51999-6d45-41fb-80db-03b70dfeecb8'::uuid, '2-254'),
-- 	('ca1a1201-e819-4ad2-8237-dd61c3d1dbc2'::uuid, '2-254'),
-- 	('51f08367-a8db-4714-a119-821107398cdb'::uuid, '2-264'),
-- 	('c6634cf8-b7d9-42f6-b12d-a504fd32bc34'::uuid, '2-244'),
-- 	('a0018475-8694-4bfb-8823-b722394687d0'::uuid, '2-420'),
-- 	('aece0612-6686-46f6-883f-7326cfecd506'::uuid, '2-272'),
-- 	('3e4a8f6c-55fe-49d1-bf7d-0ae352e1451a'::uuid, '2-272'),
-- 	('7b4a0268-8d79-455c-b8f4-0af1b84a96f3'::uuid, '2-272'),
-- 	('9882dc64-40cd-48ce-9681-4e7a3be923c8'::uuid, '2-272'),
-- 	('a5f9a809-4f1e-4b40-a340-13540500cf3f'::uuid, '2-272'),
-- 	('502e4f97-26fa-42e1-b247-e9c57b96f664'::uuid, '2-272'),
-- 	('46b95c39-fc13-4e8d-a013-50799dbfd666'::uuid, '2-272'),
-- 	('3326ea25-4329-40a9-a3e9-536de7abbb47'::uuid, '2-264'),
-- 	('a1a20304-015a-4c63-807e-aa69a58cbb7d'::uuid, '2-248'),
-- 	('2be2c495-9f07-4d76-8e21-65e189c8345d'::uuid, '2-236'),
-- 	('943033bf-3420-4660-8941-14bf2c2030d9'::uuid, '2-236'),
-- 	('8fb1a23a-6e98-4b58-8745-caf5fec3dc88'::uuid, '2-260'),
-- 	('f6d63dfa-94a6-4be7-b19e-367405c574b6'::uuid, '2-260'),
-- 	('f8736002-2920-444f-973f-b365e1c429d5'::uuid, '2-260'),
-- 	('747d5773-0e0d-4094-9c3b-11daef5e2463'::uuid, '2-260'),
-- 	('fa0dd978-a74e-4488-bcfd-026aef0288cc'::uuid, '2-260'),
-- 	('fbb2d0da-e126-41ec-b8d1-f0e97bf4f974'::uuid, '2-260'),
-- 	('a80f1a52-d7ad-414e-ad42-6f0f2fe4e761'::uuid, '2-270'),
-- 	('0369c9ac-5e72-4175-b40b-a23617f23615'::uuid, '2-270'),
-- 	('204ac445-03a6-4c17-b4a3-67704cf664fd'::uuid, '2-270'),
-- 	('516273a4-899d-4e12-8fe6-6cc1fa055442'::uuid, '2-261'),
-- 	('5ddd58db-f08b-44d4-bc9c-67ee47250ace'::uuid, '2-261'),
-- 	('4c79b893-f663-4e49-9e33-9fd3bacb7e3b'::uuid, '2-261'),
-- 	('db1834a6-3374-47bd-94c9-87c9aa263604'::uuid, '2-261'),
-- 	('9f01ca57-6330-40b6-a423-997ff357a6f3'::uuid, '2-254'),
-- 	('c7840c10-3e06-4aa7-ab97-257f80cd16d2'::uuid, '2-264')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '10a51999-6d45-41fb-80db-03b70dfeecb8',
--               'ca1a1201-e819-4ad2-8237-dd61c3d1dbc2',
--               '51f08367-a8db-4714-a119-821107398cdb',
--               'c6634cf8-b7d9-42f6-b12d-a504fd32bc34',
--               'a0018475-8694-4bfb-8823-b722394687d0',
--               '37b3a637-bd6e-46ae-bf85-a19175d41c9a',
--               '896125d8-9c88-44e3-a1eb-9cf070077634',
--               'aece0612-6686-46f6-883f-7326cfecd506',
--               '3e4a8f6c-55fe-49d1-bf7d-0ae352e1451a',
--               '7b4a0268-8d79-455c-b8f4-0af1b84a96f3',
--               '9882dc64-40cd-48ce-9681-4e7a3be923c8',
--               'a5f9a809-4f1e-4b40-a340-13540500cf3f',
--               '502e4f97-26fa-42e1-b247-e9c57b96f664',
--               '46b95c39-fc13-4e8d-a013-50799dbfd666',
--               '3326ea25-4329-40a9-a3e9-536de7abbb47',
--               'a1a20304-015a-4c63-807e-aa69a58cbb7d',
--               '2be2c495-9f07-4d76-8e21-65e189c8345d',
--               '943033bf-3420-4660-8941-14bf2c2030d9',
--               '73bceb97-6f47-4e93-97c4-70606e8813a7',
--               '0bd51758-ede5-4969-b76a-a6608f4a4df1',
--               '8fb1a23a-6e98-4b58-8745-caf5fec3dc88',
--               'f6d63dfa-94a6-4be7-b19e-367405c574b6',
--               'f8736002-2920-444f-973f-b365e1c429d5',
--               '747d5773-0e0d-4094-9c3b-11daef5e2463',
--               'fa0dd978-a74e-4488-bcfd-026aef0288cc',
--               'fbb2d0da-e126-41ec-b8d1-f0e97bf4f974',
--               'a80f1a52-d7ad-414e-ad42-6f0f2fe4e761',
--               '0369c9ac-5e72-4175-b40b-a23617f23615',
--               '204ac445-03a6-4c17-b4a3-67704cf664fd',
--               '516273a4-899d-4e12-8fe6-6cc1fa055442',
--               '5ddd58db-f08b-44d4-bc9c-67ee47250ace',
--               '4c79b893-f663-4e49-9e33-9fd3bacb7e3b',
--               'db1834a6-3374-47bd-94c9-87c9aa263604',
--               '9f01ca57-6330-40b6-a423-997ff357a6f3',
--               'c7840c10-3e06-4aa7-ab97-257f80cd16d2',
--               '96ede34c-259b-43f0-b920-d9e90003576e');
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
	-- null : modèle hors programme, rangé sans point
	code text
);
insert into _qc_modeles values
	('10a51999-6d45-41fb-80db-03b70dfeecb8', 'Nombres et calculs', 'Décimaux : numération', 'arrondis et ordres de grandeur', '2-254'),
	('ca1a1201-e819-4ad2-8237-dd61c3d1dbc2', 'Nombres et calculs', 'Décimaux : numération', 'arrondis et ordres de grandeur', '2-254'),
	('51f08367-a8db-4714-a119-821107398cdb', 'Algèbre', 'Inégalités', 'comparaison et encadrement', '2-264'),
	('c6634cf8-b7d9-42f6-b12d-a504fd32bc34', 'Ensembles', 'Ensembles de nombres', 'intervalles', '2-244'),
	('a0018475-8694-4bfb-8823-b722394687d0', 'Fonctions', 'Fonction valeur absolue', 'définition et distance', '2-420'),
	('37b3a637-bd6e-46ae-bf85-a19175d41c9a', 'Fonctions', 'Fonction valeur absolue', 'équations et inéquations', null),
	('896125d8-9c88-44e3-a1eb-9cf070077634', 'Fonctions', 'Fonction valeur absolue', 'définition et distance', null),
	('aece0612-6686-46f6-883f-7326cfecd506', 'Algèbre', 'Calcul littéral', 'expressions fractionnaires', '2-272'),
	('3e4a8f6c-55fe-49d1-bf7d-0ae352e1451a', 'Algèbre', 'Calcul littéral', 'expressions fractionnaires', '2-272'),
	('7b4a0268-8d79-455c-b8f4-0af1b84a96f3', 'Algèbre', 'Calcul littéral', 'expressions fractionnaires', '2-272'),
	('9882dc64-40cd-48ce-9681-4e7a3be923c8', 'Algèbre', 'Calcul littéral', 'expressions fractionnaires', '2-272'),
	('a5f9a809-4f1e-4b40-a340-13540500cf3f', 'Algèbre', 'Calcul littéral', 'expressions fractionnaires', '2-272'),
	('502e4f97-26fa-42e1-b247-e9c57b96f664', 'Algèbre', 'Calcul littéral', 'expressions fractionnaires', '2-272'),
	('46b95c39-fc13-4e8d-a013-50799dbfd666', 'Algèbre', 'Calcul littéral', 'expressions fractionnaires', '2-272'),
	('3326ea25-4329-40a9-a3e9-536de7abbb47', 'Algèbre', 'Inégalités', 'comparaison et encadrement', '2-264'),
	('a1a20304-015a-4c63-807e-aa69a58cbb7d', 'Ensembles', 'Ensembles de nombres', 'ℕ, ℤ, 𝔻, ℚ, ℝ', '2-248'),
	('2be2c495-9f07-4d76-8e21-65e189c8345d', 'Arithmétique', 'Divisibilité', 'multiples et diviseurs', '2-236'),
	('943033bf-3420-4660-8941-14bf2c2030d9', 'Arithmétique', 'Divisibilité', 'multiples et diviseurs', '2-236'),
	('73bceb97-6f47-4e93-97c4-70606e8813a7', 'Arithmétique', 'Divisibilité', 'multiples et diviseurs', null),
	('0bd51758-ede5-4969-b76a-a6608f4a4df1', 'Arithmétique', 'Divisibilité', 'multiples et diviseurs', null),
	('8fb1a23a-6e98-4b58-8745-caf5fec3dc88', 'Nombres et calculs', 'Puissances : calculs', null, '2-260'),
	('f6d63dfa-94a6-4be7-b19e-367405c574b6', 'Nombres et calculs', 'Puissances : calculs', null, '2-260'),
	('f8736002-2920-444f-973f-b365e1c429d5', 'Nombres et calculs', 'Puissances : calculs', null, '2-260'),
	('747d5773-0e0d-4094-9c3b-11daef5e2463', 'Nombres et calculs', 'Puissances : calculs', null, '2-260'),
	('fa0dd978-a74e-4488-bcfd-026aef0288cc', 'Nombres et calculs', 'Puissances : calculs', null, '2-260'),
	('fbb2d0da-e126-41ec-b8d1-f0e97bf4f974', 'Nombres et calculs', 'Puissances : calculs', null, '2-260'),
	('a80f1a52-d7ad-414e-ad42-6f0f2fe4e761', 'Nombres et calculs', 'Puissances : calculs', null, '2-270'),
	('0369c9ac-5e72-4175-b40b-a23617f23615', 'Nombres et calculs', 'Puissances : calculs', null, '2-270'),
	('204ac445-03a6-4c17-b4a3-67704cf664fd', 'Nombres et calculs', 'Puissances : calculs', null, '2-270'),
	('516273a4-899d-4e12-8fe6-6cc1fa055442', 'Nombres et calculs', 'Racines carrées : calculs', 'propriétés', '2-261'),
	('5ddd58db-f08b-44d4-bc9c-67ee47250ace', 'Nombres et calculs', 'Racines carrées : calculs', 'propriétés', '2-261'),
	('4c79b893-f663-4e49-9e33-9fd3bacb7e3b', 'Nombres et calculs', 'Racines carrées : calculs', 'propriétés', '2-261'),
	('db1834a6-3374-47bd-94c9-87c9aa263604', 'Nombres et calculs', 'Racines carrées : calculs', 'propriétés', '2-261'),
	('9f01ca57-6330-40b6-a423-997ff357a6f3', 'Nombres et calculs', 'Décimaux : numération', 'arrondis et ordres de grandeur', '2-254'),
	('c7840c10-3e06-4aa7-ab97-257f80cd16d2', 'Algèbre', 'Inégalités', 'comparaison et encadrement', '2-264'),
	('96ede34c-259b-43f0-b920-d9e90003576e', 'Nombres et calculs', 'Racines carrées : calculs', 'techniques de calcul', null);

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qc_modeles order by id;
select 1 from public.question_templates where id in (select id from _qc_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée ; le point est sur ce nœud ou sur sa notion
alter table _qc_modeles add column noeud uuid, add column point_id uuid;
-- Un chemin ne peut désigner qu'un nœud : l'index classification_nodes_sibling_name_key rend le nom
-- unique parmi les frères.
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
 where x.id = r.noeud and r.code is not null
   and p.grade = '2' and p.code = r.code and p.archived_at is null
   and p.node_id in (r.noeud, case when x.kind = 'subnotion' then x.parent_id else x.id end);
do $resolution$
begin
	if exists (select 1 from _qc_modeles where noeud is null or (code is not null and point_id is null)) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qc_modeles where noeud is null),
			(select count(*) from _qc_modeles where code is not null and point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qc_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 36) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 36', v_presents;
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
  join public.question_templates q on q.id = r.id
 where r.point_id is not null;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_attendus integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*), count(*) filter (where r.point_id is not null) into v_presents, v_attendus
	  from _qc_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qc_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qc_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qc_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qc_modeles;
