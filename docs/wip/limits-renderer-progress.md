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

### ✅ Phase 3 — Descriptions FR + Renderer

**Fichiers** :

- `src/lib/mathAST/pedagogical-limits/descriptions-fr.ts` (~250 LOC)
- `src/lib/mathAST/pedagogical-limits/renderer.ts` (~165 LOC)
- `src/lib/mathAST/pedagogical-limits/__tests__/renderer.test.ts` (18 tests)

**Descriptions** : 28 rules couvertes lycée + sup. `apply-known-limit` re-utilise `step.description` (=`KnownLimitEntry.descriptionFr`). Vocab adaptive : `'gendarmes'` lycée vs `'squeeze'` sup. Sup compact (sans `identify-limit`, `conclude` minimal).

**Renderer** :

- `formatLimitSubscript` direction-aware (`a^+` / `a^-` / no decoration pour `'both'`).
- LaTeX 2-lignes `\\begin{aligned}` avec `\\textcolor{blue}{\\lim_{x \\to a^±} f(x)}`.
- Sub-steps de `FACTORISATION_CLUSTER_RULES − {simplify-common-factor}` (= `FRAGMENT_RULES`) dropent le `\\lim_{...}` (fragment, pas la limite entière).
- `renderAll` filtre top-level `identify-limit` + `detect-indeterminate-form` au niveau `summarized` ; sub-steps non filtrés.
- Bump primaire/college → lycée pour vocabulary lookup (defensive).

**Code review** (`code-reviewer` Opus) — 2 Important + 4 Nice-to-have, tous corrigés :

1. **Important** : `[factor-numerator, factor-denominator]` hardcoded → `FRAGMENT_RULES` dérivé de `FACTORISATION_CLUSTER_RULES` (single source of truth).
2. **Important** : `renderAll` faisait `map → filter` avec cast ; remplacé par `filter → map` pour éviter cast + coût `toLatex` sur steps filtrés.
3. **Nice-to-have** : `SUPERIEUR_TITLES.apply-lhopital` LaTeX brut → prose-only.
4. **Nice-to-have** : test `apply-known-limit` title delegation ajouté.

### ✅ Phase 4 — Démos catégorisées + script CLI (livrée post-V1)

**Fichiers** :

- `src/lib/mathAST/pedagogical-limits/demo-helpers.ts` (~190 LOC) — `DemoCase`, `DemoCategory`, `DemoFormat`, `presentLimit(testCase, format='latex'|'custom')`.
- `src/lib/mathAST/pedagogical-limits/demo-cases/` :
  - `direct-substitution.ts` (3 cas)
  - `known-limits.ts` (3 cas : sin(x)/x, (1−cos(x))/x², ln(1+x)/x)
  - `factorisation.ts` (4 cas : (x²−4)/(x−2), (x³−1)/(x−1), (x³−8)/(x−2), (x²−x−6)/(x−3))
  - `infinity-analysis.ts` (4 cas : numDeg=denDeg, numDeg>denDeg en +∞, numDeg<denDeg, signe à −∞)
  - `index.ts` (`ALL_CATEGORIES`)
  - **Total : 14 cas, 4 catégories** (V1 strategies seulement)
- `src/lib/mathAST/pedagogical-limits/__tests__/pedagogical-limits-demo.test.ts` — 14 snapshots stables (`toMatchSnapshot()`).
- `scripts/pedagogical-limits-demo.ts` (~120 LOC) — CLI standalone, filter par catégorie, flags `--latex` / `--custom`, ANSI highlight TTY-only.

**Format CLI** :

- Default `'custom'` : ASCII/Unicode-friendly, `lim_{x→a} f(x)` puis `@blue{...}` rewrité en ANSI bold-blue sur TTY.
- `--latex` : LaTeX brut (mêmes blocs `\\begin{aligned}` que le snapshot test).
- Substitutions cosmétiques `\\infty` → `∞`, `\\to` → `→`, `\\lim` → `lim`, etc.

