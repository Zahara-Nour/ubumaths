# MySelect Migration Guide

Guide complet pour migrer les composants Select/select vers MySelect.

**Date**: 2025-10-27
**Status**: ✅ Completed (all files migrated)

---

## Overview

Ce guide documente la migration de tous les composants dropdown vers MySelect, le composant standard d'UbuMaths.

**Scope**: 20 fichiers migrés (15 routes, 5 composants)
**Time**: ~2 heures
**Issues fixed**: 2 ESLint errors (unused imports)

---

## Why Migrate?

### Problems with Previous Approach

#### Shadcn Select Issues

❌ **SSR incompatibility** : Hydration mismatches en production
❌ **Svelte 5 issues** : Problèmes avec runes et `$bindable`
❌ **Inconsistent behavior** : Différent en dev vs production
❌ **Complex API** : Trop de boilerplate pour cas simples

#### Native HTML `<select>` Issues

❌ **Limited styling** : Difficile à personnaliser
❌ **Poor accessibility** : Pas de keyboard navigation avancée
❌ **No consistency** : Chaque select a un style différent
❌ **No TypeScript** : Pas de type-safety

### Benefits of MySelect

✅ **SSR-compatible** : Fonctionne parfaitement avec SvelteKit SSR
✅ **Simple API** : Props simples, moins de boilerplate
✅ **Consistent** : Même interface partout
✅ **Type-safe** : Full TypeScript support
✅ **Accessible** : Keyboard navigation, ARIA
✅ **Svelte 5 runes** : Natif avec `$bindable`, `$state`, `$derived`

---

## Migration Process

### Step 1: Update Imports

**Before**:

```svelte
<script lang="ts">
	import * as Select from '$lib/components/ui/select';
</script>
```

**After**:

```svelte
<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';
</script>
```

### Step 2: Convert Items Array

Transform your data into MySelect's items format.

**Before (Shadcn Select)**:

```svelte
<script lang="ts">
	const difficulties = ['6ème', '5ème', '4ème', '3ème'];
</script>

<Select.Root bind:value={difficulty}>
	<Select.Trigger>
		<Select.Value placeholder="Niveau" />
	</Select.Trigger>
	<Select.Content>
		{#each difficulties as diff}
			<Select.Item value={diff}>{diff}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
```

**After (MySelect)**:

```svelte
<script lang="ts">
	const difficulties = ['6ème', '5ème', '4ème', '3ème'];
	const difficultyItems = difficulties.map((d) => ({ value: d, label: d }));
</script>

<MySelect type="single" bind:value={difficulty} items={difficultyItems} placeholder="Niveau" />
```

**Tip**: Use `$derived` for reactive items:

```svelte
<script lang="ts">
	let { data } = $props();
	const classItems = $derived(data.classes.map((c) => ({ value: c.id, label: c.name })));
</script>
```

### Step 3: Update Component Usage

**Before (Native select)**:

```svelte
<select bind:value={category} class="...">
	<option value="">Choisir une catégorie</option>
	<option value="algebra">Algèbre</option>
	<option value="geometry">Géométrie</option>
</select>
```

**After (MySelect)**:

```svelte
<script lang="ts">
	const categoryItems = [
		{ value: 'algebra', label: 'Algèbre' },
		{ value: 'geometry', label: 'Géométrie' }
	];
</script>

<MySelect
	type="single"
	bind:value={category}
	items={categoryItems}
	placeholder="Choisir une catégorie"
/>
```

### Step 4: Add SSR Compatibility

Create or update `+page.ts` to disable prerendering:

```typescript
// +page.ts
export const prerender = false;
```

**Important**: This is **required** for pages using MySelect.

---

## Migration Examples

### Example 1: Simple Dropdown

**File**: `src/routes/(protected)/dashboard/teacher/classes/+page.svelte`

**Before**:

```svelte
<script lang="ts">
	import * as Select from '$lib/components/ui/select';

	let { data } = $props();
	let selectedClassId = $state<string>('');
</script>

<Select.Root bind:value={selectedClassId}>
	<Select.Trigger>
		<Select.Value placeholder="Choisir une classe" />
	</Select.Trigger>
	<Select.Content>
		{#each data.classes as c}
			<Select.Item value={c.id}>{c.name}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
```

**After**:

```svelte
<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';

	let { data } = $props();
	let selectedClassId = $state<string>('');

	const classItems = $derived(
		data.classes.map((c) => ({
			value: c.id,
			label: c.name
		}))
	);
</script>

<MySelect
	type="single"
	bind:value={selectedClassId}
	items={classItems}
	placeholder="Choisir une classe"
/>
```

**+page.ts**:

```typescript
export const prerender = false;
```

### Example 2: Dropdown with Disabled Items

**Before**:

```svelte
<Select.Root bind:value={level}>
	<Select.Trigger>
		<Select.Value placeholder="Level" />
	</Select.Trigger>
	<Select.Content>
		<Select.Item value="easy">Easy</Select.Item>
		<Select.Item value="medium">Medium</Select.Item>
		<Select.Item value="hard" disabled>Hard (Coming Soon)</Select.Item>
	</Select.Content>
</Select.Root>
```

