# Python Notebooks Migration Summary

**Created:** 2025-12-06
**Migration File:** `supabase/migrations/20251206020000_create_python_notebooks.sql`

## Overview

This migration creates database tables for Jupyter-like Python notebooks with multi-cell execution support. Students can view and interact with notebooks shared by their teachers.

---

## Tables Created

### 1. `python_notebooks`

Stores notebook definitions with cells, execution state, and metadata.

| Column        | Type        | Description                                    |
| ------------- | ----------- | ---------------------------------------------- |
| `id`          | UUID        | Primary key                                    |
| `title`       | TEXT        | Notebook title (required)                      |
| `description` | TEXT        | Optional description                           |
| `content`     | JSONB       | Cells array, metadata, execution state         |
| `author_id`   | UUID        | FK to profiles.id (ON DELETE CASCADE)          |
| `is_public`   | BOOLEAN     | Default false (visible to all teachers if set) |
| `created_at`  | TIMESTAMPTZ | Auto-set on creation                           |
| `updated_at`  | TIMESTAMPTZ | Auto-updated by trigger                        |

**Constraints:**

- `valid_content_structure`: Ensures JSONB has required fields (version, metadata, cells)
- 50 notebook limit per user (enforced by trigger)

**Indexes:**

- `idx_python_notebooks_author_id` - Filter by owner
- `idx_python_notebooks_is_public` - Partial index for public notebooks
- `idx_python_notebooks_created_at` - Sort by creation date (DESC)
- `idx_python_notebooks_updated_at` - Sort by modification date (DESC)
- `idx_python_notebooks_content` - GIN index for JSONB queries

---

### 2. `python_notebook_assignments`

Assigns notebooks to classes (students get readonly access).

| Column        | Type        | Description                           |
| ------------- | ----------- | ------------------------------------- |
| `id`          | UUID        | Primary key                           |
| `notebook_id` | UUID        | FK to python_notebooks.id (CASCADE)   |
| `class_id`    | UUID        | FK to classes.id (CASCADE)            |
| `shared_by`   | UUID        | FK to profiles.id (CASCADE)           |
| `readonly`    | BOOLEAN     | Default true (students can only read) |
| `created_at`  | TIMESTAMPTZ | Auto-set on creation                  |

**Constraints:**

- `UNIQUE(notebook_id, class_id)` - One notebook shared once per class

**Indexes:**

- `idx_python_notebook_assignments_notebook_id` - Find assignments for a notebook
- `idx_python_notebook_assignments_class_id` - Find assignments for a class
- `idx_python_notebook_assignments_shared_by` - Find teacher's assignments

---

## JSONB Content Structure

```jsonb
{
  "version": "1.0",
  "metadata": {
    "title": "Mon notebook",
    "created_at": "2025-12-06T00:00:00Z",
    "updated_at": "2025-12-06T00:00:00Z"
  },
  "cells": [
    {
      "id": "cell-uuid-1",
      "type": "code",
      "source": "print('Hello')",
      "execution_count": 1,
      "outputs": [
        {
          "output_type": "stream",
          "name": "stdout",
          "text": "Hello\n"
        }
      ],
      "state": "success"
    },
    {
      "id": "cell-uuid-2",
      "type": "markdown",
      "source": "# Title\n\nSome text with $\\LaTeX$"
    }
  ]
}
```

### Cell Types

**Code Cell:**

- `id`: UUID
- `type`: "code"
- `source`: Python code string
- `execution_count`: Number (sequential)
- `outputs`: Array of output objects
- `state`: "idle" | "running" | "success" | "error"

**Markdown Cell:**

- `id`: UUID
- `type`: "markdown"
- `source`: Markdown/LaTeX string

### Output Types

1. **Stream:** `{"output_type": "stream", "name": "stdout"|"stderr", "text": "..."}`
2. **Error:** `{"output_type": "error", "ename": "ValueError", "evalue": "...", "traceback": [...]}`
3. **Result:** `{"output_type": "execute_result", "data": {"text/plain": "42"}}`

---

## Security (RLS Policies)

### `python_notebooks` (8 policies)

**SELECT (5 policies):**

1. Users read own notebooks
2. Teachers read public notebooks
3. Teachers read student notebooks (via `is_teacher_of_student()`)
4. Students read assigned notebooks (via `is_notebook_assigned_to_student()`)
5. Admins read all

**INSERT (1 policy):**

- Users insert own notebooks (50 limit enforced)

**UPDATE (1 policy):**

- Users update own notebooks

**DELETE (1 policy):**

- Users delete own notebooks

---

