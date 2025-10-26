# Exercise Types Update Summary

## Overview

Updated `/src/lib/exercises/types.ts` to support parameterization with comprehensive types for variables, instances, and distribution modes.

## Changes Made

### 1. New Imports

```typescript
import type { Variable, ResolvedVariable } from '$lib/shared/parameterization';
```

Imports parameterization types from the shared library.

### 2. New Distribution Mode Type

```typescript
export type DistributionMode = 'on_demand' | 'per_student' | 'per_group';
```

Literal type for how exercise instances are distributed:

- `on_demand`: New instance each time (infinite practice)
- `per_student`: Each student gets unique instance (personalized homework)
- `per_group`: All students share same instance (class work)

### 3. Updated Exercise Interface

Added three new fields to the `Exercise` interface:

```typescript
export interface Exercise {
	// ... existing fields ...

	// NEW: Parameterization fields
	variables?: Variable[];
	distribution_mode: DistributionMode;
	is_public?: boolean;
}
```

**Breaking Changes:**

- `distribution_mode` is now **required** (not optional)
- Default should be `'on_demand'` when creating exercises

### 4. New ExerciseInstance Interface

```typescript
export interface ExerciseInstance {
	// Original exercise metadata (copied from template)
	exerciseId: string;
	title?: string;
	difficulty: 1 | 2 | 3;
	tags?: string[];
	source?: string;
	estimated_time_minutes?: number;
	grade_levels?: string[];
	topic?: string;

	// Instance-specific data
	seed: number;
	resolvedVariables: ResolvedVariable[];

	// Resolved content (variables replaced with values)
	statement_md: string;
	solution_md: string;

	// Parsed content (optional, only if parseAST was requested)
	statement_ast?: DocumentNode;
	solution_ast?: DocumentNode;

	// Generation metadata
	generatedAt: Date;
	distributionMode: DistributionMode;
}
```

Represents a resolved exercise with specific variable values.

### 5. Helper Types

```typescript
// Options for generating instances
export interface GenerateInstanceOptions {
	seed?: number;
	parseAST?: boolean;
}

// Result of instance generation
export interface InstanceGenerationResult {
	success: boolean;
	instance?: ExerciseInstance;
	errors?: string[];
}

// Type alias for parameterized exercises
export type ParameterizedExercise = Exercise;
```

### 6. Updated Create/Update Types

Both `ExerciseCreate` and `ExerciseUpdate` now support the new optional fields:

```typescript
export type ExerciseCreate = Omit<Exercise, 'id' | 'created_at' | 'updated_at'>;
export type ExerciseUpdate = Partial<Omit<Exercise, 'id' | 'created_at' | 'created_by'>> & {
	id: string;
};
```

## Usage Examples

### Creating a Static Exercise

```typescript
const staticExercise: ExerciseCreate = {
	title: 'Basic Addition',
	difficulty: 1,
	tags: ['addition', 'arithmetic'],
	statement_md: 'Calculate $2 + 3$',
	solution_md: 'The answer is $5$',
	distribution_mode: 'on_demand', // Required
	created_by: userId
};
```

### Creating a Parameterized Exercise

```typescript
const parameterizedExercise: ExerciseCreate = {
	title: 'Random Addition',
	difficulty: 1,
	tags: ['addition', 'arithmetic'],
	variables: [
		{ name: 'a', expression: '{{1-20}}' },
		{ name: 'b', expression: '{{1-20}}' },
		{ name: 'sum', expression: '{{eval:a+b}}' }
	],
	statement_md: 'Calculate ${{a}} + {{b}}$',
	solution_md: 'The answer is ${{sum}}$',
	distribution_mode: 'per_student',
	created_by: userId
};
```

### Generating an Instance

```typescript
import { generateExerciseInstance } from '$lib/exercises/generator';

// Generate with specific seed (reproducible)
const result: InstanceGenerationResult = generateExerciseInstance(parameterizedExercise, {
	seed: 12345, // Derived from student_id for per_student mode
	parseAST: true
});

if (result.success && result.instance) {
	console.log(result.instance.statement_md); // "Calculate $7 + 3$"
	console.log(result.instance.solution_md); // "The answer is $10$"
	console.log(result.instance.resolvedVariables);
	// [
	//   { name: 'a', value: '7' },
	//   { name: 'b', value: '3' },
	//   { name: 'sum', value: '10' }
	// ]
}
```

