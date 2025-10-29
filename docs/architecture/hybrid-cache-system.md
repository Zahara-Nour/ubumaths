# Hybrid Cache System Architecture

> Comprehensive guide to UbuMaths' dual-layer caching strategy combining in-memory and Redis caches

**Last Updated**: 2025-10-29
**Status**: Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Cache Modules](#cache-modules)
4. [Decision Matrix](#decision-matrix)
5. [Performance Metrics](#performance-metrics)
6. [Cache Invalidation](#cache-invalidation)
7. [Implementation Examples](#implementation-examples)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Overview

### Why Hybrid Cache?

UbuMaths uses a **two-tier caching strategy** to optimize for different data access patterns:

**In-Memory Cache** (Tier 1):

- Ultra-low latency (< 1ms)
- Per-user data isolation
- Request-scoped lifecycle
- No network overhead

**Redis Cache** (Tier 2):

- Cross-instance data sharing
- Persistent across deployments
- Multi-user consistency
- Distributed rate limiting

**Key Insight**: Not all data should use the same cache. Per-user profile data benefits from in-memory caching, while shared school data benefits from Redis caching.

### Design Philosophy

1. **Data Locality Matters**: User-specific data lives in memory, shared data in Redis
2. **Latency Optimization**: Use the fastest cache tier for each access pattern
3. **Cost Efficiency**: In-memory cache is free, Redis has request quotas
4. **Fail-Safe Design**: Both cache layers gracefully degrade to database queries

### System Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                   SvelteKit Application                         │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐    │
│  │               HYBRID CACHE LAYER                      │    │
│  │                                                        │    │
│  │  ┌─────────────────────┐    ┌────────────────────┐   │    │
│  │  │   In-Memory Cache   │    │   Redis Cache      │   │    │
│  │  │   (Tier 1)          │    │   (Tier 2)         │   │    │
│  │  │                     │    │                    │   │    │
│  │  │ • User profiles     │    │ • Schools data     │   │    │
│  │  │ • Session data      │    │ • Templates        │   │    │
│  │  │ • Per-user temp     │    │ • Assessment cache │   │    │
│  │  │                     │    │ • Rate limits      │   │    │
│  │  │ TTL: 1-15 min       │    │ TTL: 10-60 min     │   │    │
│  │  │ Latency: <1ms       │    │ Latency: ~50ms     │   │    │
│  │  │ Scope: Single pod   │    │ Scope: Global      │   │    │
│  │  └─────────────────────┘    └────────────────────┘   │    │
│  │                                                        │    │
│  └───────────────────────────────────────────────────────┘    │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
               ┌────────────────────────┐
               │  Supabase PostgreSQL   │
               │  (Source of Truth)     │
               └────────────────────────┘
```

---

## Architecture

### Cache Selection Flow

```
┌─────────────────────────────────────────────┐
│     Data Access Request                     │
└───────────────┬─────────────────────────────┘
                │
                ▼
         ┌──────────────┐
         │ Is data      │
         │ user-specific?│
         └──────┬───────┘
                │
       ┌────────┴────────┐
       │                 │
       ▼ YES             ▼ NO
┌─────────────┐   ┌─────────────┐
│ In-Memory   │   │ Is data     │
│ Cache       │   │ shared?     │
│             │   └──────┬──────┘
│ • Profile   │          │
│ • Session   │   ┌──────┴──────┐
│             │   │             │
│ <1ms        │   ▼ YES         ▼ NO
└─────────────┘ ┌─────────┐  ┌──────────┐
                │ Redis   │  │ Database │
                │ Cache   │  │ Direct   │
                │         │  └──────────┘
                │ • School│
                │ • Temps │
                │         │
                │ ~50ms   │
                └─────────┘
```

### Data Flow: In-Memory Cache

```typescript
// 1. Request arrives
const profile = await getCachedProfile(userId, supabase);

// 2. Check in-memory cache (local to this server instance)
if (memoryCache.has(`profile:${userId}:role`)) {
	return cachedData; // <1ms - memory lookup
}

// 3. Cache miss - fetch from database
const data = await supabase.from('profiles').select('role').eq('id', userId).single();

// 4. Store in memory for 15 minutes
memoryCache.set(`profile:${userId}:role`, data, 900);

// 5. Return data
return data;
```

**Timeline**:

```
Cache HIT:  0ms ──→ 0.5ms (memory lookup) ──→ Response
Cache MISS: 0ms ──→ 50ms (DB query) ──→ 50.1ms (cache store) ──→ Response
```

### Data Flow: Redis Cache

```typescript
// 1. Request arrives
const school = await getCachedSchool(schoolId, supabase);

// 2. Check Redis (shared across all server instances)
if (await redis.get(`school:${schoolId}:data`)) {
	return cachedData; // ~50ms - network + Redis lookup
}

// 3. Cache miss - fetch from database
const data = await supabase.from('schools').select('*').eq('id', schoolId).single();

// 4. Store in Redis for 1 hour
await redis.setex(`school:${schoolId}:data`, 3600, JSON.stringify(data));

// 5. Return data
return data;
```

**Timeline**:

```
Cache HIT:  0ms ──→ 50ms (Redis lookup) ──→ Response
Cache MISS: 0ms ──→ 250ms (DB query) ──→ 260ms (Redis store) ──→ Response
```

---

## Cache Modules

### 1. Profile Cache (In-Memory)

**Module**: `src/lib/server/cache/profile.ts`

**Purpose**: Eliminate redundant database queries for user role checks during dashboard navigation and API requests.

**Data Cached**:

- User role (`student`, `teacher`, `admin`)

**TTL**: 15 minutes (900 seconds)

**Key Pattern**: `profile:{userId}:role`

**Use Cases**:

- Dashboard load authorization
- API endpoint permission checks
- Navigation guard checks
- Per-request role validation

**Performance Impact**:

- **Before**: 20+ DB queries per dashboard visit
- **After**: 1 DB query per 15 minutes (99% reduction)
- **Latency**: <1ms (memory lookup)

**Example**:

```typescript
import { getCachedProfile } from '$lib/server/cache/profile';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	const profile = await getCachedProfile(user.id, supabase);

	if (!profile) {
		throw error(404, 'Profile not found');
	}

	if (profile.role !== 'teacher') {
		throw error(403, 'Teacher access required');
	}

	// Continue loading teacher dashboard
};
```

**Invalidation**:

```typescript
import { invalidateProfileCache } from '$lib/server/cache/profile';

// After admin changes user role
await supabase.from('profiles').update({ role: 'teacher' }).eq('id', userId);
invalidateProfileCache(userId);
```

**Why In-Memory?**:

- Profile roles are **per-user data** (not shared)
- Ultra-high read frequency (every dashboard load, API call)
- Small data size (single enum value)
- Immediate consistency (single server instance)

---

### 2. Schools Cache (Redis)

**Module**: `src/lib/server/cache/schools.ts`

**Purpose**: Cache school data (timetable, metadata) for multiple teachers at the same school.

**Data Cached**:

- School profile (name, logo, city, country)
- Timetable configuration (period times, break schedules)
- School metadata (academic year, settings)

**TTL**: 1 hour (3600 seconds)

**Key Pattern**: `school:{schoolId}:data`

**Use Cases**:

- Teacher dashboard (timetable display)
- Student schedule views
- Period-based warning management
- School-wide announcements

**Performance Impact**:

- **Scenario**: 50 teachers at same school load dashboard
- **Before**: 50 identical DB queries
- **After**: 1 DB query, 49 cache hits (98% reduction)
- **Latency**: ~50ms (Redis network roundtrip)

**Example**:

```typescript
import { getCachedSchool } from '$lib/server/cache/schools';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	const profile = await getProfile(user.id, supabase);
	const school = await getCachedSchool(profile.school_id, supabase);

	if (!school) {
		throw error(404, 'School not found');
	}

	return {
		timetable: school.timetable,
		schoolName: school.name
	};
};
```

**Invalidation**:

```typescript
import { invalidateSchoolCache } from '$lib/server/cache/schools';

// After admin updates school timetable
await supabase.from('schools').update({ timetable: newTimetable }).eq('id', schoolId);
await invalidateSchoolCache(schoolId);
```

**Why Redis?**:

- School data is **shared across multiple users** (all teachers at school)
- Medium-low update frequency (once per semester)
- Medium data size (~2-5KB with timetable JSON)
- Needs cross-instance consistency (Vercel multi-region)

---

### 3. Templates Cache (Redis)

**Module**: `src/lib/server/cache/templates.ts`

**Purpose**: Cache published question templates for assessment creation and game pages.

**Data Cached**:

- All published question templates
- Template metadata (title, level, domain, grades)
- Template configuration (variables, rules)

**TTL**: 10 minutes (600 seconds)

**Key Pattern**: `templates:published`

**Use Cases**:

- Assessment creation (selecting templates)
- Game pages (loading exercise templates)
- Admin panels (browsing published templates)
- API endpoints (generating questions)

**Performance Impact**:

- **Dataset Size**: 500 templates × 2KB = 1MB
- **Scenario**: 100 users creating assessments
- **Before**: 100 large DB queries (1MB each)
- **After**: 1 DB query, 99 cache hits (99% reduction)
- **Database I/O Saved**: 99MB

**Example**:

```typescript
import { getCachedTemplates } from '$lib/server/cache/templates';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const templates = await getCachedTemplates(supabase);

	// Filter by grade and domain
	const sixiemeAlgebra = templates.filter(
		(t) => t.grades.includes('6eme') && t.domain === 'algebra'
	);

	return { templates: sixiemeAlgebra };
};
```

**Invalidation**:

```typescript
import { invalidateTemplatesCache } from '$lib/server/cache/templates';

// After publishing new templates
await supabase.from('question_templates').update({ status: 'published' }).eq('id', templateId);
await invalidateTemplatesCache();
```

**Why Redis?**:

- Templates are **global shared data** (all users see same templates)
- Large dataset (potentially thousands of records)
- Low update frequency (admin publishes templates occasionally)
- Needs cross-instance consistency
- Benefits all users (high cache hit rate)

---

## Decision Matrix

### When to Use In-Memory Cache

| Criteria                | Description                                 | Examples                                 |
| ----------------------- | ------------------------------------------- | ---------------------------------------- |
| **Data Scope**          | Per-user, session-specific                  | User profile, preferences, session state |
| **Access Pattern**      | Ultra-high frequency (>10 req/sec per user) | Role checks, auth tokens, user settings  |
| **Data Size**           | Small (<1KB per entry)                      | Single values, small objects             |
| **Consistency**         | Immediate (single instance)                 | Role changes (rare, admin-only)          |
| **Latency Requirement** | <1ms                                        | Permission checks, guards, validators    |
| **Cost Sensitivity**    | Free (no external service)                  | High-frequency operations                |
| **TTL Range**           | Short (1-15 minutes)                        | Temporary caching within request/session |

**Use Cases**:

- ✅ User profile roles
- ✅ Session authentication state
- ✅ Per-user temporary data
- ✅ Request-scoped computations
- ✅ Frequently accessed small objects

**Don't Use For**:

- ❌ Shared data across users
- ❌ Data that must persist across deployments
- ❌ Rate limiting (needs distributed state)
- ❌ Large datasets (memory constraints)

---

### When to Use Redis Cache

| Criteria                | Description                              | Examples                        |
| ----------------------- | ---------------------------------------- | ------------------------------- |
| **Data Scope**          | Shared across users/instances            | Schools, templates, public data |
| **Access Pattern**      | Medium frequency (1-10 req/sec globally) | Assessment results, school data |
| **Data Size**           | Medium-large (1KB-1MB)                   | Query results, collections      |
| **Consistency**         | Eventual (multi-instance)                | School timetable updates        |
| **Latency Requirement** | 50-100ms acceptable                      | Dashboard loads, API responses  |
| **Cost Sensitivity**    | Request quota (10K free/day)             | Moderate-frequency operations   |
| **TTL Range**           | Medium-long (10-60 minutes)              | Rarely-changing data            |

**Use Cases**:

- ✅ School data (timetables, profiles)
- ✅ Question templates (published)
- ✅ Assessment results caching
- ✅ Activity polling (cross-tab sync)
- ✅ Rate limiting (distributed)

**Don't Use For**:

- ❌ Ultra-high frequency per-user data (use in-memory)
- ❌ Data that changes very frequently (<30s TTL)
- ❌ Highly sensitive data requiring encryption at rest
- ❌ Large binary data (images, files)

---

### Quick Decision Tree

```
START: Need to cache data
  │
  ├─ Is data user-specific?
  │    ├─ YES → In-Memory Cache
  │    └─ NO → Continue
  │
  ├─ Is data shared across multiple users?
  │    ├─ YES → Redis Cache
  │    └─ NO → Database Direct
  │
  ├─ Is access frequency > 10 req/sec per user?
  │    ├─ YES → In-Memory Cache
  │    └─ NO → Continue
  │
  ├─ Does data need to persist across deployments?
  │    ├─ YES → Redis Cache
  │    └─ NO → In-Memory Cache
  │
  └─ Is implementing rate limiting?
       ├─ YES → Redis Cache (distributed state)
       └─ NO → Choose based on data size and TTL
```

---

## Performance Metrics

### In-Memory Cache Performance

| Metric                 | Value      | Notes                       |
| ---------------------- | ---------- | --------------------------- |
| **Cache Hit Latency**  | <1ms       | Memory lookup only          |
| **Cache Miss Latency** | ~50ms      | DB query + cache store      |
| **Memory per Entry**   | ~100 bytes | Small objects (role enum)   |
| **Max Entries**        | ~10,000    | Automatic cleanup every 60s |
| **Hit Rate (Profile)** | 99%        | Role changes are rare       |
| **Query Reduction**    | 99%        | 20 queries → 1 per 15 min   |

**Cost**: Free (no external service)

**Scalability**: Per-instance (scales with server instances)

---

### Redis Cache Performance

| Metric                   | Value                  | Notes                      |
| ------------------------ | ---------------------- | -------------------------- |
| **Cache Hit Latency**    | ~50ms                  | Network roundtrip to Redis |
| **Cache Miss Latency**   | ~250ms                 | DB query + Redis store     |
| **Memory per Entry**     | 1-5KB                  | JSON serialized objects    |
| **Max Entries**          | Limited by Redis quota | 256MB free tier            |
| **Hit Rate (Schools)**   | 95%                    | Timetables change rarely   |
| **Hit Rate (Templates)** | 90%                    | Publishes are infrequent   |
| **Query Reduction**      | 95-99%                 | Shared across all users    |

**Cost**:

- Free tier: 10,000 requests/day
- Paid tier: $0.20 per 100K requests

**Scalability**: Global (shared across all instances)

---

### Real-World Impact

**Scenario 1: Teacher Dashboard Load**

Without caching:

```
Profile role check:     50ms (DB query)
School data fetch:     250ms (DB query)
Templates fetch:       450ms (large query)
───────────────────────────────────
Total:                 750ms
Database load:         3 queries
```

With hybrid caching (cache HIT):

```
Profile role check:    <1ms (memory)
School data fetch:     50ms (Redis)
Templates fetch:       50ms (Redis)
───────────────────────────────────
Total:                 101ms
Database load:         0 queries
───────────────────────────────────
Improvement:           86% faster, 100% fewer queries
```

**Scenario 2: 100 Teachers at Same School**

Without caching:

```
Database queries:      100 × 3 = 300 queries
Total DB time:         100 × 750ms = 75 seconds
Database I/O:          Heavy contention
```

With hybrid caching:

```
Database queries:      1 + 1 + 1 = 3 queries (first teacher only)
Subsequent teachers:   99 × 101ms = 9.9 seconds (cache hits)
Database I/O:          99% reduction
───────────────────────────────────
Total queries:         3 (vs 300)
Query reduction:       99%
```

---

## Cache Invalidation

### In-Memory Cache Invalidation

**Automatic Expiration**:

- TTL-based: Entries expire after 15 minutes
- Cleanup runs every 60 seconds
- No manual cleanup required

**Manual Invalidation**:

```typescript
import { memoryCache, invalidateProfileCache } from '$lib/server/cache/profile';

// Invalidate single user
invalidateProfileCache(userId);

// Invalidate multiple users (pattern-based)
memoryCache.invalidatePattern(`profile:${schoolId}:`);

// Clear all cache (testing only)
memoryCache.clear();
```

**When to Invalidate**:

- ✅ Admin changes user role
- ✅ User upgrades/downgrades account
- ❌ Regular profile updates (name, email, etc.) - NOT NEEDED

---

### Redis Cache Invalidation

**Automatic Expiration**:

- TTL-based: Redis automatically removes expired keys
- Schools: 1 hour TTL
- Templates: 10 minutes TTL
- No manual cleanup required

**Manual Invalidation**:

```typescript
import { invalidateSchoolCache } from '$lib/server/cache/schools';
import { invalidateTemplatesCache } from '$lib/server/cache/templates';

// Invalidate specific school
await invalidateSchoolCache(schoolId);

// Invalidate all templates
await invalidateTemplatesCache();
```

**When to Invalidate**:

- ✅ School timetable updated
- ✅ Template published/unpublished
- ✅ School metadata changed
- ❌ Student assignments (doesn't affect cached data)

---

### Admin Invalidation API

**Endpoint**: `POST /api/admin/cache/invalidate`

**Purpose**: Manual cache invalidation for admin operations.

**Authentication**: Admin-only endpoint (role check required)

**Query Parameters**:

- `type`: Cache type (`school`, `templates`, `all`)
- `id`: Entity ID (required for `school`, omit for `templates`)

**Examples**:

```bash
# Invalidate specific school cache
curl -X POST "/api/admin/cache/invalidate?type=school&id=550e8400-e29b-41d4-a716-446655440000"

# Invalidate all templates cache
curl -X POST "/api/admin/cache/invalidate?type=templates"

# Invalidate all caches (nuclear option)
curl -X POST "/api/admin/cache/invalidate?type=all"
```

**Response**:

```json
{
	"success": true,
	"message": "School cache invalidated successfully"
}
```

**Implementation**:

```typescript
// src/routes/api/admin/cache/invalidate/+server.ts
export const POST: RequestHandler = async ({ url, locals: { supabase, user } }) => {
	// 1. Verify admin role
	const profile = await getCachedProfile(user.id, supabase);
	if (profile?.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	// 2. Parse query parameters
	const type = url.searchParams.get('type');
	const id = url.searchParams.get('id');

	// 3. Invalidate cache
	switch (type) {
		case 'school':
			if (!id) throw error(400, 'School ID required');
			await invalidateSchoolCache(id);
			return json({ success: true, message: 'School cache invalidated' });

		case 'templates':
			await invalidateTemplatesCache();
			return json({ success: true, message: 'Templates cache invalidated' });

		case 'all':
			// Invalidate all cache types
			await invalidateCache('*');
			return json({ success: true, message: 'All caches invalidated' });

		default:
			throw error(400, 'Invalid cache type');
	}
};
```

---

## Implementation Examples

### Example 1: Using Profile Cache in Load Function

```typescript
// src/routes/(protected)/dashboard/teacher/+page.server.ts
import { getCachedProfile } from '$lib/server/cache/profile';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	// 1. Get user profile with in-memory caching
	const profile = await getCachedProfile(user.id, supabase);

	if (!profile) {
		throw error(404, 'Profile not found');
	}

	// 2. Check authorization
	if (profile.role !== 'teacher') {
		throw error(403, 'Teacher access required');
	}

	// 3. Proceed with loading teacher dashboard data
	const students = await supabase.from('students').select('*').eq('teacher_id', user.id);

	return {
		role: profile.role,
		students: students.data || []
	};
};
```

**Performance**:

- First load: ~50ms (DB query for profile)
- Subsequent loads (within 15 min): <1ms (memory cache hit)
- Query reduction: 99%

---

### Example 2: Using School Cache with Timetable

```typescript
// src/routes/(protected)/dashboard/teacher/schedule/+page.server.ts
import { getCachedProfile } from '$lib/server/cache/profile';
import { getCachedSchool } from '$lib/server/cache/schools';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	// 1. Get user profile (in-memory cache)
	const profile = await getCachedProfile(user.id, supabase);

	if (!profile) {
		throw error(404, 'Profile not found');
	}

	// 2. Get full user data to access school_id
	const { data: fullProfile } = await supabase
		.from('profiles')
		.select('school_id')
		.eq('id', user.id)
		.single();

	if (!fullProfile?.school_id) {
		throw error(404, 'School not found');
	}

	// 3. Get school data with Redis caching
	const school = await getCachedSchool(fullProfile.school_id, supabase);

	if (!school) {
		throw error(404, 'School not found');
	}

	// 4. Return timetable data
	return {
		schoolName: school.name,
		timetable: school.timetable,
		currentPeriod: getCurrentPeriod(school.timetable)
	};
};

function getCurrentPeriod(timetable: unknown) {
	// Logic to determine current period based on time
	// ...
}
```

**Performance**:

- First teacher: ~250ms (DB query for school)
- Subsequent teachers (within 1 hour): ~50ms (Redis cache hit)
- Query reduction: 98% for schools with multiple teachers

---

### Example 3: Using Templates Cache

```typescript
// src/routes/(protected)/dashboard/teacher/assessments/create/+page.server.ts
import { getCachedTemplates } from '$lib/server/cache/templates';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	// 1. Get cached templates (Redis)
	const templates = await getCachedTemplates(supabase);

	// 2. Filter by query parameters
	const grade = url.searchParams.get('grade');
	const domain = url.searchParams.get('domain');

	let filtered = templates;

	if (grade) {
		filtered = filtered.filter((t) => t.grades.includes(grade));
	}

	if (domain) {
		filtered = filtered.filter((t) => t.domain === domain);
	}

	// 3. Return filtered templates
	return {
		templates: filtered,
		totalCount: templates.length
	};
};
```

**Performance**:

- First user: ~450ms (large DB query for 500+ templates)
- Subsequent users (within 10 min): ~50ms (Redis cache hit)
- Query reduction: 99% for high-traffic endpoints

---

### Example 4: Invalidating After Admin Operation

```typescript
// src/routes/(protected)/admin/schools/[id]/timetable/+page.server.ts
import { invalidateSchoolCache } from '$lib/server/cache/schools';
import type { Actions } from './$types';
import { error, fail } from '@sveltejs/kit';

