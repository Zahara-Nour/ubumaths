# Rate Limiting

> Database-backed and in-memory rate limiting for API protection.

---

## Overview

UbuMaths implements two complementary rate limiting systems:

| System                  | Storage    | Persistence  | Use Case                      |
| ----------------------- | ---------- | ------------ | ----------------------------- |
| **DB Rate Limiter**     | PostgreSQL | Persistent   | Authentication, critical APIs |
| **Memory Rate Limiter** | In-memory  | Per-instance | Simple endpoint protection    |

---

## Database Rate Limiter

**Source**: `src/lib/server/rateLimiter.ts`

### Features

- **Persistent across restarts**: Survives deployments
- **Atomic operations**: No race conditions (PostgreSQL UPDATE WHERE pattern)
- **Fail-open design**: Database errors allow requests (prevents DoS)
- **PII masking**: Logs don't expose user identifiers
- **Singleton client**: Connection reuse for performance

### Configured Limits

| Function                             | Limit  | Window | Identifier              |
| ------------------------------------ | ------ | ------ | ----------------------- |
| `checkLoginRateLimitByIP()`          | 5      | 15 min | IP address              |
| `checkLoginRateLimitByEmail()`       | 3      | 15 min | Email                   |
| `checkSignupRateLimitByIP()`         | 3      | 1 hour | IP address              |
| `checkOAuthRateLimitByIP()`          | 10     | 15 min | IP address              |
| `checkChatbotRateLimit()`            | 5      | 15 min | User ID                 |
| `checkNotificationCreateRateLimit()` | 10/50  | 1 hour | User ID (teacher/admin) |
| `checkNotificationDeleteRateLimit()` | 20/100 | 1 hour | User ID (teacher/admin) |
| `checkNotificationMarkRateLimit()`   | 30     | 15 min | User ID                 |

### Response Structure

```typescript
export interface RateLimitResult {
	allowed: boolean;
	message?: string; // French error message (only if blocked)
	retryAfter?: number; // Seconds until window resets (only if blocked)
}
```

---

## Function Reference

### Authentication Rate Limits

#### checkLoginRateLimitByIP()

Prevents brute force attacks by IP address.

```typescript
import { checkLoginRateLimitByIP } from '$lib/server/rateLimiter';

export const actions = {
	default: async ({ getClientAddress }) => {
		const ip = getClientAddress();

		const result = await checkLoginRateLimitByIP(ip);
		if (!result.allowed) {
			return fail(429, { error: result.message });
		}

		// Proceed with login...
	}
};
```

#### checkLoginRateLimitByEmail()

Stricter limit per email to prevent credential stuffing.

```typescript
import { checkLoginRateLimitByEmail } from '$lib/server/rateLimiter';

const result = await checkLoginRateLimitByEmail(email);
if (!result.allowed) {
	return fail(429, { error: result.message });
	// "Trop de tentatives de connexion pour cet email. Réessayez dans 15 minutes."
}
```

#### Dual Protection Pattern

```typescript
import { checkLoginRateLimitByIP, checkLoginRateLimitByEmail } from '$lib/server/rateLimiter';

export const actions = {
	default: async ({ request, getClientAddress }) => {
		const ip = getClientAddress();
		const formData = await request.formData();
		const email = String(formData.get('email'));

		// Check IP first (broader protection)
		const ipLimit = await checkLoginRateLimitByIP(ip);
		if (!ipLimit.allowed) {
			return fail(429, { error: ipLimit.message });
		}

		// Then check email (stricter, account-specific)
		const emailLimit = await checkLoginRateLimitByEmail(email);
		if (!emailLimit.allowed) {
			return fail(429, { error: emailLimit.message });
		}

		// Both passed - safe to attempt authentication
	}
};
```

#### checkSignupRateLimitByIP()

Prevents spam account creation.

```typescript
import { checkSignupRateLimitByIP } from '$lib/server/rateLimiter';

const result = await checkSignupRateLimitByIP(ip);
if (!result.allowed) {
	return fail(429, { error: result.message });
	// "Trop de tentatives d'inscription. Réessayez dans 1 heure."
}
```

#### checkOAuthRateLimitByIP()

Higher limit for OAuth flows (multiple redirects expected).

```typescript
import { checkOAuthRateLimitByIP } from '$lib/server/rateLimiter';

const result = await checkOAuthRateLimitByIP(ip);
if (!result.allowed) {
	throw error(429, result.message);
}
```

