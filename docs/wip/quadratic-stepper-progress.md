# Pedagogical Quadratic Stepper — Progrès

> **Source du plan** : `docs/wip/quadratic-stepper-prompt.md` > **Décision architecturale** : Option A — module séparé `pedagogical-solve/quadratic.ts` clone du linéaire (validée Phase 0)
> **Démarré** : 2026-05-05

## Objectif

Ajouter un stepper pédagogique pour les équations du second degré dans `src/lib/mathAST/pedagogical-solve/`, branché en Mode B via un nouveau `kind: 'quadratic-equation'`. Couvre Δ > 0, Δ = 0, Δ < 0, plus 3 cas spéciaux pédagogiques (b = 0, c = 0, déjà factorisé) et la standardisation auto vers `... = 0`. Niveaux : `lycee + superieur` (refus type-level de `primaire + college`).

## État global

| Phase | Status          | Commit      | Notes                                                                                                                                                                                                                                                                        |
| ----- | --------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | ✅ Spec validée | —           | Q1–Q9 « tout en reco » + hypothèses implicites confirmées                                                                                                                                                                                                                    |
| 1     | ✅ Livrée       | `593a82204` | Extension `EquationOperation` (+18 kinds quadratique), `QuadraticSchoolLevel`, `QuadraticEquationStepsOptions`, `STRATEGIES_QUADRATIC` ; 29 tests d'isolation ; guard linear-renderer + refacto switch ; code review code-reviewer (Opus) appliquée                          |
| 2     | ✅ Livrée       | —           | Refacto `_helpers.ts` (canon, addToBothSides, makeStep, etc.) ; export `extractQuadraticCoefficients` ; pipeline `quadratic.ts` ~620 LOC (4 cas + standardize + throw NotImplemented) ; `class PedagogicalQuadraticNotImplemented` ; 57 tests ; code review (Opus) appliquée |
| 3     | ✅ Livrée       | —           | Renderer `quadratic-renderer.ts` (TITLES + EXPLANATIONS lycée+supérieur, formatExpressionLatex per kind, assertSupportedLevel refuse primaire+college) ; 29 tests ; 0 régression                                                                                             |
| 4     | ✅ Livrée       | —           | Dispatcher `index.ts` (`generateEquationSteps` selon degré + bumps primaire→college, primaire/college→lycee + class `UnsupportedEquationDegree`) ; 19 tests ; 0 régression                                                                                                   |
| 5     | ⏳ À faire      | —           | 7 catégories démo + script CLI `scripts/pedagogical-quadratic-demo.ts`, ~20 snapshots                                                                                                                                                                                        |
| 6     | ⏳ À faire      | —           | Mode B `kind: 'quadratic-equation'` (types/Zod/correction-generator/fixture/page debug), ~7 tests                                                                                                                                                                            |
| 7     | ⏳ À faire      | —           | ESLint + check:incremental + svelte-autofixer + doc + commit final                                                                                                                                                                                                           |

## Décisions architecturales (Phase 0 — validées par l'utilisateur)

### Q1 — Module séparé (option A)

Nouveau `pedagogical-solve/quadratic.ts` + `quadratic-renderer.ts`, frères de `linear.ts` / `linear-renderer.ts`. **Pas** d'extension de `linear.ts`.

### Q2 — Dispatcher unifié `pedagogical-solve/index.ts`

