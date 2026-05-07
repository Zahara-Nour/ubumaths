# Pedagogical Steppers MVP — Progress

> Source: `docs/wip/pedagogical-steppers-mvp-prompt.md`
> Started: 2026-05-04

## Phase 0 — Spécification TDD (terminée)

### Décisions architecturales validées

**Comportements A-G** : tous validés tels que proposés.

**Q1 — Nommage** : `rewrite(node, config)` (court, sans ambiguïté car co-localisé dans son module).

**Q2 — Emplacement des fichiers** : `common/` pour l'infrastructure transversale.

- `common/step-renderer-base.ts` (types renderer)
- `common/technical-renderer.ts` (renderer générique)
- `common/rewriting-engine.ts` (moteur)
- `solve/pedagogical-renderer.ts` (spécifique au domaine solve)
- `pedagogical-evaluate/types.ts` (type stubs phase 5+)

**Q3 — TechnicalRenderer** : générique unique via dump des champs `BaseStep` + reflection sur les champs spécifiques.

**Q4 — Format de sortie** : `'structured' | 'text'` au MVP. `'markdown'` / `'latex'` ajoutés à la demande.

**Q5 — Démo** : `solve/__tests__/dual-rendering-demo.test.ts`.

**Q6 — Scope arithmetic-steps** :

- (a) Limité à `evaluate(exact)` + suppression doublon `evaluateNumeric`. PAS d'unification recorder/renderer.
- (b) Changements float→exact acceptables. Tests existants ajustés au besoin.

### Confirmations process

- 4 commits intermédiaires (1 par phase)
- `code-reviewer` agent après chaque phase
- Quality checks (eslint + check:incremental) à la toute fin uniquement
- Modèle Opus pour les sous-agents

### Observations issues de la lecture du code

- `SchoolLevel` actuellement défini dans `step-generator/types.ts:12` — **canonisation prévue** dans `common/step-renderer-base.ts`, re-export depuis `step-generator/types.ts` pour préserver les imports existants (arithmetic-steps.ts, components/calculator/, etc.).
- Conflit de nom détecté : `lib/components/GradeBadgeSelector.svelte` utilise un type `SchoolLevel` distinct (valeurs anglaises `'primary'|'middle'|'high'`). Aucun croisement avec celui du moteur math — laissé intact.
- `arithmetic-steps.ts` a déjà des descriptions adaptées par `SchoolLevel` (lignes 27-64). Le refactor MVP touche uniquement la partie calcul (`evaluateNumeric` → `evaluate(exact)`), pas la partie pédagogique.

---

## Phase 1 — Infrastructure (terminée ✓)

### Sous-tâches

- [x] 1.1 `common/step-renderer-base.ts` + canonisation `SchoolLevel`
- [x] 1.2 `common/technical-renderer.ts` + tests (13/13 ✓)
- [x] 1.3 `common/rewriting-engine.ts` + tests d'isolation (18/18 ✓)
- [x] 1.4 Refactor `simplify.ts` (API publique inchangée, 92/92 simplify tests ✓, 0 régression sur 11907 mathAST tests)
- [x] 1.5 Type stubs `pedagogical-evaluate/types.ts`
- [x] `code-reviewer` agent (Opus) — appliqué les fixes : doc iterations, doc bestCost sentinel, doc RewriteStep.label, doc bridge phase, +2 tests (cost tie-break, onStep ordering)
- [x] commit Phase 1 — `828668976` `feat(mathAST): rewriting engine + step renderer infrastructure (Phase 1 MVP)` (11 fichiers, +2075 / -142)

### Fichiers créés / modifiés

**Créés :**

- `src/lib/mathAST/common/step-renderer-base.ts` (~140 LOC, types only)
- `src/lib/mathAST/common/technical-renderer.ts` (~95 LOC, `GenericTechnicalRenderer` class)
- `src/lib/mathAST/common/rewriting-engine.ts` (~250 LOC, `rewrite()` engine)
- `src/lib/mathAST/common/__tests__/technical-renderer.test.ts` (13 tests)
- `src/lib/mathAST/common/__tests__/rewriting-engine.test.ts` (18 tests)
- `src/lib/mathAST/pedagogical-evaluate/types.ts` (~110 LOC, types only)

**Modifiés :**

- `src/lib/mathAST/common/index.ts` (re-exports types only — voir note ci-dessous)
- `src/lib/mathAST/step-generator/types.ts` (re-export `SchoolLevel` depuis `common/step-renderer-base`)
- `src/lib/mathAST/simplify/simplify.ts` (refactor : thin wrapper autour de `rewrite()`, API publique inchangée)

### Décisions de design issues de Phase 1

**Engine API : `onStep` callback plutôt que `recorder` injecté.**
Le prompt suggérait `recorder?: StepRecorder<TStep>` dans `EngineConfig`. J'ai préféré un callback `onStep(step)` car le recorder a des sémantiques domaine-spécifiques (`setPhase`, lookup de descriptions FR) que l'engine ne peut pas inférer. Le wrapper (`simplify`) bridge le callback vers le recorder. Cette approche est aussi plus flexible pour les futurs renderers qui n'utiliseraient pas de recorder.

**Engine assigne toujours `current = after` après pre/post-process.**
`nodesEqual` est structurelle et ignore les métadonnées (`displayStyle`, etc.). Si pre-process produit un node structurellement égal mais sémantiquement enrichi (e.g. `divide(x, y)` sans displayStyle → `divide(x, y, 'fraction')`), il faut MAJ `current` pour propager la canonisation. Le `onStep` reste gaté sur `!nodesEqual` (pas de step spurious).

