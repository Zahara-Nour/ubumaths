# CLAUDE.md

Guide essentiel pour Claude Code lors du développement d'UbuMaths.

> **📚 Documentation complète** : Voir [/docs/README.md](docs/README.md)

---

## 🎯 Project Overview

Application éducative de mathématiques pour élèves francophones.

**Langue** : UI en français, code/comments en anglais
**Stack** : Svelte 5 (runes) • TypeScript (strict) • Tailwind CSS 4 • Shadcn-svelte • MathLive • Supabase • Vercel • pnpm

---

## 🚀 Quick Start

```bash
pnpm dev              # Démarre le serveur dev
pnpm build            # Build production
pnpm check            # Type checking
pnpm lint             # Vérification format/lint
pnpm format           # Formatage code
pnpm test:unit        # Tests unitaires (Vitest)
pnpm test:triggers    # Tests triggers database (Docker requis)
pnpm db:start         # Démarre Supabase local (Docker)
pnpm db:stop          # Arrête Supabase local
pnpm db:migrate       # Push migrations Supabase
pnpm release          # Créer une release (main branch)
```

### Redis Cache Commands

```bash
# Check cache health (requires Redis configured)
curl http://localhost:5175/api/health/redis

# Run cache tests
pnpm test:unit tests/unit/cache.test.ts
pnpm test:unit tests/unit/*-cache.test.ts

# Run E2E cache tests
npx playwright test e2e/redis-cache
```

### Ports de développement

- **5173** : Port utilisateur (NE PAS UTILISER)
- **5175** : Port Claude (TOUJOURS UTILISER : `pnpm dev -- --port 5175`)
- **54321** : Supabase local (pour tests de triggers)

### Redis Cache Configuration

Configure Upstash Redis credentials in `.env`:

```bash
# .env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

**Features**:

- ✅ Assessment results caching (5 min TTL) - 88% faster load
- ✅ Activity polling caching (30s TTL) - 95% less DB queries
- ✅ Rate limiting (login, signup, chatbot) - Multi-instance safe
- ✅ Fail-safe design (works without Redis configured)

**Setup Guide**: See [docs/guides/redis-cache-setup.md](docs/guides/redis-cache-setup.md)

**Free tier**: 10K requests/day, 256MB storage (sufficient for dev)

---

## 📊 Code Quality

**🎯 Current Status** (Updated: 2025-10-28 - Post-Validation Testing)

- ✅ **Build**: Passing, no errors
- ✅ **Prettier**: All files formatted
- ✅ **ESLint (Production)**: 0 errors in main codebase
- ✅ **ESLint (Tests)**: 0 errors (was 57) - **NEW: All test file errors fixed!**
- ✅ **TypeScript (Production)**: 0 errors in main codebase
- ✅ **Test Suite**: 2,430/2,454 passing (99.0% pass rate, 24 skipped)
- ✅ **Zod Validation Tests**: 366 tests, 100% pass rate (was 97.3%) - **NEW: All validation schemas tested!**
- ⚠️ **ESLint (Warnings)**: 29 warnings (legitimate Svelte reactivity patterns)

**Achievement**: 100% error-free codebase + fixed all 57 test file type errors

**Security** (NEW):

- ✅ **CSRF Protection**: Implemented in hooks.server.ts (origin validation)
- ✅ **XSS Prevention**: DOMPurify sanitization on all user-generated content
- ✅ **Admin Authorization**: Role checks added to all admin API endpoints
- ✅ **AI Chatbot**: Rate limited (5 req/15min) + authenticated
- ✅ **Input Validation**: 100% of API endpoints have Zod validation (50+ endpoints validated, 0 vulnerabilities) - See [🛡️ Input Validation](#🛡️-input-validation-with-zod)

**Performance** (NEW):

- ✅ **Assessment Results**: 90% faster (3.6s → 0.4s load time)
- ✅ **Database Indexes**: 13 new indexes for hot paths
- ✅ **N+1 Queries**: Eliminated in assessment results (244 → 6 queries, 97% reduction)

**Standards**:

- **Avant commit**: Automatique via `lint-staged` hook
- **Nouveau code**: Maintenir 0 errors obligatoire
- **Tests**: All new code must have tests, 100% pass rate required
- **Database Triggers**: Tested via integration tests (see `tests/database/README.md`)

### 🚨 IMPORTANT: Efficient Linting Strategy

**NEVER** run `pnpm eslint . --no-cache` or full uncached lint - it takes ~30s.

**✅ DO** (Fast & Efficient):

```bash
# 1. After making changes - lint ONLY changed files
pnpm eslint path/to/changed/file.ts --cache

