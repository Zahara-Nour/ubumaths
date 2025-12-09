# Logging & Monitoring - Technical Reference

> Complete technical documentation for the UbuMaths logging, monitoring, and observability system.

**Last Updated**: 2025-12-09

---

## Overview

UbuMaths implements a **custom-built logging and monitoring system** that operates without external APM dependencies (no Sentry, LogRocket, or DataDog). The system is built around Supabase for storage and provides:

- Multi-layer logging (development vs production)
- Automatic PII redaction
- Client and server error capture
- Rate limiting (database-backed and in-memory)
- Health checks and admin dashboards
- Error deduplication and lifecycle management

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (Client)                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌──────────────────────┐ │
│  │   createLogger()    │    │  initErrorMonitoring│    │   captureError()     │ │
│  │   (dev only)        │    │  (global handlers)  │    │   (manual capture)   │ │
│  └─────────────────────┘    └──────────┬──────────┘    └──────────┬───────────┘ │
│                                        │                          │             │
│                                        └──────────┬───────────────┘             │
│                                                   │                             │
│                                     ┌─────────────▼─────────────┐               │
│                                     │   Error Queue & Batching  │               │
│                                     │   (10/min, batch of 5)    │               │
│                                     └─────────────┬─────────────┘               │
└───────────────────────────────────────────────────┼─────────────────────────────┘
                                                    │
                                          POST /api/errors/log
                                                    │
┌───────────────────────────────────────────────────┼─────────────────────────────┐
│                              SERVER (SvelteKit)   │                             │
├───────────────────────────────────────────────────┼─────────────────────────────┤
│                                                   ▼                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │ hooks.server.ts │    │ Rate Limiter    │    │ Error Endpoint  │             │
│  │ - Request timing│    │ (20/min per IP) │    │ /api/errors/log │             │
│  │ - Error capture │    └────────┬────────┘    └────────┬────────┘             │
│  │ - Slow requests │             │                      │                      │
│  └────────┬────────┘             │                      │                      │
│           │                      │                      │                      │
│           └──────────────────────┴──────────────────────┘                      │
│                                  │                                              │
│                    ┌─────────────▼─────────────┐                               │
│                    │   createServerLogger()    │                               │
│                    │   (PII redaction)         │                               │
│                    └─────────────┬─────────────┘                               │
│                                  │                                              │
│                    ┌─────────────▼─────────────┐                               │
│                    │   logError() Function     │                               │
│                    │   - Sanitize data         │                               │
│                    │   - Truncate messages     │                               │
│                    │   - Deduplicate           │                               │
│                    └─────────────┬─────────────┘                               │
└──────────────────────────────────┼──────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE (Database)                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                           error_logs                                     │    │
│  │  - error_type, severity, message, stack_trace                           │    │
│  │  - url, user_agent, browser context                                     │    │
│  │  - resolved, resolution_notes, resolved_by                              │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                    │                                            │
│                          AFTER INSERT TRIGGER                                   │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                       error_occurrences                                  │    │
│  │  - Deduplicated by SHA-256 signature                                    │    │
│  │  - occurrence_count, first_seen, last_seen                              │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Documentation Index

| Document                                    | Description                                     |
| ------------------------------------------- | ----------------------------------------------- |
| [Logger Utility](./logger-utility.md)       | createLogger, createServerLogger, PII redaction |
| [Error Monitoring](./error-monitoring.md)   | Client/server error capture, batching, storage  |
| [Rate Limiting](./rate-limiting.md)         | Database and in-memory rate limiters            |
| [Health Monitoring](./health-monitoring.md) | Health checks, admin stats, presence tracking   |
| [Admin Dashboard](./admin-dashboard.md)     | Error management UI, bulk operations            |
| [Configuration](./configuration.md)         | Environment settings, dev vs prod behavior      |
| [Troubleshooting](./troubleshooting.md)     | Common issues, diagnostic queries               |

---

## Quick Reference

### Logger Types

| Logger                 | Environment | PII Safe | Location               |
| ---------------------- | ----------- | -------- | ---------------------- |
| `createLogger()`       | Dev only    | No       | `$lib/utils/logger.ts` |
| `createServerLogger()` | Dev + Prod  | Yes      | `$lib/utils/logger.ts` |

### Error Types

| Type            | Description               | Captured By       |
| --------------- | ------------------------- | ----------------- |
| `client_js`     | Browser JavaScript errors | Client monitoring |
| `server_api`    | API endpoint errors       | Server hooks      |
| `server_load`   | Page load function errors | Server hooks      |
| `server_action` | Form action errors        | Server hooks      |
| `validation`    | Input validation failures | Manual capture    |
| `performance`   | Slow requests (>3s)       | Server hooks      |
| `database`      | Database operation errors | Manual capture    |

### Severity Levels

| Level      | Color  | When to Use                           |
| ---------- | ------ | ------------------------------------- |
| `info`     | Blue   | Informational, expected conditions    |
| `warning`  | Yellow | Recoverable issues, slow performance  |
| `error`    | Red    | Failures requiring attention          |
| `critical` | Purple | System-wide issues, security concerns |

