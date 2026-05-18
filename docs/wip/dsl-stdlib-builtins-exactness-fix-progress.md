# Fix exactness + dynamism in stdlib builtins (post-migration)

> Session : 2026-05-19
> Statut : **LIVRÉ** (2 commits + 1 test file)
>
> Le 1er commit (`200fd892c`) rétablissait la **dynamique** (drag-propagation) via les factories. Le 2ᵉ commit complète la **propagation d'exactitude** à travers le pipeline DSL → arithmétique → factories.

## Contexte

La migration `dsl/stdlib.ts` → builtins TypeScript (6 commits, `2f85f5677` … `e87b7ef40`) avait introduit **deux régressions** :

1. **Perte d'exactitude** — chaque handler extrayait les coordonnées via `geoToNumber(pos.x)` puis recréait les sous-produits via `figure.createFreePoint({ x: numeric(Cx), y: numeric(Cy) })`. La propagation `GeoValue` exacte (cf. `compute/geo-arithmetic.ts` et `geometry/transformations.ts`) était totalement contournée. Un script comme `B = point(2·sqrt(3), 0)` aurait dû produire un milieu exact `sqrt(3)` ; on obtenait `1.7320508…` numérique.

2. **Perte de dynamique** — `createFreePoint` produit un **point libre statique**. Si l'utilisateur dragait A, le centre du cercle circonscrit ne suivait plus, le 3ᵉ sommet du triangle équilatéral non plus, etc. La cascade de dépendances dans le graphe était cassée.

Symptôme côté `/construction-demo` : tout marche en initial, mais le drag ne propage rien aux objets dérivés.

## Diagnostic

Le module geometry-core fournit **deux familles d'API** :

- **Faîte numérique brute** : `createFreePoint({ x: numeric(N), y: numeric(N) })` → point STATIQUE, kind `numeric`. À utiliser uniquement pour les points-utilisateur draggables.
- **Factories dérivés** : `createMidpoint(p1, p2)`, `createRotatedPoint(p, c, angle)`, `createTranslatedPoint(p, v1, v2)`, `createDilatedPoint(p, c, factor)`, `createReflectedPoint(p, c)`, `createIntersectionLL(l1, l2)`, `createIntersectionLC(l, c, k)`, `createComputedPoint(xParam, yParam)` — tous enregistrent leurs sources dans `dependsOn` et passent par `compute-position.ts` à chaque recompute, **avec arithmétique exacte préservée** (`geoAdd/geoSub/geoMul/geoDiv/geoSqrt`).

La migration utilisait systématiquement la 1ʳᵉ famille pour des points qui auraient dû être dérivés. Fix : passer aux factories.

## Fix livré

**Helpers ajoutés** dans `dsl/builtins.ts` (section "Stdlib builtins") :

- `exactPiFraction(num, denom)` — construit `exact((num/denom)·π)` pour les angles remarquables (π/2, π/3, 2π/n).
- Constantes `PI_OVER_2`, `PI_OVER_3`, `NEG_PI_OVER_2`.
- `createHiddenMidpoint(figure, aId, bId)`
- `createHiddenRotatedPoint(figure, sourceId, centerId, angle)`
- `createHiddenTranslatedPoint(figure, sourceId, vStartId, vEndId)`
- `createHiddenLine(figure, aId, bId)`
- `createHiddenIntersectionLL(figure, l1Id, l2Id)`
- `buildPerpendicularBisector(figure, aId, bId)` — médiatrice dynamique
- `buildAltitudeFromA(figure, aId, bId, cId)` — hauteur dynamique
- `buildAngularBisector(figure, aId, vId, bId)` — bissectrice dynamique (construction au compas)

**Helper supprimé** :

- `createHiddenPoint(figure, x, y)` — était une enveloppe `createFreePoint(numeric, numeric, hidden)`, source de la régression. Plus aucun handler ne l'utilise.

**Handlers révisés** (23 sur 23) :

