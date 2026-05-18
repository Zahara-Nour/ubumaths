---
title: 'geometry-core — Analyse de performance'
date: 2026-05-18
audience: 'Développeurs UbuMaths, optimisation rendu temps réel'
---

# geometry-core — Analyse de performance (lecture statique)

## 1. Profil de charge par phase d'exécution

### Parse / initialisation DSL (une fois par figure)

L'interpréteur DSL (`dsl/interpreter.ts`) appelle `compile()` et, pour les
courbes paramétriques, `differentiate()` au moment de créer les éléments via
les builtins de la stdlib. Ce coût est payé **une seule fois** par figure et
n'est pas dans un hot path. Les résultats sont stockés sur l'objet
`GeoParametricCurve` (`compiledX`, `compiledY`, `compiledXPrime`,
`compiledYPrime`), qui sont réutilisés à chaque tick. La seule exception
documentée est `getSecondDerivatives()` dans
`graph/parametric-calculus.ts:75-95` qui re-compile à chaque appel (cf.
section 4).

### Drag d'un point libre

Chemin sur `mousemove` : `onPointerMove` → `figure.movePoint()` →
`graph.markDirty()` → `figure.recompute()` → `getDirtyInOrder()` (Kahn sur le
sous-graphe sale) → `computePosition()` pour chaque descendant sale →
`version++`. La complexité est O(k) où k est le nombre de descendants du point
déplacé, pas la taille totale de la figure. C'est efficace par construction.

### Drag d'un `point_sur(courbe_paramétrique, t)`

