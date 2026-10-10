# Mode B — Élargissement (`kind: 'solve'` + `kind: 'arithmetic-from-blank'`) — Prompt source

> **Session indépendante.** Ce prompt est auto-suffisant : tout ce qu'il
> faut est listé ci-dessous. L'agent ne doit PAS supposer du contexte
> conversationnel.
>
> **Contexte high-level :** UbuMaths a livré 8 modules pédagogiques de
> step-by-step (`pedagogical-arithmetic/`, `pedagogical-solve/{linear,
quadratic, linear-inequality, quadratic-inequality, rational-inequality}`,
> `pedagogical-differentiation/`, `pedagogical-integration/`,
> `pedagogical-simplify/`) tous branchés sur le « Mode B » des
> corrections de questions (`QuestionCorrection.generatedSteps`,
> 9 kinds discriminés actuels). Ce prompt **étend Mode B avec 2 nouveaux
> kinds** :
>
> - **Track A — `kind: 'solve'`** : fallback algorithmique générique
>   pour les types d'équations non couverts par les pipelines pédagogiques
>   dédiés (cubic, quartic, transcendental, polynomial degré n ≥ 5,
>   trig periodic). **Architecture dual rendering pur (Option A)** sur
>   le step recorder algorithmique de `solve()`.
> - **Track B — `kind: 'arithmetic-from-blank'`** : variante de
>   `kind: 'arithmetic'` qui réutilise l'expression d'un blank existant
>   au lieu de la dupliquer. **Refacto** côté `InstanceBlank` pour
>   peupler `expressionName` (TODO post-prompt arithmétique de longue date).
>
> Les 2 tracks sont **indépendants** et peuvent être livrés en tunnels
> séparés. L'agent peut choisir l'ordre. Track B a une dépendance
> infrastructurelle sur le TODO `expressionName` qui doit être livré en
> premier dans son propre tunnel.

---

## Lectures préalables OBLIGATOIRES (par ordre)

L'agent DOIT lire ces fichiers en premier — la suite du prompt y fait
référence et pré-suppose qu'ils sont compris.

### 1. Vue d'ensemble Mode B

- `docs/wip/correction-integration-progress.md` — architecture Mode B
  complète, 7 nouveaux kinds post-MVP listés, page debug 15 fixtures.
  **À lire en entier**.
- `src/lib/questions/types.ts` — chercher `GeneratedSteps` discriminator
  (9 kinds actuels, lignes ~966-1058) et `InstanceBlank` (ligne 536).
- `src/lib/questions/template-schema.ts` — schémas Zod (lax + strict)
  avec discriminator. À étendre pour les 2 nouveaux kinds.
- `src/lib/questions/generator/correction-generator.ts` — switch/case
  sur `kind` (lignes ~96-179). Modèle direct des dispatch existants.
- `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts` —
  fixtures actuelles. À étendre avec 2-4 fixtures pour les nouveaux kinds.

### 2. Module modèle pour le DUAL RENDERING (Track A)

- `src/lib/mathAST/pedagogical-simplify/` — **modèle architectural Option C′
  livré récemment** (commits `8fc5c8f86` à `c5da30601`). Structure : pipeline
  manuel + réutilisation rule sets + dual renderer + Mode B integration.
  Le Track A reproduit ce pattern mais en **encore plus simple** :
  pas de pipeline manuel, réutilisation directe de `solve()` + renderer pur.
- `docs/wip/simplify-stepper-progress.md` — exemple récent de doc de
  progression à reproduire pour Track A.

### 3. Module algorithmique cible Track A (à instrumenter, PAS à cloner)

- `src/lib/mathAST/solve/index.ts` — public API : `solve()`,
  `solveEquation()`, `SolveResult`, `SolveStep`, `SolveOptions`,
  `classifyEquation`, `getPolynomialDegree`, `containsTranscendental`,
  - 8 solveurs (`linearSolver`, `quadraticSolver`, `transcendentalSolver`,
    `cubicSolver`, `quartic`, `polynomial`, `product`, …).
- `src/lib/mathAST/solve/types.ts` — `SolveStep`, `SolveResult`,
  `SolveOptions`. **Important** : `SolveStep` est déjà `extends BaseStep`
  - `description` + `before/after`.
- `src/lib/mathAST/solve/step-recorder.ts` (~111 LOC) —
  `SolvingStepRecorderImpl extends StepRecorderBase<SolveStep>`. Recorder
  algorithmique déjà fait, à réutiliser.
