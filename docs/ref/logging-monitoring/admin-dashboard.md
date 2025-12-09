# Admin Dashboard

> Error management UI, filtering, bulk operations, and resolution workflow.

---

## Overview

The admin error dashboard provides a complete error management interface:

**Location**: `/dashboard/admin/errors`

**Files**:

- `src/routes/(protected)/dashboard/admin/errors/+page.server.ts`
- `src/routes/(protected)/dashboard/admin/errors/+page.svelte`

---

## Access Control

### Required Role

Only users with `admin` role can access:

```typescript
// +page.server.ts
export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await requireAuth(locals);
	await requireRole(locals, 'admin');

	const stats = await getErrorStats(locals.supabase);
	const errors = await getErrorLogs(locals.supabase, { limit: 50 });

	return { stats, errors };
};
```

### RLS Policies

```sql
-- Only admins can view error_logs
CREATE POLICY "admin_view_errors" ON error_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

---

## Dashboard Features

### Statistics Panel

```svelte
<div class="stats-panel">
	<StatCard title="Critiques" value={stats.critical} variant="danger" />
	<StatCard title="Non resolus" value={stats.unresolved} variant="warning" />
	<StatCard title="Derniere heure" value={stats.lastHour} variant="info" />
	<StatCard title="Type frequent" value={stats.mostCommonType} variant="neutral" />
</div>
```

### Filtering

| Filter       | Options                                      |
| ------------ | -------------------------------------------- |
| **Type**     | All, client_js, server_api, server_load, etc |
| **Severity** | All, info, warning, error, critical          |
| **Status**   | All, Resolved, Unresolved                    |
| **Search**   | Free text in message/URL                     |

```svelte
<script lang="ts">
	let typeFilter = $state('all');
	let severityFilter = $state('all');
	let resolvedFilter = $state('all');
	let searchQuery = $state('');

	let filteredErrors = $derived(
		errors.filter((e) => {
			if (typeFilter !== 'all' && e.error_type !== typeFilter) return false;
			if (severityFilter !== 'all' && e.severity !== severityFilter) return false;
			if (resolvedFilter === 'resolved' && !e.resolved) return false;
			if (resolvedFilter === 'unresolved' && e.resolved) return false;
			if (searchQuery && !matchesSearch(e, searchQuery)) return false;
			return true;
		})
	);
</script>

<div class="filters">
	<MySelect type="single" bind:value={typeFilter} items={errorTypeOptions} placeholder="Type" />
	<MySelect
		type="single"
		bind:value={severityFilter}
		items={severityOptions}
		placeholder="Severite"
	/>
	<MySelect
		type="single"
		bind:value={resolvedFilter}
		items={resolvedOptions}
		placeholder="Statut"
	/>
	<input type="text" bind:value={searchQuery} placeholder="Rechercher..." />
