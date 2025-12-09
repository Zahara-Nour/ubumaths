# Error Monitoring

> Client and server error capture, batching, storage, and lifecycle management.

---

## Overview

The error monitoring system captures errors from two sources:

| Source     | File                                | Captures                       |
| ---------- | ----------------------------------- | ------------------------------ |
| **Client** | `src/lib/utils/errorMonitoring.ts`  | Browser JS errors, promises    |
| **Server** | `src/lib/server/errorMonitoring.ts` | API, load, action, perf errors |

Both feed into the same `error_logs` database table.

---

## Client-Side Monitoring

### Initialization

Error monitoring is automatically initialized in `src/hooks.client.ts`:

```typescript
import { browser } from '$app/environment';
import { initErrorMonitoring } from '$lib/utils/errorMonitoring';

if (browser) {
	initErrorMonitoring();
}
```

### Automatic Capture

The system installs global handlers for:

1. **Uncaught JavaScript errors** (`window.onerror`)
2. **Unhandled Promise rejections** (`unhandledrejection`)

```typescript
// These are captured automatically:
throw new Error('Uncaught error');

fetch('/api/broken').then((res) => {
	throw new Error('Unhandled rejection');
});
```

### Manual Capture

For explicit error reporting:

```typescript
import {
	captureError,
	captureValidationError,
	capturePerformance
} from '$lib/utils/errorMonitoring';

// General errors
try {
	await riskyOperation();
} catch (error) {
	captureError(error, { context: 'checkout-flow' });
}

// Validation errors
const result = schema.safeParse(data);
if (!result.success) {
	captureValidationError(result.error, 'user-registration');
}

// Performance issues
capturePerformance('slow-render', {
	component: 'DataGrid',
	duration: 2500
});
```

### Configuration

```typescript
const CONFIG = {
	MAX_ERRORS_PER_MINUTE: 10, // Rate limit
	BATCH_SIZE: 5, // Send when 5 errors queued
	BATCH_TIMEOUT: 10000, // Or every 10 seconds
	API_ENDPOINT: '/api/errors/log'
};
```

### Browser Context

Each error includes automatic browser context:

```typescript
interface BrowserContext {
	user_agent: string;
	browser_name: string; // 'Chrome', 'Firefox', 'Safari'
	browser_version: string;
	os_name: string; // 'Windows', 'macOS', 'Linux'
	device_type: string; // 'desktop', 'tablet', 'mobile'
	viewport_width: number;
	viewport_height: number;
}
```

### Public API

| Function                   | Purpose                     |
| -------------------------- | --------------------------- |
| `initErrorMonitoring()`    | Install global handlers     |
| `initWebVitals()`          | Start Web Vitals collection |
| `captureError()`           | Manual error capture        |
| `captureValidationError()` | Zod validation failures     |
| `capturePerformance()`     | Performance warnings        |
| `flushErrors()`            | Force-send queued errors    |

---

## Server-Side Monitoring

### Hook Integration

Server errors are captured in `src/hooks.server.ts`:

```typescript
const errorMonitoringHandle: Handle = async ({ event, resolve }) => {
	const startTime = Date.now();

	try {
		const response = await resolve(event);

		// Track slow requests
		const responseTime = Date.now() - startTime;
		if (responseTime > 3000) {
			await logError(supabase, {
				error_type: 'performance',
				severity: responseTime > 10000 ? 'error' : 'warning',
				message: `Slow request: ${responseTime}ms`,
				url: event.url.pathname
			});
		}

		return response;
	} catch (error) {
		// Classify and log error
		await logError(supabase, {
			error_type: classifyError(event),
			severity: 'error',
			message: error.message,
			stack_trace: error.stack
		});
		throw error;
	}
};
```

### Error Classification

Errors are automatically classified based on route type:

| Route Pattern     | Error Type      |
| ----------------- | --------------- |
| `/api/*`          | `server_api`    |
| `+page.server.ts` | `server_load`   |
| Form actions      | `server_action` |
| Zod failures      | `validation`    |
| Response time >3s | `performance`   |
| PostgreSQL errors | `database`      |

### logError() Function

Core function for storing errors:

```typescript
import { logError } from '$lib/server/errorMonitoring';

await logError(supabase, {
	error_type: 'server_api',
	severity: 'error',
	message: 'Payment processing failed',
	stack_trace: error.stack,
	url: '/api/payments/process',
	request_method: 'POST',
	user_id: user?.id,
	metadata: { orderId: '12345' }
});
```

### Data Sanitization

