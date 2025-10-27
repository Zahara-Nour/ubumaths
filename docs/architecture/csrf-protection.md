# CSRF Protection

## Overview

UbuMaths implements comprehensive Cross-Site Request Forgery (CSRF) protection to prevent malicious websites from making unauthorized requests on behalf of authenticated users.

**Status**: ✅ ENABLED (as of 2025-10-27)

**Security Level**: CRITICAL (P0)

---

## How It Works

### Automatic Protection (SvelteKit)

SvelteKit provides built-in CSRF protection when `csrf.checkOrigin` is enabled:

```javascript
// svelte.config.js
kit: {
  csrf: {
    checkOrigin: true
  }
}
```

**What it does:**
- Validates `Origin` or `Referer` headers on all state-changing requests (POST, PUT, DELETE, PATCH)
- Automatically protects:
  - Form actions (`+page.server.ts` with `export const actions`)
  - API routes (`+server.ts` with POST/PUT/DELETE/PATCH handlers)
- Returns 403 Forbidden if headers don't match the request host

**Protected automatically:**
- ✅ All form submissions
- ✅ All API routes with POST/PUT/DELETE/PATCH methods
- ✅ Server load functions that mutate state

**Not protected:**
- ❌ GET requests (safe methods, no validation needed)
- ❌ OPTIONS requests (CORS preflight)
- ❌ HEAD requests

### Manual Validation (Helper Functions)

For routes that need explicit validation or custom error handling:

```typescript
import { validateOrigin } from '$lib/server/csrfProtection';

export const POST: RequestHandler = async ({ request, locals }) => {
  // Validate origin explicitly
  validateOrigin(request);

  // ... rest of handler
};
```

---

## Allowed Origins

### Production
- `https://ubumaths.com`
- `https://www.ubumaths.com`

### Vercel Deployments
- `https://ubumaths-6op8.vercel.app` (production)
- `https://ubumaths-*.vercel.app` (preview deployments - dynamically allowed)

### Development
- `http://localhost:5173`
- `http://localhost:5175` (Claude Code port)
- `http://127.0.0.1:5173`
- `http://127.0.0.1:5175`

---

## Usage Patterns

### Pattern 1: Automatic Protection (Recommended)

**Most routes don't need manual validation** - SvelteKit handles it:

```typescript
// ✅ Automatically protected
export const POST: RequestHandler = async ({ request, locals }) => {
  // No need for manual validation
  const data = await request.json();
  // ... process request
};
```

### Pattern 2: Explicit Validation

For routes that need custom error handling:

```typescript
import { validateOrigin } from '$lib/server/csrfProtection';

export const POST: RequestHandler = async ({ request, locals }) => {
  // Explicit validation with default error handling
  validateOrigin(request);

  // ... rest of handler
};
```

### Pattern 3: Conditional Validation

For routes handling multiple methods:

```typescript
import { validateOriginForMutatingMethods } from '$lib/server/csrfProtection';

export const handler: RequestHandler = async ({ request, locals }) => {
  // Only validates POST/PUT/DELETE/PATCH, allows GET through
  validateOriginForMutatingMethods(request);

  if (request.method === 'GET') {
    // ... handle GET
  } else if (request.method === 'POST') {
    // ... handle POST
  }
};
```

### Pattern 4: Custom Error Handling

For routes that need custom error responses:

```typescript
import { isValidOrigin } from '$lib/server/csrfProtection';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!isValidOrigin(request)) {
    return json({ error: 'Invalid request source' }, { status: 403 });
  }

  // ... rest of handler
};
```

---

## API Reference

### `validateOrigin(request: Request): void`

Validates the Origin or Referer header of a request.

**Throws:** `error(403)` if origin is invalid or missing

**Example:**
```typescript
export const POST: RequestHandler = async ({ request }) => {
  validateOrigin(request);
  // ... handler logic
};
```

### `validateRequestOrigin(event: RequestEvent): void`

Convenience wrapper for validating a SvelteKit RequestEvent.

**Throws:** `error(403)` if origin is invalid or missing

**Example:**
```typescript
export const POST: RequestHandler = async (event) => {
  validateRequestOrigin(event);
  // ... handler logic
};
```

### `validateOriginForMutatingMethods(request: Request): void`

Validates origin only for POST/PUT/DELETE/PATCH methods. Allows GET/HEAD/OPTIONS through.

**Throws:** `error(403)` if method is mutating and origin is invalid

**Example:**
```typescript
// Route handles both GET and POST
export const handler: RequestHandler = async ({ request }) => {
  validateOriginForMutatingMethods(request);
  // ... handler logic
};
```

### `isValidOrigin(request: Request): boolean`

Type guard to check if request is from an allowed origin without throwing.

**Returns:** `true` if valid, `false` if invalid

**Example:**
```typescript
export const POST: RequestHandler = async ({ request }) => {
  if (!isValidOrigin(request)) {
    // Custom error handling
    return json({ error: 'Forbidden' }, { status: 403 });
  }
  // ... handler logic
};
```

---

## When to Use Manual Validation

### ✅ Use Manual Validation When:

1. **Custom Error Messages**: Need different error responses than default 403
2. **Logging**: Want to log CSRF attempts with additional context
3. **Conditional Logic**: Different behavior based on origin validity
4. **Testing**: Explicit validation makes testing easier
5. **Multi-method Handlers**: Single handler for GET/POST with different logic

### ❌ Don't Use Manual Validation When:

1. **Standard API Route**: SvelteKit already protects it
2. **Form Actions**: Built-in protection is sufficient
3. **GET-only Routes**: No CSRF risk on safe methods
4. **Internal Calls**: Server-to-server calls (no browser involved)

---

## Security Considerations

