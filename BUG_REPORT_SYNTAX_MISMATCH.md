# CRITICAL BUG REPORT: Template Syntax Mismatch

## Executive Summary

**Severity**: CRITICAL ⚠️
**Impact**: Complete failure of question generation system
**Root Cause**: Syntax mismatch between database storage (`{@:var}`) and shared library expectations (`{{var}}`)
**Current State**: System appears to work but returns unresolved templates

## Problem Description

The Questions template system stores templates in the database using **single-brace syntax**:

- Variables: `{@:var}`
- Random: `{#:1-10}`
- Eval: `{eval:expr}`

However, the shared parameterization library expects **double-brace Markdown syntax**:

- Variables: `{{var}}`
- Random: `{{1..10}}` or `{{random:1..10}}`
- Eval: `{{eval:expr}}`

## Current Behavior

When generating a question from a database template:

1. **No errors are thrown** ✅ (misleading!)
2. **Generation appears successful** ✅ (false positive!)
3. **But nothing is actually resolved** ❌
   - Variables keep their raw expressions: `{#:1-10}` instead of `7`
   - Statement keeps placeholders: `Calculate {@:a} + {@:b}` instead of `Calculate 7 + 3`
   - Answer remains unresolved: `{eval:a+b}` instead of `10`

## Root Cause Analysis

### 1. Tokenizer Mismatch

```typescript
// src/lib/shared/parameterization/parser/tokenizer.ts
function extractMarkdownTokens(text: string): Token[] {
	// Line 59-60: Only looks for {{ (double brace)
	if (text.substring(i, i + 2) === '{{') {
		// Process token...
	}
}
```

**Result**: Single-brace tokens `{@:var}` are completely ignored.

### 2. No Conversion Layer

```typescript
// src/lib/questions/generator/variable-resolver.ts
export function resolveVariables(variables: Variable[], seed?: number) {
	// Line 94: Directly calls shared library without conversion
	return sharedResolveVariables(variables, seed);
}
```

**Result**: Raw single-brace expressions pass through to shared library unchanged.

### 3. Silent Failure

```typescript
// src/lib/shared/parameterization/resolver/variable-resolver.ts
export function resolveExpression(expression: string, ...): string {
  let result = expression;

  // Line 132: tokenize(result) returns [] for single-brace syntax
  const variableTokens = tokenize(result).filter(t => t.type === 'variable');

  // Line 134: Loop never runs because no tokens found
  for (let i = variableTokens.length - 1; i >= 0; i--) {
    // Never executed
  }

  // Line 209: Returns original expression unchanged
  return result;
}
```

**Result**: Unresolved expressions are returned as "resolved" values.

## Reproduction Test

```typescript
// Database template (actual)
const dbTemplate = {
  statement: 'Calculate {@:a} + {@:b}',
  variables: [
    { name: 'a', expression: '{#:1-10}' },
    { name: 'b', expression: '{#:1-10}' }
  ],
  answer: '{eval:{@:a}+{@:b}}'
};

// Test result
generateInstance(dbTemplate) // → {
  statement: 'Calculate {@:a} + {@:b}',     // ❌ Not resolved
  resolvedVariables: [
    { name: 'a', value: '{#:1-10}' },      // ❌ Not resolved
    { name: 'b', value: '{#:1-10}' }       // ❌ Not resolved
  ],
  answer: '{eval:{@:a}+{@:b}}'            // ❌ Not resolved
}
```

## Production Impact

### Affected Features

1. **Question generation**: All generated questions show raw templates
2. **Practice mode**: Students see `{@:a}` instead of actual numbers
3. **Assessments**: Answers cannot be validated (raw template vs student input)
4. **SRS system**: Broken - cannot evaluate responses

### Data Impact

- **71 seed templates** in database use single-brace syntax
- **All user-created templates** likely use single-brace (following examples)
- **Migration data** from old system uses single-brace

### User Experience

- Students see: "Calculate {@:num1} + {@:num2}"
- Instead of: "Calculate 7 + 3"
- Answer validation fails: Student enters "10", system expects "{eval:{@:num1}+{@:num2}}"

## Files Affected

### Direct Impact (Must Modify)

1. **Conversion point** (PRIMARY FIX)
   - `src/lib/questions/generator/variable-resolver.ts`
   - `src/lib/questions/generator/content-resolver.ts`

2. **Alternative: Tokenizer** (COMPLEX)
   - `src/lib/shared/parameterization/parser/tokenizer.ts`
   - Add support for both syntaxes

### Indirect Impact (Must Update)

3. **Tests** (currently use wrong syntax)
   - `src/lib/questions/**/*.test.ts` - 15 test files
   - Using `{{}}` instead of database `{}` syntax

4. **Documentation**
   - Examples show inconsistent syntax
   - Migration guides need update

5. **Database** (Decision needed)
   - Keep single-brace? (historical compatibility)
   - Migrate to double-brace? (consistency)

## Proposed Solutions

### Solution 1: Adapter Function (Recommended) ✅

**Location**: Questions module before calling shared library

