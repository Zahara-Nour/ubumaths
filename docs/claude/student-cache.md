# Student Dashboard Cache

Documentation technique du système de cache client-side pour le dashboard étudiant.

> **Date de création** : 2025-11-09

---

## 🎯 Quick Reference

**Import** : `import { studentCache } from '$lib/stores/studentDashboardCache.svelte';`

**Singleton** : Une seule instance partagée dans toute l'app (l'étudiant ne voit que ses propres données)

**Réactif** : Utilise `$state` de Svelte 5 pour réactivité automatique

### 3 Caches Distincts

| Cache       | Contenu                  | TTL   | Clé       | Usage                      |
| ----------- | ------------------------ | ----- | --------- | -------------------------- |
| **Cache 1** | Profile + Classes        | 2h    | Singleton | Info étudiant, memberships |
| **Cache 2** | Rewards (Gidouilles+VIP) | 10min | Singleton | Récompenses, optimistic UI |
| **Cache 3** | Warnings                 | 10min | periodId  | Avertissements par période |

**Architecture Difference**: Contrairement au `teacherCache` qui utilise des clés composites pour gérer plusieurs classes et étudiants, le `studentCache` utilise un pattern singleton car un étudiant ne voit que ses propres données.

---

## ⚡ Common Patterns

### Pattern 1: Hydration from Server Load Function (Recommended)

**TOUJOURS préférer l'hydration** plutôt que les API calls directs.

```typescript
// +layout.server.ts - Load function
export const load: LayoutServerLoad = async ({ locals }) => {
	const { user, profile, supabaseServer } = await locals.safeGetSession();

	// Fetch student profile + classes
	const { data: memberships } = await supabaseServer
		.from('class_members')
		.select(
			`
			class_id,
			joined_at,
			classes:class_id (
				id,
				name,
				is_active,
				teacher:teacher_id (id, full_name)
			)
		`
		)
		.eq('student_id', user.id);

	const studentProfile: StudentProfile = {
		id: profile.id,
		email: profile.email,
		// ... other fields
		classes: memberships.map((m) => ({
			class_id: m.class_id,
			class_name: m.classes.name
			// ... transform to ClassMembership
		}))
	};

	// Fetch rewards
	const { data: rewardsData } = await supabaseServer
		.from('profiles')
		.select('gidouilles, vip_cards')
		.eq('id', user.id)
		.single();

	return {
		studentProfile,
		rewards: {
			gidouilles: rewardsData.gidouilles || 0,
			vip_cards: rewardsData.vip_cards || {}
		}
	};
};

// +layout.svelte - Component
import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
import { onMount } from 'svelte';

let { data } = $props();

onMount(() => {
	// Hydrate cache with server data
	studentCache.hydrateProfile(data.studentProfile);
	studentCache.hydrateRewards(data.rewards);
});
```

**Pourquoi** : Réutilise les données déjà fetchées par le load function, évite API call redondant.

**Référence** : `src/routes/(protected)/dashboard/student/+layout.server.ts` (lines 19-137)

---

### Pattern 2: Auto-Fetch (Fallback)

Utilise si hydration impossible (pas de load function ou données expirées).

```typescript
// Auto-fetches if cache expired or missing
const profile = await studentCache.getProfile();
const rewards = await studentCache.getRewards();
const warnings = await studentCache.getWarnings(periodId);

// Uses existing API endpoints:
// - /api/student/profile
// - /api/student/rewards
// - /api/student/warnings/[periodId]
```

**Quand** : Pages sans load function, ou données expirées après TTL.

---

### Pattern 3: Reactive State with $derived

Utilise les getters synchrones pour créer des valeurs réactives.

