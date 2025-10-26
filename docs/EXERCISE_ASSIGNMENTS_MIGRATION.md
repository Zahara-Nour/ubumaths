# Exercise Assignment System Migration

## Overview

This migration creates a comprehensive practice-based exercise assignment and completion tracking system. Unlike graded assessments, this system focuses on optional practice with simple access control and completion tracking.

## Migration Details

**File**: `supabase/migrations/20251027005912_create_exercise_assignments.sql`
**Created**: 2025-10-27

## What Was Created

### 1. Tables

#### `exercise_assignments`

Tracks which exercises are assigned to which students/classes/public.

**Key Features**:

- Three assignment types: individual student, class, or public
- Optional deadline (for organization, not enforced)
- Teacher notes for students
- Active/inactive flag for soft deletion
- Unique constraints prevent duplicate assignments

**Columns**:

```sql
- id (UUID, PRIMARY KEY)
- exercise_id (UUID, FK → exercises.id)
- assigned_by (UUID, FK → profiles.id)
- assigned_to_type (TEXT: 'student' | 'class' | 'public')
- student_id (UUID, FK → profiles.id, nullable)
- class_id (UUID, FK → classes.id, nullable)
- assigned_at (TIMESTAMPTZ)
- optional_deadline (TIMESTAMPTZ, nullable)
- notes (TEXT, nullable)
- is_active (BOOLEAN, default true)
```

**Constraints**:

- `assignment_student_consistency`: Ensures type matches populated foreign keys
- `unique_student_assignment`: Prevents duplicate student assignments
- `unique_class_assignment`: Prevents duplicate class assignments

#### `exercise_completions`

Optional tracking of student exercise views and completions.

**Key Features**:

- Last viewed timestamp for "recently viewed" features
- View count for analytics
- Optional completion marking (student self-reported)
- Assignment link preserved even if assignment deleted

**Columns**:

```sql
- id (UUID, PRIMARY KEY)
- exercise_id (UUID, FK → exercises.id)
- assignment_id (UUID, FK → exercise_assignments.id, nullable, SET NULL on delete)
- student_id (UUID, FK → profiles.id)
- completed_at (TIMESTAMPTZ, nullable)
- last_viewed_at (TIMESTAMPTZ)
- view_count (INTEGER, default 1)
- created_at (TIMESTAMPTZ)
```

**Constraints**:

- `unique_student_completion`: One completion record per student per exercise

### 2. View

#### `assigned_exercises_with_details`

Convenient view joining assignments with exercise details for easy querying.

**Returns**:

- All assignment fields
- Exercise details (title, statement, variables, distribution_mode, etc.)
- Assignment creator name and role
- Assignment target name (student name, class name, or "Public")
- Additional filtering fields (student email, class grade level)

**Filtering**: Only includes `is_active = TRUE` assignments

### 3. Indexes (17 total)

**exercise_assignments**:

- `idx_exercise_assignments_exercise`: Lookup by exercise
- `idx_exercise_assignments_student`: Lookup student assignments (partial)
- `idx_exercise_assignments_class`: Lookup class assignments (partial)
- `idx_exercise_assignments_assigned_by`: Lookup by teacher
- `idx_exercise_assignments_type`: Filter by assignment type
- `idx_exercise_assignments_active`: Filter active assignments (partial)
- `idx_exercise_assignments_deadline`: Filter by deadline (partial)
- `idx_exercise_assignments_teacher_active`: Composite for teacher dashboard

**exercise_completions**:

- `idx_exercise_completions_exercise`: Lookup by exercise
- `idx_exercise_completions_student`: Lookup by student
- `idx_exercise_completions_assignment`: Lookup by assignment (partial)
- `idx_exercise_completions_completed`: Filter completed (partial)
- `idx_exercise_completions_last_viewed`: Sort by recent activity
- `idx_exercise_completions_student_completed`: Composite for student progress

### 4. RLS Policies (11 total)

#### exercise_assignments (6 policies)

**Teachers**:

- View their own assignments
- Create assignments for their exercises only
- Update their own assignments
- Delete their own assignments

**Students**:

- View active assignments where they are the target (direct, class, or public)

**Admins**:

- View all assignments

#### exercise_completions (5 policies)

**Students**:

- View their own completions
- Insert completions for exercises they have access to (public or assigned)
- Update their own completions (mark complete, increment views)

**Teachers**:

- View completions for exercises they created

**Admins**:

- View all completions

### 5. Helper Functions (4 total)