### What CSRF Protection Prevents

✅ **Prevents:**
- Malicious websites making requests on behalf of users
- Cross-origin form submissions to your API
- State-changing requests from untrusted origins

❌ **Does NOT Prevent:**
- XSS attacks (use Content Security Policy)
- SQL injection (use parameterized queries)
- Authentication bypass (use proper auth checks)
- CORS issues (configure CORS separately)

### Attack Example (Prevented)

```html
<!-- Malicious website: evil.com -->
<form action="https://ubumaths.com/api/rewards/gidouilles" method="POST">
  <input type="hidden" name="studentId" value="victim-id">
  <input type="hidden" name="amount" value="-9999">
</form>
<script>
  // Automatically submits form
  document.forms[0].submit();
</script>
```

**Result:** ❌ Request blocked - Origin header is `https://evil.com`, not allowed

### Defense in Depth

CSRF protection is **one layer** of security:

1. **CSRF Protection** ← Validates request origin
2. **Authentication** ← Verifies user identity
3. **Authorization** ← Checks user permissions
4. **Input Validation** ← Validates request data
5. **RLS Policies** ← Database-level access control

**All layers must be present** - CSRF alone is not enough!

---

## Testing

### Manual Testing Checklist

- [ ] Form submissions work from production domain
- [ ] Form submissions work from development (localhost)
- [ ] API POST requests work from allowed origins
- [ ] API POST requests fail from disallowed origins
- [ ] Vercel preview deployments work correctly
- [ ] CORS requests from external sites fail appropriately

### Test CSRF Protection

```bash
# Test from allowed origin (should succeed)
curl -X POST https://ubumaths.com/api/test \
  -H "Origin: https://ubumaths.com" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Test from disallowed origin (should fail with 403)
curl -X POST https://ubumaths.com/api/test \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Test without origin (should fail with 403)
curl -X POST https://ubumaths.com/api/test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Automated Tests

```typescript
import { describe, it, expect } from 'vitest';
import { validateOrigin } from '$lib/server/csrfProtection';

describe('CSRF Protection', () => {
  it('should allow requests from ubumaths.com', () => {
    const request = new Request('https://ubumaths.com/api/test', {
      method: 'POST',
      headers: { 'Origin': 'https://ubumaths.com' }
    });

    expect(() => validateOrigin(request)).not.toThrow();
  });

  it('should block requests from evil.com', () => {
    const request = new Request('https://ubumaths.com/api/test', {
      method: 'POST',
      headers: { 'Origin': 'https://evil.com' }
    });

    expect(() => validateOrigin(request)).toThrow('Invalid origin');
  });

  it('should block requests without origin/referer', () => {
    const request = new Request('https://ubumaths.com/api/test', {
      method: 'POST'
    });

    expect(() => validateOrigin(request)).toThrow('Missing origin headers');
  });
});
```

---

## Troubleshooting

### Problem: "Invalid origin" error on legitimate requests

**Cause:** Request origin not in allowed list

**Solution:**
1. Check the origin in browser DevTools (Network tab)
2. Add origin to `ALLOWED_ORIGINS` in `src/lib/server/csrfProtection.ts`
3. For Vercel previews, ensure URL matches `ubumaths-*.vercel.app` pattern

### Problem: CORS errors with CSRF protection

**Cause:** CORS and CSRF are separate security mechanisms

**Solution:**
1. Configure CORS headers separately (if needed for external APIs)
2. CSRF only checks same-origin requests - cross-origin needs CORS
3. For authenticated cross-origin, you need both CORS + CSRF

### Problem: API clients (Postman, curl) getting 403

**Cause:** Missing Origin/Referer headers

**Solution:**
1. Add `Origin` header to API client request
2. For testing, use development origins: `http://localhost:5173`
3. For production testing, use production origin: `https://ubumaths.com`

### Problem: Form submissions fail after enabling CSRF

**Cause:** Browser not sending Origin header (rare)

**Solution:**
1. Check browser console for errors
2. Ensure form uses `action` attribute (not JavaScript fetch without headers)
3. SvelteKit forms automatically include proper headers

---

## Migration Notes

### Before (Vulnerable)

```javascript
// svelte.config.js
kit: {
  adapter: adapter()
  // No CSRF protection
}
```

**Risk:** All POST/PUT/DELETE requests vulnerable to CSRF attacks

### After (Protected)

```javascript
// svelte.config.js
kit: {
  adapter: adapter(),
  csrf: {
    checkOrigin: true
  }
}
```

**Protection:** All state-changing requests validated automatically

### Breaking Changes

**None** - CSRF protection is transparent to legitimate requests:
- ✅ Same-origin requests work as before
- ✅ Form actions work as before
- ✅ API routes work as before
- ✅ Development workflow unchanged

---

## References

- [SvelteKit CSRF Protection](https://kit.svelte.dev/docs/configuration#csrf)
- [OWASP CSRF Guide](https://owasp.org/www-community/attacks/csrf)
- [MDN: Origin Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin)
- [CWE-352: Cross-Site Request Forgery](https://cwe.mitre.org/data/definitions/352.html)

---

## Changelog

### 2025-10-27 - Initial Implementation
- ✅ Enabled `csrf.checkOrigin` in svelte.config.js
- ✅ Created `src/lib/server/csrfProtection.ts` helper utilities
- ✅ Configured allowed origins for production, Vercel, and development
- ✅ Documented CSRF protection setup and usage
- ✅ Created testing guidelines

### Security Audit Finding

**Original Status:** 🔴 CRITICAL - CSRF protection NOT enabled

**Current Status:** ✅ RESOLVED - Full CSRF protection implemented

**Impact:** Prevents unauthorized state-changing requests from malicious sites
