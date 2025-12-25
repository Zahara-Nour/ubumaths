# Ubumark Architecture

> Detailed system architecture and data flow documentation

---

## Table of Contents

- [System Overview](#system-overview)
- [Parser Architecture](#parser-architecture)
- [AST Design](#ast-design)
- [Rendering Pipeline](#rendering-pipeline)
- [Caching Strategy](#caching-strategy)
- [Type System](#type-system)
- [Error Handling](#error-handling)

---

## System Overview

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                           │
│  ┌────────────────────┐ ┌────────────────────┐ ┌──────────────────┐ │
│  │ MarkdownRenderer   │ │ MarkdownRaw        │ │ Node Components  │ │
│  │ (Svelte)           │ │ (Syntax Highlight) │ │ (ParagraphNode,  │ │
│  └────────────────────┘ └────────────────────┘ │  MathBlock, etc) │ │
│                                                 └──────────────────┘ │
└────────────────────────────────────┬────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────┐
│                         PROCESSING LAYER                             │
│  ┌────────────────────┐ ┌────────────────────┐ ┌──────────────────┐ │
│  │ parseMarkdown()    │ │ resolveVariables() │ │ generateLatex()  │ │
│  │ (Parser)           │ │ (Parameterization) │ │ generateTypst()  │ │
│  └────────────────────┘ └────────────────────┘ └──────────────────┘ │
└────────────────────────────────────┬────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────┐
│                           DATA LAYER                                 │
│  ┌────────────────────┐ ┌────────────────────┐ ┌──────────────────┐ │
│  │ AST Types          │ │ Template Types     │ │ Export Types     │ │
│  │ (DocumentNode,     │ │ (Variable,         │ │ (LatexOptions,   │ │
│  │  BlockNode, etc)   │ │  ResolvedVariable) │ │  TypstOptions)   │ │
│  └────────────────────┘ └────────────────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component            | Responsibility                      |
| -------------------- | ----------------------------------- |
| **MarkdownRenderer** | Orchestrates parsing and rendering  |
| **parseMarkdown**    | Converts markdown string to AST     |
| **Node Components**  | Render individual AST nodes to HTML |
| **resolveVariables** | 3-stage variable resolution         |
| **generateLatex**    | AST to LaTeX document               |
| **generateTypst**    | AST to Typst document               |

---

## Parser Architecture

### Main Parser Flow

The main parser (`markdown-parser.ts`) follows this sequence:

````
┌─────────────────────────────────────────────────────────────────┐
│ INPUT: Raw markdown string                                       │
└─────────────────────────────────────┬───────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────┐
│ 1. MATH EXTRACTION                                               │
│    extractMath(markdown) → { text, placeholders }                │
│    - Block math ($$...$$, ~~...~~) extracted first              │
│    - Inline math ($...$, ~...~) extracted second                │
│    - Escaped delimiters (\$, \~) preserved                      │
│    - Placeholders: __MATH_0__, __MATH_1__, ...                  │
└─────────────────────────────────────┬───────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────┐
│ 2. LINE SPLITTING                                                │
│    Split on newlines, preserve line information                  │
└─────────────────────────────────────┬───────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────┐
│ 3. BLOCK DETECTION                                               │
│    For each line, detect block type:                             │
│    - Heading: /^#{1,6}\s/                                        │
│    - List: /^[\s]*[-*+]|^\d+\./                                  │
│    - Table: /^\|/                                                │
│    - Code fence: /^```/                                          │
│    - Blockquote: /^>/                                            │
│    - HR: /^[-*_]{3,}/                                            │
│    - Special blocks: ```variation, ```probtree                   │
│    - Math block: standalone __MATH_n__ placeholder               │
│    - Paragraph: everything else                                  │
└─────────────────────────────────────┬───────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────┐
│ 4. BLOCK PARSING                                                 │
│    Each block type has specialized parser:                       │
│    - parseList() → ListNode                                      │
│    - parseTable() → TableNode                                    │
│    - parseBlockquote() → BlockquoteNode                          │
│    - parseCodeBlock() → CodeBlockNode                            │
│    - parseVariationTable() → VariationTableNode                  │
│    - parseProbabilityTree() → ProbabilityTreeNode                │
│    - parseInlineContent() → InlineNode[]                         │
└─────────────────────────────────────┬───────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────┐
│ 5. MATH RESTORATION                                              │
│    Replace __MATH_n__ placeholders with MathNode in AST          │
│    - Block placeholders → MathBlockNode                          │
│    - Inline placeholders → MathInlineNode                        │
│    - Preserve syntax type (latex/custom)                         │
└─────────────────────────────────────┬───────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────┐
│ OUTPUT: DocumentNode { type: 'document', children: BlockNode[] } │
└─────────────────────────────────────────────────────────────────┘
````

### Inline Content Parsing

Inline content within paragraphs and headings:

```
┌────────────────────────────────────────────────────────────────┐
│ INPUT: "This is **bold** and $x^2$ math"                        │
└────────────────────────────────────┬───────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────┐
│ SEGMENT DETECTION                                               │
│ - Math placeholders: __MATH_n__                                 │
│ - Bold markers: **...**                                         │
│ - Italic markers: *...*                                         │
│ - Code markers: `...`                                           │
│ - Strikethrough: ~~...~~                                        │
│ - Highlight: ==...==                                            │
│ - Line breaks: \\                                               │
└────────────────────────────────────┬───────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────┐
│ OUTPUT: InlineNode[]                                            │
│ [                                                               │
│   { type: 'text', content: 'This is ' },                        │
│   { type: 'text', content: 'bold', bold: true },                │
│   { type: 'text', content: ' and ' },                           │
│   { type: 'math-inline', expression: 'x^2', syntax: 'latex' },  │
│   { type: 'text', content: ' math' }                            │
│ ]                                                               │
└────────────────────────────────────────────────────────────────┘
```

### Specialized Parsers

#### List Parser (`list-parser.ts`)

Handles complex nested list structures:

```
- Item 1
  - Nested 1.1
    - Deep nested 1.1.1
  - Nested 1.2
- Item 2
```

**Algorithm**:

1. Track indentation level
2. Build tree structure recursively
3. Detect ordered vs unordered by marker
4. Parse item content as inline nodes

#### Table Parser (`table-parser.ts`)

Parses GFM tables with alignment:

```
| Header | Center | Right |
|:-------|:------:|------:|
| Cell   | Cell   | Cell  |
```

**Algorithm**:

1. Detect table start by pipe character
2. Parse header row
3. Parse alignment row (`:---:` patterns)
4. Parse data rows
5. Normalize cell count

#### Special Block Parsers

**Variation Table Parser**:

- Parses DSL for sign/variation tables
- Validates domain points
- Builds structured table model

**Probability Tree Parser**:

- Parses indentation-based tree syntax
- Validates probability sums
- Computes tree metadata (depth, leaf count)

---

## AST Design

### Node Type Hierarchy

```typescript
// Base interface for all nodes
interface BaseNode {
	type: string;
}

// Document is the root
interface DocumentNode extends BaseNode {
	type: 'document';
	children: BlockNode[];
}

// Block-level nodes
type BlockNode =
	| ParagraphNode // Contains inline nodes
	| HeadingNode // Level 1-6, contains inline nodes
	| ListNode // Ordered/unordered, contains items
	| TableNode // Header, rows, alignments
	| MathBlockNode // Display math
	| ImageNode // Images with extended attributes
	| VideoNode // Video embeds
	| HorizontalRuleNode // Thematic break
	| BlockquoteNode // Nested block content
	| CodeBlockNode // Fenced code with language
	| VariationTableNode // Sign/variation table
	| ProbabilityTreeNode; // Probability tree

// Inline-level nodes
type InlineNode =
	| TextNode // Plain text with formatting
	| MathInlineNode // Inline math
	| LineBreakNode // Hard/soft breaks
	| BlankNode // Fill-in-blank placeholder
	| MathPromptNode // Interactive math input
	| HashtagNode // #tag
	| MentionNode // @user
	| HintNode; // {{hint:id}}
```

### Key Node Interfaces

```typescript
// Text with multiple formatting options
interface TextNode extends BaseNode {
	type: 'text';
	content: string;
	bold?: boolean;
	italic?: boolean;
	code?: boolean;
	strikethrough?: boolean;
	highlight?: boolean;
}

// Math with syntax type
interface MathInlineNode extends BaseNode {
	type: 'math-inline';
	expression: string;
	syntax: 'latex' | 'custom';
}

// List with nesting
interface ListNode extends BaseNode {
	type: 'list';
	ordered: boolean;
	start?: number;
	items: ListItemNode[];
}

// Image with extended attributes
interface ImageNode extends BaseNode {
	type: 'image';
	src: string;
	alt?: string;
	title?: string;
	sizeClass?: 'inline' | 'small' | 'medium' | 'large' | 'full';
	widthPercent?: number;
	alignment?: 'left' | 'center' | 'right';
	caption?: string;
	originalWidth?: number;
	originalHeight?: number;
}
```

### Design Rationale

**Why Custom AST (not unified/remark)?**

1. **Math-First**: Native math node types, not generic extensions
2. **Simplicity**: Focused on education, no plugin complexity
3. **Type Safety**: Full TypeScript with discriminated unions
4. **Performance**: Direct parsing without middleware overhead
5. **Export Control**: Direct mapping to LaTeX/Typst output

**Node Identification Pattern**:

All nodes use `type` as discriminant:

```typescript
function processNode(node: ASTNode) {
	switch (node.type) {
		case 'text':
			// TypeScript knows node is TextNode
			return node.content;
		case 'math-inline':
			// TypeScript knows node is MathInlineNode
			return renderMath(node.expression);
		// ...
	}
}
```

---

## Rendering Pipeline

### MarkdownRenderer Component

```svelte
<!-- MarkdownRenderer.svelte -->
<script lang="ts">
	// 1. Parse content to AST (with caching)
	let ast = $derived.by<DocumentNode | null>(() => {
		const cached = getCachedAST(content, parseOptions);
		if (cached) return cached;

		const parsed = parseMarkdown(content, parseOptions);
		setCachedAST(content, parsed, parseOptions);
		return parsed;
	});

	// 2. Determine list numbering scheme
	const effectiveListScheme = $derived.by<SchemeId | null>(() => {
		const maxDepth = getMaxEnumerateDepth(ast);
		return maxDepth > 1 ? config.schemeWithNesting : config.schemeWithoutNesting;
	});
</script>

<!-- 3. Render each block node -->
{#each ast.children as node}
	{#if node.type === 'paragraph'}
		<ParagraphNode children={node.children} ... />
	{:else if node.type === 'math-block'}
		<MathBlock expression={node.expression} syntax={node.syntax} />
	{:else if node.type === 'variation-table'}
		<VariationTable {node} />
		<!-- ... other node types -->
	{/if}
{/each}
```

### Node Component Pattern

Each block type has a dedicated Svelte component:

```svelte
<!-- MathBlock.svelte -->
<script lang="ts">
	interface Props {
		expression: string;
		syntax: 'latex' | 'custom';
		genericFunctions?: GenericFunctionConfig;
	}

	let { expression, syntax, genericFunctions }: Props = $props();

	// Convert custom syntax to LaTeX if needed
	const latex = $derived(
		syntax === 'custom' ? expressionToLatex(expression, 'custom') : toFrenchDecimal(expression)
	);
</script>

<div class="math-block">
	<MathLive {latex} displayMode />
</div>
```

### Inline Rendering

```svelte
<!-- ParagraphNode.svelte -->
{#each children as node}
	{#if node.type === 'text'}
		<span class:font-bold={node.bold} class:italic={node.italic}>
			{node.content}
		</span>
	{:else if node.type === 'math-inline'}
		<MathLive latex={processedLatex} />
	{:else if node.type === 'blank'}
		<BlankInput index={node.index} {inputs} {onInputChange} />
	{/if}
{/each}
```

---

## Caching Strategy

### LRU AST Cache

```typescript
// markdown-cache.ts
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, DocumentNode>({
	max: 100, // Max 100 entries
	ttl: 1000 * 60 * 10 // 10 minute TTL
});

function getCacheKey(content: string, options: ParseOptions): string {
	return `${hashContent(content)}:${JSON.stringify(options)}`;
}

export function getCachedAST(content: string, options: ParseOptions): DocumentNode | undefined {
	return cache.get(getCacheKey(content, options));
}

export function setCachedAST(content: string, ast: DocumentNode, options: ParseOptions): void {
	cache.set(getCacheKey(content, options), ast);
}
```

### Cache Invalidation

- Content change → new cache key (via hash)
- Options change → new cache key (via JSON stringify)
- TTL expiration → automatic removal
- Memory pressure → LRU eviction

### Performance Impact

| Scenario       | Without Cache | With Cache |
| -------------- | ------------- | ---------- |
| First parse    | ~10ms         | ~10ms      |
| Repeated parse | ~10ms         | <1ms       |
| Large document | ~50ms         | <1ms       |

**Typical hit rate**: >90% in interactive editing scenarios

---

## Type System

### Core Exports (`types/ast.ts`)

```typescript
// Re-export for consumers
export type {
	// Document
	DocumentNode,

	// Block nodes
	BlockNode,
	ParagraphNode,
	HeadingNode,
	ListNode,
	ListItemNode,
	TableNode,
	TableCellNode,
	MathBlockNode,
	ImageNode,
	VideoNode,
	HorizontalRuleNode,
	BlockquoteNode,
	CodeBlockNode,

	// Inline nodes
	InlineNode,
	TextNode,
	MathInlineNode,
	LineBreakNode,
	BlankNode,
	MathPromptNode,

	// Union types
	ASTNode
};
```

### Type Guards

```typescript
function isBlockNode(node: ASTNode): node is BlockNode {
	return [
		'paragraph',
		'heading',
		'list',
		'table',
		'math-block',
		'image',
		'video',
		'horizontal-rule',
		'blockquote',
		'code-block',
		'variation-table',
		'probability-tree'
	].includes(node.type);
}

function isMathNode(node: ASTNode): node is MathInlineNode | MathBlockNode {
	return node.type === 'math-inline' || node.type === 'math-block';
}
```

---

## Error Handling

### Parse Errors

```typescript
interface ParseError {
	message: string;
	line?: number;
	column?: number;
	content?: string;
}

interface ParseResult {
	node: DocumentNode | null;
	errors: ParseError[];
	warnings: ParseWarning[];
}
```

### Error Recovery

The parser uses graceful degradation:

1. **Unclosed math**: Treat remainder as text
2. **Invalid table**: Render as paragraph
3. **Malformed list**: Best-effort structure
4. **Unknown block**: Default to paragraph

```typescript
try {
	const parsed = parseMarkdown(content);
	setCachedAST(content, parsed, parseOptions);
	return parsed;
} catch (error) {
	console.error('Markdown parse error:', error);
	return null; // MarkdownRenderer shows error message
}
```

### Validation Errors

For parameterization:

```typescript
interface ValidationError {
	type: 'syntax-error' | 'circular-dependency' | 'undefined-variable';
	message: string;
	variable?: string;
	path?: string[]; // For circular deps
}

const result = validateVariables(variables);
if (!result.valid) {
	for (const error of result.errors) {
		console.error(`${error.type}: ${error.message}`);
	}
}
```

---

## File Locations

| Component        | Path                                                  |
| ---------------- | ----------------------------------------------------- |
| Main parser      | `src/lib/ubumark/parser/markdown-parser.ts`           |
| Math extractor   | `src/lib/ubumark/parser/math-extractor.ts`            |
| AST types        | `src/lib/ubumark/types/ast.ts`                        |
| MarkdownRenderer | `src/lib/components/markdown/MarkdownRenderer.svelte` |
| Node components  | `src/lib/components/markdown/nodes/`                  |
| AST cache        | `src/lib/utils/markdown-cache.ts`                     |
| LaTeX generator  | `src/lib/ubumark/generators/latex-generator.ts`       |
| Typst generator  | `src/lib/ubumark/generators/typst-generator.ts`       |
