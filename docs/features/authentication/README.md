# 🔐 Authentication System

Supabase-based authentication with Google OAuth, server-first verification, and automatic profile management.

**Status**: ✅ Production
**Version**: 1.0.0
**Last Updated**: 2025-10-28

---

## 🚀 Quick Start

### For Users

1. Go to `/login`
2. Click "Sign in with Google"
3. Authenticate with Google Workspace (@voltairedoha.com)
4. Automatic redirect to dashboard

### For Developers

See architecture diagram below for complete flow details.

---

## Authentication Flow Documentation

This document explains how authentication works in UbuMaths, including the complete flow from server to client, security considerations, and why Supabase warnings appear.

## 📖 Overview

The authentication system uses **Supabase** for authentication and follows a **server-first verification pattern** for security. This ensures that all authentication data is verified by Supabase's auth server before being used in the application.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION FLOW                      │
└─────────────────────────────────────────────────────────────────┘

1. SERVER HOOK (src/hooks.server.ts)
   ├─ Runs on EVERY server request
   ├─ Creates Supabase client with cookie management
   └─ Provides safeGetSession() method
      ├─ STEP 1: Call getUser() to VERIFY with auth server ✅
      ├─ STEP 2: Only if verified, get session tokens
      └─ Returns: { session, user } (both verified)

2. SERVER LAYOUT LOAD (src/routes/+layout.server.ts)
   ├─ Runs on server for page requests
   ├─ Calls safeGetSession() from hook
   └─ Returns: { session, user, cookies }
      └─ This data is VERIFIED and safe to use

3. CLIENT LAYOUT LOAD (src/routes/+layout.ts)
   ├─ Runs during SSR and in browser
   ├─ Creates Supabase client for client-side requests
   ├─ Receives verified data from +layout.server.ts
   ├─ Sets up onAuthStateChange listener
   │  └─ On auth change → invalidate('supabase:auth')
   │     └─ This triggers the whole chain again
   └─ Returns: { session, user, supabase }

4. COMPONENT (src/lib/components/Header.svelte)
   ├─ Receives props: { session, user, supabase }
   ├─ All data is VERIFIED by server
   ├─ Displays UI based on session state
   ├─ On logout → POST to /auth/logout → server clears cookies
   └─ On login → handled by login page server action
```

## Login/Logout Flow

### Login Flow - Google OAuth (Default Method)

```
User clicks "Sign in with Google"
  ↓
POST to /login?/googleSignIn (server action)
  ↓
Server: supabase.auth.signInWithOAuth({ provider: 'google' })
  ↓
Server: Redirects to Google consent screen
  ↓
User authenticates with Google workspace account
  ↓
Google redirects to /auth/callback?code=...
  ↓
Server: supabase.auth.exchangeCodeForSession(code)
  ↓
Server: Validates email domain (@voltairedoha.com only)
  ↓
If domain valid:
  ├─ Check if profile exists
  ├─ Create profile if new user (role: 'student', sync avatar)
  ├─ Update existing user profile (sync avatar from Google) ✨ NEW
  ├─ Sets auth cookies ✅
  ├─ Log: "Authentication successful: [email]" 📝
  └─ Redirect to /dashboard (or original page if specified)
If domain invalid:
  ├─ Sign out user immediately
  └─ Redirect to /login with error message
  ↓
Browser: onAuthStateChange fires (SIGNED_IN)
  ↓
Browser: invalidate('supabase:auth')
  ↓
Server: safeGetSession() verifies user
  ↓
Updated data flows to components
  ↓
Dashboard displays with user context
```

### Login Flow - Email/Password (Alternative Method)

```
User submits login form
  ↓
POST to /login?/login (server action)
  ↓
Server: supabase.auth.signInWithPassword()
  ↓
Server: Sets auth cookies ✅
  ↓
Server: Redirects to /dashboard
  ↓
Browser: onAuthStateChange fires (SIGNED_IN)
  ↓
Browser: invalidate('supabase:auth')
  ↓
Server: safeGetSession() verifies user
  ↓
Updated data flows to components
  ↓
Dashboard displays with user context
```

### Logout Flow (Server-Side)

```
User clicks logout
  ↓
POST to /auth/logout (server endpoint)
  ↓
Server: Capture user email for audit log
  ↓
Server: supabase.auth.signOut()
  ↓