### `python_notebook_assignments` (6 policies)

**SELECT (3 policies):**

1. Teachers view own assignments
2. Students view class assignments (via `is_student_in_class()`)
3. Admins view all

**INSERT (1 policy):**

- Teachers assign their notebooks to their classes

**UPDATE (1 policy):**

- Teachers update own assignments

**DELETE (1 policy):**

- Teachers delete own assignments

---

## Helper Functions

All functions use `SECURITY DEFINER` to avoid RLS recursion.

| Function                              | Purpose                                       |
| ------------------------------------- | --------------------------------------------- |
| `count_user_notebooks(p_user_id)`     | Count notebooks for limit enforcement         |
| `is_notebook_assigned_to_student(id)` | Check if notebook assigned to student's class |

**Reused from `python_files` migration:**

- `is_teacher_of_student(p_student_id)` - Check teacher-student relationship
- `is_student_in_class(p_class_id)` - Check class membership
- `is_teacher_of_class(p_class_id)` - Check class ownership
- `is_admin()` - Check admin role

---

## Triggers

### 1. `python_notebooks_updated_at_trigger`

Auto-updates `updated_at` timestamp on UPDATE.

### 2. `python_notebooks_limit_trigger`

Enforces 50 notebook limit per user (BEFORE INSERT).

---

## Design Decisions

### 1. JSONB for Cell Storage

- **Pro:** Flexible structure, easy to add new cell types, efficient queries with GIN index
- **Con:** No relational integrity for cells (acceptable for this use case)
- **Rationale:** Jupyter notebooks are document-oriented, JSONB matches this model

### 2. 50 Notebook Limit

- Enforced via trigger (database-level guarantee)
- Also checked in RLS INSERT policy
- Returns 999 on function error to prevent inserts

### 3. Readonly Default for Assignments

- Students get read-only access by default
- Future enhancement: Allow teachers to grant execute permissions
- Security: Students cannot modify teacher's original notebooks

### 4. Unique Constraint on Assignments

- One notebook can only be shared once per class
- Prevents duplicate assignments
- Use UPDATE to change `readonly` flag or DELETE+INSERT to reassign

### 5. Cascade Deletes

- Deleting a notebook deletes all assignments (CASCADE)
- Deleting a class deletes assignments (CASCADE)
- Deleting a user deletes their notebooks and assignments (CASCADE)

---

## Integration with Existing Tables

### Dependencies

- `profiles` - User ownership, role checks
- `classes` - Class assignments
- `class_members` - Student membership checks

### Reused Functions

Leverages existing helper functions from `python_files` migration:

- `is_teacher_of_student()`
- `is_student_in_class()`
- `is_teacher_of_class()`
- `is_admin()`

---

## Performance Considerations

### Indexes

- **Author lookup:** Fast filtering by `author_id`
- **Public notebooks:** Partial index for `is_public = TRUE`
- **Temporal queries:** DESC indexes for `created_at` and `updated_at`
- **JSONB queries:** GIN index for metadata searches

### Query Patterns

1. **Teacher dashboard:** "My notebooks" - Uses `idx_python_notebooks_author_id`
2. **Public library:** "Browse public" - Uses `idx_python_notebooks_is_public`
3. **Student view:** "Assigned notebooks" - JOINs with assignments table
4. **Metadata search:** "Find by tag" - Uses GIN index on `content`

---

## Next Steps

### 1. Push Migration

```bash
pnpm db:migrate
```

### 2. Update TypeScript Types

Add to `src/lib/types/database.ts`:

```typescript
export interface PythonNotebook {
	id: string;
	title: string;
	description: string | null;
	content: NotebookContent;
	author_id: string;
	is_public: boolean;
	created_at: string;
	updated_at: string;
}

export interface NotebookContent {
	version: string;
	metadata: {
		title: string;
		created_at: string;
		updated_at: string;
	};
	cells: NotebookCell[];
}

export type NotebookCell = CodeCell | MarkdownCell;

export interface CodeCell {
	id: string;
	type: 'code';
	source: string;
	execution_count: number;
	outputs: CellOutput[];
	state: 'idle' | 'running' | 'success' | 'error';
}

export interface MarkdownCell {
	id: string;
	type: 'markdown';
	source: string;
}

export type CellOutput = StreamOutput | ErrorOutput | ExecuteResultOutput;

export interface StreamOutput {
	output_type: 'stream';
	name: 'stdout' | 'stderr';
	text: string;
}

export interface ErrorOutput {
	output_type: 'error';
	ename: string;
	evalue: string;
	traceback: string[];
}

export interface ExecuteResultOutput {
	output_type: 'execute_result';
	data: {
		'text/plain': string;
	};
}

export interface PythonNotebookAssignment {
	id: string;
	notebook_id: string;
	class_id: string;
	shared_by: string;
	readonly: boolean;
	created_at: string;
}
```

