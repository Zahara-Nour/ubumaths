# Pedagogical Limits Renderer — Progression

> Source : `docs/wip/limits-renderer-prompt.md`
> Architecture : **Option B (pipeline parallèle)** — invalidation empirique d'Option A en Phase 0
> Date démarrage : 2026-05-07

## Décision architecturale clé (Phase 0)

L'analyse empirique du module `limits/` a démontré qu'**Option A (dual rendering pur sur step recorder algorithmique)** ne fonctionne PAS :

| Cas test                             | `evaluateLimit` retourne          | Steps émis             |
| ------------------------------------ | --------------------------------- | ---------------------- |
| `(x²-4)/(x-2)` à x=2                 | technique = `lhopital` (sup-only) | 2 méta-steps           |
| Même cas, `maxLhopitalIterations: 0` | status = `does-not-exist`         | 1 step (faux résultat) |
| `(√(x+1)-1)/x` à x=0                 | technique = `lhopital`            | 2 méta-steps           |
| `sin(x)/x` à x=0                     | technique = `known-limit`         | 1 step OK              |
| `x*sin(1/x)` à x=0                   | technique = `squeeze`             | 1 step minimal         |

Conclusions :

1. `evaluateLimit` privilégie L'Hôpital sur les formes 0/0 → court-circuite factorisation/rationalisation pédagogiques.
2. `tryFactorization` retourne `success: false` sur `(x²-4)/(x-2)` (case trivial).
3. Steps émis = 1-2 entries méta-techniques, jamais les sous-étapes pédagogiques attendues (factor numérateur → factor dénominateur → simplifier → substituer).
4. Scénario identique au commit `e1ac27965` qui a supprimé le pattern Option A pour `solve/`.

**Architecture retenue** : pipeline parallèle dans `pedagogical-limits/` qui réorchestre les techniques pédagogiquement (sous-étapes explicites), réutilise des utilitaires de `limits/` quand sain (`matchKnownLimit`, `getKnownLimitValue`, `evaluateNodeToApproximatedNumber`, `isInfinity`, …), sans dépendre de `evaluateLimit()` pour le pipeline. Aligné avec les 8 modules pédagogiques précédents (`pedagogical-differentiation`, `pedagogical-integration`, …).

## Décisions Phase 0 — validées avec utilisateur

