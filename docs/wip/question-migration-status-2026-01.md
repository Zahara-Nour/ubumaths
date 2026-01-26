# Question System Migration - Status January 2026

## Overview

This document describes the current state of the question system migration and the work needed to complete it.

**Goal**: Migrate ~2,238 questions from TinyMath to the new UbuMaths question system.

---

## Current Architecture

### TypeScript Types (`src/lib/questions/types.ts`)

```typescript
interface QuestionTemplate {
	id: string;
	type: QuestionType;
	title: string;

	// Content structure
	shared?: SharedVariationDefaults; // Shared fields across all variations
	variations: QuestionVariation[]; // At least 1 variation required

	// Metadata
	grades: GradeLevel[];
	theme: string;
	domain: string;
	subdomain?: string;
	level: number;
	status: 'draft' | 'published';
	// ...
}

interface QuestionVariation {
	statement: TemplateMarkdown;
	solution: string | string[];
	variables?: QuestionVariable[];
	correction?: QuestionCorrection;
	choices?: { content: TemplateMarkdown; isCorrect: boolean }[];
	validationRules?: ValidationRule[];
	blanks?: { position: number; expectedAnswer: string }[];
}

interface SharedVariationDefaults {
	statement?: TemplateMarkdown;
	solution?: string | string[];
	variables?: QuestionVariable[];
	correction?: QuestionCorrection;
	choices?: { content: TemplateMarkdown; isCorrect: boolean }[];
	validationRules?: ValidationRule[];
}
```

### Database Schema (`question_templates` table)

Current columns:

- `id`, `type`, `title`, `description`
- `shared` (JSONB) - SharedVariationDefaults ✅ Added 2026-01-26
- `variations` (JSONB) - Array of variations
- `exercise_instruction` (TEXT)
- `options`, `precision` (JSONB)
- `grades` (TEXT[])
- `theme`, `domain`, `subdomain`, `level`
- `status`, `delay`, `transform_type`, `multiple_answers`
- `created_at`, `updated_at`, `created_by`

### Variable Syntax (ubumark)

The current parser (`src/lib/ubumark/parameterization/`) supports:

| Syntax                     | Description                | Example                |
| -------------------------- | -------------------------- | ---------------------- |
| `{{varName}}`              | Variable reference         | `{{a}}`, `{{sum}}`     |
| `{{random:min..max}}`      | Random integer             | `{{random:1..10}}`     |
| `{{min..max}}`             | Random integer (shorthand) | `{{1..10}}`            |
| `{{random:min..max!excl}}` | With exclusions            | `{{random:1..10!5,7}}` |
| `{{random:n.m}}`           | Decimal by digits          | `{{random:2.3}}`       |
| `{{eval:expr}}`            | Expression evaluation      | `{{eval:a+b}}`         |
| `{{blank:N}}`              | Fill-in-blank placeholder  | `{{blank:1}}`          |

**NOT SUPPORTED** (legacy syntax):

- `{@:varName}` - Old variable reference
- `{#:min-max}` - Old random integer
- `{eval:expr}` - Old eval (without double braces)

---

## Issues Found (All Resolved ✅)

### 1. ~~Missing `shared` Column in Database~~ ✅ FIXED

**Problem**: The TypeScript type `QuestionTemplate` has `shared?: SharedVariationDefaults` but there is no corresponding column in the database.

**Solution**: Migration `20260126083727_add_shared_column_and_cleanup_seeds.sql` adds `shared JSONB` column.

### 2. ~~Legacy Syntax in Database Seeds~~ ✅ FIXED

**Problem**: The seeds in `075_enhance_seed_with_variations.sql` use legacy syntax (`{@:var}`, `{#:1-10}`, `{eval:...}`).

**Solution**: Migration deletes all legacy seeds. Database is now clean for fresh import.

### 3. ~~Bug in Migration Script for Single-Variation Corrections~~ ✅ FIXED

**Problem**: Questions with exactly 1 variation didn't have their corrections processed.

**Solution**: Added handling in `question-transformer.ts` for `variationCount === 1 && hasCorrections`.

### 4. ~~Test Failures in correction-integration.test.ts~~ ✅ FIXED

**Problem**: 44 failing tests due to issue #3.

**Solution**: Bug fixed + test expectations updated. All 440 migration tests pass.

---

## Migration Scripts Status

| Script                           | Location             | Status                       |
| -------------------------------- | -------------------- | ---------------------------- |
| `syntax-converter.ts`            | `src/lib/migration/` | ✅ 118 tests pass            |
| `question-transformer.ts`        | `src/lib/migration/` | ✅ 56 tests pass (bug fixed) |
| `correction-integration.test.ts` | `src/lib/migration/` | ✅ 51 tests pass             |
| All migration tests              | `src/lib/migration/` | ✅ **440 tests pass**        |

