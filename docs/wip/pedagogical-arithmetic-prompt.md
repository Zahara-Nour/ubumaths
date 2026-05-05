# Prompt : pipeline pédagogique arithmétique complet + `PedagogicalTarget` effectif + support `answerFormat`

> **Source** : continuation du travail `docs/wip/pedagogical-steppers-mvp-prompt.md` (commits MVP + Phase 6 livrés).
> **Périmètre** : trois axes interdépendants livrés ensemble (~24-33h).

## Contexte

Le **MVP steppers pédagogiques** a livré (commits `828668976`, `7a6b8a232`, `252434494`, `1b8cb8a28`, plus 17 commits Phase 6) :

- `mathAST/common/rewriting-engine.ts` — moteur paramétrable `rewrite(node, config)`
- `mathAST/common/step-renderer-base.ts` — types `RenderedStep`, `RenderOptions`, `PedagogicalRenderOptions`, `SchoolLevel`, `StepRenderer<TStep, TOptions>`
- `mathAST/common/technical-renderer.ts` — `GenericTechnicalRenderer`
- `mathAST/pedagogical-evaluate/types.ts` — **type-stubs sans implémentation** : `PedagogicalTarget`, `TargetForm`, `PedagogicalEvaluateOptions`
- `mathAST/step-generator/arithmetic-steps.ts` — utilise déjà `evaluate(exact)` (refactor MVP), mais **pas de règles pédagogiques avancées**
- `mathAST/pedagogical-solve/` — pipeline pédagogique séparé pour équations linéaires (modèle de référence pour ce prompt)
- `mathAST/solve/pedagogical-renderer.ts` — renderer SchoolLevel pour solve algorithmique

**Hors-scope du MVP, à livrer dans ce prompt** :

- Pipeline pédagogique arithmétique COMPLET (avec règles : regroupement, fractions, radicaux, notation scientifique)
- Implémentation effective de `PedagogicalTarget` (extraction + mapping vers rule-sets)
- Support `answerFormat` avec placeholders pour extraire le fragment de réponse

## Vision globale

Ce prompt couvre **trois axes interdépendants** qui doivent être livrés ensemble pour produire de la valeur :

1. **Pipeline pédagogique arithmétique** : pour calculer `2 + 3 × 4`, `1/3 + 1/6`, `√8`, `5 × 10^7 ÷ 100`, etc., en générant des étapes adaptées au niveau scolaire.
2. **`PedagogicalTarget` extraction effective** : convertir les paramètres existants d'une question (`requiredForm`, `precision`, `ConstraintOptions strict`, `ValidationRule`, `unit`, `answerFormat`) en une structure que le pipeline consomme pour orienter les étapes.
3. **Support `answerFormat`** : quand une question impose `answerFormats: { result: '10^?' }`, le pipeline doit non seulement mener à un résultat en notation scientifique, mais aussi extraire le fragment exposant pour le mettre en évidence.

Ces trois axes sont mutuellement dépendants :

- Le pipeline a besoin de `PedagogicalTarget` pour décider quelles règles charger
- `PedagogicalTarget` a besoin du support `answerFormat` pour ne pas être incomplet
- Le support `answerFormat` n'est utile que si le pipeline produit des étapes qui y mènent

Estimation : **24-33h** sur 1-2 sessions dédiées (avec commits intermédiaires).

## Estimation détaillée par phase

| Phase | Description                                                                           | Effort |
| ----- | ------------------------------------------------------------------------------------- | ------ |
| 0     | Spec TDD + validation utilisateur                                                     | 1h     |
| 1     | Infrastructure module `pedagogical-arithmetic/` (types, structure)                    | 2h     |
| 2     | `extractPedagogicalTarget()` + tests                                                  | 3-4h   |
| 3     | Rule-sets niveau 1 : opérations binaires + regroupement multiplications dans addition | 2-3h   |
| 4     | Rule-sets niveau 2 : fractions (mise au commun dénominateur, réduction)               | 3-4h   |
| 5     | Rule-sets niveau 3 : radicaux (extraction, multiplication, rationalisation)           | 2-3h   |
| 6     | Rule-sets niveau 4 : puissances + notation scientifique                               | 3-4h   |
| 7     | Support `answerFormat` avec placeholders                                              | 3-4h   |
| 8     | Pipeline orchestrateur + mapping `TargetForm → rule-sets`                             | 2-3h   |
| 9     | Démo + tests snapshot (modèle Phase 6 MVP avec banque de cas catégorisés)             | 2-3h   |
| 10    | Quality checks + commits intermédiaires + commit final                                | 1-2h   |

**Total : 24-33h**.

## Phases d'exécution

### Phase 0 — Spécification TDD (obligatoire avant tout code)

Conformément à `CLAUDE.md`, **proposer les comportements en français à l'utilisateur** et attendre validation.

#### Comportements à proposer

