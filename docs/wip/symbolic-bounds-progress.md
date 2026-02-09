# Symbolic Bounds Migration - Progress

## Plan: `docs/wip/symbolic-bounds-plan.md`

## Status: In Progress — Phase 4

## Phases

- [x] Phase 1: Migrate numtype types (`types.ts`) — DONE
- [x] Phase 2: Migrate signFromBounds and literals (`rules/literals.ts`) — DONE
- [x] Phase 3: Symbolic propagation: arithmetic, power, functions — DONE
  - [x] `rules/arithmetic.ts` — DONE
  - [x] `rules/power.ts` — DONE
  - [x] `rules/function-bounds.ts` — DONE
  - [x] `rules/functions.ts` — DONE
- [ ] Phase 4: computeRange fallback (`infer.ts`, `precise-bounds.ts`) — NEXT
- [ ] Phase 5: Predicates (`predicates.ts`)
- [ ] Phase 6: Cleanup and tests

## What was done

### Phase 1: `types.ts`

- `MathType.bounds` changed from `Bounds` to `IntervalDomain`
- `VariableAssumption.bounds` changed from `Bounds` to `IntervalDomain`
- `ExactBounds` type removed
- `MathType.exactBounds` field removed
- Import changed from `Bounds` (intervals/algebra) to `IntervalDomain` (intervals/types)

### Phase 2: `rules/literals.ts`

- `signFromBounds(bounds: IntervalDomain)` rewritten: extracts endpoints from IntervalSet, compares against zero using `compareNumericNodes`
- `typeWithAssumption()` signature updated for IntervalDomain
- `inferNumberType()` creates point interval: `intervalSet([closedInterval(fromNumber(v), fromNumber(v))])`
- `inferMathConstantType()` creates symbolic point interval: `intervalSet([closedInterval(pi(), pi())])` or `e()`
- `inferVariableType()` for `e` variable: same symbolic pattern

### Phase 3: `rules/arithmetic.ts`

- **Removed** all numeric bounds helpers: `findExtremes`, `addBounds`, `subtractBounds`, `extMul`, `cornerInclusive`, `multiplyBounds`, `divideBounds`, `negateBounds`
- **Removed** `Bounds` import from `$lib/math/intervals/algebra`
- **Added** symbolic bounds propagation functions:
  - `addIntervalBounds(a, b)`: Tier 1 addition
  - `subtractIntervalBounds(a, b)`: Tier 1 subtraction
  - `negateIntervalBounds(d)`: Tier 1 negation
  - `multiplyIntervalBounds(a, b)`: Tier 2/3 four-corners
  - `divideIntervalBounds(a, b)`: Tier 2/3 four-corners

### Phase 3: `rules/power.ts`

- **Removed** numeric `computePowerBounds` (used `Bounds` type)
- **Removed** `import type { Bounds }` from intervals/algebra
- **Added** symbolic `computePowerBounds(baseBounds: IntervalDomain, exponent)`:
  - Uses `compareNumericNodes` for endpoint sign analysis
  - Uses `factory.power()` for symbolic result endpoints
  - Even exponent: three cases (lo>=0, hi<=0, crosses zero)
  - Odd exponent: monotone increasing [lo^n, hi^n]
  - Falls back to `endpointToNumber` only for |lo| vs |hi| comparison in crosses-zero case
- `inferSqrtType` unchanged — already delegated to `applyFunctionToBounds('sqrt', ...)`

### Phase 3: `rules/function-bounds.ts`

- **Complete rewrite** from numeric to symbolic
- **Signature**: `applyFunctionToBounds(name: string, inputBounds: IntervalDomain): IntervalDomain | undefined`
- **Registry-based**: `MONOTONE_FUNCTIONS` maps function names to `MonotoneFunctionInfo`
- **Tier 4 monotone**: exp, ln, log, sqrt, arctan, arcsin, arccos, sinh, tanh, arcsinh, arctanh, arccosh
  - Each has `apply: (endpoint) => MathNode` using factory functions
  - Domain checks via `compareNumericNodes` (e.g., ln requires lo > 0)
  - Static range bounds (e.g., exp has rangeLower = (0, open))
- **Tier 5 non-monotone**: returns undefined (sin, cos, tan, etc.)
- **Removed** all numeric evaluation, sampling, and piecewise containment checks

### Phase 3: `rules/functions.ts`

- **Removed** `import type { Bounds }` and `import { getBuiltinRangeEntry }`
- **Removed** numeric `getFunctionBounds()` and numeric `computeAbsBounds()`
- **Added** symbolic `computeAbsBounds(argBounds: IntervalDomain)`:
  - Uses `compareNumericNodes` for endpoint sign analysis
  - Three cases: lo>=0 (identity), hi<=0 (negate), crosses zero
  - Falls back to `endpointToNumber` only for |lo| vs hi comparison
- **Updated** `inferTranscendentalFunctionType`: no more static range fallback
- **Updated** `inferTypePreservingFunctionType` (abs): uses symbolic bounds
- **Removed** rounding function bounds (Tier 5 — no symbolic propagation)

## Files Modified So Far

- `src/lib/mathAST/numtype/types.ts` — Phase 1
- `src/lib/mathAST/numtype/rules/literals.ts` — Phase 2
- `src/lib/mathAST/numtype/rules/arithmetic.ts` — Phase 3
- `src/lib/mathAST/numtype/rules/power.ts` — Phase 3
- `src/lib/mathAST/numtype/rules/function-bounds.ts` — Phase 3
- `src/lib/mathAST/numtype/rules/functions.ts` — Phase 3

## Key Imports Pattern

```typescript
// For creating IntervalDomain values:
import type { IntervalDomain, Endpoint, EndpointType } from '$lib/math/intervals/types';
import { intervalSet, interval, closedInterval, fromNumber, pi, e } from '$lib/math/intervals';
import {
	universalSet,
	isNegativeInfinity,
	isPositiveInfinity,
	endpointToNumber,
	containsValue
} from '$lib/math/intervals';

// For symbolic comparison:
import { compareNumericNodes } from '../../eval/compare-numeric';

// For building symbolic MathNode endpoints:
import {
	number,
	add,
	subtract,
	opposite,
	implicitMultiply,
	fraction,
	infinity,
	power,
	func
} from '../../factory';
import type { MathNode } from '../../types';
```

## Notes

- `compareNumericNodes(a, b)` returns `-1 | 0 | 1 | undefined` — undefined means can't compare
- `endpointToNumber(endpoint)` converts MathNode endpoint to `number` (returns NaN if unevaluable, Infinity/-Infinity for infinities)
- MathNode factories are pure constructors (no auto-simplification)
- Endpoint type rules: `closed + closed = closed`, otherwise `open` (for add/sub)
- `containsValue(domain, 0)` accepts a raw number — no need to construct a MathNode
- No code has been committed yet — all changes are unstaged
