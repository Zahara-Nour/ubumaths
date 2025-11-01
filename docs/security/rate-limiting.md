# Rate Limiting

## Overview

UbuMaths implements comprehensive rate limiting on authentication endpoints to prevent brute force attacks, credential stuffing, and account enumeration attacks. This is a critical security control that protects user accounts and system resources.

**Status**: Implemented (2025-10-27)
**Priority**: P0 - Critical Security Feature
**Location**: `src/lib/server/rateLimiter.ts`

---

## Security Threat Model

### Threats Mitigated

1. **Brute Force Attacks**
   - **Attack**: Automated attempts to guess passwords
   - **Mitigation**: Rate limit login attempts by IP and email

2. **Credential Stuffing**
   - **Attack**: Using leaked credentials from other breaches
   - **Mitigation**: Strict rate limits prevent bulk credential testing

3. **Account Enumeration**
   - **Attack**: Discovering valid email addresses
   - **Mitigation**: Rate limits make enumeration impractical

4. **Signup Spam/Bot Accounts**
   - **Attack**: Mass account creation for spam or abuse
   - **Mitigation**: Rate limit signup attempts by IP

5. **OAuth Flow Abuse**
   - **Attack**: Excessive OAuth requests causing costs or DoS
   - **Mitigation**: Rate limit OAuth initiation by IP

---

## Rate Limit Configuration

### Login Attempts (Email/Password)

**IP-based Limits**:

- **Max attempts**: 5 per 15 minutes
- **Block duration**: 15 minutes (first violation)
- **Exponential backoff**: 2x, 4x, 8x up to 24 hours max
- **Storage**: `loginIPStore`

**Email-based Limits** (Stricter):

- **Max attempts**: 3 per 15 minutes
- **Block duration**: 15 minutes (first violation)
- **Exponential backoff**: 2x, 4x, 8x up to 24 hours max
- **Storage**: `emailStore`
- **Notes**: Email normalization (lowercase) prevents case-based bypass

**Why dual limits?**

- IP-based: Protects against distributed attacks from single organization
- Email-based: Protects specific accounts even if attacker changes IPs

### Signup Attempts

**IP-based Limits**:

- **Max attempts**: 3 per hour
- **Block duration**: 30 minutes (first violation)
- **Exponential backoff**: 2x, 4x, 8x up to 24 hours max
- **Storage**: `signupIPStore`

**Rationale**: Signup is more resource-intensive and has lower legitimate retry rate

### OAuth Attempts

**IP-based Limits**:

- **Max attempts**: 10 per 15 minutes
- **Block duration**: 15 minutes (first violation)
- **Exponential backoff**: 2x, 4x, 8x up to 24 hours max
- **Storage**: `oauthIPStore`

**Rationale**: OAuth redirects may legitimately occur multiple times (user confusion, accidental clicks)

---

## Implementation Details

### Architecture

```
Request → Rate Limit Check → Allow/Block Decision → HTTP 429 or Proceed
                ↓
         In-Memory Store
         (loginIPStore, emailStore, signupIPStore, oauthIPStore)
                ↓
         Cleanup Timer (every 5 minutes)
```

### Data Structure

```typescript
interface RateLimitEntry {
	attempts: number; // Current attempt count
	firstAttempt: number; // Timestamp of first attempt in window
	blockUntil: number | null; // Timestamp when block expires
	violationCount: number; // Number of times user has been blocked
}
```

### Exponential Backoff

Block duration increases exponentially on repeated violations:

```typescript
blockDuration = (baseBlockDuration * 2) ^ violationCount;
```

**Example**:

- 1st violation: 15 minutes
- 2nd violation: 30 minutes
- 3rd violation: 1 hour
- 4th violation: 2 hours
- Maximum: 24 hours

### Cleanup Mechanism

Expired entries are automatically removed every 5 minutes:

```typescript
CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
```

**Cleanup criteria**:

- Window has expired AND
- Not currently blocked OR block has expired

**Memory management**:

- Prevents unbounded memory growth
- Timer uses `unref()` to not prevent process exit