```markdown
## Fonctionnalité : pipeline pédagogique arithmétique + PedagogicalTarget + answerFormat

### A. Module `pedagogical-arithmetic/` (parallèle à `pedagogical-solve/`)

Nouveau module avec :

- `pipeline.ts` — orchestrateur qui prend une expression + options + target → étapes
- `pedagogical-rules/` — sous-dossier avec un fichier par catégorie de règles
- `renderer.ts` — renderer SchoolLevel-aware
- `target-extractor.ts` — extractPedagogicalTarget(instance, blank) → PedagogicalTarget
- `types.ts` — types spécifiques au domaine arithmétique
- `__tests__/` — tests unitaires + snapshot tests
- `demo-helpers.ts` — présentation côte-à-côte technique vs pédagogique
- `demo-cases/` — banque de cas catégorisés (modèle Phase 6 MVP)

### B. Catalogue de règles pédagogiques

#### Règles de niveau 1 — opérations arithmétiques basiques

- `evaluate-binary-add/sub/mul/div` : exécuter une opération binaire avec calcul exact
- `group-multiplications-in-addition` : `2 + 3×4 + 5×6` → `2 + 12 + 30` en UNE étape
- `group-divisions-in-multiplication` : pareil pour div×mul
- `priority-parentheses` : appliquer la priorité opératoire avec mise en évidence
- `simplify-trivial` : `x + 0`, `x × 1`, etc.

#### Règles de niveau 2 — fractions

- `to-common-denominator` : `1/3 + 1/6` → `2/6 + 1/6` (PGCD ou multiplication des dénominateurs selon niveau)
- `add-same-denominator` : `2/6 + 1/6` → `3/6`
- `reduce-fraction` : `3/6` → `1/2` (par PGCD)
- `multiply-fractions` : `2/3 × 5/7` → `(2×5)/(3×7)` → `10/21`
- `divide-fractions` : `(a/b) ÷ (c/d)` → `a/b × d/c`
- `improper-to-mixed` : `7/3` → `2 + 1/3` (selon niveau et target)

#### Règles de niveau 3 — radicaux

- `extract-perfect-square` : `√8` → `√(4×2)` → `2√2`
- `multiply-radicals` : `√2 × √3` → `√6`
- `rationalize-denominator` : `1/√2` → `√2/2`
- `simplify-square-root` : `√(a²)` → `a` (avec gestion du signe)

#### Règles de niveau 4 — puissances et notation scientifique

- `expand-small-power` : `2³` → `2 × 2 × 2 = 8` (pour primaire/début collège)
- `combine-powers-same-base` : `2³ × 2⁵` → `2⁸`
- `power-of-power` : `(2³)²` → `2⁶`
- `to-scientific-notation` : `5000000` → `5 × 10⁶`, `0.000037` → `3.7 × 10⁻⁵`
- `from-scientific-to-decimal` : `5 × 10⁶` → `5000000`
- `multiply-scientific` : `(3 × 10⁴) × (2 × 10⁻²)` → `6 × 10²`

### C. PedagogicalTarget extraction

Fonction `extractPedagogicalTarget(instance: QuestionInstance, blank?: InstanceBlank): PedagogicalTarget` qui :

- Cascade : blank > variation > shared
- Lit `requiredForm`, `precision`, `ConstraintOptions`, `ValidationRule[]`, `unit`, `answerFormat` (via `answerFormats[expressionName]`)
- Filtre `ConstraintOptions` pour ne garder que les modes 'strict' (les 'warn' n'imposent pas de structure pédagogique)
- Retourne un `PedagogicalTarget` ready-to-use par le pipeline

### D. Support `answerFormat` avec placeholders

Quand une question a `answerFormats: { result: '10^?' }` :

- L'extraction repère le `?` comme placeholder
- Le pipeline génère les étapes complètes (e.g. `100000 = 10^5`)
- Une étape finale "extraction du fragment" met en évidence ce que l'élève doit saisir : juste `5`
- Le rendu pédagogique distingue visuellement la "réponse complète" de la "réponse à saisir"

### E. Mapping TargetForm → rule-sets

Le pipeline charge dynamiquement les rule-sets selon le `TargetForm` :

- `'product'` → règles de factorisation
- `'sum'` → règles de développement (distributivité)
- `'fraction'` → règles de mise en fraction
- `'reduced-fraction'` → fraction + règle finale de réduction par PGCD
- `'power'` → règles de combinaison de puissances
- `'scientific'` → règle de conversion en notation scientifique
- `'decimal'` → règle d'évaluation en décimal final
- `{ pattern: '...' }` → reconnaissance hardcodée des patterns courants (Phase 9 ou plus tard, complexe)

### F. Adaptation structurelle par SchoolLevel

Pas seulement vocabulaire — la STRUCTURE des étapes change :

- **Primaire** : étapes maximales (chaque opération binaire séparée), vocabulaire simple
- **Collège** : regroupement opérations de même priorité, vocabulaire technique introduit
- **Lycée** : étapes condensées, notation compacte
- **Supérieur** : juste les étapes critiques, notation maximale

### G. Cohérence question ↔ correction

Le pipeline DOIT produire des étapes qui mènent à un résultat acceptable par la validation existante :

- Si `requiredForm: 'fraction'`, l'étape finale doit produire une fraction
- Si `ConstraintOptions.reducedFractions: 'strict'`, fraction réduite obligatoire
- Si `ConstraintOptions.signs: 'strict'`, éviter `5 + (-3)` à la fin (passer par `5 - 3`)

Une étape de "post-processing pédagogique" peut être ajoutée si le résultat naturel ne respecte pas ces contraintes.

### H. Format de rendu

- LaTeX dans `expressionLatex` (modèle Phase 6 : avec `\textcolor{blue}{...}` pour mettre en évidence l'opération appliquée)
- `\begin{aligned}` pour multi-lignes quand pertinent
- Verbosity gating : `summarized` = titres seuls, `detailed` = titres + équations

## Questions à trancher en Phase 0

1. **Nommage et localisation du module** : `pedagogical-arithmetic/` (parallèle à `pedagogical-solve/`) — confirmé ? Ou `pedagogical-evaluate/` (qui contient déjà les type-stubs) ? Recommandation : `pedagogical-arithmetic/` séparé, garde `pedagogical-evaluate/` pour les types généraux.

2. **Niveaux à supporter** : `'primaire' | 'college' | 'lycee' | 'superieur'` (4 niveaux comme MVP) OU 3 niveaux comme Phase 6 (sans primaire) ?

   - Pour l'arithmétique, le primaire EST pertinent (calcul mental, additions, multiplications).
   - Recommandation : 4 niveaux, avec règles applicables conditionnelles.

3. **Granularité des règles** : règles fines (une transformation par règle) OU règles groupées (plusieurs transformations en une étape) ?

   - Recommandation : fines en interne, groupement en post-processing optionnel selon SchoolLevel.

4. **Stratégie de terminaison du moteur** : `'deterministic'` (priorité fixe) OU `'cost-fixpoint'` (sélection par coût) ?

   - Recommandation : `'deterministic'` (cohérent avec `pedagogical-solve/`).

5. **Cas multi-chemins** : pour `1/3 + 1/6`, dénominateur commun via PGCD (=6) OU multiplication (=18) ?

   - Recommandation : un chemin canonique par SchoolLevel — collège utilise PGCD si l'élève sait, sinon multiplication.

6. **Format `answerFormat` parser** : où l'extraire ? Dans `target-extractor.ts` ou un module séparé `answer-format-parser.ts` ?

   - Recommandation : module séparé `answer-format-parser.ts` qui prend `'10^?'` → `{ template: '10^?', placeholderPath: ['superscript'] }`.

7. **`extractPedagogicalTarget` dépendances** : peut-il importer depuis `$lib/questions/types` (côté questions) ? OU il faut un type intermédiaire neutre ?

   - Recommandation : import direct OK (déjà fait dans `pedagogical-evaluate/types.ts` Phase 1.5 MVP).

8. **Gestion des cas non-couverts** : quand le pipeline rencontre une expression qu'il ne sait pas traiter (e.g. fonction transcendante en plein milieu) ?
   - Recommandation : skip silencieux + délégation à `evaluate(exact)` pour la valeur finale (comme `arithmetic-steps.ts` actuel).
```

