# Caching System Improvements

Comprehensive analysis and recommendations for improving the UbuMaths caching system across architecture, security, performance, UX, and features.

**Last Updated**: 2025-12-23

---

## Executive Summary

The current caching system is well-designed for its purpose but has several areas for improvement:

| Category     | Current State            | Priority Issues                             |
| ------------ | ------------------------ | ------------------------------------------- |
| Architecture | Good multi-layer design  | Cache fragmentation, no unified abstraction |
| Security     | Basic protections        | No encryption, timing attacks possible      |
| Performance  | Effective TTL caching    | No precaching, suboptimal eviction          |
| UX           | Optimistic UI works well | No offline support, stale data indicators   |
| Features     | Core caching complete    | No persistence, limited prefetching         |

---

## Table of Contents

1. [Architecture Improvements](#architecture-improvements)
2. [Security Improvements](#security-improvements)
3. [Performance Improvements](#performance-improvements)
4. [UX Improvements](#ux-improvements)
5. [Feature Improvements](#feature-improvements)
6. [Implementation Roadmap](#implementation-roadmap)

---

## Architecture Improvements

### 1. Unified Cache Interface

**Current State**: Multiple independent cache implementations with different APIs.

**Problem**: Inconsistent patterns, code duplication, maintenance burden.

**Recommendation**: Create a unified cache abstraction layer.

```typescript
// Proposed unified interface
interface CacheProvider<K, V> {
	get(key: K): V | null;
	getAsync(key: K): Promise<V>;
	set(key: K, value: V, options?: CacheOptions): void;
	has(key: K): boolean;
	invalidate(key: K): void;
	invalidatePattern(pattern: string): void;
	getStats(): CacheStats;
}

interface CacheOptions {
	ttl?: number; // Override default TTL
	priority?: 'low' | 'normal' | 'high'; // Eviction priority
	persist?: boolean; // Survive page reload
}

// Usage
const cache = createCache<string, StudentRewards>({
	name: 'rewards',
	ttl: 10 * 60 * 1000,
	maxSize: 100,
	storage: 'memory', // or 'localStorage', 'indexedDB'
	onEvict: (key, value) => console.log(`Evicted: ${key}`)
});
```

**Benefits**:

- Consistent API across all caches
- Easier testing and mocking
- Centralized monitoring
- Simpler migration to different storage backends

**Effort**: Medium (2-3 days)

---

### 2. Cache Hierarchy

**Current State**: Flat cache structure with no relationship between caches.

**Problem**: Related data can become inconsistent; invalidation is manual.

**Recommendation**: Implement cache dependencies and cascading invalidation.

```typescript
// Proposed dependency system
const cacheRegistry = new CacheRegistry();

cacheRegistry.register('students', {
	dependsOn: [],
	invalidates: ['rewards', 'warnings'] // Cascade invalidation
});

cacheRegistry.register('rewards', {
	dependsOn: ['students'],
	invalidates: []
});

// When students cache is invalidated, rewards and warnings are too
cacheRegistry.invalidate('students', classId);
```

**Benefits**:

- Automatic consistency between related caches
- Reduced manual invalidation code
- Clearer data dependencies

**Effort**: Medium (2-3 days)

---

### 3. Cache Versioning

**Current State**: No version tracking for cached data.

**Problem**: Schema changes can cause stale/incompatible cached data.

**Recommendation**: Add version metadata to cache entries.

```typescript
interface VersionedCacheEntry<T> {
	data: T;
	version: string; // e.g., "2.1.0"
	schema: number; // e.g., 3
	cachedAt: number;
}

function getCached<T>(key: string, currentVersion: string): T | null {
	const entry = cache.get(key);
	if (!entry) return null;

	// Invalidate if version mismatch
	if (entry.version !== currentVersion) {
		cache.delete(key);
		return null;
	}

	return entry.data;
}
```

**Benefits**:

- Safe deployments with data structure changes
- Automatic cache invalidation on version updates
- Clear migration path

**Effort**: Low (1 day)

---

### 4. Separate Read/Write Concerns

**Current State**: Cache stores mix reading, writing, and fetching logic.

**Problem**: Tight coupling, harder to test, difficult to extend.

**Recommendation**: Implement Repository pattern with cache decorator.

```typescript
// Repository interface (data source agnostic)
interface StudentRewardsRepository {
	getByClass(classId: string): Promise<Map<string, StudentRewards>>;
	update(studentId: string, delta: number): Promise<void>;
}

// Cached implementation
class CachedStudentRewardsRepository implements StudentRewardsRepository {
	constructor(
		private inner: StudentRewardsRepository,
		private cache: CacheProvider<string, Map<string, StudentRewards>>
	) {}

	async getByClass(classId: string) {
		const cached = this.cache.get(classId);
		if (cached) return cached;

		const data = await this.inner.getByClass(classId);
		this.cache.set(classId, data);
		return data;
	}
}
```

**Benefits**:

- Clear separation of concerns
- Easy to test without caching
- Swappable caching strategies

**Effort**: High (5-7 days, significant refactor)

---

## Security Improvements

### 1. Sensitive Data Encryption

**Current State**: Cached data stored in plain text in memory.

**Problem**: Memory dumps or browser extensions could access student data.

**Recommendation**: Encrypt sensitive cached data.

```typescript
import { encrypt, decrypt } from '$lib/utils/crypto';

class EncryptedCache<K, V> implements CacheProvider<K, V> {
	private encryptionKey: CryptoKey;

	async set(key: K, value: V) {
		const encrypted = await encrypt(JSON.stringify(value), this.encryptionKey);
		this.innerCache.set(key, encrypted);
	}

	async get(key: K): Promise<V | null> {
		const encrypted = this.innerCache.get(key);
		if (!encrypted) return null;

		const decrypted = await decrypt(encrypted, this.encryptionKey);
		return JSON.parse(decrypted);
	}
}
```

**Data Classification**:
| Data Type | Sensitivity | Encryption Needed |
|-----------|-------------|-------------------|
| Student names | Medium | Consider |
| Gidouilles counts | Low | No |
| VIP cards | Low | No |
| Warning details | High | Yes |
| Auth tokens | Critical | Yes (already done) |

**Benefits**:

- Protection against memory inspection
- Compliance with data protection regulations
- Defense in depth

**Effort**: Medium (2-3 days)

---

### 2. Cache Timing Attack Mitigation

**Current State**: Cache hits are measurably faster than cache misses.

**Problem**: Timing differences could leak information about cached content.

**Recommendation**: Add constant-time padding for security-sensitive operations.

```typescript
async function getCachedWithPadding<T>(key: string): Promise<T | null> {
	const startTime = performance.now();
	const result = cache.get(key);

	// Ensure minimum response time (e.g., 10ms)
	const elapsed = performance.now() - startTime;
	const minTime = 10;
	if (elapsed < minTime) {
		await new Promise((r) => setTimeout(r, minTime - elapsed));
	}

	return result;
}
```

**Note**: This is a low-priority improvement; the attack surface is minimal in this context.

**Effort**: Low (0.5 days)

---

### 3. Cache Poisoning Prevention

**Current State**: Cache entries accepted without validation.

**Problem**: Malicious data injection could corrupt cache state.

**Recommendation**: Validate data before caching.

```typescript
import { z } from 'zod';

const StudentRewardsSchema = z.object({
	gidouilles: z.number().int().min(0).max(10000),
	bonus: z.number().int().min(0).max(1000),
	vip_cards: z.record(
		z.string().uuid(),
		z.object({
			cardId: z.string(),
			earnedAt: z.string().datetime(),
			usedAt: z.string().datetime().nullable()
		})
	)
});

function setCachedRewards(key: string, data: unknown) {
	const validated = StudentRewardsSchema.parse(data);
	cache.set(key, validated);
}
```

**Benefits**:

- Prevents invalid data from entering cache
- Consistent with existing Zod validation patterns
- Early detection of API response issues

**Effort**: Medium (1-2 days)

---

### 4. Rate Limit Cache Bypass Protection

**Current State**: Rate limiting uses database; no local caching.

**Problem**: Potential for cache-based bypass attacks.

**Recommendation**: Add local rate limit enforcement as first layer.

```typescript
// Local rate limit cache (before DB check)
const localRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkLocalRateLimit(key: string, limit: number, windowMs: number): boolean {
	const now = Date.now();
	const entry = localRateLimits.get(key);

	if (!entry || now > entry.resetAt) {
		localRateLimits.set(key, { count: 1, resetAt: now + windowMs });
		return true;
	}

	if (entry.count >= limit) {
		return false; // Rate limited locally
	}

	entry.count++;
	return true;
}
```

**Benefits**:

- Reduces database load for repeated attacks
- Faster rejection of obvious abuse
- Defense in depth

**Effort**: Low (1 day)

---

## Performance Improvements

### 1. Prefetching Strategy

**Current State**: Cache populated on-demand only.

**Problem**: First access is always slow (cache miss).

**Recommendation**: Implement intelligent prefetching.

```typescript
// Prefetch on hover/focus
function setupPrefetching() {
	document.addEventListener('mouseover', (e) => {
		const link = e.target.closest('[data-prefetch]');
		if (link) {
			const classId = link.dataset.prefetch;
			// Prefetch in background
			teacherCache.getStudentRewards(classId);
		}
	});
}

// Prefetch adjacent data
function prefetchRelated(classId: string) {
	// User is viewing class X, prefetch X+1 and X-1
	const classes = teacherCache.getAllClassesSync();
	const currentIndex = classes.findIndex((c) => c.id === classId);

	if (currentIndex > 0) {
		teacherCache.getStudentRewards(classes[currentIndex - 1].id);
	}
	if (currentIndex < classes.length - 1) {
		teacherCache.getStudentRewards(classes[currentIndex + 1].id);
	}
}
```

**Benefits**:

- Instant tab switching
- Better perceived performance
- Utilizes idle network time

**Effort**: Low (1 day)

---

### 2. Service Worker Precaching

**Current State**: CDN resources cached lazily on first use.

**Problem**: First visit requires full download of large resources.

**Recommendation**: Precache critical resources during SW install.

```javascript
// service-worker.js
const PRECACHE_URLS = [
	'https://cdn.jsdelivr.net/npm/pyodide@0.24.1/pyodide.mjs',
	'https://cdn.plot.ly/plotly-2.27.0.min.js'
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(PRECACHE_URLS);
		})
	);
});
```

**Trade-off**: Increases initial install time but improves subsequent experience.

**Benefits**:

- Faster first-use experience
- Predictable resource availability
- Better offline support

**Effort**: Low (0.5 days)

---

### 3. Smarter LRU Eviction

**Current State**: Simple LRU eviction based on access order.

**Problem**: Small, frequently-accessed items evicted same as large, rare items.

**Recommendation**: Implement weighted LRU considering size and frequency.

```typescript
interface WeightedCacheEntry<T> {
	data: T;
	size: number; // Bytes
	accessCount: number;
	lastAccess: number;
}

function calculateEvictionScore(entry: WeightedCacheEntry<unknown>): number {
	const age = Date.now() - entry.lastAccess;
	const frequency = entry.accessCount;
	const size = entry.size;

	// Higher score = more likely to evict
	// Prefer to evict: old, infrequently accessed, large items
	return (age / 1000) * (1 / (frequency + 1)) * Math.log(size + 1);
}

function evictLowestValue() {
	let maxScore = -Infinity;
	let toEvict = null;

	for (const [key, entry] of cache) {
		const score = calculateEvictionScore(entry);
		if (score > maxScore) {
			maxScore = score;
			toEvict = key;
		}
	}

	if (toEvict) cache.delete(toEvict);
}
```

**Benefits**:

- Better memory efficiency
- Keeps valuable entries longer
- Reduces cache misses

**Effort**: Medium (1-2 days)

---

### 4. Compression for Large Entries

**Current State**: Data stored uncompressed.

**Problem**: Large ASTs and compiled documents consume significant memory.

**Recommendation**: Compress large cache entries.

```typescript
import { compress, decompress } from 'lz-string';

const SIZE_THRESHOLD = 10 * 1024; // 10KB

function setWithCompression(key: string, value: unknown) {
	const json = JSON.stringify(value);

	if (json.length > SIZE_THRESHOLD) {
		const compressed = compress(json);
		cache.set(key, { compressed: true, data: compressed });
	} else {
		cache.set(key, { compressed: false, data: json });
	}
}

function getWithDecompression(key: string): unknown {
	const entry = cache.get(key);
	if (!entry) return null;

	const json = entry.compressed ? decompress(entry.data) : entry.data;

	return JSON.parse(json);
}
```

**Benefits**:

- Reduced memory footprint (50-80% for JSON)
- More entries can fit in memory
- Minimal CPU overhead with modern compression

**Effort**: Low (1 day)

---

### 5. Background Cache Refresh

**Current State**: Cache refreshed only on explicit access after TTL expiration.

**Problem**: First access after expiration is slow.

**Recommendation**: Proactively refresh expiring entries in background.

```typescript
function startBackgroundRefresh() {
	setInterval(() => {
		if (document.visibilityState !== 'visible') return;

		const now = Date.now();
		const refreshThreshold = 60 * 1000; // 1 minute before expiration

		for (const [key, entry] of rewardsCache) {
			const timeUntilExpiry = entry.fetchedAt + REWARDS_TTL - now;

			if (timeUntilExpiry < refreshThreshold && timeUntilExpiry > 0) {
				// Refresh in background
				fetchStudentRewards(key).then((data) => {
					rewardsCache.set(key, { rewards: data, fetchedAt: Date.now() });
				});
			}
		}
	}, 30 * 1000); // Check every 30 seconds
}
```

**Benefits**:

- Always-fresh data on access
- No visible loading states
- Improved perceived performance

**Effort**: Medium (1-2 days)

---

## UX Improvements

### 1. Stale Data Indicators

**Current State**: Users cannot tell if data is cached or fresh.

**Problem**: Confusion when data seems outdated.

**Recommendation**: Add visual indicators for cache age.

```svelte
<script lang="ts">
	let cacheAge = $derived(() => {
		const cached = teacherCache.getRewardsSync(classId);
		if (!cached) return null;

		const ageMs = Date.now() - cached.fetchedAt;
		const ageMinutes = Math.floor(ageMs / 60000);

		return {
			minutes: ageMinutes,
			isStale: ageMinutes > 5,
			isFresh: ageMinutes < 1
		};
	});
</script>

{#if cacheAge?.isStale}
	<span class="text-xs text-muted-foreground">
		Mis à jour il y a {cacheAge.minutes} min
		<button onclick={refresh}>Actualiser</button>
	</span>
{/if}
```

**Benefits**:

- User understands data freshness
- Reduces confusion about outdated information
- Empowers manual refresh when needed

**Effort**: Low (0.5 days)

---

### 2. Offline Support

**Current State**: App non-functional without network.

**Problem**: Poor experience on unreliable connections.

**Recommendation**: Implement offline-first with Service Worker.

```javascript
// Service Worker: Cache app shell
const APP_SHELL = [
	'/',
	'/dashboard',
	'/manifest.json',
	'/_app/immutable/...' // Static assets
];

// Serve cached pages when offline
self.addEventListener('fetch', (event) => {
	if (event.request.mode === 'navigate') {
		event.respondWith(
			fetch(event.request).catch(() => {
				return caches.match('/offline.html');
			})
		);
	}
});
```

**Progressive Enhancement**:

1. **Phase 1**: Show cached data when offline
2. **Phase 2**: Queue mutations for sync when online
3. **Phase 3**: Full offline functionality

**Benefits**:

- Works on poor connections
- Better mobile experience
- Resilient to network issues

**Effort**: High (3-5 days for Phase 1)

---

### 3. Optimistic UI Rollback Animations

**Current State**: Silent rollback on optimistic update failure.

**Problem**: Users don't notice when their action failed.

**Recommendation**: Animate rollback with error indication.

```typescript
async function updateWithRollbackAnimation(studentId: string, delta: number) {
	const element = document.querySelector(`[data-student="${studentId}"]`);

	// Apply optimistic update
	teacherCache.updateGidouillesOptimistic(classId, studentId, delta);
	element?.classList.add('updating');

	try {
		await syncToServer(studentId, delta);
		element?.classList.remove('updating');
		element?.classList.add('success');
	} catch {
		// Rollback with animation
		rollbackGidouilles(studentId, delta);
		element?.classList.remove('updating');
		element?.classList.add('error', 'shake');

		toaster.error('La modification a échoué');

		setTimeout(() => {
			element?.classList.remove('error', 'shake');
		}, 500);
	}
}
```

**CSS**:

```css
.shake {
	animation: shake 0.5s ease-in-out;
}

@keyframes shake {
	0%,
	100% {
		transform: translateX(0);
	}
	25% {
		transform: translateX(-5px);
	}
	75% {
		transform: translateX(5px);
	}
}
```

**Benefits**:

- Clear feedback on failure
- User understands action didn't persist
- Professional feel

**Effort**: Low (0.5 days)

---

### 4. Loading State Skeleton

**Current State**: Generic loading spinners or empty states.

**Problem**: Layout shift when data loads.

**Recommendation**: Show skeleton UI matching final layout.

```svelte
{#if isLoading}
	<div class="space-y-2">
		{#each { length: 5 } as _}
			<div class="flex items-center gap-4 rounded border p-4">
				<Skeleton class="h-10 w-10 rounded-full" />
				<div class="flex-1 space-y-2">
					<Skeleton class="h-4 w-32" />
					<Skeleton class="h-3 w-48" />
				</div>
				<Skeleton class="h-8 w-16" />
			</div>
		{/each}
	</div>
{:else}
	<!-- Actual content -->
{/if}
```

**Benefits**:

- No layout shift
- Better perceived performance
- Professional appearance

**Effort**: Low (1 day, per component)

---

## Feature Improvements

### 1. Persistent Cache with IndexedDB

**Current State**: Cache cleared on page reload.

**Problem**: Slow initial load on every visit.

**Recommendation**: Persist cache to IndexedDB.

```typescript
import { openDB } from 'idb';

const db = await openDB('ubumaths-cache', 1, {
	upgrade(db) {
		db.createObjectStore('rewards');
		db.createObjectStore('students');
		db.createObjectStore('classes');
	}
});

async function persistCache(storeName: string, key: string, value: unknown) {
	await db.put(storeName, { data: value, cachedAt: Date.now() }, key);
}

async function loadFromPersistence(storeName: string, key: string) {
	const entry = await db.get(storeName, key);
	if (!entry) return null;

	// Check if still valid
	if (Date.now() - entry.cachedAt > TTL) {
		await db.delete(storeName, key);
		return null;
	}

	return entry.data;
}
```

**Startup Flow**:

```
App Start → Load from IndexedDB → Hydrate memory cache → Validate with server
```

**Benefits**:

- Instant app startup
- Works offline
- Reduced server load

**Effort**: Medium (2-3 days)

---

### 2. Cross-Tab Synchronization

**Current State**: Each tab maintains independent cache.

**Problem**: Updates in one tab not reflected in others.

**Recommendation**: Use BroadcastChannel for cross-tab sync.

```typescript
const channel = new BroadcastChannel('ubumaths-cache-sync');

// Broadcast cache updates
function broadcastUpdate(type: string, key: string, value: unknown) {
	channel.postMessage({ type, key, value, timestamp: Date.now() });
}

// Listen for updates from other tabs
channel.addEventListener('message', (event) => {
	const { type, key, value } = event.data;

	switch (type) {
		case 'rewards-update':
			teacherCache.hydrateRewards(key, value);
			break;
		case 'invalidate':
			teacherCache.invalidate(key);
			break;
	}
});
```

**Benefits**:

- Consistent state across tabs
- Better multi-window experience
- Reduced redundant fetches

**Effort**: Medium (1-2 days)

---

### 3. Cache Analytics Dashboard

**Current State**: No visibility into cache performance.

**Problem**: Cannot identify optimization opportunities.

**Recommendation**: Add admin cache analytics.

```typescript
interface CacheAnalytics {
	totalHits: number;
	totalMisses: number;
	hitRate: number;
	avgResponseTime: number;
	memoryUsage: number;
	byCache: Record<
		string,
		{
			hits: number;
			misses: number;
			size: number;
			avgTTL: number;
		}
	>;
}

// Expose via admin endpoint
// GET /api/admin/cache-analytics
```

**Dashboard Features**:

- Real-time hit rate graphs
- Memory usage over time
- Slow cache operations
- Eviction patterns

**Benefits**:

- Data-driven optimization
- Identify cache misconfigurations
- Monitor cache health

**Effort**: Medium (2-3 days)

---

### 4. Selective Cache Warming

**Current State**: Cache populated by user actions only.

**Problem**: Teachers returning from vacation face cold cache.

**Recommendation**: Pre-warm cache on authentication.

```typescript
async function warmCacheOnLogin(userId: string, role: string) {
	if (role === 'teacher') {
		// Fetch classes first (needed for other data)
		const classes = await fetchTeacherClasses(userId);
		teacherCache.hydrateAllClasses(classes);

		// Warm each class cache in parallel
		await Promise.all(
			classes.map(async (cls) => {
				const [students, rewards] = await Promise.all([
					fetchStudents(cls.id),
					fetchRewards(cls.id)
				]);
				teacherCache.hydrateStudents(cls.id, students);
				teacherCache.hydrateRewards(cls.id, rewards);
			})
		);
	}
}
```

**Benefits**:

- Instant dashboard experience
- Front-loads network requests
- Utilizes login wait time

**Effort**: Low (1 day)

---

## Implementation Roadmap

### Phase 1: Quick Wins (1 week)

| Improvement               | Effort   | Impact |
| ------------------------- | -------- | ------ |
| Cache versioning          | 1 day    | Medium |
| Prefetching on hover      | 1 day    | High   |
| Stale data indicators     | 0.5 days | Medium |
| Skeleton loading states   | 1 day    | Medium |
| Service Worker precaching | 0.5 days | Medium |

### Phase 2: Core Improvements (2-3 weeks)

| Improvement                  | Effort | Impact |
| ---------------------------- | ------ | ------ |
| Unified cache interface      | 3 days | High   |
| Cache poisoning prevention   | 2 days | Medium |
| Background refresh           | 2 days | High   |
| Persistent cache (IndexedDB) | 3 days | High   |
| Cross-tab sync               | 2 days | Medium |

### Phase 3: Advanced Features (4-6 weeks)

| Improvement                 | Effort   | Impact |
| --------------------------- | -------- | ------ |
| Repository pattern refactor | 5-7 days | High   |
| Offline support Phase 1     | 5 days   | High   |
| Cache analytics dashboard   | 3 days   | Medium |
| Weighted LRU eviction       | 2 days   | Low    |
| Entry compression           | 1 day    | Low    |

### Phase 4: Security Hardening (1-2 weeks)

| Improvement               | Effort   | Impact |
| ------------------------- | -------- | ------ |
| Sensitive data encryption | 3 days   | Medium |
| Local rate limit layer    | 1 day    | Low    |
| Timing attack mitigation  | 0.5 days | Low    |

---

## Conclusion

The current caching system provides a solid foundation with effective TTL management, optimistic UI, and multi-layer caching. The proposed improvements focus on:

1. **Architecture**: Better abstraction and consistency
2. **Security**: Data protection and attack mitigation
3. **Performance**: Smarter caching and prefetching
4. **UX**: Better feedback and offline support
5. **Features**: Persistence and cross-tab sync

Priority should be given to Phase 1 quick wins and the IndexedDB persistence feature, as these provide the highest impact for teacher experience with minimal risk.
