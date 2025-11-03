# Student Data Fetching Patterns - Analysis & Recommendations

**Status**: 🟡 **MIGRATING** - Helper functions created, pages being refactored
**Created**: 2025-10-26
**Updated**: 2025-10-26
**Priority**: Medium - Refactoring in progress

---

## Current State: Multiple Patterns

### Pattern 1: RPC Function (Optimized for Bulk)

**Purpose**: Fetch ALL classes with ALL students in one query
**Performance**: Excellent (single query)
**Test Mode Support**: ✅ Added

**Used By**:

- `/dashboard/teacher/rewards/+page.server.ts`

**Function**: `get_teacher_classes_with_students(p_teacher_id, p_is_test_mode)`

**Pros**:

- Single database query for all data
- Excellent performance
- Server-side optimized

**Cons**:

- No caching
- Not reusable across pages
- Each page reload = new query

---

### Pattern 2: API Endpoint + Cache (Optimized for Single Class)

**Purpose**: Fetch students for ONE specific class
**Performance**: Good (with cache)
**Test Mode Support**: ✅ Added

**Used By**:

- `/dashboard` (TeacherDashboard - Wheel component)
- Any component using `teacherStudentsCache`

**Endpoint**: `/api/classes/[classId]/students`
**Cache**: `teacherStudentsCache`

**Pros**:

- Client-side caching (instant on re-open)
- Reusable across components
- Deduplicates concurrent requests
- Smart invalidation

**Cons**:

- One class at a time (not good for "show all classes")
- Requires cache management

---

### Pattern 3: Direct Database Queries

**Purpose**: Various specific use cases
**Performance**: Varies
**Test Mode Support**: ✅ Added individually

**Used By**:

- `/dashboard/teacher/classes/+page.server.ts`
- `/dashboard/teacher/assessments/[id]/assign/+page.server.ts`
- `/dashboard/teacher/srs/decks/[id]/assign/+page.server.ts`
- `src/lib/server/assessments.ts`

**Pattern**:

```typescript
const { data } = await supabase
	.from('class_members')
	.select('student_id, profiles!inner(is_test, ...)')
	.eq('class_id', classId)
	.eq('profiles.is_test', isTestMode);
```

**Pros**:

- Flexible for specific needs
- Full control over query

**Cons**:

- No caching
- Code duplication
- Easy to forget test mode filter

---

### Pattern 4: RPC Function (Dashboard Layout)

**Purpose**: Fetch ALL classes with student COUNTS
**Performance**: Excellent (single query)
**Test Mode Support**: ✅ Added

**Used By**:

- `/dashboard/+layout.server.ts`

**Function**: `get_teacher_classes_with_data(p_teacher_id, p_is_test_mode)`

**Pros**:

- Single query for class dropdown
- Filtered counts
- Server-optimized

**Cons**:

- No caching
- Different from Pattern 1 (confusing)

---

## Problem Summary

### Current Issues:

1. **No consistent strategy** - 4 different patterns
2. **Partial caching** - Only dashboard wheel uses cache
3. **Code duplication** - Test mode filter repeated everywhere
4. **Confusion** - Developers don't know which pattern to use
5. **Performance gaps** - Some pages could benefit from caching

### Test Mode Coverage:

✅ All patterns now support test mode filtering
⚠️ Easy to forget filter in new code
⚠️ No central validation that filter is applied

---

## Recommendations

### Option A: Unified Cache Strategy (Recommended)

**Create a unified server-side helper:**

