---
title: Architecture du module geometry-core
date: 2026-05-18
version: 1.0
audience: Developpeurs nouveaux dans la codebase et mainteneurs experimentes
---

# Reference d'architecture : module geometry-core

## Resume executif

Le module `geometry-core` (209 fichiers TS : 69 sources + 140 tests, 2 986 tests Vitest) est le moteur de geometrie 2D pedagogique d'UbuMaths. Il gere :

1. **Parsing & execution DSL** : langage de script francais (`point(2;3)`, `cercle(O;r)`, `courbe("x^2")`)
2. **Geometrie reactive** : integration Svelte 5 pour figures interactives
3. **Rendu** : sortie Canvas/SVG avec rendu croquis (Rough.js)
4. **Intersections & courbes** : courbes parametriques, polaires, quadratiques, implicites avec solveurs numeriques
5. **Interaction** : hit-testing, drag, snap, satisfaction de contraintes

Le module a des **frontieres strictes** :

- **A l'interieur** : tout le calcul geometrique, le DSL, la logique de rendu
- **A l'exterieur** : composants UI (`src/lib/components/geometry/`), gestion d'etat de l'editeur, persistance des feuilles de travail

---

## Vue d'ensemble du module

### Responsabilites principales

| Responsabilite             | Emplacement             | Classes/Fonctions cles               |
| -------------------------- | ----------------------- | ------------------------------------ |
| Systeme de types           | `types/`                | `GeoElement`, `GeoValue`, primitives |
| Graphe de dependances      | `graph/`                | `DependencyGraph`, `Figure`          |
| Arithmetique & calculs     | `compute/`, `geometry/` | `geoAdd`, `intersectLL`, `translate` |
| Execution DSL              | `dsl/`                  | `interpretDsl`, `builtins`           |
| Rendu                      | `rendering/`            | `svg-primitives`, `rough-geometry`   |
| Interaction                | `interaction/`          | `hit-testing`, `snap`                |
| Viewport & transformations | `viewport/`             | `CoordinateTransformer`, grille      |
| Validation                 | `validation/`           | Verifications geometriques           |

### Couches architecturales

```
┌─────────────────────────────────────────────┐
│  DSL Layer (dsl/)                           │
│  Parse & interpret French scripts           │
└──────────────┬──────────────────────────────┘
               │ Calls builtins.ts
┌──────────────▼──────────────────────────────┐
│  Figure API (graph/figure.ts)               │
│  Factory methods + dependency tracking      │
└──────────────┬──────────────────────────────┘
               │ Manages elements & deps
┌──────────────▼──────────────────────────────┐
│  Compute & Geometry (compute/, geometry/)   │
│  Position, intersections, transformations   │
└──────────────┬──────────────────────────────┘
               │ Uses types, renders
┌──────────────▼──────────────────────────────┐
│  Rendering & Interaction                    │
│  Canvas/SVG + hit-testing + snapping        │
└─────────────────────────────────────────────┘
```

---

## 9 sous-dossiers : cartographie detaillee

### 1. `types/` — Fondation du systeme de types

**Responsabilite** : definir tous les types d'elements geometriques, GeoValue (exact/numerique), schemas de serialisation.

**Fichiers cles** :

