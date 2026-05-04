# Prompt MVP : moteur de réécriture unifié + steppers pédagogiques (dual rendering)

## Contexte

ubumaths est une appli pédagogique de maths francophones. Le moteur `mathAST` dispose de plusieurs **step recorders techniques** (`solve/step-recorder.ts`, `simplify/step-recorder.ts`, `normal/step-recorder.ts`, `integration/step-recorder.ts`, `limits/step-recorder.ts`, `matrix/step-recorder.ts`, `domain/domain-step-recorder.ts`) qui enregistrent les transformations effectuées pendant un calcul. Tous héritent de `StepRecorderBase` (`common/step-recorder-base.ts`).

Ces step recorders **techniques** sont utiles pour le debug et la vérification interne du moteur. Mais ils ne sont **pas adaptés** à une explication pédagogique pour les élèves :

- Les libellés sont techniques (rules names en anglais)
- Pas d'adaptation au niveau scolaire (primaire/collège/lycée/supérieur)
- Pour `arithmetic` et `simplify`, l'algorithme passe par `normalize()` (forme normale rationnelle, graded-lex, etc.) — anti-pédagogique

Objectif : créer une **couche pédagogique en parallèle**, sans toucher aux outils techniques existants.

## Vision long terme (hors MVP, pour le sens)

À terme, on veut :

1. Tous les domaines mathématiques (solve, integrate, differentiate, arithmetic, etc.) ont **deux modes de rendu** des étapes :
   - **Technique** : dump complet structuré (pour debug)
   - **Pédagogique** : adapté au `SchoolLevel` (pour élèves)
2. Les corrections de questions peuvent au choix :
   - Mode A — manuel : templates texte avec placeholders (existant, à conserver)
   - Mode B — automatique : générées par les steppers pédagogiques (nouveau)
3. Pour les domaines où l'algorithme correspond à la pédagogie (solve, integrate, differentiate, limits, matrix, domain) : single recorder + dual renderer
4. Pour les domaines où l'algorithme ne correspond pas à la pédagogie (arithmetic, simplification d'expression) : pipeline pédagogique parallèle distinct

Voir le **récap architectural** en annexe (section "Décisions validées").

## Périmètre MVP

Le MVP livre :

1. **Infrastructure commune** : moteur de réécriture paramétrable + types pour rendering technique vs pédagogique
2. **Module pilote** : renderer pédagogique pour `solve` (le domaine le plus visible côté élève)
3. **Refactor minimum** : `arithmetic-steps.ts` délègue ses calculs à `evaluate(mode: 'exact')` au lieu de son `evaluateNumeric` doublonné
4. **Démo end-to-end** : un test qui montre les deux rendus (technique vs pédagogique) sur un même `solve`
5. **Type-stubs pour les phases futures** : déclarations TypeScript pour `PedagogicalTarget`, `TargetForm`, `pedagogical-evaluate`, sans implémentation effective

**Estimation : 15-18h** sur une session dédiée.

Hors MVP (à faire dans des prompts/sessions ultérieurs) :

- Renderers pédagogiques pour les autres domaines (integration, limits, matrix, domain)
- Stepper différentiation (nouveau step recorder + renderer)
- Pipeline pédagogique complet pour arithmétique (avec règles pédagogiques de regroupement, fractions, radicaux)
- Pipeline pédagogique pour simplification d'expression
- Intégration aux corrections de questions (`QuestionCorrection.generatedSteps`)
- Implémentation effective de `PedagogicalTarget` et `TargetForm`
- Modes `SymbolicComputation` (Mode 0, Mode 2) pour granularité de substitution

---

## Phase 0 — Spécification TDD (obligatoire avant tout code)

Conformément à `CLAUDE.md` du projet, **propose les comportements en français à l'utilisateur** et attends validation avant d'écrire le moindre code.

### Comportements à proposer