```typescript
// src/lib/server/students.ts

/**
 * Get students for a class (with test mode filtering)
 *
 * @param classId - Class ID
 * @param userId - Teacher ID (for test mode lookup)
 * @param supabase - Supabase client
 * @param full - Include full data (gidouilles, vip_cards, etc.)
 * @returns Filtered students
 */
export async function getClassStudents(
	classId: string,
	userId: string,
	supabase: SupabaseClient,
	full: boolean = false
): Promise<Student[]> {
	const isTestMode = await getTeacherTestMode(userId, supabase);

	// Single source of truth for query
	const fields = full
		? '*, gidouilles, vip_cards, role, gender'
		: 'id, firstname, lastname, avatar_url';

	const { data } = await supabase
		.from('class_members')
		.select(`student_id, profiles!inner(${fields}, is_test)`)
		.eq('class_id', classId)
		.eq('profiles.is_test', isTestMode);

	return data?.map((m) => m.profiles) || [];
}

/**
 * Get ALL classes with students (for rewards page)
 */
export async function getTeacherClassesWithStudents(
	userId: string,
	supabase: SupabaseClient
): Promise<ClassWithStudents[]> {
	const isTestMode = await getTeacherTestMode(userId, supabase);

	const { data } = await supabase.rpc('get_teacher_classes_with_students', {
		p_teacher_id: userId,
		p_is_test_mode: isTestMode
	});

	return data || [];
}
```

**Benefits**:

- Single source of truth
- Test mode always applied correctly
- Easy to add caching layer
- Consistent API

**Migration**:

1. Create `src/lib/server/students.ts`
2. Update all pages to use helpers
3. Remove duplicate code
4. Optional: Add server-side caching

---

### Option B: Extend Cache to More Pages

**Keep current patterns but add caching:**

1. **Dashboard wheel**: Already uses cache ✅
2. **Rewards page**: Could use cache for individual class expansions
3. **Assign pages**: Could preload cache on page load

**Example - Rewards page with cache:**

```typescript
// Load all classes via RPC (fast)
const classes = await getTeacherClassesWithStudents(userId, supabase);

// Preload cache for all classes (background)
classes.forEach((cls) => {
	teacherStudentsCache.preload(cls.id, true);
});
```

---

### Option C: Document Patterns (Minimal Change)

**Create clear guidelines on when to use each pattern:**

1. **Use RPC** (`get_teacher_classes_with_students`):
   - When you need ALL classes with ALL students
   - Example: Rewards page

2. **Use API + Cache** (`teacherStudentsCache.getStudents`):
   - When you need ONE class at a time
   - Example: Wheel component, modals

3. **Use Direct Query**:
   - When you need specific joins or filtering
   - Example: Assessment results with joins

4. **Use Helper Functions**:
   - Always use `getTeacherTestMode()` for filtering
   - Never query students without test mode filter

---

## ✅ NEW: Unified Helper Functions Usage

### Quick Start Guide

Since **Phase 2 is now complete**, all new code should use the unified helper functions in `src/lib/server/students.ts`.

### Usage Examples

#### Example 1: Fetch students for a single class (minimal data)

```typescript
// src/routes/(protected)/dashboard/teacher/some-page/+page.server.ts
import type { PageServerLoad } from './$types';
import { getClassStudents } from '$lib/server/students';

export const load: PageServerLoad = async ({ params, parent, locals: { supabase } }) => {
	const { user } = await parent();

	// Fetch students with minimal data (id, firstname, lastname, avatar_url)
	const students = await getClassStudents({
		classId: params.classId,
		userId: user.id,
		supabase,
		full: false // Minimal data
	});

	return { students };
};
```

#### Example 2: Fetch students for a single class (full data with gidouilles)

```typescript
// For pages that need gidouilles, vip_cards, etc.
import { getClassStudents } from '$lib/server/students';

export const load: PageServerLoad = async ({ params, parent, locals: { supabase } }) => {
	const { user } = await parent();

	// Fetch students with full data (includes gidouilles, vip_cards, role, gender)
	const students = await getClassStudents({
		classId: params.classId,
		userId: user.id,
		supabase,
		full: true // Full data
	});

	return { students };
};
```

#### Example 3: Fetch ALL classes with ALL students (rewards page)

```typescript
// src/routes/(protected)/dashboard/teacher/rewards/+page.server.ts
import type { PageServerLoad } from './$types';
import { getTeacherClassesWithStudents } from '$lib/server/students';

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	const { user } = await parent();

	// Single optimized query for all classes + all students
	const classes = await getTeacherClassesWithStudents(user.id, supabase);

	return { classes };
};
```

