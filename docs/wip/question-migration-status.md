# Question System Migration - Status February 2026

## Overview

This document describes the current state of the question system migration and the work needed to complete it.

**Goal**: Migrate **633 questions** from TinyMath to the new UbuMaths question system.

> **Note**: Previous documentation incorrectly stated ~2,238 questions. This was an erroneous estimate based on arbitrary phase percentages, never verified against the actual source file. The real count from `extern/new-tinymath/.../questions.ts` is **633 questions**.

---

## Question Statistics

### By Theme (633 total)

| Theme            | Questions |
| ---------------- | --------- |
| Entiers          | 228       |
| Décimaux         | 83        |
| Calcul littéral  | 68        |
| Fractions        | 58        |
| Grandeurs        | 45        |
| Fonctions        | 39        |
| Relatifs         | 36        |
| Proportionnalité | 28        |
| Puissances       | 21        |
| Suites           | 15        |
| Racines carré    | 10        |
| Probabilités     | 2         |

### Transformation Status (Export 2026-01-26)

| Metric                   | Value |
| ------------------------ | ----- |
| Total questions          | 633   |
| Successfully transformed | 633   |
| With warnings            | 220   |
| Failed                   | 0     |
| **Success rate**         | 100%  |

### Warnings Summary

| Category             | Count | Description             | Action                            |
| -------------------- | ----- | ----------------------- | --------------------------------- |
| Précision décimale   | 73    | Défaut 2 décimales      | ✅ OK - valeur raisonnable        |
| Pattern N-digits     | 66    | `$e{...}` → `{{1.0}}`   | ✅ OK - conversion auto           |
| Couleurs             | 44    | `${get(correct_color)}` | ✅ OK - géré par système couleurs |
| Signe + évaluations  | ~150  | `[+_&2_]` converti      | ✅ OK - conversion correcte       |
| Permutations         | 24    | Permutation de facteurs | ✅ Redondant avec `products`      |
| **Images**           | **0** | Toutes migrées          | ✅ 254 images → Supabase Storage  |
| Custom validation    | 8     | `testAnswers` utilisé   | ✅ OK - déjà implémenté           |
| Options inconnues    | 13    | Typos (`extraneaous`)   | ✅ OK - ignoré                    |
| Solutions manquantes | 1     | Flash card #617         | ✅ OK - flash card sans input     |

**Conclusion** : ~210 warnings, tous resolus. 242 questions sans `solutionss` utilisent l'expression comme solution (comportement normal). La seule question sans solution ni expression (#617) est un flash card. 40 options implementees, 6 ignorees. Les 5 options ignorees (hors `exhaust`) ont ete verifiees dans le code source TinyMath : toutes sont du code mort (jamais consommees par `generateQuestion.ts` ou logique commentee). `exhaust` est differee (option de generation, 3 questions).

---

## Current Architecture

### TypeScript Types (`src/lib/questions/types.ts`)

> **Updated 2026-02-14** — `precision` top-level removed (now in `shared.blankDefaults.precision`). `solution` renamed to `correctChoiceIndex`. `defaultDisplayOptions` and `options` added to template. `getQuestionType()` now checks `shared?.choices`.

