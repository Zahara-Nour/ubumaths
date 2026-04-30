# image() element — Phase 1 (v1) Progress

## Status: Complete

## What was done

Added `image()` element support to geometry-core, following the exact same pattern as `texte()`, `mtexte()`, `rtexte()`.

### Files modified

| File                                                | Changes                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| `src/lib/geometry-core/types/elements.ts`           | `GeoImage` interface, `isImage()` type guard, added to `GeoElement` union |
| `src/lib/geometry-core/graph/figure.ts`             | `createImage()`, `moveImage()` methods                                    |
| `src/lib/geometry-core/dsl/builtins.ts`             | `case 'image':` builtin + added to `BUILTIN_NAMES`                        |
| `src/lib/geometry-core/dsl/serializer.ts`           | Type prefix `'img'` + serialization logic                                 |
| `src/lib/geometry-core/dsl/symbol-table.ts`         | Added `'image'` to `SymbolType`                                           |
| `src/lib/geometry-core/rendering/svg-primitives.ts` | `ImageSVG` interface, `imageToSVG()` function                             |
| `src/lib/geometry-core/rendering/export-svg.ts`     | Pass 7: image elements in static SVG export                               |
| `src/lib/components/geometry/GeometryCanvas.svelte` | Image rendering block + drag support                                      |
| `src/lib/geometry-core/types/index.ts`              | Exports `GeoImage`, `isImage`                                             |

### Files created

| File                                                         | Content                                          |
| ------------------------------------------------------------ | ------------------------------------------------ |
| `src/lib/geometry-core/graph/__tests__/figure-image.test.ts` | 14 tests — createImage, isImage, moveImage       |
| `src/lib/geometry-core/dsl/__tests__/image-dsl.test.ts`      | 11 tests — DSL parsing, serialization, roundtrip |

### DSL syntax

```
# Free position
img = image("https://example.com/photo.png", 2, 3, largeur=5)
img = image("https://example.com/photo.png", 2, 3, largeur=5, hauteur=3)

# Anchored to point
img = image("https://example.com/photo.png", A, largeur=3)
img = image("https://example.com/photo.png", A, largeur=3, dx=0.5, dy=-0.5)
```

### Test results

- 25 new tests, all passing
- 2091 total geometry-core tests passing (87 files)
- ESLint: 0 new errors
- svelte-check: 0 new errors

## v2 scope (not done)

- Export TikZ/Typst
- Background/foreground layer (z-order)
- Image anchored to 2 points (deformation)
