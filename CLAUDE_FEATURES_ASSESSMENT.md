# CLAUDE_FEATURES_ASSESSMENT.md

> **📖 Core Project Guidelines**: See **[CLAUDE.md](CLAUDE.md)** for project structure, Svelte 5 best practices, and development workflows.

This file contains detailed documentation for the **Assessment System** - a comprehensive graded evaluation system that allows teachers to create, assign, and track student assessments based on the question bank.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Teacher Workflow](#teacher-workflow)
- [Student Workflow](#student-workflow)
- [API Reference](#api-reference)
- [Components](#components)
- [Server Functions](#server-functions)
- [Integration Points](#integration-points)
- [Development Guide](#development-guide)

---

## Overview

The Assessment System enables teachers to:
- Create graded evaluations using questions from the question cart
- Configure assessment parameters (attempts, deadlines, time limits)
- Assign assessments to entire classes or individual students
- Track student progress and view detailed results

Students can:
- View their assigned assessments
- Complete assessments with time tracking
- View their attempt history and scores
- See remaining attempts and deadlines

### Key Features

✅ **Question Cart Integration** - Reuses existing cart system for question selection
✅ **Flexible Configuration** - Max attempts, time limits, deadlines, shuffling
✅ **Multiple Assignment Types** - Assign to classes or individual students
✅ **Draft/Published Workflow** - Save as draft, publish when ready
✅ **Attempt Validation** - Checks deadlines and max attempts before starting
✅ **Comprehensive Results** - Statistics, student-by-student breakdown, attempt history
✅ **Status Tracking** - Real-time progress tracking (not started, in progress, completed, expired)

---

## Architecture

### System Flow

```
Teacher Creates Assessment
    ↓
Teacher Publishes Assessment
    ↓
Teacher Assigns to Classes/Students
    ↓
Students See Assignment
    ↓
Students Complete Test
    ↓
Results Saved with assignment_id
    ↓
Teacher Views Results & Statistics
```

### Data Model

```
assessments (teacher-created)
    ├── categories: JSONB (CartItem[])
    ├── settings: JSONB (max_attempts, time_limit, deadline, shuffle)
    └── status: draft | published | archived

assessment_assignments (assignment records)
    ├── assessment_id → assessments
    ├── class_id → classes (OR)
    ├── student_id → profiles
    └── assigned_by → profiles

test_sessions (modified to support assignments)
    ├── assignment_id → assessment_assignments (null = free practice)
    └── [existing test session fields]
```

---

## Database Schema

### Core Tables

#### `assessments`

| Column        | Type              | Description                                                  |
| ------------- | ----------------- | ------------------------------------------------------------ |
| id            | UUID (PK)         | Assessment ID                                                |
| title         | TEXT              | Assessment title                                             |
| grade         | TEXT              | Grade level ('6ème', '5ème', '4ème', '3ème')                |
| description   | TEXT              | Optional description                                         |
| created_by    | UUID (FK)         | Teacher who created → profiles(id)                           |
| categories    | JSONB             | Array of CartItem objects                                    |
| settings      | JSONB             | Configuration (see Settings Structure below)                 |
| status        | TEXT              | 'draft', 'published', 'archived'                             |
| created_at    | TIMESTAMPTZ       | Creation timestamp                                           |
| updated_at    | TIMESTAMPTZ       | Last update timestamp                                        |

**Settings Structure (JSONB)**:
```typescript
{
  max_attempts: number | null,      // null = unlimited
  time_limit: number | null,        // Total seconds, null = no limit
  deadline: string | null,          // ISO timestamp, null = no deadline
  shuffle_questions: boolean        // Randomize order
}
```

#### `assessment_assignments`

| Column        | Type        | Description                                               |
| ------------- | ----------- | --------------------------------------------------------- |
| id            | UUID (PK)   | Assignment ID                                             |
| assessment_id | UUID (FK)   | → assessments(id)                                         |
| class_id      | UUID (FK)   | → classes(id) (null if student-specific)                  |
| student_id    | UUID (FK)   | → profiles(id) (null if class-wide)                       |
| assigned_by   | UUID (FK)   | → profiles(id)                                            |
| assigned_at   | TIMESTAMPTZ | Assignment timestamp                                      |

**Constraint**: `CHECK ((class_id IS NOT NULL AND student_id IS NULL) OR (class_id IS NULL AND student_id IS NOT NULL))`

#### `test_sessions` (modified)

Added one column to existing table:

| Column        | Type      | Description                                                |
| ------------- | --------- | ---------------------------------------------------------- |
| assignment_id | UUID (FK) | → assessment_assignments(id) (null = free practice)        |

### Views

#### `assessment_results`

Aggregated view for teacher dashboards:

```sql
SELECT
  aa.id AS assignment_id,
  a.title AS assessment_title,
  p.firstname AS student_firstname,
  p.lastname AS student_lastname,
  MAX(ts.score) AS best_score,
  COUNT(ts.id) AS attempts_count,
  MAX(ts.completed_at) AS last_attempt_at,
  CASE
    WHEN COUNT(ts.id) = 0 THEN 'not_started'
    WHEN MAX(ts.completed_at) IS NULL THEN 'in_progress'
    ELSE 'completed'
  END AS status
FROM assessment_assignments aa
JOIN assessments a ON a.id = aa.assessment_id
LEFT JOIN profiles p ON p.id = COALESCE(aa.student_id, ...)
LEFT JOIN test_sessions ts ON ts.assignment_id = aa.id
WHERE a.status != 'archived'
GROUP BY ...
```

---

## Teacher Workflow

### 1. Creating an Assessment

**Route**: `/dashboard/teacher/assessments/new`

**Steps**:

1. **Add Questions to Cart**
   - Navigate to `/automaths`
   - Browse question categories
   - Add desired categories with quantities to cart

2. **Create Assessment - Step 1: Review Cart**
   ```svelte
   <!-- Component: +page.svelte -->
   {#if isEmpty}
     <EmptyCartState />
   {:else}
     <CartQuestionCards />
   {/if}
   ```

3. **Create Assessment - Step 2: Configure**
   ```svelte
   <AssessmentConfigForm
     initialData={formData}
     onSubmit={handleConfigSubmit}
   />
   ```

   Fields:
   - Title (required)
   - Grade level (required, dropdown: 6ème-3ème)
   - Description (optional, textarea)
   - Max attempts (optional, number input)
   - Time limit (optional, in minutes)
   - Deadline (optional, datetime-local)
   - Shuffle questions (checkbox, default: true)

4. **Create Assessment - Step 3: Review & Publish**
   - Review all settings
   - Choose: "Save as Draft" or "Publish"

**API Call**:
```typescript
const response = await fetch('/api/assessments', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Évaluation Chapitre 3',
    grade: '6ème',
    description: 'Les fractions',
    categories: cartItems,  // CartItem[]
    settings: {
      max_attempts: 3,
      time_limit: 1800,  // 30 minutes in seconds
      deadline: '2025-11-01T23:59:00Z',
      shuffle_questions: true
    },
    status: 'published'  // or 'draft'
  })
});
```

### 2. Editing an Assessment

**Route**: `/dashboard/teacher/assessments/[id]/edit`

**Constraints**:
- Only **draft** assessments can be edited
- Published assessments are locked (prevents changing tests mid-assignment)

**Editable Fields**:
- Title
- Grade
- Description
- Settings (max_attempts, time_limit, deadline, shuffle)

**Not Editable**: Categories (question selection)

### 3. Assigning an Assessment

**Route**: `/dashboard/teacher/assessments/[id]/assign`

**Requirements**:
- Assessment must be **published** (not draft)
- Teacher must own the assessment
- Teacher can only assign to their own classes/students

**UI Features**:
- Left panel: List of teacher's classes with student counts
- Right panel: Current assignments
- Checkboxes for multi-select
- Visual indication of already-assigned classes
- Remove assignment button (X)

**API Call**:
```typescript
// Assign to multiple classes
await fetch(`/api/assessments/${id}/assign`, {
  method: 'POST',
  body: JSON.stringify({
    assessment_id: id,
    class_ids: ['class-uuid-1', 'class-uuid-2']
  })
});
```

### 4. Viewing Results

**Route**: `/dashboard/teacher/assessments/[id]/results`

**Statistics Cards**:
- Total Assigned (number of students)
- Completed (with completion %)
- Average Score (with min/max)
- Pending (not started + in progress)

**Results Table**:
| Student | Class | Status | Attempts | Best Score | Last Attempt |
|---------|-------|--------|----------|------------|--------------|
| ...     | ...   | ...    | ...      | ...        | ...          |

**Server Load**:
```typescript
export const load = async ({ params, locals }) => {
  const { data: assessment } = await getAssessment(locals.supabase, params.id);
  const { data: results } = await getAssessmentResults(locals.supabase, params.id);
  const { data: statistics } = await getAssessmentStatistics(locals.supabase, params.id);

  return { assessment, results, statistics };
};
```

---

## Student Workflow

### 1. Viewing Assignments

**Route**: `/dashboard/student/assessments`

**Layout**:
- Section: "À faire" (not started + in progress)
- Section: "Terminées" (completed)
- Section: "Expirées" (deadline passed, no attempts)

**AssessmentCard (student variant)**:
```svelte
<AssessmentCard
  assessment={assignment.assessment}
  variant="student"
  assignmentData={assignment}
  onStart={() => handleStart(assignment.id)}
/>
```

Displays:
- Title, grade, description
- Status badge (color-coded)
- Best score (if completed)
- Deadline countdown
- Attempts used (X/Y or X with "unlimited")
- Number of questions
- "Commencer" / "Reprendre" button

### 2. Starting an Assessment

**Validation Before Start**:
```typescript
// API: /api/assessments/[id]/validate-attempt
const validation = await validateAttempt(supabase, assignmentId, studentId);

// Returns:
{
  can_attempt: boolean,
  reason?: string,  // Error message if false
  attempts_remaining: number | null,
  deadline_passed: boolean,
  current_attempts: number
}
```

**Redirect to Test**:
```
/automaths/test?assignment={assignmentId}&mode=interactive
```

### 3. Taking the Assessment

**Test Page**: `/automaths/test`

**Flow**:
1. Parse URL params: `assignment={id}`
2. Validate attempt via API
3. Fetch assessment data
4. Generate question instances from categories
5. Run interactive test mode
6. Save results with `assignment_id`

**TestInteractive Component**:
```svelte
<TestInteractive
  session={testSession}
  onComplete={handleTestComplete}
  assignmentId={assignmentId}
  assessmentTitle={assessmentTitle}
/>
```

**Save Results**:
```typescript
await fetch('/api/tests/save', {
  method: 'POST',
  body: JSON.stringify({
    result: testResult,
    categories: testSession.categories,
    assignmentId: assignmentId  // Links to assessment_assignment
  })
});
```

### 4. Viewing Results

**Route**: `/dashboard/student/assessments/[id]/results`

**Statistics Cards**:
- Best Score (with percentage)
- Average Score
- Total Attempts (X / max)
- Total Questions

**Attempts History Table**:
| Date | Score | Questions | Duration | Status |
|------|-------|-----------|----------|--------|
| ...  | ...   | ...       | ...      | ...    |

Most recent attempt shown first with "Plus récent" badge.

---

## API Reference

### Assessments CRUD

#### `POST /api/assessments`
Create a new assessment.

**Body**:
```typescript
{
  title: string,
  grade: string,
  description?: string,
  categories: CartItem[],
  settings: AssessmentSettings,
  status: 'draft' | 'published'
}
```

**Response**: `{ assessment: DbAssessment }`

#### `GET /api/assessments/[id]`
Get single assessment by ID.

**Response**: `{ assessment: DbAssessment }`

#### `PUT /api/assessments/[id]`
Update assessment (drafts only).

**Body**: `UpdateAssessmentData` (partial)

**Response**: `{ assessment: DbAssessment }`

#### `DELETE /api/assessments/[id]`
Archive assessment (soft delete).

**Response**: `{ success: boolean }`

### Assignments

#### `POST /api/assessments/[id]/assign`
Assign assessment to classes/students.

**Body**:
```typescript
{
  assessment_id: string,
  class_ids?: string[],
  student_ids?: string[]
}
```

**Response**: `{ assignments: DbAssessmentAssignment[] }`

#### `GET /api/assessments/[id]/assignments`
Get all assignments for an assessment.

**Response**: `{ assignments: DbAssessmentAssignment[] }`

#### `DELETE /api/assessments/assignments/[assignmentId]`
Remove an assignment.

**Response**: `{ success: boolean }`

### Student Access

#### `GET /api/assessments/assigned`
Get all assessments assigned to current user.

**Response**: `{ assignments: AssignmentWithDetails[] }`

### Validation

#### `POST /api/assessments/[id]/validate-attempt`
Validate if student can start a new attempt.

**Response**: `{ validation: AttemptValidation }`

```typescript
interface AttemptValidation {
  can_attempt: boolean;
  reason?: string;
  attempts_remaining: number | null;
  deadline_passed: boolean;
  current_attempts: number;
}
```

### Results

#### `GET /api/assessments/[id]/results`
Get all results for an assessment (teacher only).

**Response**: `{ results: DbAssessmentResult[] }`

#### `GET /api/assessments/[id]/statistics`
Get aggregated statistics.

**Response**: `{ statistics: AssessmentStatistics }`

```typescript
interface AssessmentStatistics {
  assessment_id: string;
  total_assigned: number;
  not_started: number;
  in_progress: number;
  completed: number;
  expired: number;
  average_score: number | null;
  min_score: number | null;
  max_score: number | null;
  completion_rate: number;
}
```

---

## Components

### `AssessmentCard.svelte`

Displays assessment information in card format.

**Location**: `src/lib/components/assessments/AssessmentCard.svelte`

**Props**:
```typescript
interface Props {
  assessment: DbAssessment;
  variant: 'teacher' | 'student';
  assignmentData?: AssignmentWithDetails;  // For student view

  // Teacher callbacks
  onEdit?: () => void;
  onAssign?: () => void;
  onViewResults?: () => void;

  // Student callbacks
  onStart?: () => void;
}
```

**Variants**:

**Teacher View**:
- Status badge (Draft/Published/Archived)
- Grade badge
- Categories count
- Deadline, max attempts info
- Action buttons: Edit (draft) | Assign + Results (published)

**Student View**:
- Status badge (Not Started/In Progress/Completed/Expired)
- Grade badge
- Best score display (large, centered)
- Deadline countdown
- Attempts counter
- Questions count
- Action button: Start/Resume (active) | View Results (completed)

### `AssessmentConfigForm.svelte`

Form for configuring assessment settings.

**Location**: `src/lib/components/assessments/AssessmentConfigForm.svelte`

**Props**:
```typescript
interface Props {
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  onCancel?: () => void;
  submitLabel?: string;  // Default: "Créer"
}

interface FormData {
  title: string;
  grade: string;
  description: string;
  settings: AssessmentSettings;
}
```

**Features**:
- Client-side validation
- Grade level dropdown (Shadcn Select with proper binding)
- Optional numeric inputs (converts minutes to seconds for time_limit)
- Datetime-local input for deadline (min = now)
- Checkbox for shuffle setting
- Error display per field

**Important Implementation Note**:
The Select component requires special handling in Svelte 5:

```svelte
<script>
let gradeSelected = $state<{ value: string; label: string }>({
  value: initialData?.grade || '6ème',
  label: initialData?.grade || '6ème'
});

let grade = $state(initialData?.grade || '6ème');
</script>

<Select.Root
  selected={gradeSelected}
  onSelectedChange={(v) => {
    if (v) {
      gradeSelected = v;
      grade = v.value;
    }
  }}
>
  <!-- ... -->
</Select.Root>
```

---

## Server Functions

**Location**: `src/lib/server/assessments.ts`

### CRUD Operations

```typescript
// Create
createAssessment(supabase, data: CreateAssessmentData, userId: string)
  → { data: DbAssessment | null, error: Error | null }

// Read
getAssessment(supabase, assessmentId: string)
  → { data: DbAssessment | null, error: Error | null }

getTeacherAssessments(supabase, teacherId: string, status?: string)
  → { data: AssessmentWithCreator[] | null, error: Error | null }

// Update
updateAssessment(supabase, assessmentId: string, data: UpdateAssessmentData, userId: string)
  → { data: DbAssessment | null, error: Error | null }

publishAssessment(supabase, assessmentId: string, userId: string)
  → { data: DbAssessment | null, error: Error | null }

archiveAssessment(supabase, assessmentId: string, userId: string)
  → { data: DbAssessment | null, error: Error | null }

// Delete (soft - archives instead)
deleteAssessment(supabase, assessmentId: string, userId: string)
  → { data: DbAssessment | null, error: Error | null }
```

### Assignment Management

```typescript
// Assign to classes/students
assignAssessment(supabase, data: AssignAssessmentData, teacherId: string)
  → { data: DbAssessmentAssignment[] | null, error: Error | null }

// Get assignments
getAssessmentAssignments(supabase, assessmentId: string)
  → { data: DbAssessmentAssignment[] | null, error: Error | null }

// Remove assignment
removeAssignment(supabase, assignmentId: string, teacherId: string)
  → { error: Error | null }

// Get student assignments
getStudentAssignments(supabase, studentId: string)
  → { data: AssignmentWithDetails[] | null, error: Error | null }
```

### Attempt Validation

```typescript
validateAttempt(supabase, assignmentId: string, studentId: string)
  → AttemptValidation

interface AttemptValidation {
  can_attempt: boolean;
  reason?: string;
  attempts_remaining: number | null;
  deadline_passed: boolean;
  current_attempts: number;
}
```

**Logic**:
1. Check deadline not passed
2. Count existing attempts
3. Check max_attempts not exceeded
4. Return validation result

### Results & Statistics

```typescript
// Get all results for teacher view
getAssessmentResults(supabase, assessmentId: string)
  → { data: DbAssessmentResult[] | null, error: Error | null }

// Get aggregated statistics
getAssessmentStatistics(supabase, assessmentId: string)
  → { data: AssessmentStatistics | null, error: Error | null }

// Get per-class statistics
getClassStatistics(supabase, assessmentId: string)
  → { data: ClassAssessmentStatistics[] | null, error: Error | null }
```

---

## Integration Points

### 1. Question Cart Integration

**File**: `src/lib/stores/questionCart.svelte.ts`

The assessment system reuses the existing question cart:

```typescript
import { questionCart } from '$lib/stores/questionCart.svelte';

// In assessment creation:
const categories = questionCart.allItems;  // CartItem[]
const totalQuestions = questionCart.totalInstances;
```

**CartItem Structure**:
```typescript
interface CartItem {
  category: {
    theme: string;
    domain: string;
    subdomain: string | null;
    level: string;
  };
  quantity: number;  // How many questions
  delay: number;     // Seconds per question
}
```

### 2. Test System Integration

**File**: `src/routes/(public)/automaths/test/+page.svelte`

**Assignment Mode**:
```typescript
// URL: /automaths/test?assignment={id}&mode=interactive

// Initialize test from assignment
const assignmentParam = url.searchParams.get('assignment');

if (assignmentParam) {
  // 1. Validate attempt
  const validation = await fetch(`/api/assessments/${assignmentParam}/validate-attempt`);

  if (!validation.can_attempt) {
    throw new Error(validation.reason);
  }

  // 2. Fetch assessment
  const assessment = await fetch(`/api/assessments/${assignmentParam}`);

  // 3. Generate instances from categories
  const instances = await generateInstancesFromCategories(assessment.categories);

  // 4. Create test session
  testSession = {
    mode: 'interactive',
    categories: assessment.categories,
    instances,
    // ... other fields
  };
}
```

**Save Results**:
```typescript
// In handleTestComplete()
await fetch('/api/tests/save', {
  method: 'POST',
  body: JSON.stringify({
    result: testResult,
    categories: testSession.categories,
    assignmentId: assignmentId  // KEY: Links to assignment
  })
});
```

**File**: `src/routes/api/tests/save/+server.ts`

```typescript
export const POST: RequestHandler = async ({ request, locals }) => {
  const { result, categories, assignmentId } = await request.json();

  const { data: testSession } = await supabase
    .from('test_sessions')
    .insert({
      user_id: session.user.id,
      mode: result.mode,
      categories: categories,
      score: result.score,
      // ... other fields
      assignment_id: assignmentId || null  // KEY: Store assignment link
    });

  // ... save answers
};
```

### 3. TestInteractive Component

**File**: `src/lib/components/test/TestInteractive.svelte`

**Props Added**:
```typescript
interface Props {
  session: TestSession;
  onComplete: (result: TestResult) => void;
  onBack: () => void;
  assignmentId?: string;       // NEW: If present, this is graded
  assessmentTitle?: string;    // NEW: Display title
}
```

**UI Changes**:
```svelte
<h1 class="text-2xl font-bold">
  {#if assignmentId && assessmentTitle}
    Évaluation: {assessmentTitle}
  {:else}
    Mode Quiz
  {/if}
</h1>
```

---

## Development Guide

### Adding New Assessment Features

#### 1. Adding a New Setting

**Example**: Add "require_passing_score" setting

**Step 1**: Update type definition
```typescript
// src/lib/types/assessment.ts
export interface AssessmentSettings {
  max_attempts: number | null;
  time_limit: number | null;
  deadline: string | null;
  shuffle_questions: boolean;
  require_passing_score: boolean;  // NEW
  passing_score?: number;          // NEW (only if required)
}
```

**Step 2**: Update form component
```svelte
<!-- src/lib/components/assessments/AssessmentConfigForm.svelte -->
<div class="flex items-center space-x-2">
  <Checkbox id="requirePassing" bind:checked={requirePassingScore} />
  <Label for="requirePassing">Exiger une note minimale</Label>
</div>

{#if requirePassingScore}
  <Input
    type="number"
    bind:value={passingScore}
    min="0"
    max="10"
    step="0.5"
  />
{/if}
```

**Step 3**: Update database default
```sql
-- In next migration
ALTER TABLE assessments
ALTER COLUMN settings
SET DEFAULT '{
  "max_attempts": null,
  "time_limit": null,
  "deadline": null,
  "shuffle_questions": true,
  "require_passing_score": false
}'::jsonb;
```

**Step 4**: Update validation logic
```typescript
// src/lib/server/assessments.ts
export async function validateAttempt(...): AttemptValidation {
  // ... existing checks

  if (settings.require_passing_score && settings.passing_score) {
    // Check if student already met passing score
    const hasPassed = attempts.some(a => a.score >= settings.passing_score);
    if (hasPassed && attemptsRemaining === 0) {
      return {
        can_attempt: false,
        reason: 'Note minimale déjà obtenue'
        // ...
      };
    }
  }
}
```

#### 2. Adding New Result Metrics

**Example**: Track time per question average

**Step 1**: Update view
```sql
-- Add to assessment_results view
CREATE OR REPLACE VIEW assessment_results AS
SELECT
  -- ... existing fields
  AVG(ta.time_spent) as avg_time_per_question  -- NEW
FROM assessment_assignments aa
LEFT JOIN test_sessions ts ON ...
LEFT JOIN test_answers ta ON ta.test_session_id = ts.id  -- NEW
GROUP BY ...;
```

**Step 2**: Update type
```typescript
// src/lib/types/assessment.ts
export interface DbAssessmentResult {
  // ... existing fields
  avg_time_per_question: number | null;  // NEW
}
```

**Step 3**: Display in results table
```svelte
<!-- src/routes/.../results/+page.svelte -->
<Table.Head>Temps/Question</Table.Head>

<Table.Cell>
  {result.avg_time_per_question
    ? `${Math.round(result.avg_time_per_question)}s`
    : '-'}
</Table.Cell>
```

### Testing Checklist

**Teacher Flow**:
- [ ] Create assessment (all settings combinations)
- [ ] Edit draft assessment
- [ ] Cannot edit published assessment
- [ ] Publish assessment
- [ ] Assign to single class
- [ ] Assign to multiple classes
- [ ] Remove assignment
- [ ] View results (empty, partial, complete)
- [ ] Statistics calculation correct

**Student Flow**:
- [ ] View assigned assessment
- [ ] Deadline countdown displays correctly
- [ ] Attempts counter accurate
- [ ] Cannot start if deadline passed
- [ ] Cannot start if max attempts reached
- [ ] Complete assessment
- [ ] Score saved correctly
- [ ] View results page
- [ ] Attempt history accurate

**Edge Cases**:
- [ ] Student in multiple classes, same assessment assigned to both
- [ ] Assignment removed mid-attempt
- [ ] Deadline passes while taking test
- [ ] Max attempts = 0 (should prevent creation)
- [ ] Time limit = 0 (should prevent creation)
- [ ] Assessment deleted with existing assignments

### Common Pitfalls

#### 1. Svelte 5 Select Component Binding

❌ **Wrong**:
```svelte
<Select.Root bind:selected={grade}>
  <!-- This won't work in Svelte 5 -->
</Select.Root>
```

✅ **Correct**:
```svelte
let gradeSelected = $state({ value: grade, label: grade });

<Select.Root
  selected={gradeSelected}
  onSelectedChange={(v) => {
    if (v) {
      gradeSelected = v;
      grade = v.value;
    }
  }}
>
```

#### 2. Assignment ID vs Assessment ID

Make sure to distinguish:
- `assessment_id` - The assessment template
- `assignment_id` - Specific assignment to class/student

When saving test results, use `assignment_id`, not `assessment_id`.

#### 3. Time Conversion

Form shows minutes, database stores seconds:
```typescript
// Form → Database
const timeLimitSeconds = timeLimitMinutes * 60;

// Database → Form
const timeLimitMinutes = timeLimitSeconds / 60;
```

#### 4. RLS Policies

Students can view assessments only if:
- Assessment is published (status = 'published')
- AND assignment exists for them (direct or via class)

Always check both conditions.

---

## Related Files

### Documentation
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Complete schema documentation
- **[CLAUDE.md](CLAUDE.md)** - Core project guidelines
- **[CLAUDE_FEATURES_QUESTION_BANK.md](CLAUDE_FEATURES_QUESTION_BANK.md)** - Question bank system

### Implementation Files
- **Migration**: `supabase/migrations/082_create_assessment_system.sql`
- **Types**: `src/lib/types/assessment.ts`
- **Server**: `src/lib/server/assessments.ts`
- **API**: `src/routes/api/assessments/**/*`
- **Teacher Pages**: `src/routes/(protected)/dashboard/teacher/assessments/**/*`
- **Student Pages**: `src/routes/(protected)/dashboard/student/assessments/**/*`
- **Components**: `src/lib/components/assessments/**/*`

---

**Last Updated**: October 2025
**Status**: ✅ Fully Implemented and Tested
