# Best Practices

Essential coding standards and patterns for UbuMaths development.

## Erreurs courantes à éviter

### ❌ DON'T (Anti-patterns)

**Svelte 5 deprecations:**

```svelte
<!-- ❌ Old Svelte 4 syntax -->
<script>
	export let myProp; // Use $props()
	$: computed = x * 2; // Use $derived()
	$: {
		/* effect */
	} // Use $effect()
</script>
```

**TypeScript anti-patterns:**

```typescript
// ❌ Never use 'any' type (enforced via @typescript-eslint/no-explicit-any)
const data: any = fetchData(); // Disables all type checking
const result: any = processUser(user); // Breaks type safety
function handleEvent(event: any) {} // Impossible to catch bugs

// ❌ Type assertion without validation (CRITICAL SECURITY ISSUE)
const data: UserData = await request.json(); // TypeScript types don't run at runtime!
const { userId, amount } = data; // Unsafe - could be anything!

// ❌ Weak manual validation
if (!userId || typeof amount !== 'number') {
	/* ... */
} // Incomplete, allows NaN, Infinity, negative values
```

---

### ✅ DO (Best Practices)

**Svelte 5 runes syntax:**

```svelte
<script>
	// Reactive state
	let count = $state(0); // Replaces reactive variable declarations

	// Derived values
	let doubled = $derived(count * 2); // Replaces $: computed =

	// Side effects
	$effect(() => {
		console.log(`count is ${count}`); // Replaces $: { effect }
	});

	// Component props
	let { myProp } = $props(); // Replaces export let

	// Bindable props (two-way binding)
	let { value = $bindable() } = $props();
</script>
```

**TypeScript best practices:**

```typescript
// ✅ Use proper types from database
import type { Database } from '$lib/types/database';
type User = Database['public']['Tables']['users']['Row'];

const data: User = fetchData(); // Specific, type-safe type
const result: ProcessedUser = processUser(user); // Define custom types
function handleEvent(event: MouseEvent) {} // Use specific event types

// ✅ For truly unknown types, use 'unknown' with type guards
const data: unknown = fetchData();
if (isUser(data)) {
	// Now TypeScript knows data is User
}

// ✅ Zod validation with type inference (MOST SECURE)
import { userSchema } from '$lib/server/validation/users';
const validation = userSchema.safeParse(await request.json());
if (!validation.success) {
	throw error(400, validation.error.issues[0].message);
}
const data = validation.data; // Type-safe AND runtime-validated!
```

---

## Why Never Use `any`

**Critical Requirement**: Never use the `any` type. This is enforced via ESLint rule `@typescript-eslint/no-explicit-any`.

### Why it matters

- `any` **completely disables** TypeScript's type checking
- Hides bugs that would otherwise be caught at compile time
- Creates security vulnerabilities (especially with user input)
- Makes code maintenance and refactoring dangerous
- Project example: Fixed 209 `any` violations in test files (2025-10-27)

### Alternatives

**Option 1: Use specific types**

```typescript
// ❌ Wrong
function process(data: any) {
	return data.value * 2;
}

// ✅ Correct
function process(data: { value: number }) {
	return data.value * 2;
}
```

**Option 2: Use `unknown` with type guards**

```typescript
// ✅ For truly unknown data
const data: unknown = fetchData();

// Type guard function
function isUser(data: unknown): data is User {
	return typeof data === 'object' && data !== null && 'id' in data && 'email' in data;
}

if (isUser(data)) {
	// Now TypeScript knows data is User
	console.log(data.email);
}
```

**Option 3: Use generics**

```typescript
// ✅ For reusable functions
function fetchData<T>(id: string): Promise<T> {
	return fetch(`/api/${id}`).then((r) => r.json());
}

const user = await fetchData<User>('123');
```

**Option 4: Use Zod validation for user input** (RECOMMENDED)

