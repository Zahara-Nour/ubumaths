# Step Generator

## Overview

The step generator creates pedagogical step-by-step explanations for mathematical calculations. It adapts the level of detail based on the target school level.

**Files**:

- `src/lib/mathAST/step-generator/index.ts` - Main entry point
- `src/lib/mathAST/step-generator/types.ts` - Type definitions
- `src/lib/mathAST/step-generator/arithmetic-steps.ts` - Step generation logic

## Import

```typescript
import {
	generateSteps,
	canGenerateSteps,
	suggestLevel,
	type StepGenerationResult,
	type CalculationStep,
	type SchoolLevel
} from '$lib/mathAST/step-generator';
```

---

## Types

### SchoolLevel

```typescript
type SchoolLevel = 'primaire' | 'college' | 'lycee' | 'superieur';
```

| Level       | French    | Description                               |
| ----------- | --------- | ----------------------------------------- |
| `primaire`  | Primaire  | Elementary school (detailed explanations) |
| `college`   | College   | Middle school (moderate detail)           |
| `lycee`     | Lycee     | High school (concise)                     |
| `superieur` | Superieur | University (minimal)                      |

### CalculationStep

```typescript
interface CalculationStep {
	readonly index: number; // Step number (1-indexed)
	readonly description: string; // Operation description (French)
	readonly expression: string; // Expression at this step (LaTeX)
	readonly explanation?: string; // Additional explanation
	readonly ast?: MathNode; // AST node at this step
	readonly subSteps?: readonly CalculationStep[]; // Collapsible detail
}
```

### StepGenerationResult

```typescript
interface StepGenerationResult {
	readonly original: string; // Original expression (LaTeX)
	readonly result: string; // Final result (LaTeX)
	readonly steps: readonly CalculationStep[];
	readonly level: SchoolLevel; // Level used for generation
}
```

### StepGeneratorConfig

```typescript
interface StepGeneratorConfig {
	readonly level: SchoolLevel;
	readonly maxSteps?: number; // Default: 20
	readonly includeSubSteps?: boolean; // Default: true
}
```

---

## Functions

### `generateSteps(ast, config)`

Generate step-by-step calculations for an AST node.

```typescript
function generateSteps(ast: MathNode, config?: Partial<StepGeneratorConfig>): StepGenerationResult;
```

**Parameters**:

- `ast`: The MathAST node to analyze
- `config`: Optional configuration

**Returns**: `StepGenerationResult` with all steps

**Example**:

```typescript
import { parseCustomSafe } from '$lib/mathAST/parser/custom';
import { generateSteps } from '$lib/mathAST/step-generator';

const { ast } = parseCustomSafe('2 + 3 * 4');
const result = generateSteps(ast, { level: 'college' });

console.log(result.original); // "2 + 3 \times 4"
console.log(result.result); // "14"
console.log(result.steps);
// [
//   { index: 1, description: 'Multiplication', expression: '3 × 4 = 12' },
//   { index: 2, description: 'Addition', expression: '2 + 12 = 14' }
// ]
```

### `canGenerateSteps(ast)`

Check if steps can be generated for an AST node.

```typescript
function canGenerateSteps(ast: MathNode): boolean;
```

Returns `false` for:

- Simple values (just a number or variable)
- Expressions that can't be evaluated

**Example**:

```typescript
const { ast: simpleAst } = parseCustomSafe('42');
canGenerateSteps(simpleAst); // false

const { ast: complexAst } = parseCustomSafe('2 + 3');
canGenerateSteps(complexAst); // true
```

### `suggestLevel(ast)`

Suggest an appropriate school level based on expression complexity.

```typescript
function suggestLevel(ast: MathNode): SchoolLevel;
```

**Complexity Thresholds**:

- `complexity <= 2`: `'primaire'`
- `complexity <= 5`: `'college'`
- `complexity <= 12`: `'lycee'`
- `complexity > 12`: `'superieur'`

**Example**:

```typescript
suggestLevel(parseCustomSafe('2 + 3').ast); // 'primaire'
suggestLevel(parseCustomSafe('2 + 3 * 4').ast); // 'college'
suggestLevel(parseCustomSafe('x^2 + 2*x + 1').ast); // 'lycee'
```

---

## Level-Specific Behavior

### Primaire (Elementary)

- Most detailed explanations
- Step-by-step sub-operations
- French explanations for each operation
- Visual aids in descriptions

```typescript
const result = generateSteps(ast, { level: 'primaire' });
// Steps include detailed sub-steps and explanations
```

**Example Output**:

```
1. On effectue d'abord la multiplication
   3 × 4 = 12
   Explication: On multiplie 3 par 4

2. Puis on effectue l'addition
   2 + 12 = 14
   Explication: On ajoute 2 au resultat
```

### College (Middle School)

- Moderate detail
- Main operations highlighted
- Some explanations for complex steps

**Example Output**:

