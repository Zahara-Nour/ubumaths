# CLAUDE.md — `geometry-core` (et `constructions-v2`)

Règles indispensables pour coder ici. Tout le reste est dans la doc, à lire avant un changement
non trivial :

- Vue d'ensemble (carte du code, runtime, rendu, constructions, décisions) :
  [`docs/systeme/geometrie/README.md`](../../../docs/systeme/geometrie/README.md)
- Référence du DSL (les 92 builtins, arguments communs) :
  [`docs/systeme/geometrie/dsl-builtins.md`](../../../docs/systeme/geometrie/dsl-builtins.md)

## Règles dures

1. **Pas d'`eval` ni de `new Function`** : les expressions passent par `compile()` de
   `$lib/mathAST/eval/compile`.
2. **`graph/` n'importe jamais `dsl/` en valeur** (`import type` seulement). Un helper partagé va
   dans `$lib/mathAST/analysis/` ou un dossier commun.
3. **Gardes de type** (`isXxx` de `types/elements.ts`) au lieu de `as GeoXxx`. Pas d'`any`.
4. **Nouveau builtin** : `function handleX(ctx: BuiltinCtx)` + `HANDLERS.set('x', handleX)` dans
   `dsl/builtins.ts`, **et** `'x'` dans `BUILTIN_NAMES` (sinon l'interpréteur ne l'appelle pas).
   Pas de `switch`. Erreurs structurées : `new DslRuntimeError({ summary, hint, forms }, line)`.
   Un objet principal retourné, intermédiaires `{ visible: false }`. Réutiliser `resolveDirection`,
   `requireNPoints`. Ajouter la ligne dans `dsl-builtins.md` ; décider s'il entre dans
   `REFUSED_CALLS` du bloc ` ```figure ` (`ubumark/utils/figure-scene.ts`).
5. **Nouveau type `Geo*` visible = quatre surfaces** : `components/geometry/GeometryCanvas.svelte`,
   `rendering/svg-primitives.ts` (+ `export-svg.ts`), `rendering/export-tikz.ts`,
   `rendering/export-typst.ts` ; plus la branche de `graph/compute-position.ts`. Aucun contrôle de
   type ne le rappelle.
6. **Ne jamais muter un résultat mis en cache** : `marchingSquares`, `computeLocusCurve`,
   `computeParametricCurveSampling` rendent des références partagées. Tout nouveau paramètre
   d'échantillonnage entre dans `buildParametricSamplingKey` ; `createLocus` met toute la
   fermeture transitive dans `dependsOn`.
7. **`GeoParametricCurve` construite hors de `Figure`** : pré-compiler `compiledXSecond` /
   `compiledYSecond`, sinon `courbure` et `cercle_osculateur` rendent `null` en silence.
8. **Boucles chaudes** : un seul `env` mutable (`env[param] = t`), jamais de spread par itération.
   En drag continu, passer le `t` précédent à `findClosestParameterOnCurve` (`warmStartT`).
9. **`PARSE_CACHE` / `PARSE_FAILURE_CACHE`** (`dsl/interpreter.ts`) : garder le plafond de 5 000
   et le `clear()` aux sites d'insertion.
10. **Exact d'abord** : opérer sur `GeoValue` avec `compute/geo-arithmetic.ts` ; `geoToNumber` le
    plus tard possible.
11. **Solveurs** : réutiliser les Newton existants (`parametric-newton.ts`,
    `parametric-intersection.ts`, `parametric-intersection-1d.ts`), ne pas en écrire un autre.
12. **Fichiers partagés avec le grapheur** (`viewport/`, `rendering/bezier.ts`,
    `rendering/colors.ts`, `graph/parametric-calculus.ts`) : lancer aussi
    `src/lib/grapheur/__tests__/`.

## Travail courant

- Tests ciblés : `pnpm test:server src/lib/geometry-core/<dossier>/__tests__/<fichier>.test.ts`
  (jamais la suite entière) ; `pnpm test:client` pour les `*.svelte.test.ts`.
- Après un `.svelte` modifié : `pnpm svelte:autofix <fichier>` (runes Svelte 5 uniquement).
- `pnpm check:incremental` = 0 erreur, une fois par lot (pas de `pnpm check` en boucle).
- `constructions-v2` : `ConstructionExecutor.load()` ne lève que la syntaxe ; une erreur
  d'exécution est dans `executor.loadError`, à lire après `load()`.
