# Health Monitoring

> Health checks, admin statistics, user presence tracking, and background job monitoring.

---

## Overview

The health monitoring system provides multiple layers of observability:

| Component         | Endpoint                    | Purpose                      |
| ----------------- | --------------------------- | ---------------------------- |
| **Simple Health** | `/api/health`               | Quick database connectivity  |
| **Admin Stats**   | `/api/admin/health-stats`   | Comprehensive system metrics |
| **User Presence** | `user_presence` table       | Real-time online tracking    |
| **Job Tracking**  | `background_job_runs` table | Background task monitoring   |

---

## Simple Health Check

**Source**: `src/routes/api/health/+server.ts`

### Endpoint

```
GET /api/health
```

### Response

```json
{
	"status": "ok",
	"latency_ms": 45,
	"timestamp": "2025-12-09T10:30:00Z"
}
```

### Status Values

| Status     | Condition                  | HTTP Code |
| ---------- | -------------------------- | --------- |
| `ok`       | DB query < 500ms           | 200       |
| `degraded` | DB query >= 500ms or error | 200       |
| `down`     | Exception thrown           | 500       |

### Implementation

```typescript
export const GET: RequestHandler = async ({ locals }) => {
	const startTime = Date.now();

	try {
		// Simple database ping
		await locals.supabase.from('profiles').select('id').limit(1);
		const latency = Date.now() - startTime;

		return json({
			status: latency < 500 ? 'ok' : 'degraded',
			latency_ms: latency,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		return json(
			{
				status: 'down',
				error: 'Database connection failed',
				timestamp: new Date().toISOString()
			},
			{ status: 500 }
		);
	}
};
```

### Use Cases

- **Load balancer health checks**: Quick connectivity verification
- **Uptime monitoring**: External monitoring services
- **Deployment verification**: Post-deploy sanity check

---

## Admin Health Statistics

**Source**:

- `src/routes/api/admin/health-stats/+server.ts`
- `src/lib/server/healthStats.ts`

### Endpoint

```
GET /api/admin/health-stats
Authorization: Bearer <admin_token>
```

### Response Structure

```typescript
interface HealthStats {
	errors: {
		critical: number; // Critical severity errors
		unresolved: number; // Not yet resolved
		lastHour: number; // Errors in past hour
		trend7d: Array<{
			// 7-day trend
			date: string;
			count: number;
		}>;
	};

	users: {
		online: number; // Currently active (presence)
		active24h: number; // Active in 24 hours
		active7d: number; // Active in 7 days
		active30d: number; // Active in 30 days
		new7d: number; // New registrations
		byRole: {
			student: number;
			teacher: number;
			admin: number;
			tutor: number;
		};
	};

	performance: {
		avgResponseTime: number; // Average response time (ms)
		p95ResponseTime: number; // 95th percentile (ms)
		errorRate: number; // Errors per 1000 requests
		slowQueries: number; // Queries > 3s
	};

	content: {
		exercises: number; // Total exercises
		assessments: number; // Total assessments
		riddles: number; // Total riddles
		srsDecks: number; // SRS flashcard decks
		assignments24h: number; // Assignments created in 24h
		completions24h: number; // Completions in 24h
	};

	jobs: {
		total: number; // Total job runs
		running: number; // Currently running
		failed: number; // Failed in 24h
		recentJobs: Array<{
			name: string;
			status: string;
			started_at: string;
			completed_at: string;
		}>;
	};

	meta: {
		cached: boolean; // From cache?
		generatedAt: string; // Generation timestamp
		cacheExpiresAt: string; // Cache expiry
	};
}
```

### Caching

Stats are cached for 5 minutes to reduce database load:

```typescript
const CACHE_TTL = 5 * 60 * 1000;  // 5 minutes

let cachedStats: HealthStats | null = null;
let cacheTime: number = 0;

export async function getHealthStats(supabase: SupabaseClient) {
  const now = Date.now();

  if (cachedStats && now - cacheTime < CACHE_TTL) {
    return { ...cachedStats, meta: { cached: true, ... } };
  }

  const stats = await computeHealthStats(supabase);
  cachedStats = stats;
  cacheTime = now;

  return stats;
}
```

### Force Refresh

```
GET /api/admin/health-stats?force=true
```

---

## User Presence System

**Source**: `src/lib/stores/presence.svelte.ts`

### Overview

Tracks real-time user online status using:

1. **Heartbeat mechanism**: Periodic "I'm alive" signals
2. **Supabase Realtime**: Subscribe to presence changes
3. **Database table**: `user_presence` for persistence

### Heartbeat Configuration

```typescript
const HEARTBEAT_INTERVAL = 180_000; // 3 minutes
const PRESENCE_TIMEOUT = 300_000; // 5 minutes (considered offline)
```

### Database Schema

```sql
CREATE TABLE user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  last_seen TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'online',      -- 'online', 'away', 'offline'
  metadata JSONB                      -- Device info, page, etc.
);

CREATE INDEX idx_presence_last_seen ON user_presence(last_seen);
```

### Client Integration

```typescript
// In layout or app initialization
import { presenceManager } from '$lib/stores/presence.svelte';

onMount(() => {
	presenceManager.startHeartbeat();

	return () => {
		presenceManager.stopHeartbeat();
	};
});
```

### Presence Queries

```typescript
// Get online users count
const { count } = await supabase
	.from('user_presence')
	.select('*', { count: 'exact', head: true })
	.gt('last_seen', new Date(Date.now() - 300000).toISOString());

// Get specific user status
const { data } = await supabase
	.from('user_presence')
	.select('last_seen, status')
	.eq('user_id', userId)
	.single();

const isOnline = data && new Date(data.last_seen) > new Date(Date.now() - 300000);
```

