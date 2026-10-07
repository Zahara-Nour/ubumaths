-- ============================================================================
-- Seed de l'arbre des notions (classification_nodes) — version 2026-10-07.12
-- ============================================================================
-- L'arbre validé par David (tour complet des programmes CP → Tle, toutes voies,
-- le 2026-10-07) : 19 branches, 136 notions, 537 sous-notions. Source de
-- vérité : docs/wip/arbre-notions/arbre-notions.json (généré par
-- dessin_branches.py) ; ce fichier est GÉNÉRÉ depuis ce JSON — ne pas l'éditer
-- à la main. Conformément à l'ADR 0020, l'arbre ne porte AUCUN niveau scolaire.
-- Les parents sont retrouvés par (genre, nom[, parent]) : l'unicité dans la
-- fratrie est garantie par l'index de la migration 20261007120000.
--
-- MIGRATION ADDITIVE (données seulement). Rollback :
--   delete from public.classification_nodes where kind = 'subnotion';
--   delete from public.classification_nodes where kind = 'notion';
--   delete from public.classification_nodes where kind = 'branch';
-- (valide tant qu'aucun autre nœud n'a été créé par ailleurs ; sinon,
--  restreindre aux noms du présent fichier.)
-- ============================================================================

-- ---- Branche 1/19 : Nombres et calculs --------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Nombres et calculs', 0);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres et calculs'), 'Entiers : numération', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres et calculs'), 'Entiers : addition et soustraction', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres et calculs'), 'Entiers : multiplication', 2),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres et calculs'), 'Entiers : division', 3),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres et calculs'), 'Entiers : priorités opératoires', 4),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres et calculs'), 'Décimaux : numération', 5),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres et calculs'), 'Décimaux : calculs', 6),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres et calculs'), 'Fractions : sens et écritures', 7),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres et calculs'), 'Fractions : calculs', 8),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres et calculs'), 'Relatifs : sens et écritures', 9),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres et calculs'), 'Relatifs : calculs', 10),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres et calculs'), 'Puissances : sens et écritures', 11),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres et calculs'), 'Puissances : calculs', 12),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres et calculs'), 'Racines carrées : sens et écritures', 13),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres et calculs'), 'Racines carrées : calculs', 14),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres et calculs'), 'Problèmes arithmétiques', 15);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : numération' and p.name = 'Nombres et calculs'), 'comparer', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : numération' and p.name = 'Nombres et calculs'), 'décomposer', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : numération' and p.name = 'Nombres et calculs'), 'écrire', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : numération' and p.name = 'Nombres et calculs'), 'repérer', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : numération' and p.name = 'Nombres et calculs'), 'dénombrer', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : numération' and p.name = 'Nombres et calculs'), 'ordinaux et rangs', 5);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : addition et soustraction' and p.name = 'Nombres et calculs'), 'somme', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : addition et soustraction' and p.name = 'Nombres et calculs'), 'différence', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : addition et soustraction' and p.name = 'Nombres et calculs'), 'complément', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : addition et soustraction' and p.name = 'Nombres et calculs'), 'tables', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : addition et soustraction' and p.name = 'Nombres et calculs'), 'double et moitié', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : addition et soustraction' and p.name = 'Nombres et calculs'), 'triple et tiers', 5),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : addition et soustraction' and p.name = 'Nombres et calculs'), 'calcul astucieux', 6),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : addition et soustraction' and p.name = 'Nombres et calculs'), 'calcul posé', 7);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : multiplication' and p.name = 'Nombres et calculs'), 'tables', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : multiplication' and p.name = 'Nombres et calculs'), 'produit', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : multiplication' and p.name = 'Nombres et calculs'), 'carrés', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : multiplication' and p.name = 'Nombres et calculs'), 'décomposition', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : multiplication' and p.name = 'Nombres et calculs'), 'distributivité', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : multiplication' and p.name = 'Nombres et calculs'), 'double et moitié', 5),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : multiplication' and p.name = 'Nombres et calculs'), 'triple et tiers', 6),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : multiplication' and p.name = 'Nombres et calculs'), 'quadruple et quart', 7),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : multiplication' and p.name = 'Nombres et calculs'), 'puissances de 10', 8),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : multiplication' and p.name = 'Nombres et calculs'), 'produits particuliers', 9),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : multiplication' and p.name = 'Nombres et calculs'), 'calcul astucieux', 10),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : multiplication' and p.name = 'Nombres et calculs'), 'calcul posé', 11);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : division' and p.name = 'Nombres et calculs'), 'quotient', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : division' and p.name = 'Nombres et calculs'), 'division euclidienne', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : division' and p.name = 'Nombres et calculs'), 'calcul posé', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : priorités opératoires' and p.name = 'Nombres et calculs'), 'avec parenthèses', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : priorités opératoires' and p.name = 'Nombres et calculs'), 'sans parenthèses', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Entiers : priorités opératoires' and p.name = 'Nombres et calculs'), 'traduire une phrase', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Décimaux : numération' and p.name = 'Nombres et calculs'), 'comparer', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Décimaux : numération' and p.name = 'Nombres et calculs'), 'décomposer', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Décimaux : numération' and p.name = 'Nombres et calculs'), 'écrire', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Décimaux : numération' and p.name = 'Nombres et calculs'), 'encadrer', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Décimaux : numération' and p.name = 'Nombres et calculs'), 'forme fractionnaire', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Décimaux : numération' and p.name = 'Nombres et calculs'), 'arrondir', 5);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Décimaux : calculs' and p.name = 'Nombres et calculs'), 'additionner', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Décimaux : calculs' and p.name = 'Nombres et calculs'), 'soustraire', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Décimaux : calculs' and p.name = 'Nombres et calculs'), 'multiplier', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Décimaux : calculs' and p.name = 'Nombres et calculs'), 'diviser', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Décimaux : calculs' and p.name = 'Nombres et calculs'), 'puissances de 10', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Décimaux : calculs' and p.name = 'Nombres et calculs'), 'distributivité', 5),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Décimaux : calculs' and p.name = 'Nombres et calculs'), 'moitié', 6),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Décimaux : calculs' and p.name = 'Nombres et calculs'), 'calcul astucieux', 7),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Décimaux : calculs' and p.name = 'Nombres et calculs'), 'calcul posé', 8);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fractions : sens et écritures' and p.name = 'Nombres et calculs'), 'définition', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fractions : sens et écritures' and p.name = 'Nombres et calculs'), 'comparer', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fractions : sens et écritures' and p.name = 'Nombres et calculs'), 'décomposer', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fractions : sens et écritures' and p.name = 'Nombres et calculs'), 'égalité de fractions', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fractions : sens et écritures' and p.name = 'Nombres et calculs'), 'simplifier', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fractions : sens et écritures' and p.name = 'Nombres et calculs'), 'forme décimale', 5),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fractions : sens et écritures' and p.name = 'Nombres et calculs'), 'droite graduée', 6);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fractions : calculs' and p.name = 'Nombres et calculs'), 'additionner et soustraire', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fractions : calculs' and p.name = 'Nombres et calculs'), 'multiplier', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fractions : calculs' and p.name = 'Nombres et calculs'), 'diviser', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fractions : calculs' and p.name = 'Nombres et calculs'), 'inverse', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fractions : calculs' and p.name = 'Nombres et calculs'), 'fraction d''une quantité', 4);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Relatifs : sens et écritures' and p.name = 'Nombres et calculs'), 'définition', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Relatifs : sens et écritures' and p.name = 'Nombres et calculs'), 'comparer', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Relatifs : sens et écritures' and p.name = 'Nombres et calculs'), 'droite graduée', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Relatifs : calculs' and p.name = 'Nombres et calculs'), 'sommes', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Relatifs : calculs' and p.name = 'Nombres et calculs'), 'différences', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Relatifs : calculs' and p.name = 'Nombres et calculs'), 'sommes algébriques', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Relatifs : calculs' and p.name = 'Nombres et calculs'), 'produit', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Relatifs : calculs' and p.name = 'Nombres et calculs'), 'quotient', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Relatifs : calculs' and p.name = 'Nombres et calculs'), 'carré', 5);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Puissances : sens et écritures' and p.name = 'Nombres et calculs'), 'définition', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Puissances : sens et écritures' and p.name = 'Nombres et calculs'), 'puissances de 10', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Puissances : sens et écritures' and p.name = 'Nombres et calculs'), 'notation scientifique', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Puissances : calculs' and p.name = 'Nombres et calculs'), 'multiplier', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Puissances : calculs' and p.name = 'Nombres et calculs'), 'diviser', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Puissances : calculs' and p.name = 'Nombres et calculs'), 'puissance de puissance', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Puissances : calculs' and p.name = 'Nombres et calculs'), 'mélange', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Racines carrées : sens et écritures' and p.name = 'Nombres et calculs'), 'définition', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Racines carrées : sens et écritures' and p.name = 'Nombres et calculs'), 'égalités', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Racines carrées : sens et écritures' and p.name = 'Nombres et calculs'), 'réduire', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Racines carrées : calculs' and p.name = 'Nombres et calculs'), 'calculer', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Racines carrées : calculs' and p.name = 'Nombres et calculs'), 'propriétés', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Problèmes arithmétiques' and p.name = 'Nombres et calculs'), 'parties-tout', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Problèmes arithmétiques' and p.name = 'Nombres et calculs'), 'comparaison', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Problèmes arithmétiques' and p.name = 'Nombres et calculs'), 'en deux étapes ou plus', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Problèmes arithmétiques' and p.name = 'Nombres et calculs'), 'multiplicatifs', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Problèmes arithmétiques' and p.name = 'Nombres et calculs'), 'produits cartésiens', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Problèmes arithmétiques' and p.name = 'Nombres et calculs'), 'optimisation', 5);

