---
couvre:
  - 'src/lib/grapheur/**'
  - 'src/lib/components/grapheur/**'
  - 'src/lib/stores/grapheur*.ts'
  - 'src/lib/geometry-core/viewport/**'
  - src/lib/geometry-core/rendering/bezier.ts
  - src/lib/geometry-core/rendering/colors.ts
  - src/lib/geometry-core/graph/parametric-calculus.ts
  - src/lib/ubumark/parser/courbe-parser.ts
  - src/lib/ubumark/utils/courbe-scene.ts
  - src/lib/atelier/plot-sync.ts
  - src/lib/atelier/display.ts
  - 'src/routes/(public)/grapheur/**'
---

# Le grapheur

> Synthèse des journaux archivés `docs/archive/wip/grapheur-*`, `suites-grapheur-progress.md`,
> `dissoudre-doublons-grapheur-progress.md` et des chantiers couleurs. Vérifié contre le code le
> 2026-10-10.

## À quoi ça sert

Le **moteur de tracé** de fonctions sur un repère : courbes `y = f(x)`, suites (rangs ou
escalier), nuages de points, avec curseurs de paramètres, points remarquables (zéros, extremums,
intersections), asymptotes, tangente, aire sous la courbe, cercle osculateur et export SVG/PNG.

Le grapheur n'est **plus une page autonome** : c'est la vue **Graphe** de l'atelier
([atelier.md](atelier.md)). Il reste deux hôtes :

| Hôte                      | Instance                                                | Panneau de saisie                             |
| ------------------------- | ------------------------------------------------------- | --------------------------------------------- |
| `/atelier` et `/grapheur` | `new GrapheurStore(null)` par atelier, sans persistance | « Mes objets » de l'atelier (`panel={false}`) |
| `/calc` (calculatrice)    | le singleton `grapheurStore`, persisté en localStorage  | `FunctionPanel` du grapheur                   |

`/grapheur` (`src/routes/(public)/grapheur/+page.svelte`) **ouvre l'atelier** sur la vue Graphe ;
ce qu'elle fait des liens `?f=` et `?a=` est décrit dans [atelier.md](atelier.md), pas ici.

**Vocabulaire du code** (CONTEXT.md ne définit pas ces termes) : un **traçable** (`Plottable`)
est une fonction explicite, une suite ou un nuage ; une **place** (`CurveSlot`) est un couple
couleur + style de trait ; la **fenêtre** (`Viewport`) est le rectangle `xMin…yMax` affiché.

---

## Carte du code

### Modèle — `src/lib/grapheur/`

| Fichier                                                                                    | Rôle                                                                                                                                     |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/grapheur/types.ts`                                                                | Union `Plottable`, `Parameter`, types d'analyse, schémas Zod de l'état (`graphStateSchema`), `COORDINATE_LIMIT`                          |
| `src/lib/grapheur/evaluator.ts`                                                            | Saisie LaTeX → AST mathAST (`parseFunction`), évaluation (`evaluateAt`, `createEvaluator`), variables libres                             |
| `src/lib/grapheur/analysis.ts`                                                             | Zéros, extremums, asymptotes (`analyzeFunction`, `analyzeAllFunctions`), dérivée, tangente, intégrale, courbure, caches (`sampleCached`) |
| `src/lib/grapheur/asymptotes-exactes.ts`                                                   | Asymptotes d'une fraction rationnelle par division euclidienne (`exactAsymptotes`)                                                       |
| `src/lib/grapheur/asymptote-labels.ts`                                                     | Placement des étiquettes d'asymptotes dans le cadre (`placeAsymptoteLabels`)                                                             |
| `src/lib/grapheur/intersections.ts`                                                        | Intersections entre courbes visibles (`findAllIntersections`), via `findRoots` de mathAST                                                |
| `src/lib/grapheur/sequence.ts`                                                             | Suites explicites et récurrentes (`parseSequence`, `computeSequenceTerms`, `computeCobwebPath`)                                          |
| `src/lib/grapheur/exact.ts`                                                                | Valeur exacte d'un terme de suite (`exactTermValue`), ou `null`                                                                          |
| `src/lib/grapheur/pinned-labels.ts`                                                        | Étiquettes figées par un clic (`cyclePinnedLabels`) — non persistées                                                                     |
| `src/lib/grapheur/format.ts`                                                               | Forme décimale unique d'une valeur affichée (`formatGraphValue`)                                                                         |
| `src/lib/grapheur/slider.ts`                                                               | Curseur piloté par entiers (`toSliderIndex`, `fromSliderIndex`, `SLIDER_STEPS`)                                                          |
| `src/lib/grapheur/export.ts`                                                               | Export SVG / PNG (`prepareSvgForExport`, `exportSvg`, `exportPng`)                                                                       |
| `src/lib/grapheur/viewport.ts`, `src/lib/grapheur/bezier.ts`, `src/lib/grapheur/colors.ts` | **Ré-exports** de `geometry-core` (voir plus bas)                                                                                        |

### État — `src/lib/stores/`

| Fichier                              | Rôle                                                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/stores/grapheur.svelte.ts`  | Classe `GrapheurStore` (runes) : traçables, paramètres, fenêtre, curseur, sérialisation, localStorage ; singleton `grapheurStore` |
| `src/lib/stores/grapheur-context.ts` | `provideGrapheurStore` / `useGrapheurStore` : l'instance passée par contexte, repli sur le singleton                              |