---

## Action Plan (Phases 1-3 Complete ✅)

### Phase 1: Database Schema Fix ✅

- Created migration `20260126083727_add_shared_column_and_cleanup_seeds.sql`
- Deletes legacy seeds, adds `shared JSONB` column
- Applied via `pnpm db:migrate`
- Types regenerated via `pnpm db:types`

### Phase 2: Fix Migration Script Bug ✅

- Fixed `question-transformer.ts` to handle single-variation corrections
- All 440 migration tests pass

### Phase 3: Update API ✅

- POST `/api/questions/templates` now stores `shared` field
- PUT `/api/questions/templates/[id]` now updates `shared` field

### Phase 4: Run Migration (PENDING)

1. ✅ All tests pass
2. ✅ Database schema updated (clean, no legacy data)
3. **TODO**: Import questions from TinyMath using updated scripts

---

## Files Reference

### Core System

- `src/lib/questions/types.ts` - Type definitions
- `src/lib/questions/generator/instance-generator.ts` - Instance generation
- `src/lib/questions/validators/template-validator.ts` - Template validation

### Migration

- `src/lib/migration/syntax-converter.ts` - TinyMath → UbuMaths syntax
- `src/lib/migration/question-transformer.ts` - Full question transformation
- `extern/new-tinymath/apps/ubumaths/src/lib/questions/questions.ts` - Source questions

### API

- `src/routes/api/questions/templates/+server.ts` - CRUD endpoints
- `src/routes/api/questions/generate/[id]/+server.ts` - Instance generation

### Database

- `supabase/migrations/070_create_question_templates.sql` - Original schema
- `supabase/migrations/074_add_template_variations.sql` - Variations support
- `supabase/migrations/075_enhance_seed_with_variations.sql` - Seeds (deleted by migration below)
- `supabase/migrations/20260126083727_add_shared_column_and_cleanup_seeds.sql` - Adds `shared`, cleans legacy data

---

## Decision Log

| Date       | Decision                            | Rationale                                         |
| ---------- | ----------------------------------- | ------------------------------------------------- |
| 2026-01-26 | Add `shared` column to DB           | TypeScript type requires it, API doesn't store it |
| 2026-01-26 | Remove legacy `{@:var}` syntax      | Parser doesn't support it, causes confusion       |
| 2026-01-26 | Keep both random syntaxes           | `{{random:1..10}}` and `{{1..10}}` both supported |
| 2026-01-26 | Fix single-variation correction bug | Tests failing, blocks migration                   |
| 2026-01-26 | Apply migration & regenerate types  | Database ready for fresh import                   |

---

## Completed Work (2026-01-26)

### 1. Database Migration Created & Applied

**File**: `supabase/migrations/20260126083727_add_shared_column_and_cleanup_seeds.sql`

- Deletes all legacy seed templates (unsupported `{@:var}` syntax)
- Adds `shared JSONB` column for SharedVariationDefaults
- Updates table comments
- ✅ Migration applied via `pnpm db:migrate`
- ✅ TypeScript types regenerated via `pnpm db:types`

### 2. Bug Fix in question-transformer.ts

**Location**: Lines 1442-1471

Added handling for single-variation questions with corrections:

```typescript
} else if (variationCount === 1 && hasCorrections) {
  // Single variation with correction → per-variation[0]
  const questionCorrection = transformCorrection(
    correctionDetailss[0],
    correctionFormats[0],
    warnings,
    stats
  );
  if (questionCorrection) {
    perVariation[0].correction = questionCorrection;
  }
}
```

### 3. API Updates

- **POST /api/questions/templates**: Now stores `shared` field
- **PUT /api/questions/templates/[id]**: Now updates `shared` field

### 4. Test Fixes

Fixed test expectations in `correction-integration.test.ts`:

- Changed from expecting concatenated steps (1) to separate steps array (3)
- Updated conditional syntax expectations: `{{if:{{a}}<10|...}}` not `{{if:a<10|...}}`
- Fixed tests using `correction` directly instead of `correction.steps`

**Result**: All 440 migration tests pass.

---

## Next Steps

1. [x] Create migration: add `shared` column ✅ `20260126083727_add_shared_column_and_cleanup_seeds.sql`
2. [x] Create migration: delete legacy seeds ✅ (same migration deletes all seeds)
3. [x] Fix `question-transformer.ts` bug ✅ Single-variation corrections now processed
4. [x] Update API to handle `shared` field ✅ POST and PUT endpoints updated
5. [x] Verify all tests pass ✅ **440 migration tests pass**
6. [x] Apply migration ✅ `pnpm db:migrate` executed
7. [x] Regenerate TypeScript types ✅ `pnpm db:types` executed
8. [ ] **Run full migration**: Import questions from TinyMath using updated scripts
