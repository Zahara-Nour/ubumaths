---
title: 'geometry-core — Audit couverture & robustesse des tests'
date: 2026-05-18
audience: 'core contributors, test-automator agent'
---

# Audit couverture & robustesse des tests — geometry-core

## 1. Inventaire

### Chiffres globaux

- **140 fichiers de test** au total
- **2 986 tests** (comptage `it(` + `test(`) — la memoire citait ~1509, le module a plus que double
- Tous situes dans des sous-dossiers `__tests__/` (pattern uniforme, pas de `.test.ts` colocalises avec les sources)
- Le module racine possede un `__tests__/integration.test.ts` distinct (18 tests)

### Repartition par sous-module

| Sous-module    | Fichiers test | Tests     | Source files sans test |
| -------------- | ------------- | --------- | ---------------------- |
| `dsl/`         | 83            | 1 649     | 8                      |
| `graph/`       | 20            | 472       | 7                      |
| `rendering/`   | 17            | 326       | 3                      |
| `geometry/`    | 7             | 180       | 2                      |
| `types/`       | 4             | 87        | 2                      |
| `validation/`  | 1             | 71        | 0                      |
| `compute/`     | 3             | 138       | 0                      |
| `interaction/` | 2             | 25        | 0                      |
| `viewport/`    | 2             | 20        | 0                      |
| `__tests__/`   | 1             | 18        | —                      |
| **Total**      | **140**       | **2 986** | **22**                 |

---

## 2. Couverture par feature

### DSL parser / tokenizer — ELEVEE (89 tests)

`tokenizer.test.ts` (37), `tokenizer-backslash.test.ts` (12), `tokenizer-positions.test.ts` (9), `parser.test.ts` (40), `parser-positions.test.ts` (9), `parser-inf.test.ts` (14), `piecewise-parser.test.ts` (25), `domain-parser.test.ts` (40).

Cas testes : tokens de base, backslash LaTeX, positions de source, `inf`/`-inf`, valeurs limites, piecewise avec `;`, domaines ouverts/fermes. Couverture fonctionnelle solide. La syntaxe `Si()` algorithmique interdite est explicitement rejetee.

### DSL interpreter / builtins — ELEVEE (450+ tests indirects)

`interpreter.test.ts` (43), `interpreter-courbe.test.ts` (45), `stdlib.test.ts` (57), `scalar-dsl.test.ts` (71), `image-dsl.test.ts` (49), `roundtrip.test.ts` (48), plus 20+ fichiers specialises.

La logique de `builtins.ts` (3 425 lignes) est largement exercee par ces tests d'integration DSL, meme s'il n'existe pas de fichier de test unitaire dedie. Les chemins couverts incluent : points, segments, droites, cercles, polygones, vecteurs, courbes cartesiennes/parametriques/polaires/implicites, transformations, scalaires, macros.

### Courbes cartesiennes (fonctions y=f(x)) — ELEVEE

`interpreter-courbe.test.ts` (45), `courbe-domain.test.ts` (23), `dsl-courbe-with-variables.test.ts` (6), `interpreter-derivee.test.ts` (31), `interpreter-tangente.test.ts` (7). Cas : domaines, derivees, tangentes, singularites, NaN en bord de domaine.

### Courbes parametriques — ELEVEE (30 + 25 + 57 + 4 tests)

`courbe-parametric.test.ts` (30), `point-sur-parametric.test.ts` (25), `point-sur-extended.test.ts` (57), `figure-parametric-reactivity.test.ts` (4), `figure-parametric.test.ts` (9).

Inclut drag Newton (`movePointOnParametricCurveFromCursor`, tests H4-H7), reactivite slider, `dependsOn`. Cas degenere cusp de cardioide (H7) couvert.

### Courbes polaires — MOYENNE (24 tests)

`courbe-polar.test.ts` (24). Teste la creation, serialisation, et quelques proprietes geometriques. Mais : pas de test de rendu SVG specifique polaire, pas de test de discontinuite radiale (r < 0), pas de test `point_sur` sur courbe polaire avec drag.

### Transformations — ELEVEE (64 + 17 + 12 + 11 + 10 + 13 + 4 + 7 + 8 tests)

`geometry/transformations.test.ts` (64), `transformation-objects.test.ts` (17), `transforme-points.test.ts` (11), `transforme-lines.test.ts` (12), `transforme-circles.test.ts` (10), `transforme-curves.test.ts` (13), `transforme-polygons.test.ts` (4), `transforme-vectors.test.ts` (7), `affinite.test.ts` (11).

