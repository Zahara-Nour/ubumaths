# Cache Logging Format

**Last Updated:** 2025-10-29

Comprehensive guide to understanding and using the UbuMaths cache logging system for debugging and performance optimization.

---

## Overview

UbuMaths implements a sophisticated multi-tier caching strategy to minimize database queries and provide instant user experiences. The cache logging system provides visibility into this architecture, helping developers:

- **Understand data flow** through the cache hierarchy
- **Measure cache effectiveness** with hit/miss rates
- **Identify performance bottlenecks** (DB queries vs cached data)
- **Debug cache invalidation issues**
- **Optimize cache strategy** based on real usage patterns

The logging system uses a standardized format across all cache tiers, making it easy to trace data retrieval from client store to database.

---

## Cache Architecture

UbuMaths uses a 4-tier caching hierarchy, with each tier optimized for different use cases:

```
┌─────────────────────────────────────┐
│  Client (Browser)                   │
│  [Client Store][Tier-3]             │
│  - Svelte stores                    │
│  - Per-tab memory                   │
│  - 0ms access time                  │
│  - Session-based                    │
└───────────┬─────────────────────────┘
            │ API Request (cache miss)
            ▼
┌─────────────────────────────────────┐
│  Server (Vercel)                    │
│  [RAM Server][Tier-2]               │
│  - Node.js process memory           │
│  - Per-user data                    │
│  - <1ms access time                 │
│  - 15 min TTL                       │
└───────────┬─────────────────────────┘
            │ Cache Miss
            ▼
┌─────────────────────────────────────┐
│  Redis (Upstash)                    │
│  [Redis][Tier-1]                    │
│  - Distributed cache                │
│  - Shared across instances          │
│  - ~50ms access time                │
│  - 1-60 min TTL                     │
└───────────┬─────────────────────────┘
            │ Cache Miss
            ▼
┌─────────────────────────────────────┐
│  Database (Supabase)                │
│  [DB]                               │
│  - PostgreSQL source of truth       │
│  - No tier number                   │
│  - 100-1000ms query time            │
└─────────────────────────────────────┘
```

### Tier Characteristics

**Tier 3 - Client Store** (Fastest):

- **Location**: Browser memory (Svelte stores)
- **Scope**: Single tab/session
- **Speed**: 0ms (instant)
- **Use case**: Frequently accessed data within a session
- **Cleared**: On page refresh
- **Examples**: Student lists, gidouilles data, warnings data

**Tier 2 - RAM Server** (Very Fast):

- **Location**: Node.js process memory (Vercel serverless function)
- **Scope**: Per-user, per-instance
- **Speed**: <1ms
- **Use case**: User-specific data (roles, permissions)
- **Cleared**: On function cold start
- **Examples**: User profiles, role checks

**Tier 1 - Redis** (Fast):

- **Location**: Upstash Redis (distributed)
- **Scope**: Shared across all instances/users
- **Speed**: ~50ms
- **Use case**: Shared data, multi-instance deployments
- **Cleared**: TTL expiration or manual invalidation
- **Examples**: Schools, templates, assessment results

**Tier 0 - Database** (Slow):

- **Location**: Supabase PostgreSQL
- **Scope**: Source of truth
- **Speed**: 100-1000ms
- **Use case**: Cache misses, writes, complex queries
- **Examples**: All data originates here

---

## Log Format

### Standard Format

All cache logs follow this standardized format:

```
[functionName][source][Tier-X] STATUS (timing) details
```

### Format Components

| Component      | Description                    | Examples                                                       |
| -------------- | ------------------------------ | -------------------------------------------------------------- |
| `functionName` | Cache function called          | `getCachedSchool`, `teacherStudentsCache.get`                  |
| `source`       | Where data was found/fetched   | `Redis`, `RAM Server`, `Client Store`, `DB`                    |
| `Tier-X`       | Cache tier number (1, 2, or 3) | `Tier-1`, `Tier-2`, `Tier-3`                                   |
| `STATUS`       | Operation result with emoji    | `🎯 HIT`, `❌ MISS`, `⏱️ FETCH`, `🔄 LOADING`, `🗑️ INVALIDATE` |
| `timing`       | Milliseconds in parentheses    | `(45ms)`, `(0ms)`, `(850ms)`                                   |
| `details`      | Cache key or query parameters  | `cache:school:def456:data`, `{ schoolId: 'def456' }`           |

