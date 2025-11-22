# Grade System (Niveaux d'Étude)

Guide for developers using the unified grade system in UbuMaths.

## Overview

UbuMaths uses a **single source of truth** for French educational grade levels, covering the complete K-12 equivalent from CP (age 6) to Terminale (age 18). The system provides:

- Canonical grade codes stored in the database
- Flexible parsing for multiple input formats
- Comprehensive utility functions for grade operations
- Type-safe validation with Zod
- Efficient hierarchy computation with caching

---

## Quick Start

### Import Types and Utilities

```typescript
import { type GradeCode, GRADES, GRADE_CODES } from '$lib/types/grades';
import {
	getAccessibleGrades,
	formatGradeForDisplay,
	parseGradeCode,
	getGradeSelectItems,
	hasAccessToGrade
} from '$lib/utils/grades';
import { gradeCodeSchema, gradeArraySchema } from '$lib/server/validation/grades';
```

### Common Operations

```typescript
// Get grade display name (with French accents)
formatGradeForDisplay('6'); // Returns '6ème'

// Parse user input to canonical code
parseGradeCode('6ème'); // Returns '6'
parseGradeCode('sixième'); // Returns '6'
parseGradeCode('6'); // Returns '6'

// Check what grades a student can access
getAccessibleGrades('5'); // Returns ['5', '6', 'CM2', 'CM1', 'CE2', 'CE1', 'CP']

// Get items for select components
const items = getGradeSelectItems();
// [{value: 'CP', label: 'CP'}, {value: 'CE1', label: 'CE1'}, ...]

// Validate grade access
hasAccessToGrade('6', '5'); // true - student in 6ème can access 5ème content
hasAccessToGrade('3', '6'); // false - student in 3ème cannot access 6ème
```

---

## Grade Hierarchy

### Canonical Grade Codes (18 Total)

All grades are stored in the database using these canonical codes:

#### Primary School (École Primaire) - Ages 6-11

| Code  | Display Name | Short Name | Age |
| ----- | ------------ | ---------- | --- |
| `CP`  | CP           | CP         | 6   |
| `CE1` | CE1          | CE1        | 7   |
| `CE2` | CE2          | CE2        | 8   |
| `CM1` | CM1          | CM1        | 9   |
| `CM2` | CM2          | CM2        | 10  |

#### Middle School (Collège) - Ages 11-15

| Code | Display Name | Short Name | Age |
| ---- | ------------ | ---------- | --- |
| `6`  | 6ème         | 6e         | 11  |
| `5`  | 5ème         | 5e         | 12  |
| `4`  | 4ème         | 4e         | 13  |
| `3`  | 3ème         | 3e         | 14  |

#### High School (Lycée) - Ages 15-18

| Code     | Display Name                    | Short Name | Track     | Age |
| -------- | ------------------------------- | ---------- | --------- | --- |
| `2`      | 2nde                            | 2nde       | —         | 15  |
| `1_GEN`  | 1ère générale                   | 1ère G     | general   | 16  |
| `T_GEN`  | Terminale générale              | Term G     | general   | 17  |
| `1_SPE`  | 1ère spécialité maths           | 1ère Spé   | spe_maths | 16  |
| `T_SPE`  | Terminale spécialité maths      | Term Spé   | spe_maths | 17  |
| `T_EXP`  | Terminale maths expertes        | Term Exp   | spe_maths | 17  |
| `T_COMP` | Terminale maths complémentaires | Term Comp  | general   | 17  |
| `1_STMG` | 1ère STMG                       | 1ère STMG  | stmg      | 16  |
| `T_STMG` | Terminale STMG                  | Term STMG  | stmg      | 17  |

### Grade Progression Tree

```
CP → CE1 → CE2 → CM1 → CM2 → 6 → 5 → 4 → 3 → 2
                                            ↓
                            ┌───────────────┼───────────────┐
                            ↓               ↓               ↓
                        1_GEN           1_SPE           1_STMG
                            ↓               ↓               ↓
                            ↓               ↓               ↓
            ┌───────────┬───┘               ↓               ↓
            ↓           ↓                   ↓               ↓
        T_GEN       T_COMP              T_SPE           T_STMG
                                            ↓
                                        T_EXP
```

**Key branching points:**