**ATTENDRE LA VALIDATION DE L'UTILISATEUR avant de passer à la Phase 1.**

---

### Phase 1 — Infrastructure module `pedagogical-arithmetic/` (2h)

#### 1.1 Structure des fichiers

```
src/lib/mathAST/pedagogical-arithmetic/
├── types.ts                      # Types spécifiques (PedagogicalArithmeticStep, etc.)
├── pipeline.ts                   # Orchestrateur principal
├── target-extractor.ts           # extractPedagogicalTarget()
├── answer-format-parser.ts       # Parser pour answerFormat avec placeholders
├── renderer.ts                   # PedagogicalArithmeticRenderer
├── pedagogical-rules/
│   ├── index.ts                  # Export tous les rule-sets + loader by TargetForm/SchoolLevel
│   ├── basic-operations.ts       # Phase 3
│   ├── fractions.ts              # Phase 4
│   ├── radicals.ts               # Phase 5
│   ├── powers.ts                 # Phase 6
│   └── scientific-notation.ts    # Phase 6
├── demo-helpers.ts               # presentExpression() comme Phase 6
├── demo-cases/                   # Banque de cas catégorisés (Option C)
│   ├── basic.ts
│   ├── fractions.ts
│   ├── radicals.ts
│   ├── scientific.ts
│   ├── target-form-scenarios.ts  # Phase 9
│   └── index.ts
└── __tests__/
    ├── target-extractor.test.ts
    ├── pipeline.test.ts
    ├── answer-format-parser.test.ts
    ├── pedagogical-arithmetic-demo.test.ts  # Snapshots
    └── __snapshots__/
```

#### 1.2 Types principaux

```typescript
// types.ts
import type { MathNode } from '../types';
import type { Rule } from '../pattern/types';
import type { SchoolLevel, RenderedStep } from '../common/step-renderer-base';
import type { TargetForm, PedagogicalTarget } from '../pedagogical-evaluate/types';

/**
 * A pedagogical rule for arithmetic computation.
 */
export interface PedagogicalArithmeticRule {
	/** Unique identifier (used in step.rule and renderer lookup) */
	readonly name: string;

	/** Pattern + rewrite logic (reuses pattern engine from mathAST/pattern) */
	readonly rule: Rule;

	/** Which school levels this rule applies to */
	readonly applicableLevels: readonly SchoolLevel[];

	/** Priority (higher = tried first) */
	readonly priority: number;

	/** Description per SchoolLevel — fallback to lycee if absent */
	readonly descriptions: Partial<
		Record<SchoolLevel, (bindings: Record<string, MathNode>) => string>
	>;

	/** Optional explanation per SchoolLevel (only at verbosity 'detailed') */
	readonly explanations?: Partial<
		Record<SchoolLevel, (bindings: Record<string, MathNode>) => string>
	>;
}

/**
 * A step recorded during pedagogical arithmetic evaluation.
 */
export interface PedagogicalArithmeticStep {
	readonly id: number;
	readonly rule: string;
	readonly description: string;
	readonly before: MathNode;
	readonly after: MathNode;
	readonly bindings?: Record<string, MathNode>; // captured by pattern matching
	readonly verbosityLevel: Verbosity;
	readonly subSteps?: readonly PedagogicalArithmeticStep[]; // for grouped operations
}

/**
 * Result of running the pedagogical pipeline.
 */
export interface PedagogicalArithmeticResult {
	readonly finalNode: MathNode;
	readonly steps: readonly PedagogicalArithmeticStep[];
	readonly target?: PedagogicalTarget;
	/** When answerFormat is set, this is the fragment to display as "answer to enter" */
	readonly answerFragment?: { latex: string; placeholderPath: readonly string[] };
}
```

#### 1.3 Tests d'isolation des types

Vérifier la compilation des types et leur cohérence avec ceux du MVP (`PedagogicalTarget`, `TargetForm`, `RenderedStep`).

---

### Phase 2 — `extractPedagogicalTarget()` (3-4h)

#### 2.1 Implémentation

```typescript
// target-extractor.ts
import type { QuestionInstance, InstanceBlank } from '$lib/questions/types';
import type { PedagogicalTarget } from '../pedagogical-evaluate/types';

export function extractPedagogicalTarget(
	instance: QuestionInstance,
	blank?: InstanceBlank
): PedagogicalTarget {
	return {
		structure: blank?.requiredForm ?? instance.requiredForm,
		precision: blank?.precision ?? instance.precision,
		answerFormat: blank?.expressionName
			? instance.answerFormats?.[blank.expressionName]
			: undefined,
		unit: blank?.unit,
		strictCosmetics: filterStrictMode(instance.options?.constraints),
		validationRules: blank?.validationRules ?? instance.validationRules
	};
}

function filterStrictMode(
	constraints?: ConstraintOptions
):
	| Pick<ConstraintOptions, 'reducedFractions' | 'signs' | 'nullTerms' | 'factorOne' | 'zeros'>
	| undefined {
	if (!constraints) return undefined;
	const result: any = {};
	for (const key of ['reducedFractions', 'signs', 'nullTerms', 'factorOne', 'zeros'] as const) {
		if (constraints[key] === 'strict') result[key] = 'strict';
	}
	return Object.keys(result).length > 0 ? result : undefined;
}
```

#### 2.2 Tests

