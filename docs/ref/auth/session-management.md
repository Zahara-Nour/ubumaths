# Session Management

> Cookie handling, token refresh, and session verification.

## Overview

UbuMaths uses Supabase Auth with server-side session management via HTTP-only cookies. This approach:

- Prevents XSS attacks from accessing tokens
- Allows server-side session verification
- Supports SSR (Server-Side Rendering)

---

## Cookie Configuration

**File**: `src/lib/server/supabase.ts`

### Cookie Handling

```typescript
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

### Cookie Structure

Supabase sets multiple cookies for auth:

| Cookie Name Pattern                     | Purpose                 |
| --------------------------------------- | ----------------------- |
| `sb-<project>-auth-token`               | Access token (JWT)      |
| `sb-<project>-auth-token-code-verifier` | PKCE verifier for OAuth |

All cookies are:

- `HttpOnly: true` - Not accessible via JavaScript
- `Secure: true` - HTTPS only (in production)
- `SameSite: Lax` - CSRF protection
- `Path: /` - Available site-wide

---

## Session Verification

### The `safeGetSession()` Function

**File**: `src/lib/server/supabase.ts`

```typescript
event.locals.safeGetSession = async () => {
	// Verify with Supabase auth server (not just reading cookies)
	const {
		data: { user },
		error
	} = await withTimeout(
		event.locals.supabase.auth.getUser(),
		15000 // 15 second timeout
	);

	if (error || !user) {
		return { user: null };
	}
	return { user };
};
```

### Why `getUser()` Not `getSession()`?

```
getSession()                    getUser()
─────────────────────────────────────────────────────
Reads JWT from cookie           Validates with auth server
Fast (no network)               Slower (network request)
Can be tampered with            Server-verified
INSECURE for auth checks        SECURE for auth checks
```

**Security principle**: Never trust client-provided data. Always verify with the auth server.

### Timeout Handling

```typescript
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	const timeout = new Promise<never>((_, reject) =>
		setTimeout(() => reject(new Error('Timeout')), ms)
	);
	return Promise.race([promise, timeout]);
}
```

This prevents slow auth server responses from blocking page loads.

---

## Token Refresh

### Server-Side Refresh

When cookies are sent with a request, Supabase automatically:

1. Checks if access token is expired
2. Uses refresh token to get new access token
3. Sets new cookies in the response

This happens transparently in the `@supabase/ssr` library.

### Client-Side Refresh

**File**: `src/routes/+layout.ts`

```typescript
if (isBrowser()) {
	supabase.auth.onAuthStateChange((event) => {
		if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
			// Invalidate cached data, triggering re-verification
			invalidate('supabase:auth');
		}
	});
}
```

### Refresh Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Token Lifecycle                                │
└─────────────────────────────────────────────────────────────────────────┘

Time ──────────────────────────────────────────────────────────────────▶

│◀──────── Access Token Valid (1 hour) ────────▶│
                                                 │
                                                 ▼
                                          Token expires
                                                 │
                                                 ▼
                              ┌──────────────────────────────────┐
                              │ Next request with expired token  │
                              └──────────────────────────────────┘
                                                 │
                                                 ▼
                              ┌──────────────────────────────────┐
                              │ Supabase uses refresh token      │
                              │ to get new access token          │
                              └──────────────────────────────────┘
                                                 │
                                                 ▼
                              ┌──────────────────────────────────┐
                              │ New cookies set in response      │
                              │ 'TOKEN_REFRESHED' event fired    │
                              └──────────────────────────────────┘
                                                 │
                                                 ▼
│◀──────── New Access Token Valid (1 hour) ─────────▶│

│◀───────────────── Refresh Token Valid (7 days) ────────────────────────▶│
                                                                           │
                                                                           ▼
                                                              Session expires
                                                              User must re-login
```

---

## Session Loading in Hooks

**File**: `src/hooks.server.ts`

### Hook Sequence

```typescript
export const handle: Handle = sequence(
	requestIdHandle, // 1. Add request ID
	supabaseHandle, // 2. Create supabase client + safeGetSession
	redirectHandle, // 3. URL redirects
	userProfileHandle, // 4. Load profile into locals
	csrfHandle, // 5. CSRF validation
	securityHeadersHandle, // 6. Security headers
	errorMonitoringHandle // 7. Error logging
);
```

### supabaseHandle Details

```typescript
const supabaseHandle: Handle = async ({ event, resolve }) => {
	// 1. Create Supabase client with cookie access
	event.locals.supabase = createServerClient(/*...*/);

	// 2. Add safeGetSession function
	event.locals.safeGetSession = async () => {
		const {
			data: { user },
			error
		} = await withTimeout(event.locals.supabase.auth.getUser(), 15000);
		if (error || !user) return { user: null };
		return { user };
	};

	// 3. Continue to next handler
	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
```

### userProfileHandle Details

```typescript
const userProfileHandle: Handle = async ({ event, resolve }) => {
	// 1. Get verified user
	const { user } = await event.locals.safeGetSession();
	event.locals.user = user;

	if (user) {
		// 2. Load profile from database
		event.locals.profile = await getUserProfile(event.locals.supabase, user.id);

		// 3. Handle missing profile (sign out)
		if (!event.locals.profile) {
			await event.locals.supabase.auth.signOut();
			throw redirect(303, '/auth/login?error=Profile not found');
		}
	} else {
		event.locals.profile = null;
	}

	return resolve(event);
};
```

---

## Session Access

### In Server Load Functions

```typescript
// +page.server.ts or +layout.server.ts
export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	// user is verified, safe to use

	return {
		user,
		profile: locals.profile
	};
};
```

### In API Routes

```typescript
// +server.ts
export const GET: RequestHandler = async ({ locals }) => {
	// Option 1: Manual check
	const { user } = await locals.safeGetSession();
	if (!user) throw error(401, 'Unauthorized');

	// Option 2: Use middleware
	const { user, profile } = await requireAuth(locals);
};
```

### In Components

```svelte
<!-- +page.svelte -->
<script lang="ts">
    let { data } = $props();
    const { user, profile, supabase } = data;
</script>

{#if user}
    <p>Logged in as {user.email}</p>
{/if}
```

---

## Session Invalidation

### On Logout

```typescript
await supabase.auth.signOut();
// Cookies are cleared automatically
```

### On Profile Not Found

```typescript
if (!event.locals.profile) {
	await event.locals.supabase.auth.signOut();
	throw redirect(303, '/auth/login?error=Profile not found');
}
```

### On Account Rejection

```typescript
if (profile.status === 'rejected') {
	await supabase.auth.signOut();
	throw redirect(303, '/login?error=Access denied');
}
```

---

## Troubleshooting

### Common Issues

| Issue                      | Cause                  | Solution                               |
| -------------------------- | ---------------------- | -------------------------------------- |
| Session not persisting     | Cookies not being set  | Check HTTPS, SameSite settings         |
| "Unauthorized" after login | Profile not created    | Check trigger `on_auth_user_created`   |
| Infinite redirect loop     | safeGetSession error   | Check Supabase connection, timeout     |
| "Profile not found"        | Missing profile record | Run trigger manually or insert profile |

### Debug Session

```typescript
// Add to +page.server.ts temporarily
export const load = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	console.log('User:', user?.id, user?.email);
	console.log('Profile:', locals.profile?.role, locals.profile?.status);
	return { user, profile: locals.profile };
};
```