- **2nde → Three tracks**: 2nde is the only grade accessible to all three lycée tracks (général, spécialité maths, STMG)
- **1ère → Different paths to Terminale**:
  - `1_GEN` → `T_GEN` or `T_COMP`
  - `1_SPE` → `T_SPE` or `T_EXP`
  - `1_STMG` → `T_STMG`

---

## API Reference

### Types

#### `GradeCode`

Union type of all 18 valid grade codes. Used throughout the system.

```typescript
type GradeCode =
	| 'CP'
	| 'CE1'
	| 'CE2'
	| 'CM1'
	| 'CM2'
	| '6'
	| '5'
	| '4'
	| '3'
	| '2'
	| '1_GEN'
	| 'T_GEN'
	| '1_SPE'
	| 'T_SPE'
	| 'T_EXP'
	| 'T_COMP'
	| '1_STMG'
	| 'T_STMG';
```

#### `SchoolLevel`

Categories for primary, middle, and high school.

```typescript
type SchoolLevel = 'primary' | 'middle' | 'high';
```

#### `HighSchoolTrack`

Specialized tracks in lycée.

```typescript
type HighSchoolTrack = 'general' | 'spe_maths' | 'stmg';
```

#### `MathsIntensity`

Intensity levels for mathematics courses.

```typescript
type MathsIntensity = 'basic' | 'standard' | 'advanced' | 'expert';
```

#### `GradeInfo`

Complete metadata for a grade.

```typescript
interface GradeInfo {
	code: GradeCode; // e.g., '6'
	displayName: string; // e.g., '6ème' (French, with accents)
	shortName: string; // e.g., '6e'
	level: SchoolLevel; // e.g., 'middle'
	schoolYear: number; // 1-12 (CP=1, Terminale=12)
	track?: HighSchoolTrack; // Only for lycée after 2nde
	mathsIntensity: MathsIntensity;
	prerequisites: GradeCode[]; // Direct prerequisites only
}
```

### Constants

#### `GRADE_CODES`

Array of all 18 canonical grade codes.

```typescript
const GRADE_CODES = ['CP', 'CE1', ..., 'T_STMG'];
```

#### `GRADES`

Record mapping each grade code to its metadata. **This is the single source of truth**.

```typescript
const GRADES: Record<GradeCode, GradeInfo> = {
	'6': {
		code: '6',
		displayName: '6ème',
		shortName: '6e',
		level: 'middle',
		schoolYear: 6,
		mathsIntensity: 'standard',
		prerequisites: ['CM2']
	}
	// ... 17 more entries
};
```

#### Grade Collections

Pre-grouped grade codes for common filtering:

```typescript
const PRIMARY_GRADES: GradeCode[] = ['CP', 'CE1', 'CE2', 'CM1', 'CM2'];
const MIDDLE_GRADES: GradeCode[] = ['6', '5', '4', '3'];
const HIGH_GRADES: GradeCode[] = [
	'2',
	'1_GEN',
	'T_GEN',
	'1_SPE',
	'T_SPE',
	'T_EXP',
	'T_COMP',
	'1_STMG',
	'T_STMG'
];
```

### Utility Functions

#### `getAccessibleGrades(grade: GradeCode): GradeCode[]`

Returns all grades a student can access **from** the given grade (prerequisites + self).

**Example**: Student in 6ème can access:

- Their own grade: 6
- Prerequisites: CM2, CM1, CE2, CE1, CP

```typescript
const accessible = getAccessibleGrades('6');
// ['6', 'CM2', 'CM1', 'CE2', 'CE1', 'CP']

// Student in Terminale spécialité
const termAccess = getAccessibleGrades('T_SPE');
// ['T_SPE', '1_SPE', '2', '3', '4', '5', '6', 'CM2', 'CM1', 'CE2', 'CE1', 'CP']
```

**Use cases:**

- Determine what content a student can access
- Filter content library for a student
- Show prerequisite content

---

#### `getReachableGrades(grade: GradeCode): GradeCode[]`

Returns all grades a student can progress **to** from the given grade (successors + self).

```typescript
const reachable = getReachableGrades('2');
// ['2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_STMG', 'T_STMG']

const afterPrimary = getReachableGrades('CM2');
// ['CM2', '6', '5', '4', '3', '2', ...]
```

**Use cases:**

- Show progression path for a student
- Determine what grades a student can enroll in
- Path planning

---

#### `formatGradeForDisplay(grade: GradeCode): string`