```typescript
// ✅ For API/form endpoints
import { z } from 'zod';

const userSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email()
});

const validation = userSchema.safeParse(await request.json());
if (!validation.success) {
	throw error(400, 'Invalid user data');
}
// validation.data is now User type, guaranteed to be valid
```

**Reference**: [Type Safety Patterns](../development/type-safety-patterns.md)

---

## Svelte 5 Runes (Complete Guide)

Svelte 5 introduces runes: special functions that direct the compiler to handle state, reactivity, and side effects.

### $state: Reactive State

**Purpose**: Create reactive state variables that trigger component updates

```typescript
// Simple state
let count = $state(0);

// State with object
let person = $state({ name: 'Alice', age: 30 });

// State with array
let items = $state<Item[]>([]);
```

**Usage in components:**

```svelte
<script>
	let count = $state(0);

	function increment() {
		count++; // Direct mutation triggers reactivity
	}
</script>

<p>Count: {count}</p>
<button onclick={increment}>Increment</button>
```

**Important**: With `$state`, you mutate directly (no immutability required). Svelte handles reactivity automatically.

---

### $derived: Computed Values

**Purpose**: Create values that automatically update when dependencies change

```typescript
// Simple derived value
let count = $state(5);
let doubled = $derived(count * 2);

// Complex computation
let person = $state({ firstName: 'John', lastName: 'Doe' });
let fullName = $derived(`${person.firstName} ${person.lastName}`);

// Conditional derived
let status = $state('idle');
let isLoading = $derived(status === 'loading');
```

**Key difference from $effect**: `$derived` is for values, `$effect` is for side effects

```svelte
<script>
	let count = $state(0);
	let doubled = $derived(count * 2); // ✅ Use $derived for values

	$effect(() => {
		// ✅ Use $effect only for side effects (API calls, subscriptions)
		console.log(`Count changed to ${count}`);
	});
</script>
```

---

### $effect: Side Effects

**Purpose**: Run code when dependencies change (API calls, subscriptions, timers, etc.)

```typescript
// Basic effect
let count = $state(0);
$effect(() => {
	console.log(`count is now ${count}`);
});

// Multiple dependencies
let x = $state(1);
let y = $state(2);
$effect(() => {
	console.log(`x or y changed: ${x}, ${y}`);
});

// Cleanup function
$effect(() => {
	const timer = setInterval(() => {
		console.log('tick');
	}, 1000);

	return () => clearInterval(timer); // Cleanup on effect destroy
});
```

**Common use cases**:

- Fetching data
- Syncing with external API
- Setting up subscriptions
- Creating timers/intervals
- Updating document title
- Logging analytics

**Important**: Use `$effect` ONLY for side effects, not for deriving values (use `$derived` instead).

---

### $props: Component Properties

**Purpose**: Receive props from parent components

```typescript
// Basic props
let { title, count = 0 } = $props();

// Typed props
let {
	title,
	count = 0,
	items = []
} = $props<{
	title: string;
	count?: number;
	items?: Item[];
}>();

// Renaming
let { myProp: prop } = $props();
```

**Usage:**

```svelte
<!-- MyComponent.svelte -->
<script>
	let { title, count = 0 } = $props();
</script>

<!-- Parent -->
<MyComponent title="Hello" count={5} />

<h1>{title}</h1>
<p>Count: {count}</p>
```

---

### $bindable: Two-Way Binding

**Purpose**: Allow parent components to bind to child component state

```svelte
<!-- MyInput.svelte -->
<script>
	let { value = $bindable('') } = $props();
</script>

<input bind:value />

<!-- Parent -->
<script>
	let userInput = $state('');
</script>

<MyInput bind:value={userInput} />
<p>You typed: {userInput}</p>
```

**Key points**:

- Only works with props decorated with `$bindable()`
- Enables two-way synchronization between parent and child
- Common use case: form inputs, controlled components

---

## Anti-patterns to Avoid

### ❌ Using `$:` reactive statements

```typescript
// ❌ OLD Svelte 4 syntax
$: double = count * 2;
$: if (count > 10) console.log('big');
```

