# Architecture

Documentation technique de l'architecture UbuMaths.

> **Voir aussi** : [docs/architecture/](../architecture/) pour la documentation complète utilisateur

---

## 🏗️ Project Structure

```
src/
├── lib/
│   ├── components/          # Composants réutilisables
│   │   ├── ui/              # Shadcn-svelte components
│   │   ├── MySelect.svelte  # Custom select dropdown
│   │   └── ...
│   ├── server/              # Utilitaires server-only
│   │   ├── supabase.ts      # Supabase client
│   │   ├── auth.ts          # Auth helpers
│   │   └── validation/      # Zod schemas
│   ├── stores/              # État partagé (Svelte stores)
│   │   ├── toaster.svelte   # Toast notifications
│   │   └── ...
│   ├── utils/               # Utilitaires partagés
│   └── types/               # Types TypeScript
│       ├── database.ts      # Supabase types (auto-generated)
│       └── ...
├── routes/
│   ├── (public)/            # Routes publiques (no auth)
│   ├── (protected)/         # Routes protégées (auth required)
│   ├── api/                 # API endpoints (+server.ts)
│   ├── +layout.svelte       # Root layout
│   ├── +layout.server.ts    # Root server layout
│   └── +hooks.server.ts     # Server hooks (auth, CSRF)
└── app.html                 # HTML template
```

**File Organization** (ordre recommandé):

```typescript
// 1. Imports
import { ... } from '...';

// 2. Types
type MyType = ...;

// 3. Constants
const MAX_LIMIT = 100;

// 4. Variables
let count = 0;

// 5. Functions
function myFunction() { ... }

// 6. Svelte Component (if applicable)
```

---

## 🛣️ Routing

### Route Groups

- `(public)/` - Pages publiques (login, signup, landing)
- `(protected)/` - Pages authentifiées (dashboard, assessments)
- `api/` - API endpoints REST

### Layout Inheritance

```
+layout.svelte (root)
├── (public)/+layout.svelte
│   ├── /login
│   └── /signup
└── (protected)/+layout.svelte
    ├── /dashboard
    └── /assessments
```

**Important** : Les layouts héritent automatiquement. Auth check dans `(protected)/+layout.server.ts`.

**Référence** : [docs/architecture/routing.md](../architecture/routing.md)

---

## 💾 Data Fetching Strategy

**Architecture** (Updated 2025-11-09): **Client-side caching** for dashboards, **direct database queries** for other routes.

### Client-Side Caching (Dashboards)

UbuMaths uses client-side caching for frequently accessed dashboard data:

**Teacher Dashboard Cache** ([docs/claude/teacher-cache.md](teacher-cache.md))

- 5 separate caches (students, rewards, warnings, classes, school)
- Keyed by classId and periodId for multi-class support
- TTLs: 2h (students), 10min (rewards/warnings), 24h (classes/school)
- Optimistic UI updates with debouncing
- Hydration from server load functions

**Student Dashboard Cache** ([docs/claude/student-cache.md](student-cache.md)) 🆕

- 3 separate caches (profile, rewards, warnings)
- Singleton pattern (student sees only their own data)
- TTLs: 2h (profile), 10min (rewards/warnings)
- Optimistic UI updates for rewards
- Hydration from server load functions

### Direct Database Queries (Other Routes)

Routes outside dashboards use direct Supabase queries:

- ✅ Always fresh data
- ✅ Simpler architecture
- ⚠️ Slightly slower (~100-200ms per query)
- ✅ No cache invalidation complexity

### Server Load Function Pattern (Updated 2025-11-02)

**All server load functions use `locals` to access user, profile, and supabase**:

```typescript
// +page.server.ts - load function
export const load: PageServerLoad = async ({ locals }) => {
	// ✅ ALWAYS destructure from locals
	const { user, profile, supabase } = locals;

	// User is authenticated (from hooks.server.ts)
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// Profile is loaded (from hooks.server.ts)
	if (!profile) {
		throw error(500, 'Profile not found');
	}

	// Direct DB query (no caching)
	const { data: school, error: schoolError } = await supabase
		.from('schools')
		.select('*')
		.eq('id', profile.school_id)
		.single();

	if (schoolError) throw error(500, 'Failed to load school');

	return { school };
};
```

