# Geometry-core — Progression

> Derniere mise a jour : 2026-04-24

## Etat : Phases 1-5G terminees (DSL complet)

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
- **Grille adaptative** : pas auto selon zoom (progression 1-2-5), sous-grille optionnelle, graduations sur les axes

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
- Grille adaptative au zoom avec graduations sur les axes

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

## Phase 3F : Validation d'exercices (TERMINEE)

- `validation/checks.ts` — 8 predicats geometriques pour valider les exercices
- `checkPointAt` — tolerance circulaire (distance² < 1e-16)
- `checkCollinear` — determinant via produit vectoriel (geoIsZero)
- `checkDistance` — distance euclidienne (sqrt de distance²)
- `checkSameDistance` — comparaison distance² exacte (geoEqual, pas de sqrt)
- `checkParallel` — produit vectoriel nul, rejette elements identiques
- `checkPerpendicular` — produit scalaire nul
- `checkAngle` — float acos, tolerance 0.5°
- `checkPointOnCircle` — distance² vs rayon² (geoEqual)
- Messages en francais avec accents
- Tests : 71 (edge cases inclus)

### Decisions prises :

- Comparaison exacte (geoEqual/geoIsZero) quand possible, float seulement pour les angles (acos)
- checkSameDistance compare distance² (pas de sqrt, exactitude preservee)
- checkParallel rejette line1Id === line2Id (droites identiques != paralleles)
- checkAngle tolerance 0.5° (pragmatique pour les exercices)
- checkPointOnCircle supporte circleByRadius et circleByPoint

## Phase 4A : GeoStyle + FigureDefaults (TERMINEE)

- `GeoStyle` interface : color, opacity, strokeWidth, dash, pointShape, pointSize, fillColor, fillOpacity
- `FigureDefaults` sur le constructeur de Figure (defauts globaux)
- `resolveStyle()` fusionne style element > element.color > figure defaults > hardcoded
- 4 formes de points : dot, circle, cross, square
- Toutes les factory methods acceptent `style?: GeoStyle` dans options
- Schemas Zod avec validation (opacity 0-1, strokeWidth >= 0, etc.)
- Tests : 26 (figure-style + schemas)

## Phase 4B : GeoAngleMark (TERMINEE)

- `GeoAngleMark` : type 'angleMark', p1Id, vertexId, p2Id, arcCount (1|2|3), rightAngle
- `createAngleMark()` avec validation, cascade delete, undo/redo
- `angleMarkToSVG()` : arcs SVG (rayon fixe 25px) ou carre d'angle droit (14px)
- Arcs concentriques pour arcCount 2 et 3 (espacement 6px)
- Tests : 21

## Phase 4C : GeoSegmentMark (TERMINEE)

- `GeoSegmentMark` : type 'segmentMark', startId, endId, markCount (1|2|3)
- `createSegmentMark()` avec validation, cascade delete, undo/redo
- `segmentMarkToSVG()` : traits perpendiculaires au milieu du segment (18px, espacement 5px)
- Position = midpoint (recalcule au drag)
- Tests : 19

## Phase 4D : GeoMeasure (TERMINEE)

- `GeoMeasure` : type 'measure', measureType (distance|angle|area), targetIds, format (exact|approx|degrees|radians)
- `createMeasure()` avec validation (2 pts pour distance, 3 pour angle, 3+ pour area)
- `getMeasureValue()` retourne la valeur calculee, mise a jour au drag
- Calculs : distance euclidienne, angle via acos (degres), aire via shoelace
- `measureToSVG()` : texte positionne au milieu (distance), pres du sommet sur bissectrice (angle), centroide (area)
- Fond semi-transparent derriere le texte
- Tests : 24

## Phase 4E : Labels ameliores (TERMINEE)

- `labelOffset?: { dx, dy }` sur `GeoElementBase` pour repositionner les labels
- Schema Zod avec validation (finite numbers)
- `Figure.setLabelOffset(id, dx, dy)` avec delta undo
- Halo blanc via `stroke="white" stroke-width="3" paint-order="stroke"` pour lisibilite
- Toutes les factories acceptent `labelOffset` dans options

## Phase 4F : ElementPopover + interactions (TERMINEE)

- `ElementPopover.svelte` : popup de configuration au double-clic
- Contenu adapte au type : couleur (palette 8 couleurs), label, forme de point, style/epaisseur de trait
- `Figure.updateStyle(id, style)` et `Figure.updateLabel(id, label)` avec delta undo
- `findElementNear()` : hit-testing sur segments (distance au segment), droites, rayons, cercles (distance au contour)
- Angle marks et segment marks : detection par `ondblclick` SVG direct avec zone invisible 12px
- Hover sur tous les elements : epaississement + eclaircissement au survol, curseur pointeur
- `isPointElement()` etendu a tous les types de points (pas seulement freePoint/midpoint)
- Escape ou clic exterieur ferme le popover

## Export (TERMINE)