- `types/primitives.ts` : `Vec2`, `Radians`, `GeoPoint`, `Box`
- `types/geo-value.ts` : `GeoValue`, `GeoExact`, `GeoNumeric` — gere l'arithmetique exacte (fractions) vs numerique
- `types/elements.ts` (1 726 lignes) : union discriminee `GeoElement` — 90 declarations `Geo*` (40+ types d'elements concrets), 84 type guards :
  - Points : `GeoFreePoint`, `GeoComputedPoint`, `GeoMidpoint`, `GeoIntersectionLL`, `GeoIntersectionLC`, `GeoIntersectionCC`, `GeoReflectionPoint`, `GeoRotatedPoint`, `GeoTranslatedPoint`, `GeoProjectedPoint`
  - Lignes : `GeoSegment`, `GeoLine`, `GeoRay`
  - Courbes : `GeoFunction`, `GeoQuadraticCurve`, `GeoParametricCurve`, `GeoImplicitCurve`
  - Avances : `GeoTangentLine`, `GeoOsculatingCircle`, `GeoLocus`, `GeoTrace`, `GeoSlider`
  - Chacun possede `id`, `label`, `color`, `visible`, `dependsOn` (IDs parents)
- `types/schemas.ts` : schemas de serialisation Zod (`geoElementSchema`, `figureStateSchema`)
- `types/index.ts` (93 lignes) : hub d'export central

**Exports** : ~50 definitions de types, 20+ type guards (`isFreePoint`, `isCircle`, etc.), serialiseurs

**Dependances** : importe uniquement `mathAST` pour le type `MathNode`

**Conception critique** : chaque element est immuable et trace les IDs parents via `dependsOn: readonly string[]` — permet le recalcul pilote par les dependances.

---

### 2. `dsl/` — Parseur & interpreteur DSL

**Responsabilite** : parser les scripts DSL geometriques francais, interpreter l'AST pour produire une Figure. Mappe les appels de fonctions DSL aux methodes factory de Figure.

**Fichiers cles** (20 fichiers au total) :

- `dsl/parser.ts` : tokenize & parse le DSL → AST (descente recursive)
- `dsl/interpreter.ts` (1 120 lignes) : visiteur d'AST, appelle les builtins, gere la table des symboles. **Deux chemins d'evaluation** :
  1. **Chemin math-pur** : expressions purement mathematiques (sans tuple/acces propriete) → delegue a `mathAST` pour parsing + compilation
  2. **Chemin evaluateur DSL** : tout le reste (tuples, appels de fonctions, acces propriete) → logique d'interpreteur directe
  - **Deux modes** : statique (snapshot numerique) vs reactif (live `GeoScalar` avec deps)
- `dsl/builtins.ts` (3 425 lignes, dont un switch `_executeBuiltinInner` de 2 045 lignes — lignes 345 a 2389) : implemente les 60+ fonctions builtin :
  - Geometrie : `point`, `cercle`, `segment`, `droite`, `arc`, `polygone`
  - Intersections : `intersection`, `point_sur`
  - Courbes : `courbe` (auto-detecte ligne/fonction/conique/implicite), `tangente`, `derivee`, `integrale`
  - Transformations : `rotation`, `translation`, `symetrie`, `affinite`, `inversion`
  - Mesures : `distance`, `angle`, `longueur`, `courbure`, `aire`
  - Avancees : `lieu` (locus), `trace` (trace parametrique)
- `dsl/macro-registry.ts` : expansion de macros (definies par l'utilisateur & macros stdlib)
- `dsl/stdlib.ts` (197 lignes) : 20+ macros mathematiques (`mediatrice`, `hauteur`, `triangle_equilateral`, etc.)
- `dsl/types.ts` : types de noeuds AST (`DslProgram`, `DslStatement`, `DslExpr`)
- `dsl/tokenizer.ts`, `dsl/tokens.ts` : analyse lexicale
- `dsl/symbol-table.ts` : gestion des portees de variables/macros
- `dsl/domain-parser.ts` : parsing des restrictions de domaine (`sur [a,b]`)
- `dsl/piecewise-parser.ts` : syntaxe des fonctions par morceaux
- `dsl/keywords.ts`, `dsl/apply-angle-mode.ts`, `dsl/math-pure-expr.ts` : utilitaires

**Exports** (via `dsl/index.ts`) :

- `parseDsl(script: string): DslProgram`
- `interpretDsl(program, figure?): InterpretResult`
- `serializeDsl(figure, symbols?, options?): string`
- `runDsl(script, figure?, onDirective?): InterpretResult`

**Point d'entree critique** : `builtins.ts:executeBuiltin()` (ligne 285) — dispatcher pour les 60+ fonctions DSL

**Dependances** :

- **→ `graph/figure.ts`** : creation d'elements via les methodes factory de Figure
- **→ `mathAST`** : parse & compile les expressions mathematiques (courbes, fonctions)
- **→ `types/`** : types GeoElement

---

### 3. `graph/` — Gestion des dependances & API Figure

**Responsabilite** : tracer les dependances d'elements, calculer les positions, fournir l'API de mutation (addPoint, movePoint, recompute).

**Fichiers cles** :

- `graph/dependency-graph.ts` (173 lignes) : structure DAG centrale :

  - `parents: Map<id, parentIds>` (inverse = `children: Map<id, Set<childIds>>`)
  - `markDirty(id)` : marque en cascade les descendants
  - `topologicalSort(dirtyNodes)` : algorithme de Kahn (O(V+E))
  - `removeNode(id)` : suppression en cascade des descendants
  - Detection de cycles : auto-reference uniquement (cycles transitifs structurellement impossibles)

- `graph/figure.ts` (4585 lignes) : **classe API principale** :

  - **Etat** :
    - `elements: Map<id, GeoElement>` (elements immuables)
    - `positions: Map<id, GeoPoint>` (positions calculees)
    - `graph: DependencyGraph` (suivi parent-enfant)
    - `scalarValues: Map<id, number>` (cache slider/scalaire)
  - **Methodes factory** : `addFreePoint(pos, opts)`, `addCircleByRadius(center, radius)`, `addLine(p1, p2)`, `addIntersection(type, ...)`, `addFunction(equation)`, `addParametricCurve(xExpr, yExpr, tBounds)`, etc. (100+ methodes)
  - **API centrale** : `movePoint(id, newPos)`, `moveSlider(id, newValue)`, `recompute()`, `getPosition(id)`, `getElement(id)`, `deleteElements(ids)`
  - **Undo/Redo** : `beginTransaction()`, `commit()`, `undo()`, `redo()` (via UndoManager)
  - **Trace** : `tracePoints: Map<id, Point[]>` pour le rendu de locus/trail

- `graph/compute-position.ts` (1 308 lignes) : fonction pure `computePosition(element, getPosition): GeoPoint` :

  - Gere la derivation de position pour TOUS les 40+ types d'elements
  - Exemples : milieu = avg(p1, p2) ; intersection = solve(line1, line2) ; rotated = rotate(point, center, angle)
  - Appelle les calculs geometriques (intersections, transformations)
  - **Ligne 142** : dispatcher de calcul de position

- `graph/parametric-newton.ts` : solveur de la methode de Newton pour les courbes implicites (x=f(t), y=g(t))
- `graph/parametric-intersection.ts` : recherche d'intersections entre courbes parametriques (Gauss-Newton)
- `graph/parametric-calculus.ts` : longueur d'arc, courbure, cercle osculateur
- `graph/parametric-intersection-1d.ts` : recherche de racines 1D pour intersections de courbes
- `graph/conic-helpers.ts` : utilitaires de courbes quadratiques (classifier, trouver foyers, etc.)
- `graph/vector-components.ts` : algebre vectorielle
- `graph/compute-locus.ts` : calcul de trace (locus parametrique)
- `graph/undo-redo.ts` : gestionnaire de transactions avec suivi de delta

**Exports** (via `graph/index.ts`) :

- classe `Figure`, `DependencyGraph`
- `computePosition`, `topologicalSort`
- interfaces Undo/Redo

**Flux critique** :

1. `figure.addXxx(...)` → `graph.addNode(id, parentIds)` + `elements.set(id, el)` + `undo_manager.record()`
2. `figure.movePoint(id, newPos)` → `positions.set(id, newPos)` + `markDirty(id)` + `recompute()`
3. `figure.recompute()` → `topologicalSort(dirtySet)` → pour chaque noeud dans l'ordre : `computePosition(el, getPosition)` → `positions.set(id, newPos)`

**Dependances** :

- **→ `types/elements.ts`** : definitions GeoElement
- **→ `compute/`, `geometry/`** : calculs de positions
- **← Appele par `dsl/interpreter.ts` & `dsl/builtins.ts`**

---

### 4. `compute/` — Operations numeriques

**Responsabilite** : arithmetique sur `GeoValue` (exact/numerique), conversions de types.

**Fichiers cles** :

- `compute/geo-arithmetic.ts` : `geoAdd`, `geoSub`, `geoMul`, `geoDiv`, `geoSqrt` — preserve l'exactitude quand possible (arithmetique sur Fraction)
- `compute/to-number.ts` : convertit `GeoValue | Vec2` → `number`, gere NaN/Infinity
- `compute/compare.ts` : `geoEqual`, `geoLessThan`, `geoIsZero`, `geoApproxEqual` — comparaison avec tolerance
- `compute/index.ts` : hub d'export central (5 exports)

**Exports** : 8 fonctions pour l'arithmetique sur GeoValue

**Dependances** : uniquement `types/geo-value.ts`

**Role** : couche arithmetique de bas niveau — utilisee par les builtins et les operations geometriques.

---

### 5. `geometry/` — Calculs geometriques

**Responsabilite** : intersections, transformations, predicats (collineaires, perpendiculaires, etc.).

**Fichiers cles** :

- `geometry/intersections.ts` : predicats centraux :

  - `intersectLL(line1, line2): GeoPoint | null` — intersection ligne-ligne (gere le parallele)
  - `intersectLC(line, circle, index: 0|1): GeoPoint | null` — ligne-cercle (0-2 points)
  - `intersectCC(c1, c2, index: 0|1): GeoPoint | null` — cercle-cercle (0-2 points)
  - **NON IMPLEMENTE** : `intersectLQ` (ligne-quadratique), `intersectQQ` (quadratique-quadratique) — calcules dans `dsl/builtins.ts` via solveur implicite

- `geometry/transformations.ts` :

  - `translate(point, vector): GeoPoint`
  - `rotate(point, center, angle): GeoPoint`
  - `reflectPoint(point, line): GeoPoint`
  - `reflectOverLine(point, line): GeoPoint` (alias)
  - `dilate(point, center, scale): GeoPoint`

- `geometry/affine-transform.ts` : operations de matrice affine 2x3 (rotation, mise a l'echelle, cisaillement)
- `geometry/conic-properties.ts` : proprietes de courbes quadratiques (foyers, directrice, excentricite)
- `geometry/conic-classify.ts` : classifier une conique (ellipse, hyperbole, parabole, degeneree)
- `geometry/circumcircle.ts` : cercle passant par 3 points

**Exports** (via `geometry/index.ts`) : 5 fonctions

**Dependances** :

- **→ `types/primitives.ts`** : GeoPoint, Vec2
- **← Appele par `graph/compute-position.ts` & `dsl/builtins.ts`**

---

### 6. `rendering/` — Sortie Canvas/SVG

**Responsabilite** : convertir les objets geometriques en primitives visuelles (chemins SVG, commandes canvas). Supporter le rendu normal et croquis (rough).

**Fichiers cles** :

- `rendering/svg-primitives.ts` (2 544 lignes) : definitions de types & convertisseurs :

  - `PointSVG`, `LineSVG`, `CircleSVG`, `ArcSVG`, `AngleMarkSVG`, `SegmentMarkSVG`, `TextSVG`
  - `pointToSVG()`, `lineToSVG()`, `circleToSVG()`, etc. — retournent chemin `d` & stylisation
  - `resolveStyle(element, defaults)` : fusionne styles d'element + globaux

- `rendering/bezier.ts` (414 lignes) : conversion spline Catmull-Rom vers Bezier pour courbes lisses

  - `curveToSVGPath(points): svgPath`
  - `catmullRomToBezier(points): bezierSegments`
  - `createMathToSVGTransformer(viewport)` : factory de transformation de coordonnees

- `rendering/rough-geometry.ts` (229 lignes) : rendu croquis via Rough.js

  - `roughLine()`, `roughCircle()`, `roughPolygon()` — utilisent la lib rough pour effet dessine a la main
  - `styleToRoughOptions()` : extrait les parametres de rugosite de GeoStyle
  - `seedFromId(id)` : seed deterministe pour la reproductibilite
  - `shouldRenderRough()` : verifie si l'element demande un rendu rough

- `rendering/export-svg.ts` : figure complete → fichier SVG
- `rendering/export-tikz.ts` : format LaTeX TikZ
- `rendering/export-typst.ts` : balisage Typst
- `rendering/colors.ts` : palette de couleurs, validation hex, logique next-color
- `rendering/marching-squares.ts` : rasterisation de courbes implicites (recherche de contour)

**Exports** (via `rendering/index.ts`) : types + 30+ fonctions pour SVG/rough/export

**Fonctions critiques** :

- `pointToSVG(point, viewport, style)` — utilisee par l'editeur pour dessiner des points
- `circleToSVG(circle, viewport, style)` — dessiner les cercles
- `roughLine(x1, y1, x2, y2, options)` — effet croquis

**Dependances** :

- **→ `types/elements.ts`, `types/primitives.ts`** : definitions geometriques
- **→ `viewport/`** : transformations de coordonnees
- **→ Externe** : librairie `rough` (paquet npm)

---

### 7. `interaction/` — Drag, snap, hit-testing

**Responsabilite** : interaction utilisateur — trouver les objets au curseur, snapper sur grille/points, valider les contraintes de drag.

**Fichiers cles** :

- `interaction/hit-testing.ts` (300+ lignes) : trouver l'element selectionnable proche de la souris :

  - `findPointNear(cursor, elements, viewport, tolerance)` : point le plus proche dans le seuil
  - `findElementNear(cursor, elements, viewport, tolerance)` : tout element (point, ligne, cercle)
  - Utilise des verifications de bounding-box puis un calcul de distance precis

- `interaction/snap.ts` : snapping grille/point :

  - `snapToGrid(point, gridStep)` : arrondit a la grille la plus proche
  - `snapToPoint(point, target, tolerance)` : snap a un autre point si dans la distance

- `interaction/index.ts` : hub d'export (2 fonctions)

**Dependances** :

- **→ `types/elements.ts`, `viewport/`** : geometrie & transformations viewport
- **← Appele par** : composant editeur `src/lib/components/geometry/`

---

### 8. `validation/` — Verifications geometriques

**Responsabilite** : valider les proprietes geometriques (colinearite, perpendicularite, contraintes angulaires).

**Fichiers cles** :

- `validation/checks.ts` (316 lignes) :

  - `checkPointAt(point, target, tolerance)` — le point est-il pres de la cible ?
  - `checkCollinear(p1, p2, p3, tolerance)` — les 3 points sont-ils colineaires ?
  - `checkDistance(p1, p2, expectedDist, tolerance)` — contrainte de distance
  - `checkAngle(p1, vertex, p2, expectedAngle)` — angle entre rayons
  - `checkPointOnCircle(point, circle, tolerance)` — verification d'incidence
  - `checkParallel(line1, line2, tolerance)` — parallelisme
  - `checkPerpendicular(line1, line2, tolerance)` — perpendicularite

- `validation/index.ts` : hub d'export

**Type** : `CheckResult = { valid: boolean; error?: string; actual?: number; expected?: number }`

**Cas d'usage** : notation de feuilles de travail, validation de contraintes

**Dependances** :

- **→ `types/elements.ts`, `geometry/`** : definitions d'elements, predicats d'intersection

---

### 9. `viewport/` — Systeme de coordonnees & transformations

**Responsabilite** : mapping math→ecran, calcul de grille, pan/zoom du viewport.

**Fichiers cles** :

- `viewport/types.ts` : types centraux :

  - `Viewport = { centerX, centerY, pixelsPerUnit }` — transformation espace math → ecran
  - `Point = { x, y }` (coordonnees ecran)
  - `ViewportMetrics = { ...bornes math, ...bornes ecran }`

- `viewport/viewport.ts` (245 lignes) : operations principales :

  - `createTransformer(viewport): CoordinateTransformer` — retourne `mathToScreen(geoPoint)`, `screenToMath(screenPoint)`
  - `panViewport(viewport, deltaScreen): Viewport` — translation du centre
  - `zoomViewport(viewport, factor, screenCenter): Viewport` — mise a l'echelle pixelsPerUnit
  - `resetViewport(): Viewport` — defaut : `centerX=0, centerY=0, pixelsPerUnit=50`
  - `fitViewport(elements, padding): Viewport` — auto-cadrage
  - `clampViewport(viewport, bounds)` — contraint pan/zoom

- `viewport/grid.ts` : calcul du pas de grille pour un espacement de graduations raisonnable

**Exports** (via `viewport/index.ts`) : 10 fonctions + types

**Critique** : `CoordinateTransformer` est une paire de fonctions sans etat — passee aux fonctions de rendu pour les coordonnees ecran.

**Dependances** : uniquement `types/`

---

## Flux de donnees : du DSL au pixel

### Pipeline etape par etape

```
1. USER WRITES SCRIPT
   "point(2; 3)
    cercle(O; 1)
    M = milieu(O, A)"

2. TOKENIZE & PARSE (dsl/tokenizer.ts + dsl/parser.ts)
   DslProgram {
     statements: [
       FunctionCall("point", [2, 3]),
       FunctionCall("cercle", ["O", 1]),
       Assignment("M", FunctionCall("milieu", ["O", "A"]))
     ]
   }

3. INTERPRET (dsl/interpreter.ts + dsl/builtins.ts)
   Figure {
     elements: {
       "p_1": GeoFreePoint { id:"p_1", position:{x:2, y:3} },
       "c_2": GeoCircle { id:"c_2", center:"p_1", radius:1 },
       "m_3": GeoMidpoint { id:"m_3", point1Id:"p_1", point2Id:"p_2" }
     },
     graph: DependencyGraph { "p_1": [], "c_2": ["p_1"], "m_3": ["p_1","p_2"] }
   }

4. COMPUTE POSITIONS (graph/compute-position.ts)
   positions = {
     "p_1": {x:2, y:3},
     "c_2": (circle is not a point, skipped),
     "m_3": {x: (x₁+x₂)/2, y: (y₁+y₂)/2}
   }
   Triggered by figure.recompute() after each add.

5. CREATE VIEWPORT TRANSFORMER (viewport/viewport.ts)
   transformer = createTransformer(viewport)
   Example: viewport.pixelsPerUnit = 50, centerX = 0, centerY = 0
   transformer.mathToScreen({x:2, y:3}) → {x: 100, y: -150} (Y-inverted)

6. RENDER TO SVG (rendering/svg-primitives.ts + rough-geometry.ts)
   For each element in topological order:
   - GeoFreePoint "p_1": pointToSVG({x:2,y:3}, transformer, style)
     → <circle cx="100" cy="-150" r="4" ... />
   - GeoCircle "c_2": circleToSVG({x:2,y:3}, radius=1, transformer, style)
     → <circle cx="100" cy="-150" r="50" ... /> (50px = 1 unit at 50px/unit)

7. EXPORT OR DISPLAY
   Either:
   a) Render to <svg> in DOM (editor component calls figure.getPosition())
   b) Export to SVG/TikZ/Typst file
   c) Display in canvas (rough rendering path)
```

### Fonctions cles traversees

```
parseDsl()
  → tokenizer.ts:tokenize()
  → parser.ts:parse()
  → DslProgram ✓

interpretDsl(program, figure)
  → interpreter.ts:interpret()
    → for each statement:
      → executeBuiltin(name, args, figure, symbols)
      → builtins.ts:_executeBuiltinInner(...)
        → figure.addFreePoint() / addCircle() / etc.
        → Figure.ts:addNode(id, parentIds)
        → graph.addNode() ✓
  → figure.recompute()
    → graph.topologicalSort(dirtySet)
    → compute-position.ts:computePosition() for each ✓
  → Figure ✓

renderToSVG(figure, viewport)
  → for each element:
    → getPosition(id) → positions.get(id)
    → svg-primitives.ts:pointToSVG() / circleToSVG() / etc.
      → viewport.createTransformer()
      → CoordinateTransformer.mathToScreen()
      → SVG markup ✓
```

---

## Systeme de types & relations entre elements

### Hierarchie des elements

```
GeoElement (discriminated union)
├── Point Elements (40+ constructors)
│   ├── GeoFreePoint: user-dragged position
│   ├── GeoComputedPoint: xParam + yParam (ScalarParam = number | GeoScalar)
│   ├── GeoMidpoint: (p1, p2) — dependsOn: [p1Id, p2Id]
│   ├── GeoIntersectionLL: (line1, line2) — 2D root find
│   ├── GeoIntersectionLC: (line, circle, index) — 0-2 points
│   ├── GeoIntersectionCC: (circle1, circle2, index) — 0-2 points
│   ├── GeoIntersectionLQ: (line, quadratic, index) — conic intersection
│   ├── GeoIntersectionQQ: (conic1, conic2, index) — up to 4 points
│   ├── GeoIntersectionLF: (line, function, index) — y=mx+b ∩ y=f(x)
│   ├── GeoIntersectionFF: (func1, func2, index) — y=f(x) ∩ y=g(x)
│   ├── GeoIntersectionParametric: curve ∩ (line | circle | function | segment | ray)
│   ├── GeoReflectedPoint: reflect(point, mirror-point or line)
│   ├── GeoRotatedPoint: rotate(point, center, angle)
│   ├── GeoTranslatedPoint: translate(point, vector)
│   ├── GeoProjectedPoint: orthogonal projection onto line
│   ├── GeoAffinityPoint: shear transformation
│   ├── GeoInvertedPoint: inversion wrt circle
│   ├── GeoPointOnCurve: point on y=f(x) — draggable with parameter
│   ├── GeoPointOnQuadraticCurve: point on conic — parameter t
│   ├── GeoPointOnParametricCurve: point on (x=f(t), y=g(t))
│   └── ... 10 more point types
│
├── Line-like Elements
│   ├── GeoSegment: (p1, p2)
│   ├── GeoLine: (p1, p2)
│   ├── GeoRay: (origin, direction-point)
│   └── GeoLineByCoefficients: ax + by + c = 0
│
├── Circular Elements
│   ├── GeoCircle (base type, not instantiated directly)
│   ├── GeoCircleByRadius: (center, radius)
│   ├── GeoCircleByPoint: (center, point-on-circle)
│   ├── GeoCircleBy3Points: (p1, p2, p3)
│   ├── GeoArc: base
│   │   ├── GeoArcByAngles: (center, radius, θ₁, θ₂)
│   │   └── GeoArcByPoints: (center, p1, p2)
│   ├── GeoSector: (center, p1, p2) — filled wedge
│   ├── GeoAnnulus: (center, r_inner, r_outer)
│   └── GeoPolygon: [p1, p2, ..., pₙ]
│
├── Curve Elements
│   ├── GeoFunction: {equation, domain, compiled}
│   │   └── GeoFunctionDomain: [a, b] or (-∞, b] etc.
│   ├── GeoQuadraticCurve: ax² + bxy + cy² + dx + ey + f = 0
│   ├── GeoParametricCurve: (x=f(t), y=g(t), [tMin, tMax])
│   ├── GeoImplicitCurve: F(x,y)=0 (marching squares rasterization)
│   └── GeoConicPolar: polar conic r = L/(1 + e·cos(θ-ω))
│
├── Derived Elements
│   ├── GeoTangentLine: tangent(point-on-curve)
│   ├── GeoTangentParametric: tangent to parametric curve
│   ├── GeoOsculatingCircle: osculating circle (radius = 1/curvature)
│   ├── GeoTangentVector: velocity vector on curve
│   └── GeoVectorByPoints: (p1, p2) — from p1 to p2
│
├── Scalar/Measurement Elements
│   ├── GeoSlider: interactive number [min, max, value]
│   ├── GeoScalar: {formula, deps} — live-computed number
│   └── GeoTrace: trail of point as parameter varies
│
└── Annotation Elements
    ├── GeoText: static text
    ├── GeoMathText: LaTeX math
    ├── GeoRichText: formatted text
    ├── GeoImage: embedded image
    ├── GeoAngle: first-class angle object (V1/V2/V3a)
    │     - V1 : angle(A, V, B) → objet visible avec arc, marque/kind/orientation/showLabel/unite/arcRadiusPx
    │     - V2 : overloads angle(u, v), angle(seg, seg), angle(d, d), arcSpacingPx, cache mesure par unité
    │     - V3a : transporte(α, V', dir) builtin + fill du secteur + chorégraphie bissectrice(α)
    │     - A2 : drag réactif des overloads (TranslatedPointByVector + IntersectionLL)
    │     - A2.x : drag réactif cas free vector (GeoFreeVectorPoint)
    │     - A1 : chorégraphie transporte @euclide animée (Euclide I.23)
    ├── GeoFreeVectorPoint: point dérivé d'un free vector (anchor ou end), réactif (A2.x)
    └── GeoSegmentMark: perpendicular/parallel mark
```

### Suivi des dependances

Chaque element non libre declare `dependsOn: readonly string[]` — IDs des elements parents.

**Exemples** :

- `GeoMidpoint { dependsOn: ["p_1", "p_2"] }` — depend de 2 points
- `GeoIntersectionLC { dependsOn: ["line_5", "circle_3"] }` — depend de ligne & cercle
- `GeoFunction { dependsOn: [] }` — aucune dependance (equation statique)
- `GeoPointOnCurve { dependsOn: ["curve_id"] }` — depend de la courbe

**Implication** : quand un parent bouge, tous les dependants deviennent "dirty" et doivent recalculer.

---

## Modele de reactivite

### Integration des runes Svelte 5

La classe `Figure` n'est **PAS** un store Svelte mais fonctionne avec les runes :

**Composant editeur** (`src/lib/components/geometry/`) :

```javascript
let $state figure = createFigure();  // Svelte 5 state
let positions = $derived.by(() => {
  figure.recompute();  // Trigger computation
  return Array.from(figure.getPositions());  // Read cache
});
```

Quand l'utilisateur drag un point :

1. Le composant Svelte appelle `figure.movePoint(id, newPos)` ✓
2. Figure marque les noeuds dependants dirty
3. Le composant appelle `figure.recompute()` ✓
4. Figure recalcule les noeuds dirty en ordre topologique
5. Le composant re-derive les positions
6. SVG est re-rendu

### Reactivite des scalaires

Les elements `GeoScalar` (sliders, scalaires calcules) utilisent un systeme a deux niveaux :

**Niveau 1 : interpreteur DSL** (dsl/interpreter.ts)

- Trace quels operandes sont des refs scalaires (par ex. `point(slider_1.value, 5)`)
- Cree des elements `GeoScalar` pour les expressions live
- Stocke la reference a l'ID du slider parent

**Niveau 2 : Figure.recompute()**

- Met en cache les valeurs scalaires dans `scalarValues: Map<id, number>`
- Sur `moveSlider(id, newValue)`, met a jour le cache
- Recalcule tous les dependants

**Exemple** :

```
A = slider(1, 10, 5)
B = point(A, 0)
```

- `A` est `GeoSlider { id:"A", value:5 }`
- `B` est `GeoComputedPoint { xParam: {type:"scalar", id:"A"}, yParam: {type:"number", value:0} }`
- Bouger le slider met a jour `scalarValues["A"] = 7`
- `computePosition(B)` lit `scalarValues["A"]` → x=7

### Couplage bidirectionnel

Certains elements maintiennent une **dependance inverse** :

- Drag d'un `GeoPointOnCurve` met a jour son parametre `t`
- Drag de la courbe met a jour la position du point (gere via le marquage dirty)

Ce n'est PAS automatique — le composant editeur le gere via des handlers explicites.

---

## Points d'entree

### Pour les consommateurs (composants)

1. **Creer une figure** (une seule fois) :

   ```typescript
   import { Figure } from 'geometry-core';
   const figure = new Figure();
   ```

2. **Ajouter des elements via DSL** :

   ```typescript
   import { runDsl } from 'geometry-core';
   const { figure } = runDsl('A = point(2; 3)\nB = cercle(A; 1)', figure);
   ```

3. **Ou utiliser directement l'API Figure** :

   ```typescript
   figure.addFreePoint({ x: 2, y: 3 }, { label: 'A' });
   figure.addCircleByRadius('A', 1, { label: 'c' });
   ```

4. **Interroger l'etat** :

   ```typescript
   const pos = figure.getPosition('A'); // {x: 2, y: 3}
   const circle = figure.getElement('c'); // GeoCircle
   const elements = figure.getElements(); // Map<id, GeoElement>
   ```

5. **Recalculer apres modifications** :

   ```typescript
   figure.movePoint('A', { x: 3, y: 4 });
   figure.recompute(); // Update all positions
   ```

6. **Rendre** :
   ```typescript
   import { pointToSVG, circleToSVG, createTransformer } from 'geometry-core/rendering';
   const transformer = createTransformer(viewport);
   const svg = pointToSVG(figure.getPosition('A'), transformer, style);
   ```

### Du point de vue de l'interpreteur DSL

Le DSL est une **couche de commodite** au-dessus de l'API Figure. Ses builtins mappent directement aux methodes Figure :

| DSL                          | Methode Figure                                               |
| ---------------------------- | ------------------------------------------------------------ |
| `point(x, y)`                | `figure.addFreePoint({x, y})`                                |
| `cercle(O, r)`               | `figure.addCircleByRadius(O_id, r_value)`                    |
| `intersection(line1, line2)` | `figure.addIntersectionLL(l1_id, l2_id)`                     |
| `droite(P, Q)`               | `figure.addLine(p_id, q_id)`                                 |
| `courbe("x^2")`              | `figure.addFunction("x^2")` (auto-detecte le type)           |
| `point_sur(curve, t)`        | `figure.addPointOnCurve(curve_id, {type:"number", value:t})` |

**Toute l'execution DSL passe par** : `dsl/interpreter.ts:interpret()` → `dsl/builtins.ts:executeBuiltin()` → `Figure.add*()`.

---

## Limites architecturales connues & zones experimentales

### Zones matures

✓ **Geometrie des lignes** : points libres/derives, segments, lignes, rayons, intersections (LL, LC, CC)
✓ **Cercles** : par rayon, par point, par 3 points, arcs, secteurs, anneaux
✓ **Courbes parametriques** : x=f(t), y=g(t), longueur d'arc, courbure, cercle osculateur
✓ **Courbes polaires** : r=f(θ), tangentes, intersections
✓ **Transformations** : translation, rotation, reflexion, mise a l'echelle, affinite, inversion
✓ **Fonctions** : y=f(x), par morceaux, restriction de domaine, derivees, integrales
✓ **Graphe de dependances** : detection de cycles, tri topologique, undo/redo
✓ **DSL** : ~60 builtins, macros, reactivite scalaire
✓ **Rendu** : export SVG, TikZ, Typst, croquis (Rough.js)

### Zones experimentales / heuristiques

⚠ **Intersections de coniques** (LQ, QQ) : implementees dans `builtins.ts` mais utilise marching-squares comme fallback pour les cas limites
⚠ **Courbes implicites** : marching-squares base sur grille (detection de discontinuite a la resolution de la grille)
⚠ **Intersections parametriques** : utilise un solveur Gauss-Newton (convergence non garantie)
⚠ **Tangente aux courbes quadratiques** : solution analytique existante mais cas limites (tangente depuis l'interieur de la conique) a valider
⚠ **Fonctions par morceaux** : differentiabilite aux frontieres geree via CAS ; warnings de singularite mais pas rigoureux

### Hors perimetre

✗ **Geometrie 3D** : 2D uniquement
✗ **Algebre symbolique** : utilise `mathAST` pour le parsing ; pas de CAS pour la derivation symbolique
✗ **Resolution de contraintes** : pas de propagation de contraintes (drag → mark dirty → recompute, non bidirectionnel)
✗ **Animation** : figure statique par frame ; animation geree par le composant consommateur
✗ **Persistance** : la serialisation existe (types/schemas.ts) mais l'etat de figure est ephemere en memoire

---

## Conventions de codage & patterns

### Conventions de nommage

| Pattern         | Signification              | Exemples                                    |
| --------------- | -------------------------- | ------------------------------------------- |
| `GeoXxx`        | Type d'element geometrique | `GeoPoint`, `GeoCircle`, `GeoCurve`         |
| `addXxx()`      | Methode factory de Figure  | `addFreePoint()`, `addCircle()`             |
| `isXxx()`       | Type guard                 | `isFreePoint()`, `isCircle()`               |
| `computeXxx()`  | Fonction de calcul pure    | `computePosition()`, `curvature()`          |
| `findXxx()`     | Recherche/selection        | `findPointNear()`, `intersectLL()`          |
| `buildXxx()`    | Helper de construction     | `buildParametricCurve()` (dans builtins.ts) |
| `xxxToXxx()`    | Conversion                 | `vec2ToPoint()`, `curveToSVGPath()`         |
| `validateXxx()` | Validation                 | `checkPointAt()`, `checkCollinear()`        |

### Nommage des fichiers

- **Classes** : PascalCase, exemple `Figure.ts`, `DependencyGraph.ts`
- **Fonctions & types** : camelCase, exemple `computePosition.ts`, `svg-primitives.ts`
- **Enums/constantes** : UPPER_CASE, exemple `BUILTIN_NAMES`, `DEFAULT_VIEWPORT`

### Immutabilite

Tous les objets `GeoElement` sont **readonly** — pas de mutation apres creation :

```typescript
readonly type: 'freePoint';
readonly position: GeoPoint;
readonly dependsOn: readonly string[];
```

Les mises a jour creent de **nouveaux elements** via les methodes de Figure, enregistres dans le delta undo.

### Declaration des dependances

Chaque element non racine declare **toutes** ses dependances :

```typescript
type GeoMidpoint = GeoElementBase & {
	type: 'midpoint';
	point1Id: string;
	point2Id: string;
	dependsOn: readonly [string, string]; // Always matches [point1Id, point2Id]
};
```

**Invariant** : `dependsOn` doit etre **complet** — oublier une dependance brise la propagation dirty.

### Ajouter un nouvel element geometrique

**Checklist** :

1. Definir le type dans `types/elements.ts` avec `dependsOn` et toutes les proprietes
2. Ajouter un type guard dans `types/elements.ts` : `export function isXxx(el): el is GeoXxx { ... }`
3. Ajouter le calcul de position dans `graph/compute-position.ts` : nouveau case dans `computePosition()`
4. Ajouter la methode factory de Figure dans `graph/figure.ts` : `addXxx(...): string { ... }`
5. Si rendu SVG, ajouter dans `rendering/svg-primitives.ts` : fonction `xxxToSVG()`
6. Ajouter le builtin DSL dans `dsl/builtins.ts` : nouveau case dans `_executeBuiltinInner()`
7. Ajouter les tests dans les repertoires `__tests__/`

**Exemple** : pour ajouter `GeoNewElement` :

```typescript
// types/elements.ts
export interface GeoNewElement extends GeoElementBase {
  readonly type: 'newElement';
  readonly parentId: string;
  readonly dependsOn: readonly [string];
}

export function isNewElement(el: GeoElement): el is GeoNewElement {
  return el.type === 'newElement';
}

// graph/compute-position.ts
if (isNewElement(el)) {
  const parentPos = getPosition(el.parentId);
  return compute(parentPos);  // Custom logic
}

// graph/figure.ts
addNewElement(parentId: string, opts?: ElementOptions): string {
  const id = this.generateId('new');
  const el: GeoNewElement = {
    id, type: 'newElement', parentId, dependsOn: [parentId],
    color: opts?.color ?? this.defaults.color ?? 'black',
    visible: opts?.visible ?? true, label: opts?.label
  };
  this.graph.addNode(id, [parentId]);
  this.elements.set(id, el);
  this.markDirty(id);
  return id;
}

// dsl/builtins.ts — in _executeBuiltinInner():
case 'newFunction':
  return { type: 'element', elementType: 'newElement', figureId: figure.addNewElement(...) };
```

### Pattern de fonction builtin

Toutes les fonctions DSL suivent cette signature dans `builtins.ts` :

```typescript
case 'functionName': {
  const [arg1, arg2] = args;

  // Resolve arguments
  const resolved1 = resolveArg(arg1);

  // Validate
  const elemId = requireElement(resolved1, 'arg1', line);

  // Compute or delegate
  const resultId = figure.addNewElement(elemId);

  // Return
  return { type: 'element', elementType: 'newElement', figureId: resultId };
}
```

---

## Integration avec les composants Svelte

Le module est **agnostique au framework** au coeur mais concu pour l'integration Svelte :

### Depuis `src/lib/components/geometry/GeometryEditor.svelte` :

1. **Import** :

   ```typescript
   import { Figure, runDsl, createTransformer } from '$lib/geometry-core';
   ```

2. **Etat** :

   ```typescript
   let $state figure = new Figure();
   let $state viewport = { centerX: 0, centerY: 0, pixelsPerUnit: 50 };
   ```

3. **A l'execution du script** :

   ```typescript
   const result = runDsl(scriptText, figure);
   figure = result.figure;
   ```

4. **Lors du drag d'un point** :

   ```typescript
   function onMouseMove(event) {
   	const screenPos = { x: event.clientX, y: event.clientY };
   	const mathPos = screenToMath(screenPos); // Transform
   	figure.movePoint(selectedPointId, mathPos);
   	figure.recompute();
   }
   ```

5. **Rendu** :
   ```typescript
   const positions = $derived.by(() => {
   	figure.recompute();
   	return new Map([...figure.getElements()].map(([id, el]) => [id, figure.getPosition(id)]));
   });
   ```

**Cle** : le composant gere l'interaction (drag, zoom, pan) ; geometry-core gere les maths.

---

## Architecture des tests

**Emplacement** : 140+ fichiers de tests dans les sous-repertoires `__tests__/`

**Structure** :

- `types/__tests__/` : serialisation des types, arithmetique GeoValue
- `compute/__tests__/` : operations numeriques
- `geometry/__tests__/` : intersections, transformations
- `graph/__tests__/` : graphe de dependances, API Figure, calcul de positions
- `dsl/__tests__/` : parser, interpreteur, builtins
- `rendering/__tests__/` : primitives SVG, exports
- `interaction/__tests__/` : hit-testing, snapping
- `validation/__tests__/` : verifications geometriques
- `viewport/__tests__/` : transformations de coordonnees
- `__tests__/integration.test.ts` : pipeline end-to-end DSL → rendu

**Couverture** : les chemins de calcul centraux (intersections, transformations) sont bien testes ; certains cas limites de rendu le sont moins.

---

## Pour aller plus loin

Ce document couvre l'**architecture haut niveau**. Pour des plongees plus profondes :

- **Qualite du code & patterns** : voir `docs/ref/geometry/code-quality.md` (standards, linting, reviews)
- **Strategie de tests** : voir `docs/ref/geometry/tests.md` (organisation des tests, fixtures, cas limites)
- **Tuning de performance** : voir `docs/ref/geometry/performance.md` (profiling, caching, opportunites d'optimisation)
- **Considerations de securite** : voir `docs/ref/geometry/security.md` (validation d'entree, injection, limites de ressources)

**Contexte historique** : voir `docs/wip/geometry/dsl-mathast-routing-progress.md` et `docs/wip/geometry/parametric-curves-v1-progress.md` pour l'evolution du DSL et de la gestion des courbes parametriques.

---

## Reference rapide : chemins de fichiers cles

### Systeme de types

- `src/lib/geometry-core/types/elements.ts:1-650` — Toutes les 40+ variantes de GeoElement
- `src/lib/geometry-core/types/geo-value.ts` — GeoValue (exact/numerique)
- `src/lib/geometry-core/types/primitives.ts` — Vec2, GeoPoint, Radians

### Graphe & dependances

- `src/lib/geometry-core/graph/dependency-graph.ts:1-250` — Classe DependencyGraph
- `src/lib/geometry-core/graph/figure.ts:252-400` — Classe Figure, methodes factory
- `src/lib/geometry-core/graph/compute-position.ts:1-100` — Dispatcher de calcul de position

### DSL

- `src/lib/geometry-core/dsl/interpreter.ts:1-100` — Point d'entree principal de l'interpreteur
- `src/lib/geometry-core/dsl/builtins.ts:285-350` — Dispatcher executeBuiltin
- `src/lib/geometry-core/dsl/builtins.ts:2392-2455` — Registre BUILTIN_NAMES
- `src/lib/geometry-core/dsl/stdlib.ts:8-150` — Macros predefinies

### Rendu

- `src/lib/geometry-core/rendering/svg-primitives.ts:1-100` — Types de convertisseurs SVG
- `src/lib/geometry-core/rendering/rough-geometry.ts` — Rendu croquis
- `src/lib/geometry-core/rendering/bezier.ts` — Spline vers chemin SVG

### Interaction & validation

- `src/lib/geometry-core/interaction/hit-testing.ts` — Selection point/element
- `src/lib/geometry-core/validation/checks.ts` — Validation geometrique
- `src/lib/geometry-core/viewport/viewport.ts` — Transformations de coordonnees

---

**Derniere mise a jour** : 2026-05-18 | **Version** : 1.0 | **Auteur** : Analyse architecturale
