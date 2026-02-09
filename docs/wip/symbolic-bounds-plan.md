# Plan: Replace numeric Bounds with symbolic IntervalDomain in numtype

## Context

The numtype module currently uses a numeric `Bounds` type (`{ lower: number | null, upper: number | null, ... }`) for interval propagation. The intervals module already has a symbolic `IntervalDomain` type with `MathNode` endpoints (supports π, √2, ln(3), etc.). The goal is to unify on `IntervalDomain` so bounds are always symbolic.

### Key findings

1. **No external consumers** of `MathType.bounds` exist outside numtype — the bounds are only used internally to derive `.sign` via `signFromBounds()`
2. **`ExactBounds`** is only used in `precise-bounds.ts` and `infer.ts` — it becomes redundant once bounds are symbolic
3. **`compareNumericNodes`** already compares symbolic MathNode values — suitable for sign deduction
4. The intervals module is a **data structure + set operations** library — stays untouched

### Design decisions

- **Symbolic bounds everywhere** — `MathType.bounds` and `VariableAssumption.bounds` become `IntervalDomain`
- **Cheap special-case propagation** — handle all O(1) cases directly in numtype rules with symbolic MathNode endpoints
- **Fall back to `computeRange`** only for truly complex cases (non-monotone trig, variable exponents)

---

## Symbolic bounds propagation: special cases catalog

All operations below produce IntervalDomain with symbolic MathNode endpoints.
Endpoint sign/ordering checks use `compareNumericNodes`.
Endpoint numeric evaluation (for four-corners min/max) uses `endpointToNumber`.

### Tier 1: Always exact, trivial — no sign check needed

| Operation | Input                         | Result                       | Notes                              |
| --------- | ----------------------------- | ---------------------------- | ---------------------------------- |
| `a + b`   | `[a_lo, a_hi] + [b_lo, b_hi]` | `[a_lo + b_lo, a_hi + b_hi]` | Minkowski sum, always exact        |
| `a - b`   | `[a_lo, a_hi] - [b_lo, b_hi]` | `[a_lo - b_hi, a_hi - b_lo]` | Minkowski difference, always exact |
| `-x`      | `-[lo, hi]`                   | `[-hi, -lo]`                 | Swap + negate                      |

Endpoint types (open/closed): `open + open = open`, `open + closed = open`, `closed + closed = closed` (same rules for subtraction).

### Tier 2: Exact, needs sign check on constant

| Operation             | Input                   | Result          | Notes                                |
| --------------------- | ----------------------- | --------------- | ------------------------------------ |
| `c * x` (c point)     | `c > 0`: `[c*lo, c*hi]` | Scalar multiply | `compareNumericNodes(c, 0)` for sign |
|                       | `c < 0`: `[c*hi, c*lo]` | Reversed        |                                      |
|                       | `c = 0`: `[0, 0]`       | Point           |                                      |
| `x / c` (c point, ≠0) | Same as `(1/c) * x`     | Scalar divide   |                                      |

### Tier 3: Exact, needs endpoint sign analysis

