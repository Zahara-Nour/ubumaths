---
title: Atelier — la géométrie (v2), journal de progression
date: 2026-10-18
status: lot 1, PR 1 (modèle) en cours
---

# Atelier — la géométrie : où en est le chantier

Phase 0 (validée le 2026-10-18) : [atelier-geometrie-phase0.md](atelier-geometrie-phase0.md).
Chapeau : [atelier-progress.md](atelier-progress.md).

## Lot 1 — découpage

| PR  | Contenu                                                                                        | Branche                         | État        |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------- | ----------- |
| 1   | Modèle : types `point` et `curve`, lecture, `y` réservé + migration, cartes, sauvegarde / lien | `feat/atelier-geometrie-modele` | 🚧 en cours |
| 2   | Vue Figure et pont `syncFigure` (curseurs cachés réglés par `moveSlider`, repère)              | —                               | à faire     |
| 3   | 𝒞f dans la Figure (action de carte)                                                            | —                               | à faire     |
| 4   | Grapheur à vrais paramètres (Q4 : sa propre PR, en dernier)                                    | —                               | à faire     |

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
  contrôlé.
