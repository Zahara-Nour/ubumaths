# Route Protection

> Protected routes, middleware, and role-based access control.

## Route Structure

```
src/routes/
├── (public)/                    # No authentication required
│   ├── +page.svelte             # Home page
│   └── auth/
│       ├── login/               # Login page
│       ├── logout/              # Logout endpoint
│       ├── callback/            # OAuth callback
│       ├── confirm/             # Email verification
│       ├── reset-password/      # Request password reset
│       ├── update-password/     # Set new password
│       └── pending-approval/    # Waiting for admin approval
│
├── (protected)/                 # Authentication required
│   └── dashboard/
│       ├── +layout.server.ts    # Auth check for all dashboard routes
│       ├── +page.svelte         # Dashboard home (redirects by role)
│       ├── teacher/             # Teacher routes
│       ├── student/             # Student routes
│       └── admin/               # Admin routes
│
└── api/                         # API endpoints
    ├── public/                  # Public APIs
    └── admin/                   # Admin-only APIs
```

---

## Layout-Based Protection

### Protected Group Layout

**File**: `src/routes/(protected)/+layout.server.ts`

```typescript
import { redirect, error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user, profile } = locals;

	// 1. Require authentication
	requireAuth(user);

	// 2. Require profile exists
	if (!profile) {
		throw error(500, 'Your account is not fully set up. Please contact support.');
	}

	// 3. Check approval status
	if (profile.status === 'pending') {
		throw redirect(303, '/auth/pending-approval');
	}
	if (profile.status === 'rejected') {
		await locals.supabase.auth.signOut();
		throw redirect(303, '/login?error=Accès refusé');
	}

	// 4. Return verified user and profile
	return { user, profile };
};
```

### requireAuth Function

**File**: `src/lib/server/auth.ts`

```typescript
import { redirect } from '@sveltejs/kit';
import type { User } from '@supabase/supabase-js';

export function requireAuth(user: User | null): asserts user is User {
	if (!user) {
		throw redirect(303, '/auth/login');
	}
}
```

---

## Role-Based Access Control

### Role Checking Utilities

**File**: `src/lib/server/auth.ts`

```typescript
import { error } from '@sveltejs/kit';
import type { Profile, UserRole } from '$lib/types/database';

export function requireRole(
	profile: Profile | null,
	allowedRoles: UserRole | UserRole[]
): asserts profile is Profile {
	if (!profile) {
		throw error(401, 'Not authenticated');
	}

	const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
	if (!roles.includes(profile.role)) {
		throw error(403, 'Insufficient permissions');
	}
}

export function hasRole(profile: Profile | null, role: UserRole): boolean {
	return profile?.role === role;
}

export function hasAnyRole(profile: Profile | null, roles: UserRole[]): boolean {
	return profile ? roles.includes(profile.role) : false;
}
```

### Role-Specific Layouts

**Teacher Routes**: `src/routes/(protected)/dashboard/teacher/+layout.server.ts`

```typescript
export const load: LayoutServerLoad = async ({ parent }) => {
	const { profile } = await parent();

	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw redirect(303, '/dashboard');
	}

	return { profile };
};
```

**Admin Routes**: `src/routes/(protected)/dashboard/admin/+layout.server.ts`

```typescript
export const load: LayoutServerLoad = async ({ parent }) => {
	const { profile } = await parent();

	if (profile.role !== 'admin') {
		throw redirect(303, '/dashboard');
	}

	return { profile };
};
```

---

## API Route Protection

### Middleware Functions

**File**: `src/lib/server/middleware/auth.ts`

```typescript
import { error } from '@sveltejs/kit';
import type { Profile, UserRole } from '$lib/types/database';

export interface AuthResult {
	user: User;
	profile: Profile;
}

// Basic authentication (any authenticated user)
export async function requireAuth(locals: App.Locals): Promise<AuthResult> {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Authentication required');
	}

	const { profile } = locals;
	if (!profile) {
		throw error(401, 'Profile not found');
	}

	if (profile.status !== 'approved') {
		throw error(403, 'Account not approved');
	}

	return { user, profile };
}

// Single role requirement
export async function requireRole(locals: App.Locals, role: UserRole): Promise<AuthResult> {
	const result = await requireAuth(locals);

	if (result.profile.role !== role) {
		throw error(403, `Requires ${role} role`);
	}

	return result;
}

// Multiple roles (OR logic)
export async function requireRoles(locals: App.Locals, roles: UserRole[]): Promise<AuthResult> {
	const result = await requireAuth(locals);

	if (!roles.includes(result.profile.role)) {
		throw error(403, `Requires one of: ${roles.join(', ')}`);
	}

	return result;
}
```

### Usage in API Routes

**Admin-only endpoint**:

```typescript
// src/routes/api/admin/users/+server.ts
import { requireRole } from '$lib/server/middleware/auth';

export const GET: RequestHandler = async ({ locals }) => {
	const { user, profile } = await requireRole(locals, 'admin');

	// Only admins reach this point
	const users = await fetchAllUsers();
	return json(users);
};
```

**Teacher or Admin endpoint**:

```typescript
// src/routes/api/classes/+server.ts
import { requireRoles } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Teachers and admins can create classes
	const data = await request.json();
	// ...
};
```

**Any authenticated user**:

```typescript
// src/routes/api/profile/+server.ts
import { requireAuth } from '$lib/server/middleware/auth';

export const GET: RequestHandler = async ({ locals }) => {
	const { user, profile } = await requireAuth(locals);

	return json(profile);
};
```

---

## Dashboard Redirection

**File**: `src/routes/(protected)/dashboard/+page.server.ts`

Redirects users to their role-specific dashboard:

```typescript
export const load: PageServerLoad = async ({ parent }) => {
	const { profile } = await parent();

	switch (profile.role) {
		case 'admin':
			throw redirect(303, '/dashboard/admin');
		case 'teacher':
			throw redirect(303, '/dashboard/teacher');
		case 'student':
			throw redirect(303, '/dashboard/student');
		default:
			throw redirect(303, '/');
	}
};
```

---

## Component-Level Protection

For UI elements that should only appear for certain roles:

```svelte
<script lang="ts">
    let { data } = $props();
    const { profile } = data;
</script>

{#if profile.role === 'admin'}
    <AdminPanel />
{/if}

{#if profile.role === 'teacher' || profile.role === 'admin'}
    <TeacherTools />
{/if}

{#if profile.role === 'student'}
    <StudentView />
{/if}
```

**Important**: Component-level checks are for UX only. Always enforce authorization on the server.

---

## Protection Patterns Summary

| Layer         | Method                          | Purpose                        |
| ------------- | ------------------------------- | ------------------------------ |
| Route Group   | `(protected)/+layout.server.ts` | Require any authenticated user |
| Nested Layout | `teacher/+layout.server.ts`     | Require specific role          |
| API Route     | `requireAuth()`                 | Any authenticated user         |
| API Route     | `requireRole()`                 | Specific role                  |
| API Route     | `requireRoles()`                | One of multiple roles          |
| Component     | `{#if profile.role}`            | UI/UX only (not security)      |
| Database      | RLS policies                    | Row-level security             |

---

## Error Responses

| Scenario          | HTTP Code | Redirect/Error           |
| ----------------- | --------- | ------------------------ |
| Not authenticated | 303       | `/auth/login`            |
| Pending approval  | 303       | `/auth/pending-approval` |
| Account rejected  | 303       | `/login?error=...`       |
| Wrong role (page) | 303       | `/dashboard`             |
| Wrong role (API)  | 403       | JSON error               |
| Profile missing   | 500/401   | Error message            |
