# Pedagogical Domain Renderer — Prompt source (v2)

> **Session indépendante.** Ce prompt est auto-suffisant : tout ce qu'il
> faut est listé ci-dessous. L'agent ne doit PAS supposer du contexte
> conversationnel.
>
> **Contexte high-level :** UbuMaths a livré 9 modules pédagogiques de
> step-by-step + glue Mode B avec 11 kinds discriminés. Ce prompt ajoute
> le **renderer pédagogique pour les domaines de définition**. Programme
> cible : **2nde/1ère/Tle spé + sup** (V1 : MVP 5 rules, V1.1 : reste).

---

## ⚠️ AVERTISSEMENT — Diagnostic Phase 0 déjà effectué

**La v1 de ce prompt (datée 2026-05-07) supposait que `computeDomain`
émettait des `EnhancedDomainStep[]` consommables directement
(« Option A — dual rendering pur »). Une analyse empirique a invalidé
cette prémisse :**

- `computeDomain(expr, 'x', { showSteps: true })` retourne **0 step**
  sur tous les cas testés (`√(x-2)`, `1/x`, `ln(x²-1)`, etc.).
  `result.steps` est `undefined`.
- Aucun `steps.push()` dans `compute.ts` (819 LOC). Le paramètre
  `steps: DomainStep[]` est passé partout mais jamais alimenté.
  Plusieurs signatures internes utilisent `_steps` (préfixe = inutilisé).
