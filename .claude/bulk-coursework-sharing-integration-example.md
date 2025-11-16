# Integration Example: Bulk Coursework Sharing

## How to Use ShareMultipleCourseworkDialog in a Page

### Example 1: Teacher Google Dashboard

```svelte
<!-- src/routes/(protected)/dashboard/teacher/google/+page.svelte -->

<script lang="ts">
	import ShareMultipleCourseworkDialog from '$lib/components/google/ShareMultipleCourseworkDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';

	// State
	let coursework = $state<CourseworkItem[]>([]);
	let selectedCourseworkIds = new SvelteSet<string>();
	let showBulkShareDialog = $state(false);

	// Computed
	let selectedCoursework = $derived(
		coursework.filter((c) => selectedCourseworkIds.has(c.id))
	);

	let hasBulkSelection = $derived(selectedCourseworkIds.size > 1);

	// Functions
	function toggleCourseworkSelection(id: string) {
		if (selectedCourseworkIds.has(id)) {
			selectedCourseworkIds.delete(id);
		} else {
			selectedCourseworkIds.add(id);
		}
	}

	function openBulkShareDialog() {
		if (!hasBulkSelection) return;
		showBulkShareDialog = true;
	}

	function handleBulkShareSuccess() {
		// Refresh coursework list
		loadCoursework();
		// Clear selection
		selectedCourseworkIds.clear();
	}

	async function loadCoursework() {
		// Fetch coursework from API
		const response = await fetch('/api/google/coursework');
		const data = await response.json();
		coursework = data.coursework || [];
	}

	// Initialize
	loadCoursework();
</script>

<!-- Bulk Actions Toolbar -->
{#if hasBulkSelection}
	<div class="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-background p-4">
		<span class="text-sm text-muted-foreground">
			{selectedCourseworkIds.size} travail{selectedCourseworkIds.size > 1 ? 'aux' : ''} sélectionné{selectedCourseworkIds.size >
			1
				? 's'
				: ''}
		</span>
		<div class="flex gap-2">
			<Button variant="outline" onclick={() => selectedCourseworkIds.clear()}>
				Annuler la sélection
			</Button>
			<Button onclick={openBulkShareDialog}>
				Partager {selectedCourseworkIds.size} travail{selectedCourseworkIds.size > 1
					? 'aux'
					: ''}
			</Button>
		</div>
	</div>
{/if}

<!-- Coursework Table -->
<table>
	<thead>
		<tr>
			<th>Sélection</th>
			<th>Titre</th>
			<th>Cours</th>
			<th>Type</th>
			<th>Échéance</th>
			<th>Actions</th>
		</tr>
	</thead>
	<tbody>
		{#each coursework as item (item.id)}
			<tr>
				<td>
					<MyCheckbox
						checked={selectedCourseworkIds.has(item.id)}
						onCheckedChange={() => toggleCourseworkSelection(item.id)}
						label=""
					/>
				</td>
				<td>{item.title}</td>
				<td>{item.courseName}</td>
				<td>{item.workType}</td>
				<td>{item.dueDate || '-'}</td>
				<td>
					<Button variant="ghost" size="sm" onclick={() => openSingleShareDialog(item)}>
						Partager
					</Button>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<!-- Bulk Share Dialog -->
{#if showBulkShareDialog}
	<ShareMultipleCourseworkDialog
		courseworkItems={selectedCoursework}
		onClose={() => (showBulkShareDialog = false)}
		onSuccess={handleBulkShareSuccess}
	/>
{/if}
```

---

### Example 2: Coursework List Page with Filters