-- ---- Branche 2/19 : Arithmétique --------------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Arithmétique', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Arithmétique'), 'Divisibilité', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Arithmétique'), 'Nombres premiers', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Arithmétique'), 'PGCD, Bézout et Gauss', 2),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Arithmétique'), 'Congruences', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Divisibilité' and p.name = 'Arithmétique'), 'pair ou impair', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Divisibilité' and p.name = 'Arithmétique'), 'multiples et diviseurs', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Divisibilité' and p.name = 'Arithmétique'), 'critères de divisibilité', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Divisibilité' and p.name = 'Arithmétique'), 'division euclidienne', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Nombres premiers' and p.name = 'Arithmétique'), 'reconnaître un nombre premier', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Nombres premiers' and p.name = 'Arithmétique'), 'décomposition en facteurs premiers', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'PGCD, Bézout et Gauss' and p.name = 'Arithmétique'), 'PGCD', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'PGCD, Bézout et Gauss' and p.name = 'Arithmétique'), 'théorèmes de Bézout et de Gauss', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'PGCD, Bézout et Gauss' and p.name = 'Arithmétique'), 'équations diophantiennes', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Congruences' and p.name = 'Arithmétique'), 'congruences', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Congruences' and p.name = 'Arithmétique'), 'équations ax ≡ b [n]', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Congruences' and p.name = 'Arithmétique'), 'petit théorème de Fermat', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Congruences' and p.name = 'Arithmétique'), 'chiffrement', 3);

-- ---- Branche 3/19 : Nombres complexes ---------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Nombres complexes', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres complexes'), 'Forme algébrique', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres complexes'), 'Module et argument', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres complexes'), 'Formes trigo. et exponentielle', 2),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres complexes'), 'Équations polynomiales', 3),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Nombres complexes'), 'Interprétation géométrique', 4);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Forme algébrique' and p.name = 'Nombres complexes'), 'calculs', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Forme algébrique' and p.name = 'Nombres complexes'), 'conjugaison', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Forme algébrique' and p.name = 'Nombres complexes'), 'inverse et quotient', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Forme algébrique' and p.name = 'Nombres complexes'), 'formule du binôme', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Forme algébrique' and p.name = 'Nombres complexes'), 'équations', 4);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Module et argument' and p.name = 'Nombres complexes'), 'module', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Module et argument' and p.name = 'Nombres complexes'), 'argument', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Formes trigo. et exponentielle' and p.name = 'Nombres complexes'), 'forme trigonométrique', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Formes trigo. et exponentielle' and p.name = 'Nombres complexes'), 'formules d''addition et de duplication', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Formes trigo. et exponentielle' and p.name = 'Nombres complexes'), 'forme exponentielle', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Formes trigo. et exponentielle' and p.name = 'Nombres complexes'), 'formule de Moivre', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Formes trigo. et exponentielle' and p.name = 'Nombres complexes'), 'formules d''Euler', 4);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Équations polynomiales' and p.name = 'Nombres complexes'), 'second degré', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Équations polynomiales' and p.name = 'Nombres complexes'), 'racines d''un polynôme', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Équations polynomiales' and p.name = 'Nombres complexes'), 'degré 3 et factorisation', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Interprétation géométrique' and p.name = 'Nombres complexes'), 'affixes et distances', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Interprétation géométrique' and p.name = 'Nombres complexes'), 'alignement et orthogonalité', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Interprétation géométrique' and p.name = 'Nombres complexes'), 'angles et quotient', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Interprétation géométrique' and p.name = 'Nombres complexes'), 'ensembles de points', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Interprétation géométrique' and p.name = 'Nombres complexes'), 'racines de l''unité', 4);

