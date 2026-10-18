---
title: Atelier — la géométrie (v2), journal de progression
date: 2026-10-18
status: lot 1 — PR 1 (modèle) mergée (#1474) ; PR 2 (vue Figure) implémentée, à relire
---

# Atelier — la géométrie : où en est le chantier

Phase 0 (validée le 2026-10-18) : [atelier-geometrie-phase0.md](atelier-geometrie-phase0.md).
Chapeau : [atelier-progress.md](atelier-progress.md).

## Lot 1 — découpage

| PR  | Contenu                                                                                        | Branche                         | État     |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------- | -------- |
| 1   | Modèle : types `point` et `curve`, lecture, `y` réservé + migration, cartes, sauvegarde / lien | `feat/atelier-geometrie-modele` | ✅ #1474 |
| 2   | Vue Figure et pont `syncFigure` (curseurs cachés réglés par `moveSlider`, repère)              | `feat/atelier-geometrie-figure` | en cours |
| 3   | 𝒞f dans la Figure (action de carte)                                                            | —                               | à faire  |
| 4   | Grapheur à vrais paramètres (Q4 : sa propre PR, en dernier)                                    | —                               | à faire  |

## PR 1 — journal

- 2026-10-18 : worktree `../ubumaths-wt-atelier-geometrie` créé ; comportements visés : C1-C15
  (sauf l'affichage dans la Figure), P1-P9, M1-M4, Q1, Q2.
- 2026-10-18 : PR 1 implémentée (tests d'abord : 64 tests node, 58 rouges avant le code) —
  types `point` et `curve`, lecture dans Calcul et les cartes, `y` réservé (Q1), version 3 et
  migration d'un objet `y` (Q2), plafond de 50 (Q3), cartes « d : … » et « A = … », boutons
  « + Point » et « + Courbe ». Reportés en PR 2 : la nature d'une courbe (C1 « droite », C2
  « cercle ») et la courbe vide (C6), faute d'une classification pure dans `geometry-core`.
- 2026-10-18 : corrections de la revue — un `y` de l'atelier personnel renommé en gardant un lien
  reçu est dit (`MergeReport.migrated`, ShareBar) ; `x : 2 = 4` redevient un calcul (nom réservé
  sans x ni y), `k : 2 = 3` reste le refus C8 ; `xy` est lu comme x et y ; la carte d'un point
  testée à la frappe (MathLive écrit `\left(1;2\right)`, `\left(1,5;2\right)`).
- **À trancher par David** : `y` hors définitions dans Calcul (`2y + a`, `.dériver y`) n'est pas
  contrôlé. Reco : le laisser lettre libre dans un calcul (aucun objet ne s'appelle y).
- 2026-10-18 : CI verte, **mergée (#1474, `9a4c5fb2c`)**, branche et worktree retirés. Pas en
  production (aucun `deploy:prod`).

## PR 2 — journal

- 2026-10-18 : worktree `../ubumaths-wt-atelier-figure`. Tests d'abord : 54 tests node (47
  rouges) et 12 navigateur (12 rouges) — `figure-sync.test.ts`, `figure-nature.test.ts`,
  `geometry-core/geometry/__tests__/curve-nature.test.ts`, `FigureView.svelte.test.ts`, cartes
  C1, C2, C6 (`carte-geometrie.svelte.test.ts`, C1 passe de « courbe » à « droite »).
- 2026-10-18 : implémenté — onglet Figure entre Graphe et Données (Q5), `FigureView.svelte`
  (projection, `$derived`, `objectsMovable={false}`, repère orthonormé, case « Repère » hors
  `serialize()`), `syncFigure` / `AtelierFigure` par l'API `Figure.create*` (pas le DSL : pas de
  texte relu), curseurs cachés réglés par `moveSlider` sans reconstruire, coniques et courbes
  implicites à curseur (`parameterRecipe` dans `Figure`), nature des courbes par une
  classification pure partagée avec `courbe()` (`curve-nature.ts`, `degenerateConicKind` : vide,
  point isolé, une ou deux droites).
- 2026-10-18 : **mesure S2** — atelier de 10 courbes dont 3 implicites (`y^2 = x^3 − ax`,
  `x^4 + y^4 = a^4`, `sin(x) + cos(y) = a/4`), toutes citant `a`, 40 crans de curseur :
  **médiane 10,9 ms, p90 12,0 ms, max 13,7 ms** par cran dans Chromium (vitest navigateur, toile
  800 × 600, Mac mini M6 : `slideTo` + `syncFigure` + rendu Svelte, sans la peinture). En node :
  `slideTo` 0,5 ms, `syncFigure` 0,9 ms, géométrie SVG des 10 courbes 13 ms (médianes). Sous une
  image à 60 Hz ; pas de seuil posé.
- **À trancher par David** : (1) une conique réduite à un point (`x² + y² = 0`, ou a = 0 dans
  `x² + y² = a²`) : la carte dit « courbe » + « Un seul point vérifie cette équation. » et la
  figure ne dessine rien — faut-il dessiner le point ? (2) le type d'une courbe affiche
  « deux droites » pour `x² = 4` : libellé à valider. (3) le message F1 finit par un point.