```typescript
// __tests__/target-extractor.test.ts
describe('extractPedagogicalTarget', () => {
  it('extracts requiredForm from blank when present (override variation)', () => { ... });
  it('falls back to variation requiredForm when blank has none', () => { ... });
  it('extracts precision with cascade blank > variation', () => { ... });
  it('extracts answerFormat from instance.answerFormats[blank.expressionName]', () => { ... });
  it('filters constraints to keep only strict modes', () => { ... });
  it('returns undefined fields when not specified', () => { ... });
  it('combines multiple sources correctly for a complex question', () => { ... });
});
```

#### 2.3 Cascade de résolution

Documenter clairement la règle : **blank > variation > shared**. Tester chaque champ avec ce cascade.

---

### Phase 3 — Rule-sets niveau 1 : opérations basiques + regroupement (2-3h)

#### 3.1 Règles à implémenter dans `pedagogical-rules/basic-operations.ts`

```typescript
import { P } from '../../pattern/builder';
import { evaluate } from '../../eval';
import type { PedagogicalArithmeticRule } from '../types';

// Règle : exécuter une addition de deux nombres
export const evaluateBinaryAdd: PedagogicalArithmeticRule = {
  name: 'evaluate-binary-add',
  rule: createRule(
    P.parse('a:number + b:number'),
    (bindings) => evaluate(P.add(bindings.get('a'), bindings.get('b')), { mode: 'exact' }).node
  ),
  applicableLevels: ['primaire', 'college', 'lycee', 'superieur'],
  priority: 100,
  descriptions: {
    primaire: (b) => `On additionne ${toLatex(b.a)} et ${toLatex(b.b)}`,
    college: () => `Addition`,
    lycee: () => `+`,
    superieur: () => `+`
  }
};

// Règle clé : regrouper toutes les multiplications dans une addition
export const groupMultiplicationsInAddition: PedagogicalArithmeticRule = {
  name: 'group-multiplications-in-addition',
  rule: /* pattern complexe : sum d'expressions dont au moins 2 sont des multiplications */,
  applicableLevels: ['college', 'lycee', 'superieur'],  // PAS en primaire
  priority: 200,  // priorité haute
  descriptions: {
    college: () => `On effectue d'abord les multiplications`,
    lycee: () => `Multiplications prioritaires`,
    superieur: () => `Priorité ×`
  }
};
```

#### 3.2 Décisions techniques

- Utiliser `pattern/match.ts` `matchSumPattern` avec sequence patterns pour le regroupement n-aire
- Cohérence avec primaire : ne PAS regrouper, montrer chaque multiplication séparément
- Le pipeline applique les règles en ordre de priorité décroissante

#### 3.3 Tests

```typescript
describe('basic-operations rules', () => {
  it('evaluates 2+3 with adapted descriptions per level', () => { ... });
  it('groups multiplications in 2+3×4+5×6 (college+)', () => {
    const steps = generatePedagogicalSteps('2+3×4+5×6', 'college');
    expect(steps).toHaveLength(2);  // groupement → addition
    expect(steps[0].rule).toBe('group-multiplications-in-addition');
  });
  it('does NOT group in primaire — each multiplication is its own step', () => {
    const steps = generatePedagogicalSteps('2+3×4+5×6', 'primaire');
    expect(steps.length).toBeGreaterThan(2);
  });
});
```

---

### Phase 4 — Rule-sets niveau 2 : fractions (3-4h)

#### 4.1 Règles à implémenter dans `pedagogical-rules/fractions.ts`

- `to-common-denominator`
- `add-same-denominator`
- `reduce-fraction`
- `multiply-fractions`
- `divide-fractions`
- `improper-to-mixed` (selon target)

#### 4.2 Décision Phase 0 sur le PGCD vs multiplication

Pour `1/3 + 1/6` :

- **Collège (4e+)** : utiliser PGCD si simple (`pgcd(3,6) = 3`, donc dénominateur commun = 6)
- **Collège (6e/5e)** : multiplication directe (`3 × 6 = 18`, étape de simplification finale)
- **Lycée+** : compact, juste mise au commun dénom + addition

#### 4.3 Cohérence avec PedagogicalTarget

- Si `target.strictCosmetics.reducedFractions === 'strict'` : forcer une étape finale de réduction même si déjà OK
- Si `target.structure === 'fraction'` ou `'reduced-fraction'` : ne PAS convertir en décimal final

#### 4.4 Tests

Couverture par scénarios : addition de fractions de même dénominateur, addition avec dénominateurs distincts, multiplication, division, simplification finale, gestion target `'reduced-fraction'`.

---

### Phase 5 — Rule-sets niveau 3 : radicaux (2-3h)

#### 5.1 Règles à implémenter dans `pedagogical-rules/radicals.ts`

- `extract-perfect-square` : `√8` → `√(4×2)` → `2√2`
- `multiply-radicals` : `√2 × √3` → `√6`
- `rationalize-denominator` : `1/√2` → `√2/2` (lycée+)
- `simplify-square-root-of-square` : `√(a²)` → `|a|` (lycée+)

#### 5.2 Niveaux applicables

- `extract-perfect-square` : collège (4e+) et lycée
- `multiply-radicals` : 4e+
- `rationalize-denominator` : lycée seulement
- `simplify-square-root-of-square` : lycée+ (avec gestion |a|)

#### 5.3 Délégation aux primitives mathAST

- `extract-perfect-square` peut utiliser `simplifyRadical()` de `normal/radical.ts` pour la décomposition
- Tests via cas connus : √8 → 2√2, √18 → 3√2, √45 → 3√5

---

### Phase 6 — Rule-sets niveau 4 : puissances + notation scientifique (3-4h)

#### 6.1 Règles puissances dans `pedagogical-rules/powers.ts`

- `expand-small-power` : `2³` → `2 × 2 × 2 = 8` (primaire/début collège, exposant ≤ 5)
- `combine-powers-same-base` : `2³ × 2⁵` → `2⁸` (4e+)
- `power-of-power` : `(2³)²` → `2⁶` (4e+)

#### 6.2 Règles notation scientifique dans `pedagogical-rules/scientific-notation.ts`

- `to-scientific-notation` : `5000000` → `5 × 10⁶`
- `from-scientific-to-decimal` : inverse
- `multiply-scientific` : `(3 × 10⁴) × (2 × 10⁻²)` → `6 × 10²`
- `add-scientific-same-power` : `3 × 10⁵ + 2 × 10⁵` → `5 × 10⁵`

#### 6.3 Cas particulier : nombres décimaux en notation scientifique

`0.000037` → `3.7 × 10⁻⁵` : extraction du logarithme, déplacement de la virgule. Étapes :

- "On compte le nombre de chiffres pour ramener à un nombre entre 1 et 10"
- "0.000037 = 3.7 × 10⁻⁵"

---

### Phase 7 — Support `answerFormat` avec placeholders (3-4h)

#### 7.1 Parser `answer-format-parser.ts`

```typescript
export interface AnswerFormatTemplate {
  /** Original template, e.g. "10^?" */
  readonly template: string;
  /** Path within the parsed AST to find the placeholder */
  readonly placeholderPath: readonly string[];
  /** Parsed AST with `?` replaced by a sentinel placeholder node */
  readonly templateAst: MathNode;
  /** Pattern that matches the expected answer shape */
  readonly matchPattern: Pattern;
}

