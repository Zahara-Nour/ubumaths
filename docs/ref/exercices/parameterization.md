# Exercises System - Parameterization Guide

> **Last Updated**: 2025-12-10
>
> **Source File**: `src/lib/exercises/generator/instance-generator.ts`
>
> **Related**: [Index](./index.md) | [Types](./types.md) | [Detailed Syntax Guide](../../features/exercises/parameterization-guide.md)

---

## Table of Contents

- [Overview](#overview)
- [Variable Syntax](#variable-syntax)
- [Distribution Modes](#distribution-modes)
- [Instance Generation](#instance-generation)
- [Seed Generation](#seed-generation)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Overview

Parameterization allows teachers to create exercise **templates** that generate unique instances with different variable values. This enables:

- **Infinite practice**: Students can regenerate problems
- **Personalized homework**: Each student gets unique values
- **Class work**: All students work on the same problem

### Static vs Parameterized

| Type          | variables           | Content                | Behavior            |
| ------------- | ------------------- | ---------------------- | ------------------- |
| Static        | `undefined` or `[]` | Fixed markdown         | Same for everyone   |
| Parameterized | `Variable[]`        | Contains `{{}}` syntax | Generates instances |

---

## Variable Syntax

Variables are defined in the exercise's `variables` array and referenced in content using `{{}}` syntax.

### Variable Definition

```typescript
interface Variable {
	name: string; // Variable name
	expression: string; // Expression that generates value
}
```

### Expression Types

#### Random Integer Range

```
{{min..max}}
```

Examples:

- `{{1..10}}` - Random integer from 1 to 10
- `{{-5..5}}` - Random integer from -5 to 5
- `{{0..100}}` - Random integer from 0 to 100

#### Random Decimal Range

```
{{min..max:step}}
```

Examples:

- `{{0..1:0.1}}` - Random decimal: 0, 0.1, 0.2, ..., 1.0
- `{{1.5..9.5:0.5}}` - Random decimal with 0.5 step
- `{{0..10:0.01}}` - Random decimal with 2 decimal places

#### Exclusions

```
{{min..max!excluded1,excluded2}}
```

Examples:

- `{{1..10!5}}` - 1-10 excluding 5
- `{{-10..10!0}}` - -10 to 10 excluding 0
- `{{1..20!7,13}}` - 1-20 excluding 7 and 13

#### Expressions (Computed Values)

```
{{eval:expression}}
```

Examples:

- `{{eval:a+b}}` - Sum of a and b
- `{{eval:a*b}}` - Product of a and b
- `{{eval:Math.sqrt(a*a+b*b)}}` - Pythagorean hypotenuse
- `{{eval:a>b?a:b}}` - Maximum of a and b

**Important**: Expressions can reference previously defined variables (in order).

#### Variable Reference

```
{{variableName}}
```

Replaces with the resolved value of the named variable.

---

## Distribution Modes

Distribution mode determines how seeds are generated for instance creation.

### on_demand (Default)

**Seed**: Random number each time

**Use Case**: Infinite practice mode

**Behavior**:

- New instance generated on each "New Problem" click
- Different values every time
- No persistence of instance state

```typescript
const exercise: Exercise = {
	distribution_mode: 'on_demand',
	variables: [{ name: 'a', expression: '{{1..10}}' }],
	statement_md: 'Calculate {{a}} + 5'
};
// Each render: random seed → random 'a' value
```

### per_student

**Seed**: `hash(exercise_id + student_id)`

**Use Case**: Personalized homework

**Behavior**:

- Same student always sees same values
- Different students see different values
- Reproducible for grading/review

```typescript
const exercise: Exercise = {
	distribution_mode: 'per_student',
	variables: [{ name: 'a', expression: '{{1..100}}' }],
	statement_md: 'Calculate {{a}} + 5'
};
// Student A: always sees a=47
// Student B: always sees a=23
```

### per_group

**Seed**: `hash(exercise_id + group_id)`

**Use Case**: Class work (everyone works same problem)

**Behavior**:

- All students in assignment see same values
- Different assignments have different values
- Requires `groupId` (typically assignment ID)

```typescript
const exercise: Exercise = {
	distribution_mode: 'per_group',
	variables: [{ name: 'a', expression: '{{1..10}}' }],
	statement_md: 'Calculate {{a}} + 5'
};
// Assignment A: all students see a=7
// Assignment B: all students see a=3
```

---

## Instance Generation

### Core Function

**Location**: `src/lib/exercises/generator/instance-generator.ts`

```typescript
function generateExerciseInstance(
	exercise: Exercise,
	options?: GenerateInstanceOptions
): InstanceGenerationResult;
```

### Generation Process

```
┌─────────────────┐
│ Exercise Template │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 1. Generate/Use │
│    Seed         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Check if    │
│    Parameterized│
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌───────────────┐
│Static │  │ Parameterized │
│(pass- │  │ - Detect deps │
│through│  │ - Resolve vars│
│)      │  │ - Replace {{}}│
└───┬───┘  └───────┬───────┘
    │              │
    └──────┬───────┘
           │
           ▼
┌─────────────────┐
│ 3. Optional:    │
│    Parse AST    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ExerciseInstance│
└─────────────────┘
```

### Code Flow

```typescript
export function generateExerciseInstance(
	exercise: Exercise,
	options: GenerateInstanceOptions = {}
): InstanceGenerationResult {
	try {
		// 1. Generate seed if not provided
		const seed = options.seed ?? Math.floor(Math.random() * 1000000);

		// 2. Check if parameterized
		const parameterized = isParameterized(exercise);

		let resolvedStatementMd: string;
		let resolvedSolutionMd: string;
		let resolvedVariables: ResolvedVariable[] = [];

		if (parameterized) {
			// 3a. Check circular dependencies
			const circularResult = detectCircularDependencies(exercise.variables!);
			if (!circularResult.valid) {
				return { success: false, errors: circularResult.errors.map((e) => e.message) };
			}

			// 3b. Resolve variables
			resolvedVariables = resolveVariables(exercise.variables!, seed);

			// 3c. Resolve {{}} in content
			resolvedStatementMd = resolveText(exercise.statement_md, resolvedVariables);
			resolvedSolutionMd = resolveText(exercise.solution_md, resolvedVariables);
		} else {
			// 3d. Static: passthrough
			resolvedStatementMd = exercise.statement_md;
			resolvedSolutionMd = exercise.solution_md;
		}

		// 4. Optionally parse AST
		let statementAst, solutionAst;
		if (options.parseAST) {
			statementAst = parseMarkdown(resolvedStatementMd);
			solutionAst = parseMarkdown(resolvedSolutionMd);
		}

		// 5. Return instance
		return {
			success: true,
			instance: {
				exerciseId: exercise.id,
				seed,
				resolvedVariables,
				statement_md: resolvedStatementMd,
				solution_md: resolvedSolutionMd,
				statement_ast: statementAst,
				solution_ast: solutionAst
				// ... metadata
			}
		};
	} catch (error) {
		return { success: false, errors: [error.message] };
	}
}
```

---

## Seed Generation

### Random Seed

```typescript
const seed = Math.floor(Math.random() * 1000000);
```

### Student Seed (Deterministic)

```typescript
export function generateStudentSeed(exerciseId: string, studentId: string): number {
	const combined = `${exerciseId}:student:${studentId}`;
	return hashStringToNumber(combined);
}
```

### Group Seed (Deterministic)

```typescript
export function generateGroupSeed(exerciseId: string, groupId: string): number {
	const combined = `${exerciseId}:group:${groupId}`;
	return hashStringToNumber(combined);
}
```

### Hash Function

Uses Java-style string hash for reproducibility:

```typescript
function hashStringToNumber(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char; // hash * 31 + char
		hash = hash & hash; // Convert to 32-bit
	}
	return Math.abs(hash);
}
```

---

## Error Handling

### Circular Dependencies

Variables are resolved in declaration order. If variable A references B and B references A, a circular dependency error occurs.

```typescript
// ERROR: Circular dependency
const variables = [
	{ name: 'a', expression: '{{b}}' },
	{ name: 'b', expression: '{{a}}' }
];
```

**Detection**:

```typescript
const circularResult = detectCircularDependencies(variables);
if (!circularResult.valid) {
	return {
		success: false,
		errors: circularResult.errors.map((e) => e.message)
		// ['Circular dependency detected: a → b → a']
	};
}
```

### Undefined Variables

Referencing a variable that doesn't exist or isn't defined yet.

```typescript
// ERROR: 'c' not defined
const variables = [
	{ name: 'a', expression: '{{1..10}}' },
	{ name: 'b', expression: '{{eval:a+c}}' } // 'c' undefined!
];
```

### Invalid Expressions

Malformed expressions or evaluation errors.

```typescript
// ERROR: Invalid expression
{ name: 'a', expression: '{{1..}}' }        // Missing max
{ name: 'b', expression: '{{eval:a/}}' }    // Syntax error
```

### Result Type

```typescript
interface InstanceGenerationResult {
	success: boolean;
	instance?: ExerciseInstance; // Only if success=true
	errors?: string[]; // Only if success=false
}
```

---

## Examples

### Simple Addition Exercise

```typescript
const exercise: Exercise = {
	id: 'ex-123',
	title: 'Addition Practice',
	difficulty: 1,
	tags: ['addition'],
	variables: [
		{ name: 'a', expression: '{{1..20}}' },
		{ name: 'b', expression: '{{1..20}}' },
		{ name: 'sum', expression: '{{eval:a+b}}' }
	],
	statement_md: 'Calculer ${{a}} + {{b}}$',
	solution_md: '${{a}} + {{b}} = {{sum}}$',
	distribution_mode: 'on_demand',
	created_by: 'teacher-id',
	created_at: '2024-01-01',
	updated_at: '2024-01-01'
};

const result = generateExerciseInstance(exercise, { seed: 42 });
// result.instance.resolvedVariables = [
//   { name: 'a', value: '7' },
//   { name: 'b', value: '13' },
//   { name: 'sum', value: '20' }
// ]
// result.instance.statement_md = 'Calculer $7 + 13$'
// result.instance.solution_md = '$7 + 13 = 20$'
```

### Pythagorean Theorem Exercise

```typescript
const exercise: Exercise = {
	id: 'ex-456',
	title: 'Theoreme de Pythagore',
	difficulty: 2,
	tags: ['geometrie', 'pythagore'],
	variables: [
		{ name: 'a', expression: '{{3..12}}' },
		{ name: 'b', expression: '{{4..15}}' },
		{ name: 'c', expression: '{{eval:Math.sqrt(a*a+b*b).toFixed(2)}}' }
	],
	statement_md: `
Dans un triangle rectangle ABC, on donne:
- $AB = {{a}}$ cm
- $BC = {{b}}$ cm

Calculer l'hypotenuse AC.
  `,
	solution_md: `
En utilisant le theoreme de Pythagore:
$$AC^2 = AB^2 + BC^2 = {{a}}^2 + {{b}}^2$$

Donc $AC = \\sqrt{{{eval:a*a}} + {{eval:b*b}}} = {{c}}$ cm
  `,
	distribution_mode: 'per_student',
	created_by: 'teacher-id',
	created_at: '2024-01-01',
	updated_at: '2024-01-01'
};
```

### Fraction Exercise with Exclusions

```typescript
const exercise: Exercise = {
	id: 'ex-789',
	variables: [
		{ name: 'num', expression: '{{1..10}}' },
		{ name: 'den', expression: '{{2..10!1}}' }, // Exclude 1 (avoid trivial)
		{ name: 'result', expression: '{{eval:(num/den).toFixed(3)}}' }
	],
	statement_md: 'Calculer $\\frac{{{num}}}{{{den}}}$ (arrondir a 3 decimales)',
	solution_md: '$\\frac{{{num}}}{{{den}}} = {{result}}$',
	distribution_mode: 'on_demand'
};
```

### Batch Generation

Generate multiple instances for practice sets:

```typescript
import { generateMultipleInstances } from '$lib/exercises/generator/instance-generator';

const results = generateMultipleInstances(exercise, 10, 1000);
// Seeds: 1000, 1001, 1002, ..., 1009
// 10 different instances with reproducible values
```

---

## Server-Side Generation

For server-side instance generation with access control:

```typescript
import { generateExerciseInstanceServer } from '$lib/server/exercises';

// On-demand (random)
const result = await generateExerciseInstanceServer(supabase, 'ex-123', userId);

// Per-student (deterministic)
const result = await generateExerciseInstanceServer(supabase, 'ex-123', studentId);

// Per-group (deterministic)
const result = await generateExerciseInstanceServer(supabase, 'ex-123', userId, {
	groupId: assignmentId
});
```

---

## Best Practices

### Variable Naming

- Use short, meaningful names: `a`, `b`, `coef`, `x1`
- Avoid reserved words: `Math`, `eval`, `sum`
- Be consistent across similar exercises

### Expression Design

- Define variables in dependency order
- Use `Math.round()` for cleaner numbers
- Avoid division by zero with exclusions

### Distribution Mode Selection

| Scenario       | Recommended Mode              |
| -------------- | ----------------------------- |
| Practice/drill | `on_demand`                   |
| Homework       | `per_student`                 |
| In-class work  | `per_group`                   |
| Exam           | `per_student` with fixed seed |

### Performance

- Keep variable count reasonable (<10)
- Avoid complex nested expressions
- Use `parseAST: false` unless needed for rendering