# 2. Before major steps - lint specific directory
pnpm eslint src/lib/exercises/ --cache

# 3. Final verification - full cached lint (3-5s)
pnpm lint  # Uses --cache by default now
```

**Why?**

- ESLint cache makes subsequent runs **6-10x faster** (30s → 3-5s)
- Linting specific files is **instant** (~0.5s)
- `lint-staged` runs automatically on commit (only staged files)

**Pre-commit Hook**:

- Automatically runs `lint-staged` on `git commit`
- Lints & formats only staged files (~1-2s)
- Auto-fixes issues when possible
- **Blocks commit** if errors remain

---

## 🏗️ Project Structure

```
src/
├── lib/
│   ├── components/     # Composants réutilisables
│   ├── server/         # Utilitaires server-only
│   ├── stores/         # État partagé
│   ├── utils/          # Utilitaires partagés
│   └── types/          # Types TypeScript
├── routes/
│   ├── (public)/       # Routes publiques
│   ├── (protected)/    # Routes protégées (auth auto)
│   ├── api/            # API endpoints
│   └── +layout.svelte
└── app.html
```

**Ordre des fichiers** : Imports → Types → Constants → Variables → Functions → Components

---

## ⚠️ Erreurs courantes à éviter

### ❌ DON'T

```svelte
<!-- Svelte 5 deprecations -->
<script>
	export let myProp; // ❌ Use $props()
	$: computed = x * 2; // ❌ Use $derived()
	$: {
		/* effect */
	} // ❌ Use $effect()
</script>
```

```typescript
// TypeScript anti-patterns
const data: any = fetchData(); // ❌ NEVER use 'any' type
const result: any = processUser(user); // ❌ Breaks type safety
function handleEvent(event: any) {} // ❌ Disables type checking

// ❌ Type assertion without validation (CRITICAL SECURITY ISSUE)
const data: UserData = await request.json(); // NO runtime validation!
const { userId, amount } = data; // Unsafe - could be anything!
```

### ✅ DO

```svelte
<script>
	let { myProp } = $props(); // ✅ Svelte 5 runes
	let computed = $derived(x * 2);
	$effect(() => {
		/* effect */
	});
</script>
```

```typescript
// TypeScript best practices
import type { Database } from '$lib/types/database';
type User = Database['public']['Tables']['users']['Row'];

const data: User = fetchData(); // ✅ Use proper types from database
const result: ProcessedUser = processUser(user); // ✅ Define custom types
function handleEvent(event: MouseEvent) {} // ✅ Use specific types

// For truly unknown types, use 'unknown' and narrow with type guards
const data: unknown = fetchData();
if (isUser(data)) {
	// Now TypeScript knows data is User
}

// ✅ Zod validation with type inference (SECURE)
import { userSchema } from '$lib/server/validation/users';
const validation = userSchema.safeParse(await request.json());
if (!validation.success) {
	throw error(400, validation.error.issues[0].message);
}
const data = validation.data; // Type-safe AND runtime-validated!
```

**🚨 CRITICAL: Never use `any` type**

- **Project Standard**: `@typescript-eslint/no-explicit-any` is enforced
- **Why it matters**: `any` disables TypeScript's type checking and hides bugs
- **Impact**: Fixed 209 `any` violations in test files (2025-10-27)
- **Alternatives**: Use specific types, `unknown` with type guards, or generics
- **Reference**: [Type Safety Patterns](docs/development/type-safety-patterns.md)

---

## 🛡️ Input Validation with Zod

**GOLDEN RULE**: ALL user input MUST be validated with Zod before processing.

**Why this matters**: 80% of API endpoints currently lack proper input validation, creating 23 security vulnerabilities (7 critical). TypeScript types provide zero runtime protection.

### 🚨 Critical Requirements

**❌ NEVER** accept user input without validation:

```typescript
// ❌ CRITICAL SECURITY VIOLATION - No validation
const body = await request.json();
const { userId, amount } = body; // Could be ANYTHING!