#### `student_has_exercise_access(exercise_id, student_id)`

**Returns**: `BOOLEAN`

Checks if a student can access an exercise via:

1. Exercise is public (`is_public = TRUE`)
2. Student has direct assignment
3. Student is in a class with an assignment
4. Exercise has a public assignment

**Security**: `SECURITY DEFINER` for cross-table checks

#### `get_student_exercises(student_id)`

**Returns**: Table with exercise and assignment details

Returns all exercises accessible by a student with:

- Exercise details (title, statement, variables, etc.)
- Assignment details (if assigned)
- Completion status (completed_at, last_viewed_at, view_count)

**Ordering**:

1. Incomplete assigned exercises first
2. Recently viewed
3. Recent assignments

**Use Case**: Student dashboard showing "My Exercises"

#### `get_teacher_assignment_stats(teacher_id)`

**Returns**: Table with assignment statistics

Provides comprehensive stats:

- Total assignments (all time)
- Active assignments
- Breakdown by type (student, class, public)
- Total completions
- Unique students engaged

**Use Case**: Teacher dashboard analytics

#### `get_assignment_completion_stats(assignment_id)`

**Returns**: Table with completion statistics

Provides detailed stats for a specific assignment:

- Total target students (based on assignment type)
- Students who viewed
- Students who completed
- Total views
- Average views per student
- Completion rate (%)

**Use Case**: Assignment progress monitoring

### 6. Triggers (1 total)

#### `trigger_update_completion_last_viewed`

**On**: `exercise_completions` BEFORE UPDATE
**Condition**: `view_count` increases

Automatically updates `last_viewed_at` when a student views an exercise.

**Use Case**: Automatic timestamp management for "recently viewed" features

## Integration with Existing Features

### Parameterization Integration

The system seamlessly integrates with the existing parameterization feature:

- **`exercises.variables`**: JSONB array of variable definitions
- **`exercises.distribution_mode`**: `on_demand`, `per_student`, `per_group`

**How It Works**:

1. Teacher creates parameterized exercise with variables
2. Teacher assigns exercise to students/class
3. Students access exercise and generate instances based on `distribution_mode`:
   - `on_demand`: Students can generate new instances anytime
   - `per_student`: Each student gets a unique deterministic instance
   - `per_group`: Students in same group share the same instance

**Note**: Assignment system only tracks access and completion. Instance generation is handled client-side using the parameterization library.

### Class Integration

Uses existing `class_members` table:

- Assignments to classes automatically grant access to all class members
- Students can view assignments for any class they're in
- No duplicate tracking needed (single completion record per student)

### Profile Integration

Leverages existing `profiles` table:

- Assignment creator must be a teacher
- Students can only create completions for themselves
- Role-based access control via RLS policies

## Practice Mode vs. Assessment Mode

### Practice Mode (This System)

- **Purpose**: Optional practice and self-directed learning
- **Access**: Simple (assigned or public)
- **Completion**: Optional, student self-reported
- **Grading**: None
- **Attempts**: Unlimited
- **Deadline**: Suggestive, not enforced

### Assessment Mode (Existing System)

- **Purpose**: Formal evaluation and grading
- **Access**: Strict (test sessions)
- **Completion**: Required, validated
- **Grading**: Automatic scoring
- **Attempts**: Limited by teacher
- **Deadline**: Enforced

## Usage Examples

### Teacher Assigns Exercise to Class

```sql
INSERT INTO exercise_assignments (
    exercise_id,
    assigned_by,
    assigned_to_type,
    class_id,
    optional_deadline,
    notes
) VALUES (
    'exercise-uuid',
    'teacher-uuid',
    'class',
    'class-uuid',
    '2025-11-01 23:59:59',
    'Practice for next week''s lesson on fractions'
);
```

### Student Views Exercise (First Time)

```sql
INSERT INTO exercise_completions (
    exercise_id,
    assignment_id,
    student_id,
    last_viewed_at,
    view_count
) VALUES (
    'exercise-uuid',
    'assignment-uuid',
    'student-uuid',
    NOW(),
    1
);
```

### Student Views Again (Increment Count)

```sql
UPDATE exercise_completions
SET view_count = view_count + 1
    -- last_viewed_at updated automatically by trigger
WHERE exercise_id = 'exercise-uuid'
  AND student_id = 'student-uuid';
```

### Student Marks Complete

```sql
UPDATE exercise_completions
SET completed_at = NOW()
WHERE exercise_id = 'exercise-uuid'
  AND student_id = 'student-uuid';
```

