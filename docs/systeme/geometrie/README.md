# Géométrie : `geometry-core` et `constructions-v2`

Vue d'ensemble du moteur de géométrie de Chiphre. Référence du langage :
[dsl-builtins.md](dsl-builtins.md). Règles courtes pour un agent qui code dans le module :
[`src/lib/geometry-core/CLAUDE.md`](../../../src/lib/geometry-core/CLAUDE.md).

> Vérifié contre le code le 2026-10-10. Chaque fichier, fonction et builtin cité existe à cette
> date (`git ls-files`, `git grep -w`). Ce qui n'est pas dans cette page ni dans
> `dsl-builtins.md` n'est pas garanti : lire le code.

---

## 1. À quoi ça sert

Un **langage de figures en français** (le « DSL ») et son moteur :

```
A = point(0, 0)
B = point(4, 1)
c = cercle(A, passant=B)
d = mediatrice(A, B) @euclide
f = courbe("y = sin(x)")
I = integrale(f, 0, \pi)
```

Le même script sert à quatre usages :

| Usage                                         | Où                                                                | Interactif ? |
| --------------------------------------------- | ----------------------------------------------------------------- | ------------ |
| Figure dans un contenu (énoncé, cours, chat)  | bloc ubumark ` ```figure ` → écran (SVG) + PDF (Typst)            | non          |
| Figure dynamique (démos, éditeur)             | `GeometryCanvas.svelte` : glisser les points, curseurs            | oui          |
| Construction animée (règle, compas, équerre…) | `constructions-v2` : lecteur pas à pas, routes `/constructions/*` | lecture      |
| Pages de démonstration                        | `/geometry-demo/*` (30 pages), `/construction-demo`               | oui          |

Le moteur calcule en **exact** quand il peut (coordonnées `MathNode` de mathAST) et en flottant
sinon (déplacement à la souris, transcendantes, échantillonnage), avec des solveurs numériques
(Newton, Simpson, marching squares) pour les courbes.

## 2. Carte du code

### `src/lib/geometry-core/` (~36 000 lignes hors tests)

| Dossier        | Rôle                                                          | Fichiers clés                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dsl/`         | Lire et exécuter un script                                    | `tokenizer.ts`, `parser.ts`, `interpreter.ts`, `builtins.ts` (7 400 lignes, les 92 builtins), `transform-apply.ts`, `serializer.ts`, `errors.ts`                                              |
| `graph/`       | La figure : objets, dépendances, recalcul, solveurs           | `figure.ts` (classe `Figure`, ~5 000 lignes), `dependency-graph.ts`, `compute-position.ts`, `compute-locus.ts`, `parametric-*.ts`, `undo-redo.ts`                                             |
| `types/`       | Les ~90 types `Geo*` et leurs gardes `isXxx`                  | `elements.ts`, `geo-value.ts` (`GeoValue` exact/numérique), `primitives.ts`, `schemas.ts` (Zod)                                                                                               |
| `compute/`     | Arithmétique sur `GeoValue`                                   | `geo-arithmetic.ts`, `to-number.ts` (`geoToNumber`), `compare.ts`                                                                                                                             |
| `geometry/`    | Formules analytiques                                          | `intersections.ts`, `transformations.ts`, `affine-transform.ts`, `conic-classify.ts`, `conic-properties.ts`, `circumcircle.ts`                                                                |
| `rendering/`   | Dessin et exports                                             | `svg-primitives.ts`, `export-svg.ts`, `export-typst.ts`, `export-tikz.ts`, `marching-squares.ts`, `bezier.ts`, `rough-geometry.ts`, `colors.ts`, `label-placement.ts`, `viewport-clipping.ts` |
| `viewport/`    | Repère écran ↔ maths, grille, échantillonnage                | `viewport.ts` (`panViewport`, `zoomViewport`), `grid.ts` (`computeGridStep`), `sampler.ts`                                                                                                    |
| `interaction/` | Souris                                                        | `hit-testing.ts` (`findPointNear`, `findElementNear`), `snap.ts` (`snapToGrid`)                                                                                                               |
| `validation/`  | Prédicats de vérification (`checkParallel`, `checkDistance`…) | `checks.ts` — **aucun appelant hors du module** aujourd'hui                                                                                                                                   |

Point d'entrée : `index.ts` (barrel). API du DSL : `dsl/index.ts` → `parseDsl`, `interpretDsl`,
`runDsl`, `serializeDsl`, `createStepper`.

### `src/lib/constructions-v2/` (animation de constructions)

| Partie                                       | Rôle                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `core/executor.ts`                           | `ConstructionExecutor` : exécute le script pas à pas (`createStepper`), gère directives et instruments |
| `core/timeline.svelte.ts`                    | `Timeline` : lecture, pause, vitesse (runes)                                                           |
| `core/choreographies/`                       | Chorégraphies `@euclide` / `@equerre` : `registry.ts`, `resolve.ts`, une par builtin                   |
| `core/animator.ts`, `core/render-helpers.ts` | Tracé partiel (`partialSegment`, `partialArc`, `partialSegmentSVG`…)                                   |
| `instruments/`                               | `Ruler`, `Compass`, `CompassRaised`, `Protractor`, `SetSquare`, `Pencil` (.svelte) + `positioning.ts`  |
| `components/`                                | `ConstructionPlayer`, `ConstructionCanvas` (sur `GeometryCanvas`), `ScriptEditor`, contrôles           |
| `converter.ts`                               | `convertXmlToDsl` : import des fichiers XML InstrumenPoche                                             |
| `constants.ts`                               | Durées (`MS_PER_PIXEL`, `MS_PER_DEGREE`, `DEFAULT_PAUSE_DURATION`…)                                    |

Les scripts sont stockés en base dans `constructions.dsl_script`. Routes :
`src/routes/(protected)/constructions/` (liste, `[id]`, `[id]/edit`, `new`, `conversion`) et
`src/routes/(public)/construction-demo/`.

⚠️ L'ancien module `src/lib/constructions/` (XML, avant le DSL) vit encore : utilisé par
`whiteboard/components/InstrumentLayer.svelte`, `QuestionTemplateForm.svelte` et
`routes/api/constructions/convert`. Il ne fait pas partie de ce système.

### Composants et consommateurs

| Fichier                                                                     | Rôle                                                                                |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/lib/components/geometry/GeometryCanvas.svelte`                         | Toile interactive : SVG, rough.js (main levée), MathLive (`mtexte`), drag, curseurs |
| `src/lib/components/geometry/ElementPopover.svelte`, `SliderControl.svelte` | Panneau d'un objet, curseur                                                         |
| `src/lib/ubumark/utils/figure-scene.ts`                                     | Bloc ` ```figure ` : interprète, refuse ce que le PDF ne sait pas dessiner, budget  |
| `src/lib/ubumark/utils/figure-svg.ts`                                       | Bloc ` ```figure ` à l'écran : SVG statique (`figureToSvg`), sans `GeometryCanvas`  |
| `src/lib/ubumark/generators/figure-typst.ts`                                | Bloc ` ```figure ` au PDF : `exportToTypst`                                         |
| `src/lib/components/markdown/nodes/FigureBlock*.svelte`                     | Composants du bloc (chargement à la demande)                                        |

### Frontière avec le grapheur

Le **grapheur** (`src/lib/grapheur/`, `components/grapheur/`) et le bloc ` ```courbe `
(`ubumark/utils/courbe-scene.ts`) n'utilisent **ni le DSL ni `Figure`**. Ils empruntent seulement
des briques de `geometry-core` : `viewport/` (repère, grille, `sampler.ts`), `rendering/bezier.ts`,
`rendering/colors.ts` (`CURVE_COLORS`, 4 couleurs × 2 styles de trait) et
`graph/parametric-calculus.ts`. Toucher à ces fichiers, c'est toucher au grapheur : lancer aussi
`src/lib/grapheur/__tests__/`.

## 3. Le DSL

Chaîne : `tokenizer.ts` → `parser.ts` (AST `DslProgram`, types dans `dsl/types.ts`) →
`interpreter.ts` (classe `Interpreter`) → appels à `executeBuiltin` (`builtins.ts`) → méthodes
`figure.createXxx(...)`.

- **Dispatch** : `interpreter.ts` (`evaluateCall`) traite d'abord `unite_angle`, puis les fonctions
  mathématiques (`MATH_FUNCTIONS`), puis les macros utilisateur (prioritaires), puis les builtins
  (`BUILTIN_NAMES.has(name)` → `executeBuiltin` → `HANDLERS.get(name)`). Plus de grand `switch` :
  une fonction `handleXxx(ctx: BuiltinCtx)` par builtin, enregistrée par `HANDLERS.set`.
- **Retours** : `BuiltinResult` (un objet), `BuiltinMultiResult` (plusieurs), `BuiltinScalarResult`
  (nombre) ; `styleTargetId` envoie les arguments de style vers un objet compagnon (zone d'une
  intégrale).
- **Exact d'abord** : une expression mathématique pure va à mathAST (`math-pure-expr.ts`) et donne
  une valeur exacte ; mêlée à un curseur, elle devient un scalaire réactif.
- **Erreurs** : `DslParseError` (syntaxe, ligne et colonne), `DslRuntimeError` (exécution). La forme
  structurée `new DslRuntimeError({ summary, hint?, forms? }, line)` alimente le panneau d'erreur
  (liste des formes acceptées) ; la forme chaîne existe encore sur des sites anciens.
- **Directives et décorateurs** : `@pause(500)` est une instruction (`DslDirective`, transmise au
  `onDirective` de l'appelant) ; `@euclide` après une affectation est un décorateur
  (`parseTrailingDecorators`), lu par `constructions-v2`. Hors construction, ils sont ignorés
  (et refusés par le bloc ` ```figure `).
- **Aller-retour** : `serializeDsl(figure, symbols, { angleMode })` régénère un script.
- **Limites** : 100 000 caractères, 1 000 tours par boucle, macros imbriquées ≤ 10,
  `InterpretOptions.maxSteps`, `Figure.setElementLimit` (bloc ` ```figure `).

Liste complète des builtins, arguments communs, angles, intégrales : [dsl-builtins.md](dsl-builtins.md).

## 4. Le runtime réactif

`Figure` (`graph/figure.ts`) est une classe TypeScript **sans runes** : elle tient les objets
(`elements`), leurs positions calculées et un `DependencyGraph`.

1. Chaque `createXxx` ajoute un objet et ses parents au graphe (`addNode` : parent inconnu,
   auto-référence ou doublon = erreur ; un nouvel objet n'a pas d'enfant, donc pas de cycle).
2. Déplacer un point (`movePoint`) ou un curseur marque ses descendants « sales » (`markDirty`).
3. `recompute()` recalcule les objets sales dans l'ordre topologique (Kahn) ; la formule de chaque
   type est dans `compute-position.ts` (`computeElementPosition`, une branche par type).
4. Supprimer un objet supprime ses descendants.
5. Annuler / rétablir : `beginTransaction` / `commit` / `undo` / `redo` (deltas, `undo-redo.ts`).

**Côté Svelte**, la réactivité est un compteur : `GeometryCanvas` incrémente `version = $state(0)`
après chaque mutation, et ses `{#each}` sont indexés par `${el.id}_${version}` — tout est redessiné.
Grossier mais suffisant : les calculs coûteux sont mis en cache en amont (§ invariants).

**Valeurs** : `GeoValue = GeoExact (MathNode) | GeoNumeric (number)` ; un paramètre peut aussi
être une référence à un scalaire (`ScalarRef`) ou un infini (`InfinityParam`). Opérer sur des
`GeoValue` : `compute/geo-arithmetic.ts` ; convertir pour dessiner : `geoToNumber`, le plus tard
possible.

**Solveurs** (`graph/`) :

| Besoin                                                        | Fonction                                                                                                              |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Point glissant sur une courbe paramétrique                    | `findClosestParameterOnCurve` (Newton multi-départs, `warmStartT` en drag) via `movePointOnParametricCurveFromCursor` |
| Paramétrique × paramétrique                                   | `findParametricIntersections` (Newton 2D)                                                                             |
| Paramétrique × droite, cercle, segment, demi-droite, fonction | `findParametric{Line,Circle,Segment,Ray,Function}Intersections` (Newton 1D)                                           |
| Longueur, courbure, cercle osculateur                         | `computeArcLength` (Simpson), `computeCurvature`, `computeOsculatingCircle`                                           |
| Lieu                                                          | `computeLocusCurve`                                                                                                   |
| Courbe implicite                                              | `marchingSquares` (`rendering/`)                                                                                      |

### Invariants (à ne pas casser)

- **Pas d'`eval` ni de `new Function`** dans le pipeline : les expressions passent par `compile()`
  de `$lib/mathAST/eval/compile`.
- **`graph/` n'importe jamais `dsl/` en valeur** (aucune occurrence aujourd'hui). Un helper partagé
  va dans `$lib/mathAST/analysis/` ou un dossier commun.
- **Gardes de type** : `types/elements.ts` exporte 86 fonctions `isXxx` ; tout code nouveau les
  utilise au lieu de `as GeoXxx` (42 casts historiques subsistent, ne pas en ajouter).
- **Caches — ne jamais muter un résultat** : `PARSE_CACHE` et `PARSE_FAILURE_CACHE` plafonnés à
  5 000 entrées (`clear()` aux sites d'insertion, `interpreter.ts`) ; `marchingSquares` (WeakMap
  par fonction compilée) ; `computeLocusCurve` (WeakMap par lieu, clé = valeurs de
  `locus.dependsOn` — `createLocus` doit y mettre TOUTE la fermeture transitive) ;
  `computeParametricCurveSampling` (clé `buildParametricSamplingKey` : tout nouveau paramètre
  d'échantillonnage doit y entrer) ; dérivées secondes pré-compilées `compiledXSecond` /
  `compiledYSecond` sur `GeoParametricCurve` (sinon `courbure` et `cercle_osculateur` rendent
  `null` en silence).
- **Boucles chaudes : un seul `env` mutable** (`env[param] = t`), jamais `{ ...bindings, [param]: t }`
  dans une boucle (`parametric-newton.ts`, `computeParametricCurveSampling`).
- **Un type visible = quatre surfaces** : `GeometryCanvas.svelte`, `svg-primitives.ts` (+
  `export-svg.ts`), `export-tikz.ts`, `export-typst.ts`. Aucun contrôle de type ne le rappelle.
- **Prolonger une droite à la fenêtre** : `extendLineToViewport` / `extendRayToViewport`
  (`rendering/viewport-clipping.ts`, coordonnées maths, pour TikZ et Typst) ; la variante pixels de
  `svg-primitives.ts` (`extendLineToBounds`) reste séparée.

## 5. Le rendu

| Surface            | Code                                                     | Utilisé par                                   |
| ------------------ | -------------------------------------------------------- | --------------------------------------------- |
| Toile interactive  | `GeometryCanvas.svelte` + `svg-primitives.ts` + rough.js | démos, éditeur, `ConstructionCanvas`          |
| SVG statique       | `figure-svg.ts` (bloc), `exportToSVG` (`export-svg.ts`)  | bloc ` ```figure ` à l'écran                  |
| PDF (Typst / cetz) | `exportToTypst` (`export-typst.ts`)                      | bloc ` ```figure ` au PDF (`figure-typst.ts`) |
| TikZ               | `exportToTikZ` (`export-tikz.ts`)                        | **aucun appelant dans l'application** (tests) |

- **Courbes** : échantillonnage (`viewport/sampler.ts`, `computeParametricCurveSampling`) puis
  lissage (`bezier.ts`) ; courbes implicites par `marchingSquares`.
- **PDF découpé** : `exportToTypst({ clipToViewport: true, underlay })` met traits et remplissages
  dans une boîte découpée à la fenêtre ; noms et textes restent au-dessus, jamais coupés.
- **Noms de points** : `etiquette=` → `rendering/label-placement.ts` (bloc ` ```figure `, écran et
  PDF) ; `GeometryCanvas` et les exports SVG/TikZ écrivent toujours en haut à droite.

### Thème clair / sombre

- **Couleurs d'auteur** : un NOM (`couleur="rouge"`, 12 noms, synonymes anglais) est gardé tel quel
  jusqu'au rendu (`resolveColorName` → `$lib/theme/named-colors`), puis devient
  `var(--color-fig-<nom>)` à l'écran (défini en `light-dark()` dans `src/app.css`) et sa variante
  claire au PDF (`NAMED_COLOR_PRINT`, `colorForPrint`). Un hexadécimal reste fixe.
- **Habillage** de `GeometryCanvas` (fond, grille, halos, survol) : tokens `var(--color-*)`
  (`docs/pratiques/css-color-tokens.md`). Couverture :
  `components/geometry/__tests__/GeometryCanvas.theme.svelte.test.ts` (y compris les traits noirs
  des instruments).
- **Grapheur** : couleurs par identité (`curve-1`…`curve-4`, `rendering/colors.ts`), pas par nom.

## 6. Instruments et animations de construction

```
@instrument("regle")
@instruction("Trace la médiatrice de [AB]")
d = mediatrice(A, B) @euclide @arcs_egaux @complet -arcs
@pause(800)
```

- **Directives** (`ConstructionExecutor.handleDirective`) : `@instrument(nom, x=, y=, rotation=)`,
  `@montrer(nom)`, `@cacher([nom])`, `@instruction("texte")`, `@vitesse(facteur)`, `@pause([ms])`.
  Noms d'instruments : `regle`, `compas`, `rapporteur`, `equerre`, `crayon`.
- **Sans décorateur** (mode `direct`), l'exécuteur déduit l'animation des objets créés : règle pour
  un segment, compas pour un cercle ou un arc, durées proportionnelles
  (`MS_PER_PIXEL`, `MS_PER_DEGREE`, bornées par `MIN_STEP_DURATION` / `MAX_STEP_DURATION`).
- **Chorégraphies** : un décorateur choisit `contrainte` (`direct`, `euclide`, `equerre`, `mesure`),
  `methode` (une « voie » du registre) et `visibilite` (`epure`, `squelette` par défaut, `complet`) ;
  `+arcs` / `-arcs`, `traces`, `marqueurs`, `points_aux` ajustent ce qui reste visible (le dernier
  l'emporte). Validation stricte : `resolveDecorators` lève `DecoratorResolveError` avec indice.
- **Registre** (`core/choreographies/registry.ts`) :

| Builtin              | `@euclide`                                  | `@equerre`     |
| -------------------- | ------------------------------------------- | -------------- |
| `mediatrice`         | `arcs_egaux`, `cercles_rayon_ab`            | —              |
| `bissectrice`        | `arcs_egaux`, `arc_milieu`                  | —              |
| `perpendiculaire`    | `rayon_libre`, `arcs_egaux`                 | `pose_equerre` |
| `parallele`          | `parallelogramme`, `double_perpendiculaire` | `pose_equerre` |
| `cercle_circonscrit` | `mediatrices`                               | —              |
| `transporte`         | `compas_report`                             | —              |

- **Erreurs** : `ConstructionExecutor.load()` ne lève que les erreurs de syntaxe ; une erreur
  d'exécution est rangée dans `executor.loadError` (le lecteur garde la figure partielle et affiche
  le panneau). `ConstructionPlayer` lit `loadError` après `load()`.
- **Rendu animé** : `ConstructionCanvas` masque dans `GeometryCanvas` les objets en cours de tracé et
  les dessine partiellement (`render-helpers.ts`) sous l'instrument.

## 7. Comment étendre

### Nouveau builtin

1. Écrire les comportements attendus en français (TDD collaboratif, CLAUDE.md § Planning) ; regarder
   d'abord le handler le plus proche.
2. `function handleX(ctx: BuiltinCtx)` dans `dsl/builtins.ts`, puis `HANDLERS.set('x', handleX)`.
3. **Ajouter `'x'` à `BUILTIN_NAMES`** : sans lui, l'interpréteur ne l'appelle jamais.
4. La création passe par une méthode `figure.createXxx` (`graph/figure.ts`).
5. Erreurs structurées `{ summary, hint, forms }` ; une direction se lit par `resolveDirection`,
   un nombre de points par `requireNPoints`.
6. Un objet principal retourné ; les intermédiaires créés `{ visible: false }`, accessibles par un
   accesseur.
7. Tests dans `dsl/__tests__/`, une ligne dans [dsl-builtins.md](dsl-builtins.md).
8. Bloc ` ```figure ` : si le PDF ne sait pas le dessiner ou si le calcul est coûteux, l'ajouter à
   `REFUSED_CALLS` (`ubumark/utils/figure-scene.ts`).
9. Animation : nouvelle voie dans `core/choreographies/` + une ligne dans `registry.ts`.

### Nouveau type d'objet `Geo*`

Interface + garde `isXxx` + union `GeoElement` dans `types/elements.ts` · branche dans
`compute-position.ts` · les quatre surfaces de rendu (§ invariants) · `serializer.ts` si le script
doit faire l'aller-retour · `interaction/` s'il se manipule · `DRAWABLE_TYPES` de `figure-scene.ts`
s'il doit passer au bloc ` ```figure `.

## 8. Tests

| Où                                        | Fichiers                                               | Cas (`it`/`test`)  |
| ----------------------------------------- | ------------------------------------------------------ | ------------------ |
| `src/lib/geometry-core/**/__tests__/`     | 168                                                    | ~3 480             |
| `src/lib/constructions-v2/**/__tests__/`  | 10                                                     | ~200               |
| `components/geometry/__tests__/` (client) | 1 + harnais `InstrumentHarness.svelte`                 | thème, instruments |
| `ubumark/__tests__/figure/`               | bloc ` ```figure ` (parseur, scène, Typst, étiquettes) |                    |

