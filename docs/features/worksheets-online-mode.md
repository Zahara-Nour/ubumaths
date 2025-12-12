# Worksheets Online Mode

> **Version**: 1.0.0
> **Status**: Production
> **Date**: 2025-12-12

---

## Overview

The Worksheets Online Mode enables students to view and interact with worksheet assignments directly in their browser without downloading PDFs. This consultation mode provides a seamless online experience with deterministic exercise resolution, granular correction control, and flexible assignment options.

### Key Features

- **Online Consultation**: View worksheets at `/dashboard/student/worksheets` with live rendering
- **Deterministic Resolution**: Exercises resolved consistently using `worksheetId + studentId` as seed
- **Course Integration**: Worksheets appear in course chapters under a new "Fiches" tab
- **Individual Assignment**: Assign to specific students in addition to entire classes
- **Granular Correction Control**: Global toggle plus per-exercise visibility overrides
- **Collapsible Corrections**: Students can expand/collapse corrections as needed
- **No Pre-generation**: Exercises resolved on-demand, eliminating need for instance pre-generation

---

## User Workflows

### For Students: Viewing Worksheets

#### 1. Access Assigned Worksheets

**Route**: `/dashboard/student/worksheets`

Students see a filtered list of all worksheets assigned to them:

- Assigned via class membership (class-based assignments)
- Assigned individually by teacher (individual assignments)
- Only active assignments where `available_from <= NOW()`
- Pagination support (50 items per page)
- Filter by class (if student belongs to multiple classes)

**Card Display**:

```
┌────────────────────────────────────┐
│ [Icon] Worksheet Title             │
│ Description preview...             │
│                                    │
│ Type: Exercices | Grade: 5eme     │
│ 5 exercices • 30 min               │
│                                    │
│ [Voir la fiche →]                  │
└────────────────────────────────────┘
```

#### 2. View Worksheet Detail

**Route**: `/dashboard/student/worksheets/{assignmentId}`

When a student opens a worksheet:

1. **Header displays**: Title, description, metadata (grade, type, duration)
2. **Exercises resolved deterministically**:
   - Seed = `hash(worksheetId + studentId)`
   - Variables interpolated with consistent values
   - Same student always sees same variant
3. **Each exercise shows**:
   - Exercise number and title
   - Statement (with resolved variables)
   - Correction (if enabled, collapsed by default)

**Exercise Display Example**:

```markdown
## Exercice 1: Calcul mental

Calculer: 7 × 8 = ?

<details>
<summary>Voir la correction</summary>

**Solution**: 7 × 8 = 56

**Methode**: Table de multiplication

</details>
```

#### 3. View in Course Context

**Route**: `/courses/{courseId}/chapters/{chapterId}?tab=fiches`

Worksheets also appear in course chapters:

- New "Fiches" tab alongside "Cours" and "Exercices"
- Shows worksheets assigned to the chapter
- Same viewing experience as dashboard route
- Contextual learning within course structure

### For Teachers: Managing Online Assignments

#### 1. Assign to Individuals

**Route**: `/dashboard/teacher/worksheets/{worksheetId}/assignments/{assignmentId}`

**Steps**:

1. Navigate to assignment detail page
2. Click "Eleves" tab
3. Click "Ajouter des eleves" button
4. Select students from dialog:
   - Search by name
   - Filter by class
   - Multi-select with checkboxes
5. Save - Students gain immediate access

**Use Cases**:

- Remediation for struggling students
- Advanced challenges for top performers
- Makeup work for absent students
- Differentiated instruction
- Test retakes

**UI Component**: `StudentSelector.svelte` dialog with search and filtering

#### 2. Manage Assigned Students

**Route**: Same as above, "Eleves" tab

**Features**:

- View list of individually assigned students
- Remove individual assignments
- Visual indicators for assignment source (class vs individual)
- Bulk operations not supported (by design - encourages intentional assignments)

**UI Component**: `AssignmentStudentsPanel.svelte`

```
┌─────────────────────────────────────────┐
│ Eleves Assignes (12)                    │
├─────────────────────────────────────────┤
│ Alice Dubois        [Via classe: 5B]   │
│ Bob Martin          [Individuel] [×]    │
│ Claire Lefevre      [Via classe: 5B]   │
│ ...                                      │
└─────────────────────────────────────────┘
```

#### 3. Control Correction Visibility

**Route**: Same as above, "Corrections" tab

**Global Toggle**:

- `show_corrections`: Boolean (default: false)
- When OFF: All corrections hidden regardless of overrides
- When ON: Per-exercise overrides apply