// ❌ Type assertion without runtime validation
const data: CreateUserData = await request.json(); // TypeScript types don't run at runtime!

// ❌ Weak manual validation
if (!userId || typeof amount !== 'number') {
	/* ... */
} // Incomplete, allows NaN, Infinity, negative values, etc.
```

**✅ ALWAYS** use Zod schemas:

```typescript
// ✅ CORRECT: Zod validation with proper error handling
import { z } from 'zod';

const createUserSchema = z.object({
	userId: z.string().uuid('ID utilisateur invalide'),
	amount: z.number().int().positive().max(1000)
});

const body = await request.json();
const validation = createUserSchema.safeParse(body);

if (!validation.success) {
	throw error(400, validation.error.issues[0].message);
}

const { userId, amount } = validation.data; // Guaranteed to be valid!
```

### 📍 Where to Use Zod

**Required for ALL:**

- ✅ API endpoints (`/src/routes/api/**/*+server.ts`) - Request bodies, query params
- ✅ Form actions (`+page.server.ts`) - Form data
- ✅ Server-side functions processing user input
- ✅ WebSocket message handlers
- ✅ File upload handlers

**Examples:**

```typescript
// API endpoint
export const POST: RequestHandler = async ({ request }) => {
	const validation = mySchema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}
	// ... use validation.data
};

// Form action
export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const validation = myFormSchema.safeParse(Object.fromEntries(formData));
		if (!validation.success) {
			return fail(400, { errors: validation.error.flatten() });
		}
		// ... use validation.data
	}
};

// Query parameters
const paginationSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20)
});

const validation = paginationSchema.safeParse({
	page: url.searchParams.get('page'),
	limit: url.searchParams.get('limit')
});
```

### 🏗️ Validation Library Structure

**Location**: `src/lib/server/validation/` (à créer)

**Recommended structure**:

```
src/lib/server/validation/
├── index.ts          # Re-exports all schemas
├── common.ts         # Shared utilities (UUIDs, pagination, grades)
├── users.ts          # User-related schemas
├── assessments.ts    # Assessment schemas
├── questions.ts      # Question schemas
├── rewards.ts        # Gidouilles/rewards schemas
└── admin.ts          # Admin operation schemas
```

**Import pattern**:

```typescript
import { createUserSchema } from '$lib/server/validation/users';
import { uuidSchema, paginationSchema } from '$lib/server/validation/common';
```

### 📝 Writing Zod Schemas

**Best practices**:

```typescript
import { z } from 'zod';

// 1. Use descriptive names ending in "Schema"
export const createAssessmentSchema = z.object({
	// 2. Validate string constraints
	title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long'),
	description: z.string().trim().optional(),

	// 3. Validate numeric bounds
	duration_minutes: z.number().int().min(1).max(300),
	max_points: z.number().int().positive().finite(),

	// 4. Validate UUIDs
	teacher_id: z.string().uuid('ID enseignant invalide'),

	// 5. Validate enums
	grade: z.enum(['6eme', '5eme', '4eme', '3eme']),
	status: z.enum(['draft', 'published', 'archived']),

	// 6. Validate arrays with limits
	categories: z.array(z.string()).min(1, 'Au moins une catégorie requise').max(10),
	student_ids: z.array(z.string().uuid()).max(200, 'Maximum 200 élèves'),

	// 7. Optional with defaults
	is_public: z.boolean().default(false),

	// 8. Nested objects
	settings: z
		.object({
			allow_retakes: z.boolean(),
			show_solutions: z.boolean()
		})
		.optional()
});

// 9. Infer TypeScript types from schemas
export type CreateAssessmentData = z.infer<typeof createAssessmentSchema>;

