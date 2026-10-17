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
- [x] **PR B** (#1341, mergée le 2026-10-13) : pages (liste filtrable, créer/modifier avec aperçu
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
  - [x] PR, merge (#1341).
  - [x] Flocon de Koch créé en prod le 2026-10-14, première figure publique
        (`e2d26187-0760-4cc3-ac1a-a3ab9c86af54`, T_SPE, `fenetre: -4 ; 4 ; -4 ; 4`, `axes: non`,
        `deplacable: non`). Page `/figures/<id>` visible sur chiph.re après le prochain `deploy:prod`.
- [ ] **Lot 2** : type de ressource « figure » cité dans le cahier de texte et le cours.

## Réglages d'affichage (#1354, mergée le 2026-10-14 ; spécification validée le 2026-10-13)

Le texte enregistré devient exactement le contenu d'un bloc ` ```figure ` (en-tête, `---`,
script) ; sans `---`, script nu, affichage d'aujourd'hui. Clés existantes du bloc + deux clés
réservées aux figures interactives : `deplacable: oui|non` (défaut non, curseurs toujours actifs)
et `rendu: normal|croquis|mixte`, refusées avec un message situé dans un bloc d'exercice.

- [x] Parseur du bloc : option `interactive` (`parseFigureContent`), fenêtre facultative dans ce
      mode ; conversion pure fenêtre ↔ vue de toile (`ubumark/utils/figure-view.ts`).
- [x] `GeometryCanvas` : props `objectsMovable` (figer les objets, garder curseurs, zoom et
      déplacement de la vue) et `underlay` (repère de l'en-tête, `FigureFrameLayer.svelte`).
- [x] Formulaire : champs « Affichage » liés à l'en-tête dans les deux sens, bouton « Prendre le
      cadrage actuel » ; page publique et aperçu réglés par l'en-tête, largeur bornée au conteneur.
- [x] Tests unitaires, test de composant (`deplacable: non` → point figé, curseur actif ; rouge
      sans la garde), page publique vue au navigateur headless.

## Chantier futur (à ne pas commencer sans David)

- **Bloc ` ```figure ` interactif à l'écran**, figé au PDF à la valeur initiale des curseurs. Les
  clés (`deplacable:`, `rendu:`, option `interactive` du parseur) et la conversion
  `figureViewFromWindow` servent telles quelles. Questions ouvertes : le chat reste-t-il
  statique ? quel budget de recalcul (le bloc vient aussi des élèves) ? quels types d'objets
  ouvrir au bloc (liste blanche de `figure-scene.ts`) ?