```svelte
<script lang="ts">
	import ShareMultipleCourseworkDialog from '$lib/components/google/ShareMultipleCourseworkDialog.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';

	// State
	let coursework = $state<CourseworkItem[]>([]);
	let selectedCourseworkIds = new SvelteSet<string>();
	let showBulkShareDialog = $state(false);
	let searchQuery = $state('');
	let courseFilter = $state('');

	// Computed
	let filteredCoursework = $derived.by(() => {
		let result = coursework;

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(c) =>
					c.title.toLowerCase().includes(query) ||
					c.courseName.toLowerCase().includes(query)
			);
		}

		// Filter by course
		if (courseFilter) {
			result = result.filter((c) => c.courseId === courseFilter);
		}

		return result;
	});

	let selectedCoursework = $derived(
		filteredCoursework.filter((c) => selectedCourseworkIds.has(c.id))
	);

	let allFilteredSelected = $derived(
		filteredCoursework.length > 0 &&
			filteredCoursework.every((c) => selectedCourseworkIds.has(c.id))
	);

	// Functions
	function toggleAll() {
		if (allFilteredSelected) {
			// Deselect all filtered
			filteredCoursework.forEach((c) => {
				selectedCourseworkIds.delete(c.id);
			});
		} else {
			// Select all filtered
			filteredCoursework.forEach((c) => {
				selectedCourseworkIds.add(c.id);
			});
		}
	}

	function toggleCoursework(id: string) {
		if (selectedCourseworkIds.has(id)) {
			selectedCourseworkIds.delete(id);
		} else {
			selectedCourseworkIds.add(id);
		}
	}

	function openBulkShare() {
		if (selectedCourseworkIds.size === 0) return;
		showBulkShareDialog = true;
	}

	function handleBulkShareSuccess() {
		loadCoursework();
		selectedCourseworkIds.clear();
	}

	async function loadCoursework() {
		const response = await fetch('/api/google/coursework');
		const data = await response.json();
		coursework = data.coursework || [];
	}

	// Initialize
	loadCoursework();
</script>

<div class="space-y-6">
	<!-- Header with Actions -->
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Travaux Google Classroom</h1>
		{#if selectedCourseworkIds.size > 0}
			<Button onclick={openBulkShare}>
				Partager {selectedCourseworkIds.size} travail{selectedCourseworkIds.size > 1
					? 'aux'
					: ''}
			</Button>
		{/if}
	</div>

	<!-- Filters -->
	<Card.Root>
		<Card.Content class="pt-6">
			<div class="grid gap-4 md:grid-cols-2">
				<div>
					<Input
						type="text"
						placeholder="Rechercher un travail..."
						bind:value={searchQuery}
					/>
				</div>
				<div>
					<MySelect
						type="single"
						bind:value={courseFilter}
						items={[
							{ value: '', label: 'Tous les cours' },
							{ value: 'course1', label: 'Mathématiques 5e' },
							{ value: 'course2', label: 'Mathématiques 6e' }
						]}
						placeholder="Filtrer par cours"
					/>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Selection Toolbar -->
	{#if filteredCoursework.length > 0}
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<Button variant="outline" size="sm" onclick={toggleAll}>
					{allFilteredSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
				</Button>
				<span class="text-sm text-muted-foreground">
					{selectedCourseworkIds.size} sélectionné{selectedCourseworkIds.size > 1 ? 's' : ''}
				</span>
			</div>
			{#if selectedCourseworkIds.size > 0}
				<Button variant="outline" onclick={() => selectedCourseworkIds.clear()}>
					Annuler la sélection
				</Button>
			{/if}
		</div>
	{/if}

	<!-- Coursework Grid -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
		{#each filteredCoursework as item (item.id)}
			<Card.Root
				class={selectedCourseworkIds.has(item.id) ? 'border-primary' : ''}
			>
				<Card.Header>
					<div class="flex items-start gap-3">
						<MyCheckbox
							checked={selectedCourseworkIds.has(item.id)}
							onCheckedChange={() => toggleCoursework(item.id)}
							label=""
						/>
						<div class="flex-1">
							<Card.Title class="text-base">{item.title}</Card.Title>
							<p class="mt-1 text-sm text-muted-foreground">
								{item.courseName}
							</p>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
						<span>{item.workType}</span>
						{#if item.dueDate}
							<span>•</span>
							<span>Échéance: {item.dueDate}</span>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<!-- Empty State -->
	{#if filteredCoursework.length === 0}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<p class="text-lg text-muted-foreground">Aucun travail trouvé</p>
				{#if searchQuery || courseFilter}
					<Button
						variant="link"
						onclick={() => {
							searchQuery = '';
							courseFilter = '';
						}}
					>
						Réinitialiser les filtres
					</Button>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<!-- Bulk Share Dialog -->
{#if showBulkShareDialog}
	<ShareMultipleCourseworkDialog
		courseworkItems={selectedCoursework}
		onClose={() => (showBulkShareDialog = false)}
		onSuccess={handleBulkShareSuccess}
	/>
{/if}
```

