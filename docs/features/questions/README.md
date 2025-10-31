# 📝 Question Bank System

Comprehensive framework for creating mathematical flashcard questions with variables, random generation, and mathematical evaluation.

**Status**: ✅ Production
**Version**: 2.0.0
**Last Updated**: 2025-10-31

---

## 🚀 Quick Start

### For Admins: Create a Question Template

1. Go to `/dashboard/admin/questions`
2. Click "Create New Template"
3. Define variables with `{{random:min-max}}` syntax
4. Use variables in content with `{{varName}}`
5. Set correct answer with mathematical expressions
6. Preview and test generation

**Example**:

```typescript
// Variables
a = {{2-9}}  // Random number between 2 and 9
b = {{2-9 exclude:a}}  // Random, excluding 'a'

// Statement
Calculate: $${{a}} + {{b}}$$

// Answer
{{eval: a + b}}
```

---

## 📖 Overview

The Question Bank System allows admins to create **question templates** that generate **infinite variations** using:

- **Variables**: Define named values with dependencies
- **Random Generation**: `{{random:min-max}}` with exclusions
- **Mathematical Evaluation**: `{{eval: expression}}` using MathLive Compute Engine
- **6 Question Types**: Numerical (exact/decimal/rounded), Algebraic, Fill-in-blanks, QCM (single/multiple)
- **Grade Targeting**: CP → Tale + STMG
- **Categorization**: Theme, domain, subdomain, difficulty level

### Key Features

✅ **Variable System** - Dependencies resolved automatically (topological sort)
✅ **Random Generation** - Exclude specific values to avoid trivial questions
✅ **Math Evaluation** - Full LaTeX expression support
✅ **Type Safety** - Zod validation + TypeScript types
✅ **Live Preview** - Test generation before saving
✅ **Seed Support** - Reproducible question instances

---

## 🏗️ Architecture

High-level system architecture:

```
Admin Interface → API → Backend Services → Database
     ↓              ↓           ↓
  Form/Editor  Validation  Generator   question_templates
                             ↓
                       Instance Generation
                    (Variables → Random → Eval)
```

**Core Components**:

- **Parser** (4 files): Extract tokens (variables, random, eval)
- **Generator** (5 files): Resolve variables, generate randoms, shuffle choices
- **Validators** (2 files): Template validation, circular dependency detection
- **Compute Engine** (1 file): MathLive integration for evaluation

**📖 Complete details**: [Architecture](architecture.md)

---

## 📚 Documentation

### Technical Documentation

- **[Architecture](architecture.md)** - System design, core components (17 backend files)
- **[Variable System](variable-system.md)** - How variables work, dependency resolution
- **[Syntax Guide](syntax-guide.md)** - Complete syntax reference for templates
- **[API Reference](api.md)** - REST API endpoints and usage
- **[Testing](testing.md)** - Test suite and validation

### User Guides

- **[Admin Interface](admin-interface.md)** - How to use the admin dashboard
- **[Question Variations](variations.md)** - Creating diverse question instances

---

## 🎯 Question Types

| Type                     | Description            | Answer Format         | Example                   |
| ------------------------ | ---------------------- | --------------------- | ------------------------- |
| **numerical_exact**      | Exact integer answer   | `42`                  | Calculate: $2 + 2$        |
| **numerical_decimal**    | Decimal answer         | `3.14`                | Round $\pi$ to 2 decimals |
| **numerical_rounded**    | Rounded with precision | `3.14 ± 0.01`         | Approximate $\pi$         |
| **algebraic_expression** | Algebraic expression   | `2x + 3`              | Simplify: $x + x + 3$     |
| **fill_in_the_blanks**   | Text with gaps         | `['Paris', 'France']` | Capital of **_ is _**     |
| **qcm_single**           | Single choice          | `index: 2`            | Pick the correct answer   |
| **qcm_multiple**         | Multiple choices       | `[0, 2, 3]`           | Select all that apply     |

**📖 Complete details**: [Architecture - Question Types](architecture.md#question-types)

---

## 🗺️ Roadmap

### Implemented ✅

- ✅ Complete variable system with dependency resolution
- ✅ Random number generation with exclusions
- ✅ Mathematical evaluation (MathLive Compute Engine)
- ✅ 6 question types
- ✅ Admin interface with live preview
- ✅ REST API with Zod validation
- ✅ Seed support for reproducible instances
- ✅ Image support in content fields
- ✅ QCM choice shuffling
- ✅ Circular dependency detection

### In Progress 🔄

- 🔄 Question template library (pre-built templates)
- 🔄 Student interface for practice mode

### Planned 📝

- 📝 Template import/export (JSON)
- 📝 Collaborative template editing
- 📝 Template versioning system
- 📝 Advanced statistics on template usage

---

## 🔧 Technical Stack

- **Backend**: TypeScript, Zod validation
- **Math Engine**: MathLive Compute Engine
- **Database**: Supabase PostgreSQL
- **API**: SvelteKit REST endpoints
- **Frontend**: Svelte 5 (runes), Tailwind CSS 4, Shadcn-svelte

---

## 📊 Statistics

- **Backend Files**: 17 (types, parser, generator, validators, compute-engine)
- **Frontend Files**: 10 (pages, components, forms)
- **API Endpoints**: 6 (list, create, read, update, delete, generate)
- **Question Types**: 6 (numerical × 3, algebraic, fill-in-blanks, QCM × 2)
- **Seed Examples**: 10 pre-built templates
- **Test Coverage**: 100+ unit tests

---

## 🔗 Related Features

- [Assessments](../assessments/README.md) - Use questions in assessments
- [SRS Flashcards](../srs-flashcards/README.md) - Spaced repetition system
- [Exercises](../exercises/README.md) - Exercise bank integration

---

[← Back to Features](../README.md)