**`technical-renderer.ts` et `rewriting-engine.ts` PAS re-exportés depuis `common/index.ts`.**
Ces fichiers ont des imports runtime (`pattern/rule`, `pattern/match`, `latex-generator`). Si re-exportés depuis `common/index.ts`, ils sont chargés transitivement par tout module qui importe `from '../common'` (limits/, domain/), ce qui change l'ordre de chargement et casse 50 tests downstream (continuity, range, differentiability) via un problème d'initialisation subtil que je n'ai pas réussi à trouver précisément (probablement dépendance circulaire latente activée par l'ordre de chargement).

**Fix retenu :** seuls les TYPES (no-runtime) sont re-exportés depuis `common/index.ts`. Consommateurs importent directement :

```typescript
import { GenericTechnicalRenderer } from '$lib/mathAST/common/technical-renderer';
import { rewrite } from '$lib/mathAST/common/rewriting-engine';
```

Note ajoutée dans `common/index.ts` pour expliquer cette restriction.

### Validation Phase 1

- [x] Engine isolé : 18/18 tests passent
- [x] Technical renderer : 13/13 tests passent
- [x] Simplify : 92/92 tests passent (3 skipped baseline)
- [x] Continuity (était cassée pendant développement) : 30/30 passent
- [x] Suite complète mathAST : **11907/11928 passent** (18 skipped + 3 todo, 0 régression)
- [x] Doc de progression écrite

---

## Phase 2 — Renderer pédagogique solve (terminée ✓)

### Fichiers créés

- `src/lib/mathAST/solve/pedagogical-renderer.ts` (~190 LOC, `SolvePedagogicalRenderer` classe)
- `src/lib/mathAST/solve/__tests__/pedagogical-renderer.test.ts` (17 tests, tous ✓)

### Couverture

- **Linéaire (4 niveaux)** : `identify-linear`, `subtract-constant`, `add-constant`, `divide-coefficient`, `multiply-coefficient`, `isolate-variable`
- **Quadratique (college, lycee, superieur)** : `identify-quadratic`, `identify-coefficients`, `compute-discriminant`, `discriminant-{positive,zero,negative}`, `apply-quadratic-formula`, `simplify-solution`
- **Fallback** : `TITLES[level][rule]` → `TITLES.lycee[rule]` → `step.description`

### Validation

- 17/17 tests renderer pédagogique
- 11926/11947 tests mathAST (+17 du renderer Phase 2, 0 régression)

## Phase 3 — Refactor arithmetic-steps (terminée ✓)

### Fichiers modifiés

- `src/lib/mathAST/step-generator/arithmetic-steps.ts` (442 → 386 LOC, -56 LOC après suppression du doublon `evaluateNumeric` + `formatNumber`)
- `src/lib/mathAST/step-generator/__tests__/step-generator.test.ts` (+3 tests précision exacte ; 1 test ajusté pour le nouveau comportement float→exact)

### Changements

- **Suppression** : `evaluateNumeric()` (~70 LOC, doublon de `evaluate()`) et `formatNumber()` (~6 LOC, redondant avec `toLatex()`).
- **Ajout** : helper local `evaluateToNode(node)` qui appelle `evaluate(node, { mode: 'exact' })` et retourne un `MathNode` ou `null`.
- **Format de sortie** : LaTeX via `toLatex(node)` au lieu de strings manuelles. Cas où `evaluate` ne donne pas de valeur exacte : on skippe l'étape (comme avant).
- **API publique inchangée** : `generateStepsForNode(node, level, startIndex)` retourne toujours `{ steps: CalculationStep[]; nextIndex: number }`.

### Conséquences sémantiques (cf. prompt 3.3)

Les sous-calculs sont maintenant en arithmétique rationnelle exacte :

- `1/3 + 1/6` → `\dfrac{1}{2}` (au lieu de `0.5` en float)
- `\sqrt{8}` → `2\sqrt{2}` (au lieu de `2.828...`)
- `3.14 * 2` → `\dfrac{157}{25}` (au lieu de `6.28` ; test ajusté)
- Grands entiers (`2^30 + 1`) restent exacts.

### Validation

- 25/25 tests step-generator (+3 nouveaux pour précision exacte, 1 ajusté)
- 11929/11950 tests mathAST (+3 du Phase 3, 0 régression)

## Phase 4 — Démo end-to-end + README (terminée ✓)

### Fichiers créés

- `src/lib/mathAST/solve/__tests__/dual-rendering-demo.test.ts` — résout `2x + 3 = 7` et imprime côte-à-côte les 4 rendus (technique, college, lycee, primaire) via `console.log`. Assertions vérifient que les rendus diffèrent et que verbosity gate les explanations.
- `src/lib/mathAST/common/REWRITING.md` — README court : pattern dual rendering, structure des fichiers, exemple de moteur, comment ajouter un renderer pédagogique pour un nouveau domaine, note sur le workaround load-order.

### Validation

- 1/1 demo test passe avec sortie visible
- 11930/11951 tests mathAST (+1 du demo, 0 régression)

## Phase 5 — Quality checks + commit final (terminée ✓)

### Quality checks

- [x] **ESLint** sur les 14 fichiers créés/modifiés : **0 erreur, 0 warning**
- [x] **`pnpm check:incremental`** (TypeScript + Svelte) : `✓` (0 nouvelle erreur ; les 9 erreurs préexistantes dans `slides/demo` et `extern/` sont filtrées par le script — comportement attendu)
- [x] Pas de fichiers `.svelte` modifiés → svelte-autofixer non applicable

### Tests régression finaux

- 11930/11951 tests mathAST passent (18 skipped, 3 todo, 0 fail) — voir flaky perf test improperIntegrate qui passe au 2e run.

---

## Récapitulatif MVP terminé

### Commits

