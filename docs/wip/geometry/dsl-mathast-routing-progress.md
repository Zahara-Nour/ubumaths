# Progress — DSL geometry-core : routage RHS vers mathAST custom

> Plan révisé qui remplace `dsl-constants-variables-prompt.md`. Direction : router toute expression "math pure" du DSL vers `parseCustom` de mathAST (au lieu d'enrichir le path DSL).

## Décisions verrouillées

- **D1 = P2** : toute expression math pure est routée vers `parseCustom` (RHS d'affectations + args de builtins + conditions).
- **D2 = B** : walk DslExpr ; si pas de call ∈ `BUILTIN_NAMES`/macros + pas de tuple/property/indexed → math pure → extraire rawSource via positions tokens → `parseCustom`.
- **D3** : `applyAngleMode(node, mode)` partagé, appliqué après `parseCustom` (RHS, args, équations courbe).
- **D4** : `MATH_FUNCTIONS` et `evaluateScalarBinary` conservés (utiles pour `r = distance(A,B) + s`).
- **Q7 = α** : `e` réservé strict ; migrer 3 tests `interpreter-conic-properties.test.ts` (`e` → `exc`).
- **Réservation** : tokenizer reconnaît `\name` ; check "réservé" dans executeStatement (assignment + indexed + destructuring).

## Architecture cible

```
"r = 2 * \pi + sqrt(s)"
         │
         ▼
  Tokenizer (start/end pos par token, reconnaissance \name)
         │
         ▼
  Parser → DslAssignment{ name='r', value=DslExpr (avec start/end) }
         │
         ▼
  executeStatement (case assignment) :
    1. Check name réservé → erreur
    2. tryEvaluateAsMathExpr(value, source) :
       - isMathPureExpr(value) ?
       - Si oui : rawSource = source.slice(value.start, value.end)
                 node = parseCustom(rawSource)
                 node = applyAngleMode(node, this.angleMode)
                 freeVars = getVariables(node)
                 - Substitute statics, collect scalar deps
                 - Si scalarDeps vide : evaluate(node, {}) → number
                 - Sinon : createScalarExpression(closure, scalarDeps)
       - Sinon : null
    3. Si null → fallback evaluateExpr (path DSL)
    4. Stocker dans symbol table
```

## Phases

| Phase | Statut | Périmètre                                                     |
| ----- | ------ | ------------------------------------------------------------- |
| 1     | ✅     | Infra tokenizer/parser (positions, `\name`, source)           |
| 2     | ✅     | Walk AST + helper math-pure + extraction source               |
| 3     | ✅     | Routage statique (constantes, fonctions math, vars statiques) |
| 4     | ✅     | Routage réactif (vars hybrides)                               |
| 5     | ✅     | Mode angle global (`unite_angle` + `applyAngleMode` partagé)  |
| 6     | ✅     | Réservation `\pi`/`e` en LHS + migration tests                |
| 7     | ✅     | Substitution variables dans courbes                           |
| 8     | ✅     | Démo + doc                                                    |
| 9     | ✅     | Quality checks finaux                                         |

## Phase 1 — Infra tokenizer/parser

### Objectif

- `Token` gagne `start`/`end` (positions absolues dans la source complète)
- Tokenizer reconnaît `\name` comme `IDENTIFIER` avec value `\name`
- `DslExpr` (variants utiles) gagnent `start?`/`end?`
- `DslProgram` gagne `source?`
- Helper `getRawSource(expr, source): string | null`

### Fichiers à modifier

- `src/lib/geometry-core/dsl/tokens.ts` — ajout start/end au type Token
- `src/lib/geometry-core/dsl/tokenizer.ts` — calculer start/end + reconnaître `\name`
- `src/lib/geometry-core/dsl/types.ts` — ajout start/end à DslExpr + source à DslProgram
- `src/lib/geometry-core/dsl/parser.ts` — propager start/end aux DslExpr + capturer source
- `src/lib/geometry-core/dsl/source-utils.ts` — nouveau, exporte `getRawSource`

### Tests

- `__tests__/tokenizer-positions.test.ts` — nouveaux tests positions
- `__tests__/tokenizer-backslash.test.ts` — nouveaux tests `\name`
- `__tests__/parser-positions.test.ts` — nouveaux tests positions sur DslExpr
- `__tests__/source-utils.test.ts` — nouveau test pour `getRawSource`

### État

✅ Terminée. 35/35 tests Phase 1 verts. 0 régression sur 1251 tests DSL existants. 0 régression sur 2571 tests geometry-core.

### Fichiers modifiés

- `src/lib/geometry-core/dsl/tokens.ts` (+8 lignes : `start`/`end` REQUIRED sur Token)
- `src/lib/geometry-core/dsl/tokenizer.ts` (réécrit : positions absolues + reconnaissance `\pi`)
- `src/lib/geometry-core/dsl/types.ts` (+10 lignes : `DslExprPos` + `source?` sur DslProgram)
- `src/lib/geometry-core/dsl/parser.ts` (réécrit : helper `withPos` + capture `source`)
- `src/lib/geometry-core/dsl/source-utils.ts` (nouveau, exporte `getRawSource`)

### Tests Phase 1

- `__tests__/tokenizer-positions.test.ts` (9 tests)
- `__tests__/tokenizer-backslash.test.ts` (10 tests)
- `__tests__/parser-positions.test.ts` (9 tests)
- `__tests__/source-utils.test.ts` (7 tests)

## Phase 2 — Walk AST + helper math-pure + extraction source

### État

✅ Terminée. 27/27 tests verts.

### Fichiers ajoutés

- `src/lib/geometry-core/dsl/math-pure-expr.ts` — exporte `isMathPureExpr(expr, { macroNames? })`
- `src/lib/geometry-core/dsl/__tests__/math-pure-expr.test.ts` — 27 tests

### Décisions notables

- `string` literals : NOT math pure (ne s'évaluent pas en nombre)
- `call` avec `namedArgs` non vide : NOT math pure (mathAST n'a pas de `name=value`)
- Fonction inconnue (ni builtin ni macro) : math pure (laisser parseCustom décider)

## Phase 3 — Routage statique vers parseCustom

### État

✅ Terminée. 26/26 tests Phase 3 verts. 0 régression sur 2624 tests geometry-core.

### Fichiers modifiés

- `src/lib/geometry-core/dsl/interpreter.ts` :
  - constructor reçoit `source: string` ; `interpret()` lui passe `program.source`
  - import `isMathPureExpr`, `getRawSource`, `parseCustom`, `getVariables`, `compile`
  - nouveau helper `containsCallTo(expr, names)` (utilisé pour exclure trig)
  - nouveau helper `collectIdentifiers(expr, out)` (utilisé pour respecter symbol table)
  - constante `TRIG_DSL_ONLY = {sin, cos, tan, asin, acos, atan, arcsin, arccos, arctan}`
  - méthode `tryEvaluateAsMathExpr(expr): ResolvedValue | null`
  - hook au début de `evaluateExpr` (skip primitives number/string/bool)
- `src/lib/geometry-core/dsl/macro-registry.ts` : ajout `allNames(): ReadonlySet<string>`

### Garde-fous critiques

1. **Skip dans les bodies de macros** (`this.macros.insideMacro`) — les positions des stmts stdlib ne correspondent pas à `this.source`.
2. **Bornes du source** (start/end ≥ 0 et ≤ source.length) — défense contre out-of-bounds.
3. **Identifiers DSL non-numériques** (`collectIdentifiers` + check symbol table) — si `e = droite(...)` user, on garde le path DSL pour `intersection(d, e)` au lieu d'évaluer `e` comme Euler.
4. **Trig fonctions exclues V1** — restent sur le path DSL legacy en degrés (Phase 5 ajoutera `applyAngleMode`).
5. **Free vars non définies** → return null (laisser DSL lever erreur cohérente).
6. **Scalar deps** → return null pour V1 (Phase 4 traitera via createScalarExpression).

## Phase 4 — Routage réactif (variables hybrides)

### État

✅ Terminée. 11/11 tests Phase 4 verts. 0 régression sur 2635 tests geometry-core.

### Modifications dans `interpreter.ts`

- `tryEvaluateAsMathExpr` étendu : split free vars en `staticBindings` + `scalarDeps`
- Si `scalarDeps.length > 0` : créer `GeoScalar` via `figure.createScalarExpression(compute, depIds)`
- Closure compute = `fn({...staticBindings, varName: sv.get(scalarId)})`, avec post-process `Number.isFinite(result) ? result : NaN` pour cohérence avec la sémantique `evaluateScalarBinary` legacy (scalar/0 → NaN, pas Infinity)
- Optimisation "bare identifier" : si `expr.kind === 'identifier'` et symbol existe, retourne directement l'entrée (préserve `dependsOn` pour `courbe(t_max=m)` etc.)
- Check identifier non-numeric assoupli : autorise `'scalar'` (réactivité) en plus de `'nombre'`

### Cas couverts

- `r = 2*s` → reactive scalar
- `r = a + s` (mixed) → reactive
- `r = sqrt(s)` → reactive (déjà via SCALAR_MATH_OPS, maintenant aussi via mathAST si `s` slider)
- `r = exp(s)` → reactive (NOUVEAU — exp pas dans MATH_FUNCTIONS, le path DSL plantait)
- `r = 2*s + \pi` → reactive (constants + scalars)
- `a = \pi; b = a*s` → reactive (cascade)
- `r = 2*s; r = 3*s` → réassignation OK

## Phase 5 — Mode angle global

### État

✅ Terminée. 15/15 tests Phase 5 verts. 13/13 tests `applyAngleMode` verts. 0 régression sur 2663 tests geometry-core.

### Fichiers ajoutés

- `src/lib/geometry-core/dsl/apply-angle-mode.ts` — `applyAngleMode(node, mode)` walk MathNode
- `src/lib/geometry-core/dsl/__tests__/apply-angle-mode.test.ts` (13 tests)
- `src/lib/geometry-core/dsl/__tests__/dsl-angle-mode.test.ts` (15 tests)

### Modifications

- `interpreter.ts` :
  - état `angleMode: AngleMode = 'deg'`
  - `evaluateUniteAngle` intercepté dans `evaluateCall` AVANT MATH_FUNCTIONS
  - `applyAngleMode` appliqué dans `tryEvaluateAsMathExpr` après parseCustom
  - retirée la guard `TRIG_DSL_ONLY` (plus nécessaire)
  - `scalarMathOpFor(name, mode)` remplace `SCALAR_MATH_OPS` const, mode-aware
  - `evaluateMathFunction` simplifié pour utiliser `scalarMathOpFor`
  - passage de `this.angleMode` à `executeBuiltin`
- `builtins.ts` :
  - export `AngleMode` + `toRadians(value, mode)`
  - `executeBuiltin` accepte `angleMode` (default 'deg' rétrocompat)
  - `_executeBuiltinInner` accepte `angleMode`
  - Refactor `rotation` (ligne 567), `similitude` (ligne 760), `arc` (ligne 1463), `secteur` (ligne 1491), `point_sur` cercle (ligne 1948), `point_sur` quadratic (ligne 1962), `tangente` quadratic (ligne 1631), `angle_vecteurs` (ligne 472)

### Décision V1 importante

**Les équations passées à `courbe(...)` ne sont PAS affectées par le mode angle.** Elles restent en radians (mathAST natif) pour préserver la compatibilité avec les usages existants (`cos(t)`, `sin(t)` sur intervalles standards). Le param `_angleMode` est conservé dans la signature pour une intégration V2.

Les RHS d'affectations (routés mathAST) ET les builtins angles (arc/rotation/etc.) suivent bien le mode angle global.

## Phase 6 — Réservation `\pi`/`e` en LHS

### État

✅ Terminée. 8/8 tests Phase 6 verts. 0 régression sur 2671 tests geometry-core.

### Modifications

- `interpreter.ts` :
  - Constante `RESERVED_NAMES = new Set(['\\pi', 'e'])`
  - Helper `assertNameNotReserved(name, line)` lève "constante réservée"
  - Appelé dans `executeStatement` pour `assignment`, `indexedAssignment`, `destructuring`

### Migrations de tests existants

- `interpreter-conic-properties.test.ts:223,230,236` — `e = excentricite(c)` → `exc = excentricite(c)`
- `trace.test.ts:327` — `e = droite(C, D)` → `e2 = droite(C, D)` (+ `intersection(d, e)` → `intersection(d, e2)`)
- `locus.test.ts:152` — `e = courbe(...)` → `el = courbe(...)` (+ `point_sur(e, ...)` → `point_sur(el, ...)`)

## Phase 7 — Substitution variables statiques dans courbes

### État

✅ Terminée. 5/5 tests Phase 7 verts. 0 régression sur 2676 tests geometry-core.

### Modifications dans `builtins.ts`

- Import `substitute` depuis `$lib/mathAST`
- `createParametricCurveFromEquations` : après parsing de xRhs/yRhs, collecte les free vars qui sont des numbers dans symbol table → `substitute(rhs, { var: mathNumber(value) })`
- `createCurveFromEquation` : ajout du paramètre `symbols?: SymbolTable`, même logique de substitution sur le node parsé (en excluant `x`/`y`)
- Appelée depuis le case `'courbe'` avec `symbols` passé en argument

### Cas couverts

- `r = 3 ; c = courbe("x = r*cos(t)", ...)` → r substitué, dependsOn vide
- `s = slider(...) ; k = 2*s ; c = courbe("x = k*cos(t)", ...)` → k laissé symbolique, dependsOn contient k
- Mixed : static + scalar → seul le scalar est dans dependsOn

## Phase 8 — Démo paramétrique + doc

### État

✅ Terminée.

### Modifications dans `src/routes/(public)/geometry-demo/parametric/+page.svelte`

- Remplacé toutes les interpolations JS `${TWO_PI}` / `${PI}` / `${FOUR_PI}` / `${SIX_PI}` par les notations DSL natives `2*\\pi` / `\\pi` / `4*\\pi` / `6*\\pi`
- Supprimé les constantes JS `PI`, `TWO_PI`, `FOUR_PI`, `SIX_PI` (plus nécessaires)
- Ajouté `variablesDsl` : `phi = (1 + sqrt(5)) / 2 ; c = courbe(...)` — démo des constantes math + substitution
- Ajouté `reactiveDsl` : `s = slider(...) ; k = 2*s ; c = courbe(...)` — démo des variables réactives
- Ajouté 2 nouveaux blocs `<DslDemo>` correspondants
- `mcp__svelte__svelte-autofixer` exécuté : 1 warning préexistant (`href` sans `resolve()`), pas introduit par les modifications

## Phase 9 — Quality checks finaux

### État

✅ Terminée.

### Résultats

- `pnpm format` : ✅ tous les fichiers formatés
- `npx eslint <fichiers modifiés>` : ✅ 0 errors, 0 warnings (après nettoyage des imports/directives inutilisés)
- `pnpm check:incremental` : ✅ 0 erreurs actionnables (1541 fichiers scannés ; 9 erreurs préexistantes dans slides/demo et extern, filtrées)
- `pnpm test:server src/lib/geometry-core/` : ✅ **2676 passed** | 2 skipped (122 test files)
- `pnpm test:server src/lib/grapheur/` : ✅ 231 passed (5 test files)

### Tests ajoutés (récapitulatif)

| Test file                                     | Tests   | Phase |
| --------------------------------------------- | ------- | ----- |
| `__tests__/tokenizer-positions.test.ts`       | 9       | 1     |
| `__tests__/tokenizer-backslash.test.ts`       | 10      | 1     |
| `__tests__/parser-positions.test.ts`          | 9       | 1     |
| `__tests__/source-utils.test.ts`              | 7       | 1     |
| `__tests__/math-pure-expr.test.ts`            | 27      | 2     |
| `__tests__/dsl-mathast-routing.test.ts`       | 26      | 3     |
| `__tests__/dsl-mathast-reactive.test.ts`      | 11      | 4     |
| `__tests__/apply-angle-mode.test.ts`          | 13      | 5     |
| `__tests__/dsl-angle-mode.test.ts`            | 15      | 5     |
| `__tests__/dsl-reserved-constants.test.ts`    | 8       | 6     |
| `__tests__/dsl-courbe-with-variables.test.ts` | 5       | 7     |
| **Total nouveaux tests**                      | **140** |       |

## Documents produits

- Ce document : `docs/wip/geometry/dsl-mathast-routing-progress.md`

## Récapitulatif final

### Objectif atteint

Le RHS des affectations de variables numériques DSL est maintenant routé vers `parseCustom` de mathAST. Cela donne accès à :

- **Constantes** `\pi` (Math.PI) et `e` (Math.E) au top-level DSL
- **Fonctions math** (sqrt, exp, ln, log, abs, ceil, floor, …) au top-level
- **Variables hybrides** : statique si toutes free vars sont des numbers, réactive (GeoScalar) si au moins une est un slider/scalar
- **Mode angle global** via `unite_angle("degres" | "radians")` : appliqué aux RHS routés et aux builtins angles (arc, secteur, rotation, point_sur conique, tangente, angle_vecteurs)
- **Substitution variables statiques** dans les équations passées à `courbe(...)`

### Décisions verrouillées (rappel)

- Q7 = α : `e` réservé strict (3 + 2 tests existants migrés vers `exc`/`e2`/`el`)
- Mode angle dans équations courbe() : laissé en radians (mathAST natif) pour compat — V2 pourra l'intégrer

### Limitations V1 documentées

- `\theta`, `\alpha`, etc. (Greek letters au top-level) : non supportés
- Mode angle dans `courbe("y = sin(x)")` : ne s'applique pas — les équations sont en radians
- Sérialisation des variables : lossy (substitution lors de la création)

### Suggestions follow-up (V2)

- Support `\theta`/`\alpha`/etc. comme variables Greek au top-level
- Intégration mode angle dans les équations courbe()
- `unite_angle("grades")` pour les enseignants suisses
- Amélioration des erreurs (parseCustom retourne null silencieusement → éventuellement remonter le diagnostic)
