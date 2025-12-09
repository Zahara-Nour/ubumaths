# Configuration

> Environment settings, thresholds, and development vs production behavior.

---

## Overview

The logging and monitoring system behavior is controlled by:

1. **Environment detection** (`dev` from `$app/environment`)
2. **Hardcoded constants** (thresholds, limits)
3. **Database configuration** (rate limits)

---

## Environment Detection

### SvelteKit Environment

```typescript
import { dev } from '$app/environment';

// dev is true in development, false in production
if (dev) {
	// Development-only code
}
```

### Usage in Logging

```typescript
// createLogger() behavior
export function createLogger(module: string, threshold: LogLevel = 'trace') {
  if (!dev) {
    // Return no-op functions in production
    return {
      trace: () => {},
      info: () => {},
      warn: () => {},
      error: () => {}
    };
  }

  // Full logging in development
  return { ... };
}
```

---

## Behavior Comparison

### Logger Behavior

| Feature                | Development       | Production        |
| ---------------------- | ----------------- | ----------------- |
| `createLogger()`       | Full output       | No-op (disabled)  |
| `createServerLogger()` | Full + PII redact | Full + PII redact |
| Console colors         | ANSI/CSS          | ANSI/CSS          |
| Stack traces           | Full              | Full              |

### Error Monitoring

| Feature              | Development     | Production   |
| -------------------- | --------------- | ------------ |
| Client error capture | Enabled         | Enabled      |
| Server error capture | Enabled         | Enabled      |
| Error batching       | Same (5/10s)    | Same (5/10s) |
| Rate limiting        | Enabled         | Enabled      |
| Service role audit   | Enabled (warns) | Disabled     |

### Console Output

| Feature     | Development  | Production |
| ----------- | ------------ | ---------- |
| Debug logs  | Visible      | Hidden     |
| Error logs  | Console + DB | DB only    |
| PII in logs | Redacted     | Redacted   |

---

## Threshold Constants

### Performance Thresholds

```typescript
// hooks.server.ts
const SLOW_REQUEST_THRESHOLD = 3000; // 3 seconds → warning
const VERY_SLOW_THRESHOLD = 10000; // 10 seconds → error
```

### Client Error Monitoring

```typescript
// src/lib/utils/errorMonitoring.ts
const CONFIG = {
	MAX_ERRORS_PER_MINUTE: 10, // Client-side rate limit
	BATCH_SIZE: 5, // Errors before sending
	BATCH_TIMEOUT: 10000, // Max wait before sending (ms)
	API_ENDPOINT: '/api/errors/log'
};
```

### Server Rate Limiter (In-Memory)

```typescript
// src/lib/server/middleware/rateLimit.ts
// Configured per-call, example:
rateLimit(`error-log:${ip}`, 20, 60000); // 20/minute
```

### Database Rate Limits

```typescript
// src/lib/server/rateLimiter.ts
const RATE_LIMITS: Record<RateLimitType, RateLimitConfig> = {
	login_ip: {
		maxRequests: 5,
		windowSeconds: 15 * 60 // 15 minutes
	},
	login_email: {
		maxRequests: 3,
		windowSeconds: 15 * 60
	},
	signup: {
		maxRequests: 3,
		windowSeconds: 60 * 60 // 1 hour
	},
	oauth: {
		maxRequests: 10,
		windowSeconds: 15 * 60
	},
	chatbot: {
		maxRequests: 5,
		windowSeconds: 15 * 60
	},
	notification_create_teacher: {
		maxRequests: 10,
		windowSeconds: 60 * 60
	},
	notification_create_admin: {
		maxRequests: 50,
		windowSeconds: 60 * 60
	},
	notification_delete_teacher: {
		maxRequests: 20,
		windowSeconds: 60 * 60
	},
	notification_delete_admin: {
		maxRequests: 100,
		windowSeconds: 60 * 60
	},
	notification_mark_read: {
		maxRequests: 30,
		windowSeconds: 15 * 60
	}
};
```

### Health Stats Cache

```typescript
// src/lib/server/healthStats.ts
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

### User Presence

```typescript
// src/lib/stores/presence.svelte.ts
const HEARTBEAT_INTERVAL = 180_000; // 3 minutes
const PRESENCE_TIMEOUT = 300_000; // 5 minutes (offline threshold)
```

---

## Data Limits

### Message Truncation

```typescript
// src/lib/server/errorMonitoring.ts
const MAX_MESSAGE_LENGTH = 1000;
const MAX_STACK_TRACE_LENGTH = 5000;

