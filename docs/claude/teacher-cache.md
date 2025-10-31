# Teacher Dashboard Cache

Documentation technique du système de cache client-side pour le dashboard enseignant.

> **Pour architecture et design decisions** : [docs/architecture/teacher-cache.md](../architecture/teacher-cache.md)

---

## 🎯 Quick Reference

**Import** : `import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';`

**Singleton** : Une seule instance partagée dans toute l'app

**Réactif** : Utilise `$state` de Svelte 5 pour réactivité automatique

### 5 Caches Distincts

| Cache        | Contenu            | TTL   | Clé                | Usage                  |
| ------------ | ------------------ | ----- | ------------------ | ---------------------- |
| **Cache 1**  | Student Basic Info | 2h    | `classId`          | Noms, avatars, IDs     |
| **Cache 2A** | Student Rewards    | 10min | `classId`          | Gidouilles, VIP cards  |
| **Cache 2B** | Student Warnings   | 10min | `classId:periodId` | Avertissements C/M/R/T |
| **Cache 3**  | Class Info         | 24h   | `classId`          | Metadata, schedules    |
| **Cache 4**  | School Info        | 24h   | `schoolId`         | School data, periods   |

---

## ⚡ Common Patterns

### Pattern 1: Hydration (Recommended)

**TOUJOURS préférer l'hydration** plutôt que les API calls directs.

```typescript
// +page.server.ts - Load function
export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	// Fetch data from database
	const { data: students } = await supabase
		.from('class_members')
		.select('student_id, firstname, lastname, gidouilles, vip_cards')
		.eq('class_id', classId);

	return { students };
};

// +page.svelte - Component
$effect(() => {
	// Hydrate cache with server data
	teacherCache.hydrateRewards(classId, data.students);
	teacherCache.hydrateStudents(classId, data.students);
});
```

**Pourquoi** : Réutilise les données déjà fetchées par le load function, évite API call redondant.

---

### Pattern 2: Auto-Fetch (Fallback)

Utilise si hydration impossible (pas de load function).

```typescript
// Auto-fetches if cache expired or missing
const rewards = await teacherCache.getStudentRewards(classId);

// Uses existing API endpoint: /api/classes/{classId}/gidouilles
```

**Quand** : Pages sans load function, ou données expirées.

---

### Pattern 3: Optimistic UI

Combine cache updates avec optimistic UI pattern.

```typescript
// Debounced update with optimistic UI
let optimisticGidouilles = $state<Record<string, number>>({});

function handleUpdate(studentId: string, delta: number) {
	// 1. Optimistic UI (instant feedback)
	const current = getStudentGidouilles(studentId);
	optimisticGidouilles[studentId] = current + delta;

	// 2. Update cache optimistically
	teacherCache.updateGidouillesOptimistic(classId, studentId, delta);

	// 3. Debounce server sync (500ms)
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(async () => {
		try {
			await fetch('/api/update', {
				/* ... */
			});

			// 4. Success: Invalidate cache
			teacherCache.invalidateRewards(classId);
			delete optimisticGidouilles[studentId];
		} catch {
			// 5. Error: Rollback
			delete optimisticGidouilles[studentId];
		}
	}, 500);
}
```

**Référence** : [rewards/+page.svelte](<../../src/routes/(protected)/dashboard/teacher/rewards/+page.svelte>) (lignes 245-428)

---

### Pattern 4: Composite Keys (Warnings)

Cache 2B utilise clés composites pour isolation par période.

```typescript
// Load warnings for specific class + period
const warnings = await teacherCache.getStudentWarnings(classId, periodId);

// Internal key: `${classId}:${periodId}` (e.g., "abc123:xyz789")

// Invalidate specific period
teacherCache.invalidateWarnings(classId, periodId);

// Invalidate all periods for a class
teacherCache.invalidateAllWarningsForClass(classId);
```

**Pourquoi** : Un étudiant peut avoir différents avertissements selon la période académique.

**Référence** : [warnings/+page.svelte](<../../src/routes/(protected)/dashboard/teacher/warnings/+page.svelte>) (lignes 196-219)

---

## 📚 API Methods

### Async Getters (Auto-Fetch)

#### `getStudentBasic(classId: string): Promise<BasicStudent[]>`

Récupère infos basiques des étudiants (noms, avatars, IDs).