export const actions: Actions = {
	updateTimetable: async ({ params, request, locals: { supabase, user } }) => {
		// 1. Verify admin role
		const profile = await getCachedProfile(user.id, supabase);
		if (profile?.role !== 'admin') {
			throw error(403, 'Admin access required');
		}

		// 2. Parse form data
		const formData = await request.formData();
		const timetableJson = formData.get('timetable') as string;

		try {
			const timetable = JSON.parse(timetableJson);

			// 3. Update school timetable in database
			const { error: updateError } = await supabase
				.from('schools')
				.update({ timetable })
				.eq('id', params.id);

			if (updateError) {
				return fail(500, { message: 'Failed to update timetable' });
			}

			// 4. Invalidate school cache immediately
			await invalidateSchoolCache(params.id);

			return { success: true };
		} catch (err) {
			return fail(400, { message: 'Invalid timetable JSON' });
		}
	}
};
```

**Invalidation Impact**:

- Next teacher loading schedule sees updated timetable immediately
- No stale data served (cache invalidated before response)
- Automatic re-caching on next access

---

## Monitoring

### Cache Logging System

For detailed cache performance monitoring and debugging, see **[Cache Logging Format](../development/cache-logging-format.md)**.

The logging system provides:

- **Real-time visibility** into cache hits/misses across all tiers
- **Performance timing** for each cache operation (Redis, RAM, DB)
- **Source identification** showing which tier served the data
- **Function-level tracing** to identify cache usage patterns

**Enable in development**:

```bash
# .env
ENABLE_CACHE_LOGS=true
```

**Example log output**:

```
[getCachedSchool][Redis][Tier-2] HIT (52ms) school:550e8400-e29b-41d4-a716-446655440000:data
[getCachedProfile][RAM Server][Tier-1] HIT (0.8ms) profile:123:role
[getCachedTemplates][Database][Source] FETCH (245ms) Published templates
```

---

### In-Memory Cache Statistics

```typescript
import { memoryCache } from '$lib/server/cache/memory';

