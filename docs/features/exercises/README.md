# 📓 Exercise Bank System

Framework for creating, managing, and exporting mathematical exercises with rich markdown, LaTeX formulas, and multiple output formats.

**Status**: ✅ Production
**Version**: 3.0.0
**Last Updated**: 2025-10-31

---

## 🚀 Quick Start

### For Teachers: Create an Exercise

1. Go to `/dashboard/teacher/exercises`
2. Click "Create New Exercise"
3. Write content in Markdown with LaTeX math
4. Add metadata (title, source, difficulty, tags)
5. Optionally add parameterization (variables)
6. Assign to students/classes or make public
7. Export to PDF/LaTeX if needed

**Example**:

```markdown
---
title: Fractions et Opérations
source: Manuels Scolaires
difficulty: medium
tags: [fractions, operations]
grade_levels: [5eme, 4eme]
---

## Exercise 1: Simplify Fractions

Calculate: $\frac{12}{18}$

**Solution**: $\frac{2}{3}$
```

---

## 📖 Overview

The Exercise Bank System allows teachers to create **exercise documents** with:

- **Rich Markdown**: Tables, lists, headings, bold/italic
- **LaTeX Math**: Inline `$...$` and block `$$...$$` formulas
- **Image Upload**: Direct upload to Supabase Storage with validation
- **Parameterization**: Variable-based templates with 3 distribution modes
- **Assignment System**: Flexible assignment to students/classes/public
- **Completion Tracking**: Optional view and completion tracking
- **Full-Text Search**: Efficient search across exercise content
- **Import/Export**: JSON and Markdown formats with duplicate strategies

### Key Features

✅ **Markdown Editor** - Write exercises in markdown with live preview
✅ **Math Support** - MathLive integration for LaTeX rendering
✅ **Image Upload** - Direct upload with 5MB limit + validation
✅ **Parameterization** - Generate infinite variations with variables
✅ **Assignment System** - Assign to specific students/classes
✅ **Completion Tracking** - Track views and completions
✅ **Export Formats** - LaTeX, PDF (via pandoc), Markdown, JSON
✅ **Import** - Import from JSON/Markdown with duplicate handling

---

## 🏗️ Architecture

High-level system architecture:

```
Teacher Interface → API → Services → Database
     ↓                ↓         ↓
  Editor/Form    Validation  CRUD      exercises
     ↓                              exercise_assignments
  Preview                        exercise_completions
     ↓
  Export (LaTeX/PDF/JSON)
```

**Core Components**:

- **Parser** (4 files): Markdown parsing, math extraction, tables, lists
- **Transpiler** (1 file): Convert AST to LaTeX
- **Services** (3 files): CRUD, import/export, assignments + tracking
- **Components** (6 files): Editor, display, parameterization, dialogs

**📖 Complete details**: [Architecture](architecture.md)

---

## 📚 Documentation

### Technical Documentation

- **[Architecture](architecture.md)** - System design, core components
- **[Components](components.md)** - UI components (editor, display, preview)
- **[API Reference](api.md)** - 13 REST API endpoints
- **[Import/Export](import-export.md)** - Formats and duplicate strategies

### Parameterization System

- **[Parameterization Guide](parameterization-guide.md)** - Complete guide to variables
- **[Quick Reference](parameterization-quick-reference.md)** - Cheat sheet
- **[Tutorial](parameterization-tutorial.md)** - Step-by-step examples
- **[Types Guide](parameterization-types-guide.md)** - Distribution modes (uniform, normal, choice)
- **[Instance Generator](instance-generator.md)** - How generation works

---

## 🎯 Features

### Markdown Support

| Feature         | Syntax                    | Example            |
| --------------- | ------------------------- | ------------------ |
| **Headings**    | `## Heading`              | Level 1-6 headers  |
| **Bold/Italic** | `**bold**`, `*italic*`    | Text formatting    |
| **Lists**       | `- item` or `1. item`     | Ordered/unordered  |
| **Tables**      | <code>\| A \| B \|</code> | GFM tables         |
| **Math**        | `$x^2$` or `$$x^2$$`      | Inline/block LaTeX |
| **Images**      | Upload via UI             | Stored in Supabase |

### Assignment System

- **Student-specific**: Assign to individual students
- **Class-wide**: Assign to entire class
- **Public**: Make accessible to all
- **Date range**: Set available dates
- **Completion tracking**: Optional tracking of views and completions

### Parameterization (Variables)

Three distribution modes:

1. **Uniform**: Random integer in range `{a: {type: "uniform", min: 1, max: 10}}`
2. **Normal**: Gaussian distribution `{b: {type: "normal", mean: 50, std: 10}}`
3. **Choice**: Pick from list `{c: {type: "choice", values: [2, 4, 6, 8]}}`

Generate unique instances for each student automatically.

### Export Formats

- **LaTeX** (.tex): For compilation with pdflatex
- **PDF**: Direct export (requires pandoc)
- **Markdown** (.md): With YAML frontmatter
- **JSON**: Complete exercise data

---

## 🗺️ Roadmap

### Implemented ✅

- ✅ Rich markdown editor with live preview
- ✅ LaTeX math support (inline + block)
- ✅ Image upload to Supabase Storage
- ✅ Parameterization with 3 distribution modes
- ✅ Assignment system (student/class/public)
- ✅ Completion tracking (views + completions)
- ✅ Full-text search
- ✅ Import/Export (JSON, Markdown, LaTeX)
- ✅ 13 API endpoints with Zod validation
- ✅ Teacher dashboard UI (production-ready)

### In Progress 🔄

- 🔄 PDF export optimization (pandoc integration)
- 🔄 Exercise template library

### Planned 📝

- 📝 Collaborative editing
- 📝 Exercise versioning system
- 📝 Student solution submissions
- 📝 Automatic grading for parameterized exercises
- 📝 Exercise sharing between teachers

---

## 🔧 Technical Stack

- **Parser**: Custom markdown parser with GFM support
- **Math Rendering**: MathLive (client-side), KaTeX (server-side)
- **Storage**: Supabase Storage for images
- **Database**: Supabase PostgreSQL (exercises, assignments, completions)
- **Export**: LaTeX transpiler + pandoc (for PDF)
- **Frontend**: Svelte 5 (runes), Tailwind CSS 4, Shadcn-svelte

---

## 📊 Statistics

- **Core Files**: 13 (parser, transpiler, services, components)
- **API Endpoints**: 13 (CRUD, assignments, tracking, import/export, search)
- **Components**: 6 (editor, display, preview, parameterization, dialogs)
- **Supported Formats**: 4 (LaTeX, PDF, Markdown, JSON)
- **Parameterization Modes**: 3 (uniform, normal, choice)
- **Assignment Types**: 3 (student-specific, class-wide, public)

---

## 🔗 Related Features

- [Questions](../questions/README.md) - Question templates with variables
- [Assessments](../assessments/README.md) - Combine exercises into assessments
- [SRS Flashcards](../srs-flashcards/README.md) - Spaced repetition practice

---

[← Back to Features](../README.md)
