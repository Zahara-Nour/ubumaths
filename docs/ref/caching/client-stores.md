# Client-Side Cache Stores

Technical documentation for Svelte 5 reactive cache stores used in dashboards and features.

---

## Overview

UbuMaths implements several client-side cache stores using Svelte 5 runes (`$state`, `SvelteMap`) to provide:

- **TTL-based expiration**: Automatic cache invalidation after specified durations
- **Optimistic UI**: Instant feedback before server confirmation
- **SSR hydration**: Pre-fill cache from server-side load functions
- **Reactive updates**: Automatic UI updates when cache changes

---

## Teacher Dashboard Cache

**Location**: `src/lib/stores/teacherDashboardCache.svelte.ts`

### Architecture

```
TeacherDashboardCache (Singleton)
│
├── studentsCache:    SvelteMap<classId, CachedStudents>      TTL: 2h
├── rewardsCache:     SvelteMap<classId, CachedRewards>       TTL: 10min
├── warningsCache:    SvelteMap<classId:periodId, CachedWarnings>  TTL: 10min
├── classesCache:     SvelteMap<classId, CachedClass>         TTL: 24h
├── schoolCache:      SvelteMap<schoolId, CachedSchool>       TTL: 24h
└── periodsCache:     SvelteMap<schoolId, CachedPeriods>      TTL: 1h
```

### Cache Types

| Cache    | Key                | TTL   | Data                                   |
| -------- | ------------------ | ----- | -------------------------------------- |
| Students | `classId`          | 2h    | `BasicStudent[]`                       |
| Rewards  | `classId`          | 10min | `Map<studentId, StudentRewards>`       |
| Warnings | `classId:periodId` | 10min | `Map<studentId, StudentWarningCounts>` |
| Classes  | `classId`          | 24h   | `ClassInfo`                            |
| School   | `schoolId`         | 24h   | `SchoolInfo`                           |
| Periods  | `schoolId`         | 1h    | `{currentPeriod, allPeriods}`          |

### API Reference

#### Async Getters (Auto-Fetch)

```typescript
// Auto-fetches from API if cache miss or expired
const students = await teacherCache.getStudentBasic(classId);
const rewards = await teacherCache.getStudentRewards(classId);
const warnings = await teacherCache.getStudentWarnings(classId, periodId);
const classInfo = await teacherCache.getClassInfo(classId);
const schoolInfo = await teacherCache.getSchoolInfo(schoolId);
```

#### Sync Getters (for $derived)

```typescript
// Returns null if not cached (no auto-fetch)
const rewards = teacherCache.getRewardsSync(classId);
const warnings = teacherCache.getWarningsSync(classId, periodId);
const students = teacherCache.getStudentsSync(classId);
const classes = teacherCache.getAllClassesSync();
const periods = teacherCache.getPeriodsSync(schoolId);
```

#### Optimistic Updates

```typescript
// Instant UI feedback (no server call)
teacherCache.updateGidouillesOptimistic(classId, studentId, delta);
teacherCache.updateBonusOptimistic(classId, studentId, delta);
teacherCache.updateVipCardsOptimistic(classId, studentId, vipCards);
teacherCache.updateWarningsOptimistic(classId, periodId, studentId, counts);
```

#### Hydration Methods

```typescript
// Pre-fill from load function data (preferred over auto-fetch)
teacherCache.hydrateStudents(classId, students);
teacherCache.hydrateRewards(classId, students);
teacherCache.hydrateWarnings(classId, periodId, warningsMap);
teacherCache.hydrateClassInfo(classId, classInfo);
teacherCache.hydrateSchoolInfo(schoolId, schoolInfo);
teacherCache.hydrateAllClasses(classes);
teacherCache.setPeriods(schoolId, currentPeriod, allPeriods);
```

#### Invalidation Methods

```typescript
// Force refetch on next access
teacherCache.invalidateStudents(classId);
teacherCache.invalidateRewards(classId);
teacherCache.invalidateWarnings(classId, periodId);
teacherCache.invalidateAllWarningsForClass(classId);
teacherCache.invalidateClass(classId);
teacherCache.invalidateSchool(schoolId);
teacherCache.invalidatePeriods(schoolId);
teacherCache.invalidateAll(); // Clear everything
```