**After**:

```svelte
<script lang="ts">
	const levelItems = [
		{ value: 'easy', label: 'Easy' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'hard', label: 'Hard (Coming Soon)', disabled: true }
	];
</script>

<MySelect type="single" bind:value={level} items={levelItems} placeholder="Level" />
```

### Example 3: Dropdown with Custom Styling

**Before**:

```svelte
<Select.Root bind:value={difficulty}>
	<Select.Trigger class="h-9 w-32 rounded-md border">
		<Select.Value placeholder="Niveau" />
	</Select.Trigger>
	<Select.Content>
		{#each difficulties as diff}
			<Select.Item value={diff}>{diff}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
```

**After**:

```svelte
<MySelect
	type="single"
	bind:value={difficulty}
	items={difficultyItems}
	placeholder="Niveau"
	triggerClass="h-9 w-32 rounded-md border"
/>
```

### Example 4: Dynamic Items from Props

**Before**:

```svelte
<script lang="ts">
	let { categories } = $props<{ categories: Category[] }>();
	let selectedCategoryId = $state<string>('');
</script>

<select bind:value={selectedCategoryId}>
	<option value="">Select category</option>
	{#each categories as category}
		<option value={category.id}>{category.name}</option>
	{/each}
</select>
```

**After**:

```svelte
<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';

	let { categories } = $props<{ categories: Category[] }>();
	let selectedCategoryId = $state<string>('');

	const categoryItems = $derived(categories.map((c) => ({ value: c.id, label: c.name })));
</script>

<MySelect
	type="single"
	bind:value={selectedCategoryId}
	items={categoryItems}
	placeholder="Select category"
/>
```

---

## Complete Migration Checklist

For each file using Select/select:

- [ ] Replace import statement with `import MySelect from '$lib/components/MySelect.svelte'`
- [ ] Convert data to items array format `{ value, label, disabled? }[]`
- [ ] Replace Select.Root/select markup with `<MySelect>`
- [ ] Add `type="single"` or `type="multiple"` prop
- [ ] Add `bind:value` for two-way binding
- [ ] Add `placeholder` prop if needed
- [ ] Add `triggerClass` prop for custom styling if needed
- [ ] Create/update `+page.ts` with `export const prerender = false;`
- [ ] Remove unused Select imports
- [ ] Test component functionality
- [ ] Verify SSR compatibility (no hydration errors)

---

## Files Migrated (2025-10-27)

### Route Files (15 files)

1. `src/routes/(protected)/dashboard/teacher/assessments/builder/[id]/+page.svelte`
2. `src/routes/(protected)/dashboard/teacher/assessments/preview/+page.svelte`
3. `src/routes/(protected)/dashboard/teacher/assessments/results/[id]/+page.svelte`
4. `src/routes/(protected)/dashboard/teacher/classes/+page.svelte`
5. `src/routes/(protected)/dashboard/teacher/flashcard-decks/+page.svelte`
6. `src/routes/(protected)/dashboard/teacher/messages/+page.svelte`
7. `src/routes/(protected)/dashboard/teacher/questions/+page.svelte`
8. `src/routes/(protected)/dashboard/admin/users/+page.svelte`
9. `src/routes/(protected)/dashboard/student/assessments/+page.svelte`
10. `src/routes/(protected)/dashboard/student/flashcards/+page.svelte`
11. `src/routes/(protected)/dashboard/student/navadra/+page.svelte`
12. `src/routes/(protected)/dashboard/student/riddles/+page.svelte`
13. `src/routes/(protected)/dashboard/teacher/rewards/+page.svelte`
14. `src/routes/(public)/games/mathemo/+page.svelte`
15. `src/routes/(protected)/dashboard/student/messages/+page.svelte`

### Component Files (5 files)

1. `src/lib/components/assessments/AssessmentFilters.svelte`
2. `src/lib/components/flashcards/DeckSelector.svelte`
3. `src/lib/components/messages/MessageComposer.svelte`
4. `src/lib/components/questions/QuestionFilters.svelte`
5. `src/lib/components/students/StudentSelector.svelte`

### New +page.ts Files (8 files created)

1. `src/routes/(protected)/dashboard/teacher/assessments/preview/+page.ts`
2. `src/routes/(protected)/dashboard/teacher/assessments/results/[id]/+page.ts`
3. `src/routes/(protected)/dashboard/teacher/classes/+page.ts`
4. `src/routes/(protected)/dashboard/teacher/flashcard-decks/+page.ts`
5. `src/routes/(protected)/dashboard/teacher/messages/+page.ts`
6. `src/routes/(protected)/dashboard/teacher/questions/+page.ts`
7. `src/routes/(protected)/dashboard/admin/users/+page.ts`
8. `src/routes/(protected)/dashboard/student/messages/+page.ts`

---

## Common Patterns

### Pattern 1: Static List

