# Architecture du Systeme de Questions

> Documentation technique detaillee de l'architecture, des patterns et des decisions de conception.

---

## Vue d'ensemble

Le systeme de questions est une architecture **en couches** avec separation stricte des responsabilites :

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            COUCHE PRESENTATION                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  FlashCard  │  │ QuestionCard│  │ PreviewCard │  │  Input Components   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│                            COUCHE LOGIQUE METIER                            │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────────┐   │
│  │ Instance Generator│  │ Variable Resolver │  │  Content Resolver     │   │
│  └───────────────────┘  └───────────────────┘  └───────────────────────┘   │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────────┐   │
│  │  Random Generator │  │  Choice Shuffler  │  │  Template Validator   │   │
│  └───────────────────┘  └───────────────────┘  └───────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│                            COUCHE VALIDATION                                │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────────┐   │
│  │  Answer Validator │  │ Rule Evaluator    │  │ Constraint Validators │   │
│  └───────────────────┘  └───────────────────┘  └───────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│                         COUCHE INFRASTRUCTURE                               │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────────┐   │
│  │  Compute Engine   │  │ Custom Markdown   │  │   Unit System         │   │
│  └───────────────────┘  └───────────────────┘  └───────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│                            COUCHE DONNEES                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Supabase: question_templates                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Principes de conception

### 1. Separation Template / Instance

```
QuestionTemplate (statique)          QuestionInstance (dynamique)
┌─────────────────────────┐          ┌─────────────────────────┐
│ - Variables symboliques │   ──►    │ - Valeurs resolues      │
│ - Placeholders {{...}}  │ generate │ - Contenu final         │
│ - Multiple variations   │          │ - Une seule variation   │
│ - Stocke en BDD         │          │ - En memoire seulement  │
└─────────────────────────┘          └─────────────────────────┘
```

**Avantages** :

- Un template genere des milliers de questions differentes
- Reproductibilite via seed
- Separation stockage/execution

### 2. Pipeline de Resolution

Architecture **pipeline** pour la transformation des donnees :

```
┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
│  Template  │──►│  Variables │──►│  Contenu   │──►│  Instance  │
│  Brut      │   │  Resolues  │   │  Resolu    │   │  Complete  │
└────────────┘   └────────────┘   └────────────┘   └────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
    Substitution   Random Gen    Evaluation
    {{var}}        {{1..10}}     {{eval:...}}
```

### 3. Validation Multi-Niveau

```
Reponse Utilisateur
         │
         ▼
┌─────────────────────────────────────────┐
│  NIVEAU 1: Regles Dynamiques            │
│  (diviseur, multiple, predicat...)      │
│  → Si echec: incorrect                  │
└─────────────────────────────────────────┘
         │ (si pas de regles ou OK)
         ▼
┌─────────────────────────────────────────┐
│  NIVEAU 2: Validation Type              │
│  (numerique, algebrique, QCM...)        │
│  → Comparaison avec solution            │
└─────────────────────────────────────────┘
         │ (si correct)
         ▼
┌─────────────────────────────────────────┐
│  NIVEAU 3: Contraintes de Forme         │
│  (espaces, zeros, fractions reduites)   │
│  → Ajustement du score                  │
└─────────────────────────────────────────┘
         │
         ▼
    ValidationResult
```

---

## Structure des fichiers

### Arborescence du module

```
src/lib/questions/
├── index.ts                    # API publique (exports)
├── types.ts                    # Definitions TypeScript (793 lignes)
├── feedback.ts                 # Messages feedback francais
│
├── generator/                  # Generation d'instances
│   ├── instance-generator.ts   # Orchestrateur principal
│   ├── variable-resolver.ts    # Resolution variables
│   ├── content-resolver.ts     # Resolution markdown
│   ├── random-generator.ts     # Generation aleatoire
│   └── choice-shuffler.ts      # Melange Fisher-Yates
│
├── validators/                 # Validation templates
│   └── template-validator.ts   # Validation structure
│
├── compute-engine/             # Integration MathLive
│   └── wrapper.ts              # Wrapper Compute Engine
│
├── units/                      # Systeme d'unites
│   ├── definitions.ts          # Definitions unites
│   ├── parser.ts               # Parsing unites
│   └── validator.ts            # Validation unites
│
├── constraint-validators.ts    # 10 validateurs de forme
└── validation-rule-evaluator.ts # 7 regles dynamiques
```