-- ---- Branche 4/19 : Proportionnalité ----------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Proportionnalité', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Proportionnalité'), 'Situations de proportionnalité', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Proportionnalité'), 'Pourcentages', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Proportionnalité'), 'Évolutions', 2),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Proportionnalité'), 'Échelle d''une carte', 3),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Proportionnalité'), 'Vitesse', 4);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Situations de proportionnalité' and p.name = 'Proportionnalité'), 'reconnaître', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Situations de proportionnalité' and p.name = 'Proportionnalité'), 'appliquer', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Situations de proportionnalité' and p.name = 'Proportionnalité'), 'quatrième proportionnelle', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Pourcentages' and p.name = 'Proportionnalité'), 'définition', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Pourcentages' and p.name = 'Proportionnalité'), 'calculer', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Évolutions' and p.name = 'Proportionnalité'), 'variations en pourcentage', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Évolutions' and p.name = 'Proportionnalité'), 'évolutions successives et réciproque', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Évolutions' and p.name = 'Proportionnalité'), 'taux d''évolution moyen', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Évolutions' and p.name = 'Proportionnalité'), 'indices', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Échelle d''une carte' and p.name = 'Proportionnalité'), 'trouver l''échelle', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Échelle d''une carte' and p.name = 'Proportionnalité'), 'utiliser l''échelle', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Vitesse' and p.name = 'Proportionnalité'), 'calculer', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Vitesse' and p.name = 'Proportionnalité'), 'convertir', 1);

-- ---- Branche 5/19 : Algèbre -------------------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Algèbre', 4);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Algèbre'), 'Premiers pas algébriques', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Algèbre'), 'Calcul littéral', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Algèbre'), 'Équations : premier degré', 2),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Algèbre'), 'Équations : produit et quotient', 3),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Algèbre'), 'Inéquations : premier degré', 4),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Algèbre'), 'Inéquations : produit et quotient', 5),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Algèbre'), 'Équations : second degré', 6),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Algèbre'), 'Inéquations : second degré', 7),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Algèbre'), 'Inégalités', 8);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Premiers pas algébriques' and p.name = 'Algèbre'), 'égalités à trous', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Premiers pas algébriques' and p.name = 'Algèbre'), 'nombre inconnu', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Premiers pas algébriques' and p.name = 'Algèbre'), 'programmes de calcul', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Premiers pas algébriques' and p.name = 'Algèbre'), 'suites de motifs', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul littéral' and p.name = 'Algèbre'), 'substitution', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul littéral' and p.name = 'Algèbre'), 'réduire', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul littéral' and p.name = 'Algèbre'), 'simplifier l''écriture', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul littéral' and p.name = 'Algèbre'), 'opposé d''une expression', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul littéral' and p.name = 'Algèbre'), 'développer', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul littéral' and p.name = 'Algèbre'), 'factoriser', 5),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul littéral' and p.name = 'Algèbre'), 'identités remarquables', 6),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul littéral' and p.name = 'Algèbre'), 'isoler une variable', 7),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul littéral' and p.name = 'Algèbre'), 'expressions fractionnaires', 8);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Équations : premier degré' and p.name = 'Algèbre'), 'ax = b', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Équations : premier degré' and p.name = 'Algèbre'), 'ax + b = c', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Équations : premier degré' and p.name = 'Algèbre'), 'ax + b = cx + d', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Équations : premier degré' and p.name = 'Algèbre'), 'mettre en équation', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Équations : produit et quotient' and p.name = 'Algèbre'), 'produit nul', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Équations : produit et quotient' and p.name = 'Algèbre'), 'x² = a', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Équations : produit et quotient' and p.name = 'Algèbre'), 'équation quotient', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Inéquations : premier degré' and p.name = 'Algèbre'), 'ax + b < c', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Inéquations : premier degré' and p.name = 'Algèbre'), 'ax + b < cx + d', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Inéquations : premier degré' and p.name = 'Algèbre'), 'mettre en inéquation', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Inéquations : produit et quotient' and p.name = 'Algèbre'), 'tableau de signes', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Inéquations : produit et quotient' and p.name = 'Algèbre'), 'inéquation produit', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Inéquations : produit et quotient' and p.name = 'Algèbre'), 'inéquation quotient', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Équations : second degré' and p.name = 'Algèbre'), 'discriminant', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Équations : second degré' and p.name = 'Algèbre'), 'équations incomplètes', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Équations : second degré' and p.name = 'Algèbre'), 'se ramener au second degré', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Équations : second degré' and p.name = 'Algèbre'), 'mettre en équation', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Inéquations : second degré' and p.name = 'Algèbre'), 'inéquations du second degré', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Inéquations : second degré' and p.name = 'Algèbre'), 'mettre en inéquation', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Inégalités' and p.name = 'Algèbre'), 'règles de calcul', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Inégalités' and p.name = 'Algèbre'), 'signe d''une expression', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Inégalités' and p.name = 'Algèbre'), 'comparer et encadrer', 2);