Before storage, `logError()` performs:

1. **Message truncation**: Max 1000 characters
2. **Stack trace truncation**: Max 5000 characters
3. **Sensitive data removal**: Passwords, tokens from metadata
4. **Service role bypass**: Uses admin client for RLS bypass

---

## Error Types

### Complete Type Reference

```typescript
type ErrorType =
	| 'client_js' // Browser JavaScript errors
	| 'server_api' // API endpoint errors
	| 'server_load' // Page load function errors
	| 'server_action' // Form action errors
	| 'validation' // Input validation errors
	| 'performance' // Slow request warnings
	| 'database'; // Database errors

type ErrorSeverity =
	| 'info' // Informational
	| 'warning' // Recoverable issues
	| 'error' // Failures
	| 'critical'; // System-wide issues
```

### Severity Guidelines

| Severity   | When to Use                              | Example                  |
| ---------- | ---------------------------------------- | ------------------------ |
| `info`     | Expected conditions worth tracking       | User hit rate limit      |
| `warning`  | Recoverable issues, degraded performance | Response time 3-10s      |
| `error`    | Operation failures requiring attention   | Payment declined         |
| `critical` | System-wide issues, security concerns    | Database connection lost |

---

## Database Schema

### error_logs Table

```sql
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Classification
  error_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'error',

  -- Error details
  message TEXT NOT NULL,
  stack_trace TEXT,

  -- Context
  url TEXT,
  request_method TEXT,
  user_id UUID REFERENCES auth.users,
  user_agent TEXT,

  -- Browser context (client errors)
  browser_name TEXT,
  browser_version TEXT,
  os_name TEXT,
  device_type TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,

  -- Additional data
  metadata JSONB,

  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles,
  resolution_notes TEXT
);
```

### error_occurrences Table

Deduplicated error tracking via trigger:

```sql
CREATE TABLE error_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_signature TEXT UNIQUE NOT NULL,  -- SHA-256 hash
  error_type TEXT NOT NULL,
  message TEXT NOT NULL,
  file_path TEXT,
  line_number INTEGER,
  occurrence_count INTEGER DEFAULT 1,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  sample_error_id UUID REFERENCES error_logs
);
```

### Signature Generation

Errors are deduplicated by SHA-256 hash of:

- `error_type`
- `message` (normalized)
- `file_path` (from stack trace)
- `line_number` (from stack trace)

---

## Lifecycle Management

### Error Resolution

Resolve a single error by ID:

```typescript
import { resolveError } from '$lib/server/errorMonitoring';

const result = await resolveError(
	supabase,
	errorId, // UUID of the error
	userId, // Admin user ID
	'Fixed in commit abc123' // Optional notes
);

if (result.success) {
	console.log('Error resolved');
} else {
	console.error(result.error);
}
```

### Bulk Resolution by Signature

Resolve all errors with the same signature (deduplicated errors):

```typescript
import { resolveErrorBySignature } from '$lib/server/errorMonitoring';

const result = await resolveErrorBySignature(
	supabase,
	errorSignature, // SHA-256 signature from error_occurrences
	userId, // Admin user ID
	'Batch cleanup' // Optional notes
);

if (result.success) {
	console.log(`Resolved ${result.count} errors`);
}
```

### Automatic Cleanup

Old resolved errors are automatically deleted:

```typescript
import { cleanupOldErrors } from '$lib/server/errorMonitoring';

// Delete resolved errors older than 90 days
const result = await cleanupOldErrors(supabase, 90);
console.log(`Deleted ${result.deletedCount} old errors`);
```

The cleanup is exposed via API for scheduled execution:

```bash
POST /api/errors/cleanup
{ "days_old": 90 }
```

---

## Statistics & Queries

### Get Error Stats

```typescript
import { getErrorStats } from '$lib/server/errorMonitoring';

const stats = await getErrorStats(supabase);
// {
//   total: 1250,
//   unresolved: 42,
//   critical: 3,
//   lastHour: 8,
//   mostCommonType: 'client_js'
// }
```

### Get Filtered Errors

```typescript
import { getErrorLogs } from '$lib/server/errorMonitoring';

const { data, pagination } = await getErrorLogs(supabase, {
	type: 'server_api',
	severity: 'error',
	resolved: false,
	limit: 20,
	offset: 0
});
```

---

## API Endpoints

