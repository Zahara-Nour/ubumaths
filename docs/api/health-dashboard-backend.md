# Admin Health Dashboard Backend API

Complete backend implementation for the admin health dashboard system with Supabase caching strategy.

## Overview

This system provides two API endpoints for monitoring application health and retrieving comprehensive admin dashboard statistics. The implementation minimizes database load on Supabase's free tier by using a server-side cache table with 5-minute TTL.

## Architecture

### Cache Strategy

- **Cache Table**: `server_cache` (Supabase PostgreSQL)
- **TTL**: 5 minutes (300 seconds)
- **Cache Key**: `admin:health-stats`
- **Workflow**:
  1. Check cache for existing data
  2. If cache hit: Return cached data (~50-100ms)
  3. If cache miss: Fetch from database views (~1-2s)
  4. Store fresh data in cache for next request

### Database Views

The system queries the following database views created by migrations:

- `admin_error_stats_24h` - Error counts by severity and time windows
- `admin_user_activity` - User counts by role and registration dates
- `admin_online_users` - Currently online user count
- `admin_content_stats` - Content totals (exercises, assessments, etc.)
- `admin_job_status` - Latest background job execution status

## API Endpoints

### 1. Health Check - `/api/health`

Simple health check endpoint that pings the database.

#### Request

```bash
GET /api/health
```

#### Response

```typescript
{
  status: 'ok' | 'degraded' | 'down',
  latency_ms: number,          // Database response time in milliseconds
  timestamp: string,            // ISO datetime
  error?: string                // Only present if status is 'degraded' or 'down'
}
```

#### Status Codes

- `200 OK` - System is healthy (latency < 500ms)
- `200 OK` - System is degraded (latency >= 500ms, but operational)
- `503 Service Unavailable` - System is down (database error)

#### Example

```bash
curl http://localhost:5175/api/health

# Response:
{
  "status": "ok",
  "latency_ms": 87,
  "timestamp": "2025-11-07T10:30:00.000Z"
}
```

#### Use Cases

- Uptime monitoring tools (UptimeRobot, Pingdom, etc.)
- Load balancer health checks
- Quick system status verification

---

### 2. Health Stats - `/api/admin/health-stats`

Comprehensive admin dashboard statistics with caching.

#### Request

```bash
GET /api/admin/health-stats
Authorization: Bearer <session-token>
```

#### Authentication

- **Required Role**: `admin`
- **RLS Policy**: Enforced at database level (only admins can access `server_cache`)

#### Response

```typescript
{
  // Error Statistics
  errors: {
    critical: number,           // Critical errors in last 24h
    unresolved: number,         // Total unresolved errors
    lastHour: number,           // Errors in last hour
    trend7d: number[]           // Array of 7 numbers (daily error counts)
  },

  // User Statistics
  users: {
    online: number,             // Currently online users (last 5 min)
    active24h: number,          // Active in last 24 hours
    active7d: number,           // Active in last 7 days
    active30d: number,          // Active in last 30 days
    new7d: number,              // New users in last 7 days
    byRole: {
      students: number,
      teachers: number,
      admins: number
    }
  },

  // Performance Statistics
  performance: {
    avgResponseTime: number,    // Average response time in ms
    p95ResponseTime: number,    // 95th percentile response time in ms
    errorRate: number,          // Error rate percentage (0-100)
    slowQueries: number         // Count of queries >1000ms
  },

  // Content Statistics
  content: {
    exercises: number,
    assessments: number,
    riddles: number,
    srsDecks: number,
    assignments24h: number,     // Assignments in last 24h
    completions24h: number      // Completions in last 24h
  },

  // Job Statistics
  jobs: {
    total: number,              // Total unique job types
    running: number,            // Currently running jobs
    failed: number,             // Failed jobs (last 24h)
    recentJobs: Array<{
      name: string,
      status: 'running' | 'success' | 'failed' | 'timeout',
      lastRun: string | null,   // ISO datetime
      executionTime: number | null,  // Milliseconds
      error: string | null
    }>
  },

  // Metadata
  meta: {
    cached: boolean,            // true if response from cache
    generatedAt: string,        // ISO datetime when data was generated
    cacheExpiresAt?: string     // ISO datetime (only present if cached=false)
  }
}
```

