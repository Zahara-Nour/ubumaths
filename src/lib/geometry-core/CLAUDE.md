# CLAUDE.md — Module `geometry-core`

**Reference compacte chargee automatiquement quand je touche ce module.**

Documentation complete : [`docs/ref/geometry/`](../../../docs/ref/geometry/) (README + 5 audits architecture/qualite/tests/perf/securite).

---

## En 1 phrase

Moteur de geometrie 2D pedagogique : DSL francophone (`point(2;3)`, `cercle(O;r)`, `courbe("x^2")`) → graphe reactif Svelte 5 → rendu canvas/SVG/TikZ/Typst, avec solveurs numeriques (Newton, Simpson) pour courbes parametriques/polaires.

## File map (ce qui vit ou)

| Sous-dossier   | Role                                        | Fichiers cles                                                                                                                                                               |
| -------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dsl/`         | Parse + interprete DSL francais             | `tokenizer.ts`, `parser.ts`, `interpreter.ts` (1 120L), `builtins.ts` (3 425L dont switch `_executeBuiltinInner` 2 130L), `stdlib.ts` (197L), `transform-apply.ts` (1 087L) |
| `graph/`       | API Figure + reactivite + solveurs          | `figure.ts` (4 585L), `dependency-graph.ts`, `compute-position.ts` (1 308L), `parametric-newton.ts`, `parametric-intersection*.ts`, `parametric-calculus.ts`                |
| `compute/`     | Operations numeriques de base               | `compute-locus.ts`, samplers, helpers                                                                                                                                       |
| `geometry/`    | Intersections analytiques + transformations | conic-conic, line-circle, sym/rot/trans                                                                                                                                     |
| `rendering/`   | Exports visuels                             | `svg-primitives.ts`, `bezier.ts` (Catmull-Rom), `rough-geometry.ts`, `export-tikz.ts`, `export-typst.ts`, `marching-squares.ts`                                             |
| `interaction/` | Hit-testing, snapping                       | drag handlers, proximity                                                                                                                                                    |
| `types/`       | Type system                                 | `elements.ts` (90 types `Geo*`), `geo-value.ts`, `primitives.ts`, `schemas.ts`                                                                                              |
| `validation/`  | Verifications geometriques                  | predicates                                                                                                                                                                  |
| `viewport/`    | Coordonnees ecran ↔ math                   | transforms, scaling                                                                                                                                                         |

Entry point : `src/lib/geometry-core/index.ts` (barrel re-export de tous les sous-dossiers).

---

## REGLES DURES (ne PAS faire)

1. **Pas d'`eval()` / `new Function()`** dans le pipeline DSL. Utiliser `compile()` depuis `$lib/mathAST/eval/compile`. Le module est verifie clean — ne pas regresser.
2. **Ajouter un builtin DSL** : creer une `function handleX(ctx: BuiltinCtx)` au niveau module dans `dsl/builtins.ts`, puis `HANDLERS.set('x', handleX)`. **Ne PAS ajouter au switch** — il n'existe plus depuis 2026-05-18 (refactor switch geant → Map dispatcher de 27 lignes). 62 handlers en place, pattern coherent.
3. **Pas de cast `as GeoXxx`**. 84 type guards sont definis dans `types/elements.ts` (`isFreePoint`, `isCircle`, `isParametricCurve`, etc.) — les utiliser.
4. **Pas d'`any`**. Si necessaire, `unknown` + type guard.
5. **Pas modifier `database.ts`** (auto-genere). Pour les types reutilisables : `$lib/types/database-helpers.ts`.
6. **Pas relancer `pnpm check` ou `svelte-check` plusieurs fois** (sature la memoire). Une fois suffit, en fin de session.
7. **Apres edit `.svelte`**, TOUJOURS appeler `mcp__svelte__svelte-autofixer`.

---

## Gotchas non visibles dans le code

- **Parser unary minus inconsistency** : `-3y` parse comme `opposite(3)*y` au lieu de `opposite(3*y)`. Affecte l'analyse structurelle. Voir `docs/ref/geometry/parser-unary-minus-inconsistency.md`.
- **`PARSE_CACHE` plafonne a 5 000** (`dsl/interpreter.ts:158-164`) : depuis 2026-05-18. Si tu modifies la logique de cache, conserve les `if (size >= PARSE_CACHE_MAX) .clear()` aux 2 sites d'insertion.
- **Derivees secondes pre-compilees** (`compiledXSecond`/`compiledYSecond` sur `GeoParametricCurve`) : depuis 2026-05-18. `getSecondDerivatives()` dans `parametric-calculus.ts` lit le cache. Si tu ajoutes un nouveau site de construction de `GeoParametricCurve` hors `Figure.createParametricCurve`, n'oublie pas de pre-compiler ces 2 champs (sinon `cercle_osculateur` et `courbure` retournent silencieusement `null`).
- **Pattern mutable-env obligatoire pour les hot paths parametriques** : tout sampler/closure qui appelle `compiledX(env)` dans une boucle doit utiliser un seul `env: Record<string, number>` partage et muter `env[param] = t` avant chaque eval. **JAMAIS** `{ ...scalarBindings, [param]: t }` dans une boucle. Voir `parametric-newton.ts:69`, `computeParametricCurveSampling` et `createTangentToParametric` dans `figure.ts` pour les references.
- **`findClosestParameterOnCurve` accepte un `warmStartT?` (8e param)** depuis 2026-05-18. Si tu appelles cette fonction dans un contexte de drag continu, **toujours** passer le `t` precedent en hint (skip ~7 des 8 multi-starts). Le warm-start integre un garde-fou : si Newton converge sur un MAX local de distance (e.g. cursor inaccessible), comparaison avec les bornes pour retomber sur la bonne reponse. Voir `movePointOnParametricCurveFromCursor` pour le pattern. **Pas encore disponible** dans `parametric-intersection-1d.ts` (API a revoir : retourne multiples roots).
- **`marchingSquares` est memoize** (depuis 2026-05-18) — WeakMap module-level keyed par `CompiledFn` identity. Cache hit quand viewport et gridSize sont identiques. **Le caller NE DOIT PAS muter** le `SampledCurve[]` retourne (reference partagee a travers les frames). Cache auto-invalide quand le `GeoImplicitCurve` est remplace (WeakMap GC). Si tu ajoutes une nouvelle entree dans `rendering/` qui appelle `compiledFn` en boucle, considere un pattern de cache similaire.
- **`computeLocusCurve` est memoize** (depuis 2026-05-18) — WeakMap keyed par `GeoLocus`, sous-cle = snapshot des positions/scalaires de `locus.dependsOn` + viewport. Si tu modifies la facon dont le locus expose ses dependances (`createLocus` dans `figure.ts`), **la cle de cache doit rester complete** : tout element manquant de `dependsOn` produirait des cache hits errones. La regle pratique : `dependsOn` = closure transitive de driver + tracer. Si tu ajoutes un nouveau type de driver ou un nouveau type d'element interne au sous-graphe, verifier que `createLocus` les inclut bien.
- **`Figure.computeParametricCurveSampling` est memoize** (depuis 2026-05-18) — WeakMap keyed par `GeoParametricCurve`, sous-cle = `(tMin, tMax, scalar bindings, viewport)`. Le sampler retourne le meme `ParametricSampleResult` quand les inputs sont identiques — **ne pas muter** le resultat. Si tu ajoutes un nouveau parametre qui influence le sampling (ex: nouveau `gridSize`), il doit etre integre dans la cle de cache (`buildParametricSamplingKey` au top de `figure.ts`).
- **`version: $state(0)`** dans `GeometryCanvas.svelte:207-212` : declenche le recalcul de TOUTES les courbes a chaque mutation, meme triviale.
- **`extendLineToViewport`** dupliquee dans `svg-primitives.ts`, `export-tikz.ts`, `export-typst.ts` (mot pour mot). Toute correction doit etre triple-appliquee.
- **3 interfaces `NewtonConfig` distinctes** dans `parametric-newton.ts`, `parametric-intersection.ts`, `parametric-intersection-1d.ts` avec noms de champs differents (`tolerance` vs `convergenceTolerance`, `numStarts` vs `numStartsPerAxis`).
- **`GeoOsculatingCircle`** rendu dans les 4 surfaces (canvas + SVG + TikZ + Typst) depuis 2026-05-18 via helper `osculatingCircleToSVG` et branches dedies. Si tu ajoutes un nouveau type `Geo*` qui produit un visuel, **verifier les 3 exporters** (`svg-primitives.ts`, `export-tikz.ts`, `export-typst.ts`) en plus du canvas — pas de garde TypeScript ne te le rappellera.
- **`graph` ↔ `dsl`** : plus de cycle depuis 2026-05-18. `singularity-warn` a ete deplace vers `$lib/mathAST/analysis/`. **Regle a maintenir** : `graph/` ne doit JAMAIS importer en valeur depuis `dsl/`. Si tu en as besoin, le helper appartient probablement a `$lib/mathAST/analysis/` ou a un nouveau dossier partage `geometry-core/analysis/`.
- **`DslRuntimeError` accepte un objet `details` structure** depuis 2026-05-18 : `new DslRuntimeError({ summary, hint?, forms? }, line)`. Le constructeur a 2 overloads (string OU objet) → backward compatible avec ~150 sites legacy. Le champ `details: DslRuntimeErrorDetails | null` est exposé sur l'instance pour le rendu UI riche (voir `dsl/errors.ts`). **Pour un nouveau builtin, toujours utiliser la forme structuree** : elle alimente le panneau d'erreur du player `constructions-v2` qui rend `summary` + `hint` + liste de `forms` avec inline-code styling. La forme plate ne fait que tomber sur un `<pre>` brut.
- **`ConstructionExecutor.load()` ne throw PLUS pour les erreurs runtime** depuis 2026-05-18. Il capture l'erreur dans `_loadError` et retourne normalement, avec `_stepDurations` ne contenant que les durations des steps valides. Le caller doit lire `executor.loadError` apres `load()` et propager. Pattern dans `ConstructionPlayer.svelte:loadScript`. Seules les `DslParseError` (syntaxe) sont encore propagees par `load()`.
- **9 erreurs preexistantes svelte-check** (~46 warnings). Baseline stable, ne pas commenter, juste verifier que mes modifs n'augmentent pas le compteur.

---

## Patterns "ou regarder"

### Ajouter un builtin DSL (`point`, `cercle`, ...)

1. **Handler top-level** dans `dsl/builtins.ts` : `function handleX(ctx: BuiltinCtx) { ... }` qui destructure `ctx` et retourne `BuiltinResult | BuiltinMultiResult | BuiltinScalarResult | null`
2. **Registration** : `HANDLERS.set('x', handleX);` juste apres la fonction
3. **Factory method** dans `graph/figure.ts`
4. **Tests** : `dsl/__tests__/builtins-<xxx>.test.ts` ou un fichier theme
5. **Mise a jour `BUILTIN_NAMES`** (Set en bas de `dsl/builtins.ts`) ET `dsl/stdlib.ts` si exposition stdlib
6. **Erreurs structurees obligatoires** : utiliser `new DslRuntimeError({ summary, hint?, forms? }, line)` plutot que la string flat. Voir `handleCercle` comme reference (`dsl/builtins.ts:1820`). Pattern :
   ```ts
   throw new DslRuntimeError(
   	{
   		summary: `\`nom()\` : ${problemeConcret}.`,
   		hint: "Suggestion d'action concrete.",
   		forms: [{ syntax: 'nom(A, B)', description: 'description en `inline code` quand utile' }]
   	},
   	line
   );
   ```
   Le panneau d'erreur dans `/construction-demo` rend ces champs avec inline-code styling et liste a puces. La string flat fonctionne toujours (backward compat) mais s'affiche brute dans un `<pre>`.

### Ajouter un type `Geo*` (`GeoNewElement`)

1. Interface dans `types/elements.ts` (extends `GeoElementBase`)
2. Type guard `isNewElement` dans le meme fichier
3. Ajouter au union `GeoElement`
4. Branche dans `graph/compute-position.ts` (sinon position jamais calculee)
5. **Les 4 surfaces de rendu** (piege documente — `GeoOsculatingCircle` etait omis des exports avant 2026-05-18) :
   - `GeometryCanvas.svelte` (canvas interactif)
   - `rendering/svg-primitives.ts` + branche dans `rendering/export-svg.ts`
   - `rendering/export-tikz.ts`
   - `rendering/export-typst.ts`
6. Si interactif : handler dans `interaction/`

### Ajouter une intersection

1. Si analytique : `geometry/intersect-*.ts`
2. Si numerique (parametrique) : `graph/parametric-intersection.ts` (2D-2D) ou `parametric-intersection-1d.ts` (mixte)
3. Type `GeoIntersection*` dans `types/elements.ts`

### Drag d'un point

Chemin : `onPointerMove` → `figure.movePoint()` → `compute-position.ts` → `dependency-graph` recalcul topologique → mutation `$state` → render.

Pour drag sur courbe parametrique : `movePointOnParametricCurveFromCursor` → Newton multi-start dans `parametric-newton.ts:findClosestParameterOnCurve`.

---

## Commandes utiles (specifiques module)

```bash
# Compter tests par sous-dossier
find src/lib/geometry-core -name "*.test.ts" | awk -F'/' '{print $4}' | sort | uniq -c

