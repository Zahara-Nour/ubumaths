# Auth Configuration

> Environment variables, OAuth providers, and auth settings.

## Environment Variables

### Required

| Variable                    | Description                    | Example                   |
| --------------------------- | ------------------------------ | ------------------------- |
| `PUBLIC_SUPABASE_URL`       | Supabase project URL           | `https://xxx.supabase.co` |
| `PUBLIC_SUPABASE_ANON_KEY`  | Supabase anonymous key         | `eyJhbGc...`              |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) | `eyJhbGc...`              |

### Google OAuth (Optional)

| Variable                                      | Description                |
| --------------------------------------------- | -------------------------- |
| `PUBLIC_GOOGLE_CLIENT_ID`                     | Google OAuth client ID     |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

### Configuration File

**`.env.example`**:

```bash
# Supabase
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Google OAuth (configured in Supabase dashboard)
PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## OAuth Providers

### Google OAuth

**Status**: Primary authentication method

**Configuration Location**: Supabase Dashboard > Authentication > Providers > Google

**Domain Restriction**: Only `@voltairedoha.com` emails allowed

**Implementation** (`src/routes/(public)/auth/callback/+server.ts`):

```typescript
const ALLOWED_DOMAIN = '@voltairedoha.com';

// Validate email domain after OAuth
if (!email || !email.endsWith(ALLOWED_DOMAIN)) {
	await supabase.auth.signOut();
	throw redirect(
		303,
		`/login?error=${encodeURIComponent('Only @voltairedoha.com email accounts are allowed.')}`
	);
}
```

**OAuth Flow**:

```
1. User clicks "Se connecter" on Google tab
2. Server initiates OAuth:
   supabase.auth.signInWithOAuth({
       provider: 'google',
       options: { redirectTo: `${origin}/auth/callback` }
   })
3. User redirects to Google consent screen
4. Google redirects to /auth/callback?code=...
5. Server exchanges code for session
6. Server validates email domain
7. Redirect to dashboard or pending-approval
```

### Other Providers

Currently disabled. The system supports Supabase's provider framework for future expansion.

---

## Supabase Client Configuration

### Server Client

**File**: `src/lib/server/supabase.ts`

```typescript
import { createServerClient } from '@supabase/ssr';

event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
	cookies: {
		getAll: () => event.cookies.getAll(),
		setAll: (cookiesToSet) => {
			cookiesToSet.forEach(({ name, value, options }) => {
				event.cookies.set(name, value, { ...options, path: '/' });
			});
		}
	}
});
```

### Browser Client

**File**: `src/routes/+layout.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
	global: { fetch }
});
```

### Service Role Client

**File**: `src/lib/server/serviceRoleClient.ts`

Used for admin operations bypassing RLS:

```typescript
import { createClient } from '@supabase/supabase-js';

export function createServiceRoleClient() {
	return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}
```

**Use cases**:

- Job logging
- Rate limiting operations
- Error monitoring
- Cron jobs
- Admin operations bypassing RLS

---

## Auth Settings

### Session Configuration

| Setting                | Value             | Notes               |
| ---------------------- | ----------------- | ------------------- |
| Token Type             | JWT               | Supabase default    |
| Access Token Lifetime  | 3600s (1h)        | Supabase default    |
| Refresh Token Lifetime | 604800s (7d)      | Supabase default    |
| Session Storage        | HTTP-only cookies | Via `@supabase/ssr` |

### Rate Limiting Configuration

**File**: `src/lib/server/rateLimiter.ts`

| Action          | Limit       | Window     |
| --------------- | ----------- | ---------- |
| Login by IP     | 5 attempts  | 15 minutes |
| Login by Email  | 3 attempts  | 15 minutes |
| Signup by IP    | 3 attempts  | 1 hour     |
| OAuth by IP     | 10 attempts | 15 minutes |
| Chatbot by User | 5 requests  | 15 minutes |

---

## Security Headers

**File**: `src/hooks.server.ts` (securityHeadersHandle)

```typescript
const securityHeaders = {
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
	'Content-Security-Policy': cspDirectives
};
```

### CSP Configuration

```
default-src 'self'
script-src 'self' 'unsafe-inline' https://*.supabase.co https://accounts.google.com
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com
connect-src 'self' https://*.supabase.co wss://*.supabase.co
frame-src https://accounts.google.com https://*.supabase.co
```