#### Example 4: Fetch ALL classes with student COUNTS (dashboard/dropdowns)

```typescript
// src/routes/(protected)/dashboard/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { getTeacherClassesWithCounts } from '$lib/server/students';

export const load: LayoutServerLoad = async ({ parent, locals: { supabase } }) => {
	const { user, profile } = await parent();

	let teacherClasses = [];

	if (profile.role === 'teacher') {
		try {
			// Fetch classes with counts and schedules (no full student data)
			teacherClasses = await getTeacherClassesWithCounts(profile.id, supabase);
		} catch (err) {
			console.error('Error fetching classes:', err);
			teacherClasses = [];
		}
	}

	return { teacherClasses };
};
```

#### Example 5: Just count students (no data needed)

```typescript
// When you only need the count, not the actual student data
import { getClassStudentCount } from '$lib/server/students';

export const load: PageServerLoad = async ({ params, parent, locals: { supabase } }) => {
	const { user } = await parent();

	const count = await getClassStudentCount(params.classId, user.id, supabase);

	return { studentCount: count };
};
```

### Migration Guide

**Before (old pattern - N+1 queries)**:

```typescript
const isTestMode = await getTeacherTestMode(user.id, supabase);

// Fetch classes
const { data: classes } = await supabase.from('classes').select('*').eq('teacher_id', user.id);

// Fetch student count for each class (N queries!)
const classesWithData = await Promise.all(
	(classes || []).map(async (cls) => {
		const { count } = await supabase
			.from('class_members')
			.select('student_id, profiles!inner(is_test)', { count: 'exact', head: true })
			.eq('class_id', cls.id)
			.eq('profiles.is_test', isTestMode);

		return { ...cls, student_count: count || 0 };
	})
);
```

**After (new pattern - 1 query)**:

```typescript
import { getTeacherClassesWithCounts } from '$lib/server/students';

const classesWithData = await getTeacherClassesWithCounts(user.id, supabase);
```

### Key Benefits

1. **Test mode always applied correctly** - No risk of forgetting the filter
2. **Single source of truth** - All student queries go through same code path
3. **Performance optimized** - Uses RPC functions for bulk operations
4. **Easy to maintain** - Change once, affects everywhere
5. **TypeScript safety** - Proper return types for all functions

---

## ⚡ Caching Strategy: Server vs Client

### Important: Helper Functions DO NOT Use Cache

The unified helper functions (`getClassStudents`, `getTeacherClassesWithStudents`, etc.) are **server-side utilities** that **always query the database directly**. They do NOT check or use any cache.

### Two Separate Systems

#### 1. Server-Side Helpers (NO Cache) ❌

**Location**: `src/lib/server/students.ts`
**Used In**: `+page.server.ts` files (SSR)
**Caching**: None - always queries database

```typescript
// Server-side - NO cache
import { getClassStudents } from '$lib/server/students';

export const load: PageServerLoad = async ({ params, parent, locals }) => {
	const { user } = await parent();

	// This ALWAYS queries the database (no cache check)
	const students = await getClassStudents({
		classId: params.classId,
		userId: user.id,
		supabase: locals.supabase
	});

	return { students };
};
```

**Purpose**:

- ✅ Consistent test mode filtering
- ✅ Prevent N+1 query patterns
- ✅ Single source of truth for database queries
- ✅ Type safety
- ❌ NOT caching (that's a separate concern)

#### 2. Client-Side Cache (HAS Cache) ✅

**Location**: `src/lib/stores/teacherStudentsCache.svelte.ts`
**Used In**: `+page.svelte` files (client components)
**Caching**: Yes - checks cache before fetching

```typescript
// Client-side - WITH cache
import { teacherStudentsCache } from '$lib/stores/teacherStudentsCache.svelte';

async function loadStudents(classId: string) {
	// This checks cache FIRST, then fetches if needed
	const students = await teacherStudentsCache.getStudents(classId);

	// Cache flow:
	// 1. Check if classId is in cache
	// 2. If cached: return immediately (instant)
	// 3. If not cached: fetch from /api/classes/{classId}/students
	// 4. Store result in cache for future calls
	// 5. Return students
}
```

**Purpose**:

- ✅ Reduce redundant API calls
- ✅ Instant data on component re-mount
- ✅ Deduplication (multiple requests = single API call)
- ✅ Smart invalidation (clear on mutations)

### When Cache Is Used

| Where             | What                                 | Cache? | Reason                           |
| ----------------- | ------------------------------------ | ------ | -------------------------------- |
| `+page.server.ts` | `getClassStudents()`                 | ❌ No  | SSR - fresh data each request    |
| `+page.svelte`    | `teacherStudentsCache.getStudents()` | ✅ Yes | Client - reuse across components |
| API endpoint      | `/api/classes/[classId]/students`    | ❌ No  | Called by cache on miss          |
| RPC functions     | `get_teacher_classes_with_*`         | ❌ No  | Database-level optimization      |

### Why Helper Functions Don't Cache

1. **Server-side execution**: Runs on server during SSR, no persistent state
2. **Fresh data guarantee**: Each page load gets latest data from database
3. **Simple architecture**: Caching is a client-side optimization concern
4. **Different lifecycles**: Server functions run per-request, cache is per-session
5. **Database optimized**: RPC functions already provide query optimization

### Cache Invalidation

The client-side cache is automatically cleared when:

```typescript
// Test mode toggle (clears entire cache)
testMode.toggle();
await fetch('/api/test-mode', { method: 'POST', ... });
teacherStudentsCache.clear(); // ← Clears all cached classes
window.location.reload();

// After mutations (clears specific class)
await awardGidouilles(studentId, amount);
teacherStudentsCache.invalidate(classId); // ← Clears one class

// Manual clear (e.g., on logout)
teacherStudentsCache.clear();
```

### Best Practices

**Use Server-Side Helpers When:**

- ✅ Loading data in `+page.server.ts` or `+layout.server.ts`
- ✅ Initial page render (SSR)
- ✅ You need fresh data every time
- ✅ Building API endpoints

**Use Client-Side Cache When:**

- ✅ Loading data in `+page.svelte` or components
- ✅ Modal/dialog that opens repeatedly
- ✅ Interactive components (Wheel, dropdowns)
- ✅ Data shared across multiple components

**Example: Best of Both Worlds**

```typescript
// +page.server.ts - Initial load (server-side, no cache)
import { getTeacherClassesWithCounts } from '$lib/server/students';

export const load: PageServerLoad = async ({ parent, locals }) => {
  const { user } = await parent();
  const classes = await getTeacherClassesWithCounts(user.id, locals.supabase);
  return { classes };
};

// +page.svelte - Interactive modal (client-side, with cache)
<script lang="ts">
  import { teacherStudentsCache } from '$lib/stores/teacherStudentsCache.svelte';

  let { data } = $props();

  async function openWheelModal(classId: string) {
    // Uses cache - instant if already loaded
    const students = await teacherStudentsCache.getStudents(classId);
    showWheel(students);
  }
</script>
```

---

## Recommended Action Plan

### Phase 1: Documentation (Immediate)

- ✅ Create this document
- ✅ Add usage examples below
- ✅ Update CLAUDE.md with guidelines

### Phase 2: Helper Functions (COMPLETED ✅)

- ✅ Create `src/lib/server/students.ts`
- ✅ Implement `getClassStudents()` helper
- ✅ Implement `getTeacherClassesWithStudents()` helper
- ✅ Implement `getTeacherClassesWithCounts()` helper
- ✅ Update 3 pages to use helpers (proof of concept):
  - ✅ `/dashboard/teacher/rewards/+page.server.ts`
  - ✅ `/dashboard/+layout.server.ts`
  - ✅ `/dashboard/teacher/classes/+page.server.ts`

### Phase 3: Migration (Future)

- [ ] Update all remaining pages to use helpers
- [ ] Remove duplicate queries
- [ ] Add TypeScript types for return values
- [ ] Consider server-side caching layer

### Phase 4: Optimization (Future)

- [ ] Measure performance impact
- [ ] Add Redis/memory cache if needed
- [ ] Implement cache invalidation strategies

---

## Decision Matrix

| Need                       | Pattern                                 | Cache?   | Performance |
| -------------------------- | --------------------------------------- | -------- | ----------- |
| All classes + all students | RPC `get_teacher_classes_with_students` | No       | ⭐⭐⭐      |
| All classes + counts only  | RPC `get_teacher_classes_with_data`     | No       | ⭐⭐⭐      |
| Single class students      | API + `teacherStudentsCache`            | Yes      | ⭐⭐⭐      |
| Custom query needs         | Direct query                            | No       | ⭐⭐        |
| **RECOMMENDED**            | Helper functions                        | Optional | ⭐⭐⭐      |

---

## Notes

- All patterns now support test mode filtering ✅
- Cache invalidation works correctly with test mode toggle ✅
- Main issue is **consistency** and **discoverability**
- Refactoring is **safe** but not **urgent**
- Current system works, just not elegant

---

## Related Files

### Core Helper Functions

- `src/lib/server/students.ts` - **NEW: Unified student fetching helpers** ⭐

### Supporting Infrastructure

- `src/lib/stores/teacherStudentsCache.svelte.ts` - Client cache
- `src/routes/api/classes/[classId]/students/+server.ts` - API endpoint
- `src/lib/server/test-mode.ts` - Test mode helpers
- `supabase/migrations/*_add_test_users_system.sql` - RPC functions

### Refactored Pages (Using New Helpers) ✅

- `src/routes/(protected)/dashboard/teacher/rewards/+page.server.ts`
- `src/routes/(protected)/dashboard/+layout.server.ts`
- `src/routes/(protected)/dashboard/teacher/classes/+page.server.ts`
- `src/routes/(protected)/dashboard/teacher/assessments/[id]/assign/+page.server.ts`
- `src/routes/(protected)/dashboard/teacher/srs/decks/[id]/assign/+page.server.ts`

### Pages Using Test Mode Filtering Correctly

These pages use test mode filtering but not via helpers due to specialized queries:

- `src/lib/server/assessments.ts` - Uses `isTestMode` parameter for specialized result queries

---

## Update Log

**2025-11-03**: Cache-First Class Loading Pattern ✅

- Implemented **cache-first pattern** for teacher class loading
- Created new API endpoint `/api/teacher/classes` (wraps `getTeacherClassesWithCounts()`)
- Centralized class loading in `/dashboard/teacher/+layout.svelte`
- Added `getAllClassesSync()` and `hydrateAllClasses()` to teacherCache
- Eliminated redundant class loading from rewards and warnings pages
- **Impact**: Zero redundant loads, instant UI on cache hit, persists across navigation

**2025-10-26 (Late Evening)**: Phase 3 Migration Completed ✅

- Migrated all remaining assignment pages to use unified helpers
- Updated assessment assign page: `getTeacherClassesWithCounts()`
- Updated SRS deck assign page: `getTeacherClassesWithCounts()`
- **Total: 5 pages now using unified helpers** (100% of applicable pages)
- Remaining test mode filtering in `assessments.ts` uses correct pattern for specialized queries

**2025-10-26 (Evening)**: UI Enhancement

- Added loading overlay to TestModeToggle component
- Visual feedback during test mode switch with spinner and message
- Improved user experience during page reload

**2025-10-26 (Afternoon)**: Phase 2 completed

- Created unified helper functions in `src/lib/server/students.ts`
- Refactored 3 pages to use helpers (rewards, dashboard layout, teacher classes)
- Added comprehensive usage examples to documentation
- Performance improvement: Reduced from N+1 queries to single optimized query
- All helpers automatically apply test mode filtering