### Dependances entre modules

```
                    ┌──────────────────┐
                    │    index.ts      │ (API publique)
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   types.ts    │    │  generator/   │    │  validators/  │
└───────────────┘    └───────┬───────┘    └───────┬───────┘
                             │                    │
        ┌────────────────────┼────────────────────┤
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│custom-markdown│    │compute-engine │    │    units/     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                    │
        └────────────────────┘
                    │
                    ▼
           @cortex-js/compute-engine
```

---

## Flux de donnees detaille

### 1. Stockage → Generation

```typescript
// 1. Recuperation depuis Supabase
const { data: template } = await supabase
  .from('question_templates')
  .select('*')
  .eq('id', templateId)
  .single();

// 2. Type du template (JSON stocke)
interface QuestionTemplate {
  id: string;
  type: QuestionType;
  title: string;
  shared?: SharedVariationDefaults;
  variations: QuestionVariation[];  // JSON array
  options?: { ... };                // JSON object
  // ... metadata
}

// 3. Generation
const result = generateInstance(template, seed);
```

### 2. Generation → Affichage

```typescript
// 1. Instance generee
const instance: QuestionInstance = {
  templateId: 'uuid',
  type: 'numerical_exact',
  statement: 'Calculer $$7 + 3$$',  // Deja resolu
  solution: '10',
  resolvedVariables: [
    { name: 'a', value: '7' },
    { name: 'b', value: '3' }
  ],
  // ...
};

// 2. Passage au composant
<FlashCard {instance} interactive />

// 3. Rendu conditionnel selon type
{#if instance.type.startsWith('numerical')}
  <NumericalInput bind:value={answer} />
{:else if instance.type === 'multiple_choice'}
  <MultipleChoiceInput choices={instance.shuffledChoices} />
{/if}
```

### 3. Saisie → Validation

```typescript
// 1. Capture reponse (depuis MathLive)
const userAnswer = '10';
const userAnswerLatex = '10'; // Format LaTeX

// 2. Appel validation
const result = validateAnswer(userAnswer, instance, userAnswerLatex);

// 3. Resultat
interface ValidationResult {
	isCorrect: boolean;
	status?: 'correct' | 'unoptimal_form' | 'bad_form' | 'incorrect';
	message?: string;
	feedback?: string;
	constraintViolations?: ConstraintViolation[];
}
```

---

## Patterns de conception utilises

### 1. Factory Pattern (Generation)

```typescript
// instance-generator.ts agit comme une Factory
function generateInstance(template: QuestionTemplate, seed?: number): GenerationResult {
	// Creation d'un objet complexe (QuestionInstance)
	// avec logique de construction encapsulee
}
```

### 2. Strategy Pattern (Validation par type)

```typescript
// Chaque type a sa propre strategie de validation
switch (type) {
	case 'numerical_exact':
	case 'numerical_decimal':
		return validateNumerical(userAnswer, solution, precision);

	case 'algebraic_transform':
		return validateAlgebraic(userAnswer, solution);

	case 'multiple_choice':
		return validateChoice(userAnswer, solution, multipleAnswers);

	case 'fill_in_blanks':
		return validateBlanks(userAnswer, blanks);
}
```

### 3. Chain of Responsibility (Contraintes)