export function parseAnswerFormat(format: string): AnswerFormatTemplate { ... }
```

#### 7.2 Extraction du fragment dans le pipeline

Quand `target.answerFormat` est présent :

1. Parser le template `'10^?'` → `templateAst` avec placeholder
2. Le pipeline produit l'étape "réponse complète" : `100000 = 10^5`
3. Étape supplémentaire "extraction du fragment" : matcher l'expression finale contre `templateAst`, extraire le fragment au `placeholderPath`
4. Renderer met en évidence : titre "Ce qu'il faut saisir : 5"

#### 7.3 Rendu visuel

Dans `RenderedStep`, ajouter optionnellement :

```typescript
interface RenderedStep {
	// ... existing fields ...
	/** When answerFormat is set : the fragment the student must enter */
	readonly answerFragmentLatex?: string;
}
```

Le composant Svelte (Phase ultérieure d'intégration aux corrections) peut afficher ce fragment de manière distincte.

#### 7.4 Tests

- Parser : `'10^?'`, `'?\\times 10^?'`, `'\\sqrt{?}'` correctement parsés
- Extraction : sur `100000`, vu comme `10^5`, fragment extrait = `5`
- Cohérence avec `target.structure` : si `'scientific'`, l'extraction marche après conversion en notation scientifique

---

### Phase 8 — Pipeline orchestrateur (2-3h)

#### 8.1 Implémentation `pipeline.ts`

```typescript
import { rewrite } from '../common/rewriting-engine';
import { extractPedagogicalTarget } from './target-extractor';
import { loadPedagogicalRules } from './pedagogical-rules';
import { parseAnswerFormat, extractAnswerFragment } from './answer-format-parser';
import type { PedagogicalArithmeticResult } from './types';

export function generatePedagogicalArithmeticSteps(
  expression: MathNode,
  options: {
    schoolLevel: SchoolLevel;
    target?: PedagogicalTarget;
    verbosity?: Verbosity;
    signal?: AbortSignal;
  }
): PedagogicalArithmeticResult {
  const target = options.target;

  // 1. Charger les rule-sets selon target + schoolLevel
  const rules = loadPedagogicalRules({
    schoolLevel: options.schoolLevel,
    targetForm: target?.structure,
    needsReducedFractions: target?.strictCosmetics?.reducedFractions === 'strict',
    needsScientificFinal: target?.structure === 'scientific',
    // ... autres flags dérivés du target
  });

  // 2. Lancer le moteur de réécriture en mode déterministe
  const collected: PedagogicalArithmeticStep[] = [];
  const result = rewrite(expression, {
    rules: rules.map(r => r.rule),
    strategy: { kind: 'deterministic' },
    maxIterations: 50,
    onStep: (step) => collected.push(/* enrichir avec rule.descriptions[schoolLevel] */),
    signal: options.signal,
  });

  // 3. Étape finale : si pas tout simplifié, déléguer à evaluate(exact)
  let finalNode = result.result;
  if (!isFullyEvaluated(finalNode)) {
    const evalResult = evaluate(finalNode, { mode: 'exact' });
    if (evalResult.status === 'value') {
      collected.push(/* étape "On évalue" */);
      finalNode = evalResult.node;
    }
  }

  // 4. Post-processing pédagogique selon target.strictCosmetics
  if (target?.strictCosmetics?.reducedFractions === 'strict' && /* fraction non réduite */) {
    /* ajouter étape "On réduit la fraction" */
  }

  // 5. Extraction de fragment si answerFormat
  let answerFragment;
  if (target?.answerFormat) {
    const template = parseAnswerFormat(target.answerFormat);
    answerFragment = extractAnswerFragment(finalNode, template);
    /* ajouter étape "Ce qu'il faut saisir" */
  }

  return { finalNode, steps: collected, target, answerFragment };
}
```

#### 8.2 Mapping `TargetForm → rule-sets`

```typescript
// pedagogical-rules/index.ts
export function loadPedagogicalRules(opts: {
	schoolLevel: SchoolLevel;
	targetForm?: TargetForm;
	needsReducedFractions?: boolean;
	needsScientificFinal?: boolean;
}): readonly PedagogicalArithmeticRule[] {
	const baseRules = [...basicOperations, ...fractions, ...radicals, ...powers].filter((r) =>
		r.applicableLevels.includes(opts.schoolLevel)
	);

	// Add target-specific terminal rules
	const terminalRules: PedagogicalArithmeticRule[] = [];
	if (opts.targetForm === 'scientific' || opts.needsScientificFinal) {
		terminalRules.push(toScientificNotation);
	}
	if (opts.targetForm === 'reduced-fraction' || opts.needsReducedFractions) {
		terminalRules.push(reduceFractionForce);
	}
	if (opts.targetForm === 'product') {
		/* règles factorisation */
	}
	// ... etc.

	return [...baseRules, ...terminalRules];
}
```

#### 8.3 Renderer

```typescript
// renderer.ts — calque Phase 2 MVP solve/pedagogical-renderer.ts
export class PedagogicalArithmeticRenderer
	implements StepRenderer<PedagogicalArithmeticStep, PedagogicalRenderOptions>
{
	render(step, options): RenderedStep {
		const rule = findRuleByName(step.rule);
		const titleFn =
			rule?.descriptions[options.schoolLevel] ??
			rule?.descriptions.lycee ??
			(() => step.description);
		const explainFn =
			options.verbosity === 'detailed' ? rule?.explanations?.[options.schoolLevel] : undefined;

		return {
			id: step.id,
			rule: step.rule,
			title: titleFn(step.bindings ?? {}),
			explanation: explainFn?.(step.bindings ?? {}),
			expressionLatex: this.formatTransformation(step),
			schoolLevel: options.schoolLevel,
			subSteps: step.subSteps?.map((s) => this.render(s, options))
		};
	}

	renderAll(steps, options) {
		return steps.map((s) => this.render(s, options));
	}

	private formatTransformation(step: PedagogicalArithmeticStep): string {
		// Avec couleur sur l'opération appliquée (modèle Phase 6)
		return `\\textcolor{blue}{${toLatex(step.before)}} \\quad\\Rightarrow\\quad ${toLatex(step.after)}`;
	}
}
```

---

### Phase 9 — Démo + tests snapshot (2-3h)

#### 9.1 Banque de cas catégorisés (modèle Phase 6 MVP)

```
demo-cases/
├── basic.ts                  # 2+3, 2+3×4, etc.
├── fractions.ts              # 1/3+1/6, 2/3×5/7, etc.
├── radicals.ts               # √8, √2×√3, 1/√2, etc.
├── scientific.ts             # 5000000, 0.000037, (3×10⁴)×(2×10⁻²), etc.
├── target-form-scenarios.ts  # cas avec différents PedagogicalTarget
├── answer-format-scenarios.ts # cas avec answerFormat
└── index.ts                  # ALL_CATEGORIES
```

Chaque cas a :

```typescript
{ label: string; expression: string; target?: PedagogicalTarget; expectedSchoolLevels?: SchoolLevel[] }
```

#### 9.2 Test snapshot avec `it.each`

```typescript
// __tests__/pedagogical-arithmetic-demo.test.ts
import { ALL_CATEGORIES } from '../demo-cases';