</div>
```

### Error List

```svelte
<table class="error-table">
	<thead>
		<tr>
			<th><MyCheckbox bind:checked={selectAll} /></th>
			<th>Date</th>
			<th>Type</th>
			<th>Severite</th>
			<th>Message</th>
			<th>URL</th>
			<th>Actions</th>
		</tr>
	</thead>
	<tbody>
		{#each filteredErrors as error}
			<tr class:resolved={error.resolved}>
				<td><MyCheckbox bind:checked={selectedIds[error.id]} /></td>
				<td>{formatDate(error.created_at)}</td>
				<td><Badge variant={errorTypeBadge(error.error_type)}>{error.error_type}</Badge></td>
				<td><SeverityBadge severity={error.severity} /></td>
				<td class="message">{truncate(error.message, 100)}</td>
				<td class="url">{error.url || '-'}</td>
				<td>
					<Button size="sm" onclick={() => viewError(error.id)}>Voir</Button>
					{#if !error.resolved}
						<Button size="sm" variant="outline" onclick={() => resolveError(error.id)}>
							Resoudre
						</Button>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>
```

### Error Detail Modal

```svelte
<Dialog bind:open={detailOpen}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Erreur #{selectedError?.id.slice(0, 8)}</DialogTitle>
		</DialogHeader>

		<div class="error-detail">
			<section>
				<h4>Classification</h4>
				<dl>
					<dt>Type</dt>
					<dd>{selectedError?.error_type}</dd>
					<dt>Severite</dt>
					<dd>{selectedError?.severity}</dd>
					<dt>Date</dt>
					<dd>{formatDateTime(selectedError?.created_at)}</dd>
				</dl>
			</section>

			<section>
				<h4>Message</h4>
				<pre class="message">{selectedError?.message}</pre>
			</section>

			{#if selectedError?.stack_trace}
				<section>
					<h4>Stack Trace</h4>
					<pre class="stack-trace">{selectedError.stack_trace}</pre>
				</section>
			{/if}

			<section>
				<h4>Contexte</h4>
				<dl>
					<dt>URL</dt>
					<dd>{selectedError?.url || 'N/A'}</dd>
					<dt>Methode</dt>
					<dd>{selectedError?.request_method || 'N/A'}</dd>
					<dt>User Agent</dt>
					<dd>{selectedError?.user_agent || 'N/A'}</dd>
					<dt>Navigateur</dt>
					<dd>{selectedError?.browser_name} {selectedError?.browser_version}</dd>
					<dt>OS</dt>
					<dd>{selectedError?.os_name}</dd>
					<dt>Appareil</dt>
					<dd>{selectedError?.device_type}</dd>
				</dl>
			</section>

			{#if selectedError?.metadata}
				<section>
					<h4>Metadata</h4>
					<pre>{JSON.stringify(selectedError.metadata, null, 2)}</pre>
				</section>
			{/if}
		</div>
	</DialogContent>
</Dialog>
```

---

## Bulk Operations

### Select Multiple

```typescript
let selectedIds = $state<Record<string, boolean>>({});
let selectAll = $state(false);

$effect(() => {
	if (selectAll) {
		filteredErrors.forEach((e) => (selectedIds[e.id] = true));
	} else {
		selectedIds = {};
	}
});

const selectedCount = $derived(Object.values(selectedIds).filter(Boolean).length);
```

### Bulk Resolve

```typescript
async function bulkResolve() {
	const ids = Object.entries(selectedIds)
		.filter(([_, selected]) => selected)
		.map(([id]) => id);

	if (ids.length === 0) return;

	const response = await fetch('/api/errors/bulk-resolve', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			error_ids: ids,
			resolution_notes: bulkNotes
		})
	});

	if (response.ok) {
		toaster.success(`${ids.length} erreurs resolues`);
		await invalidateAll();
		selectedIds = {};
	}
}
```

```svelte
{#if selectedCount > 0}
	<div class="bulk-actions">
		<span>{selectedCount} selectionnes</span>
		<Button onclick={bulkResolve}>
			Resoudre ({selectedCount})
		</Button>
	</div>
{/if}
```

---

## Resolution Workflow

### Single Error Resolution

```typescript
async function resolveError(errorId: string) {
	const notes = await promptForNotes();
	if (notes === null) return; // Cancelled

	const response = await fetch(`/api/errors/${errorId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			resolved: true,
			resolution_notes: notes
		})
	});

	if (response.ok) {
		toaster.success('Erreur resolue');
		await invalidateAll();
	}
}
```

### Resolution Notes

```svelte
<Dialog bind:open={resolveDialogOpen}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Resoudre l'erreur</DialogTitle>
		</DialogHeader>

		<div class="resolve-form">
			<label for="notes">Notes de resolution</label>
			<textarea
				id="notes"
				bind:value={resolutionNotes}
				placeholder="Decrivez la resolution (commit, PR, etc.)"
				rows={4}
			/>
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={() => (resolveDialogOpen = false)}>Annuler</Button>
			<Button onclick={confirmResolve}>Resoudre</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
```

---

## Cleanup Operations

### Delete Resolved Errors

```svelte
<Button variant="destructive" onclick={deleteResolved} disabled={stats.resolved === 0}>
	Supprimer resolues ({stats.resolved})
</Button>
```

```typescript
async function deleteResolved() {
	const confirmed = await confirmDialog(
		'Supprimer toutes les erreurs resolues ?',
		'Cette action est irreversible.'
	);

	if (!confirmed) return;

	const response = await fetch('/api/errors/delete-resolved', {
		method: 'POST'
	});

	if (response.ok) {
		const { deleted } = await response.json();
		toaster.success(`${deleted} erreurs supprimees`);
		await invalidateAll();
	}
}
```

### Cleanup Old Errors

```svelte
<div class="cleanup-section">
	<label>Nettoyer erreurs resolues de plus de</label>
	<input type="number" bind:value={cleanupDays} min={7} max={365} />
	<span>jours</span>
	<Button onclick={cleanupOld}>Nettoyer</Button>
</div>
```

```typescript
async function cleanupOld() {
	const response = await fetch('/api/errors/cleanup', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ days_old: cleanupDays })
	});

	if (response.ok) {
		const { deleted_count } = await response.json();
		toaster.success(`${deleted_count} erreurs supprimees`);
		await invalidateAll();
	}
}
```

---

## API Endpoints

### List Errors

```
GET /api/errors?type=server_api&severity=error&resolved=false&limit=50&offset=0
```

Response:

```json
{
  "data": [...],
  "pagination": {
    "total": 142,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### Get Single Error

```
GET /api/errors/:id
```

### Resolve Error

```
PUT /api/errors/:id
Content-Type: application/json

{
  "resolved": true,
  "resolution_notes": "Fixed in commit abc123"
}
```

### Bulk Resolve

```
POST /api/errors/bulk-resolve
Content-Type: application/json

{
  "error_ids": ["uuid1", "uuid2"],
  "resolution_notes": "Batch cleanup"
}
```

### Delete Resolved

```
POST /api/errors/delete-resolved
```

Response:

```json
{
	"deleted": 42
}
```

### Cleanup Old

```
POST /api/errors/cleanup
Content-Type: application/json

{
  "days_old": 90
}
```

Response:

```json
{
	"deleted_count": 156,
	"job_run_id": "uuid"
}
```

---

## Severity Badges

```svelte
<script lang="ts">
	type Severity = 'info' | 'warning' | 'error' | 'critical';

	const severityStyles: Record<Severity, string> = {
		info: 'bg-blue-100 text-blue-800',
		warning: 'bg-yellow-100 text-yellow-800',
		error: 'bg-red-100 text-red-800',
		critical: 'bg-purple-100 text-purple-800'
	};

	let { severity }: { severity: Severity } = $props();
</script>

<span class="badge {severityStyles[severity]}">
	{severity}
</span>
```

---

## Error Type Icons

| Type            | Icon          | Color  |
| --------------- | ------------- | ------ |
| `client_js`     | `Globe`       | Blue   |
| `server_api`    | `Server`      | Green  |
| `server_load`   | `FileCode`    | Purple |
| `server_action` | `Play`        | Orange |
| `validation`    | `AlertCircle` | Yellow |
| `performance`   | `Clock`       | Gray   |
| `database`      | `Database`    | Red    |

---

## Keyboard Shortcuts

| Shortcut  | Action                 |
| --------- | ---------------------- |
| `j` / `k` | Navigate up/down       |
| `Enter`   | View selected error    |
| `r`       | Resolve selected error |
| `a`       | Select all             |
| `/`       | Focus search           |
| `Escape`  | Close modal / clear    |

---

## Related

- [Error Monitoring](./error-monitoring.md) - Error capture system
- [Health Monitoring](./health-monitoring.md) - Statistics source
- [Configuration](./configuration.md) - Dashboard settings
