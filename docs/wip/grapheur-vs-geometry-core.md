---
title: Grapheur vs geometry-core — comparatif détaillé
date: 2026-09-07
status: état des lieux, aucune décision prise
scope: src/lib/grapheur/, src/lib/components/grapheur/, src/lib/geometry-core/, src/lib/components/geometry/
---

# Grapheur vs `geometry-core` — doublons, spécificités, forces et faiblesses

Relevé **dans le code** le 2026-09-07, à la demande de David. Aucune décision
n'est prise ici : le document sert à en préparer une.

Ordres de grandeur :

|                   | grapheur                       | `geometry-core`                     |
| ----------------- | ------------------------------ | ----------------------------------- |
| Code (hors tests) | 3 239 l. (lib) + 4 175 l. (UI) | 34 168 l. (lib) + 2 283 l. (canvas) |
| Objets modélisés  | 2 (`explicit`, `sequence`)     | 80 variantes de `GeoElement`        |
| Langage           | saisie LaTeX d'une expression  | DSL francophone, 92 primitives      |
| Fichiers de tests | 12                             | 155                                 |

---

## 1. La différence structurelle : repère anisotrope contre repère isotrope

C'est le point le plus important, et il n'est pas cosmétique.

**Le grapheur** décrit sa vue par un rectangle `Viewport {xMin, xMax, yMin, yMax}`
projeté sur la boîte SVG. `createTransformer()` en tire **deux facteurs
indépendants** (`geometry-core/viewport/viewport.ts:38-66`) :

```ts
const scaleX = svgWidth / (xMax - xMin);
const scaleY = svgHeight / (yMax - yMin);
```

Rien n'impose `scaleX === scaleY`. Et l'interface l'exploite : **on redimensionne
un seul axe en tirant dessus.** `detectDragMode()`
(`GraphSVG.svelte:183-201`) regarde si le pointeur est à moins de `AXIS_THRESHOLD`
d'un axe ; près de l'axe des abscisses le glisser passe en `scale-x`, près de
l'axe des ordonnées en `scale-y`, ailleurs en `pan` (près de l'origine, `pan`
l'emporte). Le facteur est `1.005^±d` (`GraphSVG.svelte:262-291`), donc continu.

**`GeometryCanvas`** décrit sa vue par un centre plus **un unique `ppu`**
(pixels par unité, `GeometryCanvas.svelte:158-173`) :

```ts
xMin: viewCenter.x - width / (2 * ppu),   yMin: viewCenter.y - height / (2 * ppu)
```

Le rectangle est donc **dérivé** d'un seul facteur : `scaleX === scaleY` par
construction, et la molette ne change que `ppu`
(`GeometryCanvas.svelte:605-625`). Il n'existe aucun chemin, dans l'état actuel
du composant, pour donner deux échelles différentes aux deux axes.

**Ce n'est pas un oubli, c'est une contrainte de domaine.** Une figure de
géométrie exige l'isotropie : un cercle doit être rond, un angle droit doit
paraître droit, deux longueurs égales doivent se voir égales, et le compas de
`constructions-v2` n'a de sens qu'ainsi. L'analyse exige l'inverse : on ne voit
`e^x`, `1/x` ou une suite qui converge lentement qu'en écrasant un axe.

**Les deux modules ne peuvent donc pas fusionner leur repère sans que l'un des
deux perde quelque chose.** C'est la justification la plus solide de leur
coexistence — plus solide que tout ce qui a été écrit jusqu'ici.

## 2. Systèmes de coordonnées

| Système                         | grapheur | `geometry-core`                                     |
| ------------------------------- | -------- | --------------------------------------------------- |
| Cartésien explicite `y = f(x)`  | ✅       | ✅ `courbe("x^2")`                                  |
| Suites `(n, uₙ)` et escalier    | ✅       | ❌                                                  |
| Paramétrique `t ↦ (x(t), y(t))` | ❌       | ✅                                                  |
| Polaire `r = f(θ)`              | ❌       | ✅ (`builtins.ts:1147`)                             |
| Implicite `F(x, y) = 0`         | ❌       | ✅ (marching squares)                               |
| Coniques (équation du 2ᵈ degré) | ❌       | ✅ + `axes`, `foyers`, `directrice`, `excentricite` |
| Définition par morceaux         | ❌       | ✅ (`piecewise-parser.ts`)                          |
| Échelle logarithmique           | ❌       | ❌                                                  |
| Graduations en multiples de π   | ❌       | ❌                                                  |