```markdown
## Fonctionnalité : moteur de réécriture unifié + steppers pédagogiques (MVP)

### A. Moteur de réécriture commun

`rewrite(node, config)` :

- Boucle de fixpoint paramétrable
- Stratégies : 'cost-fixpoint' (pour simplify) et 'deterministic' (pour pédagogique)
- Hooks pre/post-processor optionnels
- Step recording optionnel via un StepRecorder<T>
- AbortSignal cooperative interruption (réutiliser common/abort.ts)
- maxIterations configurable

### B. Refactor de simplify.ts

- `simplify(node, options)` devient un wrapper mince autour de `rewrite()`
- API publique INCHANGÉE : SimplifyOptions / SimplifyResult / signature identiques
- Aucune régression sur les ~12000 tests mathAST existants
- Le pipeline interne (preprocess → normalizeExtended → rules → post-normalize → cost check → fixpoint) est exprimé via la config de l'engine

### C. Renderer technique générique

`TechnicalRenderer<TStep>` :

- Méthode `render(step, options) → RenderedStep`
- Sortie verbose adaptée au debug (rule, params, before/after en LaTeX, verbosity)
- Aucune adaptation pédagogique
- Format par défaut : 'text' ou 'json' selon options

### D. Renderer pédagogique pour solve

`SolvePedagogicalRenderer` :

- Adapté à `SchoolLevel` ('primaire' | 'college' | 'lycee' | 'superieur')
- Vocabulaire et phrases différents par niveau (e.g. "On enlève 3" vs "−3")
- Verbosity : 'detailed' inclut une explication, 'summarized' juste le titre
- Conserve les libellés FR existants de `solve/descriptions-fr.ts` comme base

### E. Refactor arithmetic-steps.ts

- Délégation à `evaluate(node, { mode: 'exact' })` pour les calculs intermédiaires
- Suppression de la fonction `evaluateNumeric` doublonnée (~70 lignes)
- Structure top-down (`generateStepsForNode`) conservée
- Précision exacte (BigInt rationnel, radicaux exacts) sur tous les sous-calculs
- Pas de nouvelles règles pédagogiques (reportées à Phase 5 post-MVP)
- Aucune régression sur les tests existants

### F. Démo end-to-end

Un test/exemple qui :

1. Résout une équation linéaire simple (e.g. `2x + 3 = 7`)
2. Affiche le rendu technique (dump JSON-like)
3. Affiche le rendu pédagogique pour 3 niveaux scolaires différents
4. Montre la différence visuellement

### G. Type-stubs (préparation API future)

Déclarations sans implémentation pour :

- `PedagogicalTarget` (interface) dans pedagogical-evaluate/types.ts
- `TargetForm` (type union compatible RequiredForm + presets : 'scientific', 'reduced-fraction', 'decimal')
- `PedagogicalEvaluateOptions` skeleton

### Questions à trancher en Phase 0

1. **Nommage** : `rewrite` vs `rewriteEngine` vs `applyRewriting` pour la fonction principale du moteur ?
2. **Structure des fichiers** :
   - `rewriting/engine.ts` à la racine de mathAST (cohérent avec autres modules)
   - OU `common/rewriting-engine.ts` (rangé sous common avec abort.ts) ?
3. **TechnicalRenderer** : implémentation par module (`solve/technical-renderer.ts`) OU générique unique (`common/technical-renderer.ts` qui dump tout via reflection sur RawStep) ?
4. **Format de sortie du renderer** : enum `'text' | 'markdown' | 'latex' | 'structured'` dès le MVP ou seulement 'structured' au début (les autres ajoutés plus tard) ?
5. **Test de démo** : où le placer ? (`__tests__/`, exemple intégré au README, story Storybook, page démo dans `routes/dev/`?)
```

**ATTENDRE LA VALIDATION DE L'UTILISATEUR avant de passer à la Phase 1.**

---

## Phase 1 — Infrastructure (8-10h)

### 1.1 Créer `mathAST/common/step-renderer-base.ts`

Types abstraits pour la couche de rendering :

