# Geometry-core — Progression

> Derniere mise a jour : 2026-04-23

## Etat : Phases 1-3E terminees

## Phase 1 : Fondations (TERMINEE)

### Phase 1A : Types fondamentaux

- `types/geo-value.ts` — GeoValue = exact(MathNode) | numeric(number)
- `types/primitives.ts` — Radians (branded), Vec2\<T\>, GeoPoint, NumericPoint, Box
- `types/elements.ts` — GeoElement union (10 types), GeoElementBase, type guards
- Tests : 64

### Phase 1B : Extraction viewport de grapheur/

- `viewport/` — Point, Viewport, CoordinateTransformer, pan/zoom/fit, viewportSchema
- `rendering/colors.ts`, `rendering/bezier.ts` — extraits de grapheur/
- grapheur/ transforme en re-exports (213 tests non-regression)
- Tests : 8

### Phase 1C : Compute (calcul exact/numerique)

- `compute/to-number.ts` — geoToNumber via evaluate(mode:'decimal')
- `compute/geo-arithmetic.ts` — geoAdd/Sub/Mul/Div/Sqrt/Opposite + geoFromNumber/geoFromFraction + simplifyExact (exporte)
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
- `types/schemas.ts` — Zod schemas (10 types), serialisation GeoValue exact via LaTeX
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
- `geoFromNumber(Math.SQRT2)` INTERDIT — utiliser `exact(sqrt(number(2)))` pour les irrationnels
- `geoFromNumber` cree exact seulement pour les entiers, numeric pour le reste

## Phase 3B : Transformations (TERMINEE)

- `geometry/transformations.ts` — translate, rotate, reflectPoint, reflectOverLine, dilate
- Rotation exacte pour les angles remarquables (pi/2, pi/3, pi/4, pi/6) via MathAST cos/sin
- `simplifyExact` exporte de geo-arithmetic.ts (plus de duplication)
- `reflectOverLine` retourne null pour les droites degenerees
- Tests : 64

## Phase 3C : Elements dependants dans Figure (TERMINEE)

- `GeoIntersectionLL` — point d'intersection de deux elements line-like, recalcule au drag
- `GeoReflectedPoint` — image par symetrie centrale, recalcule au drag
- Factory : `createIntersectionLL`, `createReflectedPoint`
- Validation : createIntersectionLL verifie line-like, createReflectedPoint verifie point-like + ids distincts
- Positions supprimees quand parents absents (intersectionLL paralleles, reflectedPoint sans parent)
- Schemas Zod mis a jour pour les 2 nouveaux types
- Tests : 33

## Phase 3D : Undo/Redo delta-based (TERMINEE)

- Transaction API dans Figure : `beginTransaction()`, `commit()`, `discard()`
- `undo()`, `redo()`, `canUndo`, `canRedo`
- Delta : `{added, removed, updated, removedPositions}` Maps
- Undo de create : supprime les elements (roots d'abord, cascade explicite)
- Undo de remove : re-cree les elements en ordre topologique avec positions
- Undo de movePoint : restaure l'element et la position, recompute les dependants
- Drag = une transaction (begin au pointerDown, commit au pointerUp)
- Ctrl+Z / Cmd+Z = undo, Ctrl+Shift+Z / Ctrl+Y = redo
- Ctrl+Z pendant un drag = annule le drag (pas de corruption d'historique)
- applyDelta marque seulement les elements affectes dirty (pas toute la figure)
- Tests : 24

### Decisions prises :

- Undo/redo dans Figure (pas dans le composant) — lie aux donnees, pas a l'UI
- `invertDelta` avec copie defensive de removedPositions
- `recordRemove` early return pour add-then-remove dans la meme transaction
- `discard` annule l'enregistrement mais pas les operations deja effectuees

## Ameliorations du composant GeometryCanvas

- **Viewport isometrique** : API `center` + `pixelsPerUnit` (comme apigeom/DGPad), viewport calcule depuis la taille du SVG. Toujours isometrique.
- **Pan** : espace + drag ou bouton milieu
- **Zoom** : molette centre sur le curseur (modifie pixelsPerUnit)
- **circleByPoint** : rayon calcule en espace SVG (pas juste scaleX)
- **CSS** : couleurs directes (pas de variables CSS Shadcn)
- **Accessibilite** : space key ignore sur les inputs, onPointerCancel, onWindowBlur

## Refactoring

- `Construction` renomme en `Figure` (partout)
- `CONSTRUCTION_STATE_VERSION` renomme en `FIGURE_STATE_VERSION`
- `isPointElement` inclut tous les types de points dependants (8 types au total)

## Demo page `/geometry-demo`

- Triangle equilateral avec 3 midpoints et 3 medianes
- Centre de gravite G (jaune, intersection des 2 medianes)
- Symetriques A' B' C' (violet) par rapport au centre draggable S
- Droite (AB) etendue aux bords du viewport
- Demi-droite (C vers M) etendue d'un cote
- Cercle par point (centre O, point R draggable)
- Pan (espace + drag), zoom (molette), undo/redo (Ctrl+Z/Ctrl+Y)
- Grille carree, axes visibles

## Phase 3E : Autres elements dependants (TERMINEE)

- `GeoRotatedPoint` — image par rotation (angle GeoValue, exact pour angles remarquables)
- `GeoTranslatedPoint` — image par translation (vecteur = 2 points, 3 parents distincts)
- `GeoDilatedPoint` — image par homothetie (facteur GeoValue)
- `GeoReflectedOverLine` — image par symetrie axiale (droite = 2 points, retourne null si degeneree)
- Factory methods avec validation : inputs point-like, ids distincts
- computePosition dispatch pour les 4 types, clear position quand parents absents
- Schemas Zod mis a jour pour les 4 nouveaux types
- `isPointElement` mis a jour pour les 4 nouveaux types
- Tests : 25

### Decisions prises :

- angle et factor sont des GeoValue intrinsiques a l'element (comme radius dans GeoCircleByRadius), pas dans le dependency graph
- createTranslatedPoint : les 3 ids doivent etre tous distincts
- createReflectedOverLine : linePoint1Id !== linePoint2Id (guard explicite)
- createRotatedPoint et createDilatedPoint : sourceId === centerId autorise (mathematiquement valide)

## Prochaines etapes

- Validation d'exercices (checks)
- Nombres dynamiques (distance, angle comme objets)
- Labels, export LaTeX

## Resume des tests

| Module                                       | Tests   |
| -------------------------------------------- | ------- |
| types/                                       | 64      |
| viewport/                                    | 8       |
| compute/                                     | 139     |
| graph/ (dep-graph + figure + undo + transfo) | 181     |
| rendering/                                   | 17      |
| geometry/ (intersections + transformations)  | 89      |
| interaction/                                 | 25      |
| integration/                                 | 18      |
| **Total geometry-core**                      | **522** |
| grapheur/ (non-regression)                   | 213     |
