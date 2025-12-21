# Exercises System - Type Definitions

> **Last Updated**: 2025-12-21
>
> **Source File**: `src/lib/exercises/types.ts` (~2250 lines)
>
> **Related**: [Index](./index.md) | [API Reference](./api-reference.md)

---

## Table of Contents

- [Overview](#overview)
- [Core Types](#core-types)
- [Assignment Types](#assignment-types)
- [Completion Types](#completion-types)
- [Instance Types](#instance-types)
- [Filter & Query Types](#filter--query-types)
- [Statistics Types](#statistics-types)
- [Import/Export Types](#importexport-types)
- [Helper Functions](#helper-functions)

---

## Overview

All types are defined in `$lib/exercises/types.ts` and re-export AST types from `$lib/ubumark`.

```typescript
import type { Exercise, ExerciseInstance, ExerciseAssignment } from '$lib/exercises/types';
```

---

## Core Types

### Exercise

Database model for exercise template. Can be static or parameterized.

```typescript
interface Exercise {
	// Identity
	id: string; // UUID
	slug?: string; // URL-friendly identifier (topic-nanoid)

	// Metadata
	title?: string; // Optional display title
	source?: string; // Source reference
	difficulty: 1 | 2 | 3; // Easy, medium, hard
	tags: string[]; // Categorization
	grade_levels?: string[]; // Target grades
	topic?: string; // Topic category

	// Content (markdown + LaTeX + {{}} syntax)
	statement_md: string; // Exercise statement
	solution_md: string; // Solution/correction

	// Supplementary materials
	resources?: ExerciseResource[]; // Videos, PDFs, links, etc.

	// Parameterization
	variables?: Variable[]; // Variable definitions
	distribution_mode: DistributionMode; // How instances are generated

	// Sharing
	is_public?: boolean; // Visible in library

	// Audit
	created_at: string; // ISO 8601
	updated_at: string; // ISO 8601
	created_by: string; // Teacher UUID
}
```

### Variable

Variable definition for parameterized exercises. From `$lib/ubumark`.

```typescript
interface Variable {
	name: string; // Variable name (e.g., 'a', 'coefficient')
	expression: string; // Expression (e.g., '{{1..10}}', '{{eval:a+b}}')
}
```

### ResolvedVariable

Variable after resolution with specific values.

```typescript
interface ResolvedVariable {
	name: string; // Variable name
	value: string; // Resolved value (e.g., '7')
}
```

### DistributionMode

Determines how exercise instances are generated.

```typescript
type DistributionMode = 'on_demand' | 'per_student' | 'per_group';
```

| Mode          | Seed                             | Use Case              |
| ------------- | -------------------------------- | --------------------- |
| `on_demand`   | Random each time                 | Infinite practice     |
| `per_student` | `hash(exercise_id + student_id)` | Personalized homework |
| `per_group`   | `hash(exercise_id + group_id)`   | Class work            |

### ExerciseResourceType

Types of supplementary resources that can be attached to exercises.

```typescript
type ExerciseResourceType = 'video' | 'pdf' | 'link' | 'geogebra' | 'image';
```

| Type       | Description                  |
| ---------- | ---------------------------- |
| `video`    | YouTube, Vimeo, etc.         |
| `pdf`      | PDF documents                |
| `link`     | Generic web links            |
| `geogebra` | GeoGebra interactive applets |
| `image`    | Image files                  |

### ExerciseResource

Supplementary material attached to an exercise.

```typescript
interface ExerciseResource {
	type: ExerciseResourceType;
	url: string;
	title: string;
	description?: string;
}
```

### ExerciseCreate

For creating new exercises (excludes auto-generated fields).

```typescript
type ExerciseCreate = Omit<Exercise, 'id' | 'created_at' | 'updated_at'>;
```

### ExerciseUpdate

For updating exercises (all fields optional except id).

```typescript
type ExerciseUpdate = Partial<Omit<Exercise, 'id' | 'created_at' | 'created_by'>> & {
	id: string;
};
```

---

## Assignment Types

### ExerciseAssignment

Database model for assignment record.

```typescript
interface ExerciseAssignment {
	id: string; // UUID
	exercise_id: string; // FK to exercises
	assigned_by: string; // Teacher UUID
	assigned_to_type: AssignmentTargetType; // 'student' | 'class' | 'public'
	student_id: string | null; // Required if type='student'
	class_id: string | null; // Required if type='class'
	assigned_at: string; // ISO 8601
	optional_deadline: string | null; // ISO 8601 (informational)
	notes: string | null; // Teacher instructions
	is_active: boolean; // Soft delete flag
}
```

### AssignmentTargetType

```typescript
type AssignmentTargetType = 'student' | 'class' | 'public';
```

### CreateExerciseAssignment

For creating a single assignment.

```typescript
interface CreateExerciseAssignment {
	exercise_id: string;
	assigned_to_type: AssignmentTargetType;
	student_id?: string; // Required if type='student'
	class_id?: string; // Required if type='class'
	optional_deadline?: string | null;
	notes?: string;
}
```

### BulkAssignmentData

For creating multiple assignments at once.

```typescript
interface BulkAssignmentData {
	exercise_id: string;
	students?: string[]; // Array of student UUIDs
	classes?: string[]; // Array of class UUIDs
	make_public?: boolean; // Create public assignment
	optional_deadline?: string | null;
	notes?: string;
}
```

### AssignedExerciseWithDetails

Joined view with full details (from `assigned_exercises_with_details` view).

```typescript
interface AssignedExerciseWithDetails extends ExerciseAssignment {
	// From exercises table
	exercise_title: string;
	statement_md: string;
	distribution_mode: DistributionMode;
	exercise_is_public: boolean;
	difficulty: number;
	tags: string[];
	grade_levels: string[] | null;

	// From profiles (teacher)
	assigned_by_name: string;

	// Computed
	assigned_to_name: string; // Student name, class name, or "Public"
}
```

### AssignmentTarget

Discriminated union for type-safe target handling.

```typescript
type AssignmentTarget =
	| { type: 'student'; student_id: string }
	| { type: 'class'; class_id: string }
	| { type: 'public' };
```

---

## Completion Types

### ExerciseCompletion

Database model for completion tracking.

```typescript
interface ExerciseCompletion {
	id: string; // UUID
	exercise_id: string; // FK to exercises
	assignment_id: string | null; // FK to assignments (nullable)
	student_id: string; // FK to profiles
	completed_at: string | null; // NULL = not completed
	last_viewed_at: string; // ISO 8601
	view_count: number; // >= 1
	created_at: string; // ISO 8601
}
```

### ExerciseWithCompletion

Exercise with optional assignment and completion data (student view).

```typescript
interface ExerciseWithCompletion extends Exercise {
	assignment?: ExerciseAssignment; // If assigned to student
	completion?: ExerciseCompletion; // If viewed/completed
	is_accessible: boolean; // Has assignment OR is_public
}
```

---

## Instance Types

### ExerciseInstance

Resolved exercise with specific variable values.

```typescript
interface ExerciseInstance {
	// Metadata from template
	exerciseId: string;
	title?: string;
	difficulty: 1 | 2 | 3;
	tags?: string[];
	source?: string;
	grade_levels?: string[];
	topic?: string;

	// Instance-specific
	seed: number; // RNG seed used
	resolvedVariables: ResolvedVariable[]; // Resolved values

	// Resolved content ({{}} replaced with values)
	statement_md: string;
	solution_md: string;

	// Optional parsed AST
	statement_ast?: DocumentNode;
	solution_ast?: DocumentNode;

	// Metadata
	generatedAt: Date;
	distributionMode: DistributionMode;
}
```

### GenerateInstanceOptions

Options for instance generation.

```typescript
interface GenerateInstanceOptions {
	seed?: number; // Specific seed (or random if undefined)
	parseAST?: boolean; // Parse markdown to AST (default: false)
}
```

### InstanceGenerationResult

Result of instance generation.

```typescript
interface InstanceGenerationResult {
	success: boolean;
	instance?: ExerciseInstance; // Only if success=true
	errors?: string[]; // Only if success=false
}
```

---

## Filter & Query Types

### PaginationParams

```typescript
interface PaginationParams {
	limit?: number; // Default: 50
	offset?: number; // Default: 0
}
```

### PaginatedResponse

```typescript
interface PaginatedResponse<T> {
	data: T[];
	total: number;
	limit: number;
	offset: number;
	hasMore: boolean;
}
```

### StudentExerciseFilters

For student exercise list.

```typescript
interface StudentExerciseFilters {
	show_completed?: boolean; // Include completed
	show_assigned_only?: boolean; // Exclude public
	show_public?: boolean; // Include public
	has_deadline?: boolean; // Only with deadlines
	search?: string; // Search in title/statement
}
```

### TeacherAssignmentFilters

For teacher assignment list.

```typescript
interface TeacherAssignmentFilters {
	exercise_id?: string;
	assigned_to_type?: AssignmentTargetType;
	is_active?: boolean;
	has_deadline?: boolean;
}
```

---

## Statistics Types

### AssignmentStats

Aggregate stats for teacher dashboard.

```typescript
interface AssignmentStats {
	total_assignments: number;
	active_assignments: number;
	student_assignments: number;
	class_assignments: number;
	public_assignments: number;
	with_deadline: number;
}
```

### ExerciseCompletionStats

Stats for specific exercise.

```typescript
interface ExerciseCompletionStats {
	exercise_id: string;
	total_assigned: number;
	total_viewed: number;
	total_completed: number;
	completion_rate: number; // 0-100
	average_view_count: number;
}
```

---

## Import/Export Types

### ExerciseExport

Clean format for sharing (no id, timestamps, created_by).

```typescript
interface ExerciseExport {
	version: '1.0';
	title?: string;
	source?: string;
	difficulty: 1 | 2 | 3;
	tags: string[];
	statement_md: string;
	solution_md: string;
	grade_levels?: string[];
	topic?: string;
}
```

### ExerciseFrontmatter

YAML frontmatter for Markdown export.

```typescript
interface ExerciseFrontmatter {
	version: '1.0';
	title?: string;
	source?: string;
	difficulty: 1 | 2 | 3;
	tags: string[];
	grade_levels?: string[];
	topic?: string;
}
```

### ImportResult

```typescript
interface ImportResult {
	success: boolean;
	imported: number;
	skipped: number;
	failed: number;
	importedIds: string[];
	errors: Array<{
		index: number;
		title?: string;
		error: string;
	}>;
}
```

### ExportOptions

```typescript
interface ExportOptions {
	format: 'json' | 'markdown' | 'zip';
	includeSolution?: boolean;
	prettyPrint?: boolean;
}
```

### ImportOptions

```typescript
interface ImportOptions {
	onDuplicate: 'skip' | 'replace' | 'create-copy';
	validate?: boolean;
}
```

---

## Helper Functions

Utility functions exported from `$lib/exercises/types.ts`:

### validateAssignmentData

```typescript
function validateAssignmentData(data: CreateExerciseAssignment): {
	valid: boolean;
	error?: string;
};
```

Validates assignment target consistency.

### hasDeadline

```typescript
function hasDeadline(assignment: ExerciseAssignment): boolean;
```

### isExerciseCompleted

```typescript
function isExerciseCompleted(completion?: ExerciseCompletion): boolean;
```

### getCompletionPercentage

```typescript
function getCompletionPercentage(stats: ExerciseCompletionStats): number;
```

Returns rounded integer 0-100.

### formatAssignmentTarget

```typescript
function formatAssignmentTarget(assignment: ExerciseAssignment): string;
```

Returns 'Student', 'Class', or 'Public'.

---

## Usage Examples

### Creating a Parameterized Exercise

```typescript
import type { ExerciseCreate, Variable } from '$lib/exercises/types';

const variables: Variable[] = [
	{ name: 'a', expression: '{{1..10}}' },
	{ name: 'b', expression: '{{1..10}}' },
	{ name: 'sum', expression: '{{eval:a+b}}' }
];

const exercise: ExerciseCreate = {
	title: 'Addition Practice',
	difficulty: 1,
	tags: ['addition', 'arithmetic'],
	variables,
	statement_md: 'Calculate ${{a}} + {{b}}$',
	solution_md: 'The answer is ${{sum}}$',
	distribution_mode: 'on_demand',
	created_by: userId
};
```

### Type-Safe Assignment Handling

```typescript
import type { AssignmentTarget } from '$lib/exercises/types';

function processTarget(target: AssignmentTarget) {
	switch (target.type) {
		case 'student':
			console.log('Student:', target.student_id);
			break;
		case 'class':
			console.log('Class:', target.class_id);
			break;
		case 'public':
			console.log('Public assignment');
			break;
	}
}
```

### Checking Completion Status

```typescript
import { isExerciseCompleted } from '$lib/exercises/types';
import type { ExerciseWithCompletion } from '$lib/exercises/types';

function getStatus(exercise: ExerciseWithCompletion): string {
	if (isExerciseCompleted(exercise.completion)) {
		return 'Completed';
	}
	if (exercise.completion) {
		return `Viewed ${exercise.completion.view_count} times`;
	}
	return 'Not started';
}
```
