# Inline Editing Pattern

**Status**: Production Standard
**Last Updated**: 2025-11-06
**Reference Implementation**: `/dashboard/admin/users`

---

## Table of Contents

1. [Overview](#overview)
2. [Philosophy and UX Principles](#philosophy-and-ux-principles)
3. [Architecture](#architecture)
4. [Field Type Implementations](#field-type-implementations)
5. [Event Handlers Reference](#event-handlers-reference)
6. [API Integration Pattern](#api-integration-pattern)
7. [Required Components](#required-components)
8. [Complete Working Examples](#complete-working-examples)
9. [Common Pitfalls and Solutions](#common-pitfalls-and-solutions)
10. [Implementation Checklist](#implementation-checklist)

---

## Overview

The inline editing pattern provides a seamless, single-page editing experience where users can:

- Click once on a field to activate edit mode
- Make changes to multiple fields
- See all changes accumulated before saving
- Save all changes with a single button click
- Cancel individual field edits (ESC key)
- Reset all unsaved changes at once

This pattern is the **standard approach** for all data editing interfaces in UbuMaths.

### When to Use This Pattern

**Use inline editing when:**

- Editing structured profile/entity data (users, classes, exercises)
- Users need to update multiple fields in a single session
- Real-time preview of changes improves UX
- The form has 3+ editable fields

**Don't use inline editing when:**

- Creating new entities (use dedicated form pages)
- Single-field quick edits (use direct API calls with optimistic UI)
- Complex multi-step wizards
- File uploads or rich media editing

---

## Philosophy and UX Principles

### 1. Ultra-Subtle Design

**Display Mode:**

- No visible borders or input styling
- Text appears as regular content
- Hover reveals interactivity with color change
- Tooltip indicates "Click to edit"

**Edit Mode:**

- Minimal styling changes
- Focus on the active field
- Borderless inputs that blend with layout
- Clear visual distinction (primary color)

**MySelect Invisible Variant (NEW):**

- Select fields appear as plain text until hovered
- No border, no background, no visible input styling
- Chevron icon only visible on hover
- Always editable (no separate display/edit modes)
- Seamless UX - users can click and select immediately
- Minimum width of 150px for usability

### 2. Single Save Button for All Changes

- Users can edit multiple fields without interruption
- One "Save" button appears when ANY field changes
- All changes applied atomically in a single API call
- Reduces cognitive load and API requests

### 3. Per-Field Save Feedback (NEW)

- During save, spinners appear next to each field's label
- Only fields that actually changed show spinners
- Provides clear visual feedback about which data is being saved
- Derived `changedFields` Set tracks modified fields
- Reduces user anxiety during async operations

### 4. Persistent Temporary Values

- Closing a field (Enter, blur) keeps the edited value
- Only ESC or "Reset" reverts to original
- Display mode always shows temp values, not original values
- Users see their pending changes immediately

### 5. Change Detection

- Automatic detection via `$derived` reactive state
- Save button appears only when changes exist
- Visual feedback for unsaved state
- Per-field change tracking for granular feedback

### 6. Simple Activation

- Single click to activate (not double-click)
- Immediate focus on input field
- Auto-select text for text inputs (optional)
- For MySelect invisible variant: no activation needed (always active)

---

## Architecture

### State Management Pattern

The pattern uses four layers of state management:

```typescript
// 1. EDITING FLAGS (one per editable field that toggles display/edit mode)
// Boolean flags to track which field is in edit mode
// NOTE: Not needed for MySelect invisible variant or checkboxes (always active)
let editingFirstname = $state(false);
let editingLastname = $state(false);
// No editing flag for gender, role, school (using MySelect variant="invisible")

// 2. TEMPORARY VALUES (persist after field closes)
// These hold edited values until saved or reset
// IMPORTANT: For nullable MySelect fields, use '' instead of null for binding compatibility
let tempFirstname = $state<string>('');
let tempLastname = $state<string>('');
let tempGender = $state<string>(''); // '' | 'boy' | 'girl' ('' represents null)
let tempRole = $state<'admin' | 'teacher' | 'student'>('student');
let tempSchoolId = $state<string>(''); // '' represents null
let tempIsTest = $state<boolean>(false);

// 3. CHANGE DETECTION ($derived)
// Automatically detects if any temp value differs from original
// IMPORTANT: Convert '' to null when comparing MySelect values
const hasChanges = $derived(
	selectedUser &&
		(tempFirstname !== (selectedUser.firstname || '') ||
			tempLastname !== (selectedUser.lastname || '') ||
			(tempGender || null) !== selectedUser.gender || // Convert '' -> null
			tempRole !== selectedUser.role ||
			(tempSchoolId || null) !== selectedUser.school_id || // Convert '' -> null
			tempIsTest !== selectedUser.is_test)
);

// 4. PER-FIELD CHANGE TRACKING ($derived.by) - NEW
// Tracks which specific fields have changed for granular save feedback
const changedFields = $derived.by(() => {
	if (!selectedUser) return new Set<string>();
	const fields = new Set<string>();
	if (tempFirstname !== (selectedUser.firstname || '')) fields.add('firstname');
	if (tempLastname !== (selectedUser.lastname || '')) fields.add('lastname');
	if ((tempGender || null) !== selectedUser.gender) fields.add('gender');
	if (tempRole !== selectedUser.role) fields.add('role');
	if ((tempSchoolId || null) !== selectedUser.school_id) fields.add('school');
	if (tempIsTest !== selectedUser.is_test) fields.add('is_test');
	return fields;
});
```

### Data Flow

```
1. User selects entity
   └─> initTempValues(entity)
       └─> Set all temp values = original values
       └─> Close all editing flags

2. User clicks field
   └─> editingField = true
       └─> Field switches to edit mode (input/select)
       └─> Auto-focus on input

3. User edits value
   └─> tempValue updates via bind:value
       └─> hasChanges becomes true (via $derived)
       └─> Save button appears

4a. User presses Enter or clicks outside
    └─> closeField(field)
        └─> editingField = false
        └─> Temp value PERSISTS
        └─> Display mode shows temp value

4b. User presses ESC
    └─> cancelFieldEdit(field)
        └─> tempValue = originalValue (revert)
        └─> editingField = false

5. User clicks "Save All"
   └─> saveAllChanges()
       └─> PATCH request with all temp values
       └─> Update original entity from response
       └─> Re-init temp values from saved data
       └─> hasChanges becomes false

6. User clicks "Reset All"
   └─> resetAllChanges()
       └─> Re-init all temp values from original
       └─> Close all editing flags
       └─> hasChanges becomes false
```

### Component Structure

```svelte
<script lang="ts">
	// 1. State declarations
	let selectedUser = $state<User | null>(null);
	let editingFirstname = $state(false);
	let tempFirstname = $state<string>('');
	const hasChanges = $derived(/* ... */);

	// 2. Initialization function
	function initTempValues(user: User) {
		tempFirstname = user.firstname || '';
		// ... other fields
	}

	// 3. Activation handlers
	function handleFirstnameClick() {
		if (!selectedUser) return;
		editingFirstname = true;
	}

	// 4. Keyboard handlers
	function handleFieldKeyDown(e: KeyboardEvent, field: string) {
		if (e.key === 'Escape') cancelFieldEdit(field);
		else if (e.key === 'Enter') closeField(field);
	}

	// 5. Blur handlers (with delay)
	function handleFieldBlur(field: string) {
		setTimeout(() => closeField(field), 100);
	}

	// 6. Close/Cancel functions
	function closeField(field: string) {
		// Close but KEEP temp value
		editingFirstname = false;
	}

	function cancelFieldEdit(field: string) {
		// Revert to original value
		if (!selectedUser) return;
		tempFirstname = selectedUser.firstname || '';
		editingFirstname = false;
	}

	// 7. Save function
	async function saveAllChanges() {
		// ... API call
	}
</script>

<!-- UI Template -->
<div>
	{#if editingFirstname}
		<!-- Edit Mode -->
		<input
			bind:value={tempFirstname}
			onkeydown={(e) => handleFieldKeyDown(e, 'firstname')}
			onblur={() => handleFieldBlur('firstname')}
			autofocus
		/>
	{:else}
		<!-- Display Mode -->
		<p
			onclick={handleFirstnameClick}
			class="cursor-pointer hover:text-primary"
			title="Click to edit"
		>
			{tempFirstname || '—'}
		</p>
	{/if}
</div>
```

---

## Field Type Implementations

### 1. Text Fields (firstname, lastname)

**State Variables:**

```typescript
let editingFirstname = $state(false);
let tempFirstname = $state<string>('');
```

**Initialization:**

```typescript
function initTempValues(user: User) {
	tempFirstname = user.firstname || '';
}
```

**UI Implementation:**

```svelte
<div class="space-y-2">
	<Label class="text-sm font-medium text-muted-foreground">First Name</Label>

	{#if editingFirstname}
		<!-- EDIT MODE -->
		<input
			type="text"
			bind:value={tempFirstname}
			onkeydown={(e) => handleFieldKeyDown(e, 'firstname')}
			onblur={() => handleFieldBlur('firstname')}
			class="w-full border-none bg-transparent p-0 text-base focus:ring-0 focus:outline-none"
			autofocus
		/>
	{:else}
		<!-- DISPLAY MODE -->
		<p
			onclick={handleFirstnameClick}
			class="cursor-pointer text-base transition-colors hover:text-primary"
			title="Click to edit"
		>
			{tempFirstname || '—'}
		</p>
	{/if}
</div>
```

**Handler:**

```typescript
function handleFirstnameClick() {
	if (!selectedUser) return;
	editingFirstname = true;
}
```

**Key Features:**

- Empty value fallback: `{tempFirstname || '—'}`
- Borderless input styling for seamless appearance
- Auto-focus on activation

---

### 2. Select/Dropdown Fields (gender, role, school)

**CRITICAL**: Always use `MySelect`, never native `<select>` or Shadcn Select.

There are two approaches for select fields:

#### Approach A: MySelect Invisible Variant (RECOMMENDED - NEW)

**Benefits:**

- No separate display/edit modes needed
- Always editable, seamless UX
- No click handler or editing flag required
- Appears as plain text until hovered
- Perfect for inline editing pattern

**State Variables:**

```typescript
// Note: Use empty string ('') to represent null for MySelect compatibility
let tempGender = $state<string>(''); // '' | 'boy' | 'girl'
let tempRole = $state<'admin' | 'teacher' | 'student'>('student');
let tempSchoolId = $state<string>(''); // '' represents null
// NO editing flags needed!
```

**Initialization:**

```typescript
function initTempValues(user: User) {
	// Convert null to '' for MySelect compatibility
	tempGender = user.gender || '';
	tempRole = user.role;
	tempSchoolId = user.school_id || '';
}
```

**UI Implementation:**

```svelte
<div class="space-y-2">
	<div class="flex items-center gap-2">
		<Label class="text-sm font-medium text-muted-foreground">Gender</Label>
		<!-- Optional: Save spinner for this field -->
		{#if isSavingAll && changedFields.has('gender')}
			<Loader2 class="h-3 w-3 animate-spin text-muted-foreground" />
		{/if}
	</div>

	<!-- ALWAYS VISIBLE - No conditional rendering -->
	<MySelect
		type="single"
		bind:value={tempGender}
		items={[
			{ value: 'boy', label: 'Boy' },
			{ value: 'girl', label: 'Girl' }
		]}
		placeholder="Gender"
		variant="invisible"
	/>
</div>
```

**Change Detection:**

```typescript
// IMPORTANT: Convert '' to null when comparing
const hasChanges = $derived(selectedUser && (tempGender || null) !== selectedUser.gender);
```

**Save Handler:**

```typescript
async function saveAllChanges() {
	// Convert '' back to null for API
	const updates = {
		gender: (tempGender || null) as 'boy' | 'girl' | null
	};
	// ... save logic
}
```

**Key Features:**

- No editing flag needed
- No click handler needed
- No display/edit mode switching
- Appears as plain text, chevron only on hover
- Direct binding with MySelect
- Empty string ('') represents null value
- Convert to null in change detection and save

---

#### Approach B: Toggle Display/Edit Mode (Legacy)

**When to use:** When you need explicit control over when field becomes editable.

**State Variables:**

```typescript
let editingGender = $state(false);
let tempGender = $state<'boy' | 'girl' | null>(null);
```

**Initialization:**

```typescript
function initTempValues(user: User) {
	tempGender = user.gender;
}
```

**UI Implementation:**

```svelte
<div class="space-y-2">
	<Label class="text-sm font-medium text-muted-foreground">Gender</Label>

	{#if editingGender}
		<!-- EDIT MODE -->
		<MySelect
			type="single"
			bind:value={tempGender}
			items={[
				{ value: 'boy', label: 'Boy' },
				{ value: 'girl', label: 'Girl' }
			]}
			onValueChange={() => closeField('gender')}
			class="border-muted"
		/>
	{:else}
		<!-- DISPLAY MODE -->
		<p
			onclick={handleGenderClick}
			class="cursor-pointer text-base transition-colors hover:text-primary"
			title="Click to edit"
		>
			{tempGender === 'boy' ? 'Boy' : tempGender === 'girl' ? 'Girl' : '—'}
		</p>
	{/if}
</div>
```

**Handler:**

```typescript
function handleGenderClick() {
	if (!selectedUser) return;
	editingGender = true;
}
```

**Key Features:**

- `onValueChange` automatically closes field after selection
- Custom label mapping in display mode
- Empty/null value handling with fallback

**For nullable selects with "None" option:**

```svelte
<MySelect
	type="single"
	bind:value={tempSchoolId}
	items={[
		{ value: '', label: 'No School' },
		...schools.map((s) => ({ value: s.id, label: s.name }))
	]}
	onValueChange={() => closeField('school')}
/>
```

---

### 3. Boolean Fields (is_test)

**CRITICAL**: Always use `MyCheckbox`, never native checkbox or Shadcn Checkbox directly.

**State Variables:**

```typescript
let tempIsTest = $state<boolean>(false);
```

**Initialization (Force Boolean Conversion):**

```typescript
function initTempValues(user: User) {
	tempIsTest = !!user.is_test; // !! forces boolean conversion for nullable fields
}
```

**UI Implementation:**

```svelte
<div class="space-y-2">
	<Label class="text-sm font-medium text-muted-foreground">Test Account</Label>
	<MyCheckbox bind:checked={tempIsTest} label="Mark as test account" />
</div>
```

**Key Features:**

- No separate editing flag needed (checkbox is always editable)
- Direct binding with `bind:checked`
- Boolean conversion with `!!` for nullable fields
- No onclick handler needed

**Why `!!` is critical:**

```typescript
// ❌ WRONG - nullable boolean causes undefined binding errors
let tempIsTest = $state(user.is_test); // Could be null

// ✅ CORRECT - force boolean conversion
let tempIsTest = $state(!!user.is_test); // Always true or false
```

---

### 4. Read-Only Fields (email)

**UI Implementation:**

```svelte
<div class="space-y-2">
	<Label class="text-sm font-medium text-muted-foreground">Email</Label>
	<p class="text-base text-muted-foreground">
		{selectedUser.email || '—'}
	</p>
</div>
```

**Key Features:**

- No editing state or handlers
- Muted text color to indicate read-only
- Always shows original value (not temp)

---

### 5. Many-to-Many Relations with Badges (classes)

Complex field type for managing relationships with visual badges.

**State Variables:**

```typescript
let editingClasses = $state(false);
let classToAdd = $state(''); // Selected class to add
```

**UI Implementation:**

```svelte
<div class="space-y-2">
	<!-- HEADER with label and add controls -->
	<div class="flex items-center gap-2">
		<Label class="text-sm font-medium text-muted-foreground">Classes</Label>

		{#if editingClasses}
			<div class="flex flex-1 gap-2">
				<MySelect
					type="single"
					bind:value={classToAdd}
					items={[
						{ value: '', label: 'Select a class' },
						...classes
							.filter((c) => !selectedUser?.class_ids?.includes(c.id))
							.map((c) => ({ value: c.id, label: c.name }))
					]}
					class="flex-1 border-muted"
				/>
				<Button type="button" size="sm" onclick={addClassToUser} disabled={!classToAdd}>Add</Button>
			</div>
		{/if}
	</div>

	<!-- BADGE DISPLAY -->
	<div
		class="min-h-[40px] cursor-pointer"
		onclick={() => (editingClasses = true)}
		title={editingClasses ? '' : 'Click to edit'}
	>
		<div class="flex flex-wrap gap-2">
			{#if selectedUser.class_ids && selectedUser.class_ids.length > 0}
				{#each selectedUser.class_ids as classId (classId)}
					{@const className = classes.find((c) => c.id === classId)?.name}
					<Badge class="flex items-center gap-1 bg-blue-100 text-blue-800">
						{className || 'Unknown'}

						{#if editingClasses}
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									removeClass(classId);
								}}
								class="ml-1 hover:text-destructive"
							>
								×
							</button>
						{/if}
					</Badge>
				{/each}
			{:else}
				<p class="text-sm text-muted-foreground">No classes</p>
			{/if}
		</div>
	</div>
</div>
```

**Handlers:**

```typescript
async function addClassToUser() {
	if (!selectedUser || !classToAdd || !editingClasses) return;

	try {
		const response = await fetch('/api/admin/add-to-class', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				userId: selectedUser.id,
				classId: classToAdd
			})
		});

		const result = await response.json();

		if (result.success && result.profile) {
			// Update selected user with server response
			selectedUser = result.profile;

			// Update search/filter results if present
			updateResultsLists(result.profile);

			// Reset selector
			classToAdd = '';
		}
	} catch (err) {
		console.error('Add class error:', err);
	}
}

async function removeClass(classId: string) {
	if (!selectedUser || !editingClasses) return;

	try {
		const response = await fetch('/api/admin/remove-from-class', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				userId: selectedUser.id,
				classId
			})
		});

		const result = await response.json();

		if (result.success && result.profile) {
			selectedUser = result.profile;
			updateResultsLists(result.profile);
		}
	} catch (err) {
		console.error('Remove class error:', err);
	}
}
```

**Key Features:**

- Edit mode shows MySelect + Add button
- Remove buttons (×) only visible in edit mode
- `e.stopPropagation()` prevents badge container click from firing
- Immediate API calls for add/remove (not batched with Save)
- Empty state handling with helpful message
- Filter out already-assigned classes from dropdown

---

## Event Handlers Reference

### Keyboard Handlers

**handleFieldKeyDown**

```typescript
function handleFieldKeyDown(e: KeyboardEvent, field: string) {
	if (e.key === 'Escape') {
		cancelFieldEdit(field); // Revert to original
	} else if (e.key === 'Enter') {
		closeField(field); // Keep temp value
	}
}
```

**Usage:**

```svelte
<input onkeydown={(e) => handleFieldKeyDown(e, 'firstname')} />
```

**Key Behaviors:**

- **Enter**: Accept changes, close field, keep temp value
- **Escape**: Reject changes, revert to original, close field
- Works for text inputs only (not selects/checkboxes)

---

### Blur Handlers

**handleFieldBlur with Delay**

```typescript
function handleFieldBlur(field: string) {
	// Small delay to allow click events to register first
	setTimeout(() => {
		closeField(field);
	}, 100);
}
```

**Usage:**

```svelte
<input onblur={() => handleFieldBlur('firstname')} />
```

**Why the delay?**

- Without delay, blur fires BEFORE click events
- If user clicks "Save" button, blur would close field before button onclick fires
- 100ms is sufficient for click events to register

---

### closeField vs cancelFieldEdit

**closeField** - Accept changes, close edit mode

```typescript
function closeField(field: string) {
	// Close editing mode but KEEP temp value
	switch (field) {
		case 'firstname':
			editingFirstname = false;
			break;
		case 'lastname':
			editingLastname = false;
			break;
		// ... other fields
	}
}
```

**Triggered by:**

- Enter key
- Blur event (click outside)
- MySelect value selection

---

**cancelFieldEdit** - Reject changes, revert to original

```typescript
function cancelFieldEdit(field: string) {
	if (!selectedUser) return;

	// Revert to original value AND close editing mode
	switch (field) {
		case 'firstname':
			tempFirstname = selectedUser.firstname || '';
			editingFirstname = false;
			break;
		case 'lastname':
			tempLastname = selectedUser.lastname || '';
			editingLastname = false;
			break;
		// ... other fields
	}
}
```

**Triggered by:**

- Escape key
- User explicitly cancels (rare)

---

## API Integration Pattern

### 1. Endpoint Structure

**URL Pattern:** `/api/admin/users/[id]`
**Method:** `PATCH` (partial update)

**Request Body:**

```typescript
{
  firstname?: string | null,
  lastname?: string | null,
  gender?: 'boy' | 'girl' | null,
  role?: 'admin' | 'teacher' | 'student',
  school_id?: string | null,
  is_test?: boolean
}
```

**Response:**

```typescript
{
  success: boolean,
  profile: ExtendedProfile // Includes relations
}
```

---

### 2. Zod Validation Schema

**CRITICAL**: All API endpoints MUST validate input with Zod.

**Schema Definition:**

```typescript
// src/lib/server/validation/admin.ts
export const updateUserFieldsSchema = z
	.object({
		firstname: z
			.string()
			.min(1, 'Invalid first name')
			.max(100, 'First name too long')
			.nullable()
			.optional(),
		lastname: z
			.string()
			.min(1, 'Invalid last name')
			.max(100, 'Last name too long')
			.nullable()
			.optional(),
		gender: z
			.enum(['boy', 'girl'], { message: 'Gender must be "boy" or "girl"' })
			.nullable()
			.optional(),
		role: z.enum(['admin', 'teacher', 'student'], { message: 'Invalid role' }).optional(),
		school_id: z.string().uuid('Invalid school ID').nullable().optional(),
		is_test: z.boolean({ message: 'is_test must be a boolean' }).optional()
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided'
	});
```

**Key Features:**

- All fields optional (partial update)
- Nullable fields explicitly marked
- String length bounds
- UUID validation for IDs
- At least one field required (`.refine()`)

---

### 3. Server Handler Implementation

```typescript
// src/routes/api/admin/users/[id]/+server.ts
import { error, json } from '@sveltejs/kit';
import { updateUserFieldsSchema } from '$lib/server/validation/admin';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	// ✅ SECURITY: Authentication check
	if (!locals.profile) {
		throw error(401, 'Authentication required');
	}

	// ✅ SECURITY: Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	const supabase = locals.supabase;
	const userId = params.id;

	// Validate UUID format
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(userId)) {
		throw error(400, 'Invalid user ID format');
	}

	try {
		// ✅ SECURITY: Input validation with Zod
		const body = await request.json();
		const validation = updateUserFieldsSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const data = validation.data;

		// 1. Check if user exists
		const { data: existing, error: checkError } = await supabase
			.from('profiles')
			.select('id')
			.eq('id', userId)
			.maybeSingle();

		if (checkError) {
			throw error(500, 'Failed to check user existence');
		}

		if (!existing) {
			throw error(404, `User with ID "${userId}" not found`);
		}

		// 2. Build update object (only include provided fields)
		const updateData: Record<string, unknown> = {};

		if (data.firstname !== undefined) updateData.firstname = data.firstname;
		if (data.lastname !== undefined) updateData.lastname = data.lastname;
		if (data.gender !== undefined) updateData.gender = data.gender;
		if (data.role !== undefined) updateData.role = data.role;
		if (data.school_id !== undefined) updateData.school_id = data.school_id;
		if (data.is_test !== undefined) updateData.is_test = data.is_test;

		// Always update timestamp
		updateData.updated_at = new Date().toISOString();

		// 3. Update profile
		const { error: updateError } = await supabase
			.from('profiles')
			.update(updateData)
			.eq('id', userId);

		if (updateError) {
			throw error(500, 'Failed to update profile');
		}

		// 4. Fetch updated profile with relations
		const { data: updatedProfile, error: fetchError } = await supabase
			.from('profiles')
			.select(
				`
        *,
        schools (name),
        class_members (class_id)
      `
			)
			.eq('id', userId)
			.single();

		if (fetchError) {
			throw error(500, 'Failed to fetch updated profile');
		}

		// 5. Transform response to match ExtendedProfile type
		const extendedProfile = {
			...updatedProfile,
			class_ids: Array.isArray(updatedProfile.class_members)
				? updatedProfile.class_members.map((cm) => cm.class_id)
				: []
		};

		// 6. Return success response
		return json({
			success: true,
			profile: extendedProfile
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Internal server error');
	}
};
```

---

### 4. Frontend Save Handler

```typescript
async function saveAllChanges() {
	if (!selectedUser || !hasChanges || isSavingAll) return;

	isSavingAll = true;

	try {
		// Build updates object with ALL temp values
		const updates = {
			firstname: tempFirstname || null,
			lastname: tempLastname || null,
			gender: tempGender,
			role: tempRole,
			school_id: tempSchoolId,
			is_test: tempIsTest
		};

		// Send PATCH request
		const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(updates)
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to update profile');
		}

		const result = await response.json();

		if (result.success && result.profile) {
			// Update selected user with server response
			selectedUser = result.profile;

			// Re-initialize temp values from saved data
			initTempValues(result.profile);

			// Update search/filter results if present
			updateResultsInLists(result.profile);

			// Close any open editing modes
			closeAllEditingModes();

			// Success toast
			toaster.success('Profile updated successfully');
		}
	} catch (error) {
		console.error('Error updating profile:', error);
		toaster.error(error instanceof Error ? error.message : 'Error updating profile');
	} finally {
		isSavingAll = false;
	}
}
```

**Key Features:**

- Guard clause: exit if no changes or already saving
- Send ALL temp values (partial update handled server-side)
- Update original entity from server response (source of truth)
- Re-init temp values from saved data
- Update any related lists (search results, filters)
- Toast notifications for success/error
- Loading state management

---

### 5. Optimistic UI Updates (Optional)

For immediate feedback before server response:

```typescript
async function saveAllChanges() {
	if (!selectedUser || !hasChanges || isSavingAll) return;

	// Store original values for rollback
	const originalUser = { ...selectedUser };

	// Optimistic update
	selectedUser = {
		...selectedUser,
		firstname: tempFirstname || null,
		lastname: tempLastname || null,
		gender: tempGender,
		role: tempRole,
		school_id: tempSchoolId,
		is_test: tempIsTest
	};

	isSavingAll = true;

	try {
		const updates = {
			firstname: tempFirstname || null,
			lastname: tempLastname || null,
			gender: tempGender,
			role: tempRole,
			school_id: tempSchoolId,
			is_test: tempIsTest
		};

		const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(updates)
		});

		if (!response.ok) {
			// Rollback on error
			selectedUser = originalUser;
			throw new Error('Failed to update profile');
		}

		const result = await response.json();

		// Replace optimistic update with server response
		selectedUser = result.profile;
		initTempValues(result.profile);

		toaster.success('Profile updated successfully');
	} catch (error) {
		// Already rolled back above
		toaster.error('Error updating profile');
	} finally {
		isSavingAll = false;
	}
}
```

---

## Required Components

### 1. MySelect Component

**CRITICAL**: NEVER use native `<select>` or Shadcn Select. Always use MySelect.

**Why MySelect?**

- SSR-compatible (no hydration errors)
- Consistent API across the app
- Built with Svelte 5 runes
- Proper bindable props
- Type-safe with TypeScript
- Invisible variant perfect for inline editing

**Import:**

```typescript
import MySelect from '$lib/components/MySelect.svelte';
```

**Basic Usage:**

```svelte
<MySelect
	type="single"
	bind:value={tempRole}
	items={[
		{ value: 'student', label: 'Student' },
		{ value: 'teacher', label: 'Teacher' },
		{ value: 'admin', label: 'Administrator' }
	]}
/>
```

**Invisible Variant (RECOMMENDED for inline editing - NEW):**

```svelte
<MySelect
	type="single"
	bind:value={tempRole}
	items={[
		{ value: 'student', label: 'Student' },
		{ value: 'teacher', label: 'Teacher' },
		{ value: 'admin', label: 'Administrator' }
	]}
	placeholder="Role"
	variant="invisible"
/>
```

**Invisible Variant Features:**

- Appears as plain text in default state
- No border, no background, no input styling
- Chevron icon only visible on hover
- Minimum width of 150px for usability
- Always editable (no separate display/edit modes)
- Perfect for seamless inline editing UX
- Styling: `h-9 px-0 text-sm inline-flex items-center justify-between bg-transparent border-none min-w-[150px] [&>svg]:opacity-0 hover:[&>svg]:opacity-100`

**With change handler:**

```svelte
<MySelect
	type="single"
	bind:value={tempGender}
	items={[
		{ value: 'boy', label: 'Boy' },
		{ value: 'girl', label: 'Girl' }
	]}
	onValueChange={() => closeField('gender')}
/>
```

**With disabled options:**

```svelte
<MySelect
	type="single"
	bind:value={tempSchoolId}
	items={[
		{ value: '', label: 'No School' },
		...schools.map((s) => ({
			value: s.id,
			label: s.name,
			disabled: s.archived
		}))
	]}
/>
```

**Props:**

- `type`: `"single"` or `"multiple"`
- `value`: Bindable value (string for single, string[] for multiple)
- `items`: Array of `{ value: string, label: string, disabled?: boolean }`
- `placeholder`: Optional placeholder text
- `variant`: `"default"` or `"invisible"` (NEW - default: `"default"`)
- `onValueChange`: Optional callback when value changes
- `triggerClass`: Optional custom CSS classes (overrides variant styling)
- `disabled`: Optional disabled state

**Important Notes:**

- When using `variant="invisible"`, do not use conditional rendering ({#if editing})
- For nullable values, use empty string ('') instead of null
- Convert '' to null in change detection and save handlers
- No editing flag or click handler needed with invisible variant

---

### 2. MyCheckbox Component

**CRITICAL**: NEVER use native checkbox or Shadcn Checkbox directly. Always use MyCheckbox.

**Why MyCheckbox?**

- Consistent API with proper label support
- Built with Svelte 5 runes
- Proper bindable props
- Accessibility built-in

**Import:**

```typescript
import MyCheckbox from '$lib/components/MyCheckbox.svelte';
```

**Basic Usage:**

```svelte
<MyCheckbox bind:checked={tempIsTest} label="Mark as test account" />
```

**With change handler:**

```svelte
<MyCheckbox
	bind:checked={tempEnabled}
	label="Enable notifications"
	onCheckedChange={(value) => {
		console.log('Checkbox changed:', value);
	}}
/>
```

**Props:**

- `checked`: Bindable boolean value
- `label`: Optional label text
- `disabled`: Optional disabled state
- `required`: Optional required state
- `onCheckedChange`: Optional callback
- `labelClass`: Optional CSS classes for label
- `class`: Optional CSS classes for checkbox

---

### 3. Badge Component (for tags/labels)

**Import:**

```typescript
import { Badge } from '$lib/components/ui/badge';
```

**Usage for role display:**

```svelte
<Badge class={getRoleBadgeClass(tempRole)}>
	{tempRole === 'admin' ? 'Administrator' : tempRole === 'teacher' ? 'Teacher' : 'Student'}
</Badge>
```

**Utility function for colored badges:**

```typescript
function getRoleBadgeClass(role: string): string {
	switch (role) {
		case 'admin':
			return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
		case 'teacher':
			return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
		case 'student':
			return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
		default:
			return 'bg-muted text-muted-foreground';
	}
}
```

**Usage for removable tags:**

```svelte
<Badge class="flex items-center gap-1 bg-blue-100 text-blue-800">
	{className}
	{#if editingClasses}
		<button
			type="button"
			onclick={(e) => {
				e.stopPropagation();
				removeClass(classId);
			}}
			class="ml-1 hover:text-destructive"
		>
			×
		</button>
	{/if}
</Badge>
```

---

### 4. Button Patterns

**Save Button (appears when hasChanges):**

```svelte
{#if hasChanges}
	<div class="sticky bottom-4 mt-6 flex justify-end gap-2 border-t pt-4">
		<Button variant="outline" onclick={resetAllChanges} disabled={isSavingAll}>
			<RotateCcw class="mr-2 h-4 w-4" />
			Reset
		</Button>

		<Button onclick={saveAllChanges} disabled={isSavingAll} class="min-w-[140px]">
			{#if isSavingAll}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				Saving...
			{:else}
				<Save class="mr-2 h-4 w-4" />
				Save
			{/if}
		</Button>
	</div>
{/if}
```

**Key Features:**

- Sticky positioning stays visible while scrolling
- Reset button with outline variant
- Loading state with spinner
- Disabled during save operation
- Min-width prevents layout shift

---

## Complete Working Examples

### Example 1: Simple Text Field Implementation

Complete implementation of an editable first name field:

```svelte
<script lang="ts">
	type User = {
		id: string;
		firstname: string | null;
		lastname: string | null;
	};

	let selectedUser = $state<User | null>(null);
	let editingFirstname = $state(false);
	let tempFirstname = $state<string>('');

	const hasChanges = $derived(selectedUser && tempFirstname !== (selectedUser.firstname || ''));

	function initTempValues(user: User) {
		tempFirstname = user.firstname || '';
	}

	function handleFirstnameClick() {
		if (!selectedUser) return;
		editingFirstname = true;
	}

	function handleFieldKeyDown(e: KeyboardEvent, field: string) {
		if (e.key === 'Escape') {
			cancelFieldEdit(field);
		} else if (e.key === 'Enter') {
			closeField(field);
		}
	}

	function handleFieldBlur(field: string) {
		setTimeout(() => closeField(field), 100);
	}

	function closeField(field: string) {
		if (field === 'firstname') {
			editingFirstname = false;
		}
	}

	function cancelFieldEdit(field: string) {
		if (!selectedUser) return;
		if (field === 'firstname') {
			tempFirstname = selectedUser.firstname || '';
			editingFirstname = false;
		}
	}

	function resetAllChanges() {
		if (!selectedUser) return;
		initTempValues(selectedUser);
		editingFirstname = false;
	}

	async function saveAllChanges() {
		if (!selectedUser || !hasChanges) return;

		try {
			const response = await fetch(`/api/users/${selectedUser.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					firstname: tempFirstname || null
				})
			});

			if (!response.ok) throw new Error('Failed to update');

			const result = await response.json();
			selectedUser = result.profile;
			initTempValues(result.profile);

			console.log('Saved successfully!');
		} catch (error) {
			console.error('Save error:', error);
		}
	}

	// Example: select a user
	function selectUser(user: User) {
		selectedUser = user;
		initTempValues(user);
		editingFirstname = false;
	}
</script>

{#if selectedUser}
	<div class="space-y-4">
		<!-- First Name Field -->
		<div class="space-y-2">
			<label class="text-sm font-medium text-muted-foreground"> First Name </label>

			{#if editingFirstname}
				<input
					type="text"
					bind:value={tempFirstname}
					onkeydown={(e) => handleFieldKeyDown(e, 'firstname')}
					onblur={() => handleFieldBlur('firstname')}
					class="w-full border-none bg-transparent p-0 text-base focus:ring-0 focus:outline-none"
					autofocus
				/>
			{:else}
				<p
					onclick={handleFirstnameClick}
					class="cursor-pointer text-base transition-colors hover:text-primary"
					title="Click to edit"
				>
					{tempFirstname || '—'}
				</p>
			{/if}
		</div>

		<!-- Save/Reset Buttons -->
		{#if hasChanges}
			<div class="flex justify-end gap-2 border-t pt-4">
				<button type="button" onclick={resetAllChanges} class="rounded border px-4 py-2">
					Reset
				</button>
				<button
					type="button"
					onclick={saveAllChanges}
					class="rounded bg-primary px-4 py-2 text-white"
				>
					Save
				</button>
			</div>
		{/if}
	</div>
{/if}
```

---

### Example 2: Multiple Field Types

Complete implementation with text, select, and checkbox fields:

```svelte
<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { Badge } from '$lib/components/ui/badge';

	type User = {
		id: string;
		firstname: string | null;
		lastname: string | null;
		role: 'admin' | 'teacher' | 'student';
		is_test: boolean | null;
	};

	let selectedUser = $state<User | null>(null);

	// Editing flags
	let editingFirstname = $state(false);
	let editingLastname = $state(false);
	let editingRole = $state(false);

	// Temp values
	let tempFirstname = $state<string>('');
	let tempLastname = $state<string>('');
	let tempRole = $state<'admin' | 'teacher' | 'student'>('student');
	let tempIsTest = $state<boolean>(false);

	// Change detection
	const hasChanges = $derived(
		selectedUser &&
			(tempFirstname !== (selectedUser.firstname || '') ||
				tempLastname !== (selectedUser.lastname || '') ||
				tempRole !== selectedUser.role ||
				tempIsTest !== !!selectedUser.is_test)
	);

	function initTempValues(user: User) {
		tempFirstname = user.firstname || '';
		tempLastname = user.lastname || '';
		tempRole = user.role;
		tempIsTest = !!user.is_test; // Force boolean
	}

	function selectUser(user: User) {
		selectedUser = user;
		initTempValues(user);
		// Close all editing modes
		editingFirstname = false;
		editingLastname = false;
		editingRole = false;
	}

	// Activation handlers
	function handleFirstnameClick() {
		if (!selectedUser) return;
		editingFirstname = true;
	}

	function handleLastnameClick() {
		if (!selectedUser) return;
		editingLastname = true;
	}

	function handleRoleClick() {
		if (!selectedUser) return;
		editingRole = true;
	}

	// Keyboard handler
	function handleFieldKeyDown(e: KeyboardEvent, field: string) {
		if (e.key === 'Escape') {
			cancelFieldEdit(field);
		} else if (e.key === 'Enter') {
			closeField(field);
		}
	}

	// Blur handler
	function handleFieldBlur(field: string) {
		setTimeout(() => closeField(field), 100);
	}

	// Close field (keep temp value)
	function closeField(field: string) {
		switch (field) {
			case 'firstname':
				editingFirstname = false;
				break;
			case 'lastname':
				editingLastname = false;
				break;
			case 'role':
				editingRole = false;
				break;
		}
	}

	// Cancel field edit (revert to original)
	function cancelFieldEdit(field: string) {
		if (!selectedUser) return;

		switch (field) {
			case 'firstname':
				tempFirstname = selectedUser.firstname || '';
				editingFirstname = false;
				break;
			case 'lastname':
				tempLastname = selectedUser.lastname || '';
				editingLastname = false;
				break;
			case 'role':
				tempRole = selectedUser.role;
				editingRole = false;
				break;
		}
	}

	// Reset all changes
	function resetAllChanges() {
		if (!selectedUser) return;
		initTempValues(selectedUser);
		editingFirstname = false;
		editingLastname = false;
		editingRole = false;
	}

	// Save all changes
	async function saveAllChanges() {
		if (!selectedUser || !hasChanges) return;

		try {
			const updates = {
				firstname: tempFirstname || null,
				lastname: tempLastname || null,
				role: tempRole,
				is_test: tempIsTest
			};

			const response = await fetch(`/api/users/${selectedUser.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates)
			});

			if (!response.ok) throw new Error('Failed to update');

			const result = await response.json();
			selectedUser = result.profile;
			initTempValues(result.profile);

			console.log('Saved successfully!');
		} catch (error) {
			console.error('Save error:', error);
		}
	}

	function getRoleBadgeClass(role: string): string {
		switch (role) {
			case 'admin':
				return 'bg-red-100 text-red-800';
			case 'teacher':
				return 'bg-blue-100 text-blue-800';
			case 'student':
				return 'bg-green-100 text-green-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}
</script>

{#if selectedUser}
	<div class="space-y-4 p-6">
		<!-- First Name -->
		<div class="space-y-2">
			<label class="text-sm font-medium text-muted-foreground"> First Name </label>
			{#if editingFirstname}
				<input
					type="text"
					bind:value={tempFirstname}
					onkeydown={(e) => handleFieldKeyDown(e, 'firstname')}
					onblur={() => handleFieldBlur('firstname')}
					class="w-full border-none bg-transparent p-0 text-base focus:ring-0 focus:outline-none"
					autofocus
				/>
			{:else}
				<p
					onclick={handleFirstnameClick}
					class="cursor-pointer text-base transition-colors hover:text-primary"
					title="Click to edit"
				>
					{tempFirstname || '—'}
				</p>
			{/if}
		</div>

		<!-- Last Name -->
		<div class="space-y-2">
			<label class="text-sm font-medium text-muted-foreground"> Last Name </label>
			{#if editingLastname}
				<input
					type="text"
					bind:value={tempLastname}
					onkeydown={(e) => handleFieldKeyDown(e, 'lastname')}
					onblur={() => handleFieldBlur('lastname')}
					class="w-full border-none bg-transparent p-0 text-base focus:ring-0 focus:outline-none"
					autofocus
				/>
			{:else}
				<p
					onclick={handleLastnameClick}
					class="cursor-pointer text-base transition-colors hover:text-primary"
					title="Click to edit"
				>
					{tempLastname || '—'}
				</p>
			{/if}
		</div>

		<!-- Role -->
		<div class="space-y-2">
			<label class="text-sm font-medium text-muted-foreground"> Role </label>
			{#if editingRole}
				<MySelect
					type="single"
					bind:value={tempRole}
					items={[
						{ value: 'student', label: 'Student' },
						{ value: 'teacher', label: 'Teacher' },
						{ value: 'admin', label: 'Administrator' }
					]}
					onValueChange={() => closeField('role')}
				/>
			{:else}
				<p
					onclick={handleRoleClick}
					class="cursor-pointer text-base transition-colors hover:text-primary"
					title="Click to edit"
				>
					<Badge class={getRoleBadgeClass(tempRole)}>
						{tempRole === 'admin'
							? 'Administrator'
							: tempRole === 'teacher'
								? 'Teacher'
								: 'Student'}
					</Badge>
				</p>
			{/if}
		</div>

		<!-- Test Account Checkbox -->
		<div class="space-y-2">
			<label class="text-sm font-medium text-muted-foreground"> Test Account </label>
			<MyCheckbox bind:checked={tempIsTest} label="Mark as test account" />
		</div>

		<!-- Save/Reset Buttons -->
		{#if hasChanges}
			<div class="flex justify-end gap-2 border-t pt-4">
				<button
					type="button"
					onclick={resetAllChanges}
					class="rounded border px-4 py-2 hover:bg-gray-100"
				>
					Reset
				</button>
				<button
					type="button"
					onclick={saveAllChanges}
					class="rounded bg-primary px-4 py-2 text-white hover:bg-primary/90"
				>
					Save All Changes
				</button>
			</div>
		{/if}
	</div>
{/if}
```

---

## Common Pitfalls and Solutions

### 1. Undefined Values in Bindable Props

**Problem:**

```typescript
// ❌ WRONG - nullable value causes binding errors
let tempGender = $state(user.gender); // Could be null
```

```svelte
<MySelect bind:value={tempGender} ... />
<!-- ERROR: Cannot bind undefined to value prop -->
```

**Solution:**

```typescript
// ✅ CORRECT - provide default value
let tempGender = $state<'boy' | 'girl' | null>(null);

// For booleans, force conversion
let tempIsTest = $state(!!user.is_test);
```

---

### 2. Click Event Propagation in Nested Structures

**Problem:**

```svelte
<!-- ❌ WRONG - clicking × button also triggers parent onclick -->
<div onclick={() => (editingClasses = true)}>
	<Badge>
		Class Name
		<button onclick={removeClass}>×</button>
	</Badge>
</div>
<!-- Result: removeClass fires AND editingClasses becomes true -->
```

**Solution:**

```svelte
<!-- ✅ CORRECT - stop propagation -->
<div onclick={() => (editingClasses = true)}>
	<Badge>
		Class Name
		<button
			onclick={(e) => {
				e.stopPropagation();
				removeClass();
			}}
		>
			×
		</button>
	</Badge>
</div>
```

---

### 3. Blur Handler Timing Issues

**Problem:**

```typescript
// ❌ WRONG - blur fires before button click
function handleFieldBlur(field: string) {
	closeField(field); // Immediate
}
```

**Result:** If user clicks "Save" button, blur closes field before button onclick fires.

**Solution:**

```typescript
// ✅ CORRECT - delay to allow click events
function handleFieldBlur(field: string) {
	setTimeout(() => {
		closeField(field);
	}, 100);
}
```

---

### 4. Change Detection Edge Cases

**Problem:**

```typescript
// ❌ WRONG - empty string vs null comparison
const hasChanges = $derived(tempFirstname !== selectedUser.firstname);
// '' !== null always true, even if no real change
```

**Solution:**

```typescript
// ✅ CORRECT - normalize empty values
const hasChanges = $derived(tempFirstname !== (selectedUser.firstname || ''));
// Both '' and null become '', accurate comparison
```

---

### 5. Forgetting to Re-initialize After Save

**Problem:**

```typescript
// ❌ WRONG - temp values not updated after save
async function saveAllChanges() {
  const response = await fetch(...);
  const result = await response.json();
  selectedUser = result.profile;
  // Missing: initTempValues(result.profile);
}
// Result: hasChanges still true, old temp values remain
```

**Solution:**

```typescript
// ✅ CORRECT - always re-init temp values from server response
async function saveAllChanges() {
  const response = await fetch(...);
  const result = await response.json();
  selectedUser = result.profile;
  initTempValues(result.profile); // ← Critical
}
```

---

### 6. Not Closing Editing Modes on Save

**Problem:**

```typescript
// User saves while a field is still in edit mode
// After save, field remains in edit mode with stale focus
```

**Solution:**

```typescript
async function saveAllChanges() {
	// ... save logic ...

	if (result.success) {
		// Close all editing modes
		editingFirstname = false;
		editingLastname = false;
		editingGender = false;
		editingRole = false;
		editingSchool = false;
	}
}
```

---

### 7. Display Mode Showing Original Instead of Temp Value

**Problem:**

```svelte
<!-- ❌ WRONG - shows original value, not pending changes --><p>{selectedUser.firstname || '—'}</p>
```

**Result:** User edits field, closes it, but sees original value instead of their edit.

**Solution:**

```svelte
<!-- ✅ CORRECT - always show temp value in display mode --><p>{tempFirstname || '—'}</p>
```

---

### 8. Missing Guard Clauses in Handlers

**Problem:**

```typescript
// ❌ WRONG - no null check
function handleFirstnameClick() {
	editingFirstname = true; // Crash if selectedUser is null
}
```

**Solution:**

```typescript
// ✅ CORRECT - always guard against null
function handleFirstnameClick() {
	if (!selectedUser) return;
	editingFirstname = true;
}
```

---

### 9. Not Validating with Zod on API Endpoint

**Problem:**

```typescript
// ❌ CRITICAL SECURITY VIOLATION
export const PATCH: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { firstname, role } = body; // No validation!
};
```

**Solution:**

```typescript
// ✅ CORRECT - always validate with Zod
import { updateUserFieldsSchema } from '$lib/server/validation/admin';

export const PATCH: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const validation = updateUserFieldsSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const data = validation.data; // Type-safe and validated
};
```

---

### 10. Using Native Select or Checkbox Components

**Problem:**

```svelte
<!-- ❌ WRONG - native select or Shadcn Select -->
<select bind:value={tempRole}>
	<option value="student">Student</option>
	<option value="teacher">Teacher</option>
</select>

<!-- ❌ WRONG - Shadcn Checkbox directly -->
<Checkbox bind:checked={tempIsTest} />
```

**Solution:**

```svelte
<!-- ✅ CORRECT - always use MySelect -->
<MySelect
	type="single"
	bind:value={tempRole}
	items={[
		{ value: 'student', label: 'Student' },
		{ value: 'teacher', label: 'Teacher' }
	]}
/>

<!-- ✅ CORRECT - always use MyCheckbox -->
<MyCheckbox bind:checked={tempIsTest} label="Test account" />
```

---

### 11. Missing Fields in API SELECT Query (NEW)

**Problem:**

```typescript
// ❌ WRONG - incomplete SELECT query
const { data: users } = await supabase
	.from('profiles')
	.select('id, email, firstname, lastname')
	.eq('class_id', classId);
// Missing: school_id, is_test, and other fields needed for inline editing
```

**Result:**

- Data appears to save successfully
- But after page reload, changes to missing fields are lost
- Happens when different endpoints load users (e.g., by search vs by class)
- Very confusing for users - "I saved it but it disappeared!"

**Solution:**

```typescript
// ✅ CORRECT - include ALL fields needed for inline editing
const { data: users } = await supabase
	.from('profiles')
	.select(
		`
    id,
    email,
    firstname,
    lastname,
    gender,
    role,
    school_id,
    is_test,
    avatar_url,
    created_at,
    updated_at,
    schools (name),
    class_members (class_id)
  `
	)
	.eq('class_id', classId);
```

**How to avoid:**

1. Create a constant for the SELECT query string used across all user-fetching endpoints
2. Or better: Create a reusable function that always returns the complete user data
3. Test inline editing after loading users from EACH different endpoint
4. Check browser Network tab to verify all fields are present in response

**Example reusable pattern:**

```typescript
// src/lib/server/queries/users.ts
export const USER_SELECT_QUERY = `
  *,
  schools (name),
  class_members (class_id)
`;

// Then in all endpoints:
const { data: users } = await supabase
	.from('profiles')
	.select(USER_SELECT_QUERY)
	.eq('class_id', classId);
```

---

## Implementation Checklist

Use this checklist when implementing inline editing on a new page:

### Phase 1: Setup and Planning

- [ ] Identify all editable fields and their types
- [ ] Identify read-only fields
- [ ] Design entity type with proper TypeScript definitions
- [ ] Plan API endpoint structure (PATCH for partial updates)
- [ ] Create Zod validation schema for API

### Phase 2: State Management

- [ ] Create editing flag for each editable field (except checkboxes and MySelect invisible)
- [ ] Create temp value variable for each editable field
- [ ] Add proper TypeScript types for all temp values
- [ ] For nullable MySelect fields, use `string` type with `''` for null (not `string | null`)
- [ ] Implement `$derived` change detection comparing ALL temp values
- [ ] For MySelect fields, convert `''` to `null` in change detection: `(tempValue || null)`
- [ ] Implement `$derived.by` changedFields Set for per-field save feedback (NEW)
- [ ] Create `initTempValues()` function
- [ ] In `initTempValues()`, convert null to `''` for MySelect fields: `user.field || ''`
- [ ] Force boolean conversion for nullable boolean fields (`!!value`)

### Phase 3: Field Implementations

For each field:

**Text Fields:**

- [ ] Add activation handler (onclick)
- [ ] Add keyboard handler (Enter, ESC)
- [ ] Add blur handler with 100ms delay
- [ ] Implement conditional rendering (edit vs display)
- [ ] Display mode shows temp value (not original)
- [ ] Empty value fallback (`|| '—'`)

**Select Fields (RECOMMENDED: MySelect invisible variant):**

- [ ] Use MySelect component with `variant="invisible"` (never native select)
- [ ] No editing flag needed
- [ ] No activation handler needed
- [ ] No conditional rendering needed
- [ ] Use empty string `''` for null values in temp state
- [ ] Convert `''` to `null` in change detection and save
- [ ] Add per-field save spinner next to label (optional)

**Select Fields (Legacy: Toggle display/edit mode):**

- [ ] Use MySelect component (never native select)
- [ ] Add activation handler (onclick)
- [ ] Implement `onValueChange` to auto-close
- [ ] Map values to display labels in display mode
- [ ] Handle null/empty values properly

**Boolean Fields:**

- [ ] Use MyCheckbox component (never native checkbox)
- [ ] No editing flag needed (always editable)
- [ ] Direct binding with `bind:checked`
- [ ] Force boolean conversion in `initTempValues()`

**Read-Only Fields:**

- [ ] No editing flag or temp value
- [ ] No onclick handler
- [ ] Muted text styling
- [ ] Shows original value (not temp)

### Phase 4: Event Handlers

- [ ] Implement `closeField()` function with switch statement
- [ ] Implement `cancelFieldEdit()` with revert logic
- [ ] Implement `resetAllChanges()` function
- [ ] All handlers have null guards (`if (!selectedEntity) return`)
- [ ] Blur handlers have 100ms delay

### Phase 5: API Integration

**Backend:**

- [ ] Create PATCH endpoint at `/api/[resource]/[id]`
- [ ] Add authentication check
- [ ] Add authorization check
- [ ] Validate UUID format for ID parameter
- [ ] Create Zod validation schema (all fields optional)
- [ ] Validate request body with Zod
- [ ] Check entity exists
- [ ] Build partial update object (only provided fields)
- [ ] Update entity in database
- [ ] Fetch updated entity with relations
- [ ] Return success response with full entity
- [ ] Proper error handling with typed errors

**Frontend:**

- [ ] Implement `saveAllChanges()` function
- [ ] Add loading state (`isSavingAll`)
- [ ] Guard clause: exit if no changes or already saving
- [ ] Build updates object with ALL temp values
- [ ] Convert MySelect `''` values back to `null` for API: `tempValue || null`
- [ ] Send PATCH request with proper headers
- [ ] Handle response errors
- [ ] Update original entity from server response
- [ ] Call `initTempValues()` with saved data
- [ ] Close all editing modes
- [ ] Update any related lists (search results, filters)
- [ ] Show success/error toast notifications
- [ ] Per-field spinners display next to changed fields during save (optional)

### Phase 6: UI/UX Polish

- [ ] Display mode has no visible borders (or use MySelect invisible variant)
- [ ] Hover effect on editable fields (color change)
- [ ] Tooltips on editable fields ("Click to edit") - not needed for invisible variant
- [ ] Focus styles for edit mode
- [ ] Save button appears only when `hasChanges` is true
- [ ] Save button shows loading spinner during save
- [ ] Save button disabled during save
- [ ] Reset button with outline variant
- [ ] Sticky save/reset button container
- [ ] Button icons (Save, RotateCcw)
- [ ] Per-field spinners next to labels of changed fields (NEW - optional but recommended)

### Phase 7: Testing

- [ ] Test each field: click, edit, Enter, ESC, blur
- [ ] Test change detection for each field
- [ ] Test save with single field change
- [ ] Test save with multiple field changes
- [ ] Test reset functionality
- [ ] Test with null/empty values
- [ ] Test with invalid input (should be caught by Zod)
- [ ] Test API error handling
- [ ] Test concurrent edits (multiple fields open)
- [ ] Test keyboard navigation (Tab, Enter, ESC)
- [ ] Test MySelect invisible variant appears correctly (plain text, chevron on hover)
- [ ] Test per-field spinners appear only for changed fields during save (NEW)
- [ ] Test loading entity from ALL different endpoints (search, filter, etc.) (NEW)
- [ ] Verify all editable fields are present in API response from each endpoint (NEW)

### Phase 8: Security and Validation

- [ ] All API inputs validated with Zod
- [ ] String fields have min/max length limits
- [ ] Numeric fields have bounds
- [ ] UUIDs validated with `.uuid()`
- [ ] Enum fields use `.enum()`
- [ ] At least one field required (`.refine()`)
- [ ] Authentication check on endpoint
- [ ] Authorization check on endpoint

### Phase 9: Documentation

- [ ] Add JSDoc comments to functions
- [ ] Document field types and constraints
- [ ] Document API endpoint in code comments
- [ ] Update related documentation files

---

## Summary

The inline editing pattern provides a powerful, user-friendly way to edit structured data in UbuMaths. Key principles:

1. **Ultra-subtle design** - fields look like regular content until hovered
2. **MySelect invisible variant (NEW)** - select fields appear as plain text, always editable, no mode switching
3. **Single save button** - edit multiple fields, save once
4. **Per-field save feedback (NEW)** - spinners appear next to labels of changed fields during save
5. **Persistent temp values** - closing a field keeps changes until saved or reset
6. **Change detection** - automatic via `$derived` reactive state
7. **Per-field change tracking (NEW)** - `$derived.by` Set tracks which fields changed
8. **Always use MySelect and MyCheckbox** - never native components
9. **String conversion for nullable MySelect values (NEW)** - use `''` for null, convert in comparison/save
10. **Always validate with Zod** - no exceptions for API endpoints
11. **Complete API SELECT queries (NEW)** - ensure all editable fields are included in all endpoints

By following this pattern consistently, we ensure a uniform, high-quality editing experience across the entire application.

---

**Reference Implementation:** `/Users/david/Coding/js/ubumaths/src/routes/(protected)/dashboard/admin/users/+page.svelte`

**Related Documentation:**

- [UI Components Guide](ui-components.md#myselect-component)
- [Quality Standards](quality-standards.md#input-validation-with-zod)
- [Best Practices](best-practices.md#svelte-5-runes)