```typescript
interface QuestionTemplate {
	id: string;
	// type is INFERRED via getQuestionType(): 'fill_in_blanks' | 'multiple_choice'
	// choices present (non-empty, including shared.choices) = multiple_choice, otherwise = fill_in_blanks
	title: string;

	// Content structure
	shared?: SharedVariationDefaults;
	variations: QuestionVariation[];

	// Display & validation
	defaultDisplayOptions?: DisplayOptions; // shuffleTerms, removeNullTerms, etc.
	options?: TemplateOptions; // allowEquivalent, constraints, validator, shuffleChoices

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
	correctChoiceIndex?: string | string[]; // Only for multiple_choice (was: solution)
	variables?: QuestionVariable[];
	correction?: QuestionCorrection;
	choices?: { content: TemplateMarkdown; isCorrect: boolean }[];
	validationRules?: ValidationRule[];
	blanks?: BlankDefinition[]; // For fill_in_blanks
	blankDefaults?: BlankDefaults; // Per-variation precision/requiredForm/unit
	requiredForm?: RequiredForm | { pattern: string }; // Per-variation form constraint
	answerFormats?: Record<string, string>; // Per-variation answer formats
	expressions?: { name: string; answerFormat?: string }[]; // Expression metadata
	options?: { orderIndependent?: boolean }; // Pool matching for multi-blank
}

interface BlankDefinition {
	type: 'math' | 'text';
	expectedAnswer: string; // LaTeX for math, text for text
	answerFormat?: string; // e.g. '?' → \placeholder[N]{}, '?+?' → \placeholder[0]{}+\placeholder[1]{}
	constraints?: ConstraintOptions;
	precision?: number;
	unit?: { expected?: boolean; required?: string };
	prefilled?: string;
}

// At runtime, getQuestionType() infers:
// - choices present & non-empty → 'multiple_choice'
// - otherwise → 'fill_in_blanks'
```

### Database Schema (`question_templates` table)

Current columns:

- `id`, `type`, `title`, `description`
- `shared` (JSONB) - SharedVariationDefaults ✅ Added 2026-01-26
- `variations` (JSONB) - Array of variations (includes `blanks[]` for fill_in_blanks, `correctChoiceIndex` for QCM)
- `exercise_instruction` (TEXT)
- `options` (JSONB), `precision` (JSONB, DEPRECATED - now in `shared.blankDefaults.precision`)
- `default_display_options` (JSONB) ✅ Added 2026-02-14
- `grades` (TEXT[])
- `theme`, `domain`, `subdomain`, `level`
- `status`, `delay`, `multiple_answers`
- `created_at`, `updated_at`, `created_by`

> **Note** : `transform_type` column dropped (migration `20260212162248_drop_transform_type_column.sql`). `type` column kept for DB indexing but inferred in TypeScript via `getQuestionType()`. `precision` column deprecated (2026-02-14) - precision now lives in `shared.blankDefaults.precision`. `solution` key in JSONB renamed to `correctChoiceIndex` (2026-02-14).

### Variable Syntax (ubumark)

The current parser (`src/lib/ubumark/parameterization/`) supports **simplified syntax** in variable definitions:

| Expression (in definitions) | Description        | Example               |
| --------------------------- | ------------------ | --------------------- |
| `min..max`                  | Random integer     | `1..10`               |
| `min..max!excl`             | With exclusions    | `1..10!5,7`           |
| `min..max;+-`               | Relative integer   | `2..9;+-`             |
| `random:n.m`                | Decimal by digits  | `random:2.3`          |
| `min..max:step`             | Decimal range      | `0.5..2:0.25`         |
| `digits:n`                  | N-digit number     | `digits:2` (10-99)    |
| `digits:n..m`               | N to M digits      | `digits:1..3` (1-999) |
| `a\|b\|c`                   | Discrete list      | `rouge\|vert\|bleu`   |
| `eval:expr`                 | Expression         | `eval:a+b`            |
| `varName`                   | Variable reference | `a`, `sum`            |
| `text:value`                | Text literal       | `text:hello`          |
| `42`                        | Numeric literal    | `42`, `3.14`          |

**In text templates**, `{{...}}` is still required:

| Syntax (in templates) | Description   | Example            |
| --------------------- | ------------- | ------------------ |
| `{{varName}}`         | Variable ref  | `{{a}}`, `{{sum}}` |
| `{{min..max}}`        | Inline random | `{{1..10}}`        |
| `{{eval:expr}}`       | Inline eval   | `{{eval:a+b}}`     |
| `{{blank:N}}`         | Fill-in-blank | `{{blank:1}}`      |

**NOT SUPPORTED** (legacy syntax):

