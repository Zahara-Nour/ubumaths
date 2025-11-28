# Eval Modifier Separator Migration: `|` → `;`

**Status**: ✅ COMPLETED
**Date**: 2025-11-28
**Branch**: migration/questions

## Summary

Successfully migrated the eval parser modifier separator from pipe `|` to semicolon `;`. This change simplifies the parser by eliminating conflicts with LaTeX absolute value notation `|x|`.

## Syntax Change

### Before

```
{{eval:a+b|d}}           → expression with decimal modifier
{{eval:5|+}}             → expression with positive modifier
{{eval:-3|()}}           → expression with bracket modifier
{{eval:a+b|d,+}}         → expression with multiple modifiers
```

### After

```
{{eval:a+b;d}}           → expression with decimal modifier
{{eval:5;+}}             → expression with positive modifier
{{eval:-3;()}}           → expression with bracket modifier
{{eval:a+b;d,+}}         → expression with multiple modifiers
```

## Files Modified

### 1. `/src/lib/shared/parameterization/parser/eval-parser.ts`

**Changes made:**

- Updated header documentation comment from `{{eval:expression|modifiers}}` to `{{eval:expression;modifiers}}`
- Updated JSDoc examples to use `;` instead of `|`
- Simplified `parseEvalExpressionWithModifiers()` function:
  - Changed `lastIndexOf('|')` to `lastIndexOf(';')`
  - Removed complex edge case handling for LaTeX `|x|` absolute values
  - Simplified comments - no longer need to mention pipe conflict
  - Renamed variable from `lastPipeIndex` to `lastSemicolonIndex`

**Key improvement:** The parser is now simpler and more robust because `;` doesn't conflict with any LaTeX syntax.

### 2. `/src/lib/shared/parameterization/parser/eval-parser.test.ts`

**Changes made:**

- Updated ALL test cases (51 tests total) that use modifiers from `|` to `;`
- Renamed test suite from "Edge cases with | character" to "Edge cases with special characters"
- Updated test descriptions to reflect that `;` doesn't conflict with LaTeX `|x|` syntax
- Modified tests:
  - Single modifiers: 8 tests updated
  - Combined modifiers: 4 tests updated
  - Edge cases: 4 tests updated
  - Backward compatibility: 2 tests updated
  - Variable references with modifiers: 2 tests updated

## Test Results

✅ **All 51 tests passing**

```
✓ |server| src/lib/shared/parameterization/parser/eval-parser.test.ts (51 tests) 16ms
```

Test coverage breakdown:

- ✅ Basic expressions without modifiers (3 tests)
- ✅ Single modifiers - all variants (8 tests)
- ✅ Combined modifiers (4 tests)
- ✅ Edge cases with special characters (4 tests)
- ✅ Backward compatibility (3 tests)
- ✅ Invalid tokens (4 tests)
- ✅ Variable references with modifiers (2 tests)
- ✅ All other eval parser tests (23 tests)

## Benefits

1. **Simpler parser logic**: Removed complex edge case handling for `|` in LaTeX expressions
2. **No conflicts**: Semicolon `;` doesn't appear in standard LaTeX math notation
3. **Clearer intent**: Using `;` makes it more obvious this is a separator, not part of the math
4. **More robust**: No need to validate whether `|` is a modifier separator or part of an absolute value

## Migration Notes

- ✅ Parser implementation updated
- ✅ All tests updated and passing (51 tests)
- ✅ Code documentation/comments updated
- ✅ User documentation updated:
  - `/docs/ref/markdown.md` - All eval examples updated
  - `/src/lib/shared/parameterization/README.md` - All eval examples updated
- ✅ Verified no other code files use old syntax
- ⚠️ **TODO**: Check if there are any existing questions in the database using the old `|` syntax
- ⚠️ **TODO**: Consider migration strategy if needed

## Documentation Files Updated

1. `/docs/ref/markdown.md`:
   - Updated syntax reference: `{{eval:expression;modifiers}}`
   - Updated all modifier examples (decimal, positive, bracket, derivative)
   - Updated combined modifier examples
   - Updated practical example in Pythagore section
   - Updated quick reference cheatsheet

2. `/src/lib/shared/parameterization/README.md`:
   - Updated header syntax reference
   - Updated all modifier examples with use cases
   - Updated parser function examples
   - Updated LaTeX absolute value comment

## Next Steps

1. ✅ ~~Search codebase for other eval expression examples~~ (DONE - none found)
2. ⚠️ Check database for existing questions using old `|` syntax
3. ⚠️ Consider migration script if database content needs updating