### 3. Update Database Schema Documentation

Add tables to `docs/architecture/database-schema.md`.

### 4. Create Zod Validation Schemas

Add to `src/lib/server/validation/`:

```typescript
// src/lib/server/validation/notebooks.ts
import { z } from 'zod';

export const cellOutputSchema = z.discriminatedUnion('output_type', [
	z.object({
		output_type: z.literal('stream'),
		name: z.enum(['stdout', 'stderr']),
		text: z.string()
	}),
	z.object({
		output_type: z.literal('error'),
		ename: z.string(),
		evalue: z.string(),
		traceback: z.array(z.string())
	}),
	z.object({
		output_type: z.literal('execute_result'),
		data: z.object({
			'text/plain': z.string()
		})
	})
]);

export const codeCellSchema = z.object({
	id: z.string().uuid(),
	type: z.literal('code'),
	source: z.string(),
	execution_count: z.number().int().nonnegative(),
	outputs: z.array(cellOutputSchema),
	state: z.enum(['idle', 'running', 'success', 'error'])
});

export const markdownCellSchema = z.object({
	id: z.string().uuid(),
	type: z.literal('markdown'),
	source: z.string()
});

export const notebookCellSchema = z.discriminatedUnion('type', [
	codeCellSchema,
	markdownCellSchema
]);

export const notebookContentSchema = z.object({
	version: z.string(),
	metadata: z.object({
		title: z.string(),
		created_at: z.string().datetime(),
		updated_at: z.string().datetime()
	}),
	cells: z.array(notebookCellSchema)
});

export const createNotebookSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().max(1000).optional(),
	content: notebookContentSchema,
	is_public: z.boolean().default(false)
});

export const updateNotebookSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().max(1000).optional().nullable(),
	content: notebookContentSchema.optional(),
	is_public: z.boolean().optional()
});

export const assignNotebookSchema = z.object({
	notebook_id: z.string().uuid(),
	class_id: z.string().uuid(),
	readonly: z.boolean().default(true)
});
```

---

## Testing Checklist

### Database Tests

- [ ] Insert notebook with valid content (success)
- [ ] Insert notebook with invalid content (fails constraint)
- [ ] Insert 50th notebook (success)
- [ ] Insert 51st notebook (fails trigger)
- [ ] Update notebook content (updates `updated_at`)
- [ ] Delete notebook (cascades to assignments)

### RLS Tests (Teachers)

- [ ] Teacher reads own notebooks
- [ ] Teacher reads public notebooks
- [ ] Teacher reads student notebooks
- [ ] Teacher inserts notebook (under limit)
- [ ] Teacher updates own notebook
- [ ] Teacher deletes own notebook
- [ ] Teacher assigns own notebook to own class
- [ ] Teacher cannot assign other's notebook
- [ ] Teacher cannot assign to other's class

### RLS Tests (Students)

- [ ] Student reads assigned notebook
- [ ] Student cannot read unassigned notebook
- [ ] Student cannot insert notebook
- [ ] Student cannot update notebook
- [ ] Student cannot delete notebook
- [ ] Student views class assignments
- [ ] Student cannot create assignments

### Edge Cases

- [ ] Notebook with 100 code cells (JSONB size limits)
- [ ] Notebook with large outputs (10MB+)
- [ ] Concurrent notebook creation (50 limit race condition)
- [ ] Deleting class with assignments
- [ ] Deleting teacher with notebooks and assignments

---

## Migration File

**Location:** `/Users/david/Coding/js/ubumaths/supabase/migrations/20251206020000_create_python_notebooks.sql`

**Lines:** 380 (well-documented with comments)

**Sections:**

1. Table definitions (2 tables)
2. Indexes (9 indexes)
3. Helper functions (2 new + 5 reused)
4. RLS policies (14 policies)
5. Triggers (2 triggers)
6. Grants and comments
7. JSONB structure documentation

---

## Summary

This migration provides a solid foundation for Jupyter-like notebooks with:

- Flexible JSONB cell storage
- Secure teacher-student sharing
- 50 notebook limit enforcement
- Efficient querying with proper indexes
- Comprehensive RLS policies
- Auto-updating timestamps
- Cascade deletes for referential integrity

The design follows existing patterns from `python_files` and `python_exercises` migrations, ensuring consistency across the Python feature set.