`generateEquationSteps(eq, options)` dispatch automatique selon `getPolynomialDegree`. Les fonctions individuelles (`generateLinearEquationSteps`, `generateQuadraticEquationSteps`) restent exportées pour rétrocompat (le `correction-generator` linear-equation n'est pas modifié).

### Q3 — 3 cas spéciaux pédagogiques + standard

- `ax² + c = 0` (b=0) : isolate-square + extract-square-root.
- `ax² + bx = 0` (c=0) : factor-common-x + zero-product.
- `(ax+b)(cx+d) = 0` (déjà factorisé) : zero-product direct.
- Cas standard : identify-coefficients → compute-discriminant → discriminant-{positive|zero|negative} → apply-quadratic-formula → simplify-solutions → read-solutions.

### Q4 — Discriminant compact

`Δ = b² − 4ac = 5² − 4·1·6 = 25 − 24 = 1` en une cellule LaTeX. Décomposition (sub-steps `compute-b-squared`, `compute-4ac`, `subtract`) reste un raffinement V1.1 si demandé.

### Q5 — Une seule étape `apply-quadratic-formula`

`x₁ = (−b − √Δ)/(2a) et x₂ = (−b + √Δ)/(2a)` produits ensemble. La symétrie ± est l'idée centrale.

### Q6 — 7 catégories de démos

`standard-positif`, `standard-double`, `standard-negatif`, `b-zero`, `c-zero`, `factorise`, `non-standard-form`. ~20 cas total.

### Q7 — `kind: 'quadratic-equation'`

Cohérence avec `'linear-equation'` existant. Si cubic/quartic plus tard, leur `kind` dédié sera ajouté.

### Q8 — Throw `PedagogicalQuadraticNotImplemented`

Classe d'erreur dédiée exportée depuis `quadratic.ts` ; catch dans `correction-generator.ts` → fallback Mode A.

### Q9 — ~120 tests / ~3500 LOC cible

~80 pipeline + ~20 renderer + ~20 démos snapshot + ~5 intégration Mode B + ~10 dispatcher.

### Hypothèses implicites figées

- `QuadraticSchoolLevel = Exclude<SchoolLevel, 'primaire' | 'college'>` — niveaux refusés au type-level + à l'exécution dans le renderer (`assertSupportedLevel`).
- Helpers communs (`canon`, `canonEquation`, `addToBothSides`, `divideBothSides`, `makeStep`, `renumberSteps`) refacto vers `pedagogical-solve/_helpers.ts` partagé entre linear et quadratic — Phase 2.
- Export de `extractQuadraticCoefficients` depuis `solve/solvers/quadratic.ts` (privée actuellement) — Phase 2.
- 1 fixture end-to-end Mode B : `x² − 5x + 6 = 0` (Tle spécialité).
- Page debug Mode B : 5e carte ajoutée.

## Fichiers livrés (Phase 1)

### Module `pedagogical-solve/`

- `types.ts` — extension `EquationOperation` :
  - `identify-equation` élargi à `equationType: 'linear' | 'quadratic'`
  - 18 nouveaux kinds quadratique (cf. liste Phase 1 du prompt)
  - Ajout `QuadraticSchoolLevel`, `QuadraticEquationStepsOptions`, `QuadraticGenerationStrategy`, `STRATEGIES_QUADRATIC`
  - JSDoc enrichi avec `@see` cross-references sur les `recognize-*` kinds
  - Champ renommé : `solve-each-factor.solutions` → `solve-each-factor.pairs` (cohérence de shape avec les autres `solutions: readonly MathNode[]`)
- `linear-renderer.ts` — adaptations pour cohabiter avec l'union élargie :
  - Helper `identifyEquationTitle` partagé qui throw quand `equationType !== 'linear'` (évite mis-labeling silencieux d'une équation quadratique)
  - Refacto du switch final de `formatTransformationLines` en `switch` avec `default: return null` (élimine la duplication guard + switch)

### Tests

- `__tests__/quadratic-types.test.ts` — 29 tests d'isolation des types (compile-only `@ts-expect-error` + smoke runtime, kind-count sentinel à 30)

### Régression

- 0 régression sur les 50 tests linear / linear-renderer / linear-demo / linear-edge-cases.

## Adjustments mineurs vs prompt strict

Documentés ici pour transparence (validés en code review) :

1. **`apply-quadratic-formula.solutions`** — ajout du champ `solutions: readonly MathNode[]` (raw) non listé strictement dans le prompt mais nécessaire pour que le renderer reste self-contained (pas de cross-step lookup).
2. **`simplify-solutions.rawSolutions`** — ajout symétrique pour le pairing raw/simplified ; le renderer affichera la transition `raw → simplified`.
3. **`solve-each-factor.pairs`** — renommé depuis `solutions` (le prompt utilisait `solutions`) suite à la code review pour éviter la confusion de shape avec les autres champs `solutions: readonly MathNode[]`.
4. **`emitSeparateDiscriminantSign`** — flag de stratégie qui capture la décision Phase 0 « compute-discriminant + signe en 1 step au supérieur » ; lycée=true, supérieur=false.

## Code review (Phase 1)

`code-reviewer` (Opus) — 5 retours appliqués :

1. ✅ Rename `solve-each-factor.solutions` → `pairs`.
2. ✅ Guard `identify-equation` du linear-renderer contre `equationType: 'quadratic'` (throw).
3. ✅ `@see` cross-refs sur les 3 `recognize-*` kinds.
4. ✅ Test `case: 'double'` ajouté pour `apply-quadratic-formula`.
5. ✅ Refacto guard+switch de `formatTransformationLines` en `switch` avec `default: return null`.

Aucun blocker, 0 nouvelle erreur TS, 0 régression linear.

## Tests cumulés (Phase 1+2)

| Fichier                               | Tests   |
| ------------------------------------- | ------- |
| `__tests__/quadratic-types.test.ts`   | 29      |
| `__tests__/quadratic.test.ts`         | 57      |
| `__tests__/linear.test.ts` (existant) | 16      |
| `__tests__/linear-renderer.test.ts`   | 13      |
| `__tests__/linear-demo.test.ts`       | 21      |
| **Total pedagogical-solve**           | **136** |

## Fichiers livrés (Phase 2)

### Module `pedagogical-solve/`

- `_helpers.ts` (NEW) — helpers partagés : `canon`, `canonEquation`, `addToBothSides`, `divideBothSides`, `isOne`, `isZero`, `makeStep`, `renumberSteps`. Refacto sans changement de comportement.
- `linear.ts` (MODIFIED) — imports désormais depuis `_helpers.ts` ; helpers locaux supprimés ; `splitSide`, `extractCoefficientOfX`, `chooseAddOrSubtract` gardés en local (linear-spécifiques).
- `quadratic.ts` (NEW, ~660 LOC) — pipeline pédagogique principal :
  - `class PedagogicalQuadraticNotImplemented extends Error` (exporté)
  - `detectCase()` — dispatch entre standard, b=0, c=0, factored ; throw NotImplemented si paramétrique
  - 9 atomic step builders + 4 case builders
  - `extractLinearCoefficients()` + `solveLinearFactor()` réutilisent `extractQuadraticCoefficients`
  - Public : `generateQuadraticEquationSteps(equation, options)`

### Module `solve/` (1 changement)

- `solve/solvers/quadratic.ts` (MODIFIED) — `extractQuadraticCoefficients` exportée + type de retour annoté `readonly`. 0 régression sur 454 tests solve+pedagogical-solve.

## Code review (Phase 2)

`code-reviewer` (Opus) — 3 retours appliqués :

1. ✅ Extraction de `extractLinearCoefficients(factor, variable): { alpha, beta } | null` pour rendre explicite la sémantique linéaire (évite la confusion `coeffs.b → α`).
2. ✅ `solveLinearFactor` throw `Error` (au lieu de `PedagogicalQuadraticNotImplemented`) pour les cas pré-conditionnellement impossibles (degré 1 garanti par `tryDetectFactored` upstream).
3. ✅ Comment explicite sur le fallback `'positive'` quand `numericValue` est null — V1 enforce coefficients numériques donc unreachable, mais documenté comme TODO V2.

Suggestion (mineure) reportée :

- `JSON.stringify` pour comparer raw vs simplified : fragile par design, à remplacer par un `nodesEqual()` structurel quand V2 ajoutera des coefficients symboliques. Acceptable V1.

## Limitations connues V1 (post-livraison)

- Coefficients **paramétriques** (ex. `mx² + 2mx + 1 = 0`) → throw `NotImplemented`, fallback Mode A.
- **Discussion sur paramètre** (Δ = 4m² − 4m → discuter du signe) → V2.
- **Équations bicarrées** `ax⁴ + bx² + c = 0` → V2 (gérées algorithmiquement par `solvers/quartic.ts`).
- **Cubiques / quartiques** → hors scope.
- **Inéquations du 2nd degré** → hors scope.
- **Discriminant décomposé** (sub-steps b², 4ac, soustraction) → raffinement V1.1 si demandé.

## Documents de référence

- `docs/wip/quadratic-stepper-prompt.md` — source du plan, décisions Phase 0
- `docs/wip/pedagogical-steppers-mvp-progress.md` — vue d'ensemble (à mettre à jour Phase 7)
- `docs/wip/correction-integration-progress.md` — architecture Mode B (à mettre à jour Phase 7)
- `docs/wip/differentiation-stepper-progress.md` — modèle de doc de progression cloné ici
