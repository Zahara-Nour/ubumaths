# Test Specs Implementation Progress

## Status: Phase 1-6 Complete

## What was done

### Phase 1: Types, Schema, DB, API

- Added `TestSpec`, `TestSpecExpected` interfaces to `src/lib/questions/types.ts`
- Added `testSpecs?: TestSpec[]` to `QuestionTemplate`
- Added `testSpecSchema`, `testSpecExpectedSchema`, `constraintIdSchema` to `src/lib/questions/template-schema.ts`
- Added `testSpecs` to `questionTemplateSchema` (strict, for JSON editor)
- Added `testSpecs` to `createQuestionTemplateSchema` in `src/lib/server/validation/questions.ts`
- Added `test_specs` mapping to POST and PUT API endpoints
- Added `test_specs` to `mapDbTemplateToForm`
- Created migration: `supabase/migrations/20260308100000_add_test_specs.sql`

### Phase 2: Generator with fixed variables

- Created `src/lib/questions/generator/test-instance-builder.ts`
- `generateInstanceWithFixedVariables(template, fixedVariables, variationIndex)` builds a modified template with literal variable values and delegates to standard `generateInstance()`
- Validates variation index range and missing variables

### Phase 3: Test Spec Runner

- Created `src/lib/questions/test-spec-runner.ts`
- `runTestSpec(template, spec)` generates instance, validates answer, compares status + constraint violations
- `runAllTestSpecs(template)` runs all specs for a template
- Handles fill-in-blanks (answers[]) and QCM (selectedChoices[])

### Phase 4: UI TestSpec Editor

- Created `src/lib/components/questions/TestSpecEditor.svelte`
- Dialog with spec list (pass/fail indicators), edit form with:
  - Description, variation selector, variable fields, answer fields
  - Status selector (MySelect), constraint violations (MySelect multiple)
  - Run individual / Run All buttons
- Integrated in `QuestionTemplateForm.svelte` (Tests button next to JSON button)
- testSpecs included in buildTemplate output and loadFromTemplate

### Phase 5: Batch Runner

- Created `src/lib/components/migration/TestSpecBatchRunner.svelte`
- Progressive batch execution with progress bar
- Summary (total/passed/failed), expandable per-template results
- Integrated in subdomain migration page (Tests button in filter bar)

### Phase 6: Unit Tests (16 tests, all passing)

- `src/lib/questions/generator/__tests__/test-instance-builder.test.ts` (6 tests)
  - Fill-in-blanks with fixed variables
  - QCM with fixed variables
  - Out-of-range variation index
  - Missing variables
  - Shared variables
  - Multi-variation selection
- `src/lib/questions/__tests__/test-spec-runner.test.ts` (10 tests)
  - Correct answer passes
  - Incorrect answer expected passes
  - Status mismatch fails
  - Missing answers error
  - Generation failure error
  - Constraint violations detection
  - QCM correct choice
  - QCM missing selectedChoices error
  - Empty template specs
  - Aggregate results

## Files modified

| File                                                                                         | Action                                            |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `src/lib/questions/types.ts`                                                                 | Added TestSpec, TestSpecExpected, testSpecs field |
| `src/lib/questions/template-schema.ts`                                                       | Added testSpecSchema, constraintIdSchema          |
| `src/lib/server/validation/questions.ts`                                                     | Added testSpecs to create/update schemas          |
| `src/routes/api/questions/templates/+server.ts`                                              | Added test_specs to INSERT                        |
| `src/routes/api/questions/templates/[id]/+server.ts`                                         | Added test_specs to UPDATE                        |
| `src/lib/questions/generator/test-instance-builder.ts`                                       | **New**                                           |
| `src/lib/questions/test-spec-runner.ts`                                                      | **New**                                           |
| `src/lib/components/questions/TestSpecEditor.svelte`                                         | **New**                                           |
| `src/lib/components/migration/TestSpecBatchRunner.svelte`                                    | **New**                                           |
| `src/lib/components/QuestionTemplateForm.svelte`                                             | Tests button + dialog                             |
| `src/routes/(protected)/dashboard/admin/migration/[theme]/[domain]/[subdomain]/+page.svelte` | Tests button + batch runner                       |
| `supabase/migrations/20260308100000_add_test_specs.sql`                                      | **New**                                           |
| `src/lib/questions/generator/__tests__/test-instance-builder.test.ts`                        | **New**                                           |
| `src/lib/questions/__tests__/test-spec-runner.test.ts`                                       | **New**                                           |

## Pending

- Run `pnpm db:migrate` to apply the migration
- Run `pnpm db:types` to regenerate database.ts (adds test_specs column type)
