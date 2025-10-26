# Test Users System

**Status**: ✅ **Fully Implemented**
**Version**: 1.0.0
**Created**: 2025-10-26

---

## Overview

The Test Users System allows teachers to separate test/demo students from real students throughout the application. Teachers can toggle between viewing test students (for demos, training) and real students (for actual teaching).

## Key Features

### For Teachers

- **Toggle Switch**: Simple UI to switch between test and real student views
- **Persistent Preference**: Selection is saved and restored across sessions
- **Loading Overlay**: Visual feedback during mode switching with page reload
- **Automatic Filtering**: All student queries automatically respect the test mode setting
- **Complete Data Isolation**: Analytics, statistics, and counts only include the selected student type

### For Test Teachers

- **Always Test Mode**: Teachers marked as test users (`is_test = true`) always see test students
- **No Toggle Shown**: Toggle is hidden for test teachers (locked to test mode)

### For Administrators

- **User Management**: Toggle `is_test` flag for any user (teacher or student)
- **Bulk Operations**: Filter and manage test users separately
- **Visual Indicators**: Clear badges showing test user status

---

## User Experience

### Teacher Dashboard

When a regular teacher (non-test) accesses their dashboard, they see:

```
┌─────────────────────────────────────────┐
│ Mode Test  [✓]  [Test Students Badge]  │
└─────────────────────────────────────────┘
```

**Test Mode ON**: Shows only test students in:

- Class rosters
- Rewards/Gidouilles management
- Assessment assignments
- SRS deck assignments
- Analytics and statistics
- Student wheels and random selection

**Test Mode OFF**: Shows only real students everywhere

### Mode Switching Experience

1. Teacher clicks the toggle checkbox
2. **Loading overlay appears immediately** with spinner and message:
   ```
   Changement de mode...
   Rechargement de la page en cours
   ```
3. System syncs preference with database
4. Student cache is cleared
5. Page performs hard reload
6. New data loads with updated filter

---

## Technical Architecture

### Database Schema

#### profiles table

```sql
ALTER TABLE profiles
ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT FALSE;
```

#### user_preferences table

```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  test_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Data Flow

```
┌──────────────┐
│ Teacher      │
│ Toggles Mode │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ TestModeToggle   │
│ Component        │
│ - Shows overlay  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Client Store     │
│ (localStorage)   │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ API: /test-mode  │
│ (POST)           │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Database         │
│ user_preferences │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Clear Cache      │
│ Hard Reload      │
└──────┬───────────┘
       │
       ▼
┌──────────────────────┐
│ Server Load          │
│ - getTeacherTestMode │
│ - Filter students    │
└──────────────────────┘
```

### Key Files

#### Components

- `src/lib/components/teacher/TestModeToggle.svelte` - Toggle UI with loading overlay
- `src/lib/stores/test-mode.svelte.ts` - Client-side reactive store
- `src/lib/stores/teacherStudentsCache.svelte.ts` - Student cache (cleared on toggle)

#### Server Helpers

- `src/lib/server/test-mode.ts` - Core test mode detection logic
- `src/lib/server/students.ts` - Unified student fetching with automatic filtering

#### API Endpoints

- `src/routes/api/test-mode/+server.ts` - Sync test mode preference
- `src/routes/api/classes/[classId]/students/+server.ts` - Fetch students with filtering

#### Database

- `supabase/migrations/20251026060302_add_test_users_system.sql` - Initial schema
- `supabase/migrations/20251026070000_update_teacher_classes_rpc_test_mode.sql` - RPC updates

---

## Implementation Details

### Server-Side Test Mode Detection

```typescript
// src/lib/server/test-mode.ts