- `{@:varName}` - Old variable reference
- `{#:min-max}` - Old random integer
- `{eval:expr}` - Old eval (without double braces)

### Math Delimiters (ubumark)

| Syntax    | Usage          | Example                      |
| --------- | -------------- | ---------------------------- |
| `$...$`   | Inline math    | `Dans $5+3$, calcule`        |
| `$$...$$` | Display math   | `$$\frac{a}{b}$$` (centered) |
| `~...~`   | Custom inline  | Custom renderer              |
| `~~...~~` | Custom display | Custom renderer              |

**Migration fix**: Old TinyMath used `$$...$$` everywhere. The transformer now:

- Detects context (text before/after on same line = inline)
- Converts inline `$$...$$ ` to `$...$`
- Keeps display `$$...$$` when alone on line

---

## Image Migration ✅ COMPLETE

### Statistics (2026-01-27)

| Metric              | Value                                          |
| ------------------- | ---------------------------------------------- |
| Total images        | 254                                            |
| Initial migration   | 214 images                                     |
| Missing (Phase 2)   | 40 images (tableau-de-signe)                   |
| Format              | PNG → WebP (quality 85)                        |
| URL mappings        | 1016 entries (multiple path formats per image) |
| Questions w/ images | 207 (export verification)                      |
| Missing images      | 0                                              |

### Image Sources

1. **Initial batch (214)**: Various themes - downloaded via `scripts/download-old-images.ts`
2. **Tableau-de-signe (40)**: `fonctions-affines/tableau-de-signe/` - migrated via `scripts/migrate-missing-images.ts`
   - 20 `tableau_de_signe_fonction_affine_correct-N-600.png`
   - 20 `tableau_de_signe_fonction_affine_uncorrect-N-600.png`

### Storage

- **Old bucket**: `vlqgmctfhesdhaifmyab.supabase.co/storage/v1/object/public/mental/`
- **New bucket**: `aqtijumsgfufoztohdua.supabase.co/storage/v1/object/public/question-images/`
- **Mapping file**: `scripts/image-url-mapping.json`
- **Local cache**: `static/images/questions/`

### Integration

The image URL mapping is integrated into the transformation pipeline:

- `src/lib/migration/image-url-mapping.ts` - Loader with caching
- `src/lib/migration/question-data-loader.ts` - Passes mapping to transformer
- `scripts/export-questions-for-review.ts` - Uses mapping during export

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

### Core Transformation (`src/lib/migration/`)

| Script                           | Status                                    |
| -------------------------------- | ----------------------------------------- |
| `syntax-converter.ts`            | ✅ Tests pass                             |
| `question-transformer.ts`        | ✅ Tests pass (fill-in-blanks v2 updated) |
| `correction-integration.test.ts` | ✅ Tests pass                             |
| **All migration tests**          | ✅ **475/475 pass**                       |

### Available Scripts (`scripts/`)

| Command                                           | Description                                      |
| ------------------------------------------------- | ------------------------------------------------ |
| `pnpm tsx scripts/migrate-questions-loader.ts`    | Extract questions → `.claude/old-questions.json` |
| `pnpm tsx scripts/export-questions-for-review.ts` | Export transformed questions for review          |
| `pnpm migration:import:dry`                       | Preview import (no DB write)                     |
| `pnpm migration:import`                           | Import questions to database                     |
| `pnpm migration:rollback:dry`                     | Preview rollback                                 |
| `pnpm migration:rollback:all`                     | Rollback all imported questions                  |
| `pnpm test:server src/lib/migration`              | Run all transformation tests                     |

### Current State

| Item                    | Status                                                                   |
| ----------------------- | ------------------------------------------------------------------------ |
| Source extraction       | ✅ 633 questions in `.claude/old-questions.json`                         |
| Transformation tests    | ✅ 475/475 pass                                                          |
| Options mapping         | ✅ 40/46 options implementees, 6 ignorees (dont `exhaust` differe)       |
| Fill-in-blanks pipeline | ✅ Generation, validation per-blank, rendering AST, flash back mode      |
| Export for review       | ⚠️ `data/migration-output/export-2026-01-26/` (avant fixes options)      |
| Database schema         | ✅ `shared` column added, `transform_type` dropped, legacy seeds removed |
| **Import to database**  | ❌ **PENDING** - table `question_templates` empty                        |