Donc : **le grapheur ne connaît qu'un seul système de coordonnées**, le cartésien
explicite. Tout le reste est chez `geometry-core`. En revanche `geometry-core`
ignore les suites.

À noter : `ExplicitFunction` porte un champ `variable: string` censé nommer la
variable libre, mais `createEvaluator()` code `{ x }` en dur
(`evaluator.ts:199-215`) — le champ est **stocké et ignoré**. C'était déjà relevé
au §3.2 du doc « suites ».

## 3. Inventaire fonctionnel comparé

### Analyse

| Capacité                                             | grapheur                   | `geometry-core`                            |
| ---------------------------------------------------- | -------------------------- | ------------------------------------------ |
| Zéros                                                | ✅ numérique               | ✅ `zeros()` exact+numérique               |
| Extrema                                              | ✅ numérique               | ✅ `extrema()` exact+numérique             |
| Points d'inflexion                                   | ❌                         | ✅ `inflections()`                         |
| Asymptotes de `y = f(x)` (V, H, **obliques**)        | ✅ (`analysis.ts:352-692`) | ❌                                         |
| Asymptotes d'hyperbole                               | ❌                         | ✅ `asymptotes()`                          |
| Intersections de deux courbes                        | ✅ numérique               | ✅ symbolique (`intersectFF`)              |
| Tangente                                             | ❌                         | ✅ `tangente()`                            |
| Courbe dérivée                                       | ❌                         | ✅ `derivee()`                             |
| Intégrale / aire sous la courbe / entre deux courbes | ❌                         | ✅ `integrale()`, `aire()`, `aire_entre()` |
| Courbure, cercle osculateur                          | ❌                         | ✅                                         |
| Longueur d'arc                                       | ❌                         | ✅ `longueur()`                            |
| Lecture de valeur au survol                          | ✅ `CurveHover`            | ❌                                         |
| Tableau de valeurs                                   | ✅ (suites)                | ❌                                         |

### Interaction et modèle

| Capacité                           | grapheur                         | `geometry-core`                                             |
| ---------------------------------- | -------------------------------- | ----------------------------------------------------------- |
| Pan / zoom                         | ✅                               | ✅                                                          |
| **Mise à l'échelle d'un seul axe** | ✅                               | ❌ (impossible par construction)                            |
| Points déplaçables à la souris     | ❌                               | ✅ (`freePoint`, `point_sur`, vecteurs, étiquettes)         |
| **Curseur paramètre**              | ❌                               | ✅ `slider(min, max, valeur, pas)` + `SliderControl.svelte` |
| Undo / redo                        | ❌                               | ✅ (`graph/undo-redo.ts`)                                   |
| Aimantation à la grille            | ❌                               | ✅ (`interaction/snap.ts`)                                  |
| Hit-testing                        | partiel (axes)                   | ✅ (`interaction/hit-testing.ts`)                           |
| Graphe de dépendances entre objets | ❌                               | ✅ (`graph/dependency-graph.ts`)                            |
| Macros, boucles `pour`, `si/sinon` | ❌                               | ✅ (DSL)                                                    |
| Animation de construction          | ❌                               | ✅ (`constructions-v2`)                                     |
| Persistance                        | ✅ localStorage + Zod            | ✅ schémas Zod (434 l.)                                     |
| Export SVG / PNG                   | ✅ (sérialisation du SVG vivant) | ✅ `exportToSVG` (partiel)                                  |
| Export TikZ / Typst                | ❌                               | ✅ mais **partiel et sans appelant** (voir §6)              |

## 4. Doublons

### 4.1 Ce qui est déjà partagé (pas de doublon)

- **Viewport** : `grapheur/viewport.ts` (21 l.) est un **pur ré-export** de
  `geometry-core/viewport`.
- **Splines** : `grapheur/bezier.ts` (14 l.) est un **pur ré-export** de
  `geometry-core/rendering/bezier.ts` (Catmull-Rom → Bézier).
- **Palette** : `grapheur/colors.ts` (17 l.) idem.
- **Zéros et extrema exacts** : `findCriticalZeros` / `findCriticalExtrema`
  vivent dans `$lib/mathAST/analysis` et sont importés **par les deux**.
- **Parsing et compilation** : `mathAST` pour les deux.

