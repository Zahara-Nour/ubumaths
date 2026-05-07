# Prompt : stepper pédagogique pour la différentiation symbolique

> **Source** : continuation du travail steppers pédagogiques (voir `docs/wip/pedagogical-steppers-mvp-progress.md` pour l'infrastructure et `docs/wip/correction-integration-progress.md` pour le Mode B).
> **Périmètre** : ajouter un step recorder et un renderer pédagogique au module `mathAST/differentiation/`, plus l'intégration au Mode B (`kind: 'differentiate'` dans `GeneratedSteps`).

## Contexte

Le module `mathAST/differentiation/` (~1385 LOC) implémente la dérivation symbolique avec toutes les règles classiques du lycée et au-delà :

- `constantRule`, `variableRule`, `greekLetterRule`
- `sumRule`, `differenceRule`, `negationRule`
- `productRule`, `quotientRule`
- `generalPowerRule`, `powerRuleConstantExp`
- `sinRule`, `cosRule`, `tanRule` (et probablement les autres trig + hyperboliques)
- Dérivation de `exp`, `ln`, `log`, `sqrt`, etc.

**Trou identifié** : aucun step recorder. Vérifié par `grep step|recordStep` → 0 occurrence dans le module. Donc la dérivation est une boîte noire : on entre `f(x)`, on sort `f'(x)`, sans trace pédagogique des règles appliquées.

C'est le **dernier domaine majeur** sans stepper pédagogique. Avec ce travail, on couvre les 4 piliers du lycée mathématique :

- Calcul arithmétique (`pedagogical-arithmetic/`)
- Résolution d'équations (`pedagogical-solve/` linéaire + `solve/pedagogical-renderer.ts` algorithmique)
- **Dérivation** (CE PROMPT)
- (À venir séparément : intégration symbolique, simplification d'expression)

## Vision

Permettre à un élève qui pose `dérive x² + sin(x)` de voir :

```
Étape 1 : On dérive le premier terme x²
         (x²)' = 2x  (règle de la puissance)
Étape 2 : On dérive le second terme sin(x)
         (sin(x))' = cos(x)
Étape 3 : On somme les dérivées
         (x² + sin(x))' = 2x + cos(x)
```

Et qu'une question type "Calcule la dérivée de f(x) = x³ + 2x²" puisse simplement déclarer :

```typescript
correction: {
  generatedSteps: {
    kind: 'differentiate',
    expression: '{{a}}*x^3 + {{b}}*x^2',
    variable: 'x',
    options: { schoolLevel: 'auto' }
  }
}
```

## Architecture

**Pattern dual rendering** (cohérent avec `solve/`) — l'algorithme de `differentiate.ts` correspond naturellement à la pédagogie (chaque règle appliquée = une étape pédagogique). Donc :

- **Single recorder** dans `differentiation/step-recorder.ts` qui enregistre les transformations brutes
- **Dual renderer** :
  - `GenericTechnicalRenderer` (existant, dump pour debug)
  - `DifferentiationPedagogicalRenderer` (nouveau, SchoolLevel-aware)

**PAS de pipeline parallèle** comme `pedagogical-arithmetic/` ou `pedagogical-solve/`. Le `differentiate()` existant suffit, on l'instrumente.

## Périmètre

Le prompt livre :

1. **Step recorder + types** dans `differentiation/step-recorder.ts`
2. **Descriptions FR par règle** dans `differentiation/descriptions-fr.ts`
3. **Renderer pédagogique** `DifferentiationPedagogicalRenderer` SchoolLevel-aware
4. **Instrumentation de `differentiate.ts`** pour accepter `recorder?` optionnel (rétrocompat totale)
5. **Tests + démo** (snapshot + dual-rendering-demo)
6. **Intégration Mode B** : `kind: 'differentiate'` dans `GeneratedSteps`, extension de `correction-generator.ts`
7. **Migration de 1-2 questions tests** pour démonstration end-to-end

**Estimation : 12-15h** sur 1-2 sessions dédiées (peut être splitée : Phases 1-5 = 8-10h pour le step recorder + renderer ; Phases 6-7 = 4-5h pour le Mode B).

## Estimation détaillée par phase

| Phase | Description                                                     | Effort |
| ----- | --------------------------------------------------------------- | ------ |
| 0     | Spec TDD + validation utilisateur                               | 1h     |
| 1     | Step recorder + types `DifferentiationStep`                     | 1.5-2h |
| 2     | Descriptions FR par règle (~15 règles × 2-3 niveaux)            | 2h     |
| 3     | Instrumentation `differentiate.ts` (recorder optionnel partout) | 2-3h   |
| 4     | Renderer pédagogique SchoolLevel-aware                          | 1.5-2h |
| 5     | Tests + démo dual-rendering + snapshots                         | 1.5-2h |
| 6     | Intégration Mode B (`kind: 'differentiate'`)                    | 1.5-2h |
| 7     | Migration 1-2 questions tests + captures                        | 0.5h   |
| 8     | Quality checks + commits                                        | 1h     |

**Total : 12.5-15h** (ou 8-10h sans Mode B si on diffère).

## Phases d'exécution

### Phase 0 — Spécification TDD (obligatoire avant tout code)

Conformément à `CLAUDE.md`, **proposer les comportements en français à l'utilisateur** et attendre validation.

#### Comportements à proposer

````markdown
## Fonctionnalité : stepper pédagogique différentiation

### A. Step recorder dans `differentiation/`

Calque de `solve/step-recorder.ts` :

- Hérite de `StepRecorderBase<DifferentiationStep, DifferentiationRule>`
- Méthodes : `recordStep`, `recordStepByRule`, `getSteps`, `getStepsFiltered(verbosity)`
- Type `DifferentiationStep` étend `BaseStep` avec `params?: DifferentiationParams` (capture u, v, du, dv pour règles produit/quotient/chaîne)
- Type `DifferentiationRule` : union des noms de règles ('sum', 'product', 'quotient', 'chain', 'power', 'sin', 'cos', 'tan', 'exp', 'ln', 'sqrt', 'constant', 'variable', etc.)

### B. Descriptions FR par règle (descriptions-fr.ts)

Pour chaque règle, libellé adapté à 2-3 niveaux scolaires :

- **lycee** : vocabulaire technique standard ("Règle du produit")
- **superieur** : compact, notation maximale

#### Exemples de libellés

| Rule       | lycée                                  | supérieur                 |
| ---------- | -------------------------------------- | ------------------------- |
| `sum`      | "On dérive chaque terme"               | "Linéarité"               |
| `product`  | "On applique la règle du produit"      | "(uv)' = u'v + uv'"       |
| `quotient` | "On applique la règle du quotient"     | "(u/v)' = (u'v − uv')/v²" |
| `chain`    | "On applique la règle de la chaîne"    | "Composition"             |
| `power`    | "On applique la règle de la puissance" | "(xⁿ)' = nxⁿ⁻¹"           |
| `sin`      | "Dérivée de sin"                       | "(sin)' = cos"            |
| `cos`      | "Dérivée de cos"                       | "(cos)' = −sin"           |
| `exp`      | "Dérivée de l'exponentielle"           | "(eˣ)' = eˣ"              |
| `ln`       | "Dérivée du logarithme"                | "(ln(x))' = 1/x"          |

### C. Renderer pédagogique

`DifferentiationPedagogicalRenderer implements StepRenderer<DifferentiationStep, PedagogicalRenderOptions>` :

- Titre via lookup `TITLES[schoolLevel][rule]` avec fallback `lycee`
- Explanation longue si `verbosity: 'detailed'` (formule générale + application aux opérandes)
- `expressionLatex` via `\textcolor{blue}{before}` ⇒ `after` (cohérent avec autres renderers pédagogiques)
- Notation Lagrange `f'(x)` (Leibniz `df/dx` reportée à un futur prompt)

### D. Instrumentation de `differentiate.ts`

Modifier la signature pour accepter un `recorder?` optionnel :

```typescript
export interface DifferentiationOptions {
	// ... existing fields ...
	recorder?: DifferentiationStepRecorder;
}

export function differentiate(
	node: MathNode,
	variable: string,
	options?: DifferentiationOptions
): MathNode {
	// existing logic, but now with recorder?.recordStep(...) calls at each rule application
}
```
````

**Rétrocompatibilité totale** : sans `recorder`, comportement strictement identique. ~12000 tests existants doivent passer sans changement.

### E. Skip silencieux des étapes triviales

Règles `constantRule` (`(c)' = 0`) et `variableRule` (`(x)' = 1`) ne sont PAS enregistrées par défaut, sauf si c'est l'expression top-level (pour pouvoir afficher "(x)' = 1" si l'élève demande directement la dérivée de `x`).

Heuristique : skip si appelé récursivement (depuis sumRule, productRule, etc.). Recorder à l'entrée de `differentiate()` top-level seulement.

### F. Structure des steps : flat ou hiérarchique ?

**Option α — flat** : chaque règle = un step à plat, dans l'ordre de la récursion (post-ordre).
**Option β — hiérarchique** : règles parent englobent les sub-steps des dérivations internes via `subSteps?: readonly DifferentiationStep[]`.

Pour `(sin(x²))'` :

Option α (flat) :

```
1. (x²)' = 2x  (règle de la puissance)
2. (sin(x²))' = cos(x²) · 2x  (règle de la chaîne)
```

Option β (hiérarchique) :

```
1. On applique la règle de la chaîne
   1.1 (x²)' = 2x  (règle de la puissance)
2. Donc (sin(x²))' = cos(x²) · 2x
```

**Reco : Option α en V1**, plus simple et fonctionne pour la plupart des cas. Option β envisageable plus tard si demande pédagogique.

### G. Niveaux scolaires supportés

`lycee + superieur` uniquement. **Pas de primaire/college** (la dérivation n'est pas au programme avant la 1ère).

Si `schoolLevel: 'primaire'` ou `'college'` est passé, fallback automatique sur `lycee` (même logique que pedagogical-solve qui bumpe primaire à college pour les équations linéaires).

### H. Intégration Mode B (`kind: 'differentiate'`)

Étendre `GeneratedSteps` :

```typescript
type GeneratedSteps =
	| { kind: 'arithmetic'; expression: string; options?: GeneratedStepsOptions }
	| { kind: 'linear-equation'; equation: string; options?: GeneratedStepsOptions }
	| {
			kind: 'differentiate'; // NOUVEAU
			expression: string; // f(x) à dériver
			variable: string; // 'x' par défaut
			options?: GeneratedStepsOptions;
	  };
```

Étendre `correction-generator.ts` pour gérer le nouveau `kind`.

### I. Hors scope V1

- **Notation Leibniz** (`df/dx`, `\frac{df}{dx}`) — Lagrange uniquement en V1
- **Structure hiérarchique avec `subSteps`** — flat en V1
- **Niveaux primaire/college** — fallback sur lycee
- **Dérivées partielles** (∂f/∂x) — fonctions à plusieurs variables, hors scope
- **Dérivées d'ordre supérieur** automatiques (f'', f''', etc.) — l'utilisateur peut appeler `differentiate(differentiate(...))` mais pas de support natif "calcule f'''(x)"
- **Composant interactif** étape-par-étape — V1 = liste passive (cohérent Mode B)

## Questions à trancher en Phase 0

1. **Structure flat vs hiérarchique** : Option α (flat, recommandé V1) ou Option β (hiérarchique avec subSteps) ?

2. **Notation `(f(x))'` vs `\frac{d}{dx}f(x)` vs `f'(x)`** : laquelle pour le titre des étapes ? Pour `expressionLatex` ?

   - Reco : `f'(x)` partout (Lagrange, classique au lycée français).

3. **Affichage de la formule générale** : pour la règle du produit, afficher "On applique : (uv)' = u'v + uv'" PUIS l'application avec u et v concrets, OU directement l'application ?

   - Reco : niveau lycée affiche la formule générale en explanation (`detailed`) ; superieur juste l'application.

4. **Skip triviaux** : confirmé `(c)' = 0`, `(x)' = 1` skippés sauf top-level ?

5. **`PedagogicalTarget` pour différentiation** : pertinent ? La dérivation n'a pas vraiment de "forme cible" (le résultat est ce qu'il est).

   - Reco : ignorer le target en V1. Si `requiredForm: 'product'` est demandé sur le résultat, on n'essaie pas de factoriser. Limitation acceptable.

6. **Périmètre Mode B** : faire l'intégration `kind: 'differentiate'` dans ce prompt OU le différer à un prompt séparé ?

   - Reco : faire dans ce prompt (cohérent avec correction-integration-progress qui a livré 2 kinds, ajout naturel du 3e).

7. **Recorder injecté ou onStep callback** : pedagogical-arithmetic et MVP infrastructure ont eu des choix différents (`onStep` callback dans rewriting-engine, recorder injecté dans solve).

   - Reco : recorder injecté (cohérent avec `solve/`, qui est le modèle direct ici puisque c'est un step recorder qui s'instrumente dans un algorithme existant, pas un moteur de réécriture).

8. **Migration questions tests** : combien et lesquelles ?
   - Reco : 1 question 1ère (dérivée polynomiale simple : `x³ + 2x²`) + 1 question Terminale (composition : `sin(x²)` ou `e^(2x)`).

**ATTENDRE LA VALIDATION DE L'UTILISATEUR avant de passer à la Phase 1.**

---

### Phase 1 — Step recorder + types (1.5-2h)

#### 1.1 Créer `mathAST/differentiation/types.ts` (extension)

Le fichier `differentiation/types.ts` existe déjà. Étendre avec :

```typescript
import type { BaseStep } from '../common/step-recorder-base';
import type { Verbosity } from '../common/verbosity';
import type { MathNode } from '../types';

/**
 * Names of differentiation rules, used as the discriminator on DifferentiationStep.
 * Keep in sync with all rule names exported from `rules.ts`.
 */
export type DifferentiationRule =
  | 'constant'
  | 'variable'
  | 'greek-letter'
  | 'sum'
  | 'difference'
  | 'negation'
  | 'product'
  | 'quotient'
  | 'power-constant-exp'
  | 'general-power'
  | 'sin' | 'cos' | 'tan'
  | 'arcsin' | 'arccos' | 'arctan'
  | 'sinh' | 'cosh' | 'tanh'
  | 'exp' | 'ln' | 'log'
  | 'sqrt' | 'cbrt'
  | 'abs'
  | 'chain';   // chain rule when applied as a wrapper

/**
 * Captured parameters per rule (used by the renderer to format titles/explanations).
 */
export type DifferentiationParams =
  | { rule: 'sum'; left: MathNode; right: MathNode; leftPrime: MathNode; rightPrime: MathNode }
  | { rule: 'product'; u: MathNode; v: MathNode; uPrime: MathNode; vPrime: MathNode }
  | { rule: 'quotient'; u: MathNode; v: MathNode; uPrime: MathNode; vPrime: MathNode }
  | { rule: 'chain'; outer: MathNode; inner: MathNode; innerPrime: MathNode }
  | { rule: 'power-constant-exp'; base: MathNode; exponent: MathNode }
  | { rule: 'sin' | 'cos' | 'tan' | ...; arg: MathNode }
  // ... etc.
  | { rule: DifferentiationRule };  // fallback minimal

/**
 * A step recorded during differentiation.
 */
export interface DifferentiationStep extends BaseStep {
  readonly params?: DifferentiationParams;
  readonly variable: string;  // the differentiation variable
}

/**
 * Verbosity used by the differentiation step recorder filter.
 */
export type DifferentiationVerbosity = Verbosity;
```

#### 1.2 Créer `differentiation/step-recorder.ts`

Calque de `solve/step-recorder.ts` :

```typescript
import type { MathNode } from '../types';
import type { DifferentiationStep, DifferentiationRule, DifferentiationParams } from './types';
import { StepRecorderBase } from '../common/step-recorder-base';
import { getDifferentiationRuleDescription } from './descriptions-fr';
import type { Verbosity } from '../common/verbosity';

export class DifferentiationStepRecorderImpl
  extends StepRecorderBase<DifferentiationStep, DifferentiationRule>
  implements DifferentiationStepRecorder {

  recordStep(
    rule: DifferentiationRule,
    description: string,
    before: MathNode,
    after: MathNode,
    verbosityLevel: Verbosity,
    variable: string,
    params?: DifferentiationParams
  ): DifferentiationStep {
    return this.recordStepInternal({
      rule,
      description,
      before,
      after,
      verbosityLevel,
      variable,
      params
    });
  }

  recordStepByRule(
    rule: DifferentiationRule,
    before: MathNode,
    after: MathNode,
    verbosityLevel: Verbosity,
    variable: string,
    params?: DifferentiationParams
  ): DifferentiationStep {
    return this.recordStep(
      rule,
      getDifferentiationRuleDescription(rule),
      before,
      after,
      verbosityLevel,
      variable,
      params
    );
  }
}

export interface DifferentiationStepRecorder {
  readonly length: number;
  recordStep(...): DifferentiationStep;
  recordStepByRule(...): DifferentiationStep;
  getSteps(): readonly DifferentiationStep[];
  getStepsFiltered(verbosity: Verbosity): readonly DifferentiationStep[];
  clear(): void;
}

export function createDifferentiationStepRecorder(): DifferentiationStepRecorder {
  return new DifferentiationStepRecorderImpl();
}
```

#### 1.3 Tests d'isolation

`differentiation/__tests__/step-recorder.test.ts` :

- Création + record manuel
- `recordStepByRule` avec lookup descriptions FR
- Filtrage par verbosity
- Clear + reset

---

### Phase 2 — Descriptions FR par règle (2h)

#### 2.1 Créer `differentiation/descriptions-fr.ts`

```typescript
import type { DifferentiationRule } from './types';

/**
 * Default French descriptions per rule (used by recordStepByRule).
 * SchoolLevel-specific titles live in pedagogical-renderer.ts.
 */
const RULE_DESCRIPTIONS: Record<DifferentiationRule, string> = {
	constant: "Dérivée d'une constante",
	variable: 'Dérivée de la variable',
	'greek-letter': "Dérivée d'une lettre grecque (constante)",
	sum: 'Règle de la somme',
	difference: 'Règle de la différence',
	negation: "Dérivée de l'opposé",
	product: 'Règle du produit',
	quotient: 'Règle du quotient',
	'power-constant-exp': 'Règle de la puissance (exposant constant)',
	'general-power': 'Règle générale de la puissance',
	sin: 'Dérivée du sinus',
	cos: 'Dérivée du cosinus',
	tan: 'Dérivée de la tangente',
	// ... etc pour toutes les règles
	chain: 'Règle de la chaîne (composition)'
};

export function getDifferentiationRuleDescription(rule: DifferentiationRule): string {
	return RULE_DESCRIPTIONS[rule] ?? rule;
}
```

#### 2.2 Tests

`differentiation/__tests__/descriptions-fr.test.ts` :

- Toutes les `DifferentiationRule` ont une entrée
- Fallback sur le nom brut si entrée manquante (cas impossible mais défensif)

---

### Phase 3 — Instrumentation `differentiate.ts` (2-3h)

#### 3.1 Étendre `DifferentiationOptions` dans `types.ts`

```typescript
export interface DifferentiationOptions {
	// ... existing fields ...
	/**
	 * Optional step recorder. When provided, each rule application is recorded.
	 * Without recorder, behavior is strictly unchanged (zero overhead).
	 */
	recorder?: DifferentiationStepRecorder;
}
```

#### 3.2 Modifier `differentiate.ts`

Pour CHAQUE règle appliquée dans `differentiate()`, ajouter :

```typescript
// AVANT (existant)
if (isAddition(node)) {
	return sumRule(differentiate(node.left, variable), differentiate(node.right, variable));
}

// APRÈS
if (isAddition(node)) {
	const leftPrime = differentiate(node.left, variable, options);
	const rightPrime = differentiate(node.right, variable, options);
	const result = sumRule(leftPrime, rightPrime);
	options?.recorder?.recordStepByRule('sum', node, result, 'detailed', variable, {
		rule: 'sum',
		left: node.left,
		right: node.right,
		leftPrime,
		rightPrime
	});
	return result;
}
```

Important :

- Récursion descend AVANT d'enregistrer (sub-steps enregistrés en premier — order naturel post-ordre)
- Skip silencieux pour `constantRule` et `variableRule` quand non top-level (utiliser un flag `_isTopLevel?` ou comparer avec le node racine via une closure)
- Passer `options` (donc `recorder`) à TOUS les appels récursifs

#### 3.3 Helper pour skip triviaux non top-level

Option simple : wrapper interne `differentiateRecursive(node, variable, options, isTopLevel)` qui passe `isTopLevel = false` aux sous-appels. Le recorder skippe `constantRule`/`variableRule` si `!isTopLevel`.

Alternative : ne pas skipper du tout, et laisser le renderer filtrer (verbosity-based). Plus simple mais bruyant.

**Reco** : skip dans le recorder, c'est plus propre. Documenter clairement.

#### 3.4 Tests de non-régression

CRITIQUE : les ~12000 tests existants doivent passer sans modification. Vérifier explicitement :

- `pnpm test:server src/lib/mathAST/differentiation/`
- `pnpm test:server src/lib/mathAST/` complet pour s'assurer qu'aucune régression

#### 3.5 Tests d'instrumentation

`differentiation/__tests__/instrumented-differentiate.test.ts` :

- `differentiate(parseLatex('x^2'))` sans recorder → résultat correct, pas d'enregistrement
- Avec recorder → 1 step (`power-constant-exp`)
- `differentiate(parseLatex('x^3 + 2x^2'))` avec recorder → 3 steps (power, power, sum)
- `differentiate(parseLatex('sin(x^2)'))` avec recorder → 2 steps (power, chain) [ou 3 selon décision Phase 0]
- `differentiate(parseLatex('x'))` top-level avec recorder → 1 step (variable)
- `differentiate(parseLatex('x + 5'))` avec recorder → 2 steps (variable est skip car non top-level ; constant aussi ; reste sum) — OU 3 si on décide de garder
  - **À trancher Phase 0** : combien d'étapes pour `x + 5` ?

---

### Phase 4 — Renderer pédagogique (1.5-2h)

#### 4.1 Créer `differentiation/pedagogical-renderer.ts`

```typescript
import type { DifferentiationStep, DifferentiationRule, DifferentiationParams } from './types';
import type {
	StepRenderer,
	PedagogicalRenderOptions,
	RenderedStep,
	SchoolLevel
} from '../common/step-renderer-base';
import { toLatex } from '../latex-generator';

const TITLES: Record<
	SchoolLevel,
	Partial<Record<DifferentiationRule, (step: DifferentiationStep) => string>>
> = {
	primaire: {
		/* fallback to lycee — pas au programme */
	},
	college: {
		/* idem */
	},
	lycee: {
		sum: () => 'On dérive chaque terme',
		product: () => 'On applique la règle du produit',
		quotient: () => 'On applique la règle du quotient',
		chain: () => 'On applique la règle de la chaîne',
		'power-constant-exp': () => 'On applique la règle de la puissance',
		sin: () => 'Dérivée de sin',
		cos: () => 'Dérivée de cos',
		exp: () => 'Dérivée de eˣ',
		ln: () => 'Dérivée de ln'
		// ... etc
	},
	superieur: {
		sum: () => "(f + g)' = f' + g'",
		product: () => "(uv)' = u'v + uv'",
		quotient: () => "(u/v)' = (u'v − uv')/v²",
		chain: () => "(f∘g)' = f'(g) · g'",
		'power-constant-exp': () => "(xⁿ)' = nxⁿ⁻¹",
		sin: () => "(sin)' = cos",
		cos: () => "(cos)' = −sin",
		exp: () => "(eˣ)' = eˣ",
		ln: () => "(ln)' = 1/x"
		// ... etc
	}
};

const EXPLANATIONS: Record<
	SchoolLevel,
	Partial<Record<DifferentiationRule, (step: DifferentiationStep) => string>>
> = {
	lycee: {
		product: (step) => {
			if (step.params?.rule !== 'product') return '';
			const { u, v, uPrime, vPrime } = step.params;
			return (
				`Avec u = ${toLatex(u)} et v = ${toLatex(v)}, ` +
				`on a u' = ${toLatex(uPrime)} et v' = ${toLatex(vPrime)}, ` +
				`donc (uv)' = u'v + uv' = ${toLatex(uPrime)}·${toLatex(v)} + ${toLatex(u)}·${toLatex(vPrime)}.`
			);
		}
		// ... etc
	},
	// superieur : pas d'explication (notation seule)
	primaire: {},
	college: {}
};