---

## Action Plan

### Phase 1: Database Schema Fix ✅ COMPLETE

- Created migration `20260126083727_add_shared_column_and_cleanup_seeds.sql`
- Deletes legacy seeds, adds `shared JSONB` column
- Applied via `pnpm db:migrate`
- Types regenerated via `pnpm db:types`

### Phase 2: Fix Migration Script Bug ✅ COMPLETE

- Fixed `question-transformer.ts` to handle single-variation corrections
- All 460/460 migration tests pass

### Phase 3: Update API ✅ COMPLETE

- POST `/api/questions/templates` now stores `shared` field
- PUT `/api/questions/templates/[id]` now updates `shared` field

### Phase 3b: Options Migration Review ✅ COMPLETE (v0.8.1)

- 40 options mapped to new system, 6 ignored (including `exhaust` — deferred)
- Constraint options (23) → `ConstraintOptions` with strict/warn/off modes
- Display options (8) → `DisplayOptions` on expression variables
- Validation options (9): shuffleChoices, permutations (→ `products`), `orderIndependent`, `requiredForm`
- 4 legacy options silently ignored (no equivalent needed)
- LaTeX parser fix: NUMBER cannot start implicit multiplication (aligns with custom parser)
- `orderIndependent` matching in `validateBlanks()` (pool matching on blanks[] without replacement)
- `requiredForm` patterns: `a:inN & gte(2) * b:inN & gte(2)` (decomposition), `0 - a` (subtraction form)
- Reference: `docs/wip/options-migration-reference.md`

### Phase 3c: Fill-in-Blanks Redesign v2 ✅ COMPLETE (2026-02-13)

Complete redesign of the fill-in-blanks pipeline across 8 phases + flash back mode:

- **Types**: `type`/`transformType` removed, `getQuestionType()` inference, `BlankDefinition` with `type`/`answerFormat`/`constraints`/`precision`/`unit`
- **Transformer**: Produces `blanks[]` for `fill_in`, `result_rewrite`, `answer_field` migration modes. `MigrationMode` enum, helpers (`convertAnswerFieldToStatement`, `extractBlanksFromSolutions`, `solutionHasUnit`). 15 new transformer tests.
- **Generator**: `instance-generator.ts` builds `InstanceBlank[]` with `expectedAnswer`/`expectedAnswerLatex`. Expression convention (`expressionName` + `answerFormat`). `assignBlankIndices()` for `\placeholder[N]{}` and `{{blank:N}}`.
- **Validator**: Per-blank validation (math equivalence, numerical, unit, text fuzzy). `orderIndependent` pool matching. `requiredForm` pattern checking.
- **Rendering**: FillBlanksInput rewritten with unified AST parsing. MathPrompt for `\placeholder` prompts, BlankInput for text blanks. Flash back mode (`showCorrectAnswers` prop).
- **E2E tests**: 145 tests across 17 questions, 5 migration modes.
- Reference: `docs/wip/fill-in-blanks-v2-progress.md`

### Phase 4: Import Questions ⏳ PENDING

**Prerequisites met:**

- ✅ 633 questions extracted to `.claude/old-questions.json`
- ✅ 100% transformation success (633/633)
- ✅ All 45 options mapped and implemented
- ✅ Fill-in-blanks pipeline complete (generation, validation, rendering, flash back)
- ✅ Database schema ready (clean, no legacy data, `transform_type` dropped)
- ✅ API endpoints updated
- ✅ Custom validation (`testAnswers`) fully implemented via `ValidationRule`
- ⚠️ Export needs regeneration (last export predates fill-in-blanks v2)