// 10. Reuse and extend schemas
export const updateAssessmentSchema = createAssessmentSchema.partial();
export const assessmentIdSchema = createAssessmentSchema.pick({ teacher_id: true });
```

### 🎯 Common Validation Patterns

**UUIDs**:

```typescript
z.string().uuid('Format ID invalide');
```

**Positive integers with bounds**:

```typescript
z.number().int().positive().max(1000);
```

**Non-empty strings with length limits**:

```typescript
z.string().trim().min(1, 'Champ requis').max(200, 'Trop long');
```

**Arrays with size limits**:

```typescript
z.array(z.string().uuid()).min(1, 'Au moins un élément requis').max(50, 'Maximum 50 éléments');
```

**Optional fields**:

```typescript
z.string().optional(); // string | undefined
z.string().nullable(); // string | null
z.string().optional().nullable(); // string | null | undefined
```

**Enums from database**:

```typescript
z.enum(['6eme', '5eme', '4eme', '3eme']);
z.enum(['student', 'teacher', 'admin']);
```

**Coercion for query params** (strings → numbers):

```typescript
z.coerce.number().int().positive(); // "42" → 42
```

**Discriminated unions** (type-safe polymorphism):

```typescript
const questionSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('multiple_choice'), choices: z.array(z.string()) }),
	z.object({ type: z.literal('open_ended'), max_length: z.number() })
]);
```

### ⚠️ Anti-patterns to Avoid

```typescript
// ❌ Using .any() defeats the purpose
z.object({ data: z.any() }); // Don't do this!

// ❌ No upper bounds (DoS risk - allows massive payloads)
z.string(); // Should have .max(500)
z.array(z.string()); // Should have .max(100)

// ❌ No validation on numeric special values
z.number(); // Allows NaN, Infinity - use .finite()

// ❌ Type assertions instead of validation
const data: MyType = await request.json(); // Runtime types don't exist!

// ❌ Manual validation (incomplete, error-prone)
if (!userId || typeof amount !== 'number') {
	/* ... */
}

// ✅ Use Zod to create runtime types
const validation = mySchema.safeParse(await request.json());
const data = validation.data; // TypeScript infers the type!
```

### 🧪 Testing Validation

**Unit tests** (required for all schemas):

```typescript
import { describe, it, expect } from 'vitest';
import { createAssessmentSchema } from '$lib/server/validation/assessments';

