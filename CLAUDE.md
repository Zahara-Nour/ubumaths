# CLAUDE.md

Guide essentiel pour Claude Code lors du développement d'UbuMaths.

> **📚 Documentation détaillée** : Voir [docs/claude/](docs/claude/) pour architecture, best practices, et quality standards

---

## 🎯 Project Overview

Application éducative de mathématiques pour élèves francophones.

**Langue** : UI en français, code/comments en anglais
**Stack** : Svelte 5 (runes) • TypeScript (strict) • Tailwind CSS 4 • Shadcn-svelte • MathLive • Supabase • Vercel • pnpm

---

## 🚀 Quick Start

```bash
# Development
pnpm dev -- --port 5175    # TOUJOURS utiliser port 5175 (Claude)
pnpm build                 # Build production

# Quality checks
pnpm check                 # Type checking (TypeScript + Svelte)
pnpm lint                  # ESLint (cached, fast)
pnpm format                # Prettier formatting

# Tests
pnpm test:unit             # Unit tests (Vitest)
pnpm test:triggers         # Database triggers (Docker required)

# Database
pnpm db:start              # Start Supabase local (Docker)
pnpm db:stop               # Stop Supabase local
pnpm db:migrate            # Push migrations to Supabase

# Release
pnpm release               # Create release (main branch only)
```

### Ports de développement

- **5175** : Port Claude ✅ TOUJOURS UTILISER
- **5173** : Port utilisateur ❌ NE PAS UTILISER
- **54321** : Supabase local (tests de triggers)

---

## 📊 Code Quality Standards

**Current Status** (Updated: 2025-10-28)

- ✅ **Build**: Passing, 0 errors
- ✅ **ESLint**: 0 errors (29 warnings - legitimate Svelte patterns)
- ✅ **TypeScript**: 0 errors in production + tests
- ✅ **Tests**: 2,430/2,454 passing (99.0% pass rate)
- ✅ **Security**: CSRF, XSS protection, 100% API validation with Zod

**Standards** : Maintenir 0 errors obligatoire • Tests requis • Pre-commit hook automatique

**📖 Détails** : [docs/claude/quality-standards.md](docs/claude/quality-standards.md)

---

## ⚡ Essential Rules

### 🚨 CRITICAL: Always Validate Input with Zod

**❌ NEVER** accept user input without validation:

```typescript
const body = await request.json();
const { userId, amount } = body; // ❌ CRITICAL SECURITY VIOLATION
```

**✅ ALWAYS** use Zod schemas:

```typescript
import { z } from 'zod';

const schema = z.object({
	userId: z.string().uuid(),
	amount: z.number().int().positive().max(1000)
});

const validation = schema.safeParse(await request.json());
if (!validation.success) {
	throw error(400, validation.error.issues[0].message);
}
const { userId, amount } = validation.data; // ✅ Type-safe AND validated
```