| Endpoint                      | Method | Auth  | Purpose                    |
| ----------------------------- | ------ | ----- | -------------------------- |
| `/api/errors/log`             | POST   | None  | Log client errors          |
| `/api/errors`                 | GET    | Admin | List errors with filters   |
| `/api/errors/[id]`            | GET    | Admin | Get single error           |
| `/api/errors/[id]`            | PUT    | Admin | Resolve single error       |
| `/api/errors/bulk-resolve`    | POST   | Admin | Bulk resolve errors        |
| `/api/errors/cleanup`         | POST   | Admin | Delete old resolved errors |
| `/api/errors/delete-resolved` | POST   | Admin | Delete all resolved        |

---

## Error Flow Diagrams

### Client Error Flow

```
Browser Error
     │
     ▼
┌─────────────────┐
│ Global Handler  │
│ (window.onerror)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Rate Limiter   │──── Exceeds 10/min? ──► Drop
│  (10/min)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Error Queue    │
│  (batch of 5)   │
└────────┬────────┘
         │
    5 errors OR 10s timeout
         │
         ▼
┌─────────────────┐
│ POST /api/      │
│ errors/log      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  error_logs     │
│  (database)     │
└─────────────────┘
```

### Server Error Flow

```
Request Handler
     │
     ▼
┌─────────────────┐
│  Try/Catch in   │
│  hooks.server   │
└────────┬────────┘
         │
    Error thrown
         │
         ▼
┌─────────────────┐
│ Classify Error  │
│ (api/load/etc)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ logError()      │
│ - Sanitize      │
│ - Truncate      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Service Role    │
│ Client (bypass  │
│ RLS)            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  error_logs     │
│  (database)     │
└────────┬────────┘
         │
    Trigger fires
         │
         ▼
┌─────────────────┐
│ error_          │
│ occurrences     │
│ (deduplicated)  │
└─────────────────┘
```

---

## Request ID Tracing

Every server request is assigned a unique 8-character request ID for tracing.

### How It Works

1. **Generated early**: `requestIdHandle` runs first in the hooks sequence
2. **Available in locals**: Access via `event.locals.requestId`
3. **Included in logs**: Automatically added to all `logError()` calls
4. **Response header**: `X-Request-ID` header sent to client

### Usage

```typescript
// In any server code
export const POST: RequestHandler = async ({ locals }) => {
	console.log(`[${locals.requestId}] Processing request...`);

	// Error logs automatically include requestId
	await logError(locals.supabase, {
		error_type: 'server_api',
		message: 'Something failed',
		context: { request_id: locals.requestId }
	});
};
```

### Client Correlation

```typescript
// Get request ID from response headers
const response = await fetch('/api/endpoint');
const requestId = response.headers.get('X-Request-ID');
console.log('Server request ID:', requestId);
```

---

## Web Vitals Collection

Automatically collects Core Web Vitals from real users using native PerformanceObserver.

### Metrics Collected

| Metric | Name                      | Good   | Needs Improvement |
| ------ | ------------------------- | ------ | ----------------- |
| LCP    | Largest Contentful Paint  | <2.5s  | <4s               |
| FID    | First Input Delay         | <100ms | <300ms            |
| CLS    | Cumulative Layout Shift   | <0.1   | <0.25             |
| FCP    | First Contentful Paint    | <1.8s  | <3s               |
| TTFB   | Time to First Byte        | <800ms | <1.8s             |
| INP    | Interaction to Next Paint | <200ms | <500ms            |

### Initialization

Web Vitals are initialized in `hooks.client.ts`:

```typescript
import { initErrorMonitoring, initWebVitals } from '$lib/utils/errorMonitoring';

if (browser) {
	initErrorMonitoring();
	initWebVitals();
}
```

### Reporting Behavior

- **Good metrics are not logged** (to reduce noise)
- **Warning**: Metrics between "good" and "needs improvement" thresholds
- **Error**: Metrics above "needs improvement" threshold
- **CLS and INP**: Reported on page hide (when user leaves)

### Querying Web Vitals

```sql
-- Web Vitals summary (last 7 days)
SELECT
  context->>'metric' as metric,
  severity,
  count(*) as count,
  avg((context->>'value')::numeric) as avg_value
FROM error_logs
WHERE error_type = 'performance'
  AND tags @> '["web_vitals"]'
  AND created_at > now() - interval '7 days'
GROUP BY context->>'metric', severity
ORDER BY metric, severity;
```

---

## Related

- [Logger Utility](./logger-utility.md) - Logging functions
- [Rate Limiting](./rate-limiting.md) - Request protection
- [Admin Dashboard](./admin-dashboard.md) - Error management UI