Server: Log: "User disconnected: [email]" 📝
  ↓
Server: Clears auth cookies ✅
  ↓
Server: Redirects to home page
  ↓
Browser: onAuthStateChange fires (SIGNED_OUT)
  ↓
Browser: invalidate('supabase:auth')
  ↓
Server: safeGetSession() returns null
  ↓
Updated data flows to components
  ↓
UI shows login button
```

## Security Pattern

### The Problem: Cookies Can Be Tampered With

- Auth sessions are stored in cookies
- Cookies can potentially be modified by malicious actors
- **Never trust cookie data without verification**

### The Solution: Always Verify with Supabase

```typescript
// ❌ INSECURE - Don't do this
const {
	data: { session }
} = await supabase.auth.getSession();
// This reads from cookies without verification!

// ✅ SECURE - Do this instead
const {
	data: { user }
} = await supabase.auth.getUser();
// This verifies with Supabase's auth server
```

### Our Implementation

1. **Login/Logout on Server** - All auth operations go through server endpoints/actions
2. **Server sets/clears cookies** - Ensures browser and server are in sync
3. **First** call `getUser()` - verifies with Supabase server
4. **Then** call `getSession()` - gets session tokens (safe because verified)
5. **Return** both session and user (both verified)

### Why Server-Side Login/Logout?

**The Problem:**

- Browser Supabase client uses localStorage
- Server Supabase client uses cookies
- When you login/logout in the browser, cookies don't get updated
- Server still sees old session → UI doesn't update ❌

**The Solution:**

- Login/logout through **server endpoints**
- Server manages cookies properly
- Browser and server stay synchronized
- UI updates instantly ✅

## Why the Supabase Warning Appears

You may see this console warning:

```
Using the user object as returned from supabase.auth.getSession() or from some
supabase.auth.onAuthStateChange() events could be insecure! This value comes
directly from the storage medium (usually cookies on the server) and may not be
authentic. Use supabase.auth.getUser() instead which authenticates the data by
contacting the Supabase Auth server.
```

### Why It Appears

- Supabase shows this warning whenever `getSession()` is called
- It's a reminder to verify the user first

### Why It's Safe in Our Code

✅ We **always** call `getUser()` first to verify
✅ We **only** use `getSession()` after verification
✅ This follows Supabase's recommended pattern
✅ The warning can be safely ignored in our implementation

## Reactive Updates

### How Real-Time Updates Work

```
User logs in
  ↓
onAuthStateChange fires (in browser)
  ↓
invalidate('supabase:auth')
  ↓
+layout.ts re-runs (depends on 'supabase:auth')
  ↓
+layout.server.ts re-runs
  ↓
safeGetSession() verifies with getUser()
  ↓
New verified data flows to components
  ↓