```
1. Multiplication: 3 × 4 = 12
2. Addition: 2 + 12 = 14
```

### Lycee (High School)

- Concise steps
- Focus on key transformations
- Minimal explanations

**Example Output**:

```
1. 3 × 4 = 12
2. 2 + 12 = 14
```

### Superieur (University)

- Minimal steps
- Only major transformations shown
- Assumed mathematical maturity

**Example Output**:

```
= 2 + 12 = 14
```

---

## Complexity Calculation

The complexity score determines suggested level:

```typescript
function getComplexity(ast: MathNode): number {
	switch (ast.type) {
		case 'number':
		case 'variable':
			return 0;
		case 'addition':
		case 'subtraction':
			return 1 + getComplexity(left) + getComplexity(right);
		case 'multiplication':
			return 2 + getComplexity(left) + getComplexity(right);
		case 'division':
			return 2 + getComplexity(numerator) + getComplexity(denominator);
		case 'superscript':
			return 3 + getComplexity(base) + getComplexity(exponent);
		case 'function':
			return 3 + sum(args.map(getComplexity));
		// ...
	}
}
```

---

## Validation

Configuration is validated with Zod:

```typescript
const StepGeneratorConfigSchema = z.object({
	level: z.enum(['primaire', 'college', 'lycee', 'superieur']),
	maxSteps: z.number().int().positive().max(100).optional(),
	includeSubSteps: z.boolean().optional()
});
```

Invalid config throws an error:

```typescript
generateSteps(ast, { maxSteps: -1 });
// Error: Invalid step generator config: Number must be greater than 0
```

---

## UI Integration

### In ResultDisplay

```svelte
<script>
	import { generateSteps, canGenerateSteps, suggestLevel } from '$lib/mathAST/step-generator';
	import { parseCustomSafe } from '$lib/mathAST/parser/custom';
	import StepsDisplay from './StepsDisplay.svelte';

	let showSteps = $state(false);
	let stepsResult = $state(null);

	async function toggleSteps() {
		if (!stepsResult) {
			const { ast } = parseCustomSafe(result.input);
			if (canGenerateSteps(ast)) {
				const level = suggestLevel(ast);
				stepsResult = generateSteps(ast, { level });
			}
		}
		showSteps = !showSteps;
	}
</script>

{#if canShowSteps()}
	<button onclick={toggleSteps}>
		{showSteps ? 'Masquer' : 'Afficher'} les etapes
	</button>

	{#if showSteps && stepsResult}
		<StepsDisplay steps={stepsResult.steps} level={stepsResult.level} />
	{/if}
{/if}
```

### StepsDisplay Component

```svelte
<script>
	import type { CalculationStep, SchoolLevel } from '$lib/mathAST/step-generator';

	interface Props {
		steps: readonly CalculationStep[];
		level: SchoolLevel;
	}

	let { steps, level } = $props();
	let expandedSteps = new SvelteSet<number>();
</script>

<ol>
	{#each steps as step (step.index)}
		<li>
			<span class="step-number">{step.index}</span>
			<span class="description">{step.description}</span>
			<code>{step.expression}</code>

			{#if step.explanation}
				<p class="explanation">{step.explanation}</p>
			{/if}

			{#if step.subSteps?.length}
				<button onclick={() => toggleStep(step.index)}> Voir le detail </button>
				{#if expandedSteps.has(step.index)}
					<StepsDisplay steps={step.subSteps} {level} />
				{/if}
			{/if}
		</li>
	{/each}
</ol>
```

---

## Full Example

```typescript
import { parseCustomSafe } from '$lib/mathAST/parser/custom';
import { generateSteps, canGenerateSteps, suggestLevel } from '$lib/mathAST/step-generator';

// Parse expression
const { ast, errors } = parseCustomSafe('(2 + 3) * 4 - 10 / 2');

if (errors.length > 0) {
	console.error('Parse errors:', errors);
} else if (!canGenerateSteps(ast)) {
	console.log('Expression too simple for steps');
} else {
	// Generate steps with suggested level
	const level = suggestLevel(ast);
	console.log('Suggested level:', level); // 'college'

	const result = generateSteps(ast, {
		level,
		maxSteps: 10,
		includeSubSteps: true
	});

	console.log('Original:', result.original);
	console.log('Result:', result.result);
	console.log('Steps:');
	result.steps.forEach((step) => {
		console.log(`  ${step.index}. ${step.description}`);
		console.log(`     ${step.expression}`);
		if (step.explanation) {
			console.log(`     > ${step.explanation}`);
		}
	});
}
```

**Output**:

```
Suggested level: college
Original: (2 + 3) \times 4 - \frac{10}{2}
Result: 15
Steps:
  1. Calcul dans les parentheses
     2 + 3 = 5
  2. Multiplication
     5 × 4 = 20
  3. Division
     10 ÷ 2 = 5
  4. Soustraction
     20 - 5 = 15
```