- `src/lib/mathAST/solve/descriptions-fr.ts` (~187 LOC) — **~50 rules
  algorithmiques avec descriptions FR de qualité** (`identify-cubic`,
  `apply-cardano-formula`, `quartic-ferrari`, `apply-logarithm`,
  `apply-exponential`, `compute-discriminant`, etc.). C'est la **base**
  des TITLES pédagogiques de Track A.
- `src/lib/mathAST/solve/classify.ts` — `classifyEquation`,
  `getPolynomialDegree`, `containsTranscendental`,
  `getTranscendentalType`. À réutiliser pour le routing en Mode B.

**Important historique** : le commit `e1ac27965` a SUPPRIMÉ l'ancien
`solve/pedagogical-renderer.ts` (MVP Phase 2, ~190 LOC) quand
`pedagogical-solve/linear` l'a supplanté pour les linéaires/quadratiques.
**Track A doit le RECRÉER** sous une forme étendue (cubic, quartic,
transcendental, etc.).

### 4. Module modèle pour Track B — `pedagogical-arithmetic` + assign-blank-indices

- `src/lib/mathAST/pedagogical-arithmetic/target-extractor.ts` —
  `extractPedagogicalTarget(instance, blank?, expressionName?)`. Le 3e
  arg `expressionName` est l'objet du TODO post-prompt arithmétique :
  rendre redondant en peuplant `expressionName` directement dans
  `InstanceBlank`.
- `src/lib/questions/generator/assign-blank-indices.ts` (~50-80 LOC) —
  **infrastructure partielle déjà en place** : regex
  `EXPR_MARKER_REGEX = /^<<expr:(expression[a-zA-Z0-9]*)>>/` qui
  détecte `<<expr:NAME>>` dans les zones math du statement, ET réserve
  les indices pour `?` dans `answerFormats[NAME]`. **Le NAME est extrait
  mais pas propagé sur l'`InstanceBlank` correspondant** — c'est l'objet
  du Track B Phase 0.
- `src/lib/questions/types.ts` ligne 536 — `InstanceBlank` actuel : pas
  de champ `expressionName`. À ajouter (optionnel).
- `docs/wip/pedagogical-arithmetic-progress.md` — TODO post-prompt #1 :
  « Populer `expressionName` directement dans `InstanceBlank` via
  `generator/assign-blank-indices.ts` (~2-3h, rend le 3e arg
  `extractPedagogicalTarget` redondant) ».

### 5. Glue Mode B (pattern à reproduire)

- Le pattern est **éprouvé 7 fois** maintenant (`differentiate`, 4
  inéquations, `quadratic-equation`, `integrate`, `simplify`). Procédure
  standard :
  1. Étendre `GeneratedSteps` discriminator dans `types.ts` (+1 kind)
  2. Étendre `template-schema.ts` (Zod lax + strict)
  3. Ajouter case dans `correction-generator.ts`
  4. Ajouter 1-2 fixtures dans `__tests__/fixtures/generated-steps-demo.ts`
  5. Étendre `__tests__/generated-steps-demo.test.ts` (+ snapshots)
  6. Étendre la page debug `+page.svelte`
  7. Tests `correction-generator.test.ts` (+5-7 par kind)

---

# Track A — `kind: 'solve'` algorithmique générique

## Phase 0A — Spécification TDD (bloquante)

### A.A — Scope mathématique

Track A est un **fallback** Mode B pour les types d'équations
**non couverts par les pipelines pédagogiques dédiés**.

**Couvert par dispatch dédié** (refusé par `kind: 'solve'`, redirige vers
le bon kind via warning dans console + fallback Mode A) :

- **Linéaire** (degré 1) → utiliser `kind: 'linear-equation'`
- **Quadratique** (degré 2) → utiliser `kind: 'quadratic-equation'`
- **Inéquations** linéaires/quadratiques/rationnelles → utiliser kinds
  dédiés

**Couvert par `kind: 'solve'`** :

- **Cubique** (degré 3) — Cardano, factor-common-root
- **Quartique** (degré 4) — Ferrari, biquadratique
- **Polynomial degré n ≥ 5** — Newton numérique
- **Transcendantal** (sin/cos/tan = const, e^x = const, ln(x) = const,
  arcsin = const)
