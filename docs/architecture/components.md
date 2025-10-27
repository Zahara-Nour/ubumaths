# Component Architecture

Documentation de l'architecture des composants réutilisables d'UbuMaths.

**Last Updated**: 2025-10-27

---

## Overview

UbuMaths utilise une architecture de composants basée sur :

- **Shadcn-svelte** : Composants UI de base (Button, Input, Dialog, etc.)
- **Bits UI** : Primitives headless pour composants complexes
- **Custom Components** : Composants métier spécifiques (MySelect, etc.)

---

## MySelect Component

### Introduction

**MySelect** est le composant standard pour tous les dropdowns/selects dans UbuMaths.

**Location** : `/src/lib/components/MySelect.svelte`
**Built on** : Bits UI Select
**Status** : ✅ Production (standardized 2025-10-27)

### Why MySelect?

#### Problems with Shadcn Select

Shadcn-svelte's Select component caused issues in production:

1. **SSR incompatibility** : Hydration mismatches with SvelteKit SSR
2. **Svelte 5 compatibility** : Issues with runes and `$bindable`
3. **Inconsistent behavior** : Different behavior in dev vs production

#### MySelect Advantages

✅ **SSR-compatible** : Works seamlessly with SvelteKit SSR
✅ **Bits UI powered** : Built on stable, well-tested primitives
✅ **Svelte 5 runes** : Full support for `$bindable`, `$state`, `$derived`
✅ **Accessible** : Keyboard navigation, ARIA attributes
✅ **Consistent API** : Same interface across entire codebase
✅ **Type-safe** : Full TypeScript support

---

## API Reference

### Props

```typescript
type Props = {
	// Bits UI Select API
	type: 'single' | 'multiple';
	value?: string | string[]; // Bindable with bind:value

	// MySelect-specific
	items: { value: string; label: string; disabled?: boolean }[];
	placeholder?: string; // Default: "Select..."
	triggerClass?: string; // Custom CSS classes for trigger button
	contentProps?: WithoutChildren<Select.ContentProps>; // Bits UI props

	// Additional Bits UI props via spread
	...restProps: WithoutChildren<Select.RootProps>;
};
```

### Basic Usage

```svelte
<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';

	let selectedValue = $state('option1');

	const items = [
		{ value: 'option1', label: 'Option 1' },
		{ value: 'option2', label: 'Option 2' },
		{ value: 'option3', label: 'Option 3', disabled: true }
	];
</script>

<MySelect type="single" bind:value={selectedValue} {items} placeholder="Choose an option" />
```

### Advanced Usage

#### Multiple Selection

```svelte
<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';

	let selectedValues = $state<string[]>([]);

	const items = [
		{ value: 'math', label: 'Mathématiques' },
		{ value: 'physics', label: 'Physique' },
		{ value: 'chemistry', label: 'Chimie' }
	];
</script>

<MySelect type="multiple" bind:value={selectedValues} {items} placeholder="Select subjects..." />
```

#### Custom Styling

```svelte
<MySelect
	type="single"
	bind:value={category}
	items={categoryItems}
	triggerClass="h-10 w-64 rounded-lg border-2 border-primary"
	contentProps={{ sideOffset: 8 }}
/>
```

#### Dynamic Items

```svelte
<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';

	let difficulty = $state<Difficulty>('6ème');

	// Derived from data
	const difficulties: Difficulty[] = ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Tale'];
	const difficultyItems = $derived(difficulties.map((d) => ({ value: d, label: d })));
</script>

<MySelect type="single" bind:value={difficulty} items={difficultyItems} />
```

---

## SSR Compatibility

### Requirement

Pages using MySelect **MUST** disable prerendering:

```typescript
// +page.ts
export const prerender = false;
```

### Why?

Bits UI Select uses browser-only APIs (DOM measurements, portals) that don't work during SSR prerendering. Setting `prerender = false` ensures the page is server-rendered at request time (SSR) but not pre-rendered at build time.

### Example File Structure

```
src/routes/(protected)/dashboard/teacher/classes/
├── +page.svelte       # Uses MySelect
└── +page.ts           # export const prerender = false;
```

---

## Implementation Details

### Component Structure

```svelte
<!-- MySelect.svelte -->
<script lang="ts">
	import { Select, type WithoutChildren } from 'bits-ui';

	type Props = WithoutChildren<Select.RootProps> & {
		placeholder?: string;
		items: { value: string; label: string; disabled?: boolean }[];
		contentProps?: WithoutChildren<Select.ContentProps>;
		triggerClass?: string;
	};

	let {
		value = $bindable(),
		items,
		contentProps,
		placeholder,
		triggerClass = '...',
		...restProps
	}: Props = $props();

	const selectedLabel = $derived(
		value ? items.find((item) => item.value === value)?.label : placeholder || 'Select...'
	);
</script>

<Select.Root bind:value={value as never} {...restProps}>
	<Select.Trigger class={triggerClass}>
		{selectedLabel}
	</Select.Trigger>
	<Select.Portal>
		<Select.Content {...contentProps}>
			<Select.Viewport>
				{#each items as { value, label, disabled } (value)}
					<Select.Item {value} {label} {disabled}>
						{#snippet children({ selected })}
							<span>{label}</span>
							{#if selected}✓{/if}
						{/snippet}
					</Select.Item>
				{/each}
			</Select.Viewport>
		</Select.Content>
	</Select.Portal>
</Select.Root>
```

### Key Features

1. **$bindable value** : Two-way binding with parent components
2. **$derived selectedLabel** : Automatically displays selected item's label
3. **Portal rendering** : Dropdown renders at document root (avoids overflow issues)
4. **Keyboard navigation** : Arrow keys, Enter, Escape built-in
5. **Type casting** : `value as never` workaround for TypeScript discriminated unions

