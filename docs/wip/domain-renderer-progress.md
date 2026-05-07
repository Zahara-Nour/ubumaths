# Pedagogical Domain Renderer — Progression

> Source : `docs/wip/domain-renderer-prompt.md` (v2)
> Architecture : **Option C (instrumentation directe `domain/compute.ts`)** — invalidation empirique d'Option A en Phase 0
> Date démarrage : 2026-05-07

## Décision architecturale clé (Phase 0)

L'analyse empirique du module `domain/` a démontré qu'**Option A (dual rendering pur sur step recorder algorithmique)** était techniquement impossible : il n'y avait rien à consommer.

### Probe empirique pre-instrumentation

Cas test obligatoires de Phase 0 (script `probe-domain-steps.ts`, depuis effacé) :

```ts
for (const latex of [
	'\\sqrt{x - 2}',
	'\\dfrac{1}{x}',
	'\\ln(x^2 - 1)',
	'\\dfrac{\\sqrt{x}}{x - 1}',
	'\\arcsin(2x)',
	'\\dfrac{1}{x^2 - 4}',
	'\\sqrt{x^2 - 9}'
]) {
	const result = computeDomain(parseLatex(latex), 'x', { showSteps: true });
	console.log(result.steps);
}
```

| Cas test         | `result.steps` |
| ---------------- | -------------- |
| `\sqrt{x-2}`     | `undefined`    |
| `1/x`            | `undefined`    |
| `\ln(x^2-1)`     | `undefined`    |
| `\sqrt{x}/(x-1)` | `undefined`    |
| `\arcsin(2x)`    | `undefined`    |
| `1/(x^2-4)`      | `undefined`    |
| `\sqrt{x^2-9}`   | `undefined`    |

**0 step émis sur 7 cas, même avec `showSteps: true`.**

### Constat technique

- `compute.ts` (819 LOC) contient 0 `steps.push()`. Le paramètre `steps: DomainStep[]` est passé partout mais jamais alimenté. Plusieurs signatures internes utilisent `_steps` (préfixe = inutilisé).
- `DomainStepRecorder` n'est appelé NULLE PART en production. Toutes les références à `recorder.record()` sont dans `__tests__/enhanced-steps.test.ts` (tests d'isolation).
- `DOMAIN_RULE_DESCRIPTIONS` + `DOMAIN_RULE_TEMPLATES` + `EnhancedDomainStep` : infrastructure construite, testée en isolation, **jamais branchée**.

### Trois options évaluées

| Option | Description                                               | LOC      | Risque divergence | Verdict    |
| ------ | --------------------------------------------------------- | -------- | ----------------- | ---------- |
| B      | Pipeline parallèle complet (modèle `pedagogical-limits/`) | ~1500    | élevé             | rejeté     |
| D      | Dispatcher externe hybride                                | ~800     | moyen             | rejeté     |
| **C**  | **Instrumentation directe `compute.ts`**                  | **~500** | **nul**           | **retenu** |

L'infrastructure recorder dans `domain/` était manifestement **pré-câblée** : `domain-step-recorder.ts:99-106` documente littéralement le pattern d'utilisation depuis compute.ts. L'auteur original avait préparé le terrain — il manquait juste les `.push()`.

## Décisions Phase 0 — validées avec utilisateur

- **Q1** Architecture **Option C** (instrumentation directe `compute.ts`) ✓
- **Q2** Périmètre V1 MVP : 5 rules (`sqrt`, `ln/log`, `division`, `arcsin/arccos`, `intersection`). V1.1 = reste ✓
- **Q3** `lycee + superieur` uniquement (refus `primaire | college`) ✓
- **Q4** Format renderer **aligned 3-lignes** : Expression / Contrainte / Domaine ✓
- **Q5** 5 catégories MVP : racines, logarithmes, fractions, arcs-trigo, compositions-mixtes (~14 cas) ✓
- **Q6** `kind: 'domain'` (singulier, cohérent avec `'limit'`, `'differentiate'`, `'integrate'`) ✓
- **Q7** Schéma Mode B simple : `expression` LaTeX + `variable?` + `options?` ✓
- **Q8** Silent fallback aligné sur autres kinds (catch `PedagogicalDomainNotImplemented` → null) ✓
- **Q9** Cible : ~500 LOC, ~50 tests, 5-7h (révisé en cours : 7-9h, ~80 tests) ✓
- **Q10** Steps individuels rendus séparément (sub-conditions). V1.1 si répétitif ✓
- **Q11** Verbosity gating via `getStepsFiltered` existant ✓