1. `828668976` `feat(mathAST): rewriting engine + step renderer infrastructure (Phase 1 MVP)` (11 fichiers, +2075 / -142)
2. `7a6b8a232` `feat(mathAST/solve): renderer pédagogique adapté au SchoolLevel (Phase 2 MVP)` (3 fichiers, +444 / -2)
3. `252434494` `refactor(mathAST/step-generator): delegate arithmetic to evaluate(exact) (Phase 3 MVP)` (3 fichiers, +127 / -120)
4. `1b8cb8a28` `docs(mathAST): demo end-to-end dual rendering + README (Phase 4 MVP)` (3 fichiers, +220 / -1)

Total : ~2400 LOC ajoutées, ~265 retirées, 4 commits intermédiaires + ce commit final (Phase 5 doc only).

### Hors scope MVP — état au 2026-05-05

#### ✅ Livrés depuis dans des prompts/sessions ultérieurs

- **Pipeline pédagogique complet pour arithmétique** (regroupement, fractions, radicaux, notation scientifique) → livré, voir `pedagogical-arithmetic-progress.md`
- **Implémentation effective de `PedagogicalTarget`** (extraction depuis instance/blank) → livré dans le même prompt arithmétique (Phase 2b)
- **Reconnaissance d'unités SI dérivées** (Hz, N, J, W, etc.) — point Poincaré → livré, voir `units-derived-progress.md`
- **Unités impériales + affines** (Celsius/Fahrenheit, foot, pound, mile, gallon) → livré, voir `units-imperial-affine-progress.md`
- **Unités d'aire** (a, ha, acre) — bonus débloqué par dérivées → livré, voir `units-area-progress.md`
- **Intégration aux corrections de questions** (`QuestionCorrection.generatedSteps` Mode B) → livré, voir `correction-integration-progress.md`. Inclut :
  - Schéma type `GeneratedSteps` discriminé (`kind: 'arithmetic' | 'linear-equation' | 'differentiate' | 'quadratic-equation' | 'linear-inequality' | 'quadratic-inequality' | 'rational-inequality' | 'integrate' | 'simplify' | 'arithmetic-from-blank'`) — **10 kinds**
  - `generateCorrection()` avec auto-call dans `generateInstance()` (early-return strict si absent)
  - Composant Svelte `<GeneratedStepsCorrection>` + extension `CorrectionCard.svelte`
  - Mapping `gradeLevelToSchoolLevel` (CP-CM2 → primaire, 6-3 → college, 2-T → lycee)
  - Page debug `/dashboard/admin/debug/correction-mode-b` pour validation visuelle (16 fixtures : arithmetic + linear-equation + differentiate × 2 + quadratic-equation + linear-inequality × 2 + quadratic-inequality × 2 + rational-inequality × 2 + integrate × 2 + simplify × 2 + arithmetic-from-blank ; la `rationalInequalityMultiFracDemo` V2 est en snapshot test mais pas affichée)
- **Stepper pédagogique pour équations du second degré** (`kind: 'quadratic-equation'`) → livré V1 + V1.1, voir `quadratic-stepper-progress.md`. Inclut :

  - Pipeline `pedagogical-solve/quadratic.ts` couvrant 4 cas (standard Δ>0/=0/<0, b=0, c=0, factorisé) + standardisation auto vers `… = 0`
  - Renderer `quadratic-renderer.ts` lycée + supérieur avec TITLES, EXPLANATIONS, formatExpressionLatex per kind
  - Dispatcher unifié `pedagogical-solve/index.ts` (`generateEquationSteps` selon degré, bumps primaire→college pour linéaire et primaire/college→lycee pour quadratique)
  - Helpers partagés `_helpers.ts` (canon, addToBothSides, makeStep, etc.) refacto entre linear et quadratic
  - Class `PedagogicalQuadraticNotImplemented` pour cas hors scope V1 (paramétriques)
  - 7 catégories de démos snapshot + CLI `scripts/pedagogical-quadratic-demo.ts` (avec pretty-print LaTeX → ASCII/Unicode + ANSI bold-blue sur TTY, flag `--latex` pour mode raw)
  - Mode B `kind: 'quadratic-equation'` intégré (types/Zod/correction-generator/fixture/page debug 5e carte)
  - 9 commits : 7 V1 + 2 V1.1 — `593a82204`, `40789a138`, `910e4e642`, `bd333851a`, `0a52989d6`, `92580f0b9`, `023476a5b` (V1) puis `8252a747d`, `23acc3eed` (V1.1)
  - 245 tests spécifiques au feature (29 types + 66 pipeline avec V1.1 + 29 renderer + 19 dispatcher + 23 demos + 30 correction-generator + 8 generated-steps-demo + 41 ajustements/V1.1)
  - **V1.1 raffinements livrés** : `nodesEqual` structurel (B), `factor-gcd` nouveau kind (C, count 30 → 31), `smartNegate` collapse `--N` (D), pretty-print CLI, fix `formatZeroProduct` `(A) · (B) = 0`
  - Limitations V1 : coefficients paramétriques (`mx²+…`), équations bicarrées, cubiques/quartiques (hors scope, throw NotImplemented → fallback Mode A)
  - **V2 prompt rédigé** : `docs/wip/quadratic-stepper-v2-prompt.md` (paramétriques + discussion sur paramètre, ~14-16h tunnel)