for (const category of ALL_CATEGORIES) {
	describe(`snapshot — ${category.name}`, () => {
		it.each(category.cases)('$label', (testCase) => {
			const expression = parseLatex(testCase.expression);
			const output: Record<SchoolLevel, string> = {} as any;

			for (const level of testCase.expectedSchoolLevels ?? [
				'primaire',
				'college',
				'lycee',
				'superieur'
			]) {
				const result = generatePedagogicalArithmeticSteps(expression, {
					schoolLevel: level,
					target: testCase.target,
					verbosity: 'detailed'
				});
				const renderer = new PedagogicalArithmeticRenderer();
				const rendered = renderer.renderAll(result.steps, {
					schoolLevel: level,
					verbosity: 'detailed'
				});
				output[level] = formatRenderedSteps(rendered);
			}

			expect(output).toMatchSnapshot();
		});
	});
}
```

#### 9.3 Script CLI standalone

```typescript
// scripts/pedagogical-arithmetic-demo.ts
// Usage: pnpm tsx scripts/pedagogical-arithmetic-demo.ts [categories...]
```

Modèle exact de `scripts/pedagogical-solve-demo.ts` (Phase 6 MVP).

---

### Phase 10 — Quality checks + commits (1-2h)

#### Commits intermédiaires recommandés

| Commit | Phases couvertes                                         | Estimation cumulée |
| ------ | -------------------------------------------------------- | ------------------ |
| 1      | Phase 1 (infrastructure) + Phase 2 (extractTarget)       | 5-6h               |
| 2      | Phase 3 (basic operations + groupement)                  | 7-9h               |
| 3      | Phase 4 (fractions)                                      | 10-13h             |
| 4      | Phase 5 (radicaux) + Phase 6 (puissances + scientifique) | 15-20h             |
| 5      | Phase 7 (answerFormat)                                   | 18-24h             |
| 6      | Phase 8 (orchestrateur) + Phase 9 (démo)                 | 22-30h             |

Le commit final regroupe les snapshots + doc.

#### Quality checks à la FIN

- `npx eslint <fichiers modifiés>`
- `pnpm check:incremental`
- Pas de fichiers `.svelte` modifiés (donc pas de svelte-autofixer)
- `pnpm test:server src/lib/mathAST` (full regression)

#### Doc de progression

Mettre à jour `docs/wip/pedagogical-arithmetic-progress.md` au fur et à mesure (modèle `pedagogical-steppers-mvp-progress.md`).

#### Commits via `commit-manager` agent

Pour chaque commit intermédiaire : conventional commit, **PAS de Co-Authored-By: Claude**.

---

## Hors scope (à NE PAS faire dans ce prompt)

- **Stepper différentiation** (autre prompt à venir)
- **Renderers pédagogiques pour autres domaines** : integration, limits, matrix, domain (séparément)
- **Pipeline pédagogique pour simplification d'expression** : `(x+1)² → x²+2x+1` etc.
- **Intégration aux corrections de questions** (`QuestionCorrection.generatedSteps`) — ce prompt PRÉPARE l'intégration via `extractPedagogicalTarget` mais ne TOUCHE PAS aux composants Svelte ni au schéma `QuestionCorrection`. C'est un prompt séparé.
- **Modes `SymbolicComputation`** (Mode 0, Mode 2 de Poincaré) — pour questions avec fonctions paramétriques
- **`NormalizeTarget`** à 3 niveaux — refactor `normalize.ts`
- **Reconnaissance d'unités dérivées** (Poincaré-style)
- **Investigation root-cause load-order issue** de `common/index.ts`

## Décisions architecturales validées (issues des sessions précédentes)

### A. Pipeline parallèle, pas modification de l'existant

`evaluate()` algorithmique passe par `normalize()` qui n'est pas pédagogique. **NE PAS le modifier**. Le pipeline pédagogique est un MODULE SÉPARÉ qui :

- Réutilise l'infrastructure (rewriting-engine, step-renderer-base)
- Délègue à `evaluate(exact)` pour les calculs intermédiaires (précision exacte)
- Mais a son propre flow top-down et ses propres règles

### B. `arithmetic-steps.ts` actuel conservé

Le refactor MVP a allégé `arithmetic-steps.ts` (délégation `evaluate(exact)`). **NE PAS le supprimer**. Il sert pour les usages "simples" qui ne veulent pas charger tout le pipeline pédagogique. Le nouveau pipeline est une OPTION enrichie, pas un remplaçant.

À discuter en Phase 0 : faut-il que `arithmetic-steps.ts` devienne un wrapper du nouveau pipeline ? Ou les deux coexistent indépendamment ? **Reco** : coexistence pour l'instant, fusion possible ultérieurement.

### C. PedagogicalTarget agrège les paramètres question

Pas un nouveau champ ajouté à `QuestionTemplate`. Le `PedagogicalTarget` est CALCULÉ à la demande depuis `QuestionInstance` + éventuellement `InstanceBlank`. Voir `extractPedagogicalTarget()` Phase 2.

### D. TargetForm réutilise RequiredForm

`TargetForm = RequiredForm | 'scientific' | 'reduced-fraction' | 'decimal'`. Type stub déjà déclaré dans `pedagogical-evaluate/types.ts` (MVP Phase 1.5).

### E. answerFormat n'est PAS modifié, juste consommé

Le système `answerFormats` côté questions reste tel quel. Le nouveau parser `answer-format-parser.ts` LIT le format (`'10^?'`) pour orienter les étapes pédagogiques et extraire le fragment final.

### F. Mode locale metric/imperial — hors scope

Le support `unit.required` du target peut être lu mais pas pleinement exploité (les conversions impériales dépendent du prompt `units-imperial-affine-prompt.md` indépendant).

### G. AbortSignal réutilisé

Le pipeline accepte `signal?: AbortSignal` et le propage à `rewrite()` qui propage à `evaluate(exact)` (lui-même supportant abort). **Pas de réimplémentation**.

## Critères d'acceptation

1. **Aucune régression** sur les ~12000 tests `mathAST + math + geometry-core/compute` (au moment du démarrage)
2. **`extractPedagogicalTarget()` testé** : cascade blank > variation > shared, gestion des champs absents
3. **Pipeline opérationnel sur les 4 niveaux scolaires** pour :
   - Opérations basiques : `2+3×4+5×6` → étapes différentes selon niveau
   - Fractions : `1/3 + 1/6 = 1/2` avec étapes intermédiaires visibles
   - Radicaux : `√8 = 2√2` avec extraction du facteur parfait
   - Notation scientifique : `5000000 = 5 × 10⁶`
4. **Support `answerFormat`** : pour `answerFormats: { result: '10^?' }`, le pipeline extrait le fragment exposant
5. **Cohérence target → étapes** : si `requiredForm: 'fraction'` + `reducedFractions: 'strict'`, l'étape finale est une fraction réduite
6. **Banque de cas catégorisés** : au moins 6 catégories (basic, fractions, radicaux, scientifique, target-form-scenarios, answer-format-scenarios) avec ≥3 cas chacun
7. **Tests snapshot stables** sur tous les cas
8. **Script CLI standalone** : `pnpm tsx scripts/pedagogical-arithmetic-demo.ts [catégories...]` fonctionne
9. **Documentation de progression** écrite dans `docs/wip/pedagogical-arithmetic-progress.md`
10. **0 erreur ESLint, 0 nouvelle erreur TypeScript**
11. **Commits créés via commit-manager** (multi-fichiers complexes), conventional commits, **PAS de Co-Authored-By: Claude**

## Pré-requis pour démarrer

Lire dans l'ordre :

### Documentation projet

1. `CLAUDE.md` (racine) — règles essentielles, TDD obligatoire
2. `docs/ref/tests/tdd.md` — workflow TDD collaboratif
3. `docs/wip/pedagogical-steppers-mvp-progress.md` — état complet du MVP livré + Phase 6
4. `docs/wip/pedagogical-steppers-mvp-prompt.md` — décisions architecturales du MVP (référence)

### Infrastructure existante (à comprendre avant de coder)

5. `src/lib/mathAST/common/rewriting-engine.ts` — moteur `rewrite(node, config)` à utiliser
6. `src/lib/mathAST/common/step-renderer-base.ts` — types renderer
7. `src/lib/mathAST/common/technical-renderer.ts` — exemple de renderer générique
8. `src/lib/mathAST/common/abort.ts` — `AbortSignal` infrastructure
9. `src/lib/mathAST/pedagogical-evaluate/types.ts` — type-stubs `PedagogicalTarget`, `TargetForm` (à compléter en partie)

### Modèle de référence (Phase 6 MVP)

10. `src/lib/mathAST/pedagogical-solve/` — modèle complet : pipeline + renderer + types + demo-helpers + demo-equations
11. `src/lib/mathAST/pedagogical-solve/__tests__/linear-demo.test.ts` — modèle de tests snapshot
12. `scripts/pedagogical-solve-demo.ts` — modèle de script CLI standalone

### À refactorer minimalement (ou laisser tel quel selon décision Phase 0)

13. `src/lib/mathAST/step-generator/arithmetic-steps.ts` — état actuel, peut servir d'inspiration ou de wrapper

### Système de questions (pour `extractPedagogicalTarget`)

14. `src/lib/questions/types.ts` — `QuestionTemplate`, `QuestionInstance`, `InstanceBlank`, `RequiredForm`, `PrecisionType`, `ConstraintOptions`, `ValidationRule`
15. `src/lib/questions/required-form-validator.ts` — pour comprendre comment `RequiredForm` est validée actuellement
16. `src/lib/utils/answer-validator.ts` — pour comprendre où la validation est invoquée

### Pattern matching (pour les règles)

17. `src/lib/mathAST/pattern/builder.ts` — `P.parse()` pour créer des patterns
18. `src/lib/mathAST/pattern/rule.ts` — `createRule()` et `applyRulesWithSteps()`
19. `src/lib/mathAST/pattern/match.ts` — `matchSumPattern` (pour patterns n-aires)
20. `src/lib/mathAST/pattern/README.md` — doc du système de patterns

### Mathématiques utilitaires

21. `src/lib/mathAST/normal/radical.ts` — `simplifyRadical()` pour extraction de facteur parfait
22. `src/lib/mathAST/normal/rational.ts` — opérations sur rationnels exacts
23. `src/lib/mathAST/eval/evaluate.ts` — `evaluate(node, { mode: 'exact' })`
24. `src/lib/mathAST/factory.ts` — constructeurs d'AST

## Notes importantes

### Stratégie de découpage en sessions

Vu l'ampleur (24-33h), prévoir **2 sessions** :

**Session 1** (~12-15h) : Phases 0-3 + premier commit + premières démonstrations sur les opérations basiques

**Session 2** (~12-18h) : Phases 4-10 (fractions, radicaux, puissances, answerFormat, orchestration, démo, finalisation)

Si l'utilisateur préfère un tunnel continu : tout en une session avec pauses régulières et commits intermédiaires.

### Stratégie de sub-agents

- **`code-reviewer`** (Opus) après chaque phase significative
- **`typescript-expert`** (Opus) si problème de types complexes (e.g. discriminated unions sur PedagogicalArithmeticStep)
- **`debugger`** (Opus) si tests échouent inexplicablement
- **`commit-manager`** pour chaque commit intermédiaire

### Décision sur la cohabitation `arithmetic-steps.ts` / nouveau pipeline

À trancher en Phase 0. Trois options :

- **Option α** : coexistence (recommandé) — `arithmetic-steps.ts` reste, le nouveau pipeline est une OPTION enrichie
- **Option β** : `arithmetic-steps.ts` devient un wrapper qui délègue au nouveau pipeline pour primaire/college/lycee/superieur
- **Option γ** : suppression de `arithmetic-steps.ts`, migration de ses callers vers le nouveau pipeline

Reco : Option α au début. Migration possible plus tard si Option β ou γ devient évidente.

### En cas de blocage

Ne pas s'éterniser sur une règle individuelle. Si une règle prend visiblement beaucoup plus que prévu :

1. Faire un commit intermédiaire de l'état actuel
2. Documenter la difficulté dans la doc de progression
3. Proposer une alternative simplifiée à l'utilisateur (e.g. "skip cette règle pour le MVP, on l'ajoutera plus tard")

### Cas pathologiques à NE PAS oublier

- `0/0`, `0×x`, `x/0` → `Undefined` (pas de plantage)
- Grandes valeurs : `2^100` reste exact (BigInt natif)
- Profondeur d'expression : `((x+1)^4)^4` ne doit pas exploser le pipeline
- AbortSignal : pipeline interruptible

### Cohérence avec Phase 6 MVP

Le code DOIT être cohérent avec le style de `pedagogical-solve/` :

- Même nomenclature pour les fichiers
- Même structure pour les rule-sets
- Même approche pour les snapshots tests
- Même style de demo CLI
- Couleurs LaTeX (`\textcolor{blue}{...}`) pour mettre en évidence l'opération

Si `pedagogical-solve/` a une convention que ce prompt ne mentionne pas explicitement : **suivre la convention de Phase 6 MVP** par défaut.

---

## Annexe : exemples concrets attendus

### Exemple 1 : `2 + 3 × 4 + 5 × 6` au collège

```
Étape 1 : On effectue d'abord les multiplications
  2 + 3 × 4 + 5 × 6  ⇒  2 + 12 + 30
