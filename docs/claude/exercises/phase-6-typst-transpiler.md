# Phase 6: Typst Transpiler for Enhanced Images

> **DEPRECATED**: This is historical documentation from 2025-11-22.
> The Typst transpiler has been moved to `src/lib/ubumark/generators/typst-generator.ts`.
> See current documentation in the ubumark module.

## Overview

Created `typst-transpiler.ts` to generate proper Typst code for images with full support for:

- Size classes mapped to percentages
- Width percentage override
- Alignment via `#align()`
- Captions with `#figure()` function
- Extreme aspect ratio handling
- Typst special character escaping

## Files Created

### `src/lib/exercises/transpilers/typst-transpiler.ts`

Complete AST-to-Typst document transpiler with:

#### Main Functions

- `transpileDocument()` - Full document transpilation
- `transpileBlock()` - Individual block node transpilation
- `transpileImage()` - Image-specific rendering with all attributes

#### Helper Functions

- `escapeTypst()` - Escapes Typst special characters (`#`, `$`, `@`, `*`, `_`, etc.)
- `escapeTypstBrackets()` - Escapes brackets for caption text
- `resolveImagePath()` - Resolves image paths with base path support

#### Size Class Mappings

| Size Class | Typst Output                     |
| ---------- | -------------------------------- |
| inline     | `#box(height: 1em)[#image(...)]` |
| small      | `width: 25%`                     |
| medium     | `width: 50%`                     |
| large      | `width: 75%`                     |
| full       | `width: 100%`                    |

## Output Examples

### Inline Image

```typst
#box(height: 1em)[#image("icon.png")]
```

### Block Image (centered, no caption)

```typst
#align(center)[#image("image.png", width: 50%)]
```

### Block Image with Caption (figure)

```typst
#figure(
  image("image.png", width: 50%),
  caption: [Figure caption here]
)
```

### With widthPercent Override

```typst
#align(center)[#image("image.png", width: 75%)]
```

### Left-aligned Image

```typst
#align(left)[#image("image.png", width: 50%)]
```

### Very Wide Image (>3:1 ratio)

```typst
#box(height: 30%)[#align(center)[#image("panorama.png", width: 100%)]]
```

### Very Tall Image (<1:3 ratio)

```typst
#align(center)[#image("portrait.png", width: 50%)]
```

## Tests

File: `src/lib/exercises/transpilers/typst-transpiler.test.ts`

**74 tests** covering:

- Character escaping (escapeTypst, escapeTypstBrackets)
- Image path resolution
- Document transpilation
- All block types (paragraphs, headings, lists, tables, math, etc.)
- **Image transpilation:**
  - Basic image (default medium size, center)
  - Each sizeClass (inline, small, medium, large, full)
  - widthPercent override
  - Alignment (left, center, right)
  - Caption (figure environment)
  - Inline image (box wrapper)
  - All attributes combined
  - Extreme aspect ratios
  - Path resolution
  - Special character escaping in captions

## Typst Special Character Escaping

The following characters are escaped in general text:

- `#` → `\#`
- `$` → `\$`
- `@` → `\@`
- `*` → `\*`
- `_` → `\_`
- `` ` `` → `` \` ``
- `<` → `\<`
- `>` → `\>`

For captions (bracket content):

- `[` → `\[`
- `]` → `\]`

## Recovery Instructions

If session crashes during Phase 6:

1. **Check if files exist**:

   ```bash
   ls -la src/lib/exercises/transpilers/typst-transpiler.ts
   ls -la src/lib/exercises/transpilers/typst-transpiler.test.ts
   ```

2. **Verify transpileImage function**:
   - Should import `getDimensionsForFormat`
   - Should handle all size classes
   - Should use `#figure()` for captions
   - Should use `#align()` for alignment

3. **Run tests**:
   ```bash
   pnpm test:unit -- src/lib/exercises/transpilers/typst-transpiler.test.ts
   ```

## Dependencies

- Phase 1: `ImageNode` type in `types.ts`
- Phase 2: `getDimensionsForFormat()` in `image-dimensions.ts`

## Next Phase

Phase 7: Upload system with metadata extraction:

- API endpoint for image upload
- Supabase Storage integration
- Automatic dimension extraction
- Metadata storage
