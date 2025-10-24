# Migration from Skeleton UI to Shadcn-svelte

**Date:** 2025-10-11
**Status:** ✅ Completed

## Overview

Successfully migrated the entire UbuMaths application from Skeleton UI v3 to Shadcn-svelte while preserving all functionality and improving the overall design system.

## What Was Changed

### 1. Dependencies

**Removed:**

- `@skeletonlabs/skeleton` (v3.2.2)
- `@skeletonlabs/skeleton-svelte` (v1.5.3)

**Added:**

- `shadcn-svelte` (v1.0.8) - CLI for component installation
- `bits-ui` (v2.11.5) - Headless component primitives
- `lucide-svelte` (v0.545.0) - Icon library
- `svelte-sonner` (v1.0.5) - Toast notifications
- `mode-watcher` (v1.1.0) - Dark/light mode management
- `clsx` (v2.1.1) - Class name utility
- `tailwind-merge` (v3.3.1) - Tailwind class merging
- `tailwind-variants` (v3.1.1) - Variant-based styling
- `@internationalized/date` (v3.10.0) - Date utilities

### 2. Shadcn Components Installed

Located in `src/lib/components/ui/`:

- **button** - Multiple variants (default, destructive, outline, secondary, ghost, link)
- **input** - Form input fields
- **textarea** - Multi-line text inputs
- **select** - Dropdown selections
- **dropdown-menu** - Context menus and dropdowns
- **avatar** - User avatars with image and fallback
- **tabs** - Tabbed interfaces
- **separator** - Visual dividers

### 3. File Changes

#### Modified Files (Core Components)

- `src/app.css` - Complete rewrite with Shadcn theme system
- `src/routes/+layout.svelte` - Replaced Skeleton Toaster with Sonner
- `src/lib/components/Header.svelte` - Complete rewrite using Shadcn components
- `src/lib/components/Sidebar.svelte` - Simplified with semantic classes
- `src/lib/stores/toaster.svelte.ts` - Wrapper around svelte-sonner
- `src/lib/stores/fontSize.svelte.ts` - Updated to use `--font-scale` variable

#### Modified Files (Pages)

- `src/routes/(public)/+page.svelte`
- `src/routes/(public)/login/+page.svelte`
- `src/routes/(protected)/dashboard/+layout.svelte`
- `src/routes/(protected)/dashboard/admin/schools/+page.svelte`
- `src/routes/(protected)/dashboard/TeacherDashboard.svelte`
- `src/routes/(protected)/dashboard/StudentDashboard.svelte`
- `src/routes/(protected)/dashboard/AdminDashboard.svelte`

#### Modified Files (Components)

- `src/lib/components/ToastDemo.svelte`
- `src/lib/components/LoadingTable.svelte`

#### New Files

- `components.json` - Shadcn-svelte configuration
- `src/lib/utils.ts` - Utility functions (cn, flyAndScale, type helpers)
- `src/lib/components/ui/**/*` - All Shadcn components (41 files)

#### Documentation Updates

- `CLAUDE.md` - Complete Shadcn-svelte documentation
- `MIGRATION_SHADCN.md` - This file

### 4. CSS Theme System

#### Before (Skeleton UI)

```css
/* Numeric color variants */
.surface-100-900  /* Light: 100, Dark: 900 */
.text-surface-700-300
.bg-surface-50-950

/* Skeleton-specific variables */
--text-scaling
--color-primary-500
```

#### After (Shadcn)

```css
/* Semantic CSS variables */
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--card: 0 0% 100%;
--primary: 221.2 83.2% 53.3%;
--muted: 210 40% 96.1%;
--border: 214.3 31.8% 91.4%;

/* Usage */
.bg-background
.text-foreground
.bg-card
.border-border
```

### 5. Class Name Mapping Guide

| Skeleton UI                | Shadcn-svelte                              |
| -------------------------- | ------------------------------------------ |
| `surface-*`                | `background`, `card`, `muted`              |
| `text-surface-*`           | `text-foreground`, `text-muted-foreground` |
| `border-surface-*`         | `border-border`                            |
| `bg-surface-100-900`       | `bg-card`                                  |
| `bg-surface-50-950`        | `bg-background`                            |
| `bg-surface-200-800`       | `bg-muted`                                 |
| `text-on-surface-token`    | `text-foreground`                          |
| `variant-filled-primary`   | `<Button>` (default)                       |
| `variant-filled-secondary` | `<Button variant="secondary">`             |
| `variant-ghost-*`          | `<Button variant="ghost">`                 |
| `btn btn-sm`               | `<Button size="sm">`                       |
| `btn-icon`                 | `<Button size="icon">`                     |
| `card` class               | `bg-card text-card-foreground border`      |
| `input` class              | `<Input>` component                        |
| `textarea` class           | `<Textarea>` component                     |
| `select` class             | `<Select>` components                      |

### 6. Component Migration Examples

#### Button

```svelte
<!-- Before (Skeleton) -->
<button class="btn variant-filled-primary">Click me</button>
<button class="btn btn-sm variant-ghost-surface">Small</button>

<!-- After (Shadcn) -->
<Button>Click me</Button>
<Button size="sm" variant="ghost">Small</Button>
```

#### Form Inputs