### Handling Instance Generation Errors

```typescript
const result = generateExerciseInstance(exerciseWithCircularDeps);

if (!result.success) {
	console.error('Generation failed:', result.errors);
	// ['Circular dependency: a -> b -> a']
}
```

### Updating Distribution Mode

```typescript
const update: ExerciseUpdate = {
	id: 'ex-123',
	distribution_mode: 'per_group'
};
```

### Type Guards

```typescript
// Check if exercise is parameterized
function isParameterized(exercise: Exercise): boolean {
	return !!exercise.variables && exercise.variables.length > 0;
}

// Type-safe access
if (isParameterized(exercise)) {
	console.log(`Has ${exercise.variables!.length} variables`);
}
```

## Type Safety Improvements

1. **Literal Types**: `DistributionMode` uses literal types instead of plain strings for better autocomplete and type safety.

2. **Required Fields**: `distribution_mode` is required on `Exercise`, preventing exercises without a distribution strategy.

3. **Seed Guarantee**: `ExerciseInstance.seed` is required (not optional), ensuring every instance has a seed for reproducibility.

4. **Resolved Variables**: `ExerciseInstance.resolvedVariables` is always present (empty array for static exercises).

5. **Template vs Instance**: Clear separation between `Exercise` (template) and `ExerciseInstance` (resolved).

## Migration Notes

### Database Schema Alignment

The types now align with the database migration:

- `variables` column (JSONB) → `Exercise.variables?: Variable[]`
- `distribution_mode` column (TEXT) → `Exercise.distribution_mode: DistributionMode`
- `is_public` column (BOOLEAN) → `Exercise.is_public?: boolean`

### Default Values

When creating new exercises without parameterization:

```typescript
{
  variables: undefined, // or [] or omit
  distribution_mode: 'on_demand',
  is_public: false
}
```

### Existing Code Impact

**Breaking Changes:**

1. `Exercise.distribution_mode` is now required (was not in interface before)
2. Need to handle `variables` field in database queries

**Non-Breaking:**

1. `is_public` is optional (defaults to false)
2. All existing fields remain unchanged

## Next Steps

1. **Implement Generator**: Create `generateExerciseInstance()` function
2. **Update API Routes**: Add instance generation endpoints
3. **Update Components**: Support variable editor UI
4. **Database Migration**: Ensure database has `variables`, `distribution_mode`, `is_public` columns
5. **Testing**: Add unit tests for instance generation

## Related Files

- `/src/lib/exercises/types.ts` - Updated types (this file)
- `/src/lib/shared/parameterization/types.ts` - Imported types
- `/src/lib/shared/parameterization/index.ts` - Parameterization library
- Database migration: `supabase/migrations/*_add_parameterization_to_exercises.sql`

## Comprehensive JSDoc Documentation

All new types include extensive JSDoc comments with:

- Purpose and use cases
- Multiple examples showing real usage
- Cross-references to related types
- Important behavioral notes
- Type safety considerations

Example:

````typescript
/**
 * Distribution mode for parameterized exercises
 *
 * Determines how exercise instances are generated and distributed:
 * - `on_demand`: New instance generated each time (practice mode)
 * - `per_student`: Each student gets their own instance (personalized homework)
 * - `per_group`: All students in group see same instance (class work)
 *
 * @example On-demand (infinite practice)
 * ```typescript
 * const exercise: Exercise = {
 *   distribution_mode: 'on_demand',
 *   variables: [{ name: 'a', expression: '{{1-10}}' }]
 * };
 * // Each refresh generates new values
 * ```
 */
export type DistributionMode = 'on_demand' | 'per_student' | 'per_group';
````

## File Organization

The types file is now organized as:

1. **Imports** - Parameterization types
2. **Parameterization Types** - Distribution mode, options, results
3. **Database Model** - Exercise, Create, Update
4. **Instance Types** - ExerciseInstance
5. **AST Types** - Markdown parsing (unchanged)
6. **Parser/Transpiler Options** - (unchanged)
7. **Utility Types** - (unchanged)
8. **Export/Import/Template Types** - (unchanged)
9. **Sharing Types** - (unchanged)
