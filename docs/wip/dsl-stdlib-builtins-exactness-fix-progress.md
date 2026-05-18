# Fix exactness + dynamism in stdlib builtins (post-migration)

> Session : 2026-05-19
> Statut : **LIVRÉ** (1 commit + 1 test file)

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

## Note sur l'exactitude

L'exactitude `kind === 'exact'` n'est préservée que si les sources sont exactes. Or le DSL actuel évalue `point(2·sqrt(3), 0)` en **numérique** (parser/evaluator converti en number avant d'atteindre `toGeoValue`). Donc même avec le fix, un point DSL a `kind: 'numeric'` et tous ses dérivés aussi.

Cela ne remet pas en cause le fix : à l'instant où le DSL préservera l'exactitude des expressions symboliques saisies (autre chantier), les nouveaux builtins propageront automatiquement l'exactitude à tous leurs dérivés, sans modification. C'est le but architectural de cette correction.

Les tests de correction numérique de cette session valident la **propagation correcte des valeurs** indépendamment du kind.

## Fichiers modifiés

| Fichier                                                                   | Modification                               |
| ------------------------------------------------------------------------- | ------------------------------------------ |
| `src/lib/geometry-core/dsl/builtins.ts`                                   | +315 / −158 (23 handlers révisés, helpers) |
| `src/lib/geometry-core/dsl/__tests__/builtins-exactness-dynamism.test.ts` | +263 (nouveau, 13 tests TDD)               |
| `docs/wip/dsl-stdlib-builtins-exactness-fix-progress.md`                  | nouveau (ce doc)                           |