### 4.2 Doublons réels

| Sujet                              | grapheur                                                                                                               | `geometry-core`                                                                                                   | Nature du doublon                                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Intersection courbe∩courbe**     | `intersections.ts:53` `findIntersections` — échantillonnage, changement de signe, bissection sur des closures (260 l.) | `geometry/intersections.ts:816` `intersectFF` — soustraction **symbolique** `f₁ − f₂` puis `findRoots` de mathAST | Deux algorithmes indépendants pour le même problème. Celui de `geometry-core` est meilleur (exact quand il peut). |
| **Pas de grille**                  | `GridLines.svelte:36-77` `calculateGridSpacing` (suite 1-2-5 maison)                                                   | `viewport/grid.ts` `computeGridStep` (suite 1-2-5, 40-200 px)                                                     | Deux implémentations de la même heuristique.                                                                      |
| **Graduations d'axes**             | `AxisLines.svelte:47-68` `calculateTickSpacing` (encore une suite 1-2-5)                                               | même `computeGridStep`                                                                                            | Troisième copie de la même heuristique, dans le même module que la deuxième.                                      |
| **Recherche de racines numérique** | `analysis.ts:71` `findRoots` + `bisectRoot`                                                                            | mathAST `findRoots`                                                                                               | Le grapheur garde sa version numérique **et c'est elle qui tourne** (voir §5.2).                                  |

### 4.3 Doublon fonctionnel, pas de code

Deux stratégies d'export coexistent sans se connaître : le grapheur **sérialise
le SVG vivant du DOM** (`grapheur/export.ts`, 426 l.), `geometry-core`
**régénère** du SVG/TikZ/Typst depuis le modèle (`rendering/export-*.ts`,
1 841 l.). La première marche pour tout ce qui est affiché et ne donne que du
raster/SVG ; la seconde donne du vectoriel de document mais ne couvre qu'une
partie des types.

## 5. Défauts trouvés en chemin

Trois, tous vérifiés, aucun corrigé (hors périmètre de ce relevé).

### 5.1 La grille ne suit pas la mise à l'échelle par axe

`GridLines.svelte:72-77` calcule **un pas unique** à partir de
`max(xRange, yRange)` — commentaire à l'appui : « maintains square grid ». Mais
`AxisLines.svelte:110-113` calcule les graduations **par axe**. Tant que les deux
échelles sont proches, personne ne voit rien. Dès qu'on se sert du
redimensionnement par axe — la fonctionnalité phare du grapheur, §1 — grille et
graduations divergent : avec `x ∈ [−10 ; 10]` et `y ∈ [−1000 ; 1000]`, le pas de
grille est tiré de 2000 et vaut 200, donc **plus aucune ligne verticale ne tombe
dans la fenêtre**, alors que les graduations de l'axe des abscisses, elles,
restent justes.

**Corrigé le 2026-09-07** — `GridLines` calcule désormais `xSpacing` et
`ySpacing` séparément. Test de non-régression :
`GridLines.svelte.test.ts` (deux fenêtres anisotropes + une isotrope).

### 5.2 L'analyse « exacte » du grapheur est du code mort

`analyzeFunction()` (`analysis.ts:735-793`) accepte un paramètre optionnel `ast`
et, quand il est fourni, passe par `findCriticalZeros` / `findCriticalExtrema` de
mathAST — chemin exact, `confidence: 1.0`. Sinon il retombe sur le numérique.

**Aucun des trois appelants ne passe `ast`** : `SpecialPoints.svelte:53-61`,
`CurveHover.svelte:66-74` et `AsymptoteLines.svelte:54-62` construisent tous
`{ id, evaluator }` — alors que `f.ast` est là, testé juste au-dessus dans le
`.filter()`, et sert à fabriquer l'évaluateur.

