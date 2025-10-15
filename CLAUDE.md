# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

##

## Project Overview

This project is an educational math application created by a math teacher for his students. It makes heavy use of **MathLive** for mathematical input and rendering.

**Language**: The application is in **French** as it is directed towards French-speaking students. But the comments in code must be in english.

SvelteKit application built with:

- **Svelte 5** (latest with runes)
- **TypeScript** (strict mode enabled)
- **Tailwind CSS 4** (integrated via Vite plugin)
- **Shadcn-svelte** (UI component library)
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

## Performance Optimization Patterns

### Optimistic UI with Debouncing

For interactive features that require frequent server updates (e.g., incrementing counters, updating quantities), use the **Optimistic UI + Debouncing** pattern to provide instant feedback while minimizing server load.

**When to use this pattern:**
- User actions that can be rapidly repeated (clicking +/- buttons)
- Updates that can be batched together (accumulating deltas)
- Operations where instant visual feedback improves UX
- Situations where server latency is noticeable

**Example implementation:** See `src/routes/(protected)/dashboard/teacher/rewards/+page.svelte`

**Key components of the pattern:**

1. **Optimistic State Management**
   ```typescript
   // Track temporary values that override server data
   let optimisticValues = $state<Record<string, number>>({});

   function getDisplayValue(id: string, serverValue: number): number {
     return optimisticValues[id] ?? serverValue;
   }
   ```

2. **Debouncing with Delta Accumulation**
   ```typescript
   // Track pending requests with accumulated changes
   let pendingSubmissions = $state<Record<string, {
     timeoutId: number;
     accumulatedDelta: number
   }>>({});

   function debouncedUpdate(id: string, delta: number) {
     // Apply optimistic update immediately
     optimisticValues[id] = getDisplayValue(id, serverValue) + delta;

     // Cancel existing timer and accumulate delta
     if (pendingSubmissions[id]) {
       clearTimeout(pendingSubmissions[id].timeoutId);
       pendingSubmissions[id].accumulatedDelta += delta;
     } else {
       pendingSubmissions[id] = { timeoutId: 0, accumulatedDelta: delta };
     }

     // Set new timer (500ms is recommended)
     const timeoutId = setTimeout(async () => {
       const accumulated = pendingSubmissions[id].accumulatedDelta;
       delete pendingSubmissions[id];

       // Send single request with accumulated delta
       await sendToServer(id, accumulated);
     }, 500);

     pendingSubmissions[id].timeoutId = timeoutId;
   }
   ```

3. **Server Communication**
   ```typescript
   // Use fetch with SvelteKit action header
   const response = await fetch('?/actionName', {
     method: 'POST',
     body: formData,
     headers: { 'x-sveltekit-action': 'true' }
   });

   if (response.ok) {
     // Success: refresh data and show confirmation
     setTimeout(() => {
       invalidateAll();
       toaster.success('Update successful');
     }, 100);
   } else {
     // Error: rollback optimistic update
     delete optimisticValues[id];
     toaster.error('Update failed');
   }
   ```

4. **Cleanup on Unmount**
   ```typescript
   $effect(() => {
     return () => {
       // Clear all pending timeouts to prevent memory leaks
       Object.values(pendingSubmissions).forEach(({ timeoutId }) => {
         clearTimeout(timeoutId);
       });
     };
   });
   ```

**Benefits:**
- **0ms perceived latency** - UI updates instantly
- **90% reduction in server requests** for rapid interactions
- **Automatic rollback** on errors
- **Clean state management** with Svelte 5 runes

**Considerations:**
- Only use for operations where temporary inconsistency is acceptable
- Ensure server-side validation for all updates
- Use appropriate debounce timing (500ms is a good default)
- Always implement error rollback
- Clear pending requests on component unmount

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

### Shadcn-svelte

The application uses **Shadcn-svelte** for component styling and theming:

- **Documentation**: https://www.shadcn-svelte.com/docs
- **Components Location**: `src/lib/components/ui/`
- **Packages installed**:
  - `shadcn-svelte` (CLI for component installation)
  - `bits-ui` (headless component primitives)
  - `lucide-svelte` (icon library)
  - `svelte-sonner` (toast notifications)
  - `mode-watcher` (dark/light mode management)
  - `@tailwindcss/forms` (form styling plugin)
  - `clsx`, `tailwind-merge`, `tailwind-variants` (utility libraries)

### Installed Components

The following Shadcn components are available in `$lib/components/ui/`:

- **Button** (`button`) - Multiple variants and sizes
- **Input** (`input`) - Form input fields
- **Textarea** (`textarea`) - Multi-line text inputs
- **Select** (`select`) - Dropdown selections
- **Dropdown Menu** (`dropdown-menu`) - Context menus and dropdowns
- **Avatar** (`avatar`) - User avatars with fallback
- **Tabs** (`tabs`) - Tabbed interfaces
- **Separator** (`separator`) - Visual dividers

### Component Usage

```svelte
<script>
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Select from '$lib/components/ui/select';
</script>

<!-- Button -->
<Button variant="default">Click me</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>

<!-- Input -->
<Input type="text" placeholder="Enter text..." />

<!-- Textarea -->
<Textarea placeholder="Enter longer text..." />

<!-- Dropdown Menu -->
<DropdownMenu.Root>
	<DropdownMenu.Trigger class="cursor-pointer">Open Menu</DropdownMenu.Trigger>
	<DropdownMenu.Content>
		<!-- Menu item with onclick handler -->
		<DropdownMenu.Item onclick={() => console.log('Clicked')}>Item 1</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<!-- Menu item with navigation link -->
		<DropdownMenu.Item>
			<a href="/dashboard" class="flex w-full items-center"> Item 2 (with navigation) </a>
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>

<!-- Avatar -->
<Avatar.Root>
	<Avatar.Image src="/avatar.jpg" alt="User" />
	<Avatar.Fallback>CN</Avatar.Fallback>
</Avatar.Root>

<!-- Tabs -->
<Tabs.Root value="tab1">
	<Tabs.List>
		<Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
		<Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
	</Tabs.List>
	<Tabs.Content value="tab1">Content 1</Tabs.Content>
	<Tabs.Content value="tab2">Content 2</Tabs.Content>
</Tabs.Root>
```

### Toast Notifications

The project uses **svelte-sonner** for toast notifications via a custom toaster store:

```svelte
<script>
	import { toaster } from '$lib/stores/toaster.svelte';
</script>

<!-- Usage -->
<button onclick={() => toaster.success('Success message!')}>Show Success</button>
<button onclick={() => toaster.error('Error message!')}>Show Error</button>
<button onclick={() => toaster.warning('Warning message!')}>Show Warning</button>
<button onclick={() => toaster.info('Info message!')}>Show Info</button>
```

**Toaster Configuration:**

The `<Toaster />` component is configured in the root layout (`src/routes/+layout.svelte`) with:
- `expand={true}` - Enables expanded stacking mode
- `visibleToasts={5}` - Limits maximum number of visible toasts
- `gap={12}` - 12px vertical spacing between toasts
- `offset="16px"` - 16px padding from screen edges
- `richColors` - Uses semantic colors for different toast types
- `position="top-right"` - Displays toasts in the top-right corner

**Custom CSS for Toast Spacing:**

To ensure toasts never overlap, custom CSS is applied in `src/app.css`:

```css
/* Force proper vertical stacking */
[data-sonner-toaster] {
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
}

/* Individual toast spacing */
[data-sonner-toast] {
  margin-bottom: 12px !important;
  position: relative !important;
}

/* Container positioning */
[data-sonner-toaster][data-y-position='top'] {
  top: 16px !important;
}

[data-sonner-toaster][data-x-position='right'] {
  right: 16px !important;
}
```

**Best Practices:**
- Use `toaster.success()` with descriptive messages
- Include context in messages (e.g., student name, item count)
- Example: `toaster.success('+3 gidouilles (Marie)')` - clear and informative
- Toasts automatically stack vertically with 12px gaps
- Maximum 5 visible toasts - older ones auto-dismiss

