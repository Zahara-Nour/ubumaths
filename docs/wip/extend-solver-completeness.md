# Extend Solver Completeness for Sign/Variation Analysis

## Context

The sign analysis module (`src/lib/mathAST/sign/`) and the variation module (`src/lib/mathAST/variations/`) depend entirely on the solve module (`src/lib/mathAST/solve/`) finding **all** zeros of an expression. If solve misses a zero, the sign table is silently incorrect (no warning emitted), and the variation table inherits the error.

Currently, solve has three critical gaps:

### Gap 1: Trigonometric periodic solutions (HIGH PRIORITY)

**Problem**: `solveTrigonometric` in `src/lib/mathAST/solve/solvers/transcendental.ts` only returns the **principal solution** (e.g., `arcsin(c)`), not the full periodic family. For sign analysis of `cos(x)` on a bounded domain like `[0, 4π]`, we need all zeros (`π/2, 3π/2, 5π/2, 7π/2`), not just `π/2`.

**Existing infrastructure**:

- `src/lib/mathAST/analysis/periodicity.ts` — detects periods of expressions and has `detectPeriodicity()` which returns `period` (symbolic MathNode) and `periodNumeric`.
- `src/lib/mathAST/common/periodic-functions.ts` — database of periodic trig functions with their discontinuity patterns, has `enumerateDiscontinuityPoints()` for enumerating points at regular intervals within bounds.

**Approach**:

1. When `transcendentalSolver` solves a trig equation (sin/cos/tan), detect the period using the periodicity module.
2. Return the principal solution(s) AND a `periodicSolutions` field describing the family: `{baseSolutions: MathNode[], period: MathNode}`.
3. In the sign module's `findZeros` (`src/lib/mathAST/sign/helpers/zeros.ts`), when receiving periodic solutions and a bounded domain, enumerate all concrete zeros within the domain bounds.
4. For unbounded domains (all of R), the sign module should recognize that the expression has infinitely many zeros and handle it specially (e.g., restrict analysis to one period).

**Key files to modify**:

- `src/lib/mathAST/solve/types.ts` — add `periodicSolutions` field to `SolveResult` or `Solution`
- `src/lib/mathAST/solve/solvers/transcendental.ts` — return periodic family info
- `src/lib/mathAST/sign/helpers/zeros.ts` — enumerate periodic zeros within domain
- `src/lib/mathAST/sign/analyze.ts` — handle unbounded periodic case

**Trig solution families to implement**:

- `sin(ax+b) = c` → `x = (arcsin(c) - b) / a + 2kπ/a` and `x = (π - arcsin(c) - b) / a + 2kπ/a`
- `cos(ax+b) = c` → `x = (arccos(c) - b) / a + 2kπ/a` and `x = (-arccos(c) - b) / a + 2kπ/a`
- `tan(ax+b) = c` → `x = (arctan(c) - b) / a + kπ/a`

### Gap 2: Degree 4 polynomials (MEDIUM PRIORITY) — DONE

**Resolved**: `quarticSolver` in `src/lib/mathAST/solve/solvers/quartic.ts` handles all degree-4 polynomials via Ferrari's method (hybrid numeric/symbolic). Three sub-strategies: biquadratic, common factor, general Ferrari. 19 tests pass.

Note: Durand-Kerner and companion matrix eigenvalue approaches were considered but rejected — they are purely numeric methods that cannot produce exact symbolic solutions (integers, fractions). Ferrari is the correct algebraic approach for degree 4 (analogous to Cardano for degree 3). Numeric-only methods would be appropriate for degree >= 5 where no algebraic formula exists (Abel-Ruffini).

### Gap 3: Mixed/factored equations (LOW PRIORITY)

**Problem**: Equations like `x·sin(x) = 0` or `(x²-1)·e^x = 0` are classified as 'mixed' and not solved. Many of these can be decomposed into factors.

**Approach**: In the sign module or in solve, detect product structure in the expression being solved, and solve each factor independently. The sign module's `analyzeExpressionStructure` in `interval-sign.ts` already decomposes products — similar logic could be added to zero-finding.

## Testing strategy

For each gap, write tests in the sign-variations integration test:

- `src/lib/mathAST/__tests__/sign-variations-integration.test.ts`

Test cases:

- `cos(x)` on `[0, 4π]` → should find zeros at π/2, 3π/2, 5π/2, 7π/2
- `sin(2x)` on `[0, 2π]` → should find zeros at 0, π/2, π, 3π/2, 2π
- `x⁴ - 5x² + 4 = 0` → should find ±1, ±2
- `x·cos(x) = 0` → should find x=0 and the periodic family of cos

## Existing tests to check

- `src/lib/mathAST/solve/__tests__/transcendental.test.ts`
- `src/lib/mathAST/solve/__tests__/polynomial.test.ts`
- `src/lib/mathAST/analysis/__tests__/periodicity.test.ts`
- `src/lib/mathAST/sign/__tests__/analyze.test.ts`
