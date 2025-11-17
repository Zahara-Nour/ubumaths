# Implementation Plan: Template Syntax Fix

## Overview

This document provides the exact implementation steps to fix the critical syntax mismatch bug between the Questions template system (single-brace) and the Shared parameterization library (double-brace).

## Files to Modify

### 1. Apply Adapter in Variable Resolver ✅ CRITICAL

**File**: `src/lib/questions/generator/variable-resolver.ts`

```typescript
// Add import at top
import { convertToMarkdownSyntax, convertVariableToMarkdown } from './syntax-adapter';

// Update resolveVariableExpression (line ~50)
export function resolveVariableExpression(
	expression: string,
	alreadyResolved: ResolvedVariable[],
	seed?: number
): string {
	// Convert Questions syntax to Markdown syntax before resolution
	const markdownExpression = convertToMarkdownSyntax(expression);

	// Use shared library's resolveExpression with converted syntax
	return sharedResolveExpression(markdownExpression, alreadyResolved, seed);
}

// Update resolveVariables (line ~85)
export function resolveVariables(
	variables: QuestionVariable[] | undefined,
	seed?: number
): ResolvedVariable[] {
	if (!variables || variables.length === 0) {
		return [];
	}

	// Convert all variable expressions to Markdown syntax
	const convertedVariables = variables.map(convertVariableToMarkdown);

	// Use shared library resolver with converted variables
	const result = sharedResolveVariables(convertedVariables, seed);

	if (result === null) {
		throw new Error('Failed to resolve variables');
	}

	return result;
}
```

### 2. Apply Adapter in Content Resolver ✅ CRITICAL

**File**: `src/lib/questions/generator/content-resolver.ts`

```typescript
// Add import at top
import { convertToMarkdownSyntax } from './syntax-adapter';

// Update resolveContentField (line ~28)
export function resolveContentField(
	field: ContentField,
	resolvedVariables: ResolvedVariable[],
	seed?: number
): ContentField {
	// Convert Questions syntax to Markdown before resolution
	const markdownContent = convertToMarkdownSyntax(field.content);

	// Resolve with converted content
	let resolvedContent = resolveVariableExpression(markdownContent, resolvedVariables, seed);

	// Also resolve color references (after variable resolution)
	resolvedContent = resolveColorReferences(resolvedContent, seed);

	return {
		type: field.type,
		content: resolvedContent
	};
}

// Update resolveExpression (line ~69)
export function resolveExpression(
	expression: string,
	resolvedVariables: ResolvedVariable[],
	seed?: number
): string {
	// Convert Questions syntax to Markdown before resolution
	const markdownExpression = convertToMarkdownSyntax(expression);

	let resolved = resolveVariableExpression(markdownExpression, resolvedVariables, seed);
	// Also resolve color references
	resolved = resolveColorReferences(resolved, seed);
	return resolved;
}
```

### 3. Export Adapter from Questions Module ✅

**File**: `src/lib/questions/index.ts`

Add these exports:

```typescript
// Syntax Adapter (for converting between database and library syntax)
export {
	convertToMarkdownSyntax,
	convertToQuestionsSyntax,
	detectSyntax,
	normalizeToMarkdown
} from './generator/syntax-adapter';
```

## Test Updates Required

### Fix Existing Tests

Many tests incorrectly use double-brace syntax. They need to be updated to use the actual database syntax:

**Files to update**:

- `src/lib/questions/validators/template-validator.test.ts`
- `src/lib/questions/generator/instance-generator.test.ts`
- `src/lib/questions/generator/content-resolver.test.ts`
- `src/lib/questions/generator/variable-resolver.test.ts`

**Change pattern**:

```typescript
// BEFORE (incorrect - doesn't match database)
statement: [{ type: 'text', content: 'Calculate {{a}} + {{b}}' }];
variables: [{ name: 'a', expression: '{{1-10}}' }];

// AFTER (correct - matches database syntax)
statement: [{ type: 'text', content: 'Calculate {@:a} + {@:b}' }];
variables: [{ name: 'a', expression: '{#:1-10}' }];
```

### Add Integration Tests

