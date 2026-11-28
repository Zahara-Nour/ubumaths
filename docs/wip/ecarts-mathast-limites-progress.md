---
title: Écarts — lot mathast-limites
date: 2026-11-28
status: en cours
---

# Écarts — lot `mathast-limites`

## Reprendre ici

_Mis à jour le 2026-11-28, avant l'ouverture de la PR._

- **État** : corrigés sur la branche : V125, L28 bis, L74, L75, L76, L77, L118, L119, L121 ; L117 en partie (π déjà un kπ) ; V138 reformulé (l'Atelier refuse déjà, `intersect` perd le point).
- **Prochaine action** : revue faite ; PR, CI, merge.
- **En attente de David** : type de domaine à plusieurs familles et points (reste de L117 et V138).
- **Pièges en cours** : sondes par `runInput`, jamais `pnpm math` ; preuves par `ECARTS_PREUVES=1 pnpm exec vitest run --project ecarts …`.
- **Worktree / branche** : `../ubumaths-wt-ecarts-mathast-limites` · `fix/ecarts-mathast-limites`.

## Journal

### 2026-11-28 — ouverture

Lot pris. Preuves déjà écrites par #3230 pour L117 à L121 et V125 ; L75, L77 au fichier
`tests/ecarts/mathast.test.ts` ; L28 bis, L74 par commande ; L76, V138 à la main.

### 2026-11-28 — V125 tranché, L28 bis et L74 corrigés

- **V125, forme validée par David** : « 1, pour k ≠ 0 » (la condition reste : pour k = 0,
  l'expression vaut 1/x). Même forme pour la limite de L121 : « 1/k, pour k ≠ 0 ».
- L28 bis, L74 : nombres négatifs écrits par `numericNode` / `opposite` de la fabrique (e037437942).
- Deux agents `mathast-expert` en parallèle : domaine (L119, L117, L121 domaine, L75, V138) et
  limites (V125, L121 limite, L118, L77, L76).

### 2026-11-28 — retours des agents

- Domaine (1c84e71103) : `intersectExact` (`domain/periodic-families.ts`) réunit deux familles ;
  `log_b u ⊳ c` et `ln(x²) ⊳ K` résolus (L75). Reste de L117 (deux familles sans écriture, famille
  - point) et V138 : le type `PeriodicExclusion` ne note qu'une famille, sans point.
- Limites : V125 (`writeLimitValue` normalise une valeur littérale), L121 (repli des deux côtés),
  L118 (`src/lib/atelier/limit.ts` reprend le côté de définition), L77 (x^{-n}, x^{4/2} quand la
  base est x ; croissance comparée R·e^u), L76 (quotient exact dans `tryDirectEvaluationExact`).
- Effets de bord vus et suivis : `extrema-globaux` (exemple de limite inconnue remplacé par
  x²/e^{√x}) ; `identite-dans-intervalle` : 2tan x / 2tan x = 1 rend S = ℝ ∖ {kπ/2}, juste.
- Suites `src/lib/mathAST`, `src/lib/atelier`, `src/lib/grapheur` : 34 044 tests verts ;
  `check:incremental` 0 erreur ; preuves du lot : 3 rouges attendues (L117 × 2, V138).

### 2026-11-28 — revue (code-reviewer, Opus)

Aucune valeur fausse (≈ 180 sondes, branche contre `main`). Bloquant corrigé : `canonicalForm`
au lieu de `denormalize(normalize(…))` (lint). Laissés, voulus : condition « k ≠ 0 » non redite
quand l'expression tapée n'existe pas pour k = 0 (`k(x+1)/k` en 0 → 1, `x/k` en 0⁺ → 0 : règle
écrite de `limitParameterCondition`) ; `k²/k` non simplifié en k (une lettre reste).
