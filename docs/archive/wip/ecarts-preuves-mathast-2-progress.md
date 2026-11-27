---
title: Tests de preuve mathAST, suite de #3108 — journal
date: 2026-11-27
status: clos
---

## Reprendre ici

_Mis à jour le 2026-11-27, après #3230._

- **État** : clos. #3230 mergée ; L117 à L121, V124, V125 ont leur preuve au registre (7 rouges au rejeu) ; constats de L120 et L121 précisés.
- **Prochaine action** : aucune ici ; la suite est dans [ecarts-a-trier](../../wip/ecarts-a-trier-progress.md).
- **En attente de David** : rien.
- **Pièges en cours** : aucun.
- **Worktree / branche** : aucun (retirés au merge).

---

Chantier fils de [ecarts-a-trier](../../wip/ecarts-a-trier-progress.md).

## Sonde du 2026-11-27 (chemin de l'Atelier, sauf L119 et L120)

- L117 : `.domaine` de `1/(sin(x)cos(2x))`, `1/((x − 1)cos(x))`, `1/((x − π)sin(x))` → refus « Je ne sais pas encore déterminer ce domaine. ».
- L118 : `.limite x ln x + kx en 0` → `x → 0`, alors que `x ln x en 0` écrit `x → 0⁺`.
- L119 : `intersect(ℝ ∖ {kπ}, ℝ ∖ {π/2 + kπ})` contient encore π/2 ; `union` des deux ne contient pas 0.
- L120 : `normalize(√(ab))` garde une seule racine ; c'est `√(4ab)` qui est découpée (`2*V(a)^1/2*V(b)^1/2`). Le test porte donc sur `√(4ab)`, avec `√(ab)` pour témoin.
- L121 : `.domaine 1/sin(x) + 1/cos(x)`, `tan(x)/sin(x)` → refus ; `.limite x/(kx + x²) en 0+` → refus « elle peut dépendre du signe de k ».
- V124 : `.résoudre x² − a²bc = 0` → `S = {√(bc)|a| ; −√(bc)|a|} si bc ⩾ 0`. La forme corrigée n'est pas tranchée : le test demande que la réponse écrive le cas `a = 0`.
- V125 : `.limite (x + k)/(x² + k) en 0` → `k/k, pour k ≠ 0`.

Saisie : `\cos 2x` sans parenthèses est refusée par l'Atelier avant le calcul (« écris cos(…) avec des parenthèses ») ; les tests écrivent `\cos(2x)`.

## Revue (code-reviewer, 2026-11-27)

Corrigés avant le commit : L117 cherchait `k\pi`, que `\frac{k\pi}{2}` contient déjà, et le point 1 par `toContain('1')` (verts à tort possibles) ; L120 imposait la forme du hash (rouge si le 4 reste sous la racine) ; V124 imposait `a = 0` à l'espace près.

- **L121, constat du registre à préciser** : `x/(kx + x²)` vaut `1/(k + x)`, donc la limite en 0⁺ est 1/k pour tout k ≠ 0, pas seulement k > 0. Le test accepte les deux conditions.
- V125 garde la condition « pour k ≠ 0 » dans la réponse attendue (pour k = 0 l'expression est 1/x) : la correction devra la conserver, alors que `x/(kx)` en 0 rend aujourd'hui 1/k sans condition.
