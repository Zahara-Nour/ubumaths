# GeoScalar — Progress Document

## Status: Complete (v1)

## What was implemented

### New types

- **GeoScalar** (`elements.ts`): reactive computed value in the dependency graph
  - `scalarKind`: `'distance' | 'angle' | 'area' | 'norme' | 'expression'`
  - Primitive kinds compute from positions; `expression` uses a closure over other scalars
- **GeoSlider** (`elements.ts`): free scalar with `min`, `max`, `step`, controlled via `moveSlider()`
- **ScalarParam** (`geo-value.ts`): `GeoValue | { scalarRef: string }` — parameter union for dynamic values

### Modified element types (ScalarParam)

- `GeoCircleByRadius.radius`
- `GeoRotatedPoint.angle`
- `GeoDilatedPoint.factor`
- `GeoArcByAngles.radius, startAngle, endAngle`
- `GeoRotation.angle`
- `GeoHomothety.factor`

### Figure API additions

- `createScalarDistance(pt1, pt2)` / `createScalarAngle(p1, v, p2)` / `createScalarNorme(vecId)`
- `createScalarExpression(compute, scalarDeps)` — composed scalar from closure
- `createSlider(min, max, value, options?)` / `moveSlider(id, newValue)`
- `getScalarValue(id)` — unified accessor (measures + scalars + sliders)
- `measureValues` renamed to `scalarValues` internally

### compute-position.ts

- `resolveScalarParam()` / `resolveScalarParamToGeoValue()` helpers
- `computeScalarValue()` — handles all scalar kinds
- `computeElementPosition()` now accepts optional `scalarValues` parameter
- Intersection helpers thread `scalarValues` for dynamic-radius circles

### compute-locus.ts

- `sampleAtParameter()` maintains `localScalarValues` alongside `localPositions`
- Scalar values in the sub-graph are recomputed at each sample
- Enables constructions like limacon de Pascal

### DSL integration

- `distance(A, B)` — creates invisible GeoScalar
- `angle(P, O, Q)` — creates invisible GeoScalar (degrees)
- `slider(min=, max=, valeur=, pas=)` — creates GeoSlider
- `norme(v)` — now returns GeoScalar element (breaking change from raw number)
- Scalar arithmetic: `1 + 3/d` creates composed GeoScalar chain
- `cercle(rayon=d)`, `homothetie(rapport=r)`, `rotation(angle=t)` accept scalars
- `mesure()` values stored in `scalarValues`, usable as scalarRef

## Files modified

- `src/lib/geometry-core/types/elements.ts`
- `src/lib/geometry-core/types/geo-value.ts`
- `src/lib/geometry-core/graph/figure.ts`
- `src/lib/geometry-core/graph/compute-position.ts`
- `src/lib/geometry-core/graph/compute-locus.ts`
- `src/lib/geometry-core/dsl/symbol-table.ts`
- `src/lib/geometry-core/dsl/builtins.ts`
- `src/lib/geometry-core/dsl/interpreter.ts`
- `src/lib/geometry-core/dsl/__tests__/vector-ops-dsl.test.ts` (updated norme tests)

## Files created

- `src/lib/geometry-core/graph/__tests__/figure-scalar.test.ts` (35 tests)
- `src/lib/geometry-core/dsl/__tests__/scalar-dsl.test.ts` (15 tests)

## Test results

- 1815 tests passing (was 1798 before)
- 0 regressions
- 50 new tests added

## What's left for v2

- Slider UI component (drag handle in GeometryCanvas)
- `sin/cos/tan` on scalars in expressions
- Serialization/deserialization of GeoScalar/GeoSlider
- `@deprecated` on `getMeasureValue()`
