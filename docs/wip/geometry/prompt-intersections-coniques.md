# Prompt : Intersections droite-conique (LQ) et conique-conique (QQ)

## Contexte

Le module `geometry-core` supporte les intersections LL, LC et CC dans le DSL via `intersection(obj1, obj2, index)`. Il manque les intersections avec les coniques (`GeoQuadraticCurve`) : droite-conique (LQ, 0-2 points) et conique-conique (QQ, 0-4 points).

Les coniques sont stockées avec 6 coefficients numériques `[A, B, C, D, E, F]` pour `Ax² + Bxy + Cy² + Dx + Ey + F = 0` et un type classifié (`circle`, `ellipse`, `hyperbola`, `parabola`, `degenerate`).

Le `SymbolType` des coniques dans le DSL est `'courbe'`. C'est le même type pour `GeoFunction`, `GeoQuadraticCurve` et `GeoImplicitCurve`. Le dispatch dans `intersection()` devra donc regarder le `GeoElement.type` réel via `figure.getElementById()`, pas juste le `symbolType`.

## Architecture existante (à suivre comme modèle)

L'implémentation LC/CC récente suit cette pipeline exacte — la reproduire pour LQ/QQ :

### 1. Géométrie pure (`src/lib/geometry-core/geometry/intersections.ts`)

Fonctions existantes :

- `intersectLL(p1, p2, p3, p4) → GeoPoint | null`
- `intersectLC(lineP1, lineP2, center, radius) → GeoPoint[] | null`
- `intersectCC(center1, radius1, center2, radius2) → GeoPoint[] | null`

Toutes utilisent l'arithmétique exacte `GeoValue` via `geoAdd`, `geoSub`, `geoMul`, `geoDiv`, `geoSqrt`, `geoOpposite`, `geoFromNumber` de `compute/geo-arithmetic.ts`.

**À ajouter :**

```typescript
// Droite-conique : substituer la paramétrique de la droite dans Ax²+Bxy+Cy²+Dx+Ey+F=0
// Donne at² + bt + c = 0 (quadratique en t), donc 0-2 solutions
export function intersectLQ(
	lineP1: GeoPoint,
	lineP2: GeoPoint,
	coeffs: readonly [number, number, number, number, number, number]
): GeoPoint[] | null;

// Conique-conique : système de degré 4, retourne 0-4 points
export function intersectQQ(
	coeffs1: readonly [number, number, number, number, number, number],
	coeffs2: readonly [number, number, number, number, number, number]
): GeoPoint[] | null;
```

**Méthode pour LQ :**
La droite est P(t) = P1 + t*(P2-P1), soit x = x1 + t*dx, y = y1 + t\*dy.
Substituer dans Ax² + Bxy + Cy² + Dx + Ey + F = 0 donne :

- `a = A*dx² + B*dx*dy + C*dy²`
- `b = 2*A*x1*dx + B*(x1*dy + y1*dx) + 2*C*y1*dy + D*dx + E*dy`
- `c = A*x1² + B*x1*y1 + C*y1² + D*x1 + E*y1 + F`

Résoudre at² + bt + c = 0. Note : les coefficients de la conique sont numériques (`number[]`), pas des `GeoValue`. On peut travailler en `number` ici (contrairement à LC qui utilise `GeoValue`). Retourner des `GeoPoint` avec `numeric()`.

**Méthode pour QQ :**
Approche recommandée — **pencil de coniques** :

1. Former la combinaison linéaire `Q1 + λ*Q2 = 0` et trouver λ tel que le déterminant 3×3 de la matrice conique s'annule (polynôme de degré 3 en λ)
2. Pour ce λ, la conique `Q1 + λ*Q2` est dégénérée (produit de 2 droites)
3. Factoriser cette conique dégénérée en 2 droites
4. Intersecter chaque droite avec Q1 via `intersectLQ`
5. Retourne 0 à 4 points (dédupliqués)

Alternative plus simple : **élimination par résultant**.

1. Exprimer Q1 et Q2 comme polynômes en y à coefficients en x
2. Calculer le résultant (Sylvester) → polynôme de degré 4 en x
3. Trouver les racines numériquement (companion matrix eigenvalues ou Newton)
4. Pour chaque x, résoudre Q1(x, y) = 0 (quadratique en y)

L'approche par résultant est plus robuste numériquement. Utiliser des `number` (pas `GeoValue`) car les coefficients des coniques sont déjà numériques.