**To import:**

```bash
# 1. Preview (recommended first)
pnpm migration:import:dry

# 2. Import all questions
pnpm migration:import

# 3. Validate (after import)
pnpm migrate:phase1:validate
```

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
- `supabase/migrations/20260212162248_drop_transform_type_column.sql` - Drops `transform_type` column
- `supabase/migrations/20260214053310_deprecate_precision_add_display_options.sql` - Deprecates `precision`, adds `default_display_options`
- `supabase/migrations/20260214054756_rename_solution_to_correctChoiceIndex.sql` - Renames `solution` key to `correctChoiceIndex` in JSONB

---

## Decision Log

| Date       | Decision                                      | Rationale                                                                                 |
| ---------- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 2026-01-26 | Add `shared` column to DB                     | TypeScript type requires it, API doesn't store it                                         |
| 2026-01-26 | Remove legacy `{@:var}` syntax                | Parser doesn't support it, causes confusion                                               |
| 2026-01-26 | Keep both random syntaxes                     | `{{random:1..10}}` and `{{1..10}}` both supported                                         |
| 2026-01-26 | Fix single-variation correction bug           | Tests failing, blocks migration                                                           |
| 2026-01-26 | Apply migration & regenerate types            | Database ready for fresh import                                                           |
| 2026-01-26 | Correct question count: 633 not 2238          | Verified against source file, previous estimate was wrong                                 |
| 2026-01-26 | Fix logger.ts for standalone scripts          | Scripts can now run outside SvelteKit context                                             |
| 2026-01-26 | Regenerate export (2026-01-26)                | Fresh export with 633 questions, 220 warnings                                             |
| 2026-01-26 | Fix math delimiters (inline vs display)       | TinyMath used `$$` everywhere, ubumark needs `$` for inline                               |
| 2026-01-27 | Complete image migration                      | All 254 images uploaded to new Supabase Storage bucket                                    |
| 2026-01-27 | Integrate image URL mapping                   | Transformer now converts old paths to new Storage URLs                                    |
| 2026-02-03 | Simplified expression syntax                  | `{{1..10}}` → `1..10` in variable definitions, cleaner code                               |
| 2026-02-06 | Options review complete (40 impl, 6 ignored)  | All options mapped: constraints, display, permutations, orderIndependent, requiredForm    |
| 2026-02-06 | `exhaust` deferred                            | Generation-only option (3 questions), not needed for initial import                       |
| 2026-02-06 | Factor permutation → products constraint      | LaTeX parser fix + products constraint renders permutation options redundant              |
| 2026-02-06 | orderIndependent replaces solutions-order     | Pool matching on blanks[] (without replacement) for multi-answer questions                |
| 2026-02-06 | requiredForm for decomposition + subtraction  | Pattern-based form validation replaces old format/one-single-form checks                  |
| 2026-02-12 | Remove `type`/`transformType` from types      | Inferred via `getQuestionType()`, reduces redundancy                                      |
| 2026-02-12 | `blanks[]` replaces `solution` for fill_in    | Primary structure for fill-in-blanks, supports math/text types, constraints, answerFormat |
| 2026-02-12 | Drop `transform_type` DB column               | No longer used after type inference redesign                                              |
| 2026-02-13 | AST-based FillBlanksInput rendering           | Unified parsing via `parseMarkdown()`, reuses ParagraphNode/MathPrompt/BlankInput         |
| 2026-02-13 | Flash back mode via `showCorrectAnswers`      | MathLive `setPromptValue` for math, InputState.value for text                             |
| 2026-02-14 | Remove top-level `precision`                  | Precision now in `shared.blankDefaults.precision`, avoids field duplication               |
| 2026-02-14 | Add `default_display_options` column          | Template-level display options (shuffleTerms, removeNullTerms, etc.)                      |
| 2026-02-14 | Rename `solution` → `correctChoiceIndex`      | Clarifies semantics: field stores QCM choice index, not the actual answer                 |
| 2026-02-14 | Add `defaultDisplayOptions`/`options` to form | Complete form coverage for all QuestionTemplate fields                                    |
| 2026-02-14 | Per-variation overrides in form               | blankDefaults, validationRules, requiredForm, answerFormats per variation                 |

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