**Per-Exercise Overrides**:

- Override visibility for specific exercises
- Persists when global toggle changes
- Visual indicators show override status
- Default: Follow template setting (`worksheet_exercises.correction_visible`)

**Priority Logic**:

```
IF global_toggle = false THEN
  Hide all corrections
ELSE
  FOR EACH exercise
    IF has_override THEN
      Use override.show_correction
    ELSE
      Use worksheet_exercises.correction_visible (default: true)
    END IF
  END FOR
END IF
```

**UI Component**: `CorrectionVisibilityPanel.svelte`

```
┌─────────────────────────────────────────┐
│ Corrections                              │
│                                          │
│ [×] Afficher les corrections (global)   │
│                                          │
│ Par exercice:                            │
│ Exercice 1 [✓] (default)                │
│ Exercice 2 [×] (override)  ← hidden     │
│ Exercice 3 [✓] (override)  ← visible    │
│ Exercice 4 [✓] (default)                │
└─────────────────────────────────────────┘
```

---

## Architecture

### Deterministic Resolution

Exercises with variables are resolved consistently for each student using a deterministic seed:

```typescript
// Seed generation
function generateSeed(worksheetId: string, studentId: string): number {
	const baseString = `${worksheetId}-${studentId}`;
	return hashString(baseString); // 32-bit integer hash
}

// Variable resolution
const seed = generateSeed(assignment.worksheet_id, studentId);
const rng = new SeededRNG(seed);
const resolvedExercises = exercises.map((ex) => resolveVariables(ex, rng));
```

**Benefits**:

- Same student always sees same variant (consistency)
- Different students see different variants (integrity)
- No pre-generation needed (simplicity)
- Instant resolution (performance)

### Database Schema

#### New Tables

**1. worksheet_assignment_students**

Stores individual student assignments (complement to class-based assignments).

```sql
CREATE TABLE worksheet_assignment_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES worksheet_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT was_unique UNIQUE (assignment_id, student_id)
);

CREATE INDEX idx_was_assignment_id ON worksheet_assignment_students(assignment_id);
CREATE INDEX idx_was_student_id ON worksheet_assignment_students(student_id);
CREATE INDEX idx_was_student_assignment ON worksheet_assignment_students(student_id, assignment_id);
```

**2. worksheet_assignment_exercise_settings**

Stores per-exercise correction visibility overrides at assignment level.

```sql
CREATE TABLE worksheet_assignment_exercise_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES worksheet_assignments(id) ON DELETE CASCADE,
  worksheet_exercise_id UUID NOT NULL REFERENCES worksheet_exercises(id) ON DELETE CASCADE,
  show_correction BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT waes_unique UNIQUE (assignment_id, worksheet_exercise_id)
);

CREATE INDEX idx_waes_assignment_id ON worksheet_assignment_exercise_settings(assignment_id);
CREATE INDEX idx_waes_worksheet_exercise_id ON worksheet_assignment_exercise_settings(worksheet_exercise_id);
CREATE INDEX idx_waes_assignment_exercise ON worksheet_assignment_exercise_settings(assignment_id, worksheet_exercise_id);
```

#### New Columns

**worksheet_assignments.show_corrections**

- Type: `BOOLEAN DEFAULT false`
- Purpose: Global toggle to show/hide all corrections for an assignment
- Behavior: When false, all corrections hidden regardless of overrides

**worksheet_exercises.correction_visible**

- Type: `BOOLEAN DEFAULT true`
- Purpose: Default correction visibility in worksheet template
- Behavior: Used when no per-exercise override exists for an assignment

### Security

#### RLS Policies

**worksheet_assignment_students**:

1. **Teachers can manage own individual assignments**: Can CRUD assignments they created
2. **Students can view own individual assignments**: Can SELECT where `student_id = auth.uid()`
3. **Admins can manage all individual assignments**: Full access

**worksheet_assignment_exercise_settings**:

1. **Teachers can manage exercise settings for own assignments**: Can CRUD settings for their assignments
2. **Students can view exercise settings for their assignments**: Can SELECT using `can_access_assignment()` function
3. **Admins can manage all exercise settings**: Full access

#### Helper Function: can_access_assignment(UUID)

Security definer function to check if current user can access an assignment:

```sql
CREATE FUNCTION can_access_assignment(p_assignment_id UUID)
RETURNS BOOLEAN AS $$
  -- Returns TRUE if:
  -- 1. User is assignment creator (teacher)
  -- 2. User is student in assigned class (active assignment, timing checks)
  -- 3. User is individually assigned (active assignment, timing checks)
$$;
```

