# image() element — Progress

## Status: v2 Complete

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

### Test results (v1)

- 28 tests, all passing
- 2094 total geometry-core tests passing (87 files)

---

## v2 — Complete

### Features added

1. **Layer system** (`couche="fond"/"avant"`)

   - `couche="fond"` renders image behind all constructions
   - Default (no couche) = foreground
   - GeometryCanvas.svelte: separate `{#each}` block for fond images before main elements
   - Export SVG/TikZ/Typst: fond images in Pass 0, avant images in Pass 7

2. **2-point anchoring** (`image("url", A, B)`)

   - Image fills rectangle between 2 corner points
   - No `largeur` needed (computed from points)
   - Reactive: image resizes when points are dragged
   - `dependsOn` = [point1Id, point2Id]

3. **Export TikZ/Typst**
   - TikZ: `\node[anchor=north west] at (x,y) {\includegraphics[width=Wcm]{url}};`
   - Typst: `content((x,y), box(width: Wcm, image("url")))`
   - Both respect fond/avant layering

### Additional files modified (v2)

| File                          | Changes                                              |
| ----------------------------- | ---------------------------------------------------- |
| `types/elements.ts`           | Added `layer?`, `point1Id?`, `point2Id?` to GeoImage |
| `types/schemas.ts`            | Updated imageSchema with new fields                  |
| `graph/figure.ts`             | Extended createImage() for 2-point + layer           |
| `dsl/builtins.ts`             | Restructured: couche param, 2-point detection        |
| `dsl/serializer.ts`           | Layer + 2-point serialization                        |
| `rendering/svg-primitives.ts` | 2-point branch in imageToSVG()                       |
| `rendering/export-svg.ts`     | Pass 0 (fond) + Pass 7 (avant) split                 |
| `rendering/export-tikz.ts`    | imageToTikZ() helper + fond/avant passes             |
| `rendering/export-typst.ts`   | imageToTypst() helper + fond/avant passes            |
| `GeometryCanvas.svelte`       | fond block before elements, avant filter             |

### DSL syntax (complete)

```
# Free position
img = image("url", x, y, largeur=W)
img = image("url", x, y, largeur=W, hauteur=H)

# Anchored to 1 point
img = image("url", point, largeur=W, dx=D, dy=E)

# 2-point rectangle (v2)
img = image("url", A, B)

# Background layer (v2)
img = image("url", 0, 0, largeur=10, couche="fond")
```

### Test results (v2)

- 43 image tests (20 Figure + 23 DSL), all passing
- 2109 total geometry-core tests (87 files)