```svelte
<script>
	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';

	// Reactive value that updates when cache changes
	let profile = $derived(studentCache.getProfileSync());
	let rewards = $derived(studentCache.getRewardsSync());

	// Handle cache miss
	$effect(() => {
		if (!profile) {
			studentCache.getProfile(); // Async fetch
		}
		if (!rewards) {
			studentCache.getRewards(); // Async fetch
		}
	});
</script>

{#if profile && rewards}
	<h1>Bienvenue, {profile.firstname} !</h1>
	<p>Gidouilles: {rewards.gidouilles}</p>
	<p>Classes: {profile.classes.length}</p>
{:else}
	<p>Chargement...</p>
{/if}
```

**Pourquoi** : `$derived` ne peut pas gérer async. Les getters sync permettent de créer des valeurs réactives qui se mettent à jour automatiquement quand le cache change.

---

### Pattern 4: Optimistic UI Updates (Rewards Only)

Pour les updates fréquentes (gidouilles, VIP cards), utilise optimistic updates pour instant UI feedback.

```typescript
// Example: Spending gidouilles on a VIP card
async function buyVipCard(cost: number) {
	// 1. Optimistic UI update (instant feedback)
	studentCache.updateGidouillesOptimistic(-cost);

	try {
		// 2. Server API call
		const response = await fetch('/api/student/buy-vip-card', {
			method: 'POST',
			body: JSON.stringify({ cost })
		});

		if (!response.ok) throw new Error('Purchase failed');

		// 3. Invalidate & refetch to sync with server truth
		studentCache.invalidateRewards();
		await studentCache.getRewards();

		toaster.success('Carte VIP achetée !');
	} catch (error) {
		// Rollback on error - refetch from server
		studentCache.invalidateRewards();
		await studentCache.getRewards();
		toaster.error("Échec de l'achat");
	}
}
```

**Benefits:**

- Instant UI feedback (no waiting for server)
- Automatic rollback on error
- Simple invalidate + refetch pattern for sync

**Note**: Optimistic updates are only supported for rewards (gidouilles + VIP cards), not for profile or warnings.

---

### Pattern 5: Period-Specific Warnings Cache

Warnings use a Map-based cache keyed by academic period ID.

```typescript
// Load warnings for current period
const currentPeriodId = '2024-fall-uuid';
const warnings = await studentCache.getWarnings(currentPeriodId);

console.log(warnings.counts); // { C: 2, M: 1, R: 0, T: 0 }
console.log(warnings.warnings); // Array of Warning objects

// Load warnings for different period
const pastPeriodId = '2024-spring-uuid';
const pastWarnings = await studentCache.getWarnings(pastPeriodId);

// Both periods are now cached independently
// Internal keys: Map("2024-fall-uuid" => {...}, "2024-spring-uuid" => {...})
```

**Pourquoi** : Permet de cacher les avertissements de plusieurs périodes simultanément, utile pour consulter l'historique.

---

## 📚 API Methods

### Async Getters (Auto-Fetch)

#### `getProfile(): Promise<StudentProfile>`

Récupère le profil étudiant avec les memberships de classes.

```typescript
const profile = await studentCache.getProfile();

// Returns:
{
	id: string,
	email: string,
	firstname: string,
	lastname: string | null,
	full_name: string | null,
	avatar_url: string | null,
	gender: string | null,
	grade: string | null,
	is_test: boolean,
	school_id: string | null,
	classes: [
		{
			class_id: string,
			class_name: string,
			teacher_name: string,
			teacher_id: string,
			joined_at: string,
			is_active: boolean
		},
		// ...
	]
}
```

**TTL** : 2 heures
**API Endpoint** : `/api/student/profile`
**Console Log** : `[Cache] Cache HIT/MISS: Student profile`

---

#### `getRewards(): Promise<StudentRewards>`

Récupère les récompenses (gidouilles + VIP cards).

```typescript
const rewards = await studentCache.getRewards();

// Returns:
{
	gidouilles: 150,
	vip_cards: {
		"instance-uuid-1": {
			cardId: "bonus",
			earnedAt: "2024-11-01T10:00:00Z",
			usedAt: null
		},
		"instance-uuid-2": {
			cardId: "joker",
			earnedAt: "2024-11-05T14:30:00Z",
			usedAt: "2024-11-06T09:00:00Z"
		}
	}
}
```