---

## Student Dashboard Cache

**Location**: `src/lib/stores/studentDashboardCache.svelte.ts`

### Architecture

Simplified cache for single-user (student) context:

```
StudentDashboardCache (Singleton)
│
├── profileCache:    $state<CachedProfile | null>    TTL: 2h
├── rewardsCache:    $state<CachedRewards | null>    TTL: 10min
└── warningsCache:   Map<periodId, CachedWarnings>   TTL: 10min
```

### API Reference

```typescript
import { studentCache } from '$lib/stores/studentDashboardCache.svelte';

// Getters
const profile = await studentCache.getProfile();
const rewards = await studentCache.getRewards();
const warnings = await studentCache.getWarnings(periodId);

// Sync getters
const rewards = studentCache.getRewardsSync();
const warnings = studentCache.getWarningsSync(periodId);

// Optimistic updates
studentCache.updateGidouillesOptimistic(delta);
studentCache.updateBonusOptimistic(delta);
studentCache.updateVipCardsOptimistic(vipCards);
studentCache.updateWarningsOptimistic(periodId, counts);

// Hydration
studentCache.hydrateProfile(profile);
studentCache.hydrateRewards(rewards);
studentCache.hydrateWarnings(periodId, warnings);

// Invalidation
studentCache.invalidateProfile();
studentCache.invalidateRewards();
studentCache.invalidateWarnings(periodId);
studentCache.invalidateAll();
```

---

## Cache Synchronization

**Location**: `src/lib/utils/cache-sync.ts`

Unified API for updating either teacher or student cache based on context:

```typescript
import { syncVipCards, syncGidouilles, rollbackGidouilles } from '$lib/utils/cache-sync';

interface CacheContext {
	role: 'teacher' | 'student';
	classId?: string; // Required for teacher
	studentId?: string; // Required for teacher
}

// Sync operations
syncVipCards(context, vipCards);
syncGidouilles(context, delta);
rollbackGidouilles(context, delta); // Undo optimistic update
syncWarnings(context, periodId, counts);

// Invalidation
invalidateRewards(context);
invalidateWarnings(context, periodId);

// Refetch
await refetchRewards(context);
await refetchWarnings(context, periodId);
```

---

## Application Stores

### Marketplace Store

**Location**: `src/lib/stores/marketplace.svelte.ts`

```typescript
class MarketplaceStore {
	// Caches with 5-minute TTL
	private lastFetch = {
		listings: 0,
		myListings: 0,
		proposals: 0,
		trades: 0,
		cards: 0
	};
	private readonly CACHE_TTL = 300000; // 5 minutes

	// Realtime subscriptions override TTL for instant updates
	private listingsChannel: RealtimeChannel;
	private tradesChannel: RealtimeChannel;
	private proposalsChannel: RealtimeChannel;
}
```

**Key Features**:

- TTL-based caching with realtime override
- Optimistic UI for listing creation
- Automatic cache invalidation on realtime events
- Reconnection handling

### Achievements Store

**Location**: `src/lib/stores/achievements.svelte.ts`

```typescript
// 3 separate caches with 5-minute TTL
achievementsCache: Map<achievementId, Achievement>;
studentAchievementsCache: Map<achievementId, StudentAchievement>;
progressCache: Map<`${studentId}:${achievementId}`, AchievementProgress>;
```

**Key Features**:

- Context-aware caching (e.g., by game context)
- Toast queue for achievement notifications
- Event-driven cache invalidation

### Question Templates Store

**Location**: `src/lib/stores/questionTemplates.svelte.ts`

```typescript
// No TTL - manual invalidation only
templates: $state<QuestionTemplate[]>([]);
```

**Key Features**:

- SSR hydration from server
- Manual invalidation via `invalidate()` and `clear()`
- Category filtering utilities

### Question Categories Store

**Location**: `src/lib/stores/questionCategories.svelte.ts`

```typescript
// 5-minute TTL
private readonly CACHE_TTL = 5 * 60 * 1000;
```

**Key Features**:

- Used for uniqueness validation in admin pages
- Auto-fetch on cache miss

---

## Patterns

### Hydration Pattern

