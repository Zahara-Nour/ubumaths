# Grade Validation Schemas

> Zod validation schemas for grade-related API inputs.

**Source**: `src/lib/server/validation/grades.ts`

---

## Import

```typescript
import {
	gradeCodeSchema,
	gradeFlexibleSchema,
	gradeArraySchema,
	gradeArrayFlexibleSchema,
	gradeCommaSeparatedSchema,
	gradeFilterSchema,
	gradeWithAllSchema,
	gradeRangeSchema,
	gradeUpdateSchema
} from '$lib/server/validation/grades';
```

---

## Core Schemas

### gradeCodeSchema

**Strict validation** - Only accepts canonical grade codes.

```typescript
export const gradeCodeSchema = z.enum(GRADE_CODES);
```

**Accepts:** `'CP'`, `'6'`, `'1_SPE'`, etc.
**Rejects:** `'6eme'`, `'sixieme'`, `'grade6'`

**Usage:**

```typescript
gradeCodeSchema.parse('6'); // OK: '6'
gradeCodeSchema.parse('6eme'); // Error: Invalid enum value
```

**Use when:** Data should already be in canonical form (e.g., from database).

---

### gradeFlexibleSchema

**Flexible validation** - Accepts variations and normalizes to canonical form.

```typescript
export const gradeFlexibleSchema = z.string().transform((val, ctx) => {
	const parsed = parseGradeCode(val);
	if (!parsed) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `Niveau invalide : ${val}`
		});
		return z.NEVER;
	}
	return parsed;
});
```

**Accepts:**

- Canonical: `'6'`, `'CM2'`, `'1_SPE'`
- French names: `'sixieme'`, `'6eme'`, `'6eme'`
- Variations: `'6e'`, `'premiere spe'`, `'terminale generale'`

**Output:** Always returns canonical `GradeCode`

**Usage:**

```typescript
gradeFlexibleSchema.parse('sixieme'); // OK: '6'
gradeFlexibleSchema.parse('6eme'); // OK: '6'
gradeFlexibleSchema.parse('6'); // OK: '6'
gradeFlexibleSchema.parse('invalid'); // Error: Niveau invalide : invalid
```

**Use when:** Accepting user input that might have variations.

---

## Array Schemas

### gradeArraySchema

Strict array of canonical grade codes with constraints:

```typescript
export const gradeArraySchema = z
	.array(gradeCodeSchema)
	.min(1, 'Au moins un niveau requis')
	.max(18, 'Maximum 18 niveaux')
	.refine((arr) => new Set(arr).size === arr.length, {
		message: 'Les niveaux ne peuvent pas contenir de doublons'
	});
```

**Constraints:**

- Minimum 1 grade
- Maximum 18 grades (all possible grades)
- No duplicates allowed

**Usage:**

```typescript
gradeArraySchema.parse(['6', '5', '4']); // OK
gradeArraySchema.parse([]); // Error: Au moins un niveau requis
gradeArraySchema.parse(['6', '6']); // Error: Doublons
```

---

### gradeArrayFlexibleSchema

Flexible array that accepts variations:

```typescript
export const gradeArrayFlexibleSchema = z
	.array(gradeFlexibleSchema)
	.min(1, 'Au moins un niveau requis')
	.max(18, 'Maximum 18 niveaux')
	.refine((arr) => new Set(arr).size === arr.length, {
		message: 'Les niveaux ne peuvent pas contenir de doublons'
	});
```

**Usage:**

```typescript
gradeArrayFlexibleSchema.parse(['6eme', 'cinquieme', '4']);
// OK: ['6', '5', '4']
```

---

### gradeCommaSeparatedSchema

Parse comma-separated string to grade array (for query parameters):

```typescript
export const gradeCommaSeparatedSchema = z
	.string()
	.transform((val) =>
		val
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean)
	)
	.pipe(gradeArrayFlexibleSchema);
```

**Input:** `"6,5,4"` or `"6eme, cinquieme, 4"`
**Output:** `['6', '5', '4']`

**Usage in API endpoint:**

```typescript
// Query params validation
const querySchema = z.object({
	grades: gradeCommaSeparatedSchema.optional()
});

// URL: /api/exercises?grades=6,5,4
const result = querySchema.parse({ grades: '6,5,4' });
// { grades: ['6', '5', '4'] }
```

---

## Filter Schemas

### gradeWithAllSchema

Grade code or literal `'all'`:

```typescript
export const gradeWithAllSchema = z.union([gradeCodeSchema, z.literal('all')]);
```

**Usage:**

```typescript
gradeWithAllSchema.parse('6'); // OK: '6'
gradeWithAllSchema.parse('all'); // OK: 'all'
```

---

### gradeFilterSchema

Flexible filter for API queries:

```typescript
export const gradeFilterSchema = z.union([
	z.literal('all'), // All grades
	gradeFlexibleSchema.transform((val) => [val]), // Single grade -> array
	gradeArrayFlexibleSchema // Array of grades
]);
```

**Accepts:**

- `'all'` - No filtering
- Single grade: `'6'` -> `['6']`
- Array: `['6', '5']`

---

### gradeRangeSchema

Grade range (from/to):

```typescript
export const gradeRangeSchema = z.object({
	from: gradeCodeSchema,
	to: gradeCodeSchema
});
```

**Usage:**

```typescript
gradeRangeSchema.parse({ from: 'CM2', to: '3' });
// Get all grades from CM2 to 3eme
```

---

## Update Schemas

### gradeUpdateSchema

For PATCH operations on grade arrays:

```typescript
export const gradeUpdateSchema = z
	.object({
		grades: gradeArrayFlexibleSchema.optional(), // Replace all
		addGrades: gradeArrayFlexibleSchema.optional(), // Add to existing
		removeGrades: gradeArrayFlexibleSchema.optional() // Remove from existing
	})
	.refine(
		(data) =>
			data.grades !== undefined || data.addGrades !== undefined || data.removeGrades !== undefined,
		{ message: 'Au moins une operation sur les niveaux doit etre specifiee' }
	)
	.refine(
		(data) =>
			!(
				data.grades !== undefined &&
				(data.addGrades !== undefined || data.removeGrades !== undefined)
			),
		{ message: 'Impossible d\'utiliser "grades" avec "addGrades" ou "removeGrades"' }
	);
```

**Valid operations:**

```typescript
// Replace all grades
{ grades: ['6', '5'] }

// Add grades to existing
{ addGrades: ['4', '3'] }

// Remove grades from existing
{ removeGrades: ['6'] }

// Add and remove simultaneously
{ addGrades: ['4'], removeGrades: ['6'] }
```

**Invalid:**

```typescript
// Empty - no operation
{ }  // Error

// grades with addGrades - conflicting
{ grades: ['6'], addGrades: ['5'] }  // Error
```

---

## Metadata Schemas

### gradeWithMetadataSchema

Complete grade with all metadata (for API responses):

```typescript
export const gradeWithMetadataSchema = z.object({
	code: gradeCodeSchema,
	displayName: z.string(),
	shortName: z.string(),
	level: z.enum(['primary', 'middle', 'high']),
	schoolYear: z.number().int().min(1).max(12),
	track: z.enum(['general', 'spe_maths', 'stmg']).optional(),
	mathsIntensity: z.enum(['basic', 'standard', 'advanced', 'expert']),
	prerequisites: z.array(gradeCodeSchema)
});
```

---

### gradeAccessSchema

Validate user can access content grade:

```typescript
export const gradeAccessSchema = z
	.object({
		userGrade: gradeFlexibleSchema,
		contentGrade: gradeFlexibleSchema
	})
	.refine((data) => hasAccessToGrade(data.userGrade, data.contentGrade), {
		message: "L'utilisateur n'a pas acces a ce niveau"
	});
```

**Usage:**

```typescript
// Valid: 6eme can access CM2 content
gradeAccessSchema.parse({ userGrade: '6', contentGrade: 'CM2' }); // OK

// Invalid: 6eme cannot access 5eme content
gradeAccessSchema.parse({ userGrade: '6', contentGrade: '5' });
// Error: L'utilisateur n'a pas acces a ce niveau
```

---

## Auxiliary Schemas

### schoolLevelSchema

```typescript
export const schoolLevelSchema = z.enum(['primary', 'middle', 'high']);
```

### highSchoolTrackSchema

```typescript
export const highSchoolTrackSchema = z.enum(['general', 'spe_maths', 'stmg']);
```

### mathsIntensitySchema

```typescript
export const mathsIntensitySchema = z.enum(['basic', 'standard', 'advanced', 'expert']);
```

### gradeSelectionSchema

For UI form data:

```typescript
export const gradeSelectionSchema = z.object({
	value: gradeCodeSchema,
	label: z.string()
});
```

---

## Batch Validation

### batchGradeValidationSchema

Validate multiple grades and get detailed results:

```typescript
export const batchGradeValidationSchema = z.array(z.string()).transform((vals) => {
	const results: {
		input: string;
		valid: boolean;
		parsed: GradeCode | null;
		error?: string;
	}[] = [];

	for (const val of vals) {
		const parsed = parseGradeCode(val);
		results.push({
			input: val,
			valid: parsed !== null,
			parsed,
			error: parsed ? undefined : `Format de niveau invalide : ${val}`
		});
	}

	return results;
});
```

**Usage:**

```typescript
const result = batchGradeValidationSchema.parse(['6', 'invalid', '5eme']);
// [
//   { input: '6', valid: true, parsed: '6' },
//   { input: 'invalid', valid: false, parsed: null, error: '...' },
//   { input: '5eme', valid: true, parsed: '5' }
// ]
```

---

## Type Inference

All schemas export input types:

```typescript
export type GradeCodeInput = z.input<typeof gradeCodeSchema>;
export type GradeFlexibleInput = z.input<typeof gradeFlexibleSchema>;
export type GradeArrayInput = z.input<typeof gradeArraySchema>;
export type GradeFilterInput = z.input<typeof gradeFilterSchema>;
export type GradeRangeInput = z.input<typeof gradeRangeSchema>;
export type GradeUpdateInput = z.input<typeof gradeUpdateSchema>;
```

---

## Best Practices

### 1. Validate at API Boundaries

```typescript
// In +server.ts
const body = await request.json();
const validation = gradeArrayFlexibleSchema.safeParse(body.grades);
if (!validation.success) {
	throw error(400, validation.error.issues[0].message);
}
// validation.data is now GradeCode[]
```

### 2. Use Flexible Schemas for User Input

```typescript
// Form submission - accept variations
const formSchema = z.object({
	grades: gradeArrayFlexibleSchema
});
```

### 3. Use Strict Schemas for Internal Data

```typescript
// Database query results - should already be canonical
const dbSchema = z.object({
	grades: z.array(gradeCodeSchema)
});
```

### 4. Combine with Transform for Query Params

```typescript
const querySchema = z.object({
	grades: z
		.string()
		.optional()
		.transform((val) => {
			if (!val) return undefined;
			const grades = val
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			return grades.length ? grades : undefined;
		})
		.pipe(z.array(gradeFlexibleSchema).optional())
});
```