**TTL** : 10 minutes
**API Endpoint** : `/api/student/rewards`
**Console Log** : `[Cache] Cache HIT/MISS: Student rewards`

---

#### `getWarnings(periodId: string): Promise<StudentWarnings>`

Récupère les avertissements pour une période académique spécifique.

```typescript
const warnings = await studentCache.getWarnings(periodId);

// Returns:
{
	counts: {
		C: 2,  // Conduite
		M: 1,  // Matériel
		R: 0,  // Retard
		T: 0   // Travail
	},
	warnings: [
		{
			id: "warning-uuid",
			student_id: "student-uuid",
			class_id: "class-uuid",
			academic_period_id: "period-uuid",
			warning_type: "C",
			created_by: "teacher-uuid",
			created_at: "2024-11-01T10:00:00Z",
			updated_at: "2024-11-01T10:00:00Z"
		},
		// ...
	]
}
```

**TTL** : 10 minutes
**API Endpoint** : `/api/student/warnings/[periodId]`
**Console Log** : `[Cache] Cache HIT/MISS: Student warnings for period {periodId}`
**Composite Key** : Internal Map key is `periodId`

**Note**: Currently students cannot view their own warnings in the UI. This endpoint structure is ready for when/if this feature is added.

---

### Sync Getters (for $derived)

Utilisés dans `$derived` pour éviter async/await.

#### `getProfileSync(): StudentProfile | null`

Version synchrone de `getProfile()`.

```typescript
let profile = $derived(studentCache.getProfileSync());

if (profile) {
	// Use cached data
	console.log(profile.firstname);
} else {
	// Cache miss or expired - fetch async
	await studentCache.getProfile();
}
```

**Returns** : `null` si cache expiré ou manquant.

---

#### `getRewardsSync(): StudentRewards | null`

Version synchrone de `getRewards()`.

```typescript
let rewards = $derived(studentCache.getRewardsSync());

if (rewards) {
	console.log(rewards.gidouilles);
}
```

**Returns** : `null` si cache expiré ou manquant.

---

#### `getWarningsSync(periodId: string): StudentWarnings | null`

Version synchrone de `getWarnings()`.

```typescript
let warnings = $derived(studentCache.getWarningsSync(currentPeriodId));

if (warnings) {
	console.log(warnings.counts);
}
```

**Returns** : `null` si cache expiré ou manquant.

---

### Optimistic Update Methods

#### `updateGidouillesOptimistic(delta: number): void`

Update gidouilles optimiste (instant UI feedback).

```typescript
// Add 5 gidouilles instantly
studentCache.updateGidouillesOptimistic(+5);

// Remove 10 gidouilles instantly (enforces min 0)
studentCache.updateGidouillesOptimistic(-10);
```

**Minimum** : 0 (ne peut pas être négatif)
**Console Log** : `[Cache] Optimistic gidouilles update: {current} → {new} ({delta})`

**IMPORTANT**: Call this BEFORE making the API request for instant UI update. After API succeeds, call `invalidateRewards()` + `getRewards()` to sync.

---

#### `updateVipCardsOptimistic(vipCards: StudentVipCards): void`

Update VIP cards optimiste.

```typescript
const newCards = {
	'instance-uuid-1': { cardId: 'bonus', earnedAt: '...', usedAt: null },
	'instance-uuid-2': { cardId: 'joker', earnedAt: '...', usedAt: null }
};
studentCache.updateVipCardsOptimistic(newCards);
```

**Console Log** : `[Cache] Optimistic VIP cards update`

---

#### `updateWarningsOptimistic(periodId: string, counts: StudentWarningCounts): void`

Update avertissements optimiste.

```typescript
const newCounts = { C: 3, M: 1, R: 0, T: 0 };
studentCache.updateWarningsOptimistic(periodId, newCounts);
```

**Console Log** : `[Cache] Optimistic warnings update for period {periodId}: total {total}`

---

### Hydration Methods

**Préférer hydration** plutôt que auto-fetch (évite API calls redondants).

