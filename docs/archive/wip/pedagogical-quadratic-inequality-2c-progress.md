# Palier 2c — Pedagogical Quadratic Inequality Fast Paths — Progress

## Status: COMPLETE — 2026-05-06

Follow-up of palier 2b (`f32893cff`). Adds 3 pedagogical fast paths to the
quadratic inequality stepper that bypass the discriminant Δ when the polynomial
form allows it.

## Phases

| #   | Phase                                                                                                                        | Status                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 0   | Spec doc figée                                                                                                               | ✅ `docs/wip/pedagogical-quadratic-inequality-2c-spec.md` |
| 1   | Failing TDD tests (13 nouveaux)                                                                                              | ✅                                                        |
| 2   | Extend `types.ts` — 1 new op kind                                                                                            | ✅ `inequality-conclude-from-isolated-square`             |
| 3   | Detect-case helpers exposed (`_detectCase`, `_tryDetectFactored`, `_extractLinearCoefficients`, `_solveLinearFactor`, types) | ✅                                                        |
| 4   | Implement 3 sub-pipelines (b=0, c=0, factored) + dispatch                                                                    | ✅                                                        |
| 5   | Renderer V2 quadratique : TITLES + EXPLANATIONS + `formatConcludeFromIsolatedSquare`                                         | ✅                                                        |
| 6   | Update `x² + 1 < 0` test inputs (now fast-path) → swap to `x² + x + 1 < 0` for the standard-Δ regression tests               | ✅                                                        |
| 7   | CLI demo verification — fixed renderer-selection heuristic for fast paths (`identify-equation` not always emitted)           | ✅                                                        |
| 8   | Code review + 3 fixes applied                                                                                                | ✅                                                        |
| 9   | Final regression + doc + commit                                                                                              | ✅                                                        |

## Sub-pipelines (3)

### A. `b = 0` (`ax² + c ⊻ 0`) — fast path via `isolate-square`

```
identify-equation → (standardize?) → recognize-no-linear-term →
isolate-square → inequality-conclude-from-isolated-square
```

**Critical** : when `a < 0`, dividing by `a` flips the inequality operator.
The displayed isolated form (`step.after.relation`) reflects the flip;
`step.before.relation` keeps the original. The renderer's `alignedTransformation`
now reads `relBefore` and `relAfter` separately (same fix as linear-renderer
commit `a974787d7`).

### B. `c = 0` (`ax² + bx ⊻ 0`) — fast path via `factor-common-x`

```
identify-equation → (standardize?) → recognize-no-constant-term →
factor-common-x → quadratic-sign-table (roots 0 and -b/a) →
inequality-conclude-quadratic
```

Reuses palier 2b sign-table machinery.

### C. Factored `(αx + β)(γx + δ) ⊻ 0` — fast path no Δ no standardize

```
identify-equation → recognize-factored → quadratic-sign-table
(roots from factors, effective `a` = α·γ) → inequality-conclude-quadratic
```

Detected BEFORE standardisation when `rhs = 0`. If `rhs ≠ 0`, falls through
to the Δ path (the user must standardise first).

## New op kind

```ts
| {
    readonly kind: 'inequality-conclude-from-isolated-square';
    readonly relation: '<' | '>' | '<=' | '>=' | '!=';
    readonly solutionDescription: string;
  };
```

The renderer reads `solutionDescription` (Unicode-safe, post-processed by
`escapeLatexBacktickFreeText`) for both the title and the LaTeX expression.

## Code review fixes applied

1. **Operator flip in b=0 case** — when `a < 0`, the displayed isolated form now
   shows the flipped operator (`x² < 4` instead of `x² > 4` for `−x² + 4 > 0`).
   Required updating `alignedTransformation` to read `relBefore`/`relAfter`
   separately. Regression test `A6` locks this behaviour.

2. **Dead fields removed** — initially the new op kind carried `square`,
   `comparedConstant`, `originalASign`, but the renderer only used
   `solutionDescription`. Dropped the dead fields per YAGNI.