```typescript
// Les contraintes sont verifiees en chaine
const checks = [
	{ id: 'spaces', check: () => checkSpaces(latex) },
	{ id: 'brackets', check: () => checkBrackets(latex) },
	{ id: 'zeros', check: () => checkZeros(text) }
	// ...
];

for (const { id, check } of checks) {
	const mode = constraints[id];
	if (mode && mode !== 'off') {
		const violations = check();
		// Traitement...
	}
}
```

### 4. Singleton (Compute Engine)

```typescript
// compute-engine/wrapper.ts
let engineInstance: ComputeEngine | null = null;

function getEngine(): ComputeEngine {
	if (!engineInstance) {
		engineInstance = new ComputeEngine();
	}
	return engineInstance;
}
```

### 5. Builder Pattern (Template avec Shared)

```typescript
// Construction progressive via fusion shared + variation
function resolveVariationWithShared(
	shared: SharedVariationDefaults | undefined,
	variation: QuestionVariation
): QuestionVariation {
	return {
		statement: variation.statement || shared?.statement,
		variables: mergeVariables(shared?.variables, variation.variables),
		solution: variation.solution ?? shared?.solution
		// ...
	};
}
```

---

## Gestion des etats

### Etats d'une question (FlashCard)

```
                    ┌─────────┐
                    │  IDLE   │ (instance chargee)
                    └────┬────┘
                         │ interaction utilisateur
                         ▼
                    ┌─────────┐
              ┌─────│ INPUT   │◄────────────────┐
              │     └────┬────┘                 │
              │          │ validation           │ retry
              │          ▼                      │
              │     ┌─────────┐                 │
              │     │VALIDATING│                │
              │     └────┬────┘                 │
              │          │                      │
              │    ┌─────┴─────┐                │
              │    │           │                │
              ▼    ▼           ▼                │
         ┌─────────┐     ┌──────────┐           │
         │ CORRECT │     │INCORRECT │───────────┘
         └────┬────┘     └────┬─────┘
              │               │
              ▼               ▼
         ┌─────────┐     ┌─────────┐
         │COMPLETE │     │SHOW_CORR│
         └─────────┘     └─────────┘
```

### Etats de validation

```typescript
type ValidationStatus =
	| 'correct' // Mathematiquement et formellement correct
	| 'unoptimal_form' // Correct mais forme ameliorable (partiel)
	| 'bad_form' // Correct mais forme obligatoire violee (0 pts)
	| 'incorrect' // Mathematiquement incorrect
	| 'empty'; // Pas de reponse
```

---

## Systeme de types

### Types principaux et leurs relations

```typescript
// Stockage (BDD)
QuestionTemplate
    │
    ├── QuestionVariation[]     // Variations du template
    │       │
    │       ├── QuestionVariable[]   // Variables de la variation
    │       ├── QuestionCorrection   // Correction structuree
    │       └── ValidationRule[]     // Regles dynamiques
    │
    └── SharedVariationDefaults // Defauts partages

// Runtime (memoire)
QuestionInstance
    │
    ├── ResolvedVariable[]      // Variables resolues
    ├── ResolvedCorrection      // Correction resolue
    └── ShuffledChoice[]        // Choix melanges (QCM)

// Validation
ValidationResult
    │
    ├── ConstraintViolation[]   // Violations de forme
    └── EvaluationResult        // Resultat regle dynamique
```

### Branded Types (Type Safety)

```typescript
// custom-markdown/types.ts

// Template non resolu (peut contenir {{...}})
type TemplateMarkdown = string & { __brand: 'TemplateMarkdown' };

// Contenu resolu (tous placeholders remplaces)
type ResolvedMarkdown = string & { __brand: 'ResolvedMarkdown' };

// Helpers
function templateMarkdown(s: string): TemplateMarkdown;
function resolvedMarkdown(s: string): ResolvedMarkdown;

// Le compilateur empeche de passer un template la ou un resolved est attendu
function renderStatement(content: ResolvedMarkdown): void;
```

---

## Integration externe

### MathLive / Compute Engine

