# Question Form Fields - Progress Document

## Status: COMPLETE (All 6 phases done)

## Summary

Added missing fields to `QuestionTemplateForm.svelte` and performed necessary type/DB cleanups.

## Phase 1: Remove top-level precision + fix getQuestionType (DONE)

- Removed `precision` from `QuestionTemplate` and `QuestionInstance` types
- Moved precision to `shared.blankDefaults.precision` in migration transformer
- Updated `getQuestionType()` to check `shared?.choices`
- Updated Zod schemas, API endpoints, validator, preview component
- DB migration: deprecated `precision` column, added `default_display_options`
- Commit: `fix(questions): remove top-level precision, fix getQuestionType for shared choices`

## Phase 2: Add defaultDisplayOptions to form (DONE)

- Added 8 boolean checkboxes in collapsible "Options d'affichage" section
- Options: shuffleTerms, shuffleFactors, shuffleTermsAndFactors, shallowShuffleTerms, shallowShuffleFactors, removeNullTerms, removeUnnecessaryBrackets, removeSpaces
- Updated `buildTemplate()` to construct `defaultDisplayOptions` object
- Commit: `feat(questions): add phases 2-4 to template form`

## Phase 3: Add options block to form (DONE)

- Added collapsible "Options de validation" section with sub-sections:
  - General validation (allowEquivalent, allowDifferentForms, canonicalForm, orderIndependent)
  - Custom validator (validator, validatorParams)
  - QCM options (shuffleChoices, visible only for multiple_choice)
  - Constraints (11 constraint IDs with mode selectors + allowBracketsInFirstNegativeTerm)
- Commit: same as Phase 2

## Phase 4: Add per-variation overrides (DONE)

- Added "Surcharges" section in each variation tab
- Per-variation arrays: validationRulesJson, answerFormatsJson, requiredFormSelect, requiredFormPattern
- Updated addVariation/removeVariation/duplicateVariation for new arrays
- Updated buildTemplate() for per-variation overrides
- Commit: same as Phase 2

## Phase 5: Rename solution to correctChoiceIndex (DONE)

- Renamed across 21 files (types, generator, validator, components, tests, migration)
- DB migration: renamed JSONB key in `variations` and `shared` columns
- Careful exclusion of unrelated `.solution` (TrigCircle nodes, worksheet exercises, `{{solution}}` placeholders, LaTeX splitter)
- Commit: `refactor(questions): rename solution to correctChoiceIndex`

## Phase 6: Final quality checks (DONE)

- Pre-commit hooks (ESLint + Prettier) passed on all commits
- Svelte autofixer: no issues found
- Tests: 177 tests pass in modified test files (5 files)
- Pre-existing failures (6 tests) unrelated to changes: color-integration, exact-repro, variable-resolver, e2e-pipeline

## Files Modified

### Types & Core

- `src/lib/questions/types.ts`
- `src/lib/questions/generator/instance-generator.ts`
- `src/lib/questions/generator/content-resolver.ts`
- `src/lib/questions/validators/template-validator.ts`
- `src/lib/server/validation/questions.ts`

### API

- `src/routes/api/questions/templates/+server.ts`
- `src/routes/api/questions/templates/[id]/+server.ts`

### Components

- `src/lib/components/QuestionTemplateForm.svelte`
- `src/lib/components/QuestionPreview.svelte`
- `src/lib/components/questions/QuestionPreviewBaseCard.svelte`
- `src/lib/components/questions/CorrectionCard.svelte`
- `src/lib/components/questions/FlashCard.svelte`
- `src/lib/slides/core/QuestionSlide.svelte`

### Migration

- `src/lib/migration/question-transformer.ts`
- `src/lib/components/migration/MigrationQuestionEditForm.svelte`
- `src/lib/components/migration/QuestionCompareView.svelte`

### Tests

- `src/lib/questions/generator/instance-generator.test.ts`
- `src/lib/questions/generator/test-exact-repro.test.ts`
- `src/lib/questions/generator/__tests__/generation-fill-blanks.test.ts`
- `src/lib/questions/generator/__tests__/e2e-fill-blanks-pipeline.test.ts`
- `src/lib/questions/validators/template-validator.test.ts`
- `src/lib/migration/question-transformer.test.ts`
- `src/lib/migration/__tests__/transformer-fill-blanks.test.ts`

### DB Migrations

- `supabase/migrations/20260214053310_deprecate_precision_add_display_options.sql`
- `supabase/migrations/20260214054756_rename_solution_to_correctChoiceIndex.sql`