3. **Defensive throw in factored** — `_extractLinearCoefficients` returning
   `null` is a precondition violation (caller broke contract from
   `_tryDetectFactored`). Now throws explicitly instead of silently skipping.

## Test results

- `pedagogical-solve` : **317 → 331 tests** (+14 = 13 spec + 1 flip regression)
- `mathAST` total : **12707 passing | 18 skipped | 3 todo** (no regression)
- Mode B snapshot tests : **12 / 12** (palier 2b fixtures untouched)
- ESLint + check:incremental : **0 nouvelles erreurs**

## Files changed

| File                                                                                | Change                                                                                                    |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/lib/mathAST/pedagogical-solve/types.ts`                                        | +1 op kind                                                                                                |
| `src/lib/mathAST/pedagogical-solve/quadratic.ts`                                    | +5 underscore-prefixed exports + 5 type exports                                                           |
| `src/lib/mathAST/pedagogical-solve/quadratic-inequality.ts`                         | +3 sub-pipeline builders + dispatch + `flipRelation` import + flip fix                                    |
| `src/lib/mathAST/pedagogical-solve/quadratic-renderer.ts`                           | +TITLES/EXPLANATIONS for new kind + `formatConcludeFromIsolatedSquare` + `alignedTransformation` flip fix |
| `src/lib/mathAST/pedagogical-solve/__tests__/quadratic-inequality.test.ts`          | +13 spec tests + 1 flip regression + 2 input swaps + polymorphic `getConclude`                            |
| `src/lib/mathAST/pedagogical-solve/__tests__/quadratic-renderer-inequality.test.ts` | +2 input swaps + 2 conclude-find updates                                                                  |
| `scripts/pedagogical-quadratic-inequality-demo.ts`                                  | +renderer-selection heuristic update + 4 new demo cases                                                   |
| `docs/wip/pedagogical-quadratic-inequality-2c-spec.md`                              | NEW                                                                                                       |
| `docs/wip/pedagogical-quadratic-inequality-2c-progress.md`                          | NEW (this)                                                                                                |

## Verification commands

```bash
# Tests
pnpm test:server src/lib/mathAST/pedagogical-solve/__tests__/quadratic-inequality.test.ts        # 45/45
pnpm test:server src/lib/mathAST/pedagogical-solve/__tests__/quadratic-renderer-inequality.test.ts # 19/19
pnpm test:server src/lib/mathAST/pedagogical-solve   # 331/331
pnpm test:server src/lib/mathAST                     # 12707/12707
pnpm test:server src/lib/questions/__tests__/generated-steps-demo.test.ts  # 12/12

# CLI visual
pnpm tsx scripts/pedagogical-quadratic-inequality-demo.ts special   # b=0 cases
pnpm tsx scripts/pedagogical-quadratic-inequality-demo.ts c-zero    # c=0 cases
pnpm tsx scripts/pedagogical-quadratic-inequality-demo.ts factored  # factored cases
pnpm tsx scripts/pedagogical-quadratic-inequality-demo.ts dpos      # standard Δ-path (regression)

# Quality
npx eslint <files…>                  # 0 errors
pnpm check:incremental               # 0 new errors
```

## Remaining quality debt (post-V1)

From the code review, deferred to V1.1+:

- **CLI demo renderer-selection heuristic** uses an explicit `Set<string>` of
  13 quadratic-specific kinds (`QUAD_KINDS`). Maintenance liability — every
  new op kind in the quadratic pipeline must be added there. Better signal:
  emit `identify-equation` unconditionally at supérieur (currently
  `STRATEGIES_QUADRATIC.superieur.includeIdentify = false`).

- **OUT V1** edge cases:
  - `(αx + β)² ⊻ 0` (carré parfait factorisé) — falls back to Δ-path
  - `a(x − x₁)(x − x₂) ⊻ 0` with `a` non-1 sortant — falls back to Δ-path

These edge cases produce correct solutions but a less direct narrative.

## Next paliers

- **2d** — coefficients paramétriques (`mx² + nx + p ⊻ 0`, m libre) — complexity ↑↑
- **3** — inéquations rationnelles pédagogiques (palier 1 already solves them)