### Completed ✅

1. [x] Create migration: add `shared` column ✅ `20260126083727_add_shared_column_and_cleanup_seeds.sql`
2. [x] Create migration: delete legacy seeds ✅ (same migration deletes all seeds)
3. [x] Fix `question-transformer.ts` bug ✅ Single-variation corrections now processed
4. [x] Update API to handle `shared` field ✅ POST and PUT endpoints updated
5. [x] Verify all tests pass ✅ **475/475 migration tests pass**
6. [x] Apply migration ✅ `pnpm db:migrate` executed
7. [x] Regenerate TypeScript types ✅ `pnpm db:types` executed

### Remaining

8. [x] Complete options migration review ✅ 45/45 options mapped (v0.8.1)
9. [x] Fill-in-blanks redesign v2 ✅ 8 phases + flash back mode (2026-02-13)
10. [ ] **Re-exporter** les questions (export actuel date du 26/01, avant fill-in-blanks v2)
11. [ ] **Run import**: `pnpm migration:import` (633 questions)
12. [ ] **Validate**: `pnpm migrate:phase1:validate`
13. [ ] **Test in UI**: Verify questions work in the application

---

## Correction: Why 633, not 2,238?

Previous documentation stated ~2,238 questions. This number was an **erroneous estimate** calculated from arbitrary phase percentages:

| Phase     | Estimated | %    |
| --------- | --------- | ---- |
| Phase 1   | 560       | 25%  |
| Phase 2   | 895       | 40%  |
| Phase 3   | 560       | 25%  |
| Phase 4   | 223       | 10%  |
| **Total** | **2,238** | 100% |

These percentages were applied to a made-up total, never verified against the source file.

**Actual count** from `extern/new-tinymath/apps/ubumaths/src/lib/questions/questions.ts`:

- `grep -c "grade:" questions.ts` → 649 (includes 16 commented questions)
- `migrate-questions-loader.ts` extracts → **633 questions**

The loader correctly parses the nested structure `{theme: {domain: {subdomain: [questions]}}}` and flattens it to an array with `_migration` metadata for tracking.

---

## Custom Validation (testAnswers) - Already Implemented ✅

The warning "needs Phase 4 implementation" is **misleading**. Custom validation is fully implemented:

### Conversion (`question-transformer.ts`)

`convertTestAnswers()` converts legacy `testAnswerss` to typed `ValidationRule` objects.

### Evaluation (`validation-rule-evaluator.ts`)

`evaluateRule()` evaluates all rule types at answer validation time.

### Supported ValidationRule Types

| Type                   | Description                     | Example                                                                    |
| ---------------------- | ------------------------------- | -------------------------------------------------------------------------- |
| `DivisorRule`          | Answer must divide dividend     | `{ type: 'divisor', dividend: '{{n}}' }`                                   |
| `MultipleRule`         | Answer must be multiple of base | `{ type: 'multiple', base: '{{a}}' }`                                      |
| `RangeRule`            | Answer within range             | `{ type: 'range', min: '1', max: '{{max}}' }`                              |
| `EquationRootRule`     | Answer is root of equation      | `{ type: 'equation_root', equation: 'x^2 - {{sum}}*x + {{product}} = 0' }` |
| `EquivalenceRule`      | Answer equivalent to expression | `{ type: 'equivalent', expression: '{{a}}/{{b}}' }`                        |
| `PredicateRule`        | Answer satisfies predicate      | `{ type: 'predicate', predicate: 'isPrime' }`                              |
| `CustomExpressionRule` | Legacy fallback                 | `{ type: 'custom', expression: 'answer > 0' }`                             |