# Lister tous les types Geo*
grep -E "^export (interface|type) Geo" src/lib/geometry-core/types/elements.ts

# Tests cibles (eviter tests:unit en masse)
pnpm test:server src/lib/geometry-core/graph/__tests__/parametric-newton.test.ts
```

---

## Action items prioritaires (si refactor demande)

Voir `docs/ref/geometry/README.md` section "Action items prioritaires" pour la liste cross-cutting. Top 3 (impact/effort) :

1. **[SECURITE HIGH hors module]** `src/lib/utils/game/challenge-variables.ts:68-76` → `new Function()` a remplacer par `compile()`.
2. **[PERF HIGH / EFFORT FAIBLE]** Cacher derivees secondes (`parametric-calculus.ts`).
3. **[PERF HIGH / EFFORT FAIBLE]** Eliminer les spreads dans `figure.ts:4399-4418`.

---

## Quand approfondir

| Besoin                               | Document                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| Vue globale, modele de donnees, flux | [`docs/ref/geometry/architecture.md`](../../../docs/ref/geometry/architecture.md) |
| Refactor / dette                     | [`docs/ref/geometry/code-quality.md`](../../../docs/ref/geometry/code-quality.md) |
| Tests / couverture                   | [`docs/ref/geometry/tests.md`](../../../docs/ref/geometry/tests.md)               |
| Perf / hotspots                      | [`docs/ref/geometry/performance.md`](../../../docs/ref/geometry/performance.md)   |
| Securite                             | [`docs/ref/geometry/security.md`](../../../docs/ref/geometry/security.md)         |
| Progress docs (livraisons recentes)  | [`docs/wip/geometry/`](../../../docs/wip/geometry/)                               |