#### `hydrateProfile(profile: StudentProfile): void`

Pré-remplit le cache de profil avec données du load function.

```typescript
// +layout.svelte
onMount(() => {
	studentCache.hydrateProfile(data.studentProfile);
});
```

**Console Log** : `[Cache] Hydrated profile cache`

---

#### `hydrateRewards(rewards: StudentRewards): void`

Pré-remplit le cache de récompenses.

```typescript
onMount(() => {
	studentCache.hydrateRewards(data.rewards);
});
```

**Console Log** : `[Cache] Hydrated rewards cache`

---

#### `hydrateWarnings(periodId: string, warnings: StudentWarnings): void`

Pré-remplit le cache d'avertissements pour une période spécifique.

```typescript
onMount(() => {
	if (data.warnings) {
		studentCache.hydrateWarnings(currentPeriodId, data.warnings);
	}
});
```

**Console Log** : `[Cache] Hydrated warnings cache for period {periodId}`

---

### Invalidation Methods

**Quand invalider** : Après mutation (profile change, reward update, warning change).

#### `invalidateProfile(): void`

Invalide le cache de profil.

```typescript
// After profile update (name, avatar, etc.)
studentCache.invalidateProfile();
```

**Triggers** : Profile changes, class enrollment changes

---

#### `invalidateRewards(): void`

Invalide le cache de récompenses.

```typescript
// After gidouilles or VIP card update
studentCache.invalidateRewards();
```

**Triggers** : Gidouilles add/remove, VIP card earned/used

---

#### `invalidateWarnings(periodId: string): void`

Invalide le cache d'avertissements pour une période spécifique.

```typescript
// After warning added/removed for this period
studentCache.invalidateWarnings(periodId);
```

**Triggers** : Warning add/remove

---

#### `invalidateAllWarnings(): void`

Invalide le cache d'avertissements pour **toutes** les périodes.

```typescript
// After period structure changed
studentCache.invalidateAllWarnings();
```

**Console Log** : `[Cache] Cache invalidated: all warnings`

---

#### `invalidateAll(): void`

Invalide **tous** les caches (reset complet).

```typescript
// Use sparingly - only for logout or critical data refresh
studentCache.invalidateAll();
```

**⚠️ Use Cases** : Logout, role change, critical data corruption

**Console Log** : `[Cache] Cache: All caches cleared`

---

### Statistics Methods

#### `getCacheStats(): CacheStats`

Récupère statistiques du cache.

```typescript
const stats = studentCache.getCacheStats();

console.log(stats);
// {
//   profile: true,
//   rewards: true,
//   warnings: 2,  // 2 periods cached
//   totalEntries: 4,
//   memoryEstimate: '5.2 KB'
// }
```

**Returns** :

```typescript
{
	profile: boolean; // Cache 1 populated
	rewards: boolean; // Cache 2 populated
	warnings: number; // Cache 3 entries (periods)
	totalEntries: number; // Sum of all
	memoryEstimate: string; // Approximate size
}
```

---

#### `printCacheStats(): void`

Affiche statistiques dans console (formatted table).

```typescript
studentCache.printCacheStats();
// ┌─────────────────────────────────────┐
// │   Student Dashboard Cache Stats    │
// ├─────────────────────────────────────┤
// │ Profile:    ✓ cached                │
// │ Rewards:    ✓ cached                │
// │ Warnings:   2         periods       │
// │ Total:      4         entries       │
// │ Memory:     5.2 KB                  │
// └─────────────────────────────────────┘
```

**Use Case** : Debugging, monitoring cache growth

**Note**: Only works if monitoring is enabled (`VITE_ENABLE_CACHE_MONITORING=true`)

---

## 🔧 Integration Guide

### Step 1: Add Hydration in +layout.server.ts