| Operation                     | Condition      | Result                                                                                                                                            | Notes                                  |
| ----------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `x²` (or `x^n`, n even)       | `lo ≥ 0`       | `[lo^n, hi^n]`                                                                                                                                    | Monotone increasing on [0, +∞)         |
|                               | `hi ≤ 0`       | `[hi^n, lo^n]`                                                                                                                                    | Monotone decreasing on (-∞, 0]         |
|                               | `lo < 0 < hi`  | `[0, max(lo^n, hi^n)]`                                                                                                                            | Minimum at 0                           |
| `x^n` (n odd)                 | any            | `[lo^n, hi^n]`                                                                                                                                    | Monotone increasing everywhere         |
| `\|x\|`                       | `lo ≥ 0`       | `[lo, hi]`                                                                                                                                        | Identity                               |
|                               | `hi ≤ 0`       | `[-hi, -lo]`                                                                                                                                      | Negate                                 |
|                               | `lo < 0 < hi`  | `[0, max(-lo, hi)]`                                                                                                                               | Minimum at 0                           |
| `x * y` (general)             | both intervals | Four corners: evaluate all `{lo_a*lo_b, lo_a*hi_b, hi_a*lo_b, hi_a*hi_b}` numerically to find min/max, use symbolic MathNode endpoints for result | `endpointToNumber` for comparison only |
| `x / y` (y doesn't contain 0) | both intervals | Four corners: same approach as multiply with `lo_a/lo_b`, etc.                                                                                    | If y contains 0, return universal      |

### Tier 4: Monotone functions — exact, O(1)

| Function           | Monotonicity | Result                     | Domain requirement |
| ------------------ | ------------ | -------------------------- | ------------------ |
| `√x`               | increasing   | `[√lo, √hi]`               | `lo ≥ 0`           |
| `exp(x)`           | increasing   | `[exp(lo), exp(hi)]`       | none               |
| `ln(x)`            | increasing   | `[ln(lo), ln(hi)]`         | `lo > 0`           |
| `x^(1/n)` (n odd)  | increasing   | `[lo^(1/n), hi^(1/n)]`     | none               |
| `x^(1/n)` (n even) | increasing   | `[lo^(1/n), hi^(1/n)]`     | `lo ≥ 0`           |
| `arctan(x)`        | increasing   | `[arctan(lo), arctan(hi)]` | none               |
| `arcsin(x)`        | increasing   | `[arcsin(lo), arcsin(hi)]` | `[-1, 1]`          |
| `sinh(x)`          | increasing   | `[sinh(lo), sinh(hi)]`     | none               |
| `tanh(x)`          | increasing   | `[tanh(lo), tanh(hi)]`     | none               |

Result endpoints are symbolic MathNode trees: e.g., `exp([0, π])` → `[exp(0), exp(π)]` where `exp(0)` and `exp(π)` are FunctionNode MathNodes.

### Tier 5: Delegate to `computeRange`

| Operation                                      | Reason                                      |
| ---------------------------------------------- | ------------------------------------------- |
| `sin(x)`, `cos(x)`                             | Non-monotone, need period/quadrant analysis |
| `tan(x)`, `cot(x)`, `sec(x)`, `csc(x)`         | Discontinuous + periodic                    |
| `x^y` (both non-point)                         | Variable exponent, complex monotonicity     |
| `floor(x)`, `ceil(x)`                          | Step functions                              |
| Any expression where special cases don't apply | General fallback                            |

---

## Phase 1: Migrate numtype types

### `types.ts` changes:

- `MathType.bounds?: Bounds` → `MathType.bounds?: IntervalDomain`
- `VariableAssumption.bounds?: Bounds` → `VariableAssumption.bounds?: IntervalDomain`
- Remove `ExactBounds` type (becomes unnecessary — IntervalDomain already has symbolic endpoints)
- Remove `MathType.exactBounds` field
- Update import: `Bounds` → `IntervalDomain` from intervals

### Files modified:

- `src/lib/mathAST/numtype/types.ts`

---

## Phase 2: Migrate signFromBounds and literals

### `rules/literals.ts` changes:

- `signFromBounds(bounds: Bounds)` → `signFromBounds(bounds: IntervalDomain)`
  - For `empty`: return undefined
  - For `universal`: return undefined
  - For `interval_set`: extract the overall lower/upper endpoints from the first and last interval, compare against zero using `compareNumericNodes`
- `typeWithAssumption()` — assumptions now carry IntervalDomain, spread into result
- `inferNumberType()` — create point interval `[n, n]` as IntervalDomain (e.g., `intervalSet([closedInterval(fromNumber(5), fromNumber(5))])`)
- `inferMathConstantType()` — create point interval with symbolic MathNode (e.g., `intervalSet([closedInterval(pi(), pi())])`)

### Files modified:

- `src/lib/mathAST/numtype/rules/literals.ts`

---

## Phase 3: Symbolic bounds propagation in arithmetic, power, and functions

### Shared helper: `extractEndpoints(domain: IntervalDomain)`

Returns `{ lo: Endpoint, hi: Endpoint } | null` — extracts the overall lower endpoint of the first interval and upper endpoint of the last interval from an IntervalSet. Returns null for empty. Returns open infinities for universal.

### `rules/arithmetic.ts` changes:

Remove all numeric bounds functions (`addBounds`, `subtractBounds`, `multiplyBounds`, `divideBounds`, `negateBounds`, `extMul`, `cornerInclusive`, `findExtremes`).

Replace with symbolic propagation:

- **`inferAdditionType`**: extract endpoints from both operands' bounds, create result with `factory.add(lo_a, lo_b)` and `factory.add(hi_a, hi_b)` (Tier 1)
- **`inferSubtractionType`**: `factory.subtract(lo_a, hi_b)` and `factory.subtract(hi_a, lo_b)` (Tier 1)
- **`inferOppositeType`**: swap + `factory.opposite()` (Tier 1)
- **`inferMultiplicationType`**:
  - If one operand is a point interval → scalar multiply (Tier 2): check sign with `compareNumericNodes`, apply `factory.implicitMultiply()`
  - If both are real intervals → four corners (Tier 3): use `endpointToNumber()` on all four products to find min/max, build result with symbolic MathNode endpoints
- **`inferDivisionType`**:
  - If divisor is a point interval → scalar divide (Tier 2)
  - If divisor contains zero → universal
  - Otherwise → four corners (Tier 3)

### `rules/power.ts` changes:

Replace `computePowerBounds` and `computeAbsBounds` with symbolic versions:

- **`inferPowerType`** (integer exponent):
  - Even n: compare endpoints against zero symbolically (Tier 3), build `factory.power(endpoint, number(n))`
  - Odd n: monotone, apply `factory.power()` to both endpoints (Tier 3)
- **`inferSqrtType`**: monotone increasing (Tier 4), build `factory.sqrt(lo)` and `factory.sqrt(hi)`
- **`inferAbsType`**: piecewise (Tier 3), compare endpoints against zero, build with `factory.abs()` or `factory.opposite()`

### `rules/function-bounds.ts` changes:

Rewrite (not delete) to handle monotone functions symbolically:

- **Monotone functions** (Tier 4): `exp`, `ln`, `arctan`, `arcsin`, `sinh`, `tanh`, `x^(1/n)`
  - Extract endpoints, apply function factory (e.g., `factory.exp(lo)`, `factory.ln(hi)`)
  - Check domain requirements symbolically (e.g., `lo > 0` for ln)
- **Non-monotone functions** (Tier 5): `sin`, `cos`, `tan`, `cot`, `sec`, `csc`
  - Return undefined bounds (no propagation)
  - Sign deduction for these cases is handled by `computeRange` in Phase 4

### `rules/functions.ts` changes:

- Update calls to use the rewritten `applyFunctionToBounds(name, input: IntervalDomain)`
- For Tier 5 functions where bounds come back undefined: no `signFromBounds` call

### Files modified:

- `src/lib/mathAST/numtype/rules/arithmetic.ts`
- `src/lib/mathAST/numtype/rules/power.ts`
- `src/lib/mathAST/numtype/rules/function-bounds.ts` (rewrite, not delete)
- `src/lib/mathAST/numtype/rules/functions.ts`

---

## Phase 4: computeRange as fallback for non-monotone cases

### `infer.ts` changes:

- `inferTypeWithPreciseBounds()` — simplified: receives and returns IntervalDomain directly
  - No more Bounds↔IntervalDomain conversion round-trip
  - Calls `computeRangeWithCriticalPointsExact` from the domain module
  - Result is directly an IntervalDomain — attach to `MathType.bounds`
  - Use `signFromBounds()` on result to derive sign
  - Remove `ExactBounds` handling
- `getCacheKey()` — serialize IntervalDomain via `formatDomainFull()` from intervals
- `findBoundedVariable()` — check for finite bounds using `isInfinite` from intervals on both endpoints

### `rules/precise-bounds.ts` changes:

- `computePreciseBounds()` — receives `IntervalDomain` directly instead of `Bounds`
  - No more `domainFromBounds(variableBounds)` conversion at input
  - No more `getBoundsFromDomain(result.domain)` conversion at output
  - Returns `IntervalDomain` directly
  - Simplify or remove `PreciseBoundsResult` type

### Files modified:

- `src/lib/mathAST/numtype/infer.ts`
- `src/lib/mathAST/numtype/rules/precise-bounds.ts`

---

## Phase 5: Migrate predicates.ts

### `predicates.ts` changes:

- `getBoundsType()` — returns `IntervalDomain | undefined`
- `isInRangeType()` — use `compareNumericNodes` to compare symbolic endpoints against `fromNumber(low)` and `fromNumber(high)`

### Files modified:

- `src/lib/mathAST/numtype/predicates.ts`

---

## Phase 6: Cleanup and tests

### Cleanup:

- Keep `Bounds`, `getBoundsFromDomain`, `domainFromBounds` in intervals module — still used by `domain/range-helpers.ts` and `domain/builtins.ts` internally
- Remove `ExactBounds` type from types.ts and exports
- Remove `Bounds` import from all numtype files
- Update numtype index exports

### Test updates:

- `__tests__/bounds.test.ts` — rewrite: test all symbolic propagation tiers with IntervalDomain
- `__tests__/precise-bounds.test.ts` — remove `ExactBounds` assertions, check `IntervalDomain` results
- `__tests__/function-bounds.test.ts` — rewrite for monotone function propagation with symbolic endpoints
- `simplify/__tests__/abs-sign.test.ts` — rewrite `ctxBounds()`, `closedBounds()`, etc. to use IntervalDomain

### Files modified:

- `src/lib/mathAST/numtype/__tests__/bounds.test.ts`
- `src/lib/mathAST/numtype/__tests__/precise-bounds.test.ts`
- `src/lib/mathAST/numtype/__tests__/function-bounds.test.ts`
- `src/lib/mathAST/simplify/__tests__/abs-sign.test.ts`
- `src/lib/mathAST/numtype/index.ts`

---

## Scope decision

**`domain/range-helpers.ts` and `domain/builtins.ts`** stay unchanged — they use `Bounds`/`getBoundsFromDomain`/`domainFromBounds` internally and return `Domain` (already symbolic). Only the numtype module changes.

---

## Summary

| Phase | Description                                        | Files | Complexity |
| ----- | -------------------------------------------------- | ----- | ---------- |
| 1     | Type changes (MathType, VariableAssumption)        | 1     | Low        |
| 2     | signFromBounds + literals                          | 1     | Medium     |
| 3     | Symbolic propagation: arithmetic, power, functions | 4     | High       |
| 4     | computeRange fallback (infer + precise-bounds)     | 2     | Medium     |
| 5     | Predicates                                         | 1     | Low        |
| 6     | Cleanup + tests                                    | 5     | Medium     |

Total: ~14 files modified.

### What we gain:

- Bounds are always symbolic MathNode endpoints (π, √2, etc. preserved exactly)
- No more lossy numeric↔symbolic conversion round-trips
- ExactBounds type eliminated (IntervalDomain already is exact)
- Cleaner architecture: cheap O(1) symbolic propagation for most cases, `computeRange` only for trig/complex
- Addition/subtraction now always propagate (previously they were Minkowski-style too, but on numeric values)