### Check Student Access

```sql
SELECT student_has_exercise_access(
    'exercise-uuid',
    'student-uuid'
); -- Returns true/false
```

### Get Student's Exercises

```sql
SELECT * FROM get_student_exercises('student-uuid');
-- Returns all accessible exercises with completion status
```

### Teacher Views Assignment Stats

```sql
SELECT * FROM get_assignment_completion_stats('assignment-uuid');
-- Returns completion rate, views, etc.
```

## Security Considerations

### RLS Protection

All tables have RLS enabled with comprehensive policies:

- Teachers can only manage their own assignments
- Students can only view assigned/public exercises
- Students can only modify their own completions
- Admins have full visibility

### SECURITY DEFINER Functions

Helper functions use `SECURITY DEFINER` to:

- Access multiple tables in single query
- Enforce consistent access control logic
- Prevent RLS recursion issues

**Important**: These functions implement the same access control as RLS policies.

### Data Integrity

Constraints ensure:

- Assignment type consistency (student/class/public)
- No duplicate assignments
- No duplicate completions
- Valid foreign key relationships
- Positive view counts

## Next Steps

### 1. Push Migration

```bash
pnpm db:migrate
```

### 2. Update TypeScript Types

Update `src/lib/types/database.ts` with new tables:

```typescript
export interface ExerciseAssignment {
	id: string;
	exercise_id: string;
	assigned_by: string;
	assigned_to_type: 'student' | 'class' | 'public';
	student_id: string | null;
	class_id: string | null;
	assigned_at: string;
	optional_deadline: string | null;
	notes: string | null;
	is_active: boolean;
}

export interface ExerciseCompletion {
	id: string;
	exercise_id: string;
	assignment_id: string | null;
	student_id: string;
	completed_at: string | null;
	last_viewed_at: string;
	view_count: number;
	created_at: string;
}
```

### 3. Update Documentation

Update `docs/architecture/database-schema.md` with:

- New tables schema
- RLS policies
- Helper functions
- Usage examples

### 4. Implement UI Features

**Teacher Dashboard**:

- Create assignment form (select type, target, deadline, notes)
- Assignment list with completion stats
- Individual assignment detail view

**Student Dashboard**:

- "My Assigned Exercises" list
- "Recently Viewed" section
- Mark complete button
- Progress indicators

**Exercise Detail Page**:

- Show assignment notes (if assigned)
- Show deadline (if set)
- Track views automatically
- "Mark Complete" toggle

### 5. Test Scenarios

- [ ] Teacher creates student assignment
- [ ] Teacher creates class assignment
- [ ] Teacher creates public assignment
- [ ] Student views assigned exercise
- [ ] Student marks exercise complete
- [ ] Student accesses public exercise
- [ ] Teacher views assignment stats
- [ ] RLS prevents unauthorized access
- [ ] Parameterization works with assignments

## Performance Considerations

### Indexes

17 indexes created for optimal query performance:

- Lookup operations: O(log n)
- Partial indexes for filtered queries
- Composite indexes for common joins

### View Materialization

`assigned_exercises_with_details` is a regular view (not materialized):

- Always shows current data
- No refresh needed
- Joins are indexed for performance

**Consider materialization if**:

- Thousands of assignments
- Frequent dashboard queries
- Complex aggregations needed

### Caching Strategy

Recommended caching at application level:

- Student's assigned exercises: Cache for 5 minutes
- Assignment completion stats: Cache for 1 minute
- Teacher dashboard stats: Cache for 5 minutes

## Rollback Instructions

If needed, run:

```sql
-- Drop all created objects
DROP VIEW IF EXISTS assigned_exercises_with_details;
DROP FUNCTION IF EXISTS get_assignment_completion_stats(UUID);
DROP FUNCTION IF EXISTS get_teacher_assignment_stats(UUID);
DROP FUNCTION IF EXISTS get_student_exercises(UUID);
DROP FUNCTION IF EXISTS student_has_exercise_access(UUID, UUID);
DROP FUNCTION IF EXISTS update_completion_last_viewed();
DROP TABLE IF EXISTS exercise_completions CASCADE;
DROP TABLE IF EXISTS exercise_assignments CASCADE;
```

**Warning**: This will delete all assignment and completion data!

## Support

For questions or issues:

1. Check RLS policies are working: `SELECT * FROM exercise_assignments;`
2. Test helper functions: `SELECT student_has_exercise_access(...);`
3. Review migration validation output
4. Check Supabase logs for RLS policy violations