describe('createAssessmentSchema', () => {
	it('accepts valid input', () => {
		const result = createAssessmentSchema.safeParse({
			title: 'Test Assessment',
			grade: '6eme',
			categories: ['Algèbre'],
			duration_minutes: 60,
			max_points: 100,
			teacher_id: '550e8400-e29b-41d4-a716-446655440000'
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing required fields', () => {
		const result = createAssessmentSchema.safeParse({
			title: 'Test'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].path).toContain('grade');
		}
	});

	it('rejects invalid UUID', () => {
		const result = createAssessmentSchema.safeParse({
			title: 'Test',
			grade: '6eme',
			categories: ['Algèbre'],
			duration_minutes: 60,
			max_points: 100,
			teacher_id: 'not-a-uuid'
		});
		expect(result.success).toBe(false);
	});

	it('rejects duration exceeding maximum', () => {
		const result = createAssessmentSchema.safeParse({
			title: 'Test',
			grade: '6eme',
			categories: ['Algèbre'],
			duration_minutes: 999,
			max_points: 100,
			teacher_id: '550e8400-e29b-41d4-a716-446655440000'
		});
		expect(result.success).toBe(false);
	});

	it('rejects empty category array', () => {
		const result = createAssessmentSchema.safeParse({
			title: 'Test',
			grade: '6eme',
			categories: [],
			duration_minutes: 60,
			max_points: 100,
			teacher_id: '550e8400-e29b-41d4-a716-446655440000'
		});
		expect(result.success).toBe(false);
	});
});
```

### 📚 Resources

- **Zod Documentation**: https://zod.dev/
- **Existing Example**: `src/lib/exercises/validation.ts` (excellent reference for schema design)
- **Project Context**: See security audit reports for vulnerabilities prevented by Zod

### 🚦 Pre-commit Checklist

Before committing any endpoint or form action:

- [ ] All `request.json()` calls have Zod validation
- [ ] All query parameters are validated
- [ ] All numeric inputs have bounds checking (`.min()`, `.max()`, `.finite()`)
- [ ] All arrays have size limits (`.max()`)
- [ ] All UUIDs are validated (`.uuid()`)
- [ ] Error messages are clear and user-friendly (French for user-facing errors)
- [ ] Unit tests exist for the validation schema
- [ ] No type assertions (`as Type`) used instead of validation

**Remember**: Type assertions provide compile-time types but **zero runtime protection**. Zod provides both!

---

## 🎨 UI Components

### Shadcn-svelte Components

**Docs** : https://www.shadcn-svelte.com/docs
**Location** : `src/lib/components/ui/`

**Disponibles** : Button, Input, Textarea, Dropdown Menu, Avatar, Tabs, Separator

**Ajouter un composant** : `npx shadcn-svelte@latest add <component>`

### MySelect Component (Select Dropdowns)

**Location** : `src/lib/components/MySelect.svelte`
**Built on** : Bits UI Select (SSR-compatible)

**✅ ALWAYS use MySelect** for all dropdown/select components

**❌ NEVER use** :

- Shadcn-svelte Select (`import * as Select from '$lib/components/ui/select'`)
- Native HTML `<select>` elements

**Why MySelect?** :

- SSR-compatible (unlike Shadcn Select)
- Consistent API across entire codebase
- Built on Bits UI Select (stable, well-tested)
- Accessible, keyboard navigation
- Svelte 5 runes compatible

**Usage** :

```svelte
<script>
	import MySelect from '$lib/components/MySelect.svelte';

	// Two-way binding with $state
	let selectedValue = $state('option1');

	const items = [
		{ value: 'option1', label: 'Option 1' },
		{ value: 'option2', label: 'Option 2' },
		{ value: 'option3', label: 'Option 3', disabled: true }
	];
</script>

<MySelect
	type="single"
	bind:value={selectedValue}
	{items}
	placeholder="Select an option"
	triggerClass="h-9 w-40 rounded-md border" // Optional custom styling
/>
```

**Props** :

- `type`: `"single"` or `"multiple"` (Bits UI Select API)
- `value`: Bindable value (`bind:value`)
- `items`: Array of `{ value: string, label: string, disabled?: boolean }`
- `placeholder`: Optional placeholder text (default: "Select...")
- `triggerClass`: Optional CSS classes for trigger button
- `contentProps`: Optional props for Select.Content (Bits UI)

**Important** : Requires `export const prerender = false;` in `+page.ts` for SSR compatibility

**Standardization (2025-10-27)** : All 20 files using Select/select have been refactored to MySelect
**Documentation** : See [Component Architecture](docs/architecture/components.md)
**Référence** : `src/routes/(public)/games/mathemo/+page.svelte` (lines 26, 262-267)

### Patterns importants

```svelte
<!-- Event handlers -->
<Button onclick={handleClick}>  <!-- ✅ lowercase -->

<!-- Imports -->
import { Button } from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import MySelect from '$lib/components/MySelect.svelte';

<!-- Toast notifications -->
import { toaster } from '$lib/stores/toaster.svelte';
toaster.success('Message');  // error, warning, info
```

---

## 🗃️ Database (Supabase)

### Workflow migrations

1. **Claude crée** `.sql` dans `supabase/migrations/` (format : `<timestamp>_<description>.sql`)
2. **User push** via `pnpm db:migrate`
3. **Update** `src/lib/types/database.ts` et `docs/architecture/database-schema.md`

**Important** :

- NE PAS modifier le schéma dans Supabase Dashboard
- Toujours créer migrations timestampées
- Garder la documentation synchronisée

---

## 💾 Svelte 5 Runes

```typescript
// État réactif
let count = $state(0);

// Valeurs dérivées
let doubled = $derived(count * 2);

// Effets de bord
$effect(() => {
	console.log(`count is ${count}`);
});

// Props de composant
let { title, count = 0 } = $props();

// Props bindables (two-way binding)
let { value = $bindable() } = $props();
```

**Anti-patterns** :

- ❌ `$:` reactive statements → Utiliser `$derived()` ou `$effect()`
- ❌ `export let` → Utiliser `$props()`
- ❌ `<svelte:component>` → Référence directe du composant

---

## ⚡ Performance Pattern : Optimistic UI + Debouncing

Pour les updates serveur fréquentes (compteurs, quantités) :

```typescript
let optimistic = $state<Record<string, number>>({});
let debounceTimer: ReturnType<typeof setTimeout>;

function handleUpdate(id: string, delta: number) {
	// 1. Update optimiste immédiat
	optimistic[id] = (optimistic[id] || 0) + delta;

	// 2. Debounce update serveur
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(async () => {
		try {
			await updateServer(id, optimistic[id]);
			optimistic[id] = 0; // Reset
		} catch (error) {
			optimistic[id] = 0; // Rollback on error
		}
	}, 500);
}
```

**Référence** : `src/routes/(protected)/dashboard/teacher/rewards/+page.svelte`

---

## 💾 Caching Strategy

### Hybrid Cache System

UbuMaths uses a two-tier caching strategy combining in-memory and Redis caches.

**In-Memory Cache** (zero latency):

```typescript
import { getCachedProfile } from '$lib/server/cache/profile';
const profile = await getCachedProfile(userId, supabase);
```

**Redis Cache** (shared across instances):

```typescript
import { getCachedSchool } from '$lib/server/cache/schools';
import { getCachedTemplates } from '$lib/server/cache/templates';

const school = await getCachedSchool(schoolId, supabase);
const templates = await getCachedTemplates(supabase);
```

**When to use which**:

- ✅ In-Memory: Per-user data, ultra-high frequency reads (profile roles, session data)
- ✅ Redis: Shared data, multi-instance deployments (schools, templates, rate limiting)

**Manual Invalidation** (admin only):

```bash
# Invalidate school cache after timetable update
curl -X POST "/api/admin/cache/invalidate?type=school&id={schoolId}"

# Invalidate templates after publishing
curl -X POST "/api/admin/cache/invalidate?type=templates"
```

**Cache Modules**:

| Module             | Type      | TTL    | Purpose                      |
| ------------------ | --------- | ------ | ---------------------------- |
| Profile            | In-Memory | 15 min | User role checks             |
| Schools            | Redis     | 1 hour | School data, timetables      |
| Templates          | Redis     | 10 min | Published question templates |
| Assessment Results | Redis     | 5 min  | Cached results               |
| Activity Polling   | Redis     | 30 sec | Dashboard activity counts    |

📚 **Docs**: [Hybrid Cache System](docs/architecture/hybrid-cache-system.md)

---

## 📚 Documentation

### Structure complète

- **Master index** : [docs/README.md](docs/README.md)
- **Features** : [docs/features/](docs/features/)
- **Architecture** : [docs/architecture/](docs/architecture/)
- **Guides** : [docs/guides/](docs/guides/)
- **Development** : [docs/development/](docs/development/)
- **Contributing** : [docs/contributing/](docs/contributing/)

### Documentation par feature

| Feature          | Documentation                                                      |
| ---------------- | ------------------------------------------------------------------ |
| Questions        | [docs/features/questions/](docs/features/questions/)               |
| Assessments      | [docs/features/assessments/](docs/features/assessments/)           |
| SRS/Flashcards   | [docs/features/srs-flashcards/](docs/features/srs-flashcards/)     |
| Riddles          | [docs/features/riddles/](docs/features/riddles/)                   |
| Geometry         | [docs/features/geometry/](docs/features/geometry/)                 |
| Error Monitoring | [docs/features/error-monitoring/](docs/features/error-monitoring/) |

### Documentation technique

- **Database Schema** : [docs/architecture/database-schema.md](docs/architecture/database-schema.md)
- **Git Workflow** : [docs/development/git-workflow.md](docs/development/git-workflow.md)
- **Version Management** : [docs/development/version-management.md](docs/development/version-management.md)
- **Student Import** : [docs/guides/student-import.md](docs/guides/student-import.md)

---

## 🤝 Contribution

Avant de contribuer, lire :

- [Guide de contribution](docs/contributing/README.md)
- **[Guide de documentation](docs/contributing/documentation-guide.md)** ⭐

---

**Remember** : Préférer le code explicite et simple plutôt que les astuces clever.