// Get cache statistics
const stats = memoryCache.getStats();

console.log('Cache Statistics:');
console.log(`  Size: ${stats.size} entries`);
console.log(`  Hits: ${stats.hits}`);
console.log(`  Misses: ${stats.misses}`);
console.log(`  Hit Rate: ${stats.hitRate}%`);
console.log(`  Evictions: ${stats.evictions}`);
```

**Example Output**:

```
Cache Statistics:
  Size: 45 entries
  Hits: 1,230
  Misses: 15
  Hit Rate: 98.79%
  Evictions: 8
```

**Ideal Metrics**:

- Hit rate: >95%
- Size: <1,000 entries (indicates proper TTL)
- Evictions: Gradual (indicates healthy cleanup)

---

### Redis Cache Monitoring

**Upstash Dashboard**:

1. Go to https://console.upstash.com/
2. Select your database
3. Click "Metrics" tab

**Key Metrics**:

- **Request Count**: Total Redis operations
- **Commands**: GET, SETEX, KEYS, DEL distribution
- **Storage Used**: Current memory usage
- **Latency P95**: 95th percentile response time

**Ideal Values**:

- Request count: <10,000/day (free tier limit)
- GET commands: >90% (indicates good hit rate)
- Latency P95: <100ms
- Storage used: <50MB (indicates proper TTL)

---

### Health Check Endpoint

**URL**: `/api/health/redis`

**Method**: `GET`

**Response**:

```json
{
	"status": "healthy",
	"latency": 45,
	"timestamp": "2025-10-29T10:30:00.000Z"
}
```

**Usage**:

```bash
# Check Redis health
curl http://localhost:5175/api/health/redis