export class DifferentiationPedagogicalRenderer
	implements StepRenderer<DifferentiationStep, PedagogicalRenderOptions>
{
	render(step: DifferentiationStep, options: PedagogicalRenderOptions): RenderedStep {
		// Bump primaire/college to lycee (not on syllabus before 1ère)
		const effectiveLevel: SchoolLevel =
			options.schoolLevel === 'primaire' || options.schoolLevel === 'college'
				? 'lycee'
				: options.schoolLevel;

		const titleFn =
			TITLES[effectiveLevel][step.rule] ?? TITLES.lycee[step.rule] ?? (() => step.description);

		const explainFn =
			options.verbosity === 'detailed'
				? (EXPLANATIONS[effectiveLevel]?.[step.rule] ?? EXPLANATIONS.lycee[step.rule])
				: undefined;

		return {
			id: step.id,
			rule: step.rule,
			title: titleFn(step),
			explanation: explainFn?.(step),
			expressionLatex: this.formatTransformation(step),
			schoolLevel: effectiveLevel
		};
	}

	renderAll(
		steps: readonly DifferentiationStep[],
		options: PedagogicalRenderOptions
	): readonly RenderedStep[] {
		return steps.map((s) => this.render(s, options));
	}

	private formatTransformation(step: DifferentiationStep): string {
		return `\\textcolor{blue}{(${toLatex(step.before)})'} \\quad=\\quad ${toLatex(step.after)}`;
	}
}
```

#### 4.2 Tests

`differentiation/__tests__/pedagogical-renderer.test.ts` :

- Pour chaque rule majeure, vérifier titre lycee + superieur
- Vérifier fallback `lycee` quand `superieur` n'a pas d'entrée pour une rule
- Vérifier que `primaire`/`college` bumpent à `lycee`
- Vérifier que `verbosity: 'detailed'` ajoute l'explanation
- Snapshot test : dériver `x³ + 2x²` et vérifier rendu pour 4 niveaux × 2 verbosités

---

### Phase 5 — Démo + tests snapshot (1.5-2h)

#### 5.1 Démo dual-rendering

Calque de `solve/__tests__/dual-rendering-demo.test.ts` :

```typescript
// differentiation/__tests__/dual-rendering-demo.test.ts
describe('Dual rendering — différentiation technique vs pédagogique', () => {
	it('dérive x^3 + 2x^2 et imprime les rendus', () => {
		const node = parseLatex('x^3 + 2x^2');
		const recorder = createDifferentiationStepRecorder();
		const derivative = differentiate(node, 'x', { recorder });

		// Rendu technique
		const technical = new GenericTechnicalRenderer<DifferentiationStep>();
		console.log('=== TECHNIQUE ===');
		console.log(
			technical.renderAll(recorder.getSteps(), { verbosity: 'detailed', format: 'structured' })
		);

		// Rendu pédagogique 1ère (lycee)
		const pedagogical = new DifferentiationPedagogicalRenderer();
		console.log('=== LYCÉE ===');
		console.log(
			pedagogical.renderAll(recorder.getSteps(), { schoolLevel: 'lycee', verbosity: 'detailed' })
		);

		// Rendu supérieur
		console.log('=== SUPÉRIEUR ===');
		console.log(
			pedagogical.renderAll(recorder.getSteps(), {
				schoolLevel: 'superieur',
				verbosity: 'summarized'
			})
		);
	});
});
```

#### 5.2 Banque de cas catégorisés (modèle Phase 6 MVP)

```
differentiation/demo-cases/
├── polynomial.ts       # x³, x³+2x², (2x+1)²
├── trigonometric.ts    # sin(x), cos(2x), sin(x²)
├── exponential.ts      # eˣ, e^(2x), 2^x
├── logarithm.ts        # ln(x), ln(x²), log(x+1)
├── product-quotient.ts # x·sin(x), (x²+1)/(x-1)
├── composition.ts      # sin(cos(x)), e^(sin(x))
└── index.ts            # ALL_CATEGORIES
```

Tests snapshot avec `it.each(category.cases)` → `toMatchSnapshot()` (modèle pedagogical-arithmetic-demo.test.ts).

#### 5.3 Script CLI standalone

```typescript
// scripts/differentiation-demo.ts
// Usage: pnpm tsx scripts/differentiation-demo.ts [categories...]
```

Modèle exact de `scripts/pedagogical-arithmetic-demo.ts`.

---

### Phase 6 — Intégration Mode B (1.5-2h)

#### 6.1 Étendre `GeneratedSteps` dans `questions/types.ts`

```typescript
export type GeneratedSteps =
	| {
			readonly kind: 'arithmetic';
			readonly expression: string;
			readonly options?: GeneratedStepsOptions;
	  }
	| {
			readonly kind: 'linear-equation';
			readonly equation: string;
			readonly options?: GeneratedStepsOptions;
	  }
	| {
			readonly kind: 'differentiate'; // NOUVEAU
			readonly expression: string; // f(x)
			readonly variable: string; // 'x' par défaut, configurable
			readonly options?: GeneratedStepsOptions;
	  };