**📖 Complete Guide** : [docs/claude/quality-standards.md#input-validation-with-zod](docs/claude/quality-standards.md#input-validation-with-zod)

---

### 🧩 CRITICAL: Always Use MySelect Component

**✅ Use** : `import MySelect from '$lib/components/MySelect.svelte';`
**❌ NEVER use** : Shadcn-svelte Select or native `<select>` elements

```svelte
<script>
	let selectedValue = $state('option1');
	const items = [
		{ value: 'option1', label: 'Option 1' },
		{ value: 'option2', label: 'Option 2' }
	];
</script>

<MySelect type="single" bind:value={selectedValue} {items} />
```

**Why?** SSR-compatible, consistent API, Svelte 5 runes.
**📖 Complete Guide** : [docs/claude/ui-components.md#myselect-component](docs/claude/ui-components.md#myselect-component)

---

### 💾 Svelte 5 Runes (Not Svelte 4)

**✅ DO** (Svelte 5):

```svelte
<script>
	let count = $state(0); // Reactive state
	let doubled = $derived(count * 2); // Computed value
	let { title, count = 0 } = $props(); // Component props

	$effect(() => {
		console.log(`count: ${count}`); // Side effects
	});
</script>
```

**❌ DON'T** (Svelte 4 - deprecated):

```svelte
<script>
	export let myProp; // ❌ Use $props()
	$: computed = x * 2; // ❌ Use $derived()
	$: {
		/* effect */
	} // ❌ Use $effect()
</script>
```

**📖 Complete Guide** : [docs/claude/best-practices.md#svelte-5-runes](docs/claude/best-practices.md#svelte-5-runes)

---

### 🚫 TypeScript: Never Use `any` Type

**❌ NEVER**:

```typescript
const data: any = fetchData(); // ❌ Disables type checking
function handleEvent(event: any) {} // ❌ Hides bugs
```

**✅ ALWAYS use proper types**:

```typescript
import type { Database } from '$lib/types/database';
type User = Database['public']['Tables']['users']['Row'];

const data: User = fetchData(); // ✅ Type-safe
function handleEvent(event: MouseEvent) {} // ✅ Specific type

// For unknown types, use 'unknown' + type guards
const data: unknown = fetchData();
if (isUser(data)) {
	/* now data is User */
}
```

**Why?** `@typescript-eslint/no-explicit-any` is enforced. Fixed 209 violations in 2025-10-27.
**📖 Alternatives** : [docs/claude/best-practices.md#typescript-best-practices](docs/claude/best-practices.md#typescript-best-practices)

---

## 🗃️ Database (Supabase)

### Migration Workflow

1. **Claude crée** `.sql` dans `supabase/migrations/` (format: `<timestamp>_<description>.sql`)
2. **User push** via `pnpm db:migrate`
3. **Update** `src/lib/types/database.ts` et `docs/architecture/database-schema.md`

**Important** : NE PAS modifier le schéma dans Supabase Dashboard. Toujours créer migrations timestampées.

**📖 Complete Guide** : [docs/claude/database.md](docs/claude/database.md)

---

## 🏗️ Project Structure

```
src/
├── lib/
│   ├── components/     # Reusable components (Shadcn, MySelect)
│   ├── server/         # Server-only utilities
│   │   └── validation/ # Zod schemas (REQUIRED for all endpoints)
│   ├── stores/         # Shared state (Svelte stores)
│   ├── utils/          # Shared utilities
│   └── types/          # TypeScript types
├── routes/
│   ├── (public)/       # Public routes (no auth)
│   ├── (protected)/    # Protected routes (auth required)
│   ├── api/            # API endpoints (+server.ts)
│   └── +layout.svelte
└── app.html
```

**File Order** : Imports → Types → Constants → Variables → Functions → Components

**📖 Complete Guide** : [docs/claude/architecture.md](docs/claude/architecture.md)

---

## 📚 Documentation

### For Claude Code

- **[Architecture](docs/claude/architecture.md)** - Structure, routing, data fetching, performance
- **[Best Practices](docs/claude/best-practices.md)** - Svelte 5, TypeScript, anti-patterns
- **[UI Components](docs/claude/ui-components.md)** - Shadcn, MySelect, Tailwind
- **[Database](docs/claude/database.md)** - Supabase, migrations, schema
- **[Quality Standards](docs/claude/quality-standards.md)** - Tests, linting, Zod validation ⭐

### For Users (Complete Documentation)

- **[Master Index](docs/README.md)** - Complete documentation index
- **[Features](docs/features/)** - Questions, Assessments, SRS, Riddles, Error Monitoring
- **[Architecture](docs/architecture/)** - Components, routing, database schema
- **[Guides](docs/guides/)** - Student import, creating exercises
- **[Development](docs/development/)** - Git workflow, version management, migrations

---

## 🎯 Common Patterns

### Toast Notifications

```typescript
import { toaster } from '$lib/stores/toaster.svelte';
toaster.success('Message'); // error, warning, info
```

### Event Handlers (lowercase)

```svelte
<Button onclick={handleClick}>Click me</Button>
```

### Optimistic UI + Debouncing

```typescript
let optimistic = $state<Record<string, number>>({});
let debounceTimer: ReturnType<typeof setTimeout>;

function handleUpdate(id: string, delta: number) {
	optimistic[id] = (optimistic[id] || 0) + delta;

	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(async () => {
		await updateServer(id, optimistic[id]);
		optimistic[id] = 0;
	}, 500);
}
```

**📖 Complete Guide** : [docs/claude/architecture.md#performance-patterns](docs/claude/architecture.md#performance-patterns)

---

## ✅ Pre-Commit Checklist

Before committing code with API endpoints or forms:

- [ ] All `request.json()` calls have Zod validation
- [ ] All query parameters are validated
- [ ] All numeric inputs have bounds (`.min()`, `.max()`, `.finite()`)
- [ ] All arrays have size limits (`.max()`)
- [ ] All UUIDs validated (`.uuid()`)
- [ ] Tests exist and pass (`pnpm test:unit`)
- [ ] No `any` types used
- [ ] Using MySelect (not Shadcn Select or `<select>`)
- [ ] Svelte 5 runes (not Svelte 4 patterns)
- [ ] Lint passes (`pnpm lint`)

**Note** : Pre-commit hook automatically runs `lint-staged` on `git commit`.

---

**Remember** : Préférer le code explicite et simple plutôt que les astuces clever.

**📖 Full Documentation** : [docs/claude/](docs/claude/) • [docs/README.md](docs/README.md)