### Theme System (Light/Dark Mode)

The application uses **Shadcn's CSS variable theming system** for light/dark mode:

**CSS Variables (in app.css):**

```css
:root {
	--background: 0 0% 100%;
	--foreground: 222.2 84% 4.9%;
	--card: 0 0% 100%;
	--card-foreground: 222.2 84% 4.9%;
	--popover: 0 0% 100%;
	--popover-foreground: 222.2 84% 4.9%;
	--primary: 221.2 83.2% 53.3%;
	--primary-foreground: 210 40% 98%;
	--secondary: 210 40% 96.1%;
	--secondary-foreground: 222.2 47.4% 11.2%;
	--muted: 210 40% 96.1%;
	--muted-foreground: 215.4 16.3% 46.9%;
	--accent: 210 40% 96.1%;
	--accent-foreground: 222.2 47.4% 11.2%;
	--destructive: 0 84.2% 60.2%;
	--destructive-foreground: 210 40% 98%;
	--border: 214.3 31.8% 91.4%;
	--input: 214.3 31.8% 91.4%;
	--ring: 221.2 83.2% 53.3%;
}

.dark {
	/* Dark mode values... */
}
```

**Semantic Tailwind Classes:**

- `bg-background` - Main background
- `bg-card` - Card backgrounds
- `bg-muted` - Muted/subtle backgrounds
- `bg-primary` / `bg-secondary` / `bg-destructive` - Action colors
- `text-foreground` - Main text color
- `text-muted-foreground` - Secondary text
- `border-border` - Border colors

**Dark Mode Management:**

The project uses a custom theme store (`$lib/stores/theme.svelte.ts`) combined with `mode-watcher`:

```typescript
import { theme } from '$lib/stores/theme.svelte';

// Toggle dark mode
theme.toggle();

// Check if dark mode is active
if (theme.dark) {
	// ...
}
```

The theme automatically:

- Syncs with system preferences
- Persists to localStorage
- Updates the DOM with `.dark` class

### Font Scaling System

The application includes a **CSS-based font scaling system** for accessibility:

**Location:** `$lib/stores/fontSize.svelte.ts`

**How it works:**

- Uses `--font-scale` CSS variable (default: 1.0)
- Applied only to `<main>` content (header and sidebar remain fixed)
- Range: 0.75 (75%) to 1.5 (150%) in 0.125 (12.5%) increments
- Persists to localStorage

**Usage:**

```typescript
import { fontSize } from '$lib/stores/fontSize.svelte';

// Increase font size
fontSize.increase();

// Decrease font size
fontSize.decrease();

// Reset to default
fontSize.reset();

// Check if can increase/decrease
fontSize.canIncrease; // boolean
fontSize.canDecrease; // boolean
```

Font size controls are already integrated into the Header component.

### Utility Functions

**`cn()` utility** (from `$lib/utils.ts`):

Combines `clsx` and `tailwind-merge` for conditional class names:

```typescript
import { cn } from '$lib/utils';

<div class={cn(
	'base-class',
	condition && 'conditional-class',
	'another-class'
)}>
```

### Adding New Shadcn Components

To add more Shadcn components:

```bash
npx shadcn-svelte@latest add <component-name>
```

Example:

```bash
npx shadcn-svelte@latest add card dialog badge
```

### Important Notes & Best Practices

#### Component Ownership

- All Shadcn components are **copied into your project** (not imported from node_modules)
- You have full control to customize components in `src/lib/components/ui/`
- Components use **Svelte 5 runes** (`$props()`, `$bindable()`, snippets)

#### Event Handlers (Svelte 5)

- **Always use lowercase event handlers**: `onclick`, `onsubmit`, `onchange` (NOT `on:click`)
- Example:

  ```svelte
  <!-- ✅ CORRECT -->
  <Button onclick={() => handleClick()}>Click me</Button>

  <!-- ❌ WRONG (Svelte 4 syntax) -->
  <Button on:click={() => handleClick()}>Click me</Button>
  ```

