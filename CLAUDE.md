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

## Teacher Students Cache System

The Teacher Students Cache System provides client-side caching of student data to improve performance and reduce redundant API calls across the teacher dashboard.

### Overview

**Location:** `src/lib/stores/teacherStudentsCache.svelte.ts`
**Type:** Svelte 5 rune-based store with progressive loading

The cache progressively populates as teachers access student data, providing instant responses for subsequent requests. It automatically invalidates when student data changes (imports, rewards, class membership).

### Architecture

**Cache Structure:**
```typescript
Map<classId, {
  students: CachedStudent[] | CachedStudentFull[],
  lastFetched: Date,
  isLoading: boolean,
  isFull: boolean  // Whether this cache has full data
}>
```

**Two Data Levels:**
1. **Minimal** (for Wheel): `id, firstname, lastname, avatar_url`
2. **Full** (for Rewards): Includes `gidouilles, vip_cards, role, gender`

### Basic Usage

```typescript
import { teacherStudentsCache } from '$lib/stores/teacherStudentsCache.svelte';

// Get students (auto-fetches if not cached)
const students = await teacherStudentsCache.getStudents(classId);

// Get students with full data
const studentsWithRewards = await teacherStudentsCache.getStudents(classId, true);

// Check if class is cached
if (teacherStudentsCache.has(classId)) { ... }

// Get cached data synchronously (returns undefined if not cached)
const cached = teacherStudentsCache.getCached(classId);

// Preload students in background (fire-and-forget)
teacherStudentsCache.preload(classId, false);
```

### Cache Invalidation

**When to Invalidate:**
- After student imports (clear entire cache)
- After gidouilles/rewards changes (invalidate affected class)
- After VIP card awards (invalidate affected class)
- After class membership changes (invalidate affected class)

**How to Invalidate:**
```typescript
// Invalidate specific class
teacherStudentsCache.invalidate(classId);

// Invalidate multiple classes
teacherStudentsCache.invalidateMany([classId1, classId2]);

// Clear entire cache (e.g., after bulk import)
teacherStudentsCache.clear();
```

### API Endpoint Enhancement

**Endpoint:** `GET /api/classes/[classId]/students`

**Query Parameters:**
- `?full=true` - Returns full student data (gidouilles, vip_cards, etc.)
- `?full=false` or omitted - Returns minimal data (id, firstname, lastname, avatar_url)

**Example:**
```typescript
// Minimal data
fetch('/api/classes/abc123/students')

// Full data
fetch('/api/classes/abc123/students?full=true')
```

### Integration Points

**1. Teacher Dashboard** ([TeacherDashboard.svelte](src/routes/(protected)/dashboard/TeacherDashboard.svelte))
- Uses cache for Wheel of Fortune modal
- Preloads students when class is selected
- Instant modal opening on cache hit

**2. Rewards Page** ([teacher/rewards/+page.svelte](src/routes/(protected)/dashboard/teacher/rewards/+page.svelte))
- Invalidates cache after gidouilles updates
- Invalidates cache after VIP card awards
- Ensures fresh data after mutations

**3. Import Students** ([admin/import-students/+page.svelte](src/routes/(protected)/dashboard/admin/import-students/+page.svelte))
- Clears entire cache after successful import
- Ensures all teachers see new students

### Performance Benefits

**Before Cache:**
- Dashboard wheel modal: 200-500ms load time on every open
- Rewards page: Server-side load on every navigation
- Multiple API calls for same data across pages

**After Cache:**
- Dashboard wheel modal: 0ms on cache hit (instant)
- Preloading: Data ready before user clicks
- Single API call per class (until invalidation)
- Shared data across dashboard components

**Deduplication:**
If multiple components request the same class simultaneously, only one API call is made. Subsequent requests wait for the in-flight request to complete.

### Cache Statistics

**Debug Method:**
```typescript
const stats = teacherStudentsCache.getStats();
// Returns: { cachedClasses, loadingClasses, totalStudents }
```

**Memory Usage:**
- Minimal data: ~100 bytes per student
- Full data: ~300 bytes per student
- Typical class (25 students): ~2.5KB (minimal) or ~7.5KB (full)
- 10 classes cached: ~25-75KB total (negligible)

