---
title: Écarts du lot geometrie
date: 2026-11-28
status: en cours
---

# Écarts du lot `geometrie`

## Reprendre ici

_Mis à jour le 2026-11-28, avant la PR._

- **État** : les 8 écarts corrigés et commités sur la branche (preuves → tests ordinaires,
  `tests/ecarts/geometrie.test.ts` supprimé, registre barré, 3 docs système à jour). L60 corrigé
  dans mathAST (`analysis/continuity.ts`, `isolatedPointsBesidePeriodic`), pas dans le grapheur
  (correctif grapheur refusé en revue : coût sans borne). 2ᵉ revue : régression à corriger
  (`isContinuousOnDomain` faux sur un trou effaçable à côté de tan), en cours.
- **Prochaine action** : commit du correctif de revue, suites touchées, push, PR, `pnpm pr:merger`.
- **En attente de David** : rien.
- **Pièges en cours** : `intersect` de mathAST perd les points isolés à côté d'une exclusion
  périodique (le domaine de tan(x) + 1/(x − 3) reste incomplet) — pas inscrit au registre
  (cas voisin, à proposer à David).
- **Worktree / branche** : `../ubumaths-wt-ecarts-geometrie` · `fix/ecarts-geometrie`.

## Journal

### 2026-11-28 — ouverture

Lot pris par `/prendre-lot`.

Vérification : les 7 preuves de `tests/ecarts/geometrie.test.ts` sont rouges
(`ECARTS_PREUVES=1 pnpm exec vitest run --project=ecarts tests/ecarts/geometrie.test.ts`),
la commande de M19 aussi (trois interfaces : `IntersectionConfig`, `NewtonConfig`,
`IntersectionConfig1D`). Aucun écart périmé.

### Phase 0 — comportements attendus

- **V77** : `a = slider(0, 5, 2)` puis `courbe("x^2 + y^2 = a^2")` → cercle de rayon 2 ; curseur à
  3 → rayon 3. **Q1** : curseur à 0 → rien de dessiné, ou un point ?
- **V119** : figure en radians, O(0, 0), P(0, 1) → `angle_polaire(O, P)` vaut π/2 (aujourd'hui 90) ;
  en degrés, 90 comme avant.
- **L57** : `s = segment(A, B)` puis `mediatrice(s)` → même droite que `mediatrice(A, B)`.
- **L58** : `M' = point(1, 1)` → point étiqueté M'. **Q2** : aussi M'' (deux primes) ?
  Prime seulement en fin de nom.
- **L59** : `courbe("x^2 = 4")` → les deux droites x = −2 et x = 2, comme l'Atelier.
  **Q3** : `courbe("x^2 = -1")` (aucun point) → message d'erreur, ou courbe vide sans erreur ?
- **L60** : tan(x) + 1/(x − 3) dézoomé → l'asymptote x = 3 reste tracée.
- **L61** : (ln x)²/√x → asymptote y = 0 vers la droite.
- **M19** : une seule interface de réglage de Newton (code mort, rien de visible).

### Phase 0 — réponses de David (2026-11-28, « ok » à mes recommandations)

- **Q1** : curseur à 0 → rien dessiné, sans erreur ; le cercle revient quand le curseur bouge.
- **Q2** : primes acceptés en fin de nom, autant qu'on veut (M', M'', …).
- **Q3** : équation sans aucun point → courbe vide, sans erreur (cohérent avec Q1).

### 2026-11-28 — correction et revues

- Agents : `geometry-expert` (V77, V119, L57, L58, L59, M19), Sonnet (L60, L61), puis
  `mathast-expert` (L60 à la cause). Vérifié en prod (lecture seule) : aucune figure n'utilise
  `angle_polaire` ni `slider(` positionnel, donc V119 et V77 ne changent aucun contenu.
- Rendu vu par `pnpm voir /demo/geometrie --ordi` avec une figure d'essai provisoire (retirée) :
  cercle de rayon a, droites x = ±2, médiatrice de [AB], M' et M'', 0 erreur de console.
- Revue 1 (Opus) : L60 côté grapheur refusé (coût, cas du test seul) ; L59 `courbe("x^2 - 1")`
  sans `=` redevenu une erreur. Revue 2 (Opus) : régression `isContinuousOnDomain`, doublon π/2.