UI updates automatically (Svelte 5 reactivity)
```

### Key Points

- **depends()** registers a dependency in +layout.ts
- **invalidate()** triggers re-running all dependent load functions
- **onAuthStateChange()** detects login/logout events
- We **never use** the session from onAuthStateChange (it's unverified)
- We **always** trigger server re-verification via invalidate()

## File Responsibilities

### 1. src/hooks.server.ts

**Role**: Server hook that runs on every request

- Creates Supabase server client
- Manages cookie reading/writing
- Provides `safeGetSession()` for secure auth verification

### 2. src/lib/server/supabase.ts

**Role**: Exports the server hook

- Contains detailed security documentation
- Implements the getUser() → getSession() pattern

### 3. src/routes/+layout.server.ts

**Role**: Server-side data loading

- Calls `safeGetSession()` to get verified auth data
- Returns session, user, and cookies to client

### 4. src/routes/+layout.ts

**Role**: Client-side setup and reactivity

- Creates Supabase client for browser
- Sets up auth state change listener
- Manages reactive updates via invalidate()

### 5. src/routes/(public)/login/+page.server.ts

**Role**: Server-side login actions

- Handles **Google OAuth** sign-in (`?/googleSignIn` action)
  - Initiates OAuth flow with Google provider
  - Redirects to Google consent screen
- Handles **Email/Password** login (`?/login` action)
  - Calls `signInWithPassword()` on server
  - Sets auth cookies properly
- Redirects on success

### 6. src/routes/(public)/login/+page.svelte

**Role**: Login form UI with tab switcher

- **Tab 1: Google Sign In** (default)
  - Single button with Google branding
  - POSTs to `?/googleSignIn` action
- **Tab 2: Email & Password**
  - Email/password form
  - POSTs to `?/login` action
- Displays errors from OAuth callback or form actions
- Uses SvelteKit form actions (`use:enhance`)

### 7. src/routes/(public)/auth/callback/+server.ts

**Role**: OAuth callback handler

- Handles redirect from Google after authentication
- Exchanges authorization code for session
- Validates email domain (@voltairedoha.com)
- Creates profile for new users (with avatar sync)
- **Always syncs avatar from Google on every login** (2025-10-28)
- Logs authentication success for audit trail
- Redirects to original page

### 8. src/routes/auth/logout/+server.ts

**Role**: Server-side logout endpoint

- Handles logout POST request
- Captures user email for audit log (2025-10-28)
- Calls `signOut()` on server
- Logs user disconnection for audit trail
- Clears auth cookies
- Redirects to home

### 8. src/lib/components/Header.svelte

**Role**: UI display

- Receives verified session/user props
- Displays login/logout UI based on auth state
- Submits form to `/auth/logout` for logout

## Common Patterns

### Checking if User is Logged In

```typescript
// In any component that receives session prop
if (session) {
	// User is logged in
	console.log('User email:', session.user.email);
} else {
	// User is logged out
}
```

### Accessing User Data

```typescript
// The user object contains:
user.id; // User's unique ID
user.email; // User's email
user.user_metadata; // Custom metadata (e.g., avatar_url)
```

### Making Authenticated Requests

```typescript
// The supabase client is automatically authenticated
const { data, error } = await supabase.from('your_table').select('*');
```

### Logging Out

```typescript
async function logout() {
	await supabase.auth.signOut(); // Clear session
	await invalidate('supabase:auth'); // Trigger verification
	goto('/'); // Navigate home
}
```

## Environment Variables

Required in `.env` file:

```env
# Supabase Configuration
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google OAuth Configuration
PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Notes**:

- `PUBLIC_*` variables are safe to expose in the browser
- Google Client ID and Secret obtained from Google Cloud Console
- Configure OAuth redirect URLs in both Google Console and Supabase Dashboard

## Security Checklist

- ✅ Always verify with `getUser()` before using session
- ✅ Never trust data from `getSession()` without verification
- ✅ Never trust session from `onAuthStateChange()` without verification
- ✅ Always use server-side verification for sensitive operations
- ✅ Keep `.env` file in `.gitignore`
- ✅ Use `invalidate()` to trigger server re-verification
- ✅ Let SvelteKit's data flow handle reactivity

## Debugging Tips

### Check Auth State

Look for these console logs (streamlined as of 2025-10-28):

**During Login (OAuth)**:

```
[auth/callback] Authentication successful: user@voltairedoha.com
```

**During Logout**:

```
[auth/logout] User disconnected: user@voltairedoha.com
```

**Error Cases**:

```
[auth/callback] No code provided in OAuth callback
[auth/callback] Code exchange failed: [error details]
[auth/callback] Unauthorized email domain: user@otherdomain.com
[auth/callback] Failed to update avatar: [error details]
```

**Note**: Verbose debug logs have been removed to reduce console noise. Only essential authentication events and errors are logged.

### Common Issues

1. **Login button doesn't update**: Check that `onAuthStateChange()` is calling `invalidate()`
2. **Session is null**: Verify that `getUser()` is being called in `safeGetSession()`
3. **Props not reactive**: Ensure components receive props from layout data
4. **Avatar not updating**: Check that Google OAuth is providing `user.user_metadata.picture` - avatar syncs automatically on each login (as of 2025-10-28)

## 🗺️ Roadmap

### Implemented ✅

- ✅ Google OAuth integration
- ✅ Server-first verification
- ✅ Automatic profile creation
- ✅ Avatar synchronization
- ✅ Email domain validation
- ✅ Cookie-based sessions

### In Progress 🔄

- 🔄 Multi-factor authentication

### Planned 📝

- 📝 Magic link auth
- 📝 Additional OAuth providers
- 📝 Password recovery

---

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [SvelteKit Load Functions](https://kit.svelte.dev/docs/load)
- [Svelte 5 Props](https://svelte.dev/docs/svelte/$props)

---

[← Back to Features](../README.md)