`dsl/__tests__/` porte plus de la moitié des fichiers (95). Lancer un fichier ciblé :

```bash
pnpm test:server src/lib/geometry-core/graph/__tests__/parametric-newton.test.ts
pnpm test:client src/lib/components/geometry/__tests__/GeometryCanvas.theme.svelte.test.ts
```

Angles morts connus : `compute-position.ts` n'est testé qu'à travers le DSL ; `rendering/bezier.ts`
n'a qu'un test (`bezier-monotone.test.ts`) ; `validation/checks.ts` n'a pas d'appelant.

## 9. Décisions

Pas d'ADR propre à la géométrie ; le PDF suit [ADR 0004](../../adr/0004-pdf-typst-et-jspdf.md)
(Typst). Décisions de conception encore vraies (avril–mai 2026) :

- **SVG plutôt que Canvas** : < 500 objets en contexte scolaire, export et texte LaTeX simples,
  inspection au DOM.
- **Cœur fonctionnel + graphe de dépendances + Svelte en surface** : formules pures, recalcul
  topologique des seuls objets sales, pas de machine à états XState ni de classes profondes.
- **Deux régimes de calcul** : exact (`MathNode`) pour ce qui est défini par le script, flottant
  pendant le drag et pour l'échantillonnage ; pour comparer, préférer les égalités polynomiales
  (AB² = 25 plutôt que AB = 5).