---

## Usage Examples

### Login Action

```typescript
// src/routes/(public)/auth/login/+page.server.ts
import { checkLoginRateLimitByIP, checkLoginRateLimitByEmail } from '$lib/server/rateLimiter';

export const actions = {
	login: async ({ request, locals: { supabase }, getClientAddress }) => {
		const email = formData.get('email') as string;
		const clientIP = getClientAddress();

		// Check IP-based rate limit
		const ipLimit = checkLoginRateLimitByIP(clientIP);
		if (!ipLimit.allowed) {
			return fail(429, { error: ipLimit.message });
		}

		// Check email-based rate limit (stricter)
		const emailLimit = checkLoginRateLimitByEmail(email);
		if (!emailLimit.allowed) {
			return fail(429, { error: emailLimit.message });
		}

		// Proceed with authentication...
	}
};
```

### Signup Action

```typescript
// src/routes/(public)/signup/+page.server.ts
import { checkSignupRateLimitByIP } from '$lib/server/rateLimiter';

export const actions = {
	signup: async ({ request, locals: { supabase }, getClientAddress }) => {
		const clientIP = getClientAddress();

		// Check rate limit BEFORE processing signup
		const rateLimitResult = checkSignupRateLimitByIP(clientIP);
		if (!rateLimitResult.allowed) {
			return fail(429, { error: rateLimitResult.message });
		}

		// Proceed with signup...
	}
};
```

### OAuth Action

```typescript
// src/routes/(public)/auth/login/+page.server.ts
import { checkOAuthRateLimitByIP } from '$lib/server/rateLimiter';

export const actions = {
	googleSignIn: async ({ locals: { supabase }, url, getClientAddress }) => {
		const clientIP = getClientAddress();
		const rateLimitResult = checkOAuthRateLimitByIP(clientIP);

		if (!rateLimitResult.allowed) {
			return fail(429, { error: rateLimitResult.message });
		}

		// Proceed with OAuth flow...
	}
};
```

---

## API Reference

### Check Functions

#### `checkLoginRateLimitByIP(ip: string): RateLimitResult`

Check login rate limit by IP address.

**Parameters**:

- `ip`: Client IP address from `getClientAddress()`

**Returns**: `RateLimitResult`

**Fail-safe**: Returns `{ allowed: true }` if IP is missing (fail open)

---

#### `checkLoginRateLimitByEmail(email: string): RateLimitResult`

Check login rate limit by email address (stricter than IP).

**Parameters**:

- `email`: User email (automatically normalized to lowercase)

**Returns**: `RateLimitResult`

**Fail-safe**: Returns `{ allowed: true }` if email is missing (fail open)

---

#### `checkSignupRateLimitByIP(ip: string): RateLimitResult`

Check signup rate limit by IP address.

**Parameters**:

- `ip`: Client IP address from `getClientAddress()`

**Returns**: `RateLimitResult`

---

#### `checkOAuthRateLimitByIP(ip: string): RateLimitResult`

Check OAuth rate limit by IP address.

**Parameters**:

- `ip`: Client IP address from `getClientAddress()`

**Returns**: `RateLimitResult`

---

### RateLimitResult Interface

```typescript
interface RateLimitResult {
	allowed: boolean; // Whether request should be allowed
	remainingAttempts?: number; // Attempts remaining before block
	resetTime?: number; // Timestamp when attempts reset
	retryAfter?: number; // Seconds until unblocked (if blocked)
	message?: string; // French error message for user
}
```

**Example responses**:

```typescript
// Allowed
{
  allowed: true,
  remainingAttempts: 3,
  resetTime: 1698765432000
}

// Blocked
{
  allowed: false,
  retryAfter: 897,  // ~15 minutes
  message: "Trop de tentatives. Compte bloqué pendant 15 minutes."
}
```

---

### Admin Functions

#### `resetRateLimit(key: string, type: 'login-ip' | 'email' | 'signup-ip' | 'oauth-ip'): void`

Manually reset rate limit for a specific key (admin override).

