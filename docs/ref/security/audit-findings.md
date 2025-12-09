# Security Audit Findings

**Audit Date**: 2025-12-09
**Overall Rating**: B+ (Good)
**Auditor**: Security Audit Agent (Claude)

---

## Executive Summary

This SvelteKit + Supabase educational platform demonstrates a mature security architecture with well-implemented controls. The codebase shows evidence of security-conscious development.

### Rating Breakdown

| Area              | Score | Notes                                           |
| ----------------- | ----- | ----------------------------------------------- |
| Authentication    | A     | Centralized middleware, proper session handling |
| Authorization     | A     | RBAC with RLS enforcement                       |
| Input Validation  | A     | 100% Zod coverage on APIs                       |
| XSS Prevention    | A     | DOMPurify with strict config                    |
| CSRF Protection   | A     | Origin/Host validation                          |
| Database Security | A-    | Strong RLS, minor service role concerns         |
| Dependencies      | B     | 6 vulnerabilities found                         |
| Rate Limiting     | B-    | Inconsistent coverage                           |

---

## Findings Summary

| Severity | Count | Status             |
| -------- | ----- | ------------------ |
| Critical | 0     | -                  |
| High     | 3     | 2 fixed, 1 open    |
| Medium   | 4     | 2 fixed, 2 open    |
| Low      | 2     | Optional           |
| Info     | 1     | Solution available |

---

## High Priority Findings

### H1: Dependency Vulnerabilities

**Severity**: HIGH
**Status**: Open
**File**: `package.json`

**Description**: `pnpm audit` revealed 6 vulnerabilities:

| Package           | Severity | Issue                           |
| ----------------- | -------- | ------------------------------- |
| glob              | HIGH     | Command injection via CLI       |
| glob (transitive) | HIGH     | Command injection (@vercel/nft) |
| vite              | MODERATE | server.fs.deny bypass (Windows) |
| tar               | MODERATE | Race condition memory exposure  |
| js-yaml           | MODERATE | Prototype pollution             |
| cookie            | LOW      | Out of bounds characters        |

**Risk**: Build-time vulnerabilities could be exploited if build pipeline accepts untrusted input.

**Remediation**:

```bash
pnpm update glob@^11.1.0
pnpm update vite@^7.1.11
pnpm update @sveltejs/adapter-vercel
```

**Effort**: 2 hours

---

### H2: Missing UUID Validation on Route Parameters

**Severity**: HIGH
**Status**: ✅ FIXED (2025-12-09)
**Files**: Various API endpoints using `params.id`

**Description**: Route parameters were used directly without UUID format validation.

**Fix Applied**: Added `validateUuidParam` from `src/lib/server/validation/params.ts` to all endpoints:

```typescript
import { validateUuidParam } from '$lib/server/validation/params';

const id = validateUuidParam(params.id);
// Throws 400 "Format id invalide" if invalid
```

**Helpers available**:

- `validateUuidParam(id, paramName)` - Single UUID
- `validateUuidParams(params, names)` - Multiple UUIDs
- `validateIntParam(value, name, options)` - Integer validation
- `validateEnumParam(value, allowed, name)` - Enum validation

**Endpoints updated (30 files)**:

- ✅ API endpoints: exercises, games/minesweeper, marketplace, messages, python-exercises, python-files, questions, spreadsheets, students
- ✅ Page servers: assessments, constructions, exercises, navadra/combat, riddles, spreadsheet, teacher dashboards

---

### H3: Service Role Client Security

**Severity**: HIGH
**Status**: ✅ FIXED (2025-12-09)
**File**: `src/lib/server/serviceRoleClient.ts`

**Description**: No guardrails prevent developers from using service role client for user operations.

**Current (verified safe) usages**:

- Job logging (`background_job_runs`)
- Auto riddle selection cron job
- SRS deck assignment operations

**Risk**: Accidental use in user-facing endpoints would bypass all RLS policies.

**Fix Applied**: Added `auditServiceRoleUsage()` function that:

- Checks caller stack trace in development mode
- Warns with yellow console output when used from unexpected paths
- Provides clear guidance on adding new allowed paths

**Allowed paths** (configurable in `ALLOWED_SERVICE_ROLE_PATHS`):

- `/api/cron/` - Cron jobs
- `/riddles/auto-select` - Auto riddle selection
- `rateLimiter.ts`, `errorMonitoring.ts` - Server utilities
- `srs/` - SRS operations
- `.test.ts` - Test files
- `/api/cleanup/`, `/api/errors/cleanup` - Cleanup endpoints

```typescript
// Example warning output:
// [SECURITY WARNING] Service role client used from unexpected location:
//   at someFunction (/src/routes/api/users/+server.ts:42:15)
//   Allowed paths: /api/cron/, /riddles/auto-select, ...
```

---

## Medium Priority Findings

### M1: Inconsistent Rate Limiting

**Severity**: MEDIUM
**Status**: Open
**Files**: Various API endpoints

**Description**: Rate limiting only implemented for AI tutor (`src/lib/server/tutor/tutor-rate-limiter.ts`).

**Missing Rate Limiting**:

- `/api/messages/send` - Message spam
- `/api/riddles/[id]/submit` - Answer brute-forcing
- `/api/errors/log` - Error flooding DoS

