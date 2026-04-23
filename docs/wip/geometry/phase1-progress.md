# Phase 1 — Progression

> Derniere mise a jour : 2026-04-23

## Etat : Phases 1A-1D terminees, 1E-1G a faire

## Phases terminees

### Phase 1A : Types fondamentaux

**Fichiers crees :**

- `src/lib/geometry-core/types/geo-value.ts` — GeoValue = exact(MathNode) | numeric(number)
- `src/lib/geometry-core/types/primitives.ts` — Radians (branded `__brand`), Vec2\<T\>, GeoPoint, NumericPoint, Box
- `src/lib/geometry-core/types/elements.ts` — GeoElement union (8 types), GeoElementBase exporte, type guards
- `src/lib/geometry-core/types/index.ts` — barrel

**Decisions prises pendant l'implementation :**

- `numeric()` rejette NaN ET Infinity (seules les valeurs finies sont des coordonnees valides)
- `GeoFreePoint.position` est un `GeoPoint` (Vec2\<GeoValue\>), pas des x/y plats
- `GeoCircle` splitte en `GeoCircleByRadius` / `GeoCircleByPoint` (dependances differentes)
- `GeoPolygon` : `dependsOn` sert aussi de liste de sommets (pas de champ `vertexIds` redondant), minimum 3
- `GeoElementBase` exporte pour acces generique au dependency graph
- `GeoLineLikeElement` union + `isLineLike()` pour le rendu
- `GeoMidpoint` ajoute des la Phase 1 (necessaire pour tester le dependency graph)

**Tests :** 39 (geo-value: 22, primitives: 17)

### Phase 1B : Extraction viewport de grapheur/

**Fichiers crees :**

- `src/lib/geometry-core/viewport/types.ts` — Point, Viewport, ViewportMetrics, SampledCurve, LineStyle, viewportSchema
- `src/lib/geometry-core/viewport/viewport.ts` — copie de grapheur/viewport.ts + `fitViewport()`
- `src/lib/geometry-core/viewport/index.ts` — barrel
- `src/lib/geometry-core/rendering/colors.ts` — copie de grapheur/colors.ts
- `src/lib/geometry-core/rendering/bezier.ts` — copie de grapheur/bezier.ts (import mis a jour)
- `src/lib/geometry-core/rendering/index.ts` — barrel

**Fichiers modifies (re-exports) :**

- `src/lib/grapheur/viewport.ts` — re-exporte depuis geometry-core
- `src/lib/grapheur/types.ts` — re-exporte les types partages, garde les types specifiques
- `src/lib/grapheur/colors.ts` — re-exporte depuis geometry-core
- `src/lib/grapheur/bezier.ts` — re-exporte depuis geometry-core

**Non-regression :** 213 tests grapheur passent sans modification.

**Decisions prises :**

- `fitViewport()` clamp le padding a >= 0
- `createMathToSVGTransformer` dans bezier.ts : guard division-by-zero aligne avec `createTransformer`

**Tests :** 8 (fitViewport)

### Phase 1C : Compute (calcul exact/numerique)

**Fichiers crees :**

- `src/lib/geometry-core/compute/to-number.ts` — geoToNumber (via evaluate mode decimal), vec2ToPoint
- `src/lib/geometry-core/compute/geo-arithmetic.ts` — geoAdd/Sub/Mul/Div/Sqrt/Opposite + geoFromNumber/geoFromFraction
- `src/lib/geometry-core/compute/compare.ts` — geoEqual, geoIsZero, geoLessThan, geoApproxEqual
- `src/lib/geometry-core/compute/index.ts` — barrel

**Decisions prises pendant l'implementation :**

- **isZeroExpression** (normalize) pour egalite/zero, PAS compareNumericNodes. Raison : normalize est le test definitif d'equivalence algebrique, compareNumericNodes a un fallback decimal sans tolerance qui peut donner des faux negatifs. Documente dans compare.ts.
- **geoSqrt retourne null** pour les inputs negatifs numeriques (coherent avec geoDiv qui retourne null pour division par zero). Pas de throw dans les operations geometriques.
- **geoLessThan** : strict float, pas de tolerance (suffisant pour ordering/rendu).
- **geoFromNumber** (renomme de geoFromInteger) : accepte n'importe quel nombre, pas de conversion String() inutile.
- MathAST factory `number()` accepte directement des `number`, pas besoin de `String()`.

**MathAST API utilisee :**

- Constructeurs : `number()`, `add()`, `subtract()`, `multiply()`, `divide()`, `fraction()`, `sqrt()`, `opposite()`
- `evaluate(node, {mode:'exact'})` pour simplifier les AST
- `evaluate(node, {mode:'decimal'})` pour convertir en float
- `isZeroExpression()` de `$lib/mathAST/normal` pour le test de zero exact
- `subtract()` de `$lib/mathAST` pour construire a-b avant isZeroExpression

**Tests :** 137 (to-number: 23, geo-arithmetic: 58, compare: 56)

### Phase 1D : Dependency graph

**Fichiers crees :**

- `src/lib/geometry-core/graph/dependency-graph.ts` — DependencyGraph + CycleError
- `src/lib/geometry-core/graph/__tests__/dependency-graph.test.ts`

**Decisions prises :**

- Cycle detection : seul le self-reference est verifie. Les cycles transitifs sont structurellement impossibles via `addNode` (un nouveau noeud n'a pas d'enfants).
- Duplicate parent IDs rejetes (corromprait le comptage d'in-degree dans le tri topologique).
- `markDirty` sur un id inexistant throw (evite les fantomes dans le dirty set).
- `collectDescendants` utilise un Set pour le dedup O(1) au lieu de `Array.includes` O(n).
- `getDirtyInOrder` snapshote le dirty set avant iteration (defensif).

**Tests :** 41

## Phases restantes

### Phase 1E : Construction (API principale)

- `graph/construction.ts` — Collection d'objets + factory + movePoint + recompute
- Tests de bout en bout : creer point + segment, deplacer point, cascade

### Phase 1F : Rendu SVG + Schemas

- `rendering/svg-primitives.ts` — GeoElement -> attributs SVG
- `types/schemas.ts` — Zod schemas pour serialisation

### Phase 1G : Finalisation

- Quality checks (eslint, tsc)
- Barrel top-level `index.ts`
- Ce document de progression mis a jour

## Resume des tests

| Module                     | Tests   |
| -------------------------- | ------- |
| types/                     | 39      |
| viewport/                  | 8       |
| compute/                   | 137     |
| graph/                     | 41      |
| **Total geometry-core**    | **225** |
| grapheur/ (non-regression) | 213     |