**Key Points:**

- ✅ User and profile are loaded in `hooks.server.ts` (single query per request)
- ✅ No need for `await parent()` in child layouts/pages
- ✅ Consistent pattern across all server load functions
- ✅ Type-safe with null checks (`profile | null`)

### Optimization Tips

1. **Use database indexes** - 13 indexes on hot paths
2. **Eliminate N+1 queries** - Use joins instead of sequential queries
3. **Use RPC functions** - Complex aggregations in PostgreSQL
4. **Implement optimistic UI** - Better perceived performance

**Référence** : [docs/development/performance-optimizations.md](../development/performance-optimizations.md)

---

## ⚡ Performance Patterns

### Optimistic UI + Debouncing

Pour les updates serveur fréquentes (compteurs, quantités) :

```typescript
let optimistic = $state<Record<string, number>>({});
let debounceTimer: ReturnType<typeof setTimeout>;

function handleUpdate(id: string, delta: number) {
	// 1. Update optimiste immédiat (UI instantanée)
	optimistic[id] = (optimistic[id] || 0) + delta;

	// 2. Debounce update serveur (batch multiple changes)
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(async () => {
		try {
			await updateServer(id, optimistic[id]);
			optimistic[id] = 0; // Reset après succès
		} catch (error) {
			optimistic[id] = 0; // Rollback en cas d'erreur
			toaster.error('Échec de la mise à jour');
		}
	}, 500);
}
```

**Benefits:**

- Instant UI feedback (no waiting for server)
- Automatic batching (10 clicks = 1 DB query)
- Rollback on error

**Référence** : `src/routes/(protected)/dashboard/teacher/rewards/+page.svelte`

---

## SSR Hydration Strategy

> 🆕 2025-11-12

Server-side rendering with client-side cache hydration for optimal performance.

### What is SSR Hydration?

SSR Hydration is a pattern where:

1. **Server**: Fetch data during page load (SSR)
2. **Client**: Receive data and populate client-side cache
3. **Result**: Zero API calls on first page load, instant subsequent navigation

### When to Use SSR Hydration

**✅ Use SSR Hydration When**:

- Dashboard pages that need immediate data (no loading spinners)
- Data is accessed across multiple child pages
- Data changes infrequently (classes, schools, periods)
- First-load performance is critical

**❌ Don't Use SSR Hydration When**:

- Data is only needed on one page
- Data changes very frequently (every few seconds)
- Direct database queries are simpler

### Implementation Pattern

**Step 1**: Create Server Load Function (`+layout.server.ts`)

```typescript
// src/routes/(protected)/dashboard/teacher/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { getTeacherClassesWithCounts } from '$lib/server/students';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	// Verify authorization
	if (!user || !profile || profile.role !== 'teacher') {
		throw error(403, 'Access denied');
	}

	// Fetch data server-side using optimized helpers
	const classes = await getTeacherClassesWithCounts(user.id, supabase);

	// Return data for client hydration
	return {
		classes // This becomes available in layout data
	};
};
```

**Step 2**: Hydrate Cache on Client (`+layout.svelte`)

```svelte
<script lang="ts">
	import { teacherCache } from '$lib/stores/cache/teacher.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Hydrate cache once on mount
	$effect(() => {
		if (data.classes) {
			teacherCache.hydrateAllClasses(data.classes);
			console.log('✅ Cache hydrated with', data.classes.length, 'classes');
		}
	});
</script>

<!-- Child pages render with cache already populated -->
{@render children()}
```

**Step 3**: Access Cached Data in Child Pages

```svelte
<!-- src/routes/(protected)/dashboard/teacher/rewards/+page.svelte -->
<script lang="ts">
	import { teacherCache } from '$lib/stores/cache/teacher.svelte';

	// No API call needed! Data already in cache from hydration
	let classes = $derived(teacherCache.allClasses);

	// Instant access, no loading state
	console.log('Classes available immediately:', classes.length);
</script>
```

### Performance Benefits