- **Trig periodic** — équations trig avec périodicité
- **Power equation** (`x^n = k`) — extract-nth-root
- **Product** (zero-product property) — utile aussi pour les cas
  factorisés non-quadratiques

**Hors scope V1** :

- Systèmes d'équations
- Équations matricielles
- Équations différentielles
- Coefficients paramétriques (rejet → `InequalityNotSolvable`-style erreur)

### A.B — Architecture (Option A pure dual rendering)

**PAS de pipeline parallèle** comme différentiation/intégration.
**PAS de variante manuelle Option C′** comme simplify.

Justification : `solve()` produit déjà des steps pédagogiquement
acceptables pour les équations « avancées » (cubic/quartic/transcendental).
Les rules `apply-cardano-formula`, `compute-cubic-discriminant`,
`apply-logarithm`, `apply-exponential` sont déjà au programme
(prépa/sup), et leurs descriptions FR existent déjà dans
`solve/descriptions-fr.ts`.

**Architecture** :

```
src/lib/mathAST/pedagogical-solve/
├── algorithmic-renderer.ts (NEW, ~250 LOC)
│   - PedagogicalSolveAlgorithmicRenderer
│   - TITLES per SchoolLevel (lycee + superieur)
│   - EXPLANATIONS per SchoolLevel
│   - formatExpressionLatex(step) — réutilise toLatex
│   - assertSupportedLevel — refuse primaire + college pour cubic/quartic
└── algorithmic-dispatch.ts (NEW, ~100 LOC)
    - generatePedagogicalSolveSteps(equation, options)
    - Routing par classifyEquation : refuse linear/quadratic, accepte le reste
    - throw PedagogicalSolveAlgorithmicNotImplemented si type non supporté
```

**Pipeline** :

1. Parse `equation: string` LaTeX → `RelationNode`
2. `classifyEquation()` détermine le degré + type
3. Si `degree ∈ [0, 2]` → throw avec message « utilisez `kind: 'linear-equation'`
   ou `kind: 'quadratic-equation'` »
4. Sinon → appeler `solve()` avec `verbosity: 'detailed'`
5. Récupérer `result.steps: SolveStep[]`
6. Renderer pédagogique consomme et produit `RenderedStep[]`

### A.C — Niveaux scolaires

`PedagogicalSolveAlgorithmicSchoolLevel = Exclude<SchoolLevel, 'primaire' | 'college'>`

(Les équations cubiques/quartiques/transcendantales sont sup,
les transcendantales simples sont tle spé maths.)

| Niveau        | Couvert                                                                   |
| ------------- | ------------------------------------------------------------------------- |
| `lycee` (Tle) | transcendental simple (e^x = a, ln(x) = a, sin(x) = a), power equations   |
| `superieur`   | + cubic (Cardano), quartic (Ferrari, biquadratique), polynomial degré ≥ 5 |

Bump primaire/college → throw `PedagogicalSolveAlgorithmicNotImplemented`.

### A.D — Décisions à valider Phase 0A (questions à l'utilisateur)

> **A-Q1** — Architecture confirmée : **Option A dual rendering pur** sur
> `solve()` ? Ou agent doit explorer Option C′ (variante manuelle) si
> certains rules algorithmiques produisent des étapes non-pédagogiques ?
> **Reco par défaut** : Option A. Solve() produit déjà des steps de
> qualité pour ces niveaux avancés.

> **A-Q2** — Refus dur ou délégation pour linear/quadratic ?
> A : Refus avec throw + warning console (le générateur utilise le mauvais kind)
> B : Délégation transparente vers `pedagogical-solve/{linear,quadratic}` (le
> `kind: 'solve'` devient une « façade unifiée »)
> **Reco par défaut** : A (refus). Discipline le générateur de questions à
> utiliser le bon kind pour bénéficier des pipelines pédagogiques dédiés.

> **A-Q3** — Niveau scolaire pour transcendantal simple ?
> Le programme Tle spé maths 2025 inclut `e^x = a`, `ln(x) = a`,
> `sin(x) = a`. Doit-on activer le rendu lycée pour ces cas ?
> **Reco par défaut** : OUI. Lycée tle.