```typescript
// src/routes/(protected)/dashboard/student/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import type { StudentProfile, StudentRewards } from '$lib/types/student-cache';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user, profile, supabaseServer } = await locals.safeGetSession();

	// Must be logged in as student
	if (!user || !profile || profile.role !== 'student') {
		throw error(403, 'Access denied');
	}

	// Fetch profile + classes
	const studentProfile: StudentProfile = {
		/* ... */
	};

	// Fetch rewards
	const rewards: StudentRewards = {
		/* ... */
	};

	return { studentProfile, rewards };
};
```

---

### Step 2: Add Hydration in +layout.svelte

```svelte
<!-- src/routes/(protected)/dashboard/student/+layout.svelte -->
<script lang="ts">
	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	import { onMount } from 'svelte';

	let { data, children } = $props();

	onMount(() => {
		// Hydrate caches with server data
		studentCache.hydrateProfile(data.studentProfile);
		studentCache.hydrateRewards(data.rewards);
	});
</script>

{@render children()}
```

---

### Step 3: Use Cache in Child Pages

```svelte
<!-- src/routes/(protected)/dashboard/student/+page.svelte -->
<script lang="ts">
	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';

	// Reactive values from cache
	let profile = $derived(studentCache.getProfileSync());
	let rewards = $derived(studentCache.getRewardsSync());

	// Handle cache miss (shouldn't happen if hydrated in layout)
	$effect(() => {
		if (!profile) studentCache.getProfile();
		if (!rewards) studentCache.getRewards();
	});
</script>

{#if profile && rewards}
	<h1>Bienvenue, {profile.firstname} !</h1>
	<p>Gidouilles: {rewards.gidouilles}</p>
	<p>Classes: {profile.classes.length}</p>

	{#each profile.classes as classItem}
		<div>
			<h2>{classItem.class_name}</h2>
			<p>Professeur: {classItem.teacher_name}</p>
		</div>
	{/each}
{:else}
	<p>Chargement...</p>
{/if}
```

---

### Step 4: Optimistic Updates (Optional)

```typescript
// Example: Buying a VIP card with gidouilles
let isPurchasing = $state(false);

async function buyVipCard(cardId: string, cost: number) {
	if (isPurchasing) return;
	isPurchasing = true;

	// 1. Optimistic update (instant UI feedback)
	studentCache.updateGidouillesOptimistic(-cost);

	try {
		// 2. Server API call
		const response = await fetch('/api/student/buy-vip-card', {
			method: 'POST',
			body: JSON.stringify({ cardId, cost })
		});

		if (!response.ok) throw new Error('Purchase failed');

		const result = await response.json();

		// 3. Update VIP cards cache with new card
		const currentRewards = studentCache.getRewardsSync();
		if (currentRewards) {
			const newVipCards = {
				...currentRewards.vip_cards,
				[result.instanceId]: {
					cardId: result.cardId,
					earnedAt: result.earnedAt,
					usedAt: null
				}
			};
			studentCache.updateVipCardsOptimistic(newVipCards);
		}

		toaster.success('Carte VIP achetée !');
	} catch (error) {
		// Rollback on error
		studentCache.invalidateRewards();
		await studentCache.getRewards();
		toaster.error("Échec de l'achat");
	} finally {
		isPurchasing = false;
	}
}
```

---

## ⚠️ Edge Cases & Pitfalls

### Edge Case 1: Cache Miss on Direct Navigation

**Problem** : User lands directly on a student page via URL (bypassing +layout.svelte).

**Solution** : Auto-fetch fallback in cache getters.

```typescript
$effect(() => {
	// Try sync getter first
	let profile = studentCache.getProfileSync();

	if (!profile) {
		// Cache miss - fetch from API
		studentCache.getProfile();
	}
});
```

**Référence** : Cache automatically calls API if data missing/expired.

---

### Edge Case 2: TTL Expiration Mid-Session

**Problem** : User stays on page for >10 minutes, rewards cache expires.

**Solution** : Auto-refetch on next access.

```typescript
// Rewards cache has 10min TTL
const rewards = await studentCache.getRewards();

// If cached and fresh → returns cached (instant)
// If expired or missing → fetches from API (~100-200ms)
```