-- ---- Branche 6/19 : Fonctions -----------------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Fonctions', 5);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Fonctions'), 'Généralités sur les fonctions', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Fonctions'), 'Fonctions affines', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Fonctions'), 'Fonction carré', 2),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Fonctions'), 'Fonction inverse', 3),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Fonctions'), 'Fonction racine carrée', 4),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Fonctions'), 'Fonction cube', 5),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Fonctions'), 'Fonction valeur absolue', 6),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Fonctions'), 'Second degré', 7),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Fonctions'), 'Dérivation', 8),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Fonctions'), 'Fonction exponentielle', 9),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Fonctions'), 'Fonctions trigonométriques', 10),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Fonctions'), 'Limites de fonctions', 11),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Fonctions'), 'Continuité', 12),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Fonctions'), 'Convexité', 13),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Fonctions'), 'Logarithmes', 14);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Généralités sur les fonctions' and p.name = 'Fonctions'), 'images et antécédents', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Généralités sur les fonctions' and p.name = 'Fonctions'), 'ensemble de définition', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Généralités sur les fonctions' and p.name = 'Fonctions'), 'appartenance à une courbe', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Généralités sur les fonctions' and p.name = 'Fonctions'), 'résolution graphique', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Généralités sur les fonctions' and p.name = 'Fonctions'), 'variations', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Généralités sur les fonctions' and p.name = 'Fonctions'), 'extremums', 5),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Généralités sur les fonctions' and p.name = 'Fonctions'), 'signe', 6),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Généralités sur les fonctions' and p.name = 'Fonctions'), 'parité', 7);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonctions affines' and p.name = 'Fonctions'), 'fonction linéaire', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonctions affines' and p.name = 'Fonctions'), 'expression et droite', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonctions affines' and p.name = 'Fonctions'), 'coefficient directeur et ordonnée à l''origine', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonctions affines' and p.name = 'Fonctions'), 'variations et signe', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonctions affines' and p.name = 'Fonctions'), 'équations', 4);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction carré' and p.name = 'Fonctions'), 'définition et courbe', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction carré' and p.name = 'Fonctions'), 'variations', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction carré' and p.name = 'Fonctions'), 'comparer des images', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction carré' and p.name = 'Fonctions'), 'x² = k, x² < k', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction inverse' and p.name = 'Fonctions'), 'définition et courbe', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction inverse' and p.name = 'Fonctions'), 'variations', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction inverse' and p.name = 'Fonctions'), 'comparer des images', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction inverse' and p.name = 'Fonctions'), '1/x = k, 1/x < k', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction racine carrée' and p.name = 'Fonctions'), 'définition et courbe', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction racine carrée' and p.name = 'Fonctions'), 'variations', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction racine carrée' and p.name = 'Fonctions'), 'comparer des images', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction racine carrée' and p.name = 'Fonctions'), '√x = k, √x < k', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction cube' and p.name = 'Fonctions'), 'définition et courbe', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction cube' and p.name = 'Fonctions'), 'variations', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction cube' and p.name = 'Fonctions'), 'x³ = k, x³ < k', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction valeur absolue' and p.name = 'Fonctions'), 'définition et distance', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction valeur absolue' and p.name = 'Fonctions'), 'courbe', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction valeur absolue' and p.name = 'Fonctions'), 'variations', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction valeur absolue' and p.name = 'Fonctions'), 'équations et inéquations', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Second degré' and p.name = 'Fonctions'), 'racines', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Second degré' and p.name = 'Fonctions'), 'signe', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Second degré' and p.name = 'Fonctions'), 'formes', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Second degré' and p.name = 'Fonctions'), 'variations', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Second degré' and p.name = 'Fonctions'), 'parabole', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Second degré' and p.name = 'Fonctions'), 'somme et produit des racines', 5);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Dérivation' and p.name = 'Fonctions'), 'taux de variation', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Dérivation' and p.name = 'Fonctions'), 'nombre dérivé', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Dérivation' and p.name = 'Fonctions'), 'tangente', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Dérivation' and p.name = 'Fonctions'), 'approximation affine', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Dérivation' and p.name = 'Fonctions'), 'fonctions dérivées', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Dérivation' and p.name = 'Fonctions'), 'opérations sur les dérivées', 5),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Dérivation' and p.name = 'Fonctions'), 'dérivabilité en un point', 6),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Dérivation' and p.name = 'Fonctions'), 'variations', 7),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Dérivation' and p.name = 'Fonctions'), 'étude de fonction', 8),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Dérivation' and p.name = 'Fonctions'), 'position relative de deux courbes', 9),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Dérivation' and p.name = 'Fonctions'), 'optimisation', 10),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Dérivation' and p.name = 'Fonctions'), 'fonctions composées', 11);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction exponentielle' and p.name = 'Fonctions'), 'propriétés algébriques', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction exponentielle' and p.name = 'Fonctions'), 'dérivée', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction exponentielle' and p.name = 'Fonctions'), 'variations', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction exponentielle' and p.name = 'Fonctions'), 'courbe', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction exponentielle' and p.name = 'Fonctions'), 'équations et inéquations', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction exponentielle' and p.name = 'Fonctions'), 'suites et modélisation', 5),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction exponentielle' and p.name = 'Fonctions'), 'fonctions x ↦ aˣ', 6);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonctions trigonométriques' and p.name = 'Fonctions'), 'cercle et radians', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonctions trigonométriques' and p.name = 'Fonctions'), 'cosinus et sinus d''un réel', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonctions trigonométriques' and p.name = 'Fonctions'), 'angles associés', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonctions trigonométriques' and p.name = 'Fonctions'), 'équations', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonctions trigonométriques' and p.name = 'Fonctions'), 'inéquations', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonctions trigonométriques' and p.name = 'Fonctions'), 'parité et périodicité', 5),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonctions trigonométriques' and p.name = 'Fonctions'), 'dérivées et variations', 6);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Limites de fonctions' and p.name = 'Fonctions'), 'limite en un point', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Limites de fonctions' and p.name = 'Fonctions'), 'opérations', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Limites de fonctions' and p.name = 'Fonctions'), 'formes indéterminées', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Limites de fonctions' and p.name = 'Fonctions'), 'comparaison et encadrement', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Limites de fonctions' and p.name = 'Fonctions'), 'croissances comparées', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Limites de fonctions' and p.name = 'Fonctions'), 'asymptotes', 5);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Continuité' and p.name = 'Fonctions'), 'continuité en un point', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Continuité' and p.name = 'Fonctions'), 'lecture graphique', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Continuité' and p.name = 'Fonctions'), 'valeurs intermédiaires', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Continuité' and p.name = 'Fonctions'), 'fonction réciproque', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Continuité' and p.name = 'Fonctions'), 'encadrement d''une solution', 4);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Convexité' and p.name = 'Fonctions'), 'caractérisations', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Convexité' and p.name = 'Fonctions'), 'dérivée seconde', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Convexité' and p.name = 'Fonctions'), 'point d''inflexion', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Convexité' and p.name = 'Fonctions'), 'inégalités de convexité', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Convexité' and p.name = 'Fonctions'), 'lecture graphique', 4);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Logarithmes' and p.name = 'Fonctions'), 'réciproque de l''exponentielle', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Logarithmes' and p.name = 'Fonctions'), 'propriétés algébriques', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Logarithmes' and p.name = 'Fonctions'), 'équations et inéquations', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Logarithmes' and p.name = 'Fonctions'), 'dérivée', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Logarithmes' and p.name = 'Fonctions'), 'courbe', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Logarithmes' and p.name = 'Fonctions'), 'logarithme décimal', 5);

-- ---- Branche 7/19 : Intégration ---------------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Intégration', 6);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Intégration'), 'Calcul d''intégrales', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Intégration'), 'Intégrale et aire', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Intégration'), 'Valeur moyenne', 2),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Intégration'), 'Fonction intégrale', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul d''intégrales' and p.name = 'Intégration'), 'par une primitive', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul d''intégrales' and p.name = 'Intégration'), 'relation de Chasles', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul d''intégrales' and p.name = 'Intégration'), 'linéarité', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul d''intégrales' and p.name = 'Intégration'), 'positivité et inégalités', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul d''intégrales' and p.name = 'Intégration'), 'intégration par parties', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul d''intégrales' and p.name = 'Intégration'), 'suites d''intégrales', 5),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul d''intégrales' and p.name = 'Intégration'), 'méthode des rectangles', 6);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Intégrale et aire' and p.name = 'Intégration'), 'aire algébrique', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Intégrale et aire' and p.name = 'Intégration'), 'aire entre deux courbes', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Intégrale et aire' and p.name = 'Intégration'), 'lecture graphique', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Valeur moyenne' and p.name = 'Intégration'), 'calcul', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Valeur moyenne' and p.name = 'Intégration'), 'encadrement', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Valeur moyenne' and p.name = 'Intégration'), 'interprétation', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonction intégrale' and p.name = 'Intégration'), 'dérivée d''une fonction intégrale', 0);