Le commit `4514109e3` (2026-04-25) n'a touché que `analysis.ts` et sa doc ; son
message le dit sans le voir : « Backward-compatible: all 218 Grapheur tests pass
**without modification** ». Rien n'a changé pour l'application. Le grapheur
affiche donc aujourd'hui des zéros et des extrema **purement numériques**,
pendant que `zeros()` / `extrema()` de `geometry-core` utilisent le chemin exact.
**Corrigé le 2026-09-07** — un constructeur unique `toAnalysisInputs()`
(`grapheur/analysis.ts`) remplace les trois `.map()` : il filtre les fonctions
explicites visibles, construit l'évaluateur **et** l'AST (dérivée comprise,
mémoïsée par `WeakMap` sur le nœud pour qu'un pan ne redérive pas). Les trois
composants tiennent maintenant en une ligne, l'oubli n'est plus possible.

Gain vérifié : le grapheur n'affichait **pas le sommet de `x² − 2`** — la dérivée
numérique vaut exactement 0 au point échantillonné, donc aucun changement de
signe n'était détecté. Il l'affiche désormais, avec `confidence = 1`.

### 5.2 bis — le câblage a révélé un bug de `solve()` dans mathAST

Brancher l'analyse exacte telle quelle **ajoutait un faux zéro** : sur `(x-1)²`,
le grapheur affichait deux marqueurs, dont un à `x = 0` où la courbe est à
hauteur 1 (vérifié par test, en désactivant le garde-fou).

Cause : `solve((x-1)^2 = 0)` renvoie `x = 0`. `extractQuadraticCoefficients`
(`solve/solvers/quadratic.ts:48`) classe `(x-1)²` en terme de degré 2 via
`getPolynomialDegree`, puis en tire un « coefficient »
`a = (x-1)²/x²` — qui **dépend encore de `x`** — avec `b = c = 0`. La formule
quadratique sur `a·x² = 0` donne alors `x = 0`, marqué exact. Même symptôme sur
`(x-3)²` → 0, `(2x-4)²` → 0, `(x-1)³` → 0. La forme développée `x²-2x+1` est
correcte.

**Corrigé ici, en aval seulement** : `annulsFunction()` dans
`mathAST/analysis/critical-points.ts` rejette tout candidat de `solve()` qui
n'annule pas la fonction, avec une tolérance relative à l'amplitude locale (une
fonction raide garde une tolérance proportionnellement plus large). Le zéro
correct est alors retrouvé par la phase numérique. Bénéficie aussi à
`zeros()` / `extrema()` de `geometry-core`, qui produisaient le même faux point.

**NON corrigé — à trancher** : la cause racine dans
`extractQuadraticCoefficients`. Le correctif évident (refuser des coefficients
qui contiennent encore la variable) est juste, mais cette fonction est partagée
avec le _stepper quadratique pédagogique_ (`pedagogical-solve/quadratic.ts`) :
`solve((x-1)^2 = 0)` passerait de « unique, x = 0 » à un échec, ce qui peut
changer le comportement de questions en production. Décision produit, pas
technique.

### 5.3 Les exporteurs de `geometry-core` sont partiels et sans appelant

Déjà consigné au §13.1-13.2 de `suites-grapheur-progress.md`. Rappel : `function`
(la courbe de `f`), `locus`, `trace`, `implicitCurve` et `integralArea` ne sont
exportés par **aucun** des trois exporteurs ; et `exportToTikZ` / `exportToTypst`
/ `exportToSVG` n'ont aucun appelant applicatif.

## 6. Dépendance croisée entre les deux modules

Le fait architectural le plus notable, et il n'est documenté nulle part :

- le grapheur importe de `geometry-core` : viewport, Bézier, palette (16 sites) ;
- **`geometry-core` importe du grapheur** :
  - `figure.ts:153` → `sampleParametric2D` depuis `$lib/grapheur/sampler`
  - `svg-primitives.ts:1383` → `sampleWithDerivative` depuis `$lib/grapheur/sampler`

Le moteur de bas niveau dépend donc de l'application censée être au-dessus de
lui. `grapheur/sampler.ts` (700 l.) est en pratique **un module partagé qui porte
le mauvais nom et vit au mauvais endroit**.

## 7. Forces et faiblesses

### Grapheur

**Forces** — le repère anisotrope et le redimensionnement par axe (unique dans le
projet) ; le survol lecteur de valeurs ; les asymptotes obliques ; les suites avec
tableau de valeurs ; la persistance localStorage ; un export SVG/PNG qui marche
sur tout ce qui est affiché ; une UI légère et immédiate, sans langage à
apprendre.

**Faiblesses** — un seul système de coordonnées ; aucun paramètre ni curseur ;
rien de déplaçable à la souris ; pas d'intégrale, de tangente, de dérivée ; grille
incohérente avec sa propre fonctionnalité phare (§5.1) ; analyse exacte branchée
mais jamais appelée (§5.2) ; 12 fichiers de tests pour 7 400 lignes.

### `geometry-core`

**Forces** — 80 types d'objets, 92 primitives de DSL ; tous les systèmes de
coordonnées ; l'analyse la plus complète (intégrale, tangente, dérivée, courbure,
inflexions, coniques) ; interaction riche (drag, sliders, undo/redo, aimantation,
hit-testing) ; graphe de dépendances et recalcul réactif ; macros et boucles ;
155 fichiers de tests.

