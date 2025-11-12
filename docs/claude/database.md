# Database (Supabase)

## Workflow migrations

The database workflow follows a structured approach to maintain consistency and proper version control:

1. **Claude crée** `.sql` migrations dans `supabase/migrations/`
   - Format: `<timestamp>_<description>.sql`
   - Example: `20250228143022_add_assessment_analytics.sql`

2. **User push** les migrations via `pnpm db:migrate`
   - Applies all pending migrations to local/remote Supabase

3. **Update** related files
   - `src/lib/types/database.ts` - TypeScript types auto-generated from schema
   - `docs/architecture/database-schema.md` - Documentation of schema changes

## Important notes

- **NE PAS modifier le schéma dans Supabase Dashboard** - Always use migrations
- **Toujours créer migrations timestampées** - Ensures correct ordering
- **Garder la documentation synchronisée** - Update docs with schema changes
- Migrations are version-controlled and reproducible

## Useful Commands

```bash
# Start local Supabase development environment (requires Docker)
pnpm db:start

# Stop local Supabase development environment
pnpm db:stop

# Push migrations to Supabase
pnpm db:migrate

# Run database trigger tests (requires local Supabase)
pnpm test:triggers
```

## Detailed Information

For comprehensive information about the database schema, table structures, and relationships, see:

[Database Schema Documentation](../architecture/database-schema.md)

---

## Student Data Helpers

> 🆕 2025-11-12

Centralized helper functions for fetching student data with consistent test mode filtering.

### Why Use Helpers?

**Before helpers** (duplicated across pages):

```typescript
// ❌ Repeated in every component that needs students
const { data: members } = await supabase
	.from('class_members')
	.select(
		`
		student_id,
		profiles!class_members_student_id_fkey (
			id, firstname, lastname, avatar_url,
			gidouilles, vip_cards, is_test
		)
	`
	)
	.eq('class_id', classId)
	.eq('profiles.is_test', testMode); // Easy to forget!

const students = members.map((m) => m.profiles).filter(Boolean);
```

**After helpers** (centralized, consistent):

```typescript
// ✅ Single line, test mode automatically applied
const students = await getClassStudents({ classId, userId, supabase, full: true });
```

### Benefits

- **Single Source of Truth**: Query logic in one place
- **Test Mode Always Applied**: Never forget to filter test students
- **Type-Safe**: Full TypeScript support with proper interfaces
- **Easy to Optimize**: Add caching or query optimization in one place
- **Reduced Code**: Eliminates 100+ lines across multiple pages
- **Consistent API**: Same pattern everywhere

### Available Helper Functions

#### 1. `getClassStudents()` - Single Class Query

**Use when**: You need students for a specific class

```typescript
import { getClassStudents } from '$lib/server/students';

// Minimal data (for lists, wheels)
const students = await getClassStudents({
	classId: 'class-uuid',
	userId: user.id,
	supabase
});

// Full data (for rewards page, detailed views)
const studentsDetailed = await getClassStudents({
	classId: 'class-uuid',
	userId: user.id,
	supabase,
	full: true // Includes gidouilles, vip_cards, etc.
});
```

**Returns**:

- `full: false` - Minimal `Student[]` with `id`, `firstname`, `lastname`, `avatar_url`
- `full: true` - Full `StudentFull[]` with all fields including `gidouilles`, `vip_cards`, `role`, `gender`, `is_test`

**Test Mode**: Automatically filtered based on teacher's test mode preference

---

#### 2. `getTeacherClassesWithStudents()` - All Classes with Full Data

**Use when**: You need all teacher's classes with complete student data (rewards page, bulk operations)

```typescript
import { getTeacherClassesWithStudents } from '$lib/server/students';

const classes = await getTeacherClassesWithStudents(user.id, supabase);

classes.forEach((cls) => {
	console.log(cls.name, 'has', cls.students.length, 'students');
	cls.students.forEach((student) => {
		console.log(`- ${student.full_name}: ${student.gidouilles} gidouilles`);
	});
});
```

**Returns**: `ClassWithStudents[]` - Classes with full student data array

**Performance**: Uses optimized RPC function (`get_teacher_classes_with_students`) that fetches everything in a single query

**Note**: This fetches ALL student fields including frequently-changing data (gidouilles, vip_cards). For caching, consider `getTeacherStudents()` from cache module which excludes these fields.

---

#### 3. `getTeacherClassesWithCounts()` - All Classes with Counts Only

**Use when**: You need class list but only student counts (dropdowns, dashboard layout, navigation)

