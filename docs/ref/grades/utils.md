# Grade Utility Functions

> Utility functions for parsing, formatting, and manipulating grades.

**Source**: `src/lib/utils/grades.ts`

---

## Import

```typescript
import {
	parseGradeCode,
	formatGradeForDisplay,
	formatGradeShort,
	getAccessibleGrades,
	getReachableGrades,
	hasAccessToGrade,
	isValidGradeCode,
	getGradesByLevel,
	getNextGrade,
	getPreviousGrade,
	compareGrades,
	getGradeRange,
	getGradeSelectItems,
	getGradeSelectItemsByLevel,
	getGradesGroupedByLevel
} from '$lib/utils/grades';
```

---

## Parsing Functions

### parseGradeCode()

Convert flexible user input to canonical GradeCode:

```typescript
function parseGradeCode(input: string): GradeCode | null;
```

**Supported formats:**

| Input Type       | Examples                            | Output               |
| ---------------- | ----------------------------------- | -------------------- |
| Canonical        | `'6'`, `'CM2'`, `'1_SPE'`           | As-is                |
| French names     | `'sixieme'`, `'cinquieme'`          | `'6'`, `'5'`         |
| With suffix      | `'6eme'`, `'6eme'`, `'6e'`          | `'6'`                |
| Ordinal          | `'premiere spe'`, `'terminale gen'` | `'1_SPE'`, `'T_GEN'` |
| Case insensitive | `'CM2'`, `'cm2'`, `'Cm2'`           | `'CM2'`              |

**Examples:**

```typescript
parseGradeCode('sixieme'); // '6'
parseGradeCode('6eme'); // '6'
parseGradeCode('6e'); // '6'
parseGradeCode('6'); // '6'
parseGradeCode('premiere spe'); // '1_SPE'
parseGradeCode('terminale generale'); // 'T_GEN'
parseGradeCode('invalid'); // null
```

**Use case:** User input normalization, search, flexible API inputs.

---

### isValidGradeCode()

Type guard for exact canonical codes:

```typescript
function isValidGradeCode(code: string): code is GradeCode;
```

**Examples:**

```typescript
isValidGradeCode('6'); // true
isValidGradeCode('1_SPE'); // true
isValidGradeCode('6eme'); // false (not canonical)
isValidGradeCode('invalid'); // false
```

**Note:** Stricter than `parseGradeCode()` - only accepts canonical form.

---

## Formatting Functions

### formatGradeForDisplay()

Format grade with proper French accents:

```typescript
function formatGradeForDisplay(grade: GradeCode): string;
```

**Examples:**

```typescript
formatGradeForDisplay('6'); // '6eme'
formatGradeForDisplay('1_SPE'); // '1ere Specialite Maths'
formatGradeForDisplay('T_GEN'); // 'Terminale generale'
formatGradeForDisplay('CP'); // 'CP'
```

---

### formatGradeShort()

Get abbreviated display name:

```typescript
function formatGradeShort(grade: GradeCode): string;
```

**Examples:**

```typescript
formatGradeShort('6'); // '6e'
formatGradeShort('1_SPE'); // '1ere Spe'
formatGradeShort('T_GEN'); // 'Term G'
formatGradeShort('CM2'); // 'CM2'
```

**Use case:** Badges, compact displays, mobile UI.

---

## Access Control Functions

### getAccessibleGrades()

Get all grades a student can access (current + all prerequisites):

```typescript
function getAccessibleGrades(grade: GradeCode): GradeCode[];
```

Uses BFS traversal of prerequisite graph. Results are cached for performance.

**Examples:**

```typescript
getAccessibleGrades('6');
// ['6', 'CM2', 'CM1', 'CE2', 'CE1', 'CP']

getAccessibleGrades('CP');
// ['CP']

getAccessibleGrades('1_SPE');
// ['1_SPE', '2', '3', '4', '5', '6', 'CM2', 'CM1', 'CE2', 'CE1', 'CP']
```

---

### getReachableGrades()

Get all grades reachable from current (forward progression):

```typescript
function getReachableGrades(grade: GradeCode): GradeCode[];
```

**Examples:**

```typescript
getReachableGrades('CM2');
// ['CM2', '6', '5', '4', '3', '2', '1_GEN', '1_SPE', '1_STMG', 'T_GEN', ...]

getReachableGrades('T_SPE');
// ['T_SPE', 'T_EXP'] (can progress to Maths Expert)
```

---

### hasAccessToGrade()

Check if user grade can access content grade:

```typescript
function hasAccessToGrade(userGrade: GradeCode, contentGrade: GradeCode): boolean;
```

**Examples:**

```typescript
// Student in 6eme
hasAccessToGrade('6', 'CM2'); // true (prerequisite)
hasAccessToGrade('6', '6'); // true (same grade)
hasAccessToGrade('6', '5'); // false (future grade)

// Cross-track access
hasAccessToGrade('T_SPE', 'T_GEN'); // false (different track)
hasAccessToGrade('T_SPE', '1_SPE'); // true (prerequisite)
```

---

## Navigation Functions

### getNextGrade()

Get the next grade in progression:

```typescript
function getNextGrade(grade: GradeCode): GradeCode | null;
```

**Examples:**

```typescript
getNextGrade('CM2'); // '6'
getNextGrade('3'); // '2'
getNextGrade('2'); // null (branching point - 3 options)
getNextGrade('1_SPE'); // 'T_SPE'
getNextGrade('T_EXP'); // null (final grade)
```