#### Dropdown Menu Navigation

- `DropdownMenu.Item` **does NOT support `href` directly**
- Wrap navigation links in `<a>` tags inside the item:

  ```svelte
  <!-- ✅ CORRECT -->
  <DropdownMenu.Item>
  	<a href="/dashboard" class="flex w-full items-center"> Dashboard </a>
  </DropdownMenu.Item>

  <!-- ❌ WRONG -->
  <DropdownMenu.Item href="/dashboard">Dashboard</DropdownMenu.Item>
  ```

#### Cursor Pointer

- Button component includes `cursor-pointer` by default
- For custom interactive elements, add `class="cursor-pointer"` explicitly
- Dropdown triggers need manual `cursor-pointer` class

#### Styling

- Use semantic color classes (`bg-background`, `text-foreground`) instead of arbitrary colors
- When Tailwind classes don't work reactively in Svelte 5, use inline `style` attributes as a fallback
- The `cn()` utility from `$lib/utils` helps merge Tailwind classes correctly

### Migration from Skeleton UI (Completed)

This project was migrated from Skeleton UI v3 to Shadcn-svelte. Key changes:

#### Class Name Replacements

- `surface-*` colors → `background`, `card`, `muted`, `border`
- `text-surface-*` → `text-foreground`, `text-muted-foreground`
- `border-surface-*` → `border-border`
- `variant-filled-*` → Button component with variants
- `variant-ghost-*` → `variant="ghost"`
- `btn` / `btn-sm` → `<Button>` component
- `card` class → `bg-card text-card-foreground border border-border`

#### Component Replacements

- Skeleton `input` class → `<Input>` component
- Skeleton `textarea` class → `<Textarea>` component
- Skeleton `select` class → `<Select>` components
- Skeleton `AppBar` → Custom header with Shadcn components
- Skeleton `Popover` → `<DropdownMenu>` components
- Skeleton `Avatar` → `<Avatar>` components
- Skeleton `Toaster` → `svelte-sonner` with custom wrapper

#### Theme System Changes

- Skeleton's `--text-scaling` → Custom `--font-scale` CSS variable
- Skeleton's numeric color variants (`surface-100-900`) → Semantic CSS variables (`--background`, `--foreground`)
- Dark mode still uses `.dark` class but with Shadcn's color palette

#### Migration Benefits

- ✅ Modern Shadcn aesthetic (cleaner, more minimal)
- ✅ Full component ownership and customization
- ✅ Better TypeScript support with Svelte 5
- ✅ Active ecosystem and community
- ✅ Semantic color system (easier theming)

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

### Student Import System

The application has a student import system at `/dashboard/admin/import-students` that handles two different scenarios:

#### Normal Flow (Import BEFORE Login)
1. Admin imports students via CSV with class join codes
2. Students are added to `pending_students` table with pre-assigned classes
3. When student logs in for the first time, `handle_new_user()` trigger:
   - Creates their profile in `profiles` table
   - Automatically enrolls them in `class_members` table
   - Marks them as activated in `pending_students`

#### Edge Case (Login BEFORE Import)
**Problem**: If a student logs in before being imported, they get a default profile with no class assignments.

**Solution** (implemented in migration 033 and import-students page):
1. Import system detects student already exists (duplicate email error)
2. Instead of failing, it checks if profile exists
3. Adds student directly to `class_members` table for each class
4. Shows message: "X élève(s) déjà existant(s) mis à jour"

**Key Insight**: The `class_members` table is the source of truth for class memberships. The `class_ids` array in profiles is kept synchronized via triggers for backward compatibility.

**Important**: Always query `class_members` table (not `class_ids` array) when checking class membership. The triggers ensure they stay in sync, but `class_members` is authoritative.

### Google OAuth and Avatar Management

The application uses **Google OAuth** for authentication, restricted to `@voltairedoha.com` email addresses.

#### Avatar URL Extraction