-- ---- Branche 8/19 : Équations différentielles -------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Équations différentielles', 7);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Équations différentielles'), 'Généralités', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Équations différentielles'), 'y′ = f', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Équations différentielles'), 'y′ = ay', 2),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Équations différentielles'), 'y′ = ay + b', 3),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Équations différentielles'), 'y′ = ay + f', 4);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Généralités' and p.name = 'Équations différentielles'), 'notion de solution', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Généralités' and p.name = 'Équations différentielles'), 'allure des courbes', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Généralités' and p.name = 'Équations différentielles'), 'méthode d''Euler', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'y′ = f' and p.name = 'Équations différentielles'), 'primitives : notion', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'y′ = f' and p.name = 'Équations différentielles'), 'primitives des fonctions de référence', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'y′ = f' and p.name = 'Équations différentielles'), 'formes u′eᵘ, 2uu′, u′/u', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'y′ = f' and p.name = 'Équations différentielles'), 'forme (v′∘u)×u′', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'y′ = f' and p.name = 'Équations différentielles'), 'sinus et cosinus', 4);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'y′ = ay' and p.name = 'Équations différentielles'), 'solution générale', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'y′ = ay' and p.name = 'Équations différentielles'), 'condition initiale', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'y′ = ay + b' and p.name = 'Équations différentielles'), 'solution générale', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'y′ = ay + b' and p.name = 'Équations différentielles'), 'condition initiale', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'y′ = ay + f' and p.name = 'Équations différentielles'), 'solution particulière donnée', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'y′ = ay + f' and p.name = 'Équations différentielles'), 'solution générale', 1);

-- ---- Branche 9/19 : Suites --------------------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Suites', 8);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Suites'), 'Généralités sur les suites', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Suites'), 'Suites arithmétiques', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Suites'), 'Suites géométriques', 2),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Suites'), 'Suites et modélisation', 3),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Suites'), 'Limites de suites', 4),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Suites'), 'Raisonnement par récurrence', 5),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Suites'), 'Suites récurrentes', 6),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Suites'), 'Suites arithmético-géométriques', 7);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Généralités sur les suites' and p.name = 'Suites'), 'calculer un terme', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Généralités sur les suites' and p.name = 'Suites'), 'explicite ou par récurrence', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Généralités sur les suites' and p.name = 'Suites'), 'deviner le terme général', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Généralités sur les suites' and p.name = 'Suites'), 'représentation graphique', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Généralités sur les suites' and p.name = 'Suites'), 'sens de variation', 4);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites arithmétiques' and p.name = 'Suites'), 'reconnaître', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites arithmétiques' and p.name = 'Suites'), 'raison', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites arithmétiques' and p.name = 'Suites'), 'terme général', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites arithmétiques' and p.name = 'Suites'), 'calculer un terme', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites arithmétiques' and p.name = 'Suites'), 'somme des termes', 4);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites géométriques' and p.name = 'Suites'), 'reconnaître', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites géométriques' and p.name = 'Suites'), 'raison', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites géométriques' and p.name = 'Suites'), 'terme général', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites géométriques' and p.name = 'Suites'), 'calculer un terme', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites géométriques' and p.name = 'Suites'), 'somme des termes', 4);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites et modélisation' and p.name = 'Suites'), 'placements', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites et modélisation' and p.name = 'Suites'), 'pourcentages', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites et modélisation' and p.name = 'Suites'), 'seuil', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites et modélisation' and p.name = 'Suites'), 'algorithmes', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Limites de suites' and p.name = 'Suites'), 'définition', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Limites de suites' and p.name = 'Suites'), 'opérations', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Limites de suites' and p.name = 'Suites'), 'formes indéterminées', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Limites de suites' and p.name = 'Suites'), 'comparaison et encadrement', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Limites de suites' and p.name = 'Suites'), 'suites géométriques', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Limites de suites' and p.name = 'Suites'), 'convergence monotone', 5),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Limites de suites' and p.name = 'Suites'), 'suites majorées, minorées', 6);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Raisonnement par récurrence' and p.name = 'Suites'), 'structure d''une récurrence', 0);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites récurrentes' and p.name = 'Suites'), 'escalier', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites récurrentes' and p.name = 'Suites'), 'point fixe', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites arithmético-géométriques' and p.name = 'Suites'), 'solution constante', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites arithmético-géométriques' and p.name = 'Suites'), 'suite auxiliaire', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites arithmético-géométriques' and p.name = 'Suites'), 'limite', 2);

-- ---- Branche 10/19 : Matrices ------------------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Matrices', 9);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Matrices'), 'Calcul matriciel', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Matrices'), 'Systèmes linéaires', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Matrices'), 'Suites et matrices', 2),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Matrices'), 'Transformations du plan', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul matriciel' and p.name = 'Matrices'), 'opérations', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul matriciel' and p.name = 'Matrices'), 'produit', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul matriciel' and p.name = 'Matrices'), 'inverse', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Calcul matriciel' and p.name = 'Matrices'), 'puissances de matrices', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Systèmes linéaires' and p.name = 'Matrices'), 'écriture matricielle', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Systèmes linéaires' and p.name = 'Matrices'), 'résolution', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites et matrices' and p.name = 'Matrices'), 'suites couplées', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Suites et matrices' and p.name = 'Matrices'), 'modélisation', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Transformations du plan' and p.name = 'Matrices'), 'matrice d''une transformation', 0);

-- ---- Branche 11/19 : Graphes -------------------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Graphes', 10);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Graphes'), 'Vocabulaire des graphes', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Graphes'), 'Chaînes et connexité', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Graphes'), 'Matrice d''adjacence', 2),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Graphes'), 'Chaînes de Markov', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Vocabulaire des graphes' and p.name = 'Graphes'), 'sommets, arêtes, degré', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Vocabulaire des graphes' and p.name = 'Graphes'), 'graphe orienté', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Vocabulaire des graphes' and p.name = 'Graphes'), 'modélisation par un graphe', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Chaînes et connexité' and p.name = 'Graphes'), 'chaînes et cycles', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Chaînes et connexité' and p.name = 'Graphes'), 'connexité', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Matrice d''adjacence' and p.name = 'Graphes'), 'matrice d''adjacence', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Matrice d''adjacence' and p.name = 'Graphes'), 'nombre de chaînes de longueur n', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Chaînes de Markov' and p.name = 'Graphes'), 'graphe probabiliste', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Chaînes de Markov' and p.name = 'Graphes'), 'matrice de transition', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Chaînes de Markov' and p.name = 'Graphes'), 'distribution après n transitions', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Chaînes de Markov' and p.name = 'Graphes'), 'état stable', 3);

