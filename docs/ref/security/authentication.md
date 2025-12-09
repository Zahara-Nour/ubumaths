# Authentication & Authorization

## Overview

UbuMaths uses Supabase Auth with a centralized middleware system for authentication and role-based access control (RBAC).

---

## Authentication Flow

### Google OAuth (Primary)

```
┌─────────┐    ┌──────────┐    ┌──────────────┐    ┌─────────┐
│  User   │───>│  Button  │───>│ Supabase Auth│───>│  Google │
└─────────┘    └──────────┘    └──────────────┘    └─────────┘
                                      │
                                      v
┌─────────┐    ┌──────────┐    ┌──────────────┐
│ Session │<───│ Callback │<───│ OAuth Token  │
│ Cookie  │    │ Handler  │    │              │
└─────────┘    └──────────┘    └──────────────┘
```

**Implementation**: `src/routes/(public)/auth/callback/+server.ts`

### Password Authentication

```
┌─────────┐    ┌──────────┐    ┌──────────────┐
│  User   │───>│  Login   │───>│ Supabase Auth│
└─────────┘    │  Form    │    └──────────────┘
               └──────────┘           │
                                      v
┌─────────┐    ┌──────────┐    ┌──────────────┐
│ Session │<───│ Set      │<───│ JWT Token    │
│ Cookie  │    │ Cookie   │    │              │
└─────────┘    └──────────┘    └──────────────┘
```

---

## Session Management

### Cookie Configuration

```typescript
// src/hooks.server.ts
const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
	cookies: {
		getAll: () => event.cookies.getAll(),
		setAll: (cookiesToSet) => {
			cookiesToSet.forEach(({ name, value, options }) => {
				event.cookies.set(name, value, {
					...options,
					path: '/',
					httpOnly: true,
					secure: true,
					sameSite: 'lax'
				});
			});
		}
	}
});
```

### Security Properties

| Property   | Value  | Purpose                        |
| ---------- | ------ | ------------------------------ |
| `httpOnly` | `true` | Prevents XSS access to cookies |
| `secure`   | `true` | HTTPS only transmission        |
| `sameSite` | `lax`  | CSRF protection                |
| `path`     | `/`    | Available site-wide            |

---

## Auth Middleware

### Location

`src/lib/server/middleware/auth.ts`

### Functions

#### `requireAuth(locals)`

Ensures user is authenticated.

```typescript
import { requireAuth } from '$lib/server/middleware/auth';

export const GET: RequestHandler = async ({ locals }) => {
	const { user, supabase } = await requireAuth(locals);
	// user is guaranteed to exist
	// supabase client is authenticated
};
```

**Error**: 401 "Vous devez etre connecte pour acceder a cette ressource"

#### `requireRole(locals, role)`

Ensures user has specific role.

```typescript
import { requireRole } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ locals }) => {
	const { user, profile } = await requireRole(locals, 'admin');
	// user has admin role
	// profile contains user metadata
};
```

**Error**: 403 "Acces reserve aux administrateurs"

#### `requireRoles(locals, roles[])`

Ensures user has one of the specified roles.

```typescript
import { requireRoles } from '$lib/server/middleware/auth';

export const GET: RequestHandler = async ({ locals }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);
	// user is either teacher or admin
};
```

---

## Role-Based Access Control (RBAC)

### Roles

| Role      | Description      | Permissions                           |
| --------- | ---------------- | ------------------------------------- |
| `student` | Learner account  | View/submit exercises, own progress   |
| `teacher` | Educator account | Manage classes, view student progress |
| `admin`   | Administrator    | Full system access                    |

### Role Hierarchy

```
admin
  └── teacher
        └── student
```

Admins can access teacher routes. Teachers cannot access admin routes.

### Role Storage

```sql
-- profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    role TEXT NOT NULL DEFAULT 'student',
    -- ...
);
```

### Protected Routes Structure

```
src/routes/
├── (public)/           # No auth required
│   ├── auth/           # Auth flows
│   └── automaths/      # Public exercises
├── (protected)/        # Auth required
│   ├── dashboard/
│   │   ├── student/    # role: student
│   │   ├── teacher/    # role: teacher
│   │   └── admin/      # role: admin
│   └── profile/        # Any authenticated
└── api/
    └── admin/          # role: admin
```

---

## Route Guards

### Server-Side (Primary)

```typescript
// src/routes/(protected)/+layout.server.ts
export const load: LayoutServerLoad = async ({ locals }) => {
	const { user } = await requireAuth(locals);
	return { user };
};
```

### Client-Side (Fallback)

```svelte
<!-- src/routes/(protected)/+layout.svelte -->
<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	$effect(() => {
		if (!$page.data.user) {
			goto('/auth/login');
		}
	});
</script>
```

---

## Email Verification

### Flow

1. User signs up with email/password
2. Confirmation email sent via Supabase
3. User clicks link → `/auth/confirm`
4. Token verified → Session created

### Implementation

```typescript
// src/routes/(public)/auth/confirm/+server.ts
export const GET: RequestHandler = async ({ url, locals }) => {
	const token_hash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type');

	if (token_hash && type) {
		const { error } = await locals.supabase.auth.verifyOtp({
			type: type as EmailOtpType,
			token_hash
		});

		if (error) {
			throw redirect(303, '/auth/error?message=' + error.message);
		}
	}

	throw redirect(303, '/dashboard');
};
```

---

## Password Reset

### Flow

1. User requests reset via email
2. Reset link sent with token
3. User clicks link → Reset form
4. New password set → Session created

### Security Considerations

- Token expires after 1 hour
- One-time use tokens
- Rate limited to prevent enumeration

---

## Security Best Practices

### Do

```typescript
// Always use middleware
const { user } = await requireAuth(locals);

// Always check roles for sensitive operations
await requireRole(locals, 'admin');

// Use the authenticated supabase client
const { data } = await locals.supabase.from('table').select();
```

### Don't

```typescript
// Never trust client-side role claims
const role = request.headers.get('x-user-role'); // WRONG

// Never skip auth checks
const { data } = await locals.supabase.from('users').select(); // Missing auth

// Never use service role for user operations
const client = createServiceRoleClient(); // WRONG for user data
```

---

## Token Handling

### JWT Structure

Supabase JWT contains:

- `sub`: User UUID
- `email`: User email
- `role`: Supabase role (authenticated/anon)
- `app_metadata`: Custom claims
- `user_metadata`: User profile data

### Refresh Token Rotation

```typescript
// Automatic in hooks.server.ts
const {
	data: { session }
} = await supabase.auth.getSession();
// Session auto-refreshes if token near expiry
```

---

## OAuth Providers

### Google OAuth Configuration

```env
# .env
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

### Allowed Redirect URLs

Configured in Supabase Dashboard:

- `https://app.ubumaths.com/auth/callback`
- `http://localhost:5175/auth/callback` (dev)

### Domain Restrictions

```typescript
// Supabase Auth settings
// Only @school.edu emails allowed (if configured)
```

---

## Troubleshooting

### Common Issues

#### "Session not found"

```typescript
// Ensure cookies are being set
event.cookies.set(name, value, {
	path: '/' // Must be set
	// ...
});
```

#### "Invalid refresh token"

```typescript
// Clear all auth cookies and re-login
await supabase.auth.signOut();
```

#### "Role not found"

```typescript
// Ensure profile exists in profiles table
const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
```