**Important**: Google OAuth stores the user's profile picture in the `picture` field, NOT `avatar_url`.

When handling OAuth user metadata, always check both fields:
```typescript
// CORRECT: Check 'picture' first (Google standard), then 'avatar_url' (fallback)
const avatarUrl = user.user_metadata?.picture || user.user_metadata?.avatar_url;

// WRONG: Only checking avatar_url will not work with Google OAuth
const avatarUrl = user.user_metadata?.avatar_url;
```

#### Avatar Storage Flow

**Migrations**: [060_save_google_avatar_url.sql](supabase/migrations/060_save_google_avatar_url.sql), [061_fix_google_avatar_picture_field.sql](supabase/migrations/061_fix_google_avatar_picture_field.sql)

1. **User Signs Up/Logs In** with Google OAuth
2. **handle_new_user() Trigger** (Database):
   - Extracts avatar from `raw_user_meta_data->>'picture'` or `raw_user_meta_data->>'avatar_url'`
   - Saves to `profiles.avatar_url` when creating new profile
   - Updates existing profiles if they don't have an avatar set
3. **OAuth Callback Handler** ([callback/+server.ts](src/routes/(public)/auth/callback/+server.ts)):
   - Also extracts and saves avatar URL for redundancy
   - Updates existing profiles that logged in before avatar saving was implemented

#### Avatar Display Logic

**Component**: [Header.svelte](src/lib/components/Header.svelte)

Avatar display priority (fallback chain):
1. **profile.avatar_url** - Stored in database (primary source)
2. **user.user_metadata.picture** - Google OAuth session data
3. **user.user_metadata.avatar_url** - Other OAuth providers
4. **Role/gender-based fallback** - Default avatars based on user role and gender
5. **Initials fallback** - First/last name initials or email initial

```typescript
function getAvatarSrc(): string {
  // First try profile avatar_url (saved in database)
  if (profile?.avatar_url) {
    return profile.avatar_url;
  }

  // Then try user metadata (Google uses 'picture')
  if (user?.user_metadata?.picture) {
    return user.user_metadata.picture;
  }
  if (user?.user_metadata?.avatar_url) {
    return user.user_metadata.avatar_url;
  }

  // Finally, use role/gender-based fallback
  if (profile) {
    return getAvatarFallback(profile.role, profile.gender);
  }

  return '';
}
```

#### Avatar Utility Functions

**Location**: [src/lib/utils/avatar.ts](src/lib/utils/avatar.ts)

- **getAvatarFallback(role, gender)** - Returns default avatar based on user role (student/teacher/admin) and gender (boy/girl)
- **getAvatarInitials(firstname, lastname)** - Generates two-letter initials for avatar fallback

#### Debugging Avatar Issues

**Debug Page**: `/debug-avatar` (protected route)

Shows:
- Current avatar display with all fallback stages
- Avatar source URL being used
- Full user object and metadata
- Profile data from database
- Specific checks for `picture`, `avatar_url`, role, and gender fields

Use this page when troubleshooting why avatars aren't displaying for specific users.

#### OAuth Configuration

**Google OAuth Settings**:
- **Provider**: Google
- **Allowed Domain**: `@voltairedoha.com` (enforced in callback handler)
- **Callback URL**: `/auth/callback`
- **Metadata Fields Used**: `picture`, `given_name`, `family_name`, `full_name`, `email`

