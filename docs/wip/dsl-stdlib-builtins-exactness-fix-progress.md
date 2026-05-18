# Fix exactness + dynamism in stdlib builtins (post-migration)

> Session : 2026-05-19
> Statut : **LIVRÉ** (3 commits + 1 test file)
>
> - Commit 1 (`200fd892c`) : rétablit la **dynamique** (drag-propagation) via les factory methods.
> - Commit 2 (`4ffe79c6b`) : propage l'**exactitude** pour les entiers (`point(0, 0)` exact, lift integer dans binaryOp).
> - Commit 3 (ce commit) : **toute valeur DSL finie est exacte** — décimaux (`2.5`), rationnels (`1/3`), symboliques (`sqrt(3)`). Le `numeric` reste exclusivement pour le drag (pointer events à coords arbitraires) et pour `1/0 → Infinity` (IEEE 754).

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

## 3ᵉ commit : exactitude universelle pour les valeurs DSL finies

Après le 2ᵉ commit, l'exactitude était préservée pour les entiers (via lift dans `binaryOp`) mais perdue pour les décimaux (`point(2.5, 3)` produisait `numeric(2.5)`). Cause racine : `geoFromNumber(2.5)` voyait `Number.isInteger(2.5) === false` et tombait sur `numeric(2.5)`, par optimisation défensive contre les float JS imprécis (commentaire "avoids 17-digit MathNode explosion").

Cette optimisation était cohérente pour les valeurs venant d'un drag (où la précision est arbitraire) mais s'appliquait à tort aux **littéraux DSL** où l'utilisateur écrit `2.5` (string), parsé en float `2.5` (exactement représentable), reconverti via `numericNode(value.toString()) = number("2.5")` proprement.

### Modifications

**`dsl/interpreter.ts:toGeoValue`** : passe de `geoFromNumber(val.value)` à `exact(numericNode(val.value))`. Tout littéral DSL devient exact, peu importe entier ou non-entier. Le seul cas où ça se dégrade : valeur non-finie (Infinity, NaN) — voir `tryEvaluateAsMathExpr` ci-dessous.

**`dsl/interpreter.ts:tryEvaluateAsMathExpr`** : simplifié. Au lieu de tester `nodeHasSymbolicContent`, retourne maintenant **toujours** `geoValue exact` après `simplifyExact`. Le helper `nodeHasSymbolicContent` est supprimé (avec ses imports `findNodes`, `isMathConstant`, `isFunction`, `isNumber`).

**Exception IEEE 754** : si `value = fn(staticBindings)` est non-finie (`1/0 → Infinity`, `0/0 → NaN`), on garde le path `nombre` au lieu de produire un `exact(division(1, 0))` qui évaluerait NaN via `geoToNumber`. Ça préserve les idioms DSL existants (`integrale(f, -inf, inf)`, divergent integrals, etc.).

**`dsl/builtins.ts`** : 4 branches `pos[i].type === 'nombre'` (dans `image`, `texte`, `rtexte`, `mtexte`) passent à `isNumericLikeArg(pos[i])` qui accepte `nombre || geoValue`. La valeur est extraite via `requireNumber` (qui gère déjà les deux types depuis le 2ᵉ commit). 8 casts brutaux `(named.get('dx')! as { type: 'nombre'; value: number }).value` remplacés par `requireNumber(named.get('dx')!, 'dx', line)` (touchait `dx`/`dy` des images dans 4 endroits).

**`dsl/area-builtin-helper.ts:resolveBoundParam`** : accepte maintenant les `geoValue` (pour `aire(f, -1, 1)`, `integrale(f, 0, 1)`, etc.) et les convertit via `geoToNumber`. Avant, ces builtins refusaient les arguments DSL exacts.

### Tests ajoutés

- `point(0, 0)` → exact (cas entier)
- `point(2.5, 3)` → exact (cas décimal)
- `point(1/3, 0)` → exact (cas rationnel)
- `point(2*sqrt(3), 0)` → exact (cas symbolique)

### Tests mis à jour

- `courbe-polar.test.ts G1` : `expect(pc.tMin).toEqual(numeric(-π))` → `geoToNumber(pc.tMin).toBeCloseTo(-π)` (-π est désormais exact).

### Résultats

- Suite geometry-core + consumers : **3423/3423 ✓** (159 fichiers, 0 régression)
- ESLint clean
- `pnpm check:incremental` : 9 errors / 46 warnings (baseline préexistante)

### Réponse à "pourquoi pas dès le début ?"

L'historique de `compute/geo-arithmetic.ts` montre que le contrat **exact-par-défaut** existait au niveau de l'arithmétique (`geoAdd/Sub/Mul/Div` ont toujours su propager exact). Mais le DSL avait été conçu indépendamment avec un design **"nombre par défaut"** :

1. Le parser DSL parsait `2` ou `2.5` en `{kind: 'number', value: 2.5}` puis l'évaluateur produisait `{type: 'nombre', value}` partout.
2. `toGeoValue(nombre)` wrappait via `numeric(value)`.
3. `tryEvaluateAsMathExpr` (ajouté plus tard pour le routing mathAST réactif) jetait l'AST exact pour retourner un number.

Les deux mondes ne se rejoignaient jamais : l'utilisateur DSL n'avait pas accès au mode exact, et le mode exact n'était utilisable que via l'API `Figure` directe.

Ce 3ᵉ commit unifie les deux : **tout littéral DSL fini est exact**. Le `numeric` reste pour ce qui est intrinsèquement approximé (positions de drag pixel, `1/0 → Infinity`).

## Fichiers modifiés

| Fichier                                                                   | Modification                               |
| ------------------------------------------------------------------------- | ------------------------------------------ |
| `src/lib/geometry-core/dsl/builtins.ts`                                   | +315 / −158 (23 handlers révisés, helpers) |
| `src/lib/geometry-core/dsl/__tests__/builtins-exactness-dynamism.test.ts` | +263 (nouveau, 13 tests TDD)               |
| `docs/wip/dsl-stdlib-builtins-exactness-fix-progress.md`                  | nouveau (ce doc)                           |