> **A-Q4** — Démos catégorisées ?
> 5 catégories proposées :
>
> - `cubic` (3 cas : Cardano standard, factor-common-root x³+x²=0, racines triples)
> - `quartic` (3 cas : biquadratique, Ferrari, factor x⁴-1)
> - `transcendental-simple` (4 cas : e^x=a, ln(x)=a, sin(x)=a, cos(x)=a)
> - `transcendental-complex` (2-3 cas : a·e^x+b=0, sin(2x)=cos(x))
> - `power` (3 cas : x^3=8, x^4=16 deux solutions, x^5=-32)
>
> **Reco par défaut** : 5 catégories × ~3 cas = ~15 cas total.

> **A-Q5** — Throw `PedagogicalSolveAlgorithmicNotImplemented` cohérent
> avec les autres steppers ? Catch dans correction-generator → fallback
> Mode A.
> **Reco par défaut** : OUI.

> **A-Q6** — Cible chiffrée Track A ?
> Périmètre dual rendering pur : ~600-800 LOC, ~50-70 tests.
> **Reco par défaut** : ~70 tests, ~700 LOC.

### A.E — Critères d'acceptation Track A

- 0 régression sur ~12000 tests `mathAST + math + geometry-core/compute`
- Renderer cubic/quartic/transcendental opérationnel sur les 5 catégories
- Refus explicite de linear/quadratic avec message clair
- Mode B `kind: 'solve'` intégré + 2-3 fixtures (cubic + transcendental)
- Page debug étendue (15 → 17/18)
- 0 erreur ESLint, 0 nouvelle erreur TS
- Doc `docs/wip/solve-algorithmic-stepper-progress.md` écrite

## Phases A1-A5 — Implémentation Track A

### Phase A1 — Types + dispatcher (~1.5h)

1. Créer `src/lib/mathAST/pedagogical-solve/algorithmic-types.ts` :

   ```ts
   export type PedagogicalSolveAlgorithmicSchoolLevel = Exclude<SchoolLevel, 'primaire' | 'college'>;

   export interface PedagogicalSolveAlgorithmicOptions {
     readonly level: PedagogicalSolveAlgorithmicSchoolLevel;
     readonly variable?: string;
     readonly maxIterations?: number;       // pour Newton numérique
     readonly tolerance?: number;
     readonly signal?: AbortSignal;
     readonly timeoutMs?: number;
   }

   export interface PedagogicalSolveAlgorithmicResult {
     readonly steps: readonly SolveStep[];   // raw du solve()
     readonly solutions: readonly Solution[];
     readonly status: SolutionStatus;
     readonly equationType: EquationType;    // 'cubic' | 'quartic' | 'transcendental' | ...
   }

   export class PedagogicalSolveAlgorithmicNotImplemented extends Error { ... }
   ```

2. Créer `src/lib/mathAST/pedagogical-solve/algorithmic-dispatch.ts` :

   - `generatePedagogicalSolveSteps(equation, options)` :
     - Parse equation → RelationNode
     - `classifyEquation()` → degré + type
     - Si `degree ∈ [0, 2]` → throw avec message « utilisez kind dédié »
     - Sinon appeler `solve()` avec verbosity detailed
     - Wrap dans `PedagogicalSolveAlgorithmicResult`

3. Tests `__tests__/algorithmic-dispatch.test.ts` (~20 tests) :
   - Refus degré 1 et 2
   - Acceptance degré 3, 4, 5
   - Acceptance transcendental (sin, cos, exp, ln)
   - Throw NotImplemented pour cas non solvables
   - Variable detection auto

### Phase A2 — Renderer (~2-3h)

1. Créer `src/lib/mathAST/pedagogical-solve/algorithmic-renderer.ts` :

   - `PedagogicalSolveAlgorithmicRenderer implements StepRenderer<SolveStep, PedagogicalRenderOptions>`
   - TITLES par niveau pour les ~50 rules algorithmiques
     (mapping enrichi de `solve/descriptions-fr.ts`) :
     - Lycée : vocabulaire didactique (« On calcule le discriminant cubique »)
     - Sup : vocabulaire compact (« Δ = ... »)
   - EXPLANATIONS par niveau (gated par `verbosity === 'detailed'`)
   - `formatExpressionLatex(step)` : `\begin{aligned}` 2-lignes avec
     before/after
   - `assertSupportedLevel(level)` — refuse `primaire | college`
   - Recursion `subSteps` (héritée du SolveStep si présent)