**Use cases**:

- Unblock legitimate users
- Testing
- Customer support escalations

**Example**:

```typescript
// Unblock specific IP
resetRateLimit('192.168.1.100', 'login-ip');

// Unblock specific email
resetRateLimit('user@example.com', 'email');
```

---

#### `getRateLimitStatus(key: string, type: ...): RateLimitEntry | null`

Get current rate limit status for monitoring/debugging.

**Returns**: `RateLimitEntry` or `null` if no record exists

**Example**:

```typescript
const status = getRateLimitStatus('192.168.1.100', 'login-ip');
console.log({
	attempts: status?.attempts,
	blocked: status?.blockUntil ? Date.now() < status.blockUntil : false,
	violationCount: status?.violationCount
});
```

---

#### `getRateLimiterStats(): Stats`

Get aggregate statistics for monitoring.

**Returns**:

```typescript
{
	loginIPEntries: number;
	emailEntries: number;
	signupIPEntries: number;
	oauthIPEntries: number;
	totalEntries: number;
}
```

**Example**:

```typescript
const stats = getRateLimiterStats();
console.log(`Total tracked: ${stats.totalEntries}`);
```

---

#### `shutdown(): void`

Clean up resources on process termination.

**Auto-registered**: Automatically called on SIGTERM/SIGINT

**Manual usage**: Only needed for testing or custom shutdown logic

---

## User Experience

### Error Messages

All error messages are in French and user-friendly:

```typescript
// Short duration (< 1 minute)
'Trop de tentatives. Veuillez réessayer dans 45 secondes.';

// Medium duration (minutes)
'Trop de tentatives. Veuillez réessayer dans 15 minutes.';

// Long duration (hours)
'Trop de tentatives. Compte bloqué pendant 2 heures.';
```

### HTTP Status Codes

Rate-limited requests return **HTTP 429 Too Many Requests**

**Client handling**:

```typescript
if (response.status === 429) {
	// Show retry-after message to user
	// Disable form for retryAfter seconds
	// Show countdown timer
}
```

---

## Production Considerations

### Current Implementation: In-Memory Storage

**Suitable for**:

- Single-instance deployments
- Development/staging environments
- Applications with single server

**Limitations**:

- Does NOT share state across multiple instances
- Lost on server restart
- Not suitable for horizontal scaling

**Memory usage**:

- ~100 bytes per tracked IP/email
- Auto-cleanup prevents unbounded growth
- Typical usage: 1,000-10,000 entries = 100KB-1MB

---

### Migration to Database-Backed Rate Limiting (COMPLETE - 2025-10-30)

**Status**: ✅ **Migration Complete**

The rate limiting system has been migrated from in-memory storage to a database-backed implementation using Supabase's `rate_limits` table.

**Current Implementation** (`src/lib/server/rateLimiter.ts`):

- **Storage**: Supabase `rate_limits` table with atomic counters
- **Endpoints Protected**: Login (5/15min), Signup (3/1hour), OAuth (10/15min), Chatbot (5/15min)
- **Multi-instance Safe**: Shared state across all Vercel serverless instances
- **Automatic Cleanup**: Expired entries removed via database triggers
- **Atomic Operations**: Uses `UPSERT` with conflict resolution for thread-safe increments

**Benefits of Database-Backed Approach**:

- ✅ Shared state across all instances (Vercel serverless compatible)
- ✅ Persistent across restarts
- ✅ No external dependencies (no Redis/Upstash needed)
- ✅ Automatic cleanup via database triggers
- ✅ Atomic operations via PostgreSQL `ON CONFLICT` clause
- ✅ Lower operational complexity (one less service to manage)
- ✅ Cost-effective (uses existing Supabase infrastructure)

**Performance Considerations**:

- Database queries: ~50-100ms per rate limit check
- Acceptable latency for authentication endpoints (security > speed)
- Indexes ensure fast lookups: `idx_rate_limits_key`, `idx_rate_limits_expires_at`

**Trade-offs vs Redis**:

| Aspect           | Database-Backed (Current) | Redis-Based (Previous)  |
| ---------------- | ------------------------- | ----------------------- |
| Latency          | ~50-100ms                 | ~10-20ms                |
| Setup Complexity | Low (uses existing DB)    | Medium (external Redis) |
| Cost             | Included in Supabase      | $0-20/month             |
| Multi-instance   | ✅ Yes                    | ✅ Yes                  |
| Persistence      | ✅ Yes                    | ✅ Yes                  |
| Auto-cleanup     | ✅ Yes (triggers)         | ✅ Yes (TTL)            |

**Why Database Over Redis?**

For UbuMaths' scale (~100-1000 users), the ~50ms extra latency on authentication endpoints is negligible compared to:

- Simplified architecture (no Redis management)
- Lower operational cost ($0 vs $20/month)
- Reduced deployment complexity
- Easier debugging (data visible in Supabase dashboard)

**Reference**: See [Database Schema](../architecture/database-schema.md) for `rate_limits` table structure.

---

## Testing

### Unit Tests

Comprehensive test suite: `src/lib/server/rateLimiter.test.ts`

**Coverage**:

- ✅ 26/26 tests passing
- ✅ Basic rate limiting (IP and email)
- ✅ Exponential backoff
- ✅ Cleanup mechanism
- ✅ Edge cases (IPv6, special characters, concurrent requests)
- ✅ French error messages
- ✅ Admin functions (reset, status, stats)

**Run tests**:

```bash
pnpm test:unit rateLimiter.test.ts
```

---

### Manual Testing

#### Test Blocked Login

```bash
# Attempt 6 logins from same IP
for i in {1..6}; do
  curl -X POST http://localhost:5175/auth/login?/login \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "email=test@example.com&password=wrong" \
    -H "X-Forwarded-For: 192.168.1.1"
done

# 6th request should return HTTP 429
```

#### Test Blocked Signup

```bash
# Attempt 4 signups from same IP
for i in {1..4}; do
  curl -X POST http://localhost:5175/signup?/signup \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "email=test$i@example.com&password=test1234&confirmPassword=test1234" \
    -H "X-Forwarded-For: 192.168.1.1"
done

# 4th request should return HTTP 429
```

---

## Monitoring & Alerts

### Metrics to Track

1. **Rate Limit Hit Rate**
   - Track how often limits are exceeded
   - Alert if unusually high (potential attack)

2. **Total Tracked Entries**
   - Monitor memory usage via `getRateLimiterStats()`
   - Alert if growth is unbounded

3. **Violation Patterns**
   - Track IPs/emails with high violation counts
   - Investigate potential attackers

### Logging

All rate limit violations are logged:

```typescript
logger.warn('Login rate limit exceeded by IP', { ip: clientIP });
logger.warn('Login rate limit exceeded by email', { email });
logger.warn('Signup rate limit exceeded', { ip: clientIP });
logger.warn('OAuth rate limit exceeded', { ip: clientIP });
```

**Sensitive data masking**:

- IPs: `192.***.***100`
- Emails: `te***@example.com`

---

## Security Best Practices

### ✅ Implemented

1. **Fail Open on Errors**
   - Missing IP/email returns `allowed: true`
   - Prevents DoS from rate limiter failures

2. **Check BEFORE Database Queries**
   - Rate limit check happens first
   - Prevents expensive operations on blocked requests

3. **Separate Stores**
   - Login, signup, OAuth use different stores
   - Prevents cross-contamination

4. **Email Normalization**
   - Lowercase + trim prevents case-based bypass
   - `Test@Example.Com` === `test@example.com`

5. **Exponential Backoff**
   - Discourages persistent attackers
   - Balances security vs. legitimate user recovery

6. **French Error Messages**
   - User-friendly
   - No sensitive information leakage

### 🔐 Additional Recommendations

1. **CAPTCHA Integration**
   - Add CAPTCHA after 2-3 failed attempts
   - Reduces automated attacks

2. **Account Lockout**
   - Temporary account lockout after excessive failures
   - Requires database integration