Returns the full display name with French accents.

```typescript
formatGradeForDisplay('6'); // '6ème'
formatGradeForDisplay('1_GEN'); // '1ère générale'
formatGradeForDisplay('T_EXP'); // 'Terminale maths expertes'
```

---

#### `formatGradeShort(grade: GradeCode): string`

Returns the abbreviated name.

```typescript
formatGradeShort('6'); // '6e'
formatGradeShort('1_GEN'); // '1ère G'
formatGradeShort('T_EXP'); // 'Term Exp'
```

---

#### `parseGradeCode(input: string): GradeCode | null`

Parses various input formats and normalizes to canonical code. **Extremely flexible.**

```typescript
// Middle school - all return '6'
parseGradeCode('6'); // '6'
parseGradeCode('6ème'); // '6'
parseGradeCode('6eme'); // '6'
parseGradeCode('6e'); // '6'
parseGradeCode('sixième'); // '6'
parseGradeCode('sixieme'); // '6'

// High school
parseGradeCode('1_GEN'); // '1_GEN'
parseGradeCode('1ère générale'); // '1_GEN'
parseGradeCode('1ere generale'); // '1_GEN'
parseGradeCode('première générale'); // '1_GEN'

// Invalid input
parseGradeCode('invalid'); // null
parseGradeCode(''); // null
```

---

#### `hasAccessToGrade(userGrade: GradeCode, contentGrade: GradeCode): boolean`

Checks if a student with `userGrade` can access content at `contentGrade`.

```typescript
hasAccessToGrade('6', '5'); // true - can access lower grades
hasAccessToGrade('6', 'CM2'); // true - can access prerequisites
hasAccessToGrade('6', '5ème'); // true - flexible parsing
hasAccessToGrade('3', '6'); // false - cannot access higher grades
```

**Use cases:**

- Authorization checks in API endpoints
- Content access validation
- Permission checks in UI

---

#### `getGradeSelectItems(): Array<{value: GradeCode; label: string}>`

Returns all grades formatted for UI select components.

```typescript
const items = getGradeSelectItems();
// [
//   {value: 'CP', label: 'CP'},
//   {value: 'CE1', label: 'CE1'},
//   ...
//   {value: 'T_STMG', label: 'Terminale STMG'}
// ]
```

**Use in components:**

```svelte
<MySelect type="single" bind:value={selectedGrade} items={getGradeSelectItems()} />
```

---

#### `getGradeSelectItemsByLevel(level: SchoolLevel): Array<{value: GradeCode; label: string}>`

Returns grades filtered by school level.

```typescript
getGradeSelectItemsByLevel('primary');
// [{value: 'CP', label: 'CP'}, {value: 'CE1', label: 'CE1'}, ...]

getGradeSelectItemsByLevel('high');
// [{value: '2', label: '2nde'}, {value: '1_GEN', label: '1ère générale'}, ...]
```

---

#### `getGradeSelectItemsByTrack(track: HighSchoolTrack): Array<{value: GradeCode; label: string}>`

Returns grades for a specific high school track. Always includes 2nde since all students take it.

```typescript
getGradeSelectItemsByTrack('general');
// [{value: '2', label: '2nde'}, {value: '1_GEN', label: '1ère générale'}, {value: 'T_GEN', label: 'Terminale générale'}, {value: 'T_COMP', label: 'Terminale maths complémentaires'}]

getGradeSelectItemsByTrack('spe_maths');
// [{value: '2', label: '2nde'}, {value: '1_SPE', label: '1ère spécialité maths'}, {value: 'T_SPE', label: 'Terminale spécialité maths'}, {value: 'T_EXP', label: 'Terminale maths expertes'}]

getGradeSelectItemsByTrack('stmg');
// [{value: '2', label: '2nde'}, {value: '1_STMG', label: '1ère STMG'}, {value: 'T_STMG', label: 'Terminale STMG'}]
```

---

#### `getGradesGroupedByLevel(): Record<SchoolLevel, Array<{value: GradeCode; label: string}>>`

Returns grades organized by school level for hierarchical UI display.

```typescript
const grouped = getGradesGroupedByLevel();
// {
//   primary: [{value: 'CP', label: 'CP'}, ...],
//   middle: [{value: '6', label: '6ème'}, ...],
//   high: [{value: '2', label: '2nde'}, ...]
// }
```

