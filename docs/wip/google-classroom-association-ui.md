# Google Classroom Course Association UI - Implementation

**Date**: 2026-01-13
**Status**: Completed
**Feature**: Add UI to associate UbuMaths classes with Google Classroom courses

---

## Overview

Implemented a user interface on the Teacher Classes page that allows teachers to:

1. View their available Google Classroom courses (synced from Google)
2. Associate each UbuMaths class with a Google Classroom course
3. Change or remove associations

This is part of the simplified workflow for exporting whiteboards to Google Classroom.

---

## Files Modified

### 1. `src/routes/(protected)/dashboard/teacher/classes/+page.server.ts`

**Changes**:

#### Imports Added:

```typescript
import { requireRole } from '$lib/server/middleware/auth';
import { z } from 'zod';
import { formDataTransforms } from '$lib/server/validation/common';
```

#### Validation Schema Added:

```typescript
const associateCourseSchema = z.object({
	classId: formDataTransforms.uuid,
	courseId: formDataTransforms.optionalString.pipe(
		z
			.string()
			.nullable()
			.refine((val) => val === null || z.string().uuid().safeParse(val).success, {
				message: 'UUID invalide'
			})
	)
});
```

#### Load Function - Added Data Fetching:

- Fetches teacher's active Google Classroom courses
- Fetches list of already-associated course IDs (for filtering)
- Returns `googleCourses` and `associatedCourseIds` arrays

#### New Form Action: `associateCourse`

- Validates `classId` and `courseId` using Zod
- Verifies teacher owns the class
- Verifies teacher owns the course (if provided)
- Updates `classes.google_classroom_course_id` field
- Returns success or error with French messages

**Security**:

- Uses `requireRole(locals, 'teacher')` for authentication
- Validates all UUIDs
- Verifies ownership of both class and course
- Prevents unauthorized associations

---

### 2. `src/routes/(protected)/dashboard/teacher/classes/+page.svelte`

**Changes**:

#### Imports Added:

```typescript
import { Label } from '$lib/components/ui/label';
import MySelect from '$lib/components/MySelect.svelte';
import { GraduationCap, Loader2 } from 'lucide-svelte';
```

#### State Added:

```typescript
let isUpdatingAssociation = $state<Record<string, boolean>>({});
```

#### Functions Added:

1. **`getAvailableCourseItems(currentClassId: string)`**

   - Filters courses to show only available ones
   - Excludes courses already associated with other classes
   - Always includes the current class's associated course (if any)
   - Returns items array for MySelect component

2. **`handleAssociateCourse(classId: string, courseId: string)`**
   - Submits form data to server action
   - Shows loading spinner during update
   - Invalidates data on success
   - Shows toast notification (success or error)

#### UI Component Added:

- New section after "Class Info Header" and before "Stats Card"
- Bordered card with Google Classroom icon and label
- Conditional rendering:
  - No courses: Shows link to connect Google account
  - Has courses: Shows MySelect dropdown with available courses
- Loading spinner shown during update

**UI Features**:

- Uses semantic Tailwind classes (`bg-muted/30`, `border-border`)
- Follows existing card styling pattern
- Dropdown width fixed at `w-64` for consistency
- Empty option: "Aucun cours associé" (removes association)

---

## Database Schema

**Existing Column** (no migration needed):

- `classes.google_classroom_course_id`: UUID (nullable)
- Foreign key to `google_classroom_courses.id`

---

## User Flow

1. Teacher navigates to "Mes Classes" page
2. Selects a class tab
3. Sees "Cours Google Classroom" section:
   - If no Google account connected: Shows link to settings
   - If Google connected: Shows dropdown with available courses
4. Selects a course from dropdown
5. Loading spinner appears
6. On success: Toast notification "Cours associé"
7. Can change or remove association by selecting different option

---

## Technical Decisions

### Why MySelect?

- Project standard: Always use MySelect instead of native `<select>` or Shadcn Select
- Consistent styling and behavior across application
- Better touch-friendly sizing

### Why Filter Associated Courses?

- Prevents confusion (one course per class)
- Exception: Current class can see its own associated course
- Allows changing association to another course

### Why requireRole?

- Follows existing pattern in codebase
- Cleaner than manual `safeGetSession` + role check
- Provides consistent error messages in French

### Why Zod Validation?

- Project standard: All form inputs must be validated with Zod
- UUID validation prevents injection attacks
- Optional string handling for empty courseId (disassociation)

---

## Testing Considerations

### Manual Testing Checklist:

- [ ] Teacher with no Google courses sees "Connect Google" link
- [ ] Teacher with Google courses sees dropdown
- [ ] Dropdown shows only available courses
- [ ] Dropdown shows current course even if associated
- [ ] Selecting course shows success toast
- [ ] Selecting "Aucun cours associé" removes association
- [ ] Loading spinner appears during update
- [ ] Multiple classes can be managed independently
- [ ] Non-teacher cannot access endpoint (403)
- [ ] Teacher cannot associate another teacher's course (403)

### Edge Cases:

- Empty courseId (disassociation) handled correctly
- Invalid UUIDs rejected by Zod
- Concurrent updates to same class (handled by DB constraints)
- Course deleted from Google after sync (FK constraint prevents orphan)

---

## Next Steps

This UI is part of the Google Classroom export workflow. Next steps:

1. **Export Whiteboard Flow**:

   - Add "Share to Google Classroom" button in whiteboard
   - Use associated course for direct export
   - Handle case where class has no associated course

2. **Course Sync**:

   - Ensure course list stays up-to-date
   - Handle archived/deleted courses in Google

3. **Documentation**:
   - Update user documentation with screenshots
   - Add to teacher onboarding guide

---

## Code Quality

**Standards Met**:

- ✅ Zod validation on all inputs
- ✅ MySelect component used (not native select)
- ✅ Svelte 5 runes ($state, $derived)
- ✅ Lowercase event handlers (onclick)
- ✅ French UI text, English comments
- ✅ Semantic Tailwind classes
- ✅ Toast notifications for feedback
- ✅ Loading states shown
- ✅ Error handling with user-friendly messages
- ✅ TypeScript types properly used
- ✅ Early returns in validation
- ✅ Descriptive function names

**No Breaking Changes**:

- Existing functionality unchanged
- Only adds new feature section
- Database schema already in place
- No migration needed

---

## Files Summary

| File              | Lines Changed | Type                       |
| ----------------- | ------------- | -------------------------- |
| `+page.server.ts` | ~80 added     | Backend logic + validation |
| `+page.svelte`    | ~70 added     | UI component + state       |

Total: ~150 lines of production code
