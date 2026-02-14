# Question Type Cleanup - Progress

## Status: Complete

## Changes Made

### QuestionTemplateForm.svelte

- **Type selector**: Reduced from 6 options to 2 (`fill_in_blanks`, `multiple_choice`)
- **Type inference**: Changed from `template?.type || 'numerical_exact'` to `getQuestionType(template.variations[0])`
- **Removed**: `PrecisionType` import, `precision` state, `type` field in `buildTemplate()`, precision conditional
- **Validation**: Updated `isValid` to handle blanks-based answers (solution is optional when blanks exist)
- **Native selects**: Replaced 2 `<select>` with `MySelect` (type selector + duplicate variation source)
- **Help dialog**: Simplified to only show fill_in_blanks and multiple_choice documentation

### AnswerEditor.svelte

- **Removed**: Entire numerical questions section (lines 162-217 of original)
- **Removed**: `PrecisionType` import, `PrecisionEditor` import, `precision` prop
- **Updated**: `blanks` type from `{ position: number; expectedAnswer: string }[]` to `TemplateBlank[]`
- **Simplified**: `$effect` to only handle `multiple_choice` and `fill_in_blanks`
- **Fixed**: Pre-existing bug in `removeChoice()` where `isCorrect` was checked after filter instead of before
- **Removed**: `position` field from blanks UI (blanks are positional by index)

## Verification

- Svelte autofixer: No issues on either file
- Code review: One pre-existing bug found and fixed (removeChoice order)

## Files Modified

- `src/lib/components/QuestionTemplateForm.svelte`
- `src/lib/components/AnswerEditor.svelte`
