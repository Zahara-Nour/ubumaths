---
title: Écarts du lot geometrie
date: 2026-11-28
status: en cours
---

# Écarts du lot `geometrie`

## Reprendre ici

_Mis à jour le 2026-11-28, à l'ouverture._

- **État** : 8 écarts vérifiés, phase 0 validée par David le 2026-11-28 ; correction en cours.
- **Écarts** (8) : V77, V119, L57, L58, L59, L60, L61, M19.
- **Prochaine action** : coder après la réponse de David (tests d'abord : preuves → tests ordinaires).
- **En attente de David** : rien.
- **Pièges en cours** : agent `geometry-expert` pour `src/lib/geometry-core/` ; sondes seulement pour vérifier un correctif, pas de cas voisins.
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