```
┌─────────────────────────────────────────────────────────────┐
│                     UbuMaths Questions                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐       ┌─────────────────────────────┐  │
│  │ compute-engine/ │       │    Components (Svelte)      │  │
│  │    wrapper.ts   │       │  ┌─────────────────────────┐│  │
│  │                 │       │  │   <math-field>          ││  │
│  │ evaluateExpr()  │       │  │   (MathLive Web Comp)   ││  │
│  │ areEquivalent() │       │  └─────────────────────────┘│  │
│  │ simplifyExpr()  │       └─────────────────────────────┘  │
│  └────────┬────────┘                     │                  │
│           │                              │                  │
└───────────┼──────────────────────────────┼──────────────────┘
            │                              │
            ▼                              ▼
    ┌───────────────────────────────────────────────────────┐
    │            @cortex-js/compute-engine                  │
    │                                                       │
    │  - Parse LaTeX → MathJSON                             │
    │  - Evaluate expressions                               │
    │  - Symbolic equivalence                               │
    │  - Pattern matching                                   │
    └───────────────────────────────────────────────────────┘
```

### Custom Markdown Library

```
┌─────────────────────────────────────────────────────────────┐
│                   Questions Module                          │
│                                                             │
│  import { resolveVariables, resolveText } from              │
│          '$lib/custom-markdown';                            │
│                                                             │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  $lib/custom-markdown/                      │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   Tokenizer     │  │   Resolvers     │                   │
│  │                 │  │                 │                   │
│  │ - parseVarRef   │  │ - resolveVars   │                   │
│  │ - parseRandom   │  │ - resolveText   │                   │
│  │ - parseEval     │  │ - generateRand  │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   Validators    │  │   Transforms    │                   │
│  │                 │  │                 │                   │
│  │ - detectCycles  │  │ - displayOpts   │                   │
│  │ - validateVars  │  │ - shuffleTerms  │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Performance

### Optimisations implementees

| Optimisation             | Lieu                   | Impact                        |
| ------------------------ | ---------------------- | ----------------------------- |
| Singleton Compute Engine | `wrapper.ts`           | Evite re-creation couteuse    |
| PRNG seede               | `random-generator.ts`  | Determinisme sans etat global |
| Lazy imports MathLive    | Components             | Bundle splitting              |
| Cache CE interne         | Compute Engine         | Expressions re-parsees        |
| Limit attempts random    | `generateRandomNumber` | Evite boucle infinie          |

### Complexite algorithmique

| Operation              | Complexite | Notes                     |
| ---------------------- | ---------- | ------------------------- |
| Resolution variables   | O(n)       | n = nombre variables      |
| Detection cycles       | O(V + E)   | DFS sur graphe            |
| Shuffle Fisher-Yates   | O(n)       | n = nombre choix          |
| Validation contraintes | O(k \* n)  | k contraintes, n reponses |
| Equivalence CE         | O(?)       | Depend expression         |

---

## Securite

### Validation des entrees

```typescript
// Toute entree API validee via Zod
const questionGenerateSchema = z.object({
	templateId: z.string().uuid(),
	seed: z.number().int().optional()
});

// Validation au niveau +server.ts
export async function POST({ request }) {
	const validation = questionGenerateSchema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}
}
```

### Pas d'eval() JavaScript

```typescript
// INTERDIT: eval() ou Function()
// const result = eval(expression);

// CORRECT: Compute Engine pour evaluation securisee
const result = evaluateExpression(latex);
```

### Sanitization du contenu

```typescript
// MarkdownRenderer utilise DOMPurify
import DOMPurify from 'dompurify';

const sanitized = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', ...],
  ALLOWED_ATTR: ['class', 'href']
});
```

---

## Extensibilite

### Ajouter un nouveau type de question

1. **Ajouter le type** (`types.ts`):

```typescript
type QuestionType =
	| 'numerical_exact'
	// ...
	| 'new_type'; // Nouveau
