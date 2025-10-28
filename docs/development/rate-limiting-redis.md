# Rate Limiting with Redis

> Migration guide from in-memory to Redis-based rate limiting

**Last Updated**: 2025-10-28
**Status**: Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Migration Summary](#migration-summary)
3. [Architecture](#architecture)
4. [Configuration](#configuration)
5. [Implementation Details](#implementation-details)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Overview

### Why Migrate to Redis?

**Problem with In-Memory Rate Limiting**:

- ❌ Not multi-instance safe (Vercel serverless runs multiple instances)
- ❌ Lost on server restart (counters reset)
- ❌ Memory leak risk (manual cleanup with setInterval)
- ❌ Race conditions in concurrent requests (Map operations not atomic)

**Solution with Redis Rate Limiting**:

- ✅ Multi-instance safe (shared state via Redis)
- ✅ Persists across restarts (Redis stores counters)
- ✅ Automatic cleanup (TTL-based expiration)
- ✅ Atomic operations (Redis INCR is atomic, no race conditions)
- ✅ Fail-open design (allows requests if Redis unavailable, prevents DoS)

---

## Migration Summary

| Aspect             | Before (In-Memory)                      | After (Redis)                 |
| ------------------ | --------------------------------------- | ----------------------------- |
| **Storage**        | JavaScript `Map<string, ...>`           | Redis (Upstash) with REST API |
| **Multi-instance** | ❌ Not safe (each instance has own Map) | ✅ Safe (shared Redis state)  |
| **Persistence**    | ❌ Lost on restart                      | ✅ Persists across restarts   |
| **Cleanup**        | ⚠️ Manual (setInterval every 60s)       | ✅ Automatic (TTL expiration) |
| **Atomicity**      | ❌ Map operations can race              | ✅ Redis INCR is atomic       |
| **Fail Mode**      | ✅ Fail-open (local fallback)           | ✅ Fail-open (catch errors)   |
| **Scalability**    | ❌ Limited to single instance           | ✅ Unlimited instances        |

---

## Architecture

### Before: In-Memory Rate Limiting

```typescript
// ❌ OLD IMPLEMENTATION (DEPRECATED)

// Per-instance storage (not shared across Vercel serverless functions)
const loginAttempts = new Map<string, { count: number; timestamp: number }>();
const signupAttempts = new Map<string, { count: number; timestamp: number }>();

// Manual cleanup (memory leak risk if setInterval fails)
setInterval(() => {
	const now = Date.now();
	const loginWindow = 900000; // 15 minutes

	for (const [key, value] of loginAttempts.entries()) {
		if (now - value.timestamp > loginWindow) {
			loginAttempts.delete(key);
		}
	}
}, 60000); // Check every minute

function checkLoginRateLimit(ip: string): boolean {
	const now = Date.now();
	const attempt = loginAttempts.get(ip);

	if (!attempt) {
		loginAttempts.set(ip, { count: 1, timestamp: now });
		return true; // Allowed
	}

	// Race condition: Multiple requests can read same count before increment
	if (now - attempt.timestamp > 900000) {
		loginAttempts.set(ip, { count: 1, timestamp: now });
		return true;
	}

	if (attempt.count >= 5) {
		return false; // Blocked
	}

	attempt.count++; // Race condition here!
	return true;
}
```

**Problems**:

1. **Multi-instance**: Each Vercel serverless instance has its own Map
   - User can bypass rate limit by triggering requests to different instances
2. **Restart**: Counters lost on deployment or restart
3. **Memory leak**: If setInterval cleanup fails, Map grows unbounded
4. **Race conditions**: Two concurrent requests can both read `count=4`, both increment to 5, both succeed (should have blocked one)

---

### After: Redis Rate Limiting

```typescript
// ✅ NEW IMPLEMENTATION (PRODUCTION)

import { checkRateLimit, CACHE_KEYS, TTL } from '$lib/server/cache';

async function checkLoginRateLimit(ip: string): Promise<RateLimitResult> {
	// Atomic increment + automatic TTL expiration
	const result = await checkRateLimit(
		CACHE_KEYS.RATE_LIMIT_LOGIN_IP(ip),
		5, // max attempts
		900 // window in seconds (15 minutes)
	);

	if (!result.allowed) {
		const minutes = Math.ceil((result.retryAfter || 0) / 60);
		return {
			allowed: false,
			message: `Trop de tentatives. Réessayez dans ${minutes} minute(s).`
		};
	}

	return { allowed: true };
}
```

**How it works**:

1. **First request** (IP: 192.168.1.1):

   ```
   Redis INCR ratelimit:login:ip:192.168.1.1  → Returns 1
   Redis EXPIRE ratelimit:login:ip:192.168.1.1 900  → Sets 15 min TTL
   Result: allowed=true, remaining=4
   ```

2. **Fifth request** (same IP):

   ```
   Redis INCR ratelimit:login:ip:192.168.1.1  → Returns 5
   Result: allowed=true, remaining=0 (last allowed request)
   ```

3. **Sixth request** (same IP):

   ```
   Redis INCR ratelimit:login:ip:192.168.1.1  → Returns 6
   Redis TTL ratelimit:login:ip:192.168.1.1  → Returns 780 (13 minutes left)
   Result: allowed=false, retryAfter=780
   ```

4. **After 15 minutes**:
   ```
   Redis automatically deletes key (TTL expired)
   Next request: INCR returns 1 again (counter reset)
   ```

**Benefits**:

- ✅ **Shared state**: All Vercel instances use same Redis counter
- ✅ **Atomic**: INCR operation is atomic, no race conditions
- ✅ **Auto cleanup**: TTL expires automatically, no memory leaks
- ✅ **Persistent**: Survives restarts and deployments

---

## Configuration

### Rate Limit Settings

**File**: `src/lib/server/rateLimiter.ts`

```typescript
const RATE_LIMIT_CONFIGS = {
	LOGIN_IP: {
		maxAttempts: 5 // 5 attempts per 15 minutes
	},

	LOGIN_EMAIL: {
		maxAttempts: 3 // 3 attempts per 15 minutes (stricter)
	},

	SIGNUP_IP: {
		maxAttempts: 3 // 3 attempts per hour
	},

	OAUTH_IP: {
		maxAttempts: 10 // 10 attempts per 15 minutes
	},

	CHATBOT: {
		maxAttempts: 5 // 5 requests per 15 minutes
	}
};
```

### TTL Configuration

**File**: `src/lib/server/cache.ts`

```typescript
export const TTL = {
	RATE_LIMIT_LOGIN: 900, // 15 minutes (login + OAuth)
	RATE_LIMIT_SIGNUP: 3600 // 1 hour (signup)
} as const;
```

### Cache Key Patterns

**File**: `src/lib/server/cache.ts`

```typescript
export const CACHE_KEYS = {
	RATE_LIMIT_LOGIN_IP: (ip: string) => `ratelimit:login:ip:${ip}`,

	RATE_LIMIT_LOGIN_EMAIL: (email: string) => `ratelimit:login:email:${email}`,

	RATE_LIMIT_SIGNUP: (ip: string) => `ratelimit:signup:${ip}`,

	RATE_LIMIT_OAUTH: (ip: string) => `ratelimit:oauth:${ip}`,

	RATE_LIMIT_CHAT: (userId: string) => `ratelimit:chat:${userId}`
};
```

**Key Format**: `ratelimit:{action}:{identifier_type}:{identifier}`

**Examples**:

- `ratelimit:login:ip:192.168.1.1`
- `ratelimit:login:email:user@example.com`
- `ratelimit:signup:192.168.1.1`
- `ratelimit:chat:550e8400-e29b-41d4-a716-446655440000`

---

## Implementation Details

### Core Rate Limiting Function

**File**: `src/lib/server/cache.ts`

```typescript
export async function checkRateLimit(
	key: string,
	maxAttempts: number,
	windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
	try {
		// Increment counter atomically (thread-safe)
		const count = await redis.incr(key);

		// Set expiry on first attempt (idempotent)
		if (count === 1) {
			await redis.expire(key, windowSeconds);
		}

		const remaining = Math.max(0, maxAttempts - count);
		const allowed = count <= maxAttempts;

		if (!allowed) {
			// Get TTL for Retry-After header
			const ttl = await redis.ttl(key);
			return { allowed: false, remaining: 0, retryAfter: ttl };
		}

		return { allowed: true, remaining };
	} catch (err) {
		console.error('[RateLimit] Redis error, failing open:', err);
		// Fail open (allow request) on Redis errors to prevent DoS
		return { allowed: true, remaining: maxAttempts };
	}
}
```

**Key Design Decisions**:

1. **Atomic INCR**: Redis INCR is atomic, no race conditions
2. **Idempotent EXPIRE**: Only set TTL on first attempt (count === 1)
3. **Fail-open**: If Redis down, allow requests (don't block users)
4. **Return retryAfter**: Clients can show "Try again in X minutes"

### Wrapper Functions

**File**: `src/lib/server/rateLimiter.ts`

#### Login Rate Limiting (IP-based)

```typescript
export async function checkLoginRateLimitByIP(ip: string): Promise<RateLimitResult> {
	if (!ip) {
		logger.warn('Missing IP address for rate limit check');
		return { allowed: true }; // Fail open
	}

	const config = RATE_LIMIT_CONFIGS.LOGIN_IP;
	const key = CACHE_KEYS.RATE_LIMIT_LOGIN_IP(ip);

	const result = await checkRateLimit(key, config.maxAttempts, TTL.RATE_LIMIT_LOGIN);

	if (!result.allowed) {
		const minutes = Math.ceil((result.retryAfter || 0) / 60);
		logger.warn('Login rate limit exceeded by IP', { ip: maskKey(ip), retryAfter: minutes });
		return {
			allowed: false,
			message: `Trop de tentatives de connexion. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`
		};
	}

	return { allowed: true };
}
```

#### Login Rate Limiting (Email-based)

```typescript
export async function checkLoginRateLimitByEmail(email: string): Promise<RateLimitResult> {
	if (!email) {
		logger.warn('Missing email for rate limit check');
		return { allowed: true }; // Fail open
	}

	// Normalize email to lowercase for consistent tracking
	const normalizedEmail = email.toLowerCase().trim();
	const config = RATE_LIMIT_CONFIGS.LOGIN_EMAIL;
	const key = CACHE_KEYS.RATE_LIMIT_LOGIN_EMAIL(normalizedEmail);

	const result = await checkRateLimit(key, config.maxAttempts, TTL.RATE_LIMIT_LOGIN);

	if (!result.allowed) {
		const minutes = Math.ceil((result.retryAfter || 0) / 60);
		logger.warn('Login rate limit exceeded by email', {
			email: maskKey(email),
			retryAfter: minutes
		});
		return {
			allowed: false,
			message: `Trop de tentatives de connexion pour cet email. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`
		};
	}

	return { allowed: true };
}
```

**Why Both IP and Email?**

- **IP-based**: Prevents brute force from single attacker
- **Email-based**: Prevents targeted attacks on specific accounts
- **Dual protection**: Attacker blocked even if rotating IPs or targeting multiple accounts

---

## Testing

### Unit Tests

**File**: `tests/unit/rateLimiter-redis.test.ts` (20 tests)

#### Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	checkLoginRateLimitByIP,
	checkLoginRateLimitByEmail,
	checkSignupRateLimitByIP,
	checkOAuthRateLimitByIP,
	checkChatbotRateLimit
} from '$lib/server/rateLimiter';

describe('checkLoginRateLimitByIP', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('allows requests under limit', async () => {
		// Mock Redis INCR to return count=3 (under limit of 5)
		mockRedis.incr.mockResolvedValue(3);
		mockRedis.expire.mockResolvedValue(1);

		const result = await checkLoginRateLimitByIP('192.168.1.1');

		expect(result.allowed).toBe(true);
		expect(mockRedis.incr).toHaveBeenCalledWith('ratelimit:login:ip:192.168.1.1');
	});

	it('blocks requests over limit', async () => {
		// Mock Redis INCR to return count=6 (over limit of 5)
		mockRedis.incr.mockResolvedValue(6);
		mockRedis.ttl.mockResolvedValue(780); // 13 minutes remaining

		const result = await checkLoginRateLimitByIP('192.168.1.1');

		expect(result.allowed).toBe(false);
		expect(result.message).toContain('Trop de tentatives');
		expect(result.message).toContain('13 minute'); // TTL converted to minutes
	});

	it('fails open when Redis unavailable', async () => {
		// Mock Redis error
		mockRedis.incr.mockRejectedValue(new Error('Redis connection failed'));

		const result = await checkLoginRateLimitByIP('192.168.1.1');

		// Should allow request (fail-open)
		expect(result.allowed).toBe(true);
	});
});
```

#### Test Coverage

- ✅ Allows requests under limit
- ✅ Blocks requests over limit
- ✅ Sets TTL on first request
- ✅ Converts TTL to human-readable message
- ✅ Normalizes email to lowercase
- ✅ Masks sensitive data in logs
- ✅ Fails open on Redis errors
- ✅ Handles missing IP/email gracefully

### E2E Tests

**File**: `e2e/redis-cache/rate-limiting.spec.ts` (7 tests)

#### Test Scenarios

```typescript
import { test, expect } from '@playwright/test';
import { loginAsTeacher } from '../helpers/auth-helpers';

test.describe('Login Rate Limiting by IP', () => {
	test('blocks login after 5 failed attempts from same IP', async ({ page }) => {
		// Attempt 6 failed logins
		for (let i = 1; i <= 6; i++) {
			await page.goto('/auth/signin');
			await page.fill('input[name="email"]', 'teacher@voltairedoha.com');
			await page.fill('input[name="password"]', 'wrong-password');
			await page.click('button[type="submit"]');
			await page.waitForLoadState('networkidle');

			if (i <= 5) {
				// First 5 attempts: Show "Invalid credentials"
				await expect(page.locator('text=/identifiants invalides/i')).toBeVisible();
			} else {
				// 6th attempt: Show rate limit message
				const hasRateLimitError = await page.locator('text=/trop de tentatives/i').isVisible();
				expect(hasRateLimitError).toBe(true);
			}
		}
	});
});
```

**Test Coverage**:

- ✅ IP-based rate limiting (5 attempts)
- ✅ Email-based rate limiting (3 attempts)
- ✅ Signup rate limiting (3 attempts per hour)
- ✅ Chatbot rate limiting (5 requests per 15 min)
- ✅ Separate rate limits for different IPs
- ✅ Successful login resets counter
- ✅ Graceful handling when Redis not configured

---

## Troubleshooting

### Issue 1: Rate Limit Too Strict

**Symptoms**: Legitimate users blocked after few attempts

**Diagnosis**:

```bash
# Check current configuration
grep -A 5 "RATE_LIMIT_CONFIGS" src/lib/server/rateLimiter.ts
```

**Fix**: Increase max attempts or window duration

```typescript
// Option 1: Increase max attempts
const RATE_LIMIT_CONFIGS = {
	LOGIN_IP: {
		maxAttempts: 10 // Increased from 5
	}
};

// Option 2: Implement whitelist
const TRUSTED_IPS = ['192.168.1.1', '10.0.0.1'];

export async function checkLoginRateLimitByIP(ip: string) {
	if (TRUSTED_IPS.includes(ip)) {
		return { allowed: true, remaining: Infinity };
	}
	// ... normal rate limit logic
}
```

---

### Issue 2: Rate Limit Not Working

**Symptoms**: Users can exceed limit without being blocked

**Diagnosis**:

```bash
# Check Redis connection
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# Test Redis connection
curl -X POST $UPSTASH_REDIS_REST_URL/ping \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
```

**Possible Causes**:

1. **Redis not configured**: Application fails open (allows all requests)
2. **Different cache keys**: IP extraction inconsistent
3. **Rate limit not called**: Check if rate limiting code is actually executed

**Fix**:

1. **Configure Redis**:

   ```bash
   # .env
   UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your_token_here
   ```

2. **Verify IP extraction**:

   ```typescript
   // In rate limit endpoint
   const ip = getClientAddress();
   console.log('[RateLimit] Checking IP:', ip);
   ```

3. **Ensure rate limit is called**:

   ```typescript
   // In login action
   export const actions = {
   	login: async ({ request, getClientAddress }) => {
   		const ip = getClientAddress();
   		console.log('[RateLimit] Checking rate limit for IP:', ip);

   		const ipLimit = await checkLoginRateLimitByIP(ip);
   		if (!ipLimit.allowed) {
   			console.log('[RateLimit] IP blocked');
   			return fail(429, { error: ipLimit.message });
   		}

   		console.log('[RateLimit] IP allowed');
   		// ... continue with login
   	}
   };
   ```

---

### Issue 3: Rate Limit Persists After TTL

**Symptoms**: User still blocked after time window expires

**Diagnosis**:

```bash
# Check Redis TTL
redis-cli TTL ratelimit:login:ip:192.168.1.1

# Or via Upstash dashboard:
# https://console.upstash.com/ → Database → Data Browser
```

**Possible Causes**:

1. **TTL not set**: EXPIRE command failed
2. **Clock skew**: Server time incorrect
3. **Cached error message**: Frontend showing old message

**Fix**:

1. **Verify TTL is set**:

   ```typescript
   const count = await redis.incr(key);
   if (count === 1) {
   	const result = await redis.expire(key, windowSeconds);
   	console.log('[RateLimit] Set TTL:', result); // Should be 1
   }
   ```

2. **Force reset** (emergency):

   ```bash
   # Delete rate limit key manually
   redis-cli DEL ratelimit:login:ip:192.168.1.1

   # Or via Upstash dashboard
   ```

---

### Issue 4: Rate Limit Bypassed by IP Rotation

**Symptoms**: Attacker bypasses IP-based rate limit using VPN/proxy rotation

**Diagnosis**: Check logs for multiple IPs with failed attempts to same email

**Fix**: Use email-based rate limiting (already implemented)

```typescript
// In login action - check BOTH IP and email
const ipLimit = await checkLoginRateLimitByIP(ip);
const emailLimit = await checkLoginRateLimitByEmail(email);

if (!ipLimit.allowed) {
	return fail(429, { error: ipLimit.message });
}

if (!emailLimit.allowed) {
	return fail(429, { error: emailLimit.message });
}
```

**Why it works**:

- Attacker can rotate IPs (bypass IP limit)
- Attacker can't rotate target email (blocked by email limit)

---

## Best Practices

### ✅ DO

1. **Use both IP and email rate limiting for logins**

   ```typescript
   const ipLimit = await checkLoginRateLimitByIP(ip);
   const emailLimit = await checkLoginRateLimitByEmail(email);
   ```

2. **Normalize identifiers before rate limiting**

   ```typescript
   const normalizedEmail = email.toLowerCase().trim();
   const key = CACHE_KEYS.RATE_LIMIT_LOGIN_EMAIL(normalizedEmail);
   ```

3. **Mask sensitive data in logs**

   ```typescript
   function maskKey(key: string): string {
   	if (key.includes('@')) {
   		const [local, domain] = key.split('@');
   		return `${local.substring(0, 2)}***@${domain}`;
   	}
   	// IP: show first and last octet
   	const parts = key.split('.');
   	if (parts.length === 4) {
   		return `${parts[0]}.***.***${parts[3]}`;
   	}
   	return `${key.substring(0, 4)}***`;
   }
   ```

4. **Fail open on Redis errors**

   ```typescript
   try {
   	return await checkRateLimit(key, maxAttempts, windowSeconds);
   } catch (err) {
   	console.error('[RateLimit] Redis error, failing open:', err);
   	return { allowed: true, remaining: maxAttempts };
   }
   ```

5. **Return user-friendly error messages**

   ```typescript
   const minutes = Math.ceil((retryAfter || 0) / 60);
   return {
   	allowed: false,
   	message: `Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`
   };
   ```

6. **Test rate limiting in E2E tests**
   ```typescript
   test('blocks after 5 failed attempts', async ({ page }) => {
   	for (let i = 1; i <= 6; i++) {
   		// ... attempt login
   	}
   	await expect(page.locator('text=/trop de tentatives/i')).toBeVisible();
   });
   ```

### ❌ DON'T

1. **Don't fail closed on Redis errors**

   ```typescript
   // BAD: Blocks all users if Redis down
   if (!redis.isConnected()) {
     return { allowed: false, message: 'Service unavailable' };
   }

   // GOOD: Allow requests if Redis down (fail-open)
   try {
     return await checkRateLimit(...);
   } catch {
     return { allowed: true };
   }
   ```

2. **Don't use only IP-based rate limiting**

   ```typescript
   // BAD: Can be bypassed with VPN/proxy rotation
   const ipLimit = await checkLoginRateLimitByIP(ip);

   // GOOD: Use both IP and email
   const ipLimit = await checkLoginRateLimitByIP(ip);
   const emailLimit = await checkLoginRateLimitByEmail(email);
   ```

3. **Don't log sensitive identifiers**

   ```typescript
   // BAD: Logs full email and IP
   console.log('Rate limit exceeded:', { email, ip });

   // GOOD: Mask sensitive data
   console.log('Rate limit exceeded:', {
   	email: maskKey(email),
   	ip: maskKey(ip)
   });
   ```

4. **Don't use hardcoded rate limit keys**

   ```typescript
   // BAD: Hardcoded key
   await redis.incr(`login:${ip}`);

   // GOOD: Use key generator
   await redis.incr(CACHE_KEYS.RATE_LIMIT_LOGIN_IP(ip));
   ```

5. **Don't ignore retryAfter value**

   ```typescript
   // BAD: No indication when user can retry
   return fail(429, { error: 'Too many requests' });

   // GOOD: Show retry time
   const minutes = Math.ceil((retryAfter || 0) / 60);
   return fail(429, {
   	error: `Too many requests. Try again in ${minutes} minutes.`
   });
   ```

---

## Migration Checklist

If migrating from in-memory to Redis rate limiting:

- [ ] Configure Upstash Redis credentials in `.env`
- [ ] Update rate limit functions to use `checkRateLimit()`
- [ ] Remove old `Map<>` storage and cleanup code
- [ ] Add unit tests for new rate limiting
- [ ] Add E2E tests for rate limiting
- [ ] Update documentation
- [ ] Test in staging environment
- [ ] Monitor error rates after deployment
- [ ] Verify rate limits work as expected
- [ ] Remove old in-memory rate limiting code

---

## References

### Internal Documentation

- [Redis Caching Architecture](../architecture/redis-caching.md) - Full cache documentation
- [Redis Cache Setup Guide](../guides/redis-cache-setup.md) - Setup instructions

### Code Files

- `src/lib/server/cache.ts` - Core rate limiting function
- `src/lib/server/rateLimiter.ts` - Wrapper functions
- `tests/unit/rateLimiter-redis.test.ts` - Unit tests
- `e2e/redis-cache/rate-limiting.spec.ts` - E2E tests

### External Resources

- [Upstash Redis Documentation](https://upstash.com/docs/redis)
- [Redis INCR Command](https://redis.io/commands/incr)
- [Redis EXPIRE Command](https://redis.io/commands/expire)

---

**Last Updated**: 2025-10-28
**Maintained By**: Development Team
**Status**: Production Ready
