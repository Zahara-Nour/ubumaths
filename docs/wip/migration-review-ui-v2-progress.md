# Migration Review UI v2 - Progress

## Status: COMPLETED

## Summary

Updated the migration review UI (`/dashboard/admin/migration`) to support fill-in-blanks v2 fields produced by the updated transformer.

## Changes Made

### Phase 1: Types & Validation Backend (COMPLETED)

**1.1 - QuestionEntry.transformed type** (`+page.server.ts`)

- Removed `type: string` (now inferred from structure)
- Added typed `shared?` object with v2 fields: statement, variables, solution, correction, choices, validationRules, requiredForm, blankDefaults, answerFormats
- Changed `variations?` from `unknown[]` to properly typed array with v2 fields (blanks as `TemplateBlank[]`, answerFormats, validationRules, requiredForm, blankDefaults)
- Added `options?` and `defaultDisplayOptions?`

**1.2 - Zod schemas** (`migration-review.ts`)

- Added new schemas: `precisionSchema`, `requiredFormSchema`, `validationRuleSchema` (7-type discriminated union), `unitConfigSchema`, `blankDefaultsSchema`, `blankSchema`, `answerFormatsSchema`
- Updated `variationSchema`: made `solution` optional, added v2 fields
- Updated `sharedDefaultsSchema`: added v2 fields
- Updated `editedQuestionTemplateSchema`: removed `type`, added `options`
- Simplified `questionTypeSchema` to `['fill_in_blanks', 'multiple_choice']`

### Phase 2: Frontend Display (COMPLETED)

**2.1 - QuestionCompareView.svelte**

- Added v2 type imports
- Inferred question type from structure (choices presence) instead of `type` field
- Added shared sections display: answerFormats, requiredForm, validationRules, blankDefaults
- Replaced raw JSON variation display with structured field-by-field display
- Updated blank resolution logic for template expressions
- Improved Instance Generated blanks display with resolved values

**2.2 - QuestionCard.svelte**

- Added `typeLabel` derived from `stats.detectedType`
- Added type Badge (QCM/Blancs) in status area

### Phase 3: Edit Form (COMPLETED)

**3.1 - MigrationQuestionEditForm.svelte**

- Updated local interfaces (Blank, Variation, SharedDefaults, EditedQuestion) with v2 fields
- Removed `type` references
- Added blanks editor: expectedAnswer editable, prefilled editable, metadata read-only
- Added answerFormats key-value editor
- Added read-only requiredForm and validationRules display
- Made Solution section optional for fill-in-blanks

### Phase 4: Verification (IN PROGRESS)

- Svelte autofixer: all 3 .svelte files clean (1 pre-existing warning on initialData in edit form)
- ESLint: all 5 files clean
- TypeScript: clean (only SvelteKit path alias noise)
- Code review: passed (Excellent score, 1 NaN fix applied)
- Commit: done

## Files Modified

| File                                                                                            | Phase |
| ----------------------------------------------------------------------------------------------- | ----- |
| `src/routes/(protected)/dashboard/admin/migration/[theme]/[domain]/[subdomain]/+page.server.ts` | 1.1   |
| `src/lib/server/validation/migration-review.ts`                                                 | 1.2   |
| `src/lib/components/migration/QuestionCompareView.svelte`                                       | 2.1   |
| `src/lib/components/migration/QuestionCard.svelte`                                              | 2.2   |
| `src/lib/components/migration/MigrationQuestionEditForm.svelte`                                 | 3.1   |

## Decisions

- Question type inferred from `choices` presence (consistent with `getQuestionType()` in types.ts)
- v2 metadata fields (precision, validationRules, requiredForm, unit) are read-only in editor (editable expectedAnswer and prefilled only)
- Template expression resolution is simple string-based (not using full `generateInstance()` - follow-up optional)
- Pre-existing `state_referenced_locally` warning on initialData left as-is (intentional deep clone pattern)

## Documents Produced

- `docs/wip/migration-review-ui-v2-progress.md` (this file)