- `DomainStepRecorder` n'est appelé NULLE PART en production. Toutes
  les références à `recorder.record()` sont dans
  `__tests__/enhanced-steps.test.ts` (tests d'isolation uniquement).
- `DOMAIN_RULE_DESCRIPTIONS` + `DOMAIN_RULE_TEMPLATES` +
  `EnhancedDomainStep` = **infrastructure morte**. Construite, testée
  en isolation, **jamais branchée** au moteur de calcul.

**Conséquence** : Option A telle que définie par la v1 est techniquement
impossible (il n'y a rien à consommer). Trois options de remplacement
ont été évaluées :

| Option | Description                                                                                                                                               | LOC      | Risque divergence                   | Verdict    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------- | ---------- |
| B      | Pipeline parallèle complet (modèle `pedagogical-limits/`)                                                                                                 | ~1500    | élevé (deux moteurs à synchroniser) | rejeté     |
| D      | Dispatcher externe hybride (parse AST + delegate compute.ts)                                                                                              | ~800     | moyen                               | rejeté     |
| **C**  | **Instrumentation directe de `compute.ts`** : ajouter ~30 `recorder.record()` aux bons endroits, le `DomainStepRecorder` existe déjà et est conçu pour ça | **~500** | **nul**                             | **retenu** |

L'infrastructure de recorder dans `domain/` a été manifestement
**pré-câblée** : le paramètre `steps: DomainStep[]` est déjà passé à
6+ fonctions internes, et `domain-step-recorder.ts:99-106` documente
littéralement le pattern d'utilisation depuis compute.ts. **L'auteur
original a préparé le terrain — il manque juste les `.push()`.**

Ajouter des `recorder.record()` n'est PAS un breaking change :
`showSteps: false` reste le défaut, le retour `domain` reste identique,
les ~14000 tests existants restent verts.

---

## Lectures préalables OBLIGATOIRES (par ordre)

### 1. Module cible (à instrumenter)

- `src/lib/mathAST/domain/enhanced-step-types.ts` (~205 LOC) — **À LIRE
  EN ENTIER**. `DomainRule` union de 30 kinds, `EnhancedDomainStep`
  shape (id, rule, description, expression, constraint,
  intermediateDomain?, reasoning?, verbosityLevel), type guards.

- `src/lib/mathAST/domain/step-descriptions.ts` (~153 LOC) —
  `DOMAIN_RULE_DESCRIPTIONS` (couverture 100%) + `DOMAIN_RULE_TEMPLATES`

  - helpers `getDomainRuleDescription`, `applyDomainRuleTemplate`.

- `src/lib/mathAST/domain/domain-step-recorder.ts` (~276 LOC) —
  `DomainStepRecorder` interface + `createDomainStepRecorder()` impl

  - `getNullRecorder()` singleton no-op.

- `src/lib/mathAST/domain/types.ts` (~243 LOC) — Domain types,
  `DomainStep` legacy (à conserver pour rétrocompatibilité signature).

- `src/lib/mathAST/domain/compute.ts` (~819 LOC) — **À LIRE EN ENTIER**
  avant Phase 2. Identifier les ~15-20 sites d'injection
  (un par règle MVP × un par fonction interne).

- `src/lib/mathAST/domain/index.ts` (~281 LOC) — public API.

- `src/lib/mathAST/domain/format.ts` (~257 LOC) — `formatInterval`,
  `formatCondition`, `formatDomainFull`. À réutiliser pour le rendu LaTeX.

### 2. Modèles de référence

- `src/lib/mathAST/pedagogical-limits/` — module récent qui montre la
  shape « renderer + descriptions FR par niveau » et la glue Mode B.
  À étudier pour le renderer (format) **mais pas pour l'architecture**
  (lui était pipeline parallèle, ici c'est instrumentation directe).

- `docs/wip/limits-renderer-progress.md` — modèle de doc de progression.

### 3. Glue Mode B (pattern éprouvé 10 fois)

1. Étendre `GeneratedSteps` discriminator dans `types.ts` (+1 kind, 11 → 12)
2. Étendre `template-schema.ts` (Zod lax + strict)
3. Ajouter case dans `correction-generator.ts`
4. Ajouter 1-2 fixtures dans `__tests__/fixtures/generated-steps-demo.ts`
5. Étendre `__tests__/generated-steps-demo.test.ts` (+ snapshots)
6. Étendre la page debug `+page.svelte` (de 19 à 21 fixtures)
7. Tests `correction-generator.test.ts` (+5-7 par kind)

Fichiers à lire :

- `src/lib/questions/types.ts` — `GeneratedSteps` discriminator (11 kinds)
- `src/lib/questions/template-schema.ts` — schémas Zod
- `src/lib/questions/generator/correction-generator.ts` — switch/case
  sur `kind` (cf. case `'limit'` ou `'differentiate'` comme modèle)

---

## Phase 0 — Spécification TDD : décisions documentées

### Q1 — Architecture : OPTION C retenue (instrumentation directe)

Validée par analyse empirique (cf. avertissement en tête). L'agent **NE
DOIT PAS** retester ni renégocier ce point.

### Q2 — Périmètre V1 : MVP 5 rules

V1 (ce tunnel) :

- `sqrt_constraint` (√u → u ≥ 0)
- `ln_constraint` + `log_constraint` (ln u, log u → u > 0)
- `division_constraint` (1/u → u ≠ 0)
- `arcsin_constraint` + `arccos_constraint` (-1 ≤ u ≤ 1)
- `intersection` (combinaison de contraintes)

V1.1 (post-MVP, prompt séparé après validation V1) :

- `tan_constraint` / `cot_constraint` / `sec_constraint` / `csc_constraint`
  (`periodic_exclusion`)
- `preimage_linear` / `preimage_quadratic` (résolution)
- `composition` / `composition_range_analysis`
- `union` / `complement` / `difference`
- `power_constraint` / `even_root_constraint`
- `arccosh_constraint` / `arctanh_constraint` (sup uniquement)
- Cas spéciaux `universal` / `empty` / `periodic_exclusion`

**Justification MVP** : couvre ~80% des cas niveau 2nde-1ère. Permet
de valider l'architecture (instrumentation + renderer 3-lignes) sur
des cas simples avant d'investir dans les rules complexes.

### Q3 — Niveaux scolaires : lycée + supérieur

| Niveau      | Couvert                                     |
| ----------- | ------------------------------------------- |
| `primaire`  | Refus via `PedagogicalDomainNotImplemented` |
| `college`   | Refus (la 2nde est lycée en France)         |
| `lycee`     | Toutes les 5 rules MVP                      |
| `superieur` | 5 rules MVP + vocabulaire compact           |

### Q4 — Format renderer : ALIGNED 3-LIGNES

```latex
\begin{aligned}
  &\text{Expression : } \sqrt{x-2} \\
  &\text{Contrainte : } x - 2 \geq 0 \\
  &\text{Domaine : } [2, +\infty[
\end{aligned}
```

Justification : `EnhancedDomainStep` expose `intermediateDomain` —
c'est précisément l'information que l'élève cherche. Le format
statement-oriented (« expr ⟹ constraint ») le relègue au texte parlé.
Le 3-lignes montre la chaîne complète.

Si `intermediateDomain` absent, fallback 2-lignes (expression + contrainte
seulement).

### Q5 — Démos catégorisées : 5 catégories MVP

- `racines` (3 cas : `√(x-2)`, `√(2x+3)`, `√(x²+1)` universel) — `sqrt_constraint`
- `logarithmes` (3 cas : `ln(x-1)`, `log(2x+1)`, `ln(5)` universel) — `ln/log_constraint`
- `fractions` (3 cas : `1/x`, `1/(x+2)`, `(2x)/(x²+1)` universel) — `division_constraint`
- `arcs-trigo` (2 cas : `arcsin(x)`, `arccos(x/2)`) — `arcsin/arccos_constraint`
- `compositions-mixtes` (3 cas : `√x/(x-1)`, `ln(x)/x`, `1/√(x-1)`) — `intersection`

Total V1 : ~14 cas démo.

### Q6 — `kind: 'domain'` (singulier, cohérent avec `'limit'`, `'differentiate'`).

### Q7 — Inputs Mode B :

```ts
| {
    readonly kind: 'domain';
    /** Template expression of f(x) — supports {{a}}, etc. */
    readonly expression: string;
    /** Variable. Defaults to 'x'. */
    readonly variable?: string;
    readonly options?: GeneratedStepsOptions;
  }
```

### Q8 — Throw `PedagogicalDomainNotImplemented` cohérent

Catch dans correction-generator → silent fallback Mode A (pas de
`console.warn`, cf. fix code review `arithmetic-from-blank`).

### Q9 — Cible chiffrée

- ~500 LOC totales (instrumentation compute.ts ~150 + renderer ~250 + Mode B ~100)
- ~50 tests
- 5-7h en tunnel

### Q10 — Sub-conditions (intersection)

Pour `√x / (x-1)` : 3 steps individuels :

1. `sqrt_constraint` (√x → x ≥ 0)
2. `division_constraint` (x-1 ≠ 0 → x ≠ 1)
3. `intersection` (x ≥ 0 ET x ≠ 1 → `[0, 1[ ∪ ]1, +∞[`)

Renderer affiche les 3 steps. Si répétitif visuellement, considérer
wrapping en V1.1.

### Q11 — Verbosity gating

`reasoning` field (template `applyDomainRuleTemplate`) émis par
défaut au niveau `'detailed'`, omis au niveau `'summarized'` ou
`'result'`. Géré par `DomainStepRecorder.getStepsFiltered(verbosity)`
existant.

### Critères d'acceptation

- 0 régression sur ~14000 tests `mathAST + math + geometry-core/compute`
- Renderer opérationnel sur les 5 catégories MVP
- Refus primaire/college via throw + fallback Mode A
- Vocabulary niveau-aware (lycée didactique vs sup compact)
- Mode B `kind: 'domain'` intégré + 2 fixtures
- Page debug étendue (19 → 21 fixtures)
- 0 erreur ESLint, 0 nouvelle erreur TS
- Doc de progression `docs/wip/domain-renderer-progress.md` écrite
- Code review `code-reviewer` (Opus) après chaque phase
- Commits sans `Co-Authored-By: Claude` (cf. CLAUDE.md global)

---

## Phase 1 — Types `pedagogical-domain/types.ts`

### Sous-tâches

1. Créer `PedagogicalDomainSchoolLevel = Exclude<SchoolLevel, 'primaire' | 'college'>`.

2. Créer `PedagogicalDomainOptions` :

   ```ts
   export interface PedagogicalDomainOptions {
   	readonly schoolLevel: PedagogicalDomainSchoolLevel;
   	readonly expression: string; // LaTeX template
   	readonly variable?: string; // default 'x'
   	readonly verbosity?: Verbosity;
   	readonly signal?: AbortSignal;
   	readonly timeoutMs?: number;
   }
   ```

3. Créer `PedagogicalDomainResult` :

   ```ts
   export interface PedagogicalDomainResult {
   	readonly steps: readonly EnhancedDomainStep[]; // émis par compute instrumenté
   	readonly domain: Domain;
   	readonly variable: string;
   }
   ```

4. `class PedagogicalDomainNotImplemented extends Error` (exporté).

5. Strategy par niveau :

   ```ts
   export interface DomainGenerationStrategy {
   	readonly vocab: 'didactic' | 'compact';
   	readonly verbosityCompactConclusion: boolean;
   }

   export const STRATEGIES_DOMAIN: Readonly<
   	Record<PedagogicalDomainSchoolLevel, DomainGenerationStrategy>
   > = {
   	lycee: { vocab: 'didactic', verbosityCompactConclusion: false },
   	superieur: { vocab: 'compact', verbosityCompactConclusion: true }
   };
   ```

6. Tests d'isolation des types (`@ts-expect-error` + smoke runtime).

### Code review attendu

`code-reviewer` (Opus) sur le diff types.

### Validation

- Compile clean (`pnpm check:incremental` ciblé)
- Tests d'isolation passent

---

## Phase 2 — **Instrumentation `domain/compute.ts`** (cœur)

> **Cette phase est le cœur du travail.** Elle modifie `compute.ts` en
> place pour brancher le `DomainStepRecorder` aux 5 rules MVP.

### Stratégie

1. **Étendre `ComputeDomainOptions`** :

   ```ts
   export interface ComputeDomainOptions {
   	showSteps?: boolean;
   	verbosity?: Verbosity; // NEW
   	recorder?: DomainStepRecorder; // NEW (optional injection)
   }
   ```

2. **Modifier `computeDomain`** pour utiliser un recorder réel quand
   `showSteps: true` :

   ```ts
   export function computeDomain(
   	expr: MathNode,
   	variable: string = 'x',
   	options: ComputeDomainOptions = {}
   ): DomainResult {
   	const recorder =
   		options.recorder ?? (options.showSteps ? createDomainStepRecorder() : getNullRecorder());
   	const legacySteps: DomainStep[] = []; // rétrocompat
   	const domain = computeDomainNode(expr, variable, legacySteps, options, recorder);

   	return {
   		domain,
   		variable,
   		...(options.showSteps && legacySteps.length > 0 ? { steps: legacySteps } : {})
   	};
   }
   ```

   **Note rétrocompatibilité** : on conserve `DomainStep[]` legacy pour
   ne rien casser, on ajoute `recorder` en parallèle. Le legacy reste
   vide (personne ne le consomme), mais la signature publique ne change pas.

3. **Cabler le recorder dans les fonctions internes** (~5 sites pour MVP) :

   - **`computeFunctionDomain`** (`compute.ts:353-412`) :

     ```ts
     // Avant : computePreimage
     const constraintRule = getConstraintRuleForFunction(node.name);
     if (constraintRule && options.showSteps) {
     	const argLatex = renderToLatex(arg); // helper à créer
     	const constraint = renderConstraint(node.name, arg);
     	recorder.recordWithTemplate(
     		constraintRule,
     		argLatex,
     		constraint,
     		{ expr: argLatex },
     		{ intermediateDomain: preimage ?? undefined, verbosityLevel: 'summarized' }
     	);
     }
     ```

     Sites concernés : `sqrt`, `ln`, `log`, `arcsin`, `arccos`.

   - **`computeDivisionDomain`** (`compute.ts:323-348`) :

     ```ts
     if (zeros.length > 0 && options.showSteps) {
       const denomLatex = renderToLatex(node.denominator);
       const constraint = `${denomLatex} \\neq 0`;
       recorder.record(
         'division_constraint',
         denomLatex,
         constraint,
         { intermediateDomain: ...,
           verbosityLevel: 'summarized',
           reasoning: applyDomainRuleTemplate('division_constraint', { expr: denomLatex }) }
       );
     }
     ```

   - **`intersect` calls** : émettre un step `intersection` quand on
     combine ≥ 2 sous-domaines non-universels. Site : à la fin de
     `computeFunctionDomain` / `computeDivisionDomain` pour les cas
     composites.

4. **Helper `renderToLatex(node: MathNode): string`** :
   - Utiliser `serializeToLatex` existant (à grep dans
     `src/lib/mathAST/serialize/` ou similar).
   - Si pas dispo, fallback simple : reconstruire LaTeX depuis le
     MathNode. Mais en réalité il existe déjà — le grep le confirmera.

### Sous-tâches

1. Lire `compute.ts` en entier pour identifier les sites d'injection précis.
2. Identifier le helper `renderToLatex` existant (grep `serializeToLatex`,
   `nodeToLatex`, `mathNodeToLatex`, `latexFromAST`).
3. Étendre `ComputeDomainOptions` (recorder + verbosity).
4. Câbler `computeDomain` (instancier le recorder).
5. Câbler les 5 sites d'injection MVP.
6. Tests `__tests__/compute-instrumented.test.ts` (~15-20 tests) :
   - Chaque rule MVP émet ≥ 1 step quand `showSteps: true`
   - Step contient les bons champs (rule, expression, constraint,
     intermediateDomain quand applicable)
   - `showSteps: false` n'émet rien (rétrocompat)
   - Composition (`√x/(x-1)`) émet 3 steps (sqrt + division + intersection)
   - 0 régression sur tests existants de `domain/`

### Code review attendu

`code-reviewer` (Opus) sur le diff compute.ts + tests instrumentation.
Vérifier en particulier :

- Aucune modification du retour `domain` (pure addition)
- Pas de coût de calcul ajouté quand `showSteps: false` (NullRecorder)
- Pas de fuite du recorder dans les signatures publiques

### Validation

- Tests instrumentation passent
- 0 régression sur `domain/` (~600 tests existants)
- Tests `enhanced-steps.test.ts` passent (recorder en isolation)

---

## Phase 3 — Renderer + descriptions FR enrichies

### Sous-tâches

1. Créer `pedagogical-domain/dispatch.ts` :

   ```ts
   export function generatePedagogicalDomainSteps(
   	options: PedagogicalDomainOptions
   ): PedagogicalDomainResult {
   	const { schoolLevel, expression, variable = 'x', verbosity = 'detailed' } = options;
   	assertSupportedLevel(schoolLevel);

   	const expr = parseLatex(expression);
   	const recorder = createDomainStepRecorder();
   	const result = computeDomain(expr, variable, {
   		showSteps: true,
   		verbosity,
   		recorder
   	});

   	return {
   		steps: recorder.getStepsFiltered(verbosity),
   		domain: result.domain,
   		variable: result.variable ?? variable
   	};
   }
   ```

2. Créer `pedagogical-domain/descriptions-fr.ts` (~200 LOC) :

   - Réutiliser `DOMAIN_RULE_DESCRIPTIONS` baseline (lycée).
   - `LYCEE_TITLES` per `DomainRule` MVP (5 entries).
   - `SUPERIEUR_TITLES` per `DomainRule` MVP (5 entries, vocabulaire compact).
   - Helper `getTitleForLevel(rule, level): string`.

3. Créer `pedagogical-domain/renderer.ts` (~150 LOC) :

   - `class PedagogicalDomainRenderer implements StepRenderer<EnhancedDomainStep, PedagogicalRenderOptions>`
   - `render(step, options): RenderedStep` :
     - title = `getTitleForLevel(step.rule, level)`
     - explanation gated by verbosity (utilise `step.reasoning`)
     - expressionLatex via `formatStepLatex(step)` — **format aligned
       3-lignes** (Q4) :
       ```latex
       \begin{aligned}
         &\text{Expression : } <step.expression> \\
         &\text{Contrainte : } <step.constraint> \\
         &\text{Domaine : } <formatDomainFull(step.intermediateDomain)>
       \end{aligned}
       ```
       Si `intermediateDomain` absent, fallback 2-lignes (sans la 3ᵉ).
   - `renderAll(steps, options): readonly RenderedStep[]`
   - `assertSupportedLevel(level)` : refuse primaire + college

4. Tests `__tests__/renderer.test.ts` (~20-25 tests) :
   - TITLES par niveau pour les 5 rules MVP
   - EXPLANATIONS gating par verbosity
   - Refus primaire/college
   - Format aligned 3-lignes (avec et sans intermediateDomain)
   - Vocabulary lycée didactique vs sup compact

### Code review attendu

`code-reviewer` (Opus) sur dispatch + descriptions + renderer.

### Validation

- Tests renderer passent
- Visuellement vérifiable via démo CLI (Phase 4)

---

## Phase 4 — Démos catégorisées + script CLI

### Sous-tâches

1. Créer `pedagogical-domain/demo-cases/` (5 catégories MVP cf. Q5) :

   - `racines.ts` (3 cas)
   - `logarithmes.ts` (3 cas)
   - `fractions.ts` (3 cas)
   - `arcs-trigo.ts` (2 cas)
   - `compositions-mixtes.ts` (3 cas)
   - `index.ts` agrégateur

2. Créer `pedagogical-domain/demo-helpers.ts` :

   - `presentDomain(label, options, format: 'custom' | 'latex' | 'both')`

3. Créer `__tests__/pedagogical-domain-demo.test.ts` avec snapshots
   (~14 cas).

4. Créer `scripts/pedagogical-domain-demo.ts` (CLI standalone) :

   - Filtre par catégorie
   - Flags `--latex` / `--custom` / `--both`
   - Substitutions cosmétiques : `\\dfrac{a}{b}` → `(a)/(b)`,
     `\\sqrt{x}` → `√(x)`, `\\mathbb{R}` → `ℝ`, `\\emptyset` → `∅`,
     `\\cup` → `∪`, `\\cap` → `∩`, `\\geq` → `≥`, `\\leq` → `≤`,
     `\\neq` → `≠`, `\\begin{aligned}...\\end{aligned}` → multi-lignes ANSI

5. Vérifier que le CLI tourne :
   ```bash
   pnpm tsx scripts/pedagogical-domain-demo.ts racines
   pnpm tsx scripts/pedagogical-domain-demo.ts --latex
   pnpm tsx scripts/pedagogical-domain-demo.ts compositions-mixtes
   ```

### Code review attendu

`code-reviewer` (Opus) sur snapshots + CLI.

### Validation

- ~14 snapshots stables
- CLI fonctionne
- 0 régression

---

## Phase 5 — Mode B : `kind: 'domain'`

### Sous-tâches

1. Étendre `src/lib/questions/types.ts` :

   - Ajouter `'domain'` au `kind` de `GeneratedSteps` (11 → 12 kinds).
   - Type narrowing :
     ```ts
     | {
         readonly kind: 'domain';
         readonly expression: string;
         readonly variable?: string;
         readonly options?: GeneratedStepsOptions;
       }
     ```

2. Étendre `src/lib/questions/template-schema.ts` :

   - Ajouter le membre `domain` au discriminator Zod (lax + strict).

3. Étendre `src/lib/questions/generator/correction-generator.ts` :

   - Imports : `generatePedagogicalDomainSteps`,
     `PedagogicalDomainRenderer`, `PedagogicalDomainNotImplemented`.
   - Case `'domain'` dans le switch principal.
   - Bump `'primaire' | 'college'` → `'lycee'`.
   - Catch `PedagogicalDomainNotImplemented` → silent fallback Mode A
     (pas de `console.warn`).

4. Tests `correction-generator.test.ts` (+5-7 tests) :

   - sqrt acceptance
   - composition acceptance (`√x/(x-1)`)
   - Bump primaire/college
   - Fallback notImplemented (cas pathologique)
   - Override level
   - Variable detection auto

5. Étendre fixtures + page debug :

   - `domainSqrtFractionDemo` (`f(x) = √x/(x-1)` 1ère, attendu `[0,1[ ∪ ]1,+∞[`)
   - `domainArcsinDemo` (`f(x) = arcsin(2x)` Tle, attendu `[-1/2, 1/2]`)
   - 2 nouvelles cartes dans `+page.svelte` (19 → 21 fixtures)

6. **Svelte autofixer** sur la page debug.

### Code review attendu

`code-reviewer` (Opus) sur la glue Mode B + Svelte.

### Validation

- Tests correction-generator passent
- Snapshot generated-steps-demo passe
- Page debug visible (`pnpm dev -- --port 5175` puis
  `http://localhost:5175/dashboard/admin/debug/correction-mode-b`).

---

## Phase 6 — Quality + doc + commit

### Sous-tâches

1. **ESLint** sur tous les fichiers créés/modifiés.

2. **TypeScript + Svelte** : `pnpm check:incremental`.

3. **Svelte autofixer** sur `+page.svelte` modifié.

4. **Tests régression complets** :

   ```bash
   pnpm test:server src/lib/mathAST/
   pnpm test:server src/lib/questions/
   ```

5. **Doc de progression** : créer `docs/wip/domain-renderer-progress.md`
   sur le modèle de `limits-renderer-progress.md`. Inclure :

   - Tableau État global (Phase × Status × Commit × Notes)
   - **Décision Q1 documentée explicitement** : Option C (instrumentation
     directe) retenue suite à invalidation empirique de Option A par v1
     du prompt
   - Outputs des cas test empiriques pre-instrumentation (0 step émis)
     vs post-instrumentation (steps émis)
   - Justification du choix
   - Liste des sites d'injection effectifs dans compute.ts
   - Fichiers livrés
   - Tests cumulés
   - Code review (post-livraison) avec les éventuels fixes
   - Limitations connues V1 (= scope V1.1 explicite)
   - Pistes d'amélioration

6. **Mise à jour des docs principales** :

   - `docs/wip/pedagogical-steppers-mvp-progress.md` :
     - Discriminator 11 → 12 kinds
     - Page debug 19 → 21 fixtures
     - Ajouter entrée « ✅ Mode B `kind: 'domain'` (V1 MVP) »
     - Ajouter ligne « Restant : `domain` V1.1 (composition,
       periodic_exclusion, hyperboliques inverses, preimage_quadratic) »
   - `docs/wip/correction-integration-progress.md` :
     - Extensions post-MVP : 9 → 10 nouveaux kinds
     - Mise à jour fixture count (19 → 21)
     - Mention architecture Option C (instrumentation directe)

7. **Commit final** : direct (`git commit`) si peu de changements
   conceptuels en Phase 6, ou via `commit-manager` si beaucoup.

   **IMPORTANT** : pas de `Co-Authored-By: Claude` dans aucun commit.

### Validation

- ESLint clean
- check:incremental clean
- Svelte autofixer clean
- 0 régression sur ~14000 tests
- Doc de progression écrite (avec **décision Q1 documentée**)
- Commit final créé

---

## Anti-patterns à éviter

1. **Ne PAS modifier la valeur de retour `domain` dans compute.ts**.
   L'instrumentation est PURE addition : on enrichit `steps`, on ne
   change rien d'autre. Les ~600 tests existants de `domain/` doivent
   rester verts sans modification.

2. **Ne PAS supprimer le paramètre `steps: DomainStep[]` legacy** des
   signatures internes de compute.ts. Rétrocompatibilité signature.
   Ajouter `recorder` en paramètre supplémentaire (ou option).

3. **Ne PAS dupliquer `DOMAIN_RULE_DESCRIPTIONS` ou `DOMAIN_RULE_TEMPLATES`**.
   Importer depuis `domain/step-descriptions.ts`. Enrichir par niveau
   dans `pedagogical-domain/descriptions-fr.ts` (TITLES override
   conditional).

4. **Ne PAS oublier `applyDomainRuleTemplate`** : utiliser pour générer
   les explanations contextuelles avec `{expr}`, `{op}`, `{bound}`.

5. **Ne PAS instrumenter les rules HORS V1 MVP** (composition,
   periodic*exclusion, preimage*\*, etc.). Elles attendent V1.1. Si
   `computeDomain` rencontre une rule non-V1 et `showSteps: true`, le
   recorder reste silencieux pour cette branche (steps partiels OK,
   c'est le comportement V1).

6. **Ne PAS émettre des steps vides** (`steps: []`) au top-level. Si
   `computeDomain` retourne 0 step pour le cas universel (ex: `f(x) = x`),
   émettre 1 step `universal` avec description « Aucune restriction
   particulière, le domaine est ℝ ».

7. **Ne PAS silently skip les cas hors scope V1**. Throw
   `PedagogicalDomainNotImplemented` avec message explicite quand
   l'expression demande des rules V1.1 (l'utilisateur verra fallback
   Mode A).

8. **Ne PAS confondre `DomainStep`** (legacy, dans `domain/types.ts`)
   **avec `EnhancedDomainStep`** (pédagogique, dans
   `domain/enhanced-step-types.ts`). Le renderer pédagogique consomme
   le SECOND.

9. **Ne PAS ajouter `console.warn`** dans le case `'domain'` du
   correction-generator. Silent fallback comme les autres kinds.

10. **Ne PAS mettre `Co-Authored-By: Claude`** dans les commits.

11. **Ne PAS exécuter `pnpm check`, `pnpm check:fast`, `pnpm build`,
    `pnpm lint`** sur tout le projet. Toujours `pnpm check:incremental`
    et `npx eslint <fichiers>` ciblés.

12. **Ne PAS prendre de décision architecturale unilatérale**. Q1 est
    tranché (Option C). Pour toute autre décision (helper `renderToLatex`
    introuvable ? site d'injection ambigu ? scope V1 borderline ?),
    **demander**.

13. **Ne PAS modifier la signature publique `computeDomain`** de manière
    breaking. Ajouter des champs OPTIONNELS dans `ComputeDomainOptions`,
    jamais en supprimer ou en rendre obligatoires.

---

## Récap effort estimé

| Phase     | Effort estimé                                                    |
| --------- | ---------------------------------------------------------------- |
| 0         | 0 min (Q1-Q11 déjà tranchés dans ce prompt)                      |
| 1         | 30 min types + tests isolation                                   |
| 2         | **2-3h instrumentation compute.ts + tests (~20 tests)**          |
| 3         | 1.5-2h dispatch + descriptions FR + renderer + tests (~20 tests) |
| 4         | 1-1.5h démos + script CLI + snapshots (~14 cas)                  |
| 5         | 1-1.5h Mode B + 2 fixtures + page debug                          |
| 6         | 30-45 min quality + doc + commit                                 |
| **Total** | **~7-9h en tunnel continu**                                      |

Cible : ~50 tests verts, ~500 LOC, 5-7 commits.

---

## Documents à produire

À la fin du tunnel, l'agent doit avoir produit :

1. `docs/wip/domain-renderer-progress.md` — doc de progression complète,
   incluant **explicitement** :
   - La décision Q1 (Option C — instrumentation directe) et la trace
     du diagnostic empirique pre-implémentation (0 step émis par
     `computeDomain` initial)
   - Liste des sites d'injection effectifs dans `compute.ts` (pour
     reproductibilité et review)
   - Scope V1 MVP livré + scope V1.1 explicite (tickets/prompts à
     créer ensuite)
2. Mise à jour de `docs/wip/pedagogical-steppers-mvp-progress.md`.
3. Mise à jour de `docs/wip/correction-integration-progress.md`.

Lister explicitement ces 3 docs à la toute fin de la conversation
(comme demandé par CLAUDE.md section Planning & Execution Policy).