# Expected: {"status":"healthy","latency":45,"timestamp":"..."}
```

---

## Troubleshooting

### Issue 1: In-Memory Cache Not Working

**Symptoms**: High database query count despite cache implementation

**Causes**:

- Cache destroyed prematurely
- TTL too short
- Memory cleanup too aggressive

**Diagnosis**:

```typescript
import { memoryCache } from '$lib/server/cache/memory';

const stats = memoryCache.getStats();
console.log('Hit rate:', stats.hitRate); // Should be >90%
console.log('Cache size:', stats.size); // Should be >0
```

**Solutions**:

1. **Increase TTL**: Change TTL from 60s to 900s (15 minutes)
2. **Check cleanup interval**: Ensure not running too frequently
3. **Verify cache not destroyed**: Don't call `destroy()` outside tests

---

### Issue 2: Redis Cache Missing

**Symptoms**: All cache requests return MISS

**Causes**:

- Redis credentials not configured
- Redis instance down
- Network connectivity issues

**Diagnosis**:

```bash
# Test Redis health
curl http://localhost:5175/api/health/redis

# Check environment variables
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN
```

**Solutions**:

1. **Configure Redis**: See [Redis Setup Guide](../guides/redis-cache-setup.md)
2. **Check Upstash**: Verify instance is running in console
3. **Verify network**: Test connectivity to Upstash endpoint

---

### Issue 3: Stale Data After Updates

**Symptoms**: Users see old data after database updates

**Causes**:

- Cache not invalidated after update
- Invalidation failed silently
- Wrong cache key used

**Diagnosis**:

```typescript
// Check if cache key exists
import { redisClient } from '$lib/server/cache';
const cached = await redisClient.get('school:123:data');
console.log('Cached data:', cached); // Should be null after invalidation
```

**Solutions**:

1. **Add invalidation**: Call `invalidateSchoolCache()` after update
2. **Verify cache key**: Ensure key pattern matches
3. **Check admin API**: Use manual invalidation endpoint

---

### Issue 4: Memory Leak

**Symptoms**: Server memory usage grows continuously

**Causes**:

- Cache cleanup not running
- TTL not set properly
- Too many cache entries

**Diagnosis**:

```typescript
import { memoryCache } from '$lib/server/cache/memory';