**Domain Validation** ([callback/+server.ts](src/routes/(public)/auth/callback/+server.ts#L61-L73)):
```typescript
if (!email || !email.endsWith('@voltairedoha.com')) {
  await supabase.auth.signOut();
  throw redirect(303, '/login?error=Only @voltairedoha.com email accounts are allowed');
}
```

#### Important Notes

- Users must **log out and log back in** for avatar updates to take effect after deploying avatar-related changes
- The `handle_new_user()` trigger runs automatically on first login and saves the avatar
- For existing users without avatars, the callback handler updates their profile on next login
- Avatar URLs from Google are direct links to Google's CDN and require no additional storage
- If a user changes their Google profile picture, it will update on next login

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

## Holographic VIP Cards System

The project includes an advanced holographic card effect system for VIP rewards, inspired by Pokemon trading cards. The system provides interactive 3D effects that respond to mouse movement and device orientation.

### Overview

**Location:** `/vip-cards-demo` - Public showcase page
**Component:** `VipCardHolo.svelte` - Main holographic card component
**Original Source:** Adapted from [Pokemon Cards CSS](https://github.com/simeydotme/pokemon-cards-css)

### Architecture

#### Asset Files (`static/`)

```
static/
├── holo-assets/              # Holographic textures
│   ├── grain.webp           # Texture overlay
│   ├── glitter.png          # Sparkle effect
│   └── cosmos.png           # Galaxy background
├── images/vip-cards/         # 26 VIP card images
│   └── *.jpg                # Card front images
└── css/holo-cards/           # Effect CSS files
    ├── base.css             # Core 3D transforms
    ├── cards.css            # Shared variables
    ├── regular-holo.css     # Common rarity
    ├── cosmos-holo.css      # Rare rarity
    ├── rainbow-holo.css     # Epic rarity
    └── secret-rare.css      # Legendary rarity
```

#### Code Files (`src/lib/`)

```
src/lib/
├── components/
│   ├── VipCard.svelte       # Simple flip card (original)
│   └── VipCardHolo.svelte   # Holographic card (new)
├── stores/
│   └── holo-card.svelte.ts  # Active card & orientation stores
├── utils/
│   └── holo-math.ts         # Math helpers (round, clamp, adjust)
└── types/
    └── vip-card.ts          # VIP card types & data
```

### Rarity-Based Effects

The holographic effect changes based on card rarity:

| Rarity | CSS File | Effect Description | Count |
|--------|----------|-------------------|-------|
| **Common** | `regular-holo.css` | Vertical beam holographic pattern | 9 |
| **Rare** | `cosmos-holo.css` | Galaxy background with rainbow gradients | 10 |
| **Epic** | `rainbow-holo.css` | Intense glitter with pastel rainbow | 5 |
| **Legendary** | `secret-rare.css` | Shimmering gold with multiple layers | 2 |

### Component Usage

#### Basic Usage

```svelte
<script>
import VipCardHolo from '$lib/components/VipCardHolo.svelte';
import { VIP_CARDS } from '$lib/types/vip-card';

const card = VIP_CARDS[0]; // Any VIP card
</script>

<VipCardHolo {card} />
```

#### With Count Badge

```svelte
<VipCardHolo {card} count={3} />
```

#### Showcase Mode (Auto-Rotation)

```svelte
<VipCardHolo {card} showcase={true} />
```

### Component Props

```typescript
interface Props {
  card: VipCard;        // Required: VIP card data
  count?: number;       // Optional: Display count badge (default: 1)
  showcase?: boolean;   // Optional: Enable auto-rotation (default: false)
}
```

**Image Handling:** Card images automatically scale to fill the entire card area using `object-fit: cover`, maintaining the card's aspect ratio while cropping the image as needed. This ensures personal images of any dimension will properly fill the card without distortion.

### Interactive Features

All holographic cards support:

1. **Mouse Tracking** - 3D tilt follows cursor position
2. **Touch Support** - Works on mobile devices
3. **Click to Expand** - Full-screen card view with 360° spin animation
4. **Gyroscope Support** - Tilts with device orientation on mobile
5. **Spring Animations** - Smooth physics-based transitions

### Stores (Svelte 5 Runes)

#### Active Card Store

Tracks which card is currently expanded:

```typescript
import { activeCard } from '$lib/stores/holo-card.svelte';

// Set active card
activeCard.set(cardElement);

// Get active card
const current = activeCard.get();

// Clear active card
activeCard.clear();
```

#### Orientation Store

Tracks device gyroscope for mobile tilt effects:

```typescript
import { orientation, resetBaseOrientation } from '$lib/stores/holo-card.svelte';

// Get current orientation
const current = orientation.get();
// Returns: { absolute: {...}, relative: {...} }

// Reset base orientation
resetBaseOrientation();
```

### CSS Architecture

The holographic effects use CSS custom properties for dynamic positioning:

```css
/* Dynamic CSS variables set by component */
--pointer-x: 50%;              /* Mouse X position */
--pointer-y: 50%;              /* Mouse Y position */
--pointer-from-center: 0;      /* Distance from center (0-1) */
--pointer-from-top: 0;         /* Distance from top (0-1) */
--pointer-from-left: 0;        /* Distance from left (0-1) */
--card-opacity: 0;             /* Holographic effect opacity */
--rotate-x: 0deg;              /* 3D rotation X */
--rotate-y: 0deg;              /* 3D rotation Y */
--background-x: 50%;           /* Background position X */
--background-y: 50%;           /* Background position Y */
--card-scale: 1;               /* Card scale factor */
--translate-x: 0px;            /* Translation X */
--translate-y: 0px;            /* Translation Y */
```

### Loading CSS Files

To use holographic cards, include CSS in your layout:

```svelte
<!-- +layout.svelte -->
<svelte:head>
  <link rel="stylesheet" href="/css/holo-cards/base.css" />
  <link rel="stylesheet" href="/css/holo-cards/cards.css" />
  <link rel="stylesheet" href="/css/holo-cards/regular-holo.css" />
  <link rel="stylesheet" href="/css/holo-cards/cosmos-holo.css" />
  <link rel="stylesheet" href="/css/holo-cards/rainbow-holo.css" />
  <link rel="stylesheet" href="/css/holo-cards/secret-rare.css" />
</svelte:head>
```

### Migration from Svelte 3 to Svelte 5

The holographic card component was migrated from the original Pokemon cards project (Svelte 3) to Svelte 5:

**Key Changes:**
- `export let` → `$props()`
- `$: reactive` → `$derived` and `$effect`
- Store subscriptions (`$store`) → `.get()` method
- Svelte 3 stores → Svelte 5 runes-based stores
- Fixed `$` prefix variable naming (reserved in Svelte 5)

### Performance Considerations

**Hardware Acceleration:**
- All cards use `transform: translate3d()` for GPU acceleration
- Spring animations use `will-change` hints
- Transform-style preserved for 3D effects

**Optimization Tips:**
- Limit number of visible cards (use pagination/virtual scrolling for large lists)
- Disable showcase mode on low-end devices
- Consider using simple `VipCard` component for list views
- Use `VipCardHolo` only for detail/showcase views

### Demo Page

**Route:** `/vip-cards-demo`
**Access:** Public (no authentication required)

The demo page showcases:
- All 26 VIP cards organized by rarity
- Interactive showcase card with auto-rotation
- Rarity legend explaining each effect
- Responsive grid layout
- Back-to-top navigation

### Integration Example

Replace existing VipCard with VipCardHolo in specific views:

```svelte
<!-- Before -->
<VipCard card={myCard} />

<!-- After (with holographic effect) -->
<VipCardHolo card={myCard} />
```

**When to use each:**
- **VipCard** - Simple lists, compact views, better performance
- **VipCardHolo** - Feature highlights, rewards showcase, detail views

### Troubleshooting

**Cards not displaying effects:**
- Ensure CSS files are loaded in layout
- Check browser DevTools for 404 errors on assets
- Verify `card.rarity` matches CSS selectors

**Poor performance:**
- Reduce number of visible cards
- Disable showcase mode
- Check for CSS `will-change` support
- Consider using IntersectionObserver to lazy-load effects

**Mobile gyroscope not working:**
- Request device orientation permission
- Test on HTTPS (required for sensors)
- Check browser compatibility

### Browser Compatibility

**Fully Supported:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Partial Support:**
- Older browsers may lack gyroscope or 3D transforms
- Fallback: Static card display without effects

---

**Remember:** Svelte 5 and SvelteKit 2 are designed to be simpler and more intuitive. When in doubt, prefer explicit, straightforward code over clever tricks.