- **Stepper pédagogique pour différentiation** (`kind: 'differentiate'`) → livré, voir `differentiation-stepper-progress.md`. Inclut :

  - Pipeline parallèle `pedagogical-differentiation/` (Option 2 retenue plutôt que dual renderer sur `differentiate.ts`)
  - 34 règles couvertes (sum, product, quotient, chain, sin/cos/tan, exp, ln, puissances entières/rationnelles, etc.)
  - 13 phases V1 + 3 raffinements V1.1 (constant folding, `f/c` → linear-coefficient, notation Leibniz)
  - 12 commits : `f9fb1a3a0`, `b1a33b567`, `98ddcc50e`, `ac4e2b2f8`, `0659a0afa`, `fbfd92712`, `0be5301c7`, `975b7bf14`, `a9fc2bd2f`, `ed44b60d1`, `c11d7a3ce`, `fb173d762`
  - 185 tests verts spécifiques au feature (155 module + 23 correction-generator + 7 generated-steps-demo)
  - Mode B `kind: 'differentiate'` intégré
  - Bugs critiques corrigés : `\sin^2(x)` (FunctionNode.power) + `(+x)`/`((x))` (transparent wrappers)
  - V1.1 : `(2x+3x)' → 5` (fold), `(x²/5)' → 2x/5` (linear-coefficient), option `notation: 'leibniz'` sur le renderer

- **Solveur algorithmique d'inéquations** (palier 1, prérequis des steppers inéquations) → livré, voir `solve-inequality-progress.md`. Inclut :

  - API `solveInequality(relation, options?)` exposée depuis `$lib/mathAST/solve` ; bornes du domaine en MathNode symbolique exact (radicaux, fractions, π preservés)
  - Wrapper sur `analyzeSign` du module `sign/` ; opérateurs supportés `< > <= >= !=` ; rejet `=` ; rejet coefs paramétriques (variables libres ≠ inconnue) → `InequalityNotSolvable`
  - Statuts `complete | partial | no-solution | all-real | empty-domain` ; carries `SignAnalysisResult` brut pour debug et palier 2
  - 25/25 tests verts (test 14 `e^x − 1 > 0` ré-activé après les 3 fix upstream)
  - Commits : `4e335a233`, `53a713a53`
  - **3 fix upstream débloqués par ce travail** :
    - `1cf5690e9` `sign/splitDomainAtZeros` partitionne nativement aux excludedPoints (workaround `expandExcludedPoints` supprimé)
    - `16c417e79` solveur transcendantal reconnaît `e^x` (parsé `superscript{base:var('e')}` au lieu de `function('exp')`) ; 3 couches : classifier + matcher + `promoteEulerInRelation`
    - `218e2ad9d` `sign/MAX_SAMPLE_BOUND` 1e6 → 100 (évite overflow `e^1e6 → ∞` et underflow rationnel `1/(1e6·999999) < tolerance`)
  - **Bonus solveur rationnel** (`79783e215`) : `solve/rational.ts` exploite `normalize` → `P(x)/Q(x)` ; résout P=0 puis filtre racines étrangères annulant Q ; débloque `computeRange(sqrt(x²+1), [-2, 2])` qui retourne maintenant `[1, √5]` (point critique x=0 trouvé)

- **Stepper pédagogique pour inéquations linéaires** (palier 2a, `kind: 'linear-inequality'`) → livré, voir `pedagogical-inequality-progress.md`. Inclut :

  - Pipeline `pedagogical-solve/linear-inequality.ts` + dispatcher `generateInequalitySteps` (route degré 0/1 → linear, ≥2 → throw `UnsupportedInequalityDegree`)
  - Helper `divideBothSidesWithFlip` + champ `flipOperator?` sur `divide-both-sides`/`multiply-both-sides`/`add-both-sides` ; retournement explicite `< → >`, `≥ → ≤` etc. quand divisor < 0 (op `!=` jamais retournée)
  - Op `inequality-conclude-truth` pour cas constant (a=0) → `S = ℝ` ou contradiction
  - Renderer V2 polyvalent (équation/inéquation, pas de duplication) : `isInequalityStep`, `flipNote`, `divideExplanation`/`multiplyExplanation` adaptés, `identifyEquationTitle` retourne « Inéquation du premier degré »
  - Bug fix renderer aligned-block (`a974787d7`) : split `relBefore`/`relAfter` ; sans ça, `-x < 3` divisé par −1 affichait `x < -3` au lieu de `x > -3`
  - CLI `scripts/pedagogical-inequality-demo.ts` (custom + ANSI bold-blue + flag `--latex`/`--both`)
  - 13 commits : `fbecbaa05`, `fbe49b80f`, `a974787d7`, `533aa6259`, `02522eebb`, `1cf5690e9`, `184af30a9`, `5bc2d55a2`, `16c417e79`, `e7e2df0df`, `218e2ad9d`, `f9472dfd3`, `79783e215`
  - Tests : 22 pipeline + 28 renderer (V2 + 5 régressions flip) + 2 fixtures Mode B snapshot
  - 2 fixtures Mode B : `linearInequalityFlipDemo` (`−2x ≥ 6`) + `linearInequalityTwoSidesDemo` (`2x+1 < x+5`)

- **Stepper pédagogique pour inéquations quadratiques** (palier 2b, `kind: 'quadratic-inequality'`) → livré, voir `pedagogical-quadratic-inequality-progress.md`. Inclut :

  - Pipeline `pedagogical-solve/quadratic-inequality.ts` (~340 LOC) ; stratégie discriminant Δ + tableau de signes ; 6 sous-cas (signe(a) × signe(Δ))
  - Dispatcher étendu : `generateInequalitySteps` route degré 2 → quadratic ; auto-délégation linear quand a=0
  - Renderer V2 polyvalent étendu : dual-form TITLES + EXPLANATIONS, sign-table LaTeX, conclusion render
  - 2 fixes correctness post code-review : `\setminus` LaTeX rendering (`ℝ \ {2}` → `\mathbb{R} \setminus \{2\}`) + tri racines irrationnelles via full `computeNumericValue` (lite version retournait `MAX_SAFE_INTEGER` pour `(1+√5)/2`)
  - CLI `scripts/pedagogical-quadratic-inequality-demo.ts` (6 catégories de démos)
  - Commits : `f32893cff`, `86952a9c1`
  - Tests : +50 (31 inequality + 19 renderer V2) ; total pedagogical-solve : 317 tests verts
  - 2 fixtures Mode B : `quadraticInequalityClassicDemo` + `quadraticInequalityNegativeADemo`