```typescript
import type { Verbosity } from './verbosity';
import type { BaseStep } from './step-recorder-base';

export type SchoolLevel = 'primaire' | 'college' | 'lycee' | 'superieur';
export type RenderFormat = 'text' | 'markdown' | 'latex' | 'structured';

export interface RenderOptions {
	readonly verbosity: Verbosity;
	readonly format?: RenderFormat;
	readonly locale?: 'fr' | 'en';
}

export interface PedagogicalRenderOptions extends RenderOptions {
	readonly schoolLevel: SchoolLevel;
}

export interface RenderedStep {
	readonly id: number;
	readonly rule: string;
	readonly title: string;
	readonly explanation?: string;
	readonly expressionLatex?: string;
	readonly schoolLevel?: SchoolLevel;
	readonly subSteps?: readonly RenderedStep[];
}

export interface StepRenderer<
	TStep extends BaseStep,
	TOptions extends RenderOptions = RenderOptions
> {
	render(step: TStep, options: TOptions): RenderedStep;
	renderAll(steps: readonly TStep[], options: TOptions): readonly RenderedStep[];
}
```

Tests d'isolation : valider que les types compilent et que les options sont correctement passées.

### 1.2 Créer `mathAST/common/technical-renderer.ts`

Implémentation générique d'un renderer technique qui dump n'importe quel `BaseStep` en format structuré :

```typescript
export class GenericTechnicalRenderer<TStep extends BaseStep> implements StepRenderer<TStep> {
	render(step, options): RenderedStep {
		// dump rule + description + params + before/after en LaTeX selon format
		// Pas d'adaptation pédagogique
	}
	renderAll(steps, options) {
		return steps.map((s) => this.render(s, options));
	}
}
```

Tests : sur une `BaseStep` factice, vérifier la sortie pour formats text / markdown / structured.

### 1.3 Créer `mathAST/rewriting/engine.ts`

Moteur de réécriture commun :

```typescript
import type { Rule } from '../pattern/types';
import type { StepRecorder, BaseStep } from '../common/step-recorder-base';
import { type AbortChecker, makeAbortChecker, withActiveAbortChecker } from '../common/abort';
import type { TypeContext } from '../numtype/types';
import type { MathNode } from '../types';

export type RewriteStrategy =
	| { kind: 'cost-fixpoint'; cost: (node: MathNode) => number }
	| { kind: 'deterministic' };

export interface EngineConfig<TStep extends BaseStep> {
	readonly rules: readonly Rule[];
	readonly preProcess?: (node: MathNode) => MathNode;
	readonly postProcess?: (node: MathNode) => MathNode;
	readonly strategy: RewriteStrategy;
	readonly maxIterations: number;
	readonly recorder?: StepRecorder<TStep>;
	readonly typeCtx?: TypeContext;
	readonly signal?: AbortSignal;
	readonly timeoutMs?: number;
}

export interface EngineResult {
	readonly result: MathNode;
	readonly aborted: boolean;
	readonly iterations: number;
}

export function rewrite<TStep extends BaseStep>(
	node: MathNode,
	config: EngineConfig<TStep>
): EngineResult {
	// Boucle :
	//   - check abort
	//   - preProcess (si fourni)
	//   - applyRulesDeepOnceTracked avec config.rules + recorder
	//   - postProcess (si fourni)
	//   - cost check (si strategy = 'cost-fixpoint')
	//   - fixpoint check
	// Wrap avec withActiveAbortChecker pour propager aux générateurs match.ts
}
```

Tests d'isolation : moteur testé en isolation avec rules factices.

### 1.4 Refactor `simplify.ts` pour utiliser `rewrite()`

**API publique INCHANGÉE** : `simplify(node, options)` retourne `SimplifyResult`. Seule l'implémentation interne change.

L'orchestrateur `simplify` devient un thin wrapper qui :

1. Construit l'`EngineConfig` correspondant aux phases actuelles (preprocess + normalizeExtended → rules → re-preprocess + normalizeExtended)
2. Configure `strategy: 'cost-fixpoint'` avec `cost: computeCost`
3. Appelle `rewrite()`
4. Retourne le résultat dans le shape `SimplifyResult`

**Vérification critique** :

- Les 38 tests `simplify/__tests__/` passent
- Aucune régression sur les ~12000 tests `mathAST + math + geometry-core/compute`

### 1.5 Type-stubs pédagogiques (préparation API future)