```

2. **Creer le composant input** (`question-inputs/`):

```typescript
// NewTypeInput.svelte
interface Props {
	// Props specifiques
}
```

3. **Ajouter la validation** (`answer-validator.ts`):

```typescript
case 'new_type':
  return validateNewType(userAnswer, solution);
```

4. **Integrer dans FlashCard**:

```svelte
{:else if instance.type === 'new_type'}
  <NewTypeInput bind:value={answer} />
{/if}
```

### Ajouter une contrainte

1. **Definir l'ID** (`types.ts`):

```typescript
type ConstraintId =
	// ...
	'newConstraint';
```

2. **Implementer le validateur** (`constraint-validators.ts`):

```typescript
export function checkNewConstraint(answersLatex: string[]): number[] {
	// Retourner indices des violations
}
```

3. **Ajouter le feedback** (`feedback.ts`):

```typescript
newConstraint: {
  single: 'Message pour une reponse',
  multiple: 'Message pour plusieurs reponses'
}
```

### Ajouter une regle dynamique

1. **Definir le type** (`types.ts`):

```typescript
interface NewRule {
	type: 'new_rule';
	param1: string;
	param2?: number;
}

type ValidationRule =
	// ...
	NewRule;
```

2. **Implementer l'evaluateur** (`validation-rule-evaluator.ts`):

```typescript
function evaluateNewRule(rule: NewRule, ctx: EvaluationContext): EvaluationResult {
  // Logique de validation
}

// Dans evaluateRule():
case 'new_rule':
  return evaluateNewRule(rule, context);
```

---

## Diagramme de sequence complet

```
┌──────┐   ┌──────────┐   ┌───────────┐   ┌────────────┐   ┌──────────┐
│Client│   │FlashCard │   │ Generator │   │  Validator │   │    CE    │
└──┬───┘   └────┬─────┘   └─────┬─────┘   └─────┬──────┘   └────┬─────┘
   │            │               │               │               │
   │ load page  │               │               │               │
   │───────────►│               │               │               │
   │            │ generateInstance(template, seed)              │
   │            │──────────────►│               │               │
   │            │               │ validateTemplate              │
   │            │               │───────┐       │               │
   │            │               │◄──────┘       │               │
   │            │               │ resolveVariables              │
   │            │               │───────┐       │               │
   │            │               │       │ evaluateExpression    │
   │            │               │       │──────────────────────►│
   │            │               │       │◄──────────────────────│
   │            │               │◄──────┘       │               │
   │            │               │ resolveContent│               │
   │            │               │───────┐       │               │
   │            │               │◄──────┘       │               │
   │            │◄──────────────│               │               │
   │            │  instance     │               │               │
   │◄───────────│               │               │               │
   │  render    │               │               │               │
   │            │               │               │               │
   │ submit ans │               │               │               │
   │───────────►│               │               │               │
   │            │ validateAnswer(answer, instance)              │
   │            │──────────────────────────────►│               │
   │            │               │               │ checkRules    │
   │            │               │               │───────┐       │
   │            │               │               │◄──────┘       │
   │            │               │               │ validateType  │
   │            │               │               │──────────────►│
   │            │               │               │ areEquivalent │
   │            │               │               │◄──────────────│
   │            │               │               │ checkConstraints
   │            │               │               │───────┐       │
   │            │               │               │◄──────┘       │
   │            │◄──────────────────────────────│               │
   │            │  result       │               │               │
   │◄───────────│               │               │               │
   │  feedback  │               │               │               │
   │            │               │               │               │
```

---

## Voir aussi

- [index.md](index.md) - Vue d'ensemble
- [types.md](types.md) - Types de questions
- [generation.md](generation.md) - Pipeline de generation
- [validation.md](validation.md) - Systeme de validation
- [../../architecture/database-schema.md](../../architecture/database-schema.md) - Schema BDD