---

#### Navigation Functions

**`getNextGrade(grade: GradeCode): GradeCode | null`**

Returns the next grade in progression. Returns `null` for:

- Final grade (T_GEN, T_SPE, T_EXP, T_STMG)
- 2nde (has multiple next grades due to track branching)

```typescript
getNextGrade('CP'); // 'CE1'
getNextGrade('CM2'); // '6'
getNextGrade('1_GEN'); // 'T_GEN'
getNextGrade('2'); // null (branches to 3 different grades)
getNextGrade('T_GEN'); // null (final grade)
```

---

**`getPreviousGrade(grade: GradeCode): GradeCode | null`**

Returns the immediate prerequisite.

```typescript
getPreviousGrade('CE1'); // 'CP'
getPreviousGrade('6'); // 'CM2'
getPreviousGrade('1_SPE'); // '2'
getPreviousGrade('CP'); // null (entry point)
```

---

#### `getGradeRange(from: GradeCode, to: GradeCode): GradeCode[]`

Returns all grades between two grades (inclusive), ordered by school year.

```typescript
getGradeRange('CE2', '5');
// ['CE2', 'CM1', 'CM2', '6', '5']

getGradeRange('4', 'CE1');
// ['CE1', 'CE2', 'CM1', 'CM2', '6', '5', '4']
```

**Use cases:**

- Show grade range filters
- Bulk operations on grade ranges

---

#### Comparison Function

**`compareGrades(a: GradeCode, b: GradeCode): number`**

Compares two grades by school year. Negative = a is lower, positive = a is higher.

```typescript
compareGrades('3', '6'); // 2 (3ème is higher than 6ème)
compareGrades('CP', '3'); // -8 (CP is lower)
compareGrades('CP', 'CP'); // 0 (same)
```

---

#### `isValidGradeCode(code: string): code is GradeCode`

Type guard to check if a string is a valid grade code.

```typescript
if (isValidGradeCode(userInput)) {
	// userInput is now typed as GradeCode
	const info = GRADES[userInput];
}
```

---

#### `getGradesByLevel(level: SchoolLevel): GradeCode[]`

Returns grade codes filtered by school level (without UI formatting).

```typescript
getGradesByLevel('primary'); // ['CP', 'CE1', 'CE2', 'CM1', 'CM2']
```

---

#### Performance Functions

**`clearGradeCache(): void`**

Clears the hierarchy computation cache. Useful for testing.

```typescript
clearGradeCache(); // Clears internal caches for getAccessibleGrades and getReachableGrades
```

---

## Validation with Zod

### Strict Schema

Accepts only canonical grade codes.

```typescript
import { gradeCodeSchema } from '$lib/server/validation/grades';

// In form action or API endpoint
const result = gradeCodeSchema.safeParse('6');
if (result.success) {
	const gradeCode: GradeCode = result.data; // '6'
}
```

---

### Flexible Schema

Accepts variations and normalizes to canonical.

```typescript
import { gradeFlexibleSchema } from '$lib/server/validation/grades';

const result = gradeFlexibleSchema.safeParse('6ème');
if (result.success) {
	const gradeCode: GradeCode = result.data; // '6'
}
```

---

### Array Schemas

For fields that store multiple grades (e.g., question templates).

```typescript
import { gradeArraySchema, gradeArrayFlexibleSchema } from '$lib/server/validation/grades';

// Strict: canonical codes only
gradeArraySchema.safeParse(['6', '5', '4']); // ✅ success

// Flexible: with parsing
gradeArrayFlexibleSchema.safeParse(['6ème', '5eme', '4']);
// ✅ success → ['6', '5', '4']
```

---

### Query Parameter Parsing

**`gradeCommaSeparatedSchema`**

For query params like `?grades=6,5,4`.

```typescript
import { gradeCommaSeparatedSchema } from '$lib/server/validation/grades';

const result = gradeCommaSeparatedSchema.safeParse('6,5ème,4');
if (result.success) {
	const grades = result.data; // ['6', '5', '4']
}
```

---

### Grade Filter Schema

For flexible filtering in API queries.

```typescript
import { gradeFilterSchema } from '$lib/server/validation/grades';

gradeFilterSchema.safeParse('all'); // ✅ 'all'
gradeFilterSchema.safeParse('6'); // ✅ ['6']
gradeFilterSchema.safeParse(['6', '5']); // ✅ ['6', '5']
gradeFilterSchema.safeParse('6ème'); // ✅ ['6']
```

