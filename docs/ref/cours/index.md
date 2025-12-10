# Cours (Chapters) System - Technical Reference

Comprehensive documentation for UbuMaths' chapter-based course management system, enabling teachers to organize educational content by class with quizzes, documents, checklists, and exercises.

> **Added**: 2025-12-10

---

## Table of Contents

1. [Overview](#overview)
2. [Key Concepts](#key-concepts)
3. [Architecture](#architecture)
4. [Quick Start](#quick-start)
5. [Related Documentation](#related-documentation)

---

## Overview

The Cours system provides a Moodle-like chapter organization for educational content:

- **Teachers** create chapters within their classes, adding documents, quizzes, checklists, and exercises
- **Students** view visible chapters, complete quizzes, track their progress via checklists
- **Templates** enable reusable chapter structures with versioning and migration support

### Feature Summary

| Feature              | Teacher            | Student       |
| -------------------- | ------------------ | ------------- |
| Create/Edit Chapters | Yes                | -             |
| Upload Documents     | Yes                | View/Download |
| Add Quiz Questions   | Yes                | Answer        |
| Create Checklists    | Yes                | Toggle Items  |
| Link Exercises       | Yes                | View          |
| Track Progress       | View All Students  | View Own      |
| Use Templates        | Create/Instantiate | -             |

---

## Key Concepts

### Chapters (`class_chapters`)

A chapter is a container for educational content belonging to a specific class. Each chapter has:

- **Title & Description**: Basic metadata
- **Visibility**: Teachers control when students can see chapters
- **Display Order**: Manual ordering within a class
- **Color & Icon**: Visual customization (Tailwind colors, Lucide icons)

### Content Types

| Type                | Description                     | Source                           |
| ------------------- | ------------------------------- | -------------------------------- |
| **Documents**       | PDF, images, Google Drive links | Upload or external link          |
| **Quiz Questions**  | True/False questions            | Linked from `question_templates` |
| **Checklist Items** | Self-assessment items           | Created per chapter              |
| **Exercises**       | Practice exercises              | Linked from `exercises` table    |

### Templates

Reusable chapter structures that can be:

- Created from scratch or from existing chapters
- Published (public or private) for sharing
- Versioned with automatic diff tracking
- Instantiated into multiple classes
- Migrated when template updates are available

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Cours System Architecture                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TEACHER FLOW                              STUDENT FLOW                      │
│  ════════════                              ════════════                       │
│                                                                              │
│  ┌─────────────────┐                       ┌─────────────────┐              │
│  │ Create Chapter  │                       │ View Chapters   │              │
│  │ (per class)     │                       │ (visible only)  │              │
│  └────────┬────────┘                       └────────┬────────┘              │
│           │                                         │                        │
│           ▼                                         ▼                        │
│  ┌─────────────────┐                       ┌─────────────────┐              │
│  │ Add Content     │                       │ Chapter Detail  │              │
│  │ - Documents     │                       │ - View Docs     │              │
│  │ - Quiz          │◄─────────────────────►│ - Take Quiz     │              │
│  │ - Checklist     │      Visibility       │ - Checklist     │              │
│  │ - Exercises     │                       │ - Exercises     │              │
│  └────────┬────────┘                       └────────┬────────┘              │
│           │                                         │                        │
│           ▼                                         ▼                        │
│  ┌─────────────────┐                       ┌─────────────────┐              │
│  │ View Progress   │                       │ Track Progress  │              │
│  │ (all students)  │                       │ (personal)      │              │
│  └─────────────────┘                       └────────┬────────┘              │
│                                                     │                        │
│                                                     ▼                        │
│                                            ┌─────────────────┐              │
│                                            │ SRS Integration │              │
│                                            │ (quiz answers)  │              │
│                                            └─────────────────┘              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Classes   │────▶│  Chapters   │────▶│   Content   │────▶│  Progress   │
│             │ 1:N │             │ 1:N │ (Docs/Quiz/ │ N:N │ (Per Student│
│             │     │             │     │  Checklist) │     │  Per Item)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                                       │
       │                   │         ┌─────────────────┐           │
       │                   └────────▶│    Templates    │           │
       │                             │  (Reusable)     │           │
       │                             └────────┬────────┘           │
       │                                      │                    │
       │                             ┌────────▼────────┐           │
       │                             │    Versions     │           │
       │                             │  (With Diffs)   │           │
       │                             └────────┬────────┘           │
       │                                      │                    │
       │                             ┌────────▼────────┐           │
       │                             │ Instantiations  │───────────┘
       │                             │ (Links to Ch.)  │
       └─────────────────────────────┴─────────────────┘
```

### File Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── cours/                    # Student & shared components
│   │   │   ├── ChapterCard.svelte
│   │   │   ├── ChapterQuiz.svelte
│   │   │   ├── QuizQuestion.svelte
│   │   │   ├── QuizSummary.svelte
│   │   │   ├── ChecklistSection.svelte
│   │   │   ├── DocumentCard.svelte
│   │   │   ├── ChapterProgressIndicator.svelte
│   │   │   └── teacher/              # Teacher-only components
│   │   │       ├── ChapterEditor.svelte
│   │   │       ├── ChecklistEditor.svelte
│   │   │       ├── StudentProgressTable.svelte
│   │   │       └── DocumentUpload.svelte
│   │   └── templates/                # Template components
│   │       ├── TemplateGallery.svelte
│   │       ├── TemplateCard.svelte
│   │       ├── TemplateEditor.svelte
│   │       ├── TemplateInstantiationDialog.svelte
│   │       ├── TemplateMigrationDialog.svelte
│   │       ├── TemplateVersionHistory.svelte
│   │       └── ChapterTemplateIndicator.svelte
│   ├── server/
│   │   ├── chapters.ts               # Chapter server functions
│   │   ├── chapters.test.ts          # Chapter tests (87 tests)
│   │   ├── chapter-templates.ts      # Template server functions
│   │   ├── chapter-templates.test.ts # Template tests (128 tests)
│   │   └── validation/
│   │       ├── chapters.ts           # Zod schemas for chapters
│   │       └── chapter-templates.ts  # Zod schemas for templates
│   └── types/
│       ├── chapters.ts               # Chapter TypeScript types
│       └── chapter-templates.ts      # Template TypeScript types
├── routes/
│   └── (protected)/dashboard/
│       ├── student/cours/            # Student routes
│       │   ├── +page.svelte          # Chapter list
│       │   ├── +page.server.ts
│       │   └── [chapterId]/          # Chapter detail
│       │       ├── +page.svelte
│       │       └── +page.server.ts
│       └── teacher/
│           ├── cours/                # Teacher chapter routes
│           │   ├── +page.svelte      # Class overview
│           │   ├── +page.server.ts
│           │   └── [classId]/        # Class chapters
│           │       ├── +page.svelte
│           │       ├── +page.server.ts
│           │       └── [chapterId]/  # Chapter editor
│           │           ├── +page.svelte
│           │           └── +page.server.ts
│           └── templates/            # Template management
│               ├── +page.svelte
│               ├── +page.server.ts
│               ├── new/              # Create template
│               └── [templateId]/     # Edit template
└── supabase/migrations/
    ├── 20251210000000_create_chapter_system.sql
    └── 20251210100000_create_chapter_templates.sql
```

---

## Quick Start

### For Teachers

1. Navigate to `/dashboard/teacher/cours`
2. Select a class to manage chapters
3. Click "Nouveau chapitre" to create a chapter
4. Add content via the tabs:
   - **Objectifs**: Checklist items for student self-assessment
   - **Quiz**: Link questions from your question bank
   - **Exercices**: Link exercises from your exercise library
   - **Documents**: Upload PDFs/images or add Google Drive links
5. Toggle visibility when ready for students

### For Students

1. Navigate to `/dashboard/student/cours`
2. View chapters grouped by class
3. Click a chapter to see:
   - Documents to download/view
   - Quiz to complete
   - Checklist to track your progress
   - Linked exercises

### Using Templates

1. Go to `/dashboard/teacher/templates`
2. Create a template from scratch or from an existing chapter
3. Add content (documents, quiz, checklist, exercises)
4. Publish when ready (public or private)
5. Instantiate into any class via "Depuis un template" button

---

## Related Documentation

| Document                                | Description                                 |
| --------------------------------------- | ------------------------------------------- |
| [Database Schema](./database-schema.md) | Tables, columns, RLS policies, triggers     |
| [API Reference](./api-reference.md)     | Server functions, form actions, validation  |
| [Components](./components.md)           | UI components with props and examples       |
| [Templates](./templates.md)             | Template lifecycle, versioning, migration   |
| [SRS Integration](./srs-integration.md) | Quiz answer integration with FSRS algorithm |

---

## Key Technical Decisions

| Decision             | Choice                          | Rationale                        |
| -------------------- | ------------------------------- | -------------------------------- |
| Chapter organization | Per class                       | Simpler MVP, templates for reuse |
| Quiz system          | Reuse `question_templates`      | Leverage existing infrastructure |
| Document storage     | Supabase Storage + Google Drive | Flexibility for teachers         |
| Template versioning  | Full snapshot with diffs        | Enable reliable migration        |
| SRS integration      | Update on quiz answer           | Seamless spaced repetition       |
| Chapter deletion     | Hard delete + orphan docs       | Clean up while preserving files  |

---

## Test Coverage

| Domain                    | Tests   | Status                |
| ------------------------- | ------- | --------------------- |
| Chapter Zod schemas       | 35      | Pass                  |
| Chapter server functions  | 46      | Pass                  |
| Chapter reordering        | 6       | Skipped (integration) |
| Template Zod schemas      | 45      | Pass                  |
| Template server functions | 60      | Pass                  |
| `computeDiff` function    | 23      | Pass                  |
| **Total**                 | **215** | **99%+ passing**      |
