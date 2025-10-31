# UI Components

Comprehensive guide to UI components in UbuMaths, including Shadcn-svelte components and the custom MySelect component built for SSR compatibility.

---

## Shadcn-svelte Components

Shadcn-svelte provides a library of accessible, customizable UI components built on Bits UI primitives.

**Documentation**: https://www.shadcn-svelte.com/docs

**Location**: `src/lib/components/ui/`

**Available Components**: Button, Input, Textarea, Dropdown Menu, Avatar, Tabs, Separator

### Adding New Components

To add a new Shadcn-svelte component to the project:

```bash
npx shadcn-svelte@latest add <component-name>
```

This will install the component into `src/lib/components/ui/` with proper styling and accessibility features.

---

## MySelect Component (Select Dropdowns)

The custom MySelect component is the standard for all dropdown/select functionality in UbuMaths.

**Location**: `src/lib/components/MySelect.svelte`

**Built on**: Bits UI Select (SSR-compatible)

### Why MySelect?

The custom MySelect component was created because Shadcn-svelte's Select component is not compatible with server-side rendering (SSR). MySelect provides:

- Full SSR compatibility (works with SvelteKit's server-side rendering)
- Consistent API across the entire codebase
- Built on Bits UI Select (stable, well-tested foundation)
- Full keyboard navigation and accessibility support
- Svelte 5 runes compatibility

### Never Use

**NEVER use the Shadcn-svelte Select component** for new code:

```typescript
// ERROR: Do not import Shadcn Select
import * as Select from '$lib/components/ui/select';
```

**NEVER use native HTML select elements**:

```svelte
<!-- ERROR: Do not use native HTML select -->
<select>
	<option value="option1">Option 1</option>
	<option value="option2">Option 2</option>
</select>
```

### Usage Example

Here's a complete example of using MySelect:

```svelte
<script>
	import MySelect from '$lib/components/MySelect.svelte';

	// Two-way binding with Svelte 5 $state
	let selectedValue = $state('option1');

	const items = [
		{ value: 'option1', label: 'Option 1' },
		{ value: 'option2', label: 'Option 2' },
		{ value: 'option3', label: 'Option 3', disabled: true }
	];
</script>

<MySelect
	type="single"
	bind:value={selectedValue}
	{items}
	placeholder="Select an option"
	triggerClass="h-9 w-40 rounded-md border"
/>
```

### Props

- **`type`** (required): `"single"` or `"multiple"` - Determines if one or multiple values can be selected (uses Bits UI Select API)
- **`value`** (required): Bindable value using `bind:value` - The currently selected value(s)
- **`items`** (required): Array of `{ value: string, label: string, disabled?: boolean }` - Options to display in the dropdown
- **`placeholder`** (optional): String - Placeholder text when nothing is selected (default: "Select...")
- **`triggerClass`** (optional): String - Custom CSS classes for the trigger/button element
- **`contentProps`** (optional): Object - Additional props passed to Select.Content (Bits UI)

### SSR Compatibility

When using MySelect in a route component, you must disable prerendering in the corresponding `+page.ts` file:

```typescript
// src/routes/my-page/+page.ts
export const prerender = false;
```

This ensures the component renders on the server with proper state management.

### Standardization

As of October 27, 2025, all 20 files using Shadcn Select or native select elements have been refactored to use MySelect for consistency and SSR compatibility.

### Reference

For a real-world example, see:

- **File**: `src/routes/(public)/games/mathemo/+page.svelte`
- **Lines**: 26, 262-267

See also: [Component Architecture](../architecture/components.md)

---

## Common UI Patterns

### Event Handlers

Event handlers in Svelte 5 use lowercase (different from traditional HTML):

```svelte
<!-- Correct: lowercase event handler -->
<Button onclick={handleClick}>Click me</Button>

<!-- Do NOT use onuppercase or on:event -->
```

### Import Patterns

Standard patterns for importing UI components:

```typescript
// Individual component import
import { Button } from '$lib/components/ui/button';

// Namespace import for components with subcomponents
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

// Custom components
import MySelect from '$lib/components/MySelect.svelte';
```

### Toast Notifications

Use the toaster store for user feedback messages:

```typescript
import { toaster } from '$lib/stores/toaster.svelte';

// Success notification
toaster.success('Action completed successfully');

// Error notification
toaster.error('An error occurred');

// Warning notification
toaster.warning('Please review this');

// Info notification
toaster.info('Here is some information');
```

The toaster automatically handles display and dismissal of notifications with visual feedback.

---

[← Back to Claude Docs](./README.md)
