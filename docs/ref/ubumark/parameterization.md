# Ubumark Parameterization System

> Variable resolution, random generation, and expression evaluation

---

## Table of Contents

- [Overview](#overview)
- [Token Types](#token-types)
- [Resolution Pipeline](#resolution-pipeline)
- [Random Number Generation](#random-number-generation)
- [Expression Evaluation](#expression-evaluation)
- [Validation](#validation)
- [API Reference](#api-reference)

---

## Overview

The parameterization system enables dynamic content generation through:

1. **Variable References** - `{{varName}}` substitution
2. **Random Generation** - `{{1..10}}` numerical values
3. **Expression Evaluation** - `{{eval:a+b}}` computed results

### Design Principles

- **Content-Agnostic**: No feature-specific dependencies
- **Markdown Syntax**: Simple `{{...}}` delimiters
- **Composable**: Each layer independent and testable
- **Reproducible**: Seeded random for determinism
- **Type-Safe**: Full TypeScript support

### Quick Example

```typescript
import { resolveVariables, resolveText } from '$lib/ubumark';

const variables = [
	{ name: 'a', expression: '{{1..10}}' },
	{ name: 'b', expression: '{{1..10}}' },
	{ name: 'sum', expression: '{{eval:{{a}}+{{b}}}}' }
];

const resolved = resolveVariables(variables, 12345);
// resolved = [
//   { name: 'a', value: '7' },
//   { name: 'b', value: '3' },
//   { name: 'sum', value: '10' }
// ]

const text = 'Calculate {{a}} + {{b}} = {{sum}}';
const result = resolveText(text, resolved);
// "Calculate 7 + 3 = 10"
```

---

## Token Types

### Variable Reference

**Syntax**: `{{varName}}`

References a previously defined variable by name.

```markdown
Let a = {{a}} and b = {{b}}.
```

**Parsing**: Variable name must be alphanumeric with underscores.

### Random Token

#### Integer Range

**Syntax**: `{{min..max}}` or `{{min..max}}`

```markdown
{{1..10}} // Integer 1-10
{{-5..5}} // Integer -5 to 5
{{-10..-1}} // Negative integers
```

#### With Exclusions

**Syntax**: `{{min..max!excluded}}`

```markdown
{{1..10!5}} // 1-10 except 5
{{1..10!3,5,7}} // Except 3, 5, 7
{{1..20!5..10}} // Except range 5-10
{{1..10!{{a}}}} // Except variable value
```

#### Relative Integers (±)

**Syntax**: `{{min..max;±}}`

Generates from union of negative and positive ranges, excluding zero.

```markdown
{{2..9;±}} // {-9..-2} ∪ {2..9}
{{1..5;±!3}} // Excludes ±3
```

**Use case**: Non-zero coefficients in equations.

#### Decimal by Digits

**Syntax**: `{{before.after}}`

```markdown
{{2.3}} // 2 digits before, 3 after (e.g., "45.123")
{{1.2}} // 1 digit before, 2 after (e.g., "7.42")
{{0.1}} // 0 digits before, 1 after (e.g., "0.3")
```

#### Decimal Range

**Syntax**: `{{min..max}}` or `{{min..max:step}}`

```markdown
{{1..1.5}} // Auto step 0.1 (from max decimals)
{{1..1.25}} // Auto step 0.01
{{0.5..2:0.25}} // Explicit step
{{1..10:0.5!5,7.5}} // With exclusions
```

**Auto-step algorithm**:

```typescript
const precision = Math.max(decimalsIn(min), decimalsIn(max));
const step = Math.pow(10, -precision);
```

### Eval Token

**Syntax**: `{{eval:expression}}` or `{{eval:expression;modifiers}}`

Evaluates mathematical expressions using MathLive Compute Engine.

```markdown
{{eval:a+b}} // Simple expression
{{eval:{{a}}\*{{b}}}} // With variable references
{{eval:\frac{1}{2}+1}} // LaTeX expressions
```

#### Modifiers

| Short | Long         | Effect                  |
| ----- | ------------ | ----------------------- |
| `d`   | `decimal`    | Force decimal output    |
| `+`   | `positive`   | Add + sign for positive |
| `()`  | `bracket`    | Bracket negative values |
| `'`   | `derivative` | Reserved for future     |

**Examples**:

```markdown
{{eval:1/3;d}} // "0.333..." instead of fraction
{{eval:5;+}} // "+5"
{{eval:-3;()}} // "(-3)"
{{eval:{{x}};+,()}} // "+5" or "(-3)"
```

---

## Resolution Pipeline

### 3-Stage Process

```
┌─────────────────────────────────────────────────────────────┐
│ INPUT: Variable { name, expression }                         │
│ Example: { name: 'result', expression: '{{eval:{{a}}+{{1..5}}}}' }
└─────────────────────────────────────┬───────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────┐
│ STAGE 1: VARIABLE REFERENCES                                 │
│ Replace {{varName}} with resolved value                      │
│                                                              │
│ '{{eval:{{a}}+{{1..5}}}}' → '{{eval:7+{{1..5}}}}'            │
│ (assuming a=7 was resolved earlier)                          │
└─────────────────────────────────────┬───────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────┐
│ STAGE 2: RANDOM GENERATION                                   │
│ Replace {{random:...}} with generated number                 │
│                                                              │
│ '{{eval:7+{{1..5}}}}' → '{{eval:7+3}}'                       │
│ (random generated 3)                                         │
└─────────────────────────────────────┬───────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────┐
│ STAGE 3: EXPRESSION EVALUATION                               │
│ Evaluate {{eval:...}} using Compute Engine                   │
│                                                              │
│ '{{eval:7+3}}' → '10'                                        │
└─────────────────────────────────────┬───────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────┐
│ OUTPUT: ResolvedVariable { name: 'result', value: '10' }     │
└─────────────────────────────────────────────────────────────┘
```

### Resolution Order

Variables are resolved in dependency order:

```typescript
const variables = [
	{ name: 'a', expression: '{{1..10}}' }, // Independent
	{ name: 'b', expression: '{{1..10}}' }, // Independent
	{ name: 'c', expression: '{{eval:{{a}}*2}}' }, // Depends on a
	{ name: 'd', expression: '{{eval:{{b}}+{{c}}}}' } // Depends on b, c
];
```

Resolution order: `a` → `b` → `c` → `d`

The system uses topological sorting to determine order and detects circular dependencies.

---

## Random Number Generation

### Seeded PRNG

Uses Linear Congruential Generator (LCG) for reproducibility:

```typescript
function seededRandom(seed: number): number {
	const a = 1103515245;
	const c = 12345;
	const m = 2147483648; // 2^31
	seed = (a * seed + c) % m;
	return seed / m; // [0, 1)
}
```

**Properties**:

- Deterministic: Same seed → same sequence
- Fast: O(1) per number
- Uniform distribution

### Integer Generation

```typescript
function generateInteger(min: number, max: number, exclusions: number[], seed: number): number {
	const validNumbers = [];
	for (let i = min; i <= max; i++) {
		if (!exclusions.includes(i)) {
			validNumbers.push(i);
		}
	}
	const index = Math.floor(seededRandom(seed) * validNumbers.length);
	return validNumbers[index];
}
```

### Decimal Generation

**By digits**:

```typescript
function generateDecimalByDigits(digitsBefore: number, digitsAfter: number, seed: number): string {
	const beforeMax = Math.pow(10, digitsBefore) - 1;
	const afterMax = Math.pow(10, digitsAfter) - 1;

	const beforePart = generateInteger(1, beforeMax, [], seed);
	const afterPart = generateInteger(0, afterMax, [], seed + 1);

	return `${beforePart}.${afterPart.toString().padStart(digitsAfter, '0')}`;
}
```

**By range**:

```typescript
function generateDecimalRange(min: number, max: number, step: number, seed: number): number {
	const steps = Math.round((max - min) / step);
	const stepIndex = Math.floor(seededRandom(seed) * (steps + 1));
	return min + stepIndex * step;
}
```

---

## Expression Evaluation

### MathLive Integration

Expressions are evaluated using MathLive's Compute Engine:

```typescript
import { ComputeEngine } from '@cortexjs/compute-engine';

const ce = new ComputeEngine();

function evaluateExpression(expr: string): number {
	const result = ce.parse(expr).N().value;
	if (typeof result === 'number') {
		return result;
	}
	throw new Error(`Evaluation failed: ${expr}`);
}
```

### Supported Expressions

| Category   | Examples                       |
| ---------- | ------------------------------ |
| Arithmetic | `a+b`, `a*b`, `a/b`, `a-b`     |
| Powers     | `a^2`, `x^n`, `2^10`           |
| Roots      | `\sqrt{x}`, `\sqrt[3]{8}`      |
| Functions  | `\sin(x)`, `\cos(x)`, `\ln(x)` |
| Fractions  | `\frac{a}{b}`, `1/2`           |
| Absolute   | `\|x\|`, `abs(x)`              |

### Modifier Application

```typescript
function applyModifiers(value: number, modifiers: EvalModifiers): string {
	let result = String(value);

	if (modifiers.decimal) {
		result = value.toFixed(6).replace(/\.?0+$/, '');
	}

	if (modifiers.addPositive && value >= 0) {
		result = `+${result}`;
	}

	if (modifiers.bracketNegative && value < 0) {
		result = `(${result})`;
	}

	return result;
}
```

---

## Validation

### Circular Dependency Detection

Uses DFS algorithm with recursion stack:

```typescript
function detectCircularDependency(variables: Variable[]): ValidationResult {
	const graph = buildDependencyGraph(variables);
	const visited = new Set<string>();
	const recStack = new Set<string>();

	for (const varName of graph.keys()) {
		const cycle = findCycle(varName, graph, visited, recStack, []);
		if (cycle) {
			return {
				valid: false,
				errors: [
					{
						type: 'circular-dependency',
						message: `Circular: ${cycle.join(' → ')}`,
						path: cycle
					}
				]
			};
		}
	}

	return { valid: true, errors: [] };
}
```

### Variable Validation

```typescript
interface ValidationError {
	type: 'syntax-error' | 'circular-dependency' | 'undefined-variable';
	message: string;
	variable?: string;
	path?: string[];
}

function validateVariables(variables: Variable[]): ValidationResult {
	const errors: ValidationError[] = [];

	// 1. Check for syntax errors
	for (const v of variables) {
		const syntaxError = validateSyntax(v.expression);
		if (syntaxError) {
			errors.push({ type: 'syntax-error', ...syntaxError });
		}
	}

	// 2. Check for undefined references
	const defined = new Set(variables.map((v) => v.name));
	for (const v of variables) {
		const refs = extractVariableReferences(v.expression);
		for (const ref of refs) {
			if (!defined.has(ref)) {
				errors.push({
					type: 'undefined-variable',
					message: `Variable '${ref}' is not defined`,
					variable: v.name
				});
			}
		}
	}

	// 3. Check for circular dependencies
	const circularResult = detectCircularDependency(variables);
	if (!circularResult.valid) {
		errors.push(...circularResult.errors);
	}

	return { valid: errors.length === 0, errors };
}
```

---

## API Reference

### Core Functions

#### `resolveVariables`

```typescript
function resolveVariables(variables: Variable[], seed?: number): ResolvedVariable[];
```

Resolves all variables in dependency order.

**Parameters**:

- `variables`: Array of variable definitions
- `seed`: Optional seed for reproducible random

**Returns**: Array of resolved values

#### `resolveText`

```typescript
function resolveText(text: string, resolved: ResolvedVariable[]): string;
```

Substitutes variables in text content.

**Parameters**:

- `text`: Template text with `{{var}}` references
- `resolved`: Array of resolved variables

**Returns**: Text with substitutions

#### `validateVariables`

```typescript
function validateVariables(variables: Variable[]): ValidationResult;

interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
}
```

Validates variable definitions before resolution.

### Types

```typescript
interface Variable {
	name: string;
	expression: string;
}

interface ResolvedVariable {
	name: string;
	value: string;
}

interface EvalModifiers {
	decimal?: boolean;
	addPositive?: boolean;
	bracketNegative?: boolean;
	derivative?: boolean;
}

interface RandomSpec {
	type: 'integer' | 'decimal-digits' | 'decimal-range' | 'relative';
	min?: NumberOrVariable;
	max?: NumberOrVariable;
	step?: number;
	exclusions?: Exclusion[];
}
```

### Module Exports

```typescript
// Main exports from '$lib/ubumark'
export {
	// Resolution
	resolveVariables,
	resolveText,

	// Validation
	validateVariables,

	// Parsing (internal, but exported)
	tokenize,
	parseRandomSpec,
	parseEvalExpression,

	// Types
	type Variable,
	type ResolvedVariable,
	type ValidationResult,
	type ValidationError
};
```

---

## Performance

| Operation        | Complexity | Typical Time      |
| ---------------- | ---------- | ----------------- |
| Tokenize         | O(n)       | <1ms              |
| Resolve variable | O(t)       | <1ms per var      |
| Validate all     | O(V + E)   | <5ms              |
| Full resolution  | O(V × t)   | <10ms for 20 vars |

Where:

- n = text length
- t = tokens in expression
- V = number of variables
- E = dependency edges

---

## Best Practices

### Variable Naming

```typescript
// Good: descriptive, lowercase with underscores
{ name: 'base_angle', expression: '{{30..60:10}}' }
{ name: 'side_length', expression: '{{5..15}}' }

// Avoid: generic, hard to track
{ name: 'a', expression: '{{1..10}}' }
{ name: 'x', expression: '{{1..10}}' }
```

### Expression Organization

```typescript
// Good: build up complexity gradually
[
	{ name: 'a', expression: '{{1..10}}' },
	{ name: 'b', expression: '{{1..10}}' },
	{ name: 'sum', expression: '{{eval:{{a}}+{{b}}}}' },
	{ name: 'product', expression: '{{eval:{{a}}*{{b}}}}' },
	{ name: 'final', expression: '{{eval:{{sum}}*{{product}}}}' }
][
	// Avoid: deeply nested single expression
	{ name: 'result', expression: '{{eval:({{1..10}}+{{1..10}})*({{1..10}}*{{1..10}})}}' }
];
```

### Error Handling

```typescript
// Always validate before resolution
const validation = validateVariables(variables);
if (!validation.valid) {
	for (const error of validation.errors) {
		console.error(`${error.type}: ${error.message}`);
	}
	return null;
}

// Proceed with resolution
const resolved = resolveVariables(variables, seed);
```