Créer `mathAST/pedagogical-evaluate/types.ts` (juste les types, aucune logique) :

```typescript
import type { RequiredForm } from '$lib/questions/types';
import type { PrecisionType, ConstraintOptions, ValidationRule } from '$lib/questions/types';

/**
 * Target form for pedagogical step generation.
 * Compatible with question RequiredForm + extra presets.
 * To be implemented in Phase 5+.
 */
export type TargetForm = RequiredForm | 'scientific' | 'reduced-fraction' | 'decimal';

/**
 * Aggregated pedagogical target — built from multiple question parameters.
 * Used by the pedagogical evaluator (to be implemented in Phase 5+).
 *
 * @see docs/wip/pedagogical-steppers-mvp-progress.md for the analysis
 */
export interface PedagogicalTarget {
	readonly structure?: RequiredForm;
	readonly precision?: PrecisionType;
	readonly answerFormat?: string;
	readonly unit?: { expected: boolean; required?: string };
	readonly strictCosmetics?: Pick<
		ConstraintOptions,
		'reducedFractions' | 'signs' | 'nullTerms' | 'factorOne' | 'zeros'
	>;
	readonly validationRules?: readonly ValidationRule[];
}

/**
 * Skeleton options for the future pedagogical evaluator.
 * Phase 5+ will add fields for symbolicComputation (Poincaré-style enum).
 */
export interface PedagogicalEvaluateOptions {
	readonly schoolLevel: 'primaire' | 'college' | 'lycee' | 'superieur';
	readonly target?: PedagogicalTarget;
	readonly signal?: AbortSignal;
	readonly timeoutMs?: number;
}
```

Aucun export depuis l'index public mathAST pour l'instant (ces types sont en préparation, pas exposés).

---

## Phase 2 — Renderer pédagogique pour `solve` (3-4h)

### 2.1 Créer `solve/pedagogical-renderer.ts`

Adapter les rules de `solve` aux 4 niveaux scolaires. Utiliser comme base les libellés existants de `solve/descriptions-fr.ts`.

Architecture :

```typescript
import type { SolveStep } from './types';
import type {
	StepRenderer,
	PedagogicalRenderOptions,
	RenderedStep,
	SchoolLevel
} from '../common/step-renderer-base';
import { toLatex } from '../latex-generator';

const TITLES: Record<
	SchoolLevel,
	Partial<Record<string /* SolveRule */, (step: SolveStep) => string>>
> = {
	primaire: {
		/* vocabulaire enfant */
	},
	college: {
		/* "Soustraction de 3 de chaque côté" */
	},
	lycee: {
		/* "−3 de chaque côté" */
	},
	superieur: {
		/* "−3" */
	}
};

const EXPLANATIONS: Record<SchoolLevel, Partial<Record<string, (step: SolveStep) => string>>> = {
	primaire: {
		/* phrases longues */
	}
	// college : pas d'explication (verbosité réduite naturelle)
	// lycee : pas d'explication
	// superieur : pas d'explication
};

export class SolvePedagogicalRenderer implements StepRenderer<SolveStep, PedagogicalRenderOptions> {
	render(step, options): RenderedStep {
		const titleFn =
			TITLES[options.schoolLevel][step.rule] ??
			TITLES.lycee[step.rule] ?? // fallback
			((s) => s.description); // ultimate fallback
		const explainFn =
			options.verbosity === 'detailed' ? EXPLANATIONS[options.schoolLevel]?.[step.rule] : undefined;
		return {
			id: step.id,
			rule: step.rule,
			title: titleFn(step),
			explanation: explainFn?.(step),
			expressionLatex: this.formatTransformation(step),
			schoolLevel: options.schoolLevel
		};
	}
	renderAll(steps, options) {
		return steps.map((s) => this.render(s, options));
	}

	private formatTransformation(step: SolveStep): string {
		return `${toLatex(step.before)} \\quad\\Rightarrow\\quad ${toLatex(step.after)}`;
	}
}
```

### 2.2 Tests

`solve/__tests__/pedagogical-renderer.test.ts` :