Preferred approach - pre-fill cache from load function:

```svelte
<script lang="ts">
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	let { data } = $props();

	$effect(() => {
		// Hydrate from server data (no API call)
		for (const cls of data.classes) {
			teacherCache.hydrateStudents(cls.id, cls.students);
			teacherCache.hydrateRewards(cls.id, cls.students);
		}
	});
</script>
```

### Optimistic UI Pattern

Instant feedback with debounced server sync:

```typescript
let baseValues: Record<string, number> = {};
let timers: Record<string, number> = {};

function handleClick(studentId: string, delta: number) {
	// 1. Save base value on first click
	if (!timers[studentId]) {
		baseValues[studentId] = getCurrentValue(studentId);
	}

	// 2. Optimistic update
	teacherCache.updateGidouillesOptimistic(classId, studentId, delta);

	// 3. Debounce server sync
	clearTimeout(timers[studentId]);
	timers[studentId] = setTimeout(async () => {
		const currentValue = getCurrentValue(studentId);
		const totalDelta = currentValue - baseValues[studentId];
		await syncToServer(studentId, totalDelta);
		delete timers[studentId];
		delete baseValues[studentId];
	}, 500);
}
```

### Cache-First Pattern

Check cache before network:

```typescript
let cachedRewards = $derived(teacherCache.getRewardsSync(classId));

$effect(() => {
	if (!cachedRewards) {
		// Cache miss - fetch async
		teacherCache.getStudentRewards(classId);
	}
});
```

---

## Reactivity

### SvelteMap Usage

Teacher cache uses `SvelteMap` for native reactivity:

```typescript
// Auto-reactive - no $state wrapper needed
private rewardsCache = new SvelteMap<string, CachedRewards>();

// Updates trigger reactive consumers
rewardsCache.set(classId, { rewards, fetchedAt: Date.now() });
```

### Optimistic Update Reactivity

Creating new objects ensures Svelte detects changes:

```typescript
updateGidouillesOptimistic(classId, studentId, delta) {
  const cached = this.rewardsCache.get(classId);
  const rewards = cached.rewards.get(studentId);

  // Create NEW object (triggers reactivity)
  const updatedRewards = { ...rewards, gidouilles: newValue };

  // Create NEW Map (triggers reactivity)
  const newRewardsMap = new SvelteMap(cached.rewards);
  newRewardsMap.set(studentId, updatedRewards);

  // Update cache (triggers reactivity)
  this.rewardsCache.set(classId, { ...cached, rewards: newRewardsMap });
}
```

---

## Monitoring

### Environment Variable

```bash
VITE_ENABLE_CACHE_MONITORING=true
```

### Statistics

```typescript
const stats = teacherCache.getStats();
// {
//   students: 3,
//   rewards: 3,
//   warnings: 5,
//   classes: 3,
//   school: 1,
//   periods: 1,
//   totalEntries: 16,
//   memoryEstimate: '16KB'
// }

teacherCache.logStats(); // Logs to console
```

### Console Logs

```
[Cache] Cache HIT: Rewards for class abc123 (0.12ms)
[Cache] Cache MISS: Warnings for class:period abc123:xyz789 (TTL expired) - Fetching...
[Cache] Optimistic gidouilles update: student xyz789 → 18
[Cache] Hydrated students for class abc123: 25 students
[Cache] Invalidated rewards for class: abc123
```

---

## Memory Management

### Estimated Memory Usage

| Data                    | Typical Size |
| ----------------------- | ------------ |
| Per student entry       | ~100 bytes   |
| Per class (20 students) | ~2KB         |
| Teacher with 3 classes  | ~15KB        |
| Total cache overhead    | ~20KB        |

### Automatic Cleanup

- Expired entries checked on each read
- Cache persists until explicit invalidation or page unload
- No background cleanup (memory is negligible)

---

## Related Documentation

- [Teacher Cache (Claude)](../../claude/teacher-cache.md) - Developer reference
- [Student Cache (Claude)](../../claude/student-cache.md) - Developer reference
- [Cross-Device Sync](../../features/cross-device-sync.md) - Polling-based synchronization
- [Improvements](improvements.md#client-store-improvements) - Recommended enhancements
