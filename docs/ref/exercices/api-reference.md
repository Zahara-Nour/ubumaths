# Exercises System - API Reference

> **Last Updated**: 2025-12-21
>
> **Related**: [Index](./index.md) | [Database Schema](./database-schema.md) | [Types](./types.md)

---

## Table of Contents

- [Overview](#overview)
- [Exercise CRUD](#exercise-crud)
- [Assignment Operations](#assignment-operations)
- [Completion Tracking](#completion-tracking)
- [Statistics](#statistics)
- [Import/Export](#importexport)
- [Server Functions](#server-functions)

---

## Overview

All exercise endpoints require authentication. Teachers can create/manage exercises; students can view assigned exercises and track completion.

### Base URL

```
/api/exercises
```

### Common Response Format

```typescript
// Success
{ data: T, error: null }

// Error
{ data: null, error: string }
```

### Authentication

All endpoints require a valid session cookie. Role-based access:

- **Teacher**: Full CRUD on own exercises, create assignments
- **Student**: Read assigned exercises, manage own completions

---

## Exercise CRUD

### GET /api/exercises

List exercises with optional filters and pagination.

**Query Parameters**:

| Parameter       | Type       | Description                            |
| --------------- | ---------- | -------------------------------------- |
| `difficulty`    | `1\|2\|3`  | Filter by difficulty                   |
| `tags`          | `string[]` | Filter by tags (comma-separated)       |
| `topic`         | `string`   | Filter by topic                        |
| `grade_levels`  | `string[]` | Filter by grade levels                 |
| `search`        | `string`   | Full-text search (French)              |
| `parameterized` | `boolean`  | Filter by has variables                |
| `page`          | `number`   | Page number (default: 1)               |
| `limit`         | `number`   | Items per page (default: 50, max: 100) |

**Response**:

```typescript
{
  data: Exercise[],
  count: number,
  page: number,
  limit: number,
  totalPages: number
}
```

**Example**:

```bash
GET /api/exercises?difficulty=2&tags=algebra,equations&page=1&limit=20
```

---

### POST /api/exercises

Create a new exercise. Teacher only.

**Request Body**:

```typescript
{
  title?: string,
  slug?: string,          // Auto-generated if not provided (topic-nanoid format)
  source?: string,
  difficulty: 1 | 2 | 3,
  tags?: string[],
  grade_levels?: string[],
  topic?: string,
  statement_md: string,   // Required
  solution_md: string,    // Required
  variables?: Variable[],
  distribution_mode?: 'on_demand' | 'per_student' | 'per_group',
  is_public?: boolean,
  resources?: ExerciseResource[]  // Supplementary materials (max 20)
}
```

**Response**:

```typescript
{ data: Exercise, error: null }
```

**Example**:

```typescript
// Static exercise
POST /api/exercises
{
  "title": "Theoreme de Pythagore",
  "difficulty": 2,
  "tags": ["geometrie", "pythagore"],
  "grade_levels": ["3"],
  "statement_md": "Dans un triangle rectangle ABC...",
  "solution_md": "En utilisant $c^2 = a^2 + b^2$..."
}

// Parameterized exercise
POST /api/exercises
{
  "title": "Calcul addition",
  "difficulty": 1,
  "variables": [
    { "name": "a", "expression": "{{1..20}}" },
    { "name": "b", "expression": "{{1..20}}" }
  ],
  "statement_md": "Calculer ${{a}} + {{b}}$",
  "solution_md": "{{a}} + {{b}} = {{eval:a+b}}",
  "distribution_mode": "on_demand"
}
```

---

### GET /api/exercises/[id]

Get a single exercise by ID.

**Response**:

```typescript
{ data: Exercise, error: null }
```

**Access Control**:

- Teacher: Can access own exercises
- Student: Can access if assigned or public

---

### GET /api/exercises/by-slug/[slug]

Get a single exercise by URL slug. Public access for public exercises.

**Response**:

```typescript
{
	exercise: Exercise;
}
```

**Access Control**:

- Public exercises: Anyone can access
- Private exercises: Only the creator can access

**Example**:

```bash
GET /api/exercises/by-slug/algebre-k8m2n4p7
```

---

### PUT /api/exercises/[id]

Update an exercise. Owner only.

**Request Body**: Same as POST, all fields optional.

**Response**:

```typescript
{ data: Exercise, error: null }
```

---

### DELETE /api/exercises/[id]

Delete an exercise. Owner only.

**Response**:

```typescript
{
	error: null;
}
```

**Side Effects**:

- Cascades to `exercise_assignments` (deleted)
- Triggers image cleanup from Storage

---

## Assignment Operations

### GET /api/exercises/[id]/assign

List assignments for a specific exercise. Teacher only.

**Query Parameters**:

| Parameter   | Type      | Description                  |
| ----------- | --------- | ---------------------------- |
| `is_active` | `boolean` | Filter by active status      |
| `limit`     | `number`  | Items per page (default: 50) |
| `offset`    | `number`  | Pagination offset            |

**Response**:

```typescript
{
  data: ExerciseAssignment[],
  total: number
}
```

---

### POST /api/exercises/[id]/assign

Create assignment(s) for an exercise. Teacher only.

**Request Body (Single)**:

```typescript
{
  assigned_to_type: 'student' | 'class' | 'public',
  student_id?: string,     // Required if type='student'
  class_id?: string,       // Required if type='class'
  optional_deadline?: string,  // ISO 8601
  notes?: string
}
```

**Request Body (Bulk)**:

```typescript
{
  students?: string[],     // Array of student IDs
  classes?: string[],      // Array of class IDs
  make_public?: boolean,   // Create public assignment
  optional_deadline?: string,
  notes?: string
}
```

**Response**:

```typescript
// Single
{ data: ExerciseAssignment, error: null }

// Bulk
{ count: number, error: null }
```

**Example**:

```typescript
// Assign to specific student
POST /api/exercises/ex-123/assign
{
  "assigned_to_type": "student",
  "student_id": "student-456",
  "optional_deadline": "2024-01-20T23:59:59Z",
  "notes": "A faire pour lundi"
}

// Bulk assign to multiple classes
POST /api/exercises/ex-123/assign
{
  "classes": ["class-3eme-a", "class-3eme-b"],
  "optional_deadline": "2024-01-25T23:59:59Z"
}
```

---

### GET /api/exercises/assigned

Get all exercises assigned to current student.

**Query Parameters**:

| Parameter            | Type      | Description                 |
| -------------------- | --------- | --------------------------- |
| `show_completed`     | `boolean` | Include completed exercises |
| `show_assigned_only` | `boolean` | Exclude public exercises    |
| `has_deadline`       | `boolean` | Only with deadlines         |
| `search`             | `string`  | Search in title/statement   |
| `limit`              | `number`  | Items per page              |
| `offset`             | `number`  | Pagination offset           |

**Response**:

```typescript
{
  data: ExerciseWithCompletion[],
  total: number,
  limit: number,
  offset: number,
  hasMore: boolean
}
```

---

### PATCH /api/exercises/assignments/[assignmentId]

Update an assignment. Owner only.

**Request Body**:

```typescript
{
  optional_deadline?: string | null,
  notes?: string,
  is_active?: boolean
}
```

---

### DELETE /api/exercises/assignments/[assignmentId]

Delete or deactivate an assignment. Owner only.

**Query Parameters**:

| Parameter | Type      | Description                               |
| --------- | --------- | ----------------------------------------- |
| `hard`    | `boolean` | Permanently delete (default: soft delete) |

---

## Completion Tracking

### POST /api/exercises/[id]/view

Record that student viewed an exercise.

**Behavior**:

- Creates completion record if first view
- Increments `view_count` if existing
- Updates `last_viewed_at` timestamp

**Response**:

```typescript
{
  data: {
    view_count: number,
    last_viewed_at: string,
    completed_at: string | null
  },
  error: null
}
```

---

### POST /api/exercises/[id]/complete

Mark exercise as completed.

**Response**:

```typescript
{
  data: {
    completed_at: string,
    view_count: number
  },
  error: null
}
```

---

### DELETE /api/exercises/[id]/complete

Unmark completion (mark as incomplete).

**Response**:

```typescript
{
  data: {
    completed_at: null,
    view_count: number
  },
  error: null
}
```

---

## Statistics

### GET /api/exercises/[id]/stats

Get completion statistics for an exercise. Teacher only.

**Response**:

```typescript
{
  data: {
    exercise_id: string,
    total_assigned: number,
    total_viewed: number,
    total_completed: number,
    completion_rate: number,    // 0-100
    average_view_count: number
  }
}
```

---

### GET /api/exercises/assignments/stats

Get aggregate assignment statistics for current teacher.

**Response**:

```typescript
{
  data: {
    total_assignments: number,
    active_assignments: number,
    student_assignments: number,
    class_assignments: number,
    public_assignments: number,
    total_completions: number,
    unique_students_engaged: number
  }
}
```

---

## Utility Endpoints

### POST /api/exercises/generate-slug

Generate a unique URL slug for an exercise. Teacher only.

**Request Body**:

```typescript
{
  topic?: string,      // Topic to use as prefix
  title?: string       // Title for slug generation (fallback)
}
```

**Response**:

```typescript
{
	slug: string; // Generated slug (e.g., "algebre-k8m2n4p7")
}
```

---

### POST /api/exercises/images

Upload an image for an exercise. Teacher only.

**Request Body**: `multipart/form-data` with:

| Field        | Type   | Description            |
| ------------ | ------ | ---------------------- |
| `file`       | File   | Image file to upload   |
| `exerciseId` | string | Exercise ID (optional) |

**Response**:

```typescript
{
  url: string,         // Public URL of uploaded image
  path: string         // Storage path
}
```

**Storage**: Images are stored in `exercise-images` bucket organized by `userId/exerciseId/`.

---

## Import/Export

### POST /api/exercises/import

Import exercises from JSON or Markdown.

**Request Body**:

```typescript
{
  format: 'json' | 'markdown',
  content: string,              // File content
  onDuplicate: 'skip' | 'replace' | 'create-copy'
}
```

**Response**:

```typescript
{
  data: {
    imported: number,
    skipped: number,
    failed: number,
    importedIds: string[],
    errors: Array<{ index: number, title?: string, error: string }>
  }
}
```

---

### GET /api/exercises/[id]/export

Export single exercise.

**Query Parameters**:

| Parameter         | Type             | Description                      |
| ----------------- | ---------------- | -------------------------------- |
| `format`          | `json\|markdown` | Export format                    |
| `includeSolution` | `boolean`        | Include solution (default: true) |

**Response**: File download with appropriate content-type.

---

### GET /api/exercises/export

Export multiple exercises.

**Query Parameters**:

| Parameter | Type                  | Description                    |
| --------- | --------------------- | ------------------------------ |
| `ids`     | `string[]`            | Exercise IDs (comma-separated) |
| `format`  | `json\|markdown\|zip` | Export format                  |

---

## Server Functions

These functions are used internally by API routes and can also be imported directly for server-side use.

### Location

```typescript
import { ... } from '$lib/server/exercises';
import { ... } from '$lib/server/exercise-assignments';
```

### Core Functions

#### exercises.ts

| Function                                                                | Description                 |
| ----------------------------------------------------------------------- | --------------------------- |
| `getExercises(supabase, filters, pagination)`                           | List exercises with filters |
| `getExercise(supabase, id)`                                             | Get single exercise by ID   |
| `getExerciseBySlug(supabase, slug)`                                     | Get single exercise by slug |
| `createExercise(supabase, data, userId)`                                | Create exercise             |
| `updateExercise(supabase, id, updates, userId)`                         | Update exercise             |
| `deleteExercise(supabase, id, userId)`                                  | Delete exercise             |
| `getTeacherExercises(supabase, teacherId, filters, pagination)`         | Teacher's exercises         |
| `generateExerciseInstanceServer(supabase, exerciseId, userId, options)` | Generate instance           |
| `isExerciseParameterizedServer(supabase, exerciseId)`                   | Check if parameterized      |

#### exercise-assignments.ts

| Function                                                                | Description               |
| ----------------------------------------------------------------------- | ------------------------- |
| `createExerciseAssignment(supabase, data, userId)`                      | Create single assignment  |
| `createBulkAssignments(supabase, data, userId)`                         | Bulk create assignments   |
| `getAssignmentsForExercise(supabase, exerciseId, filters, pagination)`  | Teacher view              |
| `getAssignmentsForStudent(supabase, studentId, filters, pagination)`    | Student view              |
| `updateAssignment(supabase, assignmentId, updates, userId)`             | Update assignment         |
| `deleteAssignment(supabase, assignmentId, userId, hard)`                | Delete assignment         |
| `markExerciseAsViewed(supabase, exerciseId, studentId, assignmentId)`   | Record view               |
| `markExerciseAsComplete(supabase, exerciseId, studentId, assignmentId)` | Mark complete             |
| `markExerciseAsIncomplete(supabase, exerciseId, studentId)`             | Unmark complete           |
| `getAssignmentStats(supabase, teacherId)`                               | Teacher statistics        |
| `getExerciseCompletionStats(supabase, exerciseId)`                      | Exercise statistics       |
| `studentHasAccess(supabase, exerciseId, studentId)`                     | Check access              |
| `getStudentCompletion(supabase, exerciseId, studentId)`                 | Get completion record     |
| `getStudentProgress(supabase, studentId)`                               | Get student metrics       |
| `getAccessibleExercises(supabase, studentId)`                           | List accessible exercises |
| `getStudentClasses(supabase, studentId)`                                | Get student's classes     |

### Usage Example

```typescript
// In +page.server.ts
import { getAssignmentsForStudent } from '$lib/server/exercise-assignments';

export async function load({ locals }) {
	const { data: exercises } = await getAssignmentsForStudent(
		locals.supabase,
		locals.user.id,
		{ show_completed: false },
		{ limit: 20, offset: 0 }
	);

	return { exercises: exercises.data };
}
```

---

## Error Codes

| Status | Message              | Cause                      |
| ------ | -------------------- | -------------------------- |
| 400    | Validation error     | Invalid request body       |
| 401    | Unauthorized         | Not authenticated          |
| 403    | Not authorized       | Not owner of exercise      |
| 404    | Exercise not found   | Invalid ID                 |
| 409    | Duplicate assignment | Already assigned to target |

---

## Rate Limits

No explicit rate limits are enforced at the API level. Supabase connection pooling handles load.

**Recommended Client Behavior**:

- Debounce search inputs (300ms)
- Cache public exercise lists (5 minutes)
- Use pagination for large lists
