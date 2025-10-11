# Authentication System Documentation

Complete technical documentation for the UbuMaths authentication system built with Supabase and SvelteKit.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Implementation Details](#implementation-details)
- [Authentication Flows](#authentication-flows)
- [Security Considerations](#security-considerations)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## Overview

### Technology Stack

- **Supabase Auth**: Backend authentication service
- **@supabase/ssr**: SSR-compatible Supabase client
- **@supabase/supabase-js**: Core Supabase JavaScript library
- **SvelteKit**: Full-stack framework with server-side rendering
- **TypeScript**: Type-safe development

### Key Features

✅ Server-side rendering (SSR) compatible
✅ Email/password authentication
✅ Email confirmation
✅ Password reset flow
✅ Password strength indicator
✅ Real-time auth state synchronization
✅ Cookie-based session management
✅ Role-based access control (RBAC)
✅ Secure token verification
✅ Progressive enhancement

---

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser Client                          │
│  - Supabase Browser Client (localStorage backup)            │
│  - Auth State Listener (onAuthStateChange)                  │
│  - Form Actions (use:enhance)                               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ HTTP Requests (cookies)
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    SvelteKit Server                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  hooks.server.ts (Request Hook)                       │  │
│  │  - Creates request-specific Supabase client           │  │
│  │  - Provides safeGetSession() for verification        │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │  +layout.server.ts (Root Server Layout)              │  │
│  │  - Calls safeGetSession()                            │  │
│  │  - Fetches user profile (with role)                  │  │
│  │  - Returns verified auth data                        │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │  +page.server.ts (Page Load Functions)               │  │
│  │  - Uses auth data from parent                        │  │
│  │  - Applies requireAuth() / requireRole()             │  │
│  │  - Loads page-specific data                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Auth API Calls
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    Supabase Backend                          │
│  - User Management (auth.users)                             │
│  - Token Verification (getUser())                           │
│  - Email Sending (confirmation, password reset)             │
│  - Database (profiles, RLS policies)                        │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Server Hook (`src/hooks.server.ts`)

**Purpose**: Entry point for all server requests. Creates Supabase client and provides session verification.

**What it does**:
- Creates request-specific Supabase client with cookie handlers
- Provides `safeGetSession()` function to verify user authenticity
- Ensures cookies are properly read and written

#### 2. Root Server Layout (`src/routes/+layout.server.ts`)

**Purpose**: Verifies authentication on every page load.

**What it returns**:
- `session`: Verified session object (null if not authenticated)
- `user`: Verified user object (null if not authenticated)
- `profile`: User profile with role from database (null if not authenticated)
- `cookies`: All cookies for client-side Supabase initialization

#### 3. Root Client Layout (`src/routes/+layout.ts`)

**Purpose**: Sets up client-side auth state management.

**What it does**:
- Creates browser or server Supabase client based on environment
- Sets up auth state change listener (browser only)
- Invalidates server data when auth changes
- Provides Supabase client to all components

#### 4. Auth Utilities (`src/lib/server/auth.ts`)

**Purpose**: Reusable authentication and authorization functions.

**Provides**:
- `getUserProfile()`: Fetch user profile from database
- `requireAuth()`: Redirect to login if not authenticated
- `requireRole()`: Throw 403 if user doesn't have required role
- `hasRole()`: Check if user has specific role (non-throwing)
- `hasAnyRole()`: Check if user has any of specified roles

---

## Implementation Details

### Safe Session Verification Pattern

**Problem**: Cookies can be tampered with, so we can't trust them blindly.

**Solution**: Always verify with Supabase's auth server before using session data.

```typescript
// ❌ WRONG - Don't do this
const { data: { session } } = await supabase.auth.getSession();
// Session might be fake/tampered with!

// ✅ CORRECT - Always verify first
const { data: { user }, error } = await supabase.auth.getUser();
if (user) {
  // User is verified by Supabase's auth server
  const { data: { session } } = await supabase.auth.getSession();
  // Now safe to use session tokens
}
```

This pattern is implemented in `safeGetSession()` in `src/lib/server/supabase.ts`.

### Cookie Management

**Why Cookies?**
- Work in SSR (unlike localStorage)
- Automatically sent with every request
- Can be HttpOnly and Secure
- Server and client stay in sync

**Cookie Flow**:
1. User logs in via server action
2. Server calls `supabase.auth.signInWithPassword()`
3. Cookie handlers in hooks.server.ts write auth cookies
4. Browser automatically sends cookies with subsequent requests
5. Server reads cookies to restore session

### Real-Time Auth State Updates

**Challenge**: When auth changes (login/logout), how does the UI update without page refresh?

**Solution**: Auth state change listener + SvelteKit invalidation

```typescript
// In +layout.ts (client-side)
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    // Trigger re-run of server load functions
    invalidate('supabase:auth');
  }
});

// In load function
export const load = async ({ depends }) => {
  depends('supabase:auth'); // Will re-run when invalidated
  // ...
};
```

**Result**: Login/logout instantly updates UI across all components.

---

## Authentication Flows

### 1. Signup Flow

```
User fills form (/signup)
  ↓
Form submits to server action
  ↓
Server: supabase.auth.signUp()
  ↓
If auto-confirm enabled:
  ├─ Session created immediately
  ├─ Cookies set
  └─ Redirect to home (logged in)
If email confirmation required:
  ├─ No session yet
  ├─ Email sent with confirmation link
  └─ Show "Check your email" message
```

**Files Involved**:
- `src/routes/signup/+page.svelte`: Form with password strength indicator
- `src/routes/signup/+page.server.ts`: Server-side signup action

### 2. Email Confirmation Flow

```
User clicks link in email
  ↓
Lands at /auth/confirm?token_hash=...&type=signup
  ↓
Server: supabase.auth.verifyOtp()
  ↓
If valid:
  ├─ Session created
  ├─ Cookies set
  └─ Redirect to home (logged in)
If invalid:
  └─ Redirect to login with error
```

**Files Involved**:
- `src/routes/auth/confirm/+server.ts`: Token verification and session creation

### 3. Login Flow

```
User fills form (/login)
  ↓
Form submits to server action
  ↓
Server: supabase.auth.signInWithPassword()
  ↓
If valid credentials:
  ├─ Session created
  ├─ Cookies set
  └─ Redirect to home (logged in)
If invalid:
  └─ Return error to display in form
```

**Files Involved**:
- `src/routes/login/+page.svelte`: Login form
- `src/routes/login/+page.server.ts`: Server-side login action

### 4. Logout Flow

```
User clicks logout button
  ↓
Form POSTs to /auth/logout
  ↓
Server: supabase.auth.signOut()
  ↓
Cookies cleared by cookie handlers
  ↓
Redirect to home
  ↓
Browser's onAuthStateChange fires
  ↓
invalidate('supabase:auth') called
  ↓
Server load functions re-run
  ↓
UI updates to show logged-out state
```

**Files Involved**:
- `src/routes/auth/logout/+server.ts`: Server-side logout endpoint
- `src/lib/components/Header.svelte`: Logout button (likely)

### 5. Password Reset Flow

```
User clicks "Forgot password?" (/login)
  ↓
Navigates to /auth/reset-password
  ↓
Enters email and submits
  ↓
Server: supabase.auth.resetPasswordForEmail()
  ↓
Email sent with reset link
  ↓
Show "Check your email" message
────────────────────────────────
User clicks link in email
  ↓
Lands at /auth/confirm?token_hash=...&type=recovery
  ↓
Server: supabase.auth.verifyOtp()
  ↓
If valid:
  ├─ Temporary session created
  ├─ Cookies set
  └─ Redirect to /auth/update-password
────────────────────────────────
User enters new password
  ↓
Form submits to server action
  ↓
Server: supabase.auth.updateUser({ password })
  ↓
Password updated
  ↓
Redirect to home (logged in with new password)
```

**Files Involved**:
- `src/routes/auth/reset-password/+page.svelte`: Request reset form
- `src/routes/auth/reset-password/+page.server.ts`: Send reset email action
- `src/routes/auth/confirm/+server.ts`: Verify token and redirect
- `src/routes/auth/update-password/+page.svelte`: New password form
- `src/routes/auth/update-password/+page.server.ts`: Update password action

---

## Security Considerations

### 1. Token Verification

✅ **Always verify tokens server-side**
- Call `getUser()` before trusting session data
- Never rely solely on cookies or localStorage

### 2. Server-Side Operations

✅ **All critical auth operations happen on server**
- Login, signup, logout, password reset
- Client only submits forms
- Prevents client-side manipulation

### 3. User Enumeration Prevention

✅ **Password reset doesn't reveal if email exists**
- Always return success message
- Prevents attackers from discovering valid email addresses

### 4. Password Strength

✅ **Real-time password strength feedback**
- Encourages strong passwords
- Shows requirements checklist
- Visual progress bar

### 5. HTTPS Only

⚠️ **Ensure cookies are Secure in production**
- Supabase sets secure cookies by default
- Always use HTTPS in production

### 6. Role-Based Access Control

✅ **Server-side role verification**
- Roles stored in database, not JWT
- Verified on every request
- Cannot be tampered with by client

### 7. Single-Use Tokens

✅ **Email confirmation and reset tokens are single-use**
- Cannot be reused after verification
- Expire after time limit (set by Supabase)

---

## API Reference

### Server-Side Functions

#### `safeGetSession()`

Securely retrieves and verifies the user session.

**Location**: `event.locals.safeGetSession` (available in server code)

**Returns**:
```typescript
{
  session: Session | null,
  user: User | null
}
```

**Example**:
```typescript
export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
  const { session, user } = await safeGetSession();
  // Both are verified and safe to use
};
```

---

#### `requireAuth(user)`

Ensures user is authenticated. Redirects to login if not.

**Location**: `src/lib/server/auth.ts`

**Parameters**:
- `user`: User object from `safeGetSession()` (or null)

**Throws**: `redirect(303, '/login')` if user is null

**Example**:
```typescript
export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
  const { user } = await safeGetSession();
  requireAuth(user); // Redirect if not logged in
  // User is authenticated beyond this point
};
```

---

#### `requireRole(profile, allowedRoles)`

Ensures user has required role. Throws 403 if not.

**Location**: `src/lib/server/auth.ts`

**Parameters**:
- `profile`: User profile from `getUserProfile()` (or null)
- `allowedRoles`: Single role or array of roles

**Throws**: `error(403, 'Access denied')` if user doesn't have role

**Example**:
```typescript
export const load: PageServerLoad = async ({ parent }) => {
  const { profile } = await parent();
  requireRole(profile, 'teacher'); // Only teachers allowed
  // OR
  requireRole(profile, ['teacher', 'admin']); // Teachers or admins
};
```

---

#### `getUserProfile(supabase, userId)`

Fetches user profile from database.

**Location**: `src/lib/server/auth.ts`

**Parameters**:
- `supabase`: Supabase client instance
- `userId`: User ID (UUID string)

**Returns**: `Promise<Profile | null>`

**Example**:
```typescript
const { user } = await safeGetSession();
const profile = await getUserProfile(supabase, user.id);
console.log(profile.role); // 'student' | 'teacher' | 'admin'
```

---

#### `hasRole(profile, role)` / `hasAnyRole(profile, roles)`

Non-throwing helpers to check user roles.

**Location**: `src/lib/server/auth.ts`

**Returns**: `boolean`

**Example**:
```typescript
if (hasRole(profile, 'admin')) {
  // Show admin features
}

if (hasAnyRole(profile, ['teacher', 'admin'])) {
  // Show teacher/admin features
}
```

---

### Client-Side Utilities

#### `calculatePasswordStrength(password)`

Evaluates password strength and provides feedback.

**Location**: `src/lib/utils/passwordStrength.ts`

**Parameters**:
- `password`: Password string to evaluate

**Returns**:
```typescript
{
  strength: 'weak' | 'fair' | 'good' | 'strong',
  score: 0 | 1 | 2 | 3 | 4,
  feedback: string,
  color: string, // Tailwind color class
  requirements: {
    minLength: boolean,
    hasUpperCase: boolean,
    hasLowerCase: boolean,
    hasNumber: boolean,
    hasSpecialChar: boolean
  }
}
```

**Example**:
```svelte
<script>
  import { calculatePasswordStrength } from '$lib/utils/passwordStrength';

  let password = $state('');
  let strength = $derived(calculatePasswordStrength(password));
</script>

<input bind:value={password} />
<p class={strength.color}>{strength.feedback}</p>
```

---

## Configuration

### Supabase Dashboard Settings

#### Email Templates

Configure email redirects in **Supabase Dashboard → Authentication → Email Templates**:

**Confirm Signup Template**:
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
```

**Reset Password Template**:
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
```

#### Email Provider

Configure SMTP settings in **Supabase Dashboard → Project Settings → Auth → Email**

#### Auth Settings

- **Enable Email Confirmations**: Optional (recommended for production)
- **Disable Email Signups**: Keep disabled (we want signups)
- **Enable Email Provider**: Enabled

### Environment Variables

**`.env` file**:
```bash
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Security Notes**:
- `PUBLIC_*` variables are safe to expose (they're public)
- Never commit `.env` to git
- Service role key (if needed) should never be exposed to client

---

## Troubleshooting

### Issue: "User not logged in after signup/login"

**Cause**: Server actions aren't setting cookies properly.

**Solution**:
1. Check that you're using form actions (not client-side JS)
2. Verify cookie handlers in `hooks.server.ts`
3. Check browser cookies (should see `sb-*` cookies)

---

### Issue: "Session exists on server but not client"

**Cause**: Browser and server Supabase clients out of sync.

**Solution**:
1. Check that `+layout.ts` is creating browser client correctly
2. Verify `onAuthStateChange` listener is set up
3. Check that cookies are being passed to server client

---

### Issue: "Infinite redirect loop on protected routes"

**Cause**: Auth check is failing or user is being redirected to a protected page.

**Solution**:
1. Check that `requireAuth()` redirects to `/login` (not a protected route)
2. Verify session is being created properly on login
3. Check for errors in browser console and server logs

---

### Issue: "Password reset email not received"

**Causes**:
1. Email provider not configured in Supabase
2. Email in spam folder
3. Incorrect redirect URL in email template

**Solution**:
1. Check Supabase Dashboard → Project Settings → Auth → Email
2. Verify SMTP settings are correct
3. Check email template has correct `{{ .SiteURL }}/auth/confirm` URL
4. Test with a different email provider

---

### Issue: "403 Forbidden on role-protected routes"

**Cause**: User doesn't have required role in database.

**Solution**:
1. Check `profiles.role` column in database
2. Verify role is one of: 'student', 'teacher', 'admin'
3. Update role in database if needed:
   ```sql
   UPDATE profiles SET role = 'teacher' WHERE id = 'user-id';
   ```

---

## Best Practices

### ✅ DO:

- Always use server-side form actions for auth operations
- Verify sessions with `safeGetSession()` on every request
- Use `requireAuth()` to protect routes
- Use `requireRole()` for role-based access control
- Log authentication events for debugging
- Test auth flows in incognito/private mode
- Use password strength indicators on signup/password reset

### ❌ DON'T:

- Call `supabase.auth.*` methods directly in components
- Trust session data without verification
- Use the deprecated `src/lib/supabaseClient.ts` in production
- Store sensitive data in localStorage
- Skip email confirmation in production
- Use weak passwords (enforce strength requirements)
- Forget to configure email templates in Supabase dashboard

---

## Migration Notes

### From Old Pattern to New Pattern

If migrating from client-side auth to this SSR-compatible system:

**Old (Client-Side)**:
```svelte
<!-- ❌ Don't do this -->
<script>
  import { supabase } from '$lib/supabaseClient';

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email, password
    });
  }
</script>
```

**New (Server-Side)**:
```svelte
<!-- ✅ Do this instead -->
<script>
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<form method="POST" action="?/login" use:enhance>
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  {#if form?.error}{form.error}{/if}
  <button type="submit">Login</button>
</form>
```

**Migration Steps**:
1. Create `+page.server.ts` with form actions
2. Update components to use `<form>` with `use:enhance`
3. Remove direct `supabase.auth.*` calls from components
4. Test each auth flow thoroughly
5. Remove `$lib/supabaseClient.ts` imports (replace with `data.supabase`)

---

## Additional Resources

- **Official Supabase Guide**: https://supabase.com/docs/guides/auth/server-side/sveltekit
- **SvelteKit Form Actions**: https://svelte.dev/docs/kit/form-actions
- **Supabase Auth Helpers**: https://github.com/supabase/auth-helpers
- **Project Instructions**: See `CLAUDE.md` for quick reference

---

**Last Updated**: 2025-01-11
**Version**: 2.0 (SSR-compatible with password reset)
