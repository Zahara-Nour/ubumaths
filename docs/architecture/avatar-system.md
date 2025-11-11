# Avatar System

**Last Updated**: 2025-11-12

This document describes the standardized avatar display system in UbuMaths.

## Overview

The avatar system provides a robust, multi-level fallback strategy for displaying user avatars across the application. All avatar displays use a centralized `getAvatarUrl()` utility function that handles Google OAuth avatars, database-stored avatars, and fallback images.

## Key Components

### 1. Avatar Utility (`src/lib/utils/avatar.ts`)

The core utility provides three main functions:

#### `getAvatarUrl(profile, user?)`

**Primary function for avatar URL resolution with complete fallback chain.**

```typescript
import { getAvatarUrl } from '$lib/utils/avatar';

// With both profile and user session data
const avatarUrl = getAvatarUrl(
	{
		avatar_url: profile.avatar_url,
		role: profile.role,
		gender: profile.gender
	},
	user // Optional: from session
);

// With profile only (no session)
const avatarUrl = getAvatarUrl({
	avatar_url: student.avatar_url,
	role: 'student',
	gender: 'M'
});
```

**Fallback Priority Order**:

1. `profile.avatar_url` - Database stored (primary source)
2. `user.user_metadata.picture` - Google OAuth session (**critical for Google users**)
3. `user.user_metadata.avatar_url` - Other OAuth providers
4. Role/gender-based default - Static fallback images
5. Empty string - Triggers `Avatar.Fallback` for initials

#### `getAvatarFallback(role, gender)`

Returns a static default avatar image path based on user role and gender.

```typescript
import { getAvatarFallback } from '$lib/utils/avatar';

const fallbackUrl = getAvatarFallback('student', 'M');
// Returns: '/avatars/student-boy.png'
```

#### `getAvatarInitials(firstname, lastname)`

Generates two-letter initials from name for fallback display.

```typescript
import { getAvatarInitials } from '$lib/utils/avatar';

const initials = getAvatarInitials('Marie', 'Dupont');
// Returns: 'MD'
```

### 2. Avatar Components (`src/lib/components/ui/avatar/`)

Shadcn-svelte Avatar components (based on bits-ui):

```svelte
<Avatar.Root class="h-12 w-12">
	<Avatar.Image src={avatarUrl} alt="User Name" />
	<Avatar.Fallback>
		{getAvatarInitials(firstname, lastname) || '?'}
	</Avatar.Fallback>
</Avatar.Root>
```

## Standard Usage Pattern

### Complete Pattern (Recommended)

```svelte
<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { getAvatarUrl, getAvatarInitials } from '$lib/utils/avatar';

	let { profile, user } = $props(); // profile from DB, user from session
</script>

<Avatar.Root class="h-10 w-10">
	<Avatar.Image
		src={getAvatarUrl(
			{
				avatar_url: profile.avatar_url,
				role: profile.role,
				gender: profile.gender
			},
			user // Pass user session for OAuth fallback
		)}
		alt={profile.email || 'User'}
	/>
	<Avatar.Fallback>
		{getAvatarInitials(profile.firstname, profile.lastname) || '?'}
	</Avatar.Fallback>
</Avatar.Root>
```

### Without User Session

When displaying avatars for other users (friends, students, etc.) where you don't have their session:

```svelte
<Avatar.Root class="h-10 w-10">
	<Avatar.Image
		src={getAvatarUrl({
			avatar_url: student.avatar_url,
			role: student.role,
			gender: student.gender
		})}
		alt={student.firstname}
	/>
	<Avatar.Fallback>
		{getAvatarInitials(student.firstname, student.lastname)}
	</Avatar.Fallback>
</Avatar.Root>
```

## Why This Matters

### Google OAuth Avatar Issue

Google OAuth stores profile pictures in the **`picture`** field (OAuth standard), not `avatar_url`. Without proper fallback logic:

**❌ Problem**:

```svelte
<!-- Only checks database - Google avatars won't display if DB sync fails -->
<Avatar.Image src={profile.avatar_url || defaultAvatar} />
```

**✅ Solution**:

```svelte
<!-- Checks DB first, then falls back to Google OAuth session data -->
<Avatar.Image src={getAvatarUrl(profile, user)} />
```

### Scenarios Handled

1. **Database sync failure**: Avatar saved during login fails to write to DB
   - Fallback: `user_metadata.picture` from session

2. **Stale URLs**: Old avatar URL becomes invalid (404, CORS)
   - Fallback: Fresh URL from session, then role/gender defaults

3. **No avatar uploaded**: User has no profile picture
   - Fallback: Role/gender-based default, then initials

## Implementation Coverage

### ✅ Components Using Standardized Pattern (15 files)