```

#### 6.2 Étendre le schéma Zod `template-schema.ts`

Ajouter le cas `'differentiate'` à `generatedStepsSchema` (discriminated union).

#### 6.3 Étendre `correction-generator.ts`

```typescript
case 'differentiate': {
  const expression = resolvePlaceholders(gen.expression, instance);
  const node = parseLatex(expression);
  const recorder = createDifferentiationStepRecorder();
  differentiate(node, gen.variable, { recorder });
  const renderer = new DifferentiationPedagogicalRenderer();
  // Bump primaire/college → lycee in extractEffectiveSchoolLevel logic
  renderedSteps = renderer.renderAll(recorder.getSteps(), {
    schoolLevel: effectiveLevel,
    verbosity
  });
  break;
}
```

#### 6.4 Tests

`questions/generator/__tests__/correction-generator.test.ts` (extension) :

- Test `kind: 'differentiate'` avec expression simple (`x^2 + 3x`)
- Test variable autre que `x` (`y`, `t`)
- Test fallback silencieux si expression non parsable
- Test `schoolLevel: 'auto'` qui bumpe primaire→lycee pour ce kind

---

### Phase 7 — Migration de 1-2 questions tests (0.5h)

#### 7.1 Sélection candidates

Dans `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts` (fixture créée en Phase 4 du correction-integration), ajouter 1-2 questions différentiation :

```typescript
{
  id: 'differentiate-polynomial',
  grades: ['SPE_1'],  // 1ère spécialité maths
  shared: {
    correction: {
      generatedSteps: {
        kind: 'differentiate',
        expression: 'x^3 + {{a}}*x^2',
        variable: 'x',
        options: { schoolLevel: 'auto', verbosity: 'detailed' }
      }
    }
  },
  variations: [{ /* ... */ }]
}
```

Et 1 question Terminale avec composition :

```typescript
{
  id: 'differentiate-composition',
  grades: ['SPE_T'],  // Terminale spécialité
  shared: {
    correction: {
      generatedSteps: {
        kind: 'differentiate',
        expression: 'sin({{a}}*x)',
        variable: 'x',
      }
    }
  },
  // ...
}
```

#### 7.2 Snapshots

`src/lib/questions/__tests__/generated-steps-demo.test.ts` (extension) : ajouter 2 snapshots (un par fixture).

#### 7.3 Validation visuelle (optionnel)

Mettre à jour la page debug `/dashboard/admin/debug/correction-mode-b` pour inclure les 2 nouveaux cas différentiation. Ou laisser pour le suivant.

---

### Phase 8 — Quality checks + commits (1h)

#### Commits intermédiaires recommandés

| Commit | Phases                                      | Estimation cumulée |
| ------ | ------------------------------------------- | ------------------ |
| 1      | Phases 1+2 (recorder + descriptions FR)     | 3.5-4h             |
| 2      | Phases 3 (instrumentation differentiate.ts) | 5.5-7h             |
| 3      | Phases 4+5 (renderer + démo + snapshots)    | 8.5-11h            |
| 4      | Phases 6+7 (Mode B + migration questions)   | 11-13.5h           |
| 5      | Phase 8 (doc finale + checks)               | 12-14.5h           |

#### Quality checks à la FIN

- `npx eslint <fichiers modifiés>`
- `pnpm check:incremental`
- Pas de fichiers `.svelte` modifiés (sauf si extension page debug) → svelte-autofixer si applicable
- `pnpm test:server src/lib/mathAST` (régression complète)

#### Doc de progression

`docs/wip/differentiation-stepper-progress.md` (modèle des autres progress docs).

#### Commits via `commit-manager` agent

PAS de `Co-Authored-By: Claude`.

---

## Hors scope (à NE PAS faire dans ce prompt)

- **Notation Leibniz** (`df/dx`, `\frac{df}{dx}`) — Lagrange uniquement V1
- **Structure hiérarchique avec `subSteps`** — flat V1
- **Niveaux primaire/college** — fallback automatique sur lycee
- **Dérivées partielles** (∂f/∂x) pour fonctions à plusieurs variables
- **Dérivées d'ordre supérieur** automatiques (`f''`, `f'''` calculés en une commande)
- **Composant interactif** étape-par-étape — V1 = liste passive
- **Renderers pour autres domaines** : integration, limits, matrix, domain
- **Pipeline pédagogique pour simplification d'expression**
- **Modes `SymbolicComputation`** (Mode 0, Mode 2)
- **`NormalizeTarget` à 3 niveaux**

## Décisions architecturales validées (issues des sessions précédentes)

### A. Pattern dual rendering — single recorder, multiple renderers

L'algorithme de `differentiate.ts` correspond naturellement à la pédagogie. Pas de pipeline parallèle. Le recorder existant sert au debug technique ET au rendu pédagogique via deux renderers différents.

### B. Rétrocompatibilité totale

L'instrumentation de `differentiate.ts` est strictement opt-in via le paramètre `options.recorder`. Sans recorder, comportement et performance inchangés. Les ~12000 tests existants doivent passer sans modification.

### C. Niveaux scolaires : lycee + superieur

La dérivation n'est pas au programme avant la 1ère. `primaire` et `college` bumpés automatiquement à `lycee`. Cohérent avec `pedagogical-solve/` qui bumpe `primaire` à `college` pour les équations linéaires.

### D. Notation Lagrange `f'(x)`

Standard au lycée français. Leibniz reportée à un futur prompt si demande.

### E. Structure flat (Option α)

Steps enregistrés à plat dans l'ordre de la récursion (post-ordre). Plus simple à implémenter et à lire pour l'élève. Hiérarchique avec `subSteps` envisageable plus tard.

### F. Skip triviaux non top-level

`constantRule` et `variableRule` skippés sauf si l'expression top-level est juste une constante ou une variable. Évite le bruit `(c)' = 0` et `(x)' = 1` à chaque sous-dérivation.

### G. Mode B intégré dans ce prompt

Pas de prompt séparé pour `kind: 'differentiate'`. La cohérence d'effort est meilleure tout faire ensemble (correction-integration a déjà livré 2 kinds, ajout naturel du 3e).

### H. AbortSignal réutilisé

Si `differentiate()` venait à supporter abort (probable un jour), le recorder n'a rien à faire de spécial — l'opérateur d'abort propage naturellement.

## Critères d'acceptation

1. **Aucune régression** sur les ~12000 tests `mathAST + math + geometry-core/compute`
2. **Step recorder testé** : ≥10 tests unitaires couvrant création, record, filtre, clear
3. **Descriptions FR** : toutes les `DifferentiationRule` ont une entrée
4. **Renderer pédagogique testé** : ≥10 tests couvrant lycee + superieur, verbosity, fallback, bump primaire/college
5. **`differentiate.ts` instrumenté** : pour chaque branche de l'algorithme, le recorder est appelé (ou skip silencieux justifié)
6. **Rétrocompat** : `differentiate(node, variable)` sans options se comporte exactement comme avant (même résultat, même perf)
7. **Mode B `kind: 'differentiate'`** : fonctionne end-to-end (`generateInstance` → `_renderedSteps` populé)
8. **Démo dual-rendering** : test passe et imprime visiblement la différence technique vs pédagogique
9. **6+ catégories de démos snapshots** : polynomial, trigonometric, exponential, logarithm, product-quotient, composition
10. **Script CLI standalone** : `pnpm tsx scripts/differentiation-demo.ts [catégories...]` fonctionne
11. **2 questions tests migrées** avec snapshots stables
12. **0 erreur ESLint, 0 nouvelle erreur TypeScript**
13. **Documentation de progression** écrite dans `docs/wip/differentiation-stepper-progress.md`
14. **Commits via `commit-manager`** (PAS de Co-Authored-By: Claude)

## Pré-requis pour démarrer

Lire dans l'ordre :

### Documentation projet

1. `CLAUDE.md` (racine) — règles essentielles, TDD obligatoire
2. `docs/ref/tests/tdd.md` — workflow TDD collaboratif
3. `docs/wip/pedagogical-steppers-mvp-progress.md` — état infrastructure générique
4. `docs/wip/correction-integration-progress.md` — Mode B livré, modèle pour `kind: 'differentiate'`
5. `docs/wip/pedagogical-arithmetic-progress.md` — pattern global du domaine

### Modèle de référence direct (pattern dual rendering)

6. `src/lib/mathAST/solve/step-recorder.ts` — modèle EXACT pour `differentiation/step-recorder.ts`
7. `src/lib/mathAST/solve/descriptions-fr.ts` — modèle EXACT pour `differentiation/descriptions-fr.ts`
8. `src/lib/mathAST/solve/pedagogical-renderer.ts` — modèle EXACT pour `differentiation/pedagogical-renderer.ts`
9. `src/lib/mathAST/solve/__tests__/dual-rendering-demo.test.ts` — modèle pour la démo

### Module à instrumenter

10. `src/lib/mathAST/differentiation/differentiate.ts` — algorithme à instrumenter (697 lignes, ~25-30 branches selon les rules)
11. `src/lib/mathAST/differentiation/rules.ts` — règles utilisées par differentiate (490 lignes)
12. `src/lib/mathAST/differentiation/types.ts` — types existants à étendre
13. `src/lib/mathAST/differentiation/index.ts` — export public

### Infrastructure transversale

14. `src/lib/mathAST/common/step-recorder-base.ts` — `StepRecorderBase`, `BaseStep`
15. `src/lib/mathAST/common/step-renderer-base.ts` — `StepRenderer`, `RenderedStep`, `SchoolLevel`, `PedagogicalRenderOptions`
16. `src/lib/mathAST/common/technical-renderer.ts` — `GenericTechnicalRenderer` (utilisé pour la démo)
17. `src/lib/mathAST/common/abort.ts` — pour cohérence (si besoin futur)

### Système de questions (pour Mode B)

18. `src/lib/questions/types.ts` — `GeneratedSteps` à étendre
19. `src/lib/questions/template-schema.ts` — `generatedStepsSchema` Zod à étendre
20. `src/lib/questions/generator/correction-generator.ts` — handler par `kind` à étendre
21. `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts` — fixtures à compléter
22. `src/lib/components/questions/GeneratedStepsCorrection.svelte` — composant Svelte (probablement aucune modif nécessaire, déjà générique)

## Notes importantes

### Stratégie de découpage en sessions

Vu l'ampleur (12-15h), prévoir **1-2 sessions** :

- **Session courte (8-10h)** : Phases 0-5 (step recorder + renderer + démo, sans Mode B)
- **Session courte suivante (4-5h)** : Phases 6-8 (Mode B + migration + finalisation)

Ou tout d'un trait dans une session dédiée longue.

### Stratégie de sub-agents

- **`code-reviewer`** (Opus) après Phase 3 (l'instrumentation est la plus risquée — beaucoup de code touché)
- **`code-reviewer`** (Opus) après Phase 6 (Mode B intégration)
- **`debugger`** (Opus) si tests existants régressent (peu probable mais à anticiper)
- **`commit-manager`** pour chaque commit intermédiaire

### Risques identifiés

1. **Instrumentation lourde de `differentiate.ts`** (697 lignes, ~25-30 branches selon les rules) — risque de manquer une branche ou d'introduire un bug subtil. Mitigation : tests d'instrumentation couvrant chaque branche.

2. **Skip triviaux complexe** : la logique "skip si non top-level" demande de propager un flag `_isTopLevel` dans la récursion. Risque de fuite (passage manqué). Mitigation : wrapper interne `differentiateRecursive(..., isTopLevel)` qui force le flag à `false` pour les sous-appels.

3. **Couverture des règles non exhaustive** : `differentiation/rules.ts` peut contenir des règles que je n'ai pas listées dans `DifferentiationRule`. Vérifier tout le fichier avant de figer le type.

4. **Cas spéciaux au lycée vs supérieur** : certaines règles existent au lycée mais avec restrictions (ex : dérivée de `1/x` peut être traitée différemment qu'avec `quotientRule`). Garder les libellés simples pour V1, raffiner si demande pédagogique.

### Cas pathologiques à NE PAS oublier

- `(c)' = 0` (constante) : skippé sauf top-level
- `(x)' = 1` : skippé sauf top-level
- `((f(x)))' ` (parenthèses superflues) : `delimiter` node — délégation ou skip
- Variables grecques : `α, β` — `greekLetterRule`, traitées comme constantes (dérivée = 0)
- Fonction sans variable : `differentiate(parseLatex('5'), 'x')` — retourne `0`, 1 step `constant` ou skip ?
- AbortSignal : pas obligatoire en V1, mais le prévoir dans le type (`signal?: AbortSignal`)

### Cohérence avec les renderers pédagogiques existants

Le code DOIT être cohérent avec `solve/pedagogical-renderer.ts` :

- Même structure de `TITLES` et `EXPLANATIONS` (Record<SchoolLevel, Partial<Record<Rule, fn>>>)
- Même pattern de fallback (specific level → lycee → step.description)
- Même `\textcolor{blue}{...}` pour mettre en évidence
- Même utilisation de `toLatex()` pour le rendu

Si une convention de `solve/` n'est pas mentionnée explicitement dans ce prompt : **suivre la convention de `solve/`** par défaut.

---

## Annexe : exemples concrets attendus

### Exemple 1 : `(x³)'` au lycée (1ère)

```
Étape 1 : On applique la règle de la puissance
         (x³)' = 3x²
```

(En verbosity `detailed` : "(xⁿ)' = nxⁿ⁻¹, ici n=3 donc (x³)' = 3x³⁻¹ = 3x²")

### Exemple 2 : `(x³ + 2x²)'` au lycée

```
Étape 1 : On dérive le premier terme x³
         (x³)' = 3x²
Étape 2 : On dérive le second terme 2x²
         (2x²)' = 4x
Étape 3 : On somme les dérivées
         (x³ + 2x²)' = 3x² + 4x
```

### Exemple 3 : `(x · sin(x))'` au lycée

```
Étape 1 : Pour le facteur sin(x)
         (sin(x))' = cos(x)
Étape 2 : On applique la règle du produit
         Avec u = x et v = sin(x), on a u' = 1 et v' = cos(x).
         (uv)' = u'v + uv' = sin(x) + x·cos(x)
```

(Note : `(x)' = 1` skippé car non top-level — sub-step implicite intégré dans l'explanation de productRule)

### Exemple 4 : `(sin(x²))'` au lycée

```
Étape 1 : On dérive l'argument x²
         (x²)' = 2x
Étape 2 : On applique la règle de la chaîne
         (sin(x²))' = cos(x²) · 2x
```

### Exemple 5 : Même `(sin(x²))'` au supérieur (verbosity summarized)

```
Étape 1 : (xⁿ)' = nxⁿ⁻¹
         (x²)' = 2x
Étape 2 : Composition
         (sin(x²))' = cos(x²) · 2x
```

### Exemple 6 : `(eˣ)'` au lycée

```
Étape 1 : Dérivée de l'exponentielle
         (eˣ)' = eˣ
```

### Exemple 7 : Question test complète Mode B

Question :

```typescript
{
  id: 'derive-cubic-1ere',
  grades: ['SPE_1'],
  shared: {
    correction: {
      feedback: { correct: 'Bravo !' },
      generatedSteps: {
        kind: 'differentiate',
        expression: 'x^3 + {{a}}*x^2 + {{b}}*x + {{c}}',
        variable: 'x',
      }
    }
  },
  variations: [{
    statement: 'Calcule la dérivée de f(x) = x³ + {{a}}x² + {{b}}x + {{c}}',
    variables: [
      { name: 'a', expression: '2' },
      { name: 'b', expression: '5' },
      { name: 'c', expression: '7' }
    ],
    blanks: [{ expectedAnswer: '3*x^2 + 2*{{a}}*x + {{b}}' }]
  }]
}
```

L'élève voit après `generateInstance()` :

```
Étape 1 : On dérive le terme x³
         (x³)' = 3x²
Étape 2 : On dérive le terme 2x²
         (2x²)' = 4x
Étape 3 : On dérive le terme 5x
         (5x)' = 5
Étape 4 : On dérive le terme 7
         (7)' = 0
Étape 5 : On somme les dérivées
         f'(x) = 3x² + 4x + 5
```

(Note : `(7)' = 0` est top-level d'un sous-arbre dans `sumRule` ? À trancher Phase 0 — probablement skippé pour ne pas alourdir, expliqué dans l'explanation de sumRule).

---

## Estimation finale

- **Temps total** : 12-15h
- **Sessions recommandées** : 1-2 sessions dédiées
- **Commits intermédiaires** : 4-5
- **Lignes de code** : ~1500-2000 LOC nouvelles + ~200-300 modifiées (instrumentation differentiate.ts)
- **Tests ajoutés** : ~60-80 (unitaires + snapshots)
- **Cas démontrés** : ~20-25 (sur 6 catégories)
