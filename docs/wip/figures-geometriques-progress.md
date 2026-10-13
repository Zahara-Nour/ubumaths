# Figures géométriques stockées — journal de chantier

Démarré le 2026-10-13. Worktree `../ubumaths-wt-figures`, branche `feat/figures-stockage`.

## Décisions de David (2026-10-13)

- **Table à part** `geometry_figures` (pas la table `constructions` de constructions-v2).
- **Accès** : publique = lisible par tous, même sans compte ; privée = l'auteur seul.
- **Auteurs** : prof et admin seulement ; chacun ne modifie et ne supprime que SES figures.
- **Rangement** : niveaux (`grades`, codes et contrôle des exercices), tags partagés
  (`resource_tags`, type `geometry_figure`), recherche sur titre et description.
- Accepté : un utilisateur connecté peut lire les liens de tag d'une figure privée (tag +
  identifiant, jamais le contenu), comme pour les exercices ; la page publique n'affiche pas les
  tags au lot 1 (`anon` ne lit pas `resource_tags`).
- **Lot 1** = stockage + pages ; la citation dans le cahier et le cours vient au lot 2.

## Livraison

- [x] **PR A** (#1339, en prod) : migration `20261016103100_geometry_figures.sql`, tests d'intégration
      (`tests/integration/figures-geometriques.test.ts`, rouges sans la migration), ADR 0027, doc ;
      `security-auditor` ; merge ; `db:migrate` ; `db:types`.
- [ ] **PR B** (branche `feat/figures-pages`) : pages (liste filtrable, créer/modifier avec aperçu
      à curseurs, page publique `/figures/[id]` en `noindex`), Zod, fonctions serveur, tests ; le
      flocon de Koch devient la première figure publique.
  - [x] `geometry_figure` dans `TAGGABLE_KINDS` ; Zod (`validation/geometry-figures.ts`).
  - [x] Fonctions serveur (`server/geometry-figures.ts`), écritures relues ; tests unitaires et
        d'intégration (`tests/integration/figures-geometriques-serveur.test.ts`, 8 cas).
  - [x] Pages prof (liste, nouvelle, modifier/supprimer), entrée « Figures » de la barre latérale,
        page publique (hors sitemap) ; parcours vérifié au navigateur headless en local (créer avec
        erreur de script refusée, enregistrer, modifier, supprimer).
  - [x] Doc : `docs/systeme/geometrie/README.md` §7, navigation, carte des fonctionnalités.
  - [x] Revue : `security-auditor` sans bloquant ; `code-reviewer` : doublon possible si les tags
        échouent à la création (corrigé : figure rendue, renvoi vers la modification), filtres
        désynchronisés au Précédent (corrigé : `afterNavigate`).
  - [ ] Reste signalé, hors PR : `syncResourceTags` supprime sans `.select()` (refus RLS muet) ;
        la policy de `resource_tags` laisse un prof écrire les liens de tag de la figure de
        l'admin (hors application) ; `.in('id', …)` non borné pour un tag très employé.
  - [ ] PR, merge.
  - [ ] Après merge (David) : créer le flocon de Koch comme première figure publique.
- [ ] **Lot 2** : type de ressource « figure » cité dans le cahier de texte et le cours.
