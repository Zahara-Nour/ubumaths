# Nouvelles transformations geometry-core — Progression

## Phase 1 : Similitude (sucre syntaxique) — DONE

**Fichiers modifies :**

- `src/lib/geometry-core/types/elements.ts` — `sourceBuiltin?` sur `GeoComposition`
- `src/lib/geometry-core/graph/figure.ts` — `createSimilitude()`
- `src/lib/geometry-core/dsl/builtins.ts` — case `'similitude'` + `BUILTIN_NAMES`
- `src/lib/geometry-core/dsl/serializer.ts` — serialisation `similitude(...)` au lieu de `compose(...)`
- `src/lib/geometry-core/dsl/__tests__/similitude.test.ts` — 8 tests

**Decisions :**

- Sucre syntaxique via `compose(homothetie, rotation)`, pas de nouveau type
- `sourceBuiltin` metadata sur `GeoComposition` pour serialisation roundtrip
- Le serializer lit le centre depuis la rotation sous-transformation

**Tests :** 8/8 passent, 0 regression sur les tests existants (29 tests transformation)

## Phase 2 : Projection orthogonale — DONE

**Fichiers modifies :** elements.ts, figure.ts, compute-position.ts, transformations.ts, affine-transform.ts, transform-apply.ts, builtins.ts, serializer.ts, keywords.ts
**Tests :** 11/11 passent
**Note :** `droite` etant un keyword, le parametre est `axe=` au lieu de `droite=`

## Phase 3 : Affinite orthogonale — DONE

**Fichiers modifies :** memes que Phase 2
**Tests :** 11/11 passent
**Note :** Affine complete — matrice inverse, courbes, coniques. Cas speciaux rapport=0/1/-1.

## Phase 4 : Inversion circulaire — DONE

**Fichiers modifies :** memes que Phase 2 + formules analytiques dans transform-apply.ts
**Tests :** 14/14 passent
**Notes :**

- Non-affine, auto-inverse
- Cercle/droite → courbe implicite via coefficients coniques
- Composition avec rotation fonctionne via closures
- Point au centre → NaN/NaN
- Throws sur segment/polygone/arc/vecteur

## Phase 5 : Demos — PENDING

## Bilan total : 45 nouveaux tests (10+11+11+14-1 unused import test), 0 regression sur 86 tests existants