```typescript
import { getTeacherClassesWithCounts } from '$lib/server/students';

const classes = await getTeacherClassesWithCounts(user.id, supabase);

classes.forEach((cls) => {
	console.log(`${cls.name}: ${cls.student_count} students`);
});
```

**Returns**: `ClassWithData[]` - Classes with `student_count` field and `schedules` array

**Performance**: Much lighter than `getTeacherClassesWithStudents()` - only counts, not full student data

**Best for**:

- Class selector dropdowns
- Dashboard layouts
- Navigation menus
- SSR hydration (faster than full data)

---

#### 4. `getClassStudentCount()` - Count Only

**Use when**: You only need the number of students, not the actual data

```typescript
import { getClassStudentCount } from '$lib/server/students';

const count = await getClassStudentCount('class-uuid', user.id, supabase);
console.log(`Class has ${count} students`);
```

**Returns**: `number` - Student count

**Performance**: Lightest option - uses `count: 'exact', head: true` (no data transfer)

---

### Test Mode Filtering

All helper functions automatically apply test mode filtering:

**How it works**:

1. Function calls `getTeacherTestMode(userId, supabase)`
2. Returns teacher's `test_mode` preference from `profiles` table
3. Filters students where `profiles.is_test === testMode`

**Why this matters**:

- Teachers can toggle between real students and test students
- Test data doesn't pollute production analytics
- Consistent filtering across all queries
- No need to manually remember to filter

**Example**:

```typescript
// Teacher has test_mode = false (default)
const students = await getClassStudents({ classId, userId, supabase });
// Returns: Only real students (is_test = false)

// Teacher toggles test_mode = true (for testing features)
const testStudents = await getClassStudents({ classId, userId, supabase });
// Returns: Only test students (is_test = true)
```

---

### Migration Examples

#### Example 1: Wheel Page (Simple)

**Before**:

```typescript
// 25 lines of query logic
const { data: members } = await supabase
	.from('class_members')
	.select(
		`
		student_id,
		profiles!class_members_student_id_fkey (
			id, firstname, lastname, avatar_url, is_test
		)
	`
	)
	.eq('class_id', selectedClass);

// Forgot to filter by test mode!
const students = members?.map((m) => m.profiles).filter(Boolean) || [];
```

**After**:

```typescript
// 1 line, test mode automatically applied
const students = await getClassStudents({ classId: selectedClass, userId: user.id, supabase });
```

**Saved**: 24 lines, automatic test mode filtering

---

#### Example 2: Rewards Page (Full Data)

**Before**:

```typescript
// 40+ lines per class, repeated logic
for (const cls of classes) {
	const { data: members } = await supabase
		.from('class_members')
		.select(
			`
			student_id,
			profiles!class_members_student_id_fkey (
				id, firstname, lastname, full_name,
				avatar_url, gidouilles, vip_cards,
				role, gender, is_test
			)
		`
		)
		.eq('class_id', cls.id)
		.eq('profiles.is_test', testMode);

	cls.students = members?.map((m) => m.profiles).filter(Boolean) || [];
}
```

**After**:

```typescript
// Single optimized RPC call
const classes = await getTeacherClassesWithStudents(user.id, supabase);
```

**Saved**: ~100 lines, single query instead of N+1

---

### When to Use Each Function

| Scenario                      | Function                           | Why                                   |
| ----------------------------- | ---------------------------------- | ------------------------------------- |
| Random wheel picker           | `getClassStudents()`               | Simple list, no rewards needed        |
| Rewards page                  | `getTeacherClassesWithStudents()`  | Need gidouilles/vip_cards for all     |
| Class selector dropdown       | `getTeacherClassesWithCounts()`    | Only need counts, not student data    |
| SSR hydration (layout)        | `getTeacherClassesWithCounts()`    | Lightweight for initial page load     |
| Check if class has students   | `getClassStudentCount()`           | Only need count                       |
| Assignment target selection   | `getTeacherClassesWithStudents()`  | Need full student data for assignment |
| Student profile page (single) | Direct query with `verifyTeacher*` | Only one student, helpers not needed  |

---

### Testing

Helper functions are tested via integration tests:

- ✅ Test mode filtering works correctly
- ✅ Empty classes handled gracefully
- ✅ Database errors throw with useful messages
- ✅ RPC functions return correct data structures

**Reference**: Integration tests with real Supabase instance

---

### Related Documentation

- **[Authorization Middleware](./best-practices.md#authorization-middleware)** - Verify teacher-student access
- **[SSR Hydration Strategy](./architecture.md#ssr-hydration-strategy)** - Use helpers for server-side data loading
- **[Teacher Cache](./teacher-cache.md)** - Client-side caching with helper data

---

[← Back to Claude Docs](./README.md)
