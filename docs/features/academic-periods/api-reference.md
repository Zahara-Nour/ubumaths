# Academic Periods API Reference

> 🆕 2025-10-28

Complete API reference for programmatically managing academic years, teaching periods, and school holidays.

---

## Table of Contents

- [Overview](#overview)
- [Form Actions](#form-actions)
- [API Endpoints](#api-endpoints)
- [Validation Schemas](#validation-schemas)
- [Error Handling](#error-handling)
- [Usage Examples](#usage-examples)

---

## Overview

The Academic Periods feature provides two interfaces for programmatic access:

1. **Form Actions** - SvelteKit form actions for server-side form submissions
2. **API Endpoints** - (Future) REST API endpoints for external integrations

All endpoints require **admin role** authentication. Teachers have read-only access via database queries.

**Base Route**: `/dashboard/admin/schools/[schoolId]/organisation`

---

## Form Actions

### School Year Actions

#### createYear

Creates a new school year.

**Action**: `?/createYear`
**Method**: POST
**Auth**: Admin only

**Form Data**:

```typescript
{
	school_id: string; // UUID - School identifier
	name: string; // Format: "YYYY-YYYY" (e.g., "2024-2025")
	start_date: string; // ISO date: "YYYY-MM-DD"
	end_date: string; // ISO date: "YYYY-MM-DD"
	is_active: boolean; // Optional, default: false
}
```

**Validation**:

- `name`: Must match `/^\d{4}-\d{4}$/` with consecutive years
- `start_date` < `end_date`
- `school_id`: Valid UUID
- Only one active year per school (enforced by database constraint)

**Success Response**:

```typescript
{
  success: true,
  message: "Année scolaire créée avec succès"
}
```

**Error Response**:

```typescript
{
  error: string,               // Error message
  errors?: {                   // Field-specific errors
    name?: string[],
    start_date?: string[],
    end_date?: string[]
  }
}
```

**Example (Svelte)**:

```svelte
<form method="POST" action="?/createYear" use:enhance>
	<input type="hidden" name="school_id" value={schoolId} />
	<input type="text" name="name" pattern="\d{4}-\d{4}" required placeholder="2024-2025" />
	<input type="date" name="start_date" required />
	<input type="date" name="end_date" required />
	<input type="checkbox" name="is_active" value="true" />
	<button type="submit">Créer</button>
</form>
```

---

#### updateYear

Updates an existing school year.

**Action**: `?/updateYear`
**Method**: POST
**Auth**: Admin only

**Form Data**:

```typescript
{
  id: string;             // UUID - Year ID to update
  name?: string;          // Optional - New name
  start_date?: string;    // Optional - New start date
  end_date?: string;      // Optional - New end date
  is_active?: boolean;    // Optional - New active status
}
```

**Validation**: Same as `createYear` (all fields optional except `id`)

**Success Response**:

```typescript
{
  success: true,
  message: "Année scolaire mise à jour avec succès"
}
```

**Example (Svelte)**:

```svelte
<form method="POST" action="?/updateYear" use:enhance>
	<input type="hidden" name="id" value={yearId} />
	<input type="text" name="name" value={year.name} />
	<input type="date" name="start_date" value={year.start_date} />
	<input type="date" name="end_date" value={year.end_date} />
	<input type="checkbox" name="is_active" value="true" checked={year.is_active} />
	<button type="submit">Enregistrer</button>
</form>
```

---

#### deleteYear

Deletes a school year and all associated periods/holidays.

**Action**: `?/deleteYear`
**Method**: POST
**Auth**: Admin only

**Form Data**:

```typescript
{
	id: string; // UUID - Year ID to delete
}
```

**⚠️ Warning**: This action:

- Deletes the school year
- Cascades to delete all academic periods
- Cascades to delete all school holidays
- Sets `academic_period_id` to NULL on linked assessments

**Success Response**:

```typescript
{
  success: true,
  message: "Année scolaire supprimée avec succès"
}
```

**Example (Svelte)**:

```svelte
<form method="POST" action="?/deleteYear" use:enhance>
	<input type="hidden" name="id" value={yearId} />
	<button
		type="submit"
		onclick={(e) => {
			if (!confirm("Supprimer l'année et toutes ses données ?")) {
				e.preventDefault();
			}
		}}
	>
		Supprimer
	</button>
</form>
```

---

#### setActiveYear

Sets a specific year as active (deactivates all others).

**Action**: `?/setActiveYear`
**Method**: POST
**Auth**: Admin only

**Form Data**:

```typescript
{
	id: string; // UUID - Year ID to activate
	school_id: string; // UUID - School identifier
}
```

**Process**:

1. Deactivates all years for the school (`is_active = false`)
2. Activates the specified year (`is_active = true`)

**Success Response**:

```typescript
{
  success: true,
  message: "Année scolaire active définie avec succès"
}
```

**Example (Svelte)**:

```typescript
async function handleSetActiveYear(yearId: string) {
	const formData = new FormData();
	formData.append('id', yearId);

	const response = await fetch('?/setActiveYear', {
		method: 'POST',
		body: formData,
		headers: { 'x-sveltekit-action': 'true' }
	});

	if (response.ok) {
		await invalidateAll();
		toaster.success('Année active définie');
	}
}
```

---

### Academic Period Actions

#### createPeriod

Creates a new academic period within a school year.

**Action**: `?/createPeriod`
**Method**: POST
**Auth**: Admin only

**Form Data**:

```typescript
{
  school_year_id: string;  // UUID - Parent year
  type: string;            // 'trimester' | 'semester' | 'quarter' | 'custom'
  name: string;            // Period name (max 100 chars)
  start_date: string;      // ISO date: "YYYY-MM-DD"
  end_date: string;        // ISO date: "YYYY-MM-DD"
  period_order: number;    // 1-10 (must be unique per year)
  color?: string;          // Hex color (default: "#3b82f6")
}
```

**Validation**:

- `type`: Must be one of ['trimester', 'semester', 'quarter', 'custom']
- `period_order`: Integer 1-10, unique within school year
- `color`: Hex format `#RRGGBB`
- `start_date` < `end_date`

**Success Response**:

```typescript
{
  success: true,
  message: "Période académique créée avec succès"
}
```

**Error Codes**:

- `400`: Validation error (invalid type, order conflict, date range)
- `403`: Not an admin
- `500`: Database error

**Example (Svelte)**:

```svelte
<form method="POST" action="?/createPeriod" use:enhance>
	<input type="hidden" name="school_year_id" value={selectedYearId} />

	<select name="type" required>
		<option value="trimester">Trimestre</option>
		<option value="semester">Semestre</option>
		<option value="quarter">Quadrimestre</option>
		<option value="custom">Personnalisé</option>
	</select>

	<input type="text" name="name" required placeholder="Trimestre 1" />
	<input type="date" name="start_date" required />
	<input type="date" name="end_date" required />
	<input type="number" name="period_order" min="1" max="10" required />
	<input type="color" name="color" value="#3b82f6" />

	<button type="submit">Créer</button>
</form>
```

---

#### updatePeriod

Updates an existing academic period.

**Action**: `?/updatePeriod`
**Method**: POST
**Auth**: Admin only

**Form Data**:

```typescript
{
  id: string;              // UUID - Period ID to update
  type?: string;           // Optional - New type
  name?: string;           // Optional - New name
  start_date?: string;     // Optional - New start date
  end_date?: string;       // Optional - New end date
  period_order?: number;   // Optional - New order
  color?: string;          // Optional - New color
}
```

**Validation**: Same as `createPeriod` (all fields optional except `id`)

**Success Response**:

```typescript
{
  success: true,
  message: "Période académique mise à jour avec succès"
}
```

**Example (Svelte)**:

```svelte
<form method="POST" action="?/updatePeriod" use:enhance>
	<input type="hidden" name="id" value={period.id} />
	<input type="text" name="name" value={period.name} />
	<input type="number" name="period_order" value={period.period_order} />
	<button type="submit">Enregistrer</button>
</form>
```

---

#### deletePeriod

Deletes an academic period.

**Action**: `?/deletePeriod`
**Method**: POST
**Auth**: Admin only

**Form Data**:

```typescript
{
	id: string; // UUID - Period ID to delete
}
```

**⚠️ Warning**: Sets `academic_period_id` to NULL on linked assessments.

**Success Response**:

```typescript
{
  success: true,
  message: "Période académique supprimée avec succès"
}
```

**Example (Svelte)**:

```svelte
<form method="POST" action="?/deletePeriod" use:enhance>
	<input type="hidden" name="id" value={periodId} />
	<button
		type="submit"
		onclick={(e) => {
			if (!confirm('Supprimer cette période ?')) e.preventDefault();
		}}
	>
		Supprimer
	</button>
</form>
```

---

### School Holiday Actions

#### createHoliday

Creates a new school holiday period.

**Action**: `?/createHoliday`
**Method**: POST
**Auth**: Admin only

**Form Data**:

```typescript
{
	school_year_id: string; // UUID - Parent year
	name: string; // Holiday name (max 100 chars)
	start_date: string; // ISO date: "YYYY-MM-DD"
	end_date: string; // ISO date: "YYYY-MM-DD"
}
```

**Validation**:

- `name`: Non-empty string, max 100 characters
- `start_date` < `end_date`

**Success Response**:

```typescript
{
  success: true,
  message: "Vacances scolaires créées avec succès"
}
```

**Example (Svelte)**:

```svelte
<form method="POST" action="?/createHoliday" use:enhance>
	<input type="hidden" name="school_year_id" value={selectedYearId} />
	<input type="text" name="name" required placeholder="Vacances de Noël" />
	<input type="date" name="start_date" required />
	<input type="date" name="end_date" required />
	<button type="submit">Créer</button>
</form>
```

---

#### updateHoliday

Updates an existing school holiday.

**Action**: `?/updateHoliday`
**Method**: POST
**Auth**: Admin only

**Form Data**:

```typescript
{
  id: string;          // UUID - Holiday ID to update
  name?: string;       // Optional - New name
  start_date?: string; // Optional - New start date
  end_date?: string;   // Optional - New end date
}
```

**Success Response**:

```typescript
{
  success: true,
  message: "Vacances scolaires mises à jour avec succès"
}
```

---

#### deleteHoliday

Deletes a school holiday.

**Action**: `?/deleteHoliday`
**Method**: POST
**Auth**: Admin only

**Form Data**:

```typescript
{
	id: string; // UUID - Holiday ID to delete
}
```

**Success Response**:

```typescript
{
  success: true,
  message: "Vacances scolaires supprimées avec succès"
}
```

---

### Year Duplication Action

#### duplicateYear

Duplicates an existing school year with periods and holidays.

**Action**: `?/duplicateYear`
**Method**: POST
**Auth**: Admin only

**Form Data**:

```typescript
{
	source_year_id: string; // UUID - Year to duplicate
	target_year_name: string; // Format: "YYYY-YYYY"
	include_periods: boolean; // Default: true
	include_holidays: boolean; // Default: true
	date_offset_days: number; // Default: 365 (+1 year)
}
```

**Process**:

1. Fetches source year
2. Creates new year with offset dates
3. If `include_periods`: Copies periods with offset dates
4. If `include_holidays`: Copies holidays with offset dates
5. New year is created as non-active

**Success Response**:

```typescript
{
  success: true,
  message: "Année scolaire dupliquée avec succès"
}
```

**Example (Svelte)**:

```svelte
<form method="POST" action="?/duplicateYear" use:enhance>
	<input type="hidden" name="source_year_id" value={activeYear.id} />

	<input
		type="text"
		name="target_year_name"
		pattern="\d{4}-\d{4}"
		required
		placeholder="2025-2026"
	/>

	<input type="number" name="date_offset_days" value="365" required />
	<span class="hint">365 = +1 an, -365 = -1 an</span>

	<label>
		<input type="checkbox" name="include_periods" value="true" checked />
		Périodes d'enseignement
	</label>

	<label>
		<input type="checkbox" name="include_holidays" value="true" checked />
		Vacances scolaires
	</label>

	<button type="submit">Dupliquer</button>
</form>
```

---

## API Endpoints

### (Future) Link Assessments to Periods

**Endpoint**: `POST /api/schools/{schoolId}/years/{yearId}/link-assessments`
**Status**: Not implemented (planned)
**Auth**: Admin only

**Purpose**: Manually trigger assessment linking for a specific year (backfill).

**Request Body**:

```typescript
{
	school_year_id: string; // UUID - Year to process
}
```

**Response**:

```typescript
{
  success: true,
  updated_count: number  // Number of assessments linked
}
```

**Example (JavaScript)**:

```javascript
const response = await fetch(`/api/schools/${schoolId}/years/${yearId}/link-assessments`, {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	},
	body: JSON.stringify({
		school_year_id: yearId
	})
});

const result = await response.json();
console.log(`Linked ${result.updated_count} assessments`);
```

---

### (Future) Get Period Statistics

**Endpoint**: `GET /api/schools/{schoolId}/years/{yearId}/stats`
**Status**: Not implemented (planned)
**Auth**: Admin/Teacher

**Purpose**: Retrieve statistics for academic periods (assessment counts, student counts, etc.)

**Query Parameters**:

- `include_details`: boolean (default: false)

**Response**:

```typescript
{
  year_id: string,
  year_name: string,
  periods: Array<{
    id: string,
    name: string,
    type: string,
    start_date: string,
    end_date: string,
    assessment_count: number,
    student_count?: number,  // If include_details=true
    avg_score?: number       // If include_details=true
  }>
}
```

---

## Validation Schemas

All form actions use Zod schemas for runtime validation. Schemas are located in:

**File**: `src/lib/server/validation/academic.ts`

### Available Schemas

```typescript
import {
	// School Year Schemas
	createSchoolYearSchema,
	updateSchoolYearSchema,
	deleteSchoolYearSchema,
	setActiveYearSchema,

	// Academic Period Schemas
	createAcademicPeriodSchema,
	updateAcademicPeriodSchema,
	deleteAcademicPeriodSchema,

	// School Holiday Schemas
	createSchoolHolidaySchema,
	updateSchoolHolidaySchema,
	deleteSchoolHolidaySchema,

	// Utility Schemas
	duplicateSchoolYearSchema,
	getPeriodsSchema,
	linkAssessmentsSchema
} from '$lib/server/validation/academic';
```

### Type Inference

TypeScript types are inferred from Zod schemas:

```typescript
import type {
	CreateSchoolYearData,
	UpdateSchoolYearData,
	CreateAcademicPeriodData
} from '$lib/server/validation/academic';

// Type-safe form data
const yearData: CreateSchoolYearData = {
	school_id: 'uuid-here',
	name: '2024-2025',
	start_date: '2024-09-01',
	end_date: '2025-06-30',
	is_active: false
};
```

### Validation Example

```typescript
import { createSchoolYearSchema } from '$lib/server/validation/academic';
import { fail } from '@sveltejs/kit';

export const actions = {
	createYear: async ({ request }) => {
		const formData = await request.formData();
		const validation = createSchoolYearSchema.safeParse({
			school_id: formData.get('school_id'),
			name: formData.get('name'),
			start_date: formData.get('start_date'),
			end_date: formData.get('end_date'),
			is_active: formData.get('is_active') === 'true'
		});

		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				errors: validation.error.flatten().fieldErrors
			});
		}

		const data = validation.data; // Type-safe CreateSchoolYearData
		// ... insert into database
	}
};
```

---

## Error Handling

### Error Response Format

All form actions return a consistent error format:

```typescript
{
  error: string,        // Human-readable error message (French)
  errors?: {            // Optional field-specific errors
    [field: string]: string[]
  }
}
```

### Common Error Codes

| Status | Cause                | Solution                                  |
| ------ | -------------------- | ----------------------------------------- |
| 400    | Validation error     | Check form data against schema            |
| 401    | Not authenticated    | Ensure user is logged in                  |
| 403    | Not an admin         | Verify user has admin role                |
| 404    | Resource not found   | Check IDs are valid                       |
| 409    | Constraint violation | Resolve conflicts (e.g., duplicate order) |
| 500    | Database error       | Check logs, verify database state         |

### Constraint Violations

**Unique Period Order**:

```
ERROR: duplicate key value violates unique constraint "unique_period_order"
```

→ Change `period_order` to an unused value (1-10)

**One Active Year**:

```
ERROR: duplicate key value violates unique constraint "one_active_per_school"
```

→ Deactivate other years first, or set `is_active=false`

**Date Range Check**:

```
ERROR: new row violates check constraint "valid_period_dates"
```

→ Ensure `end_date > start_date`

---

## Usage Examples

### Example 1: Creating a Complete School Year

```typescript
// Step 1: Create school year
const yearFormData = new FormData();
yearFormData.append('school_id', schoolId);
yearFormData.append('name', '2024-2025');
yearFormData.append('start_date', '2024-09-02');
yearFormData.append('end_date', '2025-07-04');
yearFormData.append('is_active', 'true');

await fetch('?/createYear', {
	method: 'POST',
	body: yearFormData,
	headers: { 'x-sveltekit-action': 'true' }
});

// Step 2: Create 3 trimesters
const periods = [
	{ name: 'Trimestre 1', start: '2024-09-02', end: '2024-12-20', order: 1, color: '#3b82f6' },
	{ name: 'Trimestre 2', start: '2025-01-06', end: '2025-04-04', order: 2, color: '#10b981' },
	{ name: 'Trimestre 3', start: '2025-04-22', end: '2025-07-04', order: 3, color: '#8b5cf6' }
];

for (const period of periods) {
	const periodFormData = new FormData();
	periodFormData.append('school_year_id', newYearId);
	periodFormData.append('type', 'trimester');
	periodFormData.append('name', period.name);
	periodFormData.append('start_date', period.start);
	periodFormData.append('end_date', period.end);
	periodFormData.append('period_order', period.order.toString());
	periodFormData.append('color', period.color);

	await fetch('?/createPeriod', {
		method: 'POST',
		body: periodFormData,
		headers: { 'x-sveltekit-action': 'true' }
	});
}

// Step 3: Create holidays
const holidays = [
	{ name: 'Vacances de Noël', start: '2024-12-21', end: '2025-01-05' },
	{ name: "Vacances d'hiver", start: '2025-02-15', end: '2025-02-23' },
	{ name: 'Vacances de printemps', start: '2025-04-05', end: '2025-04-20' }
];

for (const holiday of holidays) {
	const holidayFormData = new FormData();
	holidayFormData.append('school_year_id', newYearId);
	holidayFormData.append('name', holiday.name);
	holidayFormData.append('start_date', holiday.start);
	holidayFormData.append('end_date', holiday.end);

	await fetch('?/createHoliday', {
		method: 'POST',
		body: holidayFormData,
		headers: { 'x-sveltekit-action': 'true' }
	});
}

console.log('Complete school year created!');
```

---

### Example 2: Programmatic Year Duplication

```typescript
async function duplicateYearProgrammatically(sourceYearId: string) {
	const formData = new FormData();
	formData.append('source_year_id', sourceYearId);
	formData.append('target_year_name', '2025-2026');
	formData.append('include_periods', 'true');
	formData.append('include_holidays', 'true');
	formData.append('date_offset_days', '365');

	const response = await fetch('?/duplicateYear', {
		method: 'POST',
		body: formData,
		headers: { 'x-sveltekit-action': 'true' }
	});

	if (response.ok) {
		const result = await response.json();
		console.log(result.message);
		// Refresh data
		await invalidateAll();
	} else {
		const error = await response.json();
		console.error(error.error);
	}
}
```

---

### Example 3: Batch Update Period Colors

```typescript
async function updatePeriodColors(periods: Array<{ id: string; color: string }>) {
	for (const period of periods) {
		const formData = new FormData();
		formData.append('id', period.id);
		formData.append('color', period.color);

		await fetch('?/updatePeriod', {
			method: 'POST',
			body: formData,
			headers: { 'x-sveltekit-action': 'true' }
		});
	}

	console.log(`Updated colors for ${periods.length} periods`);
	await invalidateAll();
}

// Usage
updatePeriodColors([
	{ id: 'period-1-uuid', color: '#ef4444' }, // Red
	{ id: 'period-2-uuid', color: '#f59e0b' }, // Orange
	{ id: 'period-3-uuid', color: '#22c55e' } // Green
]);
```

---

### Example 4: Error Handling with Toast Notifications

```typescript
import { toaster } from '$lib/stores/toaster.svelte';
import { enhance } from '$app/forms';

<form
  method="POST"
  action="?/createPeriod"
  use:enhance={({ formData }) => {
    return async ({ result, update }) => {
      if (result.type === 'success') {
        toaster.success(result.data.message);
        await update();
      } else if (result.type === 'failure') {
        toaster.error(result.data.error);

        // Display field-specific errors
        if (result.data.errors) {
          Object.entries(result.data.errors).forEach(([field, messages]) => {
            messages.forEach(msg => toaster.error(`${field}: ${msg}`));
          });
        }
      }
    };
  }}
>
  <!-- Form fields -->
</form>
```

---

## Related Documentation

- **[User Guide](./user-guide.md)** - Admin workflows and UI instructions
- **[Database Schema](./database.md)** - Table structures and relationships
- **[Validation Library](../../../src/lib/server/validation/academic.ts)** - Zod schemas source code
- **[Feature Overview](./README.md)** - High-level feature description

---

Last Updated: 2025-10-28