## Phases livrées

### ✅ Phase 1 — Types `pedagogical-domain/types.ts`

**Fichiers** :

- `src/lib/mathAST/pedagogical-domain/types.ts` (~165 LOC)
- `src/lib/mathAST/pedagogical-domain/__tests__/types.test.ts` (10 tests verts)

**Contenu** :

- `PedagogicalDomainSchoolLevel = Exclude<SchoolLevel, 'primaire' | 'college'>`
- `V1_MVP_RULES` — Set<DomainRule> des 9 rules MVP (5 constraints + intersection + universal/empty)
- `DomainGenerationStrategy` + `STRATEGIES_DOMAIN` (lycee didactic, superieur compact)
- `PedagogicalDomainOptions` (typed entry point)
- `PedagogicalDomainResult` (steps + domain + variable)
- `class PedagogicalDomainNotImplemented extends Error`

### ✅ Phase 2 — Instrumentation `domain/compute.ts` (cœur)

**Fichiers modifiés** :

- `src/lib/mathAST/domain/compute.ts` (+~70 LOC : imports, options, 3 sites)
- `src/lib/mathAST/pedagogical-domain/__tests__/compute-instrumented.test.ts` (20 tests verts)

**Sites d'injection (3)** :

1. **`computeFunctionDomain`** (compute.ts:430-451) — émet une constraint pour les 5 fonctions MVP via `getConstraintRuleForFunction(node.name)` + `V1_MVP_FUNCTION_CONSTRAINT_RULES.has(rule)`. Carry `intermediateDomain: preimage`.

2. **`computeDivisionDomain`** (compute.ts:355-376) — émet `division_constraint` quand `zeros.length > 0`. Carry `intermediateDomain: domain` (post-exclusion).

3. **`computeDomain` top-level** (compute.ts:248-281) — instancie le recorder si `showSteps: true && !options.recorder`. Émet `intersection` si `constraintsEmitted > 1 && domain.kind !== 'universal' && domain.kind !== 'empty'`.

**Helpers locaux ajoutés** :

- `V1_MVP_FUNCTION_CONSTRAINT_RULES` (Set local pour éviter import circulaire avec pedagogical-domain/)
- `buildConstraintLatex(rule, argLatex)` — produit la RHS (« x - 2 \geq 0 », « x \neq 0 », …)

**API publique étendue** (rétrocompatible) :

```ts
export interface ComputeDomainOptions {
	showSteps?: boolean;
	verbosity?: Verbosity; // NEW
	recorder?: DomainStepRecorder; // NEW
}
```