-- ---- Branche 12/19 : Géométrie -----------------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Géométrie', 11);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Solides', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Figures planes', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Symétrie axiale', 2),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Repérage et déplacements', 3),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Symétrie centrale', 4),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Translations', 5),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Théorème de Pythagore', 6),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Théorème de Thalès', 7),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Trigonométrie du triangle rectangle', 8),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Rotations', 9),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Homothéties', 10),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Triangles semblables', 11),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Repérage dans l''espace', 12),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Vecteurs : sans coordonnées', 13),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Vecteurs : avec coordonnées', 14),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Géométrie repérée', 15),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Produit scalaire', 16),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Espace : sans coordonnées', 17),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Espace : avec coordonnées', 18),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Orthogonalité : sans coordonnées', 19),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Géométrie'), 'Orthogonalité : avec coordonnées', 20);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Solides' and p.name = 'Géométrie'), 'reconnaître et décrire', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Solides' and p.name = 'Géométrie'), 'construire', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Solides' and p.name = 'Géométrie'), 'patrons', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Solides' and p.name = 'Géométrie'), 'perspective cavalière', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Solides' and p.name = 'Géométrie'), 'perspective centrale', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Solides' and p.name = 'Géométrie'), 'sections planes', 5);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Figures planes' and p.name = 'Géométrie'), 'reconnaître et décrire', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Figures planes' and p.name = 'Géométrie'), 'angles droits', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Figures planes' and p.name = 'Géométrie'), 'perpendiculaires et parallèles', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Figures planes' and p.name = 'Géométrie'), 'reproduire et construire', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Figures planes' and p.name = 'Géométrie'), 'cercle', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Figures planes' and p.name = 'Géométrie'), 'triangles', 5),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Figures planes' and p.name = 'Géométrie'), 'parallélogrammes', 6),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Figures planes' and p.name = 'Géométrie'), 'médiatrice et bissectrice', 7),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Figures planes' and p.name = 'Géométrie'), 'polygones réguliers', 8),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Figures planes' and p.name = 'Géométrie'), 'coniques', 9);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Repérage et déplacements' and p.name = 'Géométrie'), 'positions et plans', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Repérage et déplacements' and p.name = 'Géométrie'), 'coder un déplacement', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Repérage et déplacements' and p.name = 'Géométrie'), 'coordonnées dans le plan', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Translations' and p.name = 'Géométrie'), 'frises et pavages', 0);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Théorème de Pythagore' and p.name = 'Géométrie'), 'calculer une longueur', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Théorème de Pythagore' and p.name = 'Géométrie'), 'réciproque', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Théorème de Thalès' and p.name = 'Géométrie'), 'droite des milieux', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Théorème de Thalès' and p.name = 'Géométrie'), 'calculer une longueur', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Théorème de Thalès' and p.name = 'Géométrie'), 'réciproque', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Trigonométrie du triangle rectangle' and p.name = 'Géométrie'), 'calculer une longueur', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Trigonométrie du triangle rectangle' and p.name = 'Géométrie'), 'calculer un angle', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Triangles semblables' and p.name = 'Géométrie'), 'cas d''égalité des triangles', 0);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Vecteurs : sans coordonnées' and p.name = 'Géométrie'), 'translation et vecteur', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Vecteurs : sans coordonnées' and p.name = 'Géométrie'), 'égalité de vecteurs', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Vecteurs : sans coordonnées' and p.name = 'Géométrie'), 'somme et relation de Chasles', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Vecteurs : sans coordonnées' and p.name = 'Géométrie'), 'produit par un réel', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Vecteurs : sans coordonnées' and p.name = 'Géométrie'), 'colinéarité', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Vecteurs : sans coordonnées' and p.name = 'Géométrie'), 'combinaison linéaire', 5);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Vecteurs : avec coordonnées' and p.name = 'Géométrie'), 'coordonnées d''un vecteur', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Vecteurs : avec coordonnées' and p.name = 'Géométrie'), 'somme et produit par un réel', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Vecteurs : avec coordonnées' and p.name = 'Géométrie'), 'norme', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Vecteurs : avec coordonnées' and p.name = 'Géométrie'), 'colinéarité et déterminant', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Géométrie repérée' and p.name = 'Géométrie'), 'milieu et distance', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Géométrie repérée' and p.name = 'Géométrie'), 'équations de droites', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Géométrie repérée' and p.name = 'Géométrie'), 'vecteur directeur', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Géométrie repérée' and p.name = 'Géométrie'), 'intersection de deux droites', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Géométrie repérée' and p.name = 'Géométrie'), 'vecteur normal et équation de droite', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Géométrie repérée' and p.name = 'Géométrie'), 'équation de cercle', 5),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Géométrie repérée' and p.name = 'Géométrie'), 'projeté orthogonal', 6);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Produit scalaire' and p.name = 'Géométrie'), 'calculer un produit scalaire', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Produit scalaire' and p.name = 'Géométrie'), 'angles et longueurs', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Produit scalaire' and p.name = 'Géométrie'), 'propriétés', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Produit scalaire' and p.name = 'Géométrie'), 'lieux de points', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Espace : sans coordonnées' and p.name = 'Géométrie'), 'vecteurs de l''espace', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Espace : sans coordonnées' and p.name = 'Géométrie'), 'colinéarité et alignement', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Espace : sans coordonnées' and p.name = 'Géométrie'), 'coplanarité et décomposition', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Espace : sans coordonnées' and p.name = 'Géométrie'), 'positions relatives de droites et plans', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Espace : avec coordonnées' and p.name = 'Géométrie'), 'coordonnées dans l''espace', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Espace : avec coordonnées' and p.name = 'Géométrie'), 'représentation paramétrique d''une droite', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Espace : avec coordonnées' and p.name = 'Géométrie'), 'intersections', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Espace : avec coordonnées' and p.name = 'Géométrie'), 'positions relatives par le calcul', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Orthogonalité : sans coordonnées' and p.name = 'Géométrie'), 'produit scalaire dans l''espace', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Orthogonalité : sans coordonnées' and p.name = 'Géométrie'), 'orthogonalité de droites et plans', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Orthogonalité : sans coordonnées' and p.name = 'Géométrie'), 'projeté orthogonal', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Orthogonalité : sans coordonnées' and p.name = 'Géométrie'), 'angles', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Orthogonalité : avec coordonnées' and p.name = 'Géométrie'), 'norme et distance', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Orthogonalité : avec coordonnées' and p.name = 'Géométrie'), 'vecteur normal à un plan', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Orthogonalité : avec coordonnées' and p.name = 'Géométrie'), 'équation cartésienne d''un plan', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Orthogonalité : avec coordonnées' and p.name = 'Géométrie'), 'coordonnées du projeté orthogonal', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Orthogonalité : avec coordonnées' and p.name = 'Géométrie'), 'sphère', 4);

