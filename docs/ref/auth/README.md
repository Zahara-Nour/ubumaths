# Authentication System - Technical Guide

> Complete technical reference for UbuMaths authentication system.

## Table of Contents

| Document                                        | Description                         |
| ----------------------------------------------- | ----------------------------------- |
| [Architecture Overview](#architecture-overview) | System architecture and data flow   |
| [Configuration](./configuration.md)             | Environment variables and providers |
| [Auth Flows](./auth-flows.md)                   | Login, logout, password reset flows |
| [Session Management](./session-management.md)   | Cookies, tokens, refresh mechanisms |
| [Route Protection](./route-protection.md)       | Protected routes and middleware     |
| [Database Security](./database-security.md)     | RLS policies and triggers           |
| [Special Cases](./special-cases.md)             | Student import, approval workflow   |

---

## Architecture Overview

### Technology Stack

| Component       | Technology                 |
| --------------- | -------------------------- |
| Auth Provider   | Supabase Auth              |
| OAuth Provider  | Google (restricted domain) |
| Session Storage | HTTP-only cookies          |
| Database        | PostgreSQL (Supabase)      |
| Framework       | SvelteKit (SSR)            |

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER                              │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────┐  │
│  │ Login Form  │    │ Auth State  │    │ Supabase Browser Client     │  │
│  │ +page.svelte│───▶│ (from SSR)  │───▶│ onAuthStateChange listener  │  │
│  └─────────────┘    └─────────────┘    └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Form POST / Token Refresh
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SVELTEKIT SERVER                               │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        hooks.server.ts                           │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │    │
│  │  │ supabaseHook │─▶│ profileHook  │─▶│ csrfHook + securityHook│ │    │
│  │  │ (cookies)    │  │ (load user)  │  │ (protection)           │ │    │
│  │  └──────────────┘  └──────────────┘  └────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌────────────────────────┐    ┌────────────────────────────────────┐   │
│  │ +page.server.ts        │    │ +server.ts (API)                   │   │
│  │ - Form actions         │    │ - requireAuth()                    │   │
│  │ - signInWithPassword   │    │ - requireRole()                    │   │
│  │ - signInWithOAuth      │    │ - RLS via supabase client          │   │
│  └────────────────────────┘    └────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Supabase Server Client
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE BACKEND                               │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────┐    ┌────────────────────────────────────────┐   │
│  │    Auth Service    │    │              PostgreSQL                 │   │
│  │  ┌──────────────┐  │    │  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │ auth.users   │  │    │  │  profiles    │  │ RLS Policies   │  │   │
│  │  │ (managed)    │──│────│──│  (app data)  │  │ is_admin()     │  │   │
│  │  └──────────────┘  │    │  └──────────────┘  │ is_teacher()   │  │   │
│  │  ┌──────────────┐  │    │  ┌──────────────┐  └────────────────┘  │   │
│  │  │ Google OAuth │  │    │  │  Triggers    │                      │   │
│  │  │ (provider)   │  │    │  │  on_signup   │                      │   │
│  │  └──────────────┘  │    │  └──────────────┘                      │   │
│  └────────────────────┘    └────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Request Lifecycle

```
1. REQUEST ARRIVES
   │
   ▼
2. hooks.server.ts EXECUTES (sequence)
   ├── requestIdHandle     → Adds X-Request-ID header
   ├── supabaseHandle      → Creates supabase client, safeGetSession()
   ├── redirectHandle      → URL redirects
   ├── userProfileHandle   → Loads profile into locals
   ├── csrfHandle          → Validates Origin header (POST/PUT/DELETE)
   ├── securityHeadersHandle → CSP, X-Frame-Options, etc.
   └── errorMonitoringHandle → Error logging
   │
   ▼
3. ROUTE HANDLER EXECUTES
   ├── +layout.server.ts   → Protected group checks
   ├── +page.server.ts     → Page-specific auth logic
   └── +server.ts          → API endpoint auth middleware
   │
   ▼
4. DATABASE QUERY (if any)
   └── RLS policies enforce row-level security
   │
   ▼
5. RESPONSE SENT
   └── Set-Cookie headers for session tokens
```

### Key Files

| File                                       | Purpose                           |
| ------------------------------------------ | --------------------------------- |
| `src/hooks.server.ts`                      | Request handling, session loading |
| `src/lib/server/supabase.ts`               | Supabase client factory           |
| `src/lib/server/middleware/auth.ts`        | API route protection utilities    |
| `src/lib/server/auth.ts`                   | Role checking utilities           |
| `src/routes/+layout.ts`                    | Client-side auth state            |
| `src/routes/(protected)/+layout.server.ts` | Protected route checks            |
| `src/routes/(public)/auth/*`               | Auth pages and handlers           |

---

## Security Model

### Defense in Depth

```
Layer 1: Network
├── HTTPS only (Vercel enforced)
└── HSTS headers

Layer 2: Application
├── CSRF validation (Origin header)
├── Rate limiting (database-backed)
├── Security headers (CSP, X-Frame-Options)
└── Input validation (Zod schemas)

Layer 3: Session
├── HTTP-only cookies
├── Server-side session verification (getUser())
└── Token refresh handling

Layer 4: Authorization
├── Route-level checks (+layout.server.ts)
├── API middleware (requireAuth, requireRole)
└── Component-level checks

Layer 5: Database
├── Row Level Security (RLS)
├── Security definer functions
└── User role validation
```

### Trust Boundaries

```
UNTRUSTED                    TRUSTED
─────────────────────────────────────────────────────
Browser cookies         →    Server session verification
Client-side state       →    Server-side profile loading
Request body/params     →    Zod schema validation
User identity claims    →    Supabase getUser() verification
```

---

## User Roles and Status

### Roles

| Role      | Permissions                           |
| --------- | ------------------------------------- |
| `student` | Access own data, classes enrolled in  |
| `teacher` | Manage classes, view student progress |
| `admin`   | Full access, user management          |

### Status

| Status     | Description             | Access                        |
| ---------- | ----------------------- | ----------------------------- |
| `pending`  | Awaiting admin approval | `/auth/pending-approval` only |
| `approved` | Full access granted     | All role-appropriate routes   |
| `rejected` | Access denied           | Signed out, cannot login      |

### Status Flow

```
New User Signup
      │
      ▼
┌─────────────────┐
│ check domain    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
@voltaire   other
domain      domain
    │         │
    ▼         ▼
 pending   approved
    │         │
    │         └───────────┐
    ▼                     │
┌────────────┐            │
│ Admin      │            │
│ reviews    │            │
└─────┬──────┘            │
      │                   │
  ┌───┴───┐               │
  │       │               │
  ▼       ▼               │
approve  reject           │
  │       │               │
  ▼       ▼               │
approved rejected         │
  │       │               │
  ├───────┘               │
  │                       │
  ▼                       │
Full Access ◄─────────────┘
```

---

## Quick Reference

### Check if user is authenticated

```typescript
// In +page.server.ts or +server.ts
const { user } = await locals.safeGetSession();
if (!user) throw redirect(303, '/auth/login');
```

### Check user role

```typescript
import { requireRole, requireRoles } from '$lib/server/middleware/auth';

// Single role
const { user, profile } = await requireRole(locals, 'teacher');

// Multiple roles (OR)
const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);
```

### Access user in components

```svelte
<script lang="ts">
	let { data } = $props();
	const { user, profile } = data;
</script>

{#if profile?.role === 'admin'}
	<AdminPanel />
{/if}
```

### Protected API endpoint

```typescript
// src/routes/api/example/+server.ts
import { requireAuth } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireAuth(locals);

	// User is authenticated, proceed with logic
};
```