```typescript
const students = await teacherCache.getStudentBasic(classId);

// Returns: [{ id, firstname, lastname, full_name, avatar_url, role, gender, is_test }, ...]
```

**TTL** : 2 heures
**API Endpoint** : `/api/classes/{classId}/students`
**Console Log** : `[Cache] Student basic HIT/MISS for class: {classId}`

---

#### `getStudentRewards(classId: string): Promise<Map<string, StudentRewards>>`

Récupère récompenses (gidouilles + VIP cards).

```typescript
const rewards = await teacherCache.getStudentRewards(classId);

// Returns: Map { studentId => { gidouilles: number, vip_cards: Record<string, number> } }

// Example access:
const student = rewards.get(studentId);
console.log(student.gidouilles); // 15
console.log(student.vip_cards); // { 'bonus': 2, 'joker': 1 }
```

**TTL** : 10 minutes
**API Endpoint** : `/api/classes/{classId}/gidouilles`
**Console Log** : `[Cache] Rewards HIT/MISS for class: {classId}`

---

#### `getStudentWarnings(classId: string, periodId: string): Promise<Map<string, StudentWarningCounts>>`

Récupère avertissements pour une classe et période.

```typescript
const warnings = await teacherCache.getStudentWarnings(classId, periodId);

// Returns: Map { studentId => { C: number, M: number, R: number, T: number, total: number, score: number, warnings: Warning[] } }

// Example access:
const student = warnings.get(studentId);
console.log(student.C); // 2 (Conduite warnings)
console.log(student.score); // 18 (20 - total warnings)
```

**TTL** : 10 minutes
**API Endpoint** : `/api/classes/{classId}/warnings?period_id={periodId}`
**Console Log** : `[Cache] Warnings HIT/MISS for class:period: {classId}:{periodId}`
**Composite Key** : `${classId}:${periodId}`

---

#### `getClassInfo(classId: string): Promise<ClassInfo>`

Récupère métadonnées de classe (nom, description, emploi du temps).

```typescript
const classInfo = await teacherCache.getClassInfo(classId);

// Returns: { id, teacher_id, name, description, join_code, is_active, created_at, updated_at, student_count, schedules: ClassSchedule[] }
```

**TTL** : 24 heures
**API Endpoint** : ❌ **NOT IMPLEMENTED** - Utilise hydration uniquement
**Console Log** : `[Cache] Class info HIT/MISS for: {classId}`

⚠️ **IMPORTANT** : `getClassInfo()` throw une erreur si cache vide. Utilise `hydrateClassInfo()` dans load function.

---

#### `getSchoolInfo(schoolId: string): Promise<SchoolInfo>`

Récupère infos école (périodes académiques).

```typescript
const schoolInfo = await teacherCache.getSchoolInfo(schoolId);

// Returns: { school: School, current_period: AcademicPeriod | null, all_periods: AcademicPeriod[] }
```

**TTL** : 24 heures
**API Endpoint** : ❌ **NOT IMPLEMENTED** - Utilise hydration uniquement
**Console Log** : `[Cache] School info HIT/MISS for: {schoolId}`

⚠️ **IMPORTANT** : `getSchoolInfo()` throw une erreur si cache vide. Utilise `hydrateSchoolInfo()` dans load function.

---

### Sync Getters (for $derived)

Utilisés dans `$derived` pour éviter async/await.

#### `getRewardsSync(classId: string): Map<string, StudentRewards> | null`

Version synchrone de `getStudentRewards()`.

```typescript
let cachedRewards = $derived(teacherCache.getRewardsSync(classId));

if (cachedRewards) {
	// Use cached data
	const student = cachedRewards.get(studentId);
} else {
	// Cache miss or expired - fetch async
	await teacherCache.getStudentRewards(classId);
}
```

**Returns** : `null` si cache expiré ou manquant.

---

#### `getWarningsSync(classId: string, periodId: string): Map<string, StudentWarningCounts> | null`

Version synchrone de `getStudentWarnings()`.

```typescript
let cachedWarnings = $derived(teacherCache.getWarningsSync(classId, periodId));
```

**Returns** : `null` si cache expiré ou manquant.

---

### Optimistic Update Methods

#### `updateGidouillesOptimistic(classId: string, studentId: string, delta: number): void`

Update gidouilles optimiste (instant UI feedback).

