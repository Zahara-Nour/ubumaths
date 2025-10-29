# Redis Cache Setup Guide

> Step-by-step guide to configure Redis caching locally and in production

**Last Updated**: 2025-10-28
**Target Audience**: New developers, DevOps

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Setup](#local-setup)
3. [Production Setup (Vercel)](#production-setup-vercel)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)
6. [Next Steps](#next-steps)

---

## Overview

### Hybrid Cache Strategy

UbuMaths uses a hybrid caching approach combining two cache tiers:

- **In-Memory Cache**: Per-user data (profile roles, preferences)
  - Zero latency (< 1ms)
  - No setup required
  - Automatic cleanup
  - Per-instance isolation

- **Redis Cache**: Shared data (schools, templates, assessment results)
  - Low latency (~50ms)
  - Requires Upstash configuration (this guide)
  - Cross-instance consistency
  - Global data sharing

See [Hybrid Cache System](../architecture/hybrid-cache-system.md) for architecture details.

---

## Prerequisites

Before setting up Redis cache, ensure you have:

- ✅ Node.js 18+ installed
- ✅ pnpm package manager installed
- ✅ UbuMaths repository cloned
- ✅ Dependencies installed (`pnpm install`)
- ✅ Supabase configured (`.env` file with database credentials)

**Optional**:

- GitHub account (for signing up to Upstash)
- Vercel account (for production deployment)

**Note**: In-memory cache works without any setup. This guide is only for configuring Redis (Tier 2 cache).

---

## Local Setup

### Step 1: Create Upstash Account

1. **Go to Upstash Console**: https://console.upstash.com/

2. **Sign up** with one of:
   - GitHub account (recommended)
   - Google account
   - Email + password

3. **Verify email** (if using email signup)

**Cost**: Free tier is sufficient for development

- 10,000 requests/day
- 256MB storage
- No credit card required

---

### Step 2: Create Redis Database

1. **Click "Create Database"** in Upstash console

2. **Configure database**:
   - **Name**: `ubumaths-dev` (or any descriptive name)
   - **Type**: Select **"Regional"**
   - **Region**: Choose **closest to you** for best latency
     - Europe: `eu-west-1` (Ireland)
     - North America: `us-east-1` (Virginia)
     - Asia: `ap-southeast-1` (Singapore)
   - **TLS**: ✅ Enabled (recommended)
   - **Eviction**: `noeviction` (default)

3. **Click "Create"**

**Wait ~30 seconds** for database provisioning.

---

### Step 3: Get Redis Credentials

1. **Open your database** in Upstash console

2. **Click "REST API" tab**

3. **Copy credentials**:
   - `UPSTASH_REDIS_REST_URL` (e.g., `https://caring-bird-12345.upstash.io`)
   - `UPSTASH_REDIS_REST_TOKEN` (e.g., `AXKxASQ...`)

**Security Note**: These are sensitive credentials. Never commit to git!

---

### Step 4: Configure Local Environment

1. **Open `.env` file** in project root:

   ```bash
   cd /path/to/ubumaths
   nano .env  # or use your favorite editor
   ```

2. **Add Redis credentials**:

   ```bash
   # Redis Cache (Upstash)
   UPSTASH_REDIS_REST_URL=https://caring-bird-12345.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AXKxASQdGxlYW1wbGVfcmVzdF90b2tlbg==
   ```

3. **Save and close** the file

4. **Verify `.env` is in `.gitignore`**:
   ```bash
   grep ".env" .gitignore
   # Should output: .env
   ```

---

### Step 5: Understanding Environment Variable Loading

**How it works** (added 2025-10-28):

The application uses two mechanisms to ensure environment variables load correctly:

1. **Explicit loading in `vite.config.ts`**:

   ```typescript
   const env = loadEnv(mode, process.cwd(), '');
   Object.assign(process.env, env);
   ```

   This merges `.env` file contents into `process.env` before the server starts.

2. **Lazy initialization in `cache.ts`**:
   ```typescript
   // Redis client created on first use (during request)
   // Not at module import time
   function getRedisClient(): Redis {
   	if (!redisClient) {
   		const url = process.env.UPSTASH_REDIS_REST_URL;
   		const token = process.env.UPSTASH_REDIS_REST_TOKEN;
   		// ... create client
   	}
   	return redisClient;
   }
   ```

**Why this matters**: Prevents timing issues where module-level code runs before environment variables are loaded.

**Technical Details**: See [Environment Variable Loading Fix](../troubleshooting/env-loading-fix.md)

---

### Step 6: Test Redis Connection

1. **Start dev server**:

   ```bash
   pnpm dev -- --port 5175
   ```

2. **Look for initialization message** in logs:

   ```
   ✅ Environment variables validated successfully
   ```

3. **Test Redis health endpoint**:

   ```bash
   curl http://localhost:5175/api/health/redis
   ```

4. **Expected output**:
   ```json
   {
   	"status": "healthy",
   	"latency": 45,
   	"timestamp": "2025-10-28T10:30:00.000Z"
   }
   ```

**If it fails**: See [Troubleshooting](#troubleshooting) section below.

---

### Step 7: Verify Cache in Action

1. **Open application** in browser:

   ```
   http://localhost:5175
   ```

2. **Login as teacher**:
   - Email: `teacher@voltairedoha.com`
   - Password: `test-password-secure-123`

3. **Navigate to assessment results** (any assessment)

4. **Check dev server logs** for cache messages:

   ```
   [Cache] Cache miss for cache:assessment:123
   [Cache] Set cache key cache:assessment:123 (TTL: 300s)
   ```

5. **Refresh page** and look for cache hit:
   ```
   [Cache] Cache hit for cache:assessment:123
   ```

**Success!** Cache is working locally.

---

## Production Setup (Vercel)

### Step 1: Create Production Redis Database

**Option A: Use same database as dev** (not recommended for production)

**Option B: Create separate production database** (recommended):

1. **Go to Upstash console**: https://console.upstash.com/

2. **Click "Create Database"**

3. **Configure**:
   - **Name**: `ubumaths-prod`
   - **Type**: **"Regional"**
   - **Region**: **Same as Vercel deployment region**
     - Check Vercel project settings → Deployments → Region
     - Match region for lowest latency
   - **TLS**: ✅ Enabled
   - **Eviction**: `noeviction`

4. **Copy production credentials**:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

---

### Step 2: Add Environment Variables in Vercel

1. **Go to Vercel dashboard**: https://vercel.com/dashboard

2. **Select your project** (UbuMaths)

3. **Click "Settings" tab**

4. **Click "Environment Variables" in left sidebar**

5. **Add Redis credentials**:

   **Variable 1**:
   - **Key**: `UPSTASH_REDIS_REST_URL`
   - **Value**: `https://your-prod-redis.upstash.io`
   - **Environment**: ✅ Production, ✅ Preview, ✅ Development

   **Variable 2**:
   - **Key**: `UPSTASH_REDIS_REST_TOKEN`
   - **Value**: `your_production_token_here`
   - **Environment**: ✅ Production, ✅ Preview, ✅ Development

6. **Click "Save"**

---

### Step 3: Redeploy Application

**Option A: Trigger new deployment** (recommended):

1. Go to **Deployments** tab
2. Click **"Redeploy"** on latest deployment
3. Wait for build to complete

**Option B: Push new commit**:

```bash
git commit --allow-empty -m "chore: redeploy with Redis env vars"
git push origin main
```

---

### Step 4: Verify Production Cache

1. **Open production URL**: `https://ubumaths.vercel.app`

2. **Test health endpoint**:

   ```bash
   curl https://ubumaths.vercel.app/api/health/redis
   ```

3. **Expected output**:

   ```json
   {
   	"status": "healthy",
   	"latency": 30,
   	"timestamp": "2025-10-28T10:30:00.000Z"
   }
   ```

4. **Check Vercel logs** for cache messages:
   - Go to **Deployments** tab
   - Click latest deployment
   - Click **"Functions"** tab
   - Look for cache logs

**Success!** Production cache is working.

---

## Verification

### Verify Cache is Working

#### 1. Check Response Times

**Without cache** (first request):

```bash
time curl -s "https://ubumaths.vercel.app/dashboard/teacher/assessments/123/results" > /dev/null
# ~0.4s
```

**With cache** (second request):

```bash
time curl -s "https://ubumaths.vercel.app/dashboard/teacher/assessments/123/results" > /dev/null
# ~0.05s (8x faster!)
```

#### 2. Check Upstash Dashboard

1. **Go to Upstash console**: https://console.upstash.com/
2. **Select your database**
3. **Click "Metrics" tab**
4. **Verify**:
   - Request count increasing
   - Commands executed (GET, SETEX, KEYS, DEL)
   - Storage used

#### 3. Check Cache Keys

1. **In Upstash console**, click **"Data Browser"** tab

2. **Look for keys**:
   - `cache:assessment:*:results:*`
   - `cache:activity:*:counts`
   - `ratelimit:login:ip:*`

3. **Inspect key** by clicking on it:
   - See value (JSON data)
   - See TTL (time to live in seconds)

#### 4. Test Rate Limiting

1. **Attempt 6 failed logins** from same IP:

   ```bash
   for i in {1..6}; do
     curl -X POST https://ubumaths.vercel.app/auth/signin \
       -d "email=test@example.com&password=wrong" \
       -c cookies.txt -b cookies.txt
     echo "Attempt $i"
   done
   ```

2. **6th attempt should show**: "Trop de tentatives. Réessayez dans X minutes."

---

## Troubleshooting

For comprehensive troubleshooting, see [Troubleshooting Guide](../troubleshooting/README.md).

### Issue 1: Environment Variables Not Loading

**Error message**: `[Upstash Redis] The 'url' property is missing or undefined`

**Cause**: Environment variables not loaded at module initialization time

**Solution**: See [Environment Variable Loading Fix](../troubleshooting/env-loading-fix.md) for complete technical explanation.

**Quick Summary**:

- The application uses **lazy initialization** to ensure env vars are loaded before Redis client creation
- Vite's `loadEnv()` is explicitly called in `vite.config.ts` to merge env vars into `process.env`
- This issue should be resolved as of 2025-10-28

**If you still encounter this**:

1. Verify `.env` file exists in project root
2. Restart dev server
3. Check for typos in variable names

---

### Issue 2: "Redis connection failed"

**Error message**: `[Cache] Redis error, using fallback: Error: fetch failed`

**Cause**: Invalid or missing credentials

**Fix**:

1. **Check environment variables**:

   ```bash
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
   ```

2. **Verify credentials** in Upstash console (REST API tab)

3. **Re-copy credentials** (tokens can be regenerated)

4. **Restart dev server**:
   ```bash
   # Kill server (Ctrl+C)
   pnpm dev -- --port 5175
   ```

---

### Issue 2: Cache not found in production

**Symptoms**: `/api/health/redis` returns 503 in production

**Cause**: Environment variables not set in Vercel

**Fix**:

1. **Go to Vercel** → Settings → Environment Variables
2. **Verify both variables exist**:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. **Check environment selection** (Production/Preview/Development)
4. **Redeploy application**

---

### Issue 3: High latency (> 200ms)

**Symptoms**: Cache responses slow

**Causes**:

- Redis region far from Vercel deployment region
- Network issues
- Redis overloaded

**Fix**:

1. **Check Redis region** matches Vercel region:
   - Upstash: See database details
   - Vercel: Settings → Deployments → Region

2. **Create new Redis database** in correct region if needed

3. **Update environment variables** with new credentials

---

### Issue 4: Rate limit not working

**Symptoms**: Can exceed login attempts without blocking

**Cause**: Redis not configured (application fails open)

**Fix**:

1. **Verify Redis is configured** (Step 1-4 above)

2. **Test Redis connection**:

   ```bash
   curl http://localhost:5175/api/health/redis
   ```

3. **Check rate limit logs**:

   ```bash
   # Dev server logs should show:
   [RateLimit] Checking rate limit for IP: 192.168.1.1
   ```

4. **If logs missing**, rate limit code not called (check implementation)

---

### Issue 5: "Request limit exceeded" (10K/day)

**Symptoms**: Redis errors after many requests

**Cause**: Exceeded free tier limit (10,000 requests/day)

**Fix Options**:

**Option 1: Optimize cache usage** (recommended first):

1. **Increase TTLs** (fewer cache misses):

   ```typescript
   const TTL = {
   	ACTIVITY_COUNTS: 60 // 60s instead of 30s
   };
   ```

2. **Reduce polling frequency**:
   ```typescript
   activityStore.startPolling(60000); // 60s instead of 30s
   ```

**Option 2: Upgrade to paid tier**:

1. **Go to Upstash console** → Billing
2. **Upgrade to Pro**: $0.20 per 100K requests
3. **Cost estimate**:
   - 100K requests/day = $60/month
   - 1M requests/day = $600/month

---

## Teacher Dashboard Caches

The teacher dashboard uses three independent caches for optimal performance and cache hit rates.

### Students Cache

**Purpose**: Student profiles (names, avatars, roles)

- **TTL**: 10 minutes (600s) - profiles change infrequently
- **Keys**: `students:teacher:{teacherId}:class:{classId}:{testMode}`
- **Data Stored**: `id, firstname, lastname, full_name, avatar_url, role, gender, is_test`
- **Invalidation Triggers**:
  - Student CSV imports
  - Profile updates (name, avatar, role changes)
  - Event Bus `students` or `all` events

**Example Redis Key**:

```
students:teacher:550e8400-e29b-41d4-a716-446655440000:class:abc-123:false
```

**Cache Hit Rate**: 95%+ (profiles rarely change)

---

### Gidouilles Cache

**Purpose**: Rewards and VIP cards

- **TTL**: 5 minutes (300s) - updated moderately
- **Keys**: `gidouilles:class:{classId}:{testMode}`
- **Data Stored**: `student_id, gidouilles, vip_cards`
- **Invalidation Triggers**:
  - Gidouilles awarded/removed
  - VIP cards awarded/removed
  - Bulk reward operations
  - Event Bus `gidouilles` or `all` events

**Example Redis Key**:

```
gidouilles:class:abc-123:false
```

**Cache Hit Rate**: 85%+ (moderate update frequency)

**Features**:

- Optimistic updates with rollback
- Debounced server sync (500ms)
- Instant UI feedback

---

### Warnings Cache

**Purpose**: Warning counts by academic period

- **TTL**: 3 minutes (180s) - updated frequently in active periods
- **Keys**: `warnings:class:{classId}:period:{periodId}:{testMode}`
- **Data Stored**: Warning counts (C, M, R, T), total, score, full warning records
- **Invalidation Triggers**:
  - Warning created/deleted
  - Academic period changed
  - Event Bus `warnings` or `all` events

**Example Redis Key**:

```
warnings:class:abc-123:period:def-456:false
```

**Cache Hit Rate**: 80%+ (frequent updates during active periods)

**Features**:

- Period-scoped cache (separate cache per academic period)
- Asymmetric debouncing (ADD debounced 500ms, REMOVE immediate)
- Optimistic updates with rollback

---

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│          TEACHER DASHBOARD                      │
│  ┌──────────────────────────────────────────┐   │
│  │         CLIENT-SIDE CACHES               │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐     │   │
│  │  │Students│  │Gidouil-│  │Warnings│     │   │
│  │  │(10min) │  │les(5m) │  │ (3min) │     │   │
│  │  └───┬────┘  └───┬────┘  └───┬────┘     │   │
│  │      └───────────┼───────────┘          │   │
│  │                  ▼                       │   │
│  │        ┌──────────────────┐              │   │
│  │        │   EVENT BUS      │              │   │
│  │        │ (Pub/Sub System) │              │   │
│  │        └──────────────────┘              │   │
│  └──────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────┘
                  │
         ┌────────▼────────┐
         │  API ENDPOINTS  │
         │  ┌───────────┐  │
         │  │   REDIS   │  │
         │  │ (Upstash) │  │
         │  └─────┬─────┘  │
         │        │        │
         │  ┌─────▼─────┐  │
         │  │ Supabase  │  │
         │  └───────────┘  │
         └─────────────────┘
```

**Why Three Caches?**

1. **Different update frequencies**: Profiles change rarely, warnings change frequently
2. **Granular invalidation**: Only invalidate what changed (not everything)
3. **Optimal TTLs**: Longer TTL for stable data = higher cache hit rate
4. **Simpler debugging**: Clear separation of concerns

**Event Bus Coordination**:

- Components subscribe to cache invalidation events
- Mutations publish events to invalidate affected caches
- Automatic synchronization across components
- Future: Multi-tab sync with BroadcastChannel

**For comprehensive architecture details**: See [Teacher Dashboard Cache Architecture](../architecture/teacher-dashboard-cache.md)

---

## Cache Types (Hybrid System)

UbuMaths implements a hybrid cache strategy with two tiers:

### In-Memory Cache (Tier 1)

**Purpose**: Per-user data with ultra-low latency

**Features**:

- Zero configuration required
- <1ms latency (memory lookup)
- Automatic TTL-based cleanup
- Per-instance isolation

**Modules**:

- **Profile Cache**: User role checks (15min TTL)

**Usage**:

```typescript
import { getCachedProfile } from '$lib/server/cache/profile';

const profile = await getCachedProfile(userId, supabase);
if (profile?.role === 'admin') {
	// User is admin
}
```

**No Setup Required**: Works out of the box!

---

### Redis Cache (Tier 2)

**Purpose**: Shared data across multiple users/instances

**Features**:

- ~50ms latency (network roundtrip)
- Cross-instance consistency
- Requires Upstash configuration (this guide)
- Distributed rate limiting

**Modules**:

- **Schools Cache**: School data, timetables (1hour TTL)
- **Templates Cache**: Published question templates (10min TTL)
- **Assessment Results**: Cached results (5min TTL)
- **Activity Polling**: Dashboard activity counts (30s TTL)

**Usage**:

```typescript
import { getCachedSchool } from '$lib/server/cache/schools';
import { getCachedTemplates } from '$lib/server/cache/templates';

const school = await getCachedSchool(schoolId, supabase);
const templates = await getCachedTemplates(supabase);
```

**Setup Required**: Follow this guide to configure Redis.

---

## Next Steps

### After Setup

Now that Redis cache is configured, you can:

1. **Learn cache patterns**:
   - [Hybrid Cache System](../architecture/hybrid-cache-system.md) - Two-tier architecture ⭐
   - [Redis Caching Architecture](../architecture/redis-caching.md) - General caching patterns
   - [Teacher Dashboard Cache Architecture](../architecture/teacher-dashboard-cache.md) - Three-cache system

2. **Add cache to new endpoints**: Follow [Migration Guide](../architecture/redis-caching.md#migration-guide)

3. **Monitor cache performance**:
   - Upstash dashboard: Request count, latency, errors
   - Vercel analytics: Response times

4. **Run cache tests**:

   ```bash
   # Unit tests
   pnpm test:unit tests/unit/cache.test.ts
   pnpm test:unit tests/unit/*-cache.test.ts

   # E2E tests
   npx playwright test e2e/redis-cache
   ```

5. **Optimize cache strategy**:
   - Adjust TTLs based on data freshness requirements
   - Monitor cache hit rate (target: 85%+)
   - Identify cache thrashing (high miss rate)

---

## Advanced Configuration

### Multiple Environments

**Pattern**: Separate Redis databases for dev/staging/prod

**Setup**:

1. **Create 3 databases** in Upstash:
   - `ubumaths-dev`
   - `ubumaths-staging`
   - `ubumaths-prod`

2. **Configure Vercel environment variables**:
   - **Development**: Use `ubumaths-dev` credentials
   - **Preview**: Use `ubumaths-staging` credentials
   - **Production**: Use `ubumaths-prod` credentials

**Benefits**:

- Isolated cache per environment
- Test cache invalidation without affecting production
- Monitor environment-specific metrics

---

### Monitoring & Alerts

**Setup Upstash alerts**:

1. **Go to Upstash console** → Database → Alerts
2. **Create alert** for:
   - Request count > 9,000/day (approaching limit)
   - Error rate > 1%
   - Latency P95 > 100ms

**Vercel monitoring**:

1. **Enable Vercel Analytics** (Settings → Analytics)
2. **Monitor metrics**:
   - Response time P95 (target: < 200ms)
   - Error rate (target: < 1%)
   - Cache hit rate (custom metric)

---

## Security Best Practices

### ✅ DO

1. **Use separate databases** for dev/staging/prod
2. **Rotate tokens** every 90 days
3. **Enable TLS** for all Redis connections
4. **Never commit** credentials to git
5. **Use environment variables** for all config
6. **Monitor access logs** for suspicious activity

### ❌ DON'T

1. **Don't share credentials** between team members (use individual accounts)
2. **Don't use production Redis** for local development
3. **Don't disable TLS** (even in dev)
4. **Don't hardcode** Redis URLs in code
5. **Don't expose Redis credentials** in client-side code
6. **Don't forget to revoke** old tokens when rotating

---

## Cost Estimation

### Free Tier (Sufficient for most dev work)

- **Requests**: 10,000/day
- **Storage**: 256MB
- **Cost**: $0/month

**Typical usage** (single developer):

- ~1,000 requests/day during active development
- **Cost**: Free

---

### Paid Tier (Production scale)

**Scenario**: 100 active users

- **Activity polling**: 28,800 requests/day (with cache)
- **Assessment views**: ~1,000 requests/day
- **Rate limiting**: ~500 requests/day
- **Total**: ~30,000 requests/day

**Cost**: $0.20 per 100K requests = **$6/month**

---

**Scenario**: 1,000 active users

- **Activity polling**: 288,000 requests/day
- **Assessment views**: ~10,000 requests/day
- **Rate limiting**: ~5,000 requests/day
- **Total**: ~300,000 requests/day

**Cost**: $0.20 per 100K requests = **$60/month**

---

**Comparison** (without cache):

- **Database queries**: 5,770,000/day
- **Supabase cost**: $3,670/month
- **With Redis cache**: $60/month
- **Savings**: $3,610/month (98% reduction)

---

## FAQ

### Q: Do I need Redis for local development?

**A**: No, Redis is optional. The application works without it (fails open).

**Recommendation**: Configure Redis locally to match production behavior and test cache functionality.

---

### Q: Can I use a different Redis provider?

**A**: Yes, but Upstash is recommended because:

- Serverless-friendly (REST API, no persistent connections)
- Free tier sufficient for development
- Automatic TTL expiration
- Multi-region support

**Alternatives**:

- Redis Cloud (similar pricing)
- AWS ElastiCache (more expensive, requires VPC)
- Self-hosted Redis (requires maintenance)

**Note**: May require code changes if using different client library.

---

### Q: What happens if Redis goes down?

**A**: Application continues working with reduced performance:

- Cache hits → Database queries (slower)
- Rate limiting → Disabled (fails open)
- No user-facing errors

**Fail-safe design**: Redis enhances performance but isn't required for functionality.

---

### Q: How do I clear the cache?

**Method 1: Via Upstash Dashboard**

1. Go to Data Browser
2. Select keys to delete
3. Click "Delete"

**Method 2: Via code (invalidation)**

```typescript
import { invalidateCache } from '$lib/server/cache';

// Clear all caches
await invalidateCache('cache:*');

// Clear specific cache
await invalidateCache('cache:assessment:123:*');
```

**Method 3: Wait for TTL expiration**

- Caches expire automatically after TTL (30s - 10min)

---

## References

### Documentation

- [Redis Caching Architecture](../architecture/redis-caching.md) - Comprehensive guide
- [Rate Limiting with Redis](../development/rate-limiting-redis.md) - Rate limiting details
- [Performance Optimizations](../architecture/performance.md) - Phase 5 results

### External Resources

- [Upstash Documentation](https://upstash.com/docs/redis)
- [Upstash REST API](https://upstash.com/docs/redis/features/restapi)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Last Updated**: 2025-10-28
**Maintained By**: Development Team
**Need Help?**: Check [Troubleshooting](#troubleshooting) or ask in team chat