2. **Étendre `solve/descriptions-fr.ts`** : ajouter 10-20 entries
   manquantes (ex: explanations détaillées par cas Cardano, formes
   trig, arcsin/arccos restrictions de domaine).

3. Tests `__tests__/algorithmic-renderer.test.ts` (~25-30 tests) :
   - TITLES par niveau pour chaque type d'équation (cubic, quartic, transcendental)
   - EXPLANATIONS gating par verbosity
   - Refus primaire/college
   - Formats LaTeX cubic/quartic/transcendental

### Phase A3 — Démos catégorisées + CLI (~1.5h)

1. Créer `pedagogical-solve/demo-equations-algorithmic/` (5 catégories) :

   - `cubic.ts`, `quartic.ts`, `transcendental-simple.ts`,
     `transcendental-complex.ts`, `power.ts`
   - `index.ts` agrégateur

2. Créer `pedagogical-solve/algorithmic-demo-helpers.ts` avec
   `presentEquationAlgorithmic(label, equation, options, format)`.

3. Créer `__tests__/algorithmic-demo.test.ts` avec snapshots (~15 cas).

4. Créer `scripts/pedagogical-solve-algorithmic-demo.ts` :
   - Filtre par catégorie
   - Flags `--latex` / `--custom` / `--both`
   - Pretty-print + ANSI bold-blue

### Phase A4 — Mode B `kind: 'solve'` (~1-1.5h)

1. Étendre `src/lib/questions/types.ts` :

   ```ts
   | {
       readonly kind: 'solve';
       /** Template equation — supports {{a}}, {{eval:...}}, etc. */
       readonly equation: string;
       readonly variable?: string;
       readonly options?: GeneratedStepsOptions;
     }
   ```

2. Étendre `src/lib/questions/template-schema.ts` (Zod lax + strict).

3. Étendre `src/lib/questions/generator/correction-generator.ts` :

   - Imports : `generatePedagogicalSolveSteps`,
     `PedagogicalSolveAlgorithmicRenderer`,
     `PedagogicalSolveAlgorithmicNotImplemented`.
   - Case `'solve'` dans le switch principal.
   - Bump `primaire | college → lycee`.
   - Catch `PedagogicalSolveAlgorithmicNotImplemented` → fallback Mode A.

4. Tests `correction-generator.test.ts` (+6-8 tests) :

   - Cubic acceptance, transcendental acceptance
   - Refus linear/quadratic avec warning
   - Fallback notImplemented
   - Override level

5. Étendre fixtures + page debug :

   - `solveCubicDemo` (`x³ - 6x² + 11x - 6 = 0` Tle spé / sup)
   - `solveTranscendentalDemo` (`e^x = 5` Tle spé)
   - 2 nouvelles cartes dans `+page.svelte` (15 → 17 fixtures)

6. **Svelte autofixer** sur la page debug.

### Phase A5 — Quality + doc + commit (~30 min)

- ESLint + check:incremental + autofixer
- Doc `docs/wip/solve-algorithmic-stepper-progress.md` (modèle
  `simplify-stepper-progress.md`)
- Mise à jour `pedagogical-steppers-mvp-progress.md` (9 → 10 kinds,
  page debug 15 → 17 fixtures)
- Mise à jour `correction-integration-progress.md` (7 → 8 nouveaux
  kinds post-MVP)
- Commit final

---

# Track B — `kind: 'arithmetic-from-blank'`

## Phase 0B — Spécification TDD (bloquante)

### B.A — Concept

Le `kind: 'arithmetic'` actuel demande `expression: string` (template
`{{a}}+{{b}}*{{c}}`). Si la question est « Calcule 2+3×4 = ? » avec
blank `expectedAnswer = '14'`, l'auteur écrit DEUX FOIS l'expression
arithmétique : une fois dans le statement (`{{a}}+{{b}}*{{c}}`) et une
fois dans `generatedSteps.expression`. Duplication.

**Concept Track B** : `kind: 'arithmetic-from-blank'` avec
`blankIndex: number` (et `expressionName?: string` après TODO
`expressionName` livré). Le système trouve l'expression cible **dans
l'`InstanceBlank.expressionName`** (peuplé via le marker `<<expr:NAME>>`
existant déjà dans `assign-blank-indices.ts`).

### B.B — Décomposition en 2 sous-tracks séquentiels

**Track B0 — TODO `expressionName` dans `InstanceBlank`** (prérequis,
~2-3h) :