### Composants — `src/lib/components/grapheur/`

| Composant                                                                                                               | Rôle                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `GrapheurContainer.svelte`                                                                                              | Conteneur ; props `store` (fournie par contexte) et `panel`                                     |
| `GraphSVG.svelte`                                                                                                       | Le SVG : taille, glisser (`pan`, `scale-x`, `scale-y`), couches, survol et clics                |
| `GridLines.svelte`, `AxisLines.svelte`                                                                                  | Grille et axes gradués, pas tiré de `computeGridStep` (geometry-core)                           |
| `FunctionCurve.svelte`, `IntegralArea.svelte`                                                                           | Courbe d'une fonction (300 points, 100 pendant un geste) ; aire sous la courbe                  |
| `SequencePlot.svelte`, `ScatterPlot.svelte`                                                                             | Suite (rangs ou escalier) ; nuage de points                                                     |
| `AsymptoteLines.svelte`, `SpecialPoints.svelte`, `IntersectionPoints.svelte`                                            | Couches d'analyse                                                                               |
| `CurveHover.svelte`, `GraphLabel.svelte`                                                                                | Survol aimanté et étiquettes (exacte au survol, cycle au clic)                                  |
| `FunctionPanel.svelte`, `FunctionInput.svelte`, `SequenceInput.svelte`, `SequenceTable.svelte`, `ParameterInput.svelte` | Panneau de saisie — **monté seulement par `/calc`**                                             |
| `ColorPicker.svelte`, `LineWidthPicker.svelte`, `LineStylePicker.svelte`                                                | Réglages de trait, réutilisés par les cartes de l'atelier (`CurveSettings`, `SequenceSettings`) |
| `ViewportControls.svelte`, `ExportButton.svelte`, `CoordinatesDisplay.svelte`, `KeyboardHandler.svelte`                 | Zoom, export, coordonnées, raccourcis clavier (`+ - flèches Échap g 0`)                         |

Branchement avec l'atelier : `src/lib/atelier/plot-sync.ts` (`syncPlots`) et
`src/lib/components/atelier/AtelierContainer.svelte` — décrits dans [atelier.md](atelier.md).

---

## Le modèle

### Traçables

`Plottable = ExplicitFunction | SequencePlottable | ScatterPlottable`, discriminé par `type`
(`'explicit' | 'sequence' | 'scatter'`), gardes `isExplicitFunction`, `isSequence`, `isScatter`.
Le store garde **un seul tableau** `functions` pour les trois (décision 1 des suites, 2026-09-04).
Une fonction porte en plus `showDerivative`, `tangentAt`, `integral` et le cercle osculateur, qui
partage l'abscisse de la tangente.

**Paramètres** : une lettre libre (`PARAMETER_NAMES`, hors `RESERVED_PARAMETER_NAMES` = `x n e
pi i`), une valeur et des bornes. `bindParameters` substitue les valeurs dans l'AST avant
échantillonnage et analyse ; un nœud distinct par jeu de valeurs sert de clé de cache.

### Suites

`src/lib/grapheur/sequence.ts` existe parce que `compile()` refuse les indices (`u_n` est réécrit
en variable) et que `createEvaluator` ne lie que `x`. Deux modes (`SequenceMode`) : explicite
`u_n = f(n)` et récurrence d'ordre 1 `u_{n+1} = f(u_n)` (ordre 2 et sommes : hors périmètre).

