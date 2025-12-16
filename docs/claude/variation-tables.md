# Variation Tables (Tableaux de Variations)

Module for rendering sign and variation tables in mathematical analysis.

## Overview

The variation table module adds support for a custom `variation` block in markdown that renders as:

- **HTML**: Accessible HTML table with SVG arrows
- **LaTeX**: tkz-tab package syntax
- **Typst**: vartable package syntax

## Syntax

````markdown
```variation
variable: x
domain: -inf, -1, 0, 1, +inf

sign: f'(x)
  -inf,-1: +
  -1: z
  -1,0: -
  0: ||
  0,1: +
  1: z
  1,+inf: -

sign: f''(x)
  -inf,0: +
  0: z
  0,+inf: -

variation: f(x)
  -inf: -inf, bottom
  -1: 3, top
  0: ||, -inf, +inf
  1: -2, bottom
  +inf: +inf, top
```
````

## Symbols

| Symbol          | Meaning           | Usage                         |
| --------------- | ----------------- | ----------------------------- | ------------------ | ------------------------- |
| `+`             | Positive sign     | Sign rows                     |
| `-`             | Negative sign     | Sign rows                     |
| `z`             | Zero (annulation) | Point where function equals 0 |
| `               |                   | `                             | Vertical asymptote | Point or interval markers |
| `\|h\|`         | Forbidden zone    | Where function is undefined   |
| `d`             | Discontinuity     | Point of discontinuity        |
| `top`           | Maximum position  | Variation row values          |
| `bottom`        | Minimum position  | Variation row values          |
| `center`        | Middle position   | Variation row values          |
| `-inf` / `+inf` | Infinity          | Domain or values              |

## Domain Syntax

### Simple domain

```
domain: -inf, -1, 0, 1, +inf
```

### With open/closed bounds

```
domain: ]-inf, 0[, ]0, +inf[
```

## Sign Row Syntax

```
sign: f'(x)
  -inf,-1: +      # Interval: positive
  -1: z           # Point: zero
  -1,0: -         # Interval: negative
  0: ||           # Point: asymptote
```

## Variation Row Syntax

```
variation: f(x)
  -inf: -inf, bottom     # Value at bottom position
  -1: 3, top             # Value at top position
  0: ||, -inf, +inf      # Asymptote with left/right limits
  1: -2, bottom
  +inf: +inf, top
```

## Files

### Types

- `src/lib/custom-markdown/types/variation-table.ts` - TypeScript interfaces

### Parser

- `src/lib/custom-markdown/parser/variation-table-parser.ts` - Markdown parser

### Renderers

- `src/lib/components/markdown/nodes/VariationTable.svelte` - HTML renderer
- `src/lib/custom-markdown/generators/variation-table-latex.ts` - LaTeX (tkz-tab)
- `src/lib/custom-markdown/generators/variation-table-typst.ts` - Typst (vartable)

## Usage in Components

```svelte
<script>
	import { MarkdownRenderer } from '$lib/components/markdown';
</script>

<MarkdownRenderer content={markdownWithVariationTable} />
```

## Export to LaTeX

The generator produces tkz-tab syntax:

```latex
\begin{tikzpicture}
\tkzTabInit[lgt=3,espcl=1.5]{$x$ / 1, $f'(x)$ / 1, $f(x)$ / 2}{$-\infty$, $0$, $+\infty$}
\tkzTabLine{, +, z, -,}
\tkzTabVar{-/$-\infty$, +/$3$, -/$-\infty$}
\end{tikzpicture}
```

## Export to Typst

The generator produces vartable syntax:

```typst
#import "@preview/vartable:0.2.3": tabvar

#tabvar(
  variable: $x$,
  domain: ($-infinity$, $0$, $+infinity$),
  label: ($f'(x)$, $f(x)$),
  content: (
    ($+$, "z", $-$),
    ((bottom, $-infinity$), (top, $3$), (bottom, $-infinity$))
  )
)
```

## Accessibility

The HTML renderer includes:

- `<table>` with `role="table"` and `aria-label`
- `<caption>` for screen readers (visually hidden)
- SVG arrows with `role="img"` and `aria-label`
- Semantic HTML structure

## Responsive Design

All dimensions use `em/rem` units to scale with font size:

- Cell padding: `0.5em`
- Row height: `3em` (sign), `4em` (variation)
- Borders and spacing adapt to context

## CSS Variables

Customize appearance with CSS variables:

```css
.variation-table {
	--vt-border-color: #e5e7eb;
	--vt-header-bg: #f3f4f6;
	--vt-text-color: #1f2937;
	--vt-plus-color: #16a34a;
	--vt-minus-color: #dc2626;
	--vt-arrow-color: #1f2937;
	--vt-hatch-color: #6b7280;
}
```