- Pour chaque rule de `SolveRule` enum, vérifier qu'un title existe au moins en 'lycee' (fallback)
- Pour chaque SchoolLevel, vérifier qu'un cas de base produit le bon vocabulaire
- Vérifier que `verbosity: 'detailed'` ajoute l'explanation, `verbosity: 'summarized'` ne l'ajoute pas
- Snapshot test : résoudre `2x + 3 = 7` et vérifier le rendu pour les 4 niveaux

### 2.3 Décisions de design

- **Couvrir TOUTES les rules de SolveRule en MVP** ? OU seulement les rules courantes (linear, quadratic) avec fallback technique pour les autres ?
- **Recommandation** : commencer par les rules de **résolution linéaire** (subtract-constant, divide-coefficient, etc.) et **quadratique** (apply-discriminant, apply-quadratic-formula). Les autres tombent en fallback "lycée" pour le MVP.

---

## Phase 3 — Refactor minimum de `arithmetic-steps.ts` (2-3h)

### 3.1 Délégation à `evaluate(mode: 'exact')`

Remplacer la fonction `evaluateNumeric` (lignes ~76-145) par des appels à `evaluate(node, { mode: 'exact' })`. Conserver la structure top-down (`generateStepsForNode`).

Changements clés :

- Pour chaque sous-calcul (`leftVal`, `rightVal`, `resultVal`), appeler `evaluate(node, { mode: 'exact' })`
- Le résultat est un `MathNode` exact (rationnel, radical, etc.) au lieu d'un `number`
- Formater en LaTeX via `toLatex(node)` au lieu de `formatNumber(value)`
- Cas où `evaluate` ne donne pas de valeur exacte : skip l'étape (comme aujourd'hui)

### 3.2 Suppression du doublon

Une fois la délégation faite et tests verts, supprimer :

- `evaluateNumeric` (~70 lignes)
- `formatNumber` (devient inutile car LaTeX direct)

### 3.3 Tests

`step-generator/__tests__/arithmetic-steps.test.ts` (existant) doit passer sans régression. Si certains tests reposent sur le comportement float (e.g. `0.1 + 0.2 = 0.3`), les ajuster pour le comportement exact (`= 3/10`).

Ajouter quelques tests pour les cas où la précision exacte change la sortie :

- Fractions : `1/3 + 1/6` doit produire des étapes intermédiaires en fractions exactes
- Radicaux : `\sqrt{8}` doit produire l'étape `2\sqrt{2}` plutôt que `2.828...`
- Grands entiers : `2^60 + 1` doit rester exact

### 3.4 Hors scope MVP

**Ne pas ajouter** les règles pédagogiques de regroupement (multiplications dans une addition), simplification de fractions, extraction de radicaux. C'est la Phase 5 post-MVP.

---

## Phase 4 — Démo end-to-end (1-2h)

### 4.1 Créer un test/exemple démontrant les deux rendus

Localisation : `solve/__tests__/dual-rendering-demo.test.ts` (ou page démo selon décision Phase 0).

Contenu :

```typescript
describe('Dual rendering — solve technique vs pédagogique', () => {
	it('résout 2x + 3 = 7 et présente les deux rendus', () => {
		const ast = parseLatex('2x + 3 = 7');
		const recorder = new SolvingStepRecorderImpl();

		const solution = solve(ast, { recorder });

		// Rendu technique
		const technical = new GenericTechnicalRenderer<SolveStep>();
		const techSteps = technical.renderAll(recorder.getSteps(), {
			verbosity: 'detailed',
			format: 'structured'
		});

		// Rendu pédagogique pour 3 niveaux
		const pedagogical = new SolvePedagogicalRenderer();
		const collegeSteps = pedagogical.renderAll(recorder.getSteps(), {
			schoolLevel: 'college',
			verbosity: 'detailed'
		});
		const lyceeSteps = pedagogical.renderAll(recorder.getSteps(), {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});
		const primaireSteps = pedagogical.renderAll(recorder.getSteps(), {
			schoolLevel: 'primaire',
			verbosity: 'detailed'
		});

		// Affichage comparatif (console.log + assertions)
		console.log('=== TECHNIQUE ===', techSteps);
		console.log('=== COLLÈGE ===', collegeSteps);
		console.log('=== LYCÉE ===', lyceeSteps);
		console.log('=== PRIMAIRE ===', primaireSteps);

		expect(collegeSteps).not.toEqual(lyceeSteps);
		expect(techSteps[0].rule).toBe(collegeSteps[0].rule); // même step source
		expect(collegeSteps[0].title).not.toBe(techSteps[0].title); // mais titre adapté
	});
});
```

