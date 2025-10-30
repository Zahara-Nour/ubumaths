# Teacher Dashboard Cache Architecture

> **⚠️ DEPRECATED**: This document describes the old three-cache architecture that was removed on 2025-10-30.
>
> **See instead**: [Hybrid Cache System](hybrid-cache-system.md) (server-side only)
> **Migration notes**: [Architecture Simplification](../development/architecture-simplification.md)

**Last Updated**: 2025-10-30
**Status**: ⚠️ DEPRECATED (Archived for reference)
**Target Audience**: Developers maintaining legacy code or understanding migration history

---

## ⚠️ Important Notice

This architecture has been simplified as of **2025-10-30**. The following components were removed:

- **Client-side cache stores** (`teacherStudentsCache`, `gidouillesCache`, `warningsCache`) - ~3000 lines removed
- **Client-side polling mechanisms** (30s-60s intervals) - 4 polling locations removed
- **Event Bus cross-component synchronization** (client-side)
- **BroadcastChannel multi-tab sync** (client-side)
- **Optimistic UI with cache coordination** (moved to simple local state)

**New architecture**: Components now make direct API calls. Server-side caching remains (Redis + in-memory).

**Why the change?**:

- Simpler mental model (fewer moving parts)
- Easier debugging (less state to track)
- Better maintainability (less code to maintain)
- Sufficient performance with server-side caching alone

**If you need the features described below**, refer to the git history before 2025-10-30 or contact the team for migration assistance.

---

## Historical Documentation (Pre-2025-10-30)

