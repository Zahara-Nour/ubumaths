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

## Phase 2: Pratt Parser

**Status**: Pending

---

## Phase 3: Recursive Descent Parser

**Status**: Pending

---

## Phase 4: Public API & Integration

**Status**: Pending

---

## Phase 5: Quality & Documentation

**Status**: Pending
