# SSR-Compatible Supabase Client Usage

Essential patterns for using Supabase clients correctly in SvelteKit's SSR environment.

**Last Updated**: 2025-11-01

---

## Overview

UbuMaths uses SvelteKit with server-side rendering (SSR), which means code runs in both server and browser contexts. Supabase clients must be used correctly to avoid issues like multiple client instances, authentication conflicts, and SSR/hydration mismatches.

---

## The Problem: Multiple GoTrueClient Instances

### Warning You Might See

```
[WARN] Multiple GoTrueClient instances detected. This may cause authentication issues.
```

### Why It Happens

When you import `supabaseClient.ts` directly in components:

```typescript
// ❌ WRONG - Creates duplicate client instances
import { supabaseClient } from '$lib/server/supabaseClient';
```

**What happens:**

1. **Server instance** created during SSR (uses cookies)
2. **Browser instance** created during hydration (uses localStorage)
3. Both instances compete for auth state → **conflicts and warnings**

---

## The Solution: Use `data.supabase` from Layout

### ✅ CORRECT Pattern

**Step 1: Root layout provides Supabase client**

```typescript
// src/routes/+layout.ts
export const load = async ({ data, depends }) => {
	depends('supabase:auth');

	return {
		supabase, // ← Supabase client provided to all child routes
		session: data.session,
		user: data.user
	};
};
```

**Step 2: Components receive it from layout data**

```svelte
<!-- MyComponent.svelte -->
<script lang="ts">
	import type { PageData } from './$types';

	// ✅ CORRECT: Use the Supabase client from layout data
	let { data }: { data: PageData } = $props();

	async function fetchMessages() {
		// Use data.supabase - the SAME client instance used everywhere
		const { data: messages, error } = await data.supabase.from('messages').select('*');

		if (error) {
			console.error('Failed to fetch messages:', error);
		}
		return messages;
	}
</script>
```

---

## Real-World Examples from UbuMaths

### Before: Multiple Client Instances ❌

```svelte
<!-- src/lib/components/teacher/StudentQuickActionsTable.svelte (OLD) -->
<script lang="ts">
	import { supabaseClient } from '$lib/server/supabaseClient'; // ❌ Direct import

	async function removeVipCard(studentId: string, cardId: string) {
		// This creates a SECOND client instance during SSR
		const { error } = await supabaseClient.rpc('remove_student_vip_card', {
			p_student_id: studentId,
			p_card_id: cardId
		});
	}
</script>
```

**Problems:**

- Multiple GoTrueClient instances warning
- Auth state conflicts between server/browser
- Potential race conditions with cookies vs localStorage

---

### After: Single Client Instance ✅

**Solution 1: Use API endpoint (recommended for mutations)**

```svelte
<!-- src/lib/components/teacher/StudentQuickActionsTable.svelte (NEW) -->
<script lang="ts">
	// No Supabase import needed!

	async function removeVipCard(studentId: string, cardId: string) {
		// ✅ Call API endpoint instead (server-side only)
		const response = await fetch('/api/rewards/vip-cards/remove', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ studentId, cardId })
		});

		if (!response.ok) {
			const { message } = await response.json();
			throw new Error(message);
		}

		return response.json();
	}
</script>
```

**Benefits:**

- No client-side Supabase client needed
- Server-side security validation
- Zod input validation
- Proper error handling
- Single source of truth for auth

---

**Solution 2: Use `data.supabase` (for queries)**

```svelte
<!-- src/routes/(protected)/messages/compose/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';

	// ✅ Receive Supabase client from layout
	let { data }: { data: PageData } = $props();

	async function loadRecipients() {
		// Use the SAME client instance as everywhere else
		const { data: profiles, error } = await data.supabase
			.from('profiles')
			.select('id, firstname, lastname')
			.order('firstname');

		return profiles;
	}
</script>
```

**Benefits:**

- Single client instance across entire app
- Works correctly in both SSR and browser
- No hydration mismatches
- Proper cookie management

---

## Decision Tree: When to Use What