- **Annuler par deltas**, pas par instantanés.
- **Repère partagé avec le grapheur** : `viewport/`, `bezier.ts`, `colors.ts` vivent dans
  `geometry-core`.
- **Un builtin = un objet** (2026-05) : plus de tuples sauf pluriel intrinsèque ; `montre` /
  `masque` pour la visibilité ; anciennes macros de `stdlib.ts` devenues builtins (le mot-clé
  `macro` reste aux auteurs). `polygone_regulier` et `etoile` rendent un polygone.
- **Animation séparée du moteur** : `geometry-core` ignore le temps ; `constructions-v2` pilote un
  stepper et des directives. (La décision d'avril de laisser l'ancien `constructions/` hors du
  moteur a été dépassée : `constructions-v2` est construit SUR le DSL.)

Abandonné ou jamais fait : machine à états d'outils (création d'objets à la souris), index spatial
RBush, `validation/` branché sur des exercices.

## 10. Points ouverts

- `src/lib/utils/game/challenge-variables.ts` évalue encore une chaîne venue de la base par
  `new Function` (hors module ; à remplacer par `compile()`).
- La CSP autorise `unsafe-eval` pour Typst (`src/hooks.server.ts`).
- `figure.ts` (~5 000 lignes) et `builtins.ts` (~7 400 lignes) sont les deux plus gros fichiers.
- Trois interfaces de configuration Newton divergentes : `NewtonConfig`, `IntersectionConfig`,
  `IntersectionConfig1D`.
- Messages d'erreur périmés : la forme `point(s.value, 0)` (seuls `.x` / `.y` existent) et
  l'exemple `style(P, couleur="red", taille=4)` (`taille` n'est pas un argument de style).

Historique (audits de mai 2026, journaux de chantier) : `docs/archive/` — ne décrit pas le code actuel.
