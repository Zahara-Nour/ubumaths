# Palier 2b — Pedagogical Quadratic Inequality Stepper — Progress

## Status: COMPLETE (Phases 0-10) — 2026-05-05

## Scope

Build pedagogical step-by-step resolution for inequalities `ax² + bx + c ⊻ 0`
(`<`, `>`, `≤`, `≥`, `≠`) at lycée and supérieur levels. Strategy: discriminant
Δ + sign table.

V1 in:

- All 6 sub-cases (a sign × Δ sign) with numeric coefficients
- Auto-delegation to linear stepper when a = 0
- Mode B integration end-to-end
- CLI demo with ANSI + LaTeX prettification

V1 out: parametric coefficients, special-case fast paths for `b = 0` / `c = 0` /
already-factored forms, rational inequalities.

## Phases

| #   | Phase                                     | Status | Notes                                                                                                            |
| --- | ----------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| 0   | Spec doc figée                            | ✅     | `docs/wip/pedagogical-quadratic-inequality-spec.md` (25 comportements)                                           |
| 1   | Inspect quadratic.ts + renderer + types   | ✅     |                                                                                                                  |
| 2   | Extend types.ts                           | ✅     | +2 op kinds, +`QuadraticInequalityStepsOptions`                                                                  |
| 3   | Failing tests                             | ✅     | 31 tests covering 6 sub-cases + edge cases                                                                       |
| 4   | Implement `quadratic-inequality.ts`       | ✅     | ~340 LOC, reuses `_build*` helpers from quadratic.ts                                                             |
| 5   | Update dispatcher (degree 2)              | ✅     | `generateInequalitySteps` routes degree 2 → quadratic, ≥3 still throws                                           |
| 6   | Renderer V2 polyvalent                    | ✅     | `isInequalityStep` helper, dual-form TITLES + EXPLANATIONS, sign-table LaTeX, conclusion                         |
| 7   | Mode B integration                        | ✅     | `quadratic-inequality` discriminator + Zod schemas + dispatch + 2 fixtures + 2 snapshot tests + debug page cards |
| 8   | CLI demo + pretty-print                   | ✅     | `scripts/pedagogical-quadratic-inequality-demo.ts` with 6 categories                                             |
| 9   | Code review (`code-reviewer` agent, Opus) | ✅     | 2 important fixes applied: `\setminus` LaTeX rendering + irrational-root sorting                                 |
| 10  | Final regression + doc + commit           | ✅     | 12693 mathAST tests pass, ESLint clean, check:incremental clean                                                  |

## Test results

- `pedagogical-solve` : **267 → 317 tests** (+50 = 31 inequality + 19 renderer V2)
- `mathAST` total : **12693 passing | 18 skipped | 3 todo** (no regression vs baseline)
- `questions` : Mode B snapshot tests +2 (10 → 12 demos)
- 4 pre-existing failures in `questions` (e2e fill-blanks 411/426, color-integration, exact-repro, decimal-by-digits) are **unrelated** to this work — they involve question bank globalIndex entries and random-spec parsing.

## Code review findings + fixes

The `code-reviewer` agent flagged 2 important correctness issues, both fixed:

1. **`\setminus` LaTeX rendering** — `escapeLatexBacktickFreeText` was converting
   `ℝ` → `\mathbb{R}` and `∅` → `\emptyset` but not `\` → `\setminus`. The output
   `S = \mathbb{R} \ \{2\}` was a literal `\{2\}` group, not a set complement.
   Fixed: regex `ℝ\s*\\\s*` → `\mathbb{R} \setminus ` runs **before** the bare `ℝ`
   substitution. Also added `{` / `}` escape so set-notation `{2}` renders as
   `\{2\}`. New tests cover the round-trip.

2. **Irrational root sorting** — `sortRoots` used a tiny `computeNumericValueLite`
   that only recognised `number` / `opposite(number)` nodes; irrational roots like
   `(1 + \sqrt{5})/2` evaluated to `Number.MAX_SAFE_INTEGER` and never re-ordered.
   Fixed: switched to the project's full `computeNumericValue` (`solve/numeric-value`).

3. Minor: removed unused `computeNumericValue` import from `quadratic-inequality.ts`.

## Files changed

| File                                                                                | Type | LOC                                                                                                                        |
| ----------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/mathAST/pedagogical-solve/quadratic-inequality.ts`                         | NEW  | ~340                                                                                                                       |
| `src/lib/mathAST/pedagogical-solve/__tests__/quadratic-inequality.test.ts`          | NEW  | ~600 (31 tests)                                                                                                            |
| `src/lib/mathAST/pedagogical-solve/__tests__/quadratic-renderer-inequality.test.ts` | NEW  | ~230 (19 tests)                                                                                                            |
| `src/lib/mathAST/pedagogical-solve/types.ts`                                        | MOD  | +2 op kinds, +1 options interface                                                                                          |
| `src/lib/mathAST/pedagogical-solve/quadratic.ts`                                    | MOD  | +8 underscore-prefixed exports                                                                                             |
| `src/lib/mathAST/pedagogical-solve/quadratic-renderer.ts`                           | MOD  | +`isInequalityStep`, dual-form TITLES, sign-table render, conclusion render, `\setminus` escape, `computeNumericValue` use |
| `src/lib/mathAST/pedagogical-solve/index.ts`                                        | MOD  | dispatcher routes degree 2 → quadratic                                                                                     |
| `src/lib/questions/types.ts`                                                        | MOD  | +`quadratic-inequality` discriminator                                                                                      |
| `src/lib/questions/template-schema.ts`                                              | MOD  | +loose + strict Zod schemas                                                                                                |
| `src/lib/questions/generator/correction-generator.ts`                               | MOD  | +`renderQuadraticInequality` dispatch                                                                                      |
| `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts`                      | MOD  | +2 fixtures (`quadraticInequalityClassicDemo`, `quadraticInequalityNegativeADemo`)                                         |
| `src/lib/questions/__tests__/generated-steps-demo.test.ts`                          | MOD  | +2 snapshot tests                                                                                                          |
| `src/lib/questions/__tests__/__snapshots__/generated-steps-demo.test.ts.snap`       | MOD  | +2 snapshots                                                                                                               |
| `src/routes/(protected)/dashboard/admin/debug/correction-mode-b/+page.svelte`       | MOD  | +2 GeneratedStepsCorrection cards + 4 CorrectionCard cards                                                                 |
| `scripts/pedagogical-quadratic-inequality-demo.ts`                                  | NEW  | ~190                                                                                                                       |
| `docs/wip/pedagogical-quadratic-inequality-spec.md`                                 | NEW  | spec doc                                                                                                                   |
| `docs/wip/pedagogical-quadratic-inequality-progress.md`                             | NEW  | this doc                                                                                                                   |

## Verification

```bash
# TDD tests
pnpm test:server src/lib/mathAST/pedagogical-solve/__tests__/quadratic-inequality.test.ts        # 31 / 31
pnpm test:server src/lib/mathAST/pedagogical-solve/__tests__/quadratic-renderer-inequality.test.ts  # 19 / 19

# Regression
pnpm test:server src/lib/mathAST/pedagogical-solve   # 317 / 317
pnpm test:server src/lib/mathAST                     # 12693 passing, 0 regression
pnpm test:server src/lib/questions/__tests__/generated-steps-demo.test.ts  # 12 / 12

# CLI demo (visual)
pnpm tsx scripts/pedagogical-quadratic-inequality-demo.ts            # all categories (pretty)
pnpm tsx scripts/pedagogical-quadratic-inequality-demo.ts -v dpos    # detailed verbose
pnpm tsx scripts/pedagogical-quadratic-inequality-demo.ts --latex    # raw LaTeX

# Quality
npx eslint <files…>                  # 0 errors
pnpm check:incremental               # 0 new errors
```

## Known limitations (post-V1)

From the code review (kept for follow-up):

- `isConstantCoefficient` is duplicated between `quadratic.ts` and
  `quadratic-inequality.ts`; should be moved to `_helpers.ts`.
- The double parametric-rejection pass (whole-expression scan + per-coefficient
  check) is redundant; one of the two could be dropped.
- `formatSignTable` has no defensive guard for `numRoots > 2`; relies on the
  caller never passing more than 2 roots.
- GCD simplification (`factor-gcd`) is intentionally absent in the inequality
  pipeline — V1 keeps the chain simpler. Add a code comment if future
  contributors want to know why.

These are quality debt, not correctness issues. They can be tackled in V1.1.

## Next palier candidates

- **2c** — special-case fast paths (`b = 0`, `c = 0`, already factored) to skip
  the discriminant computation when redundant
- **2d** — parametric coefficients (`mx² + nx + p = 0`, m/n/p with letters)
  — much harder; covers the `m`-in-discriminant-sign-discussion exam questions
- **3** — rational inequalities `(x − 1)/(x² − 4) < 0` pedagogical pipeline
  (Domain solver already handles them via palier 1)