```svelte
<!-- Before (Skeleton) -->
<input type="text" class="input" placeholder="Enter text" />
<textarea class="textarea" rows="4"></textarea>

<!-- After (Shadcn) -->
<Input type="text" placeholder="Enter text" />
<Textarea rows={4} />
```

#### Dropdown Menu

```svelte
<!-- Before (Skeleton) -->
<Popover>
	{#snippet trigger()}
		<button>Open</button>
	{/snippet}
	{#snippet content()}
		<div>Content</div>
	{/snippet}
</Popover>

<!-- After (Shadcn) -->
<DropdownMenu.Root>
	<DropdownMenu.Trigger class="cursor-pointer">Open</DropdownMenu.Trigger>
	<DropdownMenu.Content>
		<DropdownMenu.Item>Item 1</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
```

#### Avatar

```svelte
<!-- Before (Skeleton) -->
<Avatar src="/avatar.jpg" size="w-10 h-10">JD</Avatar>

<!-- After (Shadcn) -->
<Avatar.Root class="h-10 w-10">
	<Avatar.Image src="/avatar.jpg" alt="User" />
	<Avatar.Fallback>JD</Avatar.Fallback>
</Avatar.Root>
```

#### Toast Notifications

```svelte
<!-- Before (Skeleton) -->
<script>
  import { toaster } from '$lib/stores/toaster.svelte';

  toaster.create({
    title: 'Success',
    description: 'Done!'
  });
</script>

<!-- After (Shadcn with Sonner) -->
<script>
  import { toaster } from '$lib/stores/toaster.svelte';

  toaster.success('Done!');
</script>
```

## Important Gotchas & Fixes

### 1. Event Handlers (Svelte 5)

❌ **Wrong:** `on:click`
✅ **Correct:** `onclick`

All event handlers in Svelte 5 use lowercase: `onclick`, `onsubmit`, `onchange`

### 2. Dropdown Menu Navigation

❌ **Wrong:** `<DropdownMenu.Item href="/dashboard">`
✅ **Correct:**

```svelte
<DropdownMenu.Item>
	<a href="/dashboard" class="flex w-full items-center"> Dashboard </a>
</DropdownMenu.Item>
```

### 3. Cursor Pointer

- Button component now includes `cursor-pointer` in base styles
- Dropdown triggers need manual `class="cursor-pointer"`
- Dropdown menu items changed from `cursor-default` to `cursor-pointer`

### 4. Tailwind CSS 4 Compatibility

Cannot use `@apply` with CSS variables directly:

❌ **Wrong:**

```css
@apply border-border;
```

✅ **Correct:**

```css
border-color: hsl(var(--border));
```

## Font Scaling System

### Before (Skeleton)

```typescript
// Used --text-scaling variable
document.documentElement.style.setProperty('--text-scaling', scale.toString());
```

### After (CSS-based)

```typescript
// Uses --font-scale with calc() in CSS
document.documentElement.style.setProperty('--font-scale', scale.toString());
```

```css
/* In app.css */
main h1 {
	font-size: calc(2.25rem * var(--font-scale)) !important;
}
```

## Theme System (Dark Mode)

Both Skeleton and Shadcn use the `.dark` class approach, but with different color systems:

### Skeleton UI

- Numeric variants: `surface-100-900` (light value / dark value)
- Framework-specific color tokens

### Shadcn

- Semantic CSS variables: `--background`, `--foreground`, `--primary`
- Same variable names for light and dark, values change in `.dark` class
- More maintainable and easier to customize

## Build & Type Safety

✅ All TypeScript checks pass
✅ Production build successful
✅ Zero runtime errors
✅ Full Svelte 5 compatibility

## Testing Completed

✅ Dark mode toggle
✅ Font size increase/decrease
✅ Login/logout flow
✅ Avatar dropdown menu
✅ Mobile hamburger menu
✅ Toast notifications
✅ Form inputs
✅ Navigation
✅ Button interactions
✅ Cursor states

## Benefits Achieved

1. **Modern Design** - Shadcn's cleaner, more minimal aesthetic
2. **Component Ownership** - All components copied to project for full customization
3. **Better DX** - Improved TypeScript support with Svelte 5 runes
4. **Active Ecosystem** - Large community, based on shadcn/ui (React)
5. **Semantic Colors** - Easier theming with meaningful variable names
6. **Future-Proof** - Built for Svelte 5 from the ground up

## Resources

- [Shadcn-svelte Docs](https://www.shadcn-svelte.com/docs)
- [Svelte 5 Migration Guide](https://svelte.dev/docs/svelte/v5-migration-guide)
- [Mode Watcher](https://mode-watcher.svecosystem.com/)
- [Svelte Sonner](https://svelte-sonner.vercel.app/)
- [Lucide Icons](https://lucide.dev/)

## Next Steps for Future Development

1. **Adding Components:** Use `npx shadcn-svelte@latest add <component-name>`
2. **Customization:** Edit components directly in `src/lib/components/ui/`
3. **Theming:** Modify CSS variables in `src/app.css` for color changes
4. **Icons:** Use Lucide icons from `lucide-svelte` package

## Migration Lessons Learned

1. Always check Svelte 5 event handler syntax (`onclick` not `on:click`)
2. Shadcn dropdown menus need `<a>` tags for navigation
3. Add `cursor-pointer` explicitly for custom interactive elements
4. CSS variable approach is more maintainable than numeric variants
5. Component ownership allows faster iteration and customization