- Étendre `InstanceBlank` avec `expressionName?: string`.
- Modifier `assign-blank-indices.ts` pour propager `NAME` (extrait du
  `<<expr:NAME>>` regex) vers le blank correspondant.
- Tests : vérifier que les blanks suivant un `<<expr:NAME>>` ont le
  bon `expressionName` peuplé.
- Code review.
- Commit.

**Track B1 — `kind: 'arithmetic-from-blank'`** (~2-3h après B0) :

- Étendre `GeneratedSteps` avec :

  ```ts
  | {
      readonly kind: 'arithmetic-from-blank';
      readonly blankIndex: number;       // index du blank cible (0-based)
      readonly options?: GeneratedStepsOptions;
    }
  ```

- Étendre Zod (lax + strict).
- Case dans `correction-generator.ts` :
  - Récupérer `instance.blanks[blankIndex]`
  - Lire `blank.expressionName` (peuplé par B0)
  - Récupérer la string template depuis `instance.statement` ou
    via une nouvelle map `instance.namedExpressions[expressionName]`
    (à décider Phase 0B)
  - Appeler `pedagogical-arithmetic` avec cette expression
- Tests + fixture + page debug.

### B.C — Décisions à valider Phase 0B (questions à l'utilisateur)

> **B-Q1** — Source de l'expression target une fois `expressionName`
> peuplé sur le blank ?
> A : Stocker la string template originale dans
> `instance.namedExpressions[expressionName]` (nouvelle map exposée)
> B : Re-parser `instance.statement` markdown pour retrouver
> `<<expr:NAME>>...` → fragile (markdown peut être altéré)
> C : Stocker la string template directement dans `InstanceBlank`
> (champ `expressionTemplate`) à côté de `expressionName` > **Reco par défaut** : C. Le blank porte tout ce qu'il faut, simple,
> robuste.

> **B-Q2** — Compatibilité avec `kind: 'arithmetic'` existant ?
> Garder les DEUX kinds (verbose `arithmetic` avec expression explicite,
> et nouveau `arithmetic-from-blank` qui réutilise) ?
> **Reco par défaut** : OUI garder les deux. `arithmetic-from-blank` est
> sucre syntaxique, l'auteur peut continuer à utiliser `arithmetic` si
> il préfère.

> **B-Q3** — Validation Zod : `blankIndex` doit-il être validé contre
> `instance.blanks.length` au runtime ?
> A : Oui (run-time check dans correction-generator)
> B : Non, throw plus tard si index out of bounds
> **Reco par défaut** : A. Erreur explicite + warn + fallback Mode A.

> **B-Q4** — Cas où `blank.expressionName` est null ou
> `expressionTemplate` absent ?
> Throw `ArithmeticFromBlankError` avec message clair → fallback Mode A.

> **B-Q5** — Migration des fixtures existantes ?
> Faut-il migrer la fixture `additionGroupingDemo` vers
> `arithmetic-from-blank` pour valider le pattern, ou créer une nouvelle
> fixture dédiée ?
> **Reco par défaut** : Créer 1 nouvelle fixture (`arithmeticFromBlankDemo`),
> garder `additionGroupingDemo` intacte (régression).

> **B-Q6** — Cible chiffrée Track B ?
> Track B0 (`expressionName`) : ~2-3h, ~10 tests, ~50-100 LOC.
> Track B1 (`arithmetic-from-blank`) : ~2-3h, ~10 tests, ~150 LOC.
> **Reco par défaut** : ~20 tests cumulés, ~250 LOC.

### B.D — Critères d'acceptation Track B

- 0 régression sur les ~600 tests `pnpm test:server src/lib/questions/`
- Track B0 : `InstanceBlank.expressionName` peuplé pour les blanks
  suivant un `<<expr:NAME>>` dans le markdown
- Track B1 : `kind: 'arithmetic-from-blank'` opérationnel sur fixture
  démo
- Page debug étendue (17 → 18 fixtures, après Track A) ou (15 → 16
  fixtures, si Track A pas encore livré)
- 0 erreur ESLint, 0 nouvelle erreur TS
- Doc `docs/wip/arithmetic-from-blank-progress.md` écrite

## Phases B0-B2 — Implémentation Track B

### Phase B0 — `expressionName` dans `InstanceBlank` (~2-3h)