export async function getTeacherTestMode(
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<boolean> {
	// 1. Check if teacher is a test user (always test mode)
	const { data: profile } = await supabase
		.from('profiles')
		.select('is_test')
		.eq('id', userId)
		.single();

	if (profile?.is_test) {
		return true; // Test teachers locked to test mode
	}

	// 2. Check user preference for regular teachers
	const { data: preference } = await supabase
		.from('user_preferences')
		.select('test_mode_enabled')
		.eq('user_id', userId)
		.maybeSingle();

	return preference?.test_mode_enabled ?? false;
}
```

### Client-Side Store

```typescript
// src/lib/stores/test-mode.svelte.ts

import { writable } from 'svelte/store';

const STORAGE_KEY = 'teacher_test_mode';

function getInitialValue(): boolean {
	if (typeof window === 'undefined') return false;
	const stored = localStorage.getItem(STORAGE_KEY);
	return stored === 'true';
}

export const testMode = createTestModeStore();
```

### Unified Student Fetching

All student queries use helper functions that automatically apply test mode filtering:

```typescript
// src/lib/server/students.ts

export async function getClassStudents(options) {
	const isTestMode = await getTeacherTestMode(userId, supabase);

	const { data: members } = await supabase
		.from('class_members')
		.select(selectFields)
		.eq('class_id', classId)
		.eq('profiles.is_test', isTestMode); // KEY: Automatic filtering

	return transformedStudents;
}
```

### Loading Overlay Component

```svelte
<!-- src/lib/components/teacher/TestModeToggle.svelte -->

<script>
  let isLoading = $state(false);

  async function handleToggle() {
    isLoading = true;  // Show overlay
    testMode.toggle();

    await fetch('/api/test-mode', { method: 'POST', ... });
    teacherStudentsCache.clear();
    window.location.reload();  // Overlay stays until reload completes
  }
</script>

{#if isLoading}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
		<div class="rounded-lg bg-card p-8 shadow-xl">
			<!-- Spinner and loading text -->
		</div>
	</div>
{/if}
```

---

## Refactored Pages

The following pages have been refactored to use unified helper functions with automatic test mode filtering:

### Phase 2 Complete ✅

- `/dashboard/teacher/rewards/+page.server.ts` - Rewards management
- `/dashboard/+layout.server.ts` - Teacher class dropdown
- `/dashboard/teacher/classes/+page.server.ts` - Class schedule management

### Using Test Mode Filtering

- `/dashboard/teacher/assessments/[id]/assign/+page.server.ts`
- `/dashboard/teacher/srs/decks/[id]/assign/+page.server.ts`
- `/dashboard/teacher/riddles/+page.server.ts`
- `/api/classes/[classId]/students/+server.ts`

---

## Performance Optimization

**Before**: N+1 queries (1 for classes + 2 per class)
**After**: Single optimized RPC query

Example for 3 classes:

- **Old**: 7 database queries
- **New**: 1 database query
- **Improvement**: 85% reduction

---

## Testing Guide

### As a Regular Teacher

1. Login as a non-test teacher
2. Navigate to dashboard
3. Verify you see the "Mode Test" toggle
4. Create/import some test students (mark `is_test = true`)
5. Toggle test mode ON
6. **Verify**: Loading overlay appears during reload
7. **Verify**: Only test students appear in all views
8. Toggle test mode OFF
9. **Verify**: Only real students appear

### As a Test Teacher

1. Login as a test teacher (`is_test = true`)
2. Navigate to dashboard
3. **Verify**: No toggle shown
4. **Verify**: Only test students visible everywhere
5. **Cannot** switch to viewing real students

### As an Administrator

1. Login as admin
2. Navigate to `/dashboard/admin/users`
3. Filter by test users
4. Toggle `is_test` flag for users
5. Verify badge indicators update

---

## Future Enhancements

### Potential Phase 3 (Optional)

- Migrate remaining pages to use unified helpers:
  - Assessment assignment pages
  - SRS deck assignment pages
  - Assessment results server helpers
- Add server-side caching layer for frequently accessed data
- Implement soft toggle (no page reload) using SvelteKit invalidation

### Potential Phase 4 (Long-term)

- Bulk student import with automatic test flag assignment
- Test data generation tools for demos
- Scheduled cleanup of old test data
- Export/import test scenarios

---

## Related Documentation

- [Student Data Fetching Patterns](../../architecture/student-data-fetching-patterns.md)
- [Database Schema](../../architecture/database-schema.md)
- [Student Import Guide](../../guides/student-import.md)

---

## Changelog

### Version 1.0.0 (2025-10-26)

#### Added

- Database schema for `is_test` flag and `user_preferences` table
- Test mode toggle component with loading overlay
- Client-side store with localStorage persistence
- Server-side test mode detection helpers
- Unified student fetching helpers with automatic filtering
- API endpoint for syncing test mode preference
- Full-page loading overlay during mode switch
- Comprehensive documentation

#### Refactored

- Rewards page to use `getTeacherClassesWithStudents()`
- Dashboard layout to use `getTeacherClassesWithCounts()`
- Teacher classes page to use `getTeacherClassesWithCounts()`

#### Performance

- Reduced database queries by 85% (N+1 → single RPC query)
- Optimized student counting with RPC functions
- Eliminated redundant test mode lookups

---

**Questions or Issues?** See [Contributing Guide](../../contributing/README.md)