setInterval(() => {
	const stats = memoryCache.getStats();
	console.log(`Cache size: ${stats.size}, evictions: ${stats.evictions}`);
}, 60000); // Log every minute
```

**Solutions**:

1. **Run manual cleanup**: `memoryCache.cleanup()`
2. **Reduce TTL**: Lower TTL to prevent accumulation
3. **Verify cleanup interval**: Should run every 60 seconds
4. **Check for leaks**: Ensure cache keys are properly namespaced

---

### Issue 5: High Redis Request Count

**Symptoms**: Exceeding free tier limit (10K requests/day)

**Causes**:

- TTL too short (frequent cache misses)
- Too many invalidations
- High-frequency polling

**Diagnosis**:

```
Upstash Console → Database → Metrics → Request Count

Look for:
- Spikes in SET commands (indicates frequent writes)
- High GET count with low hit rate (cache thrashing)
```

**Solutions**:

1. **Increase TTL**: Change from 300s to 600s for templates
2. **Reduce polling frequency**: Change from 30s to 60s
3. **Batch invalidations**: Group multiple invalidations together
4. **Use in-memory cache**: Move high-frequency data to memory

---

## Best Practices

### 1. Choose the Right Cache Tier

✅ **DO**:

- Use in-memory cache for per-user data (profile roles)
- Use Redis cache for shared data (schools, templates)
- Use database direct for frequently-changing data (<30s TTL)

❌ **DON'T**:

- Don't use Redis for ultra-high frequency per-user data
- Don't use in-memory cache for data that must persist
- Don't cache data that changes every request

---

### 2. Set Appropriate TTLs

✅ **DO**:

- Profile roles: 15 minutes (changes are rare)
- Schools: 1 hour (timetables change yearly)
- Templates: 10 minutes (publishes are occasional)

❌ **DON'T**:

- Don't use infinite TTL (causes stale data)
- Don't use <30s TTL for Redis (wasteful)
- Don't use >1 hour TTL for user data

---

### 3. Invalidate Eagerly

✅ **DO**:

- Invalidate immediately after database updates
- Use fire-and-forget for invalidation (non-blocking)
- Provide admin invalidation API for manual control

❌ **DON'T**:

- Don't wait for TTL expiration for critical updates
- Don't block user requests waiting for invalidation
- Don't invalidate on every read (defeats caching purpose)

---

### 4. Monitor Cache Performance

✅ **DO**:

- Check cache hit rate regularly (target: >90%)
- Monitor Redis request count (stay under quotas)
- Log cache statistics in development
- Use health check endpoints

❌ **DON'T**:

- Don't ignore low hit rates (<70%)
- Don't exceed Redis free tier without monitoring
- Don't disable cache logging in development

---

### 5. Handle Cache Failures Gracefully

✅ **DO**:

- Always provide database fallback
- Catch cache errors and log them
- Return fresh data on cache errors
- Design for "fail-open" behavior

❌ **DON'T**:

- Don't throw errors on cache misses
- Don't break application if Redis is down
- Don't assume cache is always available

---

### 6. Test Cache Behavior

✅ **DO**:

- Write unit tests for cache helpers
- Test cache hit/miss scenarios
- Test cache invalidation logic
- Test graceful degradation

❌ **DON'T**:

- Don't skip cache tests
- Don't test only happy path
- Don't forget to test TTL expiration

---

## Summary

The hybrid cache system provides:

1. **Two Cache Tiers**: In-memory (per-user) + Redis (shared data)
2. **Three Cache Modules**: Profile (memory), Schools (Redis), Templates (Redis)
3. **Smart Cache Selection**: Automatic tier selection based on data patterns
4. **Graceful Degradation**: Works without caching if Redis unavailable
5. **Manual Invalidation**: Admin API for explicit cache control

**Key Takeaway**: Use in-memory cache for per-user data, Redis cache for shared data, and direct database queries for frequently-changing data.

---

## See Also

- [Redis Setup Guide](../guides/redis-cache-setup.md) - How to configure Redis
- [Redis Caching Architecture](redis-caching.md) - Deep dive into Redis cache
- [Performance Optimization](performance.md) - Overall performance strategies

---

**Last Updated**: 2025-10-29
**Maintained By**: Development Team