#### Example

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5175/api/admin/health-stats

# First request (cache miss):
{
  "errors": {
    "critical": 3,
    "unresolved": 12,
    "lastHour": 5,
    "trend7d": [8, 12, 15, 10, 9, 7, 5]
  },
  "users": {
    "online": 42,
    "active24h": 156,
    "active7d": 342,
    "active30d": 987,
    "new7d": 23,
    "byRole": {
      "students": 456,
      "teachers": 32,
      "admins": 3
    }
  },
  "performance": {
    "avgResponseTime": 245,
    "p95ResponseTime": 892,
    "errorRate": 2.3,
    "slowQueries": 12
  },
  "content": {
    "exercises": 234,
    "assessments": 45,
    "riddles": 67,
    "srsDecks": 23,
    "assignments24h": 89,
    "completions24h": 156
  },
  "jobs": {
    "total": 5,
    "running": 0,
    "failed": 1,
    "recentJobs": [
      {
        "name": "cleanup_expired_cache",
        "status": "success",
        "lastRun": "2025-11-07T10:25:00.000Z",
        "executionTime": 234,
        "error": null
      }
    ]
  },
  "meta": {
    "cached": false,
    "generatedAt": "2025-11-07T10:30:00.000Z",
    "cacheExpiresAt": "2025-11-07T10:35:00.000Z"
  }
}

# Subsequent requests within 5 minutes (cache hit):
# Same response with "cached": true
```

#### Status Codes

- `200 OK` - Successfully retrieved stats
- `403 Forbidden` - User is not an admin
- `500 Internal Server Error` - Database error

---

## Implementation Files

### 1. Zod Validation Schemas

**File**: `src/lib/server/validation/health.ts`

Defines TypeScript-safe validation schemas for all health endpoint responses:

- `healthCheckResponseSchema` - Simple health check
- `healthStatsResponseSchema` - Complete dashboard stats
- Individual schemas for errors, users, performance, content, jobs, metadata

### 2. Health Stats Utilities

**File**: `src/lib/server/healthStats.ts`

Core business logic for fetching and caching statistics:

**Functions**:

- `getCachedHealthStats()` - Retrieve cached stats from `server_cache`
- `setCachedHealthStats()` - Store stats in cache with TTL
- `fetchHealthStats()` - Main function that queries all database views in parallel
- `fetchErrorStats()` - Error statistics aggregation
- `fetchUserStats()` - User statistics aggregation
- `fetchPerformanceStats()` - Performance metrics calculation
- `fetchContentStats()` - Content totals aggregation
- `fetchJobStats()` - Background job status

**Type Safety**:

- Uses type assertions for new database tables/views not yet in `database.ts`
- Includes TODO comments to regenerate types after migrations are pushed
- Handles null/undefined values gracefully with `??` operator

### 3. Health Check Endpoint

**File**: `src/routes/api/health/+server.ts`

Simple GET endpoint that:

1. Pings the database with a lightweight query (`profiles` count)
2. Measures latency
3. Returns status based on latency threshold (500ms)

### 4. Health Stats Endpoint

**File**: `src/routes/api/admin/health-stats/+server.ts`

Protected GET endpoint that:

1. Verifies admin role via `requireRole()` middleware
2. Checks cache for existing data
3. Fetches fresh data if cache miss
4. Stores fresh data in cache (fire-and-forget)
5. Returns stats with cache metadata

---

## Security

### Authentication & Authorization

- **Health Check (`/api/health`)**: Public endpoint (no auth required)
- **Health Stats (`/api/admin/health-stats`)**: Admin-only (enforced by middleware)

### RLS Policies

The `server_cache` table has Row Level Security enabled:

```sql
-- Only admins can manage cache operations
CREATE POLICY "Admins can manage cache"
  ON public.server_cache
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

This prevents:

- Cache poisoning by non-admin users
- Unauthorized access to cached dashboard data
- Non-admin users from clearing the cache

### Input Validation

- Health check: No input required
- Health stats: No query parameters (GET only)
- Authentication token validated via SvelteKit `locals.session`

---

## Performance Considerations

### Cache Effectiveness

