# Academic Period API Endpoints

API endpoints for managing academic periods and linking assessments to periods.

## Endpoints

### POST `/api/schools/{schoolId}/years/{yearId}/link-assessments`

Manually link existing assessments to academic periods based on their creation date.

**Authentication**: Admin only

**Parameters**:

- `schoolId` (UUID): School identifier
- `yearId` (UUID): School year identifier

**Response**:

```json
{
	"success": true,
	"count": 45,
	"message": "45 évaluation(s) liée(s) à des périodes"
}
```

**Errors**:

- `401` - Unauthorized (not logged in)
- `403` - Forbidden (not admin or wrong school)
- `404` - School year not found
- `500` - Database error

**Example**:

```typescript
async function linkAssessments(schoolId: string, yearId: string) {
	const response = await fetch(`/api/schools/${schoolId}/years/${yearId}/link-assessments`, {
		method: 'POST'
	});

	if (response.ok) {
		const { count, message } = await response.json();
		console.log(message); // "45 évaluation(s) liée(s) à des périodes"
	}
}
```

---

### GET `/api/schools/{schoolId}/years/{yearId}/stats`

Get statistics about academic periods and their assessment counts.

**Authentication**: Teacher or Admin

**Parameters**:

- `schoolId` (UUID): School identifier
- `yearId` (UUID): School year identifier

**Response**:

```json
{
	"periods": [
		{
			"id": "uuid",
			"name": "Trimestre 1",
			"type": "trimester",
			"start_date": "2025-09-01",
			"end_date": "2025-12-20",
			"period_order": 1,
			"assessments_count": 15
		},
		{
			"id": "uuid",
			"name": "Trimestre 2",
			"type": "trimester",
			"start_date": "2026-01-05",
			"end_date": "2026-03-31",
			"period_order": 2,
			"assessments_count": 12
		}
	]
}
```

**Errors**:

- `401` - Unauthorized (not logged in)
- `403` - Forbidden (not teacher/admin or wrong school)
- `404` - School year not found
- `500` - Database error

**Example**:

```typescript
async function getPeriodStats(schoolId: string, yearId: string) {
	const response = await fetch(`/api/schools/${schoolId}/years/${yearId}/stats`);

	if (response.ok) {
		const { periods } = await response.json();
		periods.forEach((period) => {
			console.log(`${period.name}: ${period.assessments_count} assessments`);
		});
	}
}
```

## Security

Both endpoints implement multiple security layers:

1. **Session validation**: User must be authenticated
2. **Role checking**: Appropriate role required (admin for link-assessments, teacher/admin for stats)
3. **School ownership**: User's school must match the requested school
4. **School year validation**: Year must exist and belong to the school
5. **RLS policies**: Database-level security via Row Level Security

## Database Function

The `link-assessments` endpoint calls the SQL function:

```sql
link_existing_assessments_to_periods(p_school_year_id UUID) RETURNS INTEGER
```

This function:

- Finds all assessments in the given school year
- Matches them to periods based on `created_at` date falling within period date ranges
- Only updates assessments that don't already have a period assigned
- Returns the count of assessments updated

## Usage in Frontend

### SvelteKit Page Example

```svelte
<script lang="ts">
	import { toaster } from '$lib/stores/toaster.svelte';

	let { data } = $props();
	let isLinking = $state(false);

	async function handleLinkAssessments() {
		isLinking = true;
		try {
			const response = await fetch(
				`/api/schools/${data.schoolId}/years/${data.yearId}/link-assessments`,
				{ method: 'POST' }
			);

			if (response.ok) {
				const { count, message } = await response.json();
				toaster.success(message);

				// Refresh stats
				await loadStats();
			} else {
				const { message } = await response.json();
				toaster.error(message);
			}
		} finally {
			isLinking = false;
		}
	}

	async function loadStats() {
		const response = await fetch(`/api/schools/${data.schoolId}/years/${data.yearId}/stats`);

		if (response.ok) {
			const { periods } = await response.json();
			// Update UI with period stats
		}
	}
</script>

<button onclick={handleLinkAssessments} disabled={isLinking}>
	{isLinking ? 'Liaison en cours...' : 'Lier les évaluations'}
</button>
```

## Testing

Test the endpoints manually with curl:

```bash
# Link assessments (requires admin session cookie)
curl -X POST http://localhost:5175/api/schools/{schoolId}/years/{yearId}/link-assessments \
  -H "Cookie: session=..." \
  -v

# Get stats (requires teacher/admin session cookie)
curl http://localhost:5175/api/schools/{schoolId}/years/{yearId}/stats \
  -H "Cookie: session=..." \
  -v
```

Replace `{schoolId}` and `{yearId}` with actual UUIDs from your database.
