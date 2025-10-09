# Role-Based Dashboard System

This document explains the role-based dashboard system implemented in UbuMaths, including architecture, data flow, security, and usage patterns.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [User Roles](#user-roles)
- [File Structure](#file-structure)
- [Data Flow](#data-flow)
- [Security Model](#security-model)
- [Usage Examples](#usage-examples)
- [Extending the System](#extending-the-system)
- [Database Schema](#database-schema)

## Overview

The UbuMaths dashboard provides **role-based access control (RBAC)** with three distinct user roles:

- **Student**: View progress, complete assignments, track mastery
- **Teacher**: Manage classes, create assignments, review submissions
- **Admin**: System-wide management, user administration, platform settings

All three roles access the **same route** (`/dashboard`), but see different content based on their role stored in the database.

## Architecture

### High-Level Flow

```
User → /dashboard
    ↓
+layout.server.ts
    ↓ Authenticates user
    ↓ Fetches profile with role from database
    ↓
+layout.svelte (shared header)
    ↓
+page.svelte (role router)
    ↓
    ├─ role === 'student'  → StudentDashboard.svelte
    ├─ role === 'teacher'  → TeacherDashboard.svelte
    └─ role === 'admin'    → AdminDashboard.svelte
```

### Key Design Principles

1. **Server-First Security**: All authentication and role checks happen on the server
2. **Single Source of Truth**: User roles come from the `profiles` table in the database
3. **Component-Based Rendering**: Different dashboards are separate components, not separate routes
4. **Shared Layout**: Common header and container for all dashboard views
5. **Type Safety**: Full TypeScript support throughout

## User Roles

### Student Role (`'student'`)

**Capabilities:**
- View pending assignments
- Track points and mastery levels
- See enrolled classes
- Review exercise history
- Complete assignments

**Dashboard Features:**
- Assignments due counter
- Total points earned
- Mastery level percentage
- Recent activity feed
- Class enrollment list

### Teacher Role (`'teacher'`)

**Capabilities:**
- Create and manage classes
- Add students to classes
- Create custom exercises
- Build assignments from exercises
- Review student submissions
- Track class performance

**Dashboard Features:**
- Total classes count
- Total students across all classes
- Active assignments counter
- Pending reviews counter
- Quick action buttons (Create Assignment, Create Exercise, Add Class)
- Class management list
- Recent submissions feed

### Admin Role (`'admin'`)

**Capabilities:**
- Full system access
- User management (CRUD operations)
- Role assignment
- Content management (topics, exercises)
- System configuration
- Platform analytics
- Audit log access

**Dashboard Features:**
- Total users (with weekly trend)
- Active classes count
- Total exercises count
- System health indicator
- User breakdown by role
- System settings navigation
- Audit log viewer

## File Structure

```
src/
├── lib/
│   ├── server/
│   │   └── auth.ts                 # Authorization utilities
│   └── types/
│       └── database.ts             # TypeScript types including UserRole
│
└── routes/
    └── dashboard/
        ├── +layout.server.ts       # Entry point: auth + profile fetch
        ├── +layout.svelte          # Shared layout (header)
        ├── +page.server.ts         # Inherits profile from parent
        ├── +page.svelte            # Role router (renders based on role)
        ├── StudentDashboard.svelte # Student-specific view
        ├── TeacherDashboard.svelte # Teacher-specific view
        └── AdminDashboard.svelte   # Admin-specific view
```

## Data Flow

### 1. Authentication Check (`+layout.server.ts`)

```typescript
export const load: LayoutServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
  // Get authenticated user session
  const { user } = await safeGetSession();

  // Redirect to login if not authenticated
  requireAuth(user);

  // Fetch profile with role from database
  const profile = await getUserProfile(supabase, user!.id);

  return { profile };
};
```

**What happens:**
- Runs on **every request** to `/dashboard/*`
- Verifies user is authenticated via Supabase
- Fetches profile from `profiles` table
- Returns profile to child routes and components

### 2. Shared Layout (`+layout.svelte`)

```svelte
<script lang="ts">
  let { data, children } = $props();
</script>

<header>
  <h1>Dashboard</h1>
  <p>Role: {data.profile.role}</p>
  <span>{data.profile.email}</span>
</header>

<main>
  {@render children()}
</main>
```

**What happens:**
- Receives `data.profile` from server load
- Displays common header with user info
- Renders child routes via `{@render children()}`

### 3. Role Routing (`+page.svelte`)

```svelte
{#if data.profile.role === 'student'}
  <StudentDashboard {data} />
{:else if data.profile.role === 'teacher'}
  <TeacherDashboard {data} />
{:else if data.profile.role === 'admin'}
  <AdminDashboard {data} />
{/if}
```

**What happens:**
- Checks `data.profile.role` from database
- Renders appropriate dashboard component
- Passes data to component as prop

### 4. Role-Specific Components

Each dashboard component receives the full `data` object:

```svelte
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Access user info:
  // - data.profile.id
  // - data.profile.email
  // - data.profile.full_name
  // - data.profile.role
</script>
```

## Security Model

### Authentication Layer

**Location**: `+layout.server.ts`
**Function**: `requireAuth(user)`

```typescript
export function requireAuth(user: { id: string } | null) {
  if (!user) {
    throw redirect(303, '/login');
  }
}
```

**Protects**: All `/dashboard/*` routes
**Behavior**: Redirects to `/login` if not authenticated

### Authorization Layer

**Location**: `src/lib/server/auth.ts`
**Functions**:
- `requireRole(profile, allowedRoles)` - Enforces role access (throws 403)
- `hasRole(profile, role)` - Checks role (returns boolean)
- `hasAnyRole(profile, roles)` - Checks multiple roles (returns boolean)

**Usage Example** (for a teacher-only route):

```typescript
// In /dashboard/classes/+page.server.ts
export const load: PageServerLoad = async ({ parent }) => {
  const { profile } = await parent();

  // Only teachers can access this page
  requireRole(profile, 'teacher');

  // Fetch teacher's classes...
};
```

### Database Schema

The `profiles` table is the **source of truth** for user roles:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Points:**
- Role is **stored in database**, not in JWT or cookies
- Role is **validated server-side** on every request
- TypeScript type: `UserRole = 'student' | 'teacher' | 'admin'`

## Usage Examples

### Example 1: Accessing the Dashboard

```typescript
// User navigates to /dashboard

// 1. +layout.server.ts runs
//    - Checks authentication (redirect if not logged in)
//    - Fetches profile { id, email, full_name, role }
//    - Returns profile

// 2. +layout.svelte renders
//    - Shows header with role and email
//    - Renders children

// 3. +page.svelte renders
//    - Checks profile.role
//    - Renders StudentDashboard | TeacherDashboard | AdminDashboard

// 4. Role-specific component renders
//    - Shows content based on role
//    - Has access to data.profile
```

### Example 2: Creating a Teacher-Only Route

```typescript
// File: src/routes/dashboard/classes/+page.server.ts

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/auth';

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
  // Get profile from parent layout
  const { profile } = await parent();

  // Enforce teacher-only access (throws 403 for non-teachers)
  requireRole(profile, 'teacher');

  // Fetch this teacher's classes
  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .eq('teacher_id', profile.id);

  return { classes };
};
```

### Example 3: Conditional UI Based on Role

```svelte
<!-- File: src/routes/dashboard/exercises/[id]/+page.svelte -->

<script lang="ts">
  import { hasAnyRole } from '$lib/server/auth';

  let { data } = $props();
</script>

<!-- All roles see the exercise -->
<h1>{data.exercise.title}</h1>
<p>{data.exercise.question}</p>

<!-- Only teachers and admins see edit button -->
{#if hasAnyRole(data.profile, ['teacher', 'admin'])}
  <button>Edit Exercise</button>
{/if}

<!-- Only students see attempt history -->
{#if hasRole(data.profile, 'student')}
  <div class="attempts">
    <h2>Your Attempts</h2>
    <!-- ... -->
  </div>
{/if}
```

## Extending the System

### Adding a New Role

1. **Update TypeScript Type**

```typescript
// File: src/lib/types/database.ts
export type UserRole = 'student' | 'teacher' | 'admin' | 'parent';
```

2. **Update Database Constraint**

```sql
ALTER TABLE profiles
DROP CONSTRAINT profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('student', 'teacher', 'admin', 'parent'));
```

3. **Create Dashboard Component**

```svelte
<!-- File: src/routes/dashboard/ParentDashboard.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<div>
  <h2>Parent Dashboard</h2>
  <!-- Parent-specific content -->
</div>
```

4. **Update Role Router**

```svelte
<!-- File: src/routes/dashboard/+page.svelte -->
{#if data.profile.role === 'student'}
  <StudentDashboard {data} />
{:else if data.profile.role === 'teacher'}
  <TeacherDashboard {data} />
{:else if data.profile.role === 'admin'}
  <AdminDashboard {data} />
{:else if data.profile.role === 'parent'}
  <ParentDashboard {data} />
{/if}
```

### Adding Role-Restricted Sub-Routes

```
src/routes/dashboard/
├── classes/              # Teacher-only
│   ├── +page.server.ts   # requireRole(profile, 'teacher')
│   └── +page.svelte
├── admin/                # Admin-only
│   ├── +page.server.ts   # requireRole(profile, 'admin')
│   └── +page.svelte
└── progress/             # Student-only
    ├── +page.server.ts   # requireRole(profile, 'student')
    └── +page.svelte
```

Each route's `+page.server.ts` enforces role access:

```typescript
export const load: PageServerLoad = async ({ parent }) => {
  const { profile } = await parent();
  requireRole(profile, 'teacher'); // or 'admin', or 'student'
  // ... fetch data
};
```

## Database Schema

### Profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster role queries
CREATE INDEX idx_profiles_role ON profiles(role);
```

### Row Level Security (RLS)

```sql
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- Only admins can change roles
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## Best Practices

1. **Always check roles server-side**: Never trust client-side role checks for security
2. **Use the database as source of truth**: Don't store roles in JWT or localStorage
3. **Fail securely**: Use `requireRole()` to block access, not just hide UI
4. **Audit admin actions**: Log all admin role changes and sensitive operations
5. **Limit admin accounts**: Only create admin accounts when necessary
6. **Use TypeScript**: Leverage the `UserRole` type to catch errors at compile time

## Troubleshooting

### User sees wrong dashboard

**Cause**: Profile role in database doesn't match expected role
**Solution**: Check `profiles` table in Supabase, update role if needed

### 403 Forbidden error

**Cause**: User doesn't have required role for the route
**Solution**: Check `requireRole()` calls in `+page.server.ts`, verify user's role in database

### Redirect to login when already logged in

**Cause**: `safeGetSession()` not finding user session
**Solution**: Check Supabase auth cookies, verify authentication flow

### Profile not found error

**Cause**: User exists in `auth.users` but not in `profiles` table
**Solution**: Ensure signup process creates profile record, or create manually

## Related Documentation

- [AUTHENTICATION.md](./AUTHENTICATION.md) - Full authentication flow documentation
- [Database Types](./src/lib/types/database.ts) - TypeScript type definitions
- [Supabase Docs](https://supabase.com/docs/guides/auth) - Authentication reference

## Summary

The role-based dashboard system provides:

- ✅ Secure server-side authentication and authorization
- ✅ Database-driven role management
- ✅ Three distinct user experiences (student, teacher, admin)
- ✅ Shared layout with role-specific content
- ✅ Type-safe implementation with TypeScript
- ✅ Extensible architecture for adding new roles
- ✅ Clear separation of concerns

All dashboard routes use the pattern:
1. Authenticate user
2. Fetch profile with role
3. Route to role-specific component
4. Render role-appropriate content