Étape 2 : On additionne
  2 + 12 + 30  ⇒  44
```

### Exemple 2 : `1/3 + 1/6` au collège

```
Étape 1 : On met au même dénominateur (PGCD = 6)
  1/3 + 1/6  ⇒  2/6 + 1/6
Étape 2 : On additionne les numérateurs
  2/6 + 1/6  ⇒  3/6
Étape 3 : On simplifie la fraction
  3/6  ⇒  1/2
```

### Exemple 3 : `√8` au collège (4e)

```
Étape 1 : On décompose 8 en facteurs incluant un carré parfait
  √8  ⇒  √(4 × 2)
Étape 2 : On extrait le facteur √4 = 2
  √(4 × 2)  ⇒  2√2
```

### Exemple 4 : `5000000` en notation scientifique avec target `'scientific'`

```
Étape 1 : On compte les chiffres pour ramener à un nombre entre 1 et 10
  5000000 = 5 × 10⁶
```

Si `answerFormats: { result: '10^?' }` :

```
Étape 1 : On convertit en notation scientifique
  5000000 = 5 × 10⁶
Étape 2 : On identifie l'exposant à saisir
  Exposant : 6
```

### Exemple 5 : `(3 × 10⁴) × (2 × 10⁻²)` au lycée

```
Étape 1 : On multiplie les coefficients et on additionne les exposants
  (3 × 10⁴) × (2 × 10⁻²)  ⇒  6 × 10²
