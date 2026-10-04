---
title: Atelier — `/grapheur` passe par l'atelier, progression
date: 2026-10-04
phase0: docs/wip/atelier-grapheur-phase0.md (validée le 2026-10-04)
---

# `/grapheur` passe par l'atelier — progression

## Lot 1 — les réglages d'affichage appartiennent à l'objet

Branche `feat/atelier-reglages-affichage`, worktree `../ubumaths-wt-reglages`.

- [x] Tests rouges : `src/lib/atelier/__tests__/reglages-affichage.test.ts`
      — 23 rouges sur le comportement (`setDisplay` absent, aucun réglage) ;
      3 verts, tous des garde-fous de limite (fonction jamais tracée sans
      réglages, rien de rangé pour rien, jamais de case f′).
- [ ] Implémentation : `CurveDisplay` sur `FunctionObject`, `setDisplay`,
      couleur attribuée au premier tracé, conservée par `update`, rangée
      (sauvegarde, lien, fusion), recopiée vers le grapheur par `syncPlots`.
- [ ] Revue, PR, CI, merge.

## Lots suivants

2 carte modifiable · 3 Dériver → `f′` · 4 curseurs · 5 suites · 6 bascule.
