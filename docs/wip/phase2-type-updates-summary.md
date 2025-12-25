# Phase 2: Type Definitions Update - Complete

## Summary

Successfully updated all core type definitions to use the branded markdown types (`TemplateMarkdown` and `ResolvedMarkdown`) instead of `ContentField[]`.

## Files Updated

### 1. `/src/lib/questions/types.ts`

#### Changes Made:

- Imported branded markdown types from `$lib/shared/markdown`
- Added `@deprecated` JSDoc to `ContentField` type (kept for backward compatibility)
- Updated `QuestionVariation` interface:

  - `statement: ContentField[]` → `statement: TemplateMarkdown`
  - `correction?: ContentField[]` → `correction?: TemplateMarkdown`
  - `choices.content: ContentField` → `choices.content: TemplateMarkdown`
  - Clarified that `answer` and `expectedAnswer` remain as plain strings (values, not markdown)

- Updated `QuestionInstance` interface:
  - Removed old `statement: ContentField[]` and `statement_md?: string`
  - Now just `statement: ResolvedMarkdown`
  - Removed old `correction?: ContentField[]` and `correction_md?: string`
  - Now just `correction?: ResolvedMarkdown`
  - `choices.content: ContentField[]` → `choices.content: ResolvedMarkdown`
  - `shuffledChoices.content: ContentField[]` → `shuffledChoices.content: ResolvedMarkdown`

### 2. `/src/lib/srs/types.ts`

#### Changes Made:

- Imported branded markdown types from `$lib/shared/markdown`
- Updated `Card` interface:

  - `frontContent?: ContentField[]` → `frontContent?: TemplateMarkdown`
  - `backContent?: ContentField[]` → `backContent?: TemplateMarkdown`

- Added clarifying comment to `DbCard` interface:

  - Database still stores `ContentField[]` for now (migration in Phase 7)
  - Conversion happens at the boundary layer

- Updated `CreateCardRequest` interface:
  - `frontContent?: ContentField[]` → `frontContent?: TemplateMarkdown`
  - `backContent?: ContentField[]` → `backContent?: TemplateMarkdown`

### 3. `/src/lib/server/validation/questions.ts`

#### Changes Made:

- Created proper `variableSchema` for question variables
- Created `variationSchema` that validates markdown strings:

  - `statement: z.string().min(1, "L'énoncé est requis")`
  - `correction: z.string().optional()`
  - `choices.content: z.string()`
  - All content fields now validate as strings (markdown)

- Updated `createQuestionTemplateSchema`:
  - `variations` now properly typed with `variationSchema`
  - Minimum 1 variation required

### 4. `/src/lib/server/validation/srs.ts`

#### Changes Made:

- Added `@deprecated` comment to `contentFieldSchema`
- Updated `createCustomCardSchema`:

  - `frontContent: z.array(contentFieldSchema)` → `frontContent: z.string()`
  - `backContent: z.array(contentFieldSchema)` → `backContent: z.string()`
  - Added proper validation messages

- Updated `updateCardSchema`:
  - Now validates markdown strings instead of ContentField arrays

## TypeScript Errors

The TypeScript compiler identified 79 errors in test files and implementation files. These are expected and will be fixed in later phases:

- **Test files**: Still using old ContentField format (will be updated in Phase 5)
- **Generator files**: Need conversion logic updates (Phase 3)
- **Validator files**: Need to handle new types (Phase 4)
- **Migration files**: Need transformer updates (Phase 3)

## Key Design Decisions

1. **Backward Compatibility**: `ContentField` type marked as deprecated but not removed
2. **Answer Fields**: Kept as plain strings (they're values for comparison, not content to render)
3. **Database Layer**: DbCard still references ContentField[] with comment about future migration
4. **Validation**: Zod schemas now validate strings, with casting to branded types at boundaries

## Next Steps

Phase 3 will update the generator and transformer code to:

- Convert ContentField[] to TemplateMarkdown
- Convert resolved content to ResolvedMarkdown
- Handle the transformation logic properly

## Success Criteria Met

✅ Updated `QuestionVariation` to use `TemplateMarkdown`
✅ Updated `QuestionInstance` to use `ResolvedMarkdown`
✅ Updated SRS `Card` types to use branded markdown
✅ Updated validation schemas to validate strings
✅ Marked `ContentField` as deprecated (not removed)
✅ All changes preserve backward compatibility at database level
✅ Clear documentation of what stays as plain strings (answers)