**Note:** Returns `null` at branching points (2nde) and final grades.

---

### getPreviousGrade()

Get the prerequisite grade:

```typescript
function getPreviousGrade(grade: GradeCode): GradeCode | null;
```

**Examples:**

```typescript
getPreviousGrade('6'); // 'CM2'
getPreviousGrade('1_SPE'); // '2'
getPreviousGrade('CP'); // null (no prerequisite)
```

---

### getGradeRange()

Get all grades between two grades (inclusive):

```typescript
function getGradeRange(from: GradeCode, to: GradeCode): GradeCode[];
```

**Examples:**

```typescript
getGradeRange('CM2', '4');
// ['CM2', '6', '5', '4']

getGradeRange('6', '6');
// ['6']
```

---

## Filtering Functions

### getGradesByLevel()

Filter grades by school level:

```typescript
function getGradesByLevel(level: SchoolLevel): GradeCode[];
```

**Examples:**

```typescript
getGradesByLevel('primary');
// ['CP', 'CE1', 'CE2', 'CM1', 'CM2']

getGradesByLevel('middle');
// ['6', '5', '4', '3']

getGradesByLevel('high');
// ['2', '1_GEN', '1_SPE', '1_STMG', 'T_GEN', 'T_SPE', 'T_EXP', 'T_COMP', 'T_STMG']
```

---

### getGradesGroupedByLevel()

Get all grades organized by school level:

```typescript
function getGradesGroupedByLevel(): {
	primary: GradeCode[];
	middle: GradeCode[];
	high: GradeCode[];
};
```

**Example:**

```typescript
const grouped = getGradesGroupedByLevel();
// {
//   primary: ['CP', 'CE1', 'CE2', 'CM1', 'CM2'],
//   middle: ['6', '5', '4', '3'],
//   high: ['2', '1_GEN', '1_SPE', '1_STMG', 'T_GEN', ...]
// }
```

---

## UI Helper Functions

### getGradeSelectItems()

Get all grades as select options:

```typescript
function getGradeSelectItems(): { value: GradeCode; label: string }[];
```

**Returns:**

```typescript
[
	{ value: 'CP', label: 'CP' },
	{ value: 'CE1', label: 'CE1' },
	{ value: '6', label: '6eme' }
	// ... all 18 grades
];
```

---

### getGradeSelectItemsByLevel()

Get select options filtered by level:

```typescript
function getGradeSelectItemsByLevel(level: SchoolLevel): { value: GradeCode; label: string }[];
```

---

### getGradeSelectItemsByTrack()

Get select options for high school track:

```typescript
function getGradeSelectItemsByTrack(track: HighSchoolTrack): { value: GradeCode; label: string }[];
```

**Examples:**

```typescript
getGradeSelectItemsByTrack('spe_maths');
// [
//   { value: '1_SPE', label: '1ere Specialite Maths' },
//   { value: 'T_SPE', label: 'Terminale Specialite Maths' },
//   { value: 'T_EXP', label: 'Terminale Maths Expert' }
// ]
```

---

## Sorting Functions

### compareGrades()

Compare two grades by school year (for sorting):

```typescript
function compareGrades(a: GradeCode, b: GradeCode): number;
```

**Examples:**

```typescript
['6', 'CM2', '5'].sort(compareGrades);
// ['CM2', '6', '5']

// Sort by ascending year
grades.sort(compareGrades);

// Sort by descending year
grades.sort((a, b) => compareGrades(b, a));
```

---

### getMinGradeOrder()

Get topological order position of lowest grade in array:

```typescript
function getMinGradeOrder(grades: GradeCode[]): number;
```

**Use case:** Determine minimum difficulty level for content.

---

## Caching

### clearGradeCache()

Clear internal caches (for testing):

```typescript
function clearGradeCache(): void;
```

**Internal caches:**

- `getAccessibleGrades()` results
- `getReachableGrades()` results

Caches use `Map<GradeCode, GradeCode[]>` for O(1) lookup after first computation.

---

## Performance Notes

| Function                | Time Complexity              | Cached |
| ----------------------- | ---------------------------- | ------ |
| `parseGradeCode`        | O(1)                         | No     |
| `formatGradeForDisplay` | O(1)                         | No     |
| `getAccessibleGrades`   | O(n) first, O(1) cached      | Yes    |
| `getReachableGrades`    | O(n) first, O(1) cached      | Yes    |
| `hasAccessToGrade`      | O(n) via getAccessibleGrades | Cached |
| `compareGrades`         | O(1)                         | No     |

**n** = number of grades in prerequisite chain (max ~12)

---

## Common Patterns

### Filter Content by User Grade

```typescript
function getAvailableExercises(userGrade: GradeCode, exercises: Exercise[]) {
	const accessible = getAccessibleGrades(userGrade);
	return exercises.filter((ex) => ex.grades.some((g) => accessible.includes(g)));
}
```

### Grade Selector with Grouped Options

```svelte
<script>
	import { getGradesGroupedByLevel, formatGradeShort } from '$lib/utils/grades';

	const grouped = getGradesGroupedByLevel();
</script>

<optgroup label="College">
	{#each grouped.middle as grade}
		<option value={grade}>{formatGradeShort(grade)}</option>
	{/each}
</optgroup>
```

### Validate Grade Progression

```typescript
function isValidProgression(from: GradeCode, to: GradeCode): boolean {
	const next = getNextGrade(from);
	return next === to;
}
```