```typescript
// Add 3 gidouilles instantly
teacherCache.updateGidouillesOptimistic(classId, studentId, +3);

// Remove 5 gidouilles instantly (enforces min 0)
teacherCache.updateGidouillesOptimistic(classId, studentId, -5);
```

**Minimum** : 0 (ne peut pas être négatif)
**Console Log** : `[Cache] Optimistic gidouilles update: student {studentId} → {newValue}`

---

#### `updateVipCardsOptimistic(classId: string, studentId: string, vipCards: Record<string, number>): void`

Update VIP cards optimiste.

```typescript
const newCards = { bonus: 3, joker: 1 };
teacherCache.updateVipCardsOptimistic(classId, studentId, newCards);
```

**Console Log** : `[Cache] Optimistic VIP cards update: student {studentId}`

---

#### `updateWarningsOptimistic(classId: string, periodId: string, studentId: string, counts: StudentWarningCounts): void`

Update avertissements optimiste.

```typescript
const newCounts = { C: 2, M: 1, R: 0, T: 0, total: 3, score: 17, warnings: [...] };
teacherCache.updateWarningsOptimistic(classId, periodId, studentId, newCounts);
```

**Console Log** : `[Cache] Optimistic warnings update: student {studentId}, score: {score}`

---

### Hydration Methods

**Préférer hydration** plutôt que auto-fetch (évite API calls redondants).

#### `hydrateStudents(classId: string, students: BasicStudent[]): void`

Pré-remplit Cache 1 avec données du load function.

```typescript
// +page.svelte
$effect(() => {
	teacherCache.hydrateStudents(classId, data.students);
});
```

**Console Log** : `[Cache] Hydrated students for class {classId}: {count} students`

---

#### `hydrateRewards(classId: string, students: Array<{ id, gidouilles, vip_cards }>): void`

Pré-remplit Cache 2A.

```typescript
$effect(() => {
	teacherCache.hydrateRewards(classId, data.students);
});
```

**Console Log** : `[Cache] Hydrated rewards for class {classId}: {count} students`

---

#### `hydrateWarnings(classId: string, periodId: string, warningsMap: Map<string, StudentWarningCounts>): void`

Pré-remplit Cache 2B.

```typescript
$effect(() => {
	const warningsMap = new Map<string, StudentWarningCounts>();
	// ... populate map from data.warnings
	teacherCache.hydrateWarnings(classId, periodId, warningsMap);
});
```

**Console Log** : `[Cache] Hydrated warnings for class:period {classId}:{periodId}: {count} students`

---

#### `hydrateClassInfo(classId: string, classInfo: ClassInfo): void`

Pré-remplit Cache 3 (metadata + schedules).

```typescript
$effect(() => {
	const classInfo = {
		id: classItem.id,
		teacher_id: classItem.teacher_id,
		name: classItem.name,
		description: classItem.description,
		join_code: classItem.join_code,
		is_active: classItem.is_active,
		created_at: classItem.created_at,
		updated_at: classItem.updated_at,
		student_count: classItem.student_count,
		schedules: classItem.schedules
	};
	teacherCache.hydrateClassInfo(classId, classInfo);
});
```

**Référence** : [classes/+page.svelte](<../../src/routes/(protected)/dashboard/teacher/classes/+page.svelte>) (lignes 59-75)

**Console Log** : `[Cache] Hydrated class info for class {classId}`

---

#### `hydrateSchoolInfo(schoolId: string, schoolInfo: SchoolInfo): void`

Pré-remplit Cache 4 (school + periods).

```typescript
$effect(() => {
	if (data.school) {
		teacherCache.hydrateSchoolInfo(data.school.id, {
			school: data.school,
			current_period: data.currentPeriod,
			all_periods: data.allPeriods
		});
	}
});
```

**Console Log** : `[Cache] Hydrated school info for school {schoolId}`

---

### Invalidation Methods

**Quand invalider** : Après mutation (add/remove gidouilles, warnings, VIP cards).

#### `invalidateStudents(classId: string): void`

Invalide Cache 1.

```typescript
// After student added/removed from class
teacherCache.invalidateStudents(classId);
```

**Triggers** : Student enrollment changes, name changes, avatar changes

---

#### `invalidateRewards(classId: string): void`

Invalide Cache 2A.

```typescript
// After gidouilles or VIP card update
teacherCache.invalidateRewards(classId);
```

