# Cache Strategy with Upstash Redis

UbuMaths uses Upstash Redis for serverless-friendly caching and rate limiting.

## Overview

**Cache Library**: `src/lib/server/cache.ts`
**Provider**: Upstash Redis (REST API)
**Free Tier**: 10K requests/day, 256MB storage
**Use Cases**: Application cache, rate limiting, temporary data storage

## Architecture

### Redis Client

```typescript
import { redis } from '$lib/server/cache';

// REST API client (serverless-friendly)
// Credentials from environment: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
```

### Key Namespacing

All cache keys follow a structured namespace pattern:

```
{type}:{entity}:{id}:{subtype}:{testMode}
```

**Examples**:

- `cache:assessment:123:results:false` - Assessment results (production)
- `cache:activity:user-456:counts` - Activity counts
- `ratelimit:login:ip:192.168.1.1` - Rate limit counter

**Benefits**:

- Pattern-based invalidation (`cache:assessment:123:*`)
- Clear separation of concerns
- Test mode isolation

## Usage Patterns

### 1. Basic Caching with `getCached()`

Generic cache wrapper with automatic fallback:

```typescript
import { getCached, CACHE_KEYS, TTL } from '$lib/server/cache';

// Cache expensive database query
const results = await getCached(
	CACHE_KEYS.ASSESSMENT_RESULTS(assessmentId, false),
	TTL.ASSESSMENT_RESULTS,
	async () => {
		// Fallback function - called on cache miss
		return await supabase.from('assessment_results').select('*').eq('assessment_id', assessmentId);
	}
);
```

**Features**:

- Automatic cache miss handling
- Fire-and-forget cache writes (non-blocking)
- Graceful Redis error handling (always returns data)

### 2. Cache Invalidation

Invalidate cache keys by pattern:

```typescript
import { invalidateCache } from '$lib/server/cache';

// Invalidate all caches for assessment 123
await invalidateCache('cache:assessment:123:*');

// Invalidate all activity counts
await invalidateCache('cache:activity:*');

// Invalidate specific key
await invalidateCache(CACHE_KEYS.ASSESSMENT_RESULTS('123', false));
```

**When to invalidate**:

- After data mutations (create, update, delete)
- After student submissions
- After assessment grading

**Example in API endpoint**:

```typescript
export const POST: RequestHandler = async ({ request }) => {
	// ... update assessment results

	// Invalidate cache
	await invalidateCache(`cache:assessment:${assessmentId}:*`);

	return json({ success: true });
};
```

### 3. Rate Limiting

Protect endpoints from abuse:

```typescript
import { checkRateLimit, CACHE_KEYS, TTL } from '$lib/server/cache';
import { error } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const clientIp = getClientAddress();

	// Check rate limit: max 5 login attempts per 15 minutes
	const { allowed, remaining, retryAfter } = await checkRateLimit(
		CACHE_KEYS.RATE_LIMIT_LOGIN_IP(clientIp),
		5,
		TTL.RATE_LIMIT_LOGIN
	);

	if (!allowed) {
		throw error(429, {
			message: `Trop de tentatives. Réessayez dans ${retryAfter} secondes`,
			retryAfter
		});
	}

	// ... process login

	return json({ success: true, remaining });
};
```

**Features**:

- Atomic counters (thread-safe)
- Sliding window (TTL-based)
- Fail-open on Redis errors (prevents DoS)
- Returns `retry-after` for HTTP 429 headers

## TTL Strategy

Cache durations are optimized for data volatility:

```typescript
export const TTL = {
	ASSESSMENT_RESULTS: 300, // 5 minutes (rarely changes)
	DASHBOARD_DATA: 60, // 1 minute (frequently updated)
	ACTIVITY_COUNTS: 30, // 30 seconds (matches polling)
	RATE_LIMIT_LOGIN: 900, // 15 minutes
	RATE_LIMIT_SIGNUP: 3600 // 1 hour
} as const;
```

**Guidelines**:

- **Long TTL (5-60 min)**: Historical data, completed assessments, aggregated stats
- **Medium TTL (30-60 sec)**: Dashboard data, activity counts, live progress
- **Short TTL (<30 sec)**: Real-time data, frequently changing counts
- **Rate limits**: Match security requirements (15 min - 1 hour)

## Cache Keys Reference

### Application Cache

```typescript
// Assessment data
CACHE_KEYS.ASSESSMENT_RESULTS(assessmentId: string, isTestMode: boolean);
CACHE_KEYS.ASSESSMENT_STATS(assessmentId: string, isTestMode: boolean);

// Teacher data
CACHE_KEYS.TEACHER_CLASSES(teacherId: string, isTestMode: boolean);

// Activity tracking
CACHE_KEYS.ACTIVITY_COUNTS(userId: string);
```

### Rate Limiting

```typescript
// Authentication
CACHE_KEYS.RATE_LIMIT_LOGIN_IP(ip: string);
CACHE_KEYS.RATE_LIMIT_LOGIN_EMAIL(email: string);
CACHE_KEYS.RATE_LIMIT_SIGNUP(ip: string);
CACHE_KEYS.RATE_LIMIT_OAUTH(ip: string);

// Features
CACHE_KEYS.RATE_LIMIT_CHAT(userId: string);
```

## Error Handling

The cache system is designed to be **fail-safe**:

### Cache Failures

```typescript
// Redis error → Fallback to direct fetch
// User experience: Slower response (no cache hit), but no errors
try {
	const cached = await redis.get(key);
	if (cached) return cached;
} catch (err) {
	console.error('[Cache] Redis error, using fallback:', err);
	return fallback(); // Always returns data
}
```

### Rate Limit Failures

```typescript
// Redis error → Fail open (allow request)
// Security: Prefer availability over strict rate limiting
try {
	const count = await redis.incr(key);
	return { allowed: count <= maxAttempts };
} catch (err) {
	console.error('[RateLimit] Redis error, failing open:', err);
	return { allowed: true }; // Don't block users on Redis failure
}
```

## Implementation Checklist

When adding caching to an endpoint:

- [ ] Define cache key in `CACHE_KEYS`
- [ ] Choose appropriate TTL from `TTL` constants
- [ ] Use `getCached()` wrapper for automatic fallback
- [ ] Invalidate cache on mutations (create/update/delete)
- [ ] Test cache hits and misses
- [ ] Test Redis error handling (fallback)
- [ ] Add logging in development mode

## Environment Setup

### Local Development

