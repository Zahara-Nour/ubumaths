# Exercise Feature - Markdown Parser & AST Types

> **Last Updated**: 2025-11-21
>
> **Related Documentation**:
>
> - [Main Overview](./README.md)
> - [Architecture](./architecture.md)
> - [Instance Generator](./instance-generator.md)
> - [Components Reference](./components.md)

---

## Table of Contents

- [Overview](#overview)
- [AST Node Types](#ast-node-types)
  - [Inline Nodes](#inline-nodes)
  - [Block Nodes](#block-nodes)
  - [Document Structure](#document-structure)
- [Supported Markdown Syntax](#supported-markdown-syntax)
- [Usage Examples](#usage-examples)
- [Limitations](#limitations)

---

## Overview

The Exercise system uses a custom Markdown parser optimized for mathematical content. It converts Markdown text with LaTeX math into an Abstract Syntax Tree (AST) that can be rendered in the browser or transpiled to other formats (LaTeX, Typst).

**Location**: `src/lib/exercises/parser/markdown-parser.ts`

**Type Definitions**: `src/lib/exercises/types.ts`

### Key Features

- LaTeX math support (`$...$` for inline, `$$...$$` for block)
- GFM-style tables with alignment
- Ordered and unordered lists
- Images with alt text and titles
- Text formatting (bold, italic, inline code)
- Blockquotes (nested support)
- Code blocks with language identifiers

---

## AST Node Types

All AST nodes extend the `BaseNode` interface:

```typescript
interface BaseNode {
	type: string;
}
```

### Inline Nodes

Inline nodes can appear within paragraphs, headings, and other container elements.

```typescript
type InlineNode = TextNode | MathInlineNode | LineBreakNode;
```

#### TextNode

Plain text with optional formatting.

```typescript
interface TextNode extends BaseNode {
	type: 'text';
	content: string;
	bold?: boolean;
	italic?: boolean;
	code?: boolean;
}
```

**Markdown Syntax**:

- Plain text: `Hello world`
- Bold: `**bold text**`
- Italic: `*italic text*`
- Inline code: `` `code` ``

#### MathInlineNode

Inline LaTeX math expressions.

```typescript
interface MathInlineNode extends BaseNode {
	type: 'math-inline';
	latex: string; // LaTeX without $ delimiters
}
```

**Markdown Syntax**: `$x^2 + y^2 = z^2$`

**Example**:

```typescript
// Input: "The formula $E = mc^2$ is famous"
// Parsed as:
[
	{ type: 'text', content: 'The formula ' },
	{ type: 'math-inline', latex: 'E = mc^2' },
	{ type: 'text', content: ' is famous' }
];
```

#### LineBreakNode

Hard or soft line breaks.

```typescript
interface LineBreakNode extends BaseNode {
	type: 'line-break';
	hard?: boolean; // true for hard break (\\), false for soft break
}
```

**Markdown Syntax**:

- Hard break: `\\` at end of line
- Soft break: Two spaces at end of line

---

### Block Nodes

Block nodes form the top-level document structure.

```typescript
type BlockNode =
	| ParagraphNode
	| HeadingNode
	| ListNode
	| TableNode
	| MathBlockNode
	| ImageNode
	| HorizontalRuleNode
	| BlockquoteNode
	| CodeBlockNode;
```

#### ParagraphNode

Container for inline content.

```typescript
interface ParagraphNode extends BaseNode {
	type: 'paragraph';
	children: InlineNode[];
}
```

**Markdown Syntax**: Any text separated by blank lines.

#### HeadingNode

Section headings (levels 1-6).

```typescript
interface HeadingNode extends BaseNode {
	type: 'heading';
	level: 1 | 2 | 3 | 4 | 5 | 6;
	children: InlineNode[];
}
```

**Markdown Syntax**:

```markdown
# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6
```

#### MathBlockNode

Block-level LaTeX math expressions.

```typescript
interface MathBlockNode extends BaseNode {
	type: 'math-block';
	latex: string; // LaTeX without $$ delimiters
}
```

**Markdown Syntax**:

```markdown
$$
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$
```

#### ListNode

Ordered or unordered lists with nested content.

```typescript
interface ListNode extends BaseNode {
	type: 'list';
	ordered: boolean; // true for numbered lists, false for bullet lists
	start?: number; // Starting number for ordered lists (default: 1)
	items: ListItemNode[];
}

interface ListItemNode extends BaseNode {
	type: 'list-item';
	children: ASTNode[]; // Can contain nested lists, paragraphs, etc.
}
```

**Markdown Syntax**:

```markdown
- Unordered item 1
- Unordered item 2
  - Nested item

1. Ordered item 1
2. Ordered item 2
```

#### TableNode

GFM-style tables with alignment support.

```typescript
interface TableNode extends BaseNode {
	type: 'table';
	header: TableCellNode[];
	rows: TableCellNode[][];
	alignments: ('left' | 'center' | 'right')[];
}

interface TableCellNode {
	content: string; // Can contain inline markdown (text, math, etc.)
	align?: 'left' | 'center' | 'right';
}
```

**Markdown Syntax**:

```markdown
| Header 1 | Header 2 | Header 3 |
| :------- | :------: | -------: |
| Left     |  Center  |    Right |
| $x^2$    | Formula  |       42 |
```

#### ImageNode

Embedded images.

```typescript
interface ImageNode extends BaseNode {
	type: 'image';
	src: string; // URL (relative or absolute)
	alt?: string; // Alt text for accessibility
	title?: string; // Optional title
}
```

**Markdown Syntax**:

```markdown
![Alt text](https://example.com/image.png)
![Alt text](https://example.com/image.png 'Optional title')
```

#### HorizontalRuleNode

Thematic breaks / horizontal rules.

```typescript
interface HorizontalRuleNode extends BaseNode {
	type: 'horizontal-rule';
}
```

**Markdown Syntax**: `---`, `***`, or `___` (3+ characters)

#### BlockquoteNode

Quoted content that can contain nested block elements.

```typescript
interface BlockquoteNode extends BaseNode {
	type: 'blockquote';
	children: BlockNode[]; // Can contain paragraphs, lists, nested blockquotes
}
```

**Markdown Syntax**:

```markdown
> This is a blockquote.
> It can span multiple lines.
>
> > Nested blockquotes are supported.
>
> - Lists inside blockquotes work too
```

**Example AST**:

```typescript
{
  type: 'blockquote',
  children: [
    {
      type: 'paragraph',
      children: [
        { type: 'text', content: 'This is a blockquote.' }
      ]
    }
  ]
}
```

**Use Cases**:

- Important notes or warnings in exercise statements
- Highlighting key information
- Quoting theorems or definitions

#### CodeBlockNode

Fenced code blocks with optional language identifier.

```typescript
interface CodeBlockNode extends BaseNode {
	type: 'code-block';
	code: string; // Raw code content (preserves all formatting)
	language?: string; // Optional language identifier (e.g., 'typescript', 'python')
}
```

**Markdown Syntax**:

````markdown
```python
def solve(x):
    return x ** 2
```

```
Plain code block without language
```
````

**Example AST**:

```typescript
{
  type: 'code-block',
  code: 'def solve(x):\n    return x ** 2',
  language: 'python'
}
```

**Use Cases**:

- Algorithm examples in programming exercises
- Code snippets to analyze
- Pseudocode for mathematical algorithms
- Sample input/output for exercises

**Features**:

- Preserves all whitespace and indentation
- Language identifier enables syntax highlighting in rendering
- Common languages: `python`, `javascript`, `typescript`, `java`, `cpp`, `sql`, `latex`

---

### Document Structure

#### DocumentNode

Root node containing all block elements.

```typescript
interface DocumentNode {
	type: 'document';
	children: BlockNode[];
}
```

**Union Types Summary**:

```typescript
// All inline nodes
type InlineNode = TextNode | MathInlineNode | LineBreakNode;

// All block nodes
type BlockNode =
	| ParagraphNode
	| HeadingNode
	| ListNode
	| TableNode
	| MathBlockNode
	| ImageNode
	| HorizontalRuleNode
	| BlockquoteNode
	| CodeBlockNode;

// All AST nodes
type ASTNode = InlineNode | BlockNode | ListItemNode;
```

---

## Supported Markdown Syntax

### Summary Table

| Feature         | Syntax                | AST Node Type                |
| --------------- | --------------------- | ---------------------------- |
| Paragraph       | Text with blank lines | `paragraph`                  |
| Heading         | `# H1` to `###### H6` | `heading`                    |
| Bold            | `**text**`            | `text` with `bold: true`     |
| Italic          | `*text*`              | `text` with `italic: true`   |
| Inline code     | `` `code` ``          | `text` with `code: true`     |
| Inline math     | `$x^2$`               | `math-inline`                |
| Block math      | `$$...$$`             | `math-block`                 |
| Unordered list  | `- item`              | `list` with `ordered: false` |
| Ordered list    | `1. item`             | `list` with `ordered: true`  |
| Table           | GFM pipes             | `table`                      |
| Image           | `![alt](url)`         | `image`                      |
| Horizontal rule | `---`                 | `horizontal-rule`            |
| Blockquote      | `> text`              | `blockquote`                 |
| Code block      | ` ``` `               | `code-block`                 |
| Hard break      | `\\`                  | `line-break`                 |

---

## Usage Examples

### Parsing Markdown

```typescript
import { parseMarkdown } from '$lib/exercises/parser/markdown-parser';
import type { DocumentNode } from '$lib/exercises/types';

const markdown = `
# Exercise 1

Calculate $2x + 3$ when $x = 5$.

> **Hint**: Substitute the value of $x$ directly.

## Solution

$$2(5) + 3 = 13$$

\`\`\`python
x = 5
result = 2 * x + 3
print(result)  # Output: 13
\`\`\`
`;

const ast: DocumentNode = parseMarkdown(markdown);
```

### With Instance Generator

```typescript
import { generateExerciseInstance } from '$lib/exercises/generator/instance-generator';

const exercise: Exercise = {
	id: 'ex-123',
	variables: [{ name: 'a', expression: '{{1..10}}' }],
	statement_md: `
Calculate ${{ a }} \\times 2$.

> Remember: multiplication is repeated addition!

\`\`\`
Example: 3 * 2 = 3 + 3 = 6
\`\`\`
`,
	solution_md: 'The answer is ${{eval:a*2}}$',
	distribution_mode: 'on_demand',
	difficulty: 1,
	tags: ['multiplication']
};

const result = generateExerciseInstance(exercise, { parseAST: true });

if (result.success) {
	// statement_ast and solution_ast contain DocumentNode objects
	console.log(result.instance.statement_ast);
}
```

### Rendering AST

```svelte
<script lang="ts">
	import type { DocumentNode, BlockNode } from '$lib/exercises/types';
	import { renderBlockNode } from '$lib/exercises/renderer';

	let { ast }: { ast: DocumentNode } = $props();
</script>

<div class="exercise-content prose dark:prose-invert">
	{#each ast.children as node}
		{@html renderBlockNode(node)}
	{/each}
</div>
```

---

## Limitations

### Current Limitations

1. **No nested inline formatting**: Cannot combine `**bold *and italic***` in a single span
2. **No footnotes**: Footnote syntax is not supported
3. **No definition lists**: HTML-style definition lists not supported
4. **No task lists**: `- [ ]` checkbox syntax not supported
5. **No HTML passthrough**: Raw HTML is escaped, not rendered
6. **Table cell content**: Complex nested content in table cells may not parse correctly

### Blockquote Limitations

- Nested blockquotes are supported but deep nesting (>3 levels) may affect rendering
- Math expressions inside blockquotes work correctly
- Code blocks inside blockquotes require proper indentation

### Code Block Limitations

- Syntax highlighting depends on the renderer, not the parser
- The parser does not validate the language identifier
- Triple backticks inside code blocks must be escaped or use different fence (four backticks)

### Math Expression Notes

- Dollar signs in non-math context should be escaped: `\$`
- Nested dollar signs inside math are handled correctly
- Multi-line block math preserves whitespace

---

## Changelog

### 2025-11-21

- Added `BlockquoteNode` type for blockquote support (`> text`)
- Added `CodeBlockNode` type for fenced code blocks with language identifier
- Updated `BlockNode` union type to include new node types
- Added documentation for new AST types

### 2025-10-27

- Initial documentation for AST types
- Support for paragraphs, headings, lists, tables, math, images, horizontal rules
