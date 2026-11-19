-- Plusieurs notions pour toute fiche d'exercices (ADR 0041, amendé)
-- ==================================================================
-- Décision de David (2026-11-19, reprise des 50 fiches) : une fiche
-- d'exercices peut avoir plusieurs notions quelle que soit sa catégorie
-- (« Entraînement technique — Suites » couvre suites arithmétiques,
-- géométriques, généralités…). La règle « une seule notion, sauf Révisions
-- et Automatismes » est retirée : on supprime la garde qui la vérifiait.
--
-- Question d'accès : aucune. Rien n'est ouvert ni fermé en lecture ; seule
-- une écriture refusée jusqu'ici (2e notion en Entraînement technique,
-- Applications ou sans catégorie) devient possible, pour qui écrit déjà les
-- notions de la fiche (son auteur, l'admin).
--
-- DROP sans perte de donnée : deux déclencheurs et leur fonction, aucune
-- table ni colonne. Usages vérifiés (grep src, scripts, tests, migrations) :
-- seul un commentaire de src/lib/worksheets/worksheet-title.ts citait la
-- fonction, retiré dans la même PR.
--
-- ROLLBACK : rejouer la section 3 de
-- supabase/migrations/20261119173341_categorie_notions_fiche.sql (de
-- « create or replace function public.worksheet_classification_count_guard »
-- jusqu'au second « create constraint trigger » inclus). Il échouera au
-- premier commit qui touche une fiche ayant déjà 2 notions hors Révisions /
-- Automatismes : retirer d'abord les notions en trop de ces fiches.
-- Revenir en arrière en base SANS revenir sur le code : une 2e notion serait
-- refusée par la base (500) au lieu d'un message 400 du serveur.

drop trigger if exists worksheet_classifications_count on public.worksheet_classifications;
drop trigger if exists worksheets_classification_count on public.worksheets;
drop function if exists public.worksheet_classification_count_guard();