---

### Grade Access Validation

Validates that a user can access content.

```typescript
import { gradeAccessSchema } from '$lib/server/validation/grades';

// In API endpoint
const result = gradeAccessSchema.safeParse({
	userGrade: '6',
	contentGrade: '5'
});

if (!result.success) {
	// User doesn't have access
	throw error(403, "L'utilisateur n'a pas accès à ce contenu");
}
```

---

### Update Schemas

For PATCH operations.

```typescript
import { gradeUpdateSchema } from '$lib/server/validation/grades';

// Replace all grades
gradeUpdateSchema.safeParse({ grades: ['6', '5'] });

// Add specific grades
gradeUpdateSchema.safeParse({ addGrades: ['4'] });

// Remove specific grades
gradeUpdateSchema.safeParse({ removeGrades: ['6'] });
```

---

## Database Storage

### Schema Updates

All grade columns have been standardized to use canonical codes:

**Scalar columns (single grade):**

- `profiles.grade` - Student's current grade (nullable)
- `assessments.grade` - Assessment's target grade (required)
- `pending_students.grade` - Pending invitation grade (nullable)

**Array columns (multiple grades):**

- `question_templates.grades` - Applicable grades for the template
- `exercises.grade_levels` - Applicable grades for the exercise

### Constraints

All grade columns have `CHECK` constraints ensuring only valid canonical codes are stored:

```sql
CHECK (grade IN (
  'CP', 'CE1', 'CE2', 'CM1', 'CM2',
  '6', '5', '4', '3',
  '2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_STMG', 'T_STMG'
))
```

### Migration

Migration `20251122212335_standardize_grades.sql` includes:

1. **Normalization functions**:
   - `normalize_grade_value()` - Convert single grade to canonical
   - `normalize_grade_array()` - Convert grade array to canonical
   - `is_valid_grade_array()` - Validate grade arrays

2. **Data migration**: Converts all existing grades to canonical format

3. **Constraints**: Prevents invalid grades in the future

**Migration is idempotent** - safe to run multiple times.

---

## Common Use Cases

### Displaying Grades in UI

```svelte
<script>
	import { formatGradeForDisplay } from '$lib/utils/grades';
	let userGrade = '6';
</script>

<p>Niveau d'étude: {formatGradeForDisplay(userGrade)}</p>
<!-- Outputs: Niveau d'étude: 6ème -->
```

---

### Grade Select Component

```svelte
<script>
	import MySelect from '$lib/components/MySelect.svelte';
	import { getGradeSelectItems } from '$lib/utils/grades';

	let selectedGrade = $state('6');
</script>

<MySelect type="single" bind:value={selectedGrade} items={getGradeSelectItems()} />
```

---

### Grouped by School Level

```svelte
<script>
	import { getGradesGroupedByLevel } from '$lib/utils/grades';

	const grades = getGradesGroupedByLevel();
</script>

<optgroup label="École primaire">
	{#each grades.primary as item}
		<option value={item.value}>{item.label}</option>
	{/each}
</optgroup>

<optgroup label="Collège">
	{#each grades.middle as item}
		<option value={item.value}>{item.label}</option>
	{/each}
</optgroup>

<optgroup label="Lycée">
	{#each grades.high as item}
		<option value={item.value}>{item.label}</option>
	{/each}
</optgroup>
```

---

### API Validation

```typescript
// +server.ts
import { gradeAccessSchema } from '$lib/server/validation/grades';
import { error } from '@sveltejs/kit';

export async function GET({ url, locals }) {
	const contentGrade = url.searchParams.get('grade');

	const validation = gradeAccessSchema.safeParse({
		userGrade: locals.user.grade,
		contentGrade
	});

	if (!validation.success) {
		throw error(403, "L'utilisateur n'a pas accès à ce contenu");
	}

	// User has access, proceed...
}
```

---

### Filtering Content by Grade

```typescript
import { getAccessibleGrades } from '$lib/utils/grades';

// Get all exercises for a student
const studentGrade = profiles.grade;
const accessibleGrades = getAccessibleGrades(studentGrade);

const { data: exercises } = await supabase
	.from('exercises')
	.select('*')
	.in('grade_levels', accessibleGrades);

// exercises now contains only content the student can access
```

