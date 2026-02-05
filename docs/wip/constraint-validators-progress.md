# Constraint Validators Implementation Progress

> **Resume Instructions**: Read this file, then continue from the next incomplete phase.

## Status: COMPLETE (migrated to mathAST)

## Completed Phases

### Phase 1: Types & Feedback - DONE

- [x] `src/lib/questions/types.ts` - Added ValidationStatus, ConstraintId, ConstraintMode
- [x] `src/lib/questions/feedback.ts` - Created with French messages
- [x] Code review passed
- [x] Committed (5daf44d9)

### Phase 2: Validators - DONE

- [x] `src/lib/questions/constraint-validators.ts` - Created
- [x] checkSpaces implemented (French number formatting)
- [x] checkProducts implemented (explicit multiplication detection)
- [x] checkBrackets implemented (unnecessary parentheses)
- [x] checkZeros implemented (leading/trailing zeros)
- [x] checkForm implemented (strict form matching)
- [x] Code review passed (fixed JSDoc, removed { detection)
- [x] Committed (d83f6613)

### Phase 3: Integration - DONE

- [x] `src/lib/types/question-display.ts` - Extended ValidationResult with status, constraintViolations
- [x] `src/lib/utils/answer-validator.ts` - Added applyConstraints, modified validateAnswer
- [x] `src/lib/questions/types.ts` - Added constraints to QuestionTemplate.options
- [x] Code review passed (fixed LaTeX fallback issue)
- [x] Committed (87367ccf)

### Phase 4: Tests - DONE

- [x] `src/lib/questions/constraint-validators.test.ts` - Created (101 tests)
- [x] `src/lib/utils/answer-validator.test.ts` - Created (32 tests)
- [x] All 133 tests passing
- [x] Code review passed
- [x] Committed (fdd57f1d)

### Phase 5: Quality & Docs - DONE

- [x] pnpm check passes (0 errors)
- [x] pnpm lint passes
- [x] Constraint tests pass (133 tests)
- [x] Progress document finalized
- [x] All phases committed

### Phase 6: Migration to mathAST - DONE (Feb 2026)

Migrated all Compute Engine-based validators to use mathAST for better consistency, type safety, and reduced dependencies.

**Migrated Functions:**

| Function                | Before     | After                       | Commits            |
| ----------------------- | ---------- | --------------------------- | ------------------ |
| `checkNullTerms`        | CE         | mathAST                     | 8781dee1, 4a6da805 |
| `checkFactorOne`        | CE         | mathAST                     | 0fcd6cb8, 4ba987f8 |
| `checkFactorZero`       | CE         | mathAST                     | 0fcd6cb8, 4ba987f8 |
| `checkSigns`            | CE + regex | mathAST + parser validation | 8dd21239, 85c97dde |
| `checkReducedFractions` | CE         | mathAST (gcd)               | 4848238b, e367a26d |

**Parser Enhancement:**

- Added `CONSECUTIVE_SIGNS` error code to reject `++`, `--`, `+-`, `-+` at parse time

**Test Coverage:**

- 511 tests total (up from 133)
- Comprehensive edge cases for all migrated validators

**Benefits:**

- Compute Engine completely removed from constraint-validators.ts
- Strong typing with mathAST node types
- Better performance (no CE canonization overhead)
- Consistent parsing across all validators

## Decisions Made

- ~~Using regex-based constraint checking (not AST) since TinyCAS is not available~~
- **Updated**: Now using mathAST for AST-based validation
- Checking raw student LaTeX input for brackets (not CE canonical form)
- Using partial credit (UNOPTIMAL_FORM) for constraint violations in 'warn' mode
- Units excluded - to be implemented separately
- Parser validates consecutive signs at parse time (not in checkSigns)

## Issues Encountered

- (None)
