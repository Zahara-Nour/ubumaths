# CRON Authentication Implementation

**Status**: ✅ Implemented (2025-11-10)
**Security Level**: High (Constant-time comparison, fail-secure)

## Overview

Secure authentication system for CRON endpoints using Bearer token authentication with constant-time comparison to prevent timing attacks.

## Implementation Summary

### Files Created

1. **`src/lib/server/auth/cron.ts`** (NEW)
   - `verifyCronAuth(request)` - Validates CRON requests
   - `generateCronSecret()` - Generates secure 32-char secrets
   - Uses `crypto.timingSafeEqual()` for constant-time comparison
   - Comprehensive JSDoc documentation

### Files Modified

2. **`src/routes/api/cache/cleanup/+server.ts`**
   - Added `verifyCronAuth(request)` call at handler start
   - Added `request` parameter to handler signature
   - No other changes to existing logic

3. **`src/routes/api/notifications/cleanup/+server.ts`**
   - Refactored to single `cleanupHandler` for both GET/POST
   - Added `verifyCronAuth(request)` call at handler start
   - Removed commented-out auth code
   - No other changes to existing logic

4. **`vercel.json`**
   - Added `Authorization: Bearer ${CRON_SECRET}` headers
   - Added notifications cleanup CRON (3 AM UTC)
   - Kept cache cleanup CRON (2 AM UTC)

## Security Features

### 1. Constant-Time Comparison

Prevents timing attacks by using `crypto.timingSafeEqual()`:

```typescript
const expectedBuffer = Buffer.from(env.CRON_SECRET, 'utf8');
const providedBuffer = Buffer.from(providedToken, 'utf8');

if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
	throw error(401, 'Unauthorized: Invalid token');
}
```

### 2. Fail-Secure Design

If `CRON_SECRET` is not configured, all CRON endpoints are disabled:

```typescript
if (!env.CRON_SECRET) {
	console.error('[CRON AUTH] CRON_SECRET not configured');
	throw error(503, 'CRON endpoints disabled: CRON_SECRET not configured');
}
```

### 3. Comprehensive Logging

All authentication attempts are logged (success and failure):

```typescript
// Success
console.log('[CRON AUTH] ✅ Valid token', { url, method, timestamp });

// Failure
console.warn('[CRON AUTH] Invalid token (value mismatch)', { url });
```

### 4. Input Validation

- Validates Authorization header presence
- Validates Bearer token format (case-insensitive)
- Checks buffer lengths before comparison
- Prevents header leakage in logs (first 20 chars only)

## Configuration

### Environment Variables

Add to `.env` (already exists in `.env.example`):

```bash
# Generate a secure secret (32 characters)
CRON_SECRET=your-32-character-secret-here
```

### Generate Secret

```bash
node -e "
const { createHash } = require('crypto');
const hash = createHash('sha256')
  .update(Math.random().toString())
  .update(Date.now().toString())
  .update(process.hrtime.bigint().toString())
  .digest('hex')
  .substring(0, 32);
console.log('CRON_SECRET=' + hash);
"
```

### Vercel Configuration

Add `CRON_SECRET` to Vercel environment variables:

1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add `CRON_SECRET` with the generated value
3. Apply to Production, Preview, and Development environments

## CRON Schedules

### Cache Cleanup

- **Path**: `/api/cache/cleanup`
- **Schedule**: `0 2 * * *` (2 AM UTC daily)
- **Purpose**: Delete expired cache entries from `server_cache` table

### Notifications Cleanup

- **Path**: `/api/notifications/cleanup`
- **Schedule**: `0 3 * * *` (3 AM UTC daily)
- **Purpose**: Hard delete expired notifications

**Note**: Schedules are staggered (1 hour apart) to spread database load.

## Usage

### Programmatic Usage

```typescript
import { verifyCronAuth } from '$lib/server/auth/cron';

export const POST: RequestHandler = async ({ request }) => {
	// SECURITY: Verify CRON authentication BEFORE any processing
	verifyCronAuth(request); // Throws 401 if invalid

	// ... proceed with CRON job logic
};
```

### Manual Testing (Development)

```bash
# Get secret from .env
CRON_SECRET=$(grep CRON_SECRET .env | cut -d '=' -f2)

# Test cache cleanup
curl -X POST http://localhost:5175/api/cache/cleanup \
  -H "Authorization: Bearer $CRON_SECRET"

# Test notifications cleanup
curl -X POST http://localhost:5175/api/notifications/cleanup \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Expected Responses

**Success** (200):

```json
{
	"success": true,
	"deleted_count": 42,
	"message": "Cleaned up 42 expired cache entries"
}
```

**Unauthorized** (401):

```json
{
	"message": "Unauthorized: Invalid token"
}
```

**Service Unavailable** (503):

```json
{
	"message": "CRON endpoints disabled: CRON_SECRET not configured"
}
```

## Security Considerations

### Why Constant-Time Comparison?

Regular string comparison (`===`) can leak information through timing:

```typescript
// ❌ VULNERABLE to timing attacks
if (providedToken === env.CRON_SECRET) { ... }