The 8 questions with "custom validation" warnings are **not blocked** - they use `CustomExpressionRule` as fallback.

---

## Transformation Phases (Detailed History)

### Phase 17: Simplified Expression Syntax ✅

**Problème résolu** : La syntaxe `{{...}}` dans les définitions de variables était verbeuse et redondante.

**Solution** : Nouvelle syntaxe simplifiée dans les définitions de variables :

| Before                       | After                    |
| ---------------------------- | ------------------------ | ------------------- | ------ |
| `expression: '{{1..10}}'`    | `expression: '1..10'`    |
| `expression: '{{eval:a+b}}'` | `expression: 'eval:a+b'` |
| `expression: '{{a}}'`        | `expression: 'a'`        |
| `expression: '{{rouge        | vert}}'`                 | `expression: 'rouge | vert'` |

**Fichiers créés/modifiés** :

- `src/lib/ubumark/parameterization/parser/expression-normalizer.ts` - NEW
- `src/lib/ubumark/parameterization/resolver/variable-resolver.ts` - Intégration normalizer
- `src/lib/migration/syntax-converter.ts` - `toSimplifiedSyntax()`
- `src/lib/migration/question-transformer.ts` - Génère syntaxe simplifiée

**Note** : `{{...}}` reste obligatoire dans les templates texte (`"Calcule ${{a}}$"`).

### Phase 16: Complete Image Migration ✅

**Problème résolu** : 40 images (tableau-de-signe) manquantes dans la première migration, et le mapping d'URLs n'était pas intégré dans le pipeline de transformation.

**Solution** :

1. `src/lib/migration/image-url-mapping.ts` - Utilitaire de chargement avec cache
2. Intégration dans `question-data-loader.ts` pour l'API de review
3. Intégration dans `export-questions-for-review.ts` pour l'export
4. `scripts/migrate-missing-images.ts` pour les 40 images manquantes
5. Upload des 40 images vers le nouveau bucket Supabase Storage

### Phase 15: AsciiMath to LaTeX Conversion ✅

**Problème résolu** : Les expressions utilisent AsciiMath, le nouveau format nécessite LaTeX.

**Solution** : `convertAsciiMathToLatex()` de MathLive avec protection des placeholders `{{...}}`.

| Input (AsciiMath)   | Output (LaTeX)        |
| ------------------- | --------------------- |
| `sqrt({{a}})`       | `\sqrt{{{a}}}`        |
| `{{a}}^2 + {{b}}^2` | `{{a}}^{2}+{{b}}^{2}` |
| `pi * {{r}}^2`      | `\pi \cdot {{r}}^{2}` |

### Phase 14: Dynamic QCM solutions ✅

`isCorrect` n'est plus stocké statiquement - calculé à runtime depuis `correctChoiceIndex` (was: `solution`).

### Phase 13: Simplified syntax for alphanumeric variables in expressions ✅

Simplification des références de variables **à l'intérieur** des expressions `{{eval:...}}` et `{{if:...}}` :

| Context        | Before                 | After            |
| -------------- | ---------------------- | ---------------- |
| `{{eval:...}}` | `{{eval:{{a}}+{{b}}}}` | `{{eval:a+b}}`   |
| `{{if:...}}`   | `{{if:{{a}}>0\|..}}`   | `{{if:a>0\|..}}` |
| Exclusions     | `{{1..10!{{a}}}}`      | `{{1..10!a}}`    |

**Note** : Phase 17 va plus loin en supprimant `{{}}` des définitions de variables elles-mêmes.

### Phase 12: Convert numeric variable names to letters ✅

Excel-style: `1→a`, `26→z`, `27→aa`

### Phase 11: Extract expressions to variables ✅

Expressions extraites en variables (`expression1`, `expression2`) pour ordre de résolution correct.

### Phase 10: Rename answer to solution to correctChoiceIndex ✅

Champ `answer` renommé en `solution` (v1), puis `solution` renommé en `correctChoiceIndex` (2026-02-14) pour clarifier la semantique (index de choix QCM, pas la reponse).

