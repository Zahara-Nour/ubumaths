# LaTeX Parser - Progress Document

## Overview

Parser LaTeX → MathAST avec deux implementations (Pratt et Recursive Descent).

## Phase 1: Shared Infrastructure ✅

**Status**: Complete
**Date**: 2025-12-01

### Files Created

| File                    | Description                            | Tests |
| ----------------------- | -------------------------------------- | ----- |
| `parser/types.ts`       | Token types, ParserOptions, ParseError | -     |
| `parser/tokenizer.ts`   | LaTeX lexer with position tracking     | 187   |
| `parser/color-stack.ts` | Color context for nested \textcolor    | 50    |
| `parser/index.ts`       | Module exports                         | -     |

### Test Results

- **237 tests passing**
- All tokenizer edge cases covered
- Color stack validation tested

### Key Decisions

- TokenType as string literal union (not enum) for better type inference
- Whitespace preserved as tokens (needed for implicit multiplication detection)
- Color validation includes CSS names and hex colors
- Position tracking in every token for error reporting

### Next Steps

- Phase 2: Pratt Parser implementation
- Phase 3: Recursive Descent implementation

---

## Phase 2: Pratt Parser ✅

**Status**: Complete
**Date**: 2025-12-01

### Files Created

| File                     | Description                 | Tests |
| ------------------------ | --------------------------- | ----- |
| `parser/parser-pratt.ts` | Pratt parser implementation | 137   |

### Test Results

- **137 tests passing**
- All 16 MathNode types supported
- Operator precedence verified
- Implicit multiplication working
- Right-associativity for chained exponents (x^2^3 → x^(2^3))

### Key Features

- Binding power: RELATION=10, ADDITION=20, MULTIPLY=30, UNARY=40, POWER=50
- Right-associative: ^ (chained: x^2^3 → x^(2^3)), _ (chained: x_a_b → x_(a_b))
- Left-to-right for mixed: x_1^2 → (x_1)^2
- Left-associative: +, -, \*, /
- Implicit multiplication detection (2x, xy, 2\sin(x), etc.)
- Color stack integration for nested \textcolor
- Unit parsing via existing units/parser.ts
- Error handling: strict (throw) and tolerant (collect) modes

### Code Review Fix

- Fixed right-associativity bug: `parseSuperscriptOperand()` and `parseSubscriptOperand()`
- Original: used `nud()` → left-associative for all cases
- Fixed: check for same operator to enable right-associativity only for chained same operators

### API

```typescript
parsePratt(input: string, options?): MathNode      // throws on error
parsePrattSafe(input: string, options?): ParseResult  // returns errors
```

---

## Phase 3: Recursive Descent Parser

**Status**: Pending

---

## Phase 4: Public API & Integration

**Status**: Pending

---

## Phase 5: Quality & Documentation

**Status**: Pending