**Remediation**: Implement middleware-based rate limiter. See [api-security.md](api-security.md#rate-limiting).

**Effort**: 8 hours

---

### M2: Open Redirect in Auth Callback

**Severity**: MEDIUM
**Status**: ✅ FIXED (2025-12-09)
**File**: `src/routes/(public)/auth/confirm/+server.ts`

**Description**: The `next` parameter was not validated, allowing open redirects.

**Fix Applied**: Added `validateRedirectUrl()` function that:

- Allows relative paths starting with `/` (blocks protocol-relative `//`)
- Allows same-origin absolute URLs
- Defaults to `/` for external/malicious URLs

```typescript
const rawNext = url.searchParams.get('next') ?? '/';
const next = validateRedirectUrl(rawNext, url.origin);
```

---

### M3: Error Log Endpoint Lacks Server-Side Rate Limiting

**Severity**: MEDIUM
**Status**: ✅ FIXED (2025-12-09)
**File**: `src/routes/api/errors/log/+server.ts`

**Description**: Accepted unauthenticated requests without server-side rate limiting.

**Fix Applied**:

- Created reusable rate limit middleware (`src/lib/server/middleware/rateLimit.ts`)
- Applied IP-based rate limiting: 20 errors per minute per IP
- Includes automatic cleanup of expired records

```typescript
import { rateLimit } from '$lib/server/middleware/rateLimit';

const clientIp = getClientAddress();
rateLimit(`error-log:${clientIp}`, 20, 60000);
```

---

### M4: Auth Callback Email Verification Timing

**Severity**: MEDIUM
**Status**: Informational
**File**: `src/routes/(public)/auth/callback/+server.ts`

**Description**: Standard OAuth callback pattern. No immediate concern but should be monitored for timing attacks on email verification.

**Effort**: N/A (monitoring only)

---

## Low Priority Findings

### L1: Missing HSTS Preload Submission

**Severity**: LOW
**Status**: Open
**File**: `src/hooks.server.ts`

**Description**: HSTS header includes `preload` directive but domain may not be in preload list.

**Remediation**:

1. Verify at https://hstspreload.org/
2. If not using preload list, remove `preload` directive

**Effort**: 30 minutes

---

### L2: CSP Uses `'unsafe-inline'`

**Severity**: LOW
**Status**: Accepted
**File**: `src/hooks.server.ts`

**Description**: Required for Svelte/Tailwind compatibility.

**Future**: Migrate to nonce-based CSP when SvelteKit adds support.

**Effort**: Future (dependent on SvelteKit)

---

## Informational

### I1: Sensitive Data in Console Logs

**Severity**: INFO
**Status**: ✅ SOLUTION AVAILABLE (2025-12-09)
**Files**: Various files with `console.log`

**Description**: Some error logging includes potentially sensitive information.

**Solution**: Created `createServerLogger()` in `src/lib/utils/logger.ts`:

- Automatic PII redaction (emails, IPs, tokens, passwords, UUIDs, phone numbers)
- Works in both development and production
- Color-coded output with timestamps

**Usage**:

```typescript
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/users/+server.ts');

// PII is automatically redacted
logger.info('User login', { email: 'user@example.com', ip: '192.168.1.1' });
// Output: User login { email: '[email@redacted]', ip: '192.xxx.xxx.xxx' }

logger.error('Auth failed', { password: 'secret123' });
// Output: Auth failed { password: '[REDACTED]' }
```

**Also available**: `redactPII()` function for manual redaction when needed.

**Migration**: Replace `console.log` with `createServerLogger()` in server-side code incrementally.

---

## Positive Security Controls

The following are well-implemented and should be maintained:

### 1. Centralized Authentication Middleware

- **File**: `src/lib/server/middleware/auth.ts`
- Eliminates 740 lines of duplicated auth code
- Type-safe role checking

### 2. CSRF Protection

- **File**: `src/hooks.server.ts`
- Origin/Host header validation
- Handles internal server calls

### 3. Comprehensive Zod Validation

- **Directory**: `src/lib/server/validation/`
- 65+ schema files
- Proper bounds checking

### 4. XSS Prevention

- **Files**: `src/lib/server/sanitization.ts`, `src/lib/utils/sanitize.ts`
- DOMPurify with strict config
- Server and client sanitization

### 5. Row Level Security

- **Directory**: `supabase/migrations/`
- 100+ RLS policies
- Proper scope isolation

### 6. Environment Validation

- **File**: `src/lib/server/env.ts`
- Fail-fast on invalid config
- Zod validation

---

## Remediation Roadmap

### Immediate (This Week)

| Finding | Task                               | Effort  | Status  |
| ------- | ---------------------------------- | ------- | ------- |
| H1      | Update vulnerable dependencies     | 2 hours | Open    |
| M2      | Fix open redirect in auth callback | 1 hour  | ✅ Done |

### Short-term (2 Weeks)

| Finding | Task                                    | Effort  | Status             |
| ------- | --------------------------------------- | ------- | ------------------ |
| H2      | Add UUID validation to route params     | 4 hours | ✅ Done (30 files) |
| M3      | Add rate limiting to error log endpoint | 2 hours | ✅ Done            |

### Medium-term (1 Month)

| Finding | Task                                          | Effort  | Status  |
| ------- | --------------------------------------------- | ------- | ------- |
| H3      | Add service role client usage auditing        | 4 hours | ✅ Done |
| M1      | Implement consistent rate limiting middleware | 8 hours | Open    |

### Long-term (Quarter)

| Finding | Task                         | Effort  | Status            |
| ------- | ---------------------------- | ------- | ----------------- |
| L2      | Migrate to nonce-based CSP   | TBD     | Future            |
| I1      | Implement structured logging | 8 hours | ✅ Solution Ready |

---

## Verification

After remediation, verify with:

```bash
# Dependency vulnerabilities
pnpm audit

# Run existing security tests
pnpm test:unit -- --run

# Manual testing
# 1. Test auth callback with malicious next param
# 2. Test API endpoints with malformed UUIDs
# 3. Verify rate limiting on protected endpoints
```

---

## Next Audit

**Recommended**: 6 months (June 2025)

**Focus Areas**:

- Dependency updates
- New endpoint coverage
- Rate limiting effectiveness
- RLS policy completeness