---

### Accepting Flexible User Input

```typescript
import { parseGradeCode, gradeFlexibleSchema } from '$lib/utils/grades';

// From a form or CSV import
const userInput = req.body.grade; // "6ème" or "sixième" or "6"

// Option 1: Direct parsing
const parsed = parseGradeCode(userInput);
if (!parsed) {
	throw error(400, `Niveau invalide: ${userInput}`);
}

// Option 2: Zod validation (recommended)
const result = gradeFlexibleSchema.safeParse(userInput);
if (!result.success) {
	throw error(400, result.error.issues[0].message);
}
const gradeCode = result.data;
```

---

## Math Intensity Levels

Different grades have different math intensity levels, useful for curriculum planning:

| Intensity    | Grades                    | Usage                       |
| ------------ | ------------------------- | --------------------------- |
| **basic**    | CP-CM2, STMG              | Foundation level            |
| **standard** | 6-3, 1_GEN, T_GEN, T_COMP | Regular curriculum          |
| **advanced** | 1_SPE, T_SPE              | Specialized mathematics     |
| **expert**   | T_EXP                     | Expert/advanced mathematics |

Access via:

```typescript
GRADES['6'].mathsIntensity; // 'standard'
GRADES['1_SPE'].mathsIntensity; // 'advanced'
GRADES['T_EXP'].mathsIntensity; // 'expert'
```

---

## Migration Notes

### Old Format References

If working with legacy code or data:

**Old formats that are now normalized:**

- Variations: `'6ème'`, `'6eme'`, `'6e'`, `'sixième'`, etc. → canonical: `'6'`
- Variations: `'1ère'`, `'1ere'`, `'1ère générale'`, etc. → canonical: `'1_GEN'`
- Variations: `'spe_1'` → canonical: `'1_SPE'`
- Variations: `'tle'`, `'terminale'` → canonical: `'T_GEN'` (default, prefer explicit)

### Updating Legacy Code

When updating old code to use the new system:

**Before:**

```typescript
if (grade === '6ème' || grade === '6eme' || grade === '6') {
	// ...
}
```

**After:**

```typescript
if (isValidGradeCode(grade) && GRADES[grade].level === 'middle') {
	// ...
}
// Or simpler:
const normalized = parseGradeCode(grade);
if (normalized && GRADES[normalized].level === 'middle') {
	// ...
}
```

---

## Best Practices

### Do's

✅ **Always use canonical codes in the database**

```typescript
// When storing to DB
const grade: GradeCode = parseGradeCode(userInput) ?? 'CP';
await supabase.from('profiles').update({ grade });
```

✅ **Use flexible parsing for user input**

```typescript
const userInput = '6ème'; // Could be anything
const parsed = parseGradeCode(userInput);
```

✅ **Use `GRADES` as single source of truth**

```typescript
const info = GRADES[gradeCode]; // Always check here
const displayName = info.displayName;
```

✅ **Use utility functions instead of manual checks**

```typescript
// Good
if (hasAccessToGrade(userGrade, contentGrade)) {
	// ...
}

// Avoid manual hierarchy checks
```

✅ **Validate with Zod in API endpoints**

```typescript
const validated = await gradeArraySchema.parseAsync(req.body.grades);
```

### Don'ts

❌ **Don't hardcode grade names**

```typescript
// Bad
if (grade === 'sixième') {
}

// Good
if (parseGradeCode(grade) === '6') {
}
```

❌ **Don't store non-canonical codes**

```typescript
// Bad
await db.update({ grade: '6ème' }); // Database rejects this

// Good
await db.update({ grade: '6' });
```

❌ **Don't manually compute hierarchies**

```typescript
// Bad
const canAccess = grade <= '6'; // Wrong for non-numeric grades

// Good
const canAccess = hasAccessToGrade(userGrade, contentGrade);
```

❌ **Don't forget test mode filtering with grades**

```typescript
// Always include test mode check when querying students by grade
.eq('is_test', testMode)
```

---

## Examples

### Complete Exercise Filtering