### 2. Types (`src/lib/geometry-core/types/elements.ts`)

Ajouter après `GeoIntersectionCC` :

```typescript
/** Intersection of a line-like element and a quadratic curve. Index (0|1) selects which point.
 *  Internal index is 0-based; DSL uses 1-based (1 or 2). */
export interface GeoIntersectionLQ extends GeoElementBase {
	readonly type: 'intersectionLQ';
	readonly lineId: string;
	readonly curveId: string;
	readonly index: 0 | 1;
	readonly dependsOn: readonly [string, string];
}

/** Intersection of two quadratic curves. Index (0|1|2|3) selects which of up to 4 points.
 *  Internal index is 0-based; DSL uses 1-based (1 to 4). */
export interface GeoIntersectionQQ extends GeoElementBase {
	readonly type: 'intersectionQQ';
	readonly curve1Id: string;
	readonly curve2Id: string;
	readonly index: 0 | 1 | 2 | 3;
	readonly dependsOn: readonly [string, string];
}
```

Mettre à jour : `GeoPointElement`, `GeoElement`, `isPointElement()`, ajouter `isIntersectionLQ()`, `isIntersectionQQ()`.

### 3. Schemas Zod (`src/lib/geometry-core/types/schemas.ts`)

Ajouter `intersectionLQSchema` et `intersectionQQSchema` après `intersectionCCSchema`. Le champ `index` de QQ est `z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])`.

### 4. Figure factory (`src/lib/geometry-core/graph/figure.ts`)

Ajouter `createIntersectionLQ(lineId, curveId, index, options?)` et `createIntersectionCC(curve1Id, curve2Id, index, options?)`.

Validation : `isLineLike(el)` pour la droite, `el.type === 'quadraticCurve'` pour la conique. Il n'y a pas de type guard `isQuadraticCurve` existant — en ajouter un ou utiliser le check direct.

**Note** : il existe `isQuadraticCurve` à la ligne 802 de elements.ts :

```typescript
export function isQuadraticCurve(el: GeoElement): el is GeoQuadraticCurve {
	return el.type === 'quadraticCurve';
}
```

### 5. Compute position (`src/lib/geometry-core/graph/compute-position.ts`)

Ajouter un helper `getConicCoefficients(curveId, elements)` qui retourne les coefficients `[A,B,C,D,E,F]` depuis un `GeoQuadraticCurve`. Note : les coefficients peuvent changer si la conique a un `transformRecipe` — dans ce cas ils sont recalculés à chaque recompute. Vérifier que `el.coefficients` est toujours à jour au moment de la lecture.

Ajouter `computeIntersectionLQPos()` et `computeIntersectionQQPos()` et les brancher dans `computeElementPosition()`.

### 6. DSL builtins (`src/lib/geometry-core/dsl/builtins.ts`)

Le `case 'intersection'` actuel (lignes 720-764) dispatche sur `elementType` (`'droite'`/`'segment'`/`'demidroite'` vs `'cercle'`). Pour les coniques, le `symbolType` est `'courbe'` — mais `'courbe'` couvre aussi `GeoFunction` et `GeoImplicitCurve`. Il faut donc :

1. Détecter `elementType === 'courbe'`
2. Récupérer l'élément réel via `figure.getElementById(id)`
3. Vérifier que `el.type === 'quadraticCurve'`
4. Si c'est un `GeoFunction` ou `GeoImplicitCurve`, lancer une erreur (non supporté)

Nouveau dispatch :

- `isLineType + isLineType` → LL
- `isLineType + isCircleType` → LC (swap auto)
- `isCircleType + isCircleType` → CC
- **`isLineType + isConicType` → LQ (swap auto)**
- **`isConicType + isConicType` → QQ**
- **`isConicType + isCircleType` → ?** — un cercle EST une conique. Option : convertir le cercle en coefficients `[1, 0, 1, -2cx, -2cy, cx²+cy²-r²]` et appeler QQ. Ou traiter CC comme cas spécial (plus précis). **Recommandé : garder CC pour cercle-cercle, utiliser QQ seulement pour conique non-cercle.**

Validation de l'index :

- LQ : `1 ≤ index ≤ 2`
- QQ : `1 ≤ index ≤ 4`

Le `case 'intersection'` doit accepter un 3ème argument optionnel allant de 1 à 4 (au lieu de 1 à 2 actuellement). Mettre à jour la validation.