---

### Example 3: Context Menu Integration

```svelte
<script lang="ts">
	import ShareMultipleCourseworkDialog from '$lib/components/google/ShareMultipleCourseworkDialog.svelte';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import { Button } from '$lib/components/ui/button';

	let coursework = $state<CourseworkItem[]>([]);
	let contextMenuCoursework = $state<CourseworkItem | null>(null);
	let showBulkShareDialog = $state(false);
	let bulkShareItems = $state<CourseworkItem[]>([]);

	function openBulkShareForItem(item: CourseworkItem) {
		bulkShareItems = [item];
		showBulkShareDialog = true;
	}

	function openBulkShareForMultiple(items: CourseworkItem[]) {
		bulkShareItems = items;
		showBulkShareDialog = true;
	}
</script>

<!-- Coursework Card with Context Menu -->
{#each coursework as item (item.id)}
	<ContextMenu.Root>
		<ContextMenu.Trigger>
			<Card.Root>
				<Card.Header>
					<Card.Title>{item.title}</Card.Title>
				</Card.Header>
			</Card.Root>
		</ContextMenu.Trigger>

		<ContextMenu.Content>
			<ContextMenu.Item onclick={() => openBulkShareForItem(item)}>
				Partager avec mes classes
			</ContextMenu.Item>
			<ContextMenu.Separator />
			<ContextMenu.Item>Modifier</ContextMenu.Item>
			<ContextMenu.Item>Dupliquer</ContextMenu.Item>
		</ContextMenu.Content>
	</ContextMenu.Root>
{/each}

<!-- Bulk Share Dialog -->
{#if showBulkShareDialog}
	<ShareMultipleCourseworkDialog
		courseworkItems={bulkShareItems}
		onClose={() => (showBulkShareDialog = false)}
		onSuccess={() => {
			loadCoursework();
		}}
	/>
{/if}
```

---

## Key Integration Points

### 1. Props Required

```typescript
interface Props {
  courseworkItems: Array<{
    id: string;          // Required: Coursework ID
    title: string;       // Required: Display title
    courseId: string;    // Required: Google Classroom course ID
    courseName: string;  // Required: Display course name
    workType: string;    // Required: ASSIGNMENT, MULTIPLE_CHOICE_QUESTION, etc.
    dueDate?: string;    // Optional: ISO date string
  }>;
  onClose: () => void;   // Required: Close handler
  onSuccess: () => void; // Required: Success handler (refresh data)
}
```

### 2. Success Callback Pattern

```typescript
function handleBulkShareSuccess() {
  // 1. Refresh data (coursework list)
  loadCoursework();

  // 2. Clear selection state
  selectedCourseworkIds.clear();

  // 3. Update UI state
  showBulkShareDialog = false;

  // 4. Optional: Show additional feedback
  // toaster.success('Travaux partagés avec succès');
}
```

### 3. Conditional Rendering

Only show dialog when:
- User has selected coursework
- User clicked "Share" action
- Component mounted with valid props

```typescript
{#if showBulkShareDialog && selectedCoursework.length > 0}
  <ShareMultipleCourseworkDialog
    courseworkItems={selectedCoursework}
    onClose={() => showBulkShareDialog = false}
    onSuccess={handleBulkShareSuccess}
  />
{/if}
```

---

## Common Patterns

### Pattern 1: Sticky Selection Toolbar

Show floating toolbar when items are selected:

```svelte
{#if selectedCourseworkIds.size > 0}
  <div class="sticky top-0 z-10 border-b bg-background p-4">
    <div class="flex items-center justify-between">
      <span>{selectedCourseworkIds.size} sélectionnés</span>
      <Button onclick={openBulkShare}>Partager</Button>
    </div>
  </div>
{/if}
```

### Pattern 2: Keyboard Shortcuts

```svelte
<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && showBulkShareDialog) {
      showBulkShareDialog = false;
    }
    if (e.ctrlKey && e.key === 'a') {
      e.preventDefault();
      toggleAll();
    }
  }}
/>
```

### Pattern 3: Batch Actions

