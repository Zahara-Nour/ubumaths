# Continuity Module Improvements - Progress Document

## Context

The `limits` module has been substantially rewritten with:

- **Exact evaluation** via `normalizeExtended`
- **Sign tracking** for 0⁺, 0⁻, ±∞
- **Approach factor detection** (x-a) with signed zero substitution

This document tracks improvements to the `continuity` module to leverage these new capabilities.

## Improvement Tasks

### HIGH PRIORITY

#### 1. ✅ Use exact arithmetic for `tryEvaluateAtPoint`

- **Status**: COMPLETED
- **File**: `src/lib/mathAST/analysis/continuity.ts`
- **Changes made**:
  - Added imports from `limits/exact-evaluation`: `tryEvaluateLimitExact`, `resultToFiniteNode`, `isInfinityResult`, `isIndeterminateResult`
  - Rewrote `tryEvaluateAtPoint` to try exact evaluation first, then fall back to numeric
  - Kept `INFINITY_THRESHOLD = 1e8` for numeric fallback (catches tan(π/2) approximations)
- **Benefits**:
  - Precise detection of removable discontinuities
  - Better handling of symbolic values
  - Exact arithmetic for polynomials/rationals

#### 2. ✅ Use sign tracking for discontinuity classification

- **Status**: COMPLETED
- **Files**: `continuity.ts`, `continuity-types.ts`, `index.ts`
- **Changes made**:
  - Added `LimitSign` type to `continuity-types.ts`
  - Added `leftLimitSign` and `rightLimitSign` fields to `Discontinuity` interface
  - Imported `classifyWithSign` and `SignedLimitValue` from `limits/sign-tracking`
  - Created helper functions:
    - `signedValueToLimitSign()` - converts SignedLimitValue to LimitSign
    - `getInfinitySignInfo()` - gets sign info for infinite discontinuities
    - `describeInfiniteDiscontinuity()` - generates French description with sign info
  - Updated `analyzePointContinuity` to populate sign fields for infinite discontinuities
  - Exported `LimitSign` from `index.ts`
- **Results**:
  - 1/x at x=0: "Discontinuité infinie (asymptote verticale, -∞ à gauche, +∞ à droite)"
  - tan(x) at ±π/2: "Discontinuité infinie (asymptote verticale, +∞ à gauche, -∞ à droite)"

### MEDIUM PRIORITY

#### 3. ⬜ Centralize periodic function handling

- **Status**: PENDING
- **Problem**: Duplicated logic between continuity and limits modules
- **Solution**: Create shared `periodic-functions.ts` utility

#### 4. ⬜ Improve floor/ceil/sign handling in limits module

- **Status**: PENDING
- **Problem**: Limits module doesn't detect jump discontinuities for these functions
- **Note**: May require limits module changes

#### 5. ⬜ Exact evaluation for point deduplication

- **Status**: PENDING
- **File**: `continuity.ts` - `getPointKey` function
- **Problem**: Uses numeric rounding which can have precision issues

### LOW PRIORITY

#### 6. ⬜ Unify pedagogical descriptions

- **Status**: PENDING
- **Problem**: French descriptions scattered across modules

## Implementation Progress

### Phase 1: Exact Arithmetic ✅ COMPLETED

**Files modified**:

- `src/lib/mathAST/analysis/continuity.ts`

**Key changes**:

```typescript
// New imports
import {
	tryEvaluateLimitExact,
	resultToFiniteNode,
	isInfinityResult,
	isIndeterminateResult
} from '../limits/exact-evaluation';

// tryEvaluateAtPoint now tries exact evaluation first
function tryEvaluateAtPoint(expr, variable, point): MathNode | null {
	// 1. Try exact evaluation (polynomials, rationals, radicals)
	const exactResult = tryEvaluateLimitExact(expr, variable, point, 'both');
	if (exactResult && !isInfinityResult(exactResult) && !isIndeterminateResult(exactResult)) {
		return resultToFiniteNode(exactResult);
	}
	// 2. Fallback to numeric (for transcendental functions)
	// with INFINITY_THRESHOLD = 1e8 check
}
```

### Phase 2: Sign Tracking ✅ COMPLETED

**Files modified**:

- `src/lib/mathAST/analysis/continuity-types.ts`
- `src/lib/mathAST/analysis/continuity.ts`
- `src/lib/mathAST/analysis/index.ts`

**Key changes**:

```typescript
// New type in continuity-types.ts
export type LimitSign = 'positive' | 'negative' | 'unknown';

// Extended Discontinuity interface
export interface Discontinuity {
	// ... existing fields ...
	leftLimitSign?: LimitSign;
	rightLimitSign?: LimitSign;
}

// New helper functions in continuity.ts
function signedValueToLimitSign(value: SignedLimitValue): LimitSign;
function getInfinitySignInfo(expr, variable, point): { leftSign; rightSign };
function describeInfiniteDiscontinuity(leftSign, rightSign): string;
```

## Test Results

All 29 continuity tests pass:

```
✓ continuous functions (4 tests)
✓ infinite discontinuities - division by zero (3 tests)
✓ removable discontinuities (2 tests)
✓ infinite discontinuities - logarithm (2 tests)
✓ jump discontinuities - piecewise functions (2 tests)
✓ abs(x) is continuous (1 test)
✓ periodic discontinuities - trigonometric (2 tests)
✓ domain boundaries - sqrt (1 test)
✓ findDiscontinuityCandidates (2 tests)
✓ checkContinuityAtPoint (2 tests)
✓ options (2 tests)
✓ descriptions (1 test)
✓ findArgumentZeros with solver integration (5 tests)
```

## Decisions Made

1. Keep `INFINITY_THRESHOLD = 1e8` for numeric fallback (was 1e10 briefly, caused test failures)
2. Make sign information optional in `Discontinuity` type for backward compatibility
3. Only populate sign fields for infinite discontinuities (not jump/removable/essential)

## Related Files

- `src/lib/mathAST/limits/exact-evaluation.ts` - Exact arithmetic bridge
- `src/lib/mathAST/limits/sign-tracking.ts` - Sign tracking utilities
- `src/lib/mathAST/limits/one-sided.ts` - One-sided limit analysis
- `src/lib/mathAST/analysis/continuity.ts` - Main continuity analysis
- `src/lib/mathAST/analysis/continuity-types.ts` - Type definitions
- `src/lib/mathAST/analysis/index.ts` - Module exports

## Next Steps

1. Consider implementing medium priority improvements
2. Add more tests for exact evaluation edge cases
3. Document the new `LimitSign` type and sign fields in API documentation
