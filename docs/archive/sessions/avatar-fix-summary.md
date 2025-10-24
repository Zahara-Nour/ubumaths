# Avatar Display Fix - Summary

## Problem

Google OAuth authenticated users (teachers and students) were not seeing their profile pictures in the application header.

## Root Cause

**Google OAuth stores user profile pictures in the `picture` field, not `avatar_url`.**

The original implementation only checked for `user_metadata.avatar_url`, which Google doesn't use. This caused all Google-authenticated users to see fallback avatars instead of their actual profile pictures.

## Solution Overview

Updated the application to check both `picture` (Google's standard) and `avatar_url` (other providers) when extracting and saving user avatars.

## Files Modified

### 1. Database Migration

**File:** `supabase/migrations/061_fix_google_avatar_picture_field.sql`

- Updated `handle_new_user()` trigger to extract avatar from both fields
- Saves avatar URL to `profiles.avatar_url` on user creation
- Updates existing profiles without avatars on subsequent logins

### 2. OAuth Callback Handler

**File:** `src/routes/(public)/auth/callback/+server.ts`

- Extracts `picture` or `avatar_url` when creating profiles
- Updates existing profiles with Google avatars if they don't have one
- Handles edge case where users logged in before avatar saving was implemented

### 3. Header Component

**File:** `src/lib/components/Header.svelte`

- Updated `getAvatarSrc()` function with comprehensive fallback chain
- Checks `picture` field in addition to `avatar_url`
- Provides immediate visual feedback even before database updates

### 4. Debug Page

**Files:**

- `src/routes/(protected)/debug-avatar/+page.server.ts`
- `src/routes/(protected)/debug-avatar/+page.svelte`

- Created new debug page at `/debug-avatar`
- Shows all avatar data sources and fallback chain
- Includes troubleshooting tips and related file references
- Helps diagnose avatar issues for specific users

### 5. Documentation

**File:** `CLAUDE.md`

- Added new section: "Google OAuth and Avatar Management"
- Documents avatar URL extraction patterns
- Explains avatar storage flow and display logic
- Lists utility functions and OAuth configuration
- Provides debugging guidance

## Avatar Fallback Chain

The application now uses this priority order for avatar display:

1. **profile.avatar_url** - Stored in database (saved from OAuth on login)
2. **user.user_metadata.picture** - Google OAuth session data (Google standard)
3. **user.user_metadata.avatar_url** - Other OAuth providers (fallback)
4. **Role/gender-based default** - Static fallback images
5. **Initials** - First/last name initials or email initial

## How It Works

### For New Users

1. User authenticates with Google OAuth
2. `handle_new_user()` trigger extracts avatar from `picture` field
3. Avatar URL is saved to `profiles.avatar_url` in database
4. Header component displays the Google profile picture

### For Existing Users

1. User logs in again after the fix was deployed
2. OAuth callback handler checks if profile has an avatar
3. If not, it updates `profiles.avatar_url` with Google picture URL
4. Header component displays the Google profile picture

## Testing

### To Verify Avatar Fix

1. Log out of the application
2. Log back in with Google OAuth
3. Avatar should display in the header
4. Visit `/debug-avatar` to see all avatar data

### Debug Page Features

The `/debug-avatar` page shows:

- Current avatar display with all fallback stages
- Avatar source URL being used
- Full user object and metadata
- Profile data from database
- Specific checks for `picture`, `avatar_url`, role, and gender
- Troubleshooting tips

## Important Notes

- **Users must log out and log back in** for avatars to appear after the fix is deployed
- Avatar URLs from Google are direct CDN links (no additional storage needed)
- If a user changes their Google profile picture, it updates on next login
- The database trigger handles both new users and existing users automatically

## Related Utilities

**File:** `src/lib/utils/avatar.ts`

- `getAvatarFallback(role, gender)` - Returns role/gender-based default avatars
- `getAvatarInitials(firstname, lastname)` - Generates two-letter initials

## OAuth Configuration

- **Provider:** Google
- **Allowed Domain:** `@voltairedoha.com` (enforced in callback handler)
- **Callback URL:** `/auth/callback`
- **Metadata Fields Used:** `picture`, `given_name`, `family_name`, `full_name`, `email`

## Verification Checklist

- [x] Migration 061 applied to database
- [x] OAuth callback extracts from `picture` field
- [x] Header component checks `picture` field
- [x] Debug page created and accessible
- [x] Documentation updated in CLAUDE.md
- [x] Code comments added to all modified files
- [x] Avatar fallback chain working correctly

## Code Example

```typescript
// CORRECT: Check 'picture' first (Google standard), then 'avatar_url' (fallback)
const avatarUrl = user.user_metadata?.picture || user.user_metadata?.avatar_url;

// WRONG: Only checking avatar_url will not work with Google OAuth
const avatarUrl = user.user_metadata?.avatar_url;
```

## Migration Timeline

1. **Migration 060** - Initial attempt (used `avatar_url` only)
2. **Migration 061** - Fix to use `picture` field (deployed)
3. Users log out/in - Avatars saved to database
4. Avatars display correctly going forward