3. **IP Reputation**
   - Integrate with IP reputation services
   - Block known malicious IPs preemptively

4. **Geofencing**
   - Restrict logins to expected countries
   - UbuMaths is Qatar-focused

5. **Multi-Factor Authentication**
   - Require MFA for sensitive accounts
   - Reduces credential theft impact

---

## Troubleshooting

### Issue: Legitimate User Blocked

**Symptom**: User reports unable to login/signup

**Diagnosis**:

```typescript
// Check status
const status = getRateLimitStatus(userIP, 'login-ip');
console.log(status);
```

**Resolution**:

```typescript
// Manual unblock
resetRateLimit(userIP, 'login-ip');
resetRateLimit(userEmail, 'email');
```

---

### Issue: Rate Limiter Not Working

**Symptom**: No rate limiting observed

**Diagnosis**:

1. Check `getClientAddress()` returns valid IP
2. Verify rate limit check is BEFORE authentication
3. Check logs for rate limit hits

**Common causes**:

- Development environment returns `127.0.0.1` for all requests
- Missing `getClientAddress()` in action signature
- Rate limit check after authentication (wrong order)

---

### Issue: Memory Growth

**Symptom**: Increasing memory usage over time

**Diagnosis**:

```typescript
const stats = getRateLimiterStats();
console.log(`Total entries: ${stats.totalEntries}`);
```

**Resolution**:

- Verify cleanup timer is running
- Check for IPs with very long-lived entries
- Consider shorter cleanup interval
- Migrate to Redis for production

---

## References

- **OWASP**: [Blocking Brute Force Attacks](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)
- **Implementation**: `src/lib/server/rateLimiter.ts`
- **Tests**: `src/lib/server/rateLimiter.test.ts`
- **Integration**:
  - `src/routes/(public)/auth/login/+page.server.ts`
  - `src/routes/(public)/signup/+page.server.ts`

---

## Changelog

### 2025-11-01: HMR-Safe Singleton Fix

**Problem**: Hot Module Replacement (HMR) was resetting the Supabase service role client on every file save, causing:

- "TypeError: fetch failed" errors from connection pool exhaustion
- Infinite retry loops on INSERT failures (expired entries blocking new inserts)
- Google OAuth login hanging for 220+ seconds

**Solution**: Implemented HMR-safe singleton pattern using `globalThis`

**Changes**:

- ✅ Service role client now persists across HMR reloads (`globalThis.supabaseServiceRoleClient`)
- ✅ Added retry limit (max 3 attempts) to prevent infinite loops
- ✅ Auto-cleanup of expired entries after max retries (fail-open strategy)
- ✅ Removed verbose debug logging (uses proper logger levels)
- ✅ Created `cleanup-expired-rate-limits.js` utility script

**Impact**:

- Google OAuth login: 220s+ → ~500-700ms ✅
- No more infinite retry loops ✅
- Cleaner console output ✅
- HMR-safe in development ✅

**Files Modified**:

- `src/lib/server/rateLimiter.ts` - HMR-safe singleton + retry limits
- `src/routes/(public)/auth/login/+page.server.ts` - Re-enabled rate limiting
- `cleanup-expired-rate-limits.js` - Manual cleanup utility (NEW)

**Reference**: See commit for detailed implementation

---

### 2025-10-30: Database-Backed Migration

- ✅ Migrated from in-memory to Supabase `rate_limits` table
- ✅ Multi-instance compatible (Vercel serverless ready)
- ✅ Automatic cleanup via database triggers
- ✅ Atomic operations using PostgreSQL `ON CONFLICT`

---

### 2025-10-27: Initial Implementation

- ✅ Comprehensive rate limiter utility created
- ✅ Integrated into login (email/password & OAuth)
- ✅ Integrated into signup
- ✅ 26 unit tests (100% pass rate)
- ✅ Documentation complete
- 🎯 Status: **PRODUCTION READY** (single-instance)
- 📋 TODO: Migrate to Redis for multi-instance deployments