```svelte
<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild let:builder>
    <Button variant="outline" builders={[builder]}>
      Actions groupées
    </Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item onclick={openBulkShare}>
      Partager avec mes classes
    </DropdownMenu.Item>
    <DropdownMenu.Item onclick={bulkDelete}>
      Supprimer la sélection
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
```

---

## Testing Recommendations

### Unit Tests (Vitest)

```typescript
import { render, fireEvent } from '@testing-library/svelte';
import ShareMultipleCourseworkDialog from './ShareMultipleCourseworkDialog.svelte';

describe('ShareMultipleCourseworkDialog', () => {
  const mockCoursework = [
    {
      id: '1',
      title: 'Devoir 1',
      courseId: 'c1',
      courseName: 'Math 5e',
      workType: 'ASSIGNMENT'
    }
  ];

  it('renders with coursework items', () => {
    const { getByText } = render(ShareMultipleCourseworkDialog, {
      courseworkItems: mockCoursework,
      onClose: () => {},
      onSuccess: () => {}
    });

    expect(getByText('Devoir 1')).toBeInTheDocument();
  });

  it('calls onSuccess after successful share', async () => {
    const onSuccess = vi.fn();
    const { getByText } = render(ShareMultipleCourseworkDialog, {
      courseworkItems: mockCoursework,
      onClose: () => {},
      onSuccess
    });

    // Simulate share flow...
    await fireEvent.click(getByText('Partager'));

    expect(onSuccess).toHaveBeenCalled();
  });
});
```

### E2E Tests (Playwright)

```typescript
test('bulk share coursework flow', async ({ page }) => {
  // Navigate to Google integration page
  await page.goto('/dashboard/teacher/google');

  // Select multiple coursework
  await page.click('[data-testid="coursework-1-checkbox"]');
  await page.click('[data-testid="coursework-2-checkbox"]');

  // Open bulk share dialog
  await page.click('button:has-text("Partager 2 travaux")');

  // Select classes
  await page.click('[data-testid="class-1-checkbox"]');
  await page.click('[data-testid="class-2-checkbox"]');

  // Submit
  await page.click('button:has-text("Partager 2 travaux")');

  // Verify success
  await expect(page.locator('.toast')).toContainText('travaux partagés');
});
```

---

## Best Practices

1. **Always provide onSuccess callback** - Refresh data after successful share
2. **Clear selection after success** - Prevent accidental re-sharing
3. **Show loading states** - Use disabled and loading props during API calls
4. **Validate selection** - Disable "Share" button when no items selected
5. **Handle errors gracefully** - Display user-friendly error messages
6. **Preserve search/filter state** - Don't reset filters on success
7. **Keyboard navigation** - Support Escape to close, Tab navigation
8. **Mobile responsive** - Test on small screens, ensure touch-friendly
9. **Accessibility** - Proper ARIA labels, screen reader announcements
10. **Performance** - Don't re-render entire list on selection change

---

## Troubleshooting

### Issue: Dialog doesn't open

```typescript
// Check: Is showBulkShareDialog reactive?
let showBulkShareDialog = $state(false); // ✅ Correct

// Check: Is selectedCoursework valid?
console.log('Selected:', selectedCoursework); // Should be non-empty array
```

### Issue: Success callback not called

```typescript
// Ensure you're passing the callback
<ShareMultipleCourseworkDialog
  onSuccess={handleBulkShareSuccess} // ✅ Correct
  onSuccess={() => {}} // ❌ Wrong: Empty callback
/>
```

### Issue: Categories not loading

```typescript
// Check: Are classes selected?
// Categories only load when classes are selected AND useTopics = false

// Debug:
$effect(() => {
  console.log('Classes:', selectedClassIds.size);
  console.log('Use Topics:', useTopics);
  console.log('Categories:', categories.length);
});
```

---

## Summary

The `ShareMultipleCourseworkDialog` component is designed to be:
- **Flexible**: Works with any coursework selection
- **Reusable**: Drop into any page with minimal setup
- **Self-contained**: Manages all internal state and API calls
- **User-friendly**: Clear UI, good feedback, accessible
- **Production-ready**: Error handling, loading states, validation

Simply provide coursework items and callbacks, and the component handles the rest!