**Timing Checks for Students**:

- `worksheet_assignments.status = 'active'`
- `available_from IS NULL OR available_from <= NOW()`
- Class membership via active classes only (`classes.is_active = true`)

### API Endpoints

#### Student Endpoints

**GET /api/student/worksheets**

Lists worksheet assignments available to the logged-in student.

**Query Parameters**:

- `class_id` (optional): Filter by class UUID
- `page` (default: 1): Page number (1-1000)
- `limit` (default: 50, max: 100): Items per page

**Response**:

```typescript
{
  worksheets: StudentWorksheetListItem[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

**StudentWorksheetListItem Type**:

```typescript
interface StudentWorksheetListItem {
	assignment_id: string;
	worksheet_id: string;
	title: string;
	description: string | null;
	type: 'worksheet' | 'assessment' | 'exam' | 'quiz' | 'homework';
	grade_levels: string[];
	exercise_count: number;
	estimated_duration_minutes: number | null;
	available_from: string | null;
	available_until: string | null;
}
```

**GET /api/student/worksheets/{assignmentId}**

Returns detailed worksheet assignment with resolved exercises.

**Response**:

```typescript
{
  assignment: {
    id: string,
    title: string,
    description: string | null,
    // ... assignment metadata
  },
  worksheet: {
    id: string,
    title: string,
    type: string,
    grade_levels: string[],
    estimated_duration_minutes: number | null
  },
  exercises: ResolvedExercise[], // Variables interpolated with deterministic seed
  correctionSettings: {
    globalEnabled: boolean,
    perExercise: Record<string, boolean> // exerciseId -> show_correction
  }
}
```

**Security**: RLS enforces access control via `can_access_assignment()` function.

#### Teacher Endpoints

**GET/POST/DELETE /api/worksheets/{id}/assignments/{assignmentId}/students**

Manage individually assigned students.

**GET**: List assigned students

```typescript
{
  students: {
    id: string,
    full_name: string,
    assigned_at: string
  }[]
}
```

**POST**: Add individual students

**Body**:

```typescript
{
	student_ids: string[]; // Array of student UUIDs
}
```

**DELETE /api/worksheets/{id}/assignments/{assignmentId}/students/{studentId}**

Remove individual student assignment.

**GET/PUT /api/worksheets/{id}/assignments/{assignmentId}/corrections**

Manage correction visibility settings.

**GET**: Returns current settings

```typescript
{
  show_corrections: boolean, // Global toggle
  exercise_settings: {
    worksheet_exercise_id: string,
    show_correction: boolean
  }[]
}
```

**PUT**: Update correction settings

**Body**:

```typescript
{
	show_corrections?: boolean; // Global toggle
	exercise_overrides?: {
		worksheet_exercise_id: string;
		show_correction: boolean;
	}[];
}
```

---

## Components

### Student Components

**WorksheetCard.svelte**

Card component for worksheet list page.

**Props**:

```typescript
interface Props {
	worksheet: StudentWorksheetListItem;
}
```

**Features**:

- Displays title, description, metadata
- Shows exercise count and duration
- Type badge with color coding
- Click to navigate to detail page

---

**WorksheetHeader.svelte**

Header component for worksheet detail page.

**Props**:

```typescript
interface Props {
	title: string;
	description: string | null;
	type: WorksheetType;
	gradeLevels: string[];
	estimatedDuration: number | null;
	exerciseCount: number;
}
```

**Features**:

- Large title with type badge
- Description with markdown rendering
- Metadata chips (grade, duration, count)
- Responsive layout

---

**ExerciseDisplay.svelte**

Displays a single exercise with collapsible correction.

**Props**:

```typescript
interface Props {
	exercise: ResolvedExercise;
	number: number;
	showCorrection: boolean; // From correction settings
}
```

**Features**:

- Exercise number and title
- Statement with resolved variables
- Collapsible correction (if enabled)
- Markdown rendering with LaTeX support
- Syntax highlighting for code blocks

**Correction Behavior**:

- If `showCorrection = false`: Correction section not rendered
- If `showCorrection = true`: Rendered as collapsed `<details>` element
- Student can expand/collapse as needed

### Teacher Components

**StudentSelector.svelte**

Dialog for selecting individual students to assign.

**Props**:

```typescript
interface Props {
	open: boolean;
	assignmentId: string;
	worksheetId: string;
	onClose: () => void;
}
```

**Features**:

- Search by student name
- Filter by class
- Multi-select with checkboxes
- Already-assigned indicator
- Batch add on save

**Implementation**:

- Fetches available students from teacher's classes
- Excludes students already assigned (class or individual)
- Optimistic UI update on save
- Error handling with rollback

---

**AssignmentStudentsPanel.svelte**

Panel for managing individually assigned students.

**Props**:

```typescript
interface Props {
	assignmentId: string;
	worksheetId: string;
}
```

**Features**:

- List of all students with access (class + individual)
- Visual indicator for assignment source
- Remove button for individual assignments (disabled for class assignments)
- Real-time updates

**Display**:

```
Student Name        [Via classe: 5B]      [Disabled]
Student Name        [Individuel]          [× Remove]
```

---

**CorrectionVisibilityPanel.svelte**

Panel for managing per-exercise correction visibility.

**Props**:

```typescript
interface Props {
	assignmentId: string;
	worksheetId: string;
}
```

**Features**:

- Global toggle for `show_corrections`
- Per-exercise override toggles
- Visual indicators (default vs override)
- Explanation text for priority logic
- Optimistic UI updates

**States**:

- Default (no override): Follows template setting
- Override ON: Force visible (even if template default is false)
- Override OFF: Force hidden (even if template default is true)
- Global OFF: All hidden (overrides ignored)

---

## Configuration

### Worksheet Template Settings

Teachers can set default correction visibility when creating exercises:

```typescript
interface WorksheetExercise {
	id: string;
	worksheet_id: string;
	exercise_id: string;
	position: number;
	points: number | null;
	correction_visible: boolean; // NEW: Default visibility (default: true)
	// ... other fields
}
```

This setting serves as the template default. Teachers can override it per-assignment using `worksheet_assignment_exercise_settings`.

### Assignment Settings

```typescript
interface WorksheetAssignment {
	id: string;
	worksheet_id: string;
	class_id: string | null; // NULL for individual-only assignments
	status: 'draft' | 'active' | 'archived';
	available_from: string | null;
	available_until: string | null;
	show_corrections: boolean; // NEW: Global toggle (default: false)
	// ... other fields
}
```

### Exercise Override Settings

```typescript
interface WorksheetAssignmentExerciseSetting {
	id: string;
	assignment_id: string;
	worksheet_exercise_id: string;
	show_correction: boolean; // Override value
	created_at: string;
	updated_at: string;
}
```

---

## Best Practices

### For Teachers

**1. Use Individual Assignments Intentionally**

- Don't duplicate class assignments unnecessarily
- Use for specific interventions (remediation, enrichment)
- Remove individual assignments when no longer needed

**2. Manage Correction Visibility Thoughtfully**

- Default OFF during assessment period
- Enable globally once deadline passes
- Use per-exercise overrides to reveal hints progressively
- Consider hiding final answers while showing method

**3. Communicate Assignment Purpose**

- Use description field to explain why student was assigned
- Set clear availability windows
- Provide context for differentiated assignments

### For Developers

**1. Always Use Deterministic Seeds**

```typescript
// ✅ CORRECT: Deterministic seed
const seed = generateSeed(worksheetId, studentId);