**Why?** Svelte 5 has clearer runes for each purpose.

**Use instead:**

```typescript
// ✅ For computed values
let double = $derived(count * 2);

// ✅ For side effects
$effect(() => {
	if (count > 10) console.log('big');
});
```

---

### ❌ Using `export let`

```typescript
// ❌ OLD Svelte 4 syntax
export let title;
export let count = 0;
```

**Use instead:**

```typescript
// ✅ Svelte 5 syntax
let { title, count = 0 } = $props();
```

---

### ❌ Using `<svelte:component>`

```svelte
<!-- ❌ OLD pattern -->
<svelte:component this={MyComponent} />

<!-- ✅ Direct reference -->
<MyComponent />
```

---

## TypeScript Best Practices

### Strict Mode (Always Enabled)

The project uses `"strict": true` in `tsconfig.json`. This enables:

- `noImplicitAny`: No implicit `any` type
- `strictNullChecks`: Explicit null/undefined handling
- `strictFunctionTypes`: Strict function type checking
- `strictBindCallApply`: Strict function call binding
- And others...

**This is not negotiable**. All code must pass strict type checking.

---

### Proper Type Imports

```typescript
// ✅ Use 'type' keyword for type-only imports
import type { Database } from '$lib/types/database';
import type { User } from '$lib/types/users';

// ✅ Separate type and value imports
import type { User } from '$lib/types';
import { userSchema } from '$lib/validation';

// ❌ Avoid mixing if possible
import { User, userSchema } from '$lib/types'; // Fine if User is exported as type
```

---

### Extracting Types from Database

```typescript
// ✅ Extract types from your database schema
import type { Database } from '$lib/types/database';

// Get table row type
type User = Database['public']['Tables']['users']['Row'];

// Get insert type (for creating records)
type UserInsert = Database['public']['Tables']['users']['Insert'];

// Get update type
type UserUpdate = Database['public']['Tables']['users']['Update'];
```

---

### Custom Type Definitions

```typescript
// ✅ Define custom types for domain concepts
type UserId = string & { readonly __brand: 'UserId' };

function createUserId(id: string): UserId {
	if (!isValidUUID(id)) throw new Error('Invalid UUID');
	return id as UserId;
}

// Now you get type safety
const user = users.find((u) => u.id === userId); // Type-safe lookup
```

---

### Union Types and Discriminated Unions

```typescript
// ✅ Union types for multiple possibilities
type Result<T> = { success: true; data: T } | { success: false; error: string };

// ✅ Discriminated unions (type-safe narrowing)
type Question =
	| { type: 'multiple_choice'; choices: string[] }
	| { type: 'open_ended'; maxLength: number }
	| { type: 'matching'; pairs: [string, string][] };

function processQuestion(q: Question) {
	if (q.type === 'multiple_choice') {
		// TypeScript knows q.choices exists
		console.log(q.choices);
	}
}
```

---

### Avoid Type Assertions (Usually)

```typescript
// ❌ Type assertion hides errors
const data = somethingUncertain as User; // Silences type checker without validation!

// ✅ Use type guards instead
function isUser(data: unknown): data is User {
	return typeof data === 'object' && data !== null && 'id' in data && 'email' in data;
}

if (isUser(data)) {
	// TypeScript knows data is User
}

// ✅ Use Zod for validation + type assertion
const validation = userSchema.safeParse(data);
if (validation.success) {
	const user = validation.data; // Type-safe and validated!
}
```

**Exception**: Type assertions are OK when you're 100% certain of the type:

```typescript
// ✅ OK - you control the code that created it
const element = document.getElementById('my-input') as HTMLInputElement;
```

---

## Code Organization Order

Files should follow this structure:

```typescript
// 1. Imports (external, then internal)
import { supabase } from '$lib/server/supabase';
import type { User } from '$lib/types';

// 2. Type definitions
type Props = {
	userId: string;
	onLoad?: (user: User) => void;
};

// 3. Constants
const DEFAULT_TIMEOUT = 5000;
const VALID_STATUSES = ['active', 'inactive', 'pending'] as const;

// 4. Variables (usually state or stores)
let cache = new Map<string, User>();

// 5. Functions (utility, helper, then main logic)
function formatUserName(user: User): string {
	return `${user.firstName} ${user.lastName}`;
}

export async function loadUser(id: string): Promise<User> {
	// ...
}

// 6. Component export (for .svelte files)
let { userId } = $props<Props>();
```

---

## Performance Patterns

### Optimistic UI + Debouncing

For frequent server updates (counters, quantities), use optimistic updates with debouncing:

```typescript
let optimistic = $state<Record<string, number>>({});
let debounceTimer: ReturnType<typeof setTimeout>;

function handleUpdate(id: string, delta: number) {
	// 1. Optimistic update (instant UI feedback)
	optimistic[id] = (optimistic[id] || 0) + delta;

	// 2. Debounce server update (batch multiple changes)
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(async () => {
		try {
			await updateServer(id, optimistic[id]);
			optimistic[id] = 0; // Reset after success
		} catch (error) {
			optimistic[id] = 0; // Rollback on error
			toaster.error('Échec de la mise à jour');
		}
	}, 500);
}
```

**Benefits:**

- Instant UI feedback (no waiting for server)
- Automatic batching (10 clicks = 1 DB query)
- Automatic rollback on error

**Reference**: `src/routes/(protected)/dashboard/teacher/rewards/+page.svelte`

---

## Common Mistakes and How to Avoid Them

### Mutation Without $state

```typescript
// ❌ Won't be reactive
let count = 0;
count++; // No reactivity without $state

// ✅ Correct
let count = $state(0);
count++; // Now it's reactive
```

---

### Side Effects in Derived Values

```typescript
// ❌ Wrong - side effects in $derived
let total = $derived(() => {
	console.log('Computing total'); // Don't do this!
	return sum;
});

// ✅ Correct - separate concerns
let total = $derived(sum);
$effect(() => {
	console.log('Total changed to', total);
});
```

---

### Forgetting Dependency Arrays

```typescript
// ❌ Effect runs on every render
let count = $state(0);
let user = $state<User | null>(null);

$effect(() => {
	fetchData(user?.id); // Runs on every render!
});

// ✅ Use proper dependencies (automatic with $state)
$effect(() => {
	if (user?.id) {
		fetchData(user.id); // Runs only when user.id changes
	}
});
```

---

### Circular Dependencies

```typescript
// ❌ Creates infinite loop
let a = $state(0);
let b = $derived(a + 1);
$effect(() => {
	a = b * 2; // Modifying dependency in effect!
});

// ✅ Use unidirectional data flow
let count = $state(0);
let doubled = $derived(count * 2);
let quadrupled = $derived(doubled * 2);
```

---

## Supabase Client Usage (SSR-Compatible)

⚠️ **CRITICAL**: Never import `supabaseClient` directly in components.

**Problem**: Multiple GoTrueClient instances warning

```typescript
// ❌ WRONG - Creates duplicate client instances
import { supabaseClient } from '$lib/server/supabaseClient';
```

**Solution**: Use `data.supabase` from layout

```svelte
<script lang="ts">
	import type { PageData } from './$types';

	// ✅ CORRECT: Receive from layout data
	let { data }: { data: PageData } = $props();

	async function loadData() {
		// Use the SAME client instance everywhere
		const { data: results } = await data.supabase.from('table').select('*');
	}
</script>
```

**For mutations**: Create API endpoints instead

```typescript
// ✅ CORRECT: API endpoint with Zod validation
// src/routes/api/my-endpoint/+server.ts
export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase; // ✅ From hooks.server.ts

	// Validate, mutate, return
};
```

**📖 Complete Guide**: [SSR-Compatible Supabase Patterns](./ssr-supabase-patterns.md) - Essential patterns for SSR, security, and performance