**Code review** (`code-reviewer` Opus) — 2 Important + 2 Minor, **fixes appliqués** :

1. **Important** : `formatStepExpression` hardcodait la liste `[factor-numerator, factor-denominator]` ; remplacé par `FACTORISATION_CLUSTER_RULES.has(raw.rule) && raw.rule !== 'simplify-common-factor'` (single source of truth, V1.1 cluster extensions auto-couvertes — même dérivation que `FRAGMENT_RULES` dans `renderer.ts`).
2. **Important** : `formatNode(null, format)` documenté en JSDoc — la nullité provient du statut `'does-not-exist'`, divergence légitime d'avec les siblings integration/differentiation qui n'ont jamais ce cas.
3. **Minor** : regex `ansiHighlight` `[^{}]*` corrigée en `(?:[^{}]|\{[^{}]*\})*` pour matcher les `lim_{...}` avec sous-braces (bug actif sur le CLI limits, pré-existant dans les CLIs siblings — le pattern à 1 niveau de nesting suffit pour `lim_{x→a}`).

**Usage** :

```bash
pnpm tsx scripts/pedagogical-limits-demo.ts                                # all categories
pnpm tsx scripts/pedagogical-limits-demo.ts factorisation                  # one
pnpm tsx scripts/pedagogical-limits-demo.ts factorisation infinity-analysis  # several
pnpm tsx scripts/pedagogical-limits-demo.ts --latex factorisation          # raw LaTeX
```

**Tests** : 14/14 snapshots, 0 régression sur les 104 tests V1 antérieurs.

### ✅ Phase 5 — Glue Mode B `kind: 'limit'`

**Fichiers modifiés** :

- `src/lib/questions/types.ts` — branche `'limit'` dans `GeneratedSteps` (10 → 11 kinds).
- `src/lib/questions/template-schema.ts` — schemas Zod lax + strict pour `kind: 'limit'`.
- `src/lib/questions/generator/correction-generator.ts` — case `'limit'` dans le switch + fonction `renderLimit` (silent fallback sur `PedagogicalLimitNotImplemented`, bump primaire/college → lycée, propage `direction` + `verbosity`).
- `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts` — 2 nouvelles fixtures :
  - `limitFactorisationDemo` : `(x²−4)/(x−2)` à x=2 (factorisation)
  - `limitInfinityDemo` : `(3x²−x)/(x²+1)` à x→+∞ (infinity-analysis)
- `src/lib/questions/__tests__/generated-steps-demo.test.ts` — 2 snapshots (factorisation cluster + infinity-analysis).
- `src/routes/(protected)/dashboard/admin/debug/correction-mode-b/+page.svelte` — 2 imports + 2 generateInstance + 4 cards visuelles (correct/incorrect × 2 fixtures), 17 → 19 fixtures total.

**Tests** :

