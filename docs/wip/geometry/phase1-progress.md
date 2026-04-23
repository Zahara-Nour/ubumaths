# Geometry-core — Progression

> Derniere mise a jour : 2026-04-23

## Etat : Phases 1-3A terminees

## Phase 1 : Fondations (TERMINEE)

### Phase 1A : Types fondamentaux

- `types/geo-value.ts` — GeoValue = exact(MathNode) | numeric(number)
- `types/primitives.ts` — Radians (branded), Vec2\<T\>, GeoPoint, NumericPoint, Box
- `types/elements.ts` — GeoElement union (8 types), GeoElementBase, type guards
- Tests : 64

### Phase 1B : Extraction viewport de grapheur/

- `viewport/` — Point, Viewport, CoordinateTransformer, pan/zoom/fit, viewportSchema
- `rendering/colors.ts`, `rendering/bezier.ts` — extraits de grapheur/
- grapheur/ transforme en re-exports (213 tests non-regression)
- Tests : 8

### Phase 1C : Compute (calcul exact/numerique)

- `compute/to-number.ts` — geoToNumber via evaluate(mode:'decimal')
- `compute/geo-arithmetic.ts` — geoAdd/Sub/Mul/Div/Sqrt/Opposite + geoFromNumber/geoFromFraction
- `compute/compare.ts` — geoEqual (via isZeroExpression), geoIsZero, geoLessThan
- Tests : 139

### Phase 1D : Dependency graph

- `graph/dependency-graph.ts` — dirty flags, topo sort (Kahn), cycle detection, cascade delete
- Tests : 41

### Phase 1E : Figure (API principale)

- `graph/figure.ts` — Figure class (renomme de Construction)
- Factory : createFreePoint, createMidpoint, createSegment, createLine, createRay, createCircleByRadius, createCircleByPoint
- movePoint + recompute, cascade remove
- Tests : 39

### Phase 1F : Rendu SVG + Schemas

- `rendering/svg-primitives.ts` — pointToSVG, segmentToSVG, lineToSVG, rayToSVG, circleToSVG
- `types/schemas.ts` — Zod schemas, serialisation GeoValue exact via LaTeX
- Tests : 42

### Phase 1G : Finalisation + Integration tests

- Barrel top-level, ESLint clean
- 18 tests d'integration (pipeline complet)

## Phase 2 : Interaction (TERMINEE)

- `interaction/hit-testing.ts` — findPointNear, findElementNear (O(n) lineaire)
- `interaction/snap.ts` — snapToGrid (retourne exact), snapToPoint
- `GeometryCanvas.svelte` — rendu SVG interactif, drag de points libres, grille, hover
- Demo page `/geometry-demo`
- Tests : 25

### Decisions prises :

- Pas de rbush (O(n) suffit pour < 200 elements)
- Snap sur grille desactive par defaut (`snapOnRelease = false`)
- Pas de distinction "exploration" vs "exercice" — un seul outil avec des options
- Reactivite via compteur `version` ($state) puisque Figure est une classe plain JS

## Phase 3A : Intersections (TERMINEE)

- `geometry/intersections.ts` — intersectLL, intersectLC, intersectCC
- Exact quand les inputs sont exacts (via geoAdd/geoSub/geoMul/geoDiv/geoSqrt)
- intersectCC : comparaison d² vs (r1±r2)² (pas de sqrt), tolerances relatives
- Tests : 25

### Decisions prises :

- Formules directes, pas MathAST solve() (LL/LC/CC ont des solutions en forme close)
- geoSqrt garde contre les inputs exacts negatifs (float check avant de construire sqrt node)
- Tolerances relatives dans intersectCC et intersectLC (pas de seuils absolus)
- `geoFromNumber(Math.SQRT2)` INTERDIT — utiliser `exact(sqrt(number(2)))` pour les irrationnels
- `geoFromNumber` cree exact seulement pour les entiers, numeric pour le reste

## Phase 3B : Transformations (TERMINEE)

- `geometry/transformations.ts` — translate, rotate, reflectPoint, reflectOverLine, dilate
- Rotation exacte pour les angles remarquables (pi/2, pi/3, pi/4, pi/6) via MathAST cos/sin
- `simplifyExact` exporte de geo-arithmetic.ts (plus de duplication)
- `reflectOverLine` retourne null pour les droites degenerees
- Tests : 64

## Demo page `/geometry-demo`

- Triangle equilateral avec 3 midpoints et 3 medianes
- Droite (AB) etendue aux bords du viewport
- Demi-droite (C vers M) etendue d'un cote
- Cercle par point (centre O, point R draggable)
- Tous les points libres sont draggables, les dependants suivent

## Refactoring

- `Construction` renomme en `Figure` (partout)
- `CONSTRUCTION_STATE_VERSION` renomme en `FIGURE_STATE_VERSION`

## Prochaines etapes

- Integration des intersections/transformations dans Figure (points dependants : GeoIntersectionLL, GeoRotatedPoint...)
- Undo/redo delta-based
- Validation d'exercices (checks)
- Nombres dynamiques (distance, angle comme objets)
- Labels, export LaTeX

## Resume des tests

| Module                                      | Tests   |
| ------------------------------------------- | ------- |
| types/                                      | 64      |
| viewport/                                   | 8       |
| compute/                                    | 139     |
| graph/ (dep-graph + figure)                 | 80      |
| rendering/                                  | 17      |
| geometry/ (intersections + transformations) | 89      |
| interaction/                                | 25      |
| integration/                                | 18      |
| **Total geometry-core**                     | **440** |
| grapheur/ (non-regression)                  | 213     |
