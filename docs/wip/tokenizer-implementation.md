# ASCIIMath Tokenizer Implementation

**Status**: ✅ Complete
**Date**: 2025-11-30
**Tests**: 82/82 passing (100%)

## Summary

Successfully implemented the tokenizer for the ASCIIMath to LaTeX transpiler. The tokenizer converts ASCIIMath input strings into a stream of tokens for parsing.

## Files Created

### 1. `src/lib/transpilers/asciimath-to-latex/tokenizer.ts` (303 lines)

**Exports**:

- `Tokenizer` class with `tokenize()` method

**Features**:

- Recognizes all token types: NUMBER, IDENTIFIER, FUNCTION, GREEK, SYMBOL, OPERATOR, delimiters, TEMPLATE, WHITESPACE, EOF
- Handles multi-character symbols with correct precedence (longest-first matching)
- Properly scans template placeholders `{{...}}` with nested brace support
- Preserves exact token positions (start/end) for error reporting
- Pure function implementation (no side effects)
- Full TypeScript type safety (no `any` types)

**Key Methods**:

- `tokenize()`: Main entry point, returns array of tokens
- `scanNumber()`: Handles integers and decimals (e.g., `123`, `3.14`)
- `scanIdentifier()`: Scans and classifies identifiers as IDENTIFIER, GREEK, FUNCTION, or SYMBOL
- `scanTemplate()`: Handles `{{...}}` with depth counting for nested braces
- `scanSymbol()`: Matches multi-character symbols in order of length

### 2. `src/lib/transpilers/asciimath-to-latex/__tests__/tokenizer.test.ts` (624 lines)

**Test Coverage**: 82 tests across 12 categories

1. **Numbers** (6 tests)
   - Integers, decimals, zero, negative numbers

2. **Identifiers** (5 tests)
   - Single/multi-letter, uppercase, with numbers

3. **Greek letters** (7 tests)
   - All lowercase/uppercase Greek, variants

4. **Functions** (5 tests)
   - Trigonometric (sin, cos, tan)
   - Logarithmic (log, ln, exp)
   - Special (sqrt, abs, root)

5. **Symbols** (17 tests)
   - Infinity (oo)
   - Plus-minus (+-/-+)
   - Relations (<=, >=, !=, <<, >>)
   - Arrows (->, =>, <->, <=>)
   - Set theory (in, notin, subset, supset, cap, cup)
   - Logic (forall, exists, and, or, not)
   - Operations (times, cdot, \*, div)
   - Other (approx, equiv, prop, therefore, because)

6. **Operators** (3 tests)
   - Arithmetic (+, -, \*, /, ^, \_)
   - Relations (=, <, >)

7. **Delimiters** (4 tests)
   - Parentheses, brackets, braces

8. **Templates** (7 tests)
   - Simple templates `{{a}}`
   - Special syntax `{{eval:...}}`, `{{1..10}}`
   - Nested braces handling
   - Multiple templates in one expression

9. **Whitespace** (4 tests)
   - Spaces, tabs, newlines
   - Consecutive whitespace grouping

10. **Complex expressions** (10 tests)
    - Fractions, powers, functions with templates
    - Multiple operators and identifiers

11. **Edge cases** (4 tests)
    - Empty string, EOF, unknown characters

12. **Token positions** (4 tests)
    - Correct start/end positions for all tokens

13. **Symbol precedence** (6 tests)
    - Longer symbols matched first (e.g., `<=` not `<` + `=`)
    - `notin` not `not` + `in`

## Integration

Updated `src/lib/transpilers/asciimath-to-latex/index.ts` to export the `Tokenizer` class.

## Verification

All tests passing:

```bash
pnpm test:server src/lib/transpilers/asciimath-to-latex/__tests__/tokenizer.test.ts
# ✓ 82 tests passed
```

TypeScript strict mode: ✅ No errors
Zero `any` types: ✅
Code quality: ✅

## Example Usage

```typescript
import { Tokenizer } from '$lib/transpilers/asciimath-to-latex';

const tokenizer = new Tokenizer('sqrt({{a}})');
const tokens = tokenizer.tokenize();

// Result:
// [
//   { type: 'FUNCTION', value: 'sqrt', start: 0, end: 4 },
//   { type: 'LPAREN', value: '(', start: 4, end: 5 },
//   { type: 'TEMPLATE', value: '{{a}}', start: 5, end: 10 },
//   { type: 'RPAREN', value: ')', start: 10, end: 11 },
//   { type: 'EOF', value: '', start: 11, end: 11 }
// ]
```

## Next Steps

The tokenizer is complete and ready for the parser implementation:

1. **Parser**: Create AST from token stream
2. **Generator**: Convert AST to LaTeX
3. **Transpiler**: Combine all components with error handling

## Technical Highlights

### Template Scanning

The template scanner correctly handles nested braces using a depth counter:

```typescript
// Input: {{x{y}z}}
// Correctly scans as single TEMPLATE token
```

### Symbol Precedence

Multi-character symbols are matched longest-first to prevent ambiguity:

```typescript
// Input: <=
// Result: SYMBOL('<=')  [not OPERATOR('<') + OPERATOR('=')]

// Input: notin
// Result: SYMBOL('notin')  [not SYMBOL('not') + SYMBOL('in')]
```

### Identifier Classification

After scanning alphanumeric characters, identifiers are classified:

- Greek letters (alpha, beta, etc.) → GREEK
- Functions (sin, sqrt, etc.) → FUNCTION
- Word symbols (forall, in, etc.) → SYMBOL
- Everything else → IDENTIFIER

This classification simplifies parsing and ensures correct LaTeX generation.