### Status Types

| Status       | Emoji | Meaning                                       |
| ------------ | ----- | --------------------------------------------- |
| `HIT`        | 🎯    | Data found in cache                           |
| `MISS`       | ❌    | Data not in cache (will fetch from next tier) |
| `FETCH`      | ⏱️    | Fetching from database                        |
| `LOADING`    | 🔄    | Already loading (request deduplication)       |
| `INVALIDATE` | 🗑️    | Cache cleared                                 |

### Log Examples

#### Redis Cache Hit

```bash
[getCachedSchool][Redis][Tier-1] 🎯 HIT (45ms) cache:school:def456:data
```

**Interpretation**: School data found in Redis in 45ms. No database query needed.

#### Redis Miss → Database Fetch

```bash
[getCachedSchool][Redis][Tier-1] ❌ MISS (12ms) → fetching from DB
[getCachedSchool][DB] ⏱️ FETCH (850ms) { schoolId: 'def456' }
```

**Interpretation**: Redis checked (12ms), data not found, fetched from DB (850ms). Total time: 862ms.

#### RAM Server Cache Hit

```bash
[getCachedProfile][RAM Server][Tier-2] 🎯 HIT (0ms) profile:abc123:role
```

**Interpretation**: User profile found in server memory. Instant access.

#### Client Store Cache Hit

```bash
[teacherStudentsCache.get][Client Store][Tier-3] 🎯 HIT (0ms) students:class:xyz789
```

**Interpretation**: Student list found in browser memory. No API call needed.

#### Client Store Miss → API Call

```bash
[teacherStudentsCache.get][Client Store][Tier-3] ❌ MISS → fetching via API
[getTeacherStudents][Redis][Tier-1] 🎯 HIT (50ms) students:teacher:abc123:class:xyz789
```

**Interpretation**: Browser cache empty, API fetched data from Redis (50ms).

#### Request Deduplication

```bash
[teacherStudentsCache.get][Client Store][Tier-3] ❌ MISS → fetching via API
[teacherStudentsCache.get][Client Store][Tier-3] 🔄 LOADING students:class:xyz789 (dedup)
[teacherStudentsCache.get][Client Store][Tier-3] 🔄 LOADING students:class:xyz789 (dedup)
```

**Interpretation**: Three simultaneous requests for same data. First triggers fetch, others wait. Prevents duplicate API calls.

#### Cache Invalidation

```bash
[invalidateSchoolCache][Redis][Tier-1] 🗑️ INVALIDATE (25ms) cache:school:def456:*
```

**Interpretation**: School cache cleared in Redis (e.g., after timetable update).

---

## How to Enable

### Environment Variable

Add to your `.env` file:

```bash
# .env
ENABLE_CACHE_LOGS=true
```

### Scope and Behavior

- **Development only**: Logs only appear when running `pnpm dev`
- **Production safety**: Automatically disabled in production builds
- **Zero overhead**: No performance impact when disabled
- **Console output**: Logs appear in terminal (server-side) or browser console (client-side)

### Restart Required

After adding the environment variable, restart the dev server:

```bash
pnpm dev -- --port 5175
```

### Selective Logging

To log only specific cache modules, modify the check in each cache file:

```typescript
// src/lib/server/cache/schools.ts
const DEBUG = process.env.ENABLE_CACHE_LOGS === 'true' && process.env.DEBUG_SCHOOLS === 'true';
```

---

## Reading Logs

Understanding common log patterns helps diagnose performance issues and verify cache behavior.

### Pattern 1: Cold Cache (First Load)

**Scenario**: User visits page for the first time. All caches are empty.