---

## Migration from Select/select

### Standardization (2025-10-27)

All dropdown components in the codebase have been migrated to MySelect:

- **20 files modified**
- **15 route files**
- **5 component files**
- **8 new +page.ts files** created for SSR compatibility

### Migration Steps

See [MySelect Migration Guide](../development/myselect-migration.md) for detailed migration instructions.

### Quick Migration Example

**Before (Shadcn Select)**:

```svelte
<script lang="ts">
	import * as Select from '$lib/components/ui/select';
	let difficulty = $state<Difficulty>('6ème');
</script>

<Select.Root bind:value={difficulty}>
	<Select.Trigger>
		<Select.Value placeholder="Select difficulty" />
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
	import MySelect from '$lib/components/MySelect.svelte';

	let difficulty = $state<Difficulty>('6ème');
	const difficultyItems = difficulties.map((d) => ({ value: d, label: d }));
</script>

<MySelect
	type="single"
	bind:value={difficulty}
	items={difficultyItems}
	placeholder="Select difficulty"
/>
```

---

## Best Practices

### DO

✅ Always use MySelect for dropdowns
✅ Add `export const prerender = false;` in +page.ts
✅ Use descriptive labels in items array
✅ Provide meaningful placeholder text
✅ Use `$derived` for dynamic items arrays
✅ Mark disabled items in items array

### DON'T

❌ Use Shadcn Select (`import * as Select`)
❌ Use native HTML `<select>` elements
❌ Forget to disable prerendering
❌ Mutate the items array directly
❌ Use complex objects as values (use string IDs)

---

## Examples from Codebase

### Example 1: Mathémo Game (Difficulty Selection)

**File**: `src/routes/(public)/games/mathemo/+page.svelte`

```svelte
<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';
	import { game } from './game.svelte';

	const difficulties: Difficulty[] = ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Tale'];
	const difficultyItems = difficulties.map((d) => ({ value: d, label: d }));
</script>

<div class="space-y-2">
	<label for="difficulty-select" class="text-sm font-medium">Niveau</label>
	<MySelect
		type="single"
		bind:value={game.difficulty}
		items={difficultyItems}
		triggerClass="h-9 w-32 rounded-md border"
	/>
</div>
```

### Example 2: Teacher Classes (Class Selection)

**File**: `src/routes/(protected)/dashboard/teacher/classes/+page.svelte`

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

### Example 3: Assessment Builder (Grade Level Selection)

**File**: `src/routes/(protected)/dashboard/teacher/assessments/builder/[id]/+page.svelte`

```svelte
<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';

	let gradeLevel = $state<string>('6ème');

	const gradeLevels = [
		{ value: '6ème', label: '6ème' },
		{ value: '5ème', label: '5ème' },
		{ value: '4ème', label: '4ème' },
		{ value: '3ème', label: '3ème' },
		{ value: '2nde', label: '2nde' },
		{ value: '1ère', label: '1ère' },
		{ value: 'Tale', label: 'Terminale' }
	];
</script>

<MySelect type="single" bind:value={gradeLevel} items={gradeLevels} placeholder="Niveau scolaire" />
```

---

## Testing

### Unit Testing

```typescript
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import MySelect from '$lib/components/MySelect.svelte';

describe('MySelect', () => {
	it('renders with placeholder', () => {
		const items = [
			{ value: '1', label: 'Option 1' },
			{ value: '2', label: 'Option 2' }
		];

		render(MySelect, {
			props: { type: 'single', items, placeholder: 'Choose' }
		});

		expect(screen.getByText('Choose')).toBeInTheDocument();
	});

	it('updates value on selection', async () => {
		const user = userEvent.setup();
		let value = $state('');

		const items = [
			{ value: '1', label: 'Option 1' },
			{ value: '2', label: 'Option 2' }
		];

		render(MySelect, {
			props: { type: 'single', items, value }
		});

		await user.click(screen.getByRole('button'));
		await user.click(screen.getByText('Option 1'));

		expect(value).toBe('1');
	});
});
```

---

## Troubleshooting

### Issue: Hydration Mismatch

**Error**: `Hydration failed because the initial UI does not match what was rendered on the server`

**Solution**: Ensure `export const prerender = false;` is in `+page.ts`

### Issue: Value Not Updating

**Error**: Selected value doesn't update in parent component

**Solution**: Use `bind:value`, not just `value` prop

```svelte
<!-- ❌ Wrong -->
<MySelect value={myValue} ... />

<!-- ✅ Correct -->
<MySelect bind:value={myValue} ... />
```

### Issue: TypeScript Error on value

**Error**: `Type 'string' is not assignable to type 'never'`

**Solution**: This is expected and handled internally. The component uses `value as never` to work around TypeScript's discriminated union limitations.

### Issue: Dropdown Hidden by Overflow

**Error**: Dropdown content is clipped by parent container

**Solution**: MySelect uses `Select.Portal` which renders the dropdown at document root, avoiding overflow issues. If still having issues, check parent `z-index` values.

---

## Future Enhancements

Potential improvements for MySelect:

- [ ] Support for grouped options (optgroups)
- [ ] Search/filter functionality for large lists
- [ ] Custom item rendering (icons, badges, etc.)
- [ ] Virtualization for very large lists (1000+ items)
- [ ] Right-to-left (RTL) support
- [ ] Touch gestures for mobile

---

## Related Documentation

- [UI Components Guide](../guides/ui-components.md)
- [MySelect Migration Guide](../development/myselect-migration.md)
- [Bits UI Select Docs](https://bits-ui.com/docs/components/select)
- [CLAUDE.md](../../CLAUDE.md)

---

**Maintenu par** : L'équipe UbuMaths
**Questions** : Voir [Contributing Guide](../contributing/README.md)