function sanitizeErrorData(data: ErrorData): ErrorData {
	return {
		...data,
		message: data.message?.slice(0, MAX_MESSAGE_LENGTH),
		stack_trace: data.stack_trace?.slice(0, MAX_STACK_TRACE_LENGTH)
	};
}
```

### Cleanup Defaults

```typescript
// Default cleanup age
const DEFAULT_CLEANUP_DAYS = 90;

// Cleanup resolved errors older than X days
await cleanupOldErrors(supabase, 90);
```

---

## PII Redaction Patterns

```typescript
// src/lib/utils/logger.ts
const PII_PATTERNS = {
	// Emails: user@domain.com → [email@redacted]
	email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

	// IPv4: 192.168.1.100 → 192.xxx.xxx.xxx
	ipv4: /\b(\d{1,3})\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,

	// IPv6: 2001:db8::1 → [IPv6_REDACTED]
	ipv6: /([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|...$/g,

	// UUIDs: 550e8400-e29b-... → 550e8400...
	uuid: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,

	// JWTs: eyJhbGciOi... → [JWT_REDACTED]
	jwt: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,

	// Bearer tokens: Bearer xxx → Bearer [REDACTED]
	bearer: /Bearer\s+[a-zA-Z0-9._-]+/gi,

	// Phone numbers: +33612345678 → [PHONE_REDACTED]
	phone: /(\+|00)[1-9]\d{6,14}/g
};

const SENSITIVE_FIELD_NAMES = [
	'password',
	'secret',
	'token',
	'apiKey',
	'api_key',
	'accessToken',
	'access_token',
	'refreshToken',
	'refresh_token',
	'authorization',
	'auth',
	'credential',
	'private',
	'ssn',
	'creditCard',
	'credit_card'
];
```

---

## Service Role Allowed Paths

```typescript
// src/lib/server/serviceRoleClient.ts
const ALLOWED_SERVICE_ROLE_PATHS = [
	'/api/cron/', // Cron jobs
	'rateLimiter.ts', // Rate limiting
	'errorMonitoring.ts', // Error logging
	'healthStats.ts', // Health statistics
	'serviceRoleClient.ts', // Self-reference
	'+server.ts' // API endpoints (with caution)
];
```

In development, warnings are logged if service role is used from unexpected locations.

---

## Modifying Configuration

### Adding New Rate Limit Types

```typescript
// 1. Add to type definition
type RateLimitType =
	| 'login_ip'
	| 'login_email'
	// ...
	| 'my_new_limit'; // Add here

// 2. Add configuration
const RATE_LIMITS: Record<RateLimitType, RateLimitConfig> = {
	// ...existing...
	my_new_limit: {
		maxRequests: 10,
		windowSeconds: 300 // 5 minutes
	}
};
```

### Adjusting Thresholds

**Slow Request Threshold**:

```typescript
// hooks.server.ts - find and modify
const SLOW_REQUEST_THRESHOLD = 5000; // Changed from 3000
```

**Client Error Rate Limit**:

```typescript
// src/lib/utils/errorMonitoring.ts
const CONFIG = {
	MAX_ERRORS_PER_MINUTE: 20 // Changed from 10
	// ...
};
```

### Adding PII Patterns

```typescript
// src/lib/utils/logger.ts
const PII_PATTERNS = {
	// ...existing...

	// Custom pattern for credit cards
	creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g
};

// Update redactPII() function to handle new pattern
```

---

## Environment Variables

Currently, the logging system does **not** use environment variables. All configuration is hardcoded for simplicity and predictability.

### Potential Future Variables

If external configuration is needed:

```bash
# .env (hypothetical)
LOG_LEVEL=info                    # trace|info|warn|error
SLOW_REQUEST_MS=3000              # Slow request threshold
ERROR_BATCH_SIZE=5                # Client error batch size
RATE_LIMIT_LOGIN_IP=5             # Login attempts per IP
HEALTH_CACHE_TTL_MS=300000        # Health stats cache
```

### Implementation Pattern

```typescript
import { env } from '$env/dynamic/private';

const SLOW_REQUEST_THRESHOLD = parseInt(env.SLOW_REQUEST_MS || '3000', 10);
```

---

## Database Configuration

### Rate Limit Table

Rate limits are stored in `rate_limits` table but configuration (max requests, window) is in code, not database.

### Error Retention

No automatic retention policy. Manual cleanup via:

- Admin dashboard
- `/api/errors/cleanup` endpoint
- Cron job (if configured)

---

## Related

- [Logger Utility](./logger-utility.md) - Logging implementation
- [Rate Limiting](./rate-limiting.md) - Rate limit details
- [Troubleshooting](./troubleshooting.md) - Common issues
