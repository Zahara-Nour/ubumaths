# Database Schema - Cours System

Complete database reference for the chapter system and chapter templates.

> **Migrations**:
>
> - `20251210000000_create_chapter_system.sql` (8 tables, 28 RLS policies)
> - `20251210100000_create_chapter_templates.sql` (3 tables, 16 RLS policies)

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Chapter System Tables](#chapter-system-tables)
3. [Template System Tables](#template-system-tables)
4. [Helper Functions](#helper-functions)
5. [Triggers](#triggers)
6. [RLS Policies Summary](#rls-policies-summary)
7. [Storage Bucket](#storage-bucket)

---

## Schema Overview

### Entity Relationship Diagram

```
                              CHAPTER SYSTEM
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌─────────┐      ┌───────────────┐      ┌────────────────────┐             │
│  │ classes │──1:N─│ class_chapters│──1:N─│ chapter_documents  │             │
│  └─────────┘      └───────────────┘      └────────────────────┘             │
│                          │                                                   │
│                          │──1:N─┌────────────────────────┐                   │
│                          │      │ chapter_quiz_questions │                   │
│                          │      └────────────┬───────────┘                   │
│                          │                   │                               │
│                          │                   │──N:1─┌───────────────────┐    │
│                          │                   │      │ question_templates│    │
│                          │                   │      └───────────────────┘    │
│                          │                   │                               │
│                          │                   │──1:N─┌──────────────────────┐ │
│                          │                   │      │ chapter_quiz_results │ │
│                          │                   │      └──────────────────────┘ │
│                          │                                                   │
│                          │──1:N─┌──────────────────────────┐                 │
│                          │      │ chapter_checklist_items  │                 │
│                          │      └────────────┬─────────────┘                 │
│                          │                   │                               │
│                          │                   │──1:N─┌──────────────────────────┐
│                          │                   │      │ student_checklist_progress│
│                          │                   │      └──────────────────────────┘
│                          │                                                   │
│                          │──1:N─┌──────────────────┐     ┌───────────┐       │
│                          │      │ chapter_exercises│──N:1│ exercises │       │
│                          │      └──────────────────┘     └───────────┘       │
│                          │                                                   │
└──────────────────────────┼───────────────────────────────────────────────────┘
                           │
                           │
                 TEMPLATE SYSTEM
┌──────────────────────────┼───────────────────────────────────────────────────┐
│                          │                                                    │
│                          │──1:1─┌────────────────────────────────┐            │
│                          │      │ chapter_template_instantiations│            │
│                          │      └────────────────┬───────────────┘            │
│                          │                       │                            │
│                          │                       │──N:1                       │
│                          │                       │                            │
│  ┌──────────────────┐    │      ┌────────────────▼───────────────┐            │
│  │ chapter_templates│────┼──1:N─│ chapter_template_versions      │            │
│  │                  │    │      └────────────────────────────────┘            │
│  └──────────────────┘    │                                                    │
│                          │                                                    │
└──────────────────────────┴────────────────────────────────────────────────────┘

                 ORPHANED DOCUMENTS
┌───────────────────────────────────────────────────────────────────────────────┐
│  ┌────────────────────┐                                                       │
│  │ orphaned_documents │  (created when chapters with uploads are deleted)     │
│  └────────────────────┘                                                       │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Chapter System Tables

### `class_chapters`

Main table for chapter definitions.

| Column          | Type        | Nullable | Default             | Description                        |
| --------------- | ----------- | -------- | ------------------- | ---------------------------------- |
| `id`            | UUID        | No       | `gen_random_uuid()` | Primary key                        |
| `class_id`      | UUID        | No       | -                   | FK to `classes.id`                 |
| `teacher_id`    | UUID        | No       | -                   | FK to `profiles.id` (denormalized) |
| `title`         | TEXT        | No       | -                   | Chapter title (non-empty)          |
| `description`   | TEXT        | Yes      | NULL                | Optional description               |
| `display_order` | INTEGER     | No       | 0                   | Sort order within class            |
| `is_visible`    | BOOLEAN     | No       | false               | Student visibility                 |
| `color`         | TEXT        | Yes      | NULL                | Tailwind color name                |
| `icon`          | TEXT        | Yes      | NULL                | Lucide icon name                   |
| `created_at`    | TIMESTAMPTZ | No       | `NOW()`             | Creation timestamp                 |
| `updated_at`    | TIMESTAMPTZ | No       | `NOW()`             | Last update timestamp              |

**Indexes:**

- `idx_class_chapters_class` on `(class_id)`
- `idx_class_chapters_teacher` on `(teacher_id)`
- `idx_class_chapters_order` on `(class_id, display_order)`
- `idx_class_chapters_visible` partial on `(class_id, is_visible)` WHERE `is_visible = true`

**Constraints:**

- `title_not_empty`: `length(trim(title)) > 0`

---

### `chapter_documents`

Documents attached to chapters (uploads or Google Drive links).

| Column             | Type        | Nullable | Default             | Description                |
| ------------------ | ----------- | -------- | ------------------- | -------------------------- |
| `id`               | UUID        | No       | `gen_random_uuid()` | Primary key                |
| `chapter_id`       | UUID        | No       | -                   | FK to `class_chapters.id`  |
| `title`            | TEXT        | No       | -                   | Document title             |
| `description`      | TEXT        | Yes      | NULL                | Optional description       |
| `source_type`      | TEXT        | No       | 'upload'            | 'upload' or 'google_drive' |
| `storage_path`     | TEXT        | Yes      | NULL                | Path in storage bucket     |
| `file_name`        | TEXT        | Yes      | NULL                | Original filename          |
| `file_size`        | INTEGER     | Yes      | NULL                | Size in bytes (max 10MB)   |
| `mime_type`        | TEXT        | Yes      | NULL                | MIME type                  |
| `google_drive_url` | TEXT        | Yes      | NULL                | Google Drive sharing URL   |
| `google_file_id`   | TEXT        | Yes      | NULL                | Google Drive file ID       |
| `thumbnail_url`    | TEXT        | Yes      | NULL                | Preview thumbnail URL      |
| `display_order`    | INTEGER     | No       | 0                   | Sort order                 |
| `created_at`       | TIMESTAMPTZ | No       | `NOW()`             | Creation timestamp         |
| `updated_at`       | TIMESTAMPTZ | No       | `NOW()`             | Last update timestamp      |

**Constraints:**

- `valid_source_type`: `source_type IN ('upload', 'google_drive')`
- `valid_upload_fields`: upload requires `storage_path` and `file_name`
- `valid_google_drive_fields`: google_drive requires `google_drive_url`
- `valid_mime_type`: PDF, PNG, JPG, JPEG, GIF only
- `valid_file_size`: 0 < size <= 10MB

---

### `chapter_quiz_questions`

Links `question_templates` to chapters for quiz functionality.

| Column                 | Type        | Nullable | Default             | Description                   |
| ---------------------- | ----------- | -------- | ------------------- | ----------------------------- |
| `id`                   | UUID        | No       | `gen_random_uuid()` | Primary key                   |
| `chapter_id`           | UUID        | No       | -                   | FK to `class_chapters.id`     |
| `question_template_id` | UUID        | No       | -                   | FK to `question_templates.id` |
| `display_order`        | INTEGER     | No       | 0                   | Question order in quiz        |
| `points_override`      | INTEGER     | Yes      | NULL                | Override default points       |
| `created_at`           | TIMESTAMPTZ | No       | `NOW()`             | Creation timestamp            |

**Constraints:**

- `unique_question_per_chapter`: UNIQUE(`chapter_id`, `question_template_id`)
- `valid_points_override`: `points_override IS NULL OR points_override > 0`

---

### `chapter_quiz_results`

Student quiz answer submissions.

| Column                     | Type        | Nullable | Default             | Description                       |
| -------------------------- | ----------- | -------- | ------------------- | --------------------------------- |
| `id`                       | UUID        | No       | `gen_random_uuid()` | Primary key                       |
| `chapter_quiz_question_id` | UUID        | No       | -                   | FK to `chapter_quiz_questions.id` |
| `student_id`               | UUID        | No       | -                   | FK to `profiles.id`               |
| `submitted_answer`         | TEXT        | No       | -                   | Student's answer                  |
| `is_correct`               | BOOLEAN     | No       | -                   | Whether correct                   |
| `points_earned`            | INTEGER     | No       | 0                   | Points for this attempt           |
| `time_spent_seconds`       | INTEGER     | Yes      | NULL                | Time spent                        |
| `attempt_number`           | INTEGER     | No       | 1                   | Attempt number                    |
| `submitted_at`             | TIMESTAMPTZ | No       | `NOW()`             | Submission timestamp              |

**Constraints:**

- `valid_points_earned`: `points_earned >= 0`
- `valid_time_spent`: `time_spent_seconds IS NULL OR time_spent_seconds >= 0`
- `valid_attempt_number`: `attempt_number > 0`

---

### `chapter_checklist_items`

Self-assessment checklist items defined by teachers.

| Column          | Type        | Nullable | Default             | Description               |
| --------------- | ----------- | -------- | ------------------- | ------------------------- |
| `id`            | UUID        | No       | `gen_random_uuid()` | Primary key               |
| `chapter_id`    | UUID        | No       | -                   | FK to `class_chapters.id` |
| `content`       | TEXT        | No       | -                   | Checklist item text       |
| `description`   | TEXT        | Yes      | NULL                | Optional details          |
| `display_order` | INTEGER     | No       | 0                   | Sort order                |
| `created_at`    | TIMESTAMPTZ | No       | `NOW()`             | Creation timestamp        |
| `updated_at`    | TIMESTAMPTZ | No       | `NOW()`             | Last update timestamp     |

**Constraints:**

- `content_not_empty`: `length(trim(content)) > 0`

---

### `student_checklist_progress`

Tracks student completion of checklist items.

| Column              | Type        | Nullable | Default             | Description                        |
| ------------------- | ----------- | -------- | ------------------- | ---------------------------------- |
| `id`                | UUID        | No       | `gen_random_uuid()` | Primary key                        |
| `checklist_item_id` | UUID        | No       | -                   | FK to `chapter_checklist_items.id` |
| `student_id`        | UUID        | No       | -                   | FK to `profiles.id`                |
| `is_completed`      | BOOLEAN     | No       | false               | Completion status                  |
| `completed_at`      | TIMESTAMPTZ | Yes      | NULL                | Auto-set when completed            |
| `created_at`        | TIMESTAMPTZ | No       | `NOW()`             | Creation timestamp                 |
| `updated_at`        | TIMESTAMPTZ | No       | `NOW()`             | Last update timestamp              |

**Constraints:**

- `unique_student_checklist_item`: UNIQUE(`checklist_item_id`, `student_id`)

---

### `chapter_exercises`

Links existing exercises to chapters.

| Column          | Type        | Nullable | Default             | Description               |
| --------------- | ----------- | -------- | ------------------- | ------------------------- |
| `id`            | UUID        | No       | `gen_random_uuid()` | Primary key               |
| `chapter_id`    | UUID        | No       | -                   | FK to `class_chapters.id` |
| `exercise_id`   | UUID        | No       | -                   | FK to `exercises.id`      |
| `display_order` | INTEGER     | No       | 0                   | Sort order                |
| `created_at`    | TIMESTAMPTZ | No       | `NOW()`             | Creation timestamp        |

**Constraints:**

- `unique_exercise_per_chapter`: UNIQUE(`chapter_id`, `exercise_id`)

---

### `orphaned_documents`

Metadata for documents preserved when chapters are deleted.

| Column                  | Type        | Nullable | Default             | Description            |
| ----------------------- | ----------- | -------- | ------------------- | ---------------------- |
| `id`                    | UUID        | No       | `gen_random_uuid()` | Primary key            |
| `original_document_id`  | UUID        | No       | -                   | Original document ID   |
| `original_chapter_id`   | UUID        | No       | -                   | Original chapter ID    |
| `original_class_id`     | UUID        | No       | -                   | Original class ID      |
| `teacher_id`            | UUID        | No       | -                   | FK to `profiles.id`    |
| `title`                 | TEXT        | No       | -                   | Document title         |
| `file_name`             | TEXT        | No       | -                   | Original filename      |
| `mime_type`             | TEXT        | Yes      | NULL                | MIME type              |
| `file_size`             | INTEGER     | Yes      | NULL                | Size in bytes          |
| `orphaned_storage_path` | TEXT        | No       | -                   | New storage path       |
| `orphaned_at`           | TIMESTAMPTZ | No       | `NOW()`             | When orphaned          |
| `original_created_at`   | TIMESTAMPTZ | Yes      | NULL                | Original creation date |

---

## Template System Tables

### `chapter_templates`

Reusable chapter templates with versioning.

| Column                | Type        | Nullable | Default             | Description                      |
| --------------------- | ----------- | -------- | ------------------- | -------------------------------- |
| `id`                  | UUID        | No       | `gen_random_uuid()` | Primary key                      |
| `created_by`          | UUID        | No       | -                   | FK to `profiles.id`              |
| `status`              | TEXT        | No       | 'draft'             | 'draft', 'published', 'archived' |
| `is_public`           | BOOLEAN     | No       | false               | Visible to all teachers          |
| `title`               | TEXT        | No       | -                   | Template title                   |
| `description`         | TEXT        | Yes      | NULL                | Optional description             |
| `grades`              | TEXT[]      | No       | '{}'                | Target grade levels              |
| `color`               | TEXT        | Yes      | NULL                | Tailwind color name              |
| `icon`                | TEXT        | Yes      | NULL                | Lucide icon name                 |
| `content_snapshot`    | JSONB       | No       | '{}'                | Current content                  |
| `instantiation_count` | INTEGER     | No       | 0                   | Usage count                      |
| `current_version`     | INTEGER     | No       | 1                   | Current version number           |
| `created_at`          | TIMESTAMPTZ | No       | `NOW()`             | Creation timestamp               |
| `updated_at`          | TIMESTAMPTZ | No       | `NOW()`             | Last update timestamp            |

**Indexes:**

- `idx_chapter_templates_created_by` on `(created_by)`
- `idx_chapter_templates_status_creator` on `(created_by, status)`
- `idx_chapter_templates_public_status` partial WHERE `is_public = true AND status = 'published'`
- `idx_chapter_templates_grades` GIN on `(grades)`

**Constraints:**

- `valid_template_status`: `status IN ('draft', 'published', 'archived')`
- `valid_instantiation_count`: `instantiation_count >= 0`
- `valid_current_version`: `current_version >= 1`

---

### `chapter_template_versions`

Version history with content snapshots.

| Column             | Type        | Nullable | Default             | Description                  |
| ------------------ | ----------- | -------- | ------------------- | ---------------------------- |
| `id`               | UUID        | No       | `gen_random_uuid()` | Primary key                  |
| `template_id`      | UUID        | No       | -                   | FK to `chapter_templates.id` |
| `version_number`   | INTEGER     | No       | -                   | Version (1-based)            |
| `created_by`       | UUID        | No       | -                   | FK to `profiles.id`          |
| `content_snapshot` | JSONB       | No       | -                   | Full content at this version |
| `change_summary`   | TEXT        | Yes      | NULL                | Human-readable changes       |
| `diff`             | JSONB       | Yes      | NULL                | Structured diff              |
| `created_at`       | TIMESTAMPTZ | No       | `NOW()`             | Creation timestamp           |

**Constraints:**

- `unique_template_version`: UNIQUE(`template_id`, `version_number`)
- `valid_version_number`: `version_number >= 1`

---

### `chapter_template_instantiations`

Links templates to instantiated chapters.

| Column                     | Type        | Nullable | Default             | Description                                       |
| -------------------------- | ----------- | -------- | ------------------- | ------------------------------------------------- |
| `id`                       | UUID        | No       | `gen_random_uuid()` | Primary key                                       |
| `template_id`              | UUID        | Yes      | -                   | FK to `chapter_templates.id` (SET NULL on delete) |
| `template_version`         | INTEGER     | No       | -                   | Version at instantiation                          |
| `chapter_id`               | UUID        | No       | -                   | FK to `class_chapters.id`                         |
| `current_template_version` | INTEGER     | Yes      | -                   | Latest known version                              |
| `is_detached`              | BOOLEAN     | No       | false               | No longer linked                                  |
| `instantiated_at`          | TIMESTAMPTZ | No       | `NOW()`             | Instantiation timestamp                           |
| `last_migrated_at`         | TIMESTAMPTZ | Yes      | NULL                | Last migration timestamp                          |

**Constraints:**

- `unique_chapter_instantiation`: UNIQUE(`chapter_id`)
- `valid_template_version`: `template_version >= 1`

---

## Helper Functions

### `is_class_teacher(p_class_id UUID)`

Check if current user is the teacher of a class.

```sql
CREATE OR REPLACE FUNCTION public.is_class_teacher(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
```

### `is_class_student(p_class_id UUID)`

Check if current user is enrolled in a class.

```sql
CREATE OR REPLACE FUNCTION public.is_class_student(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
```

---

## Triggers

### Chapter System Triggers

| Trigger                                     | Table                        | Event         | Function                              | Description                       |
| ------------------------------------------- | ---------------------------- | ------------- | ------------------------------------- | --------------------------------- |
| `update_*_updated_at`                       | Multiple                     | BEFORE UPDATE | `update_updated_at_column()`          | Auto-update `updated_at`          |
| `set_chapter_teacher_id_trigger`            | `class_chapters`             | BEFORE INSERT | `set_chapter_teacher_id()`            | Denormalize teacher_id from class |
| `orphan_documents_on_chapter_delete`        | `class_chapters`             | BEFORE DELETE | `orphan_chapter_documents()`          | Move docs to orphaned             |
| `set_checklist_completed_at_trigger`        | `student_checklist_progress` | BEFORE UPDATE | `set_checklist_completed_at()`        | Auto-set completed_at             |
| `set_checklist_completed_at_insert_trigger` | `student_checklist_progress` | BEFORE INSERT | `set_checklist_completed_at_insert()` | Auto-set completed_at on insert   |

### Template System Triggers

| Trigger                                 | Table                             | Event         | Function                                   | Description              |
| --------------------------------------- | --------------------------------- | ------------- | ------------------------------------------ | ------------------------ |
| `update_chapter_templates_updated_at`   | `chapter_templates`               | BEFORE UPDATE | `update_updated_at_column()`               | Auto-update `updated_at` |
| `create_initial_version_trigger`        | `chapter_templates`               | AFTER INSERT  | `create_initial_template_version()`        | Create version 1         |
| `increment_instantiation_count_trigger` | `chapter_template_instantiations` | AFTER INSERT  | `increment_template_instantiation_count()` | Track usage count        |

---

## RLS Policies Summary

### Chapter Tables Access Matrix

| Table                        | Teacher (Own)       | Student (Visible)   | Admin  |
| ---------------------------- | ------------------- | ------------------- | ------ |
| `class_chapters`             | ALL                 | SELECT              | ALL    |
| `chapter_documents`          | ALL                 | SELECT              | ALL    |
| `chapter_quiz_questions`     | ALL                 | SELECT              | ALL    |
| `chapter_quiz_results`       | SELECT (own class)  | SELECT/INSERT (own) | SELECT |
| `chapter_checklist_items`    | ALL                 | SELECT              | ALL    |
| `student_checklist_progress` | SELECT              | ALL (own)           | SELECT |
| `chapter_exercises`          | ALL                 | SELECT              | ALL    |
| `orphaned_documents`         | SELECT/DELETE (own) | -                   | ALL    |

### Template Tables Access Matrix

| Table                             | Teacher (Own)      | Teacher (Public)   | Admin |
| --------------------------------- | ------------------ | ------------------ | ----- |
| `chapter_templates`               | ALL                | SELECT (published) | ALL   |
| `chapter_template_versions`       | SELECT/INSERT      | SELECT             | ALL   |
| `chapter_template_instantiations` | ALL (own chapters) | -                  | ALL   |

---

## Storage Bucket

### `chapter-documents`

| Setting                | Value                                                                  |
| ---------------------- | ---------------------------------------------------------------------- |
| **Bucket Name**        | `chapter-documents`                                                    |
| **Public**             | No (private)                                                           |
| **Max File Size**      | 10MB (10,485,760 bytes)                                                |
| **Allowed MIME Types** | `application/pdf`, `image/png`, `image/jpeg`, `image/jpg`, `image/gif` |

### Storage Path Patterns

```
chapter-documents/
├── chapters/{chapter_id}/{timestamp}_{filename}     # Active documents
└── orphaned-documents/{teacher_id}/{doc_id}/{filename}  # Orphaned documents
```

### Storage Policies

| Policy          | Operation | Condition                                             |
| --------------- | --------- | ----------------------------------------------------- |
| Teachers upload | INSERT    | Path starts with `chapters/` AND teacher owns chapter |
| Teachers read   | SELECT    | Own chapters OR own orphaned docs                     |
| Students read   | SELECT    | Visible chapters they're enrolled in                  |
| Teachers update | UPDATE    | Own chapters                                          |
| Teachers delete | DELETE    | Own chapters OR own orphaned docs                     |
| Admins          | ALL       | Any path in bucket                                    |