Les transformations basiques (rotation, symetrie, translation, homothetie, affinite) sont bien couvertes. Polygones peu testes (4 tests seulement, pas de symetrie, pas d'inversion sur polygone).

### Vecteurs — ELEVEE (23 + 28 + 41 tests)

`vector-dsl.test.ts` (23), `vector-ops-dsl.test.ts` (28), `figure-vector.test.ts` (41). Vecteurs libres/lies, somme, scalaire, oppose, norme, produit scalaire, angle. Couverture bonne.

### Intersections classiques (L/C/Q/F) — ELEVEE (44 + 21 + 19 + 2 tests)

`intersection-lc-cc.test.ts` (44), `intersection-lq-qq.test.ts` (21), `intersection-lf-ff.test.ts` (19), `cc-stability.test.ts` (2). Stabilite d'ordre des intersections CC testee en rotation continue (360 angles).

### Intersections parametriques — ELEVEE (16 + 18 + 11 tests)

`intersection-parametric.test.ts` (16), `intersection-parametric-mixed.test.ts` (18), `intersection-parametric-segment-ray.test.ts` (11). Couvre parametrique x parametrique, polaire x polaire, courbe x droite/cercle/fonction/segment/demi-droite. Tolerances `toBeCloseTo(..., 3)` calibrees.

### Calculus parametrique — MOYENNE (20 tests)

`parametric-calculus.test.ts` (20). Longueur d'arc (5 tests dont cardioid avec singularite integrable), courbure (4 tests), cercle osculateur (3 tests), reactivite (2), erreurs DSL (2), serialisation (2). Les degeneresCes (κ=0 inflexion, γ'=0 cusp exact) retournent `null` silencieusement mais ne sont couverts que via la cardioid — pas de test unitaire direct des fonctions `computeCurvature`/`computeOsculatingCircle`.

### Newton solver (closest-point drag) — FAIBLE (5 tests indirects)

`point-sur-parametric.test.ts` tests H4-H7 (4 tests) via `movePointOnParametricCurveFromCursor`. `parametric-newton.ts` (149 lignes) n'a pas de fichier de test unitaire dedie. Aucun test direct de `findClosestParameterOnCurve` avec `NewtonConfig` personnalise.

### Lieu geometrique (locus) — MOYENNE (24 tests)

`locus.test.ts` (24). Couvre driver sur cercle/segment/fonction/conique/arc/droite, reactivite, chemins fermes, discontinuites, erreurs. Mais le driver sur courbe parametrique (branche `isPointOnParametricCurve` dans `compute-locus.ts`) n'est pas teste directement — seul `cercle` est utilise comme support dans tous les tests.

### Rendu SVG/TikZ/Typst — MOYENNE (326 tests)

`export-svg.test.ts` (32), `export-svg-edge.test.ts` (42), `export-tikz.test.ts` (27), `export-tikz-edge.test.ts` (36), `export-typst.test.ts` (12), `export-typst-edge.test.ts` (23). Pipelines de rendu bien couverts mais `bezier.ts` (414 lignes, fonctions Catmull-Rom) n'a aucun test direct.

### Interaction / hit-testing / snap — FAIBLE (25 tests)

`hit-testing.test.ts` (12), `snap.test.ts` (13). Couvre `findPointNear`/`findElementNear`, snap au point et a la grille. Le drag de points (`movePoint` sur `Figure`) est teste dans `figure-undo-redo.test.ts` mais le hit-testing sur courbes et segments n'est pas couvert.

---

## 3. Angles morts identifies

### 3.1 Fichiers source sans aucun test direct

Les fichiers suivants n'ont pas de fichier `__tests__/<nom>.test.ts` correspondant :