Deux **représentations exclusives** (`SequenceRepresentation = 'ranks' | 'cobweb'`) : superposer
le nuage `(n, u_n)` et l'escalier n'a pas de sens, l'abscisse ne porte pas la même grandeur. Une
suite dont l'expression dépend de `n` ne peut pas être en escalier (`supportsCobweb`) et retombe
sur les rangs. Plafond : `MAX_SEQUENCE_TERMS = 1000`.

Lecture d'un terme : le survol montre la **valeur exacte** (`exact.ts`, plafonds `MAX_EXACT_RANK
= 300` et `MAX_EXACT_LATEX_LENGTH = 2000`, sinon décimale) ; un clic fige une étiquette, cycle
`décimale → exacte → disparue`. Les étiquettes figées ne sont **jamais sérialisées**.

Le moteur de suites sert aussi le bloc ubumark ` ```courbe ` (`src/lib/ubumark/parser/courbe-parser.ts`,
`src/lib/ubumark/utils/courbe-scene.ts`) : le modifier, c'est modifier ce bloc.

### Échantillonnage et fidélité du tracé

L'échantillonnage vit dans `src/lib/geometry-core/viewport/sampler.ts` (`sampleFunction`), partagé
avec `courbe()` du DSL de géométrie. Trois corrections de septembre 2026, toutes **mesurées** :

- **Pôles** (`buildCurve`, `marchToward`) : la singularité est localisée par dichotomie, les
  branches prolongées jusqu'à sortir du cadre, les ordonnées écrêtées à ± une hauteur de fenêtre.
  Plus de pont entre deux branches, plus de branche tronquée.
- **Fidélité** (`refineByLevels`, `smoothCurve`) : subdivision tant que le milieu s'écarte de la
  corde de plus de 1/400 de la hauteur (≈ 1 px), profondeur ≤ 6, budget de deux fois le nombre
  d'échantillons. Le critère est l'écart **vertical**, pas perpendiculaire (ce dernier ne se
  déclenchait jamais).
- **Spline** (`src/lib/geometry-core/rendering/bezier.ts`, `monotoneSlopes`) : limiteur de pente
  de Fritsch-Carlson pour un graphe de fonction (abscisses strictement monotones) — Catmull-Rom
  faisait des crochets à côté des valeurs écrêtées.

Pendant un geste (`isInteracting`), `FunctionCurve` passe à 100 points et à une polyligne.
`sampleCached` et le cache d'analyse (`analyzeAllFunctions`) évitent de tout recalculer à chaque
mouvement du curseur de tangente ; chaque cache se vide au-delà de 200 fenêtres par expression.

### Analyse : zéros, extremums, asymptotes

`analyzeFunction` est **hybride** : quand l'AST est disponible (`buildAnalysisAST`), zéros et
extremums viennent de `findCriticalZeros` / `findCriticalExtrema` (mathAST), exacts quand c'est
possible (`exactX`, `exactY`, confiance 1,0) ; sinon balayage numérique (`findRoots`,
`findExtrema`).

Asymptotes, **symbolique d'abord** : sur une fraction rationnelle, `exactAsymptotes` donne
horizontale, oblique et polynomiale (courbe) d'un coup, avec leur LaTeX. Ailleurs, repli
numérique : `findHorizontalAsymptotes`, `findObliqueAsymptotes`, `findPolynomialAsymptotes`
ajustent un polynôme sur des abscisses lointaines (`fitPolynomialBranch`, extrapolation de
Richardson) ; `findVerticalAsymptotes` reste numérique. Les abscisses de sondage
(`LARGE_X_VALUES`) ne sont volontairement **pas** des puissances de 10 (elles tombaient sur la
période de `cos(πx/50)`).

Une asymptote unilatérale (`direction: 'left' | 'right'`) n'est tracée **que de son côté**
(décision de David, 2026-09-15). Les intersections passent par `findRoots` de mathAST (exact puis
dichotomie) : une tangence est trouvée, ce que l'ancien balayage par changement de signe ratait.

### Styles et couleurs du thème

Une courbe stocke une **identité** (`curve-1`…`curve-4`), jamais un hexadécimal
(`src/lib/geometry-core/rendering/colors.ts`). La teinte vit dans `src/app.css`
(`--color-curve-N`, `--color-graph-*`, en `light-dark()`) et suit le mode clair / sombre.
`curveColorValue` la traduit au moment de peindre, en `style:stroke` (une `var()` n'est pas
garantie dans un attribut de présentation SVG).