| Builtin                | Stratégie de fix                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mediatrice`           | `createMidpoint` + `createRotatedPoint(A, M, π/2)`                                                                                                              |
| `perpendiculaire`      | `createTranslatedPoint(P, A, B)` → Q, puis `createRotatedPoint(Q, P, π/2)`                                                                                      |
| `parallele`            | `createTranslatedPoint(P, A, B)` → Q                                                                                                                            |
| `mediane`              | `createMidpoint(B, C)`                                                                                                                                          |
| `bissectrice`          | Compass : `createScalarDistance` × 2 → `createScalarExpression` (ratio) → `createDilatedPoint` → `createMidpoint`                                               |
| `triangle`             | `createPolygon` direct (déjà OK)                                                                                                                                |
| `triangle_equilateral` | `createRotatedPoint(B, A, π/3)` (angle exact → vertex exact)                                                                                                    |
| `triangle_isocele`     | `createMidpoint(A, B)` + `createRotatedPoint(M, A, rad)`                                                                                                        |
| `triangle_rectangle`   | `createRotatedPoint(B, A, rad)` + `createAngleMark(rightAngle)`                                                                                                 |
| `parallelogramme`      | `createTranslatedPoint(A, B, C)` → D                                                                                                                            |
| `rectangle`            | `createRotatedPoint(B, A, π/2)` + `createScalarDistance` + `createScalarExpression` (ratio) + `createDilatedPoint`                                              |
| `carre`                | `createRotatedPoint(A, B, π/2)` + `createRotatedPoint(B, A, -π/2)`                                                                                              |
| `losange`              | `createRotatedPoint(A, B, rad)` + `createTranslatedPoint(C, B, A)`                                                                                              |
| `polygone_regulier`    | `createScalarCoordinate` ×2 + `createScalarExpression` (Ox+r) + `createComputedPoint` → P[0], puis `createRotatedPoint` ×(n-1) avec angle exact `2πi/n`         |
| `etoile`               | Idem polygone_regulier + indexation par saut                                                                                                                    |
| `corde`                | `createIntersectionLC` × 2 (déjà OK avant — confirmation)                                                                                                       |
| `cercle_circonscrit`   | `buildPerpendicularBisector` × 2 + `createIntersectionLL` → O, puis `createCircleByPoint`                                                                       |
| `cercle_inscrit`       | `buildAngularBisector` × 2 + `createIntersectionLL` → I, puis `createScalarDistancePointLine(I, AB)` → r, puis `createCircleByRadius`                           |
| `cercle_euler`         | circumcenter (mediatrices) + orthocenter (altitudes) + `createMidpoint(O, H)` → E, puis `createScalarExpression(R/2)` → demi-rayon, puis `createCircleByRadius` |
| `centre_gravite`       | `createMidpoint(B, C)` + `createDilatedPoint(M, A, 2/3)`                                                                                                        |
| `orthocentre`          | `buildAltitudeFromA` × 2 + `createIntersectionLL`                                                                                                               |
| `hauteur`              | `createTranslatedPoint(A, B, C)` + `createRotatedPoint(Q, A, π/2)`                                                                                              |
| `droite_euler`         | centroid (via dilatation) + orthocenter (intersection altitudes) + `createLine`                                                                                 |

## Vérification

**Nouveau fichier de tests TDD** : `dsl/__tests__/builtins-exactness-dynamism.test.ts` (13 tests).

- 3 tests de correction numérique sur des coords avec `sqrt(3)` exactes (mediatrice, triangle_equilateral, parallelogramme).
- 10 tests de drag : on bouge un point libre, on appelle `figure.recompute()`, on vérifie que les positions dérivées suivent (mediatrice, mediane, triangle_equilateral, parallelogramme, rectangle, cercle_circonscrit, polygone_regulier, centre_gravite, orthocentre, cercle_inscrit).

**Résultats** :

- Tests TDD : 13/13 ✓
- Tests stdlib originaux (`stdlib.test.ts`) : 56/56 ✓ (aucun ajustement nécessaire)
- Suite DSL complète : 1692/1692 ✓ (86 fichiers)
- Suite geometry-core complète : 3064/3064 ✓ (148 fichiers, 2 skipped)
- ESLint clean
- `pnpm check:incremental` : 9 errors / 46 warnings (baseline préexistante stable)

## 2ᵉ commit : exactitude bout-en-bout dans le pipeline DSL

Le 1er commit corrigeait la dynamique des dérivés mais l'exactitude restait perdue parce que :

1. **Le DSL convertissait tout en `numeric`** : `tryEvaluateAsMathExpr` retournait `{type: 'nombre', value: fn(staticBindings)}` même pour des nodes symboliques comme `2*sqrt(3)`. L'AST exact était jeté.
2. **`toGeoValue(nombre)` utilisait `numeric(val.value)`** : même pour des entiers comme `0`, le résultat était `{kind: 'numeric', value: 0}`. Donc `point(0, 0)` était numeric.
3. **`binaryOp` dégradait `exact + numeric → numeric`** : pour préserver l'exactitude on a besoin que `geoAdd(numeric(0), exact(sqrt(3)))` reste exact.

**Contrat architectural correct** (établi cette session) :

- `GeoValue` est **exact par défaut**. Le kind `numeric` existe **uniquement pour le drag** (pointer events qui émettent des flottants depuis les pixels écran).
- `point(0, 0)`, `point(2, 3)`, `point(2*sqrt(3), 0)` : tous exact.
- Drag d'un point libre par souris : `figure.movePoint(id, numeric(3.5), numeric(2.7))` produit numeric.
- `exact ⊕ exact` → exact
- `exact ⊕ (numeric entier)` → exact (entier lifté en `NumberNode`)
- `exact ⊕ (numeric non-entier)` → numeric (préserve la sémantique de drag)

### Modifications

**`dsl/interpreter.ts`** :

- `tryEvaluateAsMathExpr` static path : si le node contient `MathConstant` (π, e) ou `Function` (sqrt, cos, sin, …) après `simplifyExact`, retourne `{type: 'geoValue', value: exact(node)}`. Sinon retourne `nombre` (rétro-compat avec les builtins qui font `pos[i].type === 'nombre'` pour brancher).
- `toGeoValue(nombre)` : utilise `geoFromNumber(val.value)` qui produit `exact(numericNode(n))` pour les entiers, `numeric(n)` pour les flottants. C'est la clé qui rend `point(0, 0)` exact.
- Helper `nodeHasSymbolicContent(node)` : walk le node via `findNodes` pour détecter constantes/fonctions symboliques.
- `substitute` sur les `staticBindings` pour résoudre les free vars avant le test symbolique. Try/catch pour les bindings non-finis (Infinity dans le test `inf`).

**`compute/geo-arithmetic.ts`** :

- `binaryOp` (utilisé par `geoAdd/Sub/Mul`) et `geoDiv` : nouveau cas — si un opérande est exact et l'autre est un numeric ENTIER, le numeric est lifté en `NumberNode` et l'opération reste exacte. Pour les non-entiers (floats), on garde le path numeric (sinon `simplifyExact` génère des NumberNode à 17 chiffres).

**`dsl/builtins.ts:resolveAndValidateBounds`** : validation `t_min < t_max` utilise `geoToNumber` peu importe le kind (avant : ne déclenchait que pour `kind === 'numeric'`). Sinon le check était silencieusement ignoré pour les bornes exact.

**`dsl/builtins.ts:requireNumber`** : accepte maintenant `geoValue` et convertit via `geoToNumber` (au lieu de throw).

### Tests mis à jour (contrat changé)

5 fichiers de tests vérifiaient l'ancien contrat "exact + numeric = numeric" — mis à jour pour le nouveau contrat :

- `compute/__tests__/geo-arithmetic.test.ts` : section "exact + integer-numeric = exact (integer lifted)", + 2 cas float restant numeric.
- `geometry/__tests__/transformations.test.ts` : `translate`, `rotate`, `dilate` avec mix exact+integer → exact.
- `graph/__tests__/figure-dependent-points.test.ts` : drag tests utilisent maintenant des floats (3.4, -5.2) plutôt que des entiers.
- `graph/__tests__/figure.test.ts` : `midpoint of float-numeric parent is numeric`.
- `dsl/__tests__/courbe-{parametric,polar}.test.ts` : assertions `toEqual(numeric(0))` remplacées par `geoToNumber(...).toBe(0)` (entier devient exact).
- `dsl/__tests__/scalar-dsl.test.ts` : assertions `pos.x.kind === 'numeric' ? pos.x.value : 0` remplacées par `geoToNumber(pos.x)`.

### Tests ajoutés

`builtins-exactness-dynamism.test.ts` : nouveau test `point(2*sqrt(3), 0) produces an exact FreePoint` + 3 tests `kind === 'exact'` sur les sous-produits (mediatrice, parallelogramme, etc.).

### Résultats

- Tests d'exactitude + dynamism : **14/14 ✓**
- Suite geometry-core : **3069/3069 ✓** (148 fichiers, 0 régression)
- Suite consommateurs (constructions-v2, grapheur) : **351/351 ✓**
- ESLint clean
- `pnpm check:incremental` : 9 errors / 46 warnings (baseline stable)

### Exemple bout-en-bout

```
A = point(0, 0)           → A.x.kind === 'exact', A.x.node = NumberNode(0)
B = point(2*sqrt(3), 0)   → B.x.kind === 'exact', B.x.node = 2*sqrt(3)
M = milieu(A, B)          → M.x.kind === 'exact', M.x = sqrt(3) (simplifié)
t = triangle_equilateral(A, B)
                          → 3rd vertex C.y.kind === 'exact', C.y = sqrt(3)
```

## Fichiers modifiés

| Fichier                                                                   | Modification                               |
| ------------------------------------------------------------------------- | ------------------------------------------ |
| `src/lib/geometry-core/dsl/builtins.ts`                                   | +315 / −158 (23 handlers révisés, helpers) |
| `src/lib/geometry-core/dsl/__tests__/builtins-exactness-dynamism.test.ts` | +263 (nouveau, 13 tests TDD)               |
| `docs/wip/dsl-stdlib-builtins-exactness-fix-progress.md`                  | nouveau (ce doc)                           |