Chemin plus lourd : `onPointerMove` → `movePointOnParametricCurveFromCursor()` →
`findClosestParameterOnCurve()` (Newton 8 starts × 20 iter = **160 évaluations**
de γ et γ') → `movePointOnParametricCurve()` ou `moveSlider()` → `recompute()`.
Ce chemin est exécuté à **chaque mousemove**, soit ~60 fois/seconde à 60 Hz.

### Mouvement d'un slider

`moveSlider()` → `graph.markDirty()` → `recompute()`. Tous les éléments qui
dépendent du slider sont recompilés. Si la figure contient une intersection
paramétrique × paramétrique sur ce slider, cela déclenche un Newton 2D 8×8
complet (`findParametricIntersections`) à chaque tick du slider.

### Redimensionnement du viewport (zoom/pan)

`onWheel` ou pan → `viewCenter`/`ppu` mutés → `viewport` et `transformer`
dérivés recalculés → Svelte 5 invalide tous les `{@const svg = ...ToSVG(...)}`,
forçant un re-rendu SVG complet de tous les éléments visibles.
Pour les courbes paramétriques, cela déclenche
`computeParametricCurveSampling()` (300 points + sampler adaptatif) pour
**chaque courbe** dans la figure. Pour les courbes implicites,
`marchingSquares()` est re-exécuté sur une grille 200×200.

---

## 2. Hotspots identifiés

### 2.1 ~~Recompilation des dérivées secondes à chaque appel~~ — **CORRIGÉ 2026-05-18**

**Fichier** : `graph/parametric-calculus.ts:75-95`

> **Statut : FIXED.** `GeoParametricCurve` expose désormais `compiledXSecond`
> et `compiledYSecond`, compilés une seule fois dans
> `Figure.createParametricCurve` (try/catch → null en cas d'échec).
> `getSecondDerivatives()` est devenu une simple lecture du cache (3 lignes
> au lieu de 18). Tests de régression dans
> `graph/__tests__/figure-parametric.test.ts`. Pour un drag continu à 60 fps
> sur 1 cercle osculateur : ~240 appels `differentiate+compile/sec` → 0.

**Description historique** : `differentiate()` + `compile()` sur deux
expressions AST à chaque appel de `computeCurvature()` ou
`computeOsculatingCircle()`. Si un cercle osculateur est rendu dans la
figure, ce chemin était atteint via `computeElementPosition()` →
`computeOsculatingCircle()` → `computeCurvature()` →
`getSecondDerivatives()` à chaque `recompute()`, soit à chaque tick de drag
ou de slider.

### 2.2 ~~Objet d'environnement alloué à chaque évaluation de curve~~ — **CORRIGÉ 2026-05-18**

**Fichiers** :

- `graph/figure.ts:4399-4414` (dans `computeParametricCurveSampling`)
- `graph/figure.ts:2888-2891` (dans `createTangentToParametric`)
- `graph/figure.ts:2609` (dans `queryParametricCurveAtCursor`)

> **Statut : FIXED.** Les 3 sites ont été convertis au pattern mutable-env
> (un seul objet `env: Record<string, number>` partagé, paramètre muté
> in-place avant chaque évaluation). Élimine ~1200+ allocations d'objets
> par rendu de courbe paramétrique dans le sampler. Pattern identique à
> `parametric-newton.ts:69`. Safe en JS single-threaded car chaque closure
> mute `env[param]` juste avant `compiledX(env)`.

**Description historique** : `computeParametricCurveSampling` créait 4
closures (`xFn`, `yFn`, `xPrime`, `yPrime`) qui allouaient
`{ ...scalarBindings, [param]: t }` à **chaque** évaluation du sampler.
Avec 300 points par courbe + sampler adaptatif, ~1200+ allocations
d'objets par rendu de courbe.

### 2.3 Newton 1D 16 starts × chaque `intersection()` paramétrique — MEDIUM IMPACT

**Fichier** : `graph/parametric-intersection-1d.ts:64-154`

16 starts × 20 itérations = **320 évaluations de courbe** par appel de
`findParametricLineIntersections()`, `findParametricCircleIntersections()`, etc.
Ces fonctions sont appelées depuis `computeElementPosition()` pour chaque
`intersectionParametricLine`, `intersectionParametricCircle`, etc. dans la
figure, à chaque `recompute()`. Si la figure a 3 intersections de ce type,
cela fait 960 évaluations de courbe par tick.

Le dédup en `O(N²)` (`unique.some(...)`, lignes 147-152) est négligeable pour
N ≤ 16, mais identique dans `parametric-intersection.ts:173-176` pour le cas
2D où N peut atteindre 64 candidates.

### 2.4 Newton 2D 8×8 starts pour `intersection(c1, c2, k)` — HIGH IMPACT

**Fichier** : `graph/parametric-intersection.ts:113-159`

64 starts × 20 itérations = **1280 évaluations de courbe** par intersection
paramétrique × paramétrique. Chaque `newtonStep` appelle `eval1(t1)` et
`eval2(t2)` qui retournent `{ x, y, dx, dy }` — 4 valeurs numériques dans un
nouvel objet à chaque itération (ligne 87-96). Soit ~5120 allocations d'objets
intermédiaires par appel.

### 2.5 ~~`marchingSquares` sur grille 200×200 à chaque viewport change~~ — **CORRIGÉ 2026-05-18**

**Fichier** : `rendering/marching-squares.ts`

> **Statut : FIXED.** `marchingSquares` est désormais mémoïsée via une
> WeakMap module-level keyed par `CompiledFn`, avec viewport+gridSize en
> sous-clé. Pour les drags qui ne touchent pas la courbe implicite (cas le
> plus courant) : viewport identique → cache hit → ~40 000 évaluations
> évitées par tick. Cache invalidé naturellement quand le `GeoImplicitCurve`
> est remplacé (WeakMap GC). Sain car les courbes implicites sont
> autonomes (`dependsOn: readonly []`), donc `compiledFn` est strictement
> pure de `(x, y)`. 7 tests dédiés dans
> `rendering/__tests__/marching-squares-cache.test.ts`.

**Description historique** : `marchingSquares()` évaluait la fonction
implicite sur 201×201 = 40 401 points sans cache. Chaque pan, zoom, ou
changement de `version` (drag d'un point quelconque) relançait ce calcul
complet, même si la courbe implicite elle-même n'avait pas changé.

### 2.6 `locusToSVG` et `computeLocusCurveSampling` dans le rendu SVG — HIGH IMPACT

**Fichier** : `rendering/svg-primitives.ts:2007-2030` + `graph/compute-locus.ts`

`locusToSVG()` appelle `computeLocusCurveForElement()` qui exécute le pipeline
complet : `N + adaptive_refinement` évaluations du sous-graphe. Par défaut
`locus.numSamples` est fixe, mais le raffinement adaptatif peut multiplier ce
nombre. Ce calcul est relancé à chaque changement de `version`, même lorsque
les éléments du sous-graphe n'ont pas bougé.

### 2.7 `computeParametricCurveSampling` relancé pour chaque viewport change — MEDIUM IMPACT

**Fichier** : `graph/figure.ts:4376-4420`

300 points de base + sampler adaptatif sont recalculés à chaque changement de
`viewport` (pan/zoom) car `parametricCurveToSVG()` est dans un `{@const}`
évalué sans cache dans le template. Un slider qui bouge et déclenche
`version++` resamle aussi toutes les courbes paramétriques, même celles qui
ne dépendent pas du slider.

### 2.8 `findElementNear` sur chaque `mousemove` sans drag — LOW IMPACT

**Fichier** : `interaction/hit-testing.ts:120-130`

Sur chaque `mousemove` sans drag (branche `else`, GeometryCanvas ligne 531),
`findElementNear()` parcourt tous les éléments (O(n)). Pour une figure de 50+
éléments avec des courbes, cela inclut des calculs de distance à des
primitives complexes. Le commentaire `// Linear O(n) scan. Sufficient for < 200 elements.`
est valide mais à surveiller si les figures deviennent grandes.

### 2.9 `parseInlineNodes` + `inlineNodesToHTML` + `convertLatexToMarkup` dans le rendu — LOW IMPACT

**Fichier** : `src/lib/components/geometry/GeometryCanvas.svelte:293-341`

Ces fonctions sont appelées dans le template lors du rendu des labels math.
Chaque redraw SVG (version change) les réexécute pour tous les éléments avec
labels. `convertLatexToMarkup()` est décrit comme potentiellement coûteux dans
le commentaire ligne 317.

---

## 3. Patterns d'allocation mémoire

### Objets alloués à chaque tick

| Pattern                                     | Localisation                        | Fréquence                      |
| ------------------------------------------- | ----------------------------------- | ------------------------------ |
| `{ ...scalarBindings, [param]: t }`         | `figure.ts:4399,4403,4408,4414`     | ~1200×/courbe/redraw           |
| `{ x, y, dx, dy }` return value             | `parametric-intersection.ts:87-104` | 1280×/intersection 2D          |
| `{ ...bindings }` dans `buildCurveBindings` | `compute-position.ts:882-892`       | 1×/élément/recompute           |
| `CompiledFn` (dérivées secondes)            | `parametric-calculus.ts:88-90`      | 2×/cercle-osculateur/recompute |

### Objets réutilisés correctement (bonne pratique existante)

- `parametric-newton.ts:69` : `vars` mutable réutilisé dans Newton
- `parametric-intersection.ts:84-85` : `vars1`, `vars2` mutables par courbe
- `parametric-intersection-1d.ts:164-176` : `makeCurveEvaluator` avec objet mutable

Ces patterns montrent que le soin a été pris dans les solvers Newton. La
régression est dans `computeParametricCurveSampling` (figure.ts), qui n'utilise
pas ce même pattern.

---

## 4. Cache et mémoïsation

### Ce qui est déjà compilé et mis en cache (OK)

- `compiledX`, `compiledY`, `compiledXPrime`, `compiledYPrime` sur `GeoParametricCurve` — compilés une fois à la création, réutilisés.
- `compiledXSecond`, `compiledYSecond` sur `GeoParametricCurve` (ajoutés 2026-05-18) — pré-compilés dans `Figure.createParametricCurve`, lus tels quels par `parametric-calculus.ts:getSecondDerivatives`.
- `compiledFn` et `compiledDerivative` sur `GeoFunction` — idem.
- `compiledFn` sur `GeoImplicitCurve` — compilé une fois.
- `marchingSquares` (ajouté 2026-05-18) — WeakMap keyed par `CompiledFn`, avec viewport+gridSize en sous-clé. Cache hit pour tous les renders où ni la courbe ni le viewport ne changent.

### Ce qui manque de cache

**SVG path des courbes paramétriques** : le path SVG est recalculé à chaque
changement de `version`, même si la courbe et le viewport n'ont pas changé.
Un cache `{ version: number; viewportKey: string; path: string }` par courbe
éviterait les 300+ évaluations à chaque tick d'un slider qui ne touche pas
cette courbe.

**Locus curve** : résultat recalculé à chaque rendu sans vérifier si le driver
a bougé. Un cache keyed sur la position du driver (ou le `version` propre de
ce sous-graphe) serait approprié.

---

## 5. Réactivité Svelte et risques de double-calcul

### Boucle de rendu SVG

Dans `GeometryCanvas.svelte`, le template SVG contient des blocs
`{@const svg = xToSVG(...)}` qui sont réévalués à chaque changement de
`version` ou `externalVersion`. `version` est incrémenté à **chaque**
`onPointerMove` pendant un drag, quelle que soit la nature du drag. Un drag
simple d'un point libre force le recalcul de toutes les courbes implicites,
paramétriques, et du locus — même si aucun d'entre eux ne dépend du point
déplacé.

La réactivité correcte serait : `parametricCurveToSVG` ne devrait dépendre que
du `version` propre à la courbe (ou des `scalarValues` de ses dépendances),
pas d'un `version` global. Svelte 5 permet ce pattern via des `$derived` fins.

### `$derived` dans le template

```svelte
let elements = $derived.by(() => {
    void version;          // depend on global version
    void externalVersion;
    return figure.getAllElements()...
});
```

Ce `$derived` se réexécute à chaque tick de drag (ligne 207-212). En pratique
`figure.getAllElements()` retourne un tableau des éléments — un filtre O(n) — ce
n'est pas catastrophique, mais le cycle complet Svelte (diffing, DOM update)
est déclenché inutilement pour les éléments qui n'ont pas changé.

### `$derived(rough.svg(svgRef))`

```svelte
let rc = $derived(svgRef ? rough.svg(svgRef) : null);
```

Ligne 216. `rough.svg()` crée un wrapper qui wraps le SVGSVGElement. Si
`svgRef` change (remount du composant), cela recrée le wrapper. Cela semble
géré correctement, mais à surveiller lors des animations.

---

## 6. Newton solvers — analyse de coût et optimisations possibles

### Newton 1D (16 starts)

Coût par appel : 16 starts × 20 iter × 2 évaluations (f, f') = **640 appels
de fonction compilée**. Pour une droite coupant une courbe ordinaire, la
convergence survient en 3-5 itérations, donc le coût réel est ~16 × 4 = 64
appels. Le coût reste proportionnel même en cas de convergence rapide car
toutes les 16 branches sont exécutées.

**Warm-start possible** : si l'intersection est suivie entre deux frames (drag
du slider), le `t` précédent est une excellente approximation initiale. Une
seule itération Newton depuis l'ancienne solution serait souvent suffisante.
Cela demande de stocker le `t` précédent sur l'élément `GeoIntersectionParametricLine`.

### Newton 2D (8×8 = 64 starts)

Coût par appel : 64 × 20 × 4 évaluations = **5120 appels**. Sans warm-start,
ce coût est payé intégralement à chaque tick. Pour un slider qui anime deux
courbes paramétriques qui s'intersectent, cela peut représenter plusieurs ms
sur un mobile.

### Drag `point_sur(c, t)`

8 starts × 20 iter = 160 évaluations à chaque `mousemove`. Le commentaire
du code (`parametric-newton.ts:18`) explique que γ'' est approximé à zéro,
ce qui dégrade la convergence lorsque le curseur est loin de la courbe. Sur
une courbe à forte courbure, plusieurs starts peuvent diverger, laissant le
résultat au meilleur-parmi-tous. La qualité de l'interaction peut être
améliorée sans augmenter le coût numérique (cf. warm-start ci-dessous).

---

## 7. Rendu canvas/SVG

### Stratégie actuelle : full SVG redraw via `version++`

Le rendu est entièrement côté SVG, sans canvas 2D. Il n'y a pas de layering
(`<g>` non pré-calculé, pas de `<use>`, pas de dirty-rects). Svelte 5 diffing
gère la mise à jour DOM, mais chaque changement de `version` invalide le
template entier (tous les `{@const}` et les `{#each}` dans le même scope).

Un pan/zoom change `viewport` et `transformer` (deux `$derived`), qui invalident
tous les `{@const svg = xToSVG(...)}` simultanément. C'est structurellement
correct (tous les éléments doivent être re-projetés), mais les calculs lourds
(marching squares, locus) sont confondus avec les calculs légers (segment →
deux points SVG).

### Rough.js

`let rc = $derived(svgRef ? rough.svg(svgRef) : null)` : le wrapper est
bon marché. Les fonctions `roughLineHTML`, `roughCircleHTML`, etc. appellent
Rough.js à chaque rendu, qui lui-même génère des chemins SVG aléatoires.
Rough.js accepte un `seed` pour la reproductibilité
(`roughSeed` dans le style), mais le path est recalculé à chaque tick même
si le seed et les paramètres n'ont pas changé.

---

## 8. Couches d'intégration Svelte

La `Figure` est un objet mutable ordinaire (classe TypeScript). Svelte 5 ne
peut pas la rendre réactive nativement. Le pattern utilisé — `version: $state(0)`
incrémenté après chaque mutation — est correct et documenté. Les risques
identifiés sont :

1. `version` est global à la figure : un seul compteur pour tous les éléments.
   Tout changement dans n'importe quel élément invalide le rendu de tous les
   éléments, y compris les courbes implicites coûteuses.

2. `figure.recompute()` est appelé depuis `handleSliderChange` (dans le handler
   Svelte) mais aussi depuis `onPointerMove` (handler natif). Il n'y a pas de
   double-appel, mais l'ordre des opérations dépend de l'ordre des appels dans
   chaque handler. C'est correctement géré.

3. Il n'y a pas de `$effect` dangereux dans le composant SVG (pas d'effets
   qui appellent eux-mêmes `recompute()` ou `version++`). Risque faible.

---

## 9. Top 10 optimisations prioritaires

### 1. ~~Mettre en cache les dérivées secondes sur GeoParametricCurve~~ — **CORRIGÉ 2026-05-18**

**Fichiers** : `graph/parametric-calculus.ts`,
`types/elements.ts` (`GeoParametricCurve`),
`graph/figure.ts` (`createParametricCurve`)

> **Statut : FIXED.** `compiledXSecond` / `compiledYSecond` ajoutés au type
> (non-optionnels, `CompiledFn | null`). Pré-compilés dans
> `Figure.createParametricCurve` (try/catch → `null` en cas d'échec).
> `getSecondDerivatives()` est passé de 18 lignes (différentier+compiler) à
> 3 lignes (lecture cache). Élimine 2 `differentiate()` + 2 `compile()` à
> chaque `recompute()` pour chaque `GeoOsculatingCircle` ou
> `GeoScalar('curvature')`. Tests de régression :
> `graph/__tests__/figure-parametric.test.ts` (+2 tests : eager compilation
>
> - fallback `null` quand premières dérivées absentes).

---

### 2. ~~Remplacer les spreads d'env par un objet mutable dans `computeParametricCurveSampling`~~ — **CORRIGÉ 2026-05-18**

**Fichiers** : `graph/figure.ts` — `computeParametricCurveSampling`,
`createTangentToParametric`, `queryParametricCurveAtCursor`

> **Statut : FIXED.** Les 3 sites convertis au pattern mutable-env. Le sampler
> partage maintenant un seul `env` entre `xFn`/`yFn`/`xPrime`/`yPrime`,
> mutant `env[param]` avant chaque évaluation. Supprime ~1200+ allocations
> par rendu de courbe paramétrique. Pattern aligné avec
> `parametric-newton.ts:69` et `parametric-intersection-1d.ts:164-176`.
> 661 tests parametric/graph/dsl/rendering passent, 0 régression.

---

### 3. Cache du SVG path par courbe paramétrique — HIGH / MOYEN EFFORT

**Fichier** : `graph/figure.ts` (ajouter un cache), `rendering/svg-primitives.ts`

Stocker sur la `Figure` un cache `Map<string, { version: number; viewportKey: string; path: string; closed: boolean }>`. La clé `viewportKey` peut être `${xMin.toFixed(4)},${xMax.toFixed(4)},${yMin.toFixed(4)},${yMax.toFixed(4)}`. La `version` est un compteur propre à cet élément (incrémenté uniquement quand la courbe ou ses dépendances changent).

Un drag sur un point libre qui ne touche pas la courbe paramétrique ne devrait pas invalider ce cache.

Gain attendu : suppression de 300+ évaluations de courbe par rendu lorsque
la courbe et le viewport n'ont pas changé.

---

### 4. ~~Cache de marching squares par courbe implicite~~ — **CORRIGÉ 2026-05-18**

**Fichier** : `rendering/marching-squares.ts`

> **Statut : FIXED.** Cache implémenté directement dans `marchingSquares`
> (pas sur la Figure). WeakMap module-level keyed par `CompiledFn` (object
> identity ; auto-invalidée quand l'élément est remplacé), avec viewport et
> gridSize en sous-clé. Plus simple que le plan initial (cache sur Figure)
> : pas de couplage Figure ↔ rendering, pas de gestion de cycle de vie
> manuelle (WeakMap GC l'entrée automatiquement). 7 tests de
> régression dans `marching-squares-cache.test.ts`.

Gain réel : suppression de 40 000 évaluations de fonction implicite par
pan/zoom/drag qui ne touche pas la courbe.

---

### 5. Warm-start Newton — PARTIELLEMENT CORRIGÉ 2026-05-18

**Fichiers** :

- ✅ `graph/parametric-newton.ts:50-149` — **CORRIGÉ 2026-05-18**
- ⏳ `graph/parametric-intersection-1d.ts:64-154` — encore à faire

**Statut closest-point (drag `point_sur`)** : `findClosestParameterOnCurve`
accepte désormais un paramètre `warmStartT?: number` (8e argument).
`movePointOnParametricCurveFromCursor` (`figure.ts`) passe `el.t` résolu en
tant que hint pendant le drag continu. Newton tourne 1 fois depuis le hint
au lieu de 8 multi-starts. Garde-fou : comparaison avec `γ(tMin)` et
`γ(tMax)` pour éviter le piège des maxima locaux de distance (cas H6,
cursor sous une demi-courbe). Tests unitaires dans
`graph/__tests__/parametric-newton.test.ts` (8 tests dédiés).

**À faire — warm-start intersection-1d** : la fonction
`findParametricLineIntersections` retourne _toutes_ les intersections,
donc le hint doit être un _array_ de t précédents (un par intersection).
API plus complexe : nécessite de cacher l'historique des t sur la Figure
(par exemple `Map<intersectionId, readonly number[]>`) et de modifier la
signature. Différer à un commit séparé.

Gain restant attendu : réduction de 16:1 du coût Newton sur un slider
animant des intersections paramétriques (3 intersections × 320 évaluations
→ 3 × 20 ≈ 60 évaluations).

---

### 6. Version granulaire par élément pour le rendu SVG — HIGH / ÉLEVÉ EFFORT

**Fichier** : `src/lib/components/geometry/GeometryCanvas.svelte`

Remplacer le `version: $state(0)` global par une `Map<string, $state(number)>`
par élément (ou par groupe de dépendances). `{@const svg = parametricCurveToSVG(...)}` ne se recalculerait que si la version propre à cet élément change.

Cela demande d'exposer de la Figure une API `getElementVersion(id): number`
ou d'utiliser un `$state` Svelte dans un `Map<string, object>` partagé.
La complexité d'implémentation est élevée (refactoring du template Svelte +
API Figure), mais le gain est maximal pour les figures complexes.

---

### 7. Mettre en cache le locus calculé — MEDIUM / MOYEN EFFORT

**Fichier** : `rendering/svg-primitives.ts:2007-2030`

`locusToSVG()` recompute le locus à chaque rendu. Stocker le résultat dans un
cache `Map<string, { driverVersion: number; path: string }>` où `driverVersion`
est la version (position) du driver point. Invalider uniquement quand le driver
bouge.

---

### 8. Lazy-load de la grille et des graduations — LOW / FAIBLE EFFORT

**Fichier** : `GeometryCanvas.svelte:173-205`

`gridLines` est un `$derived.by` qui recalcule les lignes de grille à chaque
changement de `viewport`. Pour un pan frame-by-frame, cela représente beaucoup
de calculs de `Math.ceil(...)` et de `Math.round(...)`. Un seuil de
stabilisation (ne recalculer que si le viewport a bougé de plus de `major/2`)
suffirait.

---

### 9. Éviter `parseInlineNodes` + `convertLatexToMarkup` dans le hot path de rendu — LOW / FAIBLE EFFORT

**Fichier** : `GeometryCanvas.svelte:293-341`

Ces fonctions sont appelées dans le template pour chaque élément avec label à
chaque `version++`. Mémoïser le résultat par `(id, label, version_element)`.
Un `Map<string, { labelInput: string; html: string }>` cache dans la closure
du composant suffit. Ne recalculer que si le label change.

---

### 10. Réduire `numSamples` par défaut pour le locus — LOW / FAIBLE EFFORT

**Fichier** : `graph/compute-locus.ts:83`

Si `locus.numSamples` est élevé par défaut (à vérifier), réduire à 50-100 et
laisser le raffinement adaptatif ajouter des points. Le raffinement (MAX_REFINE_DEPTH = 3)
ne porte que sur les intervalles divergents.

---

## 10. Benchmarks suggérés

| Mesure                                      | Comment                                                                   | Priorité |
| ------------------------------------------- | ------------------------------------------------------------------------- | -------- |
| FPS drag `point_sur(c, t)`                  | Profiler avec `performance.now()` dans `onPointerMove`, logguer si > 16ms | Haute    |
| Temps Newton 2D par tick slider             | Wrapper `findParametricIntersections` avec `console.time`                 | Haute    |
| Temps `marchingSquares` par viewport change | `performance.mark` autour de l'appel dans `implicitCurveToSVG`            | Haute    |
| Allocations GC pendant drag                 | Chrome DevTools Memory > Allocation profiler, 5s de drag                  | Moyenne  |
| Temps de parse DSL initial                  | `performance.mark` autour de `interpretDsl()` pour un DSL de 50 lignes    | Moyenne  |
| Rerender count Svelte                       | Svelte DevTools, compter les invalidations de `elements` pendant drag     | Moyenne  |
| `computeParametricCurveSampling` par frame  | Wrapper la méthode, compter les appels pendant 1 seconde de drag          | Haute    |
| Temps `getSecondDerivatives`                | `console.time` dans la fonction, mesurer sur 1000 appels                  | Faible   |

### Scénarios de benchmark recommandés

1. **Figure "slider-heavy"** : 3 sliders, 2 courbes paramétriques dépendantes,
   1 point d'intersection. Mesurer le temps entre `moveSlider()` et fin de
   `recompute()` à chaque tick.

2. **Figure "drag-newton"** : 1 courbe paramétrique complexe (rosace, spirale),
   1 `point_sur`. Mesurer le FPS effectif pendant le drag.

3. **Figure "implicite seule"** : 1 courbe implicite `x^2 + y^2 - 4 = 0` dans
   un viewport standard. Pan horizontal continu. Mesurer le temps de rendu par
   frame.

4. **Grande figure** : 100 éléments dont 5 courbes paramétriques, 2 locus,
   1 implicite. Mesurer le temps de parse DSL initial + premier rendu.