| Metric           | Without Cache | With Cache | Improvement   |
| ---------------- | ------------- | ---------- | ------------- |
| Response Time    | 1-2 seconds   | 50-100ms   | 10-20x faster |
| Database Queries | ~15 queries   | 1 query    | 93% reduction |
| Supabase Load    | High          | Minimal    | Significant   |

### Query Optimization

1. **Parallel Queries**: Uses `Promise.all()` to fetch all stats concurrently
2. **View Aggregation**: Database views pre-aggregate expensive calculations
3. **Selective Fields**: Queries only necessary columns (not `SELECT *`)
4. **Index Usage**: Views leverage existing indexes on timestamp columns

### Cache Management

**Automatic Cleanup**: The `cleanup_expired_cache()` function should be called by a cron job:

```sql
SELECT cleanup_expired_cache();
```

Recommended schedule: Every 5 minutes

---

## Error Handling

### Database Errors

All database queries use try-catch blocks and gracefully handle errors:

```typescript
if (error || !data) {
	return null; // or default value
}
```

### Cache Failures

Cache write failures do not block the response:

```typescript
setCachedHealthStats(...).catch((err) => {
  console.error('Failed to cache health stats:', err);
});
```

### Edge Cases

- **Empty Views**: Returns `0` for all counts
- **Missing Columns**: Uses optional chaining (`?.`) and nullish coalescing (`??`)
- **Invalid Dates**: Handles with try-catch and fallback to current date

---

## Usage Examples

### Frontend Integration (SvelteKit)

```typescript
// Load function for admin dashboard
export async function load({ fetch }) {
	const response = await fetch('/api/admin/health-stats');

	if (!response.ok) {
		throw error(response.status, 'Failed to load dashboard stats');
	}

	const stats = await response.json();
	return { stats };
}
```

### Uptime Monitoring

Configure your monitoring tool to poll `/api/health`:

- **URL**: `https://ubumaths.com/api/health`
- **Method**: GET
- **Expected Status**: 200
- **Expected Response**: `{ "status": "ok", ... }`
- **Alert on**: `status !== "ok"` or status code !== 200

### Dashboard Refresh

```svelte
<script>
	import { onMount } from 'svelte';

	let stats = $state(null);
	let loading = $state(true);

	async function refreshStats() {
		loading = true;
		const response = await fetch('/api/admin/health-stats');
		stats = await response.json();
		loading = false;
	}

	onMount(() => {
		refreshStats();
		// Refresh every 5 minutes (align with cache TTL)
		const interval = setInterval(refreshStats, 5 * 60 * 1000);
		return () => clearInterval(interval);
	});
</script>

{#if loading}
	<p>Loading dashboard...</p>
{:else if stats}
	<div>
		<h2>Errors: {stats.errors.critical} critical, {stats.errors.unresolved} unresolved</h2>
		<h2>Users: {stats.users.online} online, {stats.users.active24h} active (24h)</h2>
		<!-- ... -->
	</div>
{/if}
```

---

## Testing

### Unit Tests

Create tests for the utility functions:

```typescript
// src/lib/server/healthStats.test.ts
import { describe, it, expect } from 'vitest';
import { getCachedHealthStats, setCachedHealthStats } from './healthStats';

describe('healthStats', () => {
	it('should return null for cache miss', async () => {
		const result = await getCachedHealthStats(supabase, 'nonexistent-key');
		expect(result).toBeNull();
	});

	it('should return cached data for cache hit', async () => {
		const mockStats = {
			/* ... */
		};
		await setCachedHealthStats(supabase, 'test-key', mockStats, 60);

		const result = await getCachedHealthStats(supabase, 'test-key');
		expect(result).toEqual(mockStats);
	});
});
```

### Integration Tests

Test the API endpoints:

```typescript
// e2e/admin/health-stats.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Admin Health Dashboard', () => {
	test('health check should return ok status', async ({ request }) => {
		const response = await request.get('/api/health');
		expect(response.ok()).toBeTruthy();

		const data = await response.json();
		expect(data.status).toBe('ok');
		expect(data.latency_ms).toBeLessThan(1000);
	});

	test('health stats should require admin role', async ({ request }) => {
		const response = await request.get('/api/admin/health-stats');
		expect(response.status()).toBe(403);
	});

	test('health stats should return complete data for admin', async ({ request }) => {
		// Login as admin
		await loginAsAdmin();

		const response = await request.get('/api/admin/health-stats');
		expect(response.ok()).toBeTruthy();

		const data = await response.json();
		expect(data).toHaveProperty('errors');
		expect(data).toHaveProperty('users');
		expect(data).toHaveProperty('performance');
		expect(data).toHaveProperty('content');
		expect(data).toHaveProperty('jobs');
		expect(data).toHaveProperty('meta');
	});
});
```

---

## Maintenance

### Regenerate Database Types

After pushing migrations to Supabase, regenerate TypeScript types:

```bash
pnpm db:types
```

This will update `src/lib/types/database.ts` to include:

- `server_cache` table
- `admin_*` views
- `background_job_runs` table

Then remove type assertions (`as any`) from `healthStats.ts` and use proper typed queries.

### Monitor Cache Performance

Query the cache table to monitor effectiveness:

```sql
-- Cache hit rate (last hour)
SELECT
  COUNT(*) FILTER (WHERE created_at > now() - interval '1 hour') as cache_writes,
  COUNT(*) FILTER (WHERE expires_at > now()) as active_entries
FROM server_cache;

-- Cache size
SELECT pg_size_pretty(pg_total_relation_size('server_cache')) as cache_size;
```

### Adjust Cache TTL

If you need to adjust the cache duration, modify the constant in the endpoint:

```typescript
// src/routes/api/admin/health-stats/+server.ts
const CACHE_TTL_SECONDS = 300; // Change from 5 minutes to desired duration
```

Considerations:

- **Lower TTL** (60-120s): More real-time data, higher database load
- **Higher TTL** (600-900s): Less database load, more stale data

---

## Troubleshooting

### Cache Not Working

Check if the `server_cache` table exists:

```sql
SELECT * FROM pg_tables WHERE tablename = 'server_cache';
```

If missing, run migration:

```bash
pnpm db:migrate
```

### Slow Queries

Check which views are slow:

```sql
EXPLAIN ANALYZE SELECT * FROM admin_error_stats_24h;
EXPLAIN ANALYZE SELECT * FROM admin_user_activity;
EXPLAIN ANALYZE SELECT * FROM admin_online_users;
EXPLAIN ANALYZE SELECT * FROM admin_content_stats;
```

Add indexes if necessary:

```sql
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX idx_user_presence_last_heartbeat ON user_presence(last_heartbeat);
```

### Type Errors

If you see TypeScript errors about missing table/view types:

1. Ensure migrations are pushed to Supabase
2. Regenerate types: `pnpm db:types`
3. If types still missing, use type assertions (already done in current implementation)

---

## Future Improvements

### 1. Materialized Views

Convert views to materialized views for better performance:

```sql
CREATE MATERIALIZED VIEW admin_error_stats_24h_mv AS
SELECT ...;

-- Refresh with cron job
REFRESH MATERIALIZED VIEW admin_error_stats_24h_mv;
```

### 2. Real-Time Updates

Use Supabase Realtime to push updates to the dashboard:

```typescript
supabase
	.channel('health-stats')
	.on(
		'postgres_changes',
		{
			event: 'UPDATE',
			schema: 'public',
			table: 'server_cache',
			filter: 'key=eq.admin:health-stats'
		},
		(payload) => {
			stats = payload.new.value;
		}
	)
	.subscribe();
```

### 3. Historical Trends

Store daily snapshots in a separate table:

```sql
CREATE TABLE health_stats_history (
  date DATE PRIMARY KEY,
  stats JSONB NOT NULL
);
```

### 4. Alerting

Send notifications when thresholds are exceeded:

```typescript
if (stats.errors.critical > 10) {
	await sendAlert('Critical errors exceeded threshold');
}
```

---

## References

- [Database Schema Documentation](../architecture/database-schema.md)
- [API Design Guidelines](../development/api-design-guidelines.md)
- [Supabase Caching Best Practices](https://supabase.com/docs/guides/database/caching)
- [SvelteKit API Routes](https://kit.svelte.dev/docs/routing#server)
