# Exercise Parameterization - TypeScript Types Guide

Quick reference for working with parameterized exercises in TypeScript.

## Core Types

### Exercise (Template)

```typescript
interface Exercise {
	// ... standard fields ...

	// Parameterization
	variables?: Variable[]; // Variable definitions
	distribution_mode: DistributionMode; // How to distribute instances
	is_public?: boolean; // Public library visibility
}
```

**Key Points:**

- May contain `{{var}}` syntax in `statement_md` and `solution_md`
- `distribution_mode` is **required**
- `variables` are resolved in declaration order

### ExerciseInstance (Resolved)

```typescript
interface ExerciseInstance {
	// Metadata (from template)
	exerciseId: string;
	title?: string;
	difficulty: 1 | 2 | 3;
	tags?: string[];

	// Instance data
	seed: number; // For reproducibility
	resolvedVariables: ResolvedVariable[];

	// Resolved content (no {{}} syntax)
	statement_md: string;
	solution_md: string;

	// Optional AST (if parseAST: true)
	statement_ast?: DocumentNode;
	solution_ast?: DocumentNode;

	// Metadata
	generatedAt: Date;
	distributionMode: DistributionMode;
}
```

**Key Points:**

- All `{{var}}` syntax replaced with actual values
- `seed` is required (not optional)
- Same seed + same template = same instance

### Distribution Modes

```typescript
type DistributionMode = 'on_demand' | 'per_student' | 'per_group';
```

| Mode          | Seed Source     | Use Case                                |
| ------------- | --------------- | --------------------------------------- |
| `on_demand`   | Random          | Infinite practice, each attempt new     |
| `per_student` | `student_id`    | Personalized homework, same for student |
| `per_group`   | `assignment_id` | Class work, same for all students       |

## Common Patterns

### 1. Creating Exercises

#### Static Exercise (No Variables)

```typescript
const exercise: ExerciseCreate = {
	title: 'Pythagorean Theorem',
	difficulty: 2,
	tags: ['geometry', 'triangles'],
	statement_md: 'If $a=3$ and $b=4$, find $c$',
	solution_md: '$c = \\sqrt{3^2 + 4^2} = 5$',
	distribution_mode: 'on_demand',
	created_by: userId
};
```

#### Parameterized Exercise

```typescript
const exercise: ExerciseCreate = {
	title: 'Random Pythagorean',
	difficulty: 2,
	tags: ['geometry', 'triangles'],
	variables: [
		{ name: 'a', expression: '{{3-12}}' },
		{ name: 'b', expression: '{{3-12}}' },
		{ name: 'c', expression: '{{eval:Math.sqrt(a*a + b*b)}}' }
	],
	statement_md: 'If $a={{a}}$ and $b={{b}}$, find $c$',
	solution_md: '$c = \\sqrt{ {{a}}^2 + {{b}}^2 } = {{c}}$',
	distribution_mode: 'per_student',
	created_by: userId
};
```

### 2. Generating Instances

#### On-Demand (Random)

```typescript
function generatePracticeInstance(exercise: Exercise): InstanceGenerationResult {
	return generateExerciseInstance(exercise, {
		// No seed = random
		parseAST: true
	});
}
```

#### Per-Student (Seeded)

```typescript
function generateStudentInstance(exercise: Exercise, studentId: string): InstanceGenerationResult {
	// Convert student UUID to number seed
	const seed = hashStudentId(studentId);

	return generateExerciseInstance(exercise, {
		seed,
		parseAST: true
	});
}
```

#### Per-Group (Assignment)

```typescript
function generateGroupInstance(exercise: Exercise, assignmentId: string): InstanceGenerationResult {
	const seed = hashAssignmentId(assignmentId);

	return generateExerciseInstance(exercise, {
		seed,
		parseAST: true
	});
}
```

### 3. Error Handling

```typescript
const result = generateExerciseInstance(exercise, options);

if (!result.success) {
	// Handle validation errors
	result.errors?.forEach((error) => {
		console.error('Generation error:', error);
	});

	// Common errors:
	// - "Circular dependency: a -> b -> a"
	// - "Undefined variable: {{c}}"
	// - "Invalid range: min > max"

	return fallbackToStaticVersion();
}

const instance = result.instance!;
```

### 4. Type Guards

```typescript
function isParameterized(exercise: Exercise): boolean {
	return !!exercise.variables && exercise.variables.length > 0;
}

function isStatic(exercise: Exercise): boolean {
	return !exercise.variables || exercise.variables.length === 0;
}

// Usage
if (isParameterized(exercise)) {
	// Generate instance
	const instance = generateExerciseInstance(exercise);
} else {
	// Use directly
	displayExercise(exercise);
}
```

### 5. Updating Exercises

#### Add Variables to Existing Exercise

```typescript
const update: ExerciseUpdate = {
	id: exercise.id,
	variables: [{ name: 'x', expression: '{{1-10}}' }],
	statement_md: 'Solve for x: $2x = {{x}}$',
	distribution_mode: 'per_student'
};
```

#### Change Distribution Mode

```typescript
const update: ExerciseUpdate = {
	id: exercise.id,
	distribution_mode: 'per_group'
};
```

#### Remove Variables (Make Static)

```typescript
const update: ExerciseUpdate = {
	id: exercise.id,
	variables: [],
	statement_md: 'Solve: $2x = 10$', // Remove {{}} syntax
	distribution_mode: 'on_demand'
};
```

## Variable Types

From `$lib/shared/parameterization`:

```typescript
interface Variable {
	name: string; // Variable name for {{var}} references
	expression: string; // Can contain {{}} syntax
}

interface ResolvedVariable {
	name: string;
	value: string; // Final resolved value
}
```

### Variable Expression Examples

