# Pedagogical Limits Renderer — Prompt source

> **Session indépendante.** Ce prompt est auto-suffisant : tout ce qu'il
> faut est listé ci-dessous. L'agent ne doit PAS supposer du contexte
> conversationnel.
>
> **Contexte high-level :** UbuMaths a livré 8 modules pédagogiques de
> step-by-step + glue Mode B avec 10 kinds discriminés. Ce prompt ajoute
> le **renderer pédagogique pour les limites** (`limits/` algorithmique
> mature ~8000 LOC, déjà bien fait côté step-recorder). Architecture
> retenue : **dual rendering pur (Option A)** — pas de pipeline parallèle.
> Programme cible : **Tle spé maths + sup**.

---

## ⚠️ ATTENTION ARCHITECTURALE PRÉALABLE

**Ne PAS reproduire le pattern différentiation/intégration aveuglement.**

Le module `limits/` est **différent des 8 modules pédagogiques précédents** :

1. Il **a déjà un step recorder mature** (`LimitStep extends BaseStep`,
   shape parfaite pour le dual rendering).
2. Il **a déjà `RULE_DESCRIPTIONS: Readonly<Record<LimitRule, string>>`**
   en FR (14 sur 15 rules couvertes, descriptions de qualité).
3. Les rules algorithmiques (`direct-substitution`, `factorization`,
   `rationalization`, `lhopital`, `squeeze`, `infinity-analysis`,
   `linearity`, `product`, `quotient`, `composition`, etc.) **sont
   exactement les concepts pédagogiques enseignés** en Tle spé / sup.
4. **Pas de divergence cost-fixpoint** comme `simplify` (qui produisait
   les mauvaises réponses pédagogiques) : `evaluate()` de limits suit
   un dispatch naturel par technique.

**Architecture confirmée Option A** : un renderer pédagogique au-dessus
du step recorder existant. Pas de pipeline parallèle. ~500-800 LOC total
(renderer + descriptions FR enrichies par niveau + Mode B integration).

C'est l'occasion de réintroduire l'architecture historique du MVP
Phase 2 (`solve/pedagogical-renderer.ts` ~190 LOC, **supprimé** dans le
commit `e1ac27965` quand `pedagogical-solve/linear` l'a remplacé).
Cette fois pour les limites, dual rendering pur EST la bonne réponse.

---

## Lectures préalables OBLIGATOIRES (par ordre)

L'agent DOIT lire ces fichiers en premier — la suite du prompt y fait
référence et pré-suppose qu'ils sont compris.

### 1. Module cible (à instrumenter, PAS à cloner)

- `src/lib/mathAST/limits/types.ts` (~233 LOC) — **À LIRE EN ENTIER**.
  Définit :

  - `LimitDirection = 'left' | 'right' | 'both'`
  - `LimitStatus = 'exact' | 'indeterminate' | 'does-not-exist' | 'infinite' | 'unsupported'`
  - `IndeterminateForm = '0/0' | '∞/∞' | '0*∞' | '∞-∞' | '0^0' | '∞^0' | '1^∞' | 'none'`
  - **`LimitRule` union 15 kinds** : `known-limit`, `direct-substitution`,
    `factorization`, `rationalization`, `lhopital`, `squeeze`,
    `algebraic-simplification`, `abs-simplification`, `infinity-analysis`,
    `one-sided`, `linearity`, `product`, `quotient`, `composition`,
    `derivative-definition`.
  - `LimitStep` extends BaseStep : `{ id, rule: LimitRule, description,
before, after, operand?, verbosityLevel, technicalNote? }`.
  - `LimitResult` : `{ variable, approach, direction, status, value,
indeterminateForm, technique, steps, error? }`.
  - `LimitOptions` : `{ verbosity?, maxLhopitalIterations?, allowNumeric?, timeout? }`.
  - `KnownLimitEntry` avec `descriptionFr` natif déjà en français.
  - `LimitError` avec codes `'UNSUPPORTED_EXPRESSION' | 'INVALID_VARIABLE' | 'TIMEOUT' | 'MAX_ITERATIONS' | 'INTERNAL_ERROR'`.

- `src/lib/mathAST/limits/step-recorder.ts` (~245 LOC) —

  - `RULE_DESCRIPTIONS: Readonly<Record<LimitRule, string>>` (lignes 17-37)
    : 14 entries en FR de qualité. **Manque `derivative-definition`**.
    À combler dans Phase 1.
  - `getRuleDescription(rule)` lookup
  - `describeCustomRule(rule)` fallback
  - `LimitStepRecorder` interface + impl extends `StepRecorderBase<LimitStep>`

- `src/lib/mathAST/limits/index.ts` (~178 LOC) — public API. Lecture
  pour comprendre quelles fonctions sont exportées (`evaluate`,
  `evaluateOneSided`, `tryCompositionLimit`, etc.).

- `src/lib/mathAST/limits/evaluate.ts` (~897 LOC) — entry point
  algorithmique principal. **NE PAS instrumenter, juste lire** pour
  comprendre l'ordre des techniques tentées.

- `src/lib/mathAST/limits/known-limits.ts` (~610 LOC) — table des
  limites connues avec `descriptionFr`. À potentiellement réutiliser
  dans le renderer pour afficher la justification d'une `known-limit`.

### 2. Module modèle pour le DUAL RENDERING PUR

- **Précédent historique supprimé** : `solve/pedagogical-renderer.ts`
  (~190 LOC, MVP Phase 2, supprimé commit `e1ac27965`). À étudier dans
  l'historique git :

  ```bash
  git show e1ac27965^:src/lib/mathAST/solve/pedagogical-renderer.ts
  ```

  C'est **exactement le pattern à reproduire** ici (renderer pur sur
  step recorder algorithmique avec `TITLES` per `SchoolLevel`).

