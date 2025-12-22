# Ubumark Special Blocks

> Variation Tables and Probability Trees

---

## Table of Contents

- [Variation Tables](#variation-tables)
- [Probability Trees](#probability-trees)
- [Rendering](#rendering)
- [Export Formats](#export-formats)

---

## Variation Tables

Variation tables (tableaux de variations) are a standard tool in French mathematics education for visualizing function behavior.

### Basic Syntax

````markdown
```variation
variable: x
domain: -inf, 0, +inf

sign: f'(x)
  -inf,0: +
  0: z
  0,+inf: -

variation: f(x)
  -inf: -inf, bottom
  0: 5, top
  +inf: -inf, bottom
```
````

### Configuration

#### Variable Declaration

```
variable: x
```

Declares the independent variable. This appears in the header row.

#### Domain Declaration

Simple format:

```
domain: -inf, -1, 0, 1, +inf
```

With open/closed bounds:

```
domain: ]-inf, 0[, ]0, +inf[
```

**Domain Point Syntax**:

- `inf` or `+inf`: Positive infinity
- `-inf`: Negative infinity
- `]a` or `(a`: Open at point (excluded)
- `a[` or `a)`: Open at point (excluded)
- `[a` or `a]`: Closed at point (included)

### Row Types

#### Sign Rows

Sign rows show the sign of a function or derivative.

```
sign: f'(x)
  -inf,-1: +
  -1: z
  -1,0: -
  0: ||
  0,+inf: +
```

**Sign Values**:

| Symbol     | Meaning            | Rendering    |
| ---------- | ------------------ | ------------ |
| `+`        | Positive           | +            |
| `-`        | Negative           | -            |
| `z` or `0` | Zero               | 0 (centered) |
| `\|\|`     | Vertical asymptote | Double bar   |
| `\|h\|`    | Forbidden value    | Hatched zone |
| `d`        | Discontinuity      | Dashed line  |

**Key Format**:

- Single point: `0: z`
- Interval: `-inf,0: +`

#### Variation Rows

Variation rows show how a function value changes.

```
variation: f(x)
  -inf: -inf, limit-bottom
  -1: 3, top
  0: 1, bottom
  +inf: +inf, limit-top
```

**Value Format**: `point: value, position`

**Positions**:

| Position       | Meaning                | Use Case            |
| -------------- | ---------------------- | ------------------- |
| `top`          | Local maximum          | Peak value          |
| `bottom`       | Local minimum          | Valley value        |
| `center`       | Neutral position       | Regular point       |
| `limit-top`    | Approaching from below | Asymptotic behavior |
| `limit-bottom` | Approaching from above | Asymptotic behavior |

**Special Values**:

```
0: ||, -inf, +inf    # Asymptote with left/right limits
0: |h|, -inf, +inf   # Forbidden with limits
0: d, 1, 2           # Discontinuity with left/right values
```

### Complete Example

````markdown
```variation
variable: x
domain: ]-inf, -2[, ]-2, 0], ]0, 3[, [3, +inf[

sign: f(x)
  -inf,-2: -
  -2: ||
  -2,0: +
  0: z
  0,3: -
  3: z
  3,+inf: +

variation: f(x)
  -inf: 0, limit-bottom
  -2: ||, -inf, +inf
  0: 2, top
  3: -1, bottom
  +inf: +inf, limit-top
```
````

### AST Structure

```typescript
interface VariationTableNode extends BaseNode {
	type: 'variation-table';
	variable: string;
	domain: DomainPoint[];
	rows: TableRow[]; // SignRow | VariationRow
}

interface DomainPoint {
	expression: string; // "-inf", "0", "3", etc.
	open?: boolean; // true if excluded from domain
}

interface SignRow {
	type: 'sign';
	label: string; // "f'(x)"
	values: Map<string, SignValue>;
}

interface VariationRow {
	type: 'variation';
	label: string; // "f(x)"
	values: Map<string, VariationValue>;
}
```

---

## Probability Trees

Probability trees (arbres de probabilités) visualize sequential probability experiments.

### Basic Syntax

````markdown
```probtree
root: Urne

Rouge:3/5
  Rouge:2/4
  Bleue:2/4
Bleue:2/5
  Rouge:3/4
  Bleue:1/4
```
````

### Configuration

#### Root Label

```
root: Pièce
```

Optional label for the root node.

#### Outcomes Column

```
outcomes: true
```

Shows the outcome (product of probabilities) at each leaf.

#### Intersection Display

```
intersection: true
```

Shows P(A ∩ B) notation at leaves.

### Branch Syntax

Each branch follows the format:

```
event:probability[, outcome]
```

**Indentation**: 2 spaces per level define tree structure.

### Probability Formats

| Format         | Example           | Numeric Value        |
| -------------- | ----------------- | -------------------- |
| Fraction       | `1/2`, `3/5`      | Computed             |
| Decimal        | `0.5`, `0.333`    | As written           |
| LaTeX fraction | `\frac{1}{3}`     | Computed             |
| Symbolic       | `P(A)`, `P(A\|B)` | null (display only)  |
| Placeholder    | `...`, `???`, `?` | null (fill-in-blank) |

### Outcomes

Outcomes are specified after a comma:

```
Rouge:2/4, P(RR)=6/20
```

This adds the outcome expression to the leaf node.

### Complete Examples

#### Coin Flip

````markdown
```probtree
root: Pièce
outcomes: true

Pile:1/2
  Pile:1/2, P(PP)=1/4
  Face:1/2, P(PF)=1/4
Face:1/2
  Pile:1/2, P(FP)=1/4
  Face:1/2, P(FF)=1/4
```
````

#### Urn Without Replacement

````markdown
```probtree
root: Urne (5 rouges, 3 bleues)
outcomes: true

Rouge:5/8
  Rouge:4/7, P(RR)=20/56
  Bleue:3/7, P(RB)=15/56
Bleue:3/8
  Rouge:5/7, P(BR)=15/56
  Bleue:2/7, P(BB)=6/56
```
````

#### Three-Level Tree

````markdown
```probtree
root: Expérience

A:0.3
  A:0.5
    A:0.5
    B:0.5
  B:0.5
    A:0.3
    B:0.7
B:0.7
  A:0.4
    A:0.5
    B:0.5
  B:0.6
    A:0.2
    B:0.8
```
````

#### Fill-in-the-Blank Exercise

````markdown
```probtree
root: Urne

Rouge:???
  Rouge:..., P(RR)=?
  Bleue:..., P(RB)=?
Bleue:???
  Rouge:..., P(BR)=?
  Bleue:..., P(BB)=?
```
````

### AST Structure

```typescript
interface ProbabilityTreeNode extends BaseNode {
	type: 'probability-tree';
	root: ProbTreeNode;
	config: ProbTreeConfig;
	maxDepth: number; // Computed
	leafCount: number; // Computed
}

interface ProbTreeNode {
	id: string; // "node-0-0", "node-1-0", etc.
	label?: string; // Root label
	outcome?: string; // Leaf outcome expression
	branches: ProbTreeBranch[];
	depth: number;
	isLeaf: boolean;
}

interface ProbTreeBranch {
	eventLabel: string; // "Rouge", "Pile"
	probability: ProbabilityValue;
	child: ProbTreeNode;
}

interface ProbabilityValue {
	display: string; // "1/2", "0.5", "P(A)"
	numeric: number | null; // 0.5, null for symbolic
	format: 'fraction' | 'decimal' | 'symbolic' | 'placeholder';
}
```

### Validation

The parser performs these validations:

1. **Indentation**: Must be multiples of 2 spaces
2. **No orphan branches**: Can't skip indentation levels
3. **Probability sums**: Warning if branches don't sum to 1
4. **Format consistency**: Each branch must have event:probability

---

## Rendering

### Variation Table Rendering

The `VariationTable.svelte` component renders:

1. **Header row**: Variable values across domain
2. **Sign rows**: Plus/minus signs with markers
3. **Variation rows**: Arrows connecting values

**Visual Elements**:

- Arrows (↗ ↘) showing increase/decrease
- Markers (○ ●) for open/closed points
- Special symbols (∥ for asymptotes)

### Probability Tree Rendering

The `ProbabilityTree.svelte` component renders:

1. **Tree structure**: SVG-based tree layout
2. **Branches**: Lines with probability labels
3. **Nodes**: Event labels at branch endpoints
4. **Outcomes**: Optional column on the right

**Layout Algorithm**:

- Horizontal tree (root on left)
- Equal vertical spacing per level
- Branch probabilities on edges

---

## Export Formats

### LaTeX Export

#### Variation Tables

Uses `tkz-tab` package:

```latex
\begin{tikzpicture}
  \tkzTabInit[lgt=2,espcl=2]
    {$x$ / 1, $f'(x)$ / 1, $f(x)$ / 2}
    {$-\infty$, $0$, $+\infty$}
  \tkzTabLine{, +, z, -, }
  \tkzTabVar{-/ $-\infty$, +/ $5$, -/ $-\infty$}
\end{tikzpicture}
```

#### Probability Trees

Uses `tikz` with tree styles:

```latex
\begin{tikzpicture}[
  grow=right,
  level 1/.style={sibling distance=3cm},
  level 2/.style={sibling distance=1.5cm},
  edge from parent/.style={draw, -latex}
]
\node {Urne}
  child {
    node {Rouge}
    edge from parent node[above] {$\frac{3}{5}$}
    child {
      node {Rouge}
      edge from parent node[above] {$\frac{2}{4}$}
    }
    child {
      node {Bleue}
      edge from parent node[below] {$\frac{2}{4}$}
    }
  }
  % ...
\end{tikzpicture}
```

### Typst Export

#### Variation Tables

Uses Typst table with custom styling:

```typst
#table(
  columns: (1fr, 1fr, 1fr, 1fr),
  [$x$], [$-infinity$], [$0$], [$+infinity$],
  [$f'(x)$], [+], [0], [-],
  [$f(x)$], [$-infinity$ #sym.arrow.tr], [$5$ #sym.arrow.br], [$-infinity$],
)
```

#### Probability Trees

Uses Typst tree or custom drawing:

```typst
// Tree structure with branches and probabilities
#tree(
  "Urne",
  tree("Rouge", tree("Rouge"), tree("Bleue")),
  tree("Bleue", tree("Rouge"), tree("Bleue"))
)
```

---

## Error Handling

### Variation Table Errors

| Error            | Cause               | Recovery        |
| ---------------- | ------------------- | --------------- |
| Missing variable | No `variable:` line | Fail with error |
| Missing domain   | No `domain:` line   | Fail with error |
| Invalid sign     | Unknown symbol      | Skip entry      |
| Invalid position | Unknown position    | Use 'center'    |

### Probability Tree Errors

| Error               | Cause                   | Recovery        |
| ------------------- | ----------------------- | --------------- |
| Invalid indent      | Not multiple of 2       | Error with line |
| Missing probability | No `:` separator        | Error with line |
| Orphan branch       | Skipped indent level    | Warning         |
| Sum ≠ 1             | Probabilities don't sum | Warning only    |

---

## Use Cases

### Education Scenarios

1. **Function Analysis**
   - Study of derivatives
   - Finding extrema
   - Sketching graphs

2. **Probability Exercises**
   - Conditional probability
   - Bayes' theorem
   - Expected value calculations

3. **Interactive Exercises**
   - Fill-in-the-blank probability values
   - Complete the variation table
   - Identify function behavior

### Integration with Parameterization

Variation tables and probability trees can use parameterized values:

````markdown
Variables: a={{1..5}}, b={{6..10}}

```variation
variable: x
domain: -inf, {{a}}, {{b}}, +inf

sign: f'(x)
  -inf,{{a}}: +
  {{a}}: z
  {{a}},{{b}}: -
  {{b}}: z
  {{b}},+inf: +
```
````

The parameterization is resolved before parsing the special block.
