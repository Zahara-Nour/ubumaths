# Exercise Feature - Architecture

> **Last Updated**: 2025-10-27
>
> **Related Documentation**:
>
> - [Main Overview](./README.md)
> - [Components Reference](./components.md)
> - [API Documentation](./api.md)
> - [Parameterization Guide](./parameterization-guide.md)

---

## Table of Contents

- [Overview](#overview)
- [Database Schema](#database-schema)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Data Flow](#data-flow)
- [Security Model](#security-model)
- [Performance Optimizations](#performance-optimizations)
- [Integration Points](#integration-points)

---

## Overview

The Exercise Feature provides a complete system for creating, managing, assigning, and tracking mathematical practice exercises. It supports both static exercises and parameterized templates that generate unique instances for each student.

### Key Capabilities

- **Exercise Management**: CRUD operations for exercises with markdown + LaTeX support
- **Parameterization**: Variable-based templates with three distribution modes
- **Assignment System**: Flexible assignment to students, classes, or public
- **Completion Tracking**: Optional tracking of views and completion status
- **Full-Text Search**: Efficient search across exercise content
- **Import/Export**: JSON and Markdown format support

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Svelte 5)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Teacher    │  │   Student    │  │  Components  │      │
│  │    Pages     │  │    Pages     │  │   Library    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP
┌─────────────────────────────────────────────────────────────┐
│                   Backend (SvelteKit API)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  API Routes  │  │   Server     │  │ Generators   │      │
│  │  (13 total)  │  │  Functions   │  │   (RNG)      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕ SQL
┌─────────────────────────────────────────────────────────────┐
│                   Database (Supabase)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Tables     │  │    Views     │  │   Functions  │      │
│  │  (3 total)   │  │   (1 view)   │  │   (4 total)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Tables

#### `exercises`

Core exercise storage table (already exists from earlier migrations).

```sql
CREATE TABLE exercises (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  title TEXT,
  source TEXT,
  difficulty TEXT CHECK (difficulty IN ('1', '2', '3')),
  tags TEXT[],
  grade_levels TEXT[],
  topic TEXT,
  estimated_time_minutes INTEGER,

  -- Content (markdown with LaTeX)
  statement_md TEXT NOT NULL,
  solution_md TEXT NOT NULL,

  -- Parameterization
  variables JSONB,  -- [{ name: 'a', expression: '{{1-10}}' }]
  distribution_mode TEXT DEFAULT 'on_demand'
    CHECK (distribution_mode IN ('on_demand', 'per_student', 'per_group')),

  -- Sharing
  is_public BOOLEAN DEFAULT FALSE,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);
```

**Key Fields**:

- `variables`: JSONB array of variable definitions for parameterization
- `distribution_mode`: Determines how instances are generated and distributed
- `is_public`: Makes exercise visible in public library (not the same as assignment)

#### `exercise_assignments`

Assignment tracking table (practice mode, non-graded).

```sql
CREATE TABLE exercise_assignments (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES profiles(id),

  -- Assignment Target (mutually exclusive)
  assigned_to_type TEXT NOT NULL
    CHECK (assigned_to_type IN ('student', 'class', 'public')),
  student_id UUID REFERENCES profiles(id),      -- if type='student'
  class_id UUID REFERENCES classes(id),         -- if type='class'

  -- Configuration
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  optional_deadline TIMESTAMPTZ,  -- Suggested, not enforced
  notes TEXT,                     -- Teacher instructions
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Constraints
  CONSTRAINT assignment_student_consistency CHECK (
    (assigned_to_type = 'student' AND student_id IS NOT NULL AND class_id IS NULL) OR
    (assigned_to_type = 'class' AND class_id IS NOT NULL AND student_id IS NULL) OR
    (assigned_to_type = 'public' AND student_id IS NULL AND class_id IS NULL)
  ),
  CONSTRAINT unique_student_assignment
    UNIQUE NULLS NOT DISTINCT (exercise_id, student_id),
  CONSTRAINT unique_class_assignment
    UNIQUE NULLS NOT DISTINCT (exercise_id, class_id)
);
```

**Assignment Types**:

- `student`: Assigned to specific student (1:1)
- `class`: Assigned to all students in a class (1:N)
- `public`: Available to all students (no specific target)

**Important Notes**:

- This is for **practice mode**, not graded assessments
- No test sessions, no grading, no attempt limits
- Deadline is optional and not enforced (organizational only)

#### `exercise_completions`

Optional completion tracking for analytics and progress.

```sql
CREATE TABLE exercise_completions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES exercise_assignments(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES profiles(id),

  -- Completion Tracking
  completed_at TIMESTAMPTZ,       -- NULL = in progress, SET = complete
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  view_count INTEGER NOT NULL DEFAULT 1 CHECK (view_count >= 1),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_student_completion
    UNIQUE (exercise_id, student_id)
);
```

**Key Features**:

- `completed_at` is NULL until student marks as complete
- `assignment_id` can be NULL (for public exercises accessed directly)
- `view_count` tracks engagement for analytics
- Survives assignment deletion (`ON DELETE SET NULL`)

### Views

#### `assigned_exercises_with_details`

Convenient view for teacher assignment management.

```sql
CREATE VIEW assigned_exercises_with_details AS
SELECT
  -- Assignment fields
  ea.id, ea.exercise_id, ea.assigned_by,
  ea.assigned_to_type, ea.student_id, ea.class_id,
  ea.assigned_at, ea.optional_deadline, ea.notes, ea.is_active,

  -- Exercise details
  e.title AS exercise_title, e.statement_md, e.solution_md,
  e.variables, e.distribution_mode, e.is_public AS exercise_is_public,
  e.difficulty, e.tags, e.grade_levels,

  -- User details
  p.full_name AS assigned_by_name,

  -- Computed target name
  CASE
    WHEN ea.assigned_to_type = 'student' THEN s.full_name
    WHEN ea.assigned_to_type = 'class' THEN c.name
    ELSE 'Public'
  END AS assigned_to_name,

  -- Additional filtering fields
  s.email AS student_email,
  c.name AS class_name,
  c.grade_level AS class_grade_level

FROM exercise_assignments ea
JOIN exercises e ON ea.exercise_id = e.id
JOIN profiles p ON ea.assigned_by = p.id
LEFT JOIN profiles s ON ea.student_id = s.id
LEFT JOIN classes c ON ea.class_id = c.id
WHERE ea.is_active = TRUE;
```

**Usage**: Query all active assignments with full details for teacher dashboard.

### Helper Functions

#### `student_has_exercise_access(exercise_id, student_id)`

Checks if student can access an exercise.

```sql
CREATE FUNCTION student_has_exercise_access(
  p_exercise_id UUID,
  p_student_id UUID
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    -- Exercise is public
    SELECT 1 FROM exercises WHERE id = p_exercise_id AND is_public = TRUE
  ) OR EXISTS (
    -- Student has active assignment (direct, class, or public)
    SELECT 1 FROM exercise_assignments ea
    WHERE ea.exercise_id = p_exercise_id AND ea.is_active = TRUE
    AND (
      ea.student_id = p_student_id OR
      ea.class_id IN (SELECT class_id FROM class_members WHERE student_id = p_student_id) OR
      ea.assigned_to_type = 'public'
    )
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

**Returns**: `TRUE` if student can access, `FALSE` otherwise.

**Access Conditions**:

1. Exercise has `is_public = TRUE`
2. Student has direct assignment (`assigned_to_type = 'student'`)
3. Student is in a class with assignment (`assigned_to_type = 'class'`)
4. Exercise has public assignment (`assigned_to_type = 'public'`)

#### `get_student_exercises(student_id)`

Returns all exercises accessible by a student with completion data.

```sql
CREATE FUNCTION get_student_exercises(p_student_id UUID)
RETURNS TABLE (
  exercise_id UUID,
  exercise_title TEXT,
  statement_md TEXT,
  solution_md TEXT,
  variables JSONB,
  distribution_mode TEXT,
  -- ... (17 fields total)
) AS $$
  SELECT e.id, e.title, e.statement_md, ...
  FROM exercises e
  LEFT JOIN exercise_assignments ea ON ... (matching assignments)
  LEFT JOIN exercise_completions ec ON ... (completion data)
  WHERE e.is_public = TRUE OR ea.id IS NOT NULL
  ORDER BY
    CASE WHEN ea.id IS NOT NULL AND ec.completed_at IS NULL THEN 0 ELSE 1 END,
    ec.last_viewed_at DESC NULLS LAST,
    ea.assigned_at DESC NULLS LAST;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

**Ordering Priority**:

1. Incomplete assigned exercises (urgent)
2. Recently viewed exercises
3. Recently assigned exercises

#### `get_teacher_assignment_stats(teacher_id)`

Returns aggregate statistics for teacher dashboard.

```sql
CREATE FUNCTION get_teacher_assignment_stats(p_teacher_id UUID)
RETURNS TABLE (
  total_assignments BIGINT,
  active_assignments BIGINT,
  student_assignments BIGINT,
  class_assignments BIGINT,
  public_assignments BIGINT,
  total_completions BIGINT,
  unique_students_engaged BIGINT
) AS $$
  -- Aggregate queries across assignments and completions
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

**Usage**: Display quick stats on teacher dashboard.

#### `get_assignment_completion_stats(assignment_id)`

Returns detailed completion statistics for a specific assignment.

```sql
CREATE FUNCTION get_assignment_completion_stats(p_assignment_id UUID)
RETURNS TABLE (
  total_target_students BIGINT,
  students_viewed BIGINT,
  students_completed BIGINT,
  total_views BIGINT,
  avg_views_per_student NUMERIC,
  completion_rate NUMERIC
) AS $$
  -- Complex aggregation with CTEs
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

**Usage**: Show completion analytics for individual assignments.

### Indexes

**For `exercises` table**:

```sql
-- Full-text search (French language)
CREATE INDEX idx_exercises_fulltext ON exercises
USING gin(to_tsvector('french',
  coalesce(title, '') || ' ' ||
  coalesce(statement_md, '') || ' ' ||
  coalesce(solution_md, '') || ' ' ||
  coalesce(array_to_string(tags, ' '), '')
));

-- Topic filtering
CREATE INDEX idx_exercises_topic_fulltext ON exercises(topic)
WHERE topic IS NOT NULL;
```

**For `exercise_assignments` table** (8 indexes):

```sql
CREATE INDEX idx_exercise_assignments_exercise ON exercise_assignments(exercise_id);
CREATE INDEX idx_exercise_assignments_student ON exercise_assignments(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_exercise_assignments_class ON exercise_assignments(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX idx_exercise_assignments_assigned_by ON exercise_assignments(assigned_by);
CREATE INDEX idx_exercise_assignments_type ON exercise_assignments(assigned_to_type);
CREATE INDEX idx_exercise_assignments_active ON exercise_assignments(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_exercise_assignments_deadline ON exercise_assignments(optional_deadline) WHERE optional_deadline IS NOT NULL;
CREATE INDEX idx_exercise_assignments_teacher_active ON exercise_assignments(assigned_by, is_active) WHERE is_active = TRUE;
```

**For `exercise_completions` table** (6 indexes):

```sql
CREATE INDEX idx_exercise_completions_exercise ON exercise_completions(exercise_id);
CREATE INDEX idx_exercise_completions_student ON exercise_completions(student_id);
CREATE INDEX idx_exercise_completions_assignment ON exercise_completions(assignment_id) WHERE assignment_id IS NOT NULL;
CREATE INDEX idx_exercise_completions_completed ON exercise_completions(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_exercise_completions_last_viewed ON exercise_completions(last_viewed_at DESC);
CREATE INDEX idx_exercise_completions_student_completed ON exercise_completions(student_id, completed_at) WHERE completed_at IS NOT NULL;
```

**Total**: 17 indexes for optimal query performance.

### Triggers

#### `update_completion_last_viewed()`

Auto-updates `last_viewed_at` when `view_count` increments.

```sql
CREATE TRIGGER trigger_update_completion_last_viewed
  BEFORE UPDATE ON exercise_completions
  FOR EACH ROW
  WHEN (NEW.view_count > OLD.view_count)
  EXECUTE FUNCTION update_completion_last_viewed();
```

#### `delete_exercise_images()`

Auto-deletes associated images from Storage when exercise is deleted.

```sql
CREATE TRIGGER trigger_delete_exercise_images
  AFTER DELETE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION delete_exercise_images();
```

**Cleanup Behavior**:

- Deletes all images in `exercise-images` bucket matching exercise ID
- Searches by folder path: `{userId}/{exerciseId}/`
- Also searches by filename pattern: `%{exerciseId}%`

---

## Backend Architecture

### Server Functions

Located in `/src/lib/server/exercise-assignments.ts` (1,220 lines, 20+ functions).

#### Function Categories

**1. Assignment Management** (5 functions):

- `createExerciseAssignment()` - Create single assignment
- `createBulkAssignments()` - Create multiple assignments at once
- `getAssignmentsForExercise()` - List assignments for an exercise (teacher view)
- `updateAssignment()` - Update deadline, notes, or active status
- `deleteAssignment()` - Soft delete (deactivate) or hard delete

**2. Student Access** (2 functions):

- `getAssignmentsForStudent()` - Get all accessible exercises with completion data
- `getAccessibleExercises()` - Get all exercises student can access (simpler version)

**3. Completion Tracking** (5 functions):

- `markExerciseAsViewed()` - Record view (UPSERT pattern, increments count)
- `markExerciseAsComplete()` - Mark as completed
- `markExerciseAsIncomplete()` - Unmark completion
- `getStudentCompletion()` - Get completion record for exercise+student

**4. Statistics** (3 functions):

- `getAssignmentStats()` - Teacher dashboard statistics
- `getExerciseCompletionStats()` - Exercise-specific completion analytics
- `getStudentProgress()` - Student overall progress metrics

**5. Access Control** (2 functions):

- `studentHasAccess()` - Check if student can access exercise
- `getStudentClasses()` - Get classes student belongs to

**6. Helper Functions** (3 functions):

- `_validateAssignmentOwnership()` - Internal ownership check
- `validateAssignmentData()` - Exported validator for assignment creation
- Helper utilities for deadline checks and formatting

### API Routes

Located in `/src/routes/api/exercises/`.

#### Exercise CRUD

**`GET /api/exercises`**

- List all exercises for current user
- Filters: search, topic, difficulty, tags
- Pagination support

**`POST /api/exercises`**

- Create new exercise (teacher only)
- Validates markdown, variables, distribution_mode

**`GET /api/exercises/[id]`**

- Get single exercise by ID
- Includes parameterization data

**`PUT /api/exercises/[id]`**

- Update exercise (owner only)
- Validates all fields

**`DELETE /api/exercises/[id]`**

- Delete exercise (owner only)
- Cascades to assignments via FK

#### Assignment Operations

**`POST /api/exercises/[id]/assign`**

- Create assignment(s) for exercise
- Supports single and bulk creation
- Validates ownership and target consistency

**`GET /api/exercises/assigned`**

- Get all assignments for current user (teacher or student)
- Teachers: see their created assignments
- Students: see their assigned exercises

**`PUT /api/exercises/assignments/[assignmentId]`**

- Update assignment (deadline, notes, active status)
- Owner only

**`DELETE /api/exercises/assignments/[assignmentId]`**

- Delete/deactivate assignment
- Owner only

#### Completion Tracking

**`POST /api/exercises/[id]/view`**

- Record view for student
- Auto-creates or updates completion record

**`POST /api/exercises/[id]/complete`**

- Mark exercise as complete
- Student only

**`POST /api/exercises/[id]/uncomplete`** (or via body param)

- Unmark exercise as complete
- Student only

#### Analytics

**`GET /api/exercises/[id]/stats`**

- Get completion statistics for exercise
- Teacher only (for own exercises)

#### Access Control

**`GET /api/exercises/[id]/access`**

- Check if current user can access exercise
- Returns boolean + reason

#### Import/Export

**`POST /api/exercises/import`**

- Bulk import from JSON or Markdown
- Duplicate handling strategies

**`GET /api/exercises/export`** or **`GET /api/exercises/[id]/export`**

- Export to JSON or Markdown format
- Single or bulk export

---

## Frontend Architecture

### Teacher Pages

Located in `/src/routes/(protected)/dashboard/teacher/exercises/`.

#### Exercise List (`+page.svelte`)

**Features**:

- Table/card view toggle
- Full-text search
- Filter by topic, difficulty, tags, grade levels
- Sort by creation date, title, difficulty
- Quick actions: View, Edit, Assign, Duplicate, Delete
- Pagination (50 per page)

**Data Loading** (`+page.server.ts`):

```typescript
export async function load({ locals }) {
	const { data: exercises } = await locals.supabase
		.from('exercises')
		.select('*')
		.eq('created_by', locals.user.id)
		.order('created_at', { ascending: false });

	return { exercises };
}
```

#### Exercise Create/Edit (`create/+page.svelte`, `[id]/edit/+page.svelte`)

**Form Sections**:

1. **Metadata**: Title, source, difficulty, tags, grade levels, topic, time estimate
2. **Content**: Markdown editor with live preview
3. **Parameterization**: Variable editor with distribution mode selector
4. **Preview**: Instant preview with resolved variables (if parameterized)

**Components Used**:

- `ExerciseForm` - Main form wrapper
- `ExerciseMarkdownEditor` - Split-view editor with syntax helpers
- `ExerciseParameterizationEditor` - Variable management
- `ExerciseMarkdownPreview` - Live preview pane

#### Assignment Interface (`[id]/assign/+page.svelte`)

**Features**:

- Select assignment target (student, class, public)
- Student/class picker with search
- Bulk assignment to multiple students/classes
- Optional deadline picker
- Notes field for instructions
- Preview of assigned students (for class assignments)

**Assignment Flow**:

1. Teacher selects exercise
2. Chooses target type (student/class/public)
3. Selects specific students or classes (if applicable)
4. Sets optional deadline and notes
5. Confirms assignment
6. System creates assignment record(s)

#### Assignment Management (`assignments/+page.svelte`)

**Features**:

- View all assignments created by teacher
- Filter by exercise, target type, active status, deadline
- Quick actions: View, Edit, Deactivate, Delete
- Bulk operations: Deactivate, Delete
- Completion statistics per assignment

**Displayed Info**:

- Exercise title
- Assignment target (student name, class name, or "Public")
- Assigned date
- Optional deadline (with urgency indicator)
- Completion stats (X% complete, Y/Z students)
- Status (active/inactive)

### Student Pages

Located in `/src/routes/(protected)/dashboard/student/exercises/`.

#### Exercise List (`+page.svelte`)

**Features**:

- View all accessible exercises (assigned + public)
- Filter by completion status
- Filter by assignment status (assigned only vs. all public)
- Filter by deadline (urgent first)
- Search by title/content
- Sort by deadline, assignment date, title

**Visual Indicators**:

- 🎯 Assigned indicator
- ⏰ Deadline badge (with urgency color)
- ✅ Completed checkmark
- 👁️ View count badge
- 📌 Public library indicator

**Data Loading** (`+page.server.ts`):

```typescript
export async function load({ locals }) {
	const { data, error } = await locals.supabase.rpc('get_student_exercises', {
		p_student_id: locals.user.id
	});

	return { exercises: data || [] };
}
```

#### Exercise View (`[id]/+page.svelte`)

**Features**:

- Display exercise statement (resolved if parameterized)
- Toggle solution visibility
- Mark as complete/incomplete button
- View assignment details (deadline, teacher notes)
- Regenerate instance button (for `on_demand` mode)
- Navigation: Previous/Next exercise

**Instance Generation**:

- `on_demand`: New instance on each "New Problem" click
- `per_student`: Consistent instance based on student ID
- `per_group`: Same instance for all students in assignment

**Completion Tracking**:

- Auto-records view when page loads
- Manual completion toggle
- Persists across sessions

#### Dashboard Widget (`/dashboard/student/+page.svelte`)

**Features**:

- Recent assignments (last 5)
- Completion progress bar
- Urgent deadlines (next 3 days)
- Quick links to exercises

---

## Data Flow

### Assignment Flow

Teacher creates assignment → Students see exercise → Students complete

```
┌──────────────┐
│   Teacher    │
│  Dashboard   │
└──────┬───────┘
       │ 1. Select exercise
       │ 2. Choose target (student/class/public)
       │ 3. Set deadline & notes
       │
       ↓
┌──────────────────────────────────────┐
│  POST /api/exercises/[id]/assign     │
│  - validateAssignmentData()          │
│  - Check exercise ownership          │
│  - createExerciseAssignment()        │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  Database: exercise_assignments      │
│  - Insert assignment record(s)       │
│  - Trigger RLS policies              │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────┐
│   Student    │
│  Dashboard   │
└──────┬───────┘
       │ 1. Load exercises
       │ 2. GET /api/exercises/assigned
       │ 3. Call get_student_exercises()
       │
       ↓
┌──────────────────────────────────────┐
│  Exercise appears in student list    │
│  - Shows assignment badge            │
│  - Shows deadline if set             │
│  - Shows teacher notes               │
└──────────────────────────────────────┘
```

### Instance Generation Flow

Based on `distribution_mode`, exercises generate different instances.

```
┌──────────────┐
│  Template    │
│  Exercise    │
└──────┬───────┘
       │ Has variables: [{ name: 'a', expression: '{{1-10}}' }]
       │ distribution_mode: 'per_student'
       │
       ↓
┌──────────────────────────────────────┐
│  Student opens exercise              │
│  GET /exercises/[id]                 │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  generateExerciseInstance()          │
│  - Get seed based on mode:           │
│    • on_demand: random()             │
│    • per_student: hash(student_id)   │
│    • per_group: hash(assignment_id)  │
│  - Seed RNG with deterministic seed  │
│  - Resolve variables in order        │
│  - Replace {{var}} in content        │
│  - Parse resolved markdown to AST    │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  ExerciseInstance returned           │
│  {                                   │
│    seed: 54321,                      │
│    resolvedVariables: [              │
│      { name: 'a', value: '7' }       │
│    ],                                │
│    statement_md: 'Calculate 7 + 3',  │
│    solution_md: 'Answer is 10',      │
│    statement_ast: {...}              │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────┐
│ ExerciseDisplay
│ - Render statement from AST
│ - Student sees: "Calculate 7 + 3"
└──────────────┘
```

**Key Point**: Same template + same seed = same instance (reproducible).

---

## Security Model

### Row Level Security (RLS)

All tables have RLS enabled with fine-grained policies.

#### Policies for `exercises`

```sql
-- Teachers see their own exercises
CREATE POLICY "Teachers see own exercises" ON exercises FOR SELECT
USING (created_by = auth.uid() AND role = 'teacher');

-- Teachers create exercises for themselves
CREATE POLICY "Teachers create exercises" ON exercises FOR INSERT
WITH CHECK (created_by = auth.uid() AND role = 'teacher');

-- Students see public exercises
CREATE POLICY "Students see public exercises" ON exercises FOR SELECT
USING (is_public = TRUE AND role = 'student');

-- Admins see all
CREATE POLICY "Admins see all exercises" ON exercises FOR SELECT
USING (role = 'admin');
```

#### Policies for `exercise_assignments`

```sql
-- Teachers see their own assignments
CREATE POLICY "Teachers see own assignments" ON exercise_assignments FOR SELECT
USING (assigned_by = auth.uid() AND role = 'teacher');

-- Teachers create assignments for their exercises
CREATE POLICY "Teachers create assignments" ON exercise_assignments FOR INSERT
WITH CHECK (
  assigned_by = auth.uid() AND role = 'teacher'
  AND EXISTS (SELECT 1 FROM exercises WHERE id = exercise_id AND created_by = auth.uid())
);

-- Students see assignments targeted to them
CREATE POLICY "Students see their assignments" ON exercise_assignments FOR SELECT
USING (
  role = 'student' AND is_active = TRUE AND (
    student_id = auth.uid() OR
    class_id IN (SELECT class_id FROM class_members WHERE student_id = auth.uid()) OR
    assigned_to_type = 'public'
  )
);
```

#### Policies for `exercise_completions`

```sql
-- Students manage their own completions
CREATE POLICY "Students manage completions" ON exercise_completions
FOR ALL USING (student_id = auth.uid() AND role = 'student')
WITH CHECK (
  student_id = auth.uid() AND role = 'student'
  AND student_has_exercise_access(exercise_id, auth.uid())
);

-- Teachers see completions for their exercises
CREATE POLICY "Teachers see completions" ON exercise_completions FOR SELECT
USING (
  role = 'teacher' AND EXISTS (
    SELECT 1 FROM exercises WHERE id = exercise_id AND created_by = auth.uid()
  )
);
```

### Access Control Logic

**Student can access exercise if**:

1. `exercises.is_public = TRUE` (public library)
2. Has direct assignment (`assigned_to_type = 'student'` AND `student_id = auth.uid()`)
3. Is in a class with assignment (`assigned_to_type = 'class'` AND student is in `class_id`)
4. Has public assignment (`assigned_to_type = 'public'`)

**Validation Chain**:

```
Student → Exercise
   ↓
studentHasAccess(exercise_id, student_id)
   ↓
Check: is_public OR has_assignment
   ↓
Allow/Deny
```

---

## Performance Optimizations

### Database Optimizations

**1. Full-Text Search Index** (GIN index, French language):

- Searches across title, statement, solution, tags
- Uses `to_tsvector('french', ...)` for stemming
- Query time: ~5ms for 1000+ exercises

**2. Partial Indexes** (reduce index size):

```sql
-- Only index non-null values
CREATE INDEX idx_exercises_topic ON exercises(topic)
WHERE topic IS NOT NULL;

-- Only index active assignments
CREATE INDEX idx_assignments_active ON exercise_assignments(is_active)
WHERE is_active = TRUE;
```

**3. Composite Indexes** (avoid multiple index scans):

```sql
-- Common query: active assignments by teacher
CREATE INDEX idx_assignments_teacher_active
ON exercise_assignments(assigned_by, is_active)
WHERE is_active = TRUE;
```

**4. Covering Indexes** (include needed columns):

```sql
-- View can use index-only scan
CREATE INDEX idx_completions_student_completed
ON exercise_completions(student_id, completed_at)
WHERE completed_at IS NOT NULL;
```

### Application Optimizations

**1. Materialized View** (future enhancement):

- Pre-compute `assigned_exercises_with_details` nightly
- Refresh on assignment creation/update
- Reduce join overhead for teacher dashboard

**2. Caching Strategy**:

- Cache public exercises in-memory (rarely change)
- Cache student's accessible exercises for 5 minutes
- Invalidate on new assignment

**3. Lazy Loading**:

- Load exercise list without solutions
- Load solution only when "Show Solution" clicked
- Load images lazily with `loading="lazy"`

**4. Pagination**:

- Server-side pagination (50 items per page)
- Offset-based for simplicity
- Cursor-based for large datasets (future)

**5. Debounced Search**:

- 300ms debounce on search input
- Prevents excessive database queries
- Shows "Searching..." indicator

### Query Performance Examples

**Slow Query** (without index):

```sql
-- Full table scan, 2000ms for 10k exercises
SELECT * FROM exercises
WHERE statement_md ILIKE '%pythagore%';
```

**Fast Query** (with full-text search):

```sql
-- Index scan, 5ms for 10k exercises
SELECT * FROM exercises
WHERE to_tsvector('french', statement_md)
  @@ websearch_to_tsquery('french', 'pythagore');
```

---

## Integration Points

### Parameterization System

Exercises integrate with the shared parameterization library (`/src/lib/shared/parameterization/`).

**Integration Points**:

1. **Variable Editor** (`ExerciseParameterizationEditor.svelte`):
   - Uses `VariableEditor` component from shared library
   - Validates variables with `validateVariables()`
   - Detects circular dependencies

2. **Instance Generator** (`/src/lib/exercises/generator/instance-generator.ts`):
   - Imports `resolveVariables()` from shared library
   - Uses `parseAndResolve()` for text resolution
   - Generates deterministic seeds based on distribution mode

3. **Preview Component** (`ExerciseMarkdownPreview.svelte`):
   - Live preview with resolved variables
   - Regenerate button for `on_demand` mode
   - Shows current seed for debugging

**Syntax Support**:

- Variable references: `{{varName}}`
- Random integers: `{{1-20}}`
- Random decimals: `{{0-1:0.1}}`
- Exclusions: `{{1-20!5,7}}`
- Expressions: `{{eval:a+b}}`

### Import/Export System

**Export Formats**:

1. **JSON** (`.json`):
   - Single exercise: `{ version: '1.0', title: '...', ... }`
   - Bulk: Array of exercise objects
   - Includes metadata, content, parameterization

2. **Markdown** (`.md`):
   - YAML frontmatter for metadata
   - Markdown body for statement
   - Separator (`---`) before solution
   - Example:

     ```markdown
     ---
     version: '1.0'
     title: Addition Practice
     difficulty: 1
     tags: [addition, arithmetic]
     ---

     # Statement

     Calculate {{a}} + {{b}}

     ---

     # Solution

     {{a}} + {{b}} = {{eval:a+b}}
     ```

**Import Process**:

1. Parse file (JSON or Markdown)
2. Validate structure and required fields
3. Check for duplicates (SHA-256 hash of title + statement)
4. Handle duplicates based on strategy:
   - `skip`: Don't import duplicate
   - `replace`: Update existing exercise
   - `create-copy`: Import with "(copie)" suffix
5. Insert into database
6. Return summary (imported, skipped, failed)

**Duplicate Detection**:

```typescript
const hash = createHash('sha256')
	.update(exercise.title + exercise.statement_md)
	.digest('hex');

// Check if hash exists
const existing = await supabase.from('exercises').select('id').eq('content_hash', hash).single();
```

### Image Upload Service

**Storage Structure**:

```
exercise-images/
  {userId}/
    {timestamp}-{uuid}.jpg
    {timestamp}-{uuid}.png
    {timestamp}-{uuid}.svg
```

**Upload Flow**:

1. User selects image in markdown editor
2. Validate file type (JPEG, PNG, GIF, SVG) and size (<5MB)
3. Generate unique filename: `Date.now()-${uuid()}.${ext}`
4. Upload to Supabase Storage bucket `exercise-images`
5. Get public URL
6. Insert markdown: `![](publicUrl)`
7. Show success toast

**Cleanup**:

- Trigger deletes images when exercise is deleted
- Searches by user ID and exercise ID pattern
- Prevents orphaned images in Storage

---

## Summary

The Exercise Feature is a comprehensive system with:

- **3 database tables** with full RLS security
- **1 view** for efficient teacher queries
- **4 helper functions** for access control and statistics
- **13 API endpoints** for all operations
- **17 indexes** for optimal performance
- **20+ server functions** for business logic
- **10+ Svelte components** for UI
- **3 distribution modes** for parameterization
- **2 import/export formats** (JSON, Markdown)

**Key Strengths**:

- Flexible assignment system (student, class, public)
- Optional completion tracking (not enforced)
- Parameterization support for infinite variants
- Full-text search for discoverability
- Robust security with RLS
- Performance-optimized with indexes

**Next Steps**:

- Add PDF generation (LaTeX compilation)
- Add collaborative editing
- Add version history
- Add answer key generation
- Add print optimization
