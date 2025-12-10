# Worksheets System - Technical Reference

Complete technical documentation for the UbuMaths worksheets system, enabling teachers to create, manage, and distribute parameterized math worksheets with PDF generation.

> **Note**: This system is distinct from the "exercices" system. Worksheets are collections of exercises organized into printable documents, while exercices are individual math problems with parameterized content.

---

## Table of Contents

| Document                                      | Description                                     |
| --------------------------------------------- | ----------------------------------------------- |
| [Architecture](./architecture.md)             | System overview, data flow, and design patterns |
| [Database Schema](./database-schema.md)       | Tables, relationships, and constraints          |
| [TypeScript Types](./types.md)                | Type definitions and interfaces                 |
| [Instance Generator](./instance-generator.md) | Variant generation and parameter resolution     |
| [Typst Generation](./typst-generation.md)     | PDF generation with Typst.js                    |
| [Templates](./templates.md)                   | Default templates and customization             |
| [API Reference](./api.md)                     | REST endpoints and validation                   |
| [Components](./components.md)                 | Svelte UI components                            |
| [Security](./security.md)                     | RLS policies and access control                 |

---

## System Overview

The worksheets system provides a complete workflow for creating individualized math assessments:

```
Teacher creates worksheet
         |
         v
Adds exercises with variant config
         |
         v
Configures display options (template, shuffling, etc.)
         |
         v
Assigns to class
         |
         v
Instance Generator creates unique instances per student
         |
         v
Typst Generator produces PDF documents
         |
         v
Students receive personalized worksheets
```

---

## Key Features

### 1. Parameterized Exercises

- Exercises contain variables that resolve to different values per student
- Deterministic seeding ensures reproducibility
- Multiple variant modes: none, individual, n_versions, group

### 2. PDF Generation

- Client-side rendering using Typst.js (WebAssembly)
- 11 built-in templates with professional layouts
- Custom template support with placeholder system
- Batch generation for entire classes

### 3. Assignment Management

- Multiple document types: worksheet, assessment, exam, quiz, homework
- Correction release modes: manual, immediate, scheduled, after_due
- Time limits and late submission controls

### 4. Security

- Row Level Security (RLS) at database level
- Tampering prevention for student instances
- Role-based access (teacher, admin, student)

---

## Quick Reference

### File Locations

```
src/
├── lib/
│   ├── types/
│   │   └── worksheets.ts           # Type definitions
│   ├── worksheets/
│   │   ├── default-templates.ts    # 11 built-in templates
│   │   ├── typst-compiler.ts       # Typst.js singleton wrapper
│   │   └── typst-generator.ts      # Typst document generation
│   ├── server/
│   │   ├── worksheets/
│   │   │   └── instance-generator.ts  # Variant generation
│   │   └── validation/
│   │       └── worksheets.ts       # Zod schemas
│   └── components/worksheets/      # 13 UI components
├── routes/
│   ├── (protected)/dashboard/teacher/worksheets/  # Teacher UI
│   └── api/worksheets/             # REST endpoints
└── supabase/migrations/
    └── 20250123000000_worksheets.sql  # Database schema
```

### Variant Modes

| Mode         | Description                   | Use Case           |
| ------------ | ----------------------------- | ------------------ |
| `none`       | Same content for all students | Reference exams    |
| `individual` | Unique per student            | Homework, practice |
| `n_versions` | Limited versions (A, B, C...) | Formal exams       |
| `group`      | Shared by student groups      | Group work         |

### Document Types

| Type         | French Label        | Description        |
| ------------ | ------------------- | ------------------ |
| `worksheet`  | Feuille d'exercices | Practice work      |
| `assessment` | Evaluation          | Graded evaluation  |
| `exam`       | Examen              | Formal examination |
| `quiz`       | Quiz                | Quick assessment   |
| `homework`   | Devoirs             | Take-home work     |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Teacher Dashboard                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Create   │ │ Manage   │ │ Preview  │ │ Batch Generate   │   │
│  │ Worksheet│ │ Exercises│ │ PDF      │ │ PDFs             │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘   │
└───────│────────────│────────────│────────────────│──────────────┘
        │            │            │                │
        ▼            ▼            ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      REST API Layer                              │
│  POST /api/worksheets     PUT /api/worksheets/[id]/exercises    │
│  GET  /api/worksheets     GET /api/worksheets/templates         │
└─────────────────────────────────────────────────────────────────┘
        │            │            │                │
        ▼            ▼            ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Business Logic                               │
│  ┌──────────────────┐    ┌─────────────────────────────────┐   │
│  │ Instance         │    │ Typst Generator                  │   │
│  │ Generator        │───▶│ (Server-side generation)        │   │
│  │ (Parameter       │    │                                  │   │
│  │  resolution)     │    │ Typst Compiler                   │   │
│  └──────────────────┘    │ (Client-side WASM compilation)  │   │
│                          └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
        │                                          │
        ▼                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase Database                           │
│  ┌────────────┐ ┌────────────────┐ ┌──────────────────┐        │
│  │ worksheets │ │ worksheet_     │ │ worksheet_       │        │
│  │            │ │ exercises      │ │ instances        │        │
│  └────────────┘ └────────────────┘ └──────────────────┘        │
│  ┌────────────┐ ┌────────────────┐ ┌──────────────────┐        │
│  │ worksheet_ │ │ worksheet_     │ │ worksheet_       │        │
│  │ sections   │ │ templates      │ │ assignments      │        │
│  └────────────┘ └────────────────┘ └──────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Systems

| System              | Relationship                                                                        |
| ------------------- | ----------------------------------------------------------------------------------- |
| **Exercices**       | Worksheets contain references to exercises via `worksheet_exercises` junction table |
| **Custom Markdown** | Exercise statements use `{{variable}}` syntax resolved by instance generator        |
| **Classes**         | Assignments link worksheets to classes via `worksheet_assignments`                  |
| **Profiles**        | Ownership and permissions tied to `profiles` table                                  |

---

## Getting Started

### Creating a Worksheet

1. Navigate to `/dashboard/teacher/worksheets/new`
2. Fill in basic info (title, type, duration)
3. Add exercises from the exercise bank
4. Configure variant modes for each exercise
5. Preview and generate PDFs

### Key APIs

```typescript
// Create worksheet
POST /api/worksheets
{ title: "Equations", type: "assessment", config: {...} }

// Add exercise
POST /api/worksheets/[id]/exercises
{ exercise_id: "uuid", position: 0, variant_mode: "individual" }

// Generate instance
import { generateWorksheetInstance } from '$lib/server/worksheets/instance-generator';
const instance = generateWorksheetInstance({ worksheetId, studentId, exercises, config });

// Generate PDF
import { generateWorksheetTypst } from '$lib/worksheets/typst-generator';
const typst = generateWorksheetTypst({ worksheet, instance, config, mode: 'worksheet' });
```

---

## Version History

| Date       | Version | Changes                               |
| ---------- | ------- | ------------------------------------- |
| 2025-01-23 | 1.0     | Initial worksheets migration          |
| 2025-12    | 1.1     | 11 default templates, client-side PDF |
