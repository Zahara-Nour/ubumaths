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
2. **Pas de nouveau `case` dans `_executeBuiltinInner`** (`dsl/builtins.ts:345-2389`). Ce switch fait deja 2 045 lignes (62 branches `case`). Extraire chaque builtin en handler dedie.
3. **Pas de cast `as GeoXxx`**. 84 type guards sont definis dans `types/elements.ts` (`isFreePoint`, `isCircle`, `isParametricCurve`, etc.) — les utiliser.
4. **Pas d'`any`**. Si necessaire, `unknown` + type guard.
5. **Pas modifier `database.ts`** (auto-genere). Pour les types reutilisables : `$lib/types/database-helpers.ts`.
6. **Pas relancer `pnpm check` ou `svelte-check` plusieurs fois** (sature la memoire). Une fois suffit, en fin de session.
7. **Apres edit `.svelte`**, TOUJOURS appeler `mcp__svelte__svelte-autofixer`.

---

## Gotchas non visibles dans le code

- **Parser unary minus inconsistency** : `-3y` parse comme `opposite(3)*y` au lieu de `opposite(3*y)`. Affecte l'analyse structurelle. Voir `docs/ref/geometry/parser-unary-minus-inconsistency.md`.
- **`PARSE_CACHE` plafonne a 5 000** (`dsl/interpreter.ts:158-164`) : depuis 2026-05-18. Si tu modifies la logique de cache, conserve les `if (size >= PARSE_CACHE_MAX) .clear()` aux 2 sites d'insertion.
- **Pas de cache des derivees secondes** (`graph/parametric-calculus.ts:75-95`) : `cercle_osculateur` et `courbure` recompilent a chaque tick. Limitation V1 connue.
- **`version: $state(0)`** dans `GeometryCanvas.svelte:207-212` : declenche le recalcul de TOUTES les courbes a chaque mutation, meme triviale.
- **`extendLineToViewport`** dupliquee dans `svg-primitives.ts`, `export-tikz.ts`, `export-typst.ts` (mot pour mot). Toute correction doit etre triple-appliquee.
- **3 interfaces `NewtonConfig` distinctes** dans `parametric-newton.ts`, `parametric-intersection.ts`, `parametric-intersection-1d.ts` avec noms de champs differents (`tolerance` vs `convergenceTolerance`, `numStarts` vs `numStartsPerAxis`).
- **`GeoOsculatingCircle`** dans l'union `GeoElement` mais absent des renderers SVG/TikZ/Typst — rendu uniquement dans `GeometryCanvas.svelte`. Export muet.
- **`graph` ↔ `dsl`** : cycle de dependance fragile (`figure.ts:142` importe `singularity-warn` depuis dsl). Tient grace aux `import type`. Une importation de valeur casse le build.
- **9 erreurs preexistantes svelte-check** (~46 warnings). Baseline stable, ne pas commenter, juste verifier que mes modifs n'augmentent pas le compteur.

---

## Patterns "ou regarder"

### Ajouter un builtin DSL (`point`, `cercle`, ...)

1. Handler dans `dsl/builtins.ts` (eviter le switch — creer un module dedie + entree dans une map de dispatch si possible)
2. Factory method dans `graph/figure.ts`
3. Tests : `dsl/__tests__/builtins-<xxx>.test.ts`
4. Mise a jour `dsl/stdlib.ts` si exposition stdlib

### Ajouter un type `Geo*` (`GeoNewElement`)

1. Interface dans `types/elements.ts` (extends `GeoElementBase`)
2. Type guard `isNewElement` dans le meme fichier
3. Ajouter au union `GeoElement`
4. Branche dans `graph/compute-position.ts` (sinon position jamais calculee)
5. Branches dans `rendering/svg-primitives.ts`, `rendering/export-tikz.ts`, `rendering/export-typst.ts` (sinon export muet — piege classique)
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
