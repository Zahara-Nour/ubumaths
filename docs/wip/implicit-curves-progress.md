# Courbes implicites generales F(x,y) = 0 — Progress

## Status: COMPLETE

## Implementation

### Files created

- `src/lib/geometry-core/rendering/marching-squares.ts` — Marching squares algorithm
- `src/lib/geometry-core/dsl/__tests__/interpreter-implicit-curve.test.ts` — 11 tests

### Files modified

- `src/lib/geometry-core/types/elements.ts` — GeoImplicitCurve type + isImplicitCurve guard
- `src/lib/geometry-core/dsl/builtins.ts` — Try 4 fallback in createCurveFromEquation
- `src/lib/geometry-core/graph/figure.ts` — createImplicitCurve() method
- `src/lib/geometry-core/rendering/svg-primitives.ts` — implicitCurveToSVG()
- `src/lib/geometry-core/interaction/hit-testing.ts` — distToImplicitCurve()
- `src/lib/components/geometry/GeometryCanvas.svelte` — implicitCurve rendering block
- `src/lib/geometry-core/dsl/__tests__/interpreter-courbe.test.ts` — Updated 2 regression tests

### Decisions

- Grid size: 200x200 (fixed, not adaptive)
- Hit-testing: |F(x,y)| / |nabla F(x,y)| with central differences (eps=1e-6)
- Saddle disambiguation: center-point evaluation (standard asymptotic decider)
- Path assembly: spatial index with quantized coordinates, O(n) backward pass
- Label placement: SVG center (temporary, no natural curve center available)
- Validation: only reject NaN at origin, not Infinity (allows ln(x^2+y^2) etc.)

### Code review findings addressed

1. Fixed validation guard (was redundant `!isFinite && isNaN`, now just `isNaN`)
2. Added `isImplicitCurve` type guard
3. Fixed O(n^2) backward chain assembly (prefix array + single unshift)

### Not implemented (noted for future)

- export-svg.ts pass (pre-existing gap for function/quadraticCurve too)
- Adaptive grid size
- tangente() / point_sur() for implicit curves

## Verification

- 56/56 tests pass (11 new + 45 existing courbe tests)
- 0 ESLint errors on modified files
- pnpm check:incremental: 9 errors (all pre-existing)
- Svelte autofixer: 0 issues