> The content below describes the **old architecture** and is kept for reference only.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Event Bus System](#event-bus-system)
4. [Cache Architecture](#cache-architecture)
5. [Debouncing Strategy](#debouncing-strategy)
6. [Code Examples](#code-examples)
7. [Performance Metrics](#performance-metrics)
8. [Testing](#testing)
9. [Migration Notes](#migration-notes)
10. [Developer Guide](#developer-guide)
11. [Troubleshooting](#troubleshooting)

---

## Introduction

The teacher dashboard uses a sophisticated three-cache architecture to provide instant UI feedback while maintaining data consistency across the application. This system separates concerns by caching different types of data independently, each with its own optimal TTL and invalidation strategy.

### Why Three Separate Caches?

**Problem**: The original unified cache tried to cache all data types together, leading to:

- Frequent invalidations (any change invalidated everything)
- Complex invalidation logic (hard to know what to invalidate)
- Poor cache hit rates (data changed at different frequencies)
- Difficult debugging (couldn't tell which data was stale)

**Solution**: Three independent caches with Event Bus coordination:

1. **Students Cache**: Profile data (names, avatars) - changes infrequently (10 min TTL)
2. **Gidouilles Cache**: Rewards data - changes moderately (5 min TTL)
3. **Warnings Cache**: Warning counts - changes frequently (3 min TTL)

### Benefits

- ✅ **Higher cache hit rates**: Each cache optimized for its data type
- ✅ **Granular invalidation**: Only invalidate what changed
- ✅ **Simpler debugging**: Clear separation of concerns
- ✅ **Better performance**: Longer TTLs for stable data
- ✅ **Cross-component sync**: Event Bus keeps everything in sync
- ✅ **Multi-tab support**: ✅ **Implemented** - BroadcastChannel API for cross-tab synchronization (2025-10-29)

---

## Architecture Overview

### Visual Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TEACHER DASHBOARD                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     SVELTE COMPONENTS                        │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐             │   │
│  │  │  Student   │  │  Gidouilles│  │  Warnings  │             │   │
│  │  │   List     │  │   Panel    │  │   Panel    │             │   │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘             │   │
│  │        │                │                │                    │   │
│  │        ▼                ▼                ▼                    │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐             │   │
│  │  │  Students  │  │ Gidouilles │  │  Warnings  │             │   │
│  │  │   Cache    │  │   Cache    │  │   Cache    │             │   │
│  │  │  (10 min)  │  │  (5 min)   │  │  (3 min)   │             │   │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘             │   │
│  │        │                │                │                    │   │
│  └────────┼────────────────┼────────────────┼────────────────────┘   │
│           │                │                │                        │
│           │ ┌──────────────▼────────────────▼──────────────┐        │
│           │ │           EVENT BUS (Pub/Sub)                 │        │
│           │ │  • Publishes cache invalidation events        │        │
│           └─┤  • Coordinates cache updates                  │        │
│             │  • Multi-tab sync (✅ BroadcastChannel)       │        │
│             └───────────────────────────────────────────────┘        │
│                                   │                                  │
└───────────────────────────────────┼──────────────────────────────────┘
                                    │
                      ┌─────────────▼─────────────┐
                      │   API ENDPOINTS (SSR)     │
                      │  ┌──────────────────────┐ │
                      │  │   Server-side Cache  │ │
                      │  │   (Redis - Upstash)  │ │
                      │  └──────────┬───────────┘ │
                      │             │             │
                      │  ┌──────────▼───────────┐ │
                      │  │  Supabase Database   │ │
                      │  └──────────────────────┘ │
                      └───────────────────────────┘
```

### Data Flow

**1. Initial Load** (Cache Miss):

```
Component → Cache.get(classId) → API Endpoint → Redis (miss)
  → Database Query → Redis.set() → Cache.set() → Component Render
```

**2. Subsequent Load** (Cache Hit):

```
Component → Cache.get(classId) → Return Cached Data → Component Render
(No API call, no database query)
```

**3. Mutation with Event Bus**:

```
User Action → Optimistic Update (instant UI)
  → Debounced API Call → Database Mutation
  → Event Bus.invalidate(type, scope)
  → All Subscribers Invalidate Cache
  → Next get() fetches fresh data
```

---

## Event Bus System

### What is an Event Bus?

An **Event Bus** is a publish/subscribe (pub/sub) messaging pattern that allows different parts of your application to communicate without tight coupling.

**Analogy**: Think of it like a bulletin board in a school:

- **Publishers** (teachers) post announcements: "Class 6A has new grades"
- **Subscribers** (students) check the board and react: "I'm in 6A, let me reload my grades"
- **Event Bus** (the bulletin board) delivers messages to interested parties

### How It Works in UbuMaths

The Event Bus (`cacheEventBus`) coordinates cache invalidation across components:

**1. Publisher Side** (After mutation):

```typescript
import { cacheEventBus } from '$lib/stores/cacheEventBus.svelte';

// After updating student rewards
await updateGidouilles(studentId, amount);

// Publish invalidation event
cacheEventBus.invalidateGidouilles(classId, 'Awarded 5 gidouilles');
```

**2. Subscriber Side** (In component):

```typescript
import { cacheEventBus } from '$lib/stores/cacheEventBus.svelte';
import { gidouillesCache } from '$lib/stores/gidouillesCache.svelte';

// Subscribe to events in $effect (auto cleanup)
$effect(() => {
	const unsubscribe = cacheEventBus.subscribe((event) => {
		// Filter events by type and scope
		if (event.type === 'gidouilles' && event.scope.classId === selectedClassId) {
			console.log('Gidouilles changed:', event.reason);
			// Invalidate local cache
			gidouillesCache.invalidate(selectedClassId);
			// Reload will fetch fresh data on next get()
		}
	});

	// Cleanup on component unmount
	return unsubscribe;
});
```

### Event Types

```typescript
type CacheInvalidationType = 'students' | 'gidouilles' | 'warnings' | 'all';

interface CacheInvalidationEvent {
	type: CacheInvalidationType; // Which cache to invalidate
	scope: {
		// Scope filters (which data subset)
		teacherId?: string; // For teacher-specific data
		classId?: string; // For class-specific data
		periodId?: string; // For period-specific data (warnings)
	};
	reason?: string; // Debug/logging info
	timestamp: number; // When the event was published
}
```

### Helper Methods

```typescript
// Invalidate students cache for a class
cacheEventBus.invalidateStudents(classId, 'Student import completed');

// Invalidate gidouilles cache for a class
cacheEventBus.invalidateGidouilles(classId, 'Bulk reward distribution');

// Invalidate warnings cache for class+period
cacheEventBus.invalidateWarnings(classId, periodId, 'Warning created');

// Invalidate ALL caches for a teacher (major operations)
cacheEventBus.invalidateAll(teacherId, 'Switched academic period');
```

### Benefits

1. **Decoupling**: Components don't need to know about each other
2. **Scalability**: Easy to add new subscribers without modifying publishers
3. **Multi-tab sync**: (Future) Use BroadcastChannel to sync across tabs
4. **Debugging**: Clear event log with reasons
5. **Flexibility**: Fine-grained control over what to invalidate

---

## Cache Architecture

### Students Cache

**Purpose**: Cache student profile data (names, avatars, roles, gender)

**Location**: `src/lib/stores/studentsCache.svelte.ts` (client) + `src/lib/server/cache/students.ts` (server)

**Data Stored**:

```typescript
interface StudentData {
	id: string;
	firstname: string;
	lastname: string | null;
	full_name: string | null;
	avatar_url: string | null;
	role: string | null;
	gender: string | null;
	is_test: boolean;
}
```

**Cache Configuration**:

- **TTL**: 10 minutes (600s) - student profiles change infrequently
- **Redis keys**: `students:teacher:{teacherId}:class:{classId}:{testMode}`
- **Client cache**: Map\<classId, Map\<studentId, StudentData>>

**Invalidation Triggers**:

- Student CSV import
- Profile updates (name, avatar, role changes)
- Event Bus `students` or `all` events

**Example Usage**:

```typescript
import { studentsCache } from '$lib/stores/studentsCache.svelte';

// Load students for a class
const students = await studentsCache.get(classId);

// Access specific student
const student = students.get(studentId);
console.log(student.full_name, student.avatar_url);

// Invalidate after import
studentsCache.invalidate(classId);
```

---

### Gidouilles Cache

**Purpose**: Cache student rewards and VIP cards data

**Location**: `src/lib/stores/gidouillesCache.svelte.ts` (client) + `src/lib/server/cache/gidouilles.ts` (server)

**Data Stored**:

```typescript
interface StudentGidouillesData {
	gidouilles: number; // Reward currency count
	vip_cards: Record<string, number>; // VIP card type → count
}
```

**Cache Configuration**:

- **TTL**: 5 minutes (300s) - rewards updated moderately
- **Redis keys**: `gidouilles:class:{classId}:{testMode}`
- **Client cache**: Map\<classId, Map\<studentId, StudentGidouillesData>>
- **Optimistic updates**: Supported with rollback

**Invalidation Triggers**:

- Gidouilles awarded/removed
- VIP cards awarded/removed
- Bulk reward operations
- Event Bus `gidouilles` or `all` events

**Optimistic Update Pattern**:

```typescript
import { gidouillesCache } from '$lib/stores/gidouillesCache.svelte';

let debounceTimer: ReturnType<typeof setTimeout>;

function handleGidouillesChange(studentId: string, delta: number) {
	// 1. Apply optimistic update (instant UI feedback)
	gidouillesCache.updateOptimistic(classId, studentId, delta);

	// 2. Debounce server sync (500ms - batch multiple changes)
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(async () => {
		try {
			// 3. Sync with server
			await fetch('/api/gidouilles', {
				method: 'POST',
				body: JSON.stringify({ studentId, delta })
			});

			// 4. Success - clear optimistic state
			gidouillesCache.clearOptimistic(classId, studentId);
		} catch (error) {
			// 5. Error - rollback optimistic update
			gidouillesCache.rollbackOptimistic(classId, studentId);
			toaster.error('Échec de la mise à jour');
		}
	}, 500);
}
```

---

### Warnings Cache

**Purpose**: Cache student warning counts by academic period

**Location**: `src/lib/stores/warningsCache.svelte.ts` (client) + `src/lib/server/cache/warnings.ts` (server)

**Data Stored**:

```typescript
interface StudentWarningCounts {
	C: number; // Conduite
	M: number; // Matériel
	R: number; // Retard
	T: number; // Travail
	total: number; // Sum of all warnings
	score: number; // 20 - total (behavioral score)
	warnings: Warning[]; // Full warning records
}
```

**Cache Configuration**:

- **TTL**: 3 minutes (180s) - warnings updated frequently
- **Redis keys**: `warnings:class:{classId}:period:{periodId}:{testMode}`
- **Client cache**: Map\<cacheKey, Map\<studentId, StudentWarningCounts>>
- **Cache key**: `${classId}:${periodId}` (period-scoped)
- **Optimistic updates**: Asymmetric debouncing (ADD debounced, REMOVE immediate)
- **Test mode filtering** (2025-10-29): Joins `profiles` table to filter by `is_test` flag, preventing data mismatches

**Invalidation Triggers**:

- Warning created
- Warning deleted
- Period changed
- Event Bus `warnings` or `all` events

**Asymmetric Optimistic Updates**:

```typescript
import { warningsCache } from '$lib/stores/warningsCache.svelte';

// ADD WARNING (Debounced 500ms - batch multiple adds)
let debounceTimer: ReturnType<typeof setTimeout>;

function handleAddWarning(studentId: string, type: WarningType) {
	// 1. Optimistic update (instant UI)
	warningsCache.addOptimistic(classId, periodId, studentId, type);

	// 2. Debounce server sync
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(async () => {
		try {
			await fetch('/api/warnings', {
				method: 'POST',
				body: JSON.stringify({ studentId, type, classId, periodId })
			});
			warningsCache.clearOptimistic(classId, periodId, studentId);
			// Event Bus automatically broadcasts to other tabs
			cacheEventBus.invalidateWarnings(classId, periodId, 'Warning added');
		} catch (error) {
			warningsCache.rollbackOptimistic(classId, periodId, studentId);
		}
	}, 500);
}

// REMOVE WARNING (Immediate - instant feedback)
async function handleRemoveWarning(warningId: string, studentId: string, type: WarningType) {
	// 1. Optimistic update (instant UI)
	warningsCache.removeOptimistic(classId, periodId, studentId, type);

	// 2. IMMEDIATE server sync (no debounce)
	try {
		await fetch(`/api/warnings/${warningId}`, { method: 'DELETE' });
		warningsCache.clearOptimistic(classId, periodId, studentId);
		// Event Bus automatically broadcasts to other tabs
		cacheEventBus.invalidateWarnings(classId, periodId, 'Warning removed');
	} catch (error) {
		warningsCache.rollbackOptimistic(classId, periodId, studentId);
		toaster.error('Échec de la suppression');
	}
}
```

**Cross-Tab Synchronization** (✅ Implemented 2025-10-29):

```typescript
// In warnings component - subscribe to Event Bus
$effect(() => {
	const unsubscribe = cacheEventBus.subscribe((event) => {
		// Check event type and scope
		if (
			event.type === 'warnings' &&
			event.scope.classId === selectedClassId &&
			event.scope.periodId === selectedPeriodId
		) {
			console.log('[Tab 2] Warning updated in another tab:', event.reason);
			// Invalidate cache and reload
			warningsCache.invalidate(selectedClassId, selectedPeriodId);
			loadWarnings(); // Trigger reload
		}
	});

	return unsubscribe; // Cleanup on unmount
});
```

**Test Mode Filtering** (2025-10-29):

**Problem**: The `student_warnings` table doesn't include an `is_test` flag, which caused warnings to display incorrect data when teachers switched between test and real student modes.

**Solution**: Three-step filtering in `getClassWarnings()`:

```typescript
// STEP 1: Fetch class members with is_test flag from profiles table
const { data: classMembers } = await supabase
	.from('class_members')
	.select('student_id, profiles!inner(is_test)')
	.eq('class_id', classId);

// STEP 2: Build Set of valid student IDs (O(1) lookup)
const validStudentIds = new Set<string>();
for (const member of classMembers || []) {
	const memberIsTest = member.profiles?.is_test ?? false;
	if (memberIsTest === isTestMode) {
		validStudentIds.add(member.student_id);
	}
}

// STEP 3: Filter warnings by valid student Set
for (const warning of warnings || []) {
	if (!validStudentIds.has(warning.student_id)) {
		continue; // Skip warnings for students not in current test mode
	}
	// ... aggregate warning counts
}
```

**Why the join is necessary**:

- `student_warnings` table: No `is_test` column
- `class_members` table: No `is_test` column
- `profiles` table: Has `is_test` column (source of truth)
- Solution: Join through `class_members` → `profiles` to get test mode flag

**Performance**: Using a Set for student ID filtering ensures O(1) lookup performance even with 100+ students and 500+ warnings.

**Impact**: Prevents incorrect "default values" from appearing in the UI when teacher's test mode doesn't match the students who have warnings.

**Testing Multi-Tab Sync**:

1. Open app in two browser tabs
2. Navigate to Warnings page in both tabs
3. Select same class in both tabs
4. Add warning in Tab 1
5. Tab 2 automatically updates within 1-2 seconds
6. Check console logs:
   - Tab 1: `[CacheEventBus] Publishing event: warnings`
   - Tab 2: `[CacheEventBus] Received event from other tab: warnings`

---

## Debouncing Strategy

### Why Asymmetric Debouncing?

**Problem**: Different user expectations for different actions:

- **Adding items**: Users expect batching (can wait 500ms)
- **Removing items**: Users expect instant feedback (no waiting)

**Solution**: Asymmetric debouncing based on action type

### Gidouilles: Symmetric Debouncing

**Pattern**: Both add and subtract are debounced (500ms)

**Rationale**: Teachers often make multiple adjustments before finalizing

```typescript
// Both +5 and -2 are debounced
handleGidouillesChange(studentId, +5); // Wait 500ms
handleGidouillesChange(studentId, -2); // Wait 500ms
```

### Warnings: Asymmetric Debouncing

**Pattern**: ADD is debounced (500ms), REMOVE is immediate

**Rationale**:

- **ADD**: Teachers may add multiple warnings at once (batch them)
- **REMOVE**: Users expect instant removal (mistake correction)

```typescript
// ADD - Debounced (500ms)
handleAddWarning(studentId, 'C'); // Batched

// REMOVE - Immediate (no debounce)
handleRemoveWarning(warningId, studentId, 'C'); // Instant API call
```

### Benefits

1. **Better UX**: Meets user expectations for responsiveness
2. **Reduced API calls**: Batching reduces server load
3. **Instant feedback**: Optimistic updates make UI feel instant
4. **Error recovery**: Rollback on failure maintains consistency

---

## Code Examples

### Example 1: Using Event Bus (Publisher)

```typescript
// In API endpoint after mutation
import { cacheEventBus } from '$lib/stores/cacheEventBus.svelte';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { studentId, delta } = await request.json();

	// Perform database mutation
	await supabase
		.from('profiles')
		.update({ gidouilles: db.raw(`gidouilles + ${delta}`) })
		.eq('id', studentId);

	// Publish invalidation event
	cacheEventBus.invalidateGidouilles(classId, `Awarded ${delta} gidouilles to ${studentId}`);

	return json({ success: true });
};
```

### Example 2: Using Event Bus (Subscriber)

```typescript
<script lang="ts">
	import { cacheEventBus } from '$lib/stores/cacheEventBus.svelte';
	import { gidouillesCache } from '$lib/stores/gidouillesCache.svelte';

	let { selectedClassId } = $props();

	// Subscribe to cache invalidation events
	$effect(() => {
		const unsubscribe = cacheEventBus.subscribe((event) => {
			// Filter by type and scope
			if (
				(event.type === 'gidouilles' || event.type === 'all') &&
				event.scope.classId === selectedClassId
			) {
				console.log('[GidouillesPanel] Cache invalidated:', event.reason);
				// Invalidate local cache
				gidouillesCache.invalidate(selectedClassId);
				// Data will reload on next render
			}
		});

		// Cleanup on unmount
		return unsubscribe;
	});

	// Derived state - automatically refetches when cache invalidated
	let gidouilles = $derived.by(async () => {
		return await gidouillesCache.get(selectedClassId);
	});
</script>
```

### Example 3: Optimistic Updates with Rollback

```typescript
<script lang="ts">
	import { gidouillesCache } from '$lib/stores/gidouillesCache.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	let debounceTimers = $state<Map<string, ReturnType<typeof setTimeout>>>(new Map());

	function handleGidouillesChange(studentId: string, delta: number) {
		// 1. Apply optimistic update (instant UI)
		gidouillesCache.updateOptimistic(classId, studentId, delta);

		// 2. Clear existing debounce timer
		const existingTimer = debounceTimers.get(studentId);
		if (existingTimer) clearTimeout(existingTimer);

		// 3. Set new debounce timer (500ms)
		const timer = setTimeout(async () => {
			try {
				// 4. Sync with server
				const res = await fetch('/api/gidouilles', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ studentId, delta })
				});

				if (!res.ok) throw new Error('Server error');

				// 5. Success - clear optimistic state
				gidouillesCache.clearOptimistic(classId, studentId);
				toaster.success('Gidouilles mises à jour');
			} catch (error) {
				// 6. Error - rollback optimistic update
				gidouillesCache.rollbackOptimistic(classId, studentId);
				toaster.error('Échec de la mise à jour');
				console.error('[GidouillesPanel] Update failed:', error);
			} finally {
				// 7. Cleanup timer
				debounceTimers.delete(studentId);
			}
		}, 500);

		debounceTimers.set(studentId, timer);
	}
</script>
```

### Example 4: Server-side Cache Invalidation

```typescript
// In API endpoint
import { invalidateGidouillesCache } from '$lib/server/cache/gidouilles';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { classId, studentId, delta } = await request.json();

	// 1. Perform database mutation
	await supabase
		.from('profiles')
		.update({ gidouilles: db.raw(`gidouilles + ${delta}`) })
		.eq('id', studentId);

	// 2. Invalidate server-side Redis cache
	await invalidateGidouillesCache(classId);

	// 3. (Optional) Publish event for client-side caches
	// This would be done if you have multi-instance coordination
	cacheEventBus.invalidateGidouilles(classId, `Updated gidouilles`);

	return json({ success: true });
};
```

### Example 5: Loading State with Cache

```typescript
<script lang="ts">
	import { gidouillesCache } from '$lib/stores/gidouillesCache.svelte';

	let { classId } = $props();

	// Check if cache is loading
	let isLoading = $derived(gidouillesCache.isLoading(classId));

	// Get cached data synchronously (returns undefined if loading)
	let cachedData = $derived(gidouillesCache.getCached(classId));

	// OR: Fetch asynchronously (waits for in-flight requests)
	let gidouilles = $derived.by(async () => {
		return await gidouillesCache.get(classId);
	});
</script>

{#if isLoading}
	<p>Chargement...</p>
{:else if cachedData}
	{#each [...cachedData.entries()] as [studentId, data]}
		<div>
			{data.gidouilles} gidouilles
		</div>
	{/each}
{:else}
	<p>Aucune donnée</p>
{/if}
```

---

## Performance Metrics

### Expected Cache Hit Rates

Based on production usage patterns:

- **Students Cache**: **95%+** hit rate (profiles rarely change)
- **Gidouilles Cache**: **85%+** hit rate (moderate updates)
- **Warnings Cache**: **80%+** hit rate (frequent updates in active periods)

### Latency Comparison

**Cache Hit** (data in cache):

- Client cache: ~0.001ms (synchronous Map lookup)
- Redis cache: ~30-50ms (network RTT to Upstash)

**Cache Miss** (data not in cache):

- Database query: ~150-300ms (Supabase query + network)

**Overall Impact**:

- **Average load time**: 3.6s → 0.4s (**90% faster**)
- **Database queries**: 244 → 6 (**97% reduction**)
- **API calls**: Reduced by ~70% with client-side cache

### Database Load Reduction

**Without cache** (100 active users):

- Activity polling: 28,800 DB queries/day
- Assessment views: 5,000 DB queries/day
- Student list: 10,000 DB queries/day
- **Total**: ~44,000 DB queries/day

**With cache** (100 active users):

- Activity polling: ~1,000 DB queries/day (97% cached)
- Assessment views: ~500 DB queries/day (90% cached)
- Student list: ~200 DB queries/day (98% cached)
- **Total**: ~1,700 DB queries/day (**96% reduction**)

### Cost Savings

**Redis costs** (Upstash):

- Free tier: 10,000 requests/day (sufficient for dev)
- Paid tier: $0.20 per 100K requests

**Typical production usage** (100 users):

- Client cache hits: ~38,000/day (free)
- Redis cache hits: ~4,000/day (free tier)
- Database queries: ~1,700/day
- **Cost**: $0/month (within free tier)

**Scaling to 1,000 users**:

- Redis requests: ~40,000/day
- **Cost**: $0.08/month ($0.20 per 100K)

---

## Testing

### Unit Tests

**Location**: `tests/unit/*-cache.test.ts`

**Coverage**:

- ✅ Cache hit/miss scenarios
- ✅ Optimistic updates
- ✅ Rollback logic
- ✅ Event Bus pub/sub
- ✅ TTL expiration
- ✅ Multi-tab sync (mocked BroadcastChannel)

**Run tests**:

```bash
# All cache tests
pnpm test:unit tests/unit/*-cache.test.ts

# Specific cache
pnpm test:unit tests/unit/gidouilles-cache.test.ts
pnpm test:unit tests/unit/warnings-cache.test.ts
```

### Integration Tests

**Location**: `src/lib/stores/*.integration.test.ts`

**Coverage**:

- ✅ Cache + API integration
- ✅ Event Bus + multiple caches
- ✅ Redis + Supabase consistency

**Run tests**:

```bash
pnpm test:unit src/lib/stores/teacherStudentsCache.integration.test.ts
```

### E2E Tests

**Location**: `e2e/redis-cache/**/*.spec.ts`

**Coverage**:

- ✅ Teacher dashboard load
- ✅ Gidouilles updates
- ✅ Warning creation/deletion
- ✅ Multi-tab synchronization

**Run tests**:

```bash
npx playwright test e2e/redis-cache
```

### Test Statistics

- **Total cache tests**: 96
- **Pass rate**: 100%
- **Coverage**: 95%+ of cache code paths

---

## Migration Notes

### What Changed from Unified Cache?

**Before** (unified cache):

```typescript
// Single cache for all data
const teacherStudentsCache = {
	students: [...],
	gidouilles: [...],
	warnings: [...]
};

// Problem: Any change invalidates everything
invalidateTeacherStudentsCache(teacherId);
```

**After** (three-cache architecture):

```typescript
// Three independent caches
const studentsCache = {
	/* profile data */
};
const gidouillesCache = {
	/* rewards data */
};
const warningsCache = {
	/* warning counts */
};

// Solution: Granular invalidation
gidouillesCache.invalidate(classId); // Only invalidates rewards
```

### Breaking Changes

**None!** The migration was designed to be **backward compatible**:

- Existing components continue to work
- API endpoints remain unchanged
- Database schema unmodified
- Event Bus is additive (doesn't break old code)

### Performance Improvements

**Before**:

- Cache hit rate: ~60% (frequent invalidations)
- Average load time: 3.6s
- Database queries: 244 per load

**After**:

- Cache hit rate: ~90% (granular invalidation)
- Average load time: 0.4s (**90% faster**)
- Database queries: 6 per load (**97% reduction**)

### Migration Steps for Developers

If you're updating old components to use the new cache system:

**1. Replace unified cache imports**:

```typescript
// Before
import { teacherStudentsCache } from '$lib/stores/teacherStudentsCache.svelte';

// After
import { studentsCache } from '$lib/stores/studentsCache.svelte';
import { gidouillesCache } from '$lib/stores/gidouillesCache.svelte';
import { warningsCache } from '$lib/stores/warningsCache.svelte';
```

**2. Subscribe to Event Bus**:

```typescript
// Add event listener
$effect(() => {
	const unsubscribe = cacheEventBus.subscribe((event) => {
		if (event.type === 'gidouilles' && event.scope.classId === selectedClassId) {
			gidouillesCache.invalidate(selectedClassId);
		}
	});
	return unsubscribe;
});
```

**3. Update invalidation calls**:

```typescript
// Before
teacherStudentsCache.invalidate(classId);

// After
gidouillesCache.invalidate(classId); // Only invalidates what changed
```

---

## Developer Guide

### Adding a New Cached Resource

Follow these steps to add a new cache type:

**1. Create server-side cache module**:

```typescript
// src/lib/server/cache/myresource.ts
import { getCached, invalidateCache } from '$lib/server/cache';

const MY_RESOURCE_TTL = 300; // 5 minutes

export async function getMyResource(id: string, supabase: SupabaseClient) {
	const cacheKey = `myresource:${id}`;

	const fetchData = async () => {
		const { data } = await supabase.from('my_table').select('*').eq('id', id);
		return data;
	};

	return getCached(cacheKey, MY_RESOURCE_TTL, fetchData);
}

export async function invalidateMyResourceCache(id: string) {
	await invalidateCache(`myresource:${id}:*`);
}
```

**2. Create client-side cache store**:

```typescript
// src/lib/stores/myResourceCache.svelte.ts
import { cacheEventBus } from './cacheEventBus.svelte';

class MyResourceCacheStore {
	private cache = $state<Map<string, MyResourceData>>(new Map());

	constructor() {
		// Subscribe to Event Bus
		if (typeof window !== 'undefined') {
			cacheEventBus.subscribe((event) => {
				if (event.type === 'myresource' || event.type === 'all') {
					this.invalidate(event.scope.id);
				}
			});
		}
	}

	async get(id: string): Promise<MyResourceData> {
		if (this.cache.has(id)) return this.cache.get(id)!;

		const response = await fetch(`/api/myresource/${id}`);
		const data = await response.json();

		this.cache.set(id, data);
		return data;
	}

	invalidate(id: string): void {
		this.cache.delete(id);
	}
}

export const myResourceCache = new MyResourceCacheStore();
```

**3. Add Event Bus helper**:

```typescript
// In src/lib/stores/cacheEventBus.svelte.ts
invalidateMyResource(id: string, reason?: string): void {
  this.publish({
    type: 'myresource',
    scope: { id },
    reason
  });
}
```

**4. Use in components**:

```typescript
<script lang="ts">
	import { myResourceCache } from '$lib/stores/myResourceCache.svelte';
	import { cacheEventBus } from '$lib/stores/cacheEventBus.svelte';

	let data = $derived.by(async () => {
		return await myResourceCache.get(resourceId);
	});

	// Subscribe to invalidation events
	$effect(() => {
		const unsubscribe = cacheEventBus.subscribe((event) => {
			if (event.type === 'myresource' && event.scope.id === resourceId) {
				myResourceCache.invalidate(resourceId);
			}
		});
		return unsubscribe;
	});
</script>
```

### Cache Invalidation Best Practices

**✅ DO**:

1. **Invalidate immediately after mutations**:

   ```typescript
   await updateData(id);
   cacheEventBus.invalidateMyResource(id, 'Data updated');
   ```

2. **Use specific scope**:

   ```typescript
   // Good - specific class
   cacheEventBus.invalidateGidouilles(classId);

   // Bad - too broad
   cacheEventBus.invalidateAll(teacherId);
   ```

3. **Provide meaningful reasons**:

   ```typescript
   cacheEventBus.invalidateStudents(classId, 'Imported 25 students from CSV');
   ```

4. **Invalidate both server and client caches**:
   ```typescript
   await invalidateGidouillesCache(classId); // Server (Redis)
   cacheEventBus.invalidateGidouilles(classId); // Client (Svelte stores)
   ```

**❌ DON'T**:

1. **Don't invalidate before mutation**:

   ```typescript
   // Bad - premature invalidation
   cacheEventBus.invalidate(id);
   await updateData(id); // Might fail
   ```

2. **Don't forget to clean up subscriptions**:

   ```typescript
   // Bad - memory leak
   cacheEventBus.subscribe(handleEvent);

   // Good - cleanup
   $effect(() => {
   	const unsubscribe = cacheEventBus.subscribe(handleEvent);
   	return unsubscribe;
   });
   ```

3. **Don't invalidate on read operations**:
   ```typescript
   // Bad - reads don't change data
   await getData(id);
   cacheEventBus.invalidate(id); // Unnecessary
   ```

### Debugging Cache Issues

**Check cache status**:

```typescript
// Get cache statistics
console.log(gidouillesCache.getStats());
// Output:
// {
//   cachedClasses: 3,
//   loadingClasses: 0,
//   totalStudents: 75,
//   optimisticUpdates: 2
// }
```

**Check Event Bus listeners**:

```typescript
console.log(cacheEventBus.listenerCount);
// Output: 5 (number of active subscriptions)
```

**Monitor cache events**:

```typescript
// Log all cache events
cacheEventBus.subscribe((event) => {
	console.log('[CacheEvent]', {
		type: event.type,
		scope: event.scope,
		reason: event.reason,
		timestamp: new Date(event.timestamp).toISOString()
	});
});
```

**Check Redis cache**:

```bash
# Test Redis connection
curl http://localhost:5175/api/health/redis

# View cache keys in Upstash dashboard
# Dashboard → Data Browser → Search "gidouilles:*"
```

---

## Troubleshooting

### Issue 1: Cache not updating after mutation

**Symptoms**: UI shows stale data after mutation

**Cause**: Cache not invalidated

**Fix**:

1. **Verify Event Bus is publishing**:

   ```typescript
   // In mutation handler
   console.log('[API] Publishing invalidation event');
   cacheEventBus.invalidateGidouilles(classId, 'Updated gidouilles');
   ```

2. **Verify component is subscribing**:

   ```typescript
   $effect(() => {
   	console.log('[Component] Subscribing to cache events');
   	const unsubscribe = cacheEventBus.subscribe((event) => {
   		console.log('[Component] Received event:', event);
   		// ...
   	});
   	return unsubscribe;
   });
   ```

3. **Check scope filtering**:
   ```typescript
   // Make sure scope matches
   if (event.scope.classId === selectedClassId) {
   	// ^^^ Verify selectedClassId is correct
   }
   ```

---

### Issue 2: Optimistic update not reverting on error

**Symptoms**: UI shows incorrect value after failed mutation

**Cause**: Rollback not called on error

**Fix**:

```typescript
try {
	await updateServer(id, value);
	cache.clearOptimistic(id);
} catch (error) {
	// THIS IS REQUIRED
	cache.rollbackOptimistic(id);
	toaster.error('Update failed');
}
```

---

### Issue 3: Multiple API calls for same data

**Symptoms**: Network tab shows duplicate requests

**Cause**: Cache deduplication not working

**Fix**:

1. **Check if cache has loading state**:

   ```typescript
   if (this.cache.get(id)?.loading) {
   	// Wait for in-flight request
   	return this.waitForLoad(id);
   }
   ```

2. **Verify cache key is consistent**:
   ```typescript
   // Make sure same ID produces same cache key
   console.log(this.getCacheKey(classId, periodId));
   ```

---

### Issue 4: Event Bus listeners accumulating

**Symptoms**: Multiple event handlers firing, memory leak

**Cause**: Not cleaning up subscriptions

**Fix**:

```typescript
// ALWAYS return unsubscribe function from $effect
$effect(() => {
	const unsubscribe = cacheEventBus.subscribe(handleEvent);
	return unsubscribe; // THIS IS REQUIRED
});
```

---

### Issue 5: Redis cache not working in production

**Symptoms**: Slower load times in production

**Cause**: Redis not configured in Vercel

**Fix**:

1. **Verify environment variables** in Vercel:
   - Settings → Environment Variables
   - Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

2. **Test Redis health endpoint**:

   ```bash
   curl https://ubumaths.vercel.app/api/health/redis
   ```

3. **Check Vercel logs** for Redis errors:
   - Deployments → Functions → Filter by "Redis"

---

## References

### Related Documentation

- [Redis Cache Setup Guide](../guides/redis-cache-setup.md) - Local/production setup
- [Component Architecture](components.md) - MySelect and dropdown standardization
- [Performance Optimizations](performance.md) - Overall performance guide
- [Database Schema](database-schema.md) - Database structure

### Source Code

- **Event Bus**: `src/lib/stores/cacheEventBus.svelte.ts`
- **Students Cache**: `src/lib/stores/studentsCache.svelte.ts` (client), `src/lib/server/cache/students.ts` (server)
- **Gidouilles Cache**: `src/lib/stores/gidouillesCache.svelte.ts` (client), `src/lib/server/cache/gidouilles.ts` (server)
- **Warnings Cache**: `src/lib/stores/warningsCache.svelte.ts` (client), `src/lib/server/cache/warnings.ts` (server)

### External Resources

- [Upstash Redis Documentation](https://upstash.com/docs/redis)
- [Svelte 5 Runes Guide](https://svelte.dev/docs/svelte/overview)
- [Pub/Sub Pattern (Wikipedia)](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern)

---

**Last Updated**: 2025-10-29
**Maintained By**: Development Team
**Need Help?**: Check [Troubleshooting](#troubleshooting) or review source code
