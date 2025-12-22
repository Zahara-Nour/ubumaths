# Ubumark - Custom Markdown System

> Technical Guide for the UbuMaths Custom Markdown Engine

**Version:** 2.0.0
**Last Updated:** 2025-12-23

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Documentation Index](#documentation-index)
- [Key Features](#key-features)
- [Integration Points](#integration-points)

---

## Overview

Ubumark is a custom markdown processing system specifically designed for mathematical education content. It extends standard markdown with specialized features for math expressions, parameterized templates, and educational diagrams.

### Design Philosophy

1. **Math-First** - Native support for LaTeX and custom math syntax
2. **Template-Driven** - Parameterized content with variable substitution
3. **Multi-Output** - Generate HTML, LaTeX, and Typst from single source
4. **Educational Focus** - Specialized blocks for variation tables, probability trees
5. **Performance** - LRU caching, lazy parsing, optimized AST operations

### Core Capabilities

| Feature                 | Description                                                   |
| ----------------------- | ------------------------------------------------------------- |
| **Markdown Parsing**    | Extended GFM with math, images, videos                        |
| **Math Processing**     | Dual syntax (LaTeX `$...$` and custom `~...~`)                |
| **Parameterization**    | Variable resolution, random generation, expression evaluation |
| **Special Blocks**      | Variation tables, probability trees                           |
| **Multi-Format Export** | LaTeX documents, Typst documents                              |
| **LaTeX Import**        | Convert LaTeX to Ubumark format                               |

---

## Quick Start

### Basic Usage

```typescript
import { parseMarkdown } from '$lib/ubumark';
import type { DocumentNode } from '$lib/ubumark';

// Parse markdown to AST
const markdown = `
# Introduction

Calculate $x^2 + y^2$ when $x = 3$ and $y = 4$.

$$
\\sqrt{x^2 + y^2} = \\sqrt{9 + 16} = 5
$$
`;

const ast: DocumentNode = parseMarkdown(markdown);
```

### With Parameterization

```typescript
import { resolveVariables, resolveText } from '$lib/ubumark';

// Define variables
const variables = [
	{ name: 'a', expression: '{{1..10}}' }, // Random 1-10
	{ name: 'b', expression: '{{1..10}}' }, // Random 1-10
	{ name: 'sum', expression: '{{eval:{{a}}+{{b}}}}' } // Computed
];

// Resolve with seed for reproducibility
const resolved = resolveVariables(variables, 12345);

// Substitute in content
const template = 'Calculate ${{a}} + {{b}} = {{sum}}$';
const result = resolveText(template, resolved);
// e.g., "Calculate $7 + 3 = 10$"
```

### Rendering in Svelte

```svelte
<script lang="ts">
  import { MarkdownRenderer } from '$lib/components/markdown';

  let { content } = $props();
</script>

<MarkdownRenderer {content} mode="rendered" />
```

---

## Architecture

### Module Structure

```
src/lib/ubumark/
├── index.ts                      # Public API exports
│
├── parser/                       # Parsing Layer
│   ├── markdown-parser.ts       # Main parser orchestrator
│   ├── math-extractor.ts        # Math expression extraction
│   ├── list-parser.ts           # Ordered/unordered lists
│   ├── table-parser.ts          # GFM tables
│   ├── blockquote-parser.ts     # Blockquotes
│   ├── code-block-parser.ts     # Fenced code blocks
│   ├── variation-table-parser.ts # Variation/sign tables
│   └── probability-tree-parser.ts # Probability trees
│
├── parameterization/             # Template Resolution
│   ├── parser/                   # Token extraction
│   │   ├── tokenizer.ts         # {{...}} token extraction
│   │   ├── variable-parser.ts   # {{var}} parsing
│   │   ├── random-parser.ts     # {{1..10}} parsing
│   │   └── eval-parser.ts       # {{eval:...}} parsing
│   ├── resolver/                 # Value resolution
│   │   ├── variable-resolver.ts # 3-stage pipeline
│   │   ├── random-generator.ts  # Seeded PRNG
│   │   └── text-resolver.ts     # Template substitution
│   └── validator/                # Validation
│       ├── circular-dependency.ts
│       └── variable-validator.ts
│
├── generators/                   # Output Generation
│   ├── latex-generator.ts       # AST → LaTeX
│   ├── typst-generator.ts       # AST → Typst
│   ├── variation-table-latex.ts # Variation tables → LaTeX
│   ├── variation-table-typst.ts # Variation tables → Typst
│   ├── probability-tree-latex.ts # Prob trees → LaTeX
│   └── probability-tree-typst.ts # Prob trees → Typst
│
├── importers/                    # Input Conversion
│   └── latex/                    # LaTeX → Ubumark
│       ├── tokenizer.ts         # LaTeX tokenization
│       ├── transpiler.ts        # Token → Markdown
│       └── converters/          # Command converters
│
├── types/                        # Type Definitions
│   ├── ast.ts                   # AST node types
│   ├── parser.ts                # Parser options/results
│   ├── template.ts              # Template types
│   ├── parameterization.ts      # Variable/random types
│   ├── variation-table.ts       # Variation table types
│   └── probability-tree.ts      # Probability tree types
│
└── utils/                        # Utilities
    └── list-depth.ts            # List nesting analysis
```

### Processing Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│                      INPUT                                    │
│  Markdown with math, variables, special blocks               │
└──────────────────────────────────┬───────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────┐
│                 1. PARAMETERIZATION                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Stage 1     │ │ Stage 2     │ │ Stage 3     │            │
│  │ Variables   │→│ Random      │→│ Eval        │            │
│  │ {{a}}→value │ │ {{1-10}}→5  │ │ {{eval:}}→# │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└──────────────────────────────────┬───────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────┐
│                 2. MATH EXTRACTION                           │
│  Extract $...$, $$...$$, ~...~, ~~...~~ → placeholders       │
└──────────────────────────────────┬───────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────┐
│                 3. MARKDOWN PARSING                          │
│  Block detection → Inline parsing → AST construction         │
└──────────────────────────────────┬───────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────┐
│                 4. MATH RESTORATION                          │
│  Replace placeholders with MathInline/MathBlock nodes        │
└──────────────────────────────────┬───────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────┐
│                      OUTPUT                                   │
│  DocumentNode AST ready for rendering or export              │
└──────────────────────────────────────────────────────────────┘
```

---

## Documentation Index

| Document                                     | Description                            |
| -------------------------------------------- | -------------------------------------- |
| [syntax.md](./syntax.md)                     | Complete syntax reference              |
| [architecture.md](./architecture.md)         | Detailed architecture and data flow    |
| [special-blocks.md](./special-blocks.md)     | Variation tables and probability trees |
| [parameterization.md](./parameterization.md) | Variable resolution system             |
| [generators.md](./generators.md)             | LaTeX and Typst generation             |
| [IMPROVEMENTS.md](./IMPROVEMENTS.md)         | Proposed improvements                  |

---

## Key Features

### 1. Dual Math Syntax

Ubumark supports two math syntaxes:

| Syntax | Inline  | Block     | Use Case         |
| ------ | ------- | --------- | ---------------- |
| LaTeX  | `$x^2$` | `$$x^2$$` | Standard LaTeX   |
| Custom | `~x^2~` | `~~x^2~~` | Simplified input |

Custom syntax is converted to LaTeX during rendering via the MathAST system.

### 2. Parameterization System

```markdown
Variables: a={{1..10}}, b={{1..10}}

Calculate {{a}} + {{b}} = {{eval:{{a}}+{{b}}}}
```

Features:

- **Variable References**: `{{varName}}`
- **Random Generation**: `{{1..10}}`, `{{1..10!5}}`, `{{2.3}}`
- **Expression Evaluation**: `{{eval:a+b}}`, `{{eval:a*b|d}}`
- **Circular Dependency Detection**: DFS-based validation
- **Seeded Random**: Reproducible across sessions

### 3. Special Mathematical Blocks

#### Variation Tables

```variation
variable: x
domain: -inf, 0, +inf

sign: f'(x)
  -inf,0: +
  0: z
  0,+inf: -

variation: f(x)
  -inf: -2, bottom
  0: 3, top
  +inf: -inf, limit-bottom
```

#### Probability Trees

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

### 4. Multi-Format Export

From a single Ubumark source:

```typescript
import { generateLatex, generateTypst } from '$lib/ubumark';

const ast = parseMarkdown(content);

// Generate LaTeX document
const latex = generateLatex(ast, {
	title: 'Exercices',
	author: 'Prof. Dupont'
});

// Generate Typst document
const typst = generateTypst(ast, {
	title: 'Exercices',
	author: 'Prof. Dupont'
});
```

---

## Integration Points

### With MarkdownRenderer Component

The primary rendering component:

```svelte
<MarkdownRenderer
  content={markdown}
  mode="rendered"
  parseOptions={{ ... }}
  genericFunctions={config}
  inputs={inputStates}
  onInputChange={handler}
  hints={exerciseHints}
/>
```

### With Exercise System

```typescript
import { generateExerciseInstance } from '$lib/exercises';

const instance = generateExerciseInstance(exercise, {
	seed: 12345,
	parseAST: true
});

// instance.statement_ast: DocumentNode
// instance.solution_ast: DocumentNode
```

### With Questions Feature

```typescript
import { resolveVariables, resolveText } from '$lib/ubumark';

const resolved = resolveVariables(template.variables, seed);
const statement = resolveText(template.statement, resolved);
```

---

## Performance Characteristics

| Operation         | Complexity | Typical Time              |
| ----------------- | ---------- | ------------------------- |
| Parse markdown    | O(n)       | <10ms for typical content |
| Resolve variables | O(v × t)   | <5ms for 10 variables     |
| Generate LaTeX    | O(n)       | <5ms                      |
| AST caching       | LRU        | Hit rate >90%             |

The system uses an LRU cache for parsed ASTs to avoid re-parsing identical content.

---

## Related Documentation

- **MathAST System**: `docs/ref/mathAST/` - Custom math syntax processing
- **Exercises Feature**: `docs/features/exercises/` - Exercise system integration
- **Questions Feature**: `docs/features/questions/` - Question template system
- **Database Schema**: `docs/architecture/database-schema.md` - Content storage

---

**Status:** Production Ready
**Test Coverage:** 99%+ (2,430+ tests)