### 4.2 Documentation

Si possible, ajouter un README court dans `mathAST/rewriting/README.md` qui explique :

- Le pattern dual rendering (single recorder + two renderers)
- L'architecture du moteur de réécriture
- Comment ajouter un nouveau renderer pédagogique pour un domaine

---

## Phase 5 — Quality checks + commit (1h)

### Quality checks (à la FIN du plan, pas pendant)

- `npx eslint <fichiers modifiés>` (chemin précis pour éviter sweep complet)
- `pnpm check:incremental` (TypeScript + Svelte, ~30s)
- `mcp__svelte__svelte-autofixer` sur chaque fichier .svelte modifié (probablement aucun dans ce MVP)

### Tests régression

- `pnpm test:server src/lib/mathAST` — vérifier zéro régression sur les ~12000 tests existants
- En particulier : `simplify/__tests__/`, `solve/__tests__/`, `step-generator/__tests__/`, `__tests__/abort-equivalence.test.ts`

### Documentation de progression

Conformément à `CLAUDE.md`, créer/mettre à jour `docs/wip/pedagogical-steppers-mvp-progress.md` avec :

- État final du MVP
- Décisions prises en Phase 0
- Fichiers modifiés/créés
- Liste des tâches pour les phases post-MVP (rappel des éléments Hors Scope)

### Commit

Via `commit-manager` agent (multi-fichiers complexes, ~10-15 fichiers).

Message conventional commit suggéré :

```
feat(mathAST): unified rewriting engine + dual-mode step rendering (MVP)

- New rewriting/engine.ts: parameterized fixpoint engine
- Refactor simplify.ts to use the engine (API unchanged)
- New common/step-renderer-base.ts: TechnicalRenderer + PedagogicalRenderer interfaces
- New solve/pedagogical-renderer.ts: SchoolLevel-adapted French rendering
- Refactor arithmetic-steps.ts: delegate to evaluate(exact), remove evaluateNumeric duplicate
- Type stubs for pedagogical-evaluate/ (Phase 5+ scope)
- Demo test showing technique vs pédagogique on same solve
```

**NE PAS ajouter `Co-Authored-By: Claude`** ni mention Claude/Anthropic.

---

## Hors scope MVP (à NE PAS faire dans ce prompt)

À reporter à des prompts/sessions ultérieurs :