### Key Files

| Category             | Path                                                                    |
| -------------------- | ----------------------------------------------------------------------- |
| **Logger Utility**   | `src/lib/utils/logger.ts`                                               |
| **Server Monitor**   | `src/lib/server/errorMonitoring.ts`                                     |
| **Client Monitor**   | `src/lib/utils/errorMonitoring.ts`                                      |
| **Server Hooks**     | `src/hooks.server.ts`                                                   |
| **Client Hooks**     | `src/hooks.client.ts`                                                   |
| **Rate Limiter DB**  | `src/lib/server/rateLimiter.ts`                                         |
| **Rate Limiter Mem** | `src/lib/server/middleware/rateLimit.ts`                                |
| **Health Check**     | `src/routes/api/health/+server.ts`                                      |
| **Health Stats**     | `src/lib/server/healthStats.ts`                                         |
| **Error API**        | `src/routes/api/errors/`                                                |
| **Admin Dashboard**  | `src/routes/(protected)/dashboard/admin/errors/`                        |
| **DB Migration**     | `supabase/migrations/20251023024428_create_error_monitoring_system.sql` |

---

## Usage Examples

### Development Logging

```typescript
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('MyComponent.svelte');

logger.trace('Detailed debug info'); // Only if threshold allows
logger.info('Component mounted');
logger.warn('Deprecated API used');
logger.error('Failed to load data', error);
```

### Server Logging with PII Protection

```typescript
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/users/+server.ts');

// PII automatically redacted in output
logger.info('User login', {
	email: 'user@example.com', // → [email@redacted]
	ip: '192.168.1.1' // → 192.xxx.xxx.xxx
});
```

### Manual Error Capture

```typescript
import { captureError } from '$lib/utils/errorMonitoring';

try {
	await riskyOperation();
} catch (error) {
	captureError(error, {
		context: 'payment-processing',
		userId: user.id
	});
}
```

### Rate Limiting

```typescript
import { checkLoginRateLimitByIP, checkLoginRateLimitByEmail } from '$lib/server/rateLimiter';

// Check by IP address (5 attempts/15 min)
const ipResult = await checkLoginRateLimitByIP(ip);
if (!ipResult.allowed) {
	throw error(429, ipResult.message); // French message included
}

// Check by email (3 attempts/15 min, stricter)
const emailResult = await checkLoginRateLimitByEmail(email);
if (!emailResult.allowed) {
	throw error(429, emailResult.message);
}
```

### Health Check

```bash
# Simple health check
curl https://ubumaths.fr/api/health
# Response: { "status": "ok", "latency_ms": 45, "timestamp": "..." }

# Admin health stats (requires auth)
curl -H "Authorization: Bearer ..." https://ubumaths.fr/api/admin/health-stats
```

### Request ID Tracing

```typescript
// Access request ID in server code
export const POST: RequestHandler = async ({ locals }) => {
	console.log(`[${locals.requestId}] Processing...`);

	// Included automatically in logError() calls
	await logError(locals.supabase, {
		error_type: 'server_api',
		message: 'Something failed',
		context: { request_id: locals.requestId }
	});
};

// Client correlation via response header
const response = await fetch('/api/endpoint');
const requestId = response.headers.get('X-Request-ID');
```

### Web Vitals (Automatic)

```typescript
// Initialized automatically in hooks.client.ts
import { initErrorMonitoring, initWebVitals } from '$lib/utils/errorMonitoring';

if (browser) {
	initErrorMonitoring();
	initWebVitals(); // Collects LCP, FID, CLS, FCP, TTFB, INP
}
```

---

## System Features

### Strengths

| Feature                    | Description                                     |
| -------------------------- | ----------------------------------------------- |
| **PII Redaction**          | Automatic email, IP, UUID, JWT, phone redaction |
| **Error Deduplication**    | SHA-256 signature-based grouping                |
| **Multi-Layer Rate Limit** | Database (persistent) + in-memory (fast)        |
| **Fail-Open Design**       | Logging failures don't break the app            |
| **Admin Dashboard**        | Full error management UI                        |
| **Auto Cleanup**           | Scheduled deletion of old resolved errors       |
| **Batched Client Errors**  | Reduces API calls, respects rate limits         |
| **Request ID Tracing**     | 8-char ID for correlating logs across a request |
| **Web Vitals Collection**  | LCP, FID, CLS, FCP, TTFB, INP from real users   |

### Limitations

| Area               | Current State            | Impact                      |
| ------------------ | ------------------------ | --------------------------- |
| External APM       | None (no Sentry/DataDog) | Less sophisticated grouping |
| Structured Logging | Plain console output     | Harder log parsing          |
| Log Aggregation    | Console + database only  | No cross-deploy search      |

---

## Related Documentation

- [Security Guide](../security/README.md) - Security controls including rate limiting
- [Audit Trail](../audit-trail/README.md) - Activity logging for rewards system
- [Database Schema](../../architecture/database-schema.md) - Full schema reference
