# Academic Period API Usage Examples

This document provides practical examples of using the academic period API endpoints.

## Table of Contents

- [Link Assessments to Periods](#link-assessments-to-periods)
- [Get Period Statistics](#get-period-statistics)
- [Complete Admin Dashboard Example](#complete-admin-dashboard-example)
- [Error Handling](#error-handling)

---

## Link Assessments to Periods

### Basic Usage

```typescript
/**
 * Link existing assessments to academic periods for a school year
 * @param schoolId - School UUID
 * @param yearId - School year UUID
 * @returns Promise with count of linked assessments
 */
async function linkAssessmentsToPeriodsFunction(schoolId: string, yearId: string) {
	const response = await fetch(`/api/schools/${schoolId}/years/${yearId}/link-assessments`, {
		method: 'POST'
	});

	if (!response.ok) {
		const { message } = await response.json();
		throw new Error(message);
	}

	const { count, message, success } = await response.json();
	return { count, message, success };
}
```

### SvelteKit Component Example

```svelte
<script lang="ts">
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Button } from '$lib/components/ui/button';

	let { schoolId, yearId } = $props<{ schoolId: string; yearId: string }>();

	let isLinking = $state(false);
	let linkCount = $state<number | null>(null);

	async function handleLinkAssessments() {
		isLinking = true;
		linkCount = null;

		try {
			const response = await fetch(`/api/schools/${schoolId}/years/${yearId}/link-assessments`, {
				method: 'POST'
			});

			if (response.ok) {
				const { count, message } = await response.json();
				linkCount = count;
				toaster.success(message);
			} else {
				const { message } = await response.json();
				toaster.error(message);
			}
		} catch (err) {
			console.error('Error linking assessments:', err);
			toaster.error('Erreur lors de la liaison des évaluations');
		} finally {
			isLinking = false;
		}
	}
</script>

<div class="space-y-4">
	<h2>Liaison des évaluations aux périodes</h2>

	<Button onclick={handleLinkAssessments} disabled={isLinking}>
		{isLinking ? 'Liaison en cours...' : 'Lier les évaluations'}
	</Button>

	{#if linkCount !== null}
		<p class="text-green-600">✓ {linkCount} évaluation(s) liée(s)</p>
	{/if}
</div>
```

---

## Get Period Statistics

### Basic Usage

```typescript
interface PeriodStats {
	id: string;
	name: string;
	type: 'trimester' | 'semester' | 'quarter' | 'custom';
	start_date: string;
	end_date: string;
	period_order: number;
	assessments_count: number;
}

/**
 * Fetch period statistics for a school year
 * @param schoolId - School UUID
 * @param yearId - School year UUID
 * @returns Promise with array of periods and their stats
 */
async function getPeriodStats(schoolId: string, yearId: string): Promise<PeriodStats[]> {
	const response = await fetch(`/api/schools/${schoolId}/years/${yearId}/stats`);

	if (!response.ok) {
		const { message } = await response.json();
		throw new Error(message);
	}

	const { periods } = await response.json();
	return periods;
}
```

### SvelteKit Component with Stats Display

```svelte
<script lang="ts">
	import { onMount } from 'svelte';

	let { schoolId, yearId } = $props<{ schoolId: string; yearId: string }>();

	interface PeriodStats {
		id: string;
		name: string;
		type: string;
		start_date: string;
		end_date: string;
		period_order: number;
		assessments_count: number;
	}

	let periods = $state<PeriodStats[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function loadStats() {
		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/schools/${schoolId}/years/${yearId}/stats`);

			if (response.ok) {
				const data = await response.json();
				periods = data.periods;
			} else {
				const { message } = await response.json();
				error = message;
			}
		} catch (err) {
			console.error('Error loading stats:', err);
			error = 'Erreur lors du chargement des statistiques';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadStats();
	});
</script>

<div class="space-y-4">
	<h2>Statistiques par période</h2>

	{#if loading}
		<p>Chargement...</p>
	{:else if error}
		<p class="text-red-600">{error}</p>
	{:else if periods.length === 0}
		<p>Aucune période définie</p>
	{:else}
		<div class="grid gap-4">
			{#each periods as period}
				<div class="rounded-lg border p-4">
					<h3 class="font-semibold">{period.name}</h3>
					<p class="text-sm text-gray-600">
						{new Date(period.start_date).toLocaleDateString('fr-FR')} -
						{new Date(period.end_date).toLocaleDateString('fr-FR')}
					</p>
					<p class="mt-2 text-lg font-bold">
						{period.assessments_count}
						{period.assessments_count === 1 ? 'évaluation' : 'évaluations'}
					</p>
				</div>
			{/each}
		</div>
	{/if}
</div>
```

---

## Complete Admin Dashboard Example

Combining both endpoints with visual feedback and automatic refresh:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';

	let { data } = $props();
	const { schoolId, yearId } = data;

	interface PeriodStats {
		id: string;
		name: string;
		type: string;
		start_date: string;
		end_date: string;
		period_order: number;
		assessments_count: number;
	}

	let periods = $state<PeriodStats[]>([]);
	let loading = $state(true);
	let isLinking = $state(false);
	let totalAssessments = $derived(periods.reduce((sum, p) => sum + p.assessments_count, 0));

	async function loadStats() {
		loading = true;

		try {
			const response = await fetch(`/api/schools/${schoolId}/years/${yearId}/stats`);

			if (response.ok) {
				const data = await response.json();
				periods = data.periods;
			} else {
				toaster.error('Erreur lors du chargement des statistiques');
			}
		} catch (err) {
			console.error('Error loading stats:', err);
			toaster.error('Erreur réseau');
		} finally {
			loading = false;
		}
	}

	async function handleLinkAssessments() {
		isLinking = true;

		try {
			const response = await fetch(`/api/schools/${schoolId}/years/${yearId}/link-assessments`, {
				method: 'POST'
			});

			if (response.ok) {
				const { count, message } = await response.json();
				toaster.success(message);

				// Refresh stats to show updated counts
				if (count > 0) {
					await loadStats();
				}
			} else {
				const { message } = await response.json();
				toaster.error(message);
			}
		} catch (err) {
			console.error('Error linking assessments:', err);
			toaster.error('Erreur lors de la liaison des évaluations');
		} finally {
			isLinking = false;
		}
	}

	onMount(() => {
		loadStats();
	});
</script>

<div class="container mx-auto space-y-8 p-6">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Gestion des périodes académiques</h1>
		<Button onclick={handleLinkAssessments} disabled={isLinking || loading}>
			{isLinking ? 'Liaison en cours...' : 'Lier les évaluations'}
		</Button>
	</div>

	{#if loading}
		<div class="text-center">
			<p>Chargement des statistiques...</p>
		</div>
	{:else}
		<div class="grid gap-4">
			<!-- Summary card -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Vue d'ensemble</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<p class="text-sm text-muted-foreground">Nombre de périodes</p>
							<p class="text-2xl font-bold">{periods.length}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Évaluations assignées</p>
							<p class="text-2xl font-bold">{totalAssessments}</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Period cards -->
			{#each periods as period}
				<Card.Root>
					<Card.Header>
						<Card.Title>{period.name}</Card.Title>
						<Card.Description>
							{new Date(period.start_date).toLocaleDateString('fr-FR')} -
							{new Date(period.end_date).toLocaleDateString('fr-FR')}
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center justify-between">
							<span class="text-sm text-muted-foreground">Évaluations</span>
							<span class="text-xl font-bold">{period.assessments_count}</span>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
```

---

## Error Handling

### Comprehensive Error Handling

```typescript
import { toaster } from '$lib/stores/toaster.svelte';

interface ApiError {
	message: string;
	status?: number;
}

async function callApiWithErrorHandling<T>(url: string, options?: RequestInit): Promise<T | null> {
	try {
		const response = await fetch(url, options);

		if (response.ok) {
			return await response.json();
		}

		// Handle specific error status codes
		const { message } = await response.json();

		switch (response.status) {
			case 401:
				toaster.error('Session expirée. Veuillez vous reconnecter.');
				// Optionally redirect to login
				break;
			case 403:
				toaster.error("Accès refusé. Vous n'avez pas les permissions nécessaires.");
				break;
			case 404:
				toaster.error('Ressource non trouvée.');
				break;
			case 500:
				toaster.error('Erreur serveur. Veuillez réessayer plus tard.');
				break;
			default:
				toaster.error(message || 'Une erreur est survenue');
		}

		return null;
	} catch (err) {
		console.error('Network error:', err);
		toaster.error('Erreur réseau. Vérifiez votre connexion.');
		return null;
	}
}

// Usage examples
async function exampleUsage(schoolId: string, yearId: string) {
	// Link assessments with error handling
	const linkResult = await callApiWithErrorHandling<{
		success: boolean;
		count: number;
		message: string;
	}>(`/api/schools/${schoolId}/years/${yearId}/link-assessments`, {
		method: 'POST'
	});

	if (linkResult) {
		console.log(`Linked ${linkResult.count} assessments`);
	}

	// Get stats with error handling
	const statsResult = await callApiWithErrorHandling<{
		periods: PeriodStats[];
	}>(`/api/schools/${schoolId}/years/${yearId}/stats`);

	if (statsResult) {
		console.log(`Found ${statsResult.periods.length} periods`);
	}
}
```

---

## Testing with curl

### Link Assessments

```bash
# Replace with actual values
SCHOOL_ID="your-school-uuid"
YEAR_ID="your-year-uuid"
SESSION_COOKIE="your-session-cookie"

curl -X POST "http://localhost:5175/api/schools/${SCHOOL_ID}/years/${YEAR_ID}/link-assessments" \
  -H "Cookie: ${SESSION_COOKIE}" \
  -v
```

### Get Stats

```bash
curl "http://localhost:5175/api/schools/${SCHOOL_ID}/years/${YEAR_ID}/stats" \
  -H "Cookie: ${SESSION_COOKIE}" \
  -v
```

### Expected Responses

**Link Assessments Success (200)**:

```json
{
	"success": true,
	"count": 45,
	"message": "45 évaluation(s) liée(s) à des périodes"
}
```

**Stats Success (200)**:

```json
{
	"periods": [
		{
			"id": "uuid-here",
			"name": "Trimestre 1",
			"type": "trimester",
			"start_date": "2025-09-01",
			"end_date": "2025-12-20",
			"period_order": 1,
			"assessments_count": 15
		},
		{
			"id": "uuid-here",
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

**Error Response (401/403/404/500)**:

```json
{
	"message": "Accès refusé - Admin uniquement"
}
```

---

## Best Practices

1. **Always handle errors**: Use try-catch blocks and display user-friendly messages
2. **Show loading states**: Disable buttons and show spinners during API calls
3. **Refresh data after mutations**: Call the stats endpoint after linking assessments
4. **Validate permissions client-side**: Hide admin-only actions from non-admin users
5. **Use TypeScript types**: Define interfaces for all API responses
6. **Log errors**: Console.error for debugging, but don't expose to users
7. **Provide feedback**: Use toasts/notifications for success and error states
8. **Debounce repeated calls**: Prevent users from spamming the link button

---

## Related Documentation

- [API Endpoints README](/src/routes/api/schools/[schoolId]/years/[yearId]/README.md)
- [Validation Schemas](/src/lib/server/validation/schools.ts)
- [Database Schema](/docs/architecture/database-schema.md)
- [Academic Periods Migration](/supabase/migrations/20251028120100_create_academic_periods.sql)
