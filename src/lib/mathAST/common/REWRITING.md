# Rewriting Engine + Dual Rendering Pattern

> **Status**: MVP delivered. See `docs/wip/pedagogical-steppers-mvp-prompt.md`
> for the full plan and `docs/wip/pedagogical-steppers-mvp-progress.md` for
> what was built and why.

This module provides:

- A **parameterized rewrite engine** (`rewriting-engine.ts`) shared by
  simplification, normalization, and future pedagogical pipelines.
- A **dual rendering layer** (`step-renderer-base.ts`, `technical-renderer.ts`)
  so a single recorded step trace can be displayed two ways.

## Files

```
common/
├── step-renderer-base.ts     # Types: SchoolLevel, RenderOptions, RenderedStep,
│                             #        StepRenderer, PedagogicalRenderOptions
├── technical-renderer.ts     # GenericTechnicalRenderer<TStep extends BaseStep>
└── rewriting-engine.ts       # rewrite(node, config): EngineResult
```

Domain-specific pedagogical renderers live next to the recorder they consume
(e.g. `solve/pedagogical-renderer.ts`).

## Dual rendering pattern

```
[Algorithm]  ──►  [StepRecorder]  ──►  [SolveStep[]]
                                          │
                          ┌───────────────┴────────────────┐
                          ▼                                ▼
              [TechnicalRenderer]               [PedagogicalRenderer]
              (debug, devtools)                  (élève, SchoolLevel)
```

Single recorder + dual renderer. The recorder captures raw transformations
once; renderers convert them on demand. See
`solve/__tests__/dual-rendering-demo.test.ts` for a runnable example on
`2x + 3 = 7` showing all four outputs side by side.

## Adding a new pedagogical renderer

For a domain whose algorithm matches teaching style (solve, integrate,
differentiate, limits, matrix, domain):

1. Identify the recorder (`<Domain>StepRecorder` extending `StepRecorderBase`).
2. Implement `class <Domain>PedagogicalRenderer implements StepRenderer<<Domain>Step, PedagogicalRenderOptions>`.
3. Define `TITLES: Record<SchoolLevel, Partial<Record<RuleName, TitleFn>>>` and
   optionally `EXPLANATIONS` (typically primaire only).
4. Fallback chain: `TITLES[level][rule]` → `TITLES.lycee[rule]` → `step.description`.

`solve/pedagogical-renderer.ts` is the reference implementation (covers linear
and quadratic rules across the four French school levels).

## Using the rewrite engine

The engine is the iterate-until-stable backbone of `simplify()`:

```typescript
import { rewrite } from '$lib/mathAST/common/rewriting-engine';

const result = rewrite(node, {
	rules,
	preProcess: (n) => denormalize(normalize(preprocess(n))),
	postProcess: (n) => denormalize(normalize(preprocess(n))),
	strategy: { kind: 'cost-fixpoint', cost: computeCost },
	maxIterations: 10,
	signal,
	timeoutMs,
	onStep: (step) => recorder.recordStep(/* bridge logic */)
});
```

Two strategies:

- `cost-fixpoint`: track lowest-cost form across iterations, return best ever.
- `deterministic`: return whatever `current` is at loop exit.

Cooperative interruption via `AbortSignal` and/or `timeoutMs` (reused from
`common/abort.ts`). Loop exits via fixpoint check (`nodesEqual(current, beforeIteration)`).

## Important: do not re-export from `common/index.ts`

`technical-renderer.ts` and `rewriting-engine.ts` have runtime imports
(`pattern/rule`, `pattern/match`, `latex-generator`). Re-exporting them from
`common/index.ts` triggers a load-order issue that fails 50+ tests in
continuity / range / differentiability — the root cause is a Vitest
module-graph timing sensitivity not pinpointed within the MVP budget.

**Always import these symbols directly:**

```typescript
import { GenericTechnicalRenderer } from '$lib/mathAST/common/technical-renderer';
import { rewrite } from '$lib/mathAST/common/rewriting-engine';
```

The TYPES from `step-renderer-base.ts` are safe to re-export and are exposed
via `common/index.ts`.