```bash
[teacherStudentsCache.get][Client Store][Tier-3] ❌ MISS → fetching via API
[getTeacherStudents][Redis][Tier-1] ❌ MISS (15ms) → fetching from DB
[getTeacherStudents][DB] ⏱️ FETCH (850ms) { teacherId: 'abc123', classId: 'xyz789' }
```

**Analysis**:

- **Total time**: ~865ms (slow, expected on first load)
- **Cache state**: All tiers empty
- **Next request**: Will be much faster (Redis cached)
- **Optimization**: Pre-warm critical caches on deployment

### Pattern 2: Warm Cache (Repeated Load)

**Scenario**: User refreshes page or navigates back. Data already in browser cache.

```bash
[teacherStudentsCache.get][Client Store][Tier-3] 🎯 HIT (0ms) students:class:xyz789
```

**Analysis**:

- **Total time**: 0ms (instant!)
- **Cache state**: Client store has data
- **No network**: Zero API calls
- **User experience**: Instant page load

### Pattern 3: Partial Cache (Redis Hit)

**Scenario**: User opens new tab (client store empty) but Redis has data.

```bash
[teacherStudentsCache.get][Client Store][Tier-3] ❌ MISS → fetching via API
[getTeacherStudents][Redis][Tier-1] 🎯 HIT (50ms) students:teacher:abc123:class:xyz789
```

**Analysis**:

- **Total time**: ~50ms (good performance)
- **Cache state**: Redis warm, client cold
- **No database**: Redis prevented DB query
- **Trade-off**: Acceptable latency vs DB query (850ms)

### Pattern 4: Cache Deduplication

**Scenario**: Component renders multiple times simultaneously requesting same data.

```bash
[teacherStudentsCache.get][Client Store][Tier-3] ❌ MISS → fetching via API
[teacherStudentsCache.get][Client Store][Tier-3] 🔄 LOADING students:class:xyz789 (dedup)
[teacherStudentsCache.get][Client Store][Tier-3] 🔄 LOADING students:class:xyz789 (dedup)
[teacherStudentsCache.get][Client Store][Tier-3] 🔄 LOADING students:class:xyz789 (dedup)
[getTeacherStudents][Redis][Tier-1] 🎯 HIT (50ms) students:teacher:abc123:class:xyz789
```

**Analysis**:

- **Efficiency**: 1 API call instead of 4
- **Mechanism**: Promise deduplication in client store
- **Benefit**: Reduces server load, faster overall
- **Expected**: Common with Svelte's reactive rendering

### Pattern 5: Cache Cascade

**Scenario**: Complete cache miss, data fetched through all tiers.

```bash
[teacherStudentsCache.get][Client Store][Tier-3] ❌ MISS → fetching via API
[getTeacherStudents][Redis][Tier-1] ❌ MISS (15ms) → fetching from DB
[getTeacherStudents][DB] ⏱️ FETCH (850ms) { teacherId: 'abc123', classId: 'xyz789' }
```

**Analysis**:

- **Waterfall**: Client → Redis → DB
- **Total latency**: 865ms
- **Cache population**: All tiers now cached
- **Next request**: Will hit Redis (50ms)

### Pattern 6: Cache Invalidation

**Scenario**: Admin updates school timetable, cache is cleared.

```bash
# Before invalidation
[getCachedSchool][Redis][Tier-1] 🎯 HIT (45ms) cache:school:def456:data

# Invalidation triggered
[invalidateSchoolCache][Redis][Tier-1] 🗑️ INVALIDATE (25ms) cache:school:def456:*

# Next request
[getCachedSchool][Redis][Tier-1] ❌ MISS (12ms) → fetching from DB
[getCachedSchool][DB] ⏱️ FETCH (750ms) { schoolId: 'def456' }
```

**Analysis**:

- **Correctness**: Stale data removed
- **Performance hit**: One slow request after invalidation
- **Recovery**: Cache repopulated immediately
- **TTL**: Will stay cached for 1 hour

---

## Debugging Guide

Common scenarios and how to diagnose them using cache logs.

### Scenario 1: Slow Page Load

**Symptoms**: Page takes 2-3 seconds to load.