- `src/lib/mathAST/common/step-renderer-base.ts` — types renderer
  (`StepRenderer`, `RenderedStep`, `PedagogicalRenderOptions`,
  `SchoolLevel`).

- `src/lib/mathAST/common/technical-renderer.ts` — `GenericTechnicalRenderer`
  par reflection. Référence pour montrer un exemple de renderer existant.

- `src/lib/mathAST/common/REWRITING.md` — README MVP Phase 1 sur le
  pattern dual rendering. **À LIRE** : c'est le manifeste de la
  séparation engine/renderer.

### 3. Glue Mode B (pattern à reproduire)

Le pattern est **éprouvé 9 fois** maintenant. Procédure standard :

1. Étendre `GeneratedSteps` discriminator dans `types.ts` (+1 kind)
2. Étendre `template-schema.ts` (Zod lax + strict)
3. Ajouter case dans `correction-generator.ts`
4. Ajouter 1-2 fixtures dans `__tests__/fixtures/generated-steps-demo.ts`
5. Étendre `__tests__/generated-steps-demo.test.ts` (+ snapshots)
6. Étendre la page debug `+page.svelte` (de 16 à 18 fixtures)
7. Tests `correction-generator.test.ts` (+5-7 par kind)

Fichiers à lire :

- `src/lib/questions/types.ts` — chercher `GeneratedSteps`
  discriminator (10 kinds actuels), `InstanceBlank`.
- `src/lib/questions/template-schema.ts` — schémas Zod lax + strict.
- `src/lib/questions/generator/correction-generator.ts` — switch/case
  sur `kind` (cf. case `'differentiate'` ou `'integrate'` comme modèle
  direct).

### 4. Docs de progression liées

- `docs/wip/pedagogical-steppers-mvp-progress.md` — vue d'ensemble.
- `docs/wip/correction-integration-progress.md` — détail Mode B (à
  mettre à jour).
- `docs/wip/simplify-stepper-progress.md` — exemple récent de doc de
  progression à reproduire.
- `docs/wip/arithmetic-from-blank-progress.md` — autre exemple récent
  (court, dual-rendering-style).

---

## Phase 0 — Spécification TDD (bloquante : valider avec l'utilisateur AVANT d'écrire du code)

L'agent doit poser ces questions à l'utilisateur et **attendre des
réponses explicites** avant de passer à Phase 1.

### A. Couverture mathématique V1

**Programme français limites** :