```bash
# .env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### Production (Vercel)

Set environment variables in Vercel dashboard:

1. Go to Project Settings → Environment Variables
2. Add `UPSTASH_REDIS_REST_URL` (production value)
3. Add `UPSTASH_REDIS_REST_TOKEN` (production value)

### Getting Upstash Credentials

1. Go to https://console.upstash.com/
2. Create account (free tier: 10K req/day, 256MB)
3. Create Redis database (select region closest to Vercel)
4. Copy REST URL and token from database dashboard
5. Add to `.env` and Vercel

## Monitoring

### Cache Logging System

For detailed cache monitoring and debugging, UbuMaths implements a standardized logging format. See **[Cache Logging Format](../development/cache-logging-format.md)** for complete documentation.

**Enable in development**:

```bash
# .env
ENABLE_CACHE_LOGS=true
```

**Log format**:

```
[functionName][source][Tier-X] STATUS (timing) details
```

**Example logs**:

```
[getCached][Redis][Tier-2] HIT (52ms) cache:assessment:123:results:false
[getCached][Redis][Tier-2] MISS (3ms) cache:assessment:456:results:false
[getCached][Database][Source] FETCH (245ms) Assessment results
```

**Benefits**:

- Real-time visibility into cache performance
- Identify cache hit/miss patterns
- Debug cache key issues
- Measure tier-specific latency
- Track cache invalidation operations

---

### Development Mode

Cache operations are logged in development:

```json
{
	"type": "cache_metrics",
	"operation": "hit",
	"key": "cache:assessment:123",
	"timestamp": "2025-10-28T14:00:00.000Z"
}
```

### Production

Monitor via Upstash Console:

- Request count (daily limit: 10K)
- Storage usage (limit: 256MB)
- Command latency (avg 1-5ms REST API)

## Performance Considerations

### Request Budget

Free tier: **10K requests/day** ≈ **417 req/hour** ≈ **7 req/minute**

**Optimization strategies**:

1. **Longer TTLs** for stable data (reduces cache misses)
2. **Batch invalidations** instead of per-key deletes
3. **Fire-and-forget writes** (don't wait for confirmation)
4. **Pattern-based deletes** (`cache:assessment:*` instead of individual keys)

### Cache Hit Rate

**Target**: 80%+ cache hit rate for frequently accessed data

**Measure**:

```typescript
// Count hits vs misses in getCached()
const metrics = {
	hits: 0,
	misses: 0,
	get hitRate() {
		return this.hits / (this.hits + this.misses);
	}
};
```

### Latency

- **Cache hit**: ~1-5ms (REST API)
- **Cache miss + DB query**: ~50-200ms
- **Redis error + fallback**: ~50-200ms (same as cache miss)

## Testing

Unit tests: `tests/unit/cache.test.ts`

**Coverage**:

- ✅ Cache hits return cached data
- ✅ Cache misses call fallback
- ✅ Redis errors use fallback
- ✅ Rate limiting blocks after max attempts
- ✅ Rate limits reset after TTL
- ✅ Fail-open on Redis errors

**Run tests**:

```bash
pnpm test:unit cache.test.ts
```

## Migration Guide

### Adding Cache to Existing Endpoint

**Before** (no cache):

```typescript
export const load: PageServerLoad = async ({ params }) => {
	const results = await supabase
		.from('assessment_results')
		.select('*')
		.eq('assessment_id', params.id);

	return { results };
};
```

**After** (with cache):

```typescript
import { getCached, CACHE_KEYS, TTL } from '$lib/server/cache';

export const load: PageServerLoad = async ({ params }) => {
	const results = await getCached(
		CACHE_KEYS.ASSESSMENT_RESULTS(params.id, false),
		TTL.ASSESSMENT_RESULTS,
		async () => {
			return await supabase.from('assessment_results').select('*').eq('assessment_id', params.id);
		}
	);

	return { results };
};
```

**Invalidation endpoint**:

```typescript
// api/assessments/[id]/submit/+server.ts
export const POST: RequestHandler = async ({ params }) => {
	// ... save submission

	// Invalidate cache
	await invalidateCache(`cache:assessment:${params.id}:*`);

	return json({ success: true });
};
```

## Best Practices

### DO ✅

- Use `getCached()` wrapper for all caching
- Invalidate on mutations (create/update/delete)
- Use pattern-based invalidation (`cache:assessment:*`)
- Set appropriate TTLs based on data volatility
- Test Redis error handling
- Log metrics in development

### DON'T ❌

- Don't use raw `redis.get()` without fallback
- Don't cache sensitive data (passwords, tokens)
- Don't set unlimited TTLs
- Don't block requests on cache writes
- Don't fail-closed on Redis errors (rate limits can fail-open)
- Don't cache user sessions (Supabase Auth handles this)

## Future Enhancements

Potential improvements (not yet implemented):

- [ ] Cache compression for large objects (JSON.stringify)
- [ ] Cache warming on deploy (preload hot paths)
- [ ] Distributed locks for expensive operations
- [ ] Cache analytics dashboard
- [ ] Automatic TTL adjustment based on hit rate
- [ ] Redis Pub/Sub for cache invalidation across instances

## Related Documentation

- [Database Schema](./database-schema.md)
- [Performance Optimization](../development/performance-optimization.md)
- [Security Best Practices](../guides/security-best-practices.md)