**Look for**: Database fetch logs with high timing.

```bash
[getCachedSchool][DB] ⏱️ FETCH (2500ms) { schoolId: 'def456' }
[getTeacherStudents][DB] ⏱️ FETCH (1800ms) { teacherId: 'abc123' }
```

**Diagnosis**: Multiple slow DB queries (cache not working or expired).

**Fixes**:

1. **Check Redis connection**: Verify `UPSTASH_REDIS_REST_URL` is set
2. **Increase TTL**: Longer cache duration for stable data
3. **Optimize queries**: Add indexes, reduce joins
4. **Pre-warm cache**: Load critical data on deployment

### Scenario 2: Cache Not Working

**Symptoms**: Repeated DB fetches for identical data.

```bash
# Request 1
[getCachedSchool][Redis][Tier-1] ❌ MISS (10ms) → fetching from DB
[getCachedSchool][DB] ⏱️ FETCH (800ms) { schoolId: 'abc123' }

# Request 2 (30 seconds later)
[getCachedSchool][Redis][Tier-1] ❌ MISS (10ms) → fetching from DB
[getCachedSchool][DB] ⏱️ FETCH (800ms) { schoolId: 'abc123' }
```

**Diagnosis**: Data not being cached in Redis.

**Fixes**:

1. **Check Redis credentials**: Verify `.env` has valid Upstash URL/token
2. **Verify cache key**: Ensure key is consistent across requests
3. **Check TTL**: Verify TTL isn't too short (e.g., 1 second)
4. **Upstash quota**: Check if Redis storage limit exceeded
5. **Error logs**: Look for Redis connection errors

### Scenario 3: Redis Slower Than Expected

**Symptoms**: Redis hits taking >100ms consistently.

```bash
[getCachedSchool][Redis][Tier-1] 🎯 HIT (150ms) cache:school:abc123:data
[getCachedSchool][Redis][Tier-1] 🎯 HIT (180ms) cache:school:abc123:data
[getCachedSchool][Redis][Tier-1] 🎯 HIT (200ms) cache:school:abc123:data
```

**Diagnosis**: Redis latency issue.

**Fixes**:

1. **Check Upstash region**: Should be close to Vercel region (US East)
2. **Network issues**: Test Redis directly with `curl`
3. **Large payloads**: Reduce cached data size (e.g., exclude unnecessary fields)
4. **Upgrade plan**: Free tier has slower performance
5. **Use RAM cache**: Move to Tier-2 for critical user data

### Scenario 4: Client Store Not Persisting

**Symptoms**: Every navigation triggers API call despite store usage.

```bash
# Page A
[teacherStudentsCache.get][Client Store][Tier-3] ❌ MISS → fetching via API
[getTeacherStudents][Redis][Tier-1] 🎯 HIT (50ms)

# Navigate to Page B and back to Page A
[teacherStudentsCache.get][Client Store][Tier-3] ❌ MISS → fetching via API
[getTeacherStudents][Redis][Tier-1] 🎯 HIT (50ms)
```

**Diagnosis**: Client store not retaining data across navigation.

**Fixes**:

1. **Check store implementation**: Verify store is at module level (not component)
2. **Navigation type**: Full page reload clears store (expected)
3. **Svelte routing**: Ensure using SvelteKit navigation (not `<a href>`)
4. **Store lifecycle**: Verify store isn't being recreated

### Scenario 5: Excessive Cache Invalidation

**Symptoms**: Many invalidation logs, poor hit rates.

```bash
[invalidateSchoolCache][Redis][Tier-1] 🗑️ INVALIDATE (25ms) cache:school:abc123:*
# ... 10 seconds later
[invalidateSchoolCache][Redis][Tier-1] 🗑️ INVALIDATE (25ms) cache:school:abc123:*
# ... 15 seconds later
[invalidateSchoolCache][Redis][Tier-1] 🗑️ INVALIDATE (25ms) cache:school:abc123:*
```

**Diagnosis**: Too aggressive invalidation strategy.

**Fixes**:

1. **Review triggers**: Check database triggers for unnecessary invalidations
2. **Batch updates**: Invalidate once after multiple updates
3. **Selective invalidation**: Only clear affected cache keys
4. **Debounce**: Wait for batch of updates before invalidating

### Scenario 6: Memory Leak in Client Store

**Symptoms**: Browser slows down over time, large memory usage.

**Look for**: Client store continuously growing.

```bash
# Check cache size
[teacherStudentsCache.get][Client Store][Tier-3] 🎯 HIT (0ms) students:class:1
[teacherStudentsCache.get][Client Store][Tier-3] 🎯 HIT (0ms) students:class:2
[teacherStudentsCache.get][Client Store][Tier-3] 🎯 HIT (0ms) students:class:3
# ... hundreds of entries
```

**Diagnosis**: Store not clearing old entries.

**Fixes**:

1. **Implement LRU**: Limit store to N most recent entries
2. **TTL**: Add expiration timestamps to cached data
3. **Manual clear**: Add UI control to clear cache
4. **Scope reduction**: Cache less data (e.g., only current class)

---

## Function Reference

Complete reference of cache functions, their sources, and characteristics.

### Server-Side Cache Functions

| Function                     | Module                | Primary Cache       | Fallback | TTL    | Data Type                     |
| ---------------------------- | --------------------- | ------------------- | -------- | ------ | ----------------------------- |
| `getCachedProfile`           | `cache/profile.ts`    | RAM Server (Tier-2) | DB       | 15 min | User profiles, roles          |
| `getCachedSchool`            | `cache/schools.ts`    | Redis (Tier-1)      | DB       | 1 hour | School data, timetables       |
| `getCachedTemplates`         | `cache/templates.ts`  | Redis (Tier-1)      | DB       | 10 min | Published question templates  |
| `getTeacherStudents`         | `cache/students.ts`   | Redis (Tier-1)      | DB       | 10 min | Student profiles by class     |
| `getClassGidouilles`         | `cache/gidouilles.ts` | Redis (Tier-1)      | DB       | 5 min  | Student gidouilles, VIP cards |
| `getClassWarnings`           | `cache/warnings.ts`   | Redis (Tier-1)      | DB       | 3 min  | Student warnings by class     |
| `getCachedAssessmentResults` | `cache/results.ts`    | Redis (Tier-1)      | DB       | 5 min  | Cached assessment results     |
| `activityPollingCache.get`   | `cache/activity.ts`   | Redis (Tier-1)      | DB       | 30 sec | Dashboard activity counts     |

### Client-Side Cache Stores

| Store                  | Module                                    | Cache Tier            | Lifespan | Data Type              |
| ---------------------- | ----------------------------------------- | --------------------- | -------- | ---------------------- |
| `teacherStudentsCache` | `stores/teacher-students-cache.svelte.ts` | Client Store (Tier-3) | Session  | Student lists by class |
| `gidouillesCache`      | `stores/gidouilles-cache.svelte.ts`       | Client Store (Tier-3) | Session  | Gidouilles, VIP cards  |
| `warningsCache`        | `stores/warnings-cache.svelte.ts`         | Client Store (Tier-3) | Session  | Student warnings       |

### Cache Invalidation Functions

| Function                          | Scope             | Invalidates             |
| --------------------------------- | ----------------- | ----------------------- |
| `invalidateSchoolCache`           | Redis only        | School data, timetables |
| `invalidateTemplateCache`         | Redis only        | Question templates      |
| `invalidateStudentCache`          | Redis only        | Student profiles        |
| `invalidateGidouillesCache`       | Redis only        | Gidouilles, VIP cards   |
| `invalidateWarningsCache`         | Redis only        | Student warnings        |
| `teacherStudentsCache.invalidate` | Client Store only | Student lists           |
| `gidouillesCache.invalidate`      | Client Store only | Gidouilles data         |
| `warningsCache.invalidate`        | Client Store only | Warnings data           |

### Cache Key Patterns

Understanding cache keys helps debug invalidation issues:

| Pattern                                        | Example                          | Used By              |
| ---------------------------------------------- | -------------------------------- | -------------------- |
| `profile:{userId}:role`                        | `profile:abc123:role`            | `getCachedProfile`   |
| `cache:school:{schoolId}:data`                 | `cache:school:def456:data`       | `getCachedSchool`    |
| `templates:published`                          | `templates:published`            | `getCachedTemplates` |
| `students:teacher:{teacherId}:class:{classId}` | `students:teacher:abc:class:xyz` | `getTeacherStudents` |
| `gidouilles:class:{classId}`                   | `gidouilles:class:xyz789`        | `getClassGidouilles` |
| `warnings:class:{classId}`                     | `warnings:class:xyz789`          | `getClassWarnings`   |

### Client Store Notes

**Session-Based Caching**:

- Client stores are cleared on page refresh (not persistent)
- Data cached only for current browser tab
- Multiple tabs have independent caches

**Request Deduplication**:

- Prevents duplicate API calls for simultaneous requests
- Uses Promise caching with pending request tracking
- Automatically cleans up completed requests

**Manual Invalidation**:

```typescript
// Clear specific entry
teacherStudentsCache.invalidate('students:class:xyz789');

// Clear all entries
teacherStudentsCache.clear();
```

---

## Performance Benchmarks

Real-world performance improvements from caching:

### Assessment Results Caching

**Before (no cache)**:

- First load: 3600ms (244 DB queries)
- Subsequent loads: 3600ms (244 DB queries)

**After (Redis cache)**:

- First load: 3600ms (cache miss, populate cache)
- Subsequent loads: 400ms (cache hit)
- **Improvement**: 88% faster (3.6s → 0.4s)

### Activity Polling

**Before (no cache)**:

- Poll interval: 30 seconds
- Queries per poll: 15 DB queries
- Queries per hour: 1,800 DB queries

**After (Redis cache)**:

- Poll interval: 30 seconds
- Queries per poll: 0 (cache hit)
- Queries per hour: 2 cache misses + 120 cache hits
- **Improvement**: 95% reduction in DB queries

### Student List Loading

**Before (no client cache)**:

- Page A load: 850ms DB query
- Navigate to Page B: 850ms DB query
- Back to Page A: 850ms DB query
- **Total**: 2550ms

**After (client cache)**:

- Page A load: 850ms (cache miss)
- Navigate to Page B: 850ms (different data)
- Back to Page A: 0ms (cache hit)
- **Total**: 1700ms (33% faster)

---

## Related Documentation

- **[Hybrid Cache System](../architecture/hybrid-cache-system.md)** - Architecture overview and design decisions
- **[Redis Cache Setup](../guides/redis-cache-setup.md)** - Step-by-step Redis configuration guide
- **[Performance Optimization](../architecture/performance-optimization.md)** - Query optimization and indexing strategies
- **[Database Schema](../architecture/database-schema.md)** - Database structure and relationships
- **[Rate Limiting](../features/rate-limiting.md)** - Redis-based rate limiting implementation

---

## Troubleshooting Checklist

Before asking for help, verify:

- [ ] `ENABLE_CACHE_LOGS=true` is set in `.env`
- [ ] Dev server restarted after adding environment variable
- [ ] Redis credentials configured (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)
- [ ] Redis health check passes: `curl http://localhost:5175/api/health/redis`
- [ ] No Redis connection errors in logs
- [ ] Cache keys are consistent (check log `details` field)
- [ ] TTL values are reasonable (not too short)
- [ ] Upstash quota not exceeded (check Upstash dashboard)

---

## Contributing

When adding new cache modules:

1. **Follow log format**: Use standardized `[functionName][source][Tier-X] STATUS (timing) details`
2. **Add to function reference**: Update table in this document
3. **Document cache keys**: Add pattern to cache key table
4. **Include timing**: Always log operation duration
5. **Test invalidation**: Verify cache clears correctly
6. **Update benchmarks**: Add performance metrics if significant

---

**Questions?** See [docs/README.md](../README.md) for more documentation or ask in the project Discord.
