# Conic Properties - Progress

## Status: Complete (pending code review)

## What was done

Added 6 new DSL builtins for conic section properties:

| Builtin           | DSL syntax                 | Returns                     |
| ----------------- | -------------------------- | --------------------------- |
| `asymptotes(c)`   | `(a1, a2) = asymptotes(c)` | 2 lines (hyperbola only)    |
| `axes(c)`         | `(a1, a2) = axes(c)`       | 1-2 lines (not for circles) |
| `directrice(c)`   | `d = directrice(c)`        | 1 line (parabola only)      |
| `foyers(c)`       | `(F1, F2) = foyers(c)`     | 1-2 points                  |
| `excentricite(c)` | `e = excentricite(c)`      | scalar                      |
| `polaire(P, c)`   | `p = polaire(P, c)`        | 1 reactive line             |

## Architecture

- **Static properties** (asymptotes, axes, directrice, foyers): compute coordinates, create invisible freePoints + regular GeoLine. Works because GeoQuadraticCurve has `dependsOn: readonly []`.
- **polaire()**: new reactive element type `GeoConicPolar` with `dependsOn: [curveId, pointId]`. Rendered at each frame via `conicPolarToSVG()`.

## Files created

- `src/lib/geometry-core/geometry/conic-properties.ts` — pure math functions
- `src/lib/geometry-core/geometry/__tests__/conic-properties.test.ts` — 31 unit tests
- `src/lib/geometry-core/dsl/__tests__/interpreter-conic-properties.test.ts` — 20 integration tests

## Files modified

- `src/lib/geometry-core/types/elements.ts` — GeoConicPolar interface + type guard
- `src/lib/geometry-core/graph/figure.ts` — createConicPolar() method
- `src/lib/geometry-core/rendering/svg-primitives.ts` — conicPolarToSVG()
- `src/lib/geometry-core/dsl/builtins.ts` — 6 new builtin cases
- `src/lib/geometry-core/dsl/serializer.ts` — conicPolar serialization
- `src/lib/geometry-core/dsl/symbol-table.ts` — 'polaire' SymbolType
- `src/lib/components/geometry/GeometryCanvas.svelte` — conicPolar rendering

## Test results

- 31 unit tests passing (conic-properties.test.ts)
- 20 integration tests passing (interpreter-conic-properties.test.ts)
- 2018 total geometry-core tests passing (0 regressions)
- ESLint clean
- pnpm check:incremental: no new errors

## Decisions

- `axes(c)` on a circle throws an error ("infinite axes")
- `foyers(c)` on a circle returns the center (1 point)
- No `sommets(c)` for now (achievable with `point_sur(c, 0)`)
- Destructuring syntax: `(a1, a2) = asymptotes(c)` (parentheses required by DSL parser)