**Core Navigation**:

- `src/lib/components/Header.svelte`
- `src/routes/(protected)/dashboard/+layout.svelte`

**Friend System**:

- `src/lib/components/FriendsList.svelte`
- `src/lib/components/FriendRequests.svelte`
- `src/lib/components/AddFriend.svelte`

**Chat System**:

- `src/lib/components/chat/ChatWindow.svelte`
- `src/lib/components/chat/ChatMessageList.svelte`
- `src/lib/components/chat/ChatConversationList.svelte`
- `src/lib/components/chat/NewChatDialog.svelte`

**Teacher Pages**:

- `src/lib/components/teacher/StudentQuickActionsTable.svelte`
- `src/routes/(protected)/dashboard/teacher/rewards/+page.svelte`
- `src/routes/(protected)/dashboard/teacher/warnings/+page.svelte`

**Admin Pages**:

- `src/routes/(protected)/dashboard/admin/users/+page.svelte`
- `src/routes/(protected)/dashboard/admin/debug/avatar/+page.svelte`
- `src/routes/(protected)/dashboard/admin/friendships/+page.svelte`

### ⚠️ Special Cases (11 files - intentionally different)

**Private Message Pages** (raw `<img>` with error handling):

- `src/routes/(protected)/messages/inbox/+page.svelte`
- `src/routes/(protected)/messages/compose/+page.svelte`
- `src/routes/(protected)/messages/[id]/+page.svelte`
- `src/routes/(protected)/messages/thread/[id]/+page.svelte`
- `src/routes/(protected)/messages/archived/+page.svelte`

**Simplified Displays** (performance-optimized, no fallback needed):

- `src/routes/(protected)/dashboard/student/riddles/leaderboard/+page.svelte`
- `src/routes/(protected)/dashboard/teacher/riddles/stats/+page.svelte`
- `src/routes/(protected)/dashboard/teacher/riddles/validations/+page.svelte`
- `src/routes/(protected)/dashboard/teacher/riddles/validations/[id]/+page.svelte`
- `src/routes/(protected)/dashboard/teacher/srs/decks/[id]/assignments/+page.svelte`
- `src/lib/components/game/combat/PlayerPanel.svelte`

## Database Integration

### Avatar Storage

**Migration 061** (`supabase/migrations/061_fix_google_avatar_picture_field.sql`):

- Database trigger extracts `picture` field from Google OAuth
- Saves to `profiles.avatar_url` on user creation
- Updates existing profiles on login

### OAuth Callback

**`src/routes/(public)/auth/callback/+server.ts`**:

```typescript
const googleAvatar = user.user_metadata?.picture || user.user_metadata?.avatar_url;
// Always sync avatar from Google on each login
```

## Best Practices

### ✅ DO

- **Always use `getAvatarUrl()`** for avatar URL resolution
- **Pass user session** when available (own profile, header)
- **Include Avatar.Fallback** with initials
- **Use consistent sizing** (`h-10 w-10`, `h-12 w-12`, etc.)

### ❌ DON'T

- Don't check `avatar_url` directly without fallback logic
- Don't create custom avatar URL resolution functions
- Don't forget to import `getAvatarUrl` utility
- Don't skip `Avatar.Fallback` component

## Troubleshooting

### Avatar Not Displaying?

1. **Check database**: Is `profile.avatar_url` populated?
2. **Check session**: Does `user.user_metadata.picture` exist?
3. **Check migration**: Is migration 061 applied? (`pnpm db:migrate`)
4. **Check console**: Are there CORS or 404 errors?
5. **Re-authenticate**: Log out and log back in to trigger avatar sync

### Debug Page

Visit `/dashboard/admin/debug/avatar` (admin only) to inspect:

- Avatar URL resolution chain
- User metadata fields
- Profile data
- Specific field values

## Related Files

- **Utility**: `src/lib/utils/avatar.ts`
- **Components**: `src/lib/components/ui/avatar/`
- **OAuth Callback**: `src/routes/(public)/auth/callback/+server.ts`
- **Migration**: `supabase/migrations/061_fix_google_avatar_picture_field.sql`
- **Debug Page**: `src/routes/(protected)/dashboard/admin/debug/avatar/+page.svelte`

## Changelog

### 2025-11-12 - Avatar Standardization

- Created centralized `getAvatarUrl()` utility
- Migrated 15 components to use standardized pattern
- Updated 9 components (Header, dashboard layout, teacher/admin pages)
- Eliminated 7 custom `getAvatarSrc()` functions
- Achieved 100% consistency across primary avatar displays

### 2024 - Initial Implementation

- Google OAuth avatar extraction (migration 061)
- Basic avatar fallback in Header component
- Role/gender-based default avatars
