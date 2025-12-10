# Pipeline de Generation

> Comment un template devient une instance executable.

---

## Vue d'ensemble

La generation transforme un `QuestionTemplate` (structure statique) en `QuestionInstance` (prete a l'affichage).

**Fichier principal** : `src/lib/questions/generator/instance-generator.ts`

---

## Les 7 etapes

```
QuestionTemplate
       |
       v
[1. VALIDATION]           validateTemplate()
       |
       v
[2. SELECTION VARIATION]  seed % variations.length
       |
       v
[3. FUSION DEFAUTS]       shared + variation
       |
       v
[4. DETECTION CYCLES]     detectCircularDependencies()
       |
       v
[5. RESOLUTION VARIABLES] Pipeline 3 etapes
       |
       v
[6. RESOLUTION CONTENU]   statement, solution, correction
       |
       v
[7. TRAITEMENT TYPE]      Melange choix, blancs
       |
       v
QuestionInstance
```

---

## Etape 1 : Validation

```typescript
const errors = validateTemplate(template);
if (errors.length > 0) {
	return { success: false, errors };
}
```

**Validations effectuees** :

- Au moins une variation
- Chaque variation a `statement` et `solution`
- Types specifiques : `choices` pour multiple_choice, `blanks` pour fill_in_blanks
- Variables definies avant utilisation

---

## Etape 2 : Selection de variation

```typescript
const variationIndex =
	seed !== undefined
		? Math.abs(seed) % template.variations.length
		: Math.floor(Math.random() * template.variations.length);

const selectedVariation = template.variations[variationIndex];
```

**Determinisme** :

- Meme seed = meme variation
- Utile pour reproductibilite (reviews SRS, partage)

---

## Etape 3 : Fusion des defauts

```typescript
const resolved = resolveVariationWithShared(template.shared, selectedVariation);
```

**Regles de fusion** :

| Champ             | Comportement                              |
| ----------------- | ----------------------------------------- |
| `variables`       | **Concatenation** : shared puis variation |
| `statement`       | Variation prioritaire, sinon shared       |
| `solution`        | Variation prioritaire, sinon shared       |
| `correction`      | Variation prioritaire, sinon shared       |
| `choices`         | Variation prioritaire, sinon shared       |
| `validationRules` | Variation prioritaire, sinon shared       |

**Exemple** :

```typescript
// shared.variables = [{ name: 'min', expression: '1' }]
// variation.variables = [{ name: 'a', expression: '{{min}}..10' }]
// Resultat: [min, a] (dans cet ordre)
```

---

## Etape 4 : Detection des cycles

```typescript
if (resolved.variables) {
	const cycleResult = detectCircularDependencies(resolved.variables);
	if (!cycleResult.valid) {
		return {
			success: false,
			errors: [`Dependance circulaire: ${cycleResult.cycle.join(' -> ')}`]
		};
	}
}
```

**Detection** :

- Analyse les references `{{var}}` dans chaque expression
- Construit un graphe de dependances
- Detecte les cycles via DFS

**Exemple de cycle** :

```typescript
variables: [
	{ name: 'a', expression: '{{b}}' }, // a depend de b
	{ name: 'b', expression: '{{c}}' }, // b depend de c
	{ name: 'c', expression: '{{a}}' } // c depend de a -> CYCLE!
];
// Erreur: "a -> b -> c -> a"
```

---

## Etape 5 : Resolution des variables

```typescript
const resolvedVariables = resolveVariables(resolved.variables || [], seed);
```

**Pipeline 3 etapes** (voir [parameterization.md](parameterization.md)) :

```
ETAPE 1: SUBSTITUTION VARIABLES
  {{autreVar}} -> valeur deja resolue

ETAPE 2: GENERATION ALEATOIRE
  {{1..10}}    -> entier aleatoire
  {{a|b|c}}    -> selection liste

ETAPE 3: EVALUATION MATHEMATIQUE
  {{eval:a+b}} -> calcul expression
```

**Ordre important** : Les variables sont resolues dans l'ordre de declaration.

---

## Etape 6 : Resolution du contenu

```typescript
// Statement
const statement = resolveMarkdownContent(resolved.statement, resolvedVariables, seed);

// Solution
const solution = resolveSolution(resolved.solution, resolvedVariables, seed);

// Correction (si presente)
const correction = resolved.correction
	? resolveCorrection(resolved.correction, resolvedVariables, seed)
	: undefined;
```

**Processus** :

1. Parcourir le texte pour trouver `{{...}}`
2. Remplacer par la valeur resolue
3. Appliquer displayOptions si presentes

---

## Etape 7 : Traitement type-specifique

### Multiple Choice

```typescript
if (template.type === 'multiple_choice' && resolved.choices) {
	// Resoudre le contenu de chaque choix
	const resolvedChoices = resolved.choices.map((choice) => ({
		content: resolveMarkdownContent(choice.content, resolvedVariables, seed),
		isCorrect: choice.isCorrect
	}));

	// Melanger avec Fisher-Yates
	const shuffledChoices = shuffleChoices(resolvedChoices, seed);
	// shuffledChoices[i].originalIndex preserve l'index original
}
```

### Fill in Blanks

```typescript
if (template.type === 'fill_in_blanks' && resolved.blanks) {
	const resolvedBlanks = resolved.blanks.map((blank) => ({
		position: blank.position,
		expectedAnswer: resolveVariableExpression(blank.expectedAnswer, resolvedVariables, seed)
	}));
}
```

---

## Resultat : QuestionInstance

```typescript
const instance: QuestionInstance = {
	templateId: template.id,
	type: template.type,

	// Contenu resolu
	statement,
	resolvedVariables,
	solution,

	// Metadata copiee
	title: template.title,
	description: template.description,
	exerciseInstruction: template.exerciseInstruction,
	options: template.options,
	precision: template.precision,
	grades: template.grades,
	theme: template.theme,
	domain: template.domain,
	subdomain: template.subdomain,
	level: template.level,
	delay: template.delay,

	// Correction resolue
	correction,

	// Type-specifique
	transformType: template.transformType,
	blanks: resolvedBlanks,
	choices: resolvedChoices,
	shuffledChoices,
	validationRules: resolved.validationRules,

	// Generation info
	generatedAt: new Date().toISOString(),
	seed,
	selectedVariationIndex: variationIndex
};

return { success: true, instance };
```

---

## API de generation

### Fonction principale

```typescript
import { generateInstance } from '$lib/questions';

// Aleatoire
const result = generateInstance(template);

// Deterministe
const result = generateInstance(template, 42);

// Resultat
if (result.success) {
	console.log(result.instance);
} else {
	console.error(result.errors);
}
```

### Type de retour

```typescript
type GenerationResult =
	| { success: true; instance: QuestionInstance }
	| { success: false; errors: string[] };
```

---

## Exemple complet

**Template** :

```typescript
const template = {
	type: 'numerical_exact',
	title: 'Addition',
	variations: [
		{
			statement: 'Calculer : $${{a}} + {{b}}$$',
			variables: [
				{ name: 'a', expression: '{{1..10}}' },
				{ name: 'b', expression: '{{1..10}}' }
			],
			solution: '{{eval:a+b}}',
			correction: {
				feedback: { correct: 'Bravo !', incorrect: 'Reponse: {{eval:a+b}}' }
			}
		}
	],
	grades: ['6'],
	theme: 'Arithmetique',
	domain: 'Addition',
	level: 1,
	status: 'published'
};
```

**Generation avec seed 42** :

```typescript
const result = generateInstance(template, 42);
// result.instance:
{
  templateId: '...',
  type: 'numerical_exact',
  statement: 'Calculer : $$7 + 3$$',  // Variables resolues
  resolvedVariables: [
    { name: 'a', value: '7' },
    { name: 'b', value: '3' }
  ],
  solution: '10',
  correction: {
    feedback: { correct: 'Bravo !', incorrect: 'Reponse: 10' }
  },
  grades: ['6'],
  theme: 'Arithmetique',
  domain: 'Addition',
  level: 1,
  generatedAt: '2025-12-10T...',
  seed: 42,
  selectedVariationIndex: 0
}
```

---

## Generation aleatoire seedee

Le systeme utilise un **PRNG** (Pseudo-Random Number Generator) seede :

```typescript
// src/lib/questions/generator/random-generator.ts
function seededRandom(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state * 1103515245 + 12345) & 0x7fffffff;
		return state / 0x7fffffff;
	};
}
```

**Avantages** :

- **Reproductibilite** : Meme seed = memes valeurs
- **Testabilite** : Tests deterministes
- **Partage** : Partager un seed pour la meme question

---

## Fichiers source

| Fichier                                                    | Responsabilite         |
| ---------------------------------------------------------- | ---------------------- |
| `generator/instance-generator.ts`                          | Orchestration complete |
| `generator/variable-resolver.ts`                           | Wrapper resolution     |
| `generator/content-resolver.ts`                            | Resolution markdown    |
| `generator/random-generator.ts`                            | PRNG seede             |
| `generator/choice-shuffler.ts`                             | Fisher-Yates shuffle   |
| `validators/template-validator.ts`                         | Validation structure   |
| `shared/parameterization/validator/circular-dependency.ts` | Detection cycles       |

---

## Voir aussi

- [parameterization.md](parameterization.md) - Pipeline 3 etapes
- [templates.md](templates.md) - Structure templates
- [validation.md](validation.md) - Validation reponses