// ❌ WRONG: Random seed (inconsistent variants)
const seed = Math.random();
```

**2. Respect Correction Visibility Logic**

```typescript
// ✅ CORRECT: Check both global and per-exercise
const showCorrection =
	assignment.show_corrections && // Global enabled
	(exerciseSetting?.show_correction ?? exercise.correction_visible); // Override or default

// ❌ WRONG: Only check global
const showCorrection = assignment.show_corrections;
```

**3. Validate Access Server-Side**

```typescript
// ✅ CORRECT: Server-side RLS policies enforce access
const { data, error } = await supabase
	.from('worksheet_assignments')
	.select('*')
	.eq('id', assignmentId)
	.single();
// RLS automatically filters based on can_access_assignment()

// ❌ WRONG: Client-side access check only
if (userHasAccess) {
	// Anyone can manipulate client code
}
```

---

## Troubleshooting

### Students Can't See Assigned Worksheet

**Check**:

1. Assignment status is `active` (not draft/archived)
2. `available_from` is NULL or <= current time
3. Student is either:
   - Member of assigned class (`class_members` table)
   - Individually assigned (`worksheet_assignment_students` table)
4. Class is active (`classes.is_active = true`)

**Debug Query**:

```sql
SELECT
  wa.*,
  cm.student_id AS class_member,
  was.student_id AS individual_assign
