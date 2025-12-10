# Instance Generator

Technical reference for the worksheet instance generator which creates unique, parameterized worksheet instances for each student.

**Source file:** `src/lib/server/worksheets/instance-generator.ts`

---

## Overview

The instance generator creates deterministic worksheet instances by:

1. Generating unique seeds based on variant mode
2. Resolving exercise parameters using those seeds
3. Organizing exercises by sections
4. Optionally shuffling exercises

```
Input                           Output
┌─────────────────────┐        ┌─────────────────────┐
│ worksheetId         │        │ InstanceData        │
│ studentId           │───────▶│   exercises[]       │
│ exercises[]         │        │   exercise_order[]  │
│ config              │        │   variant_info      │
└─────────────────────┘        └─────────────────────┘
```

---

## Main Functions

### generateWorksheetInstance

Main entry point for generating a student's worksheet instance.

```typescript
export function generateWorksheetInstance(params: GenerateInstanceParams): InstanceData {
	const { worksheetId, studentId, exercises, config } = params;

	// 1. Group exercises by section
	// 2. Sort by position within sections
	// 3. Process each exercise with appropriate seed
	// 4. Apply shuffling if configured
	// 5. Build and return InstanceData
}
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `worksheetId` | string | UUID of the worksheet |
| `studentId` | string | UUID of the student |
| `exercises` | WorksheetExerciseWithExercise[] | Exercises with variant config |
| `config` | WorksheetConfig | Display configuration |

**Returns:** `InstanceData` with resolved exercises

---

### generatePreviewInstance

Generates a preview instance, optionally with a custom seed.

```typescript
export function generatePreviewInstance(
	params: Omit<GenerateInstanceParams, 'studentId'> & {
		studentId?: string;
		variantSeed?: number;
	}
): InstanceData;
```

**Usage:**

```typescript
// Generic preview (random seed)
const preview = generatePreviewInstance({
	worksheetId,
	exercises,
	config
});

// Preview for specific student
const studentPreview = generatePreviewInstance({
	worksheetId,
	studentId: 'student-uuid',
	exercises,
	config
});