| Fichier                               | Taille  | Risque                                                                           |
| ------------------------------------- | ------- | -------------------------------------------------------------------------------- |
| `graph/parametric-newton.ts`          | 149 L   | Eleve — algorithme numerique, edge cases multiples                               |
| `graph/parametric-calculus.ts`        | 192 L   | Eleve — integrations numeriques, degeneres                                       |
| `graph/parametric-intersection.ts`    | 252 L   | Eleve — Newton 2D multi-start                                                    |
| `graph/parametric-intersection-1d.ts` | 425 L   | Eleve — 5 variantes Newton 1D                                                    |
| `graph/compute-position.ts`           | 1 308 L | Tres eleve — hub de calcul, ~40 types d'elements                                 |
| `graph/compute-locus.ts`              | 649 L   | Eleve — algorithme d'echantillonnage                                             |
| `graph/vector-components.ts`          | 50 L    | Faible — logique simple mais recursivement dependante                            |
| `rendering/bezier.ts`                 | 414 L   | Moyen — Catmull-Rom, gestion NaN dans `roundCoord`                               |
| `rendering/marching-squares.ts`       | 307 L   | Moyen — couvert partiellement via `interpreter-implicit-curve.test.ts` (4 tests) |
| `rendering/colors.ts`                 | 349 L   | Faible — `getNextColor`, `normalizeColor` sans tests                             |
| `geometry/circumcircle.ts`            | 23 L    | Faible — mais collinearite (D ≈ 0) non testee explicitement                      |
| `geometry/affine-transform.ts`        | ~100 L  | Moyen — transformations coniques, couvert indirectement                          |

### 3.2 Cas limites manquants identifies

**Newton solver (`parametric-newton.ts`)**

- Toutes les 8 starts singulieres → retour `null` (actuellement verifie implicitement par H7 seulement)
- `tMin >= tMax` → retour `null` (branche de garde non testee)
- Courbe avec derivees compilees nulles (`compiledXPrime = undefined`) → retour `null`
- Convergence en 1 iteration (courbe lineaire `x=t, y=0`)
- `numStarts=1` avec `NewtonConfig` custom

**Calculus parametrique (`parametric-calculus.ts`)**

- `computeCurvature` quand κ = 0 exactement (inflexion, par exemple `y=x^3` en x=0)
- `computeOsculatingCircle` quand γ'(t0) = 0 (cusp exact, pas juste singularite integrable)
- `computeArcLength` avec `tMin > tMax` (retour `NaN`)
- `computeArcLength` sur courbe constante (`x=1, y=1` → longueur 0)

**Intersections parametriques**

- `intersection(c, segment)` avec le point d'intersection exactement a t=0 ou t=1 (bord du segment)
- `intersection(c, segment)` quand la courbe est tangente au segment (une seule solution double)
- `intersection(c1, c2, k)` avec k bien superieur au nombre d'intersections reelles → position null sans throw
- Deux courbes identiques → deduplication (toutes les starts convergent vers les memes points)

**Locus (`compute-locus.ts`)**

- Driver sur courbe parametrique (`isPointOnParametricCurve`) : branche de code presente mais zero test
- Locus quand le tracer disparait (position null) pour une fraction des positions du driver — teste (`locus.test.ts` ligne 397) mais sans driver parametrique
- Driver sur arc avec debut/fin non-standard (arc > 270°)

**Intersections classiques**

- `intersectCC` avec deux cercles concentriques (D = 0, retour `null`) : teste via `cc-stability` mais la garde `Math.abs(D) < 1e-12` n'est jamais exercee precisement
- `circumcircle` avec trois points colineaires → retour `null` : aucun test

**Marching squares (`marching-squares.ts`)**