- **Q1** Architecture **Option B** (pipeline parallèle) ✓
- **Q2** L'Hôpital activé `superieur` uniquement (locked behind strategy table) ✓
- **Q3** Vocabulary adaptive : `'gendarmes'` lycée vs `'squeeze'` superieur ✓
- **Q4** Périmètre V1 : direct-substitution, known-limit, factorisation, rationalisation, infinity-analysis, one-sided, squeeze, lhopital (sup), composition simple, linearity, product, quotient, algebraic/abs simplification. `derivative-definition` non utilisée par notre pipeline (technique évitée — on factorise pédagogiquement). ✓
- **Q5** ~20 démos en 7 catégories ✓
- **Q6** `kind: 'limit'` (singulier) ✓
- **Q7** Schéma Mode B avec `expression`/`variable`/`approach`/`direction`/`options` (pas `allowLhopital` exposé, dérivé du schoolLevel) ✓
- **Q8** Silent fallback pattern aligné sur `integrate`/`simplify` (catch `PedagogicalLimitNotImplemented` → return null) ✓
- **Q9** Cible : ~1500-2000 LOC, ~100-130 tests, ~14-20h ✓
- **Q10** API d'entrée : `expression` LaTeX + `approach` LaTeX séparés (pas `LimitNode` complet) ✓
- **Q11** Couverture explicite des 4 statuts terminaux (mais pipeline n'émet que 3 : `exact` / `infinite` / `does-not-exist` ; `unsupported` remplacé par throw) ✓

## Phases livrées

### ✅ Phase 1 — Types `pedagogical-limits/types.ts`

**Fichiers** :

- `src/lib/mathAST/pedagogical-limits/types.ts` (~370 LOC)
- `src/lib/mathAST/pedagogical-limits/index.ts` (barrel)
- `src/lib/mathAST/pedagogical-limits/__tests__/types.test.ts` (19 tests, all passing)

**Types exportés** :

- `LimitsSchoolLevel = Exclude<SchoolLevel, 'primaire' | 'college'>`
- `PedagogicalLimitRule` : union de **28 rules** (plus large que `LimitRule` algorithmique). Catégories : identification, techniques directes, factorisation (3 sub-rules), rationalisation (2), infinity-analysis (3), one-sided (3), squeeze (2), lhopital, composition (2), opérations algébriques (3), conclusion (3).
- `PedagogicalLimitStep extends BaseStep<PedagogicalLimitRule>` avec `variable`, `approach`, `direction`, `bindings?`, `globalBefore?`, `globalAfter?`, `indeterminateForm?`, `subSteps?`.
- `PedagogicalLimitStatus = Exclude<LimitStatus, 'indeterminate' | 'unsupported'>` (narrowing : 3 statuts terminaux seulement, jamais `'indeterminate'` mid-flight ni `'unsupported'` remplacé par throw).
- `PedagogicalLimitResult` avec `steps`, `value`, `status: PedagogicalLimitStatus`, `indeterminateForm`, `variable`, `approach`, `direction`.
- `LimitGenerationStrategy` + `STRATEGIES_LIMITS` (table par niveau).
- `PedagogicalLimitOptions` (variable + approach + direction? + schoolLevel + verbosity? + signal? + timeoutMs?).
- `PedagogicalLimitNotImplemented extends Error` avec `expression: MathNode` et `reason?: string`.
- `FACTORISATION_CLUSTER_RULES` : groupe parent + 2 sub-rules de factorisation.

**STRATEGIES_LIMITS** :

|                              | lycee         | superieur   |
| ---------------------------- | ------------- | ----------- |
| `enableLhopital`             | **false**     | true        |
| `enableFactorization`        | true          | true        |
| `enableRationalization`      | true          | true        |
| `enableInfinityAnalysis`     | true          | true        |
| `enableSqueeze`              | true          | true        |
| `enableComposition`          | true          | true        |
| `squeezeVocab`               | `'gendarmes'` | `'squeeze'` |
| `includeIdentify`            | true          | false       |
| `verbosityCompactConclusion` | false         | true        |

**Code review** (`code-reviewer` agent, Opus) — 3 issues identifiées + corrigées :

1. **Important** : `PedagogicalLimitResult.status: LimitStatus` admettait `'indeterminate'` (mid-flight) et `'unsupported'` (jamais retourné — remplacé par throw) → narrowing en `PedagogicalLimitStatus`. Test compile-time `@ts-expect-error` ajouté.
2. **Important** : naming `schoolLevel` vs `level` — incohérence avec `pedagogical-integration`. Aligné sur `pedagogical-differentiation` (`schoolLevel`), JSDoc note ajoutée pour documenter la divergence pré-existante.
3. **Nice-to-have** : `FACTOR_SUBSTEP_RULES` renommé en `FACTORISATION_CLUSTER_RULES` (le nom impliquait à tort que le parent `simplify-common-factor` n'en faisait pas partie).
4. **Nice-to-have** : JSDoc bindings table complétée pour `algebraic-simplification` et `abs-simplification`.
5. **Nice-to-have** : header test "4 statuts" → "3 statuts" (correct count).

**Tests** : 19/19 verts.

### ✅ Phase 2 — Pipeline pédagogique

**Fichiers** :

- `src/lib/mathAST/pedagogical-limits/helpers.ts` (~370 LOC, nouveau)
- `src/lib/mathAST/pedagogical-limits/pipeline.ts` (~440 LOC, nouveau)
- `src/lib/mathAST/pedagogical-limits/dispatch.ts` (~140 LOC, nouveau)
- `src/lib/mathAST/pedagogical-limits/__tests__/helpers.test.ts` (32 tests)
- `src/lib/mathAST/pedagogical-limits/__tests__/pipeline.test.ts` (18 tests)
- `src/lib/mathAST/pedagogical-limits/__tests__/dispatch.test.ts` (17 tests)

**Stratégies pédagogiques implémentées V1** :

- `direct-substitution` (lycée + sup) — substitue `varName = a` ; si valeur finie, succès.
- `apply-known-limit` (lycée + sup) — réutilise `matchKnownLimit` + `getKnownLimitValue` du module limits/.
- **Factorisation 0/0** (lycée + sup) — `asPolynomial` extrait coefficients ; `syntheticDivide` (Horner) divise par `(x − a)` ; émet `detect-indeterminate-form` + parent `simplify-common-factor` avec sous-étapes `factor-numerator` et `factor-denominator` ; recurse pour conclure.
- **infinity-analysis** (lycée + sup) — extrait coefficients num/den, compare degrés, ratio des leading coefficients (`numDeg = denDeg`) / dominance numérateur (`+∞` ou `−∞`) / dominance dénominateur (`0`). Sign at `−∞` corrigé selon parité de `degDelta`.

**NON implémentées en V1 (à faire en V1.1+)** :

- `rationalization` (cas `(√(x+1)−1)/x`)
- `one-sided` / asymptotes verticales
- `squeeze` / théorème des gendarmes
- `lhopital` (sup uniquement)
- `composition` profonde

**Helpers réutilisables** :

- `evaluateAtPoint(expr, varName, value)` : eval numérique, supporte poly + sin/cos/exp/ln/sqrt.
- `asPolynomial(expr, varName)` : extrait coeffs `[a₀, a₁, …]`. Refuse non-polynômes.
- `syntheticDivide(coeffs, a)` : Horner, retourne `{ quotient, remainder }`.
- `polyToNode(coeffs, varName)` : reconstruit l'AST cosmétique (encode `−x²` via `opposite()`).
- `formatApproachShort`, `formatLinearFactor`, `buildLinearFactor`, `classifyApproach`, `normalizeDirection`.

**Code review post-Phase 2** (`code-reviewer` Opus) — 1 Critical + 3 Important + 4 Nice-to-have, **tous corrigés** :

1. **Critical** : `helpers.ts:368` `approach.argument` → `approach.operand` (TS error + bug runtime sur approach négatif).
2. **Important** : import `isRootAt` inutilisé dans `pipeline.ts` retiré.
3. **Important** : `polyToNode` encodait `−x²` via `subtract(0, x²)` au lieu de `opposite(x²)` ; corrigé pour respecter la convention canonique du codebase.
4. **Important** : `tryInfinityAnalysis` annonçait `indeterminateForm: '∞/∞'` même quand `numDeg < denDeg` (cas trivial → 0). Corrigé : `'∞/∞'` uniquement quand `numDeg > denDeg` (vrai cas indéterminé résolu par dominance).
5. **TODO Phase 3** ajouté pour `verbosity` / `signal` / `timeoutMs` (acceptés par l'API mais pas encore honorés).
6. Tests ajoutés : `polyToNode` shape vérifiant `opposite()` ; `dispatch` propagation de `verbosity`.

**Tests cumulés Phase 1+2** :

| Suite                  | Tests  |
| ---------------------- | ------ |
| `types.test.ts`        | 19     |
| `helpers.test.ts`      | 32     |
| `pipeline.test.ts`     | 18     |
| `dispatch.test.ts`     | 17     |
| **Total nouveau code** | **86** |

**0 régression** sur les 507 tests existants de `limits/`.

### ⏳ Phase 3 — Descriptions FR + Renderer (à venir)

Cible : `descriptions-fr.ts` (~300 LOC) + `renderer.ts` (~200 LOC).

### ⏳ Phase 4 — Démos + script CLI (à venir)

Cible : `demo-cases/` (7 catégories, ~20 cas) + `scripts/pedagogical-limits-demo.ts`.

### ⏳ Phase 5 — Glue Mode B `kind: 'limit'` (à venir)

Cible : étendre `correction-generator.ts` + `template-schema.ts` + 2 fixtures + page debug (17 → 19 cards).

### ⏳ Phase 6 — Quality + doc final (à venir)

Cible : ESLint, `pnpm check:incremental`, svelte-autofixer, tests régression, MAJ docs.

## Tests cumulés

| Phase | Tests ajoutés                                  | Cumul |
| ----- | ---------------------------------------------- | ----- |
| 1     | +19 (types)                                    | 19    |
| 2     | +32 helpers, +18 pipeline, +17 dispatch (= 67) | 86    |

## Documents produits

1. `docs/wip/limits-renderer-progress.md` — ce fichier (progression).
