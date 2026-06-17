# Image Visual Transforms — Progress

## Status: Complete

## What was done

Added visual rotation and flip to image elements when geometric transformations are applied.

### Problem

When applying a transformation (rotation, symmetry, homothety) to an image element, only the anchor points were moved. The image itself was not visually rotated or flipped.

### Solution

- **Data model**: Added `rotation?: number` (radians) and `flipped?: boolean` to `GeoImage`
- **Transform math**: `computeImageVisualTransform()` computes rotation/flip per transform type
- **SVG rendering**: `transform` attribute on `<image>` elements for visual rotation/mirror
- **Serialization**: `rotation=` and `miroir="vrai"` params for DSL roundtrip
- **Exports**: TikZ (`rotate=`, `\reflectbox`) and Typst (`rotate()`, `scale()`)

### Files modified

- `src/lib/geometry-core/types/elements.ts` — GeoImage interface
- `src/lib/geometry-core/types/schemas.ts` — Zod schema
- `src/lib/geometry-core/graph/figure.ts` — createImage() options
- `src/lib/geometry-core/dsl/transform-apply.ts` — computeImageVisualTransform() + integration
- `src/lib/geometry-core/rendering/svg-primitives.ts` — ImageSVG + imageToSVG()
- `src/lib/components/geometry/GeometryCanvas.svelte` — SVG transform on both layers
- `src/lib/geometry-core/rendering/export-svg.ts` — Static SVG export
- `src/lib/geometry-core/rendering/export-tikz.ts` — TikZ export
- `src/lib/geometry-core/rendering/export-typst.ts` — Typst export
- `src/lib/geometry-core/dsl/serializer.ts` — Serialize rotation/miroir
- `src/lib/geometry-core/dsl/builtins.ts` — Parse rotation/miroir params
- `src/lib/geometry-core/dsl/parser.ts` — Accept KEYWORD as named arg name
- `src/lib/geometry-core/dsl/__tests__/image-dsl.test.ts` — 10 new tests

### Key decisions

- `rotation` + `flipped` model (not 2x2 matrix) — simpler, covers all geometric transforms
- Rotation normalized to (-PI, PI] to prevent floating-point drift
- `rotation=`/`miroir=` are internal serialization params (radians), not user-facing
- Parser fix: KEYWORD tokens accepted as named arg names (allows `rotation=` since `rotation` is a DSL keyword)