- `correction-generator.test.ts` : +9 tests dédiés `limit` (43 → 52). Couverture : direct, factorisation, infinity, template `{{vars}}` substitution, bump primaire→lycée, parse error fallback, `sin(x²)/x` → throw NotImplemented (lycée pas L'Hôpital), direction='right' propagé, override schoolLevel.
- `generated-steps-demo.test.ts` : +2 snapshots (factorisation + infinity).

**Décisions Phase 5** :

- Resolve `{{vars}}` via `resolveExpression` AVANT d'envoyer à `dispatchPedagogicalLimit` — cohérent avec les autres kinds.
- Refus L'Hôpital lycée géré au niveau `pedagogical-limits/types.ts` `STRATEGIES_LIMITS.lycee.enableLhopital === false` ; le pipeline throw `PedagogicalLimitNotImplemented` quand aucune stratégie ne s'applique → silent fallback Mode A.
- `\\infty`, `+\\infty`, `-\\infty`, `oo`, `+oo`, `-oo` reconnus côté `dispatchPedagogicalLimit`.

**Régression** : 0 sur 132 tests pertinents (`correction-generator` 52, `generated-steps-demo` 22, `template-schema` 58). 11 échecs pré-existants non liés à ce tunnel (cf. doc `arithmetic-from-blank`).

### ✅ Phase 6 — Quality + doc final

**One-line patch `limits/step-recorder.ts`** :

- Ajout de l'entrée manquante `'derivative-definition'` dans `RULE_DESCRIPTIONS: Readonly<Record<LimitRule, string>>`. La rule était émise par `composition.ts:1581` pour des cas comme `(x²−4)/(x−2)` à x=2 mais sans description FR ; le typage `Record<K, V>` aurait dû refuser l'absence (15 kinds, 14 entrées) mais TS a laissé passer. Patch indépendant du renderer pédago, profite à tous les consommateurs de `getRuleDescription` du module limits/ original.

**Quality gates** :

- ESLint sur tous les fichiers modifiés : **0 erreur, 0 warning**
- `pnpm check:incremental` (TypeScript + Svelte, ~30s) : **0 nouvelle erreur** (9 préexistantes filtrées dans `slides/demo` et `extern/`, identique au baseline)
- Tests cumulés sur les suites pertinentes : **685 verts**
  - `pedagogical-limits` : 104 (Phase 1+2+3)
  - `limits/` : 507 (régression 0)
  - `correction-generator` : 52 (incl. +9 'limit')
  - `generated-steps-demo` : 22 (incl. +2 snapshots limit)
- 0 régression sur les 11 tests pré-existants instables (variable-resolver, color-integration, test-exact-repro, e2e-fill-blanks-pipeline) — non liés à ce tunnel.

**Limitations connues V1** :

1. Stratégies pédagogiques NON implémentées (V1.1+) : `rationalization` (cas `(√(x+1)−1)/x`), `one-sided` / asymptotes verticales, `squeeze` / théorème des gendarmes, `lhopital` (sup uniquement), `composition` profonde. Pour ces cas, `dispatchPedagogicalLimit` throw `PedagogicalLimitNotImplemented` → silent fallback Mode A côté `correction-generator`.
2. Phase 4 (démos catégorisées + script CLI standalone) reportée V1.1.
3. Le pipeline accepte les options `verbosity`/`signal`/`timeoutMs` mais ne les honore pas encore (TODO `pipeline.ts:118`).
4. Pas de support pour les limites de suites définies par récurrence ni pour les limites paramétriques formelles.

**Pistes V1.1+** :

- Implémenter `rationalization` (réutiliser `tryRationalization` de `limits/algebraic.ts` ou ré-implémenter pédagogiquement).
- Implémenter `one-sided` pour les asymptotes verticales (`1/x` en `0⁺`/`0⁻`, `ln x` en `0⁺`).
- Implémenter `squeeze` / gendarmes (heuristique restreinte : `f(x) borné × g(x) → 0`).
- Implémenter `lhopital` (sup uniquement) — réutiliser `limits/lhopital.ts`.
- Phase 4 : démos catégorisées (`scripts/pedagogical-limits-demo.ts` CLI), snapshots stables.
- Honorer `verbosity` au niveau pipeline (filtrer les steps émis).

## Tests cumulés

| Phase | Tests ajoutés                                      | Cumul   |
| ----- | -------------------------------------------------- | ------- |
| 1     | +19 (types)                                        | 19      |
| 2     | +32 helpers, +18 pipeline, +17 dispatch (= 67)     | 86      |
| 3     | +18 renderer                                       | 104     |
| 5     | +9 correction-generator (limit), +2 demo snapshots | 115     |
| 4     | +14 demo snapshots (post-V1)                       | **129** |

## Documents produits

1. `docs/wip/limits-renderer-progress.md` — ce fichier (progression).