---

## Server Load Functions: Locals Pattern (Updated 2025-11-02)

⚠️ **CRITICAL**: All server load functions MUST use `locals` to access user, profile, and supabase.

**Architecture Overview:**

The `userProfileHandle` hook in `hooks.server.ts` loads user and profile into `locals` once per request. This means:

- ✅ User and profile are available in ALL server load functions via `locals`
- ✅ No need for `await parent()` in child routes
- ✅ Single database query per request (efficient)
- ✅ Consistent pattern across the application

### ✅ Correct Pattern

```typescript
// src/routes/(protected)/dashboard/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// ✅ ALWAYS destructure from locals
	const { user, profile, supabase } = locals;

	// Verify authentication (should always pass in protected routes)
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// Verify profile exists (null check required for TypeScript)
	if (!profile) {
		throw error(500, 'Profile not found');
	}

	// Now use profile.role, profile.school_id, etc.
	const { data: classes } = await supabase
		.from('classes')
		.select('*')
		.eq('school_id', profile.school_id);

	return { classes };
};
```

### ❌ Deprecated Pattern (DO NOT USE)

```typescript
// ❌ OLD PATTERN - No longer used
export const load: PageServerLoad = async ({ parent, locals }) => {
	// ❌ Don't use parent() anymore
	const { user, profile } = await parent();
	const { supabase } = locals;

	// ...
};
```

**Why deprecated?**

- Requires `await parent()` in every route (extra complexity)
- Less efficient (multiple async calls)
- Inconsistent with new architecture

### Role-Based Access Control

```typescript
// Protected route requiring specific role
export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// ✅ ALWAYS check profile is not null before accessing properties
	if (!profile || profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	// Now safe to use profile
	const { data } = await supabase.from('admin_data').select('*');

	return { data };
};
```

### API Endpoints Pattern

```typescript
// src/routes/api/my-endpoint/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	// ✅ Same pattern for API endpoints
	const { user, profile, supabase } = locals;

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	if (!profile || profile.role !== 'teacher') {
		throw error(403, 'Teacher access required');
	}

	// Process request with validated user/profile
	const body = await request.json();
	// ... Zod validation ...

	return json({ success: true });
};
```

### Form Actions Pattern

```typescript
// +page.server.ts with actions
export const actions: Actions = {
	myAction: async ({ request, locals }) => {
		// ✅ Access from locals in form actions too
		const { user, profile, supabase } = locals;

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		if (!profile || profile.role !== 'admin') {
			return fail(403, { message: 'Admin access required' });
		}

		// Process form data
		const formData = await request.formData();
		// ... validation and processing ...

		return { success: true };
	}
};
```

### Key Benefits

1. **Performance**: User/profile loaded once per request (not per route)
2. **Simplicity**: No `await parent()` calls
3. **Type Safety**: TypeScript enforces null checks on `profile`
4. **Consistency**: Same pattern everywhere (load functions, API endpoints, form actions)

---

## Summary Checklist

Before submitting code:

- [ ] No `any` types (use `unknown` with type guards or specific types)
- [ ] All props use `$props()` (not `export let`)
- [ ] Derived values use `$derived` (not `$:`)
- [ ] Side effects use `$effect` (not `$:` blocks)
- [ ] Bindable props use `$bindable()`
- [ ] No type assertions without good reason
- [ ] All user input validated with Zod
- [ ] TypeScript strict mode passes
- [ ] Code organized correctly (imports → types → constants → variables → functions)
- [ ] Use `data.supabase` (not direct `supabaseClient` import)
- [ ] Mutations go through API endpoints (not direct RPC in components)
- [ ] Server load functions use `locals` pattern (not `await parent()`)
- [ ] Profile null checks in place (`if (!profile || profile.role !== 'role')`)
- [ ] Destructure from `locals`: `const { user, profile, supabase } = locals;`

---

[← Back to Claude Docs](./README.md)