**Triggers** : Gidouilles add/remove, VIP card award/remove

**Référence** : [rewards/+page.svelte](<../../src/routes/(protected)/dashboard/teacher/rewards/+page.svelte>) (lignes 408, 508, 830)

---

#### `invalidateWarnings(classId: string, periodId: string): void`

Invalide Cache 2B pour une période spécifique.

```typescript
// After warning added/removed for this period
teacherCache.invalidateWarnings(classId, periodId);
```

**Triggers** : Warning add/remove

**Référence** : [warnings/+page.svelte](<../../src/routes/(protected)/dashboard/teacher/warnings/+page.svelte>) (lignes 281, 355)

---

#### `invalidateAllWarningsForClass(classId: string): void`

Invalide Cache 2B pour **toutes** les périodes d'une classe.

```typescript
// After class deleted or period structure changed
teacherCache.invalidateAllWarningsForClass(classId);
```

**Triggers** : Class deletion, academic period changes

**Console Log** : `[Cache] Invalidated all warnings for class: {classId} ({count} periods)`

---

#### `invalidateClass(classId: string): void`

Invalide Cache 3.

```typescript
// After class metadata or schedule change
teacherCache.invalidateClass(classId);
```

**Triggers** : Class name/description change, schedule add/edit/delete

---

#### `invalidateSchool(schoolId: string): void`

Invalide Cache 4.

```typescript
// After school data or periods change
teacherCache.invalidateSchool(schoolId);
```

**Triggers** : School settings change, academic period add/edit/delete

---

#### `invalidateAll(): void`

Invalide **tous** les caches (reset complet).

```typescript
// Use sparingly - only for logout or critical data refresh
teacherCache.invalidateAll();
```

**⚠️ Use Cases** : Logout, role change, critical data corruption

**Console Log** : `[Cache] All caches cleared`

---

### Statistics Methods

#### `getStats(): CacheStats`

Récupère statistiques du cache.

```typescript
const stats = teacherCache.getStats();

console.log(stats);
// {
//   students: 3,
//   rewards: 3,
//   warnings: 5,
//   classes: 3,
//   school: 1,
//   totalEntries: 15,
//   memoryEstimate: '15KB'
// }
```

**Returns** :

```typescript
{
	students: number; // Cache 1 entries
	rewards: number; // Cache 2A entries
	warnings: number; // Cache 2B entries (all periods combined)
	classes: number; // Cache 3 entries
	school: number; // Cache 4 entries (usually 0 or 1)
	totalEntries: number; // Sum of all
	memoryEstimate: string; // ~1KB per entry
}
```

---

#### `logStats(): void`

Affiche statistiques dans console.

```typescript
teacherCache.logStats();
// [Cache] Statistics: { students: 3, rewards: 3, ... }
```

**Use Case** : Debugging, monitoring cache growth

---

## 🔧 Integration Guide

### Step 1: Add Hydration in +page.svelte

```svelte
<script lang="ts">
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Hydrate cache with server data
	$effect(() => {
		// For each class returned by load function
		for (const classItem of data.classes) {
			// Hydrate relevant caches
			teacherCache.hydrateStudents(classItem.id, classItem.students);
			teacherCache.hydrateRewards(classItem.id, classItem.students);
		}
	});
</script>
```

---

### Step 2: Use Cache for Derived State

```svelte
<script lang="ts">
	let selectedClassId = $state(data.classes[0]?.id);

	// Sync getter for $derived (no async)
	let cachedRewards = $derived(teacherCache.getRewardsSync(selectedClassId));

	// Helper to get student rewards with cache fallback
	function getStudentRewards(studentId: string): StudentRewards | null {
		if (!cachedRewards) return null;
		return cachedRewards.get(studentId) || { gidouilles: 0, vip_cards: {} };
	}
</script>

{#each data.students as student}
	{@const rewards = getStudentRewards(student.id)}
	<div>Gidouilles: {rewards?.gidouilles ?? 0}</div>
{/each}
```

---

### Step 3: Invalidate After Mutations

```typescript
async function updateGidouilles(studentId: string, delta: number) {
	try {
		await fetch('/api/update', {
			method: 'POST',
			body: JSON.stringify({ studentId, delta })
		});

		// Invalidate cache to force refetch on next access
		teacherCache.invalidateRewards(selectedClassId);

		// Optional: Manually refresh data
		await invalidateAll(); // SvelteKit helper
	} catch (error) {
		toaster.error('Update failed');
	}
}
```