```
Need to interact with Supabase?
│
├─ Is it a MUTATION (insert/update/delete/RPC)?
│  └─ ✅ Create API endpoint (e.g., /api/rewards/vip-cards/remove/+server.ts)
│     - Use Zod validation
│     - Use requireAuth() middleware
│     - Use locals.supabase (provided by hooks.server.ts)
│
└─ Is it a QUERY (select)?
   │
   ├─ In a +page.svelte or component?
   │  └─ ✅ Use data.supabase from PageData/LayoutData props
   │     - Receives client from +layout.ts
   │     - Same instance everywhere
   │
   └─ In a +page.server.ts or +layout.server.ts?
      └─ ✅ Use locals.supabase from RequestEvent
         - Provided by hooks.server.ts
         - Server-only, uses cookies
```

---

## Complete Migration Example

### Before: Direct Import Pattern ❌

```svelte
<!-- src/routes/(protected)/dashboard/teacher/message-templates/+page.svelte (OLD) -->
<script lang="ts">
	import { supabaseClient } from '$lib/server/supabaseClient'; // ❌ Direct import
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	let templates = $state<MessageTemplate[]>([]);

	async function loadTemplates() {
		const { data: results, error } = await supabaseClient
			.from('message_templates')
			.select('*')
			.eq('owner_id', data.profile.id);

		if (!error) {
			templates = results;
		}
	}

	// Load on mount
	$effect(() => {
		loadTemplates();
	});
</script>
```

**Problems:**

- ❌ Multiple GoTrueClient warning
- ❌ Separate client instance in SSR and browser
- ❌ Potential auth conflicts

---

### After: Using data.supabase ✅

```svelte
<!-- src/routes/(protected)/dashboard/teacher/message-templates/+page.svelte (NEW) -->
<script lang="ts">
	import type { PageData } from './$types';

	// ✅ Receive Supabase client from layout
	let { data } = $props<{ data: PageData }>();

	let templates = $state<MessageTemplate[]>([]);

	async function loadTemplates() {
		// ✅ Use data.supabase - single client instance
		const { data: results, error } = await data.supabase
			.from('message_templates')
			.select('*')
			.eq('owner_id', data.profile.id);

		if (!error) {
			templates = results;
		}
	}

	// Load on mount
	$effect(() => {
		loadTemplates();
	});
</script>
```

**Benefits:**

- ✅ No warnings
- ✅ Single client instance
- ✅ Proper SSR/CSR coordination
- ✅ Same auth state everywhere

---

## API Endpoint Pattern (Mutations)

For mutations (insert/update/delete/RPC), create dedicated API endpoints with proper validation.

### Example: Remove VIP Card Endpoint

```typescript
// src/routes/api/rewards/vip-cards/remove/+server.ts
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';

// ✅ SECURITY: Zod validation schema
const removeVipCardSchema = z.object({
	studentId: z.string().uuid('Invalid student ID'),
	cardId: z.string().min(1, 'Card ID is required').max(50, 'Card ID too long')
});

export const POST: RequestHandler = async ({ request, locals }) => {
	// ✅ SECURITY: Require authentication
	const { user } = await requireAuth(locals);

	// ✅ Use locals.supabase (provided by hooks.server.ts)
	const supabase = locals.supabase;

	// ✅ SECURITY: Validate input with Zod
	const body = await request.json();
	const validation = removeVipCardSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { studentId, cardId } = validation.data;

	// ✅ SECURITY: Verify teacher role
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
		throw error(403, 'Only teachers and admins can remove VIP cards');
	}

	// ✅ Call RPC with additional server-side checks
	const { data: success, error: rpcError } = await supabase.rpc('remove_student_vip_card', {
		p_student_id: studentId,
		p_card_id: cardId
	});

	if (rpcError) {
		throw error(500, 'Failed to remove VIP card');
	}

	if (!success) {
		throw error(404, 'No matching VIP card found to remove');
	}

	return json({ success: true });
};
```

**Key Points:**

- ✅ Uses `locals.supabase` (server-only client)
- ✅ Zod validation on all inputs
- ✅ Authentication check with `requireAuth()`
- ✅ Authorization check (teacher/admin role)
- ✅ Proper error handling
- ✅ Returns JSON response

---

## Security Pattern: Session After Verification

### The Problem with `getSession()`

Supabase shows this warning:

```
Using the user object from supabase.auth.getSession() could be insecure!
Use supabase.auth.getUser() instead which authenticates with the Auth server.
```

**Why?** Session data comes from cookies/localStorage which can be tampered with.

---

### ✅ CORRECT Pattern: Verify First, Then Extract

