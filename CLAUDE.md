# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

> **📚 For detailed feature documentation**, see **[CLAUDE_FEATURES.md](CLAUDE_FEATURES.md)**

## Project Overview

Educational math application for French-speaking students. **Language**: French UI, English code comments.

**Stack**: Svelte 5 (runes) • TypeScript (strict) • Tailwind CSS 4 • Shadcn-svelte • MathLive • Vercel • pnpm

## Development Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm check            # Type checking
pnpm lint             # Check formatting/linting
pnpm format           # Format code
pnpm test:unit        # Vitest tests
pnpm db:migrate       # Push Supabase migrations
pnpm release          # Create version release
```

### Development Ports

- **Port 5173**: User's main dev server (DO NOT USE)
- **Port 5175**: Claude's testing port (ALWAYS USE: `pnpm dev -- --port 5175`)

## Code Quality

- ✅ All Prettier passing, build succeeds
- ⚠️ ~280 non-blocking ESLint warnings (complex types, tests)
- Run `pnpm format` before committing
- Fix ESLint errors in new code

## Version Management

Automated with Husky + Conventional Commits (main branch only).

**Commit format**: `<type>: <subject>` (feat, fix, docs, etc.)
**Release**: `pnpm release` then `git push --follow-tags origin main`

See: [GIT_WORKFLOW.md](GIT_WORKFLOW.md), [VERSION_MANAGEMENT.md](VERSION_MANAGEMENT.md)

## Testing

- **Client tests** (`*.svelte.test.ts`): Browser environment (Playwright)
- **Server tests** (`*.test.ts`): Node environment
- **E2E tests** (`e2e/`): Playwright

## Project Structure

```
src/
├── lib/
│   ├── components/     # Reusable components
│   ├── server/         # Server-only utilities
│   ├── stores/         # Shared state
│   ├── utils/          # Shared utilities
│   └── types/          # TypeScript types
├── routes/
│   ├── (app)/          # Route groups
│   ├── api/            # API routes
│   └── +layout.svelte
└── app.html
```

**File ordering**: Imports → Types → Constants → Variables → Functions → Components

## Data Fetching

- Prefer SvelteKit `load` functions for data fetching
- Prefer SvelteKit form actions for mutations

## Performance Pattern: Optimistic UI + Debouncing

For frequent server updates (counters, quantities), use optimistic updates with debouncing.

**Reference**: `src/routes/(protected)/dashboard/teacher/rewards/+page.svelte`

**Key points**:

- Track optimistic values in `$state<Record<string, number>>({})`
- Debounce with delta accumulation (500ms recommended)
- Rollback on error
- Cleanup on unmount

## Code Style

1. Use early returns
2. Descriptive names
3. Prefix event handlers with "handle"
4. Use `const` where appropriate
5. DRY principle

## UI Components (Shadcn-svelte)

**Location**: `src/lib/components/ui/`
**Docs**: https://www.shadcn-svelte.com/docs

**Available**: Button, Input, Textarea, Select, Dropdown Menu, Avatar, Tabs, Separator

**Add components**: `npx shadcn-svelte@latest add <component-name>`

### Key Patterns

**Imports**:

```svelte
import {Button} from '$lib/components/ui/button'; import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
```

**Event handlers**: Use lowercase (`onclick`, NOT `on:click`)

**Dropdown navigation**: Wrap `<a>` inside `DropdownMenu.Item`

**Styling**: Use semantic classes (`bg-background`, `text-foreground`, `border-border`)

**Utility**: `cn()` from `$lib/utils` for conditional classes

### Toast Notifications

```svelte
import {toaster} from '$lib/stores/toaster.svelte'; toaster.success('Message'); // Also: error, warning,
info
```

Config: `<Toaster />` in root layout (top-right, max 5, 12px gaps)

### Rich Text Editor (Forms)

**Component**: `FormRichTextEditor.svelte`

```svelte
import FormRichTextEditor from '$lib/components/rich-text/FormRichTextEditor.svelte'; let
description = $state('Initial HTML content');
<FormRichTextEditor bind:value={description} placeholder="..." />
```

**Features**: Text formatting, headings, lists, colors, emojis, LaTeX formulas (MathLive), code blocks

**Storage**: HTML string with custom `<math-inline latex="...">` elements

### Theme & Font Scaling

**Dark mode**:

```typescript
import { theme } from '$lib/stores/theme.svelte';
theme.toggle(); // or theme.dark
```

**Font scaling**:

```typescript
import { fontSize } from '$lib/stores/fontSize.svelte';
fontSize.increase(); // Also: decrease, reset
```

## Database (Supabase)

### Migrations Workflow

1. **Claude creates** `.sql` files in `supabase/migrations/` (format: `<timestamp>_<description>.sql`)
2. **User pushes** via `pnpm db:migrate`
3. **Update** `src/lib/types/database.ts` and `DATABASE_SCHEMA.md`

**Important**:

- DO NOT make schema changes in Supabase Dashboard
- Always create timestamped migrations
- Keep docs synchronized

### Student Import System

- **Normal flow**: Import → Pending students → Login → Auto-enrollment
- **Edge case**: Login before import → Direct `class_members` insertion
- **Source of truth**: `class_members` table (NOT `class_ids` array)

### Google OAuth & Avatars

**Domain**: `@voltairedoha.com` only

**Avatar extraction**:

```typescript
const avatarUrl = user.user_metadata?.picture || user.user_metadata?.avatar_url;
```

**Priority**: `profile.avatar_url` → `user.user_metadata.picture` → role/gender fallback → initials

**Debug**: `/debug-avatar` page

## Svelte 5 Essentials

### Runes

- `$state(value)` - Reactive state (NOT `let`)
- `$derived(expr)` - Computed values (NOT `$:`)
- `$effect(() => {})` - Side effects (NOT `$:`)
- `$props()` - Component props (NOT `export let`)
- `$bindable()` - Two-way binding

### Components

- **Dynamic components**: Just `<Component />` (NO `<svelte:component>`)
- **Snippets**: Replace slots with `{#snippet}` and `{@render}`
- **Events**: Callback props (NOT `createEventDispatcher`)

### Context

Pass state as function:

```svelte
setContext('key', () => value); // Correct let value = $derived(getContext('key')()); // Access
```

### Anti-Patterns

- ❌ Don't use `$:` - use runes
- ❌ Don't use `export let` - use `$props()`
- ❌ Don't use `<svelte:component>` - direct reference
- ❌ Don't mix `$state` with stores

## SvelteKit Patterns

### Routes

- `+page.svelte` - Pages
- `+layout.svelte` - Layouts
- `+page.server.js` - Server load/actions
- `+server.js` - API endpoints

### Data Loading

```javascript
// +page.server.js
export async function load({ params, fetch }) {
	return { data };
}
```

Access via `let { data } = $props();`

### Forms

```javascript
// +page.server.js
export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		// Process...
		return { success: true };
	}
};
```

Use `use:enhance` for progressive enhancement.

### Navigation

```javascript
import { goto, invalidate, invalidateAll } from '$app/navigation';
import { page } from '$app/state'; // NOT $page store
```

## MCP Tools (Svelte)

1. **list-sections** - Discover docs (use FIRST)
2. **get-documentation** - Fetch sections (analyze use_cases)
3. **svelte-autofixer** - Validate code (use BEFORE sending to user)
4. **playground-link** - Generate playground (ask user first, NOT for project files)

## Feature Documentation

- **[CLAUDE_FEATURES.md](CLAUDE_FEATURES.md)** - Demo pages, VIP cards, cache, schedule, wheel, games
- **[CLAUDE_FEATURES_QUESTION_BANK.md](CLAUDE_FEATURES_QUESTION_BANK.md)** - Variables, random generation, 6 question types, draft/published workflow
- **[CLAUDE_FEATURES_ASSESSMENT.md](CLAUDE_FEATURES_ASSESSMENT.md)** - Teacher assessments, graded evaluations, assignment tracking, results dashboard
- **[ERROR_MONITORING_SYSTEM.md](ERROR_MONITORING_SYSTEM.md)** - Error logging, admin dashboard, critical alerts (🆕 2025-10-23)
- **[README_DOCS.md](README_DOCS.md)** - Master documentation index (all features)

---

**Remember**: Prefer explicit, straightforward code over clever tricks.