**Before SSR Hydration**:

```
User navigates to /dashboard/teacher/rewards
↓
Client fetches classes via API call (+200-400ms)
↓
Loading spinner shown while waiting
↓
Data arrives, page renders
```

**After SSR Hydration**:

```
User navigates to /dashboard/teacher/rewards
↓
Server load function already fetched classes (SSR)
↓
Client receives data instantly
↓
Cache hydrated immediately
↓
Page renders with data (0ms wait)
```

**Measured Improvements**:

- **First Load**: 200-400ms faster (no API round trip)
- **Navigation**: Instant (data already cached)
- **User Experience**: No loading spinners on dashboard entry

### Real-World Example: Teacher Dashboard

**Architecture**:

```
/dashboard/teacher/ (+layout.server.ts)
├── Fetches: classes with counts, current period, all periods
├── Returns: { classes, currentPeriod, allPeriods }
└── Hydrates: teacherCache on client

/dashboard/teacher/rewards (+page.svelte)
├── Reads: teacherCache.allClasses
└── No API calls needed!

/dashboard/teacher/warnings (+page.svelte)
├── Reads: teacherCache.allClasses
└── No API calls needed!

/dashboard/teacher/wheel (+page.svelte)
├── Reads: teacherCache.getClassStudents(classId)
└── No API calls needed!
```

**Code Reference**: `src/routes/(protected)/dashboard/teacher/+layout.server.ts`

### Cache Invalidation

Use SvelteKit's `invalidate()` to refresh data when needed:

```typescript
import { invalidate } from '$app/navigation';

// Mark data as dependent in +layout.server.ts
export const load: LayoutServerLoad = async ({ locals, depends }) => {
	depends('teacher:classes'); // Dependency key
	// ... fetch data
};

// Trigger refresh from anywhere in the app
async function handleClassCreated() {
	await createClass(/* ... */);
	// Re-runs load function, updates cache
	await invalidate('teacher:classes');
}
```

### When to Use Direct Queries Instead

**Use direct database queries when**:

- Data is only used on one page (no reuse benefit)
- Data changes very frequently (cache would be stale)
- Complexity of cache management outweighs benefits

**Example** (direct query pattern):

```typescript
// +page.server.ts (no caching)
export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	// Direct query, no cache
	const { data: results } = await supabase
		.from('assessment_results')
		.select('*')
		.order('created_at', { ascending: false })
		.limit(20);

	return { results };
};
```

### Best Practices

1. **Hydrate in Layout**: Use parent layouts for data shared across child pages
2. **Use Helpers**: Leverage `getTeacherClassesWithCounts()` and similar functions
3. **Minimize Data**: Only fetch fields needed for cache (exclude frequently-changing data)
4. **Handle Errors**: Provide fallbacks if server load fails
5. **Log Hydration**: Console log to verify cache is populated
6. **Invalidate Wisely**: Only refresh when data actually changes

### Related Patterns