```typescript
// src/routes/(protected)/dashboard/friends/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// STEP 1: Verify with Auth server (validates the user is real)
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();

	if (userError || !user) {
		return { accessToken: null };
	}

	// STEP 2: Now safe to get session (after verification)
	const {
		data: { session }
	} = await supabase.auth.getSession();

	// STEP 3: Extract ONLY what you need (not the full session)
	return {
		accessToken: session?.access_token ?? null
	};
};
```

**Why this is safe:**

1. `getUser()` validates with Supabase Auth server first ✅
2. Only after verification, we get the session ✅
3. We only return `accessToken` (not full session object) ✅
4. Minimal data exposure ✅

---

### ❌ INSECURE Pattern (Don't Do This)

```typescript
// ❌ WRONG - No verification before using session
export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const {
		data: { session }
	} = await supabase.auth.getSession();

	// Directly using session data WITHOUT verification
	return { session }; // ❌ Could be tampered with!
};
```

**Why it's insecure:**

- No validation with Auth server
- Session could be forged/modified
- Returns entire session object (over-exposure)

---

## Performance Optimization: Dashboard Hydration

### Problem: Duplicate API Calls During Hydration

During SSR → CSR transition, components mount twice:

1. **Server-side** during SSR
2. **Client-side** during hydration

Without guards, `$effect()` runs twice → **duplicate API calls**.

---

### ✅ SOLUTION: Initialization Guard

```svelte
<!-- src/routes/(protected)/dashboard/+layout.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { activityStore } from '$lib/stores/activity.svelte';
	import { notificationStore } from '$lib/stores/notifications.svelte';

	let hasInitialized = $state(false);

	// ✅ Load data only ONCE (after hydration)
	onMount(() => {
		if (!hasInitialized) {
			hasInitialized = true;

			// Load notifications and activity in parallel
			Promise.all([notificationStore.fetchNotifications(), activityStore.fetchActivity()]);
		}
	});
</script>
```

**Before (6 API calls):**

```
SSR:  fetchNotifications() → DB query
      fetchActivity() → DB query
      (other effects...) → 4 more DB queries

CSR:  fetchNotifications() → DB query (duplicate!)
      fetchActivity() → DB query (duplicate!)
      (other effects...) → 4 more DB queries (duplicates!)

Total: 12 queries (6 duplicates!)
```

**After (2 API calls):**

```
SSR:  (skipped - hasInitialized = false)

CSR:  hasInitialized = true
      fetchNotifications() → DB query
      fetchActivity() → DB query

Total: 2 queries ✅
```

**Performance Improvement:** 6 API calls → 2 API calls (67% reduction)

---

## Summary: Best Practices

### ✅ DO

1. **Use `data.supabase`** from layout data in components (queries)
2. **Use `locals.supabase`** in server load functions and API endpoints
3. **Create API endpoints** for mutations (with Zod validation)
4. **Verify with `getUser()`** before using `getSession()`
5. **Extract minimal data** from session (e.g., just `accessToken`)
6. **Use initialization guards** to prevent duplicate API calls during hydration

---

### ❌ DON'T

1. **Don't import `supabaseClient` directly** in components
2. **Don't use `getSession()` without `getUser()` verification first**
3. **Don't return full `session` objects** (only extract what you need)
4. **Don't perform mutations directly** in components (use API endpoints)
5. **Don't call APIs in `$effect()` without hydration guards**

---

## Migration Checklist

When refactoring existing code:

- [ ] Remove direct imports of `supabaseClient` in components
- [ ] Change queries to use `data.supabase` from PageData/LayoutData
- [ ] Move mutations to dedicated API endpoints
- [ ] Add Zod validation to all API endpoints
- [ ] Add `requireAuth()` middleware to protected endpoints
- [ ] Verify with `getUser()` before using `getSession()`
- [ ] Extract only needed fields from session (not full object)
- [ ] Add hydration guards to prevent duplicate API calls
- [ ] Test in both SSR and CSR contexts
- [ ] Check for "Multiple GoTrueClient" warnings (should be gone)

---

## Related Documentation

- **[Authentication System](../features/authentication/README.md)** - Complete auth flow
- **[Best Practices](./best-practices.md)** - General coding standards
- **[Quality Standards](./quality-standards.md)** - Input validation with Zod
- **[API Documentation](../features/rewards/README.md#api-endpoints)** - API endpoint patterns

---

[← Back to Claude Docs](./README.md)