// ✅ SECURE - constant-time comparison
if (timingSafeEqual(expectedBuffer, providedBuffer)) { ... }
```

### Why Fail-Secure?

If `CRON_SECRET` is undefined, endpoints are **disabled** (not open):

- ❌ Wrong: Allow requests if secret not configured
- ✅ Right: Reject all requests if secret not configured

This prevents accidental exposure during misconfiguration.

### Why Log Auth Attempts?

Logging enables:

- Security monitoring (detect unauthorized access attempts)
- Debugging (verify Vercel is sending correct headers)
- Audit trail (compliance requirements)

## Testing

### Unit Tests (Recommended)

Create `src/lib/server/auth/cron.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { verifyCronAuth } from './cron';

describe('verifyCronAuth', () => {
	it('should accept valid Bearer token', () => {
		const request = new Request('http://localhost/api/cache/cleanup', {
			headers: { Authorization: 'Bearer valid-secret' }
		});

		vi.stubEnv('CRON_SECRET', 'valid-secret');

		expect(() => verifyCronAuth(request)).not.toThrow();
	});

	it('should reject invalid token', () => {
		const request = new Request('http://localhost/api/cache/cleanup', {
			headers: { Authorization: 'Bearer invalid-token' }
		});

		vi.stubEnv('CRON_SECRET', 'valid-secret');

		expect(() => verifyCronAuth(request)).toThrow();
	});

	it('should reject missing Authorization header', () => {
		const request = new Request('http://localhost/api/cache/cleanup');

		vi.stubEnv('CRON_SECRET', 'valid-secret');

		expect(() => verifyCronAuth(request)).toThrow();
	});
});
```

### Integration Tests

```bash
# Test with valid token
curl -X POST http://localhost:5175/api/cache/cleanup \
  -H "Authorization: Bearer $CRON_SECRET" \
  -v

# Test with invalid token
curl -X POST http://localhost:5175/api/cache/cleanup \
  -H "Authorization: Bearer invalid-token" \
  -v

# Test without Authorization header
curl -X POST http://localhost:5175/api/cache/cleanup -v
```

## Monitoring

### Server Logs

Watch for authentication events:

```bash
# Successful authentication
[CRON AUTH] ✅ Valid token { url: '/api/cache/cleanup', method: 'POST', timestamp: '2025-11-10T...' }

# Failed authentication
[CRON AUTH] Invalid token (value mismatch) { url: '/api/cache/cleanup' }
[CRON AUTH] Missing Authorization header { url: '/api/cache/cleanup', method: 'POST' }
```

### Vercel Logs

Check CRON execution logs in Vercel Dashboard:

1. Go to Vercel Dashboard → Deployments → Logs
2. Filter by `/api/cache/cleanup` or `/api/notifications/cleanup`
3. Verify 200 status codes (not 401/503)

## Troubleshooting

### CRON endpoint returns 503

**Cause**: `CRON_SECRET` not configured in environment variables.

**Fix**:

1. Generate secret: `node -e "...generate script..."`
2. Add to Vercel: Project Settings → Environment Variables → Add `CRON_SECRET`
3. Redeploy application

### CRON endpoint returns 401

**Cause**: Token mismatch between Vercel config and environment variable.

**Fix**:

1. Verify `vercel.json` uses `${CRON_SECRET}` (not hardcoded value)
2. Verify Vercel environment variable is set correctly
3. Redeploy application

### Logs show "Invalid token (length mismatch)"

**Cause**: Secret length changed, but Vercel environment variable not updated.

**Fix**:

1. Update Vercel environment variable with new secret
2. Redeploy application

## Migration Checklist

- [x] Create authentication utility (`src/lib/server/auth/cron.ts`)
- [x] Update cache cleanup endpoint
- [x] Update notifications cleanup endpoint
- [x] Update `vercel.json` with Authorization headers
- [x] Verify ESLint passes
- [x] Verify Prettier formatting
- [x] Generate CRON secret for production
- [ ] Add `CRON_SECRET` to Vercel environment variables (Production)
- [ ] Add `CRON_SECRET` to Vercel environment variables (Preview)
- [ ] Add `CRON_SECRET` to local `.env` file
- [ ] Test endpoints locally
- [ ] Deploy to production
- [ ] Monitor CRON execution logs

## References

- [Vercel CRON Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
- [OWASP: Timing Attack Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#timing-attacks)

## Changelog

- **2025-11-10**: Initial implementation
  - Created authentication utility with constant-time comparison
  - Protected cache cleanup endpoint
  - Protected notifications cleanup endpoint
  - Updated Vercel CRON configuration