```

### Exemple 6 : `2 + 3 × 4` au primaire (pas de regroupement)

```
Étape 1 : On calcule la multiplication d'abord (priorité)
  2 + 3 × 4  ⇒  2 + 12
Étape 2 : On additionne
  2 + 12  ⇒  14
```

### Exemple 7 : Cohérence target — `1/3 + 1/6` avec `requiredForm: 'fraction'` + `reducedFractions: 'strict'`

Mêmes étapes que l'exemple 2, garantissant que le résultat final est `1/2` (réduit) et non `3/6`.

### Exemple 8 : Cohérence target — `2/4` avec `requiredForm: 'reduced-fraction'`

```
Étape 1 : On simplifie la fraction (PGCD = 2)
  2/4  ⇒  1/2
```

Si pas de target ou target sans contrainte stricte : l'étape n'est PAS ajoutée (on retourne `2/4` tel quel si l'élève l'a saisi).

---

## Estimation finale

- **Temps total** : 24-33h
- **Sessions recommandées** : 1-2 sessions dédiées
- **Commits intermédiaires** : 5-6
- **Lignes de code** : ~3000-4000 LOC nouvelles + ~500 modifiées
- **Tests ajoutés** : ~80-120 (unitaires + snapshots)
- **Cas démontrés** : ~25-30 (sur 6+ catégories)