1. Étendre `src/lib/questions/types.ts` :

   ```ts
   export interface InstanceBlank {
   	// ... champs existants
   	/**
   	 * Name extracted from <<expr:NAME>> marker preceding this blank
   	 * in the statement (math zone). Used by Mode B
   	 * `kind: 'arithmetic-from-blank'`.
   	 */
   	expressionName?: string;

   	/**
   	 * Original template string of the named expression (before variable
   	 * resolution). Used by Mode B `kind: 'arithmetic-from-blank'` to
   	 * reuse the expression for step generation.
   	 */
   	expressionTemplate?: string; // Q1=C reco
   }
   ```

2. Modifier `src/lib/questions/generator/assign-blank-indices.ts` :

   - Tracker le NAME extrait par `EXPR_MARKER_REGEX` quand on rencontre
     `<<expr:NAME>>...`
   - Quand on assigne les indices aux blanks, propager `NAME` et la
     string template originale sur les blanks correspondants.

3. Tests `__tests__/expression-name-propagation.test.ts` (~6-8 tests) :

   - `<<expr:expression1>>2+3` puis `?` → blank.expressionName === 'expression1'
   - `<<expr:expression1>>2+3` puis `?` puis `?` → les 2 blanks
     ont le même expressionName
   - Sans marker → expressionName undefined
   - Marker invalide (regex doesn't match) → expressionName undefined
   - Multi-zones math : un marker par zone, pas de cross-pollution

4. **Code review** (`code-reviewer` Opus).

5. Mise à jour `pedagogical-arithmetic/target-extractor.ts` : le 3e arg
   `expressionName?: string` devient déductible depuis `blank.expressionName`.
   Garder la signature 3-arg en compat mais déprécier.

6. Tests régression sur `target-extractor.test.ts` : 0 régression.

7. Commit B0.

### Phase B1 — `kind: 'arithmetic-from-blank'` (~2-3h)

1. Étendre `src/lib/questions/types.ts` :

   ```ts
   | {
       readonly kind: 'arithmetic-from-blank';
       readonly blankIndex: number;
       readonly options?: GeneratedStepsOptions;
     }
   ```

2. Étendre `src/lib/questions/template-schema.ts` (Zod lax + strict).

3. Étendre `correction-generator.ts` :

   - Case `'arithmetic-from-blank'` :
     - Lookup `instance.blanks[blankIndex]`
     - Validation : index in range + expressionTemplate non null
     - Si OK → appeler `renderArithmetic({ expression: blank.expressionTemplate, ... })`
     - Sinon → throw `ArithmeticFromBlankError` + warn → fallback

4. Tests `correction-generator.test.ts` (+6-8 tests) :

   - Cas nominal : statement avec `<<expr:e1>>2+3×4` + 1 blank → fixture
     valide
   - blankIndex out of bounds → fallback Mode A
   - Blank sans expressionTemplate → fallback Mode A
   - Override options
   - Comparaison kind 'arithmetic' vs 'arithmetic-from-blank' : même
     output sur la même expression

5. Étendre fixtures + page debug :

   - `arithmeticFromBlankDemo` (statement « Calcule
     <<expr:e1>>$2+3 \times 4$ = ? » CM2 → primaire) avec
     `kind: 'arithmetic-from-blank'`, `blankIndex: 0`
   - 1 nouvelle carte dans `+page.svelte`

6. **Svelte autofixer** sur la page debug.

### Phase B2 — Quality + doc + commit (~30 min)

- ESLint + check:incremental + autofixer
- Doc `docs/wip/arithmetic-from-blank-progress.md` (modèle
  `simplify-stepper-progress.md` mais plus court)
- Mise à jour `pedagogical-steppers-mvp-progress.md` (10 → 11 kinds,
  page debug 17 → 18 fixtures, après Track A)
- Mise à jour `correction-integration-progress.md` (8 → 9 nouveaux
  kinds post-MVP)
- **Marquer le TODO post-prompt #1** comme livré dans
  `pedagogical-arithmetic-progress.md`
- Commit final

---

## Anti-patterns à éviter

1. **Track A — Ne PAS recréer un `pedagogical-solve/cubic.ts` etc.**
   parallèle. C'est du dual rendering pur sur le step recorder
   algorithmique existant. Si l'agent commence à créer
   `pedagogical-solve/cubic.ts` avec son propre dispatcher → STOP +
   demander confirmation.

2. **Track A — Ne PAS instrumenter `solve/solve.ts` directement**.
   L'algorithme reste **strictement intact**.

3. **Track A — Ne PAS dupliquer les rules algorithmiques**. Importer
   depuis `solve/solvers/` et `solve/descriptions-fr.ts`.

4. **Track A — Ne PAS écrire un bump primaire/college pour cubic/quartic**.
   Ces niveaux DOIVENT throw. La transcendantale simple peut bumper
   primaire/college → lycee si l'utilisateur valide A-Q3 OUI.

5. **Track A — Ne PAS oublier le refus de linear/quadratic**.
   Discipline le générateur.

6. **Track B — Ne PAS supprimer le 3e arg de `extractPedagogicalTarget`**
   (`expressionName?`) immédiatement. Garder la compat un cycle. Marquer
   `@deprecated` mais conserver.

7. **Track B — Ne PAS faire B1 sans B0 livré + committé**. Le runtime
   du correction-generator a besoin de `blank.expressionName` peuplé.

8. **Ne PAS mettre `Co-Authored-By: Claude`** dans les commits.

9. **Ne PAS exécuter `pnpm check`, `pnpm check:fast`, `pnpm build`,
   `pnpm lint`** sur tout le projet. Toujours `pnpm check:incremental`
   et `npx eslint <fichiers>` ciblés.

10. **Ne PAS prendre de décision architecturale unilatérale**. Q-A1 à
    Q-A6 et Q-B1 à Q-B6 doivent être validées explicitement par
    l'utilisateur. Si trade-off non couvert émerge, **demander**.

11. **Ne PAS confondre `solve/SolveStep`** (algorithmique, dans
    `solve/types.ts`) **avec `EquationStep`** (pédagogique, dans
    `pedagogical-solve/types.ts`). Track A consomme le PREMIER pour
    Mode B.

---

## Récap effort estimé

### Track A — `kind: 'solve'`

| Phase             | Effort estimé                                                 |
| ----------------- | ------------------------------------------------------------- |
| 0A                | 10-15 min validation A-Q1 à A-Q6 avec utilisateur             |
| A1                | 1-1.5h types + dispatcher + tests (~20 tests)                 |
| A2                | 2-3h renderer + descriptions FR enrichies + tests (~30 tests) |
| A3                | 1.5h démos + script CLI + snapshots (~15 cas)                 |
| A4                | 1-1.5h Mode B + 2 fixtures + page debug                       |
| A5                | 30 min quality + doc + commit                                 |
| **Total Track A** | **~7-9h en tunnel continu**                                   |

Cible Track A : ~70 tests verts, ~700 LOC, 4-6 commits.

### Track B — `kind: 'arithmetic-from-blank'`

| Phase             | Effort estimé                                                   |
| ----------------- | --------------------------------------------------------------- |
| 0B                | 10-15 min validation B-Q1 à B-Q6 avec utilisateur               |
| B0                | 2-3h `expressionName` dans `InstanceBlank` (~10 tests, ~80 LOC) |
| B1                | 2-3h dispatch case + fixtures + tests (~10 tests, ~150 LOC)     |
| B2                | 30 min quality + doc + commit                                   |
| **Total Track B** | **~5-7h en tunnel continu**                                     |

Cible Track B : ~20 tests cumulés, ~250 LOC, 2-3 commits.

### Total prompt (les 2 tracks)

**~12-16h en 2 tunnels indépendants**, ~90 tests, ~950 LOC, 6-9 commits.

---

## Documents à produire

À la fin du tunnel(s), l'agent doit avoir produit :

**Si Track A seul** :

1. `docs/wip/solve-algorithmic-stepper-progress.md`
2. Mise à jour de `docs/wip/pedagogical-steppers-mvp-progress.md`
3. Mise à jour de `docs/wip/correction-integration-progress.md`

**Si Track B seul** :

1. `docs/wip/arithmetic-from-blank-progress.md`
2. Mise à jour de `docs/wip/pedagogical-steppers-mvp-progress.md`
3. Mise à jour de `docs/wip/correction-integration-progress.md`
4. Mise à jour de `docs/wip/pedagogical-arithmetic-progress.md` (TODO #1
   livré)

**Si les 2 tracks** : tous les docs ci-dessus.

Lister explicitement les docs produits à la toute fin de la conversation
(comme demandé par CLAUDE.md section Planning & Execution Policy).
