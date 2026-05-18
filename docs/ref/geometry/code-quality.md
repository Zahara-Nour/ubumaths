---
title: geometry-core — Audit qualite & dette technique
date: 2026-05-18
severity_globale: Major
audience: maintainers
---

# geometry-core — Audit qualite & dette technique

## 1. Metriques globales

### Repartition par sous-dossier

| Sous-dossier   | Fichiers source | Lignes source | Fichiers test | Lignes test |
| -------------- | --------------- | ------------- | ------------- | ----------- |
| `dsl/`         | 21              | ~18 500       | 83            | ~14 000     |
| `graph/`       | 12              | ~8 100        | 20            | ~6 600      |
| `rendering/`   | 9               | ~6 100        | 17            | ~3 700      |
| `geometry/`    | 7               | ~2 200        | 7             | ~1 600      |
| `types/`       | 5               | ~2 300        | 4             | ~850        |
| `compute/`     | 4               | ~750          | 3             | ~400        |
| `validation/`  | 2               | ~650          | 1             | ~660        |
| `viewport/`    | 4               | ~400          | 2             | ~240        |
| `interaction/` | 3               | ~350          | 2             | ~285        |
| **Total**      | **69**          | **~67 800**   | **140**       | **~38 700** |

Total lignes tests > total lignes source : excellent rapport de couverture global.
Le ratio test/source varie toutefois fortement selon les sous-dossiers (voir section 6).

### Top 10 fichiers par nombre de lignes

| Rang | Fichier                       | Lignes |
| ---- | ----------------------------- | ------ |
| 1    | `graph/figure.ts`             | 4 585  |
| 2    | `dsl/builtins.ts`             | 3 425  |
| 3    | `rendering/svg-primitives.ts` | 2 544  |
| 4    | `types/elements.ts`           | 1 726  |
| 5    | `graph/compute-position.ts`   | 1 308  |
| 6    | `dsl/interpreter.ts`          | 1 120  |
| 7    | `dsl/transform-apply.ts`      | 1 087  |
| 8    | `dsl/serializer.ts`           | 870    |
| 9    | `geometry/intersections.ts`   | 853    |
| 10   | `rendering/export-tikz.ts`    | 743    |

---

## 2. Code smells identifies

### 2.1 Fonctions trop longues

**Severity: Critical**

`_executeBuiltinInner` dans `dsl/builtins.ts` (lignes 345–2389) fait **2 045 lignes** et contient **62 branches `case`**. C'est la plus longue fonction du module. Elle dispatche vers tous les builtins du DSL (point, segment, droite, cercle, courbe, intersection, integrale, etc.) dans un seul `switch`. Aucune extraction logique n'a ete faite malgre les nombreuses livraisons ajoutant des cas successifs.

`computeElementPosition` dans `graph/compute-position.ts` (lignes 143–878) fait **735 lignes** et contient **55 branchements `if (isXxx)` chainés**. Chaque nouveau type d'element ajoute une clause lineairement.

`createIntegralArea` dans `graph/figure.ts` (lignes 3 651–4 008) fait **357 lignes** dans un seul constructeur de methode. Elle instancie, valide, compile, et cree des closures numeriques dans le meme corps.

`applyTransformationToElement` dans `dsl/transform-apply.ts` (lignes 307–666) fait **359 lignes** avec des `switch` imbriques par type de transformation et par type d'element cible.

### 2.2 Types `any` et casts dangereux

**Severity: Major**

`graph/figure.ts` contient **11 casts `as GeoXxx`** explicites (lignes 3342, 4238, 4247, 4255, 4266, 4273, 4358, 4379, 4426, 4474, 4488). Ces casts bypassent le discriminated union sans verification prealable avec un type guard. Exemple ligne 3342 : `const textEl = el as GeoText | GeoMathText | GeoRichText` — si `el.type` est mal route en amont, le cast est silencieux.

`rendering/svg-primitives.ts` contient **14 casts `as GeoXxx`** analogues (lignes 148, 170, 195, 731, 835, 912, 1014, 1331, 1631, 1670, 1752, 1770, 1821, 2288, 2410). Chaque fonction `xxxToSVG` recoit `GeoElement` et caste immediatement sans type guard.

`geometry/affine-transform.ts` lignes 150–151 contient `as GeoTransformation` apres un `!isTransformation` non strictement couvert.