- **Fast paths quadratiques** (palier 2c) → livré, voir `pedagogical-quadratic-inequality-2c-progress.md`. Inclut :

  - 3 sous-pipelines fast path qui évitent Δ : `b = 0` (isolate-square), `c = 0` (factor-x), forme déjà factorisée (recognize-factored)
  - Nouvelle op kind `inequality-conclude-from-isolated-square` pour le cas `b = 0` (conclusion directe sans tableau de signes)
  - Bug critique trouvé en code review : `alignedTransformation` du quadratic-renderer utilisait `step.before.relation` pour les deux lignes du bloc aligné, faux quand `a < 0` (operator flip). Même fix que palier 2a (`a974787d7`)
  - Commit : `d010fb263`
  - Tests : +14 (13 spec + 1 flip regression) ; total pedagogical-solve : 317 → 331

- **Stepper pédagogique pour intégration** (`kind: 'integrate'`) → livré V1+V1.1+V2, voir `integration-stepper-progress.md`. Inclut :

  - Module `pedagogical-integration/` (~3500 LOC) parallèle à `integration/integrate.ts` (intact). Décision Option 2 (clone architectural de `pedagogical-differentiation/`).
  - **V1** : 24 rules pédagogiques : `apply-power-rule`, `apply-constant-rule`, `apply-known-primitive` (e^x/sin/cos/tan/1/x), 5 formes composées (`apply-composite-{exp,ln,sin,cos,power}`), trio FTC (`apply-fundamental-theorem`, `substitute-bounds`, `simplify-bounds-result`), `apply-linearity-sum`, `extract-constant`, IPP simple (`identify-parts`, `choose-u-dv`, `apply-parts-formula`), `add-constant`, `simplify-result`, et `identify-{integrand,definite-integral}` + 4 rules u-substitution réservées
  - Détecteurs de formes composées (`tryDetectCompositeExp/Ln/Sin/Cos/Power`) gérant les formes « bare » (`sin(2x)`, `e^(ax+b)`) via rebalancing implicite `1/u'` quand u' est constant
  - Réutilise `differentiate()` (algo) pour calculer u'(x), `findProportionalityConstant()` (`integration/patterns.ts`) pour la détection, `normalize/denormalize` (`normal/`) pour folder `x · (1/x) → 1` dans IPP
  - Pipeline IPP simple (LIATE-style) : polynôme × {ln, exp, sin, cos}, ln(x) seul
  - Niveaux : `lycee` + `superieur` (type `IntegrationSchoolLevel = Exclude<SchoolLevel, 'primaire' | 'college'>` analogue à `QuadraticSchoolLevel`). **Q3 utilisateur** : IPP activée AUSSI au lycée (Tle spé maths 2025).
  - 7 catégories de démos × 26 cas snapshot (usuelles, polynomial, linearite, forme-composee-ln, forme-composee-exp, definie, parts-simple)
  - CLI standalone `scripts/pedagogical-integration-demo.ts` avec ANSI bold-blue + cleanup LaTeX résiduel
  - Mode B : 6 nouveaux tests `correction-generator.test.ts` + 2 fixtures end-to-end (`integrateIndefiniteDemo` + `integrateDefiniteDemo`) + page debug 11→13 fixtures
  - **V1.1** : IPP cyclique (`∫e^(αx)·sin(βx) dx` — cas iconique Tle spé via résolution algébrique) → +1 rule `apply-cyclic-ipp` ; arctan/arcsin unitaires (`1/(1+x²)`, `1/√(1-x²)`) sup uniquement ; tabular IPP audit (∫xⁿ·eˣ jusqu'à n=5) via `maxRecursionDepth` 5→10
  - **V2** : partial-fractions simples (`∫P(x)/Q(x) dx` Q quadratique Δ>0 racines rationnelles distinctes, deg(P)<2) via méthode des racines → +2 rules `decompose-rational` + `apply-partial-fractions` ; arctan/arcsin général `1/(c+x²)` → `(1/a)·arctan(x/a)` avec `a=√c` (sup uniquement)
  - Total cumulé : 137 tests module + 8 tests questions = **145 tests spécifiques au feature** (V1: 110 + V1.1: 14 + V2: 13)
  - 27 rules pédagogiques au final
  - Commits : `0a4751a5d` (Phase 1 types), `e576400da` (Phase 2 pipeline), `0fe7ca6c0` (Phase 3 renderer), `fd6a6381b` (Phase 4 démos+CLI), `4a3bf5e57` (Phase 5 Mode B), `76824564e` (Phase 6 docs), `fdef883ed` (V1.1), `d5445601e` (V2)

- **Stepper pédagogique pour inéquations rationnelles** (palier 3, `kind: 'rational-inequality'`) → livré V1+V1.1+V2, voir `pedagogical-rational-inequality-progress.md`. Inclut :

  - Pipeline `pedagogical-solve/rational-inequality.ts` (~430 LOC) pour `P(x)/Q(x) ⊻ 0` selon la méthode standard française : domaine de définition, racines de P, zéros de Q, tableau de signes combiné 4 lignes (`x | P | Q | P/Q` avec `||` aux zéros de Q), lecture de S
  - 5 nouvelles op kinds : `identify-rational`, `rational-domain-restriction`, `rational-locate-roots`, `rational-sign-table`, `inequality-conclude-rational`
  - Dispatcher étendu : route vers le pipeline rationnel quand `getPolynomialDegree` retourne null ET `collectDenominators` non-vide
  - **V1.1 polish** : `describeDomain` promu dans `_helpers.ts` (partagé quadratic + rationnel) ; double roots supportées dans le tableau de signes (multiplicity tracking)
  - **V2 multi-fractions** : nouvelle op kind `combine-fractions` pour `1/x + 1/(x-1) < 0`, `x < 1/(x-3)`, `x + 1/(x-1) < 0` ; étape « réduction au même dénominateur » avec affichage 3-ligne (original sum / adjusted fractions / combined)
  - **Bug palier 1 critique fixé** : `determineProductSign` recursait à l'infini sur `opposite(N)` (cause : `factors.map` exécuté avant le check `length === 1 && isOpposite`) — ex: `-1/x > 0` stack-overflow
  - CLI `scripts/pedagogical-rational-inequality-demo.ts` (7 catégories : simple, constP, quad-num, quad-denom, non-std, noteq, multi-frac)
  - Commits : `ecc8e2eaf` (V1), `73bb9dbc2` (V1.1), `e37195b68` (V2)
  - Tests : V1 +22 → 353, V1.1 +2 → 355, V2 +6 → 361 ; total pedagogical-solve : 331 → 361
  - 3 fixtures Mode B : `rationalInequalitySimpleDemo` + `rationalInequalityQuadDenomDemo` + `rationalInequalityMultiFracDemo` (V2)

- **Stepper pédagogique pour simplification** (`kind: 'simplify'`) → livré 2026-05-06, voir `simplify-stepper-progress.md`. Inclut :

  - Architecture **Option C′** (variante d'Option C — pipeline manuel à la `pedagogical-arithmetic`, réutilise rule sets pattern + normalize StepRecorder, pas de `rewrite()`). Décidée après analyse empirique : `simplify()` actuel produit la mauvaise réponse pédagogique pour 4 cas-test V1 sur 9.
  - Flag `intent` requis (`'factoriser' | 'developper' | 'reduire' | 'auto'`) qui dirige le set de rules actives ; pas de défaut, pas de cost-fixpoint.
  - 4 niveaux scolaires distincts (pas de bump : la simplification est enseignée dès le primaire).
  - 9 catégories pédagogiques + fallback `'autre'` (10 au total via `as const` array + sentinel).
  - Réutilise normalize() pour combine-like-terms / fractions / radicaux / puissances / canonisation polynomiale.
  - Nouvelle rule pédagogique `distribute-binomial-product` pour `(ax+b)(cx+d)` (priority -1 pour laisser passer les identités remarquables d'abord).
  - Renderer 4 niveaux (PRIMAIRE/COLLEGE/LYCEE/SUPERIEUR_TITLES + EXPLANATIONS, fallback chain `level → lycee → step.description`).
  - 9 catégories de démos × 28 cas snapshot + CLI `scripts/pedagogical-simplify-demo.ts` (--latex / --custom + ANSI bold-blue).
  - 6 commits : `8fc5c8f86` (Phase 1 types+intent), `a7fdf91af` (Phase 2 pipeline+normalize bridge+rule binomial+timeoutMs), `bae477451` (Phase 3 renderer+TITLES/EXPLANATIONS), `138f6d99b` (Phase 4 démos+CLI), `8b4c8ce39` (Phase 5 Mode B + 2 fixtures + page debug 13→15).
  - 222 tests verts spécifiques au feature (109 Phase 1 + 47 Phase 2 + 18 Phase 3 + 29 Phase 4 + 19 Phase 5).
  - Mode B `kind: 'simplify'` intégré : 8 → 9 kinds. Catch `PedagogicalSimplifyNotImplemented` (matrices, inéquations, piecewise, logical) → fallback Mode A silencieux.
  - Limitations V1 : binomial × binomial uniquement (pas de trinôme × binôme, pas de cube), hyperboliques exclues (`enableHyperbolic: false` par défaut), sub-steps reportés en V2.
  - Limitation honnête documentée : `reduire` peut développer `(x+1)²` parce que normalize canonise les polynômes (le pattern `expand-sum-squared` n'est pas dans le rule set, mais normalize fait le travail). Acceptable pédagogiquement.

- **Mode B `kind: 'arithmetic-from-blank'`** → livré 2026-05-06, voir `arithmetic-from-blank-progress.md`. Inclut :
  - Élimination de la duplication entre l'expression d'arithmétique présente dans le `statement` Mode B et celle dupliquée dans `correction.generatedSteps.expression`
  - **Décision architecturale élégante** : pas de refacto `InstanceBlank` (B0 du prompt original skip). Le mécanisme `instance.expressions[]` existait déjà avec `{ name, latex, displayLatex?, answerFormat? }` — il manquait juste `value?: string` (optionnel, format custom post-résolution variables). Auteur référence l'expression nommée par son nom (le marker `<<expr:NAME>>` déjà détecté en amont par `assign-blank-indices.ts`).
  - Discriminator étendu 9 → 10 kinds. Page debug 15 → 16 fixtures.
  - 3 fixes code review Opus : (1) Critical `value: string` rendu optionnel (cassait 8 sites de tests), (2) bypass `parseExpression` via `parseCustomSafe` direct (évite re-running `resolveExpression` sur string déjà résolue), (3) `console.warn` retiré pour cohérence avec les 9 autres kinds (silent fallback).
  - 1 commit : `02af36796` (13 fichiers, +602/-8 lignes)
  - +14 tests cumulés (2 generation-fill-blanks + 4 template-schema Zod + 7 correction-generator + 1 snapshot demo) ; 0 régression sur ~600 tests questions
  - 1 fixture Mode B : `arithmeticFromBlankDemo` (CM2, calcul `2+3*4`, statement avec `{{expression1}}`)

#### 🔴 Toujours à faire

**Élargissement de couverture**

- Renderers pédagogiques pour les autres domaines : matrix, domain (intégration livrée 2026-05-06, simplification livrée 2026-05-06, **limits livré 2026-05-07** V1 + V1.1 — Option B pipeline parallèle, 8 stratégies au total : direct-substitution, known-limit, factorisation, rationalisation, infinity-analysis, lhopital (sup), one-sided, squeeze/gendarmes — voir `limits-renderer-progress.md`)
- ~~`kind: 'solve'` algorithmique dans Mode B~~ — **skippé volontairement** par décision utilisateur 2026-05-06 (« hypothèse Option A pure était fragile, et le besoin produit Tle spé / sup pas vital »). À ne pas re-proposer sans nouveau besoin produit.
- **Palier 2d** — coefficients paramétriques quadratiques (`mx² + nx + p ⊻ 0`, m libre) : « discuter selon m » du programme Tle ; gros morceau, multi-sessions, complexité ↑↑ (disjonction de cas dans le tableau de signes)
- **Palier 3 V3** — extensions rationnelles : 3+ fractions, dénominateur quadratique, PGCD polynomial non-trivial, fractions imbriquées
- **TODO indépendant** : `InstanceBlank.expressionName` propagation via `assign-blank-indices.ts` (cf. TODO #1 du prompt arithmétique). Indépendant de `arithmetic-from-blank` qui a trouvé une voie alternative via `instance.expressions[].value`. Reste utile pour rendre le 3e arg `expressionName?` de `extractPedagogicalTarget` redondant.

**Idées Poincaré**

- Modes `SymbolicComputation` (Mode 0, Mode 2) — pour cas pédagogiques avec fonctions paramétriques
- `NormalizeTarget` à 3 niveaux (`Equivalence` / `Analysis` / `Display`)

**UX Mode B (post-V1)**

- Hiérarchie visuelle des étapes (séparation, responsive LaTeX, animation)
- Densité du `\textcolor{blue}{...}` à valider sur différents zooms
- Intégration au flow flashcard à valider sur autres écrans
- Composant interactif (étape par étape avec bouton "Suivant")
- UI éditeur de questions pour créer un `generatedSteps` via formulaire (V1 = écriture JSON manuelle)
- Hybridation Mode A + Mode B (afficher les deux) — V1 : Mode A prioritaire si conflit

**Investigation**

- Root-cause du load-order issue de `common/index.ts` (workaround documenté en place)

**TODOs post-prompt arithmétique** (voir `pedagogical-arithmetic-progress.md` pour détails)

- `expressionName` dans `InstanceBlank` via `assign-blank-indices.ts` (~2-3h, rend le 3e arg de `extractPedagogicalTarget` redondant)
- Variantes fractions sous-niveau (early-college multiplication vs late-college PGCD)
- Radicaux niveau 3 avancé (`rationalize-denominator`, `simplify-square-root-of-square`)
- Decimal mantissas dans `multiplyScientific` / `addScientificSamePower`
- Cohérence `signs: 'strict'` en post-processing (`5 + (-3) → 5 - 3`)

### Critères d'acceptation atteints

- [x] Aucune régression sur les ~12000 tests `mathAST + math + geometry-core/compute`
- [x] API publique de `simplify()` strictement identique
- [x] Démo opérationnelle : test passe et imprime visiblement la différence entre 4 rendus
- [x] `arithmetic-steps.ts` ne contient plus la fonction `evaluateNumeric` (doublon supprimé, 442 → 386 LOC)
- [x] Tests existants `arithmetic-steps` passent (1 test ajusté pour précision exacte)
- [x] 0 erreur ESLint sur les fichiers modifiés
- [x] 0 nouvelle erreur TypeScript dans `pnpm check:incremental`
- [x] Documentation de progression écrite (ce fichier)
- [x] Commits créés via `commit-manager` (Phase 1) et directement (Phases 2, 3, 4) selon complexité

---

## Phase 6 — Pipeline pédagogique dédié + itérations UX (terminée ✓)

> Travaux post-MVP. Le MVP a livré une infrastructure générique (engine, technical renderer, pedagogical renderer du solveur algorithmique). Cette phase ajoute un **pipeline pédagogique séparé** pour les équations linéaires, qui produit des étapes plus fidèles au geste scolaire que la décomposition algorithmique de `solve()`.

### Motivation

Le solveur algorithmique (`solve()`) optimise pour la correction et la généralité ; ses étapes ne correspondent pas toujours à la façon dont un élève écrirait sa résolution (ex : pas de regroupement explicite, transposition implicite, division compacte). On a donc créé un **second pipeline** qui partage l'infrastructure (rewriting engine, renderer base) mais qui a son propre catalogue de règles et son propre rendu.

### Sous-modules livrés

#### `pedagogical-solve/` — pipeline équations linéaires

- `linear.ts` — `generateLinearEquationSteps(equation, { level, includeSubSteps })` : génère un arbre `EquationStep[]` adapté au niveau scolaire (college, lycee, superieur).
  - **College** : étapes décomposées (transposition explicite des constantes, puis division par le coefficient).
  - **Lycée** : transposition + division combinées en une seule étape compacte.
  - **Supérieur** : fusion maximale (`mergeAll`) — provisoire, à raffiner.
- `linear-renderer.ts` — `LinearEquationRenderer` produit titres + LaTeX colorés.
- `types.ts` — `EquationStep` (discriminated union), `EquationOperation`, `LinearSchoolLevel`.
- `__tests__/pedagogical-renderer.test.ts` — couverture des renderers par niveau/verbosity.
- `demo-helpers.ts` — `presentEquation(label, eq)` qui imprime côte-à-côte 2 vues techniques + 6 vues pédagogiques (3 niveaux × 2 verbosités).

#### `pedagogical-solve/demo-equations/` — banque de cas catégorisés (Option C)

7 catégories, ~21 cas, source partagée entre script CLI et tests snapshot :

- `simple.ts` (3 cas) — `2x + 3 = 7`, `x = 5`, `2x = 4`
- `simple-negatifs.ts` (4 cas) — `−x + 3 = 0`, `2x − 5 = 1`, `3x = −6`, `−2x + 4 = 10`
- `simples-fractions.ts` (3 cas) — `x/2 + 1/3 = 1`, `2x/3 = 4/9`, `x/4 + 1/2 = 3/4`
- `simples-fractions-negatifs.ts` (3 cas) — `−x/2 + 1/3 = 0`, `x/2 − 1/3 = 1`, `−x/2 = 1/4`
- `regroupement.ts` (3 cas) — `3x − 2 = −5x + 7`, `5 − 2x = 11 + 3x`, `4x + 1 = 2x + 5`
- `regroupement-fractions.ts` (2 cas) — `x/2 + 1 = x/3 + 2`, `2x/3 − 1/2 = x/4 + 1`
- `edge-cases.ts` (3 cas) — `0·x = 0`, `0·x = 5`, `x = x + 1`
- `index.ts` — `ALL_CATEGORIES: readonly DemoCategory[]` (source unique).

#### Test snapshot + script CLI partageant la source

- `__tests__/linear-demo.test.ts` — `for...of ALL_CATEGORIES` → `describe('snapshot — <cat>')` → `it.each(cases)` → `toMatchSnapshot()`. **21 snapshots** dans `__snapshots__/linear-demo.test.ts.snap`.
- `scripts/pedagogical-solve-demo.ts` — accepte les noms de catégorie en args (`pnpm tsx scripts/pedagogical-solve-demo.ts simple regroupement`), filtre via `Set`, imprime avec en-têtes par catégorie.

### Itérations UX livrées (commits chronologiques)

| Commit      | Apport                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `8e104dbbf` | Canonicalize operand + utilise une règle sign-aware (corrige sign-detection sur opérandes négatifs).                                  |
| `87e080c7a` | Clé de règle distincte `identify-linear-coefficients` (sépare l'identification linéaire de quadratique dans le renderer).             |
| `37d51f5b2` | Démo originale : 4 niveaux × 2 verbosités (8 rendus).                                                                                 |
| `095cccbbe` | Explanations rendues à tous les niveaux.                                                                                              |
| `e1ac27965` | **Phase 6 — création du pipeline pédagogique séparé** pour les équations linéaires.                                                   |
| `5530d9cfc` | Cosmetic fixes + ajout de la vue technique dans la démo.                                                                              |
| `fe9a7337e` | **Retrait du niveau primaire** (hors curriculum équations linéaires). 4 niveaux → 3 niveaux.                                          |
| `8478a0878` | Démo technique compacte (`[id] rule: title`).                                                                                         |
| `0020597ed` | `expressionLatex` utilise `\begin{aligned}` pour les transformations multi-lignes.                                                    |
| `5e72d20d2` | Verbosity gating final : `summarized` = titres seuls, `detailed` = titres + équations.                                                |
| `c4443d02d` | `expressionLatex` colore en bleu (`\textcolor{blue}{...}`) l'opération appliquée.                                                     |
| `f8745834d` | Vocabulaire naturel adapté à chaque niveau (collège vs lycée vs supérieur).                                                           |
| `5dd3fd831` | **Lycée** combine transposition + division en une étape compacte.                                                                     |
| `2198ab523` | Démo standalone (`scripts/pedagogical-solve-demo.ts`) + tests snapshot Vitest.                                                        |
| `9d67105a2` | Équation à fractions ajoutée + fix sign-detection sur fractions.                                                                      |
| `864332643` | **Restructuration Option C** : 1 fichier par catégorie, 7 catégories, source partagée script + tests, fix divide-by-zero (`0·x = 0`). |

### Bugs corrigés

- **Sign-detection cassée sur opérandes négatifs** (commit `8e104dbbf`) : la règle de transposition ignorait le signe quand l'opérande était `opposite(...)` ; corrigé via canonicalisation préalable + règle sign-aware.
- **Sign-detection cassée sur fractions** (commit `9d67105a2`) : même problème pour `−x/2 + 1/3 = 0` ; corrigé.
- **Crash divide-by-zero sur edge cases** (commit `864332643`) : `0·x = 0` et `0·x = 5` faisaient appeler `divideBothSides(eq, 0)` → "normalize: division by zero". Fix dans `linear.ts` : guard `!isZero(coefficient)` avant l'étape division.

### Limitations connues / TODO post Phase 6

- **`superieur`** utilise encore `mergeAll` (provisoire) — à raffiner pour produire un rendu vraiment lycée+ (par exemple : "directement, x = 2/3" en une seule ligne).
- **Edge cases** (`0·x = 0`, `0·x = 5`, `x = x + 1`) : le pipeline ne détecte ni "infinité de solutions" ni "pas de solution" ; il s'arrête silencieusement avec un rendu minimal. Une branche `no-solution` / `infinite-solutions` reste à ajouter.

### Validation Phase 6

- 21 snapshots stables (`linear-demo.test.ts`)
- Tests renderer pédagogique du solveur algorithmique : 17/17 (Phase 2 inchangée)
- 0 régression mathAST sur les tests pré-existants
- Script standalone fonctionnel : `pnpm tsx scripts/pedagogical-solve-demo.ts [catégories...]`

### Récapitulatif Phase 6

- 17 commits intermédiaires (`fdef836e0` exclu, c'est le close-out Phase 5).
- Modules ajoutés : `pedagogical-solve/` (pipeline + renderer + types + demo-helpers), `pedagogical-solve/demo-equations/` (7 catégories), `__tests__/linear-demo.test.ts`, `scripts/pedagogical-solve-demo.ts`.
- 22 commits poussés vers `origin/main` (incluant le travail MVP Phases 1-5 et la Phase 6).