-- ---- Branche 13/19 : Grandeurs et mesures ------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Grandeurs et mesures', 12);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Grandeurs et mesures'), 'Longueurs', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Grandeurs et mesures'), 'Masses', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Grandeurs et mesures'), 'Contenances', 2),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Grandeurs et mesures'), 'Monnaie', 3),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Grandeurs et mesures'), 'Angles', 4),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Grandeurs et mesures'), 'Périmètres', 5),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Grandeurs et mesures'), 'Aires', 6),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Grandeurs et mesures'), 'Volumes', 7),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Grandeurs et mesures'), 'Durées', 8),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Grandeurs et mesures'), 'Unités et conversions', 9);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Longueurs' and p.name = 'Grandeurs et mesures'), 'comparer et mesurer', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Longueurs' and p.name = 'Grandeurs et mesures'), 'unités et conversions', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Masses' and p.name = 'Grandeurs et mesures'), 'comparer et mesurer', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Masses' and p.name = 'Grandeurs et mesures'), 'unités et conversions', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Contenances' and p.name = 'Grandeurs et mesures'), 'comparer et mesurer', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Contenances' and p.name = 'Grandeurs et mesures'), 'unités et conversions', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Monnaie' and p.name = 'Grandeurs et mesures'), 'pièces et billets', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Monnaie' and p.name = 'Grandeurs et mesures'), 'euros et centimes', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Monnaie' and p.name = 'Grandeurs et mesures'), 'rendre la monnaie', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Angles' and p.name = 'Grandeurs et mesures'), 'comparer', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Angles' and p.name = 'Grandeurs et mesures'), 'mesurer en degrés', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Angles' and p.name = 'Grandeurs et mesures'), 'construire', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Périmètres' and p.name = 'Grandeurs et mesures'), 'carré', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Périmètres' and p.name = 'Grandeurs et mesures'), 'rectangle', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Périmètres' and p.name = 'Grandeurs et mesures'), 'disque', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Aires' and p.name = 'Grandeurs et mesures'), 'carré', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Aires' and p.name = 'Grandeurs et mesures'), 'rectangle', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Aires' and p.name = 'Grandeurs et mesures'), 'triangle rectangle', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Aires' and p.name = 'Grandeurs et mesures'), 'triangle quelconque', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Aires' and p.name = 'Grandeurs et mesures'), 'parallélogramme', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Aires' and p.name = 'Grandeurs et mesures'), 'disque', 5),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Aires' and p.name = 'Grandeurs et mesures'), 'unités et conversions', 6);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Volumes' and p.name = 'Grandeurs et mesures'), 'cube et pavé', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Volumes' and p.name = 'Grandeurs et mesures'), 'prisme et cylindre', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Volumes' and p.name = 'Grandeurs et mesures'), 'pyramide et cône', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Volumes' and p.name = 'Grandeurs et mesures'), 'boule', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Volumes' and p.name = 'Grandeurs et mesures'), 'conversions', 4);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Durées' and p.name = 'Grandeurs et mesures'), 'lire l''heure', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Durées' and p.name = 'Grandeurs et mesures'), 'calculer', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Durées' and p.name = 'Grandeurs et mesures'), 'convertir', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Unités et conversions' and p.name = 'Grandeurs et mesures'), 'unités simples', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Unités et conversions' and p.name = 'Grandeurs et mesures'), 'unités composées', 1);

-- ---- Branche 14/19 : Probabilités --------------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Probabilités', 13);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Probabilités'), 'Expériences aléatoires', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Probabilités'), 'Probabilités conditionnelles', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Probabilités'), 'Variables aléatoires', 2),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Probabilités'), 'Loi binomiale', 3),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Probabilités'), 'Autres lois', 4),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Probabilités'), 'Sommes et concentration', 5);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Expériences aléatoires' and p.name = 'Probabilités'), 'fréquences', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Expériences aléatoires' and p.name = 'Probabilités'), 'probabilité simple', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Expériences aléatoires' and p.name = 'Probabilités'), 'équiprobabilité', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Expériences aléatoires' and p.name = 'Probabilités'), 'événements', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Probabilités conditionnelles' and p.name = 'Probabilités'), 'arbres pondérés', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Probabilités conditionnelles' and p.name = 'Probabilités'), 'tableaux croisés', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Probabilités conditionnelles' and p.name = 'Probabilités'), 'indépendance', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Probabilités conditionnelles' and p.name = 'Probabilités'), 'probabilités totales', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Probabilités conditionnelles' and p.name = 'Probabilités'), 'inversion du conditionnement', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Probabilités conditionnelles' and p.name = 'Probabilités'), 'épreuves indépendantes successives', 5),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Probabilités conditionnelles' and p.name = 'Probabilités'), 'problèmes en contexte', 6);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Variables aléatoires' and p.name = 'Probabilités'), 'loi d''une variable aléatoire', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Variables aléatoires' and p.name = 'Probabilités'), 'compléter une loi', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Variables aléatoires' and p.name = 'Probabilités'), 'espérance', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Variables aléatoires' and p.name = 'Probabilités'), 'variance et écart-type', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Variables aléatoires' and p.name = 'Probabilités'), 'jeux et gains', 4);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Loi binomiale' and p.name = 'Probabilités'), 'schéma de Bernoulli', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Loi binomiale' and p.name = 'Probabilités'), 'reconnaître une loi', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Loi binomiale' and p.name = 'Probabilités'), 'calcul de probabilités', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Loi binomiale' and p.name = 'Probabilités'), 'intervalle de fluctuation', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Loi binomiale' and p.name = 'Probabilités'), 'coefficients binomiaux', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Loi binomiale' and p.name = 'Probabilités'), 'espérance et variance', 5);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Autres lois' and p.name = 'Probabilités'), 'loi géométrique', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Autres lois' and p.name = 'Probabilités'), 'loi uniforme discrète', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Autres lois' and p.name = 'Probabilités'), 'loi uniforme continue', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Autres lois' and p.name = 'Probabilités'), 'loi exponentielle', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Autres lois' and p.name = 'Probabilités'), 'absence de mémoire', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Autres lois' and p.name = 'Probabilités'), 'densité et aire', 5),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Autres lois' and p.name = 'Probabilités'), 'fonction de répartition', 6),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Autres lois' and p.name = 'Probabilités'), 'espérance et variance', 7);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Sommes et concentration' and p.name = 'Probabilités'), 'espérance et variance d''une somme', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Sommes et concentration' and p.name = 'Probabilités'), 'échantillons', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Sommes et concentration' and p.name = 'Probabilités'), 'Bienaymé-Tchebychev', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Sommes et concentration' and p.name = 'Probabilités'), 'inégalité de concentration', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Sommes et concentration' and p.name = 'Probabilités'), 'loi des grands nombres', 4);

-- ---- Branche 15/19 : Dénombrement --------------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Dénombrement', 14);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Dénombrement'), 'Principes de dénombrement', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Dénombrement'), 'Arrangements et permutations', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Dénombrement'), 'Combinaisons', 2),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Dénombrement'), 'Problèmes de dénombrement', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Principes de dénombrement' and p.name = 'Dénombrement'), 'principes additif et multiplicatif', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Principes de dénombrement' and p.name = 'Dénombrement'), 'k-uplets', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Principes de dénombrement' and p.name = 'Dénombrement'), 'parties d''un ensemble', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Arrangements et permutations' and p.name = 'Dénombrement'), 'arrangements', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Arrangements et permutations' and p.name = 'Dénombrement'), 'permutations', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Arrangements et permutations' and p.name = 'Dénombrement'), 'factorielle', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Combinaisons' and p.name = 'Dénombrement'), 'combinaisons', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Combinaisons' and p.name = 'Dénombrement'), 'coefficients binomiaux', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Combinaisons' and p.name = 'Dénombrement'), 'triangle de Pascal', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Problèmes de dénombrement' and p.name = 'Dénombrement'), 'dénombrer avec contraintes', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Problèmes de dénombrement' and p.name = 'Dénombrement'), 'reconnaître le modèle', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Problèmes de dénombrement' and p.name = 'Dénombrement'), 'algorithmique', 2);

