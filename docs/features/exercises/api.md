# Exercise Feature - API Reference

> **Last Updated**: 2025-10-27
>
> **Related Documentation**:
>
> - [Main Overview](./README.md)
> - [Architecture](./architecture.md)
> - [Components Reference](./components.md)

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Exercise CRUD Operations](#exercise-crud-operations)
- [Assignment Operations](#assignment-operations)
- [Completion Tracking](#completion-tracking)
- [Analytics & Statistics](#analytics--statistics)
- [Access Control](#access-control)
- [Import/Export](#importexport)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Overview

The Exercise API provides **13 endpoints** for managing exercises, assignments, and completion tracking.

**Base URL**: `/api/exercises`

**All endpoints require authentication** via Supabase session cookie.

### API Conventions

**Request Format**:

- Content-Type: `application/json`
- Uses standard HTTP methods (GET, POST, PUT, DELETE)
- Path parameters in URL: `/api/exercises/[id]`
- Query parameters for filtering: `/api/exercises?search=pythagore`

**Response Format**:

```typescript
// Success response
{
  success: true,
  data: T // Exercise, Assignment, or other data
}

// Error response
{
  success: false,
  error: string // User-friendly error message
}

// Bulk operation response
{
  success: true,
  count: number,
  message: string // e.g., "5 assignment(s) created"
}
```

**HTTP Status Codes**:

- `200 OK`: Successful GET, PUT, DELETE
- `201 Created`: Successful POST (creation)
- `400 Bad Request`: Validation error, malformed request
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not authorized (lacks permission)
- `404 Not Found`: Resource doesn't exist
- `500 Internal Server Error`: Server error

---

## Authentication

All API endpoints require a valid Supabase session. The session cookie is automatically included by the browser.

**Session Validation**:

```typescript
const session = await locals.getSession();
if (!session) {
	return json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

const userId = session.user.id;
```

**Role-Based Access**:

- **Teachers**: Can create, edit, delete their own exercises and assignments
- **Students**: Can view assigned/public exercises, track completion
- **Admins**: Can view all exercises and assignments

---

## Exercise CRUD Operations

### GET /api/exercises

List all exercises accessible by the current user.

**Authorization**: Teacher (own exercises), Student (assigned/public), Admin (all)

**Query Parameters**:

```typescript
{
  search?: string;         // Full-text search
  topic?: string;          // Filter by topic
  difficulty?: '1' | '2' | '3';  // Filter by difficulty
  tags?: string;           // Comma-separated tags
  grade_levels?: string;   // Comma-separated grade levels
  is_public?: boolean;     // Filter public exercises
  page?: number;           // Page number (default: 1)
  limit?: number;          // Items per page (default: 50, max: 100)
}
```

**Response** (200 OK):

```json
{
	"success": true,
	"data": [
		{
			"id": "ex-uuid-123",
			"title": "Théorème de Pythagore",
			"source": "Sésamath 3ème, p. 42",
			"difficulty": "2",
			"tags": ["géométrie", "pythagore"],
			"grade_levels": ["3", "2"],
			"topic": "Géométrie",
			"statement_md": "Dans un triangle rectangle...",
			"solution_md": "En utilisant le théorème...",
			"variables": [
				{ "name": "a", "expression": "{{3-10}}" },
				{ "name": "b", "expression": "{{4-12}}" }
			],
			"distribution_mode": "per_student",
			"is_public": false,
			"created_at": "2024-01-15T10:00:00Z",
			"updated_at": "2024-01-16T14:30:00Z",
			"created_by": "teacher-uuid-456"
		}
	],
	"pagination": {
		"total": 42,
		"page": 1,
		"limit": 50,
		"totalPages": 1
	}
}
```

**Example Requests**:

```bash
# Get all exercises
curl -X GET /api/exercises

# Search for "pythagore"
curl -X GET "/api/exercises?search=pythagore"

# Filter by difficulty and topic
curl -X GET "/api/exercises?difficulty=2&topic=Géométrie"

# Get public exercises only
curl -X GET "/api/exercises?is_public=true"

# Paginate results
curl -X GET "/api/exercises?page=2&limit=20"
```

---

### POST /api/exercises

Create a new exercise.

**Authorization**: Teacher only

**Request Body**:

```json
{
	"title": "Addition Practice",
	"source": "Created by teacher",
	"difficulty": "1",
	"tags": ["arithmetic", "addition"],
	"grade_levels": ["6", "5"],
	"topic": "Algèbre",
	"statement_md": "Calculate ${{a}} + {{b}}$",
	"solution_md": "The answer is ${{eval:a+b}}$",
	"variables": [
		{ "name": "a", "expression": "{{1-20}}" },
		{ "name": "b", "expression": "{{1-20}}" }
	],
	"distribution_mode": "on_demand",
	"is_public": false
}
```

**Response** (201 Created):

```json
{
	"success": true,
	"data": {
		"id": "ex-uuid-789",
		"title": "Addition Practice",
		// ... all fields including generated ones
		"created_at": "2024-01-17T09:00:00Z",
		"updated_at": "2024-01-17T09:00:00Z",
		"created_by": "teacher-uuid-456"
	}
}
```

**Validation Errors** (400 Bad Request):

```json
{
	"success": false,
	"error": "Validation failed: statement_md is required"
}
```

**Example**:

```bash
curl -X POST /api/exercises \
  -H "Content-Type: application/json" \
  -d '{
    "statement_md": "Calculate $2 + 3$",
    "solution_md": "The answer is $5$",
    "difficulty": "1",
    "tags": ["addition"],
    "distribution_mode": "on_demand"
  }'
```

---

### GET /api/exercises/[id]

Get a single exercise by ID.

**Authorization**:

- Teacher: Own exercise
- Student: Assigned or public exercise
- Admin: Any exercise

**Response** (200 OK):

```json
{
	"success": true,
	"data": {
		"id": "ex-uuid-123",
		"title": "Pythagorean Theorem"
		// ... all exercise fields
	}
}
```

**Error Responses**:

- **404 Not Found**: Exercise doesn't exist
  ```json
  { "success": false, "error": "Exercise not found" }
  ```
- **403 Forbidden**: User lacks access
  ```json
  { "success": false, "error": "Not authorized to view this exercise" }
  ```

**Example**:

```bash
curl -X GET /api/exercises/ex-uuid-123
```

---

### PUT /api/exercises/[id]

Update an existing exercise.

**Authorization**: Teacher (owner only)

**Request Body** (all fields optional except those being updated):

```json
{
	"title": "Updated Title",
	"difficulty": "2",
	"tags": ["updated", "tags"],
	"statement_md": "New statement...",
	"variables": [{ "name": "x", "expression": "{{5-15}}" }],
	"distribution_mode": "per_student"
}
```

**Response** (200 OK):

```json
{
	"success": true,
	"data": {
		"id": "ex-uuid-123",
		// ... updated exercise with new updated_at timestamp
		"updated_at": "2024-01-17T10:30:00Z"
	}
}
```

**Error Responses**:

- **403 Forbidden**: Not the owner
- **404 Not Found**: Exercise doesn't exist
- **400 Bad Request**: Validation error

**Example**:

```bash
curl -X PUT /api/exercises/ex-uuid-123 \
  -H "Content-Type: application/json" \
  -d '{ "difficulty": "3", "tags": ["advanced"] }'
```

---

### DELETE /api/exercises/[id]

Delete an exercise.

**Authorization**: Teacher (owner only), Admin

**Response** (200 OK):

```json
{
	"success": true
}
```

**Cascading Behavior**:

- Deletes all related `exercise_assignments` (via FK CASCADE)
- Deletes all related `exercise_completions` (via FK CASCADE)
- Deletes all associated images from Storage (via trigger)

**Error Responses**:

- **403 Forbidden**: Not the owner
- **404 Not Found**: Exercise doesn't exist

**Example**:

```bash
curl -X DELETE /api/exercises/ex-uuid-123
```

---

## Assignment Operations

### POST /api/exercises/[id]/assign

Create assignment(s) for an exercise.

**Authorization**: Teacher (exercise owner only)

**Single Assignment Request**:

```json
{
	"assigned_to_type": "student",
	"student_id": "student-uuid-abc",
	"optional_deadline": "2024-01-20T23:59:59Z",
	"notes": "Complete before next class"
}
```

**Bulk Assignment Request**:

```json
{
	"students": ["student-1", "student-2", "student-3"],
	"classes": ["class-3eme-a", "class-3eme-b"],
	"make_public": true,
	"optional_deadline": "2024-01-25T23:59:59Z",
	"notes": "Homework for week of Jan 15"
}
```

**Response - Single** (201 Created):

```json
{
	"success": true,
	"data": {
		"id": "assign-uuid-456",
		"exercise_id": "ex-uuid-123",
		"assigned_by": "teacher-uuid-789",
		"assigned_to_type": "student",
		"student_id": "student-uuid-abc",
		"class_id": null,
		"assigned_at": "2024-01-15T10:00:00Z",
		"optional_deadline": "2024-01-20T23:59:59Z",
		"notes": "Complete before next class",
		"is_active": true
	}
}
```

**Response - Bulk** (201 Created):

```json
{
	"success": true,
	"count": 7,
	"message": "7 assignment(s) created"
}
```

**Validation Rules**:

- `assigned_to_type = 'student'` requires `student_id`
- `assigned_to_type = 'class'` requires `class_id`
- `assigned_to_type = 'public'` must have neither `student_id` nor `class_id`
- Cannot assign same exercise to same student/class twice (UNIQUE constraint)

**Error Responses**:

- **400 Bad Request**: Validation error
  ```json
  { "success": false, "error": "student_id required for student assignment" }
  ```
- **403 Forbidden**: Not the exercise owner
  ```json
  { "success": false, "error": "Not authorized to assign this exercise" }
  ```
- **409 Conflict**: Duplicate assignment
  ```json
  { "success": false, "error": "Assignment already exists" }
  ```

**Examples**:

```bash
# Assign to single student
curl -X POST /api/exercises/ex-123/assign \
  -H "Content-Type: application/json" \
  -d '{
    "assigned_to_type": "student",
    "student_id": "student-abc",
    "optional_deadline": "2024-01-20T23:59:59Z"
  }'

# Assign to class
curl -X POST /api/exercises/ex-123/assign \
  -H "Content-Type: application/json" \
  -d '{
    "assigned_to_type": "class",
    "class_id": "class-3eme-a"
  }'

# Make public
curl -X POST /api/exercises/ex-123/assign \
  -H "Content-Type: application/json" \
  -d '{
    "assigned_to_type": "public",
    "notes": "Practice exercise for all students"
  }'

# Bulk assign to multiple students and classes
curl -X POST /api/exercises/ex-123/assign \
  -H "Content-Type: application/json" \
  -d '{
    "students": ["student-1", "student-2"],
    "classes": ["class-3eme-a"],
    "optional_deadline": "2024-01-25T23:59:59Z"
  }'
```

---

### GET /api/exercises/assigned

Get all assignments for the current user.

**Authorization**: Teacher (see created assignments), Student (see assigned exercises)

**Query Parameters** (Teacher):

```typescript
{
  exercise_id?: string;           // Filter by exercise
  assigned_to_type?: 'student' | 'class' | 'public';  // Filter by type
  is_active?: boolean;            // Filter by active status
  has_deadline?: boolean;         // Only assignments with deadlines
}
```

**Query Parameters** (Student):

```typescript
{
  show_completed?: boolean;       // Include completed exercises
  show_assigned_only?: boolean;   // Exclude public exercises
  show_public?: boolean;          // Include public exercises
  has_deadline?: boolean;         // Only exercises with deadlines
  search?: string;                // Search in title/content
}
```

**Response - Teacher** (200 OK):

```json
{
	"success": true,
	"data": [
		{
			"id": "assign-123",
			"exercise_id": "ex-456",
			"assigned_by": "teacher-789",
			"assigned_to_type": "class",
			"class_id": "class-3eme-a",
			"assigned_at": "2024-01-15T10:00:00Z",
			"optional_deadline": "2024-01-20T23:59:59Z",
			"notes": "Complete for Friday",
			"is_active": true,

			// From view: assigned_exercises_with_details
			"exercise_title": "Théorème de Pythagore",
			"assigned_to_name": "3ème A",
			"statement_md": "...",
			"distribution_mode": "per_student",
			"difficulty": "2",
			"tags": ["géométrie"]
		}
	]
}
```

**Response - Student** (200 OK):

```json
{
	"success": true,
	"data": [
		{
			// Exercise fields
			"id": "ex-456",
			"title": "Addition Practice",
			"statement_md": "...",
			"solution_md": "...",
			"difficulty": "1",

			// Assignment data (if assigned)
			"assignment": {
				"id": "assign-123",
				"assigned_by": "teacher-789",
				"assigned_at": "2024-01-15T10:00:00Z",
				"optional_deadline": "2024-01-20T23:59:59Z",
				"notes": "Complete this week"
			},

			// Completion data (if started)
			"completion": {
				"id": "complete-789",
				"completed_at": null,
				"last_viewed_at": "2024-01-16T14:30:00Z",
				"view_count": 3
			},

			"is_accessible": true
		}
	]
}
```

**Examples**:

```bash
# Teacher: Get all active class assignments
curl -X GET "/api/exercises/assigned?assigned_to_type=class&is_active=true"

# Student: Get uncompleted assigned exercises
curl -X GET "/api/exercises/assigned?show_completed=false&show_assigned_only=true"
```

---

### PUT /api/exercises/assignments/[assignmentId]

Update an assignment.

**Authorization**: Teacher (assignment creator only)

**Request Body**:

```json
{
	"optional_deadline": "2024-01-25T23:59:59Z",
	"notes": "Updated instructions",
	"is_active": false
}
```

**Response** (200 OK):

```json
{
	"success": true,
	"data": {
		"id": "assign-123",
		// ... updated assignment
		"optional_deadline": "2024-01-25T23:59:59Z",
		"notes": "Updated instructions",
		"is_active": false
	}
}
```

**Error Responses**:

- **403 Forbidden**: Not the assignment creator
- **404 Not Found**: Assignment doesn't exist

**Example**:

```bash
curl -X PUT /api/exercises/assignments/assign-123 \
  -H "Content-Type: application/json" \
  -d '{ "optional_deadline": "2024-02-01T23:59:59Z" }'
```

---

### DELETE /api/exercises/assignments/[assignmentId]

Delete or deactivate an assignment.

**Authorization**: Teacher (assignment creator only)

**Query Parameters**:

```typescript
{
  hard?: boolean;  // true = permanent delete, false = deactivate (default: false)
}
```

**Response** (200 OK):

```json
{
	"success": true
}
```

**Behavior**:

- **Soft Delete** (`hard=false`, default): Sets `is_active = false`, preserves history
- **Hard Delete** (`hard=true`): Permanently removes assignment record
  - Sets `assignment_id = NULL` in `exercise_completions` (preserves completion history)

**Examples**:

```bash
# Soft delete (deactivate)
curl -X DELETE /api/exercises/assignments/assign-123

# Hard delete (permanent)
curl -X DELETE "/api/exercises/assignments/assign-123?hard=true"
```

---

## Completion Tracking

### POST /api/exercises/[id]/view

Record that a student viewed an exercise.

**Authorization**: Student only

**Request Body** (optional):

```json
{
	"assignment_id": "assign-123" // Optional: link view to specific assignment
}
```

**Response** (201 Created or 200 OK):

```json
{
	"success": true,
	"data": {
		"id": "complete-456",
		"exercise_id": "ex-123",
		"assignment_id": "assign-123",
		"student_id": "student-abc",
		"completed_at": null,
		"last_viewed_at": "2024-01-16T14:30:00Z",
		"view_count": 1,
		"created_at": "2024-01-16T14:30:00Z"
	}
}
```

**Behavior**:

- **First View**: Creates new `exercise_completions` record with `view_count = 1`
- **Subsequent Views**: Increments `view_count` and updates `last_viewed_at`

**Example**:

```bash
curl -X POST /api/exercises/ex-123/view \
  -H "Content-Type: application/json" \
  -d '{ "assignment_id": "assign-456" }'
```

---

### POST /api/exercises/[id]/complete

Mark an exercise as completed.

**Authorization**: Student only

**Request Body**: None (empty)

**Response** (200 OK):

```json
{
	"success": true,
	"data": {
		"id": "complete-456",
		"exercise_id": "ex-123",
		"student_id": "student-abc",
		"completed_at": "2024-01-16T15:00:00Z", // Set to NOW
		"last_viewed_at": "2024-01-16T15:00:00Z",
		"view_count": 4,
		"created_at": "2024-01-16T14:30:00Z"
	}
}
```

**Behavior**:

- Sets `completed_at` to current timestamp
- Also increments `view_count` and updates `last_viewed_at`
- If no completion record exists, creates one

**Example**:

```bash
curl -X POST /api/exercises/ex-123/complete
```

---

### POST /api/exercises/[id]/uncomplete

Unmark an exercise as completed (student changed their mind).

**Authorization**: Student only

**Request Body**: None (empty)

**Response** (200 OK):

```json
{
	"success": true,
	"data": {
		"id": "complete-456",
		"exercise_id": "ex-123",
		"student_id": "student-abc",
		"completed_at": null, // Set back to NULL
		"last_viewed_at": "2024-01-16T15:05:00Z",
		"view_count": 5,
		"created_at": "2024-01-16T14:30:00Z"
	}
}
```

**Example**:

```bash
curl -X POST /api/exercises/ex-123/uncomplete
```

---

## Analytics & Statistics

### GET /api/exercises/[id]/stats

Get completion statistics for a specific exercise.

**Authorization**: Teacher (exercise owner only)

**Response** (200 OK):

```json
{
	"success": true,
	"data": {
		"exercise_id": "ex-123",
		"total_assigned": 30, // Number of students with assignments
		"total_viewed": 28, // Students who viewed at least once
		"total_completed": 25, // Students who marked as complete
		"completion_rate": 83.33, // (25/30) * 100
		"average_view_count": 2.4 // Average views per student
	}
}
```

**Example**:

```bash
curl -X GET /api/exercises/ex-123/stats
```

---

## Access Control

### GET /api/exercises/[id]/access

Check if the current user can access an exercise.

**Authorization**: Any authenticated user

**Response** (200 OK):

```json
{
	"success": true,
	"hasAccess": true,
	"reason": "student_assignment" // or "class_assignment", "public_assignment", "is_public", "owner"
}
```

**Response - No Access** (200 OK):

```json
{
	"success": true,
	"hasAccess": false,
	"reason": "no_assignment"
}
```

**Access Reasons**:

- `owner`: User created the exercise (teacher)
- `student_assignment`: Student has direct assignment
- `class_assignment`: Student is in class with assignment
- `public_assignment`: Exercise has public assignment
- `is_public`: Exercise is marked as public
- `no_assignment`: No access route found

**Example**:

```bash
curl -X GET /api/exercises/ex-123/access
```

---

## Import/Export

### POST /api/exercises/import

Import exercises from JSON or Markdown files.

**Authorization**: Teacher only

**Request Body** (multipart/form-data):

```typescript
{
  files: File[];  // Array of .json or .md files
  onDuplicate: 'skip' | 'replace' | 'create-copy';  // Duplicate handling strategy
}
```

**Response** (200 OK):

```json
{
	"success": true,
	"imported": 5,
	"skipped": 2,
	"failed": 1,
	"importedIds": ["ex-1", "ex-2", "ex-3", "ex-4", "ex-5"],
	"errors": [
		{
			"index": 7,
			"title": "Invalid Exercise",
			"error": "Validation failed: statement_md is required"
		}
	]
}
```

**Duplicate Detection**:

- Computes SHA-256 hash of `title + statement_md`
- Checks if hash exists in database
- Applies strategy:
  - `skip`: Don't import duplicate
  - `replace`: Update existing exercise (requires ownership)
  - `create-copy`: Import with "(copie)" suffix

**Example**:

```bash
curl -X POST /api/exercises/import \
  -F "files=@exercises.json" \
  -F "files=@more-exercises.md" \
  -F "onDuplicate=create-copy"
```

---

### GET /api/exercises/export

Export all exercises for the current teacher.

**Authorization**: Teacher only

**Query Parameters**:

```typescript
{
  format: 'json' | 'markdown';
  includeSolution?: boolean;  // Default: true
  prettyPrint?: boolean;      // For JSON, default: true
}
```

**Response** (200 OK):

- Content-Type: `application/json` or `text/markdown`
- Content-Disposition: `attachment; filename="exercises-{timestamp}.{ext}"`
- Body: Exported content

**Example**:

```bash
# Export as JSON
curl -X GET "/api/exercises/export?format=json&prettyPrint=true" \
  -o exercises.json

# Export as Markdown
curl -X GET "/api/exercises/export?format=markdown" \
  -o exercises.md
```

---

### GET /api/exercises/[id]/export

Export a single exercise.

**Authorization**: Teacher (exercise owner)

**Query Parameters**:

```typescript
{
  format: 'json' | 'markdown';
  includeSolution?: boolean;  // Default: true
  prettyPrint?: boolean;      // For JSON, default: true
}
```

**Response**: Same as bulk export

**Example**:

```bash
curl -X GET "/api/exercises/ex-123/export?format=json" \
  -o exercise-pythagore.json
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
	"success": false,
	"error": "User-friendly error message"
}
```

### Common Error Codes

**400 Bad Request** - Validation Error:

```json
{
	"success": false,
	"error": "Validation failed: statement_md is required"
}
```

**401 Unauthorized** - Not Authenticated:

```json
{
	"success": false,
	"error": "Unauthorized"
}
```

**403 Forbidden** - Not Authorized:

```json
{
	"success": false,
	"error": "Not authorized to assign this exercise"
}
```

**404 Not Found** - Resource Not Found:

```json
{
	"success": false,
	"error": "Exercise not found"
}
```

**409 Conflict** - Duplicate Resource:

```json
{
	"success": false,
	"error": "Assignment already exists for this student"
}
```

**500 Internal Server Error** - Server Error:

```json
{
	"success": false,
	"error": "Internal server error"
}
```

### Validation Errors

**Missing Required Fields**:

```json
{
	"success": false,
	"error": "Validation failed: statement_md is required"
}
```

**Invalid Field Values**:

```json
{
	"success": false,
	"error": "Validation failed: difficulty must be 1, 2, or 3"
}
```

**Circular Dependencies in Variables**:

```json
{
	"success": false,
	"error": "Circular dependency detected: a → b → a"
}
```

**Invalid Assignment Target**:

```json
{
	"success": false,
	"error": "student_id required for student assignment"
}
```

---

## Rate Limiting

Currently, no rate limiting is enforced. Future implementation may include:

**Planned Limits**:

- **Exercise Creation**: 100 exercises per hour per teacher
- **Assignment Creation**: 500 assignments per hour per teacher
- **Completion Tracking**: 1000 views per hour per student
- **API Requests**: 1000 requests per hour per user

**Rate Limit Response** (429 Too Many Requests):

```json
{
	"success": false,
	"error": "Rate limit exceeded. Try again in 15 minutes.",
	"retryAfter": 900 // seconds
}
```

---

## Best Practices

### Efficient Querying

**Use Filters to Reduce Payload**:

```bash
# Bad: Fetch all exercises and filter client-side
curl -X GET /api/exercises

# Good: Filter server-side
curl -X GET "/api/exercises?difficulty=2&topic=Géométrie"
```

**Paginate Large Result Sets**:

```bash
# Get first 20 exercises
curl -X GET "/api/exercises?page=1&limit=20"

# Get next 20
curl -X GET "/api/exercises?page=2&limit=20"
```

### Bulk Operations

**Use Bulk Assignment for Efficiency**:

```bash
# Bad: Create 30 individual assignments
for student in students:
  POST /api/exercises/ex-123/assign { "student_id": student }

# Good: Create all in one request
POST /api/exercises/ex-123/assign {
  "students": ["student-1", "student-2", ..., "student-30"]
}
```

### Error Handling

**Always Check Response Status**:

```typescript
const response = await fetch('/api/exercises', { method: 'POST', body: ... });

if (!response.ok) {
  const error = await response.json();
  console.error('API Error:', error.error);
  toaster.error(error.error);
  return;
}

const result = await response.json();
if (!result.success) {
  console.error('Operation Failed:', result.error);
  toaster.error(result.error);
  return;
}

// Success
console.log('Created exercise:', result.data);
```

### Security

**Never Trust Client Input**:

- All validation happens server-side (client validation is for UX only)
- RLS policies enforce access control at database level
- Input sanitization prevents SQL injection

**Use HTTPS**:

- All API requests must use HTTPS in production
- Session cookies have `Secure` and `HttpOnly` flags

---

## Summary

The Exercise API provides **13 endpoints** across 7 categories:

**Exercise CRUD** (5 endpoints):

- `GET /api/exercises` - List exercises
- `POST /api/exercises` - Create exercise
- `GET /api/exercises/[id]` - Get exercise
- `PUT /api/exercises/[id]` - Update exercise
- `DELETE /api/exercises/[id]` - Delete exercise

**Assignment Operations** (3 endpoints):

- `POST /api/exercises/[id]/assign` - Create assignment(s)
- `GET /api/exercises/assigned` - List assignments
- `PUT /api/exercises/assignments/[assignmentId]` - Update assignment
- `DELETE /api/exercises/assignments/[assignmentId]` - Delete assignment

**Completion Tracking** (3 endpoints):

- `POST /api/exercises/[id]/view` - Record view
- `POST /api/exercises/[id]/complete` - Mark complete
- `POST /api/exercises/[id]/uncomplete` - Unmark complete

**Analytics** (1 endpoint):

- `GET /api/exercises/[id]/stats` - Exercise statistics

**Access Control** (1 endpoint):

- `GET /api/exercises/[id]/access` - Check access

**Import/Export** (3 endpoints):

- `POST /api/exercises/import` - Import exercises
- `GET /api/exercises/export` - Export all exercises
- `GET /api/exercises/[id]/export` - Export single exercise

All endpoints:

- ✅ Require authentication
- ✅ Use RLS for authorization
- ✅ Return consistent JSON format
- ✅ Include proper HTTP status codes
- ✅ Validate all inputs server-side
