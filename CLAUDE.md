# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project is an educational math application created by a math teacher for his students. It makes heavy use of **MathLive** for mathematical input and rendering.

SvelteKit application built with:

- **Svelte 5** (latest with runes)
- **TypeScript** (strict mode enabled)
- **Tailwind CSS 4** (integrated via Vite plugin)
- **Skeleton UI v3** (UI component library with Tailwind integration)
- **MathLive** (mathematical formula editor and rendering)
- **Vercel** deployment (adapter configured)
- **pnpm** as package manager

## Development Commands

```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm preview          # Preview production build
pnpm check            # Run svelte-check for type checking
pnpm check:watch      # Watch mode for type checking
pnpm lint             # Run prettier and eslint checks
pnpm format           # Format code with prettier
pnpm test             # Run all tests (unit + e2e)
pnpm test:unit        # Run Vitest unit tests
pnpm test:e2e         # Run Playwright e2e tests
pnpm db:migrate       # Push pending migrations to Supabase
pnpm db:status        # Check database user/profile status
pnpm db:link          # Link to Supabase project
```

## Testing Architecture

The project uses a **dual-project Vitest setup** with separate configurations for client and server code:

### Client Tests (`*.svelte.test.ts` or `*.svelte.spec.ts`)

- Run in **browser environment** using Playwright provider
- Located anywhere in `src/` except `src/lib/server/`
- Setup file: `vitest-setup-client.ts`
- Use for: Component tests, Svelte-specific logic, browser APIs

### Server Tests (`*.test.ts` or `*.spec.ts`)

- Run in **Node environment**
- Excludes `*.svelte.*` test files
- Use for: Server-side logic, API routes, utilities

### E2E Tests

- Located in `e2e/` directory
- Run with Playwright against production build
- Port 4173 (production preview server)

## Project Structure and organization

- `src/routes/` - SvelteKit routes (file-based routing)
- `src/lib/` - Reusable components and utilities (accessible via `$lib` alias)
- `src/app.html` - HTML template
- `src/app.css` - Global styles
- `e2e/` - End-to-end tests

```
src/
├── lib/
│   ├── components/     # Reusable components
│   ├── server/        # Server-only utilities
│   ├── stores/        # Shared state
│   ├── utils/         # Shared utilities
|   └── types/          # typescript types
├── routes/
│   ├── (app)/         # Route groups
│   │   ├── +layout.svelte
│   │   └── dashboard/
│   ├── api/           # API routes
│   └── +layout.svelte
└── app.html
```

- Use the following ordering within a Svelte file:
  - Imports
  - Types
  - Constants
  - Variables
  - Functions
  - Components
- Use the following ordering within a TypeScript file. Make sure to put the Principal functions/exports first:
  - Imports
  - Constants
  - Variables
  - Principal Functions
  - Private Functions
  - Types

## Data Fetching Rules

- Use SvelteKit's load function for server-side data fetching. Prefer this always.
- Use SvelteKit's form actions for form submissions and mutations. Prefer this always.

## Code Style and Structure

