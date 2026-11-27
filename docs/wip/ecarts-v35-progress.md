---
title: V35, le i derrière la fraction — journal
date: 2026-11-27
status: PR ouverte
---

## Reprendre ici

_Mis à jour le 2026-11-27, PR ouverte._

- **État** : V35 corrigé sur `fix/ecarts-v35` ; ligne du registre barrée dans la PR ; test de preuve retiré de `tests/ecarts/mathast.test.ts`, remplacé par les cas de `src/lib/mathAST/tidy/__tests__/tidy-sum-lead.test.ts`.
- **Prochaine action** : merge à la CI verte ; la suite (V39, puis V124, V125) est dans [ecarts-a-trier](ecarts-a-trier-progress.md).
- **En attente de David** : rien.
- **Pièges en cours** : aucun.
- **Worktree / branche** : `ubumaths-wt-ecarts-v35` / `fix/ecarts-v35`.

---

Chantier fils de [ecarts-a-trier](ecarts-a-trier-progress.md).

## Phase 0 (validée par David le 2026-11-27, « oui » aux trois questions)

Décision du 2026-11-03 : `-1/2 + (√3/2)i`, le `i` après la fraction.

- Numérateur entier : `1 + (3/2)i` (avant : `1 + 3i/2`).
- `i` seul au numérateur : `√3/2 + (1/2)i` (avant : `√3/2 + i/2`).
- Imaginaire pur, sans partie réelle : `(√3/2)i` (avant : `i√3/2`).
- Inchangé : sans fraction (`-1 + i√3`, `2i√3`, `3i`, `0,5i`) ; avec π (`e^{iπ/3}`, `1 + 2iπ/3`) ; avec une inconnue (`ix/2`, `i/x`) ; `1/i`, `i²/2`.

## Ce qui a été fait

- `imaginaryBehindFraction` (`tidy/order.ts`) dit si la règle s'applique ; `buildTermMagnitude` (`tidy/build.ts`) écrit la fraction sans `i`, puis `i`.
- Écritures relues par le parseur (LaTeX et linéaire) puis repassées par `tidy` : stables.
- Un attendu mis à jour hors de `tidy` : `simplify/__tests__/unite-imaginaire.test.ts` (`i/2` → `(1/2)i`).