### API Rate Limits

#### checkChatbotRateLimit()

Controls AI API costs and prevents abuse.

```typescript
import { checkChatbotRateLimit } from '$lib/server/rateLimiter';

export const POST: RequestHandler = async ({ locals: { user } }) => {
	const result = await checkChatbotRateLimit(user.id);
	if (!result.allowed) {
		return json({ error: result.message }, { status: 429 });
	}

	// Process chatbot request...
};
```

### Notification Rate Limits

#### checkNotificationCreateRateLimit()

Role-based limits: teachers (10/hour), admins (50/hour).

```typescript
import { checkNotificationCreateRateLimit } from '$lib/server/rateLimiter';

const result = await checkNotificationCreateRateLimit(userId, 'teacher');
if (!result.allowed) {
	return fail(429, { error: result.message });
}
```

#### checkNotificationDeleteRateLimit()

Higher limits for deletions: teachers (20/hour), admins (100/hour).

```typescript
import { checkNotificationDeleteRateLimit } from '$lib/server/rateLimiter';

const result = await checkNotificationDeleteRateLimit(userId, 'admin');
if (!result.allowed) {
	return json({ error: result.message }, { status: 429 });
}
```

#### checkNotificationMarkRateLimit()

Prevents mark-read spam (30 per 15 minutes).

```typescript
import { checkNotificationMarkRateLimit } from '$lib/server/rateLimiter';

const result = await checkNotificationMarkRateLimit(userId);
if (!result.allowed) {
	return json({ error: result.message }, { status: 429 });
}
```

---

## Database Schema

```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,          -- 'ratelimit:login:ip:192.168.1.1'
  count INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rate_limits_key ON rate_limits(key);
CREATE INDEX idx_rate_limits_expires ON rate_limits(expires_at);
```

### Key Format

| Function            | Key Format                      |
| ------------------- | ------------------------------- |
| Login by IP         | `ratelimit:login:ip:{ip}`       |
| Login by email      | `ratelimit:login:email:{email}` |
| Signup              | `ratelimit:signup:{ip}`         |
| OAuth               | `ratelimit:oauth:{ip}`          |
| Chatbot             | `ratelimit:chat:{userId}`       |
| Notification create | `notification_create:{userId}`  |
| Notification delete | `notification_delete:{userId}`  |
| Notification mark   | `notification_mark:{userId}`    |

---

## Atomic Update Pattern

Prevents race conditions using PostgreSQL's atomic UPDATE WHERE:

```sql
-- Try to increment if below limit and not expired
UPDATE rate_limits
SET count = count + 1
WHERE key = $1
  AND count < $maxAttempts         -- 🔒 ATOMIC: Uses current value
  AND expires_at > NOW()           -- 🔒 ATOMIC: Ensure not expired
RETURNING count, expires_at;

-- If 0 rows affected: either limit exceeded or entry expired
```

### Race Condition Handling

```typescript
// From checkRateLimit() implementation:

// 1. Try atomic increment
const { data: updateResult } = await supabase
	.from('rate_limits')
	.update({ count: existing.count + 1 })
	.eq('key', key)
	.lt('count', maxAttempts) // Only if below limit
	.gte('expires_at', new Date().toISOString())
	.select()
	.maybeSingle();

// 2. If no rows updated, check why
if (!updateResult) {
	// Re-check: Did entry expire or was limit exceeded?
	const { data: recheck } = await supabase
		.from('rate_limits')
		.select('count, expires_at')
		.eq('key', key)
		.gte('expires_at', new Date().toISOString())
		.maybeSingle();

	if (!recheck) {
		// Entry expired during race → allow request
		return { limited: false, expiresAt: null };
	}

	// Limit exceeded
	return { limited: true, expiresAt: new Date(recheck.expires_at) };
}
```

---

## Fail-Open Design

Database errors allow requests to prevent DoS:

```typescript
async function checkRateLimit(config: RateLimitConfig) {
	try {
		// ... rate limit logic ...
	} catch (error) {
		logger.error('Rate limit error:', error);
		return { limited: false, expiresAt: null }; // FAIL OPEN
	}
}
```

**Why Fail-Open?**

- Prevents attackers from crashing the database to block all users
- Missing IP address or user ID also returns `allowed: true`
- Legitimate users aren't blocked by infrastructure issues

---

## In-Memory Rate Limiter

**Source**: `src/lib/server/middleware/rateLimit.ts`

### Features