```svelte
<script lang="ts">
	const difficulties = ['6ème', '5ème', '4ème', '3ème'];
	const difficultyItems = difficulties.map((d) => ({ value: d, label: d }));
</script>
```

### Pattern 2: Dynamic from Props

```svelte
<script lang="ts">
	let { classes } = $props<{ classes: Class[] }>();
	const classItems = $derived(classes.map((c) => ({ value: c.id, label: c.name })));
</script>
```

### Pattern 3: Computed Labels

```svelte
<script lang="ts">
	let { students } = $props<{ students: Student[] }>();
	const studentItems = $derived(
		students.map((s) => ({
			value: s.id,
			label: `${s.first_name} ${s.last_name}` // Computed label
		}))
	);
</script>
```

### Pattern 4: With Disabled Items

```svelte
<script lang="ts">
	let { categories } = $props<{ categories: Category[] }>();
	const categoryItems = $derived(
		categories.map((c) => ({
			value: c.id,
			label: c.name,
			disabled: c.archived // Conditional disabled
		}))
	);
</script>
```

---

## Testing After Migration

### Manual Testing Checklist

- [ ] Dropdown opens on click
- [ ] Keyboard navigation works (Arrow keys, Enter, Escape)
- [ ] Selected value displays correctly
- [ ] Placeholder shows when no selection
- [ ] Disabled items cannot be selected
- [ ] Value binds correctly to parent component
- [ ] SSR works (no hydration errors in console)
- [ ] Dropdown renders in correct position
- [ ] Dropdown closes on outside click
- [ ] Dropdown closes on selection

### Automated Testing

```typescript
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import MySelect from '$lib/components/MySelect.svelte';

describe('MySelect Migration', () => {
	it('maintains same behavior as before', async () => {
		const user = userEvent.setup();
		let value = $state('');

		const items = [
			{ value: '6ème', label: '6ème' },
			{ value: '5ème', label: '5ème' }
		];

		render(MySelect, {
			props: { type: 'single', items, placeholder: 'Niveau', value }
		});

		// Open dropdown
		await user.click(screen.getByRole('button'));

		// Select item
		await user.click(screen.getByText('6ème'));

		// Verify value updated
		expect(value).toBe('6ème');
	});
});
```

---

## Troubleshooting

### Issue: Hydration Error After Migration

**Error**: `Hydration failed because the initial UI does not match`

**Cause**: Missing `export const prerender = false;` in `+page.ts`

**Solution**:

```typescript
// Create or update +page.ts
export const prerender = false;
```

### Issue: Value Not Updating

**Error**: Selected value doesn't update parent state

**Cause**: Using `value={...}` instead of `bind:value={...}`

**Solution**:

```svelte
<!-- ❌ Wrong -->
<MySelect value={myValue} ... />

<!-- ✅ Correct -->
<MySelect bind:value={myValue} ... />
```

### Issue: TypeScript Error on Items

**Error**: `Type 'X[]' is not assignable to type '{ value: string, label: string }[]'`

**Cause**: Items not in correct format

**Solution**: Transform data to match expected format:

```svelte
<script lang="ts">
	// If you have { id: string, name: string }[]
	const items = data.map((item) => ({
		value: item.id, // Use id as value
		label: item.name // Use name as label
	}));
</script>
```

### Issue: Dropdown Hidden by Container

**Error**: Dropdown content is clipped or hidden

**Cause**: Parent container has `overflow: hidden`

**Solution**: MySelect uses portals (renders at document root), so this should not happen. If it does, check `z-index` conflicts.

---

## Performance Considerations

### Before Migration

- Multiple Select implementations (inconsistent)
- Some using native select (poor UX)
- Some using Shadcn Select (SSR issues)

### After Migration

✅ **Consistent rendering** : Same component everywhere
✅ **Better SSR** : No hydration mismatches
✅ **Smaller bundle** : Single implementation
✅ **Better DX** : Less code, simpler API

---

## Future Migrations

### If You Need to Migrate a New File

1. Follow this guide
2. Test thoroughly (manual + automated)
3. Verify SSR compatibility
4. Update this document with any new patterns found

### Adding New Dropdowns

For any new dropdowns in the codebase:

1. **ALWAYS** use MySelect
2. **NEVER** use Shadcn Select or native `<select>`
3. Add `export const prerender = false;` to `+page.ts`
4. Follow patterns documented in this guide

---

## Related Documentation

- [Component Architecture](../architecture/components.md) - MySelect API reference
- [UI Components Guide](../guides/ui-components.md) - General UI patterns
- [CLAUDE.md](../../CLAUDE.md) - Project development guide

---

## Summary

**Migration completed**: 2025-10-27
**Files migrated**: 20
**ESLint errors fixed**: 2
**SSR issues resolved**: All
**Codebase status**: ✅ Fully standardized on MySelect

All dropdown components in UbuMaths now use MySelect, providing:

- Consistent user experience
- Better SSR compatibility
- Simpler developer experience
- Type-safe API
- Accessible components

---

**Maintenu par** : L'équipe UbuMaths
**Questions** : Voir [Contributing Guide](../contributing/README.md)
