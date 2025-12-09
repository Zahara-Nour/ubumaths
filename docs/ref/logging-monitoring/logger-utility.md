# Logger Utility

> Development and production logging with automatic PII redaction.

**Source**: `src/lib/utils/logger.ts`

---

## Overview

The logger utility provides two distinct logger factories:

| Factory                | Use Case                       | Production Behavior   |
| ---------------------- | ------------------------------ | --------------------- |
| `createLogger()`       | Client/server dev debugging    | No-op (disabled)      |
| `createServerLogger()` | Server-side production logging | Full logging + redact |

---

## createLogger()

A development-focused logger with colored output.

### Usage

```typescript
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('MyComponent.svelte');

logger.trace('Detailed debug info');
logger.info('Component initialized');
logger.warn('Using deprecated API');
logger.error('Operation failed', error);
```

### Log Levels

| Level   | Priority | Color  | Use Case                   |
| ------- | -------- | ------ | -------------------------- |
| `trace` | 0        | Gray   | Verbose debugging          |
| `info`  | 1        | Blue   | General information        |
| `warn`  | 2        | Yellow | Warnings, potential issues |
| `error` | 3        | Red    | Errors, failures           |

### Level Filtering

Only logs at or above the threshold are displayed:

```typescript
// Only show warnings and errors
const logger = createLogger('MyModule', 'warn');

logger.info('This is hidden');
logger.warn('This is shown');
logger.error('This is shown');
```

### Output Format

**Terminal (Node.js)**:

```
[2:34:56 PM] [MyComponent.svelte] Component initialized
```

**Browser Console**:

```
%c[2:34:56 PM] [MyComponent.svelte]%c Component initialized
```

With CSS styling for colors.

### Production Behavior

In production (`dev === false`), `createLogger()` returns no-op functions:

```typescript
// In production, these do nothing:
logger.info('Hidden in production');
logger.error('Also hidden');
```

**This is intentional** to prevent leaking debug information to browser consoles.

---

## createServerLogger()

A production-safe logger with automatic PII redaction.

### Usage

```typescript
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/users/+server.ts');

logger.info('User authenticated', { userId: 'abc123', email: 'user@test.com' });
logger.error('Database error', { query: 'SELECT * FROM users', ip: '192.168.1.1' });
```

### Key Differences from createLogger()

| Feature             | createLogger()        | createServerLogger() |
| ------------------- | --------------------- | -------------------- |
| Works in production | No (no-op)            | Yes                  |
| PII redaction       | No                    | Yes                  |
| Server-side only    | No                    | Yes                  |
| Log levels          | trace/info/warn/error | info/warn/error      |

### Automatic PII Redaction

The server logger automatically sanitizes sensitive data:

| Data Type        | Pattern                   | Redacted To         |
| ---------------- | ------------------------- | ------------------- |
| Email addresses  | `user@example.com`        | `[email@redacted]`  |
| IPv4 addresses   | `192.168.1.100`           | `192.xxx.xxx.xxx`   |
| IPv6 addresses   | `2001:db8::1`             | `[IPv6_REDACTED]`   |
| UUIDs            | `550e8400-e29b-...`       | `550e8400...`       |
| JWT tokens       | `eyJhbGciOiJI...`         | `[JWT_REDACTED]`    |
| Bearer tokens    | `Bearer abc123...`        | `Bearer [REDACTED]` |
| API keys         | `sk_live_abc...`          | `[REDACTED]`        |
| Phone numbers    | `+33612345678`            | `[PHONE_REDACTED]`  |
| Sensitive fields | `password`, `token`, etc. | `[REDACTED]`        |

### Redaction Examples

```typescript
const logger = createServerLogger('api/auth');

// Input
logger.info('Login attempt', {
	email: 'john.doe@company.com',
	ip: '203.0.113.42',
	token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
});

// Output
// [3:45:12 PM] [api/auth] Login attempt {
//   email: '[email@redacted]',
//   ip: '203.xxx.xxx.xxx',
//   token: '[JWT_REDACTED]'
// }
```

### Sensitive Field Names

The following field names are automatically redacted:

```typescript
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

## Implementation Details

### File Location

**Line references** in `src/lib/utils/logger.ts`:

| Function               | Lines   | Description                |
| ---------------------- | ------- | -------------------------- |
| `createLogger()`       | 282-322 | Development logger factory |
| `createServerLogger()` | 383-419 | Production server logger   |
| `redactPII()`          | 324-381 | PII redaction helper       |
| `formatTimestamp()`    | 269-280 | Timestamp formatting       |

### Color Codes

**ANSI (Terminal)**:

```typescript
const COLORS = {
	trace: '\x1b[90m', // Gray
	info: '\x1b[36m', // Cyan
	warn: '\x1b[33m', // Yellow
	error: '\x1b[31m', // Red
	reset: '\x1b[0m'
};
```

**CSS (Browser)**:

```typescript
const CSS_COLORS = {
	trace: 'color: #888',
	info: 'color: #0066cc',
	warn: 'color: #cc6600',
	error: 'color: #cc0000'
};
```

---

## Best Practices

### DO

```typescript
// Use descriptive module names
const logger = createServerLogger('api/payments/process');

// Log with context objects
logger.info('Payment processed', {
	amount: 100,
	currency: 'EUR',
	userId: user.id
});

// Use appropriate log levels
logger.error('Payment failed', {
	error: error.message,
	code: error.code
});
```

### DON'T

```typescript
// Don't use createLogger() in production code paths
// It will be silently disabled

// Don't manually construct sensitive strings
logger.info(`User ${email} logged in`); // BAD: email not redacted

// Don't log passwords even with redaction
logger.info('Auth', { password: '...' }); // Avoid entirely
```

### Migration Guide

**From console.log**:

```typescript
// Before
console.log('[MyModule] Processing user:', userId);

// After (development)
const logger = createLogger('MyModule');
logger.info('Processing user', { userId });

// After (production server)
const logger = createServerLogger('MyModule');
logger.info('Processing user', { userId });
```

---

## Related

- [Error Monitoring](./error-monitoring.md) - Error capture system
- [Configuration](./configuration.md) - Environment-based behavior
