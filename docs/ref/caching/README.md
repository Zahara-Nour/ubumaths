# Caching System - Technical Reference

Complete technical documentation of the UbuMaths caching architecture.

**Last Updated**: 2025-12-23

---

## Overview

UbuMaths implements a multi-layered caching strategy designed to minimize network requests, improve perceived performance, and provide instant UI feedback. The system comprises 7 distinct caching layers:

| Layer | Type                                               | Location       | Scope         | TTL Range   |
| ----- | -------------------------------------------------- | -------------- | ------------- | ----------- |
| 1     | [Service Worker](#service-worker-caching)          | Browser        | CDN Resources | Indefinite  |
| 2     | [HTTP Headers](#http-response-caching)             | Browser/CDN    | API Responses | 1 hour      |
| 3     | [Dashboard Stores](#dashboard-caching-stores)      | Browser Memory | User Data     | 10min - 24h |
| 4     | [In-Memory LRU](#in-memory-lru-caches)             | Browser Memory | Compilations  | 5min (LRU)  |
| 5     | [Application Stores](#application-stores)          | Browser Memory | Feature Data  | 5min - None |
| 6     | [Database Rate Limits](#database-rate-limiting)    | Supabase       | Rate Limits   | 15min - 1h  |
| 7     | [Vite Pre-bundling](#vite-dependency-pre-bundling) | Build          | Dependencies  | Build       |

---

## Architecture Diagram

```
                              ┌─────────────────────────────────────────────────────────┐
                              │                    USER BROWSER                          │
                              │                                                          │
                              │  ┌──────────────────────────────────────────────────┐   │
                              │  │            SERVICE WORKER (Layer 1)               │   │
                              │  │  Cache: pyodide-cache-v2                          │   │
                              │  │  Strategy: Cache-first for CDN                    │   │
                              │  │  Hosts: cdn.jsdelivr.net, cdn.plot.ly             │   │
                              │  └──────────────────────────────────────────────────┘   │
                              │                          │                              │
                              │                          ▼                              │
┌─────────────────────────────┼──────────────────────────────────────────────────────────┤
│     EXTERNAL CDNs           │  ┌──────────────────────────────────────────────────┐   │
│                             │  │              HTTP CACHE (Layer 2)                 │   │
│  cdn.jsdelivr.net ◄─────────┤  │  - Cache-Control headers                          │   │
│  (Pyodide, Typst WASM)      │  │  - /api/openapi.json: public, 1h                  │   │
│                             │  │  - /api/documents/[id]: private, 1h               │   │
│  cdn.plot.ly ◄──────────────┤  └──────────────────────────────────────────────────┘   │
│  (Plotly.js)                │                          │                              │
│                             │                          ▼                              │
└─────────────────────────────┼──────────────────────────────────────────────────────────┤
                              │  ┌──────────────────────────────────────────────────┐   │
                              │  │         IN-MEMORY CACHES (Layers 3-5)             │   │
                              │  │                                                   │   │
                              │  │  ┌─────────────────┐  ┌─────────────────────────┐│   │
                              │  │  │ Teacher Cache   │  │ Student Cache            ││   │
                              │  │  │ (6 SvelteMaps)  │  │ (3 $state caches)        ││   │
                              │  │  │ • Students: 2h  │  │ • Profile: 2h            ││   │
                              │  │  │ • Rewards: 10m  │  │ • Rewards: 10m           ││   │
                              │  │  │ • Warnings: 10m │  │ • Warnings: 10m          ││   │
                              │  │  │ • Classes: 24h  │  └─────────────────────────┘│   │
                              │  │  │ • School: 24h   │                             │   │
                              │  │  │ • Periods: 1h   │  ┌─────────────────────────┐│   │
                              │  │  └─────────────────┘  │ LRU Caches              ││   │
                              │  │                       │ • Markdown AST: 100 max ││   │
                              │  │                       │ • Typst: 50 max, 5m TTL ││   │
                              │  │                       └─────────────────────────┘│   │
                              │  │                                                   │   │
                              │  │  ┌─────────────────────────────────────────────┐ │   │
                              │  │  │ Application Stores                          │ │   │
                              │  │  │ • Marketplace: 5m TTL + Realtime            │ │   │
                              │  │  │ • Achievements: 5m TTL                      │ │   │
                              │  │  │ • Question Templates: No TTL (manual)       │ │   │
                              │  │  │ • Question Categories: 5m TTL               │ │   │
                              │  │  └─────────────────────────────────────────────┘ │   │
                              │  └──────────────────────────────────────────────────┘   │
                              │                          │                              │
                              └──────────────────────────┼──────────────────────────────┘
                                                         │
                                                         ▼
                              ┌──────────────────────────────────────────────────────────┐
                              │                      SUPABASE                            │
                              │                                                          │
                              │  ┌──────────────────────────────────────────────────┐   │
                              │  │              DATABASE (Layer 6)                   │   │
                              │  │  Table: rate_limits                               │   │
                              │  │  • Atomic check-and-increment                     │   │
                              │  │  • TTL via expires_at column                      │   │
                              │  │  • Action-specific windows (15m - 1h)             │   │
                              │  └──────────────────────────────────────────────────┘   │
                              │                                                          │
                              │  ┌──────────────────────────────────────────────────┐   │
                              │  │              REALTIME                             │   │
                              │  │  • Marketplace: instant updates                   │   │
                              │  │  • Chat: broadcast messages                       │   │
                              │  │  • Presence: online status                        │   │
                              │  └──────────────────────────────────────────────────┘   │
                              │                                                          │
                              └──────────────────────────────────────────────────────────┘
```

---

## Quick Reference

### Import Locations

```typescript
// Dashboard Caches
import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
import { studentCache } from '$lib/stores/studentDashboardCache.svelte';

// LRU Caches
import { getCachedAST, setCachedAST } from '$lib/utils/markdown-cache';
import { TypstCache, createTypstCache } from '$lib/typst/cache/typst-cache';

// Application Stores
import { marketplaceStore } from '$lib/stores/marketplace.svelte';
import { achievementsStore } from '$lib/stores/achievements.svelte';
import { questionTemplatesStore } from '$lib/stores/questionTemplates.svelte';

// Cache Synchronization
import { syncVipCards, syncGidouilles } from '$lib/utils/cache-sync';
```

### TTL Summary

| Cache        | TTL          | Rationale                                  |
| ------------ | ------------ | ------------------------------------------ |
| Students     | 2 hours      | Rarely changes during session              |
| Rewards      | 10 minutes   | Frequently modified, needs freshness       |
| Warnings     | 10 minutes   | Per-period data, moderate update frequency |
| Classes      | 24 hours     | Quasi-static metadata                      |
| School       | 24 hours     | Administrative data, rarely changes        |
| Periods      | 1 hour       | Academic periods are quasi-static          |
| Typst        | 5 minutes    | Compilation results, limited memory        |
| Markdown     | No TTL (LRU) | Content-addressed, eviction on capacity    |
| Marketplace  | 5 minutes    | Realtime handles instant updates           |
| Achievements | 5 minutes    | Moderate update frequency                  |

---

## Documentation Index

| Document                                    | Description                                                          |
| ------------------------------------------- | -------------------------------------------------------------------- |
| [Service Worker Caching](service-worker.md) | CDN resource caching for Pyodide, Typst, Plotly                      |
| [HTTP Response Caching](http-caching.md)    | Cache-Control headers and API response caching                       |
| [Dashboard Stores](client-stores.md)        | Teacher and Student dashboard caches with TTL                        |
| [In-Memory LRU Caches](in-memory-caches.md) | Typst compilation and Markdown AST caches                            |
| [Improvements](improvements.md)             | Recommended improvements for architecture, security, performance, UX |

---

## Key Patterns

### 1. Hydration Pattern (Recommended)

Pre-fill cache from server-side data to avoid redundant API calls:

```typescript
// +page.svelte
$effect(() => {
	// Hydrate from load function data (no API call)
	teacherCache.hydrateStudents(classId, data.students);
	teacherCache.hydrateRewards(classId, data.students);
});
```

### 2. Optimistic UI with Debouncing

Instant feedback with batched server synchronization:

```typescript
function handleGidouilleClick(studentId: string, delta: number) {
	// 1. Instant UI update
	teacherCache.updateGidouillesOptimistic(classId, studentId, delta);

	// 2. Debounce server sync (500ms)
	clearTimeout(timers[studentId]);
	timers[studentId] = setTimeout(() => {
		syncToServer(studentId);
	}, 500);
}
```

### 3. Cache-First with Fallback

Check cache before making network requests:

```typescript
// Sync check first (for $derived)
let cachedRewards = $derived(teacherCache.getRewardsSync(classId));

// Async fallback if cache miss
$effect(() => {
	if (!cachedRewards) {
		teacherCache.getStudentRewards(classId); // Auto-fetches
	}
});
```

### 4. Cache Invalidation Strategy

Invalidate after mutations to ensure freshness:

```typescript
async function updateGidouilles(studentId: string, amount: number) {
	await fetch('/api/rewards/gidouilles', {
		method: 'POST',
		body: JSON.stringify({ studentId, amount })
	});

	// Invalidate to force fresh data on next access
	teacherCache.invalidateRewards(classId);
}
```

### 5. Composite Keys for Period Data

Use composite keys when data varies by multiple dimensions:

```typescript
// Warnings cache uses classId:periodId composite key
const key = `${classId}:${periodId}`;

// Invalidate specific period
teacherCache.invalidateWarnings(classId, periodId);

// Invalidate all periods for a class
teacherCache.invalidateAllWarningsForClass(classId);
```

---

## Monitoring & Debugging

### Cache Statistics

```typescript
// Get cache stats
const stats = teacherCache.getStats();
console.log(stats);
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

// Log to console
teacherCache.logStats();
```

### Environment Variable

Enable verbose cache logging:

```bash
VITE_ENABLE_CACHE_MONITORING=true
```

### Console Log Format

```
[Cache] Cache HIT: Rewards for class abc123 (0.12ms)
[Cache] Cache MISS: Warnings for class:period abc123:xyz789 (TTL expired) - Fetching...
[Cache] Optimistic gidouilles update: student xyz789 → 18
[Cache] Invalidated rewards for class: abc123
```

---

## Performance Impact

### Expected Improvements

| Metric                   | Without Cache | With Cache      | Improvement        |
| ------------------------ | ------------- | --------------- | ------------------ |
| Rewards page load        | 7 API calls   | 0 API calls     | **100% reduction** |
| Warnings page load       | 3 API calls   | 0 API calls     | **100% reduction** |
| Navigation between pages | 500ms         | <50ms           | **90% faster**     |
| Rapid +/- clicks (10x)   | 10 API calls  | 1 API call      | **90% reduction**  |
| Memory usage             | 0KB           | ~15KB (typical) | +15KB              |
| Python playground reload | 50MB download | 0 (cached)      | **100% reduction** |

### Real-World Metrics

- Teacher with 3 classes × 20 students = 60 students cached
- Estimated memory: ~60KB total (negligible)
- API call reduction: 60-90%
- Service Worker cache: Pyodide WASM ~11MB cached indefinitely

---

## Related Documentation

- [Teacher Cache (Claude)](../../claude/teacher-cache.md) - Developer reference
- [Student Cache (Claude)](../../claude/student-cache.md) - Developer reference
- [Performance Architecture](../../architecture/performance.md) - General performance patterns
- [Realtime System](../realtime/index.md) - Supabase Realtime integration
- [Cross-Device Sync](../../features/cross-device-sync.md) - Polling-based synchronization
