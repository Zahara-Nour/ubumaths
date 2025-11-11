# CRON Authentication Implementation

**Status**: ✅ Implemented (2025-11-10, Fixed 2025-11-11)
**Security Level**: High (Constant-time comparison, fail-secure)

## Overview

Secure authentication system for CRON endpoints supporting two authentication methods:
1. **Vercel automatic**: Uses `x-vercel-cron: 1` header (production)
2. **Manual testing**: Uses `Authorization: Bearer <CRON_SECRET>` header (development/testing)

Both methods use constant-time comparison to prevent timing attacks.

## Implementation Summary

### Files Created

1. **`src/lib/server/auth/cron.ts`** (NEW)
   - `verifyCronAuth(request)` - Validates CRON requests using dual authentication
   - `generateCronSecret()` - Generates secure 32-char secrets
   - Uses `crypto.timingSafeEqual()` for constant-time comparison
   - Supports both `x-vercel-cron` header and Bearer token authentication
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
   - Added notifications cleanup CRON (3 AM UTC)
   - Kept cache cleanup CRON (2 AM UTC)
   - Note: Vercel automatically adds `x-vercel-cron: 1` header to cron requests (NOT Authorization header)

## Security Features

### 1. Dual Authentication System

Two authentication methods are supported:

**Method 1: Vercel Automatic (Production)**
```typescript
// Vercel adds this header automatically to cron requests
const vercelCron = request.headers.get('x-vercel-cron');
const isVercel = env.VERCEL === '1';

if (vercelCron === '1' && isVercel) {
	// ✅ Authenticated via Vercel
}
```

**Method 2: Bearer Token (Manual Testing)**
```typescript
// For local testing and manual invocations
const authHeader = request.headers.get('authorization');
const token = authHeader?.replace(/^Bearer\s+/i, '');

// Constant-time comparison prevents timing attacks
const expectedBuffer = Buffer.from(env.CRON_SECRET, 'utf8');
const providedBuffer = Buffer.from(token, 'utf8');

if (timingSafeEqual(expectedBuffer, providedBuffer)) {
	// ✅ Authenticated via Bearer token
}
```

### 2. Constant-Time Comparison

Prevents timing attacks by using `crypto.timingSafeEqual()` for Bearer token validation:

```typescript
const expectedBuffer = Buffer.from(env.CRON_SECRET, 'utf8');
const providedBuffer = Buffer.from(providedToken, 'utf8');

if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
	throw error(401, 'Unauthorized: Invalid token');
}
```

### 3. Fail-Secure Design

If `CRON_SECRET` is not configured, all CRON endpoints are disabled:

```typescript
if (!env.CRON_SECRET) {
	console.error('[CRON AUTH] CRON_SECRET not configured');
	throw error(503, 'CRON endpoints disabled: CRON_SECRET not configured');
}
```

### 4. Comprehensive Logging

All authentication attempts are logged (success and failure):

```typescript
// Success (Vercel automatic)
console.log('[CRON AUTH] ✅ Authenticated via x-vercel-cron header', { url, method, timestamp });

// Success (Bearer token)
console.log('[CRON AUTH] ✅ Valid token', { url, method, timestamp });

// Failure
console.warn('[CRON AUTH] Invalid token (value mismatch)', { url });
```

### 5. Input Validation

- Validates `x-vercel-cron` header for Vercel requests
- Validates VERCEL environment variable
- Validates Authorization header presence for manual requests
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

