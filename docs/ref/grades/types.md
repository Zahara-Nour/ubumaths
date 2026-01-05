# Grade Types Reference

> Type definitions, constants, and metadata for the Grade System.

**Source**: `src/lib/types/grades.ts`

---

## Core Types

### GradeCode

Union type of all 18 valid grade codes:

```typescript
export type GradeCode =
	| 'CP'
	| 'CE1'
	| 'CE2'
	| 'CM1'
	| 'CM2' // Primary (5)
	| '6'
	| '5'
	| '4'
	| '3' // Middle (4)
	| '2' // Seconde (1)
	| '1_GEN'
	| '1_SPE'
	| '1_STMG' // Premiere (3)
	| 'T_GEN'
	| 'T_SPE'
	| 'T_EXP'
	| 'T_COMP'
	| 'T_STMG'; // Terminale (5)
```

**Usage:**

```typescript
import type { GradeCode } from '$lib/types/grades';

function setGrade(grade: GradeCode) {
	// TypeScript ensures only valid grades are passed
}

setGrade('6'); // OK
setGrade('invalid'); // Compile error
```

### SchoolLevel

```typescript
export type SchoolLevel = 'primary' | 'middle' | 'high';
```

### HighSchoolTrack

```typescript
export type HighSchoolTrack = 'general' | 'spe_maths' | 'stmg';
```

### MathsIntensity

```typescript
export type MathsIntensity = 'basic' | 'standard' | 'advanced' | 'expert';
```

### GradeInfo

Complete metadata for a grade:

```typescript
export interface GradeInfo {
	code: GradeCode;
	displayName: string; // Full French name: "6eme"
	shortName: string; // Abbreviated: "6e"
	level: SchoolLevel; // 'primary' | 'middle' | 'high'
	schoolYear: number; // 1-12
	track?: HighSchoolTrack; // Only for high school
	mathsIntensity: MathsIntensity;
	prerequisites: GradeCode[]; // Direct prerequisite grades
}
```

---

## Constants

### GRADE_CODES

Immutable array of all 18 canonical grade codes:

```typescript
export const GRADE_CODES = [
	'CP',
	'CE1',
	'CE2',
	'CM1',
	'CM2',
	'6',
	'5',
	'4',
	'3',
	'2',
	'1_GEN',
	'1_SPE',
	'1_STMG',
	'T_GEN',
	'T_SPE',
	'T_EXP',
	'T_COMP',
	'T_STMG'
] as const;
```

**Usage:**

```typescript
import { GRADE_CODES } from '$lib/types/grades';

// Iterate over all grades
for (const code of GRADE_CODES) {
	console.log(code);
}

// Check if value is valid grade
if (GRADE_CODES.includes(value as GradeCode)) {
	// ...
}
```

### GRADES

Record mapping each grade code to its metadata:

```typescript
export const GRADES: Record<GradeCode, GradeInfo> = {
	CP: {
		code: 'CP',
		displayName: 'CP',
		shortName: 'CP',
		level: 'primary',
		schoolYear: 1,
		mathsIntensity: 'basic',
		prerequisites: [] // Entry point - no prerequisites
	},
	'6': {
		code: '6',
		displayName: '6eme',
		shortName: '6e',
		level: 'middle',
		schoolYear: 6,
		mathsIntensity: 'standard',
		prerequisites: ['CM2']
	},
	'1_SPE': {
		code: '1_SPE',
		displayName: '1ere Specialite Maths',
		shortName: '1ere Spe',
		level: 'high',
		schoolYear: 11,
		track: 'spe_maths',
		mathsIntensity: 'advanced',
		prerequisites: ['2']
	}
	// ... all 18 grades
};
```

**Usage:**

```typescript
import { GRADES } from '$lib/types/grades';

const sixieme = GRADES['6'];
console.log(sixieme.displayName); // "6eme"
console.log(sixieme.prerequisites); // ['CM2']
```

### Grade Level Groups

```typescript
// Primary school grades (CP-CM2)
export const PRIMARY_GRADES: GradeCode[] = ['CP', 'CE1', 'CE2', 'CM1', 'CM2'];

// Middle school grades (6e-3e)
export const MIDDLE_GRADES: GradeCode[] = ['6', '5', '4', '3'];

// High school grades (2nde-Terminale)
export const HIGH_GRADES: GradeCode[] = [
	'2',
	'1_GEN',
	'1_SPE',
	'1_STMG',
	'T_GEN',
	'T_SPE',
	'T_EXP',
	'T_COMP',
	'T_STMG'
];
```

### GRADE_OPTIONS

Pre-formatted options for UI select components:

```typescript
export const GRADE_OPTIONS: { value: GradeCode; label: string }[] = [
	{ value: 'CP', label: 'CP' },
	{ value: 'CE1', label: 'CE1' }
	// ... all grades with labels
];
```

**Usage in Svelte:**

```svelte
<script>
	import { GRADE_OPTIONS } from '$lib/types/grades';
</script>

<MySelect items={GRADE_OPTIONS} bind:value={selectedGrade} />
```

---

## Helper Functions

### isGradeCode()

Type guard to check if a string is a valid GradeCode:

```typescript
export function isGradeCode(value: string): value is GradeCode {
	return GRADE_CODES.includes(value as GradeCode);
}
```

**Usage:**

```typescript
const input = 'CM2';
if (isGradeCode(input)) {
	// input is now typed as GradeCode
	const info = GRADES[input]; // TypeScript allows this
}
```

### hasHighSchoolTrack()

Check if a grade has a track property:

```typescript
export function hasHighSchoolTrack(
	grade: GradeCode
): grade is Extract<
	GradeCode,
	'1_GEN' | '1_SPE' | '1_STMG' | 'T_GEN' | 'T_SPE' | 'T_EXP' | 'T_COMP' | 'T_STMG'
> {
	return GRADES[grade].track !== undefined;
}
```

### getCycleForGrade()

Get the French pedagogical cycle for a grade:

```typescript
export function getCycleForGrade(grade: GradeCode | null | undefined): string | null {
	if (!grade) return null;

	const cycles: Record<string, GradeCode[]> = {
		'Cycle 2': ['CP', 'CE1', 'CE2'],
		'Cycle 3': ['CM1', 'CM2', '6'],
		'Cycle 4': ['5', '4', '3'],
		Seconde: ['2'],
		'Cycle Terminal': ['1_GEN', '1_SPE', '1_STMG', 'T_GEN', 'T_SPE', 'T_EXP', 'T_COMP', 'T_STMG']
	};

	for (const [cycle, grades] of Object.entries(cycles)) {
		if (grades.includes(grade)) return cycle;
	}
	return null;
}
```

---

## Prerequisite Structure

The `prerequisites` field defines the educational progression:

```
CP (no prerequisites - entry point)
 └─► CE1 ─► CE2 ─► CM1 ─► CM2
                              └─► 6 ─► 5 ─► 4 ─► 3
                                                  └─► 2
                                                      ├─► 1_GEN ─► T_GEN
                                                      │           └─► T_COMP (maths complementaires)
                                                      ├─► 1_SPE ─► T_SPE
                                                      │           └─► T_EXP (maths expert)
                                                      └─► 1_STMG ─► T_STMG
```

**Key Points:**

- Each grade has at most one direct prerequisite
- CP is the only grade with no prerequisites
- 2nde is the branching point (3 tracks diverge)
- T_EXP requires 1_SPE (not just 2nde)
- T_COMP requires 1_GEN (not 1_SPE)

---

## School Year Mapping

| Year | Grade(s)                            | Cycle          |
| ---- | ----------------------------------- | -------------- |
| 1    | CP                                  | Cycle 2        |
| 2    | CE1                                 | Cycle 2        |
| 3    | CE2                                 | Cycle 2        |
| 4    | CM1                                 | Cycle 3        |
| 5    | CM2                                 | Cycle 3        |
| 6    | 6eme                                | Cycle 3        |
| 7    | 5eme                                | Cycle 4        |
| 8    | 4eme                                | Cycle 4        |
| 9    | 3eme                                | Cycle 4        |
| 10   | 2nde                                | Seconde        |
| 11   | 1_GEN, 1_SPE, 1_STMG                | Cycle Terminal |
| 12   | T_GEN, T_SPE, T_EXP, T_COMP, T_STMG | Cycle Terminal |

---

## Maths Intensity Levels

| Level      | Description            | Grades                        |
| ---------- | ---------------------- | ----------------------------- |
| `basic`    | Minimal math content   | CP-CE2, 1_STMG, T_STMG        |
| `standard` | Standard curriculum    | CM1-CM2, 6-3, 2, 1_GEN, T_GEN |
| `advanced` | Math specialization    | 1_SPE, T_SPE, T_COMP          |
| `expert`   | Maximum math intensity | T_EXP                         |

---

## Type Exports Summary

```typescript
// Types
export type { GradeCode, GradeInfo, SchoolLevel, HighSchoolTrack, MathsIntensity };

// Constants
export { GRADE_CODES, GRADES, GRADE_OPTIONS };
export { PRIMARY_GRADES, MIDDLE_GRADES, HIGH_GRADES };

// Helper functions
export { isGradeCode, hasHighSchoolTrack, getCycleForGrade };
```
