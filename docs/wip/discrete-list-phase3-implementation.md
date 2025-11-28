# Phase 3: Discrete List Generator - Implementation Summary

**Date**: 2025-11-28
**Status**: ✅ Complete
**Branch**: migration/questions

## Overview

Implemented the generation logic for discrete lists in the shared parameterization system. Discrete lists allow random selection from a list of items (e.g., `{{rouge|vert|bleu}}`), with support for variable resolution and exclusions.

## Files Modified

### 1. `src/lib/shared/parameterization/resolver/random-generator.ts`

**Changes**:

- Updated `generateRandomNumber()` return type from `number` to `number | string`
- Added early handling for discrete-list type
- Implemented `generateFromDiscreteList()` function with full documentation
- Implemented `resolveItemName()` helper function

**Key Implementation Details**:

```typescript
export function generateFromDiscreteList(
	spec: { type: 'discrete-list'; items: string[]; exclusions: string[] },
	resolvedVariables: ResolvedVariable[],
	seed?: number
): string {
	// 1. Resolve each item (variable or literal)
	const resolvedItems = spec.items.map((item) => resolveItemName(item, resolvedVariables));

	// 2. Resolve exclusions
	const excludedValues = new Set<string>();
	for (const exclusion of spec.exclusions) {
		excludedValues.add(resolveItemName(exclusion, resolvedVariables));
	}

	// 3. Filter available items
	const availableItems = resolvedItems.filter((item) => !excludedValues.has(item));

	if (availableItems.length === 0) {
		throw new Error(
			`All items excluded from discrete list. Items: [${spec.items.join(', ')}], Exclusions: [${spec.exclusions.join(', ')}]`
		);
	}

	// 4. Random selection
	const random = seed !== undefined ? seededRandom(seed) : Math.random();
	const index = Math.floor(random * availableItems.length);

	return availableItems[index];
}
```

**Variable Resolution Logic** (matches eval behavior):

- Each item name is checked against `resolvedVariables`
- If match found → use variable's value
- Otherwise → treat as literal string

Example:

```typescript
// Variables: a=10, b=20
// Items: ['a', 'b', 'literal']
// Resolved to: ['10', '20', 'literal']
```

### 2. `src/lib/shared/parameterization/resolver/variable-resolver.ts`

**No changes required** ✅

The existing code already handles string return values correctly:

```typescript
const generatedValue = generateRandomNumber(spec, alreadyResolved, seed);
result = result.slice(0, token.start) + String(generatedValue) + result.slice(token.end);
```

The `String(generatedValue)` correctly handles both numbers and strings.

## Tests Added

### Unit Tests: `random-generator.test.ts`

Added 10 comprehensive tests for discrete lists (lines 687-846):

1. ✅ Should select a random item from list of literals
2. ✅ Should return same value with same seed (reproducibility)
3. ✅ Should resolve variable names to their values
4. ✅ Should treat undefined variables as literal strings
5. ✅ Should exclude specified items
6. ✅ Should resolve variable names in exclusions
7. ✅ Should throw error when all items are excluded
8. ✅ Should handle mixed variable/literal items with exclusions
9. ✅ Should select uniformly from available items (distribution test)

### Integration Tests: `variable-resolver.test.ts`

Added 8 end-to-end tests (lines 473-585):

1. ✅ Should select random item from literal list
2. ✅ Should resolve variable names in discrete list
3. ✅ Should handle exclusions in discrete list
4. ✅ Should resolve variables in exclusions
5. ✅ Should use discrete list in text
6. ✅ Should combine discrete list with eval (e.g., `{{+|-}}` for operators)
7. ✅ Should use discrete list with random numbers
8. ✅ Should handle nested variable references in discrete list

## Test Results

```bash
✓ All parameterization tests: 375 passed
  - random-generator.test.ts: 52 tests (includes 10 new discrete list tests)
  - variable-resolver.test.ts: 54 tests (includes 8 new discrete list tests)
  - No test failures
  - No type errors in implementation files
```

## Examples

### Basic Literal List

```typescript
// Syntax: {{rouge|vert|bleu}}
{ name: 'color', expression: '{{rouge|vert|bleu}}' }
// Result: 'rouge', 'vert', or 'bleu'
```

### Variable Resolution

```typescript
// Variables: a=10, b=20
{ name: 'choice', expression: '{{a|b|literal}}' }
// Result: '10', '20', or 'literal'
```

### With Exclusions

```typescript
{ name: 'choice', expression: '{{a|b|c|d!b,d}}' }
// Result: 'a' or 'c' (excludes 'b' and 'd')
```

### Combined with Eval

```typescript
{ name: 'op', expression: '{{+|-}}' }
{ name: 'result', expression: '{{eval:5{{op}}3}}' }
// Result: '8' (if op='+') or '2' (if op='-')
```

## Key Design Decisions

### 1. Type Compatibility

- Return type changed to `number | string` to handle both numeric and string outputs
- Discrete lists have `exclusions: string[]` while other types use `Exclusion[]`

### 2. Variable Resolution Consistency

- Follows same pattern as eval expressions
- Bare names resolved against variables, fallback to literals
- Simple and predictable behavior

### 3. Error Handling

- Clear error message when all items excluded
- Includes both items and exclusions in error message for debugging

### 4. Seeded Random

- Uses existing `seededRandom()` function for reproducibility
- Ensures consistent behavior in tests and question generation

## Type Safety

No TypeScript errors in implementation:

```bash
$ pnpm check:fast 2>&1 | grep "src/lib/shared/parameterization"
# No output = no errors ✅
```

Errors in other files (Questions feature, old generator) are unrelated to this implementation.

## Next Steps

✅ Phase 1: Parsing - Complete
✅ Phase 2: Tokenization - Complete
✅ Phase 3: Generation - Complete

**Phase 4**: Update migration UI to show discrete list examples and documentation.

## Notes

- The implementation is fully backward compatible
- No breaking changes to existing functionality
- All 375 existing parameterization tests still pass
- Code follows project standards (JSDoc comments, error handling, type safety)