- **[Teacher Cache](./teacher-cache.md)** - Client-side caching architecture
- **[Student Cache](./student-cache.md)** - Student-specific caching
- **[Database Helpers](./database.md#student-data-helpers)** - Optimized query functions

---

## 🚦 Rate Limiting

**Implementation** (Updated 2025-10-30): **Database-based** (replaced Redis)

### Current System

Uses Supabase `rate_limits` table with atomic counters.

**Limits:**

- Login attempts: 5/15min (IP + email)
- Signup: 3/1hour (IP)
- OAuth: 10/15min (IP)
- Chatbot: 5/15min (user)

**Features:**

- ✅ Atomic increment/check
- ✅ Automatic cleanup of expired entries
- ✅ No external dependencies (no Redis)

### Example Implementation

```typescript
// src/lib/server/rate-limit.ts
export async function checkRateLimit(
	supabase: SupabaseClient,
	identifier: string,
	action: string,
	maxAttempts: number,
	windowMinutes: number
): Promise<boolean> {
	const { data, error } = await supabase.rpc('check_rate_limit', {
		p_identifier: identifier,
		p_action: action,
		p_max_attempts: maxAttempts,
		p_window_minutes: windowMinutes
	});

	return data?.allowed ?? false;
}
```

**Référence** : `src/lib/server/rate-limit.ts`

---

## 🔗 Ports de développement

- **5173** : Port utilisateur (NE PAS UTILISER)
- **5175** : Port Claude (TOUJOURS UTILISER : `pnpm dev -- --port 5175`)
- **54321** : Supabase local (pour tests de triggers)

**Why?** Évite les conflits avec le serveur dev de l'utilisateur.

---

## 🔄 Template System Architecture

> 🆕 2025-11-17

### Dual Syntax Bridge Pattern

UbuMaths currently uses **two different template syntaxes** that are bridged by a runtime adapter:

1. **Questions Syntax** (Single-brace) - Database storage
2. **Markdown Syntax** (Double-brace) - Shared library processing

#### Why Two Syntaxes Exist

**Historical Context**:

- Questions module was developed first with single-brace syntax: `{@:var}`, `{#:1..10}`
- Shared parameterization library was developed later with Markdown-standard double-brace: `{{var}}`, `{{random:1..10}}`
- Database contains 71+ seed templates using single-brace syntax
- Exercises module uses double-brace syntax from the start

**Current State**: Adapter pattern bridges the gap at runtime.

#### Syntax Comparison

| Feature            | Questions Syntax | Markdown Syntax                       |
| ------------------ | ---------------- | ------------------------------------- |
| **Variables**      | `{@:varName}`    | `{{varName}}`                         |
| **Random Integer** | `{#:1..10}`      | `{{random:1..10}}` or `{{1..10}}`     |
| **Random Decimal** | `{#:2.3}`        | `{{random:2.3}}` or `{{2.3}}`         |
| **Exclusions**     | `{#:1..10!5}`    | `{{random:1..10!5}}` or `{{1..10!5}}` |
| **Evaluation**     | `{eval:expr}`    | `{{eval:expr}}`                       |
| **Nested**         | `{#:1-{@:max}}`  | `{{random:1-{{max}}}}`                |

#### How the Adapter Works

**Location**: `src/lib/questions/generator/syntax-adapter.ts`

**Pattern**: Convert Questions syntax → Markdown syntax before processing

```typescript
// Integration Point 1: Variable Resolution
export function resolveVariables(variables, seed) {
	// Convert all variable expressions to Markdown syntax
	const convertedVariables = variables.map(convertVariableToMarkdown);

	// Use shared library with converted syntax
	return sharedResolveVariables(convertedVariables, seed);
}

// Integration Point 2: Content Resolution
export function resolveContentField(field, resolvedVariables, seed) {
	// Convert Questions syntax to Markdown before resolution
	const markdownContent = convertToMarkdownSyntax(field.content);

	// Resolve with converted content
	return resolveVariableExpression(markdownContent, resolvedVariables, seed);
}
```

**Conversion Examples**:

```typescript
// Questions → Markdown
convertToMarkdownSyntax('{@:a}'); // → '{{a}}'
convertToMarkdownSyntax('{#:1..10}'); // → '{{random:1..10}}'
convertToMarkdownSyntax('{eval:a+b}'); // → '{{eval:a+b}}'

// Nested conversions
convertToMarkdownSyntax('{#:1-{@:max}}'); // → '{{random:1-{{max}}}}'
convertToMarkdownSyntax('{eval:{@:a}+{@:b}}'); // → '{{eval:{{a}}+{{b}}}}'
```

#### Performance

- **Overhead**: <5ms per question generation
- **Tested**: 300 conversions in <100ms
- **Impact**: Negligible for typical usage (1-10 questions/request)

#### When to Use Which Syntax

**Use Questions Syntax** (`{@:var}`):

- Creating templates in database
- Writing seed templates
- Migrating from old system
- Following existing database patterns

**Use Markdown Syntax** (`{{var}}`):

- Creating exercises
- Using shared parameterization directly
- Writing documentation examples
- Following Markdown standards

**The adapter handles conversion automatically** - you don't need to manually convert.

#### Future Plans

**Phase 2: Template System Unification** (Planned)

Three options under consideration:

1. **Keep Adapter** (Current)
   - ✅ No breaking changes
   - ✅ Already tested and working
   - ⚠️ Permanent complexity layer

2. **Migrate Database to Markdown**
   - ✅ Single syntax across system
   - ✅ No conversion overhead
   - ⚠️ Requires database migration
   - ⚠️ Breaking change for imports

3. **Dual-Mode Tokenizer**
   - ✅ Native support for both syntaxes
   - ✅ Most future-proof
   - ⚠️ Complex implementation
   - ⚠️ Affects shared library

**Decision pending**: Monitor adapter performance in production first.

#### Phase 2: Database Migration (Ready for Execution)

> 🆕 2025-11-17 - Phase 2 prepared but not yet executed

**Status**: READY FOR EXECUTION (infrastructure complete, awaiting user confirmation)

**What's Ready**:

- Database migration SQL (567 lines) with automatic backup/rollback
- Test script (283 lines) for validation
- Comprehensive documentation and execution guide
- Critical PostgreSQL syntax bug fixed (`:=` vs `=`)
- Code reviewed and approved

**What It Will Do**:
Once executed, the migration will:

- Convert all 70+ templates from Questions syntax → Markdown syntax
- Create automatic backup: `question_templates_backup_20251117`
- Provide one-command rollback if needed
- Eliminate 5ms runtime conversion overhead
- Enable removal of 600+ lines of adapter code (Phase 3)

**Migration File**: `supabase/migrations/20251117120527_unify_template_syntax_to_markdown.sql`

**Execution Commands** (after Docker running):

```bash
# 1. Start Supabase local
pnpm db:start

# 2. Run test script
node --import tsx scripts/test-question-generation.ts

# 3. Execute migration
pnpm db:migrate

# 4. Validate success
# (See .claude/PHASE2-EXECUTION-GUIDE.md for full steps)
```

**Safety Features**:

- Automatic backup created before any changes
- Rollback function: `SELECT rollback_template_syntax_migration()`
- Migration tracking in `migration_metadata` table
- Fast execution (~2-5 seconds)
- Row-level locks only (no table lock)

**Bug Fixed**: PostgreSQL PL/pgSQL requires `:=` for assignment (not `=` like JavaScript). This was caught during code review and fixed before execution, preventing a migration failure.

**After Execution** (Phase 3):
Once migration is confirmed successful (1 week validation period):

1. Remove syntax adapter from codebase
2. Update documentation to show only Markdown syntax
3. Archive backup table
4. Mark template unification as complete

**Documentation**:

- **Execution Guide**: `.claude/PHASE2-EXECUTION-GUIDE.md` - Step-by-step checklist
- **Detailed Status**: `.claude/migration-progress-phase2.md` - Complete migration info
- **Overall Progress**: `.claude/migration-progress.md` - All phases tracking

#### Related Documentation

- **Phase 1 Complete**: `.claude/template-system-status.md` - Adapter implementation and testing
- **Bug Report**: `BUG_REPORT_SYNTAX_MISMATCH.md` - Why adapter was needed
- **Implementation**: `IMPLEMENTATION_PLAN_SYNTAX_FIX.md` - How Phase 1 was built
- **Syntax Guide**: `docs/features/questions/syntax-guide.md` - User-facing reference

#### Development Notes

**Current State** (Phase 1 Complete, Phase 2 Ready):

**For Claude Code**:

- **Now**: Database uses single-brace `{@:var}`, adapter converts at runtime
- **After Phase 2**: Database will use double-brace `{{var}}`, no conversion needed
- Tests currently use Questions syntax to match database
- After migration: Tests will use Markdown syntax

**For Users**:

- **Now**: Use Questions syntax (`{@:var}`) when creating templates in UI
- **After Phase 2**: Continue using same syntax (conversion happens transparently)
- **Phase 3**: UI may be updated to show/accept Markdown syntax
- System handles conversion automatically in all phases

**Migration Impact**:

- No breaking changes for users
- No API changes
- Templates remain compatible
- Performance improves (5ms saved per question generation)

---

**Navigation** : [← Back to Claude Docs](./README.md)