- `exportToTikZ(figure, viewport, options?)` — bloc `\begin{tikzpicture}...\end{tikzpicture}`
- `exportToTypst(figure, viewport, options?)` — bloc `#cetz.canvas({...})`
- `exportToSVG(figure, viewport, options?)` — SVG standalone statique
- Tous les types d'elements : points (4 formes), segments, droites, rayons, cercles, polygones, marques, mesures
- Options : scale, showGrid, showAxes, showLabels, showMeasures
- Review fixes : `\degree` → `^{\circ}`, XML escape, polygon support, float accumulation
- Tests : 130 (TikZ 63, Typst 35, SVG 74)

## Phase 5A : DSL Tokenizer (TERMINEE)

- `dsl/tokens.ts` — types de tokens (NUMBER, IDENTIFIER, KEYWORD, OPERATOR, etc.)
- `dsl/keywords.ts` — 28 mots-cles francais (point, milieu, segment, droite, cercle, symetrie, rotation, etc.)
- `dsl/tokenizer.ts` — tokenizer avec indentation Python-like (INDENT/DEDENT via stack)
- `dsl/types.ts` — types AST complets (DslProgram, DslExpr, DslStatement, 20+ node types)
- Tests : 37

## Phase 5B : DSL Parser (TERMINEE)

- `dsl/parser.ts` — recursive descent parser avec precedence d'operateurs (9 niveaux)
- `dsl/errors.ts` — DslParseError, DslRuntimeError avec position ligne:colonne
- Assignations : simples (`A = point(0, 0)`), indexees (`P[i] = ...`), destructurees (`(M, d) = ...`)
- Appels de fonctions : arguments positionnels + nommes (`cercle(O, rayon=3)`)
- Expressions : arithmetique, comparaisons, booleens (`et`, `ou`, `non`)
- Blocs : `macro`, `pour...de...a`, `pour...dans`, `si`/`sinon` avec indentation
- Tests : 40

## Phase 5C : DSL Interpreter (TERMINEE)

- `dsl/interpreter.ts` — parcourt l'AST et appelle les factory methods de Figure
- `dsl/symbol-table.ts` — table des symboles typee (nombre, point, segment, etc.) avec scopes
- `dsl/builtins.ts` — mapping 16 fonctions DSL → Figure API avec surcharge par arguments nommes
- Points, constructions, cercles (rayon/passant), transformations (symetrie centre/axe, rotation, translation, homothetie)
- Annotations (marque_angle, angle_droit, marque_segment, mesure)
- Boucles `pour...de...a` et `pour...dans` avec noms indexes P[i]
- Conditionnels `si`/`sinon`, accesseurs `A.x`/`A.y`
- Fonctions math : sqrt, abs, sin, cos, tan, asin, acos, atan (en degres)
- Conversion degres → radians pour les rotations
- Tests : 39

## Phase 5D : DSL Serializer (TERMINEE)

- `dsl/serializer.ts` — Figure → script DSL en ordre topologique
- Nommage inverse : labels → noms DSL, sinon auto-genere (\_pt1, \_seg2)
- Round-trip : script → Figure → script → Figure produit le meme resultat
- Tests : 28 (dont 6 round-trip)

## Prochaines etapes

## Phase 5E : DSL Macros (TERMINEE)

- `dsl/macro-registry.ts` — registre des macros, detection de recursion (profondeur max 10)
- Macros avec parametres optionnels (`macro f(a, b=0):`)
- Retour de valeurs : `retourne (M, d)` avec destructuration `(M, d) = mediatrice(A, B)`
- Portee lexicale : variables appelantes lisibles, assignations locales
- Macros composables : macro appelant d'autres macros (cercle_circonscrit → mediatrice)
- Fix : `a` et `de` retires des keywords (conflit avec noms de variables), traites comme identifiants contextuels dans `pour...de...a`
- Tests : 15

## Phase 5G : DSL Integration (TERMINEE)

- `dsl/index.ts` — API publique : `parseDsl()`, `interpretDsl()`, `serializeDsl()`, `runDsl()`
- Export depuis `geometry-core/index.ts`
- Tests integration : triangle, polygone, macros, annotations, round-trip, erreurs, exports
- Tests : 14

## Prochaines etapes

- Ameliorations techniques (responsive, touch/mobile)
- Labels draggables
- Integration UI (editeur de script dans l'app)

## Resume des tests

| Module                                      | Tests    |
| ------------------------------------------- | -------- |
| types/                                      | 75       |
| viewport/ (+ grid)                          | 20       |
| compute/                                    | 139      |
| graph/ (dep-graph + figure + undo + marks)  | 260      |
| rendering/ (svg-primitives + exports)       | 147      |
| geometry/ (intersections + transformations) | 89       |
| interaction/                                | 25       |
| validation/                                 | 71       |
| dsl/ (full pipeline + macros + integ)       | 173      |
| integration/                                | 18       |
| **Total geometry-core**                     | **1040** |
| grapheur/ (non-regression)                  | 213      |
