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
  - Created helper functions for sign tracking
  - Updated `analyzePointContinuity` to populate sign fields for infinite discontinuities
  - Exported `LimitSign` from `index.ts`
- **Results**:
  - 1/x at x=0: "Discontinuité infinie (asymptote verticale, -∞ à gauche, +∞ à droite)"
  - tan(x) at ±π/2: "Discontinuité infinie (asymptote verticale, +∞ à gauche, -∞ à droite)"

### MEDIUM PRIORITY

#### 3. ✅ Centralize periodic function handling

- **Status**: COMPLETED
- **New file**: `src/lib/mathAST/common/periodic-functions.ts`
- **Changes made**:
  - Created shared utility with `PeriodicFunctionInfo` type
  - Database `PERIODIC_FUNCTIONS` for tan, cot, sec, csc
  - Query functions: `isPeriodicTrigFunction`, `getPeriodicFunctionInfo`, `getPeriodicFunctionNames`
  - Symbolic representation: `getPeriodicPattern`, `piOverTwo`, `pi`
  - Enumeration: `enumerateDiscontinuityPoints`, `isDiscontinuityPoint`
  - Refactored `findPeriodicFunctionDiscontinuities` to use the shared utility
  - Exported from `common/index.ts`
- **Benefits**:
  - Single source of truth for periodic function properties
  - Symbolic base point (π/2) instead of numeric approximation
  - Reusable by limits module if needed

#### 4. ✅ Improve floor/ceil/sign handling in limits module

- **Status**: COMPLETED
- **New file**: `src/lib/mathAST/limits/piecewise.ts`
- **Changes made**:
  - Created `piecewise.ts` with direction-aware limit evaluation for floor/ceil/sign
  - Added `tryPiecewiseFunctionLimit` function that handles:
    - `floor(x)` at integer n: left limit = n-1, right limit = n
    - `ceil(x)` at integer n: left limit = n, right limit = n+1
    - `sign(x)` at zero: left limit = -1, right limit = +1
  - Added `containsPiecewiseFunction` detection function
  - Integrated into `evaluate.ts` before direct substitution strategy
  - Exported from `limits/index.ts`
- **Tests added**: 8 new tests in `one-sided.test.ts`
- **Benefits**:
  - Correct one-sided limits for piecewise functions
  - Jump discontinuity detection now works with limits module

#### 5. ✅ Exact evaluation for point deduplication

- **Status**: COMPLETED
- **File**: `continuity.ts` - `getPointKey` function
- **Changes made**:
  - Added exact evaluation via `tryEvaluateLimitExact` before numeric fallback
  - Uses `resultToNumber` for extracting numeric values from normal forms
  - Maintains rounding (1e10) for floating point comparison
- **Benefits**:
  - Better handling of symbolic values like π/2
  - More consistent deduplication

### LOW PRIORITY

#### 6. ⬜ Unify pedagogical descriptions

- **Status**: PENDING
- **Problem**: French descriptions scattered across modules

## Implementation Progress

### Phase 1: Exact Arithmetic ✅ COMPLETED

### Phase 2: Sign Tracking ✅ COMPLETED

### Phase 3: Periodic Functions Centralization ✅ COMPLETED

**New file**: `src/lib/mathAST/common/periodic-functions.ts`

**Key types**:

```typescript
interface PeriodicFunctionInfo {
	name: string; // 'tan', 'cot', 'sec', 'csc'
	basePoint: number; // π/2 for tan/sec, 0 for cot/csc
	period: number; // π
	discontinuityType: 'infinite';
	descriptionFr: string;
	relatedFunction?: string;
}
```

**Key functions**:

- `isPeriodicTrigFunction(name)` - check if function has periodic discontinuities
- `getPeriodicFunctionInfo(name)` - get discontinuity info
- `getPeriodicPattern(name)` - get symbolic representation (π/2, π)
- `enumerateDiscontinuityPoints(name, options)` - list points in interval

### Phase 4: Point Deduplication ✅ COMPLETED

**Changes to `getPointKey`**:

```typescript
function getPointKey(point: MathNode): string {
	// Try exact evaluation first
	const exactResult = tryEvaluateLimitExact(point, '_dummy', number('0'), 'both');
	if (exactResult?.type === 'normal') {
		const numValue = resultToNumber(exactResult);
		if (numValue !== null && Number.isFinite(numValue)) {
			return String(Math.round(numValue * 1e10) / 1e10);
		}
	}
	// Fallback to numeric evaluation
	// ...
}
```

### Phase 5: Piecewise Functions ✅ COMPLETED

**New file**: `src/lib/mathAST/limits/piecewise.ts`

**Key types**:

```typescript
interface PiecewiseLimitResult {
	readonly success: boolean;
	readonly value: MathNode | null;
	readonly technique: LimitRule;
	readonly description?: string;
}
```

**Key functions**:

- `containsPiecewiseFunction(expr)` - check if expression contains floor/ceil/sign
- `tryPiecewiseFunctionLimit(expr, varName, approach, direction, recorder)` - evaluate limit with direction

**Integration**: Added as Strategy 1.5 in `evaluate.ts`, before direct substitution.

## Test Results

- **Continuity tests**: All 29 pass
- **Limits tests**: All 502 pass (8 new piecewise tests added)

## Files Modified/Created

**Created**:

- `src/lib/mathAST/common/periodic-functions.ts` - Shared periodic function utilities
- `src/lib/mathAST/limits/piecewise.ts` - Piecewise function limit handling

**Modified**:

- `src/lib/mathAST/analysis/continuity.ts` - Main improvements
- `src/lib/mathAST/analysis/continuity-types.ts` - Added LimitSign type
- `src/lib/mathAST/analysis/index.ts` - Export LimitSign
- `src/lib/mathAST/common/index.ts` - Export periodic-functions utilities
- `src/lib/mathAST/limits/evaluate.ts` - Integrated piecewise strategy
- `src/lib/mathAST/limits/index.ts` - Export piecewise functions
- `src/lib/mathAST/limits/__tests__/one-sided.test.ts` - Added 8 piecewise tests

## Remaining Work

1. ~~**Improve floor/ceil/sign handling**~~ ✅ DONE
2. **Unify pedagogical descriptions** - Lower priority
3. **Add tests for periodic-functions utility**
4. **Document new APIs**
