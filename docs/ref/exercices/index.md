# Exercises System - Technical Reference

> **Last Updated**: 2025-12-10
>
> **Status**: Production-ready

---

## Table of Contents

- [Overview](#overview)
- [Exercises vs Questions](#exercises-vs-questions)
- [Quick Reference](#quick-reference)
- [Documentation Index](#documentation-index)
- [Key Files](#key-files)

---

## Overview

The **Exercises System** provides a complete solution for creating, managing, assigning, and tracking mathematical practice exercises. It supports both static exercises and parameterized templates that generate unique instances for each student.

### Core Capabilities

| Feature                 | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| **Exercise Management** | CRUD operations with markdown + LaTeX support          |
| **Parameterization**    | Variable-based templates with three distribution modes |
| **Assignment System**   | Flexible assignment to students, classes, or public    |
| **Completion Tracking** | Optional tracking of views and completion status       |
| **Full-Text Search**    | French-language search across exercise content         |
| **Import/Export**       | JSON and Markdown format support                       |

### System Architecture

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
│  │  API Routes  │  │   Server     │  │ Instance     │      │
│  │  (+server)   │  │  Functions   │  │ Generator    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕ SQL
┌─────────────────────────────────────────────────────────────┐
│                   Database (Supabase)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Tables     │  │    Views     │  │   Functions  │      │
│  │ (3 tables)   │  │   (1 view)   │  │ (4 functions)│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Exercises vs Questions

The codebase has **two distinct systems** for math problems. Understanding the difference is critical:

| Aspect          | Exercises System                               | Questions System                                     |
| --------------- | ---------------------------------------------- | ---------------------------------------------------- |
| **Purpose**     | Textbook-style problems with manual completion | Interactive flashcard drills with instant validation |
| **Answer Type** | Free-form (student works on paper)             | Validated (numeric, algebraic, MCQ, fill-in-blank)   |
| **Grading**     | Manual/self-assessed completion                | Automated answer checking                            |
| **Format**      | Markdown + LaTeX (statement + solution)        | Complex JSONB with variations                        |
| **Use Case**    | Homework, practice worksheets                  | Real-time practice, assessments                      |
| **Storage**     | `exercises` table                              | `question_templates` table                           |
| **Components**  | `ExerciseDisplay.svelte`                       | `FlashCard.svelte`, `QuestionCard.svelte`            |

### Key Distinction

**Exercises**: Students mark themselves as "done" when they've completed the work (self-paced, no automated validation)

**Questions**: System automatically validates answers and tracks correctness

---

## Quick Reference

### Distribution Modes

| Mode          | Seed Generation                  | Use Case                         |
| ------------- | -------------------------------- | -------------------------------- |
| `on_demand`   | Random each time                 | Infinite practice                |
| `per_student` | `hash(exercise_id + student_id)` | Personalized homework            |
| `per_group`   | `hash(exercise_id + group_id)`   | Class work (same values for all) |

### Assignment Types

| Type      | Target                | Description             |
| --------- | --------------------- | ----------------------- |
| `student` | Single student        | 1:1 direct assignment   |
| `class`   | All students in class | 1:N via `class_members` |
| `public`  | All students          | Available to everyone   |

### API Endpoints Summary

| Endpoint                       | Method         | Purpose              |
| ------------------------------ | -------------- | -------------------- |
| `/api/exercises`               | GET            | List exercises       |
| `/api/exercises`               | POST           | Create exercise      |
| `/api/exercises/[id]`          | GET/PUT/DELETE | Single exercise CRUD |
| `/api/exercises/[id]/assign`   | POST           | Create assignment(s) |
| `/api/exercises/[id]/complete` | POST/DELETE    | Toggle completion    |
| `/api/exercises/[id]/view`     | POST           | Record view          |

---

## Documentation Index

| Document                                  | Description                                        |
| ----------------------------------------- | -------------------------------------------------- |
| [Database Schema](./database-schema.md)   | Tables, views, functions, indexes, triggers        |
| [API Reference](./api-reference.md)       | All API endpoints with request/response examples   |
| [Types](./types.md)                       | TypeScript type definitions                        |
| [Components](./components.md)             | Svelte components reference                        |
| [Parameterization](./parameterization.md) | Variable syntax, instance generation, distribution |

---

## Key Files

### Database

| File                                                                        | Purpose                |
| --------------------------------------------------------------------------- | ---------------------- |
| `supabase/migrations/20251026080000_create_exercises_table.sql`             | Core `exercises` table |
| `supabase/migrations/20251027005912_create_exercise_assignments.sql`        | Assignments schema     |
| `supabase/migrations/20251031160000_create_exercise_assignments_tables.sql` | Completions & RLS      |
| `supabase/migrations/20251027010000_add_exercise_fulltext_search.sql`       | French FTS index       |

### Server

| File                                     | Purpose                       |
| ---------------------------------------- | ----------------------------- |
| `src/lib/server/exercises.ts`            | Core CRUD operations          |
| `src/lib/server/exercise-assignments.ts` | Assignment & completion logic |
| `src/lib/server/validation/exercises.ts` | Zod validation schemas        |

### Client

| File                                                  | Purpose                        |
| ----------------------------------------------------- | ------------------------------ |
| `src/lib/exercises/types.ts`                          | Type definitions (~1700 lines) |
| `src/lib/exercises/generator/instance-generator.ts`   | Parameterization engine        |
| `src/lib/components/exercises/ExerciseDisplay.svelte` | Main display component         |

### Routes

| Route                                                 | Purpose       |
| ----------------------------------------------------- | ------------- |
| `src/routes/api/exercises/`                           | API endpoints |
| `src/routes/(protected)/dashboard/teacher/exercises/` | Teacher pages |
| `src/routes/(protected)/dashboard/student/exercises/` | Student pages |

---

## Related Documentation

- [Parameterization Guide](../../features/exercises/parameterization-guide.md) - Detailed variable syntax
- [Import/Export](../../features/exercises/import-export.md) - JSON and Markdown formats
- [Custom Markdown](../markdown.md) - Markdown parser with math support