```typescript
// src/lib/questions/generator/syntax-adapter.ts
export function convertToMarkdownSyntax(text: string): string {
	return (
		text
			// Variables: {@:var} → {{var}}
			.replace(/\{@:(\w+)\}/g, '{{$1}}')

			// Random: {#:spec} → {{random:spec}}
			.replace(/\{#:([^}]+)\}/g, '{{random:$1}}')

			// Eval: {eval:expr} → {{eval:expr}}
			.replace(/\{eval:([^}]+)\}/g, '{{eval:$1}}')

			// Handle nested cases
			.replace(/\{\{random:([^}]+)\{@:(\w+)\}([^}]*)\}\}/g, '{{random:$1{{$2}}$3}}')
	);
}

// Apply in variable-resolver.ts
export function resolveVariables(variables, seed) {
	const convertedVars = variables.map((v) => ({
		...v,
		expression: convertToMarkdownSyntax(v.expression)
	}));
	return sharedResolveVariables(convertedVars, seed);
}
```

**Pros**:

- Minimal changes (2 files)
- Preserves existing database
- Clear separation of concerns
- Easy to test and rollback

**Cons**:

- Performance overhead (regex on every resolution)
- Complexity for edge cases

### Solution 2: Dual-Mode Tokenizer

**Location**: Shared library tokenizer

```typescript
// Support both {{ and { syntaxes
function tokenize(text: string, mode: 'markdown' | 'legacy' = 'markdown') {
	if (mode === 'legacy') {
		return extractLegacyTokens(text); // New function for {
	}
	return extractMarkdownTokens(text); // Existing for {{
}
```

**Pros**:

- Native support for both syntaxes
- No conversion overhead
- Future-proof

**Cons**:

- Complex implementation
- Affects shared library (broader impact)
- More testing required

### Solution 3: Database Migration

**Location**: New migration + update all seeds

```sql
-- Convert all templates to Markdown syntax
UPDATE question_templates
SET variations = convert_syntax(variations);
```

**Pros**:

- Single source of truth
- No runtime conversion
- Cleanest long-term solution

**Cons**:

- Breaking change
- Complex migration
- Risk of data corruption
- Import pipeline needs update

## Recommended Action Plan

### Phase 1: Immediate Fix (1 hour)

1. ✅ Implement adapter function (Solution 1)
2. ✅ Add conversion before shared library calls
3. ✅ Test with database templates
4. ✅ Deploy hotfix

### Phase 2: Test Updates (2 hours)

1. ✅ Update test templates to use database syntax
2. ✅ Add integration tests with actual DB data
3. ✅ Verify all tests pass

### Phase 3: Long-term Strategy (1 day)

1. ⚠️ Decide on final syntax (single vs double brace)
2. ⚠️ Plan migration strategy if needed
3. ⚠️ Update documentation
4. ⚠️ Consider dual-mode tokenizer for compatibility

## Testing Strategy

### Unit Tests

```typescript
describe('Syntax Adapter', () => {
	it('converts variable references', () => {
		expect(convertToMarkdownSyntax('{@:a}')).toBe('{{a}}');
	});

	it('converts random expressions', () => {
		expect(convertToMarkdownSyntax('{#:1-10}')).toBe('{{random:1..10}}');
	});

	it('converts eval expressions', () => {
		expect(convertToMarkdownSyntax('{eval:a+b}')).toBe('{{eval:a+b}}');
	});

	it('handles nested references', () => {
		expect(convertToMarkdownSyntax('{#:1-{@:max}}')).toBe('{{random:1..{{max}}}}');
	});
});
```

### Integration Tests

```typescript
it('generates instance from database template', () => {
  const dbTemplate = /* actual DB syntax */;
  const result = generateInstance(dbTemplate);

  expect(result.success).toBe(true);
  expect(result.instance.statement).not.toContain('{@:');
  expect(result.instance.answer).toMatch(/^\d+$/);
});
```

### E2E Tests

1. Create question from seed template
2. Generate instance
3. Verify student sees resolved content
4. Submit answer
5. Verify validation works

## Risk Assessment

### Without Fix

- **Severity**: System completely broken
- **Probability**: 100% (already happening)
- **Impact**: No questions can be properly generated

### With Adapter Solution

- **Severity**: Minor performance impact
- **Probability**: Low
- **Impact**: ~5ms overhead per generation

### Migration Risks

- **Data loss**: Low (with proper backup)
- **Downtime**: Medium (requires careful deployment)
- **Rollback**: Complex (data format change)

## Conclusion

This is a **CRITICAL** bug that makes the entire question generation system non-functional. The system appears to work but returns unresolved templates, making questions unusable for students.

**Immediate action required**: Implement the adapter solution to restore functionality while planning the long-term strategy.

## Appendix: Error Messages

### Current (No Errors - Silent Failure) ❌

```
No error messages - appears to succeed
```

### Expected with Fix ✅

```
If template malformed: "Invalid variable reference: {@:}"
If circular dependency: "Circular dependency detected: a → b → a"
If undefined variable: "Variable 'x' not found or not yet resolved"
```