- Cellule `0101` (saddle configuration, cas ambigu) : non teste explicitement
- Viewport tres petit (1x1) ou resolution 1 → comportement aux limites
- Courbe traversant exactement un coin de cellule (singularite d'interpolation)

---

## 4. Qualite des assertions

### Tests qui assertent seulement "ca compile" (shallow)

Plusieurs tests dans les fichiers de demo ou de regression n'assertent qu'un `not.toThrow()` :

- `demo-conic-scripts.test.ts` (4 tests) : 100 % `not.toThrow()`, aucune verification numerique
- `limacon-constructions.test.ts` (2 tests) : bonne qualite (verifie xMin/xMax a tolerance 0)
- `trace-demos.test.ts` (6 tests) : principalement `not.toThrow()` ou `toHaveLength(> 0)`

La vaste majorite des tests DSL/graph sont substantiels : ils vont jusqu'au `toBeCloseTo` sur des coordonnees, verifient les dependances, testent les erreurs avec messages precis.

### Tests fragiles identifies

- **`dsl-mathast-perf.test.ts`** (3 tests) : seuils en ms (`< 1000ms`, `< 500ms`). Flaky sur CI tres charge, mais les budgets sont tres genereux.
- **`intersection-parametric.test.ts`** : les tolerances sont `toBeCloseTo(..., 3)` (precision 1e-3). Pour des algorithmes Newton multi-start, c'est correct, mais la valeur reelle retournee depend de quel start converge en premier. Un changement dans l'ordre d'iteration pourrait changer l'index de la solution sans briser la geometrie.
- **`cc-stability.test.ts`** : boucle sur 720 angles, verifie que le point ne "saute" pas de branche. Test lent (~360 appels Newton) mais correct algorithmiquement.

### Tests couples a l'implementation

- `point-sur-parametric.test.ts` H4-H7 utilisent un cast `as unknown as { movePointOnParametricCurveFromCursor(...) }` directement sur `Figure`. Si la signature de la methode change, ces tests cassent a l'execution mais pas a la compilation.
- `figure-undo-redo.test.ts` : teste directement `figure.canUndo` et `figure.canRedo`, ce qui est correct mais fragile si l'API interne change.

---

## 5. Tests d'integration vs unitaires

### Ratio estimatif

- **Unitaires purs** (une seule fonction testee sans interpreter/runDsl) : `compute/`, `geometry/intersections`, `viewport/`, `rendering/` — environ 600 tests (20 %)
- **Integration DSL** (parser → interpreter → Figure) : la grande majorite — environ 2 100 tests (70 %)
- **Integration bout-en-bout** (DSL → SVG/TikZ/Typst) : `rendering/__tests__/export-*.test.ts`, `dsl/__tests__/integration.test.ts` — environ 250 tests (8 %)
- **Performance** : 3 tests

### Tests bout-en-bout (DSL → render)

Il en existe : `dsl/__tests__/integration.test.ts` (18 tests) appelle `exportToSVG` et `exportToTikZ`. Les tests `rendering/__tests__/parametric-curve-svg.test.ts` (16) et `parametric-exports.test.ts` (18) testent le chemin complet parametrique → SVG/TikZ/Typst.

Ce qui manque :

- Pas de test bout-en-bout **courbe polaire → SVG path** (le fichier `parametric-curve-svg.test.ts` n'inclut pas de polar)
- Pas de test bout-en-bout **marching-squares → export SVG** (implicit curve render path)
- Pas de test bout-en-bout **lieu → SVG** (la SampledCurve produite par `computeLocusCurve` n'est pas testee au niveau SVG)

---

## 6. Tests de regression

Les mentions explicites de "regression" dans les fichiers de test sont presentes mais inconsistantes :

- `dsl-courbe-with-variables.test.ts` : "Regression for issue #X with variable bindings"
- `interpreter-implicit-curve.test.ts` : section `"regression: existing types not affected"` explicite
- `interpreter-singularity-nan.test.ts`, `dsl-division-by-zero.test.ts` : contexte de regression clair dans les commentaires
- `resolve-style.test.ts` : un commentaire "regression test for #fillOpacity bug"

La **majorite des tests de regression** isoles de bugs specifiques (commits `0b766795c` Greek differentiation fix, `fb449626b` polar serialisation, `e749fb838` scalar bindings) ne sont pas marques explicitement comme tels. Ils existent sous forme de tests fonctionnels normaux dans leurs fichiers respectifs. Aucun lien explicite avec les progress docs dans `docs/wip/geometry/`.

**Recommandation** : ajouter un commentaire `// Regression: <commit-hash ou issue>` sur les cas specifiquement ajoutes pour corriger un bug (exemple : `d1-greek-letters.test.ts` couvre le fix Greek differentiation mais ne le mentionne pas).

---

## 7. Performance des tests

### Candidats lents identifies

- **`cc-stability.test.ts`** : 2 tests avec boucles de 360 et 720 iterations, chacune invoquant `intersectCC`. Probablement < 100ms mais mesurable.
- **`intersection-parametric.test.ts`** : Newton 2D 8x8 starts, tests A1-A4 + B1-B2. Les `toBeCloseTo` a 3 decimales sur des resultats numeriques sont corrects mais si les starts divergent, le fallback peut prendre plus d'iterations.
- **`locus.test.ts`** : certains tests echantillonnent 200+ points (voir tests "deep dependency chain", "deux loci"). Likely < 500ms au total.
- **`parametric-calculus.test.ts`** A5 : cardioid arc length avec integrale de Simpson N=64 sur singularite — acceptable mais a surveiller si N augmente.
- **`dsl-mathast-perf.test.ts`** : seuils tres genereux (1s, 500ms), ne flakent probablement pas.

Aucun test ne semble clairement > 1s en isolation. Le risque de flakiness vient surtout des tests Newton avec tolerance 1e-3 sur des courbes a forte courbure, ou plusieurs starts peuvent converger vers des valeurs proches mais pas identiques.

---

## 8. Top 10 fichiers prioritaires a tester

### 1. `graph/parametric-newton.ts` — PRIORITE CRITIQUE

Type : unitaire. `findClosestParameterOnCurve` est le coeur du drag parametrique V2 et n'a aucun test direct. Cas a couvrir :

- Cercle unitaire, curseur a (0, 1) → t ≈ π/2
- Toutes starts singulieres (courbe ponctuelle `x=0, y=0`) → retour `null`
- `tMin >= tMax` → retour `null`
- Curseur au centre du cercle (equidistant de tous les points) → retourne un t valide sans NaN
- `NewtonConfig` custom avec `numStarts=1` et `maxIterations=1`
- Courbe lineaire `x=t, y=0` : convergence en 1 iteration

### 2. `graph/compute-position.ts` — PRIORITE ELEVEE

Type : integration. Ce fichier est le routeur central de 40+ types d'elements. Il est teste indirectement par tout le corpus DSL, mais des elements specifiques n'ont aucun test de position verifie numeriquement :

- `isOsculatingCircle` : position du centre et `getOsculatingCircleRadius`
- `isPointOnParametricCurve` (drag): la position apres `movePointOnParametricCurveFromCursor`
- `isComputedPoint` : derive de DSL variable
- Cas "element non trouve" → retour `null` sans throw

### 3. `graph/compute-locus.ts` — PRIORITE ELEVEE

Type : integration. La branche `isPointOnParametricCurve` (driver sur courbe parametrique, lignes 241-265) n'est couverte par aucun test. Cas concrets a ajouter dans `locus.test.ts` :

- `A = point_sur(c, 0)` ou `c = courbe("x=cos(t)", "y=sin(t)", ...)`, puis `L = lieu(symetrie(A, centre=O), A)` → ellipse
- Driver parametrique non periodique (spirale) → courbe ouverte sans fermeture automatique
- Driver sur courbe polaire `r = 1 - cos(theta)` → cardioide comme lieu

### 4. `rendering/bezier.ts` — PRIORITE MOYENNE

Type : unitaire. Les fonctions `catmullRomToBezier`, `pointsToCatmullRom`, `curveToSVGPath` (414 lignes) sont completement non testees. Cas concrets :

- `curveToSVGPath` avec tableau vide → retourne `""` ou `null`
- `curveToSVGPath` avec 1 point → `M x y` seulement
- `pointsToCatmullRom` avec 2 points colineaires → pas de courbure parasite
- `roundCoord` avec `NaN` ou `Infinity` → retourne `"0"` (branche de garde presente mais non testee)

### 5. `graph/parametric-intersection-1d.ts` — PRIORITE ELEVEE

Type : unitaire/integration. 425 lignes avec 5 variantes Newton 1D. Tests supplementaires a ajouter :

- `intersection(c, segment)` ou le t solution est exactement en t=0 : filtre `s ∈ [-ε, 1+ε]` doit accepter
- `intersection(c, segment)` ou le t solution est a t=1 + epsilon > 1+ε : doit rejeter
- `intersection(c, demidroite)` avec s < -ε (derriere l'origine) : doit retourner null
- Cercle de rayon 0 : ne pas diviser par 0 dans la version cercle
- Courbe tangente a la droite (solution double) : un seul point retourne

### 6. `geometry/circumcircle.ts` — PRIORITE FAIBLE

Type : unitaire. Petite (23 lignes) mais utilisee par `cercle(A, B, C)`. Cas manquants :

- Trois points colineaires → retour `null` (D ≈ 0)
- Trois points identiques → `null`
- Triangle equilateral connu → rayon = cote / √3

### 7. `rendering/marching-squares.ts` — PRIORITE MOYENNE

Type : unitaire+propriete. La cellule `0101` (saddle) avec ambiguite est presente dans le code mais jamais atteinte dans les tests. Cas concrets :

- Fonction `F(x, y) = (x^2 - 1)(y^2 - 1)` : deux composantes connexes, saddle cells au centre
- Viewport avec resolution 1 (grid_size=1) : ne pas crash
- Courbe passant exactement par un coin de cellule : interpolation evite division par 0

### 8. `rendering/colors.ts` — PRIORITE FAIBLE

Type : unitaire. `getNextColor`, `normalizeColor`, `isValidColor` sans tests. Cas concrets :

- `normalizeColor("rouge")` → `"#dc2626"` (couleur francaise)
- `normalizeColor("#abc")` → forme canonique
- `getNextColor([])` → premiere couleur de la palette
- `getNextColor(FUNCTION_COLORS)` → wrap-around sur la palette complete
- `isValidColor("invalid-xxx")` → `false`

### 9. `dsl/symbol-table.ts` — PRIORITE FAIBLE

Type : unitaire. La classe `SymbolTable` n'est testee qu'indirectement. Methodes `getIndexed`, `setIndexed`, collisions de noms, scope dans macros — aucun test direct. Cas concrets :

- `set("x", entry)` puis `get("x")` → meme entree
- `getIndexed("P", 0)` apres `pour i...` → bon element
- Conflit de nom `point("x", ...) ` ou `x` est une variable libre → erreur claire

### 10. `graph/vector-components.ts` — PRIORITE FAIBLE

Type : unitaire. La recursion dans `resolveVectorComponents` pour `vectorSum`, `vectorScaled`, `vectorNegate` n'a pas de test direct. Cas concrets :

- Chaine `u + v + w` (vectorSum imbrique) → composantes correctes
- `-(-u)` (vectorNegate de vectorNegate) → identite
- `vectorSum` avec un des vecteurs inexistant dans `elements` → retour `null` sans throw

---

## 9. Recommandations

### Strategie ciblee

La pyramide actuelle est inversee dans `dsl/` : trop d'integration DSL, peu d'unitaires bas niveau. La correction ne doit pas viser l'exhaustivite (le rapport cout/benefice serait mauvais pour `builtins.ts` 3 425 lignes) mais les modules numeriquement critiques.

**Priorites recommandees** :

1. **Unitaires Newton** : creer `graph/__tests__/parametric-newton.test.ts` (6-8 tests). Retour sur investissement maximal : ce code est execute a chaque drag sur une courbe parametrique.

2. **Unitaires bezier/Catmull-Rom** : creer `rendering/__tests__/bezier.test.ts` (8-10 tests). Le SVG final depend entierement de ces fonctions mais aucune assertion ne les cible.

3. **Integration locus parametrique** : ajouter 3-4 cas dans `dsl/__tests__/locus.test.ts` pour le driver `isPointOnParametricCurve`. C'est la seule branche majeure de `compute-locus.ts` non couverte.

4. **Unitaires calculus degeneres** : ajouter dans `dsl/__tests__/parametric-calculus.test.ts` des cas κ=0 (inflexion) et γ'=0 (cusp exact, pas cardioid), en testant directement `computeCurvature` et `computeOsculatingCircle` importees depuis `graph/parametric-calculus.ts`.

### Candidats property-based testing

Des proprietes mathematiques verifiables sans reference externe sont presentes mais non exploitees :

- **Commutativite de l'intersection parametrique** : `intersection(c1, c2, k)` et `intersection(c2, c1, k)` doivent retourner les memes points (ordre permis). Tester sur 5-6 paires de courbes avec auto-swap.
- **Idempotence des transformations** : `rotation(rotation(P, 180), 180)` = P. Tester sur 50 points aleatoires avec `fast-check`.
- **Invariant isometrique** : `distance(A, B) == distance(rotation(A), rotation(B))` pour toute rotation. Tester avec `fast-check` sur angles et coordonnees aleatoires.
- **Longueur d'arc additive** : `longueur(c, t1, t2) + longueur(c, t2, t3) ≈ longueur(c, t1, t3)` a 1e-4 pres. Propriete fondamentale de l'integrale.
- **Courbure signee du cercle** : κ = 1/r pour cercle de rayon r parcouru dans le sens trigonometrique. A verifier pour r ∈ [0.5, 10] avec `fast-check`.

### Regression explicite — convention a adopter

Ajouter un commentaire standardise sur les tests issus de bugs :

```typescript
// Regression: commit 0b766795c — Greek letter differentiation in polar curves
it('polar r=1-cos(theta) derivative uses theta not x', () => { ... });
```

Cela permettrait de retrouver le contexte lors d'un futur refactoring.
