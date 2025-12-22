# Ubumark Syntax Reference

> Complete syntax reference for the Ubumark custom markdown system

---

## Table of Contents

- [Block Elements](#block-elements)
- [Inline Elements](#inline-elements)
- [Math Expressions](#math-expressions)
- [Extended Features](#extended-features)
- [Escape Sequences](#escape-sequences)

---

## Block Elements

### Paragraphs

Plain text separated by blank lines forms paragraphs.

```markdown
This is the first paragraph.

This is the second paragraph.
```

**AST Node**: `ParagraphNode`

### Headings

ATX-style headings with 1-6 `#` symbols.

```markdown
# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6
```

**AST Node**: `HeadingNode` with `level: 1-6`

### Lists

#### Unordered Lists

```markdown
- Item one
- Item two
  - Nested item
  - Another nested
- Item three
```

Markers: `-`, `*`, `+`

#### Ordered Lists

```markdown
1. First item
2. Second item
   1. Nested ordered
   2. Another nested
3. Third item
```

**AST Node**: `ListNode` with `ordered: boolean`, `items: ListItemNode[]`

**Custom Start Number**:

```markdown
5. Starting at five
6. Continues from five
```

### Tables

GFM-style tables with alignment support.

```markdown
| Left | Center | Right |
| :--- | :----: | ----: |
| L1   |   C1   |    R1 |
| L2   |   C2   |    R2 |
```

**Alignment**:

- `:---` = left (default)
- `:---:` = center
- `---:` = right

**AST Node**: `TableNode` with `header`, `rows`, `alignments`

### Code Blocks

Fenced code blocks with optional language identifier.

````markdown
```javascript
function add(a, b) {
	return a + b;
}
```
````

**AST Node**: `CodeBlockNode` with `code`, `language`

### Blockquotes

```markdown
> This is a blockquote.
> It can span multiple lines.
>
> > Nested blockquotes are supported.
```

**AST Node**: `BlockquoteNode` with `children: BlockNode[]`

### Horizontal Rules

```markdown
---
---

---
```

**AST Node**: `HorizontalRuleNode`

### Math Blocks

Display math with `$$...$$` or `~~...~~`:

```markdown
$$
\int_0^1 x^2 \, dx = \frac{1}{3}
$$
```

Or with custom syntax:

```markdown
~~
(1/3) \* x^3 |\_0^1 = 1/3
~~
```

**AST Node**: `MathBlockNode` with `expression`, `syntax: 'latex' | 'custom'`

### Images

```markdown
![Alt text](https://example.com/image.png)
![Alt text](https://example.com/image.png 'Title')
```

**Extended Image Syntax** (Ubumark-specific):

```markdown
![Description|size=medium|align=center](image.png)
![Icon|size=inline](icon.svg)
![Wide|width=80%](panorama.jpg)
```

**Size Classes**: `inline`, `small`, `medium`, `large`, `full`
**Alignment**: `left`, `center`, `right`
**Width**: Percentage (e.g., `width=75%`)

**AST Node**: `ImageNode` with extended properties:

- `src`, `alt`, `title`
- `sizeClass`, `widthPercent`, `alignment`
- `caption`, `originalWidth`, `originalHeight`

### Videos

```markdown
![Video description](https://youtube.com/watch?v=VIDEO_ID)
![Video|autoplay|loop](https://vimeo.com/VIDEO_ID)
```

**Providers**: YouTube, Vimeo, direct video URLs

**Options**: `autoplay`, `loop`, `muted`, `controls`

**AST Node**: `VideoNode` with `provider`, `videoId`, options

---

## Inline Elements

### Text Formatting

```markdown
**bold text**
_italic text_
**_bold and italic_**
~~strikethrough~~
==highlighted==
`inline code`
```

**AST Node**: `TextNode` with boolean flags:

- `bold`, `italic`, `strikethrough`, `highlight`, `code`

**Note**: Nested formatting (`**bold *and italic***`) has limited support.

### Inline Math

**LaTeX syntax**:

```markdown
The formula $E = mc^2$ is famous.
```

**Custom syntax**:

```markdown
Calculate ~2x + 3~ when ~x = 5~.
```

**AST Node**: `MathInlineNode` with `expression`, `syntax`

### Line Breaks

**Hard break** (backslash at end):

```markdown
Line one\
Line two
```

**Soft break** (two spaces at end):

```markdown
Line one
Line two
```

**AST Node**: `LineBreakNode` with `hard: boolean`

### Links

```markdown
[Link text](https://example.com)
[Link with title](https://example.com 'Title')
```

**Note**: Links are parsed but may have limited rendering support in math contexts.

### Hashtags and Mentions

```markdown
Check out #algebra for more exercises.
Thanks to @teacher for the help!
```

**AST Node**: `HashtagNode`, `MentionNode`

### Hints

Reference exercise hints:

```markdown
{{hint:step1}}
```

Links to a hint defined in the exercise's hint array.

---

## Math Expressions

### LaTeX Syntax

Standard LaTeX delimiters:

| Type   | Syntax    | Example                |
| ------ | --------- | ---------------------- |
| Inline | `$...$`   | `$x^2$`                |
| Block  | `$$...$$` | `$$\int_0^1 x \, dx$$` |

**Features**:

- Full LaTeX math support
- Rendered via MathLive/KaTeX
- Automatic French decimal formatting

### Custom Syntax

Simplified math input using tildes:

| Type   | Syntax    | Example          |
| ------ | --------- | ---------------- |
| Inline | `~...~`   | `~2x + 3~`       |
| Block  | `~~...~~` | `~~f(x) = x^2~~` |

**Key Differences from LaTeX**:

| Feature        | LaTeX         | Custom        |
| -------------- | ------------- | ------------- | --- | --- |
| Fraction       | `\frac{1}{2}` | `1/2`         |
| Power          | `x^{10}`      | `x^10`        |
| Subscript      | `x_{i}`       | `x_i`         |
| Square root    | `\sqrt{x}`    | `sqrt(x)`     |
| Absolute       | `\|x\|`       | `abs(x)` or ` | x   | `   |
| Multiplication | `\times`      | `*`           |

**Conversion**: Custom syntax is converted to LaTeX via the MathAST system during rendering.

### Escaping Delimiters

```markdown
Cost is \$50.
The tilde \~ is escaped.
```

---

## Extended Features

### Parameterization Tokens

Variables and expressions within `{{...}}`:

#### Variable References

```markdown
The value is {{a}}.
```

#### Random Numbers

```markdown
{{1..10}} <!-- Integer 1-10 -->
{{-5..5}} <!-- Integer -5 to 5 -->
{{1..10!5}} <!-- 1-10 excluding 5 -->
{{1..10!3..5}} <!-- 1-10 excluding 3,4,5 -->
{{2..9;+/-}} <!-- {-9..-2} U {2..9} -->
{{2.3}} <!-- Decimal: 2 digits.3 decimals -->
{{1..1.5}} <!-- Decimal range (step=0.1) -->
{{0.5..2:0.25}} <!-- Decimal range with step -->
```

#### Expression Evaluation

```markdown
{{eval:a+b}} <!-- Simple expression -->
{{eval:a*b|d}} <!-- Force decimal output -->
{{eval:x|+}} <!-- Add + sign for positive -->
{{eval:x|()}} <!-- Bracket negative values -->
{{eval:1/3|d,+,()}} <!-- Multiple modifiers -->
```

See [parameterization.md](./parameterization.md) for complete reference.

### Variation Table Blocks

````markdown
```variation
variable: x
domain: -inf, -1, 0, 2, +inf

sign: f'(x)
  -inf,-1: +
  -1: z
  -1,0: -
  0: z
  0,2: +
  2: z
  2,+inf: -

variation: f(x)
  -inf: -inf, limit-bottom
  -1: 3, top
  0: 1, bottom
  2: 5, top
  +inf: -inf, limit-bottom
```
````

````

See [special-blocks.md](./special-blocks.md) for complete reference.

### Probability Tree Blocks

```markdown
```probtree
root: Pièce
outcomes: true

Pile:1/2
  Pile:1/2, P(PP)=1/4
  Face:1/2, P(PF)=1/4
Face:1/2
  Pile:1/2, P(FP)=1/4
  Face:1/2, P(FF)=1/4
````

````

See [special-blocks.md](./special-blocks.md) for complete reference.

---

## Escape Sequences

| Sequence | Result | Context |
|----------|--------|---------|
| `\$` | `$` | Literal dollar sign |
| `\~` | `~` | Literal tilde |
| `\\` | Line break | End of line |
| `\*` | `*` | Literal asterisk |
| `\_` | `_` | Literal underscore |
| `\`` | `` ` `` | Literal backtick |
| `\[` | `[` | Literal bracket |
| `\]` | `]` | Literal bracket |
| `\#` | `#` | Literal hash |

---

## AST Node Reference

### Document Structure

```typescript
interface DocumentNode {
  type: 'document';
  children: BlockNode[];
}
````

### Block Nodes

```typescript
type BlockNode =
	| ParagraphNode
	| HeadingNode
	| ListNode
	| TableNode
	| MathBlockNode
	| ImageNode
	| VideoNode
	| HorizontalRuleNode
	| BlockquoteNode
	| CodeBlockNode
	| VariationTableNode
	| ProbabilityTreeNode;
```

### Inline Nodes

```typescript
type InlineNode =
	| TextNode
	| MathInlineNode
	| LineBreakNode
	| BlankNode
	| MathPromptNode
	| HashtagNode
	| MentionNode
	| HintNode;
```

---

## Compatibility Notes

### Markdown Flavor

Ubumark is based on GitHub Flavored Markdown (GFM) with extensions:

**Supported from GFM**:

- Paragraphs, headings, lists
- Tables with alignment
- Fenced code blocks
- Blockquotes
- Horizontal rules
- Emphasis (bold, italic)

**Not Supported**:

- Autolinks
- Task lists (`- [ ]`)
- Footnotes
- Definition lists
- Raw HTML passthrough

### Math Compatibility

- LaTeX syntax is fully compatible with MathLive
- Custom syntax is converted to LaTeX internally
- French decimal formatting is applied automatically
- Nested delimiters are handled correctly

---

## Examples

### Complete Exercise

```markdown
# Exercice 1 : Calcul algébrique

Soit $a = {{a}}$ et $b = {{b}}$.

1. Calculer $a + b$
2. Calculer $a \times b$
3. Simplifier $\frac{a}{b}$

> **Rappel** : Pour additionner des fractions, il faut un dénominateur commun.

$$
\frac{a}{b} + \frac{c}{d} = \frac{ad + bc}{bd}
$$

---

**Solution** :

1. $a + b = {{eval:a+b}}$
2. $a \times b = {{eval:a*b}}$
3. $\frac{a}{b} = {{eval:a/b|d}}$
```

### With Variation Table

````markdown
## Étude de fonction

Soit $f(x) = x^3 - 3x + 2$.

```variation
variable: x
domain: -inf, -1, 1, +inf

sign: f'(x)
  -inf,-1: +
  -1: z
  -1,1: -
  1: z
  1,+inf: +

variation: f(x)
  -inf: -inf, limit-bottom
  -1: 4, top
  1: 0, bottom
  +inf: +inf, limit-top
```
````

La fonction $f$ admet un maximum local en $x = -1$.

```

```
