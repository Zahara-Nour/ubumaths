# containsNode Migration Progress

## Status: COMPLETE

## Summary

Refactored domain membership testing from numeric `containsValue(domain, number)` to symbolic `containsNode(domain, MathNode)` using `compareNumericNodes` for exact comparisons.

## What was done

### Phase 1: Core implementation in `domain/algebra.ts`

- Added `containsNode(d: Domain, value: MathNode): boolean`
- Added `isApproachableFrom(d: Domain, point: MathNode, direction: 'left' | 'right'): boolean`
- Private helpers: `nodeInInterval`, `symbolicContainsNode`, `isExcludedByPeriodicNode`

### Phase 2: Exports in `domain/index.ts`

- Exported both new public functions

### Phase 3: Caller migration (7 files)

| File                                   | Change                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `analysis/continuity.ts`               | Direct `containsNode` replacement                                            |
| `analysis/differentiability.ts`        | Two-pass: symbolic first, numeric fallback                                   |
| `variations/extrema.ts`                | Simplified `isPointInDomain` to one line                                     |
| `variations/critical-points.ts`        | Replaced 3 sites, removed `isValueInDomain` and `evaluateToNumber` dead code |
| `sign/helpers/zeros.ts`                | Replaced `filterSolutionsInDomain`                                           |
| `domain/validation/detect-mistakes.ts` | Uses `numberNode('0')` for zero checks                                       |

### NOT migrated

- `limits/evaluate.ts` - kept original `containsValue + epsilon` approach due to subtle interaction issues with periodic domains through indirect call chains

### Phase 4: Tests

- All 1891 tests pass across 37 test files

### Phase 5: Verification

- 0 TypeScript errors (`npx tsc --noEmit`)
- 0 ESLint errors on all modified files

## Key decisions

1. **`containsValue` NOT removed** - kept for backward compat and numeric fallback
2. **Two-pass pattern in differentiability.ts** - symbolic `containsNode` first, numeric `containsValue` fallback for boundary checks (avoids false negatives from inconclusive `compareNumericNodes`)
3. **Dual approach in `isExcludedByPeriodicNode`** - pure numeric evaluation first (more precise for literal nodes stored via `formatNumber`), symbolic fallback second
4. **`limits/evaluate.ts` not migrated** - `isApproachableFrom` semantics differ from epsilon-probing in ways that cause failures through indirect call chains (differentiability -> limits -> domain checks)

## Files modified

- `src/lib/mathAST/domain/algebra.ts`
- `src/lib/mathAST/domain/index.ts`
- `src/lib/mathAST/analysis/continuity.ts`
- `src/lib/mathAST/analysis/differentiability.ts`
- `src/lib/mathAST/variations/extrema.ts`
- `src/lib/mathAST/variations/critical-points.ts`
- `src/lib/mathAST/sign/helpers/zeros.ts`
- `src/lib/mathAST/domain/validation/detect-mistakes.ts`