Create new test file: `src/lib/questions/generator/integration.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import type { QuestionTemplate } from '../../types';

describe('Database Syntax Integration', () => {
	it('generates instance from actual database syntax', () => {
		const template: QuestionTemplate = {
			id: 'test',
			type: 'numerical_exact',
			title: 'Test',
			variations: [
				{
					statement: [
						{
							type: 'text',
							content: 'Calculate {@:a} + {@:b}' // Database syntax
						}
					],
					variables: [
						{ name: 'a', expression: '{#:1-10}' }, // Database syntax
						{ name: 'b', expression: '{#:1-10}' } // Database syntax
					],
					answer: '{eval:{@:a}+{@:b}}' // Database syntax
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'arithmetic',
			domain: 'numbers',
			level: 1,
			status: 'active'
		};

		const result = generateInstance(template, 42);

		expect(result.success).toBe(true);
		expect(result.instance).toBeDefined();

		// Verify resolution worked
		const statement = result.instance!.statement[0].content;
		expect(statement).not.toContain('{@:'); // No unresolved variables
		expect(statement).toMatch(/Calculate \d+ \+ \d+/);

		// Verify answer is resolved
		expect(result.instance!.answer).toMatch(/^\d+$/);
	});

	it('handles nested variable references', () => {
		const template: QuestionTemplate = {
			// ... setup
			variations: [
				{
					variables: [
						{ name: 'max', expression: '10' },
						{ name: 'a', expression: '{#:1-{@:max}}' } // Nested reference
					]
					// ... rest
				}
			]
		};

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);

		const aValue = parseInt(result.instance!.resolvedVariables[1].value);
		expect(aValue).toBeGreaterThanOrEqual(1);
		expect(aValue).toBeLessThanOrEqual(10);
	});
});
```

## Verification Steps

### 1. Unit Test the Adapter

```bash
pnpm test src/lib/questions/generator/syntax-adapter.test.ts
```

Expected: All tests pass ✅

### 2. Run Questions Tests

```bash
pnpm test src/lib/questions
```

Expected: All tests pass after syntax updates ✅

### 3. Manual Testing

1. Start dev server: `pnpm dev -- --port 5175`
2. Navigate to teacher dashboard
3. Create a new assessment
4. Add questions from templates
5. Generate preview
6. Verify:
   - Variables are resolved (no `{@:var}` visible)
   - Random numbers are generated
   - Expressions are evaluated
   - Math renders correctly

### 4. Database Verification

```sql
-- Check a template has correct syntax
SELECT variations FROM question_templates LIMIT 1;
```

Should show single-brace syntax: `{@:var}`, `{#:1-10}`, `{eval:expr}`

## Rollback Plan

If issues arise:

1. **Immediate rollback**: Remove adapter calls from variable-resolver.ts and content-resolver.ts
2. **Tests**: Will fail but system returns to current (broken) state
3. **No database changes**: Templates remain unchanged

## Performance Monitoring

Add logging to track conversion overhead:

```typescript
// In variable-resolver.ts
const startTime = performance.now();
const markdownExpression = convertToMarkdownSyntax(expression);
const conversionTime = performance.now() - startTime;
if (conversionTime > 1) {
	// Log if > 1ms
	console.warn(`Slow syntax conversion: ${conversionTime}ms`);
}
```

## Future Considerations

### Option 1: Keep Adapter (Recommended for now)

- ✅ No database migration needed
- ✅ Backward compatible
- ✅ Low performance impact
- ❌ Extra complexity layer

### Option 2: Migrate Database (Long-term)

- ✅ Single syntax throughout system
- ✅ No conversion overhead
- ❌ Complex migration
- ❌ Risk of data corruption
- ❌ Breaks existing imports

### Option 3: Dual-Mode Tokenizer (Best long-term)

- ✅ Native support for both syntaxes
- ✅ No conversion needed
- ✅ Future-proof
- ❌ More complex implementation

## Success Metrics

After implementation:

- ✅ Question generation works with database templates
- ✅ All variables resolve correctly
- ✅ Random numbers generate properly
- ✅ Expressions evaluate to numbers
- ✅ Students see actual content, not placeholders
- ✅ Answer validation works
- ✅ Performance impact < 5ms per generation

## Timeline

1. **Immediate** (30 min): Apply adapter in 2 files
2. **Today** (1 hour): Update tests to use correct syntax
3. **Today** (30 min): Manual verification
4. **Tomorrow**: Monitor production for any issues
5. **This week**: Decide on long-term strategy

## Conclusion

This fix is **CRITICAL** and must be applied immediately. The adapter solution is safe, tested, and has minimal performance impact. It restores full functionality to the question generation system while maintaining backward compatibility with existing database content.