1. Use early returns for improved readability.
2. Employ descriptive variable and function names.
3. Prefix event handler functions with "handle" (e.g., handleClick, handleKeyDown).
4. Use const instead of function when appropriate, and define types where possible.
5. Follow the DRY (Don't Repeat Yourself) principle.

## TypeScript Usage

1. Create interfaces or types for component props.
2. Leverage TypeScript's type inference when possible.
3. Use strict type checking.

## Build Configuration

- **Adapter**: Vercel (`@sveltejs/adapter-vercel`)
- **Preprocessor**: `vitePreprocess()` for TypeScript/PostCSS support
- **Tailwind**: Integrated via `@tailwindcss/vite` plugin (v4 uses Vite instead of PostCSS)
- TypeScript config extends `.svelte-kit/tsconfig.json` (auto-generated)

## UI Styling & Components

Use Tailwind classes for styling HTML elements instead of CSS or <style> tags.

### Skeleton UI v3

The application uses **Skeleton UI v3** for component styling and theming:

- **Documentation**: https://www.skeleton.dev/docs
- **Packages installed**:
  - `@skeletonlabs/skeleton` (core Tailwind utilities)
  - `@skeletonlabs/skeleton-svelte` (Svelte components)
  - `@tailwindcss/forms` (form styling plugin)

### Form Elements

Always use Skeleton UI's form classes for consistency:

```svelte
<!-- Text inputs -->
<input type="text" class="input" placeholder="Enter text" />

<!-- Textareas -->
<textarea class="textarea" rows="4" placeholder="Enter text"></textarea>

<!-- Select dropdowns -->
<select class="select">
	<option>Option 1</option>
</select>

<!-- Checkboxes -->
<input type="checkbox" class="checkbox" />

<!-- Radio buttons -->
<input type="radio" class="radio" />
```

### Navigation Components

Use Skeleton UI's Navigation components for navigation elements:

```svelte
<script>
	import { Navigation } from '@skeletonlabs/skeleton-svelte';
</script>

<!-- Vertical Rail Navigation (icon sidebar) -->
<Navigation.Rail>
	{#snippet tiles()}
		<Navigation.Tile label="Home" href="/home">
			<HomeIcon />
		</Navigation.Tile>
	{/snippet}
</Navigation.Rail>
```

### Important Notes

- Prefer Skeleton UI components and classes over custom Tailwind when available
- Use Skeleton's theming system with `surface-*` color utilities for dark/light mode support
- Form elements require `@tailwindcss/forms` plugin (already installed)
- When Tailwind classes don't work reactively in Svelte 5, use inline `style` attributes as a fallback

## Database Management (Supabase)

### Making Database Changes

All database schema modifications should be done using **Supabase CLI** with migrations:

1. **Claude creates migration files** in `supabase/migrations/` following the naming pattern:
   - Format: `<timestamp>_<description>.sql`
   - Example: `009_create_classes_table.sql`
   - Claude generates the complete SQL migration file with all necessary schema changes

2. **User manually pushes migrations** to remote database:

   ```bash
   pnpm db:migrate
   ```

   This command runs `npx supabase db push` which pushes all pending migrations to the remote database.

3. **Update TypeScript types** in `src/lib/types/database.ts` to match schema changes

4. **Update documentation** in `DATABASE_SCHEMA.md` to reflect changes

### Migration Workflow for Claude

When creating database migrations, Claude should:

1. Generate the timestamped `.sql` file in `supabase/migrations/`
2. Include complete SQL with:
   - Table creation/modification statements
   - Indexes, constraints, and foreign keys
   - Row Level Security (RLS) policies
   - Any necessary data migrations
3. Update TypeScript types in `src/lib/types/database.ts`
4. Update `DATABASE_SCHEMA.md` documentation
5. **Inform the user** to run `pnpm db:migrate` to push the migration

### Important Notes

- **DO NOT** make schema changes directly in the Supabase Dashboard
- Claude creates migration files but does NOT push them automatically
- User is responsible for running `pnpm db:migrate` to apply migrations
- Always create timestamped migration files for version control
- Test migrations locally when possible before pushing to remote
- Keep `DATABASE_SCHEMA.md` synchronized with actual schema

## Authentication System (Supabase)

This application uses **Supabase Auth** with a fully SSR-compatible implementation following official best practices.

### Architecture Overview

The authentication system uses:
- **@supabase/ssr** for server-side rendering support
- **@supabase/supabase-js** for Supabase client
- Server-side cookie management (NOT localStorage)
- Token verification with `getUser()` before using sessions
- Real-time auth state synchronization between server and client

### Key Files

```
src/
├── hooks.server.ts                      # Server hook - creates Supabase client, session verification
├── app.d.ts                            # TypeScript types for locals, session, etc.
├── routes/
│   ├── +layout.server.ts               # Root layout - verifies session, returns auth data
│   ├── +layout.ts                      # Client layout - creates browser client, auth listener
│   │
│   ├── (public)/                       # Public route group (no auth required)
│   │   ├── +page.svelte                # Home page
│   │   ├── login/
│   │   │   ├── +page.svelte            # Login form with "Forgot password?" link
│   │   │   └── +page.server.ts         # Server-side login action
│   │   ├── signup/
│   │   │   ├── +page.svelte            # Signup form with password strength indicator
│   │   │   └── +page.server.ts         # Server-side signup action
│   │   └── auth/
│   │       ├── logout/
│   │       │   └── +server.ts          # Server-side logout endpoint
│   │       ├── confirm/
│   │       │   └── +server.ts          # Email confirmation & password reset token handler
│   │       ├── reset-password/
│   │       │   ├── +page.svelte        # Request password reset form
│   │       │   └── +page.server.ts     # Send reset email action
│   │       └── update-password/
│   │           ├── +page.svelte        # Update password form (with strength indicator)
│   │           └── +page.server.ts     # Update password action
│   │
│   └── (protected)/                    # Protected route group (auth required)
│       ├── +layout.server.ts           # Auth check for ALL protected routes
│       └── dashboard/
│           ├── +layout.server.ts       # Dashboard-specific configuration
│           ├── +layout.svelte          # Dashboard layout (sidebar, header)
│           ├── +page.svelte            # Main dashboard (role-based views)
│           └── admin/                  # Admin-only routes
│
├── lib/
│   ├── server/
│   │   ├── supabase.ts                 # Server hook implementation
│   │   └── auth.ts                     # Auth utilities (requireAuth, requireRole, etc.)
│   ├── utils/
│   │   └── passwordStrength.ts         # Password strength calculation utility
│   └── supabaseClient.ts               # ⚠️ DEPRECATED - Do not use (see file comments)
```

**Route Groups Explanation:**
- Parentheses `()` create layout groups without affecting URLs
- `(public)/login/` → accessible at `/login` (public)
- `(protected)/dashboard/` → accessible at `/dashboard` (requires auth)

### Authentication Flow

#### Server Hook (`hooks.server.ts`)
1. Creates request-specific Supabase client with cookie handlers
2. Provides `safeGetSession()` function that:
   - Calls `getUser()` to verify user with Supabase auth server
   - Only after verification, gets session tokens
   - Returns verified session and user objects

#### Root Layout Server (`+layout.server.ts`)
1. Calls `safeGetSession()` to get verified auth data
2. Fetches user profile (includes role for RBAC)
3. Returns session, user, profile, and cookies to client

#### Root Layout Client (`+layout.ts`)
1. Creates browser or server Supabase client based on environment
2. Sets up `onAuthStateChange` listener (browser only)
3. When auth changes (login/logout), calls `invalidate('supabase:auth')`
4. This triggers re-run of server load functions → verified data flows to UI

### Available Auth Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/login` | GET/POST | Login form with email/password |
| `/signup` | GET/POST | Signup form with password strength indicator |
| `/auth/logout` | POST | Server-side logout |
| `/auth/confirm` | GET | Email confirmation & password reset token handler |
| `/auth/reset-password` | GET/POST | Request password reset email |
| `/auth/update-password` | GET/POST | Set new password after reset |

### Password Reset Flow

1. User clicks "Forgot password?" on login page
2. Enters email at `/auth/reset-password`
3. Server sends reset email (Supabase)
4. User clicks link in email → lands at `/auth/confirm?token_hash=...&type=recovery`
5. Server verifies token, creates temp session, redirects to `/auth/update-password`
6. User enters new password (with strength indicator)
7. Server updates password, user is logged in

### Server-Side Auth Utilities

Located in `src/lib/server/auth.ts`:

```typescript
// Require authentication (redirect to login if not authenticated)
requireAuth(user);

// Require specific role(s) (throw 403 if user doesn't have role)
requireRole(profile, 'teacher');
requireRole(profile, ['teacher', 'admin']);

// Check role without throwing (for conditional rendering)
if (hasRole(profile, 'admin')) { /* ... */ }
if (hasAnyRole(profile, ['teacher', 'admin'])) { /* ... */ }

// Get user profile with role
const profile = await getUserProfile(supabase, userId);
```

### Role-Based Access Control (RBAC)

Users have one of three roles (stored in `profiles.role`):
- `student`: Basic user access
- `teacher`: Can manage classes and assignments
- `admin`: Full system access

Use `requireRole()` in `+page.server.ts` or `+layout.server.ts` to protect routes.

### Important Rules

1. **Always use server-side form actions** for auth operations (login, signup, logout, password reset)
   - Do NOT call `supabase.auth.*` methods directly in components
   - Use `method="POST"` with `use:enhance` directive

2. **Never trust client-side session data**
   - Always verify with `safeGetSession()` on the server
   - Use `getUser()` before `getSession()` to validate tokens

3. **Do NOT use `src/lib/supabaseClient.ts`** in production code
   - This file is deprecated (not SSR-compatible)
   - Use `locals.supabase` in server code
   - Use `data.supabase` in client components

4. **Configure Supabase email redirects** in dashboard:
   - Email confirmation: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`
   - Password reset: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

5. **Use password strength utility** for password inputs:
   ```typescript
   import { calculatePasswordStrength } from '$lib/utils/passwordStrength';
   const strength = calculatePasswordStrength(password);
   ```

### Adding New Protected Routes

**Recommended Approach:** Add routes to the `(protected)/` group for automatic authentication.

#### Option 1: Use (protected) Route Group (Automatic Auth) ⭐ **RECOMMENDED**
```typescript
// Create: src/routes/(protected)/my-new-route/+page.svelte
// Authentication is AUTOMATIC - no need to call requireAuth()!

// If you need the user/profile data:
// src/routes/(protected)/my-new-route/+page.server.ts
export const load: PageServerLoad = async ({ parent }) => {
  const { user, profile } = await parent(); // Already authenticated!

  // user and profile are guaranteed to exist here
  // Add your page-specific logic
  return { myData: ... };
};
```

**Benefits:**
- ✅ Automatic authentication - impossible to forget
- ✅ Less code duplication
- ✅ Single source of truth for auth logic
- ✅ User and profile data automatically available

#### Option 2: Manual Protection (For Public Routes That Need Auth)
Only use this if your route is NOT in the (protected) group:

```typescript
export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
  const { user } = await safeGetSession();
  requireAuth(user); // Redirect to login if not authenticated

  // ... rest of load function
};
```

#### Option 3: Role-Based Protection
For routes that require specific roles (e.g., admin-only pages):

```typescript
export const load: PageServerLoad = async ({ parent }) => {
  const { profile } = await parent(); // Get from (protected) layout
  requireRole(profile, 'teacher'); // Throw 403 if not teacher

  // OR require multiple roles:
  requireRole(profile, ['teacher', 'admin']);

  // ... rest of load function
};
```

### Testing Auth

Use the logger to debug auth issues:
```typescript
import { createLogger } from '$lib/utils/logger';
const logger = createLogger('my-file.ts');