---

### Step 4: Add Optimistic UI (Optional)

```typescript
let optimisticGidouilles = $state<Record<string, number>>({});

function handleUpdate(studentId: string, delta: number) {
	// 1. Optimistic UI
	const current = getGidouilles(studentId);
	optimisticGidouilles[studentId] = current + delta;

	// 2. Update cache
	teacherCache.updateGidouillesOptimistic(selectedClassId, studentId, delta);

	// 3. Debounce server sync
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(async () => {
		try {
			await updateGidouilles(studentId, delta);
			delete optimisticGidouilles[studentId];
		} catch {
			delete optimisticGidouilles[studentId]; // Rollback
		}
	}, 500);
}

function getGidouilles(studentId: string): number {
	// Priority: optimistic > cache > server data
	if (optimisticGidouilles[studentId] !== undefined) {
		return optimisticGidouilles[studentId];
	}

	const cached = cachedRewards?.get(studentId);
	if (cached) return cached.gidouilles;

	// Fallback to server data
	const student = data.students.find((s) => s.id === studentId);
	return student?.gidouilles ?? 0;
}
```

---

## ⚠️ Edge Cases & Pitfalls

### Edge Case 1: Cache Miss on Page Load

**Problem** : User lands directly on rewards page (no hydration from classes page).

**Solution** : Auto-fetch fallback.

```typescript
$effect(() => {
	// Try sync getter first
	let rewards = teacherCache.getRewardsSync(classId);

	if (!rewards) {
		// Cache miss - fetch from API
		teacherCache.getStudentRewards(classId).then((r) => {
			rewards = r;
		});
	}
});
```

**Référence** : Cache automatically calls API if data missing/expired.

---

### Edge Case 2: Composite Key Confusion (Warnings)

**Problem** : Forgetting period ID when working with warnings.

**❌ Wrong** :

```typescript
teacherCache.invalidateWarnings(classId); // Type error!
```

**✅ Correct** :

```typescript
teacherCache.invalidateWarnings(classId, periodId);

// Or invalidate all periods
teacherCache.invalidateAllWarningsForClass(classId);
```

---

### Edge Case 3: Optimistic UI Rollback

**Problem** : Server update fails, UI shows wrong value.

**Solution** : Always rollback on error.

```typescript
// Save previous value for rollback
const previousValue = getGidouilles(studentId);

// Apply optimistic update
optimisticGidouilles[studentId] = previousValue + delta;

try {
	await updateServer(studentId, delta);
	delete optimisticGidouilles[studentId]; // Confirmed
} catch {
	// ROLLBACK
	optimisticGidouilles[studentId] = previousValue;

	// Show briefly then clear
	setTimeout(() => {
		delete optimisticGidouilles[studentId];
	}, 100);
}
```

---

### Edge Case 4: TTL Expiration Mid-Session

**Problem** : User stays on page for >10 minutes, rewards cache expires.

**Solution** : Auto-refetch on next access.

```typescript
// Rewards cache has 10min TTL
const rewards = await teacherCache.getStudentRewards(classId);

// If cached and fresh → returns cached (instant)
// If expired or missing → fetches from API (200ms)
```

**User Experience** : Transparent - no visible loading state on refetch.

---

### Edge Case 5: Memory Leak (Unmounted Component)

**Problem** : Cache stays in memory even after teacher leaves page.

**Solution** : Cache persists by design (singleton). Use cleanup if needed.

```typescript
// Optional: Clear cache on logout
$effect(() => {
	return () => {
		if (isLoggingOut) {
			teacherCache.invalidateAll();
		}
	};
});
```

**Note** : Cache is lightweight (~1KB per entry). No memory leak risk for typical usage.

---

## 🧪 Testing Guide

### Manual Testing

1. **Cache Hit** : Load page twice, check console for `HIT` messages
2. **Cache Miss** : Wait for TTL expiration, reload page, check for `MISS`
3. **Optimistic UI** : Click +/- buttons rapidly, verify instant feedback
4. **Debouncing** : Click 10 times, verify only 1 API call
5. **Invalidation** : Update data, verify cache cleared

### Console Logs

Enable cache logging in browser DevTools:

```
[Cache] Student basic HIT for class: abc123
[Cache] Rewards MISS for class: abc123 - Fetching...
[Cache] Optimistic gidouilles update: student xyz789 → 18
[Cache] Invalidated rewards for class: abc123
[Cache] Statistics: { students: 3, rewards: 3, warnings: 5, classes: 3, school: 1, totalEntries: 15, memoryEstimate: '15KB' }
```

---

### Unit Tests (TODO)

```typescript
// tests/unit/teacherCache.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';

describe('teacherCache', () => {
	beforeEach(() => {
		teacherCache.invalidateAll();
	});

	it('should cache student rewards for 10 minutes', async () => {
		// Mock API
		global.fetch = vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ gidouilles: [{ student_id: '1', gidouilles: 10 }] })
			})
		);

		// First call - cache miss
		const rewards1 = await teacherCache.getStudentRewards('class1');
		expect(fetch).toHaveBeenCalledTimes(1);

		// Second call within TTL - cache hit
		const rewards2 = await teacherCache.getStudentRewards('class1');
		expect(fetch).toHaveBeenCalledTimes(1); // No additional call
		expect(rewards1).toBe(rewards2); // Same object
	});

	it('should use composite key for warnings', async () => {
		// Should create separate cache entries for different periods
		await teacherCache.getStudentWarnings('class1', 'period1');
		await teacherCache.getStudentWarnings('class1', 'period2');

		const stats = teacherCache.getStats();
		expect(stats.warnings).toBe(2); // Two separate entries
	});
});
```

---

## 📊 Performance Impact

**Expected Improvements** (based on implementation):

| Metric                   | Without Cache | With Cache              | Improvement        |
| ------------------------ | ------------- | ----------------------- | ------------------ |
| Rewards page load        | 7 API calls   | 0 API calls (hydrated)  | **100% reduction** |
| Warnings page load       | 3 API calls   | 0 API calls (hydrated)  | **100% reduction** |
| Navigation between pages | 500ms (fetch) | <50ms (cache hit)       | **90% faster**     |
| Rapid +/- clicks (10x)   | 10 API calls  | 1 API call (debounced)  | **90% reduction**  |
| Memory usage             | 0KB           | ~15KB (typical teacher) | +15KB              |

**Real-World Usage** :

- Teacher avec 3 classes × 20 students = 60 students
- Cache size: ~60KB total (negligible)
- API calls saved: ~60-90% reduction

---

## 🚀 Future Improvements

### 1. Persistent Cache (localStorage)

Actuellement : Cache perdu au refresh page.

**Proposition** :

```typescript
// Save to localStorage on update
localStorage.setItem('teacherCache', JSON.stringify(cacheState));

// Restore on init
const saved = localStorage.getItem('teacherCache');
if (saved) {
	teacherCache.restore(JSON.parse(saved));
}
```

**Risks** : Stale data, storage quota, sync issues

---

### 2. Smart Prefetching

Actuellement : Fetch on demand.

**Proposition** :

```typescript
// Prefetch next class when user hovers tab
onTabHover((classId) => {
	teacherCache.getStudentRewards(classId); // Prefetch
});
```

**Benefits** : Instant tab switching, better UX

---

### 3. Automatic Background Refresh

Actuellement : Manual invalidation required.

**Proposition** :

```typescript
// Refresh rewards every 5 minutes while page visible
setInterval(
	() => {
		if (document.visibilityState === 'visible') {
			teacherCache.invalidateRewards(currentClassId);
		}
	},
	5 * 60 * 1000
);
```

**Benefits** : Always fresh data, no manual refresh

---

### 4. Cache Versioning

Actuellement : No version tracking.

**Proposition** :

```typescript
const CACHE_VERSION = '1.0.0';

// Check version on load
if (cachedVersion !== CACHE_VERSION) {
	teacherCache.invalidateAll(); // Force refresh
}
```

**Benefits** : Safe cache invalidation on app updates

---

## 🔗 Related Documentation

- **Architecture** : [docs/architecture/teacher-cache.md](../architecture/teacher-cache.md)
- **Best Practices** : [docs/claude/best-practices.md](best-practices.md)
- **Performance** : [docs/architecture/performance.md](../architecture/performance.md)
- **Svelte 5 Runes** : [docs/claude/best-practices.md#svelte-5-runes](best-practices.md#svelte-5-runes)

---

**Last Updated** : 2025-10-31
