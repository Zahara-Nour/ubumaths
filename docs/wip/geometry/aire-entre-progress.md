# aire_entre — journal de progression

> Implémentation du builtin DSL `aire_entre(f, g, a, b)` selon
> `docs/wip/geometry/aire-entre-study.md` (étude validée 2026-05-01).

---

## Phase 0 — Étude (close)

- ✅ `docs/wip/geometry/aire-entre-study.md` rédigée et validée.
- ✅ 5 questions ouvertes tranchées (couleur orange, [lo, hi], f≡g→0,
  2 warns au lieu de 3, refactor des cases reporté en V4).
- ✅ 10 comportements TDD validés par l'utilisateur.
- ✅ Q-A (pas de simplify(h)) et Q-B (secondFunctionId dans dependsOn) validés.

---

## Phase 1 — Extension type + factory `createIntegralArea` (✅ close)

### Fichiers modifiés

| Fichier                                                                      | Changement                                                                                                        |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/lib/geometry-core/types/elements.ts`                                    | + 3 champs optionnels sur `GeoIntegralArea` : `secondFunctionId?`, `differenceExpression?`, `compiledDifference?` |
| `src/lib/geometry-core/graph/figure.ts`                                      | + branche dans `createIntegralArea` pour mode V3 (aire_entre)                                                     |
| `src/lib/geometry-core/graph/__tests__/figure-integral-area-between.test.ts` | Nouveau fichier — 16 tests sur le mode V3                                                                         |

### Décisions implémentées

1. **Champ optionnel** `secondFunctionId?: string` : quand présent → mode V3 ;
   `signed` est forcé à `false` (aire_entre toujours ≥ 0) ; `dependsOn` inclut g.
2. **Cache `differenceExpression`** = `subtract(f.expression, g.expression)`,
   sans `simplify` (Q-A validée). `compiledDifference = compile(h)`.
3. **Substitution interne** de la « working expression » dans le compute closure :
   `workingExpression` pointe vers `f.expression` en V1/V2, vers `h` en V3.
   Le branchement existant `signed=false` gère V3 transparentement (findRoots
   et numericIntegrate travaillent sur h sans modification).
4. **Antidérivée** : `integrateDefinite(workingExpression, ...)` — calcule
   directement H(x), primitive de h, en V3 mode.
5. **Validation** : throw `createIntegralArea: secondFunctionId "<id>" is not
a function element` si l'id ne référence pas un `GeoFunction`.

### Tests Phase 1 — 16/16 verts

Catégories couvertes :

| Tests   | Description                                                                |
| ------- | -------------------------------------------------------------------------- |
| A1-A3   | Création : champs `signed=false`, `secondFunctionId`, `dependsOn` corrects |
| B4-B7   | Calcul correct sur 4 cas pédagogiques (1/12, 2√2, 2 avec sign change, 2)   |
| C8-C9   | Invariances : symétrie (f, g) ↔ (g, f) ; bornes inversées                 |
| D10-D11 | Cas dégénérés : a===b → 0 ; f≡g → 0                                        |
| E12     | Réactivité slider sur la borne basse                                       |
| F13-F14 | Validation : rejet d'un id non-fonction et d'un id inexistant              |
| G15     | NaN-on-divergence avec cache discontinuités de h                           |
| H16     | Coexistence sur même figure : `integrale` + `aire` + `aire_entre`          |

### Régression V1/V2

- 55/55 tests V1 + V2 d'`integralArea` continuent de passer.
- 456/458 tests `figure/__tests__/` verts (2 skipped pré-existants).

### Notes techniques

- **`y = x` parsé en GeoLine** : les tests utilisent `y = x^3` ou des paires
  non-affines pour rester sur le chemin `GeoFunction`. Documenté en haut du
  fichier de tests, comme `figure-integral-area-unsigned.test.ts`.
- **Parser custom et la division** : `y = x^2 / 2` ne parse pas (limitation
  observée). Les tests évitent `/` après `^`.
- **G15 (NaN-on-divergence)** : sans cache, le compute peut retourner une
  valeur finie (Simpson par morceaux peut "contourner" la singularité).
  Le test passe le cache `discontinuities` calculé via
  `getAllDiscontinuities(h, 'x')` — exactement ce que fera le DSL Phase 2.

### Commit Phase 1

À faire après code review.

---

## Phase 2 — DSL builtin `case 'aire_entre'` (à venir)

### Plan

1. Lire le pattern de `case 'aire'` (lignes 1119-1216 de builtins.ts).
2. Ajouter `case 'aire_entre'` adjacent qui :
   - Valide pos.length === 4
   - Valide pos[0] et pos[1] sont des GeoFunction
   - Résout pos[2] et pos[3] comme bornes
   - Construit `h = subtract(f.expression, g.expression)`
   - Appelle `getAllDiscontinuities(h, 'x')` → cache
   - Appelle `figure.createIntegralArea(fId, lower, upper, { secondFunctionId: gId, discontinuities, color: '#fb923c' })`
   - Appelle `warnIfSingularitySuspected` 2 fois (sur f et g)
3. Tests : 7 comportements (cf §4 Phase 2 de l'étude).

---

## Phase 3 — Rendu SVG `integralAreaBetweenToSVG` (à venir)

## Phase 4 — Démo + doc utilisateur (à venir)

## Phase 5 — Quality checks finaux (à venir)