### Best Practices

**DO:**
- Use `getCached()` first for instant display, then fetch in background
- Preload selected class on dashboard mount
- Invalidate immediately after mutations
- Use minimal data when full data is not needed
- Clear cache on logout (handled automatically)

**DON'T:**
- Rely on stale cache after mutations
- Cache student passwords or sensitive auth data
- Manually implement caching - use this store
- Fetch same class multiple times in parallel

### Error Handling

**Cache Misses:**
- Automatically fetches from API
- Returns empty array on error
- Logs errors to console

**Network Errors:**
- Failed requests remove loading state
- Cache entry is deleted (will retry on next request)
- User sees error toast from calling component

**Race Conditions:**
- Deduplication prevents simultaneous fetches
- In-flight requests tracked per class
- Late requests wait for existing fetch

### Future Enhancements

Potential improvements:
- Time-based expiration (optional 5-minute TTL)
- IndexedDB persistence across sessions
- Optimistic updates for real-time feel
- WebSocket integration for live updates
- Cache warming (preload all teacher's classes on login)

### Testing

**Test Suite Location:**
- Unit tests: `src/lib/stores/teacherStudentsCache.test.ts`
- Integration tests: `src/lib/stores/teacherStudentsCache.integration.test.ts`
- Component tests: `src/routes/(protected)/dashboard/TeacherDashboard.svelte.spec.ts`
- E2E tests: `e2e/teacher-students-cache.spec.ts`
- Test fixtures: `src/lib/test-utils/cache-fixtures.ts`

**Coverage:**
- ✅ **100% code coverage** (55/55 unit tests passing)
- 10 test suites covering all methods and edge cases
- Comprehensive error scenario testing
- Race condition and timeout testing
- Deduplication and cache invalidation testing

**Run Tests:**
```bash
# All cache tests
pnpm test:unit teacherStudentsCache

# Watch mode
pnpm test:unit --watch teacherStudentsCache

# Coverage report
pnpm test:unit --coverage teacherStudentsCache
```

**Test Highlights:**
- Cache hit/miss scenarios
- Minimal vs full data handling
- Request deduplication (simultaneous requests)
- Loading states and timeouts
- Error handling (network, HTTP errors, malformed data)
- Preloading and background fetching
- Cache statistics and invalidation
- Edge cases (empty arrays, special characters, concurrent operations)

---

## Teacher Class Schedule System

The Teacher Class Schedule System allows teachers to manage weekly recurring schedules for their classes. It provides a visual calendar grid showing Sunday through Thursday with time slots from 7:00 to 18:00.

### Overview

**Location:** `/dashboard/teacher/classes`
**Access:** Teachers and admins only
**Database Table:** `class_schedules`

The system displays each class in a separate tab, with:
- **Stats card** showing student count (expandable for future metrics)
- **Weekly schedule grid** displaying all schedule entries
- **CRUD modal** for creating, editing, and deleting schedule entries

### Database Schema

**Table:** `class_schedules`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| class_id | UUID | Foreign key to classes table |
| teacher_id | UUID | Foreign key to profiles table |
| day_of_week | INTEGER | 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday |
| start_time | TIME | Session start time (HH:MM:SS) |
| end_time | TIME | Session end time (HH:MM:SS) |
| subject | TEXT | Optional subject name |
| room | TEXT | Optional room number |
| notes | TEXT | Optional notes |

**Constraints:**
- `day_of_week` must be 0-4 (Sunday-Thursday)
- `end_time` must be greater than `start_time`

**RLS Policies:**
- Teachers can manage schedules for their own classes
- Students can view schedules for classes they're enrolled in
- Admins can view and manage all schedules

### Components

#### 1. Main Page (`+page.svelte`)

**File:** `src/routes/(protected)/dashboard/teacher/classes/+page.svelte`

Displays all teacher's classes in tabs using Shadcn's Tabs component:

```svelte
<Tabs.Root value={classes[0]?.id}>
  <Tabs.List>
    {#each classes as class}
      <Tabs.Trigger value={class.id}>{class.name}</Tabs.Trigger>
    {/each}
  </Tabs.List>

  {#each classes as class}
    <Tabs.Content value={class.id}>
      <ClassStatsCard studentCount={class.student_count} />
      <ClassScheduleGrid schedules={class.schedules} />
    </Tabs.Content>
  {/each}
</Tabs.Root>
```

**Features:**
- Tab navigation between classes
- Stats card with student count
- Weekly schedule grid
- Modal for adding/editing schedule entries
- Toast notifications for success/error
- Auto-refresh after changes

#### 2. ClassStatsCard Component

**File:** `src/lib/components/ClassStatsCard.svelte`

**Props:**
- `studentCount: number` - Number of students in the class
- `onEditSchedule: () => void` - Callback when "Edit Schedule" button is clicked

**Displays:**
- Student count with icon
- "Modifier l'Emploi du Temps" button
- Expandable for future stats (assignments, pending reviews, etc.)

#### 3. ClassScheduleGrid Component

**File:** `src/lib/components/ClassScheduleGrid.svelte`

**Props:**
- `schedules: ClassSchedule[]` - Array of schedule entries
- `onCellClick?: (day, time, entry?) => void` - Callback when cell is clicked
- `readonly?: boolean` - Disable editing (default: false)

**Features:**
- Custom 5×12 grid (Sunday-Thursday × 7h-18h)
- Time slots displayed in 1-hour increments
- Schedule entries span multiple rows for multi-hour sessions
- Click empty cell to add new entry
- Click existing entry to edit
- Color-coded entries with subject and room displayed
- Empty state when no schedules exist

**Grid Structure:**
```
┌──────┬────────┬────────┬────────┬────────┬────────┐
│ Heure│ Dimanche│ Lundi │ Mardi │Mercredi│ Jeudi  │
├──────┼────────┼────────┼────────┼────────┼────────┤
│ 7h00 │        │  Math  │        │  Math  │        │
│      │        │ Rm 101 │        │ Rm 101 │        │
├──────┼────────┼────────┼────────┼────────┼────────┤
│ 8h00 │        │        │        │        │        │
├──────┼────────┼────────┼────────┼────────┼────────┤
│ ...  │  ...   │  ...   │  ...   │  ...   │  ...   │
└──────┴────────┴────────┴────────┴────────┴────────┘
```

#### 4. ScheduleEntryModal Component

**File:** `src/lib/components/ScheduleEntryModal.svelte`

**Props:**
- `open: boolean` - Whether modal is open (bindable)
- `mode: 'create' | 'edit' | 'view'` - Modal mode
- `entry?: ClassSchedule` - Existing entry (for edit/view modes)
- `defaultDay?: number` - Default day for new entries
- `defaultTime?: string` - Default start time for new entries
- `onClose: () => void` - Callback when modal closes
- `onSave: (data) => void` - Callback when form is submitted
- `onDelete?: () => void` - Callback for delete action (edit mode only)

**Form Fields:**
- Day of week (Select: Dimanche-Jeudi)
- Start time (Time input)
- End time (Time input)
- Subject (Text input, optional)
- Room (Text input, optional)
- Notes (Textarea, optional)

**Validation:**
- End time must be after start time
- Day of week must be 0-4

**Actions:**
- **Create mode**: Save button creates new entry
- **Edit mode**: Save button updates entry, Delete button removes it
- **View mode**: No actions, read-only display

### Server-Side Logic

**File:** `src/routes/(protected)/dashboard/teacher/classes/+page.server.ts`

#### Load Function

Fetches teacher's classes with student counts and schedules:

```typescript
export const load: PageServerLoad = async ({ parent, locals }) => {
  const { profile } = await parent();

  // Fetch teacher's classes
  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .eq('teacher_id', profile.id)
    .eq('is_active', true);

  // For each class, fetch student count and schedules
  const classesWithData = await Promise.all(
    classes.map(async (cls) => {
      const { count } = await supabase
        .from('class_members')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', cls.id);

      const { data: schedules } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('class_id', cls.id)
        .order('day_of_week')
        .order('start_time');

      return { ...cls, student_count: count, schedules };
    })
  );

  return { classes: classesWithData };
};
```

#### Form Actions

**`createScheduleEntry`**
- Validates required fields and time range
- Verifies teacher owns the class
- Inserts new schedule entry
- Returns success message

**`updateScheduleEntry`**
- Validates fields and ownership
- Updates existing schedule entry
- Returns success message

**`deleteScheduleEntry`**
- Verifies teacher owns the schedule entry
- Deletes entry from database
- Returns success message

**Security:**
All actions verify that the teacher owns the class before allowing modifications.

### Utility Functions

**File:** `src/lib/utils/schedule.ts`

Provides helper functions for schedule management:

**Day Name Functions:**
- `getDayName(dayNum, short?)` - Get French day name (Dimanche, Lundi, etc.)
- `DAY_NAMES` - Full day names (0-4)
- `DAY_NAMES_SHORT` - Abbreviated day names (Dim, Lun, etc.)

**Time Functions:**
- `formatTime(time)` - Convert HH:MM:SS to HH:MM
- `formatTimeDisplay(time)` - Convert to display format (e.g., "8h00")
- `timeToMinutes(time)` - Convert time to minutes since midnight
- `minutesToTime(minutes)` - Convert minutes to time string
- `isValidTimeRange(start, end)` - Validate end > start
- `getDefaultStartTime()` - Default start time (08:00:00)
- `getDefaultEndTime(start?)` - Default end time (1 hour after start)

**Grid Functions:**
- `getTimeSlots(startHour, endHour, interval)` - Generate time slots array
- `findScheduleAtSlot(schedules, day, time)` - Find entry at grid position
- `calculateSlotSpan(schedule, interval)` - Calculate row span for entry
- `isScheduleStart(schedule, time)` - Check if entry starts at this slot

**Display Functions:**
- `formatScheduleDisplay(schedule)` - Format entry for grid display

### Usage Example

```typescript
// In +page.svelte
import ClassScheduleGrid from '$lib/components/ClassScheduleGrid.svelte';
import ScheduleEntryModal from '$lib/components/ScheduleEntryModal.svelte';

let modalOpen = $state(false);
let selectedEntry = $state<ClassSchedule | undefined>(undefined);

function handleCellClick(day: number, time: string, entry?: ClassSchedule) {
  if (entry) {
    // Edit existing entry
    selectedEntry = entry;
  } else {
    // Create new entry
    selectedEntry = undefined;
  }
  modalOpen = true;
}

async function handleSave(formData: ScheduleFormData) {
  const action = selectedEntry ? '?/updateScheduleEntry' : '?/createScheduleEntry';

  const data = new FormData();
  data.append('class_id', currentClassId);
  data.append('day_of_week', formData.day_of_week.toString());
  // ... append other fields

  const response = await fetch(action, {
    method: 'POST',
    body: data,
    headers: { 'x-sveltekit-action': 'true' }
  });

  if (response.ok) {
    await invalidateAll();
    toaster.success('Créneau créé avec succès');
  }
}
```

### Navigation

The schedule system is accessible via:
- **Sidebar:** "Classes" link (teachers only)
- **Teacher Dashboard:** "Voir Mes Classes" button
- **Direct URL:** `/dashboard/teacher/classes`

### Best Practices

**DO:**
- Use the utility functions from `schedule.ts` for consistency
- Validate time ranges before saving
- Show toast notifications for user feedback
- Refresh data after mutations using `invalidateAll()`
- Use semantic colors for schedule entries

**DON'T:**
- Modify schedule entries without verifying teacher ownership
- Allow overlapping time ranges for the same class/day
- Hard-code time slots or day names
- Skip validation on form submission

### Future Enhancements

Potential improvements for the schedule system:
- Drag-and-drop to move schedule entries
- Duplicate schedule from one class to another
- Export schedule to PDF or iCalendar format
- Conflict detection (same teacher, overlapping times across classes)
- Color-coding by subject
- Student view (read-only schedules for enrolled students)
- Recurring event exceptions (holidays, special events)
- Integration with assignment due dates

---

## Wheel of Fortune Component

The Wheel component is an interactive spinning wheel for randomly selecting students in a class. It features beautiful SVG-based graphics with customizable colors and animations.

### Overview

**Location:** `src/lib/components/Wheel.svelte`
**Demo Page:** `/dashboard/teacher/wheel` (teacher/admin only)
**Debug Page:** `/dashboard/admin/debug/wheel` (admin only)

The wheel uses the original design pattern with:
- Pink/blue alternating slices using `stroke-dasharray` technique
- Decorative yellow dots around the perimeter
- Blue-gray outer ring with drop shadow
- Yellow-stroked center circle
- Gradient pointer/marker at top
- Blur animation during spinning
- Confetti celebration on winner selection

### Component Props

```typescript
interface Props {
  // Required
  students: Student[];              // Array of students

  // Optional customization
  wheelRadius?: number;             // Default: 18 (em units)
  primaryColor?: string;            // Default: '#e7c9de' (pink)
  secondaryColor?: string;          // Default: '#3a507e' (dark blue)
  accentColor?: string;             // Default: '#788bb2' (gray-blue)
  spinDuration?: number;            // Default: 4 (seconds)
  addJokerIfOdd?: boolean;         // Default: false
  showConfetti?: boolean;           // Default: true

  // Gidouille rewards
  gidouilleReward?: number;         // Optional reward amount
  onRewardGiven?: (id, amount) => Promise<void>;

  // Callbacks
  onWinner?: (student) => void;
  onSpinStart?: () => void;
  onSpinEnd?: () => void;
}
```

### Basic Usage

```svelte
<script>
  import Wheel from '$lib/components/Wheel.svelte';

  const students = [
    { id: '1', firstname: 'Alice' },
    { id: '2', firstname: 'Bob' },
    { id: '3', firstname: 'Charlie' }
  ];

  function handleWinner(student) {
    console.log('Winner:', student.firstname);
  }
</script>

<Wheel
  {students}
  onWinner={handleWinner}
/>
```

### Advanced Usage with Rewards

```svelte
<script>
  import Wheel from '$lib/components/Wheel.svelte';

  const students = [/* ... */];

  async function handleRewardGiven(studentId, amount) {
    const response = await fetch('/api/rewards/gidouilles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, amount })
    });

    if (response.ok) {
      console.log(`Awarded ${amount} gidouilles`);
    }
  }
</script>

<Wheel
  {students}
  gidouilleReward={10}
  onRewardGiven={handleRewardGiven}
  primaryColor="#ff6b9d"
  wheelRadius={20}
/>
```

### SVG Architecture

The wheel uses a clever SVG technique to create alternating slices:

```svelte
<!-- Base pink circle -->
<circle r="18em" fill="#e7c9de" />

<!-- Alternating dark blue slices (stroke-dasharray magic!) -->
<circle
  r="9em"
  stroke="#3a507e"
  stroke-width="18em"
  stroke-dasharray="{pieceAngle * radius / 2}em {pieceAngle * radius / 2}em"
/>

<!-- Decorative yellow dots (count * 3) -->
{#each Array(count * 3) as _, i}
  <circle
    fill="#f9ef69"
    transform="rotate({i * 360 / (count * 3)})"
  />
{/each}
```

### Animation System

**Spinning:**
- CSS `transform: rotate()` with `transition: all 4s ease-out`
- Rotates 9 full times (360° × 9) plus random angle
- Winner calculated from final angle position
- Avoids landing on slice boundaries

**Blur Effect:**
- Custom keyframe animation during spin
- Subtle blur (0 → 1px → 0px) over 4 seconds
- Applied via `.blur-wheel` class

**Confetti:**
- Uses `canvas-confetti` library
- Fires from both sides of screen
- 3-second duration with particle effects
- Configurable via `showConfetti` prop

### Debug Page (`/dashboard/admin/debug/wheel`)

Interactive testing page with:

**1. Control Panel**
- Color pickers (primary, secondary, accent)
- Range sliders (radius, duration)
- Toggles (joker, confetti)
- Number input (gidouille reward)

**2. Student List Editor**
- Add/remove students dynamically
- Pre-loaded with 8 mock students
- Real-time wheel updates

**3. Preset Configurations**
- Default (Pink/Blue)
- Dark Mode
- Vibrant
- Ocean
- Reset to Defaults button

**4. Code Generation**
- Auto-generates Svelte code
- Shows only non-default props
- Copy to clipboard
- Live preview

**5. Live Wheel Preview**
- Fully functional wheel
- Displays last winner
- All callbacks working

### Teacher Dashboard Integration

The Wheel component is integrated into the Teacher Dashboard in two ways:

#### 1. Standalone Page (`/dashboard/teacher/wheel`)

**Features:**
- Class selector dropdown (native `<select>`)
- Gidouille reward configuration
- Student count display
- Auto-refresh after rewards
- Toast notifications

**API Endpoint:** `/api/rewards/gidouilles`
- Validates teacher-student relationship
- Increments gidouille balance
- Returns new total

#### 2. Teacher Dashboard Modal (NEW)

**Location:** `/dashboard` (Teacher Dashboard main page)
**Component:** `src/routes/(protected)/dashboard/TeacherDashboard.svelte`

**Access:**
Teachers can launch the wheel directly from the dashboard via a gradient "Choisir un élève" button in the Class Selection card.

**Features:**
- **On-demand student fetching**: API call `/api/classes/[classId]/students` when modal opens
- **Wide modal**: Responsive width (80-90vw) to properly fit the wheel
- **No gidouille rewards**: Pure random selection (no points awarded)
- **Confetti above modal**: `confettiZIndex={100}` ensures visibility
- **Loading state**: Spinner while fetching students
- **Empty state**: Graceful handling when no students
- **Winner display**: Built into Wheel component below the wheel
- **Continuous spinning**: Click "Lancer la roue" multiple times without closing modal

**Button Styling:**
```svelte
<Button
  onclick={handleOpenWheel}
  disabled={!selectedClassId || (selectedClass.student_count || 0) === 0}
  class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600
         hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl
         transition-all duration-200"
>
  <Target class="h-5 w-5 mr-2" />
  Choisir un élève
</Button>
```

**Modal Structure:**
```svelte
<Dialog.Root bind:open={wheelModalOpen}>
  <Dialog.Content class="sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw]">
    <Dialog.Header>
      <Dialog.Title>Choisir un élève</Dialog.Title>
      <Dialog.Description>
        Sélectionnez aléatoirement un élève de {selectedClass.name}
      </Dialog.Description>
    </Dialog.Header>

    {#if isLoadingStudents}
      <!-- Loading spinner -->
    {:else if wheelStudents.length === 0}
      <!-- Empty state -->
    {:else}
      <Wheel
        students={wheelStudents}
        onWinner={handleWinner}
        showConfetti={true}
        confettiZIndex={100}
      />
    {/if}
  </Dialog.Content>
</Dialog.Root>
```

**API Endpoint:** `GET /api/classes/[classId]/students`
- **Security**: Verifies teacher owns the class
- **Returns**: `{ students: Array<{ id, firstname, lastname, avatar_url }> }`
- **RLS**: Teachers can only access their own classes
- **Error handling**: 401 Unauthorized, 403 Forbidden, 404 Not Found

**User Flow:**
1. Teacher selects a class from dropdown (auto-selects first class on load)
2. "Choisir un élève" button becomes enabled
3. Click button → Modal opens with loading spinner
4. Students fetched via API → Wheel displays
5. Click "Lancer la roue" → Wheel spins with confetti
6. Winner displays below wheel with name
7. Can spin again immediately or close modal with X button

**Edge Cases Handled:**
- No class selected → Button disabled with tooltip
- Class with 0 students → Button disabled with tooltip
- API fetch error → Toast error, modal closes
- Empty class → "Cette classe ne contient aucun élève" message

### Winner Calculation Algorithm

**CRITICAL: The Proven Formula**

```typescript
const winnerIndex = Math.floor((normalizedAngle * wheelData().length) / 360);
const winner = students[winnerIndex];
```

**Why This Works:**
- The wheel SVG has `transform: rotate(-{angle + 90}deg)` (see line 428 in Wheel.svelte)
- The `-90deg` offset aligns the first slice with the top pointer
- As the wheel rotates, this formula correctly maps the final angle to the student index
- **Works on first spin** (angle 0-360) **and all subsequent spins** (any normalized angle)

**Example with 8 students (45° per slice):**
| Final Angle | Calculation | Winner Index | Student |
|-------------|-------------|--------------|---------|
| 0° | floor(0 × 8 / 360) = 0 | 0 | First student |
| 45° | floor(45 × 8 / 360) = 1 | 1 | Second student |
| 90° | floor(90 × 8 / 360) = 2 | 2 | Third student |
| 270° | floor(270 × 8 / 360) = 6 | 6 | Seventh student |

**Important Notes:**
- **DO NOT** modify this formula without testing extensively
- **DO NOT** try to "fix" it with angle adjustments or inversions
- This is the original formula from `Wheel-Old.svelte:92` that has been proven to work
- The formula accounts for the wheel's initial rotation offset
- Calculates based on the **final normalized angle** after spin completes

**Text Color Contrast:**
- Pink slices (index % 2 === 0): **White text** (good contrast)
- Blue slices (index % 2 === 1): **Dark text** `#1a1a1a` (good contrast)

**Boundary Avoidance:**
The random angle generation ensures we don't land exactly on slice boundaries:
```typescript
const sliceSize = Math.floor(360 / wheelData().length);
do {
  randomAngle = Math.floor(Math.random() * 360) + 1;
} while (randomAngle % sliceSize < 2); // Minimum 2° from boundaries
```

### Default Colors

| Prop | Default Value | Description | Text Color |
|------|---------------|-------------|------------|
| `primaryColor` | `#e7c9de` | Pink (main wheel slices) | White |
| `secondaryColor` | `#3a507e` | Dark blue (alternating slices) | Dark (#1a1a1a) |
| `accentColor` | `#788bb2` | Gray-blue (outer ring/center) | N/A |
| Yellow dots | `#f9ef69` | Decorative perimeter dots | N/A |
| Marker gradient | `#f9ef69` → `#ff9800` | Orange-yellow pointer | N/A |

### Component Behavior Updates (v2)

**Recent Improvements:**
1. **Single Button**: Removed "Recommencer" button - now only "Lancer la roue"
   - Can spin again immediately without resetting
   - Simpler UX with one consistent button

2. **Continuous Spinning**: Wheel continues from current position
   - First spin: 0° → 3240° (9 rotations + random)
   - Second spin: 3240° → 6480° (9 more rotations + random)
   - Angle normalized after each spin for accurate winner calculation

3. **Confetti Z-Index**: New `confettiZIndex` prop
   - Default: 0 (for standalone pages)
   - Set to 100+ for modal usage (above Dialog z-50)
   - Ensures confetti visibility in all contexts

4. **Text Contrast**: Automatic color adjustment
   - White text on light pink slices
   - Dark text on dark blue slices
   - Ensures readability for all students

### Best Practices

**DO:**
- Use even number of students for perfect visual balance
- Set `addJokerIfOdd={true}` to balance odd numbers
- Set `confettiZIndex={100}` when using inside modals
- Provide meaningful `onWinner` callback
- Use color picker in debug page to test themes
- Test with different student counts (2, 5, 10, 20)

**DON'T:**
- Use extremely small (`< 10em`) or large (`> 30em`) radius
- Rely on `gidouilleReward` without `onRewardGiven` callback
- Pass empty students array (component handles it gracefully)
- Modify wheel props during spinning (wait for `onSpinEnd`)

### Troubleshooting

**Wheel not spinning:**
- Check that `students` array is not empty
- Verify `isSpinning` state is not stuck
- Look for JavaScript errors in console

**Wrong student selected:**
- Verify students array hasn't changed during spin
- Check that angle calculation matches student count
- Test in debug page with known student lists

**Colors not applying:**
- Ensure hex color format is correct (`#rrggbb`)
- Check that props are passed correctly
- Use debug page to test color combinations

**Confetti not showing:**
- Verify `showConfetti={true}` (default)
- Check browser console for `canvas-confetti` errors
- Ensure `canvas-confetti` package is installed

### Performance Notes

- GPU-accelerated with `transform: translate3d()`
- Efficient SVG rendering (no canvas)
- Minimal re-renders with Svelte 5 runes
- Confetti runs in separate animation loop
- Suitable for classes up to 50 students

---

**Remember:** Svelte 5 and SvelteKit 2 are designed to be simpler and more intuitive. When in doubt, prefer explicit, straightforward code over clever tricks.