`graph/figure.ts` ligne 2157 contient `{ type: 'number', value: 0 } as MathNode` — cast brut vers un type complexe de l'AST.

### 2.3 TODO/FIXME/HACK

Aucun commentaire `TODO`, `FIXME`, `HACK` ou `XXX` n'existe dans les fichiers source non-test. C'est un point positif : le module ne porte pas de dette documentee de ce type.

---

## 3. Cohesion et couplage

### 3.1 ~~Dependance circulaire graph <-> dsl~~ — **CORRIGE 2026-05-18**

**Severity: ~~Critical~~ Resolved**

> **Statut : FIXED.** `singularity-warn.ts` a ete deplace de `geometry-core/dsl/` vers `$lib/mathAST/analysis/` (sa famille naturelle — il etait deja purement mathAST, ses imports vont uniquement vers `$lib/mathAST/*`). Les 4 references (`graph/figure.ts`, `dsl/area-builtin-helper.ts`, 2 fichiers de tests) pointent maintenant vers le nouvel emplacement. Re-export ajoute dans `mathAST/analysis/index.ts`. 94 tests passent (singularity-warn, integrale, aire, integral-area-between), 0 regression. Plus aucune fleche `graph -> dsl` au niveau source.

**Description historique** : `graph/figure.ts` importait `classifyDiscontinuitiesForRange` depuis `dsl/singularity-warn.ts`, tandis que tout `dsl/` importait massivement `Figure` depuis `graph/`. Le cycle ne provoquait pas d'erreur grace aux `import type` (erases au build) et au fait que `singularity-warn` n'avait aucune dep transitive vers `graph/`. Mais l'architecture etait fragile : un seul ajout de value import de `singularity-warn` vers `graph/` aurait casse le build a l'execution.

### 3.2 graph/figure.ts — God Object

**Severity: Major**

`figure.ts` est une classe de 4 585 lignes qui contient :

- La gestion de tous les elements geometriques (`createXxx` : 95 methodes publiques)
- Les closures de calcul numerique (integration, echantillonnage parametrique)
- La logique de drag interactif (`movePointOnParametricCurveFromCursor`)
- La gestion undo/redo (delegue a `UndoManager` mais piloté depuis `figure.ts`)
- La compilation d'expressions mathAST

Ce fichier est le point central du module et est importe par presque tous les autres. Toute nouvelle feature l'alourdit systematiquement.

### 3.3 dsl/ sous-dossier surdimensionne

**Severity: Major**

Le sous-dossier `dsl/` concentre 47 % des lignes du module (18 500 / 39 000 source). Il regroupe sans distinction : le tokenizer, le parser, l'interpreter, le serializer, les builtins (2 100+ lignes), la detection de singularites, les transformations d'elements, les parsers de courbes piecewise, la gestion des modes d'angle. La majorite de ces responsabilites sont independantes mais physiquement colocalisees.

---

## 4. Conventions de nommage

### 4.1 Incoherence buildXxx vs createXxx

**Severity: Minor**

Dans `dsl/builtins.ts`, les fonctions internes qui construisent des elements geometriques utilisent `buildXxx` (ex: `buildParametricCurveFromXY` ligne 2954, `createCurveFromEquation` ligne 2475, `createFunctionFromCoefficients` ligne 2720, `createPiecewiseFunctionFromAst` ligne 2676). Il n'y a pas de convention claire : `createXxx` est parfois utilise pour des constructeurs de bas niveau, `buildXxx` pour des helpers DSL.

Dans `graph/figure.ts`, toutes les methodes publiques utilisent `createXxx` (95 occurrences). Le prefixe `build` est reserve aux fonctions internes hors class. Cette dichotomie est coherente a l'interieur de chaque fichier mais cree une asymetrie entre `builtins.ts` (qui appelle `figure.createXxx`) et ses propres helpers `createXxx` internes.

### 4.2 Nommage des tolerances dans les solveurs Newton

**Severity: Minor**

Les trois fichiers de solveurs Newton utilisent des noms differents pour des champs semantiquement identiques :

| Fichier                         | Champ convergence      | Champ acceptance      | Champ starts       |
| ------------------------------- | ---------------------- | --------------------- | ------------------ |
| `parametric-newton.ts`          | `tolerance`            | (absent)              | `numStarts`        |
| `parametric-intersection.ts`    | `convergenceTolerance` | `acceptanceTolerance` | `numStartsPerAxis` |
| `parametric-intersection-1d.ts` | `convergenceTolerance` | `acceptanceTolerance` | `numStarts`        |