logger.info('User authenticated:', user.email);
logger.error('Auth failed:', error.message);
```

### References

- Official Guide: https://supabase.com/docs/guides/auth/server-side/sveltekit
- See `AUTH_SYSTEM.md` for complete technical documentation
- All auth implementation follows official Supabase best practices

## Available MCP Tools:

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## Svelte 5 with Runes & SvelteKit 2 - Best Practices

### Reactivity (Runes)

#### State Management

- **Use `$state` for reactive variables** instead of plain `let` declarations

  ```svelte
  <script>
  	let count = $state(0); // Reactive
  	// NOT: let count = 0;
  </script>
  ```

- **`$state` creates deep reactivity** for objects and arrays

  ```svelte
  <script>
  	let user = $state({ name: 'Alice', age: 30 });
  	// user.age++ will trigger reactivity
  </script>
  ```

- **Use `$state.raw()` for non-reactive data** when you don't need reactivity (performance optimization)
  ```svelte
  <script>
  	let config = $state.raw({ theme: 'dark' });
  </script>
  ```

#### Derived State

- **Use `$derived` instead of `$:` for computed values**

  ```svelte
  <script>
  	let count = $state(0);
  	let doubled = $derived(count * 2);
  	// NOT: $: doubled = count * 2;
  </script>
  ```

- **Use `$derived.by()` for complex derivations**
  ```svelte
  <script>
  	let numbers = $state([1, 2, 3]);
  	let sum = $derived.by(() => {
  		return numbers.reduce((a, b) => a + b, 0);
  	});
  </script>
  ```

#### Side Effects

- **Use `$effect` instead of `$:` for side effects**

  ```svelte
  <script>
  	let count = $state(0);

  	$effect(() => {
  		console.log(`Count is ${count}`);
  		// Cleanup function (optional)
  		return () => console.log('Cleanup');
  	});

  	// NOT: $: console.log(`Count is ${count}`);
  </script>
  ```

- **Use `$effect.pre()` for effects that run before DOM updates**

- **Use `$effect.root()` for manual effect lifecycle management**

#### Props

- **Use `$props()` instead of `export let`**

  ```svelte
  <script>
  	let { title, count = 0 } = $props();
  	// NOT: export let title; export let count = 0;
  </script>
  ```

- **For TypeScript, use proper typing**

  ```svelte
  <script lang="ts">
  	interface Props {
  		title: string;
  		count?: number;
  	}

  	let { title, count = 0 }: Props = $props();
  </script>
  ```

#### Context & Stores

- **Pass state via functions to avoid reference issues**

  ```svelte
  <script>
  	import { setContext } from 'svelte';

  	let count = $state(0);

  	// CORRECT: Pass as function
  	setContext('count', () => count);

  	// WRONG: Passes initial value only
  	// setContext('count', count);
  </script>
  ```

- **In child components, call the function to access state**

  ```svelte
  <script>
  	import { getContext } from 'svelte';

  	const getCount = getContext('count');
  	let count = $derived(getCount());
  </script>
  ```

### Components

#### Dynamic Components

- **Components are dynamic by default** - no need for `<svelte:component>`

  ```svelte
  <script>
  	let Component = $state(ComponentA);
  </script>

  <Component /> <!-- Re-renders when Component changes -->
  ```

- **Use capitalized variables for component references**

  ```svelte
  <script>
  	let Component = condition ? ComponentA : ComponentB;
  </script>

  <Component />
  ```

#### Snippets (Replacement for Slots)

- **Use `{#snippet}` instead of slots**

  ```svelte
  <!-- Parent.svelte -->
  <script>
  	import Child from './Child.svelte';
  </script>

  <Child>
  	{#snippet header()}
  		<h1>Title</h1>
  	{/snippet}

  	{#snippet content(data)}
  		<p>{data.text}</p>
  	{/snippet}
  </Child>
  ```

- **Receive snippets via `$props()`**

  ```svelte
  <!-- Child.svelte -->
  <script>
  	let { header, content } = $props();
  </script>

  {@render header?.()}
  {@render content?.({ text: 'Hello' })}
  ```

#### Event Handlers

- **Use plain functions instead of `createEventDispatcher`**

  ```svelte
  <script>
  	let { onclick } = $props();
  </script>

  <button {onclick}>Click me</button>
  ```

- **Use callback props for custom events**

  ```svelte
  <!-- Child.svelte -->
  <script>
  	let { onsubmit } = $props();
  </script>

  <!-- Parent.svelte -->
  <Child onsubmit={(data) => console.log(data)} />

  <button onclick={() => onsubmit({ value: 42 })}> Submit </button>
  ```

#### Bindings

- **Use `$bindable()` for two-way binding**

  ```svelte
  <!-- Child.svelte -->
  <script>
    let { value = $bindable() } = $props();
  </script>

  <input bind:value />

  <!-- Parent.svelte -->
  <script>
    let text = $state('');
  </script>

  <Child bind:value={text} />
  ```

### SvelteKit Routing & File Structure

#### Route Files

- **Use `+page.svelte` for page components**
- **Use `+layout.svelte` for layouts**
- **Use `+page.js`/`+page.server.js` for load functions**
- **Use `+server.js` for API endpoints**
- **Use `+error.svelte` for custom error pages**

#### Loading Data

- **Use `load` functions in `+page.js` or `+page.server.js`**

  ```javascript
  // +page.server.js - Runs only on server
  export async function load({ params, fetch }) {
  	const response = await fetch(`/api/posts/${params.id}`);
  	const post = await response.json();

  	return { post };
  }
  ```

- **Access loaded data via `$props()` with proper types**

  ```svelte
  <!-- +page.svelte -->
  <script>
  	let { data } = $props();
  </script>

  <h1>{data.post.title}</h1>
  ```

- **Use `depends()` to declare dependencies for invalidation**

  ```javascript
  export async function load({ depends, fetch }) {
  	depends('app:posts');
  	// ...
  }
  ```

- **Use `parent()` to access parent layout data**
  ```javascript
  export async function load({ parent }) {
  	const { user } = await parent();
  	// ...
  }
  ```

#### Forms & Actions

- **Define form actions in `+page.server.js`**

  ```javascript
  // +page.server.js
  import { fail, redirect } from '@sveltejs/kit';

  export const actions = {
  	login: async ({ request, cookies }) => {
  		const data = await request.formData();
  		const email = data.get('email');

  		// Validate and process...

  		if (!valid) {
  			return fail(400, { email, incorrect: true });
  		}

  		cookies.set('session', token, { path: '/' });
  		redirect(303, '/dashboard');
  	}
  };
  ```

- **Use progressive enhancement with `use:enhance`**

  ```svelte
  <script>
  	import { enhance } from '$app/forms';

  	let { form } = $props(); // Contains action results
  </script>

  <form method="POST" action="?/login" use:enhance>
  	<input name="email" type="email" required />
  	{#if form?.incorrect}
  		<p class="error">Invalid credentials</p>
  	{/if}
  	<button>Login</button>
  </form>
  ```

#### Navigation

- **Use `goto()` for programmatic navigation**

  ```javascript
  import { goto } from '$app/navigation';

  goto('/dashboard', {
  	replaceState: true,
  	invalidateAll: true
  });
  ```

- **Use `invalidate()` to rerun specific load functions**

  ```javascript
  import { invalidate } from '$app/navigation';

  invalidate('app:posts'); // Rerun loads that depend on 'app:posts'
  invalidate((url) => url.pathname === '/posts'); // By URL pattern
  ```

- **Use `invalidateAll()` to rerun all load functions**

### State Management with $app/state

#### Page State (Svelte 5 + SvelteKit 2.12+)

- **Use `page` from `$app/state` instead of `$page` store**

  ```svelte
  <script>
  	import { page } from '$app/state';
  </script>

  <p>Current path: {page.url.pathname}</p><p>Params: {JSON.stringify(page.params)}</p>
  ```

- **Access navigation state with `navigating`**

  ```svelte
  <script>
  	import { navigating } from '$app/state';
  </script>

  {#if navigating}
  	<p>Loading...</p>
  {/if}
  ```

#### Shallow Routing

- **Use `pushState()` and `replaceState()` for client-only state changes**

  ```javascript
  import { pushState } from '$app/navigation';

  pushState('', {
  	showModal: true,
  	selectedId: 42
  });

  // Access via page.state
  let modalOpen = $derived(page.state.showModal);
  ```

### Project Structure Best Practices

### Avoid Anti-Patterns

- **Don't mix `$state` with stores** - pick one reactivity system per project
- **Don't use `$:` in Svelte 5** - use runes instead
- **Don't use `export let` for props** - use `$props()`
- **Don't use `createEventDispatcher`** - use callback props
- **Don't use `<svelte:component>`** - components are dynamic by default
- **Don't access `.value` on state** - `$state` returns the value directly

### TypeScript Best Practices

- **Use generated types from `./$types`**

  ```typescript
  import type { PageLoad } from './$types';

  export const load: PageLoad = async ({ params }) => {
  	// Fully typed params and return value
  };
  ```

- **Define component prop types**

  ```svelte
  <script lang="ts">
  	interface Props {
  		title: string;
  		items: string[];
  		onSelect?: (item: string) => void;
  	}

  	let { title, items, onSelect }: Props = $props();
  </script>
  ```

### Performance Optimization

#### Preloading & Prefetching

- **Use `data-sveltekit-preload-data` for eager loading**

  ```svelte
  <a href="/dashboard" data-sveltekit-preload-data="hover"> Dashboard </a>
  ```

- **Use `preloadData()` programmatically**

  ```javascript
  import { preloadData } from '$app/navigation';

  preloadData('/dashboard');
  ```

#### Server-Side Rendering (SSR)

- **Configure page options as needed**
  ```javascript
  // +page.js
  export const ssr = true; // Enable SSR (default)
  export const csr = true; // Enable CSR (default)
  export const prerender = true; // Prerender at build time
  ```

#### Image Optimization

- **Use `@sveltejs/enhanced-img` for automatic optimization**

  ```svelte
  <script>
  	import { enhance } from '$app/forms';
  	import img from '$lib/assets/hero.jpg?enhanced';
  </script>

  <enhanced:img src={img} alt="Hero image" />
  ```

### Testing & Code Quality

#### Component Testing

- **Test components in isolation**
- **Use Vitest for unit tests**
- **Use Playwright for E2E tests**

#### Accessibility

- **Always provide `alt` text for images**
- **Use semantic HTML**
- **Test keyboard navigation**
- **Use proper ARIA attributes when needed**

#### Code Style

- **Use Prettier with `prettier-plugin-svelte`**
- **Use ESLint with `eslint-plugin-svelte`**
- **Follow naming conventions:**
  - Components: `PascalCase.svelte`
  - Utilities: `camelCase.js`
  - Routes: `kebab-case/+page.svelte`

### Environment & Configuration

#### Environment Variables

- **Use `$env/static/public` for build-time public vars**

  ```javascript
  import { PUBLIC_API_URL } from '$env/static/public';
  ```

- **Use `$env/static/private` for build-time private vars** (server only)

  ```javascript
  import { SECRET_KEY } from '$env/static/private';
  ```

- **Use `$env/dynamic/public` for runtime public vars**

  ```javascript
  import { env } from '$env/dynamic/public';
  console.log(env.PUBLIC_API_URL);
  ```

- **Don't use dynamic env vars during prerendering**

#### Adapter Configuration

- **Choose the right adapter for your deployment target:**
  - `@sveltejs/adapter-auto` - Auto-detects environment
  - `@sveltejs/adapter-node` - Node.js servers
  - `@sveltejs/adapter-static` - Static site generation
  - `@sveltejs/adapter-vercel` - Vercel
  - `@sveltejs/adapter-netlify` - Netlify
  - `@sveltejs/adapter-cloudflare` - Cloudflare Pages

---

**Remember:** Svelte 5 and SvelteKit 2 are designed to be simpler and more intuitive. When in doubt, prefer explicit, straightforward code over clever tricks.
