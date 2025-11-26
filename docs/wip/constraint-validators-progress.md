# Constraint Validators Implementation Progress

> **Resume Instructions**: Read this file, then continue from the next incomplete phase.

## Status: In Progress

## Completed Phases

### Phase 1: Types & Feedback - IN PROGRESS

- [ ] `src/lib/questions/types.ts` - Added ValidationStatus, ConstraintId, ConstraintMode
- [ ] `src/lib/questions/feedback.ts` - Created with French messages
- [ ] Code review passed
- [ ] Committed

### Phase 2: Validators - PENDING

- [ ] `src/lib/questions/constraint-validators.ts` - Created
- [ ] checkSpaces implemented
- [ ] checkProducts implemented
- [ ] checkBrackets implemented
- [ ] checkZeros implemented
- [ ] checkForm implemented
- [ ] Code review passed
- [ ] Committed

### Phase 3: Integration - PENDING

- [ ] `src/lib/types/question-display.ts` - Extended ValidationResult
- [ ] `src/lib/utils/answer-validator.ts` - Added applyConstraints
- [ ] Code review passed
- [ ] Committed

### Phase 4: Tests - PENDING

- [ ] `src/lib/questions/constraint-validators.test.ts` - Created
- [ ] `src/lib/utils/answer-validator.test.ts` - Created
- [ ] All tests passing
- [ ] Code review passed
- [ ] Committed

### Phase 5: Quality & Docs - PENDING

- [ ] pnpm check passes
- [ ] pnpm lint passes
- [ ] pnpm test:unit passes
- [ ] question-migration-analysis.md updated
- [ ] Final commit

## Decisions Made

- Using regex-based constraint checking (not AST) since TinyCAS is not available
- Checking raw student LaTeX input for brackets (not CE canonical form)
- Using partial credit (UNOPTIMAL_FORM) for constraint violations in 'check' mode
- Units excluded - to be implemented separately

## Issues Encountered

- (None yet)