-- ---- Branche 16/19 : Statistiques --------------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Statistiques', 15);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Statistiques'), 'Représenter des données', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Statistiques'), 'Indicateurs', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Statistiques'), 'Échantillonnage', 2),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Statistiques'), 'Tableaux croisés', 3),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Statistiques'), 'Statistique à deux variables', 4);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Représenter des données' and p.name = 'Statistiques'), 'effectifs et fréquences', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Représenter des données' and p.name = 'Statistiques'), 'tableaux', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Représenter des données' and p.name = 'Statistiques'), 'tableau à double entrée', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Représenter des données' and p.name = 'Statistiques'), 'diagrammes en barres', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Représenter des données' and p.name = 'Statistiques'), 'diagrammes circulaires', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Représenter des données' and p.name = 'Statistiques'), 'courbes et repères', 5),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Représenter des données' and p.name = 'Statistiques'), 'histogrammes', 6),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Représenter des données' and p.name = 'Statistiques'), 'fréquences cumulées', 7);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Indicateurs' and p.name = 'Statistiques'), 'moyenne', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Indicateurs' and p.name = 'Statistiques'), 'médiane', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Indicateurs' and p.name = 'Statistiques'), 'quartiles', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Indicateurs' and p.name = 'Statistiques'), 'déciles et rapport interdécile', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Indicateurs' and p.name = 'Statistiques'), 'étendue', 4),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Indicateurs' and p.name = 'Statistiques'), 'écart-type', 5),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Indicateurs' and p.name = 'Statistiques'), 'boîte à moustaches', 6);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Échantillonnage' and p.name = 'Statistiques'), 'fluctuation', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Échantillonnage' and p.name = 'Statistiques'), 'simulation', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Échantillonnage' and p.name = 'Statistiques'), 'estimation d''une proportion', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Tableaux croisés' and p.name = 'Statistiques'), 'tableau croisé d''effectifs', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Tableaux croisés' and p.name = 'Statistiques'), 'fréquences marginales et conditionnelles', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Statistique à deux variables' and p.name = 'Statistiques'), 'nuage de points', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Statistique à deux variables' and p.name = 'Statistiques'), 'point moyen', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Statistique à deux variables' and p.name = 'Statistiques'), 'ajustement affine', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Statistique à deux variables' and p.name = 'Statistiques'), 'coefficient de corrélation', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Statistique à deux variables' and p.name = 'Statistiques'), 'changement de variable', 4);

-- ---- Branche 17/19 : Logique -------------------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Logique', 16);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Logique'), 'Connecteurs et contre-exemples', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Logique'), 'Implication et équivalence', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Logique'), 'Quantificateurs et négation', 2),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Logique'), 'Raisonnements', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Connecteurs et contre-exemples' and p.name = 'Logique'), 'et, ou, non', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Connecteurs et contre-exemples' and p.name = 'Logique'), 'contre-exemple', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Implication et équivalence' and p.name = 'Logique'), 'implication', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Implication et équivalence' and p.name = 'Logique'), 'réciproque', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Implication et équivalence' and p.name = 'Logique'), 'contraposée', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Implication et équivalence' and p.name = 'Logique'), 'équivalence', 3),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Implication et équivalence' and p.name = 'Logique'), 'condition nécessaire, condition suffisante', 4);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Quantificateurs et négation' and p.name = 'Logique'), 'pour tout, il existe', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Quantificateurs et négation' and p.name = 'Logique'), 'statut des lettres et des égalités', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Quantificateurs et négation' and p.name = 'Logique'), 'négation d''une proposition', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Raisonnements' and p.name = 'Logique'), 'par l''absurde', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Raisonnements' and p.name = 'Logique'), 'par contraposée', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Raisonnements' and p.name = 'Logique'), 'disjonction de cas', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Raisonnements' and p.name = 'Logique'), 'par équivalence', 3);

-- ---- Branche 18/19 : Ensembles -----------------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Ensembles', 17);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Ensembles'), 'Ensembles de nombres', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Ensembles'), 'Opérations sur les ensembles', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Ensembles'), 'Cardinal et produit cartésien', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Ensembles de nombres' and p.name = 'Ensembles'), 'ℕ, ℤ, 𝔻, ℚ, ℝ', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Ensembles de nombres' and p.name = 'Ensembles'), 'nombres irrationnels', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Ensembles de nombres' and p.name = 'Ensembles'), 'appartenance et inclusion', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Ensembles de nombres' and p.name = 'Ensembles'), 'intervalles', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Opérations sur les ensembles' and p.name = 'Ensembles'), 'union et intersection', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Opérations sur les ensembles' and p.name = 'Ensembles'), 'complémentaire', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Opérations sur les ensembles' and p.name = 'Ensembles'), 'différence', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Cardinal et produit cartésien' and p.name = 'Ensembles'), 'cardinal', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Cardinal et produit cartésien' and p.name = 'Ensembles'), 'produit cartésien', 1);

-- ---- Branche 19/19 : Algorithmique -------------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
values ('branch', null, 'Algorithmique', 18);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Algorithmique'), 'Variables et instructions', 0),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Algorithmique'), 'Boucles', 1),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Algorithmique'), 'Fonctions Python', 2),
	('notion', (select id from public.classification_nodes where kind = 'branch' and name = 'Algorithmique'), 'Listes', 3);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Variables et instructions' and p.name = 'Algorithmique'), 'variables et affectation', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Variables et instructions' and p.name = 'Algorithmique'), 'types', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Variables et instructions' and p.name = 'Algorithmique'), 'instructions conditionnelles', 2);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Boucles' and p.name = 'Algorithmique'), 'boucle bornée', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Boucles' and p.name = 'Algorithmique'), 'boucle non bornée', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonctions Python' and p.name = 'Algorithmique'), 'définir une fonction', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Fonctions Python' and p.name = 'Algorithmique'), 'appeler une fonction', 1);
insert into public.classification_nodes (kind, parent_id, name, position)
values
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Listes' and p.name = 'Algorithmique'), 'créer une liste', 0),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Listes' and p.name = 'Algorithmique'), 'éléments et indices', 1),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Listes' and p.name = 'Algorithmique'), 'parcourir une liste', 2),
	('subnotion', (select c.id from public.classification_nodes c join public.classification_nodes p on p.id = c.parent_id where c.kind = 'notion' and c.name = 'Listes' and p.name = 'Algorithmique'), 'liste en compréhension', 3);

