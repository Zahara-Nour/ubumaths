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

**Architecture** (Updated 2025-10-30): **Direct database queries**, no caching layer.

### Before (with Redis)

- Server-side caching (Redis + in-memory)
- Complex invalidation logic
- Faster responses (~50ms cached)

### After (current)

- ✅ Direct Supabase queries
- ✅ Always fresh data
- ✅ Simpler architecture
- ⚠️ Slightly slower (~100-200ms per query)

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

**Navigation** : [← Back to Claude Docs](./README.md)