```typescript
// Literal value
{ name: 'a', expression: '42' }

// Random integer
{ name: 'b', expression: '{{1-10}}' }
{ name: 'c', expression: '{{random:1-10}}' }

// Random decimal
{ name: 'd', expression: '{{2.3}}' }           // 2 digits before, 3 after
{ name: 'e', expression: '{{0.5-9.99:0.01}}' } // Range with step

// Random with exclusions
{ name: 'f', expression: '{{1-20!5,7-9}}' }    // Exclude 5, 7, 8, 9

// Variable reference
{ name: 'g', expression: '{{a}}' }

// Expression
{ name: 'h', expression: '{{eval:a+b}}' }
{ name: 'i', expression: '{{eval:Math.sqrt(a*a + b*b)}}' }

// Chaining
const variables: Variable[] = [
  { name: 'a', expression: '{{1-10}}' },       // Random
  { name: 'b', expression: '{{a}}' },          // Copy a
  { name: 'c', expression: '{{eval:a*2}}' },   // Double a
  { name: 'd', expression: '{{eval:a+b+c}}' }  // Sum
];
```

## Seed Generation

Deterministic seeds ensure students always see the same instance:

```typescript
function hashStudentId(studentId: string): number {
	// Simple hash for demo - use crypto hash in production
	let hash = 0;
	for (let i = 0; i < studentId.length; i++) {
		hash = (hash << 5) - hash + studentId.charCodeAt(i);
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash);
}

function hashAssignmentId(assignmentId: string): number {
	// Same approach but for assignment
	return hashStringToNumber(assignmentId);
}
```

## Instance Caching

For `per_student` and `per_group` modes, cache instances:

```typescript
// In-memory cache (simple)
const instanceCache = new Map<string, ExerciseInstance>();

function getCachedInstance(exerciseId: string, seed: number): ExerciseInstance | undefined {
	const key = `${exerciseId}:${seed}`;
	return instanceCache.get(key);
}

function cacheInstance(instance: ExerciseInstance): void {
	const key = `${instance.exerciseId}:${instance.seed}`;
	instanceCache.set(key, instance);
}
```

## Database Integration

### Fetching Exercise

```typescript
const { data: exercise } = await supabase
	.from('exercises')
	.select('*')
	.eq('id', exerciseId)
	.single();

// Variables are automatically parsed from JSONB
if (exercise.variables) {
	const instance = generateExerciseInstance(exercise, { seed });
}
```

### Saving Exercise

```typescript
await supabase.from('exercises').insert({
	...exercise,
	variables: JSON.stringify(exercise.variables), // Auto-handled by Supabase
	distribution_mode: exercise.distribution_mode
});
```

## Testing

```typescript
import { describe, test, expect } from 'vitest';

describe('Exercise Instance Generation', () => {
	test('generates reproducible instances with same seed', () => {
		const exercise: Exercise = {
			// ... static fields ...
			variables: [{ name: 'a', expression: '{{1-10}}' }],
			statement_md: 'Value: {{a}}',
			distribution_mode: 'per_student'
		};

		const seed = 12345;
		const result1 = generateExerciseInstance(exercise, { seed });
		const result2 = generateExerciseInstance(exercise, { seed });

		expect(result1.success).toBe(true);
		expect(result2.success).toBe(true);
		expect(result1.instance?.statement_md).toBe(result2.instance?.statement_md);
	});

	test('handles static exercises', () => {
		const exercise: Exercise = {
			// ... static fields ...
			statement_md: 'Calculate 2 + 3',
			distribution_mode: 'on_demand'
			// No variables
		};

		const result = generateExerciseInstance(exercise);

		expect(result.success).toBe(true);
		expect(result.instance?.resolvedVariables).toEqual([]);
		expect(result.instance?.statement_md).toBe('Calculate 2 + 3');
	});
});
```

## Best Practices

### 1. Always Handle Generation Errors

```typescript
const result = generateExerciseInstance(exercise, options);
if (!result.success) {
	// Log errors, show user-friendly message
	logger.error('Instance generation failed', { errors: result.errors });
	return showErrorToUser();
}
```

### 2. Use Type Guards

```typescript
if (isParameterized(exercise)) {
	// TypeScript knows exercise.variables exists
}
```

### 3. Cache Instances for Per-Student/Group Modes

```typescript
if (exercise.distribution_mode !== 'on_demand') {
	const cached = getCachedInstance(exercise.id, seed);
	if (cached) return cached;
}
```

### 4. Validate Before Saving

```typescript
import { validateVariables } from '$lib/shared/parameterization';

if (exercise.variables) {
	const validation = validateVariables(exercise.variables);
	if (!validation.valid) {
		// Show errors to user before saving
		return validation.errors;
	}
}
```

### 5. Set Appropriate Defaults

```typescript
const defaultExercise: Partial<ExerciseCreate> = {
	distribution_mode: 'on_demand',
	is_public: false,
	difficulty: 1
};
```

## Type Reference

Full type definitions: `/src/lib/exercises/types.ts`

Import commonly used types:

```typescript
import type {
	Exercise,
	ExerciseInstance,
	ExerciseCreate,
	ExerciseUpdate,
	DistributionMode,
	GenerateInstanceOptions,
	InstanceGenerationResult,
	ParameterizedExercise
} from '$lib/exercises/types';

import type { Variable, ResolvedVariable } from '$lib/shared/parameterization';
```

## Related Documentation

- [Parameterization System Overview](/docs/architecture/parameterization-system.md)
- [Shared Parameterization Library](/src/lib/shared/parameterization/README.md)
- [Exercise Syntax Guide](/docs/features/exercises/syntax-guide.md)
- [Database Schema](/docs/architecture/database-schema.md)