### Friend Status Tracking

```typescript
// Subscribe to friends' presence changes
const subscription = supabase
	.channel('friends-presence')
	.on(
		'postgres_changes',
		{
			event: '*',
			schema: 'public',
			table: 'user_presence',
			filter: `user_id=in.(${friendIds.join(',')})`
		},
		(payload) => {
			updateFriendStatus(payload.new);
		}
	)
	.subscribe();
```

---

## Background Job Monitoring

### Database Schema

```sql
CREATE TABLE background_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT DEFAULT 'running',     -- 'running', 'success', 'failed', 'timeout'
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_by UUID REFERENCES auth.users
);

CREATE INDEX idx_job_runs_name ON background_job_runs(job_name);
CREATE INDEX idx_job_runs_status ON background_job_runs(status);
CREATE INDEX idx_job_runs_started ON background_job_runs(started_at);
```

### RPC Functions

```sql
-- Start a job run
CREATE FUNCTION start_job_run(
  p_job_name TEXT,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_run_id UUID;
BEGIN
  INSERT INTO background_job_runs (job_name, metadata)
  VALUES (p_job_name, p_metadata)
  RETURNING id INTO v_run_id;
  RETURN v_run_id;
END;
$$ LANGUAGE plpgsql;

-- Complete a job run
CREATE FUNCTION complete_job_run(
  p_run_id UUID,
  p_status TEXT,
  p_metadata JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE background_job_runs
  SET
    status = p_status,
    completed_at = now(),
    duration_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000,
    metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb)
  WHERE id = p_run_id;
END;
$$ LANGUAGE plpgsql;
```

### Usage in Code

```typescript
export async function cleanupOldErrors(supabase: SupabaseClient, daysOld: number) {
	const serviceClient = getServiceRoleClient();

	// Start job tracking
	const { data: runId } = await serviceClient.rpc('start_job_run', {
		p_job_name: 'cleanup_old_errors',
		p_metadata: { days_old: daysOld }
	});

	try {
		// Do the work
		const { data, error } = await serviceClient
			.from('error_logs')
			.delete()
			.eq('resolved', true)
			.lt('created_at', cutoffDate)
			.select('id');

		// Complete with success
		await serviceClient.rpc('complete_job_run', {
			p_run_id: runId,
			p_status: 'success',
			p_metadata: { deleted_count: data?.length || 0 }
		});

		return { deletedCount: data?.length || 0 };
	} catch (error) {
		// Complete with failure
		await serviceClient.rpc('complete_job_run', {
			p_run_id: runId,
			p_status: 'failed',
			p_metadata: { error: error.message }
		});
		throw error;
	}
}
```

### Job Types Tracked

| Job Name             | Purpose                | Frequency     |
| -------------------- | ---------------------- | ------------- |
| `cleanup_old_errors` | Delete resolved errors | Weekly/manual |
| `sync_student_data`  | Import student data    | On demand     |
| `generate_reports`   | Create usage reports   | Daily         |
| `expire_vip_cards`   | Expire old VIP cards   | Daily         |

---

## Monitoring Dashboard Integration

### Admin Dashboard

The admin dashboard at `/dashboard/admin` displays:

1. **Error Overview Widget**: Critical, unresolved, recent errors
2. **User Activity Widget**: Online users, new registrations
3. **Performance Widget**: Response times, slow queries
4. **Job Status Widget**: Running/failed background jobs

### Dashboard Refresh

```svelte
<script lang="ts">
	import { onMount } from 'svelte';

	let stats = $state<HealthStats | null>(null);
	let loading = $state(true);

	async function fetchStats(force = false) {
		loading = true;
		const url = force ? '/api/admin/health-stats?force=true' : '/api/admin/health-stats';
		const response = await fetch(url);
		stats = await response.json();
		loading = false;
	}

	onMount(() => {
		fetchStats();

		// Auto-refresh every 5 minutes
		const interval = setInterval(() => fetchStats(), 5 * 60 * 1000);
		return () => clearInterval(interval);
	});
</script>

<Button onclick={() => fetchStats(true)}>Refresh Stats</Button>
```

---

## Performance Metrics Collection

### Slow Request Detection

From `hooks.server.ts`:

```typescript
const SLOW_REQUEST_THRESHOLD = 3000; // 3 seconds
const VERY_SLOW_THRESHOLD = 10000; // 10 seconds

const responseTime = Date.now() - startTime;

if (responseTime > SLOW_REQUEST_THRESHOLD) {
	await logError(supabase, {
		error_type: 'performance',
		severity: responseTime > VERY_SLOW_THRESHOLD ? 'error' : 'warning',
		message: `Slow request: ${responseTime}ms`,
		url: event.url.pathname,
		metadata: {
			responseTime,
			method: event.request.method
		}
	});
}
```

### Query Performance Tracking

Tracked via the health stats aggregation:

```typescript
// From error_logs table
const { data: perfErrors } = await supabase
	.from('error_logs')
	.select('metadata')
	.eq('error_type', 'performance')
	.gte('created_at', last24Hours);

const responseTimes = perfErrors.map((e) => e.metadata?.responseTime).filter(Boolean);

const avgResponseTime = average(responseTimes);
const p95ResponseTime = percentile(responseTimes, 95);
```

---

## Related

- [Error Monitoring](./error-monitoring.md) - Error capture system
- [Admin Dashboard](./admin-dashboard.md) - Dashboard UI
- [Configuration](./configuration.md) - Thresholds and settings