**Important**:
- Vercel automatically adds the `x-vercel-cron: 1` header to all cron requests
- Vercel does NOT automatically add Authorization headers
- The `CRON_SECRET` is only used for manual testing (not by Vercel's automatic cron system)
- Do NOT add a `headers` property in `vercel.json` as it's not supported and will cause deployment errors

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
	// Supports both Vercel automatic (x-vercel-cron header)
	// and manual testing (Bearer token)
	verifyCronAuth(request); // Throws 401 if invalid

	// ... proceed with CRON job logic
};
```

### How Authentication Works

**Production (Vercel)**:
1. Vercel's cron system calls your endpoint at scheduled time
2. Vercel automatically adds `x-vercel-cron: 1` header
3. `verifyCronAuth()` checks for this header + `VERCEL=1` environment variable
4. If both present, request is authenticated

**Development/Testing (Manual)**:
1. You call the endpoint with `Authorization: Bearer <CRON_SECRET>` header
2. `verifyCronAuth()` extracts the Bearer token
3. Performs constant-time comparison with `CRON_SECRET` environment variable
4. If tokens match, request is authenticated

### Manual Testing (Development)

Use Bearer token authentication for local testing:

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

**Note**: The `x-vercel-cron` header method only works in production on Vercel. For local testing, always use the Bearer token method.

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
# Successful authentication (Vercel production)
[CRON AUTH] ✅ Authenticated via x-vercel-cron header { url: '/api/cache/cleanup', method: 'POST', timestamp: '2025-11-11T...' }

# Successful authentication (Bearer token)
[CRON AUTH] ✅ Valid token { url: '/api/cache/cleanup', method: 'POST', timestamp: '2025-11-11T...' }

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
2. Add to `.env` for local development
3. Add to Vercel: Project Settings → Environment Variables → Add `CRON_SECRET`
4. Redeploy application

### CRON endpoint returns 401 (Production/Vercel)

**Cause**: `x-vercel-cron` header missing or `VERCEL` environment variable not set.

**Fix**:

1. Verify the request is coming from Vercel's cron system (check Vercel logs)
2. Ensure `VERCEL=1` environment variable exists in Vercel (it's automatic, but verify)
3. Check Vercel logs for the actual headers being sent
4. If testing manually, use Bearer token method instead

### CRON endpoint returns 401 (Local/Manual Testing)

**Cause**: Bearer token mismatch or missing Authorization header.

**Fix**:

1. Verify `CRON_SECRET` is set in `.env` file
2. Verify Authorization header format: `Authorization: Bearer <CRON_SECRET>`
3. Check for whitespace or special characters in the secret
4. Verify the secret matches exactly (case-sensitive)

### Logs show "Invalid token (length mismatch)"

**Cause**: Secret length changed, but environment variable not updated.

**Fix**:

1. Update `.env` file with new secret
2. Update Vercel environment variable with new secret
3. Restart dev server / Redeploy application

### Vercel cron runs but returns 401

**Cause**: This was the original issue - Vercel does NOT add Authorization headers automatically.

**Fix**: Already fixed! The code now checks for `x-vercel-cron: 1` header (which Vercel DOES add automatically).

## Migration Checklist

- [x] Create authentication utility (`src/lib/server/auth/cron.ts`)
- [x] Update cache cleanup endpoint
- [x] Update notifications cleanup endpoint
- [x] Update `vercel.json` with cron schedules (Vercel adds Authorization header automatically)
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

- **2025-11-11**: Fixed Vercel cron authentication
  - **BREAKING FIX**: Corrected authentication to support Vercel's `x-vercel-cron: 1` header
  - Implemented dual authentication system (Vercel automatic + Bearer token for testing)
  - Fixed issue where Vercel crons were returning 401 (Vercel does NOT add Authorization headers)
  - Updated `verifyCronAuth()` to check `x-vercel-cron` header + `VERCEL` environment variable
  - Removed invalid `headers` property from `vercel.json` (not supported by Vercel)
  - Updated documentation with accurate information about Vercel's cron system
- **2025-11-10**: Initial implementation
  - Created authentication utility with constant-time comparison
  - Protected cache cleanup endpoint
  - Protected notifications cleanup endpoint
  - Updated Vercel CRON configuration
  - **Note**: Initial implementation incorrectly assumed Vercel adds Authorization headers
