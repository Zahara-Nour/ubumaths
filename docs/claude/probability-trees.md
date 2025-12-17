# Probability Trees (probtree)

Module for weighted probability trees in custom markdown.

## Syntax

````markdown
```probtree
root: Label
outcomes: true

Event1:probability1
  Event1a:prob1a, Outcome1a
  Event1b:prob1b, Outcome1b
Event2:probability2
  Event2a:prob2a, Outcome2a
```
````

### Configuration Options

| Option         | Values       | Default | Description                      |
| -------------- | ------------ | ------- | -------------------------------- |
| `root:`        | string       | (none)  | Label for root node              |
| `outcomes`     | true / false | false   | Show outcome column at leaves    |
| `intersection` | true / false | false   | Show P(A ∩ B) notation at leaves |

### Line Format

```
EventLabel:probability[, outcome]
```

- **EventLabel**: Text or math expression (e.g., `Rouge`, `$A \cap B$`)
- **probability**: Multiple formats supported (see below)
- **outcome**: Optional, only displayed if `outcomes: true`

### Probability Formats

| Format      | Example       | Description                        |
| ----------- | ------------- | ---------------------------------- |
| Fraction    | `3/5`         | Simple fraction                    |
| Decimal     | `0.6`         | Decimal number                     |
| Symbolic    | `P(A)`        | Symbolic notation                  |
| LaTeX       | `\frac{1}{3}` | LaTeX fraction                     |
| Expression  | `1-p`         | Algebraic expression               |
| Placeholder | `...`         | Fill-in-the-blank (renders as `…`) |

### Placeholder for Exercises

Use `...`, `???`, `?`, or `\ldots` for fill-in-the-blank exercises:

````markdown
```probtree
root: Urne

Rouge:3/5
  Rouge:...
  Bleue:...
Bleue:...
  Rouge:...
  Bleue:...
```
````

All placeholder patterns render as `…` (LaTeX ellipsis).

### Indentation

- **2 spaces** per level (strict)
- Level 0: Root branches (no indent)
- Level 1: Children of root (2 spaces)
- Level 2: Grandchildren (4 spaces)
- etc.

## Example

````markdown
```probtree
root: Urne
outcomes: true

Rouge:3/5
  Rouge:2/4, P(RR)=6/20
  Bleue:2/4, P(RB)=6/20
Bleue:2/5
  Rouge:3/4, P(BR)=6/20
  Bleue:1/4, P(BB)=2/20
```
````

This generates a 2-level probability tree with:

- Root labeled "Urne"
- First level: Rouge (3/5) and Bleue (2/5)
- Second level: Conditional probabilities
- Outcomes displayed at leaves

## Rendering

### SVG (Interactive HTML)

The `ProbabilityTree.svelte` component renders:

- Horizontal tree layout (root left, leaves right)
- Straight lines for branches
- Event labels above branches
- Probabilities below branches
- Outcomes to the right of leaves (if enabled)

**Interactivity:**

- **Hover branch**: Highlights path from root to hovered branch, shows cumulative probability in tooltip
- **Click branch**: Persistent path selection (click again to deselect)
- **Click probability label**: Toggle between value (e.g., `3/5`) and conditional notation (e.g., `P_Rouge(Bleue)`)
- **Click leaf event label**: Highlight all paths ending with the same event (e.g., click "Rouge" at a leaf to see all paths to "Rouge")
- **Keyboard**: Enter/Space to select, focus navigation

**Automatic displays:**

- **Intersection probability at leaves**: Shows `P(A ∩ B)` notation for each path (e.g., `P(Rouge ∩ Bleue)`)

### LaTeX Export (TikZ)

```latex
\begin{tikzpicture}[
  grow=right,
  level distance=3cm,
  sibling distance=1.5cm,
  ...
]
\node {$Urne$}
  child {
    node {$P(RR)=6/20$}
    edge from parent node[above] {$Rouge$} node[below] {$2/4$}
  }
  ...
\end{tikzpicture}
```

### Typst Export (CeTZ)

```typst
#import "@preview/cetz:0.3.0"

#cetz.canvas({
  import cetz.draw: *

  set-style(
    content: (padding: 0.1),
    stroke: black
  )

  line((0, 1.5), (3, 2.25))
  content((1.5, 2.55), $Rouge$)
  content((1.5, 1.95), text(size: 0.8em)[$3/5$])
  ...
})
```

## Files

| File                                               | Description              |
| -------------------------------------------------- | ------------------------ |
| `types/probability-tree.ts`                        | TypeScript types         |
| `parser/probability-tree-parser.ts`                | Parser (markdown -> AST) |
| `components/markdown/nodes/ProbabilityTree.svelte` | SVG component            |
| `generators/probability-tree-latex.ts`             | LaTeX/TikZ generator     |
| `generators/probability-tree-typst.ts`             | Typst/CeTZ generator     |

## Error Handling

The parser validates:

- Correct indentation (2 spaces per level)
- Probability format (must be present after `:`)
- Tree structure consistency

Error messages are returned in the AST as `error` property.

## Integration

The module integrates with the existing markdown pipeline:

- Parser called from `markdown-parser.ts` for `probtree` blocks
- Renderer switch in `MarkdownRenderer.svelte`
- Generator cases in `latex-generator.ts` and `typst-generator.ts`
