# Phase 5: LaTeX Transpiler for Enhanced Images

## Overview

Updated `latex-transpiler.ts` to generate proper LaTeX code for images with full support for:

- Size classes mapped to `\textwidth` fractions
- Width percentage override
- Alignment via `\centering`, `\raggedleft`, `\raggedright`
- Captions with `figure` environment
- Extreme aspect ratio handling with `keepaspectratio`

## Files Modified

### `src/lib/exercises/transpilers/latex-transpiler.ts`

#### New Imports

```typescript
import {
	getDimensionsForFormat,
	getAlignmentStyles
} from '$lib/exercises/services/image-dimensions';
```

#### Updated `transpileImage()` Function

Complete rewrite with helper functions:

1. `buildGraphicsOptions()` - Builds options string for `\includegraphics`
2. `buildFigureEnvironment()` - Creates figure environment with caption
3. `buildAlignedImage()` - Creates aligned image block without figure

#### Size Class Mappings

| Size Class | LaTeX Width    |
| ---------- | -------------- |
| inline     | height=1em     |
| small      | 0.25\textwidth |
| medium     | 0.5\textwidth  |
| large      | 0.75\textwidth |
| full       | \textwidth     |

## Output Examples

### Inline Image

```latex
\includegraphics[height=1em]{icon.png}
```

### Block Image (centered, no caption)

```latex
{\centering\includegraphics[width=0.5\textwidth]{image.png}\par}
```

### Block Image with Caption (figure environment)

```latex
\begin{figure}[htbp]
\centering
\includegraphics[width=0.5\textwidth]{image.png}
\caption{Figure caption here}
\end{figure}
```

### With widthPercent Override

```latex
{\centering\includegraphics[width=0.75\textwidth]{image.png}\par}
```

### Very Wide Image (>3:1 ratio)

```latex
{\centering\includegraphics[width=\textwidth,keepaspectratio,max height=0.3\textheight]{panorama.png}\par}
```

### Very Tall Image (<1:3 ratio)

```latex
{\centering\includegraphics[width=0.5\textwidth,keepaspectratio,max width=0.5\textwidth]{portrait.png}\par}
```

## Tests Added

File: `src/lib/exercises/transpilers/latex-transpiler.test.ts`

17 new tests in "Image Transpilation Enhanced" describe block:

- Basic image without attributes
- Image with sizeClass (all 5 classes)
- Image with widthPercent override
- Image with alignment (left, center, right)
- Image with caption (figure environment)
- Inline image
- All attributes combined
- LaTeX special character escaping in captions
- Very wide image handling
- Very tall image handling

## LaTeX Special Character Escaping

The following characters are escaped in captions:

- `\` → `\textbackslash{}`
- `{` → `\{`
- `}` → `\}`
- `%` → `\%`
- `$` → `\$`
- `&` → `\&`
- `#` → `\#`
- `_` → `\_`
- `^` → `\^{}`
- `~` → `\~{}`

## Recovery Instructions

If session crashes during Phase 5:

1. **Check if changes exist**:

   ```bash
   git diff src/lib/exercises/transpilers/latex-transpiler.ts | head -100
   ```

2. **Verify transpileImage function**:
   - Should import `getDimensionsForFormat`
   - Should have `buildGraphicsOptions()` helper
   - Should have `buildFigureEnvironment()` helper

3. **Run tests**:
   ```bash
   pnpm test:unit -- src/lib/exercises/transpilers/latex-transpiler.test.ts
   ```

## Dependencies

- Phase 1: `ImageNode` type in `types.ts`
- Phase 2: `getDimensionsForFormat()`, `getAlignmentStyles()` in `image-dimensions.ts`

## Next Phase

Phase 6: Create Typst transpiler with:

- `#image()` function
- `#figure()` for captions
- `#align()` for alignment
- Width in percentages
