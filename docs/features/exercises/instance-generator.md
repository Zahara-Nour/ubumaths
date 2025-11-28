# Exercise Instance Generator

Complete documentation for the Exercise Instance Generator system.

## Overview

The Exercise Instance Generator converts Exercise templates (which may contain variables and `{{}}` syntax) into concrete ExerciseInstance objects with all values resolved and ready for display to students.

**Location**: `src/lib/exercises/generator/instance-generator.ts`

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Main Function](#main-function)
3. [Distribution Modes](#distribution-modes)
4. [Seed Generation](#seed-generation)
5. [Usage Examples](#usage-examples)
6. [Error Handling](#error-handling)
7. [Testing](#testing)
8. [Integration](#integration)

---

## Core Concepts

### Static vs Parameterized Exercises

**Static Exercise**:

- No variables defined
- Content is fixed and never changes
- Suitable for unique problems or specific scenarios

```typescript
const staticExercise: Exercise = {
	id: 'ex-001',
	statement_md: 'Calculate $2 + 3$',
	solution_md: 'The answer is $5$',
	distribution_mode: 'on_demand',
	difficulty: 1,
	tags: ['addition']
	// ... other fields
};
```

**Parameterized Exercise**:

- Has variables array defined
- Content contains `{{variableName}}` placeholders
- Generates different instances with different values
- Suitable for practice, where students need variety

```typescript
const parameterizedExercise: Exercise = {
	id: 'ex-002',
	variables: [
		{ name: 'a', expression: '{{1..10}}' },
		{ name: 'b', expression: '{{1..10}}' },
		{ name: 'sum', expression: '{{eval:{{a}}+{{b}}}}' }
	],
	statement_md: 'Calculate ${{a}} + {{b}}$',
	solution_md: 'The answer is ${{sum}}$',
	distribution_mode: 'per_student',
	difficulty: 1,
	tags: ['addition']
	// ... other fields
};
```

---

## Main Function

### `generateExerciseInstance()`

Generates an exercise instance from a template.

```typescript
function generateExerciseInstance(
	exercise: Exercise,
	options: GenerateInstanceOptions = {}
): InstanceGenerationResult;
```

#### Parameters

| Parameter  | Type                      | Required | Description                        |
| ---------- | ------------------------- | -------- | ---------------------------------- |
| `exercise` | `Exercise`                | Yes      | Exercise template to generate from |
| `options`  | `GenerateInstanceOptions` | No       | Generation options                 |

#### Options

```typescript
interface GenerateInstanceOptions {
	seed?: number; // Random seed for reproducible generation
	parseAST?: boolean; // Whether to parse markdown to AST (default: false)
}
```

#### Return Value

```typescript
interface InstanceGenerationResult {
	success: boolean;
	instance?: ExerciseInstance; // Only if success=true
	errors?: string[]; // Only if success=false
}
```

#### Process

1. **Generate/Use Seed**: If no seed provided, generate random seed
2. **Check Parameterization**: Determine if exercise has variables
3. **Resolve Variables**:
   - Check for circular dependencies
   - Resolve variables using shared parameterization library
   - Handle errors gracefully
4. **Resolve Content**: Replace `{{var}}` in statement_md and solution_md
5. **Parse AST** (optional): Convert markdown to AST if requested
6. **Return Instance**: Build and return ExerciseInstance object

---

## Distribution Modes

The `distribution_mode` field determines how instances are generated:

### 1. On-Demand (`'on_demand'`)

**Use Case**: Infinite practice, flashcards, warmups
**Behavior**: New random instance every time
**Seeding**: Random seed each generation

```typescript
// Teacher creates template
const exercise: Exercise = {
	distribution_mode: 'on_demand',
	variables: [{ name: 'a', expression: '{{1..100}}' }],
	statement_md: 'What is {{a}} + 5?'
	// ...
};

// Each student request generates new values
const instance1 = generateExerciseInstance(exercise);
// instance1: "What is 47 + 5?"

const instance2 = generateExerciseInstance(exercise);
// instance2: "What is 23 + 5?" (different)
```

### 2. Per-Student (`'per_student'`)

**Use Case**: Personalized homework, assessments
**Behavior**: Each student gets unique but consistent values
**Seeding**: Deterministic based on exercise_id + student_id

```typescript
// Teacher creates template
const exercise: Exercise = {
	distribution_mode: 'per_student',
	variables: [{ name: 'a', expression: '{{1..100}}' }],
	statement_md: 'What is {{a}} + 5?'
	// ...
};

// Generate for Student A
const seedA = generateStudentSeed(exercise.id, 'student-A');
const instanceA = generateExerciseInstance(exercise, { seed: seedA });
// instanceA: "What is 42 + 5?"

// Student A revisits - gets SAME values
const instanceA2 = generateExerciseInstance(exercise, { seed: seedA });
// instanceA2: "What is 42 + 5?" (identical)

// Generate for Student B - gets DIFFERENT values
const seedB = generateStudentSeed(exercise.id, 'student-B');
const instanceB = generateExerciseInstance(exercise, { seed: seedB });
// instanceB: "What is 78 + 5?" (different from A)
```

### 3. Per-Group (`'per_group'`)

**Use Case**: Class assignments, group work
**Behavior**: All students in group see same values
**Seeding**: Deterministic based on exercise_id + group_id

```typescript
// Teacher creates template
const exercise: Exercise = {
	distribution_mode: 'per_group',
	variables: [{ name: 'a', expression: '{{1..100}}' }],
	statement_md: 'What is {{a}} + 5?'
	// ...
};

// Generate for Class 6A
const seed = generateGroupSeed(exercise.id, 'class-6a');
const instance = generateExerciseInstance(exercise, { seed });
// instance: "What is 67 + 5?"

// ALL students in Class 6A see: "What is 67 + 5?"
```

---

## Seed Generation

### Deterministic Seeding Functions

#### `generateStudentSeed(exerciseId, studentId)`

Creates reproducible seed from exercise and student IDs.

```typescript
function generateStudentSeed(exerciseId: string, studentId: string): number;
```

**Example**:

```typescript
const seed1 = generateStudentSeed('ex-123', 'student-456');
const seed2 = generateStudentSeed('ex-123', 'student-456');
// seed1 === seed2 (deterministic)

const seed3 = generateStudentSeed('ex-123', 'student-789');
// seed3 !== seed1 (different student)
```

#### `generateGroupSeed(exerciseId, groupId)`

Creates reproducible seed from exercise and group IDs.

```typescript
function generateGroupSeed(exerciseId: string, groupId: string): number;
```

**Example**:

```typescript
const seed = generateGroupSeed('ex-456', 'assignment-123');
// All students in assignment-123 use this seed
```

---

## Usage Examples

### Example 1: Static Exercise (Passthrough)

```typescript
const exercise: Exercise = {
	id: 'ex-static',
	statement_md: 'Prove that $\\sqrt{2}$ is irrational.',
	solution_md: 'Proof by contradiction...',
	distribution_mode: 'on_demand',
	difficulty: 3,
	tags: ['proof', 'irrational']
	// ... other fields
};

const result = generateExerciseInstance(exercise);

if (result.success) {
	console.log(result.instance.statement_md);
	// "Prove that $\\sqrt{2}$ is irrational." (unchanged)

	console.log(result.instance.resolvedVariables);
	// [] (no variables)
}
```

### Example 2: Simple Parameterized Exercise

```typescript
const exercise: Exercise = {
	id: 'ex-addition',
	variables: [
		{ name: 'a', expression: '{{1..20}}' },
		{ name: 'b', expression: '{{1..20}}' },
		{ name: 'sum', expression: '{{eval:{{a}}+{{b}}}}' }
	],
	statement_md: 'Calculate ${{a}} + {{b}}$',
	solution_md: 'The answer is ${{sum}}$',
	distribution_mode: 'per_student',
	difficulty: 1,
	tags: ['addition']
	// ... other fields
};

// Generate for specific student
const seed = generateStudentSeed(exercise.id, 'student-123');
const result = generateExerciseInstance(exercise, { seed });

if (result.success) {
	console.log(result.instance.statement_md);
	// "Calculate $12 + 7$" (example values)

	console.log(result.instance.solution_md);
	// "The answer is $19$"

	console.log(result.instance.resolvedVariables);
	// [
	//   { name: 'a', value: '12' },
	//   { name: 'b', value: '7' },
	//   { name: 'sum', value: '19' }
	// ]
}
```

### Example 3: With AST Parsing

```typescript
const result = generateExerciseInstance(exercise, {
	seed: 12345,
	parseAST: true
});

if (result.success) {
	console.log(result.instance.statement_ast);
	// DocumentNode with parsed structure

	console.log(result.instance.solution_ast);
	// DocumentNode with parsed structure

	// Use AST for rendering in UI
}
```

### Example 4: Quadratic Equation (Complex)

```typescript
const exercise: Exercise = {
	id: 'ex-quadratic',
	variables: [
		{ name: 'a', expression: '{{1..5}}' },
		{ name: 'b', expression: '{{-10..10}}' },
		{ name: 'c', expression: '{{-10..10}}' },
		{ name: 'discriminant', expression: '{{eval:{{b}}*{{b}} - 4*{{a}}*{{c}}}}' }
	],
	statement_md: `# Résoudre l'équation

Résolvez l'équation suivante :

$${{ a }}x^2 + {{b}}x + {{c}} = 0$$

**Indications :**
- Coefficient $a = {{a}}$
- Coefficient $b = {{b}}$
- Coefficient $c = {{c}}$`,
	solution_md: `## Solution

Le discriminant est : $\\Delta = b^2 - 4ac = {{discriminant}}$

Selon le signe du discriminant...`,
	distribution_mode: 'per_student',
	difficulty: 2,
	tags: ['algebra', 'equations', '2nd']
	// ... other fields
};

const seed = generateStudentSeed(exercise.id, 'student-456');
const result = generateExerciseInstance(exercise, { seed, parseAST: true });

if (result.success) {
	// All variables resolved
	console.log(result.instance.resolvedVariables.length); // 4

	// No {{}} syntax in content
	console.log(result.instance.statement_md.includes('{{')); // false

	// AST ready for rendering
	console.log(result.instance.statement_ast); // DocumentNode
}
```

---

## Error Handling

The generator returns structured error results:

### Circular Dependency Error

```typescript
const exercise: Exercise = {
	variables: [
		{ name: 'a', expression: '{{b}}' },
		{ name: 'b', expression: '{{a}}' } // Circular!
	],
	statement_md: 'Value: {{a}}'
	// ...
};

const result = generateExerciseInstance(exercise);

if (!result.success) {
	console.error(result.errors);
	// ['Circular dependency detected: a → b → a']
}
```

### Undefined Variable Error

```typescript
const exercise: Exercise = {
	variables: [{ name: 'a', expression: '5' }],
	statement_md: 'Calculate {{a}} + {{b}}' // 'b' not defined!
	// ...
};

const result = generateExerciseInstance(exercise);

if (!result.success) {
	console.error(result.errors);
	// ['Variable "b" not found in resolved variables']
}
```

### Invalid Expression Error

```typescript
const exercise: Exercise = {
	variables: [{ name: 'a', expression: '{{invalid-syntax}}' }]
	// ...
};

const result = generateExerciseInstance(exercise);

if (!result.success) {
	console.error(result.errors);
	// ['Failed to resolve variable "a": ...']
}
```

---

## Testing

**Test File**: `src/lib/exercises/generator/instance-generator.test.ts`

### Test Coverage

- ✅ Static exercises (passthrough)
- ✅ Simple parameterized exercises
- ✅ Random integer ranges
- ✅ Eval expressions
- ✅ Chained variable references
- ✅ Variables in multiple locations
- ✅ Circular dependency detection
- ✅ Undefined variable errors
- ✅ Deterministic seeding
- ✅ AST parsing
- ✅ Batch generation
- ✅ Metadata preservation

### Running Tests

```bash
# Run all instance generator tests
pnpm test:unit src/lib/exercises/generator/instance-generator.test.ts

# Watch mode
pnpm test:unit src/lib/exercises/generator/instance-generator.test.ts --watch
```

---

## Integration

### With Shared Parameterization Library

The generator uses the shared parameterization library for all variable resolution:

```typescript
import {
	resolveVariables,
	resolveText,
	detectCircularDependencies
} from '$lib/shared/parameterization';
```

**Key Functions**:

- `detectCircularDependencies()` - Validate variables before resolution
- `resolveVariables()` - Resolve all variable definitions
- `resolveText()` - Replace {{var}} in content

### With Markdown Parser

Optional AST parsing for rendering:

```typescript
import { parseMarkdown } from '../parser/markdown-parser';

const result = generateExerciseInstance(exercise, { parseAST: true });
if (result.success) {
	const ast = result.instance.statement_ast; // DocumentNode
	// Use AST for rendering
}
```

### With UI Components

Typical usage in a Svelte component:

```svelte
<script lang="ts">
	import { generateExerciseInstance, generateStudentSeed } from '$lib/exercises/generator';

	export let exercise: Exercise;
	export let studentId: string;

	// Generate instance for student
	const seed = generateStudentSeed(exercise.id, studentId);
	const result = generateExerciseInstance(exercise, { seed, parseAST: true });

	if (!result.success) {
		console.error('Failed to generate instance:', result.errors);
	}

	const instance = result.instance!;
</script>

{#if result.success}
	<div class="exercise">
		<h2>{instance.title}</h2>
		<!-- Render statement_ast or statement_md -->
		<ExerciseRenderer content={instance.statement_md} />
	</div>
{:else}
	<div class="error">
		Failed to load exercise: {result.errors.join(', ')}
	</div>
{/if}
```

---

## Best Practices

### 1. Variable Naming

Use descriptive variable names:

```typescript
// ✅ Good
variables: [
	{ name: 'radius', expression: '{{1..10}}' },
	{ name: 'area', expression: '{{eval:3.14*{{radius}}*{{radius}}}}' }
];

// ❌ Bad
variables: [
	{ name: 'r', expression: '{{1..10}}' },
	{ name: 'a', expression: '{{eval:3.14*{{r}}*{{r}}}}' }
];
```

### 2. Eval Expression Syntax

Always wrap variables in `{{}}` inside eval expressions:

```typescript
// ✅ Good
{ name: 'sum', expression: '{{eval:{{a}}+{{b}}}}' }

// ❌ Bad (will result in NaN)
{ name: 'sum', expression: '{{eval:a+b}}' }
```

### 3. Seed Management

Use appropriate seeding for distribution mode:

```typescript
// On-demand: no seed (random)
const instance = generateExerciseInstance(exercise);

// Per-student: deterministic seed
const seed = generateStudentSeed(exerciseId, studentId);
const instance = generateExerciseInstance(exercise, { seed });

// Per-group: group-based seed
const seed = generateGroupSeed(exerciseId, groupId);
const instance = generateExerciseInstance(exercise, { seed });
```

### 4. Error Handling

Always check result.success:

```typescript
const result = generateExerciseInstance(exercise);

if (!result.success) {
	// Log error
	console.error('Instance generation failed:', result.errors);

	// Show user-friendly message
	showError('Unable to load exercise. Please try again.');

	return;
}

// Proceed with instance
const instance = result.instance;
```

### 5. AST Parsing

Only parse AST when needed:

```typescript
// ✅ Good: Parse only when rendering complex markdown
const result = generateExerciseInstance(exercise, { parseAST: true });

// ❌ Wasteful: Parsing AST but using MD directly
const result = generateExerciseInstance(exercise, { parseAST: true });
renderMarkdown(result.instance.statement_md); // Not using AST!
```

---

## Helper Functions

### `isParameterized(exercise)`

Check if an exercise has variables:

```typescript
function isParameterized(exercise: Exercise): boolean;

// Usage
if (isParameterized(exercise)) {
	console.log('This exercise needs instance generation');
} else {
	console.log('This exercise is static');
}
```

### `generateMultipleInstances(exercise, count, baseSeed?)`

Generate multiple instances at once:

```typescript
function generateMultipleInstances(
	exercise: Exercise,
	count: number,
	baseSeed?: number
): InstanceGenerationResult[];

// Usage: Generate 10 practice instances
const results = generateMultipleInstances(exercise, 10);
const successes = results.filter((r) => r.success);
console.log(`Generated ${successes.length} instances`);
```

---

## Performance Considerations

1. **Caching**: Instance generation is fast (~5-10ms), but consider caching for per-student mode
2. **AST Parsing**: Adds ~2-5ms overhead - only use when needed
3. **Batch Generation**: Use `generateMultipleInstances` for bulk operations

---

## Related Documentation

- [Shared Parameterization Library](../../shared/parameterization/README.md)
- [Markdown Parser](./markdown-parser.md)
- [Exercise Types](./types.md)
- [Distribution Modes](./distribution-modes.md)

---

## Changelog

### v1.0.0 (2025-01-26)

- ✅ Initial implementation
- ✅ Support for static and parameterized exercises
- ✅ Three distribution modes (on_demand, per_student, per_group)
- ✅ Deterministic seed generation
- ✅ Circular dependency detection
- ✅ Optional AST parsing
- ✅ Comprehensive error handling
- ✅ 27 passing tests