// Preview with custom seed
const seededPreview = generatePreviewInstance({
	worksheetId,
	exercises,
	config,
	variantSeed: 12345
});
```

---

## Seed Generation

### generateSeed Function

Creates deterministic seeds based on variant mode.

```typescript
function generateSeed(
	worksheetId: string,
	studentId: string,
	variantMode: VariantMode,
	variantConfig?: VariantConfig
): number;
```

### Variant Mode Behavior

#### Mode: `none`

All students get the same content.

```typescript
case 'none':
  // Seed based only on worksheet ID
  return Math.abs(worksheetId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
```

**Example:**

- Worksheet: "abc-123" → Seed: 814
- Student A with worksheet "abc-123" → Seed: 814
- Student B with worksheet "abc-123" → Seed: 814

#### Mode: `individual`

Each student gets unique content.

```typescript
case 'individual':
  // Hash of worksheet + student IDs
  const baseString = `${worksheetId}-${studentId}`;
  let hash = 0;
  for (let i = 0; i < baseString.length; i++) {
    hash = (hash << 5) - hash + baseString.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
```

**Example:**

- Student A with worksheet "abc" → Seed: 2847391
- Student B with worksheet "abc" → Seed: 9183726

#### Mode: `n_versions`

Limited number of versions (A, B, C, etc.).

```typescript
case 'n_versions':
  const nVersions = variantConfig?.n_versions || 3;
  const versionIndex = Math.abs(hash) % nVersions;
  return Math.abs(
    worksheetId.reduce((acc, char) => acc + char.charCodeAt(0), 0) + versionIndex * 1000
  );
```

**Example (3 versions):**

- Student A → Version B (index 1) → Seed: 1814
- Student B → Version A (index 0) → Seed: 814
- Student C → Version B (index 1) → Seed: 1814

#### Mode: `group`

Students grouped together share content.

```typescript
case 'group':
  const groupSize = variantConfig?.group_size || 4;
  const groupIndex = Math.floor((Math.abs(hash) % 100) / groupSize);
  return Math.abs(
    worksheetId.reduce((acc, char) => acc + char.charCodeAt(0), 0) + groupIndex * 1000
  );
```

**Example (group size 4):**

- Students 1-4 → Group 0 → Seed: 814
- Students 5-8 → Group 1 → Seed: 1814

---

## Version and Group Identification

### getVariantVersion

Returns the version letter for `n_versions` mode.

```typescript
function getVariantVersion(
	studentId: string,
	variantMode: VariantMode,
	variantConfig?: VariantConfig
): string | null {
	if (variantMode !== 'n_versions') return null;

	const nVersions = variantConfig?.n_versions || 3;
	const hash = studentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
	const versionIndex = Math.abs(hash) % nVersions;

	return String.fromCharCode(65 + versionIndex); // A, B, C, ...
}
```

### getGroupId

Returns the group identifier for `group` mode.

```typescript
function getGroupId(
	studentId: string,
	variantMode: VariantMode,
	variantConfig?: VariantConfig
): string | null {
	if (variantMode !== 'group') return null;

	const groupSize = variantConfig?.group_size || 4;
	const hash = studentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
	const groupIndex = Math.floor((Math.abs(hash) % 100) / groupSize);

	return `G${groupIndex + 1}`; // G1, G2, G3, ...
}
```

---

## Exercise Resolution

### resolveExercise Function

Resolves an exercise's parameters and substitutes them into the content.

```typescript
function resolveExercise(
	exercise: WorksheetExerciseWithExercise,
	position: number,
	seed: number,
	variantConfig?: VariantConfig
): ResolvedExercise;
```

**Process:**

1. Extract variables from exercise definition
2. Apply parameter overrides from variant config
3. Resolve variables using seeded random
4. Substitute into statement and solution markdown

```typescript
// 1. Extract variables
const variables: Variable[] = [];
if (exercise.exercise.variables) {
	for (const variable of exercise.exercise.variables) {
		variables.push({
			name: String(variable.name),
			expression: String(variable.expression)
		});
	}
}

// 2. Apply overrides
if (variantConfig?.parameter_overrides) {
	for (const [name, value] of Object.entries(variantConfig.parameter_overrides)) {
		const existing = variables.find((v) => v.name === name);
		if (existing) {
			existing.expression = String(value);
		}
	}
}

// 3. Resolve with seed
const resolvedVariables = resolveVariables(variables, seed + position);

// 4. Substitute into content
const statement = resolveText(exercise.exercise.statement_md, resolvedVariables);
const solution = resolveText(exercise.exercise.solution_md, resolvedVariables);
```

---

## Shuffling

### shuffleArray Function

Fisher-Yates shuffle with seeded random number generator.

```typescript
function shuffleArray<T>(array: T[], seed: number): T[] {
	const shuffled = [...array];
	let currentIndex = shuffled.length;

	// Seeded random generator
	let randomSeed = seed;
	const random = () => {
		randomSeed = (randomSeed * 9301 + 49297) % 233280;
		return randomSeed / 233280;
	};

	while (currentIndex !== 0) {
		const randomIndex = Math.floor(random() * currentIndex);
		currentIndex--;
		[shuffled[currentIndex], shuffled[randomIndex]] = [
			shuffled[randomIndex],
			shuffled[currentIndex]
		];
	}

	return shuffled;
}
```

### Shuffle Modes

**Global Shuffle (`config.shuffle_exercises`):**

- Shuffles all exercises regardless of sections
- Applied after section processing

**Per-Section Shuffle (`config.shuffle_within_sections`):**

- Shuffles exercises within each section independently
- Preserves section boundaries

```typescript
// Per-section shuffle
if (config.shuffle_within_sections && sectionId !== null) {
	const sectionSeed =
		worksheetId.reduce((acc, char) => acc + char.charCodeAt(0), 0) +
		(sectionId ? sectionId.reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0);
	exercisesToProcess = shuffleArray(exercisesToProcess, sectionSeed);
}

// Global shuffle
if (config.shuffle_exercises) {
	const globalSeed = generateSeed(worksheetId, studentId, 'individual');
	const indices = Array.from({ length: resolvedExercises.length }, (_, i) => i);
	const shuffledIndices = shuffleArray(indices, globalSeed);
	// ...
}
```

---

## Output Structure

### InstanceData

```typescript
interface InstanceData {
	exercises: ResolvedExercise[];
	exercise_order?: number[];
	variant_info?: {
		seed: number;
		version?: string;
		group_id?: string;
	};
}
```

**exercises:** Array of resolved exercises with:

- `exercise_id`: Reference to original
- `position`: Current position in output
- `parameters`: Resolved values (e.g., `{ a: 5, b: 10 }`)
- `statement`: Markdown with substituted values
- `solution`: Markdown with substituted values

**exercise_order:** Original positions (only if shuffled)

**variant_info:**

- `seed`: The seed used for generation
- `version`: "A", "B", etc. for n_versions mode
- `group_id`: "G1", "G2", etc. for group mode

---

## Integration with Custom Markdown

The instance generator uses the custom markdown system for variable resolution:

```typescript
import type { Variable } from '$lib/custom-markdown';
import { resolveVariables, resolveText } from '$lib/custom-markdown';

// Variable definition
interface Variable {
	name: string;
	expression: string; // e.g., "random(1,10)", "5*a+3"
}

// Resolve variables with seed
const resolved = resolveVariables(variables, seed);
// Returns: [{ name: "a", value: 7 }, { name: "b", value: 38 }]

// Substitute into text
const text = resolveText('Calculate {{a}} + {{b}}', resolved);
// Returns: "Calculate 7 + 38"
```

---

## Usage Examples

### Basic Usage

```typescript
import { generateWorksheetInstance } from '$lib/server/worksheets/instance-generator';

const instance = generateWorksheetInstance({
	worksheetId: 'ws-uuid',
	studentId: 'student-uuid',
	exercises: worksheetExercises,
	config: worksheet.config
});

console.log(instance.exercises[0].statement);
// "Solve the equation: 3x + 7 = 22"

console.log(instance.exercises[0].parameters);
// { a: 3, b: 7, c: 22 }
```

### With Different Variant Modes

```typescript
// Same for all students
const uniformExercise = { ...exercise, variant_mode: 'none' };

// Unique per student
const individualExercise = { ...exercise, variant_mode: 'individual' };

// 3 versions (A, B, C)
const versionedExercise = {
	...exercise,
	variant_mode: 'n_versions',
	variant_config: { n_versions: 3 }
};

// Groups of 5 students
const groupedExercise = {
	...exercise,
	variant_mode: 'group',
	variant_config: { group_size: 5 }
};
```

### With Parameter Overrides

```typescript
const exerciseWithOverrides = {
	...exercise,
	variant_mode: 'individual',
	variant_config: {
		parameter_overrides: {
			difficulty: 'hard',
			max_value: 100
		}
	}
};
```

---

## Testing

Test file: `src/lib/server/worksheets/instance-generator.test.ts`

Key test cases:

- Parameter resolution with `{{variable}}` syntax
- Deterministic generation (same inputs = same outputs)
- Different students get different results
- Variant mode behavior
- Shuffling (global and per-section)
- Section organization
- Edge cases (empty exercises, missing variables)