1. **Renderers pédagogiques pour autres domaines** : integration, limits, matrix, domain
2. **Stepper différentiation** : créer le step recorder + renderer pour `mathAST/differentiation/` (qui n'a aucun stepper actuellement)
3. **Pipeline pédagogique complet pour arithmétique** :
   - `pedagogical-rules/` (regroupement multiplications, simplification fractions, extraction radicaux)
   - Implémentation de `pedagogical-evaluate.ts` orchestrateur
   - Adaptation structurelle par SchoolLevel (pas seulement vocabulaire)
4. **Pipeline pédagogique pour simplification d'expression** : `(x+1)² → x² + 2x + 1` etc.
5. **Intégration aux corrections de questions** :
   - Nouveau type `QuestionCorrection.generatedSteps`
   - Composant Svelte `<GeneratedStepsCorrection>`
   - Glue côté serveur
   - Cohérence avec `requiredForm` existant
6. **Implémentation effective de `PedagogicalTarget`** :
   - Fonction `extractPedagogicalTarget(instance, blank)` qui agrège les paramètres existants
   - Mapping `TargetForm → rule-sets pédagogiques`
   - Post-processing pédagogique pour respecter les `ConstraintOptions` en mode 'strict' (e.g. réduction de fraction obligatoire)
7. **Modes `SymbolicComputation`** (inspiration Poincaré) :
   - Mode 0 (`replace-or-undefine`) : test d'évaluabilité granulaire
   - Mode 2 (`replace-functions-only`) : pour cas "f(x) = ax + b, calcule f(t)"
8. **Refactor des autres orchestrateurs** (integrate, limits) pour utiliser `rewrite()` : reportable, faire au cas par cas selon valeur

---

## Décisions architecturales validées (issues de la session de design)

### A. Pattern dual rendering

Pour chaque domaine où l'algorithme **EST** naturellement pédagogique (solve, integrate, differentiate, limits, matrix, domain) :

```
[Algorithm]  ──►  [StepRecorder]  ──►  [RawStep[]]
                                           │
                          ┌────────────────┴────────────────┐
                          ▼                                 ▼
              [TechnicalRenderer]                [PedagogicalRenderer]
              (debug, devtools)                  (élève, SchoolLevel)
```

**Single recorder + dual renderer**. Le recorder existant (technique) est réutilisé, on ajoute juste un renderer.

Pour les domaines où l'algorithme **N'EST PAS** pédagogique (arithmetic, simplification d'expression) : pipeline pédagogique parallèle distinct (avec son propre recorder).

### B. Lecture C : moteur de réécriture commun

Plutôt que de dupliquer la boucle de fixpoint entre `simplify.ts` et un futur `pedagogical-evaluate.ts`, on extrait un moteur commun (`rewriting/engine.ts`) que les wrappers configurent selon leurs besoins. Économie nette quand on multiplie les wrappers (différentiation, intégration step-by-step, etc. à venir).

### C. Conserver la couche technique intacte

Les step recorders existants (`solve/step-recorder.ts`, etc.) servent au debug/vérification interne. **NE PAS les modifier** pour servir le pédagogique. La couche pédagogique est ADDITIVE, pas substitutive.

### D. Préparation pour `PedagogicalTarget` sans implémentation

`TargetForm` réutilise `RequiredForm` (déjà dans `questions/types.ts:861`) et l'étend avec des presets utiles (`'scientific'`, `'reduced-fraction'`, `'decimal'`). `PedagogicalTarget` agrège plusieurs paramètres question (requiredForm, precision, ConstraintOptions strict, ValidationRule, etc.). Implémentation effective en Phase 5 post-MVP.

### E. AbortSignal réutilisé

Le module `mathAST/common/abort.ts` (créé dans une session précédente) fournit `AbortError`, `makeAbortChecker`, `withActiveAbortChecker`, `getActiveAbortChecker`. Le moteur `rewrite()` doit l'utiliser pour la cooperative interruption — **ne pas réimplémenter**.

### F. Champs orphelins déjà supprimés (contexte)

Une session récente a supprimé les champs morts du système de questions :

- `canonicalForm`, `allowEquivalent`, `allowDifferentForms`, `validator`, `validatorParams` — tous supprimés
- Voir commits récents `b3772335f` `refactor(questions): remove 5 dead validation option fields`

Pas de tâche liée dans ce MVP, juste pour info que `QuestionTemplate.options` est plus mince qu'il ne l'était.

---

## Critères d'acceptation

1. **Aucune régression** sur les ~12000 tests `mathAST + math + geometry-core/compute`
2. **API publique de `simplify()` strictement identique** : mêmes options, mêmes résultats, mêmes types de retour
3. **Démo opérationnelle** : un test passe et imprime visiblement la différence entre rendu technique et 3 rendus pédagogiques
4. **`arithmetic-steps.ts` ne contient plus la fonction `evaluateNumeric`** (doublon supprimé)
5. **Tests existants `arithmetic-steps`** passent (avec ajustements éventuels pour la précision exacte vs float)
6. **0 erreur ESLint** sur les fichiers modifiés
7. **0 nouvelle erreur TypeScript** dans `pnpm check:incremental` (les ~9 erreurs pré-existantes filtrées par le script restent)
8. **Documentation de progression** écrite dans `docs/wip/pedagogical-steppers-mvp-progress.md`
9. **Commit** créé via commit-manager, message conventional clair

---

## Pré-requis pour démarrer

Lire dans l'ordre :

1. `CLAUDE.md` (racine du projet) — règles essentielles, TDD obligatoire, planning policy
2. `docs/ref/tests/tdd.md` — workflow TDD collaboratif
3. `src/lib/mathAST/common/step-recorder-base.ts` — base existante des step recorders
4. `src/lib/mathAST/common/abort.ts` — infrastructure d'interruption coopérative à réutiliser
5. `src/lib/mathAST/simplify/simplify.ts` — orchestrateur actuel à refactorer (211 lignes)
6. `src/lib/mathAST/solve/step-recorder.ts` — exemple de recorder existant
7. `src/lib/mathAST/solve/descriptions-fr.ts` — libellés FR à utiliser comme base pour le renderer pédagogique
8. `src/lib/mathAST/step-generator/arithmetic-steps.ts` — fichier à refactorer (~410 lignes)
9. `src/lib/mathAST/step-generator/types.ts` — types `CalculationStep`, `SchoolLevel`
10. `src/lib/mathAST/eval/evaluate.ts` — pour comprendre `evaluate(node, { mode: 'exact' })` qui sera utilisé par arithmetic-steps refactoré
11. `src/lib/mathAST/pattern/rule.ts` — `applyRulesDeepOnceTracked`, `applyRulesWithSteps` (briques utilisables par l'engine)
12. `src/lib/questions/types.ts:861` — `RequiredForm` (à réutiliser dans le type stub `TargetForm`)

Pour le contexte historique :

- Session précédente : ajout de `AbortSignal` dans `simplify` (commit `6b698c817`)
- Session récente : suppression de 5 champs orphelins dans questions (commit `b3772335f`)

---

## Estimation détaillée

| Phase | Description                                              | Effort |
| ----- | -------------------------------------------------------- | ------ |
| 0     | Spec TDD + validation utilisateur                        | 1h     |
| 1.1   | `common/step-renderer-base.ts` + tests                   | 1h     |
| 1.2   | `common/technical-renderer.ts` + tests                   | 1.5h   |
| 1.3   | `rewriting/engine.ts` + tests d'isolation                | 2-3h   |
| 1.4   | Refactor `simplify.ts` + non-régression                  | 3-4h   |
| 1.5   | Type stubs `pedagogical-evaluate/types.ts`               | 0.5h   |
| 2.1   | `solve/pedagogical-renderer.ts` (rules linear+quadratic) | 2-3h   |
| 2.2   | Tests renderer pédagogique                               | 1h     |
| 3.1   | Refactor arithmetic-steps : délégation evaluate(exact)   | 2h     |
| 3.2   | Suppression evaluateNumeric + ajustement tests           | 1h     |
| 4     | Démo end-to-end + README                                 | 1-2h   |
| 5     | Quality checks + tests régression + commit               | 1h     |

**Total : 16-20h**

Phase 0 obligatoire avant tout. Phases 1-3 séquentielles si on veut éviter les conflits (sinon parallélisables si on a un plan clair). Phase 4 vient après 1-3.

---

## Notes importantes

- **Ne pas tout faire en une session** : c'est trop long pour un seul commit. Si possible, faire des commits intermédiaires :
  - Commit 1 : Phase 1 (infrastructure pure)
  - Commit 2 : Phase 2 (renderer pédagogique solve)
  - Commit 3 : Phase 3 (refactor arithmetic-steps)
  - Commit 4 : Phase 4 (démo + doc)
- **L'agent doit utiliser des sub-agents** :
  - `code-reviewer` après chaque phase significative
  - `typescript-expert` si problème de types complexes
  - `frontend-developer` non applicable ici (pas de Svelte)
  - `commit-manager` pour chaque commit
- **Vérifier régulièrement la cohérence avec ce prompt** : si une décision diverge, expliciter pourquoi dans la doc de progression

- **En cas de blocage** : ne pas s'éterniser. Si une phase prend visiblement beaucoup plus que prévu, faire un commit intermédiaire de l'état actuel et demander à l'utilisateur si on continue ou si on ajuste le scope