**Rétrocompatibilité confirmée** : 757 tests `domain/` existants passent sans modification (l'instrumentation est pure addition).

### ✅ Phase 3 — Dispatch + descriptions + renderer

**Fichiers** :

- `src/lib/mathAST/pedagogical-domain/dispatch.ts` (~165 LOC) — `generatePedagogicalDomainSteps(MathNode, options)` (typed) + `dispatchPedagogicalDomain({ expression, variable?, schoolLevel, verbosity? })` (string Mode B)
- `src/lib/mathAST/pedagogical-domain/descriptions-fr.ts` (~100 LOC) — `LYCEE_TITLES`/`SUPERIEUR_TITLES` + `LYCEE_EXPLANATIONS`/`SUPERIEUR_EXPLANATIONS` per V1 MVP rule
- `src/lib/mathAST/pedagogical-domain/renderer.ts` (~135 LOC) — `class PedagogicalDomainRenderer` avec format aligned 3-lignes
- `src/lib/mathAST/pedagogical-domain/index.ts` (~30 LOC) — public barrel
- `src/lib/mathAST/pedagogical-domain/__tests__/dispatch.test.ts` (16 tests verts)
- `src/lib/mathAST/pedagogical-domain/__tests__/renderer.test.ts` (20 tests verts)

**Format aligned 3-lignes** (Q4 retenu) :

```latex
\begin{aligned}
  &\text{Expression : } \textcolor{blue}{x - 2} \\
  &\text{Contrainte : } x - 2 \geq 0 \\
  &\text{Domaine : } [2 ; +\infty[
\end{aligned}
```

Cas spéciaux :

- `intersection` step : seule la ligne « Domaine : » (les 2 premières seraient redondantes avec les sous-steps précédents).
- `universal` step : `\mathbb{R}` directement.
- `empty` step : `\emptyset` directement.

**Conversion Unicode → LaTeX** : `formatInterval(domain)` retourne `[2 ; +∞[` avec Unicode `∞`/`ℝ`/`∅`/`≤`/`∩`/`∪`. Le renderer convertit vers LaTeX (`\\infty`, `\\mathbb{R}`, etc.).

**Note design** : `PedagogicalDomainRenderer` n'implémente pas formellement `StepRenderer<EnhancedDomainStep, ...>` parce que `EnhancedDomainStep` ne dérive pas de `BaseStep` (pas de `before`/`after` MathNode). Il expose la même shape (`render` + `renderAll`) — duck-typing.

### ✅ Phase 4 — Démos catégorisées + script CLI

**Fichiers** :

- `src/lib/mathAST/pedagogical-domain/demo-helpers.ts` (~135 LOC) — `presentDomain(testCase, format)`
- `src/lib/mathAST/pedagogical-domain/demo-cases/` (5 catégories MVP, ~14 cas total) :
  - `racines.ts` (3 cas)
  - `logarithmes.ts` (3 cas)
  - `fractions.ts` (3 cas)
  - `arcs-trigo.ts` (2 cas)
  - `compositions-mixtes.ts` (3 cas)
  - `index.ts` aggregator (`ALL_CATEGORIES`)
- `src/lib/mathAST/pedagogical-domain/__tests__/pedagogical-domain-demo.test.ts` (14 snapshots)
- `scripts/pedagogical-domain-demo.ts` CLI standalone

**CLI** : `pnpm tsx scripts/pedagogical-domain-demo.ts [<category>...] [--latex|--custom]`

Format custom (défaut) : ASCII / Unicode-friendly, ANSI bold-blue (TTY only).

Format latex (`--latex`) : aligned LaTeX, stable pour snapshots.

### ✅ Phase 5 — Mode B `kind: 'domain'`

**Fichiers modifiés** :

- `src/lib/questions/types.ts` — ajout `'domain'` au discriminator (11 → 12 kinds)
- `src/lib/questions/template-schema.ts` — `generatedStepsDomain` (lax) + `generatedStepsDomainStrictZ` (strict)
- `src/lib/questions/generator/correction-generator.ts` — case `'domain'` dans le switch + `renderDomain()` (silent fallback `PedagogicalDomainNotImplemented` → null)
- `src/lib/questions/generator/correction-generator.test.ts` — 7 nouveaux tests Mode B (52 → 59)
- `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts` — 2 nouvelles fixtures :
  - `domainSqrtFractionDemo` : `f(x) = √x/(x-1)` 1ère spé → `[0;1[ ∪ ]1;+∞[`
  - `domainArcsinDemo` : `f(x) = arcsin(2x)` Tle spé → `[-1/2;1/2]`
- `src/lib/questions/__tests__/generated-steps-demo.test.ts` — 2 nouveaux tests E2E (22 → 24, +2 snapshots)
- `src/routes/(protected)/dashboard/admin/debug/correction-mode-b/+page.svelte` — 2 nouvelles cartes (18 → 20 fixtures, 36 → 40 cards)

### ✅ Phase 6 — Quality + doc + commit

- ✓ ESLint : 0 erreur sur fichiers modifiés
- ✓ TypeScript + Svelte : `pnpm check:incremental` — **0 nouvelle erreur** (les 9 ERRORS pré-existantes dans `slides/` et `extern/` étaient là avant)
- ✓ 13313 tests `mathAST/` passent (incluant les 80 nouveaux pédagogiques)
- ✓ 2184 tests `questions/` passent (sauf 11 échecs **pré-existants** sur `main`, validés via `git stash`)
- ✓ Doc de progression (ce fichier)

## Tableau récapitulatif

| Phase | Status | Fichiers livrés                                                                            | Tests |
| ----- | ------ | ------------------------------------------------------------------------------------------ | ----- |
| 0     | ✅     | (probe empirique éphémère)                                                                 | —     |
| 1     | ✅     | types.ts, types.test.ts                                                                    | 10 ✓  |
| 2     | ✅     | compute.ts (instr.), compute-instrumented.test.ts                                          | 20 ✓  |
| 3     | ✅     | dispatch.ts, descriptions-fr.ts, renderer.ts, index.ts, dispatch.test.ts, renderer.test.ts | 36 ✓  |
| 4     | ✅     | demo-helpers.ts, 5 demo-cases, demo aggregator, snapshot test, CLI                         | 14 ✓  |
| 5     | ✅     | types.ts/template-schema.ts/correction-generator.ts (extensions), 2 fixtures, page debug   | 9 ✓   |
| 6     | ✅     | doc progress, mises à jour mvp + correction-integration                                    | —     |

**Total** : 80 tests pédagogiques verts (types 10 + instrumentation 20 + dispatch 16 + renderer 20 + demos 14) + 9 tests Mode B (correction-generator 7 + generated-steps-demo 2) = **89 tests** verts pour la V1 MVP.

## V1.1.a livrée (2026-05-07)

Extension du V1 MVP avec 8 nouvelles rules sans pipeline parallèle, suite à
la même architecture d'instrumentation directe.

**Nouvelles rules instrumentées dans `compute.ts`** :

- `tan_constraint`, `cot_constraint`, `sec_constraint`, `csc_constraint`
  (periodic_exclusion) — site `computeFunctionDomain` après
  `getPeriodicExclusionDomain()`
- `arccosh_constraint`, `arctanh_constraint` (sup uniquement, refusés au
  lycée via `LYCEE_FORBIDDEN_RULES` dans `dispatch.ts`) — site
  `computeFunctionDomain` (déjà couvert par `getConstraintRuleForFunction`)
- `power_constraint` (base⁻ⁿ, n négatif entier) — site `computePowerDomain`
- `even_root_constraint` (base^(1/2n)) — site `computePowerDomain`

**Nouveaux fichiers / extensions** :

- `src/lib/mathAST/domain/mvp-rules.ts` — `LYCEE_FORBIDDEN_RULES` ajouté ;
  `V1_MVP_FUNCTION_CONSTRAINT_RULES` étendu (5 → 11 rules) ; `V1_MVP_RULES`
  étendu pour couvrir power + even_root
- `src/lib/mathAST/domain/compute.ts` — `buildConstraintLatex()` étendu pour
  tan/cot/sec/csc + arccosh/arctanh + power + even_root ; 3 nouveaux sites
  d'instrumentation (~60 LOC)
- `src/lib/mathAST/pedagogical-domain/descriptions-fr.ts` — TITLES +
  EXPLANATIONS pour les 8 nouvelles rules (lycée + supérieur)
- `src/lib/mathAST/pedagogical-domain/dispatch.ts` —
  `assertLevelAllowsRules()` : throw `PedagogicalDomainNotImplemented` si
  rule arccosh/arctanh + niveau lycée
- `src/lib/mathAST/pedagogical-domain/renderer.ts` — `intervalToLatex`
  étendu (`·` → `\\cdot`, `∈` → `\\in`, `ℤ` → `\\mathbb{Z}`, `ℕ` → `\\mathbb{N}`)
- 2 nouvelles catégories démo : `trigonometriques` (3 cas), `puissances`
  (3 cas). Total : 14 → 20 cas
- 1 nouvelle fixture Mode B : `domainTanDemo` (`f(x) = tan(x)` Tle spé)
- Page debug : 20 → 21 fixtures (40 → 42 cards)

**Composition** : déjà gérée implicitement par la récursion +
`intersection`. Ex `ln(sqrt(x))` produit naturellement
`[sqrt_constraint, ln_constraint, intersection]` sans step `composition`
dédié. Aucun work supplémentaire.

**preimage_linear / preimage_quadratic / preimage_cubic** : différé en
V1.2. Risque de doublonnage avec les constraint rules MVP qui captent déjà
le résultat dans `intermediateDomain`. À implémenter quand un cas
pédagogique distinct le justifie.

**Tests** : +6 instrumentation + 2 dispatch (refus lycée arccosh/arctanh + 1
fixture Mode B) + 6 snapshots demo. 938 tests verts au total.

## Limitations connues V1.1 (scope V1.2)

- **`preimage_linear/quadratic/cubic`** : non instrumentés. Risque de
  doublonnage avec les constraint rules MVP (l'`intermediateDomain` du
  step parent capte déjà le résultat de la résolution). Différé en V1.2
  quand un cas pédagogique distinct le justifie.
- **`composition` step explicite** : la composition est déjà capturée
  implicitement par la récursion + `intersection`. Un step `composition`
  dédié serait redondant — différé jusqu'à un cas pédagogique avéré
  (ex : composition profonde > 2 niveaux).
- **`union`, `complement`, `difference`** : non émis (pas de cas
  pédagogique V1.1).
- **`1/√(x+1)`** : domain retourné `[-1, +∞[` (closed at -1) au lieu de
  `]-1, +∞[` (open). Limitation de l'engine `domain/` existant (la
  division exclue les zeros mais √u=0 quand u=0 n'est pas tracé). Pas
  un bug de mon instrumentation.
- **Bug pré-existant `formatPeriodicExclusionInterval`** : produit
  `\\pi:/2` au lieu de `\\pi/2` pour la 3e ligne `Domaine` des steps
  `tan_constraint`/`sec_constraint`. Source dans `domain/format.ts:223`
  via `toCustom()`. Hors scope pedagogical-domain V1.1.

## Pistes V1.1 explicites

1. **Instrumenter périodic_exclusion** dans `compute.ts:432-465` (`getPeriodicExclusionDomain`) → émet `tan_constraint` / `cot_constraint` / `sec_constraint` / `csc_constraint`.
2. **Instrumenter preimage\_\*** : à brancher dans `solveLinearInequality` / `solveQuadraticInequality` / `solveCubicInequality`. Modifier `domain/preimage.ts` ou ajouter une couche dans compute.ts.
3. **Instrumenter `composition`** : `analyzeComposition` (compute.ts:113-192) doit émettre un step `composition` qui wrap les sub-steps.
4. **Wrapper « identification des contraintes »** : pour les cas composites avec ≥ 3 sub-rules, regrouper sous un step parent (cf. `FACTORISATION_CLUSTER_RULES` en `pedagogical-limits/`).
5. **Hyperboliques inverses** : `arccosh_constraint` (sup), `arctanh_constraint` (sup) — étendre `V1_MVP_FUNCTION_CONSTRAINT_RULES`.

## Code review

À faire après livraison : `code-reviewer` (Opus) sur l'ensemble du diff.

## Documents produits (final)

1. `docs/wip/domain-renderer-progress.md` (ce fichier)
2. Mise à jour de `docs/wip/pedagogical-steppers-mvp-progress.md` (12 kinds, 20 fixtures)
3. Mise à jour de `docs/wip/correction-integration-progress.md` (Mode B `kind: 'domain'` ajouté)
