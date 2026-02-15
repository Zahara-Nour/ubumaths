# Migration Edit Page - Progress

## Status: Implementation complete, awaiting manual testing

## Changes Made

### Phase 1: Zod schema update

- **File**: `src/lib/server/validation/migration-review.ts`
- Added `defaultDisplayOptions` (object with 8 boolean fields) to `editedQuestionTemplateSchema`
- Added `multipleAnswers` (boolean) to `editedQuestionTemplateSchema`
- Added `correctChoiceIndex` (string | string[]) to both `variationSchema` and `sharedDefaultsSchema`

### Phase 2: New edit route

- **Created**: `src/routes/(protected)/dashboard/admin/migration/[theme]/[domain]/[subdomain]/[globalIndex]/edit/+page.server.ts`
  - Admin check, globalIndex validation
  - Loads question from export files (reuses `getLatestExportFolder()` pattern)
  - Checks for existing edits in `migration_edits` table
  - Maps data to `QuestionTemplate` format for `QuestionTemplateForm`
- **Created**: `src/routes/(protected)/dashboard/admin/migration/[theme]/[domain]/[subdomain]/[globalIndex]/edit/+page.svelte`
  - Pattern identical to questions/[id]/edit page
  - Dynamic import of `QuestionTemplateForm`
  - Breadcrumb navigation (Migration > subdomain > Question #N)
  - handleSave POSTs to existing `/api/migration/questions/{globalIndex}/edit`
  - Navigation back to review page on save/cancel

### Phase 3: Review page modification

- **File**: `src/routes/(protected)/dashboard/admin/migration/[theme]/[domain]/[subdomain]/+page.svelte`
- Removed `MigrationQuestionEditForm` import and `EditedQuestion` type
- Removed `isEditDialogOpen`, `editingQuestion` state
- Removed `handleEditSave()`, `handleEditCancel()` functions
- Removed entire `<!-- Edit Question Dialog -->` block (lines 631-674)
- Changed `handleEditClick()` to navigate to `${$page.url.pathname}/${globalIndex}/edit`
- Added `page` import from `$app/stores`
- Kept: `questionEdits` SvelteMap, `isQuestionEdited()`, `getEditedTransformed()` (used by detail dialog)

## Decisions

- `getLatestExportFolder()` duplicated (not extracted to shared module) as per plan - only ~10 lines
- `QuestionEntry` type imported from parent `+page.server.ts` (re-exported interface)
- Back URL uses raw path params (URL-encoded) for correct navigation

## Next Steps

- Manual testing of the full flow
- Delete `MigrationQuestionEditForm.svelte` after validation (separate commit)

## Files Modified

1. `src/lib/server/validation/migration-review.ts` - Modified
2. `src/routes/.../[globalIndex]/edit/+page.server.ts` - Created
3. `src/routes/.../[globalIndex]/edit/+page.svelte` - Created
4. `src/routes/.../[subdomain]/+page.svelte` - Modified