**User Experience** : Transparent - no visible loading state on refetch.

---

### Edge Case 3: Multiple Period Warnings

**Problem** : Switching between academic periods.

**Solution** : Map-based cache handles this automatically.

```typescript
// Load Fall 2024 warnings
const fall2024 = await studentCache.getWarnings('fall-2024-uuid');

// Switch to Spring 2025 warnings
const spring2025 = await studentCache.getWarnings('spring-2025-uuid');

// Both are now cached independently
// No re-fetch when switching back to Fall 2024
```

---

### Edge Case 4: Optimistic Update Rollback

**Problem** : Server update fails, UI shows wrong value.

**Solution** : Always invalidate + refetch on error.

```typescript
try {
	// Optimistic update
	studentCache.updateGidouillesOptimistic(-50);

	// Server update
	await updateServer(-50);
} catch (error) {
	// ROLLBACK: Invalidate cache and refetch server truth
	studentCache.invalidateRewards();
	await studentCache.getRewards();

	toaster.error('Échec de la mise à jour');
}
```

---

## 📊 Performance Impact

**Expected Improvements** (based on implementation):

| Metric                      | Without Cache | With Cache (Hydrated) | Improvement        |
| --------------------------- | ------------- | --------------------- | ------------------ |
| Student dashboard page load | 3 API calls   | 0 API calls           | **100% reduction** |
| Navigation between pages    | 200ms (fetch) | <1ms (cache hit)      | **99.5% faster**   |
| VIP card purchase           | Laggy UI      | Instant feedback      | **Instant**        |
| Memory usage                | 0KB           | ~5-10KB               | +5-10KB            |

**Real-World Usage** :

- Student dashboard: ~5-10KB total cache
- Instant page loads after hydration
- 0 API calls during normal navigation

---

## 🚀 Future Improvements

### 1. Persistent Cache (localStorage)

Actuellement : Cache perdu au refresh page.

**Proposition** :

```typescript
// Save to localStorage on update
localStorage.setItem(
	'studentCache',
	JSON.stringify({
		profile: profileCache,
		rewards: rewardsCache,
		warnings: Array.from(warningsCache.entries())
	})
);

// Restore on init
const saved = localStorage.getItem('studentCache');
if (saved) {
	const data = JSON.parse(saved);
	studentCache.hydrateProfile(data.profile.profile);
	studentCache.hydrateRewards(data.rewards.rewards);
	// ... restore warnings
}
```

**Risks** : Stale data, storage quota, sync issues

---

### 2. Background Refresh

Actuellement : Manual invalidation required.

**Proposition** :

```typescript
// Refresh rewards every 5 minutes while page visible
setInterval(
	() => {
		if (document.visibilityState === 'visible') {
			studentCache.invalidateRewards();
			studentCache.getRewards(); // Silent refetch
		}
	},
	5 * 60 * 1000
);
```

**Benefits** : Always fresh data, no manual refresh

---

### 3. Cache Versioning

Actuellement : No version tracking.

**Proposition** :

```typescript
const CACHE_VERSION = '1.0.0';

// Check version on load
const cachedVersion = localStorage.getItem('studentCacheVersion');
if (cachedVersion !== CACHE_VERSION) {
	studentCache.invalidateAll(); // Force refresh
	localStorage.setItem('studentCacheVersion', CACHE_VERSION);
}
```

**Benefits** : Safe cache invalidation on app updates

---

## 🔗 Related Documentation

- **Teacher Cache** : [docs/claude/teacher-cache.md](teacher-cache.md) - Similar patterns, keyed approach
- **Architecture** : [docs/claude/architecture.md](architecture.md) - Data fetching strategy
- **Best Practices** : [docs/claude/best-practices.md](best-practices.md) - Svelte 5, TypeScript
- **Svelte 5 Runes** : [docs/claude/best-practices.md#svelte-5-runes](best-practices.md#svelte-5-runes)

---

**Last Updated** : 2025-11-09
**Status** : ✅ Production Ready