**4 couleurs × 2 styles = 8 places** (`CURVE_SLOTS`, `getNextSlot`) : au-delà de quatre, des
couleurs ne restent plus distinctes pour un élève daltonien sous la contrainte de contraste
≥ 4,5. La dérivée est en `dotted` (en `dashed`, elle imitait la 5ᵉ courbe). Les anciennes
sauvegardes en hex sont traduites **par rang** (`migrateLegacyColor`). Règles générales des
tokens : [css-color-tokens.md](../pratiques/css-color-tokens.md).

### Persistance

`serialize()` produit un `GraphState` (version `GRAPH_STATE_VERSION = 2`, la v1 se relit) ; la
relecture passe par `graphStateSchema` (Zod : 20 traçables, 20 paramètres, LaTeX ≤ 1000, nuages
≤ 200 points, coordonnées ≤ `COORDINATE_LIMIT`). Sauvegarde différée de 500 ms sous la clé
`chiphre-grapheur-state`. Le constructeur prend la clé : `null` = aucune persistance (cas de
l'atelier, qui persiste ses objets lui-même).

### Export

`ExportButton` (dans `ViewportControls`) → `exportSvg` / `exportPng` (échelle 1, 2 ou 3).
L'export est **toujours en clair** (décision 1b) : la copie est rendue hors écran sous
`color-scheme: light` et chaque élément reçoit ses couleurs **calculées**, figées dans le
fichier — une `var()` laissée dedans se peindrait en noir chez celui qui l'ouvre.

---

## Relations

### Avec l'atelier

L'atelier **détient l'état**, le grapheur le **reflète** : `syncPlots` reporte les objets tracés
vers un `GrapheurStore` propre à l'atelier, à sens unique (option B, 2026-09-16). Rien de ce qui
se passe dans le graphique ne remonte. Tout réglage passe par les cartes ; le grapheur n'y monte
ni `FunctionPanel` ni ses propres saisies. Détail : [atelier.md](atelier.md).

Le passage du singleton à l'instance par contexte (`useGrapheurStore`) est le prérequis de cette
séparation ; le repli sur le singleton existe parce que des tests montent les composants seuls.

### Avec `geometry-core`

Le grapheur n'utilise **ni le DSL ni `Figure`** ; il emprunte des briques
(voir [geometrie/README.md](geometrie/README.md), « Frontière avec le grapheur ») :
`src/lib/geometry-core/viewport/` (fenêtre, `createTransformer`, grille, sampler),
`src/lib/geometry-core/rendering/bezier.ts`, `src/lib/geometry-core/rendering/colors.ts` et
`src/lib/geometry-core/graph/parametric-calculus.ts` (longueur d'arc, courbure, cercle
osculateur).

Les **doublons ont été dissous** (chantier de septembre 2026) : le sampler du grapheur est parti
dans `geometry-core`, les intersections appellent `findRoots` de mathAST, et grille comme
graduations utilisent `computeGridStep` (pas en **pixels**, par axe). Reste une différence
structurelle **voulue** : le repère du grapheur est **anisotrope** (`scaleX ≠ scaleY`, on étire
un seul axe en le tirant), celui de `GeometryCanvas` isotrope.

---

## Invariants

- **Une couleur est une identité**, jamais une valeur : pas de hex écrit dans un traçable neuf.
- **L'atelier fait foi** : rien ne remonte du grapheur vers l'atelier.
- **Deux instances ne partagent pas une clé de stockage** : la seconde chargerait puis écraserait
  l'état de la première.
- **`COORDINATE_LIMIT` est commun au grapheur et à l'atelier** (`src/lib/atelier/display.ts`) :
  si l'un acceptait ce que l'autre refuse, la relecture de **tout** l'état échouerait
  (`loadFromStorage` abandonne en bloc).
- **Symbolique d'abord, numérique en repli, en silence** — jamais une valeur approchée affichée
  comme exacte (`exact.ts` rejette ce qui n'est pas `exact`).
- **Étiquettes figées hors sérialisation** ; elles sont recalculées au rendu (un curseur qui
  bouge les met à jour).
- **Export toujours en clair**, couleurs calculées figées.
- **Ajouter un membre à `Plottable` casse les `else` implicites** : tester chaque type
  explicitement (cf. le commentaire de `serialize()`).

## Comment étendre

- **Nouveau type de traçable** : membre de l'union et garde dans `types.ts`, schéma dans
  `plottableStateSchema`, méthode `add…` et branche de `serialize()` dans le store, rendu dans
  `GraphSVG.svelte` ; si l'atelier doit le tracer, `plot-sync.ts`.
- **Nouvelle analyse sur une fonction** : `analysis.ts`, en passant par le cache
  (`analyzeAllFunctions`) ; préférer un calcul symbolique mathAST avec repli numérique.
- **Changer l'échantillonnage, les splines, la grille ou les couleurs** : c'est `geometry-core`,
  donc aussi la géométrie et le bloc ` ```courbe ` — lancer les deux suites de tests.
- **Nouveau champ d'état** : `.default(…)` dans le schéma Zod, pour que les anciennes sauvegardes
  se relisent.

## Tests

| Où                                                                                                               | Quoi                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/grapheur/__tests__/`                                                                                    | Modèle : analyse, asymptotes, intersections, suites, exact, export, schéma, palette (`curve-palette.test.ts` lit `src/app.css` et vérifie le contraste) |
| `src/lib/components/grapheur/__tests__/`                                                                         | Composants (`*.svelte.test.ts`), harnais `harness/ProvideStore.svelte`, contexte                                                                        |
| `src/lib/stores/__tests__/grapheur-*.svelte.test.ts`                                                             | Store : migration des couleurs, nuages, places                                                                                                          |
| `src/lib/atelier/__tests__/plot-sync.test.ts`, `src/lib/atelier/__tests__/lien-grapheur.test.ts`                 | Branchement atelier, liens `/grapheur`                                                                                                                  |
| `src/lib/geometry-core/viewport/__tests__/`, `src/lib/geometry-core/rendering/__tests__/bezier-monotone.test.ts` | Sampler, grille, spline partagés                                                                                                                        |

Commandes : `pnpm test:server src/lib/grapheur` pour les `.test.ts`, `pnpm test:client
src/lib/components/grapheur` pour les `.svelte.test.ts`.

## Décisions

Aucun ADR. Les décisions de David sont dans les journaux archivés :

- hôte des suites, modes, représentations exclusives, valeur exacte au survol, étiquettes non
  persistées : [suites-grapheur-progress.md](../archive/wip/suites-grapheur-progress.md) ;
- 4 couleurs × 2 traits, identité plutôt que hex, export en clair, migration par rang :
  [grapheur-couleurs-theme-progress.md](../archive/wip/grapheur-couleurs-theme-progress.md) ;
- pôles, fidélité, spline (dans `geometry-core`, partagés) :
  [grapheur-poles-progress.md](../archive/wip/grapheur-poles-progress.md),
  [grapheur-fidelite-progress.md](../archive/wip/grapheur-fidelite-progress.md),
  [grapheur-spline-progress.md](../archive/wip/grapheur-spline-progress.md) ;
- asymptotes unilatérales et courbes :
  [grapheur-asymptotes-progress.md](../archive/wip/grapheur-asymptotes-progress.md) ;
- doublons : [grapheur-vs-geometry-core.md](../archive/wip/grapheur-vs-geometry-core.md),
  [dissoudre-doublons-grapheur-progress.md](../archive/wip/dissoudre-doublons-grapheur-progress.md) ;
- instance par contexte : [grapheur-store-contexte-progress.md](../archive/wip/grapheur-store-contexte-progress.md) ;
- grapheur = vue de l'atelier (G1 à G3) :
  [atelier-grapheur-phase0.md](../archive/wip/atelier-grapheur-phase0.md).

## Écarts connus

- **Commentaires périmés sur `/grapheur`** : `src/lib/stores/grapheur-context.ts` et la prop
  `store` de `GrapheurContainer.svelte` disent encore que `/grapheur` et `/calc` partagent le
  singleton. Depuis l'atelier, seul `/calc` l'utilise.
- **`src/lib/components/grapheur/index.ts`** (barillet) n'a aucun importeur.
- Les ré-exports `viewport.ts`, `bezier.ts`, `colors.ts` de `src/lib/grapheur/` sont des
  survivances « rétrocompatibilité » ; le code importe tantôt eux, tantôt `geometry-core`.
- `findVerticalAsymptotes` reste purement numérique, même sur une fraction rationnelle.
- Nuages de points : pas de forme de point distincte par place (décision Q1a, reportée).

---

Vérifié contre le code le 2026-10-10.