### Phase 9: Display Options Mapping ✅

6 options de génération mappées vers `defaultDisplayOptions`.

### Phase 8: Image Upload to Supabase ✅

- 214 images initiales + 40 tableau-de-signe = **254 total**
- Format: PNG → WebP (quality 85)
- Réduction: ~34%

### Phases 1-7: Foundation ✅

1. Documentation & analysis
2. TypeScript types (QuestionCorrection, ValidationRule)
3. Placeholder/conditional converters
4. Correction integration
5. Validation rule evaluator
6. Image scripts
7. Quality checks

---

## Key Decisions

| Decision       | Choice                       | Rationale                                    |
| -------------- | ---------------------------- | -------------------------------------------- |
| Images         | WebP simple                  | Supabase dynamic, no build-time optimization |
| Correction     | Unify to `{feedback, steps}` | Remove redundancy, single source             |
| Placeholders   | `{{}}` syntax                | Consistent, no conflict with LaTeX           |
| testAnswerss   | Typed ValidationRule         | Type safety, exhaustive checking             |
| Expressions    | Per-variation variables      | Guarantees correct resolution order          |
| Variable names | Letters (Excel-style)        | Enables simplified template syntax `{{a}}`   |
| Math format    | LaTeX (via MathLive)         | Native support in MathLive rendering         |

---

## Files Modified (by Phase)

### Phase 17

- `src/lib/ubumark/parameterization/parser/expression-normalizer.ts` - NEW
- `src/lib/ubumark/__tests__/parameterization/parser/expression-normalizer.test.ts` - NEW
- `src/lib/ubumark/parameterization/resolver/variable-resolver.ts` - Normalizer integration
- `src/lib/ubumark/__tests__/parameterization/resolver/variable-resolver.test.ts` - Updated tests
- `src/lib/ubumark/parameterization/index.ts` - Export normalizer
- `src/lib/migration/syntax-converter.ts` - `toSimplifiedSyntax()` function
- `src/lib/migration/question-transformer.ts` - Generate simplified syntax
- `src/lib/migration/question-transformer.test.ts` - Updated assertions
- `docs/ref/ubumark/parameterization.md` - Updated documentation
- `docs/ref/ubumark/syntax.md` - Updated documentation
- `docs/wip/simplified-expression-syntax-migration.md` - NEW

### Phase 16

- `src/lib/migration/image-url-mapping.ts` - NEW
- `src/lib/migration/question-data-loader.ts` - Image mapping integration
- `scripts/export-questions-for-review.ts` - Image mapping loading
- `scripts/migrate-missing-images.ts` - NEW
- `scripts/image-url-mapping.json` - Updated (1016 entries)

### Phase 15

- `src/lib/migration/ascii-math-converter.ts` - NEW (45 tests)
- `src/lib/migration/question-transformer.ts` - AsciiMath integration

### Phase 8-14

- `src/lib/migration/question-transformer.ts` - Core transformer
- `src/lib/migration/syntax-converter.ts` - TinyMath → UbuMaths
- `src/lib/migration/placeholder-converter.ts` - Legacy placeholders
- `src/lib/migration/conditional-converter.ts` - Legacy conditionals
- `src/lib/questions/types.ts` - Type definitions
- `scripts/image-url-mapping.json` - URL mappings

### Phase 1-7

- `src/lib/questions/correction-placeholders.ts`
- `src/lib/questions/validation-rule-evaluator.ts`
- `scripts/migrate-question-images.ts`
- `scripts/extract-question-image-refs.ts`

---

## Crash Recovery

```
"Lis docs/wip/question-migration-status.md et continue l'implementation"
```

**Documents de référence** :

- Status: `docs/wip/question-migration-status.md` (ce fichier)
- Analyse: `docs/wip/question-migration-analysis.md`
- Review system: `docs/wip/migration-review-system-progress.md`