- **Tle spé maths 2025** :

  - Limites de suites (limite finie, infinie ; théorèmes de
    comparaison, gendarmes, croissances comparées)
  - Limites de fonctions (en un point a, en l'infini)
  - Asymptotes verticales / horizontales / obliques
  - Formes indéterminées élémentaires (`∞-∞`, `0/0`, `∞/∞`)
  - Continuité (théorème des valeurs intermédiaires)

- **Sup (CPGE)** :
  - - L'Hôpital
  - - Formes indéterminées avancées (`0*∞`, `0^0`, `∞^0`, `1^∞`)
  - - Limites composées
  - - Théorème de la limite séquentielle
  - - Critère de Cauchy

**Couvert par `kind: 'limit'`** (réutilisation du dispatch algorithmique
de `evaluate()`) :

- `direct-substitution` (substitution directe)
- `known-limit` (limites de référence : sin(x)/x, (1-cos(x))/x², etc.)
- `factorization` (factorisation et simplification)
- `rationalization` (multiplication par le conjugué)
- `infinity-analysis` (limites en ±∞, croissances comparées)
- `one-sided` (limites à gauche/droite, indispensable pour asymptotes verticales)
- `linearity`, `product`, `quotient` (théorèmes opératoires)
- `composition` (limites composées)
- `algebraic-simplification`
- `abs-simplification`

**Sup uniquement** :

- `lhopital` (refus en lycée — l'Hôpital est sup CPGE)
- `squeeze` (théorème des gendarmes — actif en lycée mais formulation lycée)
- `derivative-definition` (limite définissant la dérivée)

**Hors V1 (refus)** :

- Limites paramétriques (limite avec paramètre formel à discuter)
- Suites définies par récurrence (cas particulier non couvert par
  `evaluate()` actuel)
- Limites uniformes / Cauchy (concepts sup avancés non au programme
  des questions cibles)

### B. Niveaux scolaires

`PedagogicalLimitSchoolLevel = Exclude<SchoolLevel, 'primaire' | 'college'>`

(Les limites ne sont pas au programme avant la Tle.)

| Niveau        | Couvert                                                                                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lycee` (Tle) | direct-substitution, known-limit (sin/x, asymptotes), factorization, infinity-analysis, one-sided, linearity, product, quotient, squeeze (« théorème des gendarmes »), composition simple |
| `superieur`   | + lhopital, derivative-definition, formes indéterminées avancées, vocabulaire compact                                                                                                     |

`PedagogicalLimitNotImplemented` throw si :

- `level === 'primaire' || 'college'`
- `level === 'lycee'` mais l'Hôpital fut utilisée par `evaluate()`
  (re-router vers algorithmique sans renderer pédagogique)

### C. Architecture (Option A pure dual rendering)

```
src/lib/mathAST/pedagogical-limits/   (NEW module, ~600-800 LOC total)
├── types.ts (~80 LOC)
│   - PedagogicalLimitSchoolLevel
│   - PedagogicalLimitOptions { level, expression, variable, approach,
│       direction?, allowLhopital?, signal?, timeoutMs? }
│   - PedagogicalLimitResult { steps, value, status, indeterminateForm,
│       technique }
│   - class PedagogicalLimitNotImplemented extends Error
│
├── descriptions-fr.ts (~250 LOC)
│   - Étend RULE_DESCRIPTIONS de limits/step-recorder.ts par niveau
│     scolaire (PRIMAIRE_TITLES, COLLEGE_TITLES, LYCEE_TITLES,
│     SUPERIEUR_TITLES)
│   - EXPLANATIONS par niveau (lycée detailed, sup compact)
│   - Special handling pour known-limit (réutilise descriptionFr de
│     KnownLimitEntry)
│   - Special handling pour squeeze (« théorème des gendarmes » lycée
│     vs « squeeze theorem » sup)
│
├── renderer.ts (~200 LOC)
│   - PedagogicalLimitRenderer implements StepRenderer<LimitStep, ...>
│   - render(step, options): RenderedStep
│   - renderAll(steps, options)
│   - formatExpressionLatex(step) — format LaTeX 2-lignes
│       \begin{aligned}
│         \lim_{x \to a} \textcolor{blue}{f(x)} & = ... \\
│                                              & = result
│       \end{aligned}
│   - assertSupportedLevel — refuse primaire + college
│
├── dispatch.ts (~80 LOC)
│   - generatePedagogicalLimitSteps(options)
│   - Parse expression LaTeX → MathNode
│   - Appel evaluate(node, { variable, approach, direction, verbosity: 'detailed' })
│   - Filtre les steps unsupported / errors → throw
│   - Retourne PedagogicalLimitResult avec steps brut + value + technique
│
├── index.ts (barrel)
├── demo-helpers.ts (~80 LOC)
└── demo-cases/   (4-5 catégories × 3-4 cas, ~80 LOC + tests)
```

**Pipeline** :

1. Parse `expression: string` LaTeX → `MathNode`
2. Parse `approach: string` LaTeX → `MathNode` (peut être `\infty`,
   `-\infty`, ou nombre)
3. Appel `evaluate(expr, { variable, approach, direction, verbosity: 'detailed' })`
4. Récupération `result.steps: LimitStep[]`
5. Si `result.status === 'unsupported'` → throw `PedagogicalLimitNotImplemented`
6. Si `lycee` et `result.technique === 'lhopital'` → throw
   `PedagogicalLimitNotImplemented` (suggérer sup ou other technique)
7. Renderer pédagogique consomme les `LimitStep[]` et produit `RenderedStep[]`

### D. Décisions à valider Phase 0 (questions à l'utilisateur)

> **Q1 — Architecture Option A confirmée ?**
> Pure dual rendering : un renderer au-dessus du step recorder existant
> (~600-800 LOC), pas de pipeline parallèle. Justification : `LimitStep`
> shape parfaite, descriptions FR existent déjà à 14/15, dispatch
> algorithmique de `evaluate()` est pédagogiquement sain.
> **Reco par défaut : OUI Option A.**
> Si l'utilisateur veut Option B (parallèle clone), ré-évaluer car ce
> serait du gaspillage massif (8000 LOC du module limits à dupliquer).

> **Q2 — L'Hôpital en lycée ?**
> A : Refus dur (`PedagogicalLimitNotImplemented` si `evaluate()` retourne
> `technique: 'lhopital'` et `level === 'lycee'`)
> B : Permis avec note pédagogique (« technique CPGE, hors programme Tle »)
> C : Tenté mais avec préférence d'autres techniques en amont (modifier
> options de `evaluate()` pour désactiver l'Hôpital quand possible)
> **Reco par défaut** : C, avec fallback A. Param `allowLhopital?: boolean`
> default `false` au lycée et `true` au sup. Si lhopital nécessaire au
> lycée, throw avec message clair.

> **Q3 — Squeeze theorem en lycée ?**
> Le théorème des gendarmes EST au programme Tle spé. Le rendu doit
> utiliser le vocabulaire « théorème des gendarmes » (lycée) ou « squeeze
> theorem » (sup) selon le niveau.
> **Reco par défaut** : OUI, vocabulary adaptive.

> **Q4 — Périmètre V1 strict ?**
> Inclure : direct-substitution, known-limit, factorization,
> rationalization, infinity-analysis, one-sided, linearity, product,
> quotient, composition simple, squeeze (lycée+), algebraic/abs
> simplification, lhopital (sup uniquement). Exclure : derivative-
> definition (rendu via `pedagogical-differentiation` côté), limites
> paramétriques, suites récurrentes, Cauchy.
> **Reco par défaut** : OUI ce périmètre.

> **Q5 — Démos catégorisées ?**
> 5 catégories proposées :
>
> - `direct-substitution` (3 cas : polynômes, fractions, racines simples)
> - `known-limits` (3 cas : sin(x)/x, (1-cos(x))/x², ln(1+x)/x)
> - `factorization-rationalization` (3 cas : (x²-1)/(x-1), (√(x+1)-1)/x, etc.)
> - `infinity-analysis` (4 cas : polynôme/polynôme, croissances comparées,
>   asymptote oblique, ∞-∞ levée par factor common)
> - `one-sided-asymptotes` (3 cas : 1/x en 0+, 1/x en 0-, ln(x) en 0+)
> - `lhopital-superieur` (sup, 2-3 cas)
>   **Reco par défaut** : 6 catégories × ~3 cas = ~18 cas total.

> **Q6 — `kind: 'limit'` cohérent avec les autres ?**
> A : `kind: 'limit'` (singulier, cohérent avec `'differentiate'`,
> `'integrate'`, `'simplify'`)
> B : `kind: 'limits'` (pluriel, plus naturel en français : « la limite »
> vs « les limites »)
> **Reco par défaut** : A `'limit'` (singulier, cohérence anglo-saxonne
> du discriminator).

> **Q7 — Inputs Mode B ?**
> Discriminator proposé :
>
> ```ts
> | {
>     readonly kind: 'limit';
>     /** Template expression of the function f(x) — supports {{a}}, etc. */
>     readonly expression: string;
>     /** Variable approaching the limit point. Defaults to 'x'. */
>     readonly variable?: string;
>     /** Point being approached, as LaTeX (`'\\infty'`, `'-\\infty'`, `'0'`, `'a'`). */
>     readonly approach: string;
>     /** Direction of approach. Defaults to 'both'. */
>     readonly direction?: 'left' | 'right' | 'both';
>     /** Allow L'Hôpital. Defaults to false at lycée, true at sup. */
>     readonly allowLhopital?: boolean;
>     readonly options?: GeneratedStepsOptions;
>   }
> ```
>
> **Reco par défaut** : ce schéma.

> **Q8 — Throw `PedagogicalLimitNotImplemented` cohérent ?**
> Catch dans correction-generator → fallback Mode A.
> **Reco par défaut** : OUI.

> **Q9 — Cible chiffrée ?**
> ~600-800 LOC source (renderer + descriptions FR enrichies + dispatch +
> Mode B integration), ~50-70 tests.
> **Reco par défaut** : ~70 tests, ~700 LOC.

### Critères d'acceptation

- 0 régression sur ~12000 tests `mathAST + math + geometry-core/compute`
- Renderer opérationnel sur les 6 catégories de limites
- Refus L'Hôpital en lycée (sauf override explicit)
- Vocabulary adaptive (gendarmes vs squeeze, etc.)
- Mode B `kind: 'limit'` intégré + 2 fixtures
- Page debug étendue (16 → 18 fixtures)
- 0 erreur ESLint, 0 nouvelle erreur TS
- Doc de progression `docs/wip/limits-renderer-progress.md` écrite
- Code review `code-reviewer` (Opus) après chaque phase
- Commits sans `Co-Authored-By: Claude` (cf. CLAUDE.md global)

---

## Phase 1 — Types `pedagogical-limits/types.ts`

### Sous-tâches

1. Créer `PedagogicalLimitSchoolLevel = Exclude<SchoolLevel, 'primaire' | 'college'>`.

2. Créer `PedagogicalLimitOptions` :

   ```ts
   export interface PedagogicalLimitOptions {
   	readonly level: PedagogicalLimitSchoolLevel;
   	readonly expression: string; // LaTeX template
   	readonly variable?: string; // default 'x'
   	readonly approach: string; // LaTeX (e.g. '\\infty', '0', 'a')
   	readonly direction?: 'left' | 'right' | 'both';
   	readonly allowLhopital?: boolean; // default false at lycée, true at sup
   	readonly signal?: AbortSignal;
   	readonly timeoutMs?: number;
   }
   ```

3. Créer `PedagogicalLimitResult` :

   ```ts
   export interface PedagogicalLimitResult {
   	readonly steps: readonly LimitStep[]; // raw du evaluate()
   	readonly value: MathNode | null;
   	readonly status: LimitStatus;
   	readonly indeterminateForm: IndeterminateForm;
   	readonly technique: LimitRule;
   	readonly variable: string;
   	readonly approach: MathNode;
   	readonly direction: LimitDirection;
   }
   ```

4. `class PedagogicalLimitNotImplemented extends Error` (exporté).

5. Tests d'isolation des types (compile-only `@ts-expect-error` + smoke
   runtime).

### Code review attendu

`code-reviewer` (Opus) sur le diff types.

### Validation

- Compile clean (`pnpm check:incremental` sur les fichiers modifiés)
- Tests d'isolation passent
- Revue : cohérence avec `pedagogical-differentiation/types.ts` et
  `pedagogical-integration/types.ts`

---

## Phase 2 — Dispatch `pedagogical-limits/dispatch.ts`

### Sous-tâches

1. `generatePedagogicalLimitSteps(options): PedagogicalLimitResult`
   point d'entrée principal :

   - Parse `expression` LaTeX → `MathNode` via `parseLatex`
   - Parse `approach` LaTeX → `MathNode` (handle `\\infty`, `-\\infty`, nombres, variables)
   - Détermine `variable` (default 'x' ou détecté)
   - Si `level === 'lycee' && !allowLhopital` → désactiver l'Hôpital via
     `maxLhopitalIterations: 0` dans LimitOptions
   - Appel `evaluate(expr, { variable, approach, direction, verbosity: 'detailed', maxLhopitalIterations })`
   - Si `result.status === 'unsupported'` → throw `PedagogicalLimitNotImplemented`
   - Si `level === 'lycee' && result.technique === 'lhopital' && !allowLhopital` →
     throw `PedagogicalLimitNotImplemented` (refus Hôpital lycée)
   - Construire `PedagogicalLimitResult` et retourner

2. Tests `__tests__/dispatch.test.ts` (~20-25 tests) :
   - Limite finie en un point (substitution directe)
   - Limite en +∞ (analyse)
   - Limite avec forme 0/0 (factorisation)
   - Limite à droite vs limite à gauche
   - Refus L'Hôpital en lycée (forme indéterminée non levable autrement)
   - Acceptance L'Hôpital en sup
   - Refus primaire/college
   - Throw NotImplemented pour cas unsupported
   - Variable detection auto

### Code review attendu

`code-reviewer` (Opus) sur le dispatch.

### Validation

- Tests passent
- 0 régression sur `limits/` existant

---

## Phase 3 — Descriptions FR + Renderer (`pedagogical-limits/{descriptions-fr,renderer}.ts`)

### Sous-tâches

1. **Étendre `descriptions-fr.ts`** : 4 maps TITLES par niveau scolaire
   pour les 15 LimitRule kinds. Inspirer de `RULE_DESCRIPTIONS` existant
   dans `limits/step-recorder.ts` mais adapter par niveau.

   Exemples :

   - `direct-substitution` lycée : « On substitue directement la valeur »
   - `direct-substitution` sup : « f continue en a → lim = f(a) »
   - `lhopital` sup : « Application de la règle de L'Hôpital : lim f/g = lim f'/g' »
   - `squeeze` lycée : « Théorème des gendarmes »
   - `squeeze` sup : « Théorème d'encadrement (squeeze) »
   - `infinity-analysis` lycée : « Étude du comportement à l'infini par
     facteur dominant »
   - `infinity-analysis` sup : « Asymptotique : f(x) ~ ... quand x → ±∞ »
   - `one-sided` lycée : « On étudie séparément la limite à gauche et à droite »
   - `composition` lycée : « Limite d'une fonction composée : lim f(g(x)) = f(lim g(x)) si f continue »

2. **EXPLANATIONS** par niveau (lycée detailed, sup compact). Gated par
   `verbosity === 'detailed'`.

3. **Special handling pour `known-limit`** : si le step a un
   `technicalNote` ou si on peut retrouver le `KnownLimitEntry` via
   `id` (à vérifier dans `step-recorder.ts`), réutiliser
   `entry.descriptionFr` directement (cf. `known-limits.ts`).

4. **Ajout de la rule manquante `derivative-definition`** dans
   `RULE_DESCRIPTIONS` du module limits/ original (one-line patch dans
   `limits/step-recorder.ts`) :

   ```ts
   'derivative-definition': "Définition de la dérivée comme limite : lim [f(x)−f(a)]/(x−a) = f'(a)"
   ```

5. Créer `pedagogical-limits/renderer.ts` :

   - `class PedagogicalLimitRenderer implements StepRenderer<LimitStep, PedagogicalRenderOptions>`
   - `render(step, options): RenderedStep` :
     - title = TITLES[level][rule] ?? TITLES.lycee[rule] ?? step.description
     - explanation gated by verbosity
     - expressionLatex via `formatExpressionLatex(step)`
   - `renderAll(steps, options): readonly RenderedStep[]`
   - `assertSupportedLevel(level)` : refuse primaire + college
   - `formatExpressionLatex(step)` : LaTeX 2-lignes aligned :
     ```latex
     \begin{aligned}
       \lim_{x \to a} \textcolor{blue}{<before>} & = ... \\
                                                & = <after>
     \end{aligned}
     ```
     Cas spéciaux :
     - `infinity-analysis` : indique le facteur dominant en bleu
     - `factorization` : factor commun en bleu
     - `rationalization` : conjugué en bleu
     - `lhopital` : numérateur et dénominateur dérivés en bleu
     - `one-sided` : afficher `\lim_{x \to a^+}` ou `\lim_{x \to a^-}`
     - `composition` : afficher la décomposition `lim f(g(x))`

6. Tests `__tests__/renderer.test.ts` (~25-30 tests) :
   - TITLES par niveau pour chaque LimitRule
   - EXPLANATIONS gating par verbosity
   - Refus primaire/college
   - Format LaTeX pour chaque type de step
   - Vocabulary gendarmes vs squeeze
   - Recursion subSteps (héritée si présent)
   - Special handling known-limit avec descriptionFr

### Code review attendu

`code-reviewer` (Opus) sur les TITLES + EXPLANATIONS + formatExpressionLatex.

### Validation

- Tests renderer passent
- Visuellement vérifiable via demo CLI (Phase 4)

---

## Phase 4 — Démos catégorisées + script CLI

### Sous-tâches

1. Créer `pedagogical-limits/demo-cases/` (6 catégories cf. Q5) :

   - `direct-substitution.ts` (3 cas)
   - `known-limits.ts` (3 cas : `sin(x)/x → 1`, `(1-cos(x))/x² → 1/2`,
     `ln(1+x)/x → 1`)
   - `factorization-rationalization.ts` (3 cas)
   - `infinity-analysis.ts` (4 cas)
   - `one-sided-asymptotes.ts` (3 cas)
   - `lhopital-superieur.ts` (2-3 cas, sup uniquement)
   - `index.ts` agrégateur

2. Créer `pedagogical-limits/demo-helpers.ts` avec
   `presentLimit(label, options, format)` analogue.
   Format `'custom' | 'latex' | 'both'`.

3. Créer `__tests__/pedagogical-limits-demo.test.ts` avec snapshots
   (~18 cas).

4. Créer `scripts/pedagogical-limits-demo.ts` (CLI standalone) :

   - Filtre par catégorie
   - Flags `--latex` / `--custom` / `--both`
   - Pretty-print custom syntax + ANSI bold-blue
   - Substitutions cosmétiques : `\\lim` → `lim`, `\\to` → `→`, `\\infty` → `∞`,
     `\\dfrac{a}{b}` → `(a)/(b)`, `\\sqrt{x}` → `√(x)`,
     `\\textcolor{blue}{...}` → ANSI bold-blue, etc.

5. Vérifier que le CLI tourne :
   ```bash
   pnpm tsx scripts/pedagogical-limits-demo.ts direct-substitution
   pnpm tsx scripts/pedagogical-limits-demo.ts --latex
   pnpm tsx scripts/pedagogical-limits-demo.ts known-limits
   ```

### Code review attendu

`code-reviewer` (Opus) sur les snapshots + CLI.

### Validation

- ~18 snapshots stables
- CLI fonctionne
- 0 régression

---

## Phase 5 — Mode B : `kind: 'limit'`

### Sous-tâches

1. Étendre `src/lib/questions/types.ts` :

   - Ajouter `'limit'` au `kind` de `GeneratedSteps` (10 → 11 kinds).
   - Type narrowing :

     ```ts
     | {
         readonly kind: 'limit';
         readonly expression: string;
         readonly variable?: string;
         readonly approach: string;
         readonly direction?: 'left' | 'right' | 'both';
         readonly allowLhopital?: boolean;
         readonly options?: GeneratedStepsOptions;
       }
     ```

2. Étendre `src/lib/questions/template-schema.ts` :

   - Ajouter le membre `limit` au discriminator Zod (lax + strict).

3. Étendre `src/lib/questions/generator/correction-generator.ts` :

   - Imports : `generatePedagogicalLimitSteps`,
     `PedagogicalLimitRenderer`, `PedagogicalLimitNotImplemented`.
   - Case `'limit'` dans le switch principal.
   - Bump `'primaire' | 'college'` → `'lycee'`.
   - Catch `PedagogicalLimitNotImplemented` → fallback silencieux (silent
     fallback comme les autres kinds, pas de `console.warn` cf. fix
     code review `arithmetic-from-blank` Phase 4).

4. Tests `correction-generator.test.ts` (+5-7 tests) :

   - Cas direct-substitution acceptance
   - Cas L'Hôpital sup acceptance
   - Cas L'Hôpital lycée → fallback Mode A
   - Cas unsupported → fallback Mode A
   - Override level
   - Variable detection auto

5. Étendre fixtures + page debug :

   - `limitDirectSubstitutionDemo` (`lim(x→2) (x²-4)/(x-2)` Tle spé,
     factorisation puis substitution → 4)
   - `limitInfinityDemo` (`lim(x→+∞) (3x²-x)/(x²+1)` Tle spé,
     infinity-analysis → 3)
   - 2 nouvelles cartes dans `+page.svelte` (16 → 18 fixtures)

6. **Svelte autofixer** sur la page debug.

### Code review attendu

`code-reviewer` (Opus) sur la glue Mode B + Svelte.

### Validation

- Tests correction-generator passent
- Snapshot generated-steps-demo passe
- Page debug visible (`pnpm dev -- --port 5175` puis
  `http://localhost:5175/dashboard/admin/debug/correction-mode-b`).

---

## Phase 6 — Quality checks finaux + commit final + doc

### Sous-tâches

1. **ESLint** sur tous les fichiers créés/modifiés.

2. **TypeScript + Svelte** : `pnpm check:incremental`.

3. **Svelte autofixer** sur `+page.svelte` modifié.

4. **Tests régression complets** :

   ```bash
   pnpm test:server src/lib/mathAST/
   pnpm test:server src/lib/questions/
   ```

5. **Doc de progression** : créer `docs/wip/limits-renderer-progress.md`
   sur le modèle de `simplify-stepper-progress.md` ou
   `arithmetic-from-blank-progress.md`. Inclure :

   - Tableau État global (Phase × Status × Commit × Notes)
   - Décisions architecturales validées (Phase 0)
   - Justification du choix Option A
   - Fichiers livrés
   - Tests cumulés
   - Code review (post-livraison) avec les éventuels fixes
   - Limitations connues V1
   - Pistes d'amélioration (post-V1)

6. **Mise à jour des docs principales** :

   - `docs/wip/pedagogical-steppers-mvp-progress.md` :
     - Discriminator 10 → 11 kinds
     - Page debug 16 → 18 fixtures
     - Ajouter entrée « ✅ Mode B `kind: 'limit'` » dans la section
       « Livrés »
     - Retirer « limits » de la liste « Renderers pédagogiques pour
       les autres domaines : limits, matrix, domain » dans « Toujours
       à faire » → reste « matrix, domain »
   - `docs/wip/correction-integration-progress.md` :
     - Extensions post-MVP : 8 → 9 nouveaux kinds
     - Mise à jour fixture count (16 → 18)
     - Mention architecture Option A (réintroduction du pattern
       MVP Phase 2 supprimé `solve/pedagogical-renderer.ts`)

7. **Commit final** : direct (`git commit`) si peu de changements
   conceptuels en Phase 6, ou via `commit-manager` si beaucoup.

   **IMPORTANT** : pas de `Co-Authored-By: Claude` dans aucun commit.

### Validation

- ESLint clean
- check:incremental clean
- Svelte autofixer clean
- 0 régression sur ~12000 tests
- Doc de progression écrite
- Commit final créé

---

## Anti-patterns à éviter

1. **Ne PAS créer un pipeline parallèle `pedagogical-limits/pipeline.ts`**
   qui ré-implémente `evaluate()`. C'est du dual rendering pur sur le
   step recorder algorithmique existant. Si l'agent commence à créer
   un dispatcher qui clone `evaluate.ts` → STOP + demander confirmation.

2. **Ne PAS instrumenter `limits/evaluate.ts` ou autres** directement.
   Le module `limits/` reste **strictement intact** (rétrocompatibilité).

3. **Ne PAS dupliquer `RULE_DESCRIPTIONS`**. Importer depuis
   `limits/step-recorder.ts` (`getRuleDescription`) et l'enrichir par
   niveau dans `pedagogical-limits/descriptions-fr.ts`.

4. **Ne PAS oublier d'ajouter la rule manquante `derivative-definition`**
   dans `RULE_DESCRIPTIONS` du module limits/ original (one-line patch).

5. **Ne PAS émettre des steps vides** (`steps: []`) au top-level. Si
   `evaluate()` retourne `unsupported`, throw `PedagogicalLimitNotImplemented`
   avec message clair.

6. **Ne PAS silently skip les cas L'Hôpital en lycée**. Throw avec
   message explicite (l'utilisateur verra fallback Mode A).

7. **Ne PAS confondre `LimitStep`** (algorithmique, dans `limits/types.ts`)
   **avec un step pédagogique parallèle**. Track A/limits consomme
   directement le PREMIER pour Mode B — pas de remapping en step
   pédagogique distinct.

8. **Ne PAS ajouter `console.warn`** dans le case `'limit'` du
   correction-generator. Silent fallback comme les autres kinds (cf.
   fix code review `arithmetic-from-blank`).

9. **Ne PAS mettre `Co-Authored-By: Claude`** dans les commits.

10. **Ne PAS exécuter `pnpm check`, `pnpm check:fast`, `pnpm build`,
    `pnpm lint`** sur tout le projet. Toujours `pnpm check:incremental`
    et `npx eslint <fichiers>` ciblés.

11. **Ne PAS prendre de décision architecturale unilatérale**. Q1 à Q9
    doivent être validées explicitement par l'utilisateur. Si trade-off
    non couvert émerge, **demander**.

12. **Ne PAS créer un `kind: 'limit-from-blank'`** ou variante similaire
    pour V1. Le pattern `expressions[].value` (cf.
    `arithmetic-from-blank-progress.md`) pourrait être réutilisé en V2
    si besoin, mais pas en V1.

---

## Récap effort estimé

| Phase     | Effort estimé                                       |
| --------- | --------------------------------------------------- |
| 0         | 10-15 min validation Q1-Q9 avec utilisateur         |
| 1         | 30 min types + tests isolation                      |
| 2         | 1.5-2h dispatch + tests (~25 tests)                 |
| 3         | 2-3h descriptions FR + renderer + tests (~30 tests) |
| 4         | 1.5h démos + script CLI + snapshots (~18 cas)       |
| 5         | 1-1.5h Mode B + 2 fixtures + page debug             |
| 6         | 30-45 min quality + doc + commit                    |
| **Total** | **~7-9h en tunnel continu**                         |

Cible : **~70 tests verts spécifiques au feature**, **~700 LOC**,
**5-7 commits intermédiaires**, **0 régression** sur ~12000 tests
existants.

---

## Documents à produire

À la fin du tunnel, l'agent doit avoir produit :

1. `docs/wip/limits-renderer-progress.md` — doc de progression complète,
   incluant **explicitement** la décision Q1 (Option A confirmée) et la
   justification (LimitStep shape parfaite, RULE_DESCRIPTIONS existant,
   dispatch algorithmique pédagogiquement sain).
2. Mise à jour de `docs/wip/pedagogical-steppers-mvp-progress.md`.
3. Mise à jour de `docs/wip/correction-integration-progress.md`.

Lister explicitement ces 3 docs à la toute fin de la conversation
(comme demandé par CLAUDE.md section Planning & Execution Policy).
