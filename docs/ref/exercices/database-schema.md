# Exercises System - Database Schema

> **Last Updated**: 2025-12-21
>
> **Related**: [Index](./index.md) | [API Reference](./api-reference.md)

---

## Table of Contents

- [Overview](#overview)
- [Tables](#tables)
  - [exercises](#exercises)
  - [exercise_assignments](#exercise_assignments)
  - [exercise_completions](#exercise_completions)
- [Views](#views)
- [Functions](#functions)
- [Indexes](#indexes)
- [Triggers](#triggers)
- [RLS Policies](#rls-policies)
- [Migration Files](#migration-files)

---

## Overview

The exercises system uses 3 core tables, 1 view, and 4 helper functions.

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│    exercises    │────▶│ exercise_assignments │────▶│ exercise_completions│
│   (templates)   │     │    (who sees what)   │     │  (progress tracking)│
└─────────────────┘     └──────────────────────┘     └─────────────────────┘
        │                         │                           │
        │         ┌───────────────┴───────────────┐          │
        └────────▶│ assigned_exercises_with_details│◀─────────┘
                  │         (VIEW)                 │
                  └────────────────────────────────┘
```

---

## Tables

### exercises

Core exercise storage table. Supports both static and parameterized exercises.

```sql
CREATE TABLE exercises (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,                              -- URL-friendly identifier (topic-nanoid)

  -- Metadata
  title TEXT,                                    -- Optional title
  source TEXT,                                   -- Source reference (book, author)
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 3),
  tags TEXT[],                                   -- Categorization tags
  grade_levels TEXT[],                           -- Target grades ('3', '2', '1_SPE')
  topic TEXT,                                    -- Topic category
  estimated_time_minutes INTEGER,                -- Estimated completion time

  -- Content (markdown with LaTeX)
  statement_md TEXT NOT NULL,                    -- Exercise statement
  solution_md TEXT NOT NULL,                     -- Solution/correction

  -- Supplementary materials
  resources JSONB DEFAULT '[]'::jsonb,           -- Array of {type, url, title, description?}

  -- Parameterization
  variables JSONB,                               -- Variable definitions
  distribution_mode TEXT DEFAULT 'on_demand'
    CHECK (distribution_mode IN ('on_demand', 'per_student', 'per_group')),
  generic_functions TEXT[],                      -- Generic functions used in expressions

  -- Variations (for multi-question exercises)
  variations JSONB,                              -- Array of variation objects
  shared JSONB,                                  -- Shared configuration across variations

  -- Sharing
  is_public BOOLEAN DEFAULT FALSE,              -- Visible in public library

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)       -- Teacher who created
);
```

#### Column Details

| Column                   | Type    | Required | Description                                  |
| ------------------------ | ------- | -------- | -------------------------------------------- |
| `id`                     | UUID    | Auto     | Primary key                                  |
| `slug`                   | TEXT    | No       | URL-friendly identifier (auto-generated)     |
| `title`                  | TEXT    | No       | Display title for organization               |
| `source`                 | TEXT    | No       | Source reference (e.g., "Manuel 3ème, p.45") |
| `difficulty`             | INTEGER | Yes      | 1 (easy), 2 (medium), 3 (hard)               |
| `tags`                   | TEXT[]  | No       | Array of tags for filtering                  |
| `grade_levels`           | TEXT[]  | No       | Grade codes (uses GradeCode system)          |
| `topic`                  | TEXT    | No       | Topic category                               |
| `estimated_time_minutes` | INTEGER | No       | Estimated completion time                    |
| `statement_md`           | TEXT    | Yes      | Markdown with LaTeX and `{{}}` syntax        |
| `solution_md`            | TEXT    | Yes      | Markdown with LaTeX and `{{}}` syntax        |
| `resources`              | JSONB   | No       | Array of supplementary materials             |
| `variables`              | JSONB   | No       | Array of `{ name, expression }` objects      |
| `distribution_mode`      | TEXT    | Yes      | How instances are generated                  |
| `generic_functions`      | TEXT[]  | No       | Generic functions used in expressions        |
| `variations`             | JSONB   | No       | Array of variation objects                   |
| `shared`                 | JSONB   | No       | Shared config across variations              |
| `is_public`              | BOOLEAN | Yes      | Visible to all teachers in library           |
| `created_by`             | UUID    | Yes      | Foreign key to teacher profile               |

#### Resources JSONB Structure

```json
[
	{ "type": "video", "url": "https://youtube.com/...", "title": "Explication vidéo" },
	{ "type": "pdf", "url": "/docs/fiche.pdf", "title": "Fiche méthode" },
	{ "type": "geogebra", "url": "https://geogebra.org/...", "title": "Figure interactive" },
	{
		"type": "link",
		"url": "https://...",
		"title": "Article complémentaire",
		"description": "Pour aller plus loin"
	}
]
```

| Type       | Description                  |
| ---------- | ---------------------------- |
| `video`    | YouTube, Vimeo, etc.         |
| `pdf`      | PDF documents                |
| `link`     | Generic web links            |
| `geogebra` | GeoGebra interactive applets |
| `image`    | Image files                  |

#### Variables JSONB Structure

```json
[
	{ "name": "a", "expression": "{{1..10}}" },
	{ "name": "b", "expression": "{{1..20}}" },
	{ "name": "sum", "expression": "{{eval:a+b}}" }
]
```

---

### exercise_assignments

Tracks which exercises are assigned to whom. Non-graded practice mode.

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
  student_id UUID REFERENCES profiles(id),       -- if type='student'
  class_id UUID REFERENCES classes(id),          -- if type='class'

  -- Configuration
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  optional_deadline TIMESTAMPTZ,                 -- Suggested, not enforced
  notes TEXT,                                    -- Teacher instructions
  is_active BOOLEAN NOT NULL DEFAULT TRUE,       -- Soft delete flag

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

#### Assignment Types

| Type      | student_id | class_id | Description                           |
| --------- | ---------- | -------- | ------------------------------------- |
| `student` | Required   | NULL     | Direct assignment to specific student |
| `class`   | NULL       | Required | Assignment to all students in class   |
| `public`  | NULL       | NULL     | Available to all students             |

#### Important Notes

- This is for **practice mode**, not graded assessments
- No test sessions, no grading, no attempt limits
- Deadline is optional and informational only (not enforced)
- `is_active = false` hides from students (soft delete)

---

### exercise_completions

Tracks student interaction with exercises.

```sql
CREATE TABLE exercise_completions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES exercise_assignments(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES profiles(id),

  -- Completion Tracking
  completed_at TIMESTAMPTZ,                      -- NULL = not completed
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  view_count INTEGER NOT NULL DEFAULT 1 CHECK (view_count >= 1),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_student_completion
    UNIQUE (exercise_id, student_id)
);
```

#### Column Details

| Column           | Type        | Description                       |
| ---------------- | ----------- | --------------------------------- |
| `completed_at`   | TIMESTAMPTZ | NULL until student marks complete |
| `last_viewed_at` | TIMESTAMPTZ | Auto-updated on each view         |
| `view_count`     | INTEGER     | Incremented on each view          |
| `assignment_id`  | UUID        | Can be NULL for public exercises  |

**Key Behavior**: `assignment_id` survives assignment deletion (`ON DELETE SET NULL`) so completion history is preserved.

---

## Views

### assigned_exercises_with_details

Denormalized view for efficient teacher dashboard queries.

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

---

## Functions

### student_has_exercise_access

Checks if a student can access a specific exercise.

```sql
CREATE FUNCTION student_has_exercise_access(
  p_exercise_id UUID,
  p_student_id UUID
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    -- Exercise is public
    SELECT 1 FROM exercises WHERE id = p_exercise_id AND is_public = TRUE
  ) OR EXISTS (
    -- Student has active assignment
    SELECT 1 FROM exercise_assignments ea
    WHERE ea.exercise_id = p_exercise_id AND ea.is_active = TRUE
    AND (
      ea.student_id = p_student_id OR
      ea.class_id IN (
        SELECT class_id FROM class_members WHERE student_id = p_student_id
      ) OR
      ea.assigned_to_type = 'public'
    )
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

**Access Granted If**:

1. `exercises.is_public = TRUE`
2. Direct student assignment
3. Student is in assigned class
4. Public assignment exists

---

### get_student_exercises

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
  difficulty TEXT,
  tags TEXT[],
  grade_levels TEXT[],
  assignment_id UUID,
  assigned_at TIMESTAMPTZ,
  optional_deadline TIMESTAMPTZ,
  notes TEXT,
  completion_id UUID,
  completed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  view_count INTEGER
) AS $$
  -- Complex query with LEFT JOINs and smart ordering
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

**Ordering Priority**:

1. Incomplete assigned exercises (urgent first)
2. Recently viewed exercises
3. Recently assigned exercises

---

### get_teacher_assignment_stats

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
) AS $$ ... $$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

---

### get_assignment_completion_stats

Returns completion statistics for a specific assignment.

```sql
CREATE FUNCTION get_assignment_completion_stats(p_assignment_id UUID)
RETURNS TABLE (
  total_target_students BIGINT,
  students_viewed BIGINT,
  students_completed BIGINT,
  total_views BIGINT,
  avg_views_per_student NUMERIC,
  completion_rate NUMERIC
) AS $$ ... $$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

---

## Indexes

### exercises Table (17 indexes)

```sql
-- URL slug lookup (unique, partial)
CREATE UNIQUE INDEX idx_exercises_slug ON exercises(slug)
WHERE slug IS NOT NULL;

-- Full-text search (French language)
CREATE INDEX idx_exercises_fulltext ON exercises
USING gin(to_tsvector('french',
  coalesce(title, '') || ' ' ||
  coalesce(statement_md, '') || ' ' ||
  coalesce(solution_md, '') || ' ' ||
  coalesce(array_to_string(tags, ' '), '')
));

-- Topic filtering
CREATE INDEX idx_exercises_topic ON exercises(topic)
WHERE topic IS NOT NULL;

-- Creator lookup
CREATE INDEX idx_exercises_created_by ON exercises(created_by);
```

### exercise_assignments Table (11 indexes)

```sql
CREATE INDEX idx_exercise_assignments_exercise ON exercise_assignments(exercise_id);
CREATE INDEX idx_exercise_assignments_student ON exercise_assignments(student_id)
  WHERE student_id IS NOT NULL;
CREATE INDEX idx_exercise_assignments_class ON exercise_assignments(class_id)
  WHERE class_id IS NOT NULL;
CREATE INDEX idx_exercise_assignments_assigned_by ON exercise_assignments(assigned_by);
CREATE INDEX idx_exercise_assignments_type ON exercise_assignments(assigned_to_type);
CREATE INDEX idx_exercise_assignments_active ON exercise_assignments(is_active)
  WHERE is_active = TRUE;
CREATE INDEX idx_exercise_assignments_deadline ON exercise_assignments(optional_deadline)
  WHERE optional_deadline IS NOT NULL;
CREATE INDEX idx_exercise_assignments_teacher_active
  ON exercise_assignments(assigned_by, is_active) WHERE is_active = TRUE;
```

### exercise_completions Table (6 indexes)

```sql
CREATE INDEX idx_exercise_completions_exercise ON exercise_completions(exercise_id);
CREATE INDEX idx_exercise_completions_student ON exercise_completions(student_id);
CREATE INDEX idx_exercise_completions_assignment ON exercise_completions(assignment_id)
  WHERE assignment_id IS NOT NULL;
CREATE INDEX idx_exercise_completions_completed ON exercise_completions(completed_at)
  WHERE completed_at IS NOT NULL;
CREATE INDEX idx_exercise_completions_last_viewed ON exercise_completions(last_viewed_at DESC);
CREATE INDEX idx_exercise_completions_student_completed
  ON exercise_completions(student_id, completed_at) WHERE completed_at IS NOT NULL;
```

**Total**: 34 indexes for optimal query performance.

---

## Triggers

### update_completion_last_viewed

Auto-updates `last_viewed_at` when `view_count` increments.

```sql
CREATE TRIGGER trigger_update_completion_last_viewed
  BEFORE UPDATE ON exercise_completions
  FOR EACH ROW
  WHEN (NEW.view_count > OLD.view_count)
  EXECUTE FUNCTION update_completion_last_viewed();
```

### delete_exercise_images

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

## RLS Policies

### exercises Table

```sql
-- Teachers see their own exercises
CREATE POLICY "Teachers see own exercises" ON exercises FOR SELECT
USING (created_by = auth.uid());

-- Teachers can only modify their own exercises
CREATE POLICY "Teachers manage own exercises" ON exercises FOR ALL
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Students see public exercises or exercises they have access to
CREATE POLICY "Students see accessible exercises" ON exercises FOR SELECT
USING (
  is_public = TRUE OR
  student_has_exercise_access(id, auth.uid())
);
```

### exercise_assignments Table

```sql
-- Teachers see their own assignments
CREATE POLICY "Teachers see own assignments" ON exercise_assignments FOR SELECT
USING (assigned_by = auth.uid());

-- Teachers create assignments for their exercises
CREATE POLICY "Teachers create assignments" ON exercise_assignments FOR INSERT
WITH CHECK (
  assigned_by = auth.uid()
  AND EXISTS (SELECT 1 FROM exercises WHERE id = exercise_id AND created_by = auth.uid())
);

-- Students see assignments targeting them
CREATE POLICY "Students see their assignments" ON exercise_assignments FOR SELECT
USING (
  is_active = TRUE AND (
    student_id = auth.uid() OR
    class_id IN (SELECT class_id FROM class_members WHERE student_id = auth.uid()) OR
    assigned_to_type = 'public'
  )
);
```

### exercise_completions Table

```sql
-- Students manage their own completions
CREATE POLICY "Students manage completions" ON exercise_completions
FOR ALL USING (student_id = auth.uid())
WITH CHECK (
  student_id = auth.uid()
  AND student_has_exercise_access(exercise_id, auth.uid())
);

-- Teachers see completions for their exercises
CREATE POLICY "Teachers see completions" ON exercise_completions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM exercises WHERE id = exercise_id AND created_by = auth.uid()
  )
);
```

---

## Migration Files

| File                                                        | Purpose                             |
| ----------------------------------------------------------- | ----------------------------------- |
| `20251026080000_create_exercises_table.sql`                 | Core `exercises` table              |
| `20251026120000_add_exercise_sharing_and_templates.sql`     | `is_public` and templates           |
| `20251026153000_add_exercise_parameterization.sql`          | `variables` and `distribution_mode` |
| `20251027005912_create_exercise_assignments.sql`            | `exercise_assignments` table        |
| `20251027010000_add_exercise_fulltext_search.sql`           | French FTS index                    |
| `20251027010100_add_exercise_cleanup_triggers.sql`          | Image cleanup trigger               |
| `20251027021000_add_exercise_completion_stats_function.sql` | Statistics functions                |
| `20251031160000_create_exercise_assignments_tables.sql`     | `exercise_completions` + RLS        |
| `20251031160100_cleanup_duplicate_exercise_indexes.sql`     | Index deduplication                 |
| `20251211135028_add_exercise_slug.sql`                      | URL-friendly slug field             |
| `20251211141834_add_exercise_resources.sql`                 | Resources JSONB field               |