### 7. Serializer (`src/lib/geometry-core/dsl/serializer.ts`)

Ajouter `case 'intersectionLQ'` et `case 'intersectionQQ'` dans `serializeElement()` et `typePrefix()`.

### 8. Tests

**Fichier géométrie** : `src/lib/geometry-core/geometry/__tests__/intersections-conic.test.ts`

- LQ : droite coupant un cercle (vérifier cohérence avec LC), ellipse, hyperbole, parabole
- LQ : tangente à une ellipse (1 point), droite extérieure (null)
- QQ : cercle-ellipse, ellipse-ellipse, cercle-hyperbole, ellipse-parabole
- QQ : coniques tangentes (3 points ou moins), disjointes (null)

**Fichier DSL** : `src/lib/geometry-core/dsl/__tests__/intersection-lq-qq.test.ts`

- `intersection(droite, conique, 1)` avec conique créée par `courbe("x^2/4 + y^2/9 - 1 = 0")`
- `intersection(conique1, conique2, 1)` pour cercle-ellipse
- Swap auto : `intersection(conique, droite, 1)`
- Sérialisation roundtrip
- Réactivité (déplacer points de la droite)
- Erreurs : `intersection(courbe_f(x), cercle)` doit rejeter les non-coniques
- Index 1-4 pour QQ, index >4 erreur

**Fichier demo** : ajouter 2 sections dans `src/routes/(public)/geometry-demo/+page.svelte`

- LQ : droite coupant une ellipse (2 points d'intersection draggables)
- QQ : cercle et ellipse s'intersectant (4 points)

## Données clés

### Fichiers à modifier

| Fichier                                           | Action                                 |
| ------------------------------------------------- | -------------------------------------- |
| `src/lib/geometry-core/geometry/intersections.ts` | +`intersectLQ`, +`intersectQQ`         |
| `src/lib/geometry-core/types/elements.ts`         | +2 interfaces, unions, guards          |
| `src/lib/geometry-core/types/schemas.ts`          | +2 schemas Zod                         |
| `src/lib/geometry-core/graph/figure.ts`           | +2 factory methods                     |
| `src/lib/geometry-core/graph/compute-position.ts` | +helper, +2 handlers                   |
| `src/lib/geometry-core/dsl/builtins.ts`           | extend dispatch + index validation 1-4 |
| `src/lib/geometry-core/dsl/serializer.ts`         | +2 cases                               |
| `src/routes/(public)/geometry-demo/+page.svelte`  | +2 sections demo                       |

### Fonctions existantes à réutiliser

- `intersectLC` (pour LQ quand la conique est un cercle, et pour la factorisation dans QQ)
- `geoFromNumber`, `numeric` pour convertir `number → GeoValue`
- `isLineLike()`, `isQuadraticCurve()` pour les guards
- `getLineLikePoints()` dans compute-position.ts
- Pattern exact de `createIntersectionLC/CC` pour les factory methods
- `extractQuadraticCombination` dans builtins.ts (pour comprendre comment les coniques sont créées)

### Coefficients d'une conique

```typescript
// GeoQuadraticCurve.coefficients = [A, B, C, D, E, F]
// Représente: Ax² + Bxy + Cy² + Dx + Ey + F = 0

// Cercle centré en (h,k) rayon r :
// [1, 0, 1, -2h, -2k, h²+k²-r²]

// Ellipse x²/a² + y²/b² = 1 :
// [1/a², 0, 1/b², 0, 0, -1]  ou [b², 0, a², 0, 0, -a²b²]
```

### Coniques avec transformRecipe

Certaines coniques sont créées par transformation (`transforme(rot, ellipse)`) et ont un `transformRecipe`. Leurs coefficients sont recalculés quand les points de la transformation bougent. Il faut lire `el.coefficients` au moment du compute, pas le cacher.

## Workflow TDD

1. Proposer les comportements en français, attendre validation
2. Écrire les tests (doivent échouer)
3. Implémenter `intersectLQ` et `intersectQQ` dans `intersections.ts` avec tests géométrie pure
4. Ajouter types, schemas, figure, compute-position
5. Ajouter le dispatch DSL et le serializer
6. Ajouter les tests DSL intégration
7. Ajouter les démos
8. Code review + quality checks

## Vérification finale

```bash
pnpm test:server src/lib/geometry-core/
pnpm check:incremental
npx eslint <fichiers modifiés>
```