- **Fast**: No database round-trip
- **Simple**: Map-based storage
- **Per-instance**: Resets on deployment
- **Auto-cleanup**: Expired entries removed

### Usage

```typescript
import { rateLimit, checkRateLimit } from '$lib/server/middleware/rateLimit';

// Throws 429 if exceeded
rateLimit(`error-log:${clientIp}`, 20, 60000); // 20/minute

// Returns boolean (doesn't throw)
if (!checkRateLimit(`preview:${userId}`, 5, 30000)) {
	return json({ error: 'Too many requests' }, { status: 429 });
}

// Get remaining requests
const remaining = getRemainingRequests(`api:${userId}`, 100);
```

### API

| Function                 | Returns   | Throws | Use Case          |
| ------------------------ | --------- | ------ | ----------------- |
| `rateLimit()`            | `void`    | 429    | Hard enforcement  |
| `checkRateLimit()`       | `boolean` | No     | Soft check        |
| `getRemainingRequests()` | `number`  | No     | Display remaining |

---

## Comparison

| Feature        | DB Rate Limiter         | Memory Rate Limiter |
| -------------- | ----------------------- | ------------------- |
| Persistence    | Survives restart        | Lost on restart     |
| Multi-instance | Shared across instances | Per-instance        |
| Speed          | ~10-50ms                | <1ms                |
| Atomicity      | Guaranteed              | Single-threaded     |
| Best for       | Auth, critical APIs     | Simple endpoints    |

### When to Use Which

**Use Database Rate Limiter**:

- Authentication (login, signup, OAuth)
- Password reset
- Payment APIs
- Any security-critical endpoint
- Multi-instance deployments

**Use Memory Rate Limiter**:

- Error logging endpoint
- Preview generation
- Non-critical API endpoints
- Single-instance deployments
- Very high throughput endpoints

---

## PII Masking in Logs

Rate limiter automatically masks sensitive data in logs:

```typescript
function maskKey(key: string): string {
	const value = key.split(':').pop();

	if (value?.includes('@')) {
		// Email: "us***@example.com"
		const [local, domain] = value.split('@');
		return `${local.substring(0, 2)}***@${domain}`;
	}

	if (value?.split('.').length === 4) {
		// IP: "192.***.***100"
		const parts = value.split('.');
		return `${parts[0]}.***.***${parts[3]}`;
	}

	// UUID/other: "a1b2***"
	return `${value?.substring(0, 4)}***`;
}
```

---

## Best Practices

### DO

```typescript
// Use the specific rate limit function for each use case
const result = await checkLoginRateLimitByIP(ip);

// Handle the result properly
if (!result.allowed) {
	return fail(429, {
		error: result.message, // Already in French
		retryAfter: result.retryAfter
	});
}

// Use dual protection for login
const ipLimit = await checkLoginRateLimitByIP(ip);
const emailLimit = await checkLoginRateLimitByEmail(email);
```

### DON'T

```typescript
// Don't ignore rate limit failures
await checkLoginRateLimitByIP(ip); // BAD: result not checked!

// Don't use memory limiter for auth
rateLimit(`login:${ip}`, 5, 900000); // BAD: use DB limiter

// Don't hardcode error messages (use result.message)
if (!result.allowed) {
	return fail(429, { error: 'Too many attempts' }); // BAD: not localized
}
```

---

## Implementation Locations

### Database Rate Limiter

| Section             | Lines    | Description                      |
| ------------------- | -------- | -------------------------------- |
| Service Role Client | 44-115   | Singleton Supabase client        |
| Types               | 117-134  | RateLimitConfig, RateLimitResult |
| Core Logic          | 136-318  | checkRateLimit() with atomicity  |
| Public Functions    | 400-1039 | 8 exported rate limit functions  |
| PII Masking         | 379-398  | maskKey() for log safety         |

### Usage in Codebase

| File                                       | Function Used                 |
| ------------------------------------------ | ----------------------------- |
| `src/routes/(auth)/login/+page.server.ts`  | checkLoginRateLimitByIP/Email |
| `src/routes/(auth)/signup/+page.server.ts` | checkSignupRateLimitByIP      |
| `src/routes/api/chatbot/+server.ts`        | checkChatbotRateLimit         |
| `src/routes/api/errors/log/+server.ts`     | In-memory rateLimit()         |

---

## Related

- [Error Monitoring](./error-monitoring.md) - Rate limited error endpoint
- [Security Guide](../security/api-security.md) - API security patterns
