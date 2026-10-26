---
title: Limite d'une puissance uⁿ quand u → ±∞ (V66)
date: 2026-10-26
status: en cours
---

## Reprendre ici

_Mis à jour le 2026-10-26, à l'ouverture._

- **État** : tests rouges écrits (`limits/__tests__/power-composition.test.ts`, `it.todo` N4 de `atelier/__tests__/composees-ensemble.test.ts` devenu un test).
- **Prochaine action** : brancher le cas puissance dans `tryCompositionLimit` (`limits/composition.ts`) avec `powerSign` corrigée (exposant négatif).
- **En attente de David** : écarts voisins (`\frac{(x-3)^2}{x^2}` en −∞, `(x-3)^2e^{-x}` en +∞, `(x-3)^{3/2}` en −∞) notés à part, pas traités ici ; exposants entiers seuls.
- **Worktree / branche** : `../ubumaths-wt-limite-puissance` · `fix/limite-puissance`.

---

## Journal

- **2026-10-26** — Cause : la composition ne traitait que xⁿ (variable nue) et les nœuds fonction (ln, exp, √) ; la continuité (2.45) refuse une limite intérieure infinie. `powerSign` (sign-tracking) existait, exportée, jamais appelée, fausse pour n < 0 en 0 (rendait 0 au lieu de ±∞). Phase 0 validée par David (« ok go »).