**Faiblesses** — repère isotrope, donc **inutilisable tel quel pour l'analyse
d'une fonction à forte dynamique** ; pas de suites ; pas d'asymptotes de fonction ;
pas de survol lecteur ; exporteurs partiels et sans appelant (§5.3) ; consommé
seulement par les démos et `constructions-v2` ; 34 000 lignes à maintenir.

## 8. Ce que ce relevé n'a pas tranché

Trois chantiers, par coût croissant. **Chacun précise le module concerné** —
ils ne sont pas tous du même côté.

### Chantier 1 — corriger les trois défauts du §5

| §   | Module          | Fichiers                                                                                                       | Coût                                                       |
| --- | --------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 5.2 | **grapheur**    | `analysis.ts:735-793` + `SpecialPoints.svelte:53-61`, `CurveHover.svelte:66-74`, `AsymptoteLines.svelte:54-62` | **~3 lignes**                                              |
| 5.1 | **grapheur**    | `GridLines.svelte:72-77` (à aligner sur `AxisLines.svelte:110-113`)                                            | ~10 lignes                                                 |
| 5.3 | `geometry-core` | `rendering/export-{svg,tikz,typst}.ts`                                                                         | moyen — hors sujet tant que l'export n'est pas un objectif |

Deux réparations dans le grapheur, une dans `geometry-core`. Aucune ne dépend
d'une décision d'architecture.

### Chantier 2 — dissoudre les doublons du §4.2

Les trois consistent à retirer du code **du grapheur** au profit de
`geometry-core` :

| Doublon                    | Supprimé dans                                        | Conservé dans                                                         |
| -------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| Heuristique de pas 1-2-5   | grapheur — `GridLines` **et** `AxisLines` (2 copies) | `geometry-core/viewport/grid.ts`                                      |
| Intersection courbe∩courbe | grapheur — `intersections.ts` (260 l., numérique)    | `geometry-core/geometry/intersections.ts` (`intersectFF`, symbolique) |
| Échantillonnage de courbes | grapheur — `sampler.ts` **déplacé**, pas supprimé    | `geometry-core` — qui l'importe déjà (§6)                             |

Le déplacement de `sampler.ts` redresse la dépendance croisée du §6. Aucun de
ces trois points ne change ce que voit l'utilisateur.

Note : généraliser `computeGridStep` pour accepter un pixels-par-unité **par
axe** règle du même coup le défaut §5.1.

### Chantier 3 — décider ce que chaque module doit devenir

Le §1 établit que la fusion des repères est impossible sans perte. Deux modèles :

- **Deux outils sur un socle partagé** (état actuel, assaini). `geometry-core`
  garde l'isotropie et la géométrie ; le grapheur garde l'anisotropie et
  l'analyse de fonctions ; le socle commun (viewport, sampler, Bézier, palette,
  heuristique de grille, mathAST) est explicite et vit d'un seul côté. On accepte
  que chaque outil ait des trous que l'autre comble.
- **Un moteur unique dont le repère devient un paramètre.** Le module qui bouge
  est alors **`GeometryCanvas`**, pas le grapheur : son `ppu` scalaire
  (`GeometryCanvas.svelte:160`) devient un couple `(ppuX, ppuY)`, avec un verrou
  d'isotropie actif par défaut. Touche le hit-testing, l'aimantation, le rendu
  des cercles et des angles, et les instruments de `constructions-v2`. Gros.

### Élément de décision

Les manques ressentis côté grapheur — **curseur sur `u₀`**, point déplaçable,
tangente, intégrale — existent **tous déjà dans `geometry-core`**. Ce qui manque
à `geometry-core`, c'est **l'anisotropie du repère** et les suites elles-mêmes.

La question n'est donc pas « où mettre les suites », mais : **le grapheur
doit-il gagner des paramètres, ou `GeometryCanvas` doit-il gagner un repère
anisotrope ?**
