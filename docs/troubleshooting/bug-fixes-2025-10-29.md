# Bug Fixes - 2025-10-29

This document describes bug fixes implemented alongside the Academic Periods feature.

---

## Table of Contents

- [Activity Polling 401 Errors](#activity-polling-401-errors)
- [Color Input Validation](#color-input-validation)
- [TypeScript Form Error Handling](#typescript-form-error-handling)

---

## Activity Polling 401 Errors

### Problem

Console was showing 401 unauthorized errors during initial dashboard page load:

```
GET /api/activity/counts 401 Unauthorized
```

**Root Cause**: Race condition where activity polling started before the user session was fully established during client-side hydration.

### Solution

Added authentication guard in `src/routes/(protected)/dashboard/+layout.svelte`:

```typescript
$effect(() => {
	// Guard: Only start polling if user profile exists
	// This prevents 401 errors during client-side hydration before session is established
	if (!data.profile?.id) {
		return;
	}

	// Fetch initial notifications details (full data for banner/dropdown)
	notificationStore.fetchUnread();

	// Start unified polling for counts (notifications + messages)
	activityStore.startPolling();

	return () => {
		activityStore.stopPolling();
	};
});
```

**Location**: `src/routes/(protected)/dashboard/+layout.svelte:204-206`

**Impact**:

- Eliminates console errors during client-side hydration
- Polling only starts after authentication is confirmed
- Cleaner user experience with no failed API requests

---

## Color Input Validation

### Problem

HTML5 color input was showing validation error "Please select a color from the color picker" even when a default color value was provided.

**Root Cause**: Used nullish coalescing operator (`??`) which doesn't handle empty strings. HTML5 color inputs reject empty strings as invalid values even though they're falsy.

```svelte
<!-- BEFORE (broken) -->
<input type="color" value={editingPeriod.color ?? '#3b82f6'} />
```

### Solution

Changed fallback operator from `??` to `||` to handle empty strings:

```svelte
<!-- AFTER (fixed) -->
<input type="color" value={editingPeriod.color || '#3b82f6'} />
```

**Impact**:

- Color pickers work correctly when no default color is set
- No more validation errors on load
- Consistent behavior across all color input fields

**Note**: This applies to any HTML5 color input in the codebase. Always use `||` instead of `??` for color input value bindings.

---

## TypeScript Form Error Handling

### Problem

Accessing `form.errors` could cause runtime errors if the form object didn't have an `errors` property:

```typescript
// BEFORE (unsafe)
if (form?.errors) {
	// TypeScript allows this but form might not have errors property
}
```

**Root Cause**: TypeScript's optional chaining (`?.`) only checks if the object exists, not if it has the property.

### Solution

Added proper type guard using `in` operator:

```typescript
// AFTER (safe)
if (form && 'errors' in form) {
	// Now TypeScript knows form has errors property
	const errors = form.errors;
}
```

**Impact**:

- Safer form error handling across all form actions
- Prevents runtime errors when form object structure varies
- Better TypeScript type narrowing

**Pattern to follow**: Always use `'property' in object` when checking for optional properties that might not exist.

---

## Related Changes

These bug fixes were implemented alongside the Academic Periods feature release. See:

- [CHANGELOG.md](/CHANGELOG.md) - Full change history
- [Academic Periods Feature](/docs/features/academic-periods/README.md) - Main feature documentation

---

**Date**: 2025-10-29
**Status**: Fixed and tested
**Commit**: Part of academic periods implementation