FROM worksheet_assignments wa
LEFT JOIN class_members cm ON cm.class_id = wa.class_id AND cm.student_id = :student_id
LEFT JOIN worksheet_assignment_students was ON was.assignment_id = wa.id AND was.student_id = :student_id
WHERE wa.id = :assignment_id;
```

### Corrections Not Visible Despite Being Enabled

**Check Priority Logic**:

1. Is `show_corrections` (global) enabled? If NO → All hidden
2. Does exercise have override in `worksheet_assignment_exercise_settings`?
   - If YES → Use `show_correction` from override
   - If NO → Use `correction_visible` from `worksheet_exercises`

**Debug Query**:

```sql
SELECT
  we.id AS exercise_id,
  we.correction_visible AS template_default,
  waes.show_correction AS override_value,
  wa.show_corrections AS global_toggle
FROM worksheet_exercises we
JOIN worksheet_assignments wa ON wa.worksheet_id = we.worksheet_id
LEFT JOIN worksheet_assignment_exercise_settings waes
  ON waes.assignment_id = wa.id AND waes.worksheet_exercise_id = we.id
WHERE wa.id = :assignment_id;
```

### Different Students See Same Variant

**Possible Causes**:

1. Seed generation not using both `worksheetId` AND `studentId`
2. Cache serving same resolved exercises to all students
3. Variables not actually randomized (static values)

**Fix**:

```typescript
// Ensure seed includes BOTH IDs
const seed = generateSeed(assignmentData.worksheet_id, userId);

// Disable caching for resolved exercises
// (metadata can be cached, but not resolved content)
```

### Individual Assignment Not Removed

**Check**:

1. User is the assignment creator (`created_by = auth.uid()`)
2. RLS policy allows DELETE for creator
3. Student ID is correct UUID format

**Common Issue**: Trying to remove class-based assignment (not supported). Only individual assignments in `worksheet_assignment_students` can be removed individually.

---

## Performance Considerations

### Exercise Resolution

**On-Demand Resolution**:

- Exercises resolved when worksheet detail page loads
- No pre-generation needed (simpler architecture)
- Deterministic seed ensures consistency

**Optimization**:

- Server-side resolution (avoid client-side computation)
- Cache resolved exercises per student (5-minute TTL recommended)
- Batch resolve all exercises in single pass

### Database Queries

**Efficient Access Check**:

```sql
-- ✅ EFFICIENT: Single query with EXISTS
SELECT * FROM worksheet_assignments
WHERE id = :assignment_id
AND can_access_assignment(:assignment_id);

-- ❌ INEFFICIENT: Multiple round trips
-- Check if user is in class
-- Check if user is individually assigned
-- Check assignment status
-- Then fetch assignment
```

**Indexes Created**:

- `idx_was_student_assignment` (student_id, assignment_id) - Composite for lookup
- `idx_waes_assignment_exercise` (assignment_id, worksheet_exercise_id) - Fetch all settings

---

## Migration Guide

### From PDF-Only to Online Mode

**Steps**:

1. **Migration Applied**: `20251212000000_worksheets_online_mode.sql`
2. **Database Types Updated**: Regenerate with `supabase gen types typescript --linked`
3. **Existing Assignments**: Continue working (default `show_corrections = false`)
4. **Enable Online Mode**: Teachers toggle `show_corrections` when ready

**Backward Compatibility**:

- PDF generation still works (unchanged)
- Existing assignments remain class-only (no individual students)
- Default correction visibility follows template (`correction_visible = true`)

**Gradual Rollout**:

1. Phase 1: Individual assignment feature (no impact on corrections)
2. Phase 2: Enable `show_corrections` toggle (opt-in)
3. Phase 3: Teachers configure per-exercise overrides
4. Phase 4: Course integration (Fiches tab)

---

## Related Documentation

- [Worksheets Feature Overview](worksheets.md) - Main feature documentation
- [Worksheet Variants](worksheet-variants.md) - Detailed variant system
- [Database Schema](../architecture/database-schema.md) - Full schema reference
- [Exercises Feature](exercises/README.md) - Exercise creation and management

---

## Changelog

### 2025-12-12 - Initial Release

- Student online consultation mode at `/dashboard/student/worksheets`
- Individual student assignment support
- Per-exercise correction visibility overrides
- Global correction toggle (`show_corrections`)
- Deterministic exercise resolution (worksheetId + studentId seed)
- New components: WorksheetCard, WorksheetHeader, ExerciseDisplay
- New API endpoints for students and individual assignments
- Migration: `20251212000000_worksheets_online_mode.sql`

---

[Back to Features Index](README.md)
