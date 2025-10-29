# Warnings Management API

Server-side helper functions for managing student behavioral warnings.

**File:** `src/lib/server/warnings.ts`
**Status:** ✅ Production
**Last Updated:** 2025-10-29

---

## Table of Contents

1. [Warning Types](#warning-types)
2. [Core Functions](#core-functions)
3. [Helper Functions](#helper-functions)
4. [UI Components](#ui-components)
5. [Security](#security)
6. [Database Schema](#database-schema)
7. [Usage in API Endpoints](#usage-in-api-endpoints)
8. [Type Definitions](#type-definitions)
9. [Best Practices](#best-practices)
10. [Testing Checklist](#testing-checklist)

---

## Warning Types

- **C**: Conduite (Behavior)
- **M**: Manque de Travail (Lack of Work)
- **R**: Retard (Late)
- **T**: Tricherie (Cheating)

---

## Core Functions

### 1. `getCurrentAcademicPeriod({ schoolId, supabase })`

Returns the active academic period for today's date.

**Returns:** `AcademicPeriod | null`

**Example:**

```typescript
const period = await getCurrentAcademicPeriod({
	schoolId: 'school-uuid',
	supabase
});

if (period) {
	console.log('Current period:', period.name); // "Trimestre 2"
}
```

---

### 2. `getClassWarnings({ classId, periodId, teacherId, supabase })`

Fetches aggregated warning counts for all students in a class.

**Returns:** `Map<student_id, StudentWarningCounts>`

**StudentWarningCounts:**

```typescript
{
  C: number,           // Count of Conduite warnings
  M: number,           // Count of Manque de Travail warnings
  R: number,           // Count of Retard warnings
  T: number,           // Count of Tricherie warnings
  total: number,       // Sum of all warnings
  score: number,       // 20 - total (clamped 0-20)
  warnings: Warning[]  // Full warning details
}
```

**Example:**

```typescript
const warnings = await getClassWarnings({
	classId: 'class-uuid',
	periodId: 'period-uuid',
	teacherId: user.id,
	supabase
});

const studentData = warnings.get('student-uuid');
console.log(`Total: ${studentData.total}, Score: ${studentData.score}/20`);
console.log(
	`Breakdown - C:${studentData.C} M:${studentData.M} R:${studentData.R} T:${studentData.T}`
);
```

---

### 3. `addWarning({ studentId, classId, periodId, warningType, teacherId, supabase })`

Adds a new warning for a student.

**Returns:** `StudentWarningCounts` (updated counts for that student)

**Example:**

```typescript
const updated = await addWarning({
	studentId: 'student-uuid',
	classId: 'class-uuid',
	periodId: 'period-uuid',
	warningType: 'C',
	teacherId: user.id,
	supabase
});

console.log('New total:', updated.total, 'New score:', updated.score);
```

---

### 4. `removeWarning({ warningId, teacherId, supabase })`

Removes a warning by ID (teacher must be creator).

**Returns:**

```typescript
{
  studentId: string,
  classId: string,
  periodId: string,
  updatedCounts: StudentWarningCounts
}
```

**Example:**

```typescript
const result = await removeWarning({
	warningId: 'warning-uuid',
	teacherId: user.id,
	supabase
});

console.log('Removed for student:', result.studentId);
console.log('New score:', result.updatedCounts.score);
```

---

## Helper Functions

### `getStudentWarnings({ studentId, classId, periodId, teacherId, supabase })`

Get counts for a single student (convenience wrapper).

**Returns:** `StudentWarningCounts`

---

### `getSchoolYearPeriods({ schoolYearId, supabase })`

Get all periods for a school year.

**Returns:** `AcademicPeriod[]`

---

### `getActiveSchoolYear({ schoolId, supabase })`

Get the currently active school year.

**Returns:** `SchoolYear | null`

---

## Security

All functions enforce:

- **RLS policies** (teacher must own the class)
- **Created_by verification** (only delete your own warnings)
- **Input validation** (warning types, UUIDs)
- **Error handling** (proper HTTP status codes)

---

## Database Schema

**Table:** `student_warnings`

| Column               | Type | Description                  |
| -------------------- | ---- | ---------------------------- |
| `id`                 | UUID | Primary key                  |
| `student_id`         | UUID | Student receiving warning    |
| `class_id`           | UUID | Class where warning occurred |
| `academic_period_id` | UUID | Period (trimester/semester)  |
| `warning_type`       | TEXT | 'C', 'M', 'R', or 'T'        |
| `created_by`         | UUID | Teacher who issued warning   |
| `created_at`         | TSTZ | Creation timestamp           |
| `updated_at`         | TSTZ | Last update timestamp        |

**Indexes:**

- `idx_warnings_student_period` on `(student_id, academic_period_id)`
- `idx_warnings_class_period` on `(class_id, academic_period_id)`
- `idx_warnings_created_by` on `(created_by)`

---

## Migration

**File:** `supabase/migrations/20251029013121_create_student_warnings.sql`

**Status:** ⚠️ Created but not yet pushed to database

**Next Steps:**

1. Run `pnpm db:migrate` to apply migration
2. Regenerate database types: `pnpm supabase gen types typescript --local > src/lib/types/database.ts`
3. Remove type assertions (`as never`) from `warnings.ts`

---

## Usage in API Endpoints

**Example endpoint:**

```typescript
// src/routes/api/warnings/+server.ts
import { getCurrentAcademicPeriod, getClassWarnings, addWarning } from '$lib/server/warnings';
import { json, error } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { studentId, classId, warningType } = await request.json();
	const user = locals.user;

	if (!user) throw error(401);

	// Get current period
	const period = await getCurrentAcademicPeriod({
		schoolId: user.school_id,
		supabase: locals.supabase
	});

	if (!period) throw error(400, 'No active academic period');

	// Add warning
	const updated = await addWarning({
		studentId,
		classId,
		periodId: period.id,
		warningType,
		teacherId: user.id,
		supabase: locals.supabase
	});

	return json({ success: true, counts: updated });
};
```

---

## Type Definitions

```typescript
// Warning types
export type WarningType = 'C' | 'M' | 'R' | 'T';

export interface Warning {
	id: string;
	student_id: string;
	class_id: string;
	academic_period_id: string;
	warning_type: WarningType;
	created_by: string;
	created_at: string;
	updated_at: string;
}

export interface StudentWarningCounts {
	C: number;
	M: number;
	R: number;
	T: number;
	total: number;
	score: number;
	warnings: Warning[];
}

export type ClassWarningsMap = Map<string, StudentWarningCounts>;
```

---

## UI Components

### Warning Display Pattern

**Location:** `src/routes/(protected)/dashboard/teacher/warnings/+page.svelte`

**Visual Structure (Updated 2025-10-29):**

```
[Avatar] Student Name    [C] 3  [M] 1  [R] 2    18/20    [Ajouter ▼]
```

**Key UI Features:**

1. **Badge + Count Format** (2025-10-29):
   - Badge contains ONLY the letter (e.g., `[C]`)
   - Count displayed OUTSIDE badge (e.g., `[C] 3` instead of `[C:3]`)
   - Improves readability and reduces visual clutter

2. **Conditional Rendering**:
   - Badges are completely hidden when count = 0 (not just disabled)
   - "Aucun" fallback text shown when student has no warnings at all
   - Only renders warning types that have count > 0

3. **Visual Spacing**:
   - `gap-3` between warning badges (increased for better visual separation)
   - Tabular numbers (`tabular-nums`) for consistent alignment

4. **Interactive Behavior**:
   - Click badge to remove most recent warning of that type
   - Hover effect: scale-110 transition for visual feedback
   - Confirmation modal before deletion

5. **Color Coding**:
   - `T` (Tricherie): Red destructive variant
   - `C/M/R`: Gray secondary variant
   - Score colors: Green (≥15), Orange (10-14), Red (<10)

**Optimistic UI Pattern:**

```typescript
// 1. Apply instant UI update
optimisticWarnings[studentId] = newCounts;

// 2. Debounce server sync (500ms)
setTimeout(async () => {
  await fetch('/api/warnings', { method: 'POST', ... });
  delete optimisticWarnings[studentId]; // Clear after success
}, 500);
```

**Implementation Notes:**

- Uses Shadcn-svelte Badge component
- Leverages Svelte 5 runes (`$state`, `$derived`, `$effect`)
- Real-time reactivity with optimistic updates
- Debounced server sync prevents excessive API calls

---

## Best Practices

1. **Always fetch current period first** before adding warnings
2. **Use getClassWarnings() once** per page load, cache the Map
3. **Optimistic UI updates** for add/remove operations
4. **Display warnings array** for audit trail (who issued, when)
5. **Show score** prominently (20 - total warnings)
6. **Validate warning type** on client before sending
7. **Hide zero-count badges** (not disable) for cleaner UI
8. **Use "Aucun" fallback** when student has no warnings

---

## Notes

- **Score calculation:** `score = max(0, min(20, 20 - total_warnings))`
- **RLS enforcement:** Teachers can only see/modify warnings for their classes
- **Deletion rules:** Teachers can only delete warnings they created
- **Period isolation:** Warnings are scoped to academic periods (trimester/semester)
- **Type safety:** All functions use strict TypeScript types
- **Error handling:** All errors include descriptive messages and proper HTTP codes

---

## Testing Checklist

- [ ] Migration applied: `pnpm db:migrate`
- [ ] Types regenerated: Database types updated
- [ ] Unit tests: Test each function with valid/invalid inputs
- [ ] RLS tests: Verify teacher can't see other teachers' classes
- [ ] Edge cases: Test with 0 warnings, >20 warnings, invalid types
- [ ] Performance: Test with large class (100+ students, 500+ warnings)