Un fichier unifie `newton-config.ts` avec une interface de base partagee eviterait cette divergence.

### 4.3 Prefixes Geo\* coherents

**Severity: (OK)**

Le prefixe `Geo` pour tous les types d'elements (`GeoFreePoint`, `GeoParametricCurve`, etc.) est applique de facon tres coherente sur les 78 membres de l'union `GeoElement`. Les type guards `isXxx` couvrent presque tous les membres (84 guards pour 78 types). Un seul type recent manque de cohesion visible dans le code source (voir section 5.1 sur `GeoOsculatingCircle`).

---

## 5. Gestion d'erreurs

### 5.1 ~~GeoOsculatingCircle : rendu absent dans svg-primitives~~ — **CORRIGE 2026-05-18**

**Severity: ~~Critical~~ Resolved**

> **Statut : FIXED.** Helper `osculatingCircleToSVG` ajoute dans `svg-primitives.ts` (suit la signature de `circleToSVG`). Branches `else if (el.type === 'osculatingCircle')` ajoutees dans le Pass 2 (cercles) de `export-svg.ts`, `export-tikz.ts`, `export-typst.ts`. Les cercles osculateurs sont desormais exportes correctement dans les 3 formats. Cas degeneres (κ ≈ 0, γ' ≈ 0) silencieusement omis dans tous les exports (coherent avec le canvas). 6 tests dedies dans `rendering/__tests__/osculating-circle-export.test.ts`.

**Description historique** : `GeoOsculatingCircle` etait un type membre de l'union `GeoElement` (`types/elements.ts:902`) mais le rendu n'etait implemente que dans `GeometryCanvas.svelte` (canvas interactif), pas dans les 3 modules d'export. Consequence : les exports SVG/TikZ/Typst omettaient silencieusement les cercles osculateurs — regression de feature invisible.

### 5.2 Deux strategies d'erreur incompatibles dans figure.ts

**Severity: Major**

Les methodes publiques de `figure.ts` lancent des `throw new Error(...)` generiques (ex: lignes 401, 589, 603, 604, 630, 752). Ces erreurs ne sont pas des `DslRuntimeError` et ne portent pas de numero de ligne DSL. Si elles sont triggeres depuis le DSL (via `builtins.ts`), elles remontent comme erreurs JS brutes non formatees pour l'utilisateur.

A l'inverse, `dsl/builtins.ts` utilise correctement `DslRuntimeError` (186 occurrences) qui inclut la ligne source DSL et peut etre affichee dans l'editeur. Le contrat entre les deux couches n'est pas formalize.

### 5.3 Null silencieux vs DslRuntimeError

**Severity: Minor**

`compute-position.ts` retourne `{ position: null, hasComputablePosition: true }` pour la majorite des cas d'erreur (element manquant, indice hors bornes pour les intersections parametriques, etc.). Ce choix est documente (ligne 302 : `// k is 1-indexed; null silently when out of range`). C'est correct pour la reactivite (un element peut etre temporairement sans position), mais le contrat de silence n'est pas documente de facon systematique — certains appelants pourraient ne pas anticiper le null dans tous les cas.

---

## 6. Tests vs code

### Organisation : **tests**/ coherente mais non universelle

Tous les tests utilisent le pattern `__tests__/` (dossier separe) plutot que la cohabitation `.test.ts` cote source. C'est coherent dans tout le module.

### Couverture differenciee

| Sous-dossier             | Situation                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `dsl/`                   | Tres bien couvert : 83 fichiers de test, couvrant interpreter, parser, serializer, roundtrips, cas limites  |
| `graph/`                 | Bien couvert : 20 tests, mais `parametric-newton.ts` (drag solver) n'a aucun test direct                    |
| `rendering/`             | Couvert via `export-svg-edge.test.ts`, mais `export-tikz.ts` et `export-typst.ts` n'ont pas de tests dedies |
| `dsl/builtins.ts`        | Aucun test direct malgre 3 425 lignes — couvert indirectement via les tests interpreter/DSL                 |
| `dsl/transform-apply.ts` | **Zero test direct** pour 1 087 lignes de code de transformation                                            |
| `validation/`            | 1 fichier de test pour 2 fichiers source — adequate                                                         |

Le manque de tests directs sur `builtins.ts` et `transform-apply.ts` est compense partiellement par les tests d'integration DSL, mais une regression de comportement interne serait difficile a isoler.

---

## 7. Top 10 fichiers a refactorer en priorite

### 1. `dsl/builtins.ts` — Severity: Critical

**Raison** : `_executeBuiltinInner` (lignes 345–2389) est une fonction de 2 045 lignes avec 62 cases. Chaque ajout de builtin l'alourdit lineairement. Impossible a tester unitairement.

**Suggestion** : Extraire les groupes de cases thematiques en modules separes :

- `dsl/builtins-curves.ts` — `courbe`, `fonction`, `courbe_piecewise`, `polaire`
- `dsl/builtins-intersections.ts` — toutes les variantes `intersection()`
- `dsl/builtins-calculus.ts` — `integrale`, `aire`, `aire_entre`, `longueur`, `courbure`, `cercle_osculateur`
- `dsl/builtins-vectors.ts` — `vecteur`, `norme`, `produit_scalaire`, `angle_vecteurs`

`_executeBuiltinInner` devient alors un dispatcher de 100 lignes qui delegue a ces modules.

### 2. `graph/figure.ts` — Severity: Critical

**Raison** : 4 585 lignes, God Object concentrant la creation, le calcul numerique, le drag, et l'undo. Importe par tout le module.

**Suggestion** : Extraire en deux etapes sans casser l'API publique :

- Etape 1 : Extraire `createIntegralArea` et `createImproperIntegralArea` (lignes 3 651–4 191, ~540 lignes) dans `figure-integral.ts` expose comme mixin ou module d'extension.
- Etape 2 : Extraire les methodes `moveXxx` (drag interaction, lignes 2327–2650) dans `figure-interaction.ts`.

### 3. `rendering/svg-primitives.ts` — Severity: Major

**Raison** : 2 544 lignes. Toutes les fonctions `xxxToSVG` recoivent `GeoElement` et castent immediatement (`el as GeoXxx`) sans utiliser les type guards disponibles dans `types/elements.ts`. Absence de `GeoOsculatingCircle` dans le module.

**Suggestion** :

- Remplacer chaque cast `const seg = el as GeoSegment` par `if (!isSegment(el)) return null` pour profiter de la securite des type guards.
- Ajouter une fonction `osculatingCircleToSVG` qui partage la logique actuellement dans `GeometryCanvas.svelte`.
- Envisager de scinder en `svg-primitives-curves.ts` et `svg-primitives-annotations.ts`.

### 4. `graph/compute-position.ts` — Severity: Major

**Raison** : `computeElementPosition` (lignes 143–878, 735 lignes) est une chaine de 55 `if (isXxx(el))` qui n'est pas exhaustive par construction : l'ajout d'un nouveau type d'element n'est pas detecte par le compilateur si on oublie d'ajouter la branche.

**Suggestion** : Convertir le dispatch en table de handlers indexee par `el.type` :

```typescript
type PositionComputer = (el: GeoElement, ...) => ComputePositionResult;
const POSITION_COMPUTERS: Partial<Record<GeoElement['type'], PositionComputer>> = {
  midpoint: computeMidpointPosition,
  intersectionLL: computeIntersectionLLPosition,
  // ...
};
```

Un type `never` a la fin assurerait l'exhaustivite a la compilation.

### 5. `dsl/transform-apply.ts` — Severity: Major

**Raison** : 1 087 lignes, zero test direct. Contient `applyTransformationToElement` (lignes 307–666, 359 lignes) avec des `switch` imbriques. Toute regression serait detectee uniquement par les tests d'integration DSL distants.

**Suggestion** : Ajouter au minimum un fichier `dsl/__tests__/transform-apply.test.ts` testant chaque `case` de transformation (rotation, reflexion, translation, homothetie, composition, inversion) sur chaque type d'element cible (point, segment, cercle, courbe). Ensuite extraire `applyTransformationToElement` en fonctions individuelles par type de transformation.

### 6. `graph/parametric-newton.ts`, `parametric-intersection.ts`, `parametric-intersection-1d.ts` — Severity: Major

**Raison** : Trois interfaces `NewtonConfig`/`IntersectionConfig`/`IntersectionConfig1D` avec des champs presque identiques (`maxIterations`, `convergenceTolerance`/`tolerance`, `numStarts`/`numStartsPerAxis`). Le pattern de boucle Newton est reimplemente trois fois avec des variantes mineures (1D vs 2D vs proximite).

**Suggestion** : Creer `graph/newton-solver.ts` avec une interface de base :

```typescript
export interface NewtonSolverConfig {
	numStarts: number;
	maxIterations: number;
	convergenceTolerance: number;
	acceptanceTolerance: number;
}
```

Et une fonction generique `runNewtonMultiStart<T>(f, df, starts, cfg): T[]`. Les trois fichiers actuels deviennent des wrappers fins qui preparent `f` et `df` specifiques a leur cas.

### 7. `rendering/export-tikz.ts` et `rendering/export-typst.ts` — Severity: Major

**Raison** : `extendLineToViewport` et `extendRayToViewport` sont des fonctions strictement identiques (copie conforme mot pour mot) dans ces deux fichiers et dans `svg-primitives.ts` sous le nom `extendLineToBounds`. Trois implementations, zero test.

**Suggestion** : Extraire dans `rendering/geometry-clip.ts` :

```typescript
export function clipLineToBounds(x1, y1, x2, y2, bounds: Bounds): ClipResult | null;
export function clipRayToBounds(ox, oy, tx, ty, bounds: Bounds): ClipResult | null;
```

Les coordonnees (SVG px ou math units) sont parametrisees par `bounds`. Les trois renderers importent depuis ce module commun.

### 8. `types/elements.ts` — Severity: Minor

**Raison** : 1 726 lignes, union `GeoElement` de **78 membres**. La croissance est lineaire avec les nouvelles features. La definition de l'interface `GeoElementBase` commune est noyee dans le fichier.

**Suggestion** : Scinder en fichiers thematiques :

- `types/elements-points.ts` — GeoFreePoint, GeoMidpoint, GeoIntersection\*
- `types/elements-curves.ts` — GeoFunction, GeoParametricCurve, GeoQuadraticCurve, GeoImplicitCurve
- `types/elements-transforms.ts` — GeoRotation, GeoReflection, GeoTranslation, etc.
- `types/elements-annotations.ts` — GeoText, GeoAngleMark, GeoSegmentMark, GeoImage
- `types/elements.ts` — re-exporte tout et definit l'union `GeoElement`

### 9. `dsl/serializer.ts` — Severity: Minor

**Raison** : La fonction `serialize` (lignes 27–79) est raisonnable, mais le dispatch interne `serializeElement` (lignes 300–765, ~465 lignes) contient un `switch` avec des `case` pour chaque type d'element. Ce switch doit etre maintenu en parallele avec `builtins.ts` et `compute-position.ts` — trois endroits ou le meme switch grandit simultanement.

**Suggestion** : Voir point 4 (table de handlers). Partager un enumerateur de types avec `compute-position.ts` reduirait le risque d'oubli.

### 10. `graph/figure.ts:movePointOnParametricCurveFromCursor` (lignes 2616–2720) — Severity: Minor

**Raison** : 104 lignes qui reproduisent partiellement la logique de `parametric-newton.ts`. La fonction reconstruit les bindings, appelle `findClosestParameterOnCurve`, puis met a jour le slider ou le parametre numerique. Ce code est difficile a tester car il depend de `this` (l'instance Figure).

**Suggestion** : Extraire la logique de resolution `(figure, cursorX, cursorY) -> newT` dans une fonction pure dans `graph/figure-drag.ts`, testable independamment de la classe.

---

## 8. Patterns problematiques recurrents

### 8.1 Triplette de switches non-exhaustifs

Les trois fichiers `compute-position.ts`, `serializer.ts`, et `transform-apply.ts` maintiennent chacun une enumeration implicite de tous les types d'elements de `GeoElement`. Lorsqu'un nouveau type est ajoute (cas recent : `GeoOsculatingCircle`, `GeoTangentParametric`, `GeoTangentVector`), ces trois fichiers doivent etre mis a jour manuellement. Il n'existe pas de garde de compilation qui detecte l'oubli. C'est la source directe du bug identifie en section 5.1 (rendu absent dans svg-primitives).

**Solution** : Pattern `switch` avec branche `default: return exhaustiveCheck(el)` ou table de dispatch typee `Record<GeoElement['type'], Handler>` qui echoue a la compilation si un type manque.

### 8.2 Casts as au lieu de type guards

Dans `svg-primitives.ts` et `figure.ts`, le pattern repete est :

```typescript
// Pattern actuel (dangereux)
const seg = el as GeoSegment;

// Pattern attendu (sur)
if (!isSegment(el)) return null;
const seg = el; // narrowed automatiquement
```

Les 84 type guards existent dans `types/elements.ts` mais ne sont pas systematiquement utilises dans les couches de rendu et de figure. Cela cree un ecart entre la purete du systeme de types et son utilisation reelle.

### 8.3 Closures numeriques dans le constructeur d'elements

Dans `figure.ts`, les methodes `createIntegralArea`, `createImproperIntegralArea`, et la construction des `GeoScalar` de calcul encapsulent des closures complexes (`() => { ... }`) directement dans le corps de la methode. Ces closures capturent des references vers `this.elements`, des ASTs compiles, et des options. Le test de ces closures est indirect (via les tests de la figure) et difficile a isoler.

---

## 9. Surface API publique

### 9.1 `index.ts` racine : tout est exporte via `export *`

Le fichier `src/lib/geometry-core/index.ts` reexporte la totalite des neuf sous-modules via `export * from './xxx'`. Cela expose publiquement des elements qui sont des details d'implementation internes :

**Exports internes exposes publiquement** (non inclus dans les `index.ts` des sous-modules mais atteignables par transitivite) :

- `parametric-newton.ts` — `NewtonConfig`, `findClosestParameterOnCurve` : API interne du solveur de drag, utilisee uniquement par `figure.ts`. Exposee via `export * from './graph'` dans `graph/index.ts` ? Non — ces fichiers ne sont pas dans `graph/index.ts`. Ils sont importes directement depuis `figure.ts`. Donc non exposes publiquement. Bon point.

- `svg-primitives.ts` — **25 fonctions** (`vectorToSVG`, `functionToSVG`, `parametricCurveToSVG`, `integralAreaToSVG`, etc.) ne sont pas reexportees dans `rendering/index.ts`. Elles sont exportees depuis `svg-primitives.ts` mais le `rendering/index.ts` ne les inclut pas. Leur accessibilite depuis `geometry-core/index.ts` est donc brisee par la selectivite de `rendering/index.ts`. C'est coherent.

- La `Figure` (classe principale) et `DependencyGraph` sont correctement exposes via `graph/index.ts`.

- Le DSL (`parseDsl`, `interpretDsl`, `serializeDsl`, `runDsl`) est clairement documente dans `dsl/index.ts` avec une JSDoc sur le bloc `export`.

**Risque identifie** : `rendering/index.ts` exporte `resolveStyle`, `pointToSVG`, `segmentToSVG`, mais pas les renderers de courbes, de fonctions, d'integrales. Un consommateur externe qui veut rendre un element personnalise doit importer directement depuis `svg-primitives.ts` en bypassant l'index. L'API publique de rendu est incomplete.

### 9.2 Imports transversaux depuis $lib/mathAST

`figure.ts` importe depuis `$lib/mathAST` (8 imports differents : `compile`, `toCustom`, `isZeroExpression`, `integrateDefinite`, `numericIntegrate`, `improperIntegrate`, `findRoots`, `analyzeContinuity`). Ce couplage fort avec `mathAST` est structurel (le DSL geometrique repose sur l'AST mathematique) mais n'est pas documente comme tel dans l'architecture. Tout changement d'API `mathAST` peut casser `figure.ts` sans avertissement visible.

---

## Synthese

### Qualite globale

La base de code geometry-core est **fonctionnellement robuste** (1 500+ tests, pas de TODO/FIXME, couverture etendue) mais presente une **dette structurelle significative** accumulee sur 5 mois de livraisons rapides et paralleles.

**Les deux problemes critiques initialement identifies sont corriges (2026-05-18)** :

1. ~~**Le cycle de dependance `graph/figure.ts` -> `dsl/singularity-warn.ts`**~~ **CORRIGE** (move vers `$lib/mathAST/analysis/`).

2. ~~**L'absence de rendu SVG/TikZ/Typst pour `GeoOsculatingCircle`**~~ **CORRIGE** (helper `osculatingCircleToSVG` + branches dans les 3 exporters).

Reste a faire dans la dette critique : casser le switch `_executeBuiltinInner` (2 045 lignes, 62 cases) dans `dsl/builtins.ts` — section 4 ci-dessus. Effort estime 1-2 jours.

Les points 3 a 10 sont de la dette de maintenabilite sans impact fonctionnel immediat, mais ils ralentiront l'ajout de nouveaux types d'elements et augmentent le risque de regression silencieuse.
