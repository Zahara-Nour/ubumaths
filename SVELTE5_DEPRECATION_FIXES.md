# Svelte 5 Deprecation Fixes

This document summarizes the deprecation warnings fixed in the migration to Svelte 5 runes mode.

## Issue: `<svelte:component>` Deprecated

**Warning Message:**
```
[vite-plugin-svelte] src/lib/components/Sidebar.svelte:35:4
`<svelte:component>` is deprecated in runes mode — components are dynamic by default
```

## Root Cause

In **Svelte 5 with runes mode**, components are dynamic by default. The `<svelte:component>` syntax is no longer needed and has been deprecated.

**Svelte 4 / Legacy Svelte 5:**
```svelte
<svelte:component this={MyComponent} class="..." />
```

**Svelte 5 Runes Mode (Recommended):**
```svelte
<MyComponent class="..." />
```

## Files Fixed

### 1. Sidebar Component
**File:** `src/lib/components/Sidebar.svelte`
**Line:** 35

**Before:**
```svelte
<svelte:component
	this={item.icon}
	class="w-6 h-6 group-hover:scale-110 transition-transform duration-300"
/>
```

**After:**
```svelte
<!-- Svelte 5: Components are dynamic by default, no need for svelte:component -->
<item.icon class="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
```

---

### 2. Dashboard Layout
**File:** `src/routes/(protected)/dashboard/+layout.svelte`
**Line:** 324

**Before:**
```svelte
<svelte:component
	this={link.icon}
	class="w-6 h-6 group-hover:scale-110 transition-transform duration-300"
/>
```

**After:**
```svelte
<!-- Svelte 5: Components are dynamic by default -->
<link.icon class="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
```

---

### 3. Demo Page
**File:** `src/routes/(public)/demo/+page.svelte`
**Line:** 113

**Before:**
```svelte
<div class="p-3 rounded-lg bg-gradient-to-br {demo.color} text-white shadow-md group-hover:shadow-lg transition-shadow">
	<svelte:component this={demo.icon} class="h-6 w-6" />
</div>
```

**After:**
```svelte
<div class="p-3 rounded-lg bg-gradient-to-br {demo.color} text-white shadow-md group-hover:shadow-lg transition-shadow">
	<!-- Svelte 5: Components are dynamic by default -->
	<demo.icon class="h-6 w-6" />
</div>
```

---

### 4. Geometry Exercise Wrapper
**File:** `src/lib/components/geometry/GeometryExerciseWrapper.svelte`
**Lines:** 56-64

**Before:**
```svelte
{#if ExerciseComponent()}
	<svelte:component
		this={ExerciseComponent()}
		{exercise}
		{attempt}
		{hints}
		{onValidate}
		{onSave}
		{onComplete}
	/>
{:else}
```

**After:**
```svelte
{#if ExerciseComponent()}
	<!-- Svelte 5: Components are dynamic by default -->
	{@const Component = ExerciseComponent()}
	<Component
		{exercise}
		{attempt}
		{hints}
		{onValidate}
		{onSave}
		{onComplete}
	/>
{:else}
```

**Note:** Used `{@const}` to extract the component first since it's a function call.

---

### 5. AddFriend Component
**File:** `src/lib/components/AddFriend.svelte`
**Line:** 164

**Before:**
```svelte
{#if badge.icon}
	<svelte:component this={badge.icon} class="size-4" />
{/if}
```

**After:**
```svelte
{#if badge.icon}
	<!-- Svelte 5: Components are dynamic by default -->
	<badge.icon class="size-4" />
{/if}
```

---

## Pattern Summary

### Dynamic Components from Objects

When components are stored in object properties (common for icon libraries like Lucide):

```svelte
<script>
	const items = [
		{ icon: Home, label: 'Home' },
		{ icon: Settings, label: 'Settings' }
	];
</script>

{#each items as item}
	<!-- ✅ Svelte 5: Direct property access -->
	<item.icon class="w-6 h-6" />

	<!-- ❌ Deprecated: <svelte:component> -->
	<!-- <svelte:component this={item.icon} class="w-6 h-6" /> -->
{/each}
```

### Dynamic Components from Variables

```svelte
<script>
	let Component = $state(ComponentA);
</script>

<!-- ✅ Svelte 5: Direct usage -->
<Component />

<!-- ❌ Deprecated: <svelte:component> -->
<!-- <svelte:component this={Component} /> -->
```

### Dynamic Components from Functions

```svelte
<script>
	const getComponent = () => SomeComponent;
</script>

<!-- ✅ Svelte 5: Extract with {@const} first -->
{@const Component = getComponent()}
<Component />

<!-- ❌ Deprecated: <svelte:component> -->
<!-- <svelte:component this={getComponent()} /> -->
```

## Testing

All deprecation warnings were verified to be resolved:

```bash
pnpm dev
# No more warnings about <svelte:component>
```

## Benefits

1. **Cleaner syntax** - Less verbose component usage
2. **Better performance** - No runtime overhead for dynamic component resolution
3. **Type safety** - Better TypeScript inference with direct component references
4. **Future-proof** - Aligns with Svelte 5's runes mode philosophy

## Documentation Updated

The following documentation files were updated to reflect these changes:

- **CLAUDE.md** - Added examples of correct dynamic component usage
  - Updated "Dynamic Components" section with examples
  - Updated "Avoid Anti-Patterns" section
  - Updated "Migration from Svelte 3 to Svelte 5" section

## References

- [Svelte 5 Migration Guide - Dynamic Components](https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes)
- [Svelte 5 Runes Mode](https://svelte.dev/docs/svelte/runes)

---

**Date:** 2025-10-18
**Impact:** All deprecation warnings resolved ✅
**Breaking Changes:** None (backward compatible syntax)