```typescript
import { getAccessibleGrades } from '$lib/utils/grades';
import type { GradeCode } from '$lib/types/grades';

export async function getExercisesForStudent(supabase: SupabaseClient, studentGrade: GradeCode) {
	const accessibleGrades = getAccessibleGrades(studentGrade);

	const { data, error } = await supabase
		.from('exercises')
		.select(
			`
      id,
      title,
      description,
      grade_levels
    `
		)
		.in('grade_levels', accessibleGrades)
		.order('difficulty');

	if (error) throw error;
	return data;
}
```

---

### Complete Form with Grade Selection

```svelte
<script lang="ts">
	import { enhance } from '$app/forms';
	import MySelect from '$lib/components/MySelect.svelte';
	import { getGradesGroupedByLevel } from '$lib/utils/grades';

	let selectedGrade = $state('6');
	let loading = $state(false);

	const gradesByLevel = getGradesGroupedByLevel();
	const allGrades = [...gradesByLevel.primary, ...gradesByLevel.middle, ...gradesByLevel.high];
</script>

<form
	method="POST"
	use:enhance={() => {
		loading = true;
		return async ({ result }) => {
			loading = false;
			if (result.type === 'success') {
				// Handle success
			}
		};
	}}
>
	<MySelect type="single" bind:value={selectedGrade} items={allGrades} disabled={loading} />

	<button type="submit" disabled={loading}>
		{loading ? 'Enregistrement...' : 'Enregistrer'}
	</button>
</form>
```

---

### Server-side Grade Authorization

```typescript
// +server.ts
import { error } from '@sveltejs/kit';
import { gradeAccessSchema } from '$lib/server/validation/grades';

export async function POST({ request, locals }) {
	const body = await request.json();

	// Validate grade access
	const validation = gradeAccessSchema.safeParse({
		userGrade: locals.user.grade,
		contentGrade: body.grade
	});

	if (!validation.success) {
		throw error(403, "L'utilisateur n'a pas accès à ce contenu");
	}

	// User has access, process request
	// ...
}
```

---

## Technical Details

### Caching

`getAccessibleGrades()` and `getReachableGrades()` use in-memory caching to avoid recomputing hierarchies:

- **First call**: BFS traversal of the prerequisite tree (O(n))
- **Subsequent calls**: Cache hit (O(1))
- **Cache cleared**: On application restart or manual `clearGradeCache()`

This is transparent to the caller.

### Type Safety

All grade-related code uses strict TypeScript:

- `GradeCode` union type ensures only valid codes are used
- `GradeInfo` interface fully types grade metadata
- Zod schemas provide runtime validation
- No `any` types

### Single Source of Truth

The `GRADES` constant in `src/lib/types/grades.ts` is the authoritative source for:

- Display names (with French accents)
- Prerequisite relationships
- School years and levels
- Math intensity levels
- High school tracks

All other functions derive from this definition.

---

## Related Documentation

- **Database**: [database.md](database.md) - Database schema and queries
- **Validation**: [quality-standards.md#input-validation-with-zod](quality-standards.md#input-validation-with-zod) - Zod validation patterns
- **Architecture**: [architecture.md](architecture.md) - System structure and patterns
- **Database Schema**: [../architecture/database-schema.md](../architecture/database-schema.md) - Full schema documentation

---

## Troubleshooting

### Grade Not Recognized

```typescript
const grade = parseGradeCode(userInput);
if (!grade) {
	console.error('Invalid grade format. Input was:', userInput);
	console.log('Valid codes:', GRADE_CODES);
}
```

See `parseGradeCode()` for all supported formats.

### Type Error: Not a GradeCode

```typescript
// Problem
const grade: GradeCode = someString; // ❌ TypeScript error

// Solution 1: Parse first
const parsed = parseGradeCode(someString);
if (parsed) {
	const grade: GradeCode = parsed; // ✅ OK
}

// Solution 2: Use type guard
if (isValidGradeCode(someString)) {
	const grade: GradeCode = someString; // ✅ OK
}

// Solution 3: Validate with Zod
const parsed = await gradeCodeSchema.parseAsync(someString);
```

### Zod Validation Failing

```typescript
import { gradeFlexibleSchema } from '$lib/server/validation/grades';

const result = gradeFlexibleSchema.safeParse('invalid-grade');

if (!result.success) {
	result.error.issues.forEach((issue) => {
		console.log(issue.message); // "Niveau invalide : invalid-grade"
	});
}
```

---

**Last updated**: 2025-11-22
**Status**: Stable (Phase 1 complete)
**Maintainer**: UbuMaths Development Team
